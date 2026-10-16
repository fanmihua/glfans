CREATE TABLE IF NOT EXISTS community_comment_reactions (
  comment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (comment_id, identity_id),
  KEY community_comment_reactions_identity_idx (identity_id),
  CONSTRAINT community_comment_reactions_comment_fk FOREIGN KEY (comment_id)
    REFERENCES community_comments (id) ON DELETE CASCADE,
  CONSTRAINT community_comment_reactions_identity_fk FOREIGN KEY (identity_id)
    REFERENCES community_identities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
