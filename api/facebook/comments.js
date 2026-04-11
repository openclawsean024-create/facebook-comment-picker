/**
 * GET /api/facebook/comments
 * 以 Facebook Graph API 抓取指定貼文留言（支援分頁）
 * 需傳入 postId 或 url + accessToken
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url, postId, token, limit = 100 } = req.query;

  // Extract postId from URL if not provided
  const id = postId || extractPostId(url || '');
  if (!id) {
    return res.status(400).json({ error: 'Missing post ID — provide postId or url parameter' });
  }

  const accessToken = token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(401).json({
      error: 'No Facebook access token provided',
      hint: 'Pass ?token=YOUR_TOKEN or set FACEBOOK_PAGE_ACCESS_TOKEN env var',
    });
  }

  try {
    const result = await fetchAllComments(id, accessToken, parseInt(limit));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// ── Post ID extraction ───────────────────────────────────────────────────────

export function extractPostId(rawUrl) {
  if (!rawUrl) return null;
  const url = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');

  const patterns = [
    [/facebook\.com\/([^/?\s]+)\/posts\/(\d+)/i, 2],
    [/facebook\.com\/groups\/(\d+)\/posts\/(\d+)/i, 2],
    [/facebook\.com\/[^/?\s]+\/(?:photo|video|story)\.php\?fbid=(\d+)/i, 1],
    [/facebook\.com\/([^/]+)\/photos\/(\d+)/i, 2],
    [/facebook\.com\/(?:reel|watch)\/(\d+)/i, 1],
    [/facebook\.com\/watch\/\?v=(\d+)/i, 1],
    [/story_fbid=(\d+)/i, 1],
    [/facebook\.com\/(\d{10,})/i, 1],
  ];

  for (const [regex, groupIdx] of patterns) {
    const match = url.match(regex);
    if (match && match[groupIdx]) return match[groupIdx];
  }
  return null;
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
      fields: baseFields,
    });
    if (after) params.set('after', after);

    const resp = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/comments?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Graph API auth error (${resp.status}): token expired or lacks pages_read_engagement permission.`);
      }
      throw new Error(`Graph API error ${resp.status}: ${body.slice(0, 300)}`);
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

  // Fetch post info
  let postTitle = null;
  try {
    const postResp = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?access_token=${accessToken}&fields=id,message,story,created_time,permalink_url`
    );
    if (postResp.ok) {
      const postInfo = await postResp.json();
      postTitle = postInfo.message || postInfo.story || null;
    }
  } catch (_) {}

  return {
    ok: true,
    source: 'facebook_graph_api',
    postId,
    postTitle,
    commentCountText: `${allComments.length} 則留言`,
    extractedCount: allComments.length,
    pagesFetched: page,
    comments: allComments,
    note: `Graph API — fetched ${allComments.length} comments across ${page} page(s).`,
  };
}
