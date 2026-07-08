const crypto = require('crypto');
const {
    buildCharacterMap,
    fetchText,
    loadEffectiveCharacterState,
    normalizeArenaMode,
    parseRemoteCharactersText,
    summarizeCharacter,
} = require('./lib/runtime-toolkit');

function parseArgs(argv) {
    const options = {
        characterId: null,
        url: process.env.PUBLIC_APP_URL || 'https://www.comic-arena.net',
        json: false,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--character' || arg === '-c') {
            options.characterId = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--url') {
            options.url = argv[index + 1] || options.url;
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.json = true;
        }
    }
    return options;
}

function hashValue(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

async function verify(options) {
    if (!options.characterId) {
        throw new Error('Pass --character <characterId>.');
    }
    const state = await loadEffectiveCharacterState();
    const localCanonicalMap = buildCharacterMap(state.fileCharacters);
    const localEffectiveMap = buildCharacterMap(state.effectiveCharacters);
    const baseUrl = (options.url || '').replace(/\/+$/, '');
    const liveText = await fetchText(`${baseUrl}/characters.js`);
    const liveCharacters = parseRemoteCharactersText(liveText);
    const liveMap = buildCharacterMap(liveCharacters);

    const canonical = localCanonicalMap.get(options.characterId) || null;
    const effective = localEffectiveMap.get(options.characterId) || null;
    const live = liveMap.get(options.characterId) || null;

    return {
        characterId: options.characterId,
        liveUrl: `${baseUrl}/characters.js`,
        canonicalHash: hashValue(canonical),
        effectiveHash: hashValue(effective),
        liveHash: hashValue(live),
        canonicalMatchesEffective: JSON.stringify(canonical) === JSON.stringify(effective),
        effectiveMatchesLive: JSON.stringify(effective) === JSON.stringify(live),
        liveArena: live ? normalizeArenaMode(live.arena || live.universe) : null,
        canonical: summarizeCharacter(canonical),
        effective: summarizeCharacter(effective),
        live: summarizeCharacter(live),
    };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const result = await verify(options);
    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    hashValue,
    parseArgs,
    verify,
};
