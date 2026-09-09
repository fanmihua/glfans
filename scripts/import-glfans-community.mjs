import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectToGlfansDatabase } from "./lib/glfans-db.mjs";

function text(value, name, max, { nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== "string" || !value.trim() || [...value.trim()].length > max) {
    throw new Error(`${name} 格式不正确。`);
  }
  return value.trim();
}

function count(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${name} 必须是非负整数。`);
  return number;
}

function date(value, name) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${name} 不是有效日期。`);
  return parsed;
}

function quoteId(value) {
  const id = text(value, "quote.id", 66);
  if (!/^q-[a-z0-9][a-z0-9-]{1,63}$/.test(id)) throw new Error(`原话 ID 格式不正确：${id}`);
  return id;
}

function identityId(value) {
  const id = text(value, "identity.id", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`身份 ID 格式不正确：${id}`);
  }
  return id.toLowerCase();
}

function target(item) {
  const targetType = text(item.target_type, "target_type", 16);
  const targetId = text(item.target_id, "target_id", 66);
  if (!((targetType === "page" && targetId === "tide-words") || (targetType === "quote" && /^q-[a-z0-9][a-z0-9-]{1,63}$/.test(targetId)))) {
    throw new Error(`互动目标格式不正确：${targetType}:${targetId}`);
  }
  return { targetType, targetId };
}

