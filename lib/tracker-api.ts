import type { TrackerData } from "./tracker";

export class TrackerRequestError extends Error {
  constructor(message: string, readonly signIn = false) { super(message); }
}

export async function readTrackerResponse(response: Response, operation: "load" | "save"): Promise<TrackerData> {
  // The private hosting gateway may return a sign-in page instead of API JSON.
  // Check authentication before parsing, so an expired session has a usable recovery.
  if (response.status === 401 || response.redirected) {
    throw new TrackerRequestError("Sign in with ChatGPT to continue. Your saved progress is safe.", true);
  }
  const isJson = response.headers.get("content-type")?.toLowerCase().includes("application/json");
  if (!isJson) {
    if (response.ok) throw new TrackerRequestError("Sign in with ChatGPT to load your private tracker.", true);
    throw new TrackerRequestError(`Could not ${operation} your progress. Please retry.`);
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new TrackerRequestError(`Could not ${operation} your progress. Please retry.`); }
  if (!body || typeof body !== "object") throw new TrackerRequestError("Could not read your saved progress. Please retry.");
  const result = body as Partial<TrackerData> & { error?: unknown; signIn?: unknown };
  if (!response.ok) throw new TrackerRequestError(typeof result.error === "string" ? result.error : `Could not ${operation} your progress. Please retry.`, result.signIn === true);
  if (!Array.isArray(result.goals) || !Array.isArray(result.checkins) || typeof result.today !== "string") {
    throw new TrackerRequestError("Could not read your saved progress. Please retry.");
  }
  return result as TrackerData;
}
