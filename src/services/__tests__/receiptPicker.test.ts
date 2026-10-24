import { getImageBase64 } from '../receiptPicker';

const OriginalFileReader = globalThis.FileReader;

afterEach(() => {
  globalThis.FileReader = OriginalFileReader;
});

it('reads a base64 asset and keeps its mime type', async () => {
  await expect(
    getImageBase64({ base64: 'abc', mimeType: 'image/png' } as any),
  ).resolves.toEqual({ base64: 'abc', mimeType: 'image/png' });
});

it('defaults the mime type to jpeg', async () => {
  await expect(getImageBase64({ base64: 'abc' } as any)).resolves.toEqual({
    base64: 'abc',
    mimeType: 'image/jpeg',
  });
});

it('reads a web file asset through FileReader', async () => {
  class FakeFileReader {
    result: string | ArrayBuffer | null = 'data:image/png;base64,Zm9v';
    onload: (() => void) | null = null;
    onerror: ((error?: unknown) => void) | null = null;

    readAsDataURL() {
      this.onload?.();
    }
  }

  globalThis.FileReader = FakeFileReader as any;

  await expect(getImageBase64({ file: {} } as any)).resolves.toEqual({
    base64: 'Zm9v',
    mimeType: 'image/jpeg',
  });
});

it('returns null when the asset has no base64 or file', async () => {
  await expect(getImageBase64({} as any)).resolves.toBeNull();
});
