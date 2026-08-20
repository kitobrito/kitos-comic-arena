const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const scriptPath = path.join(root, 'sync_pokemon_arena_v332_news.js');

// The sync script runs its DB call at require-time, so extract the `newsPost` object
// by evaluating the file in a sandbox that no-ops the parts that would touch Mongo.
const loadNewsPost = () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    const sandbox = {
        module: { exports: {} },
        require: (id) => {
            if (id === 'mongodb') return { MongoClient: class { connect() { return Promise.resolve(); } close() { return Promise.resolve(); } } };
            if (id === 'dotenv') return { config: () => ({}) };
            throw new Error(`Unexpected require: ${id}`);
        },
        process: { env: {}, exit: () => {} },
        console,
        __dirname: path.dirname(scriptPath),
        exports: {},
    };
    vm.createContext(sandbox);
    const patched = source.replace(
        /syncPokemonArenaV332News\(\)\.catch\([\s\S]*$/,
        'module.exports = { newsPost };\n'
    );
    vm.runInContext(patched, sandbox, { filename: scriptPath });
    return sandbox.module.exports.newsPost;
};

test('v332 news post has a title, non-empty blocks/paragraphs, and every referenced image exists on disk', () => {
    const newsPost = loadNewsPost();
    assert.equal(newsPost.title, 'Pokemon Arena Update V.3.3.2');
    assert.equal(newsPost.arena, 'pokemon');
    assert.ok(Array.isArray(newsPost.blocks) && newsPost.blocks.length > 0);
    assert.ok(Array.isArray(newsPost.paragraphs) && newsPost.paragraphs.length === newsPost.blocks.length);
    assert.ok(Array.isArray(newsPost.changes) && newsPost.changes.length > 0);

    const imagePaths = new Set();
    newsPost.changes.forEach((entry) => {
        if (entry.facePicture) imagePaths.add(entry.facePicture);
        if (entry.skillimage) imagePaths.add(entry.skillimage);
    });
    imagePaths.forEach((imagePath) => {
        assert.ok(fs.existsSync(path.join(root, imagePath)), `Missing referenced image: ${imagePath}`);
    });
});

test('the sync script upserts by title so re-running it never creates a duplicate post', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    assert.match(source, /newsPosts\.updateOne\(\s*\{ title: newsPost\.title \}/);
    assert.match(source, /upsert: true/);
});
