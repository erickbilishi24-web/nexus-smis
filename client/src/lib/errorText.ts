const DOMAIN_MESSAGES: Record<string, string> = {
  LEARNER_NOT_FOUND: "Wrong or missing learner ID. Check the learner ID and try again.",
  ACTIVE_LEARNER_NOT_FOUND: "Wrong or inactive learner ID. Check the learner ID and try again.",
  COUNSELLING_SCOPE_FORBIDDEN: "You can only submit referrals for learners in your assigned class.",
  DATABASE_NOT_CONFIGURED: "The service is temporarily unavailable. Please try again later.",
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  VALIDATION_ERROR: "Check the highlighted information and try again.",
};

function messageFromValidationPayload(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const payload: unknown = JSON.parse(trimmed);
    const values = Array.isArray(payload) ? payload : [payload];
    const issue = values.find(value => value && typeof value === "object" && "path" in value && "message" in value) as { path?: unknown; message?: unknown } | undefined;
    if (!issue) return "Check the information entered and try again.";
    const path = Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path ?? "");
    if (path === "learnerId") return "Wrong or missing learner ID. Enter a valid learner ID and try again.";
    return "Check the information entered and try again.";
  } catch {
    return null;
  }
}

export function toUserError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const validationMessage = messageFromValidationPayload(raw);
  if (validationMessage) return validationMessage;
  const normalized = raw.trim().replace(/^TRPCError:\s*/i, "");
  const domainKey = normalized.toUpperCase().replace(/[ -]+/g, "_");
  if (DOMAIN_MESSAGES[domainKey]) return DOMAIN_MESSAGES[domainKey];
  if (/expected .*number|received\s+nan|invalid input/i.test(normalized)) {
    return "Check the information entered and try again.";
  }
  if (!normalized) return "Something went wrong. Please try again.";
  return normalized.replaceAll("_", " ").replace(/^./, character => character.toUpperCase());
}
