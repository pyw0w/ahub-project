import { createHmac, timingSafeEqual } from "node:crypto";

import type { TelegramIdentity } from "./gml-client.js";

type TelegramInitDataUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

export type ValidatedTelegramInitData = {
  authDate: number;
  user: TelegramIdentity;
};

export class TelegramInitDataError extends Error {
  readonly code: "invalid_telegram_init_data" | "telegram_init_data_expired";
  readonly statusCode: 400 | 401;

  constructor(
    code: "invalid_telegram_init_data" | "telegram_init_data_expired",
    statusCode: 400 | 401,
    message: string
  ) {
    super(message);
    this.name = "TelegramInitDataError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const buildSecretKey = (botToken: string): Buffer =>
  createHmac("sha256", "WebAppData").update(botToken).digest();

const buildDataCheckString = (params: URLSearchParams): string =>
  [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

const parseTelegramUser = (value: string | null): TelegramIdentity => {
  if (value === null) {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data does not include a user payload"
    );
  }

  let parsed: TelegramInitDataUser;

  try {
    parsed = JSON.parse(value) as TelegramInitDataUser;
  } catch {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data user payload is malformed"
    );
  }

  if (typeof parsed.id !== "number" || typeof parsed.first_name !== "string") {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data user payload is incomplete"
    );
  }

  return {
    id: String(parsed.id),
    username: parsed.username ?? null,
    firstName: parsed.first_name,
    lastName: parsed.last_name ?? null,
    languageCode: parsed.language_code ?? null
  };
};

export const validateTelegramInitData = (input: {
  initData: string;
  botToken: string;
  ttlSeconds: number;
  now?: Date;
}): ValidatedTelegramInitData => {
  const { botToken, initData, ttlSeconds, now = new Date() } = input;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");

  if (hash === null || authDateRaw === null) {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data is missing required signature fields"
    );
  }

  const expectedHash = createHmac("sha256", buildSecretKey(botToken))
    .update(buildDataCheckString(params))
    .digest("hex");

  const received = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (
    received.length === 0 ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data signature validation failed"
    );
  }

  const authDate = Number(authDateRaw);

  if (!Number.isInteger(authDate)) {
    throw new TelegramInitDataError(
      "invalid_telegram_init_data",
      401,
      "Telegram init data auth_date must be an integer"
    );
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);

  if (authDate > nowSeconds + 30 || nowSeconds - authDate > ttlSeconds) {
    throw new TelegramInitDataError(
      "telegram_init_data_expired",
      401,
      "Telegram init data is outside the accepted time window"
    );
  }

  return {
    authDate,
    user: parseTelegramUser(params.get("user"))
  };
};
