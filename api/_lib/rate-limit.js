/**
 * 簡單 in-memory rate limit
 * 警告: Vercel serverless functions 在 cold start 會重新初始化,所以這個不是 100% 跨 invocation 準確
 * 對低 traffic 個人 tool 夠用;production scale 應該升級 Vercel KV 或 Upstash
 */

const buckets = new Map(); // key = "${ip}:${window}", value = { count, resetAt }

function getClientIp(req) {
  // Vercel 自動加 x-forwarded-for / x-real-ip
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers['x-real-ip'];
  if (xri) return xri.trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(req, opts = {}) {
  const {
    windowMs = 60_000, // 1 分鐘
    maxRequests = 60,   // 每 window 60 個請求
    bucket = 'default', // 不同 endpoint 用不同 bucket
  } = opts;

  const ip = getClientIp(req);
  const window = Math.floor(Date.now() / windowMs);
  const key = `${ip}:${bucket}:${window}`;

  const current = buckets.get(key) || { count: 0, resetAt: (window + 1) * windowMs };
  current.count += 1;
  buckets.set(key, current);

  // 清理過期 buckets (避免 memory leak)
  if (buckets.size > 10000) {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
    limit: maxRequests,
  };
}

/**
 * 在 Vercel Serverless Function 中套用 rate limit
 * @returns {Response|undefined} 如果被擋下回傳 429,否則回傳 undefined
 */
export function rateLimitResponse(req, res, opts) {
  const result = rateLimit(req, opts);
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
    res.status(429).json({
      error: 'Rate limit exceeded',
      limit: result.limit,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
    return res;
  }
  return null;
}
