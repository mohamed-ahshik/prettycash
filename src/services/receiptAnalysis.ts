import { ReceiptDraft } from '../types';
import { getVisionConfig } from '../config';

export type ReceiptAnalysisPhase = 'enqueue' | 'poll';

export interface ReceiptAnalysisErrorOptions {
  jobId?: string;
  retryable?: boolean;
  phase?: ReceiptAnalysisPhase;
}

export class ReceiptAnalysisError extends Error {
  code: string;
  jobId?: string;
  retryable?: boolean;
  phase?: ReceiptAnalysisPhase;

  constructor(code: string, message: string, options: ReceiptAnalysisErrorOptions = {}) {
    super(message);
    this.code = code;
    this.jobId = options.jobId;
    this.retryable = options.retryable;
    this.phase = options.phase;
    this.name = 'ReceiptAnalysisError';
  }
}

export interface AnalyzedReceipt {
  draft: ReceiptDraft;
  raw: unknown;
}

export interface AnalyzeOptions {
  autoCategorize?: boolean;
  categories?: { id: string; name: string; description: string }[];
  requestId?: string;
  onJobId?: (jobId: string) => void;
  onPollRetry?: (retrying: boolean) => void;
}

export function formatAnalysisError(e: unknown): string {
  return e instanceof ReceiptAnalysisError
    ? `${e.message} (${e.code})`
    : 'Receipt analysis failed.';
}

export function normalizeReceiptDraft(data: unknown): ReceiptDraft {
  const d = (data ?? {}) as Record<string, any>;
  const items = Array.isArray(d.items)
    ? d.items
        .filter((it: any) => it && typeof it.name === 'string')
        .map((it: any) => ({
          name: it.name,
          quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
          price: Number(it.price) || 0,
        }))
    : [];
  return {
    merchant: typeof d.merchant === 'string' ? d.merchant : '',
    amount: Number(d.amount) || 0,
    date: typeof d.date === 'string' && d.date ? d.date : undefined,
    time: typeof d.time === 'string' && d.time ? d.time : undefined,
    note: typeof d.note === 'string' ? d.note : '',
    items,
    categoryId: typeof d.categoryId === 'string' ? d.categoryId : undefined,
    categoryConfidence: typeof d.categoryConfidence === 'number'
      ? d.categoryConfidence
      : undefined,
  };
}

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 120;
const ENQUEUE_TIMEOUT_MS = 60000;
const POLL_TIMEOUT_MS = 15000;
const POLL_RETRY_DELAYS_MS = [1000, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function visionConfig(): { root: string; authHeader: Record<string, string> } {
  const { baseUrl, apiKey } = getVisionConfig();
  if (!baseUrl || !apiKey) {
    throw new ReceiptAnalysisError('NOT_CONFIGURED', 'Vision backend is not configured.');
  }
  return {
    root: baseUrl.replace(/\/$/, ''),
    authHeader: { Authorization: `Bearer ${apiKey}` },
  };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function toError(res: Response): Promise<ReceiptAnalysisError> {
  let code = 'INTERNAL';
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error?.code) code = body.error.code;
    if (body?.error?.message) message = body.error.message;
  } catch {}
  return new ReceiptAnalysisError(code, message);
}

function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

