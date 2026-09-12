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
    date: typeof d.date === 'string' ? d.date : '',
    time: typeof d.time === 'string' ? d.time : '',
    note: typeof d.note === 'string' ? d.note : '',
    items,
  };
}

const REQUEST_TIMEOUT_MS = 20000;

export async function analyzeReceipt(imageBase64: string, mimeType: string): Promise<ReceiptDraft> {
  const { baseUrl, apiKey } = getVisionConfig();
  if (!baseUrl || !apiKey) {
    throw new ReceiptAnalysisError('NOT_CONFIGURED', 'Vision backend is not configured.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image: { base64: imageBase64, mimeType } }),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.');
    }
    throw new ReceiptAnalysisError('NETWORK', 'Could not reach the vision backend.');
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    let code = 'INTERNAL';
    let message = 'Receipt analysis failed.';
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {}
    throw new ReceiptAnalysisError(code, message);
  }
  return normalizeReceiptDraft(await res.json());
}
