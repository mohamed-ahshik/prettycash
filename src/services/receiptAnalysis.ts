import { ReceiptDraft } from '../types';
import { getVisionConfig } from '../config';

export class ReceiptAnalysisError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
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

export async function analyzeReceipt(
  imageBase64: string,
  mimeType: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzedReceipt> {
  const { baseUrl, apiKey } = getVisionConfig();
  if (!baseUrl || !apiKey) {
    throw new ReceiptAnalysisError('NOT_CONFIGURED', 'Vision backend is not configured.');
  }
  const root = baseUrl.replace(/\/$/, '');
  const authHeader = { Authorization: `Bearer ${apiKey}` };
  const shouldAutoCategorize = Boolean(options.autoCategorize && options.categories?.length);
  const body: Record<string, unknown> = {
    image: { base64: imageBase64, mimeType },
    autoCategorize: shouldAutoCategorize,
  };
  if (shouldAutoCategorize) body.categories = options.categories;

  let enqueueRes: Response;
  try {
    enqueueRes = await fetchWithTimeout(`${root}/analyze-receipt`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, ENQUEUE_TIMEOUT_MS);
  } catch {
    throw new ReceiptAnalysisError('NETWORK', `Could not reach the vision backend at ${root}.`);
  }
  if (!enqueueRes.ok) throw await toError(enqueueRes);

  const { jobId } = await enqueueRes.json();
  if (!jobId) {
    throw new ReceiptAnalysisError('INTERNAL', 'Vision backend did not return a job id.');
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    let pollRes: Response;
    try {
      pollRes = await fetchWithTimeout(`${root}/jobs/${jobId}`, { headers: authHeader }, POLL_TIMEOUT_MS);
    } catch {
      throw new ReceiptAnalysisError('NETWORK', `Could not reach the vision backend at ${root}.`);
    }
    if (!pollRes.ok) throw await toError(pollRes);

    const body = await pollRes.json();
    if (body?.status === 'completed') {
      return { draft: normalizeReceiptDraft(body.result), raw: body.result };
    }
    if (body?.status === 'failed') {
      throw new ReceiptAnalysisError('FAILED', body?.error?.message ?? 'Receipt analysis failed.');
    }
    if (body?.status === 'rejected') {
      throw new ReceiptAnalysisError(
        body?.error?.code ?? 'NOT_A_RECEIPT',
        body?.error?.message ?? "This image doesn't look like a receipt or invoice.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.');
}
