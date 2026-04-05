export type HealthPayload = {
  service: string;
  status: "ok";
  environment: string;
  timestamp: string;
};
