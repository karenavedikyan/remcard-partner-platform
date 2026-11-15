export class RemcardApiError extends Error {}

export async function remcardFetch<T>(_path: string, _opts?: unknown): Promise<T> {
  throw new Error("HARNESS: remcardFetch disabled");
}

export async function remcardFetchBlob(_path: string) {
  throw new Error("HARNESS: remcardFetchBlob disabled");
}