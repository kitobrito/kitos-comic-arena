// These pages wrap the production controller; only the presentation is private.
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
module.exports = function createSceneHandler({ resolveUser, repositoryRoot = join(__dirname, '..', '..') }) {
    return async function scenePreview(req, res) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Vary', 'Cookie');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        try {
            // The battlefield's own files are public: any player can turn on the experimental view
            // in battle. The admin preview pages and bot matches below stay admin-only.
            const assetName = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
            const assets = { 'scene.js': 'text/javascript; charset=utf-8', 'scene.css': 'text/css; charset=utf-8', 'forest.svg': 'image/svg+xml', 'arena.webp': 'image/webp' };
            if (assets[assetName]) {
                if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return; }
                const content = await readFile(join(repositoryRoot, 'prototypes', 'arena-scene', assetName));
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.removeHeader('Vary');
                res.setHeader('Content-Type', assets[assetName]); res.end(req.method === 'HEAD' ? undefined : content); return;
            }
            const user = await resolveUser(req);
            if (!user || String(user.role || '').trim().toLowerCase() !== 'admin') {
                res.statusCode = user ? 403 : 401;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Admin battle preview</title><h1>Admin battle preview</h1><p>Sign in with your administrator account to try the full-body arena.</p><a href="/pokemon-home.html">Return to Pokémon Arena</a>');
                return;
            }
            if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return; }
            const url = new URL(req.url, 'http://localhost');
            const name = decodeURIComponent(url.pathname).replace(/^\//, '');
            if (!name) {
                const arena = url.searchParams.get('arena') === 'pokemon' ? 'pokemon' : 'comic';
                res.statusCode = 302; res.setHeader('Location', `/arena-scene/selection.html?arena=${arena}`); res.end(); return;
            }
            if (name === 'selection.html' || name === 'ingame.html') {
                let html = await readFile(join(repositoryRoot, name), 'utf8');
                html = html.replace('<head>', '<head><base href="/"><script>window.ARENA_SCENE_PREVIEW=true;window.ARENA_SCENE_VIEW=true;document.documentElement.classList.add("arena-scene-preview","scene-admin-preview");</script>');
                html = html.replace('src="scripts/battle-fx.js?v=', 'src="scripts/battle-fx.js?v=arena-scene-v1&');
                html = html.replace('src="scripts/script.js?v=', 'src="scripts/script.js?v=arena-scene-v1&');
                html = html.replace('</head>', '<link rel="stylesheet" href="/arena-scene/scene.css?v=19"></head>');
                html = html.replace('</body>', '<script src="/arena-scene/scene.js?v=19"></script></body>');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(req.method === 'HEAD' ? undefined : html); return;
            }
            res.statusCode = 404; res.end('Not found.');
        } catch (error) { res.statusCode = error.code === 'ENOENT' ? 404 : 503; res.end('Preview unavailable.'); }
    };
};
module.exports.isSceneSourcePath = function (requestPath = '') {
    try {
        const decoded = decodeURIComponent(String(requestPath)).replace(/\\/g, '/').replace(/\/+/g, '/');
        const pathname = new URL(decoded, 'http://localhost').pathname.toLowerCase();
        return pathname === '/prototypes/arena-scene' || pathname.startsWith('/prototypes/arena-scene/');
    } catch { return true; }
};
