// 六巨头定义：测字环节选定"第一位巨头"所需的稳定 key、名称与匹配别名
// 纯数据模块，无 server-only 依赖，客户端与服务端均可 import

export type GiantKey = "ma" | "ao" | "miao" | "lin" | "lang" | "shuai";

export interface Giant {
  key: GiantKey;
  name: string;
  emoji: string;
  /** 解析模型输出时用到的别名（含英文 key） */
  aliases: string[];
}

export const GIANTS: Giant[] = [
  { key: "ma", name: "马神", emoji: "🐴", aliases: ["马神", "马魔", "马老板", "ma"] },
  { key: "ao", name: "骜魔", emoji: "🍔", aliases: ["骜魔", "骜神", "骜", "ao"] },
  { key: "miao", name: "喵神", emoji: "🐱", aliases: ["喵神", "猫神", "喵总", "苗总", "喵", "miao"] },
  { key: "lin", name: "林魔", emoji: "🌲", aliases: ["林魔", "林神", "林", "lin"] },
  { key: "lang", name: "狼魔", emoji: "🐺", aliases: ["狼魔", "狼神", "劳神", "狼", "lang"] },
  { key: "shuai", name: "帅神", emoji: "🤖", aliases: ["帅神", "帅魔", "劳模", "帅", "shuai"] },
];

export function isGiantKey(v: unknown): v is GiantKey {
  return typeof v === "string" && GIANTS.some((g) => g.key === v);
}

/** 巨头的展示名（emoji + 名），如 "🐴马神" */
export function giantLabel(key: GiantKey): string {
  const g = GIANTS.find((x) => x.key === key);
  return g ? `${g.emoji}${g.name}` : "神秘巨头";
}

/** 从模型输出的文本中匹配出巨头 key；找不到返回 null */
export function matchGiantKey(text: string): GiantKey | null {
  for (const g of GIANTS) {
    for (const alias of g.aliases) {
      if (text.includes(alias)) return g.key;
    }
  }
  return null;
}

/** 兜底：随机选一位巨头 */
export function randomGiantKey(): GiantKey {
  return GIANTS[Math.floor(Math.random() * GIANTS.length)].key;
}
