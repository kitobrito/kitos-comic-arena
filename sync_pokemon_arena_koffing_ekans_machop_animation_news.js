const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const missionsKey = 'missions';
const characterOverridesKey = 'character_overrides';

const getCharacter = (characterId) => {
    const character = characters.find(
        (entry) => entry && (entry.characterId === characterId || entry.id === characterId)
    );
    if (!character) {
        throw new Error(`Missing character: ${characterId}`);
    }
    return character;
};

const getSkill = (character, skillId) => {
    const skill = Array.isArray(character.skills)
        ? character.skills.find((entry) => entry && entry.id === skillId)
        : null;
    if (!skill) {
        throw new Error(`Missing skill ${skillId} for ${character.name}`);
    }
    return skill;
};

const skillShowcase = (characterId, skillId, text, changeType = 'new') => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType,
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const sectionNote = (sectionName, text, changeType = 'quality') => ({
    text,
    changeType,
    characterName: sectionName,
    facePicture: '',
    skillId: '',
    skillName: '',
    skillimage: '',
});

const replaceTermWithCase = (text, pattern, replacement) =>
    String(text || '').replace(pattern, (match) => {
        if (!match) return replacement;
        if (match === match.toUpperCase()) return replacement.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
    });

const normalizeProtectionText = (value, arena = 'comic') => {
    let text = typeof value === 'string' ? value : '';
    if (!text) return text;
    text = replaceTermWithCase(text, /\bdestructible defenses\b/gi, 'shields');
    text = replaceTermWithCase(text, /\bdestructible defense\b/gi, 'shield');
    if (arena === 'pokemon') {
        text = replaceTermWithCase(text, /\bbarriers\b/gi, 'forcefields');
        text = replaceTermWithCase(text, /\bbarrier\b/gi, 'forcefield');
    }
    return text;
};

const normalizeCharacterOverrideText = (character) => {
    const arena =
        typeof character?.arena === 'string' && character.arena.trim().toLowerCase() === 'pokemon'
            ? 'pokemon'
            : typeof character?.universe === 'string' && character.universe.trim().toLowerCase() === 'pokemon'
                ? 'pokemon'
                : 'comic';
    const visit = (value) => {
        if (typeof value === 'string') {
            return normalizeProtectionText(value, arena);
        }
        if (Array.isArray(value)) {
            return value.map((entry) => visit(entry));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, entry]) => [key, visit(entry)])
            );
        }
        return value;
    };
    return visit(character);
};

