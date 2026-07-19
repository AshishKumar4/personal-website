const TRANSIENT_ERROR_PATTERNS = [
  'object to be reset',
  'internal error',
  'exceeded timeout',
  'overloaded',
  'network connection lost',
  'cannot resolve durable object',
  'durable object reset',
];

const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_CONCURRENCY = 8;
const BASE_BACKOFF_MS = 50;

export function isTransientDurableObjectError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function backoffDelay(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * BASE_BACKOFF_MS);
}

export async function withDurableRetry<T>(
  operation: () => Promise<T>,
  attempts: number = DEFAULT_ATTEMPTS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDurableObjectError(error)) throw error;
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
      }
    }
  }
  throw lastError;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (let index = cursor++; index < items.length; index = cursor++) {
        results[index] = await fn(items[index]);
      }
    })
  );
  return results;
}
