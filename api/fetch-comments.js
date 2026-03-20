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
  if (!url) {
    return res.status(400).json({ error: 'Missing Facebook post URL' });
  }

  if (!/^https?:\/\/(www\.)?facebook\.com\//i.test(url)) {
    return res.status(400).json({ error: 'Only facebook.com public post URLs are supported' });
  }

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

    const nameMatch = line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/[^\)]*comment_id=[^\)]*\)$/i)
      || line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/[^(\s]+\/?\?comment_id=[^\)]*\)$/i)
      || line.match(/^\[([^\]]+)\]\(https?:\/\/www\.facebook\.com\/people\/[^\)]*comment_id=[^\)]*\)$/i);
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
