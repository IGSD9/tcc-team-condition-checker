import { z } from "zod";

/**
 * Step 04: 絵文字選択値のコード表
 * フロントとサーバーで同じ定義を参照し、値の不一致を防ぐ。
 */
export const CHECKIN_CODES = Object.freeze({
  sleep: Object.freeze([1, 2] as const), // 💤 / 🥱
  body: Object.freeze([1, 2] as const), // 🏃 / 🤕
  mood: Object.freeze([1, 2, 3] as const), // 😊 / 😐 / 🌀
  fog: Object.freeze([1, 2, 3] as const), // ☀️ / ☁️ / 🌫️
  energy: Object.freeze([1, 2] as const), // 🔋 / 🪫
  connection: Object.freeze([1, 2] as const), // 🗣️ / 😶
} as const);

/** CHECKIN_CODES と同じ順序・同じ長さ（UI 用絵文字） */
export const CHECKIN_EMOJIS = Object.freeze({
  sleep: Object.freeze(["💤", "🥱"] as const),
  body: Object.freeze(["🏃", "🤕"] as const),
  mood: Object.freeze(["😊", "😐", "🌀"] as const),
  fog: Object.freeze(["☀️", "☁️", "🌫️"] as const),
  energy: Object.freeze(["🔋", "🪫"] as const),
  connection: Object.freeze(["🗣️", "😶"] as const),
} as const);

/** aria-label 用（CHECKIN_CODES / CHECKIN_EMOJIS と同じインデックス） */
export const CHECKIN_OPTION_ARIA_LABELS = Object.freeze({
  sleep: Object.freeze(["良い", "いまいち"] as const),
  body: Object.freeze(["軽い", "重い・痛み"] as const),
  mood: Object.freeze(["前向き", "ふつう", "しんどい"] as const),
  fog: Object.freeze(["見通しが明るい", "やや不透明", "濃霧"] as const),
  energy: Object.freeze(["元気", "低下"] as const),
  connection: Object.freeze(["話した", "話していない"] as const),
} as const);

type ValueOf<T> = T[keyof T];
type TupleValues<T extends readonly number[]> = T[number];

export type CheckinField = keyof typeof CHECKIN_CODES;
export type CheckinCode = ValueOf<{
  [K in CheckinField]: TupleValues<(typeof CHECKIN_CODES)[K]>;
}>;

export type SleepCode = TupleValues<(typeof CHECKIN_CODES)["sleep"]>;
export type BodyCode = TupleValues<(typeof CHECKIN_CODES)["body"]>;
export type MoodCode = TupleValues<(typeof CHECKIN_CODES)["mood"]>;
export type FogCode = TupleValues<(typeof CHECKIN_CODES)["fog"]>;
export type EnergyCode = TupleValues<(typeof CHECKIN_CODES)["energy"]>;
export type ConnectionCode = TupleValues<(typeof CHECKIN_CODES)["connection"]>;

const zodCodeField = <T extends readonly number[]>(codes: T) =>
  z
    .number()
    .int()
    .refine((v): v is T[number] => (codes as readonly number[]).includes(v));

export const CheckinPayloadSchema = z.object({
  sleep: zodCodeField(CHECKIN_CODES.sleep),
  body: zodCodeField(CHECKIN_CODES.body),
  mood: zodCodeField(CHECKIN_CODES.mood),
  fog: zodCodeField(CHECKIN_CODES.fog),
  energy: zodCodeField(CHECKIN_CODES.energy),
  connection: zodCodeField(CHECKIN_CODES.connection),
  wednesdayExtra: z.number().int().nullable().optional(),
});

export type CheckinPayload = z.infer<typeof CheckinPayloadSchema>;

export const parseCheckinPayload = (payload: unknown): CheckinPayload =>
  CheckinPayloadSchema.parse(payload);

export const safeParseCheckinPayload = (payload: unknown) =>
  CheckinPayloadSchema.safeParse(payload);

