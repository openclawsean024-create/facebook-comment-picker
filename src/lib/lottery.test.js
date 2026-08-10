import { describe, it, expect } from 'vitest';
import {
  parseList,
  parsePrizes,
  expandPrizeSlots,
  parseComments,
  hashString,
  mulberry32,
  shuffle,
  applyFilters,
} from './lottery';

describe('parseList', () => {
  it('trims and filters empty', () => {
    expect(parseList('a, b, ,c')).toEqual(['a', 'b', 'c']);
  });
  it('handles empty string', () => {
    expect(parseList('')).toEqual([]);
  });
});

describe('parsePrizes', () => {
  it('parses multi-line prize config', () => {
    const result = parsePrizes('頭獎 | 1\n貳獎 | 2\n參加獎 | 3');
    expect(result).toEqual([
      { name: '頭獎', count: 1 },
      { name: '貳獎', count: 2 },
      { name: '參加獎', count: 3 },
    ]);
  });
  it('handles missing count (default 1)', () => {
    expect(parsePrizes('神祕獎')).toEqual([{ name: '神祕獎', count: 1 }]);
  });
});

describe('expandPrizeSlots', () => {
  it('flattens prizes into slots', () => {
    const prizes = [{ name: 'A', count: 2 }, { name: 'B', count: 3 }];
    expect(expandPrizeSlots(prizes)).toEqual(['A', 'A', 'B', 'B', 'B']);
  });
});

describe('parseComments', () => {
  it('parses pipe-delimited', () => {
    const result = parseComments('王小明 | 我要抽大獎');
    expect(result[0]).toEqual({ name: '王小明', comment: '我要抽大獎', age: '' });
  });
  it('parses comma-delimited fallback', () => {
    const result = parseComments('王小明, 我要抽大獎');
    expect(result[0]).toEqual({ name: '王小明', comment: '我要抽大獎', age: '' });
  });
  it('handles malformed line as name only', () => {
    const result = parseComments('just_a_name');
    expect(result[0]).toEqual({ name: 'just_a_name', comment: '', age: '' });
  });
  it('handles multiple lines', () => {
    const result = parseComments('A | 1\nB | 2\nC | 3');
    expect(result.length).toBe(3);
  });
  it('skips empty lines', () => {
    const result = parseComments('A | 1\n\nB | 2');
    expect(result.length).toBe(2);
  });
});

describe('mulberry32 + hashString', () => {
  it('hashString produces deterministic output', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });
  it('hashString different inputs → different outputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('mulberry32 produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('mulberry32 same seed → same sequence', () => {
    const a = mulberry32(999);
    const b = mulberry32(999);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffle(items, 'seed');
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('same seed → same shuffle', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'seed-1');
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'seed-1');
    expect(a).toEqual(b);
  });
  it('different seeds → likely different shuffles', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'alpha');
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'beta');
    expect(a).not.toEqual(b);
  });
});

describe('applyFilters', () => {
  const entries = [
    { name: '王小明', comment: '我要抽大獎', age: '' },
    { name: '陳小華', comment: 'Logitech 福袋買起來', age: '' },
    { name: '張阿強', comment: '測試留言', age: '' },
    { name: '周大成', comment: '取消參加', age: '' },
    { name: '王小明', comment: '再留一次', age: '' },  // 重複姓名
  ];

  it('deduplicates by name', () => {
    const result = applyFilters(entries, { dedupeMode: 'name' });
    expect(result.length).toBe(4);
    // 王小明 出現 2 次,應該只保留 1 個
    const wangCount = result.filter((e) => e.name === '王小明').length;
    expect(wangCount).toBe(1);
  });

  it('deduplicates by comment', () => {
    const result = applyFilters(entries, { dedupeMode: 'comment' });
    expect(result.length).toBe(entries.length);
  });

  it('deduplicates by name+comment', () => {
    const result = applyFilters(entries, { dedupeMode: 'name-comment' });
    expect(result.length).toBe(entries.length);
  });

  it('no dedup keeps all', () => {
    const result = applyFilters(entries, { dedupeMode: 'none' });
    expect(result.length).toBe(entries.length);
  });

  it('blacklist name filter', () => {
    const result = applyFilters(entries, { blacklistNames: '周大成', dedupeMode: 'none' });
    expect(result.map((e) => e.name)).not.toContain('周大成');
  });

  it('exclude keywords', () => {
    const result = applyFilters(entries, { excludeKeywords: '測試,取消', dedupeMode: 'none' });
    expect(result.length).toBe(3);
  });

  it('required keywords', () => {
    // 全部都包含 '抽' - 5 個 (dedupeMode: none)
    const data = [
      { name: 'A', comment: '抽獎抽獎', age: '' },
      { name: 'B', comment: '我來抽', age: '' },
      { name: 'C', comment: '那我抽', age: '' },
      { name: 'D', comment: '給我抽', age: '' },
      { name: 'E', comment: '快點抽', age: '' },
    ];
    const result = applyFilters(data, { requiredKeywords: '抽', dedupeMode: 'none' });
    expect(result.length).toBe(5);
  });

  it('required keywords filters out non-matching', () => {
    const data = [
      { name: 'A', comment: '我要抽', age: '' },
      { name: 'B', comment: '哈哈', age: '' },
      { name: 'C', comment: '不抽', age: '' },
    ];
    const result = applyFilters(data, { requiredKeywords: '抽', dedupeMode: 'none' });
    expect(result.length).toBe(2);
  });

  it('combined filters', () => {
    const result = applyFilters(entries, {
      requiredKeywords: '抽',
      excludeKeywords: '取消',
      dedupeMode: 'name',
    });
    expect(result.every((e) => e.comment.includes('抽') && !e.comment.includes('取消'))).toBe(true);
  });
});
