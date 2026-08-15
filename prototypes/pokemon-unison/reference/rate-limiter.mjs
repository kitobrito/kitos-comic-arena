export class RateLimitError extends Error {
    constructor(message = 'Too many attempts. Please try again shortly.') {
        super(message);
        this.name = 'RateLimitError';
        this.status = 429;
        this.code = 'rate_limited';
    }
}

// Zero-dependency in-memory sliding-window limiter - server.mjs is a
// hand-rolled node:http server, not Express, so express-rate-limit (used by
// the real comic-arena.net site's loginLimiter/registerLimiter) isn't
// directly usable here. Each key's own hit timestamps are pruned to the
// current window on every check, so memory stays bounded to active keys.
export function createRateLimiter({ windowMs, max, now = () => Date.now() }) {
    const hitsByKey = new Map();
    return {
        check(key) {
            const currentTime = now();
            const windowStart = currentTime - windowMs;
            const hits = (hitsByKey.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
            if (hits.length >= max) {
                hitsByKey.set(key, hits);
                return false;
            }
            hits.push(currentTime);
            hitsByKey.set(key, hits);
            return true;
        },
    };
}

// Render (and most hosts) put the app behind a proxy, so the real client
// address is the first hop of x-forwarded-for, not the socket's own peer.
export function clientIp(request) {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : '';
    return first || request.socket?.remoteAddress || 'unknown';
}
