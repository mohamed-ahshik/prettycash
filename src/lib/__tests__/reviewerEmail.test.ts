import { isReviewerEmail, normalizeEmail } from '../reviewerEmail';

const REVIEWER = 'review.prettycash@gmail.com';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Review.PrettyCash@Gmail.com  ')).toBe(REVIEWER);
  });

  it('returns an empty string for missing values', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail('')).toBe('');
  });
});

describe('isReviewerEmail', () => {
  it('matches the reviewer address exactly', () => {
    expect(isReviewerEmail(REVIEWER, REVIEWER)).toBe(true);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(isReviewerEmail('  REVIEW.PRETTYCASH@GMAIL.COM ', REVIEWER)).toBe(true);
  });

  it('rejects other addresses', () => {
    expect(isReviewerEmail('someone@example.com', REVIEWER)).toBe(false);
    expect(isReviewerEmail('review.prettycash@gmail.co', REVIEWER)).toBe(false);
  });

  it('never matches when the reviewer address is not configured', () => {
    expect(isReviewerEmail(REVIEWER, undefined)).toBe(false);
    expect(isReviewerEmail(REVIEWER, '')).toBe(false);
    expect(isReviewerEmail(REVIEWER, '   ')).toBe(false);
  });

  it('never matches an empty input', () => {
    expect(isReviewerEmail('', REVIEWER)).toBe(false);
    expect(isReviewerEmail(undefined, REVIEWER)).toBe(false);
  });
});
