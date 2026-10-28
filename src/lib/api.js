import { DEFAULT_PROJECT_ID } from "../constants/status";

// Matches nginx's proxy_read_timeout, so the dev server (which has no
// timeout of its own) gives up at the same point as the Docker deployment.
export const ASSESS_TIMEOUT_MS = 300_000;

// An assessment that produced no verdict. `kind` picks the error screen's
// wording: invalid (400 or a client-side parse failure), incomplete (422),
// unavailable (503), timeout (504 or ASSESS_TIMEOUT_MS), server (anything
// else), network (no response at all). ResultBoundary adds display, for a
// response the dashboard couldn't draw.
export class AssessmentError extends Error {
  constructor(kind, message, { status, module, reason } = {}) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.module = module;
    this.reason = reason;
  }
}

// eil-calc's `detail` is a string for 400/503/500, an object for the 422 it
// returns when an assessment can't be completed, and a list for FastAPI's own
// request-validation errors.
export function classifyError(status, body) {
  const detail = body?.detail;
  if (detail?.error === "assessment_incomplete") {
    const reason = detail.reason ?? "No reason given";
    return new AssessmentError("incomplete", reason, { status, module: detail.module, reason });
  }
  let reason;
  if (typeof detail === "string") reason = detail;
  else if (Array.isArray(detail)) reason = detail.map(d => d?.msg).filter(Boolean).join("; ");
  // No detail usually means something in front of eil-calc answered (the
  // Vite proxy with no backend, or nginx), so `reason` stays unset and the
  // error screen doesn't attribute the message to eil-calc.
  const message = reason || `No reason given (HTTP ${status})`;

  const kind = status === 400 || status === 422 ? "invalid"
    : status === 503 ? "unavailable"
    : status === 504 ? "timeout"
    : "server";
  return new AssessmentError(kind, message, { status, reason: reason || undefined });
}

// POSTs the geometry and returns the parsed result. Throws AssessmentError,
// or the AbortError from `signal` when the caller cancels. Uses one
// controller and a timer rather than AbortSignal.any/timeout, which older
// browsers on the deploy LAN may lack.
export async function assess(geometry, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ASSESS_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel);

  // Relative by default, so one build artifact works at every tier: dev
  // server, LAN host, internal DNS name. In dev, Vite proxies /api to the
  // backend; in production the reverse proxy does. Set VITE_API_URL only to
  // point a build at some other origin.
  const apiBase = import.meta.env.VITE_API_URL ?? "";
  try {
    const response = await fetch(`${apiBase}/api/v1/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: DEFAULT_PROJECT_ID,
        geometry,
        config: { mode: "compliance" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw classifyError(response.status, body);
    }
    try {
      return await response.json();
    } catch (err) {
      if (controller.signal.aborted) throw err;
      throw new AssessmentError("server", "The server's answer couldn't be read.", { status: response.status });
    }
  } catch (err) {
    if (err instanceof AssessmentError) throw err;
    if (timedOut) throw new AssessmentError("timeout", "No answer after 5 minutes.");
    if (signal.aborted) throw err;
    throw new AssessmentError("network", "The server couldn't be reached.");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
