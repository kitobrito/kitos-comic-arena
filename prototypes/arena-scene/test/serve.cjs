// Local integration fixture only; binds loopback and uses the real signed-session middleware.
process.env.NODE_ENV = 'test';
process.env.ALLOW_INSECURE_HTTP = 'true';
process.env.CORS_ORIGIN = 'http://127.0.0.1:4197';
process.env.JWT_SECRET = 'arena-scene-local-test-only';
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const jwt = require('jsonwebtoken');
const { MemoryCollection, admin, member } = require('./fixture.cjs');
const engine = require('../../../server.js');
engine.setPersistenceCollectionsForTests({ matches: new MemoryCollection(), users: new MemoryCollection([admin, member]) });
const wrapper = express();
wrapper.use('/assets', async (req, res, next) => {
    if (/\.(mp3|ogg|wav|m4a|mp4)(?:\?|$)/i.test(req.url)) return res.status(204).end();
    if (fs.existsSync(path.join(__dirname, '../../../assets', decodeURIComponent(req.path)))) return next();
    res.redirect(307, `https://www.comic-arena.net/assets${req.url}`);
});
wrapper.use(engine.app);
const port = Number(process.env.SCENE_TEST_PORT || 4197);
const server = wrapper.listen(port, '127.0.0.1', () => {
    console.log(`Scene fixture http://127.0.0.1:${port}`);
    console.log('Local admin cookie:', jwt.sign({ username: admin.username }, process.env.JWT_SECRET));
});

engine.attachWebSocketSupport(server);
