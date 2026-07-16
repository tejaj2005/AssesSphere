// Fails fast at boot instead of silently signing/verifying tokens with a secret that was
// hardcoded in source (and therefore public) — anyone who'd read that fallback value could
// forge a valid Admin token for any organization.
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error(
    'JWT_SECRET is not set. Add a long random value to your .env (e.g. `openssl rand -hex 48`) — the server will not start without it.'
  );
}

export const JWT_SECRET = secret;
