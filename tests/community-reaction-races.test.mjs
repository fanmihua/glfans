import assert from "node:assert/strict";
import test from "node:test";
import { mergeReactionState, mergeCommunityStatsRead, mergeCommunityCommentsRead } from "../src/features/community/community-state.js";

test("a delayed startup response preserves likes and unlikes completed while it was in flight", () => {
  const initialResponse = ["quote:previous", "comment:removed", "quote:untouched"];
  const writes = new Map([["comment:added", true], ["comment:removed", false], ["quote:previous", false], ["quote:new", true]]);
  assert.deepEqual([...mergeReactionState(initialResponse, writes)].sort(), ["comment:added", "quote:new", "quote:untouched"]);
});

test("an older comment read cannot overwrite a confirmed write, but a later read can refresh it", () => {
  const current = [{ id: "liked", likes: 1 }, { id: "unliked", likes: 0 }, { id: "other", likes: 2 }];
  const incoming = [{ id: "liked", likes: 0 }, { id: "unliked", likes: 1 }, { id: "other", likes: 5 }];
  const versions = new Map([["comment:liked", 2], ["comment:unliked", 3]]);
  assert.deepEqual(mergeCommunityCommentsRead(current, incoming, versions, 1).map(({ likes }) => likes), [1, 0, 5]);
  assert.deepEqual(mergeCommunityCommentsRead(current, incoming, versions, 3), incoming);
});

test("delayed stats preserve quote reaction writes, including targets missing from the old snapshot", () => {
  const current = { "quote:new": { likes: 1, comments: 0 }, "quote:old": { likes: 0, comments: 1 } };
  const incoming = { "quote:old": { likes: 1, comments: 2 } };
  const versions = new Map([["quote:new", 1], ["quote:old", 2]]);
  assert.deepEqual(mergeCommunityStatsRead(current, incoming, versions, 0), {
    "quote:new": { likes: 1, comments: 0 }, "quote:old": { likes: 0, comments: 2 },
  });
  assert.deepEqual(mergeCommunityStatsRead(current, incoming, versions, 2), incoming);
});
