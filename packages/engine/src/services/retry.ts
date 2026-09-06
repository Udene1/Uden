export async function retryWithBackoff<T>(operation: () => Promise<T>, shouldRetry: (error: unknown) => boolean, maxRetries = 2, baseDelayMs = 250): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) throw error;
      const delay = Math.min(baseDelayMs * (2 ** attempt), 2_000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}
