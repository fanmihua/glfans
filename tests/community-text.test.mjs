import assert from "node:assert/strict";
import test from "node:test";
import { communityCharacterCount, limitCommunityText, previewCommunityText } from "../src/features/community/comment-text.js";

test("80-character input and 50-character preview preserve complete Unicode code points", () => {
  const long = "💗".repeat(79) + "好" + "尾";
  const input = limitCommunityText(long);
  assert.equal(communityCharacterCount(input), 80);
  assert.equal(input, "💗".repeat(79) + "好");
  assert.equal(previewCommunityText(long), "💗".repeat(50) + "…");
  assert.equal(previewCommunityText("字".repeat(50)), "字".repeat(50));
  assert.equal(long.endsWith("尾"), true);
});
