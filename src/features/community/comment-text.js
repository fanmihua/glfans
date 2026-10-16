export const communityInputLimit = 80;
export const communityPreviewLimit = 50;

// Match the API's Unicode code-point count; emoji are not counted as two UTF-16 units.
export function communityCharacterCount(value) {
  return Array.from(value).length;
}

export function limitCommunityText(value, limit = communityInputLimit) {
  return Array.from(value).slice(0, limit).join("");
}

export function previewCommunityText(value) {
  return communityCharacterCount(value) > communityPreviewLimit
    ? `${limitCommunityText(value, communityPreviewLimit)}…`
    : value;
}
