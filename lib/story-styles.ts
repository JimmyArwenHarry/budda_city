// 剧情风格定义：开局可选，贯穿剧情/结局/总结/成就
// 纯数据模块，无 server-only 依赖，客户端与服务端均可 import

export type StoryStyle =
  | "wuxia"
  | "xuanhuan"
  | "scifi"
  | "business"
  | "campus"
  | "apocalypse";

export interface StyleOption {
  key: StoryStyle;
  label: string;
  emoji: string;
  desc: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  { key: "wuxia", label: "武侠风", emoji: "⚔️", desc: "刀光剑影 · 快意恩仇" },
  { key: "xuanhuan", label: "玄幻风", emoji: "🐉", desc: "灵根觉醒 · 逆天问道" },
  { key: "scifi", label: "科幻风", emoji: "🚀", desc: "赛博都市 · 机械飞升" },
  { key: "business", label: "商战风", emoji: "💼", desc: "资本博弈 · 兼并收购" },
  { key: "campus", label: "校园风", emoji: "🎒", desc: "青春懵懂 · 期末大考" },
  { key: "apocalypse", label: "末世风", emoji: "🧟", desc: "废土求生 · 末法纪元" },
];

export function isStoryStyle(v: unknown): v is StoryStyle {
  return typeof v === "string" && STYLE_OPTIONS.some((s) => s.key === v);
}

/** 风格中文名；未选/未知 → "默认" */
export function styleLabel(key?: StoryStyle): string {
  return STYLE_OPTIONS.find((s) => s.key === key)?.label ?? "默认";
}
