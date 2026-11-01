const DOMAIN_MESSAGES: Record<string, string> = {
  LEARNER_NOT_FOUND: "Wrong or missing learner ID. Check the learner ID and try again.",
  ACTIVE_LEARNER_NOT_FOUND: "Wrong or inactive learner ID. Check the learner ID and try again.",
  COUNSELLING_SCOPE_FORBIDDEN: "You can only submit referrals for learners in your assigned class.",
  DATABASE_NOT_CONFIGURED: "The service is temporarily unavailable. Please try again later.",
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  VALIDATION_ERROR: "Check the highlighted information and try again.",
  ASSESSMENT_MUST_BE_SUBMITTED: "Submit the complete marks first, then request review.",
  ASSESSMENT_INCOMPLETE_CANNOT_APPROVE: "This assessment still has missing marks and cannot be approved.",
  CLASS_TEACHER_APPROVAL_SCOPE_FORBIDDEN: "Only the assigned class teacher or an authorized reviewer can review this assessment.",
  CLASS_TEACHER_CANNOT_APPROVE_OWN_MARKS: "A class teacher cannot approve their own subject marks.",
  RETURN_REASON_REQUIRED: "Explain what must be corrected before returning this assessment.",
  BATCH_APPROVAL_SELECTION_REQUIRED: "Select at least one submitted assessment.",
  BATCH_APPROVAL_ONLY_SUBMITTED: "Batch approval only accepts assessments that are currently submitted.",
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
  if (domainKey.startsWith("BATCH_APPROVAL_INCOMPLETE")) return "One or more selected assessments have missing marks and cannot be approved yet.";
  if (/expected .*number|received\s+nan|invalid input/i.test(normalized)) {
    return "Check the information entered and try again.";
  }
  if (!normalized) return "Something went wrong. Please try again.";
  return normalized.replaceAll("_", " ").replace(/^./, character => character.toUpperCase());
}
