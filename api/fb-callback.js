/**
 * GET /api/fb-callback
 * OAuth callback：交換 code 為 access_token，回傳用戶資料
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_reason, error_description } = req.query;

  // 使用者拒絕授權
  if (error) {
    return res.status(400).json({
      error: error_description || error_reason || 'User denied authorization',
      error_code: error,
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // 驗證 state（CSRF protection）
  const incomingState = state || '';
  // 從 cookie 讀取 state（Vercel serverless 中讀取 cookie 需要手動解析）
  const cookieHeader = req.headers.cookie || '';
  const stateMatch = cookieHeader.match(/fb_oauth_state=([^;]+)/);
  const storedState = stateMatch ? stateMatch[1] : null;

  if (storedState && storedState !== incomingState) {
    return res.status(400).json({ error: 'Invalid state parameter — possible CSRF' });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return res.status(500).json({ error: 'Facebook OAuth credentials not configured' });
  }

  const host = req.headers.host || 'localhost';
  const protocol = host.includes('vercel') ? 'https' : 'http';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
    || `${protocol}://${host}/api/fb-callback`;

  // Step 1：將 code 換成 access_token
  let accessToken = '';
  try {
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json({
        error: 'Failed to exchange code for access token',
        details: tokenData,
      });
    }

    accessToken = tokenData.access_token;
  } catch (err) {
    return res.status(500).json({ error: `Token exchange failed: ${err.message}` });
  }

  // Step 2：查詢用戶資料
  let fbUser = null;
  try {
    const userParams = new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,picture,email',
    });
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?${userParams.toString()}`);
    fbUser = await userResponse.json();

    if (fbUser.error) {
      return res.status(400).json({
        error: 'Failed to fetch Facebook user info',
        details: fbUser.error,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: `User info fetch failed: ${err.message}` });
  }

  // Step 3：清除 state cookie
  res.setHeader('Set-Cookie', 'fb_oauth_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');

  // 將 access_token 回傳給 client（放在 hash fragment 避免 exposure）
  // Client 從 URL hash 讀取 token（不會發到 server）
  const clientRedirectUri = process.env.CLIENT_REDIRECT_URI
    || (req.headers.referer ? new URL(req.headers.referer).origin + '/#' : '/');

  const tokenHash = Buffer.from(JSON.stringify({
    accessToken,
    user: {
      name: fbUser.name,
      id: fbUser.id,
      email: fbUser.email || null,
      picture: fbUser.picture?.data?.url || null,
    },
    expiresAt: Date.now() + 3600 * 1000, // 1 小時後過期
  })).toString('base64');

  return res.redirect(302, `${clientRedirectUri.replace(/#.*$/, '')}?fb_token=${encodeURIComponent(tokenHash)}`);
}
