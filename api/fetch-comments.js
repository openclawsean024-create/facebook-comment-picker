export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = String(req.query.url || '').trim();
  const scrapeSource = req.query.scrapeSource || 'graph-api';
  const rapidApiKey = req.query.rapidApiKey || process.env.RAPID_API_KEY;

  if (!url) {
    return res.status(400).json({ error: 'Missing Facebook post URL' });
  }

  if (!/^https?:\/\/(www\.)?facebook\.com\//i.test(url)) {
    return res.status(400).json({ error: 'Only facebook.com public post URLs are supported' });
  }

  // ── RapidAPI mode ──────────────────────────────────────────────────────────
  if (scrapeSource === 'rapid-api' && rapidApiKey) {
    try {
      const result = await fetchCommentsRapidApi(url, rapidApiKey);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || 'RapidAPI fetch failed' });
    }
  }

  // ── Graph API mode ──────────────────────────────────────────────────────────
  const accessToken = req.query.fbAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (accessToken) {
    try {
      const result = await fetchCommentsGraphApi(url, accessToken, req.query);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[Graph API] Error:', error.message);
    }
  }

  // ── Jina fallback mode ──────────────────────────────────────────────────────
  try {
    const target = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/plain, text/markdown;q=0.9, */*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream fetch failed: ${response.status}`);
    }

    const markdown = await response.text();
    const parsed = parseFacebookMarkdown(markdown, url);
    parsed.postTitle = repairText(parsed.postTitle);
    parsed.commentCountText = repairText(parsed.commentCountText);
    parsed.comments = parsed.comments.map(item => ({
      ...item,
      name: repairText(item.name),
      comment: repairText(item.comment),
      age: repairText(item.age)
    }));

    return res.status(200).json({
      ok: true,
      source: 'r.jina.ai',
      requestedUrl: url,
      resolvedUrl: parsed.resolvedUrl,
      postTitle: parsed.postTitle,
      commentCountText: parsed.commentCountText,
      extractedCount: parsed.comments.length,
      comments: parsed.comments,
      note: 'Practical public-post mode: extracts comments visible in the public rendered page snapshot. It may not include every hidden/reply/paginated comment.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to fetch comments'
    });
  }
}

// ── RapidAPI Facebook Scraper ────────────────────────────────────────────────
async function fetchCommentsRapidApi(postUrl, apiKey) {
  // Use RapidAPI Facebook Post Comments Scraper API
  const rapidApiHost = 'facebook-post-comments-scraper.p.rapidapi.com';

  const response = await fetch(
    `https://${rapidApiHost}/api/facebook/post/comments?url=${encodeURIComponent(postUrl)}`,
    {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': rapidApiHost,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`RapidAPI error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawComments = data.comments || data.data || data.result || [];
  const comments = [];

  for (const item of rawComments) {
    const name = (item.author || item.name || item.username || item.user || '').trim();
    const comment = (item.text || item.message || item.comment || item.body || '').trim();
    if (!name || !comment) continue;
    comments.push({ name, comment, age: '' });
  }

  return {
    ok: true,
    source: 'rapid-api',
    postTitle: data.title || data.postTitle || 'Facebook Post',
    commentCountText: `${comments.length} 則留言`,
    extractedCount: comments.length,
    comments,
    note: 'Fetched via RapidAPI Facebook Scraper. Get a key at rapidapi.com and subscribe to the Facebook Post Comments Scraper API.',
  };
}

// ── Facebook Graph API ────────────────────────────────────────────────────────

/**
 * Extract post ID from a Facebook post URL.
 * Supports: facebook.com/username/posts/123, facebook.com/photo?fbid=123,
 *          facebook.com/groups/x/posts/123, facebook.com/story.php?story_fbid=...
 */
function extractPostId(url) {
  // Normalize: strip trailing slash and query string for parsing
  const clean = url.replace(/\?.*$/, '').replace(/\/$/, '');

  // Pattern 1: /photo?fbid=123 or /photo.php?fbid=123
  const fbidMatch = clean.match(/facebook\.com\/[^/]+\/(?:photo|video|story)\.php\?fbid=(\d+)/i);
  if (fbidMatch) return fbidMatch[1];

  // Pattern 2: /username/posts/123456
  const postsMatch = clean.match(/facebook\.com\/([^/]+)\/posts\/(\d+)/i);
  if (postsMatch) return postsMatch[2];

  // Pattern 3: /username/photos/123456
  const photosMatch = clean.match(/facebook\.com\/([^/]+)\/photos\/(\d+)/i);
  if (photosMatch) return photosMatch[2];

  // Pattern 4: /groups/123456/posts/789
  const groupMatch = clean.match(/facebook\.com\/groups\/(\d+)\/posts\/(\d+)/i);
  if (groupMatch) return groupMatch[2];

  // Pattern 5: /story.php?story_fbid=123456&...
  const storyMatch = clean.match(/story_fbid=(\d+)/i);
  if (storyMatch) return storyMatch[1];

  // Pattern 6: /reel/123456 or /watch/?v=123
  const reelMatch = clean.match(/facebook\.com\/(?:reel|watch)\/(\d+)/i);
  if (reelMatch) return reelMatch[1];

  // Pattern 7: bare numeric ID in path
  const bareMatch = clean.match(/facebook\.com\/(\d{10,})/);
  if (bareMatch) return bareMatch[1];

  return null;
}

/**
 * Fetch all comments from a Facebook post via Graph API with pagination.
 * @param {string} postUrl - The Facebook post URL
 * @param {string} accessToken - Page access token
 * @param {object} query - Optional: limit, filter (query params)
 */
async function fetchCommentsGraphApi(postUrl, accessToken, query = {}) {
  const postId = extractPostId(postUrl);
  if (!postId) {
    throw new Error('Could not extract post ID from URL. Ensure the URL is a direct Facebook post link.');
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  // Exchange for long-lived token if app credentials are provided
  let token = accessToken;
  if (appId && appSecret) {
    try {
      const exchanged = await exchangeForLongLivedToken(accessToken, appId, appSecret);
      if (exchanged) token = exchanged;
    } catch (e) {
      console.warn('[Graph API] Token exchange failed, using short-lived token:', e.message);
    }
  }

  const limit = parseInt(query.limit) || 100;
  const filter = query.filter || 'stream'; // 'stream' = all comments with replies

  const allComments = [];
  let after = null;
  let totalCount = null;
  let page = 0;
  const MAX_PAGES = 50; // safety cap (~5000 comments)

  const baseUrl = `https://graph.facebook.com/v18.0/${postId}/comments`;

  while (page < MAX_PAGES) {
    page++;
    const params = new URLSearchParams({
      access_token: token,
      limit: limit.toString(),
      filter: 'stream',
      fields: [
        'id',
        'message',
        'created_time',
        'from{id,name,picture}',
        'like_count',
        'comment_count',
        'parent{id}',
        'attachment'
      ].join(','),
      after: after || ''
    });

    // Remove empty after param on first request
    if (!after) params.delete('after');

    const apiUrl = `${baseUrl}?${params.toString()}`;
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const body = await response.text();
      // If token expired or permission denied, throw with clear message
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Graph API auth error (${response.status}): ${body}. Check your FACEBOOK_PAGE_ACCESS_TOKEN.`);
      }
      throw new Error(`Graph API error ${response.status}: ${body}`);
    }

    const data = await response.json();

    if (!data.data) break;

    // Extract total count from paging info (if available on first page)
    if (data.summary && data.summary.total_count && totalCount === null) {
      totalCount = data.summary.total_count;
    }

    for (const item of data.data) {
      // Skip placeholder/system comments
      if (!item.from || !item.message) continue;

      const comment = {
        id: item.id,
        name: item.from?.name || 'Unknown',
        authorId: item.from?.id || '',
        comment: item.message,
        age: formatRelativeTime(item.created_time),
        createdAt: item.created_time,
        likeCount: item.like_count || 0,
        replyCount: item.comment_count || 0,
        // Flag if this is a reply (has parent)
        isReply: !!item.parent && item.parent.id !== postId,
        // First 3 attachments as simple URLs (photos, etc.)
        attachments: (item.attachment || []).map(a => a.media?.image?.src || a.target?.url || a.url || '').filter(Boolean)
      };

      allComments.push(comment);
    }

    // Handle pagination
    if (data.paging && data.paging.cursors && data.paging.cursors.after) {
      after = data.paging.cursors.after;
    } else if (data.paging && data.paging.next) {
      // Use next URL directly (simpler for some API responses)
      const nextResponse = await fetch(data.paging.next, {
        headers: { 'Accept': 'application/json' }
      });
      if (nextResponse.ok) {
        const nextData = await nextResponse.json();
        if (!nextData.data || nextData.data.length === 0) break;
        // Continue loop with same after cursor (cursors are in next URL)
        continue;
      }
    } else {
      break; // No more pages
    }
  }

  // Also fetch replies for each top-level comment (if not already included via filter=stream)
  // Graph API with filter=stream already returns replies nested, so this is handled above.

  return {
    ok: true,
    source: 'facebook_graph_api',
    requestedUrl: postUrl,
    postId,
    mode: 'graph_api',
    postTitle: null, // Caller can optionally fetch /?fields=message,story from the post endpoint
    commentCountText: totalCount !== null ? `${totalCount} 則留言` : `${allComments.length} 則留言（已抓取）`,
    extractedCount: allComments.length,
    totalAvailable: totalCount,
    pagesFetched: page,
    comments: allComments,
    note: `Graph API mode — fetched ${allComments.length} comment entries across ${page} page(s). Set FACEBOOK_PAGE_ACCESS_TOKEN env var to use this mode.`
  };
}

/**
 * Exchange short-lived page access token for long-lived (60-day) token.
 */
async function exchangeForLongLivedToken(shortLivedToken, appId, appSecret) {
  const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.access_token || null;
}

/**
 * Convert ISO date string to a human-friendly relative time string (Chinese).
 */
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return `${diffSec}秒`;
  if (diffMin < 60) return `${diffMin}分鐘`;
  if (diffHr < 24) return `${diffHr}小時`;
  if (diffDay < 7) return `${diffDay}天`;
  if (diffWeek < 4) return `${diffWeek}週`;
  if (diffMonth < 12) return `${diffMonth}個月`;
  return `${Math.floor(diffMonth / 12)}年`;
}

// ── Jina fallback mode helpers ─────────────────────────────────────────────────

function parseFacebookMarkdown(markdown, fallbackUrl) {
  const normalized = markdown.replace(/\r/g, '');
  const lines = normalized.split('\n').map(line => line.trimEnd());
  const resolvedUrl = matchValue(normalized, /^URL Source:\s*(.+)$/m) || fallbackUrl;
  const postTitle = matchValue(normalized, /^Title:\s*(.+)$/m) || 'Facebook 公開貼文';

  const countMatch = normalized.match(/(\d+)\s*(?:則)?留言/i) || normalized.match(/Comment[s]?[\s\S]{0,40}?(\d+)/i);
  const commentCountText = countMatch ? `${countMatch[1]} 則留言` : '未知';

  const comments = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const nameMatch = line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/[^)]*comment_id=[^)]*\)$/i)
      || line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/[^(\s]+\/?\?comment_id=[^)]*\)$/i)
      || line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/people\/[^)]*comment_id=[^)]*\)$/i);
    if (!nameMatch) continue;

    const name = cleanup(nameMatch[1]);
    if (!isLikelyPersonName(name)) continue;

    let comment = '';
    let age = '';

    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const probe = lines[j].trim();
      if (!probe) continue;
      if (/^\*/.test(probe) && /\[[^\]]+\]\([^\)]*comment_id=/i.test(probe)) {
        const ageMatch = probe.match(/\[([^\]]+)\]\([^\)]*comment_id=/i);
        if (ageMatch) age = cleanup(ageMatch[1]);
        break;
      }
      if (/^\[.*\]\(https?:\/\/www\.facebook\.com\//i.test(probe)) continue;
      if (/^!\[Image/i.test(probe)) continue;
      if (/^Comment$/i.test(probe) || /^Most relevant$/i.test(probe) || /^All reactions/i.test(probe) || /^View more/i.test(probe)) continue;
      if (looksLikeCommentText(probe)) {
        comment = cleanup(probe);
        continue;
      }
    }

    const key = `${name.toLowerCase()}__${comment.toLowerCase()}`;
    if (!comment || seen.has(key)) continue;
    seen.add(key);
    comments.push({ name, comment, age });
  }

  return { resolvedUrl, postTitle, commentCountText, comments };
}

function matchValue(text, regex) {
  const match = text.match(regex);
  return match ? cleanup(match[1]) : '';
}

function cleanup(value) {
  return String(value || '')
    .replace(/^#+\s*/, '')
    .replace(/^[*\-•\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyPersonName(name) {
  if (!name) return false;
  if (name.length > 40) return false;
  if (/^(Log In|Forgot Account|Comment|Most relevant|Facebook|Logitech|Reply|Like)$/i.test(name)) return false;
  if (/^[0-9]+$/.test(name)) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(name);
}

function looksLikeCommentText(line) {
  if (!line) return false;
  if (line.length > 220) return false;
  if (/^https?:\/\//i.test(line)) return false;
  if (/^\[.*\]\(.*\)$/.test(line)) return false;
  if (/^(\d+[wdhm]|\d+天|\d+週|\d+小時|\d+分鐘)$/i.test(line)) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(line);
}

function repairText(input) {
  const text = cleanup(input);
  if (!text) return text;
  if (!/[ÃÂÐÑØÙÚÛÜÝÞßà-ÿ�]/.test(text)) return text;
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8').replace(/�/g, '').trim();
    return repaired || text;
  } catch {
    return text;
  }
}
