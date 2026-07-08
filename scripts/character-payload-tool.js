const {
    buildCharacterMap,
    getCharacterRecordId,
    loadEffectiveCharacterState,
    summarizeCharacter,
} = require('./lib/runtime-toolkit');

function parseArgs(argv) {
    const [command = 'inspect', ...rest] = argv;
    const options = {
        characterId: null,
        json: false,
    };
    for (let index = 0; index < rest.length; index += 1) {
        const arg = rest[index];
        if (arg === '--character' || arg === '-c') {
            options.characterId = rest[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.json = true;
        }
    }
    return { command, options };
}

function print(result, json = false) {
    if (json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log(JSON.stringify(result, null, 2));
}

async function inspectCharacter(characterId, json = false) {
    if (!characterId) {
        throw new Error('Pass --character <characterId>.');
    }
    const state = await loadEffectiveCharacterState();
    const canonicalMap = buildCharacterMap(state.fileCharacters);
    const effectiveMap = buildCharacterMap(state.effectiveCharacters);
    const overrideEntry = state.overrides.find((entry) => entry.characterId === characterId) || null;
    const result = {
        characterId,
        canonical: summarizeCharacter(canonicalMap.get(characterId) || null),
        override: summarizeCharacter(overrideEntry?.character || null),
        effective: summarizeCharacter(effectiveMap.get(characterId) || null),
        overrideOwnFields: overrideEntry?.character
            ? Object.keys(overrideEntry.character).sort()
            : [],
    };
    print(result, json);
}

async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (command !== 'inspect') {
        throw new Error('Unknown command. Use: inspect --character <characterId>');
    }
    await inspectCharacter(options.characterId, options.json);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    inspectCharacter,
    parseArgs,
};
