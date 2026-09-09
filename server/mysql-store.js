import mysql from "mysql2/promise";
import { randomBytes, randomUUID } from "node:crypto";
import { AppError } from "./errors.js";

const publicQuoteFields = "id, text, speaker, cover_path, sort_order, status, is_pinned, created_at, updated_at";
const publicCommentFields = "id, target_type, target_id, nickname, body, status, created_at, updated_at";

export function createMysqlPool(config) {
  const pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: "utf8mb4",
    timezone: "Z",
    decimalNumbers: true,
    bigNumberStrings: true,
    connectTimeout: 5_000,
  });
  pool.on("connection", (connection) => {
    // mysql2's `timezone: "Z"` only controls JS Date serialization. Queue an
    // explicit session setting before the connection can serve API queries so
    // DATETIME defaults/NOW(3) and JS Date parameters share UTC semantics.
    connection.query("SET time_zone = '+00:00'", (error) => {
      if (error) connection.destroy();
    });
  });
  return pool;
}

async function inTransaction(pool, callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const value = await callback(connection);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assertAvailableTarget(executor, targetType, targetId) {
  if (targetType === "page" && targetId === "tide-words") return;
  if (targetType === "quote") {
    const [rows] = await executor.execute(
      "SELECT id FROM community_quotes WHERE id = ? AND status = 'published' LIMIT 1",
      [targetId],
    );
    if (rows.length) return;
  }
  throw new AppError(400, "community_target_invalid", "互动目标不存在或不可用。");
}

function generatedQuoteId() {
  return `q-${randomBytes(16).toString("hex")}`;
}

export class MysqlCommunityStore {
  constructor(pool) {
    this.pool = pool;
  }

  async close() {
    await this.pool.end();
  }

  async ping() {
    const [rows] = await this.pool.execute("SELECT @@session.time_zone AS session_time_zone");
    if (rows[0]?.session_time_zone !== "+00:00") {
      throw new Error("MySQL session time_zone is not UTC");
    }
  }

  async pruneExpiredData() {
    await this.pool.execute("DELETE FROM community_sessions WHERE expires_at <= NOW(3)");
    await this.pool.execute("DELETE FROM community_admin_login_attempts WHERE created_at < NOW(3) - INTERVAL 7 DAY");
    await this.pool.execute("DELETE FROM community_rate_limits WHERE window_started_at < NOW(3) - INTERVAL 2 DAY");
    await this.pool.execute(
      `DELETE i FROM community_identities i
       LEFT JOIN community_sessions s ON s.identity_id = i.id
       LEFT JOIN community_comments c ON c.identity_id = i.id
       LEFT JOIN community_quotes q ON q.submitted_by = i.id
       LEFT JOIN community_reactions r ON r.identity_id = i.id
       LEFT JOIN community_views v ON v.identity_id = i.id
       WHERE i.kind = 'visitor'
         AND i.created_at < NOW(3) - INTERVAL 30 DAY
         AND s.identity_id IS NULL AND c.identity_id IS NULL AND q.submitted_by IS NULL
         AND r.identity_id IS NULL AND v.identity_id IS NULL`,
    );
  }

  async consumeRateLimit(action, keyHash, limit, windowSeconds) {
    const windowMilliseconds = windowSeconds * 1000;
    const startedAt = new Date(Math.floor(Date.now() / windowMilliseconds) * windowMilliseconds);
    await this.pool.execute(
      `INSERT INTO community_rate_limits (action_name, key_hash, window_started_at, hit_count)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE hit_count = hit_count + 1`,
      [action, keyHash, startedAt],
    );
    const [rows] = await this.pool.execute(
      `SELECT hit_count FROM community_rate_limits
       WHERE action_name = ? AND key_hash = ? AND window_started_at = ?`,
      [action, keyHash, startedAt],
    );
    if (Number(rows[0]?.hit_count ?? limit + 1) > limit) {
      throw new AppError(429, "request_rate_limit", "操作太频繁，请稍后再试。", {
        retryAfterSeconds: Math.ceil((startedAt.getTime() + windowMilliseconds - Date.now()) / 1000),
      });
    }
  }

  async getSession(tokenHash) {
    const [rows] = await this.pool.execute(
      `SELECT
         s.token_hash, s.csrf_hash, s.expires_at,
         i.id AS identity_id, i.kind, i.email, i.role, i.is_active
       FROM community_sessions s
       INNER JOIN community_identities i ON i.id = s.identity_id
       WHERE s.token_hash = ? AND s.expires_at > NOW(3) AND i.is_active = 1
       LIMIT 1`,
      [tokenHash],
    );
    if (!rows[0]) return null;
    await this.pool.execute(
      "UPDATE community_sessions SET last_seen_at = NOW(3) WHERE token_hash = ?",
      [tokenHash],
    );
    return rows[0];
  }

  async rotateSessionCsrf(tokenHash, csrfHash, expiresAt) {
    const [result] = await this.pool.execute(
      `UPDATE community_sessions
       SET csrf_hash = ?, last_seen_at = NOW(3), expires_at = ?
       WHERE token_hash = ? AND expires_at > NOW(3)`,
      [csrfHash, expiresAt, tokenHash],
    );
    return result.affectedRows === 1;
  }

  async createVisitorSession({ identityId, tokenHash, csrfHash, expiresAt }) {
    await inTransaction(this.pool, async (connection) => {
      await connection.execute(
        `INSERT INTO community_identities (id, kind, role)
         VALUES (?, 'visitor', 'visitor')`,
        [identityId],
      );
      await connection.execute(
        `INSERT INTO community_sessions (token_hash, csrf_hash, identity_id, expires_at)
         VALUES (?, ?, ?, ?)`,
        [tokenHash, csrfHash, identityId, expiresAt],
      );
    });
    return { identity_id: identityId, kind: "visitor", role: "visitor", email: null, csrf_hash: csrfHash };
  }

  async replaceSession({ oldTokenHash, identityId, tokenHash, csrfHash, expiresAt }) {
    await inTransaction(this.pool, async (connection) => {
      if (oldTokenHash) {
        await connection.execute("DELETE FROM community_sessions WHERE token_hash = ?", [oldTokenHash]);
      }
      await connection.execute(
        `INSERT INTO community_sessions (token_hash, csrf_hash, identity_id, expires_at)
         VALUES (?, ?, ?, ?)`,
        [tokenHash, csrfHash, identityId, expiresAt],
      );
      await connection.execute(
        "UPDATE community_identities SET last_login_at = NOW(3) WHERE id = ?",
        [identityId],
      );
    });
  }

  async deleteSession(tokenHash) {
    if (!tokenHash) return;
    await this.pool.execute("DELETE FROM community_sessions WHERE token_hash = ?", [tokenHash]);
  }

  async getAdminByEmail(email) {
    const [rows] = await this.pool.execute(
      `SELECT id, email, password_hash, role, is_active
       FROM community_identities
       WHERE email = ? AND kind = 'admin' AND role = 'admin'
       LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async countRecentFailedLogins(email, ipHash) {
    const [rows] = await this.pool.execute(
      `SELECT COUNT(*) AS failure_count
       FROM community_admin_login_attempts
       WHERE succeeded = 0
         AND created_at > NOW(3) - INTERVAL 15 MINUTE
         AND (email = ? OR ip_hash = ?)`,
      [email, ipHash],
    );
    return Number(rows[0]?.failure_count ?? 0);
  }

  async recordLoginAttempt(email, ipHash, succeeded) {
    await this.pool.execute(
      `INSERT INTO community_admin_login_attempts (email, ip_hash, succeeded)
       VALUES (?, ?, ?)`,
      [email, ipHash, succeeded ? 1 : 0],
    );
  }

  async listPublishedQuotes() {
    const [rows] = await this.pool.execute(
      `SELECT ${publicQuoteFields}
       FROM community_quotes
       WHERE status = 'published'
       ORDER BY is_pinned DESC, sort_order ASC, created_at ASC`,
    );
    return rows;
  }

  async getStats() {
    const [rows] = await this.pool.execute(
      `WITH targets AS (
         SELECT target_type, target_id FROM community_stat_baselines
         UNION SELECT target_type, target_id FROM community_comments
         UNION SELECT target_type, target_id FROM community_reactions
         UNION SELECT target_type, target_id FROM community_views
       )
       SELECT
         t.target_type,
         t.target_id,
         COALESCE(b.comment_count, 0) + (
           SELECT COUNT(*) FROM community_comments c
           WHERE c.target_type = t.target_type AND c.target_id = t.target_id AND c.status = 'published'
         ) AS comment_count,
         COALESCE(b.reaction_count, 0) + (
           SELECT COUNT(*) FROM community_reactions r
           WHERE r.target_type = t.target_type AND r.target_id = t.target_id
         ) AS reaction_count,
         COALESCE(b.unique_visitor_count, 0) + (
           SELECT COUNT(*) FROM community_views v
           WHERE v.target_type = t.target_type AND v.target_id = t.target_id
         ) AS unique_visitor_count,
         COALESCE(b.view_count, 0) + (
           SELECT COALESCE(SUM(v.view_count), 0) FROM community_views v
           WHERE v.target_type = t.target_type AND v.target_id = t.target_id
         ) AS view_count
       FROM targets t
       LEFT JOIN community_stat_baselines b
         ON b.target_type = t.target_type AND b.target_id = t.target_id
       WHERE (t.target_type = 'page' AND t.target_id = 'tide-words')
          OR (t.target_type = 'quote' AND EXISTS (
            SELECT 1 FROM community_quotes q WHERE q.id = t.target_id AND q.status = 'published'
          ))`,
    );
    return rows;
  }

  async getTargetViewStats(executor, targetType, targetId) {
    const [rows] = await executor.execute(
      `SELECT
         COALESCE((SELECT unique_visitor_count FROM community_stat_baselines WHERE target_type = ? AND target_id = ?), 0)
           + (SELECT COUNT(*) FROM community_views WHERE target_type = ? AND target_id = ?) AS unique_visitor_count,
         COALESCE((SELECT view_count FROM community_stat_baselines WHERE target_type = ? AND target_id = ?), 0)
           + (SELECT COALESCE(SUM(view_count), 0) FROM community_views WHERE target_type = ? AND target_id = ?) AS view_count`,
      [targetType, targetId, targetType, targetId, targetType, targetId, targetType, targetId],
    );
    return rows[0];
  }

  async recordView(identityId, targetType, targetId) {
    return inTransaction(this.pool, async (connection) => {
      await assertAvailableTarget(connection, targetType, targetId);
      await connection.execute(
        `INSERT INTO community_views (identity_id, target_type, target_id, view_count)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           view_count = view_count + IF(last_seen_at < NOW(3) - INTERVAL 30 MINUTE, 1, 0),
           last_seen_at = NOW(3)`,
        [identityId, targetType, targetId],
      );
      return this.getTargetViewStats(connection, targetType, targetId);
    });
  }

  async toggleReaction(identityId, targetType, targetId) {
    return inTransaction(this.pool, async (connection) => {
      await assertAvailableTarget(connection, targetType, targetId);
      const [deleted] = await connection.execute(
        `DELETE FROM community_reactions
         WHERE identity_id = ? AND target_type = ? AND target_id = ?`,
        [identityId, targetType, targetId],
      );
      const liked = deleted.affectedRows === 0;
      if (liked) {
        await connection.execute(
          `INSERT INTO community_reactions (identity_id, target_type, target_id)
           VALUES (?, ?, ?)`,
          [identityId, targetType, targetId],
        );
      }
      const [rows] = await connection.execute(
        `SELECT
           COALESCE((SELECT reaction_count FROM community_stat_baselines WHERE target_type = ? AND target_id = ?), 0)
             + COUNT(*) AS reaction_count
         FROM community_reactions
         WHERE target_type = ? AND target_id = ?`,
        [targetType, targetId, targetType, targetId],
      );
      return { liked, reaction_count: rows[0].reaction_count };
    });
  }

  async getReactionKeys(identityId) {
    const [rows] = await this.pool.execute(
      `SELECT target_type, target_id
       FROM community_reactions
       WHERE identity_id = ?
       ORDER BY created_at ASC`,
      [identityId],
    );
    return rows.map((row) => `${row.target_type}:${row.target_id}`);
  }

  async listPublishedComments(targetType, targetId, limit) {
    await assertAvailableTarget(this.pool, targetType, targetId);
    const [rows] = await this.pool.execute(
      `SELECT ${publicCommentFields}
       FROM community_comments
       WHERE target_type = ? AND target_id = ? AND status = 'published'
       ORDER BY created_at DESC
       LIMIT ?`,
      [targetType, targetId, limit],
    );
    return rows;
  }

  async submitComment(identityId, { targetType, targetId, nickname, body }) {
    return inTransaction(this.pool, async (connection) => {
      await assertAvailableTarget(connection, targetType, targetId);
      const [rateRows] = await connection.execute(
        `SELECT COUNT(*) AS recent_count
         FROM community_comments
         WHERE identity_id = ? AND created_at > NOW(3) - INTERVAL 10 MINUTE`,
        [identityId],
      );
      if (Number(rateRows[0].recent_count) >= 3) {
        throw new AppError(429, "comment_rate_limit", "十分钟内最多提交三条评论，请稍后再试。");
      }
      const [duplicateRows] = await connection.execute(
        `SELECT id FROM community_comments
         WHERE identity_id = ? AND target_type = ? AND target_id = ? AND body = ?
           AND created_at > NOW(3) - INTERVAL 24 HOUR
         LIMIT 1`,
        [identityId, targetType, targetId, body],
      );
      if (duplicateRows.length) {
        throw new AppError(409, "comment_duplicate", "这条评论已经提交过了。");
      }
      const id = randomUUID();
      await connection.execute(
        `INSERT INTO community_comments
           (id, target_type, target_id, identity_id, nickname, body, status)
         VALUES (?, ?, ?, ?, ?, ?, 'published')`,
        [id, targetType, targetId, identityId, nickname, body],
      );
      const [rows] = await connection.execute(
        `SELECT ${publicCommentFields} FROM community_comments WHERE id = ?`,
        [id],
      );
      return rows[0];
    });
  }

  async submitQuote(identityId, { speaker, text }) {
    return inTransaction(this.pool, async (connection) => {
      const [rateRows] = await connection.execute(
        `SELECT COUNT(*) AS recent_count
         FROM community_quotes
         WHERE submitted_by = ? AND created_at > NOW(3) - INTERVAL 10 MINUTE`,
        [identityId],
      );
      if (Number(rateRows[0].recent_count) >= 3) {
        throw new AppError(429, "quote_rate_limit", "十分钟内最多投稿三条原话，请稍后再试。");
      }
      const [duplicateRows] = await connection.execute(
        `SELECT id FROM community_quotes
         WHERE submitted_by = ? AND text = ? AND created_at > NOW(3) - INTERVAL 24 HOUR
         LIMIT 1`,
        [identityId, text],
      );
      if (duplicateRows.length) throw new AppError(409, "quote_duplicate", "这条原话已经提交过了。");
      const [sortRows] = await connection.execute(
        "SELECT COALESCE(MIN(sort_order), 10) - 10 AS next_sort_order FROM community_quotes",
      );
      const id = generatedQuoteId();
      await connection.execute(
        `INSERT INTO community_quotes
           (id, text, speaker, sort_order, status, is_pinned, submitted_by)
         VALUES (?, ?, ?, ?, 'published', 0, ?)`,
        [id, text, speaker, Number(sortRows[0].next_sort_order), identityId],
      );
      const [rows] = await connection.execute(
        `SELECT ${publicQuoteFields} FROM community_quotes WHERE id = ?`,
        [id],
      );
      return rows[0];
    });
  }

  async listAdminComments({ status, limit, offset }) {
    const conditions = status ? "WHERE status = ?" : "";
    const parameters = status ? [status, limit, offset] : [limit, offset];
    const [rows] = await this.pool.execute(
      `SELECT id, target_type, target_id, identity_id AS user_id, nickname, body, status,
              created_at, updated_at, moderated_at, moderated_by, external_source, external_id
       FROM community_comments
       ${conditions}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      parameters,
    );
    return rows;
  }

  async listAdminQuotes() {
    const [rows] = await this.pool.execute(
      `SELECT ${publicQuoteFields}, submitted_by, external_source, external_id
       FROM community_quotes
       ORDER BY is_pinned DESC, sort_order ASC, created_at ASC`,
    );
    return rows;
  }

  async updateComment(id, adminId, patch) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(patch)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (Object.hasOwn(patch, "status")) {
      fields.push("moderated_at = NOW(3)", "moderated_by = ?");
      values.push(adminId);
    }
    if (!fields.length) throw new AppError(400, "patch_empty", "没有可保存的评论字段。");
    values.push(id);
    const [result] = await this.pool.execute(
      `UPDATE community_comments SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    if (!result.affectedRows) throw new AppError(404, "comment_not_found", "评论不存在。");
    const [rows] = await this.pool.execute(
      `SELECT id, target_type, target_id, identity_id AS user_id, nickname, body, status,
              created_at, updated_at, moderated_at, moderated_by
       FROM community_comments WHERE id = ?`,
      [id],
    );
    return rows[0];
  }

  async deleteComment(id) {
    const [result] = await this.pool.execute("DELETE FROM community_comments WHERE id = ?", [id]);
    if (!result.affectedRows) throw new AppError(404, "comment_not_found", "评论不存在。");
  }

  async createAdminQuote(input) {
    const id = generatedQuoteId();
    await this.pool.execute(
      `INSERT INTO community_quotes
         (id, text, speaker, cover_path, sort_order, status, is_pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.text, input.speaker, input.cover_path, input.sort_order, input.status, input.is_pinned ? 1 : 0],
    );
    const [rows] = await this.pool.execute(`SELECT ${publicQuoteFields} FROM community_quotes WHERE id = ?`, [id]);
    return rows[0];
  }

  async updateQuote(id, patch) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(patch)) {
      fields.push(`${key} = ?`);
      values.push(key === "is_pinned" ? (value ? 1 : 0) : value);
    }
    if (!fields.length) throw new AppError(400, "patch_empty", "没有可保存的原话字段。");
    values.push(id);
    const [result] = await this.pool.execute(
      `UPDATE community_quotes SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    if (!result.affectedRows) throw new AppError(404, "quote_not_found", "原话不存在。");
    const [rows] = await this.pool.execute(`SELECT ${publicQuoteFields} FROM community_quotes WHERE id = ?`, [id]);
    return rows[0];
  }

  async deleteQuote(id) {
    await inTransaction(this.pool, async (connection) => {
      await connection.execute("DELETE FROM community_comments WHERE target_type = 'quote' AND target_id = ?", [id]);
      await connection.execute("DELETE FROM community_reactions WHERE target_type = 'quote' AND target_id = ?", [id]);
      await connection.execute("DELETE FROM community_views WHERE target_type = 'quote' AND target_id = ?", [id]);
      await connection.execute("DELETE FROM community_stat_baselines WHERE target_type = 'quote' AND target_id = ?", [id]);
      const [result] = await connection.execute("DELETE FROM community_quotes WHERE id = ?", [id]);
      if (!result.affectedRows) throw new AppError(404, "quote_not_found", "原话不存在。");
    });
  }

  async upsertAdmin({ id, email, passwordHash }) {
    await this.pool.execute(
      `INSERT INTO community_identities
         (id, kind, email, password_hash, role, is_active)
       VALUES (?, 'admin', ?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash), kind = 'admin', role = 'admin', is_active = 1`,
      [id, email, passwordHash],
    );
  }
}
