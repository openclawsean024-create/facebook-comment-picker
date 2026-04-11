/**
 * GET /api/facebook/parse-post
 * 從 Facebook 貼文 URL 解析出 post ID
 * 支援：posts/、photo?fbid=、groups/、story_fbid=、reels/、watch/ 等格式
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  const postId = extractPostId(url);
  if (!postId) {
    return res.status(422).json({
      error: 'Could not extract post ID from URL',
      hint: 'Supported formats: facebook.com/username/posts/ID, facebook.com/photo?fbid=ID, facebook.com/groups/ID/posts/ID, etc.',
      provided: url,
    });
  }

  return res.status(200).json({
    ok: true,
    postId,
    originalUrl: url,
    normalizedUrl: normalizeUrl(url, postId),
  });
}

/**
 * Extract post ID from Facebook post URL.
 */
export function extractPostId(rawUrl) {
  const url = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');

  const patterns = [
    // /username/posts/123456
    [/facebook\.com\/([^/?\s]+)\/posts\/(\d+)/i, 2],
    // /groups/123/posts/456
    [/facebook\.com\/groups\/(\d+)\/posts\/(\d+)/i, 2],
    // /photo?fbid=123 or /photo.php?fbid=123
    [/facebook\.com\/[^/?\s]+\/(?:photo|video|story)\.php\?fbid=(\d+)/i, 1],
    // /username/photos/123456
    [/facebook\.com\/([^/]+)\/photos\/(\d+)/i, 2],
    // /reel/123456
    [/facebook\.com\/(?:reel|watch)\/(\d+)/i, 1],
    // /watch/?v=123
    [/facebook\.com\/watch\/\?v=(\d+)/i, 1],
    // /story.php?story_fbid=123
    [/story_fbid=(\d+)/i, 1],
    // /permalink.php?story_fbid=xxx&id=xxx
    [/permalink\.php\?story_fbid=(\d+)/i, 1],
    // bare numeric ID
    [/facebook\.com\/(\d{10,})/i, 1],
  ];

  for (const [regex, groupIdx] of patterns) {
    const match = url.match(regex);
    if (match && match[groupIdx]) return match[groupIdx];
  }
  return null;
}

function normalizeUrl(url, postId) {
  return `https://www.facebook.com/posts/${postId}`;
}