const mrMimeMission = {
    missionId: 'mr-mime-stage-trial',
    title: 'Mr. Mime Stage Trial',
    level_requirement: 10,
    rank: '10',
    reward_character: 'mr-mime',
    reward_character_name: 'Mr. Mime',
    reward: 'Unlock Mr. Mime.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/Mr.mime/fp.jpg',
    imageAlt: 'Mr. Mime mission artwork',
    characterName: 'Mr. Mime',
    portrait: 'assets/images/PokemonArena/Mr.mime/fp.jpg',
    portraitAlt: 'Mr. Mime portrait',
    requirements: [
        'Mr. Mime unlocks through a control-and-support trial built around clean team play.',
        'Clear a 4-win streak with Abra and Chansey on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'abra', character_name: 'Abra', wins: 8 },
        { type: 'win_matches', character_id: 'chansey', character_name: 'Chansey', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['abra', 'chansey'],
            character_names: ['Abra', 'Chansey'],
            wins: 4,
        },
    ],
    special_pve: {
        enabled: false,
        buttonLabel: 'Start Fight',
        botName: 'Mission Bot',
        botTeamCharacterId: '',
        botTeamSize: 3,
        backgroundImage: '',
        playerTeamCharacterIds: [],
    },
    sortOrder: 11,
};

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.6',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.6 now covers the full Koffing, Weezing, Ekans, Arbok, Machop, and Machoke portrait-animation rollout, plus the new Mr. Mime roster entry and the Pokemon protection wording cleanup.',
        },
        {
            type: 'paragraph',
            text: 'Koffing and Weezing now feel much closer to their status-control identity in battle. Smog spreads a purple poison fog across the enemy team that thickens when more Smog stacks are already active, Smokescreen blankets allies in defensive grey smoke, Haze clears allies with pale white mist, and Self-Destruct now lands as a full-screen explosion with an even bigger blast once Koffing has evolved into Weezing.',
        },
        {
            type: 'paragraph',
            text: 'Ekans and Arbok now have a full venom-and-bite animation language. Poison Fang slams down with oversized purple fangs, Crunch bites harder with giant white jaws and now gets a custom CRUNCH portrait-shatter finisher on kill, Toxic hurls poison goo into bubbling affliction on the target portrait, and Shed Skin now visibly peels away the old layer while healing marks rise out of the portrait.',
        },
        {
            type: 'paragraph',
            text: 'Machop and Machoke also now read much more clearly in battle. Brick Break drops a dark karate chop onto the target portrait, Counter plants a heavy black hand straight into the middle of the target, Bulk Up now radiates a scaling power aura that intensifies with each stored stack, and Taunt literally calls enemies in with a white wagging finger.',
        },
        {
            type: 'paragraph',
            text: 'Mr. Mime joins Pokemon Arena as a strange support built around uneven protection math. Dazzling Gleam loads the next screen effect, Forcefield gives the enemy team self-burning forcefield they have to chew through on their own turns, Light Screen stacks team shields, and Safeguard raises healing while shaving stun time off allies.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Arena wording is also cleaner now: destructible defense is displayed as Shield everywhere, and Barrier is displayed as Forcefield in Pokemon Arena. The health strip now shows Shield in blue and Forcefield in pink so those protection layers read instantly during matches.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.6 now covers the full Koffing, Weezing, Ekans, Arbok, Machop, and Machoke portrait-animation rollout, plus the new Mr. Mime roster entry and the Pokemon protection wording cleanup.',
        'Koffing and Weezing now feel much closer to their status-control identity in battle. Smog spreads a purple poison fog across the enemy team that thickens when more Smog stacks are already active, Smokescreen blankets allies in defensive grey smoke, Haze clears allies with pale white mist, and Self-Destruct now lands as a full-screen explosion with an even bigger blast once Koffing has evolved into Weezing.',
        'Ekans and Arbok now have a full venom-and-bite animation language. Poison Fang slams down with oversized purple fangs, Crunch bites harder with giant white jaws and now gets a custom CRUNCH portrait-shatter finisher on kill, Toxic hurls poison goo into bubbling affliction on the target portrait, and Shed Skin now visibly peels away the old layer while healing marks rise out of the portrait.',
        'Machop and Machoke also now read much more clearly in battle. Brick Break drops a dark karate chop onto the target portrait, Counter plants a heavy black hand straight into the middle of the target, Bulk Up now radiates a scaling power aura that intensifies with each stored stack, and Taunt literally calls enemies in with a white wagging finger.',
        'Mr. Mime joins Pokemon Arena as a strange support built around uneven protection math. Dazzling Gleam loads the next screen effect, Forcefield gives the enemy team self-burning forcefield they have to chew through on their own turns, Light Screen stacks team shields, and Safeguard raises healing while shaving stun time off allies.',
        'Pokemon Arena wording is also cleaner now: destructible defense is displayed as Shield everywhere, and Barrier is displayed as Forcefield in Pokemon Arena. The health strip now shows Shield in blue and Forcefield in pink so those protection layers read instantly during matches.',
    ],
    changes: [
        skillShowcase('koffing', 'koffing-weezing-smog', 'Smog now spreads a full enemy-team poison fog and increases the cloud density when more Smog stacks are already active on the target portrait.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-smokescreen', 'Smokescreen now covers allies in drifting grey smoke instead of reading like a generic invisible buff.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-haze', 'Haze now rolls a pale clearing mist across Weezing\'s team so the cleanse and non-damaging protection read immediately.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-self-destruct', 'Self-Destruct now detonates as a full-screen blast, with a larger Weezing explosion on the evolved version.', 'update'),
        skillShowcase('ekans', 'ekans-poison-fang', 'Poison Fang now bites down with giant purple fangs, and Arbok escalates the attack into a third bite.', 'new'),
        skillShowcase('ekans', 'ekans-toxic', 'Toxic now throws poison goo into a bubbling portrait affliction effect, and Arbok doubles up the application feel to match the extra poison stack.', 'new'),
        skillShowcase('ekans', 'ekans-shed-skin', 'Shed Skin now visibly peels a layer off the portrait while healing plus signs float upward.', 'new'),
        skillShowcase('ekans', 'arbok-crunch', 'Crunch now lands with giant white jaws, and kills caused through Crunch marks trigger a custom CRUNCH shatter finisher.', 'new'),
        skillShowcase('machop', 'machop-brick-break', 'Brick Break now drops a black karate hand onto the target portrait, and the impact exaggerates further when Bulk Up is stacked.', 'new'),
        skillShowcase('machop', 'machop-counter', 'Counter now plants a heavy black hand into the target portrait, with a stronger Machoke version and extra force when Bulk Up is loaded.', 'new'),
        skillShowcase('machop', 'machop-bulk-up', 'Bulk Up now radiates a live energy aura around Machop and Machoke that scales with the stored bonus instead of only flashing on cast.', 'new'),
        skillShowcase('machop', 'machop-taunt', 'Taunt now points at the target with a white wagging finger before curling back in a full come-at-me gesture.', 'new'),
        skillShowcase('mr-mime', 'mr-mime-dazzling-gleam', 'Dazzling Gleam blasts the main target, splashes the rest of the enemy team, and stores extra protection for Mr. Mime\'s next screen effect.', 'new'),
        skillShowcase('mr-mime', 'mr-mime-forcefield', 'Forcefield applies enemy-side forcefield while setting up a cheaper Light Screen on the following turn.', 'new'),
        skillShowcase('mr-mime', 'mr-mime-light-screen', 'Light Screen gives the full team shielding and sets up a cheaper Forcefield for the next turn.', 'new'),
        skillShowcase('mr-mime', 'mr-mime-safeguard', 'Safeguard boosts healing, trims stun duration on allies, increases incoming shields, and makes Mr. Mime\'s screen effects last longer.', 'new'),
        sectionNote('Terminology', 'Pokemon Arena now displays destructible defense as Shield and barrier as Forcefield, including stored override text for Pokemon characters.', 'quality'),
        sectionNote('Accessibility', 'Shield and Forcefield now read separately on the health strip with blue and pink protection layers.', 'quality'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

const mergeMissionCatalog = (currentMissions = []) => {
    const missionsById = new Map(
        (Array.isArray(currentMissions) ? currentMissions : [])
            .filter((mission) => mission && mission.missionId)
            .map((mission) => [mission.missionId, mission])
    );
    missionsById.set(mrMimeMission.missionId, mrMimeMission);
    return Array.from(missionsById.values()).sort(
        (left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
    );
};

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = Array.isArray(state.releasesByArena?.comic)
        ? state.releasesByArena.comic
        : Array.isArray(state.comicReleases)
            ? state.comicReleases
            : Array.isArray(state.releases)
                ? state.releases
                : [];
    const nextPokemonIds = ['mr-mime', 'magikarp', 'machop'];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-6-mr-mime',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_arena_koffing_ekans_machop_animation_news',
    };
};

const normalizeStoredCharacterOverrides = (state = null) => {
    const raw = Array.isArray(state?.overrides)
        ? state.overrides
        : Array.isArray(state?.value?.overrides)
            ? state.value.overrides
            : [];
    return raw
        .map((entry) => {
            const character = entry?.character && typeof entry.character === 'object'
                ? entry.character
                : entry && typeof entry === 'object'
                    ? entry
                    : null;
            const characterId =
                typeof entry?.characterId === 'string' && entry.characterId
                    ? entry.characterId
                    : typeof character?.characterId === 'string' && character.characterId
                        ? character.characterId
                        : typeof character?.id === 'string'
                            ? character.id
                            : '';
            if (!characterId || !character) return null;
            return { characterId, character };
        })
        .filter(Boolean);
};

async function syncPokemonArenaV326News() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const appState = db.collection(appStateCollectionName);

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        const existingMissionState = await appState.findOne({ key: missionsKey });
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: mergeMissionCatalog(existingMissionState?.missions || []),
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_arena_koffing_ekans_machop_animation_news',
                },
            },
            { upsert: true }
        );

        const existingLatestState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            { $set: buildLatestReleasesState(existingLatestState) },
            { upsert: true }
        );

        const existingOverrideState = await appState.findOne({ key: characterOverridesKey });
        const normalizedOverrides = normalizeStoredCharacterOverrides(existingOverrideState);
        if (normalizedOverrides.length > 0) {
            const nowDate = new Date();
            await appState.updateOne(
                { key: characterOverridesKey },
                {
                    $set: {
                        key: characterOverridesKey,
                        overrides: normalizedOverrides.map((entry) => ({
                            characterId: entry.characterId,
                            character: normalizeCharacterOverrideText(entry.character),
                            updatedAt: nowDate,
                            updatedBy: 'sync_pokemon_arena_koffing_ekans_machop_animation_news',
                        })),
                        updatedAt: nowDate,
                        updatedBy: 'sync_pokemon_arena_koffing_ekans_machop_animation_news',
                    },
                },
                { upsert: true }
            );
        }

        console.log('Synced Pokemon Arena Update V.3.2.6 news, Mr. Mime, latest releases, mission, and override terminology.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV326News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
