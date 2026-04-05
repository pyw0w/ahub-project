export type HealthPayload = {
  service: string;
  status: "ok";
  environment: string;
  timestamp: string;
};

export type TelegramUserPayload = {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
};

export type AuthBootstrapReadyPayload = {
  status: "ok";
  user: TelegramUserPayload;
  gml: {
    status: "ready";
    provider: "mock";
    accountId: string;
    sessionToken: string;
    expiresAt: string;
  };
};

export type AuthBootstrapDegradedPayload = {
  status: "degraded";
  user: TelegramUserPayload;
  gml: {
    status: "temporarily_unavailable";
    provider: "mock";
    retryable: true;
    retryAfterSeconds: number;
  };
};

export type AuthBootstrapPayload = AuthBootstrapReadyPayload | AuthBootstrapDegradedPayload;
