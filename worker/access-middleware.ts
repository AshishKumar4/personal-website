import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Context, Next } from 'hono';

interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

type JWKSGetter = ReturnType<typeof createRemoteJWKSet>;
const jwksCache = new Map<string, JWKSGetter>();

export async function verifyAccessJWT(
  request: Request,
  env: AccessEnv
): Promise<{ valid: boolean; error?: string }> {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!jwt) {
    return { valid: false, error: 'Missing Access JWT' };
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;

  if (!teamDomain || !aud) {
    console.error('CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD not configured');
    return { valid: false, error: 'Server misconfigured' };
  }

  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;

  let jwks = jwksCache.get(certsUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(certsUrl));
    jwksCache.set(certsUrl, jwks);
  }

  try {
    await jwtVerify(jwt, jwks, {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    return { valid: true };
  } catch (err) {
    console.error('JWT verification failed:', err);
    return { valid: false, error: 'Invalid Access JWT' };
  }
}

export const accessMiddleware = async (c: Context<{ Bindings: AccessEnv }>, next: Next) => {
  const result = await verifyAccessJWT(c.req.raw, c.env);
  if (!result.valid) {
    return c.json({ success: false, error: result.error }, 403);
  }
  await next();
};
