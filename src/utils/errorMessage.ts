export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

const RATE_LIMIT_MESSAGE = 'Too many attempts—try again later';

export function getAuthErrorMessage(e: unknown): string {
  const message = getErrorMessage(e);
  const code =
    e && typeof e === 'object' && 'code' in e ? (e as { code?: unknown }).code : undefined;
  const status =
    e && typeof e === 'object' && 'status' in e ? (e as { status?: unknown }).status : undefined;

  if (
    status === 429 ||
    (typeof code === 'string' && code.includes('rate_limit')) ||
    /rate limit/i.test(message)
  ) {
    return RATE_LIMIT_MESSAGE;
  }

  return message;
}
