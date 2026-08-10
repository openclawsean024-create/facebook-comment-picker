import { describe, it, expect, beforeEach } from 'vitest';

// 用 import().then() 來 reload module 來測 isolated buckets
async function freshRateLimit() {
  const mod = await import('../../api/_lib/rate-limit.js?t=' + Date.now());
  return mod;
}

describe('rateLimit', () => {
  it('first request allowed', async () => {
    const { rateLimit } = await freshRateLimit();
    const req = { headers: { 'x-forwarded-for': '1.1.1.1' }, socket: {} };
    const res = rateLimit(req, { maxRequests: 5, windowMs: 60_000 });
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it('blocks after limit', async () => {
    const { rateLimit } = await freshRateLimit();
    const req = { headers: { 'x-forwarded-for': '2.2.2.2' }, socket: {} };
    for (let i = 0; i < 5; i++) rateLimit(req, { maxRequests: 5, windowMs: 60_000 });
    const blocked = rateLimit(req, { maxRequests: 5, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
  });

  it('different IPs isolated', async () => {
    const { rateLimit } = await freshRateLimit();
    const a = { headers: { 'x-forwarded-for': '3.3.3.3' }, socket: {} };
    const b = { headers: { 'x-forwarded-for': '4.4.4.4' }, socket: {} };
    for (let i = 0; i < 5; i++) rateLimit(a, { maxRequests: 5, windowMs: 60_000 });
    expect(rateLimit(b, { maxRequests: 5, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('different buckets isolated', async () => {
    const { rateLimit } = await freshRateLimit();
    const req = { headers: { 'x-forwarded-for': '5.5.5.5' }, socket: {} };
    for (let i = 0; i < 5; i++) rateLimit(req, { maxRequests: 5, windowMs: 60_000, bucket: 'a' });
    expect(rateLimit(req, { maxRequests: 5, windowMs: 60_000, bucket: 'b' }).allowed).toBe(true);
  });
});

describe('rateLimitResponse', () => {
  it('returns 429 when blocked', async () => {
    const { rateLimitResponse } = await freshRateLimit();
    const req = { headers: { 'x-forwarded-for': '6.6.6.6' }, socket: {} };
    const res = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
    };
    rateLimitResponse(req, res, { maxRequests: 1, windowMs: 60_000, bucket: 'test' });
    const blocked = rateLimitResponse(req, res, { maxRequests: 1, windowMs: 60_000, bucket: 'test' });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toBe('Rate limit exceeded');
  });

  it('sets X-RateLimit-* headers on success', async () => {
    const { rateLimitResponse } = await freshRateLimit();
    const req = { headers: { 'x-forwarded-for': '7.7.7.7' }, socket: {} };
    const res = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
    };
    rateLimitResponse(req, res, { maxRequests: 10, windowMs: 60_000, bucket: 'test2' });
    expect(res.headers['X-RateLimit-Limit']).toBe('10');
    expect(res.headers['X-RateLimit-Remaining']).toBe('9');
  });
});
