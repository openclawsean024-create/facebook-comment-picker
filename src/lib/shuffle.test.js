import { describe, it, expect } from 'vitest';
// 直接 import 純抽獎核心 (使用 node-only path)
// 因為 api/draw.js 是 Vercel serverless function,我們只能 unit test 邏輯
// 從 src/lib/lottery.js 抽出的函數已涵蓋大部分

// 此處額外測試: shuffle 的 100 筆資料分佈
import { shuffle, mulberry32, hashString } from './lottery';

describe('shuffle statistical sanity', () => {
  it('produces a permutation (no duplicates)', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const shuffled = shuffle(items, 'seed');
    expect(new Set(shuffled).size).toBe(100);
  });

  it('shuffled order different from input for length >= 5', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const shuffled = shuffle(items, 'test');
    expect(shuffled).not.toEqual(items);
  });

  it('mulberry32 distribution roughly uniform', () => {
    const rng = mulberry32(42);
    const buckets = Array(10).fill(0);
    for (let i = 0; i < 10000; i++) {
      buckets[Math.floor(rng() * 10)] += 1;
    }
    // 每個 bucket 期望 1000,允許 ±20% 偏差
    for (const b of buckets) {
      expect(b).toBeGreaterThan(800);
      expect(b).toBeLessThan(1200);
    }
  });
});

describe('hashString idempotency', () => {
  it('returns 0 or positive 32-bit int', () => {
    for (const s of ['', 'a', 'test', '粉絲團', '🎉']) {
      const h = hashString(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
