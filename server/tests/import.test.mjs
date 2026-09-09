import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBaselineCounts,
  calculateDetailedStats,
} from "../../scripts/import-glfans-community.mjs";

test("totals baseline counts duplicate comment UUIDs as one upserted row", () => {
  const comment = {
    id: "10000000-0000-4000-8000-000000000001",
    target_type: "page",
    target_id: "tide-words",
    status: "published",
  };
  const details = calculateDetailedStats({ comments: [comment, { ...comment }] })
    .get("page:tide-words");
  assert.equal(details.commentCount, 1);
  assert.deepEqual(calculateBaselineCounts("totals", {
    commentCount: 3,
    reactionCount: 0,
    uniqueVisitorCount: 0,
    viewCount: 0,
  }, details, "page:tide-words"), {
    commentCount: 2,
    reactionCount: 0,
    uniqueVisitorCount: 0,
    viewCount: 0,
  });
});

test("duplicate comment UUIDs cannot silently move between targets", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  assert.throws(() => calculateDetailedStats({ comments: [
    { id, target_type: "page", target_id: "tide-words", status: "published" },
    { id, target_type: "quote", target_id: "q-01", status: "published" },
  ] }), /同一评论 ID 指向不同目标/);
});

test("totals baseline follows the final upserted status of a duplicate comment", () => {
  const comment = {
    id: "10000000-0000-4000-8000-000000000001",
    target_type: "page",
    target_id: "tide-words",
  };
  const details = calculateDetailedStats({ comments: [
    { ...comment, status: "published" },
    { ...comment, status: "hidden" },
  ] }).get("page:tide-words") || {
    commentCount: 0,
    reactionCount: 0,
    uniqueVisitorCount: 0,
    viewCount: 0,
  };

  assert.equal(details.commentCount, 0);
  assert.equal(calculateBaselineCounts("totals", {
    commentCount: 3,
    reactionCount: 0,
    uniqueVisitorCount: 0,
    viewCount: 0,
  }, details, "page:tide-words").commentCount, 3);
});
