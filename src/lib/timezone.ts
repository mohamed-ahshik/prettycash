export function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getDeviceTimeZone(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(timeZone) ? timeZone : null;
  } catch {
    return null;
  }
}
