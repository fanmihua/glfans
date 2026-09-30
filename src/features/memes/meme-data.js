import importedMemes from '../../data/meme-assets.json' with { type: 'json' };

export const memeCollection = [
  {
    id: "001",
    title: "我决定不认真了",
    note: "每一次郑重退坑的标准表情。",
    src: "assets/fan-memes/reaction-no-serious.webp",
    alt: "聊天气泡写着我决定不认真了，下方是一位穿红衣服的女性无奈地拨头发",
    downloadName: "glfans-我决定不认真了.webp",
  },
  {
    id: "002",
    title: "不会真情实感了",
    note: "通常出现在下一次真情实感之前。",
    src: "assets/fan-memes/reaction-no-emotion.webp",
    alt: "圆角聊天气泡写着不会真情实感了，其中真情二字为绿色",
    downloadName: "glfans-不会真情实感了.webp",
  },
  {
    id: "003",
    title: "轻松绷住",
    note: "飞书原版表情包库收录。",
    src: "assets/fan-memes/reaction-light-relaxed.webp",
    alt: "一张模糊的黑白熊猫头表情，嘴角努力保持平静",
    downloadName: "glfans-轻松绷住.webp",
  },
  {
    id: "004",
    title: "女同越来越多",
    note: "飞书原版表情包库收录。",
    src: "assets/fan-memes/reaction-many-lesbians.webp",
    alt: "黑色背景上的文字表情包，写着 less is more 和女同越来越多",
    downloadName: "glfans-女同越来越多.webp",
  },
  {
    id: "005",
    title: "我是个失败的拉拉",
    note: "飞书原版表情包库收录。",
    src: "assets/fan-memes/reaction-failed-lesbian.webp",
    alt: "猫咪拼图表情，配字我是个失败的拉拉",
    downloadName: "glfans-我是个失败的拉拉.webp",
  },
  ...importedMemes,
];

export const memeGameCriticalAssets = [
  "assets/meme-game/meme-camera-three-quarter-empty-v2.webp",
  "assets/repo-handdrawn-heart-pink.webp",
  "assets/repo-handdrawn-underline-pink.webp",
];

export const memeCaptureDeck = memeCollection;