function rows(value, name) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${name} 必须是数组。`);
  return value;
}

export function calculateDetailedStats({ comments = [], reactions = [], views = [] }) {
  const detailed = new Map();
  const commentsById = new Map();
  const getDetailed = (targetType, targetId) => {
    const key = `${targetType}:${targetId}`;
    if (!detailed.has(key)) detailed.set(key, { comments: new Set(), reactions: new Set(), views: new Map() });
    return detailed.get(key);
  };
  for (const item of comments) {
    const { targetType, targetId } = target(item);
    const id = identityId(item.id);
    const targetKey = `${targetType}:${targetId}`;
    const previous = commentsById.get(id);
    if (previous && previous.targetKey !== targetKey) {
      throw new Error(`同一评论 ID 指向不同目标：${id}`);
    }
    // The database upsert leaves the last occurrence as the final row. Mirror
    // that result before subtracting details from a totals-mode baseline.
    commentsById.set(id, { id, item, targetKey, targetType, targetId });
  }
  for (const { id, item, targetType, targetId } of commentsById.values()) {
    if ((item.status || "published") !== "published") continue;
    getDetailed(targetType, targetId).comments.add(id);
  }
  for (const item of reactions) {
    const { targetType, targetId } = target(item);
    getDetailed(targetType, targetId).reactions.add(identityId(item.identity_id));
  }
  for (const item of views) {
    const { targetType, targetId } = target(item);
    const identity = identityId(item.identity_id);
    const targetDetails = getDetailed(targetType, targetId);
    targetDetails.views.set(identity, Math.max(
      targetDetails.views.get(identity) || 0,
      count(item.view_count ?? 1, "view_count"),
    ));
  }
  return new Map([...detailed].map(([key, value]) => [key, {
    commentCount: value.comments.size,
    reactionCount: value.reactions.size,
    uniqueVisitorCount: value.views.size,
    viewCount: [...value.views.values()].reduce((sum, countValue) => sum + countValue, 0),
  }]));
}

export function calculateBaselineCounts(mode, totals, detailCounts, targetKey) {
  if (mode === "residual") return totals;
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => {
    if (detailCounts[key] > value) {
      throw new Error(`baseline 总量小于同文件明细：${targetKey}:${key}`);
    }
    return [key, value - detailCounts[key]];
  }));
}

export async function importCommunitySnapshot(filePath, env = process.env) {
  if (!filePath) throw new Error("用法：npm run db:import -- /absolute/path/to/community-export.json");
  const payload = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  if (payload.version !== 1) throw new Error("只支持 version: 1 的导入文件。");
  const source = text(payload.source, "source", 64);
  const capturedAt = date(payload.captured_at || new Date().toISOString(), "captured_at");
  const identities = rows(payload.identities, "identities");
  const quotes = rows(payload.quotes, "quotes");
  const comments = rows(payload.comments, "comments");
  const reactions = rows(payload.reactions, "reactions");
  const views = rows(payload.views, "views");
  const baselines = rows(payload.baselines, "baselines");
  const baselineMode = payload.baseline_mode;
  if (baselines.length && !["residual", "totals"].includes(baselineMode)) {
    throw new Error("含 baselines 的导入文件必须明确 baseline_mode: residual 或 totals。");
  }

  const detailed = calculateDetailedStats({ comments, reactions, views });

  const connection = await connectToGlfansDatabase(env);
  const imported = { identities: 0, quotes: 0, comments: 0, reactions: 0, views: 0, baselines: 0 };

  try {
    await connection.beginTransaction();

    // 完整 dump 才会有 identities。公开快照没有用户明细时保持为空，绝不伪造访客。
    for (const item of identities) {
      const id = identityId(item.id);
      const externalId = text(item.external_id || item.id, "identity.external_id", 128);
      await connection.execute(
        `INSERT INTO community_identities
           (id, kind, role, external_source, external_id, created_at)
         VALUES (?, 'visitor', 'visitor', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           external_source = VALUES(external_source), external_id = VALUES(external_id)`,
        [id, source, externalId, date(item.created_at || capturedAt, "identity.created_at")],
      );
      imported.identities += 1;
    }

    for (const item of quotes) {
      const id = quoteId(item.id);
      const status = item.status || "published";
      if (!["draft", "published", "hidden"].includes(status)) throw new Error(`原话状态不正确：${status}`);
      const submitter = item.submitted_by ? identityId(item.submitted_by) : null;
      await connection.execute(
        `INSERT INTO community_quotes
           (id, text, speaker, cover_path, sort_order, status, is_pinned, submitted_by,
            external_source, external_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           text = VALUES(text), speaker = VALUES(speaker), cover_path = VALUES(cover_path),
           sort_order = VALUES(sort_order), status = VALUES(status), is_pinned = VALUES(is_pinned),
           submitted_by = COALESCE(VALUES(submitted_by), submitted_by),
           external_source = VALUES(external_source), external_id = VALUES(external_id),
           created_at = VALUES(created_at), updated_at = VALUES(updated_at)`,
        [
          id,
          text(item.text, "quote.text", 120),
          text(item.speaker || "匿名坑底人", "quote.speaker", 40),
          item.cover_path == null ? null : text(item.cover_path, "quote.cover_path", 512),
          Number.isSafeInteger(Number(item.sort_order)) ? Number(item.sort_order) : 0,
          status,
          item.is_pinned ? 1 : 0,
          submitter,
          source,
          text(item.external_id || item.id, "quote.external_id", 128),
          date(item.created_at || capturedAt, "quote.created_at"),
          date(item.updated_at || item.created_at || capturedAt, "quote.updated_at"),
        ],
      );
      imported.quotes += 1;
    }

    for (const item of comments) {
      const id = identityId(item.id);
      const { targetType, targetId } = target(item);
      const status = item.status || "published";
      if (!["pending", "published", "hidden"].includes(status)) throw new Error(`评论状态不正确：${status}`);
      await connection.execute(
        `INSERT INTO community_comments
           (id, target_type, target_id, identity_id, nickname, body, status,
            external_source, external_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           target_type = VALUES(target_type), target_id = VALUES(target_id),
           identity_id = COALESCE(VALUES(identity_id), identity_id), nickname = VALUES(nickname),
           body = VALUES(body), status = VALUES(status), external_source = VALUES(external_source),
           external_id = VALUES(external_id), created_at = VALUES(created_at), updated_at = VALUES(updated_at)`,
        [
          id,
          targetType,
          targetId,
          item.identity_id ? identityId(item.identity_id) : null,
          text(item.nickname || "匿名坑底人", "comment.nickname", 24),
          text(item.body, "comment.body", 400),
          status,
          source,
          text(item.external_id || item.id, "comment.external_id", 128),
          date(item.created_at || capturedAt, "comment.created_at"),
          date(item.updated_at || item.created_at || capturedAt, "comment.updated_at"),
        ],
      );
      imported.comments += 1;
    }

    for (const item of reactions) {
      const { targetType, targetId } = target(item);
      await connection.execute(
        `INSERT IGNORE INTO community_reactions (identity_id, target_type, target_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [identityId(item.identity_id), targetType, targetId, date(item.created_at || capturedAt, "reaction.created_at")],
      );
      imported.reactions += 1;
    }

    for (const item of views) {
      const { targetType, targetId } = target(item);
      const firstSeen = date(item.first_seen_at || capturedAt, "view.first_seen_at");
      const lastSeen = date(item.last_seen_at || firstSeen, "view.last_seen_at");
      await connection.execute(
        `INSERT INTO community_views
           (identity_id, target_type, target_id, view_count, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           view_count = GREATEST(view_count, VALUES(view_count)),
           first_seen_at = LEAST(first_seen_at, VALUES(first_seen_at)),
           last_seen_at = GREATEST(last_seen_at, VALUES(last_seen_at))`,
        [identityId(item.identity_id), targetType, targetId, count(item.view_count ?? 1, "view_count"), firstSeen, lastSeen],
      );
      imported.views += 1;
    }

    for (const item of baselines) {
      const { targetType, targetId } = target(item);
      const totals = {
        commentCount: count(item.comment_count, "baseline.comment_count"),
        reactionCount: count(item.reaction_count, "baseline.reaction_count"),
        uniqueVisitorCount: count(item.unique_visitor_count, "baseline.unique_visitor_count"),
        viewCount: count(item.view_count, "baseline.view_count"),
      };
      const detailCounts = detailed.get(`${targetType}:${targetId}`) || {
        commentCount: 0,
        reactionCount: 0,
        uniqueVisitorCount: 0,
        viewCount: 0,
      };
      const baseline = calculateBaselineCounts(
        baselineMode,
        totals,
        detailCounts,
        `${targetType}:${targetId}`,
      );
      await connection.execute(
        `INSERT INTO community_stat_baselines
           (target_type, target_id, comment_count, reaction_count, unique_visitor_count,
            view_count, source, captured_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           comment_count = VALUES(comment_count), reaction_count = VALUES(reaction_count),
           unique_visitor_count = VALUES(unique_visitor_count), view_count = VALUES(view_count),
           source = VALUES(source), captured_at = VALUES(captured_at)`,
        [
          targetType,
          targetId,
          baseline.commentCount,
          baseline.reactionCount,
          baseline.uniqueVisitorCount,
          baseline.viewCount,
          source,
          capturedAt,
        ],
      );
      imported.baselines += 1;
    }

    await connection.commit();
    console.log(`社区数据导入完成：${JSON.stringify(imported)}`);
    return imported;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  importCommunitySnapshot(process.argv[2]).catch((error) => {
    console.error(`社区数据导入失败：${error.message}`);
    process.exitCode = 1;
  });
}
