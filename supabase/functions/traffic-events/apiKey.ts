export const TRAFFIC_EVENTS_API_KEY_ENV = "ITS_API_KEY";

export type EnvReader = (name: string) => string | undefined;

export const readTrafficEventsApiKey = (readEnv: EnvReader) => {
  const value = readEnv(TRAFFIC_EVENTS_API_KEY_ENV)?.trim();
  return value || null;
};
