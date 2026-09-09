CREATE TABLE IF NOT EXISTS community_identities (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  kind VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  email VARCHAR(254) NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
  role VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'visitor',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  external_source VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  external_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  UNIQUE KEY community_identities_email_uq (email),
  UNIQUE KEY community_identities_external_uq (external_source, external_id),
  CONSTRAINT community_identities_kind_ck CHECK (kind IN ('visitor', 'admin')),
  CONSTRAINT community_identities_role_ck CHECK (role IN ('visitor', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  csrf_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  KEY community_sessions_identity_idx (identity_id),
  KEY community_sessions_expiry_idx (expires_at),
  CONSTRAINT community_sessions_identity_fk FOREIGN KEY (identity_id)
    REFERENCES community_identities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_quotes (
  id VARCHAR(66) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  text VARCHAR(120) NOT NULL,
  speaker VARCHAR(40) NOT NULL DEFAULT '匿名坑底人',
  cover_path VARCHAR(512) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'published',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  submitted_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  external_source VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  external_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY community_quotes_public_idx (status, is_pinned, sort_order, created_at),
  KEY community_quotes_submitter_idx (submitted_by, created_at),
  UNIQUE KEY community_quotes_external_uq (external_source, external_id),
  CONSTRAINT community_quotes_status_ck CHECK (status IN ('draft', 'published', 'hidden')),
  CONSTRAINT community_quotes_submitter_fk FOREIGN KEY (submitted_by)
    REFERENCES community_identities (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_comments (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  target_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_id VARCHAR(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  nickname VARCHAR(24) NOT NULL DEFAULT '匿名坑底人',
  body VARCHAR(400) NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'published',
  moderated_at DATETIME(3) NULL,
  moderated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  external_source VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  external_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY community_comments_target_idx (target_type, target_id, status, created_at),
  KEY community_comments_identity_idx (identity_id, created_at),
  UNIQUE KEY community_comments_external_uq (external_source, external_id),
  CONSTRAINT community_comments_status_ck CHECK (status IN ('pending', 'published', 'hidden')),
  CONSTRAINT community_comments_identity_fk FOREIGN KEY (identity_id)
    REFERENCES community_identities (id) ON DELETE SET NULL,
  CONSTRAINT community_comments_moderator_fk FOREIGN KEY (moderated_by)
    REFERENCES community_identities (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_reactions (
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_id VARCHAR(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (identity_id, target_type, target_id),
  KEY community_reactions_target_idx (target_type, target_id),
  CONSTRAINT community_reactions_identity_fk FOREIGN KEY (identity_id)
    REFERENCES community_identities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_views (
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_id VARCHAR(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  view_count BIGINT UNSIGNED NOT NULL DEFAULT 1,
  first_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (identity_id, target_type, target_id),
  KEY community_views_target_idx (target_type, target_id),
  CONSTRAINT community_views_identity_fk FOREIGN KEY (identity_id)
    REFERENCES community_identities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supabase 的公开 API 无法导出匿名用户、点赞和浏览明细时，只保存真实聚合值。
-- 新 MySQL 明细在查询时与 baseline 相加；不要为 baseline 伪造身份或行为行。
CREATE TABLE IF NOT EXISTS community_stat_baselines (
  target_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_id VARCHAR(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  comment_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reaction_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  unique_visitor_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  view_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  source VARCHAR(128) NOT NULL,
  captured_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_admin_login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY community_login_email_idx (email, created_at),
  KEY community_login_ip_idx (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_rate_limits (
  action_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  window_started_at DATETIME(3) NOT NULL,
  hit_count INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (action_name, key_hash, window_started_at),
  KEY community_rate_limits_expiry_idx (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
