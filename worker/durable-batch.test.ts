import { expect, test, describe } from 'bun:test';
import {
  isTransientDurableObjectError,
  withDurableRetry,
  mapWithConcurrency,
} from './durable-batch';

const PROD_ERROR =
  'Internal error while starting up Durable Object storage caused object to be reset; reference = 0amjj51q3i59qgseoc2gcgve';

describe('isTransientDurableObjectError', () => {
  test('recognises the production storage-reset error', () => {
    expect(isTransientDurableObjectError(new Error(PROD_ERROR))).toBe(true);
  });

  test('recognises other transient Durable Object failures', () => {
    const transient = [
      'Durable Object storage operation exceeded timeout which caused object to be reset',
      'Durable Object is overloaded',
      'Network connection lost',
      'Cannot resolve Durable Object due to transient issue',
    ];
    for (const message of transient) {
      expect(isTransientDurableObjectError(new Error(message))).toBe(true);
    }
  });

  test('does not treat application errors as transient', () => {
    const permanent = ['Concurrent modification detected', 'Feed not found', 'Invalid sender address'];
    for (const message of permanent) {
      expect(isTransientDurableObjectError(new Error(message))).toBe(false);
    }
  });
});

describe('withDurableRetry', () => {
  test('recovers when a transient failure precedes success', async () => {
    let calls = 0;
    const result = await withDurableRetry(async () => {
      calls++;
      if (calls < 3) throw new Error(PROD_ERROR);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  test('surfaces the error once attempts are exhausted', async () => {
    let calls = 0;
    const run = withDurableRetry(async () => {
      calls++;
      throw new Error(PROD_ERROR);
    }, 3);
    await expect(run).rejects.toThrow(/object to be reset/);
    expect(calls).toBe(3);
  });

  test('does not retry non-transient errors', async () => {
    let calls = 0;
    const run = withDurableRetry(async () => {
      calls++;
      throw new Error('Feed not found');
    });
    await expect(run).rejects.toThrow('Feed not found');
    expect(calls).toBe(1);
  });
});

describe('mapWithConcurrency', () => {
  test('preserves input order', async () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const results = await mapWithConcurrency(items, 4, async (n) => {
      await new Promise((r) => setTimeout(r, (25 - n) % 5));
      return n * 2;
    });
    expect(results).toEqual(items.map((n) => n * 2));
  });

  test('never exceeds the concurrency limit (regression: cold-start stampede)', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 50 }, (_, i) => i), 8, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
    });
    expect(peak).toBeLessThanOrEqual(8);
  });

  test('handles an empty list without spawning workers', async () => {
    expect(await mapWithConcurrency([], 8, async () => 1)).toEqual([]);
  });

  test('a single transient blip no longer fails the whole batch', async () => {
    const attempts = new Map<number, number>();
    const results = await mapWithConcurrency(Array.from({ length: 40 }, (_, i) => i), 8, (n) =>
      withDurableRetry(async () => {
        const seen = (attempts.get(n) ?? 0) + 1;
        attempts.set(n, seen);
        if (n === 17 && seen === 1) throw new Error(PROD_ERROR);
        return n;
      })
    );
    expect(results).toHaveLength(40);
    expect(results[17]).toBe(17);
    expect(attempts.get(17)).toBe(2);
  });
});
