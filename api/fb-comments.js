/**
 * GET /api/fb-comments
 * 以 Facebook Graph API 抓取指定貼文留言
 * 需傳入 URL + access token
 */
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

  const { url, token, limit = 100 } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing post URL' });
  }

  const postId = extractPostId(url);
  if (!postId) {
    return res.status(400).json({ error: 'Could not extract post ID from URL' });
  }

  // 優先使用傳入的 user token，其次用環境變數的 page token
  const accessToken = token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(401).json({ error: 'No Facebook access token provided' });
  }

  try {
    const comments = await fetchAllComments(postId, accessToken, parseInt(limit));
    const postInfo = await fetchPostInfo(postId, accessToken);

    return res.status(200).json({
      ok: true,
      source: 'facebook_graph_api',
      postId,
      postTitle: postInfo?.message || postInfo?.story || null,
      commentCountText: `${comments.length} 則留言`,
      extractedCount: comments.length,
      comments,
    });
  } catch (error) {
    // 如果是 ScraperAPI fallback scenario
    if (req.query.fallback !== 'false') {
      return res.status(200).json({
        ok: false,
        error: error.message,
        source: 'graph_api',
        fallback: true,
      });
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// ── Extract post ID from URL ──────────────────────────────────────────────────

function extractPostId(rawUrl) {
  const url = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');

  const patterns = [
    // /username/posts/123456
    [/facebook\.com\/([^/?\s]+)\/posts\/(\d+)/i, 2],
    // /groups/123/posts/456
    [/facebook\.com\/groups\/(\d+)\/posts\/(\d+)/i, 2],
    // /photo?fbid=123
    [/facebook\.com\/[^/?\s]+\/(?:photo|video|story)\.php\?fbid=(\d+)/i, 1],
    // /reel/123456
    [/facebook\.com\/(?:reel|watch)\/(\d+)/i, 1],
    // /story.php?story_fbid=123
    [/story_fbid=(\d+)/i, 1],
    // bare numeric
    [/facebook\.com\/(\d{10,})/i, 1],
  ];

  for (const [regex, groupIdx] of patterns) {
    const match = url.match(regex);
    if (match && match[groupIdx]) return match[groupIdx];
  }
  return null;
}

// ── Fetch post info ─────────────────────────────────────────────────────────

async function fetchPostInfo(postId, accessToken) {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,message,story,created_time,full_picture,permalink_url',
  });
  const resp = await fetch(`https://graph.facebook.com/v18.0/${postId}?${params}`);
  if (!resp.ok) return null;
  return resp.json();
}

// ── Fetch all comments with pagination ─────────────────────────────────────

async function fetchAllComments(postId, accessToken, limit = 100) {
  const allComments = [];
  let after = null;
  let page = 0;
  const MAX_PAGES = 50;

  const baseFields = [
    'id', 'message', 'created_time',
    'from{id,name,picture}',
    'like_count', 'comment_count',
    'parent{id}',
  ].join(',');

  while (page < MAX_PAGES) {
    page++;
    const params = new URLSearchParams({
      access_token: accessToken,
      limit: String(limit),
      filter: 'stream',
      fields: baseFields,
    });
    if (after) params.set('after', after);

    const resp = await fetch(`https://graph.facebook.com/v18.0/${postId}/comments?${params}`);
    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Graph API auth error (${resp.status}): token may be expired or lacks permissions.`);
      }
      throw new Error(`Graph API error ${resp.status}: ${body}`);
    }

    const data = await resp.json();
    if (!data.data?.length) break;

    for (const item of data.data) {
      if (!item.from || !item.message) continue;
      allComments.push({
        id: item.id,
        name: item.from.name || 'Unknown',
        authorId: item.from.id || '',
        comment: item.message,
        createdAt: item.created_time,
        likeCount: item.like_count || 0,
        replyCount: item.comment_count || 0,
        isReply: !!(item.parent && item.parent.id !== postId),
      });
    }

    if (data.paging?.cursors?.after) {
      after = data.paging.cursors.after;
    } else {
      break;
    }
  }

  return allComments;
}
