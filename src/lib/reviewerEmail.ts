/**
 * Reviewer detection for the login screen.
 *
 * Normal accounts sign in with an email magic link and never have a password.
 * The single Play reviewer account is identified by its email, so only that
 * address reveals the password field.
 */

export function normalizeEmail(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isReviewerEmail(
  email: string | null | undefined,
  reviewerEmail: string | null | undefined,
): boolean {
  const candidate = normalizeEmail(email);
  const reviewer = normalizeEmail(reviewerEmail);

  if (!candidate || !reviewer) return false;

  return candidate === reviewer;
}