async function fetchPoll(
  root: string,
  jobId: string,
  authHeader: Record<string, string>,
  onPollRetry: ((retrying: boolean) => void) | undefined,
): Promise<Response> {
  for (let attempt = 0; attempt <= POLL_RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${root}/jobs/${jobId}`,
        { headers: authHeader },
        POLL_TIMEOUT_MS,
      );
    } catch {
      if (attempt < POLL_RETRY_DELAYS_MS.length) {
        onPollRetry?.(true);
        await sleep(POLL_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new ReceiptAnalysisError(
        'NETWORK',
        `Could not reach the vision backend at ${root}.`,
        { jobId, phase: 'poll', retryable: true },
      );
    }

    if (res.ok) {
      onPollRetry?.(false);
      return res;
    }

    const error = await toError(res);
    error.jobId = jobId;
    error.phase = 'poll';
    if (isTransientStatus(res.status)) {
      error.retryable = true;
      if (attempt < POLL_RETRY_DELAYS_MS.length) {
        onPollRetry?.(true);
        await sleep(POLL_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw error;
    }
    error.retryable = false;
    throw error;
  }

  throw new ReceiptAnalysisError(
    'NETWORK',
    `Could not reach the vision backend at ${root}.`,
    { jobId, phase: 'poll', retryable: true },
  );
}

async function pollUntilDone(
  jobId: string,
  root: string,
  authHeader: Record<string, string>,
  onPollRetry: ((retrying: boolean) => void) | undefined,
): Promise<AnalyzedReceipt> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const pollRes = await fetchPoll(root, jobId, authHeader, onPollRetry);
    let body: any;
    try {
      body = await pollRes.json();
    } catch {
      throw new ReceiptAnalysisError(
        'INTERNAL',
        'The vision backend returned an unreadable response.',
        { jobId, phase: 'poll', retryable: true },
      );
    }
    if (body?.status === 'completed') {
      return { draft: normalizeReceiptDraft(body.result), raw: body.result };
    }
    if (body?.status === 'failed') {
      throw new ReceiptAnalysisError(
        'FAILED',
        body?.error?.message ?? 'Receipt analysis failed.',
        { jobId, phase: 'poll', retryable: false },
      );
    }
    if (body?.status === 'rejected') {
      throw new ReceiptAnalysisError(
        body?.error?.code ?? 'NOT_A_RECEIPT',
        body?.error?.message ?? "This image doesn't look like a receipt or invoice.",
        { jobId, phase: 'poll', retryable: false },
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.', {
    jobId,
    phase: 'poll',
    retryable: true,
  });
}

export async function analyzeReceipt(
  imageBase64: string,
  mimeType: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzedReceipt> {
  const { root, authHeader } = visionConfig();
  const shouldAutoCategorize = Boolean(options.autoCategorize && options.categories?.length);
  const body: Record<string, unknown> = {
    image: { base64: imageBase64, mimeType },
    autoCategorize: shouldAutoCategorize,
  };
  if (shouldAutoCategorize) body.categories = options.categories;

  const headers: Record<string, string> = {
    ...authHeader,
    'Content-Type': 'application/json',
  };
  if (options.requestId) headers['Idempotency-Key'] = options.requestId;

  let enqueueRes: Response;
  try {
    enqueueRes = await fetchWithTimeout(`${root}/analyze-receipt`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, ENQUEUE_TIMEOUT_MS);
  } catch {
    throw new ReceiptAnalysisError(
      'NETWORK',
      `Could not reach the vision backend at ${root}.`,
      { phase: 'enqueue', retryable: true },
    );
  }
  if (!enqueueRes.ok) {
    const error = await toError(enqueueRes);
    error.phase = 'enqueue';
    error.retryable = isTransientStatus(enqueueRes.status);
    throw error;
  }

  let enqueueBody: any;
  try {
    enqueueBody = await enqueueRes.json();
  } catch {
    throw new ReceiptAnalysisError(
      'INTERNAL',
      'The vision backend returned an unreadable response.',
      { phase: 'enqueue', retryable: true },
    );
  }
  const { jobId } = enqueueBody ?? {};
  if (!jobId) {
    throw new ReceiptAnalysisError(
      'INTERNAL',
      'Vision backend did not return a job id.',
      { phase: 'enqueue', retryable: true },
    );
  }
  options.onJobId?.(jobId);
  return pollUntilDone(jobId, root, authHeader, options.onPollRetry);
}

export async function resumeReceiptAnalysis(
  jobId: string,
  options: Pick<AnalyzeOptions, 'onPollRetry'> = {},
): Promise<AnalyzedReceipt> {
  const { root, authHeader } = visionConfig();
  return pollUntilDone(jobId, root, authHeader, options.onPollRetry);
}
