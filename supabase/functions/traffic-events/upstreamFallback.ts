export const TRAFFIC_EVENTS_SOURCE = "ITS eventInfo";

export const trafficEventsUnavailableBody = (message: string) => ({
  events: [],
  source: TRAFFIC_EVENTS_SOURCE,
  status: "PENDING_ACCESS" as const,
  message,
});

export const isTrafficEventsUpstreamUnavailable = (error: unknown) => {
  if (!(error instanceof Error)) return false;

  return (
    error.message === "ITS eventInfo request timed out" ||
    error.message.startsWith("ITS API error:") ||
    error.message.startsWith("Upstream ")
  );
};
