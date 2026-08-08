/**
 * GET /api/facebook/page-comments
 * 用 page-level access_token 抓取指定粉專貼文的所有留言
 *
 * Query params:
 *   - postId (required): 貼文 ID
 *   - token (required): page-level access token
 *   - limit (optional, default 100, max 100 per page)
 *   - maxPages (optional, default 20,封頂 100)
 *
 * Response:
 *   { ok, postId, postTitle, extractedCount, pagesFetched, comments: [...] }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { postId, token } = req.query;
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 100);
  const maxPages = Math.min(parseInt(req.query.maxPages || '20', 10), 100);

  if (!postId || !token) {
    return res.status(400).json({ error: 'Missing postId or token' });
  }

  try {
    const result = await fetchAllComments(postId, token, limit, maxPages);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function fetchAllComments(postId, accessToken, limit, maxPages) {
  const allComments = [];
  let after = null;
  let page = 0;

  const baseFields = [
    'id',
    'message',
    'created_time',
    'from{id,name,picture}',
    'like_count',
    'comment_count',
    'parent{id}',
  ].join(',');

  while (page < maxPages) {
    page += 1;
    const params = new URLSearchParams({
      access_token: accessToken,
      limit: String(limit),
      filter: 'toplevel', // 抓頂層留言(不包含 reply,以免重複)
      fields: baseFields,
    });
    if (after) params.set('after', after);

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${postId}/comments?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Graph API 驗證失敗 (${resp.status}): token 可能過期或缺少 pages_read_engagement 權限。`);
      }
      throw new Error(`Graph API 錯誤 ${resp.status}: ${body.slice(0, 300)}`);
    }

    const data = await resp.json();
    if (data.error) {
      throw new Error(data.error.message || 'Graph API 未知錯誤');
    }

    if (!data.data?.length) break;

    for (const item of data.data) {
      if (!item.from || !item.message) continue;
      allComments.push({
        id: item.id,
        name: item.from.name || 'Unknown',
        authorId: item.from.id || '',
        picture: item.from.picture?.data?.url || null,
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

  // 抓貼文標題（message / story）
  let postTitle = null;
  try {
    const postResp = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?access_token=${accessToken}&fields=id,message,story,permalink_url`
    );
    if (postResp.ok) {
      const postInfo = await postResp.json();
      postTitle = (postInfo.message || postInfo.story || null)?.slice(0, 200) || null;
    }
  } catch (_) { /* 取不到標題不致命 */ }

  return {
    ok: true,
    source: 'facebook_graph_api',
    postId,
    postTitle,
    extractedCount: allComments.length,
    pagesFetched: page,
    commentCountText: `${allComments.length} 則留言`,
    comments: allComments,
    note: `已用 page-level token 抓取 ${allComments.length} 筆留言（${page} 頁）`,
  };
}
