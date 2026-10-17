// Local standalone shim for the Amazon Quick runtime library.
// In Amazon Quick this is provided by '@amzn/quick-pages-runtime-lib'. Locally,
// the same surface is backed by the DevMemory API server.

export class PageStorageError extends Error {}
export class AIInferenceError extends Error {}

interface SharedItem { item: { value: string } | null; }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `API request failed (${response.status}).`);
  return payload as T;
}

export async function getSharedItem(args: { tableName: string; key: string }): Promise<SharedItem | null> {
  return api<SharedItem>(`/api/memory?tableName=${encodeURIComponent(args.tableName)}&key=${encodeURIComponent(args.key)}`);
}

export async function putSharedItem(args: { tableName: string; key: string; value: string }): Promise<void> {
  await api('/api/memory', { method: 'PUT', body: JSON.stringify(args) });
}

// ---- AI client ----
export const aiClient = {
  async prompt(modelId: string, text: string, system?: string): Promise<string> {
    try {
      const result = await api<{ text: string }>('/api/ai/prompt', {
        method: 'POST',
        body: JSON.stringify({ modelId, text, system }),
      });
      return result.text;
    } catch (error) {
      throw new AIInferenceError(error instanceof Error ? error.message : 'AI request failed.');
    }
  },
};
