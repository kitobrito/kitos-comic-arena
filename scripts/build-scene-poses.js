#!/usr/bin/env node
// Builds assets/data/scene-poses.json: which battlefield renders have extra pose art
// (attack, hit, ko) in assets/images/poses/. Run after adding pose files:
//   node scripts/build-scene-poses.js
// A pose file is named after the render it belongs to (the names in the render packs and
// sheets), plus the pose: charmander-attack.png, iron-man-hit.webp, magikarp-gyarados-ko.png.
// More frames of one pose are numbered: rick-grimes-attack.png, rick-grimes-attack-2.png, ...
// It should use the same canvas as that render, with the character standing in the same spot.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSE_DIR = path.join(ROOT, 'assets', 'images', 'poses');
const OUT = path.join(ROOT, 'assets', 'data', 'scene-poses.json');
const POSES = ['attack', 'hit', 'ko'];
const POKEMON_DIR = 'assets/images/selection-featured/PokemonArena/BIB/';

/** Reads one `Object.freeze({...})` table out of scripts/script.js by its constant name. */
function readTable(source, name) {
    const at = source.indexOf(`const ${name} = Object.freeze(`);
    if (at < 0) throw new Error(`${name} not found in scripts/script.js`);
    const start = source.indexOf('Object.freeze(', at);
    let depth = 0, end = start;
    for (; end < source.length; end++) {
        if (source[end] === '(') depth++;
        if (source[end] === ')' && --depth === 0) break;
    }
    return new Function(`return ${source.slice(start, end + 1)};`)();
}

const cleanName = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every battlefield render under each name it carries in the render packs: [{ name, render }]. */
function listRenders(source = fs.readFileSync(path.join(ROOT, 'scripts', 'script.js'), 'utf8')) {
    const comic = readTable(source, 'COMIC_SELECTION_FEATURED_RENDER_BY_ID');
    const pokemon = readTable(source, 'POKEMON_SELECTION_FEATURED_RENDER_BY_ID');
    const evolutions = readTable(source, 'POKEMON_SELECTION_EVOLUTION_RENDER_BY_ID');
    const forms = readTable(source, 'POKEMON_SELECTION_BATTLE_FORM_RENDERS_BY_ID');
    const skins = readTable(source, 'POKEMON_SELECTION_SKIN_RENDER_FORMS_BY_ID');
    const entries = [];
    const add = (name, file) => entries.push({ name: cleanName(name), render: file.includes('/') ? file : POKEMON_DIR + file });
    for (const [id, file] of Object.entries(comic)) add(id, file);
    for (const [id, file] of Object.entries(pokemon)) add(id, file);
    for (const [id, form] of Object.entries(evolutions)) add(`${id} (${form.name})`, form.filename);
    for (const [id, list] of Object.entries(forms)) for (const form of list) add(`${id} (${form.name})`, form.filename);
    for (const [id, list] of Object.entries(skins)) for (const form of list) add(`${id} (${form.name})`, form.filename);
    return entries; // a render can carry more than one name (a skin that reuses an evolution's art)
}

/**
 * poses[render][pose] is a list of frames, played in order: charmander-attack.png, then
 * charmander-attack-2.png, -3 ... (an aim, a shot and a reload, say). Each frame can carry a box
 * from assets/images/poses/poses.json: [left, top, width, height] as fractions of its render's
 * canvas, for art drawn at another size or reaching past the render (a muzzle flash, a body lying down).
 */
function buildManifest({
    renders = listRenders(),
    files = fs.existsSync(POSE_DIR) ? fs.readdirSync(POSE_DIR) : [],
    boxes = fs.existsSync(path.join(POSE_DIR, 'poses.json')) ? JSON.parse(fs.readFileSync(path.join(POSE_DIR, 'poses.json'), 'utf8')) : {},
} = {}) {
    const byName = new Map(renders.map((r) => [r.name, r.render]));
    const found = {}, unmatched = [];
    for (const file of files.sort()) {
        if (/^readme|^poses\.json$/i.test(file)) continue;
        const match = file.match(/^(.+)-(attack|hit|ko)(?:-(\d+))?\.(png|webp)$/i);
        const render = match && byName.get(match[1].toLowerCase());
        if (!render) { unmatched.push(file); continue; }
        const frame = { src: `/assets/images/poses/${file}`, order: Number(match[3] || 1) };
        const box = boxes[file]?.box;
        if (Array.isArray(box) && box.length === 4 && box.every(Number.isFinite)) frame.box = box;
        ((found[render] ||= {})[match[2].toLowerCase()] ||= []).push(frame);
    }
    const poses = {};
    for (const [render, kinds] of Object.entries(found)) {
        poses[render] = {};
        for (const [kind, frames] of Object.entries(kinds)) poses[render][kind] = frames.sort((a, b) => a.order - b.order).map(({ order, ...frame }) => frame);
    }
    return { poses, unmatched };
}

if (require.main === module) {
    const { poses, unmatched } = buildManifest();
    fs.writeFileSync(OUT, `${JSON.stringify({ poses }, null, 1)}\n`);
    const count = Object.values(poses).reduce((n, p) => n + Object.values(p).reduce((m, frames) => m + frames.length, 0), 0);
    console.log(`scene-poses.json: ${count} frame${count === 1 ? '' : 's'} for ${Object.keys(poses).length} render${Object.keys(poses).length === 1 ? '' : 's'}.`);
    if (unmatched.length) console.log(`Not matched to a render (check the name): ${unmatched.join(', ')}`);
}
module.exports = { listRenders, buildManifest, cleanName, POSES };
