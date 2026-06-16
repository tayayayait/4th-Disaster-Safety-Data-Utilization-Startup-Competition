const TRAFFIC_EVENTS_MAX_UPSTREAM_ATTEMPTS = 2;

export const isRetryableTrafficEventsUpstreamError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  if (error.message === "ITS eventInfo request timed out") return true;
  return /^Upstream 5\d\d:/.test(error.message);
};

export const fetchTrafficEventsWithRetry = async <T>(
  fetchOnce: () => Promise<T>,
  maxAttempts = TRAFFIC_EVENTS_MAX_UPSTREAM_ATTEMPTS,
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchOnce();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableTrafficEventsUpstreamError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};
