/**
 * GET /api/facebook/callback
 * Facebook OAuth 2.0 callback：交換 code 為 access_token，回傳用戶資料
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error, error_reason, error_description } = req.query;

  // User denied authorization
  if (error) {
    return res.status(400).json({
      error: error_description || error_reason || 'User denied authorization',
      error_code: error,
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // Validate state (CSRF protection)
  const incomingState = state || '';
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
    || `${protocol}://${host}/api/facebook/callback`;

  // Step 1: Exchange code for access token
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

  // Step 2: Fetch user info
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

  // Step 3: Clear state cookie
  res.setHeader('Set-Cookie', 'fb_oauth_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');

  // Redirect back to client with token in query param (base64 encoded, not hash)
  const clientOrigin = req.headers.referer
    ? new URL(req.headers.referer).origin
    : (process.env.CLIENT_REDIRECT_URI || '/');

  const tokenPayload = Buffer.from(JSON.stringify({
    accessToken,
    user: {
      name: fbUser.name,
      id: fbUser.id,
      email: fbUser.email || null,
      picture: fbUser.picture?.data?.url || null,
    },
    expiresAt: Date.now() + 3600 * 1000, // 1 hour expiry
  })).toString('base64');

  return res.redirect(302, `${clientOrigin}?fb_token=${encodeURIComponent(tokenPayload)}`);
}
