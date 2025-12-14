export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || `Request failed: ${response.status}`;
  } catch {
    return `Request failed: ${response.status}`;
  }
}

export async function handleApiError(response: Response): Promise<never> {
  const message = await parseApiError(response);
  throw new Error(message);
}
