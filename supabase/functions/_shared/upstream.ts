import { jsonError } from "./cors.ts";

interface FetchJsonOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

export const requireEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const fetchJson = async (
  url: URL | string,
  init?: RequestInit,
  options: FetchJsonOptions = {},
) => {
  const { timeoutMs, timeoutMessage } = options;
  const controller = timeoutMs && timeoutMs > 0 ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const inputSignal = init?.signal;

  const abortFromInput = () => controller?.abort(inputSignal?.reason);

  if (controller) {
    if (inputSignal?.aborted) {
      abortFromInput();
    } else {
      inputSignal?.addEventListener("abort", abortFromInput, { once: true });
    }
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const response = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Upstream ${response.status}: ${text.slice(0, 200)}`);
    }

    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (timedOut) {
      throw new Error(timeoutMessage ?? `Upstream request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    inputSignal?.removeEventListener("abort", abortFromInput);
  }
};

export const edgeError = (error: unknown) =>
  jsonError(error instanceof Error ? error.message : "Edge function failed", 500);
