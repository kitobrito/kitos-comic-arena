const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const envPath = path.join(__dirname, '.env');
const shouldLogStartupDiagnostics =
    require.main === module || process.env.SERVER_STARTUP_DIAGNOSTICS === 'true';
const dotenvResult = require('dotenv').config({ path: envPath });

if (shouldLogStartupDiagnostics) {
    console.log('--- Startup Diagnostics ---');
    console.log('Current working directory:', process.cwd());
    console.log('.env file expected at:', envPath);
    console.log('.env file exists:', fs.existsSync(envPath));
    if (dotenvResult.error) {
        console.error('dotenv.config() error:', dotenvResult.error);
    } else {
        console.log('dotenv.config() successfully loaded.');
    }
    console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
    console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
    console.log('---------------------------');
}

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { MongoClient, ObjectId } = require('mongodb');
const { WebSocketServer, WebSocket } = require('ws');
const { hashPassword, comparePassword } = require('./passwordHashing');
const battleLogic = require('./battleLogic');
const {
    MatchRevisionConflictError,
    assertMatchInvariants,
    createMatchCommandCoordinator,
    getMatchStateRevision,
    getMatchTurnNumber,
    normalizeMatchVersionFields,
    toNonNegativeInteger,
} = require('./matchStability');
const { applyPokemonTypeSystem } = require('./pokemonTypeSystem');
const { syncPokemonOnixRelease } = require('./sync_pokemon_onix_news');
const { syncPokemonMeowthRelease } = require('./sync_pokemon_meowth_release');
const { syncPokemonWave2Release } = require('./sync_pokemon_wave_2_release');
const { syncPokemonGen2StarterRelease } = require('./sync_pokemon_gen2_starter_release');
const { syncPokemonTypeClassNews } = require('./sync_pokemon_type_class_news');
const { syncPokemonAegislashRelease } = require('./sync_pokemon_aegislash_release');
const { syncPokemonDittoRelease } = require('./sync_pokemon_ditto_release');
const { syncPokemonBattleExperienceNews } = require('./sync_pokemon_battle_experience_news');
let charactersData = require('./characters');

const app = express();
app.set('trust proxy', 1);
app.use(compression());

const PORT = process.env.PORT || 4000;
const TURN_DURATION_MS = 60 * 1000;
const TURN_EXPIRY_GRACE_MS = 3 * 1000;
const MATCH_INACTIVITY_TURN_LIMIT = 3;
const MATCH_FOUND_HOLD_MS = 3 * 1000;
const BATTLE_BOT_QUEUE_TIMEOUT_MS = 20 * 1000;
const BATTLE_BOT_ACTION_DELAY_MIN_MS = 15 * 1000;
const BATTLE_BOT_ACTION_DELAY_MAX_MS = 40 * 1000;
const PVE_BOT_ACTION_DELAY_MIN_MS = 800;
const PVE_BOT_ACTION_DELAY_MAX_MS = 2000;
const BATTLE_BOTS_ENABLED = process.env.ENABLE_BATTLE_BOTS !== 'false';
const DEFAULT_URI = process.env.MONGODB_URI;
const MONGO_CLIENT_OPTIONS = Object.freeze({
    maxPoolSize: 15,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    retryWrites: true,
});
const DATABASE_NAME = process.env.MONGODB_DB || 'comic-arena';
const USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || 'users';
const MATCHES_COLLECTION = process.env.MONGODB_MATCHES_COLLECTION || 'matches';
const APP_STATE_COLLECTION = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const NEWS_POSTS_COLLECTION = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const POINT_PURCHASES_COLLECTION = process.env.MONGODB_POINT_PURCHASES_COLLECTION || 'point_purchases';
const STARTUP_MIGRATION_STATE_KEY = 'startup_data_migration';
const STARTUP_MIGRATION_VERSION = '2026-07-29-audit-remediation-v1';
const CHARACTERS_FILE_PATH = path.join(__dirname, 'characters.js');
const EXTERNAL_IMAGE_MIRROR_MANIFEST_PATH = path.join(
    __dirname,
    'assets',
    'images',
    'external-mirror',
    'manifest.json'
);
const CHARACTER_OVERRIDES_STATE_KEY = 'character_overrides';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'comic_session';
const SESSION_MAX_AGE_MS =
    Number.parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_INSECURE_HTTP = !IS_PRODUCTION && process.env.ALLOW_INSECURE_HTTP === 'true';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH;
const LATEST_CHARACTER_RELEASES_BY_ARENA = {
    comic: [
        { label: 'Grand Master Yoda', characterId: 'grand-master-yoda' },
        { label: 'Darth Sidious', characterId: 'darth-sidious' },
        { label: 'General Grievous', characterId: 'general-grievous' },
    ],
    pokemon: [
        { label: 'Aegislash', characterId: 'aegislash' },
        { label: 'Ditto', characterId: 'ditto' },
        { label: 'Scraggy', characterId: 'scraggy' },
    ],
};
const LATEST_CHARACTER_RELEASES_STATE_KEY = 'latest_character_releases';
const LATEST_CHARACTER_RELEASES_VERSION = 'pokemon-community-aegislash-ditto-scraggy-v2';
const MAINTENANCE_MODE_STATE_KEY = 'maintenance_mode';
const MAINTENANCE_MODE_CACHE_TTL_MS = 10 * 1000;
const DEFAULT_PROFILE_AVATAR = '/assets/images/external-mirror/i.postimg.cc/971bcdc8d3154d6d16a9.png';
const LEGACY_DEFAULT_PROFILE_AVATAR = 'https://i.postimg.cc/zG3W1w6K/itachi.png';
const MISSION_CATALOG_STATE_KEY = 'missions';
const BOT_TEAMS_STATE_KEY = 'bot_teams';
const POKEMON_STARTER_SELECTION_VERSION = 3;
const POKEMON_GEN2_STARTER_SELECTION_VERSION = 1;
const POKEMON_GEN2_STARTER_UNLOCK_POINT_COST = 500;
const LADDER_UNLOCK_POINTS_WIN = 10;
const LADDER_UNLOCK_POINTS_LOSS = 3;
const MISSION_UNLOCK_POINT_PRICE_MIN = 150;
const MISSION_UNLOCK_POINT_PRICE_MAX = 600;
const MISSION_EEVEE_EVOLUTION_UNLOCK_POINT_COST = 500;
const getMissionUnlockPointCostForRank = (missionRank) => {
    const rank = Math.max(1, Math.floor(Number(missionRank) || 1));
    if (rank <= 6) return 150;
    if (rank <= 12) return 250;
    if (rank <= 17) return 350;
    return 450;
};
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_API_BASE_URL =
    PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const PAYPAL_MERCHANT_EMAIL = process.env.PAYPAL_MERCHANT_EMAIL || 'kienevul@gmail.com';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || '';
const UNLOCK_POINT_STORE_PACKAGES = [
    {
        packageId: 'comic-750-points',
        arena: 'comic',
        points: 750,
        amountUsd: '5.00',
        currency: 'USD',
        provider: 'paypal',
        label: '750 Unlock Points',
        description: '750 Comic Arena unlock points',
    },
    {
        packageId: 'comic-1500-points',
        arena: 'comic',
        points: 1500,
        amountUsd: '10.00',
        currency: 'USD',
        provider: 'paypal',
        label: '1,500 Unlock Points',
        description: '1,500 Comic Arena unlock points',
    },
    {
        packageId: 'comic-3000-points',
        arena: 'comic',
        points: 3000,
        amountUsd: '20.00',
        currency: 'USD',
        provider: 'paypal',
        label: '3,000 Unlock Points',
        description: '3,000 Comic Arena unlock points',
    },
    {
        packageId: 'pokemon-750-points',
        arena: 'pokemon',
        points: 750,
        amountUsd: '5.00',
        currency: 'USD',
        provider: 'paypal',
        label: '750 Unlock Points',
        description: '750 Pokemon Arena unlock points',
    },
    {
        packageId: 'pokemon-1500-points',
        arena: 'pokemon',
        points: 1500,
        amountUsd: '10.00',
        currency: 'USD',
        provider: 'paypal',
        label: '1,500 Unlock Points',
        description: '1,500 Pokemon Arena unlock points',
    },
    {
        packageId: 'pokemon-3000-points',
        arena: 'pokemon',
        points: 3000,
        amountUsd: '20.00',
        currency: 'USD',
        provider: 'paypal',
        label: '3,000 Unlock Points',
        description: '3,000 Pokemon Arena unlock points',
    },
];
let missionCatalogCache = null;
let botTeamsCache = null;
let maintenanceModeCache = {
    enabled: false,
    expiresAt: 0,
};
let maintenanceModeStatePromise = null;
const DEFAULT_MISSION_CATALOG = [
    {
        missionId: 'walker',
        title: 'A Simple Walker',
        level_requirement: 1,
        rank: '1',
        reward_character: 'walker',
        reward_character_name: 'Walker',
        reward: 'Unlock Walker',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/585f6eff56eb5d8e6dee.png',
        imageAlt: 'Walker mission artwork',
        characterName: 'Walker',
        portrait: '/assets/images/external-mirror/i.imgur.com/10678b50e174a94e7bfd.png',
        portraitAlt: 'Walker Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'text',
                text: 'Defeat the Walker Herd at Greene Farm to unlock Walker.'
            }
        ],
        special_pve: {
            enabled: true,
            buttonLabel: 'Clear the Farm',
            botName: 'Walker Herd',
            botTeamCharacterId: 'walker',
            botTeamSize: 3,
            botMaxQueuedSkillsPerTurn: 1,
            backgroundImage: 'assets/images/WalkerBG.png',
            playerTeamCharacterIds: []
        },
        sortOrder: 1
    },
    {
        missionId: 'venom',
        title: 'The Symbiote',
        level_requirement: 1,
        rank: '1',
        reward_character: 'venom',
        reward_character_name: 'Venom',
        reward: 'Unlock Venom',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/6defc8aabbd705e740eb.png',
        imageAlt: 'Venom Mission Artwork',
        characterName: 'Venom',
        portrait: '/assets/images/external-mirror/i.imgur.com/fd69d685aa352e9bcfcc.png',
        portraitAlt: 'Venom Portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'spider-man',
                character_name: 'Spider-Man',
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'spider-man',
                character_name: 'Spider-Man',
                wins: 2
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 2
    },
    {
        missionId: 'joker',
        title: 'The Last Laugh',
        level_requirement: 2,
        rank: '2',
        reward_character: 'the-joker',
        reward_character_name: 'The Joker',
        reward: 'Unlock Joker',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/a8664f09cb76adceba45.png',
        imageAlt: 'Joker MIssion Artwork',
        characterName: 'The Joker',
        portrait: '/assets/images/external-mirror/i.imgur.com/9969b2e2630eeff76bad.png',
        portraitAlt: 'Joker portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'batman',
                character_name: 'Batman',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'batman',
                    'wonder-woman'
                ],
                character_names: [
                    'Batman',
                    'Wonder Woman'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 3
    },
    {
        missionId: 'poison-ivy',
        title: 'Garden of Gotham',
        level_requirement: 3,
        rank: '3',
        reward_character: 'poison-ivy',
        reward_character_name: 'Poison Ivy',
        reward: 'Unlock Poison Ivy',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/poisonivymissionpic.jpeg',
        imageAlt: 'Poison Ivy mission artwork',
        characterName: 'Poison Ivy',
        portrait: 'assets/images/poisonivyfp.webp',
        portraitAlt: 'Poison Ivy mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'the-joker',
                character_name: 'The Joker',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'the-joker',
                    'batman'
                ],
                character_names: [
                    'The Joker',
                    'Batman'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 3.5
    },
    {
        missionId: 'omniman',
        title: 'Where I Really Come From',
        level_requirement: 3,
        rank: '3',
        reward_character: 'omni-man',
        reward_character_name: 'Omni-Man',
        reward: 'Unlock Omni-Man',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/554afa6fc89be6b797cd.jpg',
        imageAlt: 'Omni-Man mission artwork',
        characterName: 'Omni-Man',
        portrait: '/assets/images/external-mirror/i.imgur.com/ac8fe57ba3922ec61829.png',
        portraitAlt: 'Omni-Man Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'invincible',
                character_name: 'Invincible',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'atom-eve',
                    'rex-splode'
                ],
                character_names: [
                    'Atom Eve',
                    'Rex Splode'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 4
    },
    {
        missionId: 'rage-infected-mission',
        title: 'The Rage Virus',
        level_requirement: 4,
        rank: '4',
        reward_character: 'rage-infected',
        reward_character_name: 'Rage Infected',
        reward: 'Unlock Rage Infected',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/3aa5296d9a3e1d5c2c91.png',
        imageAlt: 'Rage Infected mission artwork',
        characterName: 'Rage Infected',
        portrait: '/assets/images/external-mirror/i.imgur.com/7b7af7f4631f8dd09646.png',
        portraitAlt: 'Rage Infected Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'text',
                text: 'Defeat the Rage Outbreak to unlock Rage Infected.'
            }
        ],
        special_pve: {
            enabled: true,
            buttonLabel: 'Contain the Virus',
            botName: 'Rage Outbreak',
            botTeamCharacterId: 'rage-infected',
            botTeamSize: 3,
            botMaxQueuedSkillsPerTurn: 1,
            backgroundImage: 'assets/images/RageInfectedBG.png',
            playerTeamCharacterIds: []
        },
        sortOrder: 5
    },
    {
        missionId: 'thegreenlantern',
        title: "Green Lantern's Light",
        level_requirement: 6,
        rank: '6',
        reward_character: 'green-lantern-hal-jordan',
        reward_character_name: 'Green Lantern (Hal Jordan)',
        reward: 'Unlock The Green Lantern (Hal Jordan)',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/da5dc00b4213b64c6900.jpg',
        imageAlt: 'The Green lantern mission artwork',
        characterName: 'The Green Lantern (Hal Jordan)',
        portrait: '/assets/images/external-mirror/i.imgur.com/43f5cb414a651a8d3563.jpg',
        portraitAlt: 'The Green Lantern Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 6
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 6
    },
    {
        missionId: 'parasite',
        title: 'Parasite',
        level_requirement: 6,
        rank: '6',
        reward_character: 'parasite',
        reward_character_name: 'Parasite',
        reward: 'Unlock Parasite.',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/parasitemission.png',
        imageAlt: 'Parasite mission artwork',
        characterName: 'Parasite',
        portrait: 'assets/images/parasiteFP.png',
        portraitAlt: 'Parasite portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'superman',
                character_name: 'Superman',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'superman',
                    'wonder-woman'
                ],
                character_names: [
                    'Superman',
                    'Wonder Woman'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 7
    },
    {
        missionId: 'hopes-light',
        title: "Hope's Light",
        level_requirement: 6,
        rank: '6',
        reward_character: 'saint-walker',
        reward_character_name: 'Saint Walker',
        reward: 'Unlock Saint Walker',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/c282ce8df12a9e2718f0.png',
        imageAlt: 'Saint Walker mission artwork',
        characterName: 'Saint Walker',
        portrait: '/assets/images/external-mirror/i.imgur.com/e1625ef074e91d9786b7.jpg',
        portraitAlt: 'Saint Walker Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'superman',
                character_name: 'Superman',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'superman',
                    'wonder-woman'
                ],
                character_names: [
                    'Superman',
                    'Wonder Woman'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 8
    },
    {
        missionId: 'space-marine-medic',
        title: 'Colonial Marines Medic',
        level_requirement: 7,
        rank: '7',
        reward_character: 'space-marine-medic',
        reward_character_name: 'Lieutenant Seraphina Vale',
        reward: 'Unlock Lieutenant Seraphine Vale',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/78409de3cae7efec3b8b.jpg',
        imageAlt: 'Space Marine Medic Mission mission artwork',
        characterName: 'Lieutenant Seraphine Vale',
        portrait: '/assets/images/external-mirror/i.imgur.com/ae7cdb3ac508a3ce5245.webp',
        portraitAlt: 'Lieutenant Seraphine Vale Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'space-marine-infantry',
                character_name: 'Pvt. Saunders',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'space-marine-infantry',
                    'space-marine-smartgunner'
                ],
                character_names: [
                    'Pvt. Saunders',
                    'Sergeant William Hillford'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 9
    },
    {
        missionId: 'negan',
        title: "Here's Negan",
        level_requirement: 8,
        rank: '8',
        reward_character: 'negan',
        reward_character_name: 'Negan',
        reward: 'Unlock Negan.',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/d6f9c0d886580a6df5f4.jpg',
        imageAlt: 'Negan mission artwork',
        characterName: 'Negan',
        portrait: '/assets/images/external-mirror/i.imgur.com/5a910b012994bee9b43f.png',
        portraitAlt: 'Negan portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'rick-grimes',
                character_name: 'Rick Grimes',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'rick-grimes',
                    'walker'
                ],
                character_names: [
                    'Rick Grimes',
                    'Walker'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 10
    },
    {
        missionId: 'docock',
        title: 'Doctor Octopus',
        level_requirement: 11,
        rank: '11',
        reward_character: 'doctor-octopus',
        reward_character_name: 'Doctor Octopus',
        reward: 'Unlock Doctor Octopus',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/e30f14aa5720b9642063.png',
        imageAlt: 'Doctor Octopus Mission artwork',
        characterName: 'Doctor Octopus',
        portrait: '/assets/images/external-mirror/i.imgur.com/1c05f5999cb70cb9bfc2.png',
        portraitAlt: 'Doctor Octopus portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 11
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 11
    },
    {
        missionId: 'greengoblin',
        title: 'The Green Goblin',
        level_requirement: 10,
        rank: '10',
        reward_character: 'the-green-goblin',
        reward_character_name: 'The Green Goblin',
        reward: 'Unlock The Green Goblin',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/f625fda1b95ffcc8c946.png',
        imageAlt: 'New Mission mission artwork',
        characterName: 'The Green Goblin',
        portrait: '/assets/images/external-mirror/i.imgur.com/8a96e5dbf37a454fb5d6.png',
        portraitAlt: 'The Green Goblin portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'spider-man',
                character_name: 'Spider-Man',
                wins: 6
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'spider-man',
                    'venom'
                ],
                character_names: [
                    'Spider-Man',
                    'Venom'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 12
    },
    {
        missionId: 'sandman',
        title: 'Enter the Sandman',
        level_requirement: 11,
        rank: '11',
        reward_character: 'sandman',
        reward_character_name: 'Sandman',
        reward: 'Unlock Sandman',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/add734219fae2cfe8872.png',
        imageAlt: 'Sandman mission artwork',
        characterName: 'Sandman',
        portrait: '/assets/images/external-mirror/i.imgur.com/c7fa3786b92e8b1e2f65.png',
        portraitAlt: 'Sandman portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'the-green-goblin',
                character_name: 'The Green Goblin',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'the-green-goblin',
                    'spider-man'
                ],
                character_names: [
                    'The Green Goblin',
                    'Spider-Man'
                ],
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 13
    },
    {
        missionId: 'mysterio',
        title: 'Mysterio',
        level_requirement: 12,
        rank: '12',
        reward_character: 'mysterio',
        reward_character_name: 'Mysterio',
        reward: 'Unlock Mysterio',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/1e2774a22d482b0eaeb2.png',
        imageAlt: 'Mysterio mission artwork',
        characterName: 'Mysterio',
        portrait: '/assets/images/external-mirror/i.imgur.com/7cd20da314c458f658da.png',
        portraitAlt: 'Mysterio portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'spider-man',
                character_name: 'Spider-Man',
                wins: 7
            },
            {
                type: 'win_matches',
                character_id: 'sandman',
                character_name: 'Sandman',
                wins: 4
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 14
    },
    {
        missionId: 'scorpion',
        title: 'Scorpion',
        level_requirement: 13,
        rank: '13',
        reward_character: 'scorpion',
        reward_character_name: 'Scorpion',
        reward: 'Unlock Scorpion',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/697da691f842b432267c.png',
        imageAlt: 'Scorpion mission artwork',
        characterName: 'Scorpion',
        portrait: '/assets/images/external-mirror/i.imgur.com/c69622e1d742e673c572.png',
        portraitAlt: 'Scorpion Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'mysterio',
                character_name: 'Mysterio',
                wins: 5
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'spider-man',
                    'mysterio'
                ],
                character_names: [
                    'Spider-Man',
                    'Mysterio'
                ],
                wins: 3
            },
            {
                type: 'win_streak',
                character_id: 'mysterio',
                character_name: 'Mysterio',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 15
    },
    {
        missionId: 'carnage',
        title: 'Maximum Carnage',
        level_requirement: 14,
        rank: '14',
        reward_character: 'carnage',
        reward_character_name: 'Carnage',
        reward: 'Unlock Carnage',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/c5e1d3c94f8ce3356767.jpg',
        imageAlt: 'Carnage mission artwork',
        characterName: 'Carnage',
        portrait: '/assets/images/external-mirror/i.imgur.com/d12f80d0cd5e9c5147ec.png',
        portraitAlt: 'Carnage Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'venom',
                character_name: 'Venom',
                wins: 7
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'venom',
                    'spider-man'
                ],
                character_names: [
                    'Venom',
                    'Spider-Man'
                ],
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'venom',
                character_name: 'Venom',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 16
    },
    {
        missionId: 'light-of-compassion',
        title: 'Light of Compassion',
        level_requirement: 15,
        rank: '15',
        reward_character: 'indigo-1',
        reward_character_name: 'Indigo-1',
        reward: 'Unlock Indigo-1',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/29f72694634161e84a28.png',
        imageAlt: 'Indigo-1 mission artwork',
        characterName: 'Indigo-1',
        portrait: '/assets/images/external-mirror/i.imgur.com/238a7c60ae1950042f66.jpg',
        portraitAlt: 'Indigo-1 Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'saint-walker',
                character_name: 'Saint Walker',
                wins: 6
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'green-lantern-hal-jordan',
                    'saint-walker'
                ],
                character_names: [
                    'Green Lantern (Hal Jordan)',
                    'Saint Walker'
                ],
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'saint-walker',
                character_name: 'Saint Walker',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 17
    },
    {
        missionId: 'light-of-rage',
        title: 'Light of Rage',
        level_requirement: 16,
        rank: '16',
        reward_character: 'atrocitus',
        reward_character_name: 'Atrocitus',
        reward: 'Unlock Atrocitus',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/8ebb6c4a4912a073016a.png',
        imageAlt: 'Atrocitus mission artwork',
        characterName: 'Atrocitus',
        portrait: '/assets/images/external-mirror/i.imgur.com/e0b7a80b2d6fe960cd54.png',
        portraitAlt: 'Atrocitus Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 16
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 18
    },
    {
        missionId: 'sinestro-mission',
        title: 'Sinestro Corps',
        level_requirement: 17,
        rank: '17',
        reward_character: 'sinestro',
        reward_character_name: 'Sinestro',
        reward: 'Unlock Sinestro',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/ad797d96a549f7bcf1b3.png',
        imageAlt: 'Sinestro mission artwork',
        characterName: 'Sinestro',
        portrait: '/assets/images/external-mirror/i.imgur.com/30c24cab544768aa2ff2.jpg',
        portraitAlt: 'Sinestro Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'green-lantern-hal-jordan',
                character_name: 'Green Lantern (Hal Jordan)',
                wins: 8
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'green-lantern-hal-jordan',
                    'indigo-1'
                ],
                character_names: [
                    'Green Lantern (Hal Jordan)',
                    'Indigo-1'
                ],
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'indigo-1',
                character_name: 'Indigo-1',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 19
    },
    {
        missionId: 'sorrow-mission',
        title: 'Sorrow',
        level_requirement: 18,
        rank: '18',
        reward_character: 'sorrow',
        reward_character_name: 'Sorrow',
        reward: 'Unlock Sorrow',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/d99d00fa7e4a5955fc72.png',
        imageAlt: 'Sorrow mission artwork',
        characterName: 'Sorrow',
        portrait: '/assets/images/external-mirror/i.imgur.com/5375f7852e58f9c672b6.jpg',
        portraitAlt: 'Sorrow Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'atrocitus',
                character_name: 'Atrocitus',
                wins: 7
            },
            {
                type: 'win_streak',
                character_id: 'atrocitus',
                character_name: 'Atrocitus',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 20
    },
    {
        missionId: 'unseen-light-mission',
        title: 'Unseen Light',
        level_requirement: 19,
        rank: '19',
        reward_character: 'john-stewart',
        reward_character_name: 'John Stewart',
        reward: 'Unlock John Stewart',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/2e13dca68c9c25eeca97.png',
        imageAlt: 'John Stewart mission artwork',
        characterName: 'John Stewart',
        portrait: '/assets/images/external-mirror/i.imgur.com/b9efd520025bfa709d23.jpg',
        portraitAlt: 'John Stewart Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'sinestro',
                character_name: 'Sinestro',
                wins: 6
            },
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'indigo-1',
                    'sinestro'
                ],
                character_names: [
                    'Indigo-1',
                    'Sinestro'
                ],
                wins: 3
            },
            {
                type: 'win_streak',
                character_id: 'sinestro',
                character_name: 'Sinestro',
                wins: 3
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 21
    },
    {
        missionId: 'angstromlevy',
        title: 'Angstrom Levy',
        level_requirement: 21,
        rank: '21',
        reward_character: 'angstrom-levy',
        reward_character_name: 'Angstrom Levy',
        reward: 'Unlock Angstrom Levy',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/7bd28b445ad1cec2c206.png',
        imageAlt: 'Angstrom Levy Mission artwork',
        characterName: 'Angstrom Levy',
        portrait: '/assets/images/external-mirror/i.imgur.com/7c2ed60fe662b9175765.png',
        portraitAlt: 'Angstrom Levy portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 21
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 22
    },
    {
        missionId: 'predatorstalker',
        title: 'Hunted',
        level_requirement: 21,
        rank: '21',
        reward_character: 'predator-stalker',
        reward_character_name: 'Predator Stalker',
        reward: 'Unlock Predator',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/5c7223536b841c298c58.jpg',
        imageAlt: 'Predator mission artwork',
        characterName: 'Predator Stalker',
        portrait: '/assets/images/external-mirror/i.imgur.com/2e8a261917f60a597486.jpg',
        portraitAlt: 'Predator Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'text',
                text: 'Defeat the Predator Hunting Party to unlock Predator Stalker.'
            }
        ],
        special_pve: {
            enabled: true,
            buttonLabel: 'Enter the Hunting Grounds',
            botName: 'Predator Hunting Party',
            botTeamCharacterId: 'predator-stalker',
            botTeamSize: 3,
            botMaxQueuedSkillsPerTurn: 2,
            backgroundImage: 'assets/images/PredatorStalkerBG.png',
            playerTeamCharacterIds: []
        },
        sortOrder: 23
    },
    {
        missionId: 'raid-on-the-xenomorph-hive',
        title: 'Raid on the Xenomorph Hive',
        level_requirement: 21,
        rank: '21',
        reward_character: 'xenomorph-drone',
        reward_character_name: 'Xenomorph Drone',
        reward: 'Unlock Xenomorph Drone',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/xenomission.jpg',
        imageAlt: 'Xenomorph Drone mission artwork',
        characterName: 'Xenomorph Drone',
        portrait: '/assets/images/external-mirror/i.imgur.com/d5fd5465fa69198c78aa.png',
        portraitAlt: 'Xenomorph Drone Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'text',
                text: 'Beat the Xenomorph Nest to unlock Xenomorph Drone.'
            }
        ],
        special_pve: {
            enabled: true,
            buttonLabel: 'Enter the Nest',
            botName: 'Xenomorph Nest',
            botTeamCharacterId: 'xenomorph-drone',
            botTeamSize: 3,
            botMaxQueuedSkillsPerTurn: 2,
            backgroundImage: 'assets/images/XenomorphDroneBG.png',
            playerTeamCharacterIds: []
        },
        sortOrder: 14
    },
    {
        missionId: 'predalien-mission',
        title: 'Abomination',
        level_requirement: 23,
        rank: '23',
        reward_character: 'predalien',
        reward_character_name: 'Predalien',
        reward: 'Unlock Predalien',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/bbdfec4f5f29ff570fa1.jpg',
        imageAlt: 'Predalien mission artwork',
        characterName: 'Predalien',
        portrait: '/assets/images/external-mirror/i.imgur.com/914ec103bf416d6bc888.jpg',
        portraitAlt: 'predalien portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches_same_team',
                character_ids: [
                    'xenomorph-drone',
                    'predator-stalker'
                ],
                character_names: [
                    'Xenomorph Drone',
                    'Predator Stalker'
                ],
                wins: 10
            },
            {
                type: 'win_streak',
                character_id: 'predator-stalker',
                character_name: 'Predator Stalker',
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'xenomorph-drone',
                character_name: 'Xenomorph Drone',
                wins: 4
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 25
    },
    {
        missionId: 'god',
        title: '\'God\'',
        level_requirement: 26,
        rank: '26',
        reward_character: 'homelander',
        reward_character_name: 'Homelander',
        reward: 'Unlock Homelander',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/d864f8964176fd76313e.jpg',
        imageAlt: 'Homelander Mission mission artwork',
        characterName: 'Homelander',
        portrait: '/assets/images/external-mirror/i.imgur.com/8aa98dc81a73db23fe49.jpg',
        portraitAlt: 'Homelander Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 26
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 26
    },
    {
        missionId: 'hulk-mission',
        title: 'The Incredible Hulk',
        level_requirement: 31,
        rank: '31',
        reward_character: 'the-hulk',
        reward_character_name: 'The Hulk',
        reward: 'Unlock The Hulk',
        mode_restriction: {
            allowed_modes: [
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: '/assets/images/external-mirror/i.imgur.com/417a7b301c74b4470ab5.jpg',
        imageAlt: 'Hulk Mission mission artwork',
        characterName: 'The Hulk',
        portrait: '/assets/images/external-mirror/i.imgur.com/16778f061908ca4cc4e6.jpg',
        portraitAlt: 'Hulk Mission portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 31
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 27
    },
    {
        missionId: 'ghost-rider',
        title: 'Spirit of Vengeance',
        level_requirement: 5,
        rank: '5',
        reward_character: 'ghost-rider',
        reward_character_name: 'Ghost Rider',
        reward: 'Unlock Ghost Rider',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/ghostridermissionpic.png',
        imageAlt: 'Ghost Rider mission artwork',
        characterName: 'Ghost Rider',
        portrait: 'assets/images/ghostriderfp.png',
        portraitAlt: 'Ghost Rider portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'captain-america',
                character_name: 'Captain America',
                wins: 5
            },
            {
                type: 'win_matches',
                character_id: 'spider-man',
                character_name: 'Spider-Man',
                wins: 5
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 28
    },
    {
        missionId: 'darth-vader',
        title: 'Dark Lord of the Sith',
        level_requirement: 18,
        rank: '18',
        reward_character: 'darth-vader',
        reward_character_name: 'Darth Vader',
        reward: 'Unlock Darth Vader',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/darthvadermission.jpeg',
        imageAlt: 'Darth Vader mission artwork',
        characterName: 'Darth Vader',
        portrait: 'assets/images/darthvaderfp.webp',
        portraitAlt: 'Darth Vader portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 18
            },
            {
                type: 'win_matches',
                character_id: 'the-joker',
                character_name: 'The Joker',
                wins: 8
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 29
    },
    {
        missionId: 'darth-maul',
        title: 'At Last We Will Reveal Ourselves',
        level_requirement: 16,
        rank: '16',
        reward_character: 'darth-maul',
        reward_character_name: 'Darth Maul',
        reward: 'Unlock Darth Maul',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: '',
            character_name: '',
            wins: 0
        },
        image: 'assets/images/darthmaul/darthmaulmissionpic.jpg',
        imageAlt: 'Darth Maul mission artwork',
        characterName: 'Darth Maul',
        portrait: 'assets/images/darthmaul/fp.png',
        portraitAlt: 'Darth Maul portrait',
        requirements: [],
        goals: [
            {
                type: 'reach_rank',
                rank: 16
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 29.5
    },
    {
        missionId: 'boba-fett',
        title: 'Dead or Alive',
        level_requirement: 10,
        rank: '10',
        reward_character: 'boba-fett',
        reward_character_name: 'Boba Fett',
        reward: 'Unlock Boba Fett',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: 'ghost-rider',
            character_name: 'Ghost Rider',
            wins: 2
        },
        image: 'assets/images/bobafettmission.avif',
        imageAlt: 'Boba Fett mission artwork',
        characterName: 'Boba Fett',
        portrait: 'assets/images/bobafettfp.webp',
        portraitAlt: 'Boba Fett portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'ghost-rider',
                character_name: 'Ghost Rider',
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'ghost-rider',
                character_name: 'Ghost Rider',
                wins: 2
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 30
    },
    {
        missionId: 'obi-wan-kenobi',
        title: 'The Negotiator',
        level_requirement: 10,
        rank: '10',
        reward_character: 'obi-wan-kenobi',
        reward_character_name: 'Obi-Wan Kenobi',
        reward: 'Unlock Obi-Wan Kenobi',
        mode_restriction: {
            allowed_modes: [
                'quick',
                'ladder'
            ]
        },
        win_streak: {
            character_id: 'wonder-woman',
            character_name: 'Wonder Woman',
            wins: 2
        },
        image: 'assets/images/obiwankenobimission.jpg',
        imageAlt: 'Obi-Wan Kenobi mission artwork',
        characterName: 'Obi-Wan Kenobi',
        portrait: 'assets/images/obiwankenobifp.webp',
        portraitAlt: 'Obi-Wan Kenobi portrait',
        requirements: [],
        goals: [
            {
                type: 'win_matches',
                character_id: 'wonder-woman',
                character_name: 'Wonder Woman',
                wins: 4
            },
            {
                type: 'win_streak',
                character_id: 'wonder-woman',
                character_name: 'Wonder Woman',
                wins: 2
            }
        ],
        special_pve: {
            enabled: false,
            buttonLabel: 'Start Fight',
            botName: 'Mission Bot',
            botTeamCharacterId: '',
            botTeamSize: 3,
            backgroundImage: '',
            playerTeamCharacterIds: []
        },
        sortOrder: 31
    }
];

const IMAGE_ASSET_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const REGULAR_MATCH_BACKGROUND_DIRECTORY = 'assets/images/NewINgames';
const LEGACY_REGULAR_MATCH_BACKGROUNDS = [
    'assets/images/NewYorkBG.png',
    'assets/images/SpeedForceBG.png',
    'assets/images/gothamcityBG.png',
    'assets/images/metropolisBG.png',
    'assets/images/TheWalkingDeadBG.png',
    'assets/images/AlienBattleBG.png'
];
const PVE_MISSION_BACKGROUND_ASSETS = {
    walker: 'assets/images/special PvE mission bgs/walkerspecialbg.png',
    'rage-infected': 'assets/images/special PvE mission bgs/Rageinfectedspecialbg.png',
    'predator-stalker': 'assets/images/special PvE mission bgs/predatorstalkerspecialbg.png',
    'xenomorph-drone': 'assets/images/special PvE mission bgs/xenomorphdronespecialpve.png',
};

const normalizeAssetPathForClient = (assetPath = '') =>
    String(assetPath || '').replace(/\\/g, '/').replace(/^\/+/, '');

const getAssetFileSystemPath = (assetPath = '') =>
    path.join(__dirname, normalizeAssetPathForClient(assetPath));

const isImageAssetPath = (assetPath = '') => IMAGE_ASSET_EXTENSIONS.has(path.extname(assetPath).toLowerCase());

const listImageAssetsInDirectory = (assetDirectory = '') => {
    const normalizedDirectory = normalizeAssetPathForClient(assetDirectory);
    const directoryPath = getAssetFileSystemPath(normalizedDirectory);
    try {
        if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
            return [];
        }
        return fs
            .readdirSync(directoryPath, { withFileTypes: true })
            .filter((entry) => entry.isFile() && isImageAssetPath(entry.name))
            .map((entry) => `${normalizedDirectory}/${entry.name}`)
            .sort((left, right) => left.localeCompare(right));
    } catch (error) {
        console.warn('Unable to read image asset directory:', normalizedDirectory, error.message);
        return [];
    }
};

const findNamedImageAsset = (assetName = '') => {
    const normalizedName = normalizeAssetPathForClient(assetName);
    const directPath = getAssetFileSystemPath(normalizedName);
    try {
        if (fs.existsSync(directPath)) {
            const stats = fs.statSync(directPath);
            if (stats.isFile() && isImageAssetPath(normalizedName)) {
                return normalizedName;
            }
            if (stats.isDirectory()) {
                return listImageAssetsInDirectory(normalizedName)[0] || '';
            }
        }
        const parentAssetDirectory = path.posix.dirname(normalizedName);
        const basename = path.posix.basename(normalizedName).toLowerCase();
        const parentFsDirectory = getAssetFileSystemPath(parentAssetDirectory);
        if (!fs.existsSync(parentFsDirectory) || !fs.statSync(parentFsDirectory).isDirectory()) {
            return '';
        }
        const matchingEntry = fs
            .readdirSync(parentFsDirectory, { withFileTypes: true })
            .find((entry) => {
                const entryBase = path.basename(entry.name, path.extname(entry.name)).toLowerCase();
                if (entry.isDirectory()) return entry.name.toLowerCase() === basename;
                return entry.isFile() && isImageAssetPath(entry.name) && entryBase === basename;
            });
        if (!matchingEntry) return '';
        const matchingAssetPath = `${parentAssetDirectory}/${matchingEntry.name}`;
        return matchingEntry.isDirectory()
            ? listImageAssetsInDirectory(matchingAssetPath)[0] || ''
            : matchingAssetPath;
    } catch (error) {
        console.warn('Unable to resolve image asset:', normalizedName, error.message);
        return '';
    }
};

const getRegularMatchBackgroundPool = () => {
    const newIngameBackgrounds = listImageAssetsInDirectory(REGULAR_MATCH_BACKGROUND_DIRECTORY);
    if (newIngameBackgrounds.length) {
        return newIngameBackgrounds;
    }
    const namedNewIngameBackground = findNamedImageAsset(REGULAR_MATCH_BACKGROUND_DIRECTORY);
    return namedNewIngameBackground ? [namedNewIngameBackground] : LEGACY_REGULAR_MATCH_BACKGROUNDS;
};

const getRegularMatchBackgroundForArena = (arena = DEFAULT_ARENA_MODE) =>
    normalizeArenaMode(arena) === 'pokemon'
        ? 'assets/images/PokemonArena/newbattlepic/1783150082785.png'
        : 'assets/images/newingamebgCA.png';

const getRandomRegularBackground = (arena = DEFAULT_ARENA_MODE) => getRegularMatchBackgroundForArena(arena);

const normalizeMatchBackgroundOverride = (backgroundOverride = '', arena = DEFAULT_ARENA_MODE) => {
    const normalizedBackground = typeof backgroundOverride === 'string' ? backgroundOverride.trim() : '';
    if (!normalizedBackground) {
        return '';
    }
    if (
        normalizeArenaMode(arena) === 'pokemon' &&
        normalizedBackground === 'assets/images/PokemonArena/newingamebgPA.png'
    ) {
        return getRegularMatchBackgroundForArena('pokemon');
    }
    return normalizedBackground;
};

const getPveMissionBackgroundForReward = (rewardCharacterId = '', fallback = '') => {
    const replacementAsset = PVE_MISSION_BACKGROUND_ASSETS[normalizeCharacterId(rewardCharacterId)];
    return (replacementAsset && findNamedImageAsset(replacementAsset)) || fallback || '';
};

let mongoClient;
let usersCollection;
let matchesCollection;
let appStateCollection;
let newsPostsCollection;
let pointPurchasesCollection;
let characterOverrideCache = new Map();
const matchSocketRooms = new Map();
const wsConnections = new Set();
const matchCommandCoordinator = createMatchCommandCoordinator();
const MATCH_CHAT_MAX_LENGTH = 240;
const MATCH_CHAT_MIN_INTERVAL_MS = 900;
const wsServer = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 2,
        serverNoContextTakeover: true,
        clientNoContextTakeover: true,
    },
});
let turnSweepTimer = null;
let turnSweepInFlight = false;
const activeBattleBotTurns = new Set();
const scheduledBattleBotTurns = new Set();
const GAME_BOT_USERNAME_PREFIX = '__game_bot__:';
const GAME_BOT_DISPLAY_NAME = 'Opponent';
const DEFAULT_SPECIAL_PVE_BATTLE = {
    enabled: false,
    buttonLabel: 'Start Fight',
    botName: 'Mission Bot',
    botTeamCharacterId: '',
    botTeamSize: 3,
    backgroundImage: '',
    botMaxQueuedSkillsPerTurn: 1,
};
const XENOMORPH_DRONE_SPECIAL_PVE = {
    enabled: true,
    buttonLabel: 'Enter the Nest',
    botName: 'Xenomorph Nest',
    botTeamCharacterId: 'xenomorph-drone',
    botTeamSize: 3,
    backgroundImage: 'assets/images/XenomorphDroneBG.png',
    botMaxQueuedSkillsPerTurn: 2,
    playerTeamCharacterIds: [],
};
const XENOMORPH_HIVE_MISSION_GOALS = [
    {
        type: 'text',
        text: 'Beat the Xenomorph Nest to unlock Xenomorph Drone.',
    },
];

const DEFAULT_CLAN_RANK_NAMES = {
    clanLeader: 'Clan Leader',
    leader: 'Leader',
    captain: 'Captain',
    lieutenant: 'Lieutenant',
    member: 'Member',
    trial: 'Trial',
};

const LADDER_MAX_LEVEL = 50;
const LADDER_MAX_EXPERIENCE_POINTS = 156500;
const LADDER_RANK_TIERS = [
    { minLevel: 46, rank: 'Infinity Knight', hatUrl: 'assets/images/hats/kage.png' },
    { minLevel: 41, rank: 'Dimension Crusader', hatUrl: 'assets/images/hats/akatsuki.png' },
    { minLevel: 36, rank: 'Purity Aegis', hatUrl: 'assets/images/hats/jinch.png' },
    { minLevel: 31, rank: 'Galaxy Reaper', hatUrl: 'assets/images/hats/sannin.png' },
    { minLevel: 26, rank: 'Abyssal Grasp', hatUrl: 'assets/images/hats/jounin.png' },
    { minLevel: 21, rank: 'Void Sentinel', hatUrl: 'assets/images/hats/anbu.png' },
    { minLevel: 16, rank: 'Stormbreaker', hatUrl: 'assets/images/hats/missingnin.png' },
    { minLevel: 12, rank: 'Blood Ripper', hatUrl: 'assets/images/hats/chunin.png' },
    { minLevel: 6, rank: 'Temporal Warden', hatUrl: 'assets/images/hats/genin.png' },
    { minLevel: 1, rank: 'Sparkstrike', hatUrl: 'assets/images/hats/academy.png' },
];
const HOKAGE_RANK_INFO = {
    rank: 'Infinity Knight',
    hatUrl: 'assets/images/hats/kage.png',
};
const LADDER_EXP_BRACKETS = [
    { minLevel: 1, maxLevel: 3, expRequired: 500 },
    { minLevel: 4, maxLevel: 5, expRequired: 750 },
    { minLevel: 6, maxLevel: 11, expRequired: 1000 },
    { minLevel: 12, maxLevel: 15, expRequired: 2000 },
    { minLevel: 16, maxLevel: 20, expRequired: 2500 },
    { minLevel: 21, maxLevel: 25, expRequired: 3000 },
    { minLevel: 26, maxLevel: 30, expRequired: 3500 },
    { minLevel: 31, maxLevel: 35, expRequired: 4000 },
    { minLevel: 36, maxLevel: 40, expRequired: 4500 },
    { minLevel: 41, maxLevel: 45, expRequired: 5000 },
    { minLevel: 46, maxLevel: 49, expRequired: 5500 },
];

const getBaseRankInfoForLevel = (level) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    return (
        LADDER_RANK_TIERS.find((entry) => normalizedLevel >= entry.minLevel) ||
        LADDER_RANK_TIERS[LADDER_RANK_TIERS.length - 1]
    );
};

const getRankInfoForLevel = (level, isHokage = false) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (isHokage && normalizedLevel >= 46) {
        return HOKAGE_RANK_INFO;
    }
    return getBaseRankInfoForLevel(normalizedLevel);
};

const FAKE_BATTLE_PLAYER_ACCOUNTS = [
    { username: 'Plastic', avatarUrl: '/assets/images/external-mirror/i.imgur.com/81581ac5c8c1de4cd0ea.png', level: 7, wins: 18, losses: 12, streak: 2 },
    { username: 'Mastermind', avatarUrl: '/assets/images/external-mirror/i.imgur.com/03b422ad677cfe45261e.jpg', level: 11, wins: 31, losses: 24, streak: -1 },
    { username: 'Lian', avatarUrl: '/assets/images/external-mirror/i.imgur.com/16778f061908ca4cc4e6.jpg', level: 14, wins: 43, losses: 38, streak: 3 },
    { username: 'TheDarkLegend', avatarUrl: '/assets/images/external-mirror/i.imgur.com/487921e61fc816173c77.jpg', level: 18, wins: 64, losses: 51, streak: 1 },
    { username: 'Wespro', avatarUrl: '/assets/images/external-mirror/i.imgur.com/12748c5b9bfa8e1ffbfe.jpg', level: 21, wins: 82, losses: 70, streak: -2 },
    { username: 'Spiritinblack', avatarUrl: '/assets/images/external-mirror/i.imgur.com/f4f1db741c69614f96d8.jpg', level: 24, wins: 101, losses: 83, streak: 4 },
    { username: 'Mark', avatarUrl: '/assets/images/external-mirror/i.imgur.com/e2ae16dd021894183e60.jpg', level: 27, wins: 126, losses: 96, streak: 2 },
    { username: 'Luapman', avatarUrl: '/assets/images/external-mirror/i.imgur.com/cc78b6b0d7f74621fa17.jpg', level: 30, wins: 139, losses: 111, streak: -1 },
    { username: 'Gametester', avatarUrl: '/assets/images/external-mirror/i.imgur.com/e36e352c71fed68e0f6e.jpg', level: 33, wins: 158, losses: 129, streak: 5 },
    { username: 'SplashPage', avatarUrl: '/assets/images/external-mirror/i.imgur.com/a6ad96af3509d3c49f29.png', level: 36, wins: 184, losses: 141, streak: 1 },
    { username: 'KOBurst', avatarUrl: '/assets/images/external-mirror/i.imgur.com/fd69d685aa352e9bcfcc.png', level: 39, wins: 207, losses: 163, streak: -3 },
    { username: 'FrameTrap', avatarUrl: '/assets/images/external-mirror/i.imgur.com/9ded7a58361f7b55bddf.png', level: 42, wins: 231, losses: 177, streak: 6 },
    { username: 'ClashCaster', avatarUrl: '/assets/images/external-mirror/i.imgur.com/d88eefdb24916108510d.jpg', level: 45, wins: 260, losses: 198, streak: 2 },
    { username: 'VoidMeter', avatarUrl: 'assets/images/wolverinefp.webp', level: 47, wins: 288, losses: 216, streak: -1 },
    { username: 'OmegaDraft', avatarUrl: 'assets/images/YodaFP.webp', level: 49, wins: 316, losses: 241, streak: 7 },
    { username: 'NightPanel', avatarUrl: '/assets/images/external-mirror/i.imgur.com/04ad771af0842dc75ce7.jpg', level: 6, wins: 15, losses: 9, streak: 1 },
    { username: 'SkillIssue', avatarUrl: '/assets/images/external-mirror/i.imgur.com/0cdc4224ae7ef7a8d977.jpg', level: 9, wins: 24, losses: 18, streak: -2 },
    { username: 'ArcRunner', avatarUrl: '/assets/images/external-mirror/i.imgur.com/0a9c36a504d933d18a86.jpg', level: 13, wins: 39, losses: 29, streak: 2 },
    { username: 'BluePanel', avatarUrl: '/assets/images/external-mirror/i.imgur.com/9575ae5319f9c9c0203f.png', level: 16, wins: 52, losses: 41, streak: 3 },
    { username: 'ComboSmith', avatarUrl: '/assets/images/external-mirror/i.imgur.com/1424f52c9a337d34af17.jpg', level: 19, wins: 70, losses: 55, streak: -1 },
    { username: 'RedChakra', avatarUrl: '/assets/images/external-mirror/i.imgur.com/aa47e82729490693179b.jpg', level: 22, wins: 93, losses: 72, streak: 4 },
    { username: 'DraftDemon', avatarUrl: '/assets/images/external-mirror/i.imgur.com/78a817d846d15923f96f.png', level: 25, wins: 112, losses: 88, streak: 1 },
    { username: 'PanelMage', avatarUrl: '/assets/images/external-mirror/i.imgur.com/8df709e0ded655b52945.jpg', level: 28, wins: 131, losses: 105, streak: -3 },
    { username: 'CriticalHit', avatarUrl: '/assets/images/external-mirror/i.imgur.com/fb0b5f3f9d76a2d2fe33.png', level: 31, wins: 149, losses: 116, streak: 2 },
    { username: 'EnergyBender', avatarUrl: '/assets/images/external-mirror/i.imgur.com/81eaf0a60fddb72ba06c.jpg', level: 34, wins: 171, losses: 132, streak: 5 },
    { username: 'LastFrame', avatarUrl: '/assets/images/external-mirror/i.imgur.com/a237beaa257572f35328.png', level: 37, wins: 196, losses: 151, streak: -1 },
    { username: 'QueueMaster', avatarUrl: '/assets/images/external-mirror/i.imgur.com/8a96e5dbf37a454fb5d6.png', level: 40, wins: 218, losses: 169, streak: 3 },
    { username: 'InkChampion', avatarUrl: '/assets/images/external-mirror/i.imgur.com/50f5090e1f7385bb532c.png', level: 43, wins: 247, losses: 190, streak: 6 },
    { username: 'StreakBreaker', avatarUrl: 'assets/images/ghostriderfp.png', level: 46, wins: 274, losses: 209, streak: -2 },
    { username: 'FinalTurn', avatarUrl: 'assets/images/generalgrievousfp.png', level: 50, wins: 342, losses: 258, streak: 8 },
];

const POKEMON_BATTLE_PLAYER_ACCOUNTS = [
    { username: 'Sprout', avatarUrl: 'assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg', level: 7, wins: 18, losses: 12, streak: 2 },
    { username: 'Blaze', avatarUrl: 'assets/images/PokemonArena/Charmander/charmanderfp.jpg', level: 11, wins: 31, losses: 24, streak: -1 },
    { username: 'Shell', avatarUrl: 'assets/images/PokemonArena/squirtle/squirtlefp.jpg', level: 14, wins: 43, losses: 38, streak: 3 },
    { username: 'Bolt', avatarUrl: 'assets/images/PokemonArena/Pikachu/pikachufp.jpeg', level: 18, wins: 64, losses: 51, streak: 1 },
    { username: 'Torrent', avatarUrl: 'assets/images/PokemonArena/squirtle/wartortlefp.jpg', level: 21, wins: 82, losses: 70, streak: -2 },
    { username: 'Bloom', avatarUrl: 'assets/images/PokemonArena/Bulbasaur/ivysaurfp.jpg', level: 24, wins: 101, losses: 83, streak: 4 },
    { username: 'Ember', avatarUrl: 'assets/images/PokemonArena/Charmander/charmeleonfp.jpg', level: 27, wins: 126, losses: 96, streak: 2 },
    { username: 'Spark', avatarUrl: 'assets/images/PokemonArena/Pikachu/pikachufp.jpeg', level: 30, wins: 139, losses: 111, streak: -1 },
];

const hashStringForIndex = (value = '') => {
    const text = String(value || '');
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash;
};

const getFakeBattlePlayerAccountsForArena = (arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    if (normalizedArena === 'pokemon') {
        // Reuse the broader Comic Arena disguise pool so Pokemon bots stop reading like obvious themed stand-ins.
        return FAKE_BATTLE_PLAYER_ACCOUNTS;
    }
    return FAKE_BATTLE_PLAYER_ACCOUNTS;
};

const getFakeBattlePlayerAccount = (seed = '', arena = DEFAULT_ARENA_MODE) => {
    const pool = getFakeBattlePlayerAccountsForArena(arena);
    const index = hashStringForIndex(seed) % pool.length;
    return pool[index] || pool[0];
};

const buildFakeBattlePlayerProfile = (account = {}) => {
    const level = Math.max(1, Number(account.level) || 1);
    const rankInfo = getRankInfoForLevel(level);
    const wins = Math.max(0, Number(account.wins) || 0);
    const losses = Math.max(0, Number(account.losses) || 0);
    return {
        battleSnapshotVersion: 1,
        avatarUrl: account.avatarUrl || DEFAULT_PROFILE_AVATAR,
        clan: null,
        ladder: {
            level,
            rank: rankInfo.rank,
            rankHatUrl: rankInfo.hatUrl,
            experiencePoints: getCumulativeExperienceForLevel(level),
            ladderRank: null,
            wins,
            losses,
            streak: Number(account.streak) || 0,
            highestStreak: Math.max(Math.abs(Number(account.streak) || 0), 1),
            highestLevel: level,
            famePoints: wins * 3,
            isHokage: false,
        },
        skins: {
            equippedSkinByCharacterId: {},
        },
    };
};

const getExperienceRequiredForNextLevel = (level) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (normalizedLevel >= LADDER_MAX_LEVEL) {
        return 0;
    }
    const bracket = LADDER_EXP_BRACKETS.find(
        (entry) => normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel
    );
    return bracket ? bracket.expRequired : 0;
};

const getCumulativeExperienceForLevel = (level) => {
    const normalizedLevel = Math.min(LADDER_MAX_LEVEL, Math.max(1, Number(level) || 1));
    let total = 0;
    for (let currentLevel = 1; currentLevel < normalizedLevel; currentLevel += 1) {
        total += getExperienceRequiredForNextLevel(currentLevel);
    }
    return total;
};

const deriveLadderStateFromExperience = (experiencePoints) => {
    const normalizedExperience = Math.min(
        LADDER_MAX_EXPERIENCE_POINTS,
        Math.max(0, Number(experiencePoints) || 0)
    );
    let level = 1;
    let cumulativeForLevel = 0;

    while (level < LADDER_MAX_LEVEL) {
        const needed = getExperienceRequiredForNextLevel(level);
        if (!needed || normalizedExperience < cumulativeForLevel + needed) {
            break;
        }
        cumulativeForLevel += needed;
        level += 1;
    }

    const experienceForNextLevel = getExperienceRequiredForNextLevel(level);
    return {
        level,
        experiencePoints: normalizedExperience,
        cumulativeForLevel,
        experienceIntoLevel: Math.max(0, normalizedExperience - cumulativeForLevel),
        experienceForNextLevel,
        experienceToNextLevel: experienceForNextLevel
            ? Math.max(0, cumulativeForLevel + experienceForNextLevel - normalizedExperience)
            : 0,
    };
};

const resolveLadderExperienceDelta = ({ playerLevel, opponentLevel, didWin }) => {
    const normalizedPlayerLevel = Math.max(1, Number(playerLevel) || 1);
    const normalizedOpponentLevel = Math.max(1, Number(opponentLevel) || 1);
    const levelDifference = normalizedOpponentLevel - normalizedPlayerLevel;

    if (levelDifference >= 11) {
        return didWin ? 750 : 0;
    }
    if (levelDifference >= 6) {
        return didWin ? 600 : 0;
    }
    if (levelDifference >= 3) {
        return didWin ? 450 : -25;
    }
    if (levelDifference >= 1) {
        return didWin ? 350 : -50;
    }
    if (levelDifference <= -11) {
        return didWin ? 100 : -200;
    }
    if (levelDifference <= -6) {
        return didWin ? 100 : -200;
    }
    if (levelDifference <= -3) {
        return didWin ? 150 : -200;
    }
    if (levelDifference <= -1) {
        return didWin ? 200 : -150;
    }
    return didWin ? 250 : -75;
};

const getLevelProgressPercent = (experienceIntoLevel, experienceForNextLevel, level) => {
    const nextLevelCost = Math.max(0, Number(experienceForNextLevel) || 0);
    if (nextLevelCost > 0) {
        const progress = Math.max(0, Number(experienceIntoLevel) || 0);
        return Math.max(6, Math.min(100, Math.round((progress / nextLevelCost) * 100)));
    }
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (normalizedLevel >= LADDER_MAX_LEVEL) {
        return 100;
    }
    return Math.max(6, Math.min(100, Math.round((normalizedLevel / LADDER_MAX_LEVEL) * 100)));
};

const getRosterCharacterId = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    return typeof character?.characterId === 'string' ? character.characterId.trim().toLowerCase() : '';
};

const getRosterCharacterName = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    return typeof character?.name === 'string' ? character.name.trim() : '';
};

const getRosterCharacterArena = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    return character ? normalizeArenaMode(character.arena || character.universe) : '';
};

const getRosterIndexByCharacterId = (characterId) => {
    const normalizedCharacterId = normalizeCharacterId(characterId);
    if (!normalizedCharacterId || !Array.isArray(charactersData)) {
        return -1;
    }
    return charactersData.findIndex((character) => {
        const candidateId = normalizeCharacterId(
            character?.characterId || character?.id || character?.name || ''
        );
        return candidateId === normalizedCharacterId;
    });
};

const getRosterCharacterKey = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    const characterId =
        typeof character?.characterId === 'string' ? character.characterId.trim().toLowerCase() : '';
    return characterId || (character ? `index:${index}` : '');
};

const teamHasDuplicateCharacters = (team = []) => {
    if (!Array.isArray(team)) {
        return false;
    }
    const seen = new Set();
    return team.some((rosterIndex) => {
        const key = getRosterCharacterKey(rosterIndex);
        if (!key) {
            return false;
        }
        if (seen.has(key)) {
            return true;
        }
        seen.add(key);
        return false;
    });
};

const isValidTeamSelectionForMatch = (team = []) =>
    Array.isArray(team) &&
    team.length === 3 &&
    team.every((slot) => {
        const rosterIndex = Number.parseInt(slot, 10);
        return Number.isInteger(rosterIndex) && rosterIndex >= 0 && Boolean(getRosterCharacterKey(rosterIndex));
    }) &&
    !teamHasDuplicateCharacters(team);

const sanitizeSavedTeamIndicesForArena = (team = [], arena = DEFAULT_ARENA_MODE) => {
    if (!Array.isArray(team)) {
        return [];
    }
    const normalizedArena = normalizeArenaMode(arena);
    const used = new Set();
    const sanitized = [];
    team.forEach((slot) => {
        if (sanitized.length >= 3) {
            return;
        }
        const rosterIndex = Number.parseInt(slot, 10);
        if (!Number.isInteger(rosterIndex) || rosterIndex < 0) {
            return;
        }
        if (!getRosterCharacterKey(rosterIndex)) {
            return;
        }
        if (getRosterCharacterArena(rosterIndex) !== normalizedArena) {
            return;
        }
        if (used.has(rosterIndex)) {
            return;
        }
        used.add(rosterIndex);
        sanitized.push(rosterIndex);
    });
    return sanitized;
};

const resolveRenderableMatchTeamForArena = ({
    team = [],
    boardUnits = [],
    arena = DEFAULT_ARENA_MODE,
} = {}) => {
    const sanitizedTeam = sanitizeSavedTeamIndicesForArena(team, arena);
    if (sanitizedTeam.length >= 3) {
        return sanitizedTeam;
    }
    const boardTeam = sanitizeSavedTeamIndicesForArena(
        (Array.isArray(boardUnits) ? boardUnits : []).map((unit) => unit?.rosterIndex),
        arena
    );
    if (boardTeam.length >= 3) {
        return boardTeam;
    }
    const used = new Set();
    const merged = [];
    [...sanitizedTeam, ...boardTeam].forEach((rosterIndex) => {
        if (merged.length >= 3 || used.has(rosterIndex)) {
            return;
        }
        used.add(rosterIndex);
        merged.push(rosterIndex);
    });
    return merged;
};

const buildSanitizedSavedTeamIndicesByArena = (user = {}) => {
    const savedTeamIndicesByArena =
        user.savedTeamIndicesByArena && typeof user.savedTeamIndicesByArena === 'object'
            ? user.savedTeamIndicesByArena
            : {};
    const comicFallback = Array.isArray(savedTeamIndicesByArena.comic)
        ? savedTeamIndicesByArena.comic
        : Array.isArray(user.savedTeamIndices)
            ? user.savedTeamIndices
            : [];
    const pokemonFallback = Array.isArray(savedTeamIndicesByArena.pokemon)
        ? savedTeamIndicesByArena.pokemon
        : [];
    return {
        comic: sanitizeSavedTeamIndicesForArena(comicFallback, 'comic'),
        pokemon: sanitizeSavedTeamIndicesForArena(pokemonFallback, 'pokemon'),
    };
};

const normalizeCharacterId = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const getCharacterDisplayNameById = (characterId) => {
    const normalizedCharacterId = normalizeCharacterId(characterId);
    if (!normalizedCharacterId) {
        return '';
    }
    const characters = Array.isArray(charactersData) ? charactersData : [];
    const match = characters.find((character) => {
        const candidateId = normalizeCharacterId(
            character?.characterId || character?.id || character?.name || ''
        );
        return candidateId === normalizedCharacterId;
    });
    return typeof match?.name === 'string' && match.name.trim()
        ? match.name.trim()
        : String(characterId || '').trim();
};

const normalizeMissionModeRestriction = (source = {}) => {
    const allowedModes = Array.from(
        new Set(
            normalizeMissionTextList(
                Array.isArray(source.allowed_modes)
                    ? source.allowed_modes
                    : Array.isArray(source.allowedModes)
                        ? source.allowedModes
                        : typeof source.allowed_modes === 'string'
                            ? source.allowed_modes.split(',')
                            : typeof source.allowedModes === 'string'
                                ? source.allowedModes.split(',')
                                : []
            )
                .map((entry) => String(entry || '').trim().toLowerCase())
                .filter((entry) => entry === 'quick' || entry === 'ladder')
        )
    );
    return {
        allowed_modes: allowedModes.length ? allowedModes : ['quick', 'ladder'],
    };
};

const getLegacyLevelRequirement = (value) => {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
        return Math.max(1, Math.floor(numericValue));
    }

    const label = String(value || '').trim().toLowerCase();
    if (!label) {
        return 0;
    }

    const legacyLevelMap = new Map([
        ['academy student', 1],
        ['sparkstrike', 1],
        ['genin', 6],
        ['temporal warden', 6],
        ['chunin', 12],
        ['blood ripper', 12],
        ['jounin', 16],
        ['jonin', 16],
        ['joinin', 16],
        ['stormbreaker', 16],
        ['anbu', 21],
        ['void sentinel', 21],
        ['sannin', 31],
        ['galaxy reaper', 31],
        ['jinchuriki', 36],
        ['purity aegis', 36],
        ['akatsuki', 41],
        ['dimension crusader', 41],
        ['kage', 46],
        ['infinity knight', 46],
    ]);
    return legacyLevelMap.get(label) || 0;
};

const normalizeMissionProgressEntry = (entry = {}) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const winStreak = Math.max(
        0,
        Number(
            source.winStreak ??
                source.rickGrimesWinStreak ??
                source.streak ??
                source.consecutiveWins ??
                0
        ) || 0
    );
    const completedAt =
        source.completedAt instanceof Date || typeof source.completedAt === 'string'
            ? source.completedAt
            : source.unlockedAt instanceof Date || typeof source.unlockedAt === 'string'
                ? source.unlockedAt
                : null;
    const updatedAt =
        source.updatedAt instanceof Date || typeof source.updatedAt === 'string'
            ? source.updatedAt
            : null;
    const rawGoalProgress =
        source.goalProgressByIndex && typeof source.goalProgressByIndex === 'object'
            ? source.goalProgressByIndex
            : source.goalProgress && typeof source.goalProgress === 'object'
                ? source.goalProgress
                : {};
    const goalProgressByIndex = {};
    Object.keys(rawGoalProgress).forEach((goalIndex) => {
        const normalizedGoalIndex = String(Number.parseInt(goalIndex, 10));
        if (!normalizedGoalIndex || normalizedGoalIndex === 'NaN') {
            return;
        }
        goalProgressByIndex[normalizedGoalIndex] = normalizeMissionGoalProgressEntry(
            rawGoalProgress[goalIndex]
        );
    });
    return {
        winStreak,
        rickGrimesWinStreak: winStreak,
        completedAt,
        unlockedAt: completedAt,
        updatedAt,
        goalProgressByIndex,
        goalProgress: goalProgressByIndex,
    };
};

const normalizeMissionGoalProgressEntry = (entry = {}) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const count = Math.max(0, Number(source.count ?? source.progress ?? 0) || 0);
    const completedAt =
        source.completedAt instanceof Date || typeof source.completedAt === 'string'
            ? source.completedAt
            : null;
    const updatedAt =
        source.updatedAt instanceof Date || typeof source.updatedAt === 'string'
            ? source.updatedAt
            : null;
    return {
        count,
        progress: count,
        completedAt,
        updatedAt,
    };
};

const createDefaultMissionState = () => {
    const neganProgress = normalizeMissionProgressEntry({
        winStreak: 0,
        completedAt: null,
    });
    return {
        progressByMissionId: {
            negan: neganProgress,
        },
        progress: {
            negan: neganProgress,
        },
        unlockedCharacterIds: [],
        unlockPoints: 0,
        purchasedUnlocks: [],
        starterCharacterId: null,
        starterSelectionVersion: 0,
        gen2StarterCharacterId: null,
        gen2StarterSelectionVersion: 0,
        eeveeEvolutionCharacterId: null,
    };
};

const createDefaultArenaSkinState = () => ({
    unlockedSkinIds: [],
    equippedSkinByCharacterId: {},
});

const normalizeSkinId = (value = '') =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const POKEMON_SKIN_CATALOG = [
    {
        skinId: 'ditto-shiny',
        characterId: 'ditto',
        name: 'Shiny Ditto',
        description: 'Ditto begins battle in its blue shiny appearance and still copies the exact skin of any Pokemon it transforms into.',
        unlockPointCost: 500,
        previewFacePicture: 'assets/images/PokemonArena/Ditto/Done/shinyFP.jpg',
        patch: {
            facePicture: 'assets/images/PokemonArena/Ditto/Done/shinyFP.jpg',
        },
    },
    {
        skinId: 'ditto-flubber',
        characterId: 'ditto',
        name: 'Flubber Ditto',
        description: 'A green Flubber-inspired Ditto skin. After transforming, Ditto still uses the copied Pokemon’s exact equipped appearance.',
        unlockPointCost: 500,
        previewFacePicture: 'assets/images/PokemonArena/Ditto/Done/dittoflubberskin.png',
        patch: {
            facePicture: 'assets/images/PokemonArena/Ditto/Done/dittoflubberskin.png',
        },
    },
    {
        skinId: 'pikachu-raichu',
        characterId: 'pikachu',
        name: 'Raichu',
        description: 'A Raichu-inspired skin for Pikachu with custom portrait and skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/Pikachu/skins/raichu/fp.webp',
        patch: {
            facePicture: 'assets/images/PokemonArena/Pikachu/skins/raichu/fp.webp',
        },
        skillImageOverridesBySkillId: {
            'pikachu-thundershock': 'assets/images/PokemonArena/Pikachu/skins/raichu/skill1.webp',
            'pikachu-volt-tackle': 'assets/images/PokemonArena/Pikachu/skins/raichu/skill2.webp',
            'pikachu-thunder': 'assets/images/PokemonArena/Pikachu/skins/raichu/skill3.webp',
            'pikachu-agility': 'assets/images/PokemonArena/Pikachu/skins/raichu/skill4.webp',
            'pikachu-passive-static': 'assets/images/PokemonArena/Pikachu/skins/raichu/skill5.webp',
        },
    },
    {
        skinId: 'butterfree-pink',
        characterId: 'butterfree',
        name: 'Pink Butterfree',
        description: 'A rosy Pink Butterfree skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/butterfree/skins/Pink/PinkFP.png',
        patch: {
            facePicture: 'assets/images/PokemonArena/butterfree/skins/Pink/PinkFP.png',
        },
        skillImageOverridesBySkillId: {
            'butterfree-confusion': 'assets/images/PokemonArena/butterfree/skins/Pink/PinkConfusion.png',
            'butterfree-psybeam': 'assets/images/PokemonArena/butterfree/skins/Pink/PinkPSybeam.png',
            'butterfree-stun-spore': 'assets/images/PokemonArena/butterfree/skins/Pink/PinkStunspore.png',
            'butterfree-sleep-powder': 'assets/images/PokemonArena/butterfree/skins/Pink/PinkSleepPowder.png',
            'butterfree-whirlwind': 'assets/images/PokemonArena/butterfree/skins/Pink/PinkWhirlwind.png',
        },
    },
    {
        skinId: 'onix-crystal',
        characterId: 'onix',
        name: 'Crystal Onix',
        description: 'A crystal-blue Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/onix/skins/crystal/crystalfp.webp',
        patch: {
            facePicture: 'assets/images/PokemonArena/onix/skins/crystal/crystalfp.webp',
        },
        skillImageOverridesBySkillId: {
            'onix-rock-throw': 'assets/images/PokemonArena/onix/skins/crystal/crystalrockthrow.webp',
            'onix-iron-tail': 'assets/images/PokemonArena/onix/skins/crystal/crystalirontail.webp',
            'onix-stealth-rock': 'assets/images/PokemonArena/onix/skins/crystal/crystalstealthrock.webp',
            'onix-harden': 'assets/images/PokemonArena/onix/skins/crystal/crystalharden.webp',
            'onix-passive-sturdy': 'assets/images/PokemonArena/onix/skins/crystal/crystalpassive.webp',
        },
    },
    {
        skinId: 'onix-bismuth',
        characterId: 'onix',
        name: 'Bismuth Onix',
        description: 'A prismatic Bismuth Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthFP.png',
        patch: { facePicture: 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthFP.png' },
        skillImageOverridesBySkillId: {
            'onix-rock-throw': 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthRockThrow.png',
            'onix-iron-tail': 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthIronTail.png',
            'onix-stealth-rock': 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthStealthRock.png',
            'onix-harden': 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthHarden.png',
            'onix-passive-sturdy': 'assets/images/PokemonArena/onix/skins/Bismuth/BismuthSturdy.png',
        },
    },
    {
        skinId: 'onix-golden',
        characterId: 'onix',
        name: 'Golden Onix',
        description: 'A gleaming Golden Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/onix/skins/Golden/GoldFP.png',
        patch: { facePicture: 'assets/images/PokemonArena/onix/skins/Golden/GoldFP.png' },
        skillImageOverridesBySkillId: {
            'onix-rock-throw': 'assets/images/PokemonArena/onix/skins/Golden/GoldRockThrow.png',
            'onix-iron-tail': 'assets/images/PokemonArena/onix/skins/Golden/GoldIronTail.png',
            'onix-stealth-rock': 'assets/images/PokemonArena/onix/skins/Golden/GoldStealthRock.png',
            'onix-harden': 'assets/images/PokemonArena/onix/skins/Golden/GoldHarden.png',
            'onix-passive-sturdy': 'assets/images/PokemonArena/onix/skins/Golden/GoldSturdy.png',
        },
    },
    {
        skinId: 'onix-magma',
        characterId: 'onix',
        name: 'Magma Onix',
        description: 'A molten Magma Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: 'assets/images/PokemonArena/onix/skins/Magma/MagmaFP.png',
        patch: { facePicture: 'assets/images/PokemonArena/onix/skins/Magma/MagmaFP.png' },
        skillImageOverridesBySkillId: {
            'onix-rock-throw': 'assets/images/PokemonArena/onix/skins/Magma/MagmaRockThrow.png',
            'onix-iron-tail': 'assets/images/PokemonArena/onix/skins/Magma/MagmaIronTail.png',
            'onix-stealth-rock': 'assets/images/PokemonArena/onix/skins/Magma/Magmastealthrock.png',
            'onix-harden': 'assets/images/PokemonArena/onix/skins/Magma/Magmaharden.png',
            'onix-passive-sturdy': 'assets/images/PokemonArena/onix/skins/Magma/Magmasturdy.png',
        },
    },
    {
        skinId: 'onix-cosmic',
        characterId: 'onix',
        name: 'Cosmic Onix',
        description: 'A celestial Cosmic Onix skin with custom portrait and full skill art.',
        unlockPointCost: 1000,
        previewFacePicture: 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicFP.png',
        patch: { facePicture: 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicFP.png' },
        skillImageOverridesBySkillId: {
            'onix-rock-throw': 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicRockThrow.png',
            'onix-iron-tail': 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicIronTail.png',
            'onix-stealth-rock': 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicStealthRock.png',
            'onix-harden': 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicHarden.png',
            'onix-passive-sturdy': 'assets/images/PokemonArena/onix/skins/Cosmic/CosmicSturdy.png',
        },
    },
    {
        skinId: 'magikarp-golden-gyarados-red',
        characterId: 'magikarp',
        name: 'Golden Magikarp',
        description: 'A golden Magikarp skin that evolves into a red Gyarados with custom portrait and skill art.',
        unlockPointCost: 1000,
        previewFacePicture: 'assets/images/PokemonArena/magikarp/skins/gold/goldenfp.jpeg',
        patch: {
            facePicture: 'assets/images/PokemonArena/magikarp/skins/gold/goldenfp.jpeg',
        },
        skillImageOverridesBySkillId: {
            'magikarp-tackle': 'assets/images/PokemonArena/magikarp/skins/gold/goldentackle.jpeg',
            'magikarp-splash': 'assets/images/PokemonArena/magikarp/skins/gold/goldensplash.jpeg',
            'magikarp-flail': 'assets/images/PokemonArena/magikarp/skins/gold/goldenflail.jpeg',
            'magikarp-struggle': 'assets/images/PokemonArena/magikarp/skins/gold/goldenstruggle.jpeg',
            'magikarp-passive-evolution-gyarados': 'assets/images/PokemonArena/magikarp/skins/gold/goldenevolutiongyarados.jpeg',
            'gyarados-hyper-beam': 'assets/images/PokemonArena/magikarp/skins/gold/redhyperbeam.jpeg',
            'gyarados-hyper-beam-affliction': 'assets/images/PokemonArena/magikarp/skins/gold/redhyperbeam.jpeg',
            'gyarados-dragon-rage': 'assets/images/PokemonArena/magikarp/skins/gold/reddragonrage.jpeg',
            'gyarados-ice-fang': 'assets/images/PokemonArena/magikarp/skins/gold/redicefang.jpeg',
            'gyarados-hydro-pump': 'assets/images/PokemonArena/magikarp/skins/gold/redhydropump.jpeg',
        },
        statusFacePictureOverridesByStatusId: {
            magikarp_gyarados_evolution: 'assets/images/PokemonArena/magikarp/skins/gold/redfp.jpeg',
        },
    },
    {
        skinId: 'charmander-charizard-legendary',
        characterId: 'charmander',
        name: 'Charizard',
        description:
            'A legendary Charizard skin for Charmander that branches into Mega Charizard X if Seismic Toss activates the evolution or Mega Charizard Y if Flamethrower or Fire Blast activates the evolution.',
        unlockPointCost: 1350,
        previewFacePicture: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg',
        patch: {
            facePicture: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg',
            pokemonTypes: ['Fire', 'Flying'],
        },
        skillOverridesBySkillId: {
            'charmander-passive-evolution-charmeleon': {
                name: 'Legendary Evolution - Charizard',
                skilldescription:
                    "After Charmander critically strikes or burns an enemy twice, he evolves with his legendary Charizard skin. If Seismic Toss activates the evolution, he becomes Mega Charizard X. If Flamethrower or Fire Blast activates the evolution, he becomes Mega Charizard Y.",
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYpassive.webp',
            },
            'charmander-ember': {
                name: 'Flamethrower',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill1.webp',
            },
            'charmander-scratch': {
                name: 'Seismic Toss',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill2.webp',
            },
            'charmander-flamethrower': {
                name: 'Fire Blast',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill3.webp',
            },
            'charmander-rage': {
                name: 'Charizard Flight',
                skilldescription:
                    'For 4 turns, Charizard gains 25% damage reduction. The first time each turn Charizard takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 2 stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill4.webp',
            },
            'charmander-fire-punch': {
                name: 'Flamethrower',
                hiddenFromSelectionViewer: true,
                skilldescription:
                    'Charizard deals 15 physical damage and 30 affliction damage to one enemy. This skill has a 30% chance to Burn the target. Burn: The target takes 5 permanent affliction damage and deals 5 less non-affliction damage. This effect stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill1.webp',
            },
            'charmander-dragon-claw': {
                name: 'Seismic Toss',
                hiddenFromSelectionViewer: true,
                skilldescription:
                    'Charizard deals 30 damage to one enemy. This skill has a 30% chance to critically strike, dealing 10 additional damage and becoming Piercing.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill2.webp',
            },
            'charmander-charmeleon-flamethrower': {
                name: 'Fire Blast',
                hiddenFromSelectionViewer: true,
                skilldescription:
                    'Charizard deals 30 affliction damage to all enemies. Each enemy has a 30% chance to be Burned. Burn: The target takes 5 permanent affliction damage and deals 5 less non-affliction damage. This effect stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill3.webp',
            },
            'charmander-charmeleon-rage': {
                name: 'Charizard Flight',
                hiddenFromSelectionViewer: true,
                skilldescription:
                    'For 4 turns, Charizard gains 50% damage reduction. The first time each turn Charizard takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill4.webp',
            },
            'charmander-charizard-x-fire-punch': {
                name: 'Flamethrower',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXSkill1.webp',
            },
            'charmander-charizard-x-dragon-claw': {
                name: 'Dragon Claw',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill2.webp',
            },
            'charmander-charizard-x-flamethrower': {
                name: 'Fire Blast',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill3.webp',
            },
            'charmander-charizard-x-rage': {
                name: 'Mega Charizard X Rampage',
                skilldescription:
                    'For 4 turns, Mega Charizard X gains 50% damage reduction. The first time each turn Mega Charizard X takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill4.webp',
            },
            'charmander-charizard-y-fire-punch': {
                name: 'Overheat',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill1.webp',
            },
            'charmander-charizard-y-dragon-claw': {
                name: 'Dragon Tail',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill2.webp',
            },
            'charmander-charizard-y-flamethrower': {
                name: 'Fire Spin',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill3.webp',
            },
            'charmander-charizard-y-rage': {
                name: 'Mega Charizard Y Flight',
                skilldescription:
                    'For 4 turns, Mega Charizard Y gains 50% damage reduction. The first time each turn Mega Charizard Y takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill4.webp',
            },
        },
        statusFacePictureOverridesByStatusId: {
            charmander_charmeleon_evolution: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg',
            charmander_charizard_x_evolution_branch:
                'assets/images/PokemonArena/Charmander/skins/charizard/charizardXFP.webp',
            charmander_charizard_y_evolution_branch:
                'assets/images/PokemonArena/Charmander/skins/charizard/charizardYFP.webp',
        },
    },
];

const POKEMON_GEN2_EVOLUTION_SKIN_CATALOG = [
    {
        skinId: 'cyndaquil-quilava-evolution',
        characterId: 'cyndaquil',
        name: 'Quilava',
        description: 'Cyndaquil permanently evolves into Quilava after 16 ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/quilavafp.png',
        patch: { name: 'Quilava', facePicture: 'assets/images/PokemonArena/Cyndaquil/quilavafp.png' },
        skillImageOverridesBySkillId: {
            'cyndaquil-aerial-tackle': 'assets/images/PokemonArena/Cyndaquil/quilavas1.png',
            'cyndaquil-aerial-flamethrower': 'assets/images/PokemonArena/Cyndaquil/quilavas3.png',
            'cyndaquil-cynda-smokescreen': 'assets/images/PokemonArena/Cyndaquil/quilavas2.png',
            'cyndaquil-skyward-leap': 'assets/images/PokemonArena/Cyndaquil/quilavas4.png',
            'cyndaquil-warming-up': 'assets/images/PokemonArena/Cyndaquil/quilavas5.png',
        },
    },
    {
        skinId: 'cyndaquil-typhlosion-evolution',
        characterId: 'cyndaquil',
        name: 'Typhlosion',
        description: 'Quilava permanently evolves into Typhlosion after 36 more ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/typlosionfp.png',
        patch: { name: 'Typhlosion', facePicture: 'assets/images/PokemonArena/Cyndaquil/typlosionfp.png' },
        skillImageOverridesBySkillId: {
            'cyndaquil-aerial-tackle': 'assets/images/PokemonArena/Cyndaquil/typlosions1.png',
            'cyndaquil-aerial-flamethrower': 'assets/images/PokemonArena/Cyndaquil/typhlosions3.png',
            'cyndaquil-cynda-smokescreen': 'assets/images/PokemonArena/Cyndaquil/typhlosions2.png',
            'cyndaquil-skyward-leap': 'assets/images/PokemonArena/Cyndaquil/typlosions4.png',
            'cyndaquil-warming-up': 'assets/images/PokemonArena/Cyndaquil/typhlosions5.png',
        },
    },
    {
        skinId: 'chikorita-bayleaf-evolution',
        characterId: 'chikorita',
        name: 'Bayleaf',
        description: 'Chikorita permanently evolves into Bayleaf after 16 ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleaffp.png',
        patch: { name: 'Bayleaf', facePicture: 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleaffp.png' },
        skillImageOverridesBySkillId: {
            'chikorita-aerial-razor-leaf': 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleafs1.png',
            'chikorita-light-screen': 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleafs2.png',
            'chikorita-chikorita-solar-beam': 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleafs3.png',
            'chikorita-vine-defense': 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleafs4.png',
            'chikorita-sweet-scent': 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleafs5.png',
        },
    },
    {
        skinId: 'chikorita-meganium-evolution',
        characterId: 'chikorita',
        name: 'Meganium',
        description: 'Bayleaf permanently evolves into Meganium after 36 more ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiumfp.png',
        patch: { name: 'Meganium', facePicture: 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiumfp.png' },
        skillImageOverridesBySkillId: {
            'chikorita-aerial-razor-leaf': 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiums1.png',
            'chikorita-light-screen': 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiums2.png',
            'chikorita-chikorita-solar-beam': 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiums3.png',
            'chikorita-vine-defense': 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiums4.png',
            'chikorita-sweet-scent': 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiums5.png',
        },
    },
    {
        skinId: 'totodile-croconaw-evolution',
        characterId: 'totodile',
        name: 'Croconaw',
        description: 'Totodile permanently evolves into Croconaw after 16 ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/Totodile/croconawfp.png',
        patch: { name: 'Croconaw', facePicture: 'assets/images/PokemonArena/Cyndaquil/Totodile/croconawfp.png' },
        skillImageOverridesBySkillId: {
            'totodile-aerial-water-gun': 'assets/images/PokemonArena/Cyndaquil/Totodile/croconaws1.png',
            'totodile-scary-face': 'assets/images/PokemonArena/Cyndaquil/Totodile/croconaws2.png',
            'totodile-aqua-tail': 'assets/images/PokemonArena/Cyndaquil/Totodile/croconaws3.png',
            'totodile-superpower': 'assets/images/PokemonArena/Cyndaquil/Totodile/croconaws4.png',
            'totodile-water-rings': 'assets/images/PokemonArena/Cyndaquil/Totodile/croconaws5.png',
        },
    },
    {
        skinId: 'totodile-feraligatr-evolution',
        characterId: 'totodile',
        name: 'Feraligatr',
        description: 'Croconaw permanently evolves into Feraligatr after 36 more ranked wins.',
        missionRewardOnly: true,
        unlockPointCost: 0,
        previewFacePicture: 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrfp.png',
        patch: { name: 'Feraligatr', facePicture: 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrfp.png' },
        skillImageOverridesBySkillId: {
            'totodile-aerial-water-gun': 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrs1.png',
            'totodile-scary-face': 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrs2.png',
            'totodile-aqua-tail': 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrs3.png',
            'totodile-superpower': 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrs4.png',
            'totodile-water-rings': 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrs5.png',
        },
    },
];

const getArenaSkinCatalog = (arena = DEFAULT_ARENA_MODE) =>
    normalizeArenaMode(arena) === 'pokemon'
        ? [...POKEMON_SKIN_CATALOG, ...POKEMON_GEN2_EVOLUTION_SKIN_CATALOG]
        : [];

const getArenaSkinCatalogById = (arena = DEFAULT_ARENA_MODE) => {
    const catalog = new Map();
    getArenaSkinCatalog(arena).forEach((entry = {}) => {
        const skinId = normalizeSkinId(entry.skinId ?? entry.id);
        const characterId = normalizeCharacterId(entry.characterId ?? entry.character_id);
        if (!skinId || !characterId) {
            return;
        }
        catalog.set(skinId, {
            ...entry,
            skinId,
            characterId,
            unlockPointCost: entry.missionRewardOnly
                ? 0
                : Math.max(
                      1,
                      Math.floor(Number(entry.unlockPointCost ?? entry.unlock_point_cost ?? 100) || 100)
                  ),
        });
    });
    return catalog;
};

const normalizeArenaSkinState = (skins = {}, arena = DEFAULT_ARENA_MODE) => {
    const source = skins && typeof skins === 'object' ? skins : {};
    const catalogById = getArenaSkinCatalogById(arena);
    const unlockedSkinIds = Array.from(
        new Set(
            (Array.isArray(source.unlockedSkinIds)
                ? source.unlockedSkinIds
                : Array.isArray(source.unlocked_skins)
                    ? source.unlocked_skins
                    : []
            )
                .map((entry) => normalizeSkinId(entry))
                .filter((skinId) => catalogById.has(skinId))
        )
    );
    const equippedSource =
        source.equippedSkinByCharacterId && typeof source.equippedSkinByCharacterId === 'object'
            ? source.equippedSkinByCharacterId
            : source.selectedSkinByCharacterId && typeof source.selectedSkinByCharacterId === 'object'
                ? source.selectedSkinByCharacterId
                : {};
    const equippedSkinByCharacterId = {};
    Object.entries(equippedSource).forEach(([characterId, skinId]) => {
        const normalizedCharacterId = normalizeCharacterId(characterId);
        const normalizedSkin = normalizeSkinId(skinId);
        const catalogEntry = catalogById.get(normalizedSkin);
        if (!normalizedCharacterId || !catalogEntry) {
            return;
        }
        if (!unlockedSkinIds.includes(normalizedSkin)) {
            return;
        }
        if (catalogEntry.characterId !== normalizedCharacterId) {
            return;
        }
        equippedSkinByCharacterId[normalizedCharacterId] = normalizedSkin;
    });
    return {
        unlockedSkinIds,
        equippedSkinByCharacterId,
    };
};

const serializeSkinCatalogEntryForClient = (entry = {}) => ({
    skinId: entry.skinId,
    characterId: entry.characterId,
    name: typeof entry.name === 'string' ? entry.name.trim() : '',
    description: typeof entry.description === 'string' ? entry.description.trim() : '',
    missionRewardOnly: Boolean(entry.missionRewardOnly),
    unlockPointCost: entry.missionRewardOnly
        ? 0
        : Math.max(1, Math.floor(Number(entry.unlockPointCost) || 100)),
    previewFacePicture:
        typeof entry.previewFacePicture === 'string' && entry.previewFacePicture.trim()
            ? entry.previewFacePicture.trim()
            : typeof entry.patch?.facePicture === 'string' && entry.patch.facePicture.trim()
                ? entry.patch.facePicture.trim()
                : '',
    patch: entry.patch && typeof entry.patch === 'object' ? entry.patch : {},
    skillImageOverridesBySkillId:
        entry.skillImageOverridesBySkillId && typeof entry.skillImageOverridesBySkillId === 'object'
            ? entry.skillImageOverridesBySkillId
            : {},
    skillOverridesBySkillId:
        entry.skillOverridesBySkillId && typeof entry.skillOverridesBySkillId === 'object'
            ? entry.skillOverridesBySkillId
            : {},
    statusFacePictureOverridesByStatusId:
        entry.statusFacePictureOverridesByStatusId &&
        typeof entry.statusFacePictureOverridesByStatusId === 'object'
            ? entry.statusFacePictureOverridesByStatusId
            : {},
});

const isPayPalConfigured = () => Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);

const getUnlockPointStorePackages = (arena = DEFAULT_ARENA_MODE) =>
    UNLOCK_POINT_STORE_PACKAGES.filter((entry) => normalizeArenaMode(entry.arena) === normalizeArenaMode(arena));

const serializeUnlockPointStorePackageForClient = (entry = {}) => ({
    packageId: String(entry.packageId || '').trim(),
    arena: normalizeArenaMode(entry.arena),
    points: Math.max(1, Math.floor(Number(entry.points) || 0)),
    amountUsd: String(entry.amountUsd || '').trim(),
    currency: String(entry.currency || 'USD').trim().toUpperCase(),
    provider: String(entry.provider || 'paypal').trim().toLowerCase(),
    label: String(entry.label || '').trim(),
    description: String(entry.description || '').trim(),
});

const findUnlockPointStorePackage = (packageId = '', arena = DEFAULT_ARENA_MODE) =>
    getUnlockPointStorePackages(arena).find(
        (entry) => String(entry.packageId || '').trim().toLowerCase() === String(packageId || '').trim().toLowerCase()
    ) || null;

const buildUnlockPointStoreResponse = ({ arena = DEFAULT_ARENA_MODE, profile = null } = {}) => {
    const normalizedArena = normalizeArenaMode(arena);
    const arenaProfile = profile ? getProfileArenaState(profile, normalizedArena) : {};
    const missionState = normalizeMissionState(arenaProfile?.missions);
    return {
        arena: normalizedArena,
        unlockPoints: missionState.unlockPoints,
        merchantEmail: PAYPAL_MERCHANT_EMAIL,
        paypalAvailable: isPayPalConfigured(),
        paypalEnvironment: PAYPAL_ENV,
        pointStorePackages: getUnlockPointStorePackages(normalizedArena).map(
            serializeUnlockPointStorePackageForClient
        ),
    };
};

const createPayPalPointsCustomId = ({ username = '', arena = DEFAULT_ARENA_MODE, packageId = '' } = {}) =>
    JSON.stringify({
        username: String(username || '').trim(),
        arena: normalizeArenaMode(arena),
        packageId: String(packageId || '').trim(),
    });

const parsePayPalPointsCustomId = (value = '') => {
    try {
        const parsed = JSON.parse(String(value || ''));
        return {
            username: String(parsed?.username || '').trim(),
            arena: normalizeArenaMode(parsed?.arena),
            packageId: String(parsed?.packageId || '').trim(),
        };
    } catch (error) {
        return {
            username: '',
            arena: '',
            packageId: '',
        };
    }
};

const getPayPalAccessToken = async () => {
    if (!isPayPalConfigured()) {
        throw new Error('PayPal is not configured.');
    }
    const response = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.error_description || payload?.error || 'Unable to authenticate with PayPal.');
    }
    return payload.access_token;
};

const buildPayPalOrderHeaders = async () => ({
    Authorization: `Bearer ${await getPayPalAccessToken()}`,
    'Content-Type': 'application/json',
});

const extractPayPalApproveUrl = (payload = {}) =>
    (Array.isArray(payload?.links) ? payload.links : []).find(
        (entry) => entry?.rel === 'payer-action' || entry?.rel === 'approve'
    )?.href || '';

const extractCompletedPayPalCapture = (payload = {}) => {
    const purchaseUnit = Array.isArray(payload?.purchase_units) ? payload.purchase_units[0] : null;
    const capture = Array.isArray(purchaseUnit?.payments?.captures) ? purchaseUnit.payments.captures[0] : null;
    if (!capture || String(capture.status || '').trim().toUpperCase() !== 'COMPLETED') {
        return null;
    }
    return {
        captureId: String(capture.id || '').trim(),
        amountValue: String(capture.amount?.value || '').trim(),
        currencyCode: String(capture.amount?.currency_code || '').trim().toUpperCase(),
        customId: String(purchaseUnit?.custom_id || '').trim(),
        payerId: String(payload?.payer?.payer_id || '').trim(),
        payerEmail: String(payload?.payer?.email_address || '').trim(),
    };
};

const grantUnlockPointsPurchase = async ({
    user,
    arena = DEFAULT_ARENA_MODE,
    packageEntry,
    orderId = '',
    captureId = '',
    payerId = '',
    payerEmail = '',
}) => {
    const normalizedProfile = normalizeUserProfile(user);
    const arenaState = getProfileArenaState(normalizedProfile, arena);
    const missionState = normalizeMissionState(arenaState.missions);
    missionState.unlockPoints += Math.max(1, Math.floor(Number(packageEntry?.points) || 0));
    arenaState.missions = normalizeMissionState(missionState);
    arenaState.ladder = {
        ...(arenaState.ladder || {}),
        unlockPoints: arenaState.missions.unlockPoints,
    };
    const nextProfile = normalizeUserProfile({
        ...user,
        profile: setProfileArenaState(normalizedProfile, arena, arenaState),
    });
    const grantedAt = new Date();
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                profile: nextProfile,
            },
        }
    );
    await pointPurchasesCollection.updateOne(
        { provider: 'paypal', orderId: String(orderId || '').trim() },
        {
            $set: {
                provider: 'paypal',
                orderId: String(orderId || '').trim(),
                captureId: String(captureId || '').trim(),
                username: user.username,
                arena: normalizeArenaMode(arena),
                packageId: String(packageEntry?.packageId || '').trim(),
                pointsGranted: Math.max(1, Math.floor(Number(packageEntry?.points) || 0)),
                amountUsd: String(packageEntry?.amountUsd || '').trim(),
                currency: String(packageEntry?.currency || 'USD').trim().toUpperCase(),
                payerId: String(payerId || '').trim(),
                payerEmail: String(payerEmail || '').trim(),
                status: 'granted',
                merchantEmail: PAYPAL_MERCHANT_EMAIL,
                grantedAt,
                updatedAt: grantedAt,
            },
            $setOnInsert: {
                createdAt: grantedAt,
            },
        },
        { upsert: true }
    );
    return nextProfile;
};

const normalizeMissionPurchasedUnlock = (entry = {}) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const characterId = normalizeCharacterId(source.characterId ?? source.character_id ?? source.character);
    if (!characterId) {
        return null;
    }
    return {
        characterId,
        missionId: slugifyMissionId(source.missionId ?? source.mission_id ?? source.mission ?? ''),
        cost: Math.max(0, Math.floor(Number(source.cost) || 0)),
        purchasedAt: source.purchasedAt || source.purchased_at || null,
    };
};

const normalizeMissionState = (missions = {}) => {
    const source = missions && typeof missions === 'object' ? missions : {};
    const sourceProgress =
        source.progressByMissionId && typeof source.progressByMissionId === 'object'
            ? source.progressByMissionId
            : source.progress && typeof source.progress === 'object'
                ? source.progress
                : {};
    const progressByMissionId = {};
    Object.keys(sourceProgress).forEach((missionId) => {
        const normalizedMissionId = slugifyMissionId(missionId);
        if (!normalizedMissionId) {
            return;
        }
        progressByMissionId[normalizedMissionId] = normalizeMissionProgressEntry(
            sourceProgress[missionId]
        );
    });
    if (!progressByMissionId.negan) {
        progressByMissionId.negan = normalizeMissionProgressEntry(sourceProgress.negan || {});
    }
    const unlockedCharacterIds = new Set(
        (Array.isArray(source.unlockedCharacterIds) ? source.unlockedCharacterIds : [])
            .map((entry) => normalizeCharacterId(entry))
            .filter(Boolean)
    );
    const unlockPoints = Math.max(
        0,
        Math.floor(Number(source.unlockPoints ?? source.unlock_points ?? 0) || 0)
    );
    const purchasedUnlocks = (Array.isArray(source.purchasedUnlocks)
        ? source.purchasedUnlocks
        : Array.isArray(source.purchased_unlocks)
            ? source.purchased_unlocks
            : []
    )
        .map(normalizeMissionPurchasedUnlock)
        .filter(Boolean);
    const starterCharacterId = normalizeCharacterId(
        source.starterCharacterId ??
            source.starter_character_id ??
            source.starterCharacter ??
            source.starter
    );
    const starterSelectionVersion = Number.isFinite(Number(
        source.starterSelectionVersion ??
            source.starter_selection_version ??
            source.starterSelection?.version
    ))
        ? Math.max(
              0,
              Number(
                  source.starterSelectionVersion ??
                      source.starter_selection_version ??
                      source.starterSelection?.version
              )
          )
        : 0;
    const gen2StarterCharacterId = normalizeCharacterId(
        source.gen2StarterCharacterId ??
            source.gen2_starter_character_id ??
            source.gen2StarterSelection?.characterId
    );
    const gen2StarterSelectionVersion = Number.isFinite(Number(
        source.gen2StarterSelectionVersion ??
            source.gen2_starter_selection_version ??
            source.gen2StarterSelection?.version
    ))
        ? Math.max(
              0,
              Number(
                  source.gen2StarterSelectionVersion ??
                      source.gen2_starter_selection_version ??
                      source.gen2StarterSelection?.version
              )
          )
        : 0;
    const eeveeEvolutionCharacterId = normalizeCharacterId(
        source.eeveeEvolutionCharacterId ??
            source.eevee_evolution_character_id ??
            source.eeveeEvolution?.characterId ??
            source.eeveeEvolution
    );
    const validEeveeEvolutionCharacterId = getPokemonEeveeEvolutionCharacterIds().has(
        eeveeEvolutionCharacterId
    )
        ? eeveeEvolutionCharacterId
        : null;
    if (validEeveeEvolutionCharacterId) {
        unlockedCharacterIds.add(validEeveeEvolutionCharacterId);
        unlockedCharacterIds.delete('eevee');
    }
    if (starterCharacterId && getPokemonStarterCharacterIds().has(starterCharacterId)) {
        unlockedCharacterIds.add(starterCharacterId);
    }
    if (gen2StarterCharacterId && getPokemonGen2StarterCharacterIds().has(gen2StarterCharacterId)) {
        unlockedCharacterIds.add(gen2StarterCharacterId);
    }
    Object.keys(progressByMissionId).forEach((missionId) => {
        const progressEntry = progressByMissionId[missionId];
        if (
            missionId === 'negan' &&
            Math.max(0, Number(progressEntry?.winStreak) || 0) >= 4
        ) {
            unlockedCharacterIds.add('negan');
        }
    });
    return {
        progressByMissionId,
        progress: progressByMissionId,
        unlockedCharacterIds: Array.from(unlockedCharacterIds),
        unlockPoints,
        purchasedUnlocks,
        starterCharacterId: starterCharacterId && getPokemonStarterCharacterIds().has(starterCharacterId)
            ? starterCharacterId
            : null,
        starterSelectionVersion,
        gen2StarterCharacterId:
            gen2StarterCharacterId && getPokemonGen2StarterCharacterIds().has(gen2StarterCharacterId)
                ? gen2StarterCharacterId
                : null,
        gen2StarterSelectionVersion,
        eeveeEvolutionCharacterId: validEeveeEvolutionCharacterId,
    };
};

const normalizeMissionTextList = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            if (typeof entry === 'string') {
                return entry.trim();
            }
            if (entry && typeof entry === 'object') {
                return typeof entry.text === 'string' && entry.text.trim()
                    ? entry.text.trim()
                    : typeof entry.value === 'string' && entry.value.trim()
                        ? entry.value.trim()
                        : typeof entry.label === 'string' && entry.label.trim()
                            ? entry.label.trim()
                            : '';
            }
            return '';
        })
        .filter(Boolean);

const normalizeMissionGoalEntry = (entry = {}, index = 0) => {
    if (typeof entry === 'string') {
        const text = entry.trim();
        if (!text) {
            return null;
        }

        const reachRankMatch = text.match(/^Reach\s+rank\s+(\d+)(?:\.\s*\(0\/\d+\))?$/i);
        if (reachRankMatch) {
            const rank = Math.max(0, Number(reachRankMatch[1]) || 0);
            return rank
                ? {
                      type: 'reach_rank',
                      rank,
                  }
                : null;
        }

        const winMatchesMatch = text.match(/^Win\s+(\d+)\s+matches?\s+with\s+(.+?)(?:\.\s*\(0\/\d+\))?$/i);
        if (winMatchesMatch) {
            const wins = Math.max(0, Number(winMatchesMatch[1]) || 0);
            const characterName = winMatchesMatch[2].trim();
            const characterId = normalizeCharacterId(characterName);
            return {
                type: 'win_matches',
                character_id: characterId,
                character_name: characterName,
                wins,
            };
        }

        const winStreakMatch = text.match(
            /^Win\s+(\d+)\s+battles?\s+in\s+a\s+row\s+with\s+(.+?)(?:\.\s*\(0\/\d+\))?$/i
        );
        if (winStreakMatch) {
            const wins = Math.max(0, Number(winStreakMatch[1]) || 0);
            const characterName = winStreakMatch[2].trim();
            const characterId = normalizeCharacterId(characterName);
            return {
                type: 'win_streak',
                character_id: characterId,
                character_name: characterName,
                wins,
            };
        }

        const winSameTeamMatch = text.match(
            /^Win\s+(\d+)\s+games?\s+with\s+(.+?)\s+and\s+(.+?)\s+on\s+the\s+same\s+team(?:\.\s*\(0\/\d+\))?$/i
        );
        if (winSameTeamMatch) {
            const wins = Math.max(0, Number(winSameTeamMatch[1]) || 0);
            const firstCharacterName = winSameTeamMatch[2].trim();
            const secondCharacterName = winSameTeamMatch[3].trim();
            const firstCharacterId = normalizeCharacterId(firstCharacterName);
            const secondCharacterId = normalizeCharacterId(secondCharacterName);
            if (!wins || !firstCharacterId || !secondCharacterId) {
                return null;
            }
            return {
                type: 'win_matches_same_team',
                character_ids: [firstCharacterId, secondCharacterId],
                character_names: [firstCharacterName, secondCharacterName],
                wins,
            };
        }

        return {
            type: 'text',
            text,
        };
    }

    const source = entry && typeof entry === 'object' ? entry : {};
    const type = String(source.type || source.goalType || source.kind || 'text')
        .trim()
        .toLowerCase();
    const normalizedType =
        type === 'win_matches' || type === 'win_match' || type === 'match_wins'
            ? 'win_matches'
            : type === 'win_ladder_matches' || type === 'ladder_wins' || type === 'ranked_wins'
                ? 'win_ladder_matches'
            : type === 'win_streak' || type === 'streak'
                ? 'win_streak'
                : type === 'win_streak_same_team' || type === 'same_team_streak'
                    ? 'win_streak_same_team'
                : type === 'reach_rank' || type === 'rank' || type === 'reach_level'
                    ? 'reach_rank'
                    : type === 'win_matches_same_team' ||
                        type === 'same_team_wins' ||
                        type === 'same_team'
                        ? 'win_matches_same_team'
                : 'text';

    if (normalizedType === 'win_ladder_matches') {
        const wins = Math.max(0, Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0);
        const characterId = normalizeCharacterId(
            source.character_id ?? source.characterId ?? source.character ?? source.target_character
        );
        return wins
            ? {
                  type: 'win_ladder_matches',
                  wins,
                  ...(characterId
                      ? {
                            character_id: characterId,
                            character_name:
                                String(source.character_name ?? source.characterName ?? '').trim() ||
                                getCharacterDisplayNameById(characterId),
                        }
                      : {}),
              }
            : null;
    }

    if (normalizedType === 'win_matches' || normalizedType === 'win_streak') {
        const wins = Math.max(
            0,
            Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0
        );
        const characterId = normalizeCharacterId(
            source.character_id ?? source.characterId ?? source.character ?? source.target_character
        );
        const characterName = String(
            source.character_name ?? source.characterName ?? getCharacterDisplayNameById(characterId)
        ).trim();
        if (!wins || (normalizedType === 'win_matches' && !characterId)) {
            return null;
        }
        return {
            type: normalizedType,
            ...(characterId
                ? {
                      character_id: characterId,
                      character_name: characterName || getCharacterDisplayNameById(characterId),
                  }
                : {}),
            wins,
        };
    }

    if (normalizedType === 'reach_rank') {
        const rank = Math.max(
            0,
            Number(source.rank ?? source.level ?? source.target ?? source.goal ?? source.value ?? 0) || 0
        );
        if (!rank) {
            return null;
        }
        return {
            type: 'reach_rank',
            rank,
        };
    }

    if (normalizedType === 'win_streak_same_team') {
        const wins = Math.max(
            0,
            Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0
        );
        const characterIds = normalizeMissionTextList(
            Array.isArray(source.character_ids)
                ? source.character_ids
                : [
                      source.character_id ?? source.characterId ?? source.character ?? '',
                      source.teammate_character_id ??
                          source.teammateCharacterId ??
                          source.character_two_id ??
                          source.characterTwoId ??
                          '',
                  ]
        ).map((value) => normalizeCharacterId(value));
        const uniqueCharacterIds = Array.from(new Set(characterIds.filter(Boolean))).slice(0, 2);
        if (!wins || uniqueCharacterIds.length < 2) {
            return null;
        }
        const rawCharacterNames = Array.isArray(source.character_names)
            ? source.character_names
            : [
                  source.character_name ?? source.characterName ?? '',
                  source.teammate_character_name ??
                      source.teammateCharacterName ??
                      source.character_two_name ??
                      source.characterTwoName ??
                      '',
              ];
        const characterNames = uniqueCharacterIds.map((characterId, idx) => {
            const providedName = String(rawCharacterNames[idx] ?? '').trim();
            return providedName || getCharacterDisplayNameById(characterId);
        });
        return {
            type: 'win_streak_same_team',
            character_ids: uniqueCharacterIds,
            character_names: characterNames,
            wins,
        };
    }

    if (normalizedType === 'win_matches_same_team') {
        const wins = Math.max(
            0,
            Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0
        );
        const characterIds = normalizeMissionTextList(
            Array.isArray(source.character_ids)
                ? source.character_ids
                : [
                      source.character_id ?? source.characterId ?? source.character ?? '',
                      source.teammate_character_id ??
                          source.teammateCharacterId ??
                          source.character_two_id ??
                          source.characterTwoId ??
                          '',
                  ]
        ).map((value) => normalizeCharacterId(value));
        const uniqueCharacterIds = Array.from(new Set(characterIds.filter(Boolean))).slice(0, 2);
        if (!wins || uniqueCharacterIds.length < 2) {
            return null;
        }
        const rawCharacterNames = Array.isArray(source.character_names)
            ? source.character_names
            : [
                  source.character_name ?? source.characterName ?? '',
                  source.teammate_character_name ??
                      source.teammateCharacterName ??
                      source.character_two_name ??
                      source.characterTwoName ??
                      '',
              ];
        const characterNames = uniqueCharacterIds.map((characterId, idx) => {
            const providedName = String(rawCharacterNames[idx] ?? '').trim();
            return providedName || getCharacterDisplayNameById(characterId);
        });
        return {
            type: 'win_matches_same_team',
            character_ids: uniqueCharacterIds,
            character_names: characterNames,
            wins,
        };
    }

    const text = normalizeMissionTextList([
        source.text ?? source.value ?? source.label ?? source.description ?? '',
    ])[0];
    if (!text) {
        return null;
    }
    return {
        type: 'text',
        text,
    };
};

const normalizeMissionGoalList = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry, index) => normalizeMissionGoalEntry(entry, index))
        .filter(Boolean);

const normalizeMissionSpecialPve = (source = {}, rewardCharacterId = '') => {
    const raw =
        source.special_pve ||
        source.specialPve ||
        source.pve_battle ||
        source.pveBattle ||
        {};
    const normalizedRewardCharacterId = normalizeCharacterId(rewardCharacterId);
    const defaults =
        normalizedRewardCharacterId === 'xenomorph-drone'
            ? XENOMORPH_DRONE_SPECIAL_PVE
            : DEFAULT_SPECIAL_PVE_BATTLE;
    const enabled =
        normalizedRewardCharacterId === 'xenomorph-drone'
            ? true
            : raw.enabled === undefined && raw.required === undefined && raw.type === undefined
            ? Boolean(defaults.enabled)
            : Boolean(raw.enabled ?? raw.required ?? raw.type);
    const botTeamCharacterId = normalizeCharacterId(
        raw.botTeamCharacterId ??
            raw.bot_team_character_id ??
            raw.characterId ??
            raw.character_id ??
            defaults.botTeamCharacterId
    );
    const botTeamSize = Math.max(
        1,
        Math.min(
            6,
            Number(
                raw.botTeamSize ??
                    raw.bot_team_size ??
                    raw.teamSize ??
                    raw.team_size ??
                    defaults.botTeamSize
            ) || 3
        )
    );
    const rawPlayerTeamCharacterIds =
        Array.isArray(raw.playerTeamCharacterIds)
            ? raw.playerTeamCharacterIds
            : Array.isArray(raw.player_team_character_ids)
                ? raw.player_team_character_ids
                : Array.isArray(raw.requiredPlayerTeamCharacterIds)
                    ? raw.requiredPlayerTeamCharacterIds
                    : Array.isArray(defaults.playerTeamCharacterIds)
                        ? defaults.playerTeamCharacterIds
                        : [];
    const playerTeamCharacterIds = [];
    const rawMaxQueuedSkills =
        raw.botMaxQueuedSkillsPerTurn ??
        raw.bot_max_queued_skills_per_turn ??
        raw.maxQueuedSkillsPerTurn ??
        raw.max_queued_skills_per_turn ??
        defaults.botMaxQueuedSkillsPerTurn;
    const botMaxQueuedSkillsPerTurn = Math.max(1, Math.min(3, Number(rawMaxQueuedSkills) || 1));
    const requestedBackgroundImage =
        typeof raw.backgroundImage === 'string' && raw.backgroundImage.trim()
            ? raw.backgroundImage.trim()
            : typeof raw.background_image === 'string' && raw.background_image.trim()
                ? raw.background_image.trim()
                : defaults.backgroundImage;
    const backgroundImage = getPveMissionBackgroundForReward(
        normalizedRewardCharacterId,
        requestedBackgroundImage
    );
    return {
        enabled,
        buttonLabel:
            typeof raw.buttonLabel === 'string' && raw.buttonLabel.trim()
                ? raw.buttonLabel.trim()
                : typeof raw.button_label === 'string' && raw.button_label.trim()
                    ? raw.button_label.trim()
                    : defaults.buttonLabel,
        botName:
            typeof raw.botName === 'string' && raw.botName.trim()
                ? raw.botName.trim()
                : typeof raw.bot_name === 'string' && raw.bot_name.trim()
                    ? raw.bot_name.trim()
                    : defaults.botName,
        botTeamCharacterId,
        botTeamSize,
        botMaxQueuedSkillsPerTurn,
        backgroundImage,
        playerTeamCharacterIds,
    };
};

const slugifyMissionId = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const normalizeMissionCatalogEntry = (mission = {}, index = 0) => {
    const source = mission && typeof mission === 'object' ? mission : {};
    const missionTitle =
        typeof source.title === 'string' && source.title.trim()
            ? source.title.trim()
            : typeof source.name === 'string' && source.name.trim()
                ? source.name.trim()
                : `Mission ${index + 1}`;
    const missionId = slugifyMissionId(
        typeof source.missionId === 'string' && source.missionId.trim()
            ? source.missionId.trim()
            : missionTitle
    ) || `mission-${index + 1}`;
    const levelRequirement = Math.max(
        0,
        Number(
            source.level_requirement ??
                source.levelRequirement ??
                source.rank_requirement?.level ??
                source.rankRequirement?.level ??
                getLegacyLevelRequirement(source.rank)
        ) || 0
    );
    const rewardCharacterId = normalizeCharacterId(
        source.reward_character ??
            source.rewardCharacter ??
            source.rewardCharacterId ??
            source.reward_character_id
    );
    const rewardCharacterIds = Array.from(
        new Set(
            (Array.isArray(source.reward_character_ids)
                ? source.reward_character_ids
                : Array.isArray(source.rewardCharacterIds)
                    ? source.rewardCharacterIds
                    : [])
                .map((entry) => normalizeCharacterId(entry))
                .filter(Boolean)
        )
    );
    const specialPve = normalizeMissionSpecialPve(source, rewardCharacterId);
    const isXenomorphMission = rewardCharacterId === 'xenomorph-drone';
    const finalMissionId = isXenomorphMission ? 'raid-on-the-xenomorph-hive' : missionId;
    const finalMissionTitle = isXenomorphMission ? 'Raid on the Xenomorph Hive' : missionTitle;
    const winStreakCharacterId = normalizeCharacterId(
        source.win_streak?.character_id ??
            source.winStreak?.characterId ??
            source.win_streak_character_id ??
            source.winStreakCharacterId
    );
    const winStreakWins = Math.max(
        0,
        Number(
            source.win_streak?.wins ??
                source.winStreak?.wins ??
                source.win_streak_wins ??
                source.winStreakWins ??
                (winStreakCharacterId ? 1 : 0)
        ) || 0
    );
    const modeRestriction = normalizeMissionModeRestriction(
        source.mode_restriction || source.modeRestriction || {}
    );
    const requirementNotes = normalizeMissionTextList(
        source.requirements || source.requirementNotes || source.notes
    );
    const goals = normalizeMissionGoalList(source.goals || source.objectives);
    const finalGoals = isXenomorphMission
        ? XENOMORPH_HIVE_MISSION_GOALS.map((goal) => ({ ...goal }))
        : goals;
    const legacyGoalCharacterId = normalizeCharacterId(
        source.character_used ??
            source.characterUsed ??
            source.characterUsedId ??
            source.character_used_id
    );
    if (
        legacyGoalCharacterId &&
        !finalGoals.some(
            (goal) =>
                goal &&
                goal.type === 'win_streak' &&
                normalizeCharacterId(goal.character_id) === legacyGoalCharacterId
        )
    ) {
        finalGoals.push({
            type: 'win_streak',
            character_id: legacyGoalCharacterId,
            character_name: getCharacterDisplayNameById(legacyGoalCharacterId),
            wins: Math.max(1, winStreakWins),
        });
    }
    return {
        missionId: finalMissionId,
        title: finalMissionTitle,
        level_requirement:
            isXenomorphMission
                ? Math.max(21, levelRequirement)
                : levelRequirement,
        rank:
            isXenomorphMission
                ? String(Math.max(21, levelRequirement))
                : levelRequirement
                    ? String(levelRequirement)
                    : '',
        reward_character: rewardCharacterId,
        reward_character_name:
            typeof source.reward_character_name === 'string' && source.reward_character_name.trim()
                ? source.reward_character_name.trim()
                : typeof source.rewardCharacterName === 'string' && source.rewardCharacterName.trim()
                    ? source.rewardCharacterName.trim()
                    : getCharacterDisplayNameById(rewardCharacterId),
        reward_character_ids: rewardCharacterIds,
        starter_character_id: normalizeCharacterId(
            source.starter_character_id ?? source.starterCharacterId ?? ''
        ),
        prerequisite_mission_id: slugifyMissionId(
            source.prerequisite_mission_id ?? source.prerequisiteMissionId ?? ''
        ),
        reward_skin_id: normalizeSkinId(source.reward_skin_id ?? source.rewardSkinId ?? ''),
        reward: typeof source.reward === 'string' ? source.reward.trim() : '',
        unlock_point_cost: Math.max(
            0,
            Math.floor(Number(source.unlock_point_cost ?? source.unlockPointCost ?? 0) || 0)
        ),
        purchase_requires_rank: Boolean(
            source.purchase_requires_rank ?? source.purchaseRequiresRank
        ),
        reward_unlock_points: Math.max(
            0,
            Math.floor(Number(source.reward_unlock_points ?? source.rewardUnlockPoints ?? 0) || 0)
        ),
        mode_restriction: modeRestriction,
        win_streak: {
            character_id: winStreakCharacterId,
            character_name: getCharacterDisplayNameById(winStreakCharacterId),
            wins: winStreakWins,
        },
        image:
            isXenomorphMission
                ? 'assets/images/xenomission.jpg'
                : typeof source.image === 'string'
                    ? source.image.trim()
                    : '',
        imageAlt:
            typeof source.imageAlt === 'string' && source.imageAlt.trim()
                ? source.imageAlt.trim()
                : `${finalMissionTitle} mission artwork`,
        characterName: typeof source.characterName === 'string' ? source.characterName.trim() : '',
        portrait: typeof source.portrait === 'string' ? source.portrait.trim() : '',
        portraitAlt:
            typeof source.portraitAlt === 'string' && source.portraitAlt.trim()
                ? source.portraitAlt.trim()
                : `${finalMissionTitle} portrait`,
        requirements: requirementNotes,
        goals: finalGoals,
        arena: normalizeArenaMode(source.arena || source.arenaMode || source.rewardArena || source.reward_arena),
        special_pve: specialPve,
        sortOrder: Number.isFinite(Number(source.sortOrder)) ? Number(source.sortOrder) : index + 1,
    };
};

const normalizeMissionCatalog = (missions = []) => {
    const seen = new Set();
    return (Array.isArray(missions) ? missions : [])
        .map((mission, index) => normalizeMissionCatalogEntry(mission, index))
        .filter((mission) => mission.missionId && mission.title)
        .map((mission) => {
            let nextMissionId = mission.missionId;
            let duplicateIndex = 2;
            while (seen.has(nextMissionId)) {
                nextMissionId = `${mission.missionId}-${duplicateIndex}`;
                duplicateIndex += 1;
            }
            seen.add(nextMissionId);
            return {
                ...mission,
                missionId: nextMissionId,
            };
        })
        .sort((a, b) => {
            const sortDelta = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
            if (sortDelta !== 0) {
                return sortDelta;
            }
            return String(a.title).localeCompare(String(b.title));
        });
};

const cloneMissionCatalog = (missions = []) =>
    normalizeMissionCatalog(
        (Array.isArray(missions) ? missions : []).map((mission) => ({
            ...mission,
            mode_restriction: mission?.mode_restriction
                ? {
                      allowed_modes: Array.isArray(mission.mode_restriction.allowed_modes)
                          ? mission.mode_restriction.allowed_modes.slice()
                          : [],
                  }
                : undefined,
            win_streak: mission?.win_streak
                ? {
                      character_id:
                          typeof mission.win_streak.character_id === 'string'
                              ? mission.win_streak.character_id
                              : '',
                      wins: Number(mission.win_streak.wins) || 0,
                  }
                : undefined,
            requirements: Array.isArray(mission?.requirements) ? mission.requirements.slice() : [],
            goals: Array.isArray(mission?.goals) ? mission.goals.slice() : [],
            reward_character_ids: Array.isArray(mission?.reward_character_ids)
                ? mission.reward_character_ids.slice()
                : Array.isArray(mission?.rewardCharacterIds)
                    ? mission.rewardCharacterIds.slice()
                    : [],
            arena: typeof mission?.arena === 'string' ? mission.arena : '',
            special_pve: mission?.special_pve
                ? {
                      ...mission.special_pve,
                  }
                : mission?.specialPve
                    ? {
                          ...mission.specialPve,
                      }
                    : undefined,
        }))
    );

const XENOMORPH_DRONE_MISSION_ENTRY = {
    missionId: 'raid-on-the-xenomorph-hive',
    title: 'Raid on the Xenomorph Hive',
    level_requirement: 21,
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    reward_character: 'xenomorph-drone',
    reward_character_name: 'Xenomorph Drone',
    reward: 'Unlock Xenomorph Drone.',
    image: 'assets/images/xenomission.jpg',
    imageAlt: 'Raid on the Xenomorph Hive mission artwork',
    characterName: 'Xenomorph Drone',
    portrait: 'assets/images/xenomission.jpg',
    portraitAlt: 'Xenomorph Drone portrait',
    requirements: [],
    goals: XENOMORPH_HIVE_MISSION_GOALS,
    special_pve: XENOMORPH_DRONE_SPECIAL_PVE,
    sortOrder: 999,
};

const POKEMON_SCYTHER_MISSION_ENTRY = {
    missionId: 'scyther-trial',
    title: 'The Scyther Trial',
    level_requirement: 6,
    rank: '6',
    reward_character: 'scyther',
    reward_character_name: 'Scyther',
    reward: 'Unlock Scyther.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/scyther/scythermissionpic.jpeg',
    imageAlt: 'Scyther mission artwork',
    characterName: 'Scyther',
    portrait: 'assets/images/PokemonArena/scyther/scytherfp.webp',
    portraitAlt: 'Scyther portrait',
    requirements: [
        'This trial is still a milestone, but it is a much lighter climb than the original version.',
        'Clear a 3-win streak with Zubat and Gastly on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'chansey',
            character_name: 'Chansey',
            wins: 4,
        },
        {
            type: 'win_matches',
            character_id: 'pidgey',
            character_name: 'Pidgey',
            wins: 4,
        },
        {
            type: 'win_matches',
            character_id: 'koffing',
            character_name: 'Koffing',
            wins: 4,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['zubat', 'gastly'],
            character_names: ['Zubat', 'Gastly'],
            wins: 3,
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
    sortOrder: 5,
};

const POKEMON_GASTLY_MISSION_ENTRY = {
    missionId: 'gastly-haunted-tower',
    title: 'The Haunted Tower',
    level_requirement: 6,
    rank: '6',
    reward_character: 'gastly',
    reward_character_name: 'Gastly',
    reward: 'Unlock Gastly.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/gastley/gastleymissionpic.jpeg',
    imageAlt: 'Gastly mission artwork',
    characterName: 'Gastly',
    portrait: 'assets/images/PokemonArena/gastley/gastleyfp.webp',
    portraitAlt: 'Gastly portrait',
    requirements: [
        'A grindy early Pokemon mission that asks for patience before it pays out.',
        'Clear a 4-win streak with Zubat and Abra on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'chansey',
            character_name: 'Chansey',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'koffing',
            character_name: 'Koffing',
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['zubat', 'abra'],
            character_names: ['Zubat', 'Abra'],
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
    sortOrder: 6,
};

const POKEMON_KRABBY_MISSION_ENTRY = {
    missionId: 'krabby-tide-trial',
    title: 'Krabby Tide Trial',
    level_requirement: 7,
    rank: '7',
    reward_character: 'krabby',
    reward_character_name: 'Krabby',
    reward: 'Unlock Krabby.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/krabby.webp',
    imageAlt: 'Krabby mission artwork',
    characterName: 'Krabby',
    portrait: 'assets/images/PokemonArena/Krabby/krabbyfp.png',
    portraitAlt: 'Krabby portrait',
    requirements: [
        'Krabby unlocks through a mid-ladder bruiser mission built around defense and physical pressure.',
        'Clear a 4-win streak with Squirtle and Scyther on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'squirtle',
            character_name: 'Squirtle',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'scyther',
            character_name: 'Scyther',
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'scyther'],
            character_names: ['Squirtle', 'Scyther'],
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
    sortOrder: 7,
};

const POKEMON_EEVEE_EVOLUTION_MISSION_ENTRY = {
    missionId: 'eevee-evolution-path',
    title: 'Eevee Evolution Path',
    level_requirement: 1,
    rank: '1',
    reward_character: '',
    reward_character_name: 'Eevee Evolution Choice',
    reward_character_ids: ['jolteon', 'flareon', 'vaporeon'],
    reward: 'Choose Jolteon, Flareon, or Vaporeon. Eevee is permanently removed after the choice.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/eevee/eevee/1782352147199.png',
    imageAlt: 'Eevee evolution mission artwork',
    characterName: 'Eevee',
    portrait: 'assets/images/PokemonArena/eevee/eevee/eeveefp.png',
    portraitAlt: 'Eevee portrait',
    requirements: [
        'Win 25 matches with Eevee on your team.',
        'After this mission is complete, choose one evolution. This decision is permanent.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'eevee',
            character_name: 'Eevee',
            wins: 25,
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
    sortOrder: 4,
};

const POKEMON_EKANS_MISSION_ENTRY = {
    missionId: 'ekans-venom-trial',
    title: 'Ekans Venom Trial',
    level_requirement: 8,
    rank: '8',
    reward_character: 'ekans',
    reward_character_name: 'Ekans',
    reward: 'Unlock Ekans.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/ekans.jpeg',
    imageAlt: 'Ekans mission artwork',
    characterName: 'Ekans',
    portrait: 'assets/images/PokemonArena/ekans/ekansfp.png',
    portraitAlt: 'Ekans portrait',
    requirements: [
        'Ekans unlocks through a poison-pressure mission built around attrition and setup.',
        'Clear a 4-win streak with Koffing and Zubat on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'koffing',
            character_name: 'Koffing',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'zubat',
            character_name: 'Zubat',
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['koffing', 'zubat'],
            character_names: ['Koffing', 'Zubat'],
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
    sortOrder: 8,
};

const POKEMON_MACHOP_MISSION_ENTRY = {
    missionId: 'machop-power-run',
    title: 'Machop Power Run',
    level_requirement: 8,
    rank: '8',
    reward_character: 'machop',
    reward_character_name: 'Machop',
    reward: 'Unlock Machop.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/machop.jpeg',
    imageAlt: 'Machop mission artwork',
    characterName: 'Machop',
    portrait: 'assets/images/PokemonArena/machop/machopfp.png',
    portraitAlt: 'Machop portrait',
    requirements: [
        'Machop unlocks through a bruiser mission centered on direct physical pressure.',
        'Clear a 4-win streak with Charmander and Scyther on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'charmander',
            character_name: 'Charmander',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'scyther',
            character_name: 'Scyther',
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['charmander', 'scyther'],
            character_names: ['Charmander', 'Scyther'],
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
    sortOrder: 9,
};

const POKEMON_MAGIKARP_MISSION_ENTRY = {
    missionId: 'magikarp-long-climb',
    title: 'Magikarp Long Climb',
    level_requirement: 9,
    rank: '9',
    reward_character: 'magikarp',
    reward_character_name: 'Magikarp',
    reward: 'Unlock Magikarp.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/magikarp.webp',
    imageAlt: 'Magikarp mission artwork',
    characterName: 'Magikarp',
    portrait: 'assets/images/PokemonArena/magikarp/magikarpfp.png',
    portraitAlt: 'Magikarp portrait',
    requirements: [
        'Magikarp unlocks through a patience test built around water-team endurance.',
        'Clear a 4-win streak with Squirtle and Krabby on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'squirtle',
            character_name: 'Squirtle',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'krabby',
            character_name: 'Krabby',
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'krabby'],
            character_names: ['Squirtle', 'Krabby'],
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
    sortOrder: 10,
};

const POKEMON_MR_MIME_MISSION_ENTRY = {
    missionId: 'mr-mime-stage-trial',
    title: 'Mr. Mime Stage Trial',
    level_requirement: 10,
    rank: '10',
    reward_character: 'mr-mime',
    reward_character_name: 'Mr. Mime',
    reward: 'Unlock Mr. Mime.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/mr.mime.avif',
    imageAlt: 'Mr. Mime mission artwork',
    characterName: 'Mr. Mime',
    portrait: 'assets/images/PokemonArena/Mr.mime/fp.jpg',
    portraitAlt: 'Mr. Mime portrait',
    requirements: [
        'Mr. Mime unlocks through a control-and-support trial built around clean team play.',
        'Clear a 4-win streak with Abra and Chansey on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'abra',
            character_name: 'Abra',
            wins: 8,
        },
        {
            type: 'win_matches',
            character_id: 'chansey',
            character_name: 'Chansey',
            wins: 8,
        },
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

const POKEMON_HITMONCHAN_MISSION_ENTRY = {
    missionId: 'hitmonchan-power-grid',
    title: 'Hitmonchan Power Grid',
    level_requirement: 11,
    rank: '11',
    reward_character: 'hitmonchan',
    reward_character_name: 'Hitmonchan',
    reward: 'Unlock Hitmonchan.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/hitmonchan.jpeg',
    imageAlt: 'Hitmonchan mission artwork',
    characterName: 'Hitmonchan',
    portrait: 'assets/images/PokemonArena/hitmonchan/fp.webp',
    portraitAlt: 'Hitmonchan portrait',
    requirements: [
        'Hitmonchan unlocks through a tempo-and-combo mission built around pressure and precision.',
        'Clear a 4-win streak with Machop and Pikachu on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'machop',
            character_name: 'Machop',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'pikachu',
            character_name: 'Pikachu',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['machop', 'pikachu'],
            character_names: ['Machop', 'Pikachu'],
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
    sortOrder: 12,
};

const POKEMON_HITMONLEE_MISSION_ENTRY = {
    missionId: 'hitmonlee-kick-circuit',
    title: 'Hitmonlee Kick Circuit',
    level_requirement: 12,
    rank: '12',
    reward_character: 'hitmonlee',
    reward_character_name: 'Hitmonlee',
    reward: 'Unlock Hitmonlee.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/hitmonlee.jpeg',
    imageAlt: 'Hitmonlee mission artwork',
    characterName: 'Hitmonlee',
    portrait: 'assets/images/PokemonArena/hitmonlee/fp.webp',
    portraitAlt: 'Hitmonlee portrait',
    requirements: [
        'Hitmonlee unlocks through a pressure mission built around physical momentum and clean finishers.',
        'Clear a 4-win streak with Machop and Scyther on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'machop',
            character_name: 'Machop',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'scyther',
            character_name: 'Scyther',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['machop', 'scyther'],
            character_names: ['Machop', 'Scyther'],
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
    sortOrder: 13,
};

const POKEMON_MAGNEMITE_MISSION_ENTRY = {
    missionId: 'magnemite-magnet-rise',
    title: 'Magnemite Magnet Rise',
    level_requirement: 12,
    rank: '12',
    reward_character: 'magnemite',
    reward_character_name: 'Magnemite',
    reward: 'Unlock Magnemite.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/magnemite.jpg',
    imageAlt: 'Magnemite mission artwork',
    characterName: 'Magnemite',
    portrait: 'assets/images/PokemonArena/mangemite/magnemitefp.webp',
    portraitAlt: 'Magnemite portrait',
    requirements: [
        'Magnemite unlocks through a control mission built around electric pressure and clean setup.',
        'Clear a 4-win streak with Pikachu and Abra on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'pikachu',
            character_name: 'Pikachu',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'abra',
            character_name: 'Abra',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['pikachu', 'abra'],
            character_names: ['Pikachu', 'Abra'],
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
    sortOrder: 14,
};

const POKEMON_AERODACTYL_MISSION_ENTRY = {
    missionId: 'aerodactyl-fossil-flight',
    title: 'Aerodactyl Fossil Flight',
    level_requirement: 13,
    rank: '13',
    reward_character: 'aerodactyl',
    reward_character_name: 'Aerodactyl',
    reward: 'Unlock Aerodactyl.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/aerodactyl.avif',
    imageAlt: 'Aerodactyl mission artwork',
    characterName: 'Aerodactyl',
    portrait: 'assets/images/PokemonArena/aerodactyl/fp.webp',
    portraitAlt: 'Aerodactyl portrait',
    requirements: [
        'Aerodactyl unlocks through a high-speed fossil trial built around recoil and fast finishes.',
        'Clear a 4-win streak with Scyther and Hitmonlee on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'scyther',
            character_name: 'Scyther',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'hitmonlee',
            character_name: 'Hitmonlee',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['scyther', 'hitmonlee'],
            character_names: ['Scyther', 'Hitmonlee'],
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
    sortOrder: 15,
};

const POKEMON_ONIX_MISSION_ENTRY = {
    missionId: 'onix-stonewall-trial',
    title: 'Onix Stonewall Trial',
    level_requirement: 13,
    rank: '13',
    reward_character: 'onix',
    reward_character_name: 'Onix',
    reward: 'Unlock Onix.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/onix.jpeg',
    imageAlt: 'Onix mission artwork',
    characterName: 'Onix',
    portrait: 'assets/images/PokemonArena/onix/fp.webp',
    portraitAlt: 'Onix portrait',
    requirements: [
        'Onix unlocks through a tank-focused trial built around bulk, tempo, and clean frontline play.',
        'Clear a 4-win streak with Squirtle and Machop on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'squirtle',
            character_name: 'Squirtle',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'machop',
            character_name: 'Machop',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'machop'],
            character_names: ['Squirtle', 'Machop'],
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
    sortOrder: 16,
};

const POKEMON_AEGISLASH_MISSION_ENTRY = {
    missionId: 'aegislash-kings-shield-trial',
    title: "Aegislash King's Shield Trial",
    level_requirement: 13,
    rank: '13',
    reward_character: 'aegislash',
    reward_character_name: 'Aegislash',
    reward: 'Unlock Aegislash.',
    unlock_point_cost: 300,
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/aegislash.webp',
    imageAlt: "Aegislash King's Shield mission artwork",
    characterName: 'Aegislash',
    portrait: 'assets/images/PokemonArena/aegislash/OfficialPictures/Facepicturewithpassiveactive.jpg',
    portraitAlt: 'Aegislash Shield Stance portrait',
    requirements: [
        'Prove your command of Ghost and Steel tactics with Gastly and Magnemite.',
        'Win 8 Quick or Ladder matches with Gastly and Magnemite on the same team.',
        'Win 4 Quick or Ladder matches in a row with Gastly and Magnemite on the same team.',
        'Bot and human opponents both count.',
    ],
    goals: [
        {
            type: 'win_matches_same_team',
            character_ids: ['gastly', 'magnemite'],
            character_names: ['Gastly', 'Magnemite'],
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['gastly', 'magnemite'],
            character_names: ['Gastly', 'Magnemite'],
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
    sortOrder: 230,
};

const POKEMON_DITTO_MISSION_ENTRY = {
    missionId: 'ditto-perfect-copy-trial',
    title: 'Ditto Perfect Copy Trial',
    level_requirement: 13,
    rank: '13',
    reward_character: 'ditto',
    reward_character_name: 'Ditto',
    reward: 'Unlock Ditto.',
    unlock_point_cost: 300,
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/ditto.avif',
    imageAlt: 'Ditto Perfect Copy mission artwork',
    characterName: 'Ditto',
    portrait: 'assets/images/PokemonArena/Ditto/Done/FP.jpg',
    portraitAlt: 'Ditto portrait',
    requirements: [
        'Master adaptability with Eevee and Pokemon Trainer.',
        'Win 8 Quick or Ladder matches with Eevee and Pokemon Trainer on the same team.',
        'Win 4 Quick or Ladder matches in a row with Eevee and Pokemon Trainer on the same team.',
        'Bot and human opponents both count.',
    ],
    goals: [
        {
            type: 'win_matches_same_team',
            character_ids: ['eevee', 'pokemon-trainer'],
            character_names: ['Eevee', 'Pokemon Trainer'],
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['eevee', 'pokemon-trainer'],
            character_names: ['Eevee', 'Pokemon Trainer'],
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
    sortOrder: 231,
};

const POKEMON_SCRAGGY_MISSION_ENTRY = {
    missionId: 'scraggy-focus-energy-trial',
    title: 'Scraggy Focus Energy Trial',
    level_requirement: 13,
    rank: '13',
    reward_character: 'scraggy',
    reward_character_name: 'Scraggy',
    reward: 'Unlock Scraggy.',
    unlock_point_cost: 300,
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/scraggy.jpg',
    imageAlt: 'Scraggy Focus Energy mission artwork',
    characterName: 'Scraggy',
    portrait: 'assets/images/PokemonArena/Scraggy/fp.png',
    portraitAlt: 'Scraggy portrait',
    requirements: [
        'Train precision and poison pressure with Hitmonlee and Koffing.',
        'Win 8 Quick or Ladder matches with Hitmonlee and Koffing on the same team.',
        'Win 4 Quick or Ladder matches in a row with Hitmonlee and Koffing on the same team.',
        'Bot and human opponents both count.',
    ],
    goals: [
        {
            type: 'win_matches_same_team',
            character_ids: ['hitmonlee', 'koffing'],
            character_names: ['Hitmonlee', 'Koffing'],
            wins: 8,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['hitmonlee', 'koffing'],
            character_names: ['Hitmonlee', 'Koffing'],
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
    sortOrder: 232,
};

const POKEMON_STARTER_MISSION_ENTRIES = [
    {
        missionId: 'pikachu-starter-path',
        title: 'Pikachu Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'pikachu',
        reward_character_name: 'Pikachu',
        reward: 'Unlock Pikachu.',
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/PokemonArena/missionpics/pikachu.jpeg',
        imageAlt: 'Pikachu starter mission artwork',
        characterName: 'Pikachu',
        portrait: 'assets/images/PokemonArena/Pikachu/pikachufp.jpeg',
        portraitAlt: 'Pikachu portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'pidgey', character_name: 'Pidgey', wins: 10 },
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
        sortOrder: 3,
    },
];

const POKEMON_GEN2_STARTER_MISSION_ENTRY = {
    missionId: 'gen2-starter-choice',
    title: 'Choose a Johto Starter',
    level_requirement: 1,
    rank: '1',
    reward_character: '',
    reward_character_name: 'Johto Starters',
    reward_character_ids: ['cyndaquil', 'chikorita', 'totodile'],
    reward: 'Choose one Johto starter for free. The other two remain available for 500 unlock points each.',
    unlock_point_cost: POKEMON_GEN2_STARTER_UNLOCK_POINT_COST,
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    image: 'assets/images/PokemonArena/chooseyourstarter/Gen2 starters/3ballselection.png',
    imageAlt: 'Cyndaquil, Totodile, and Chikorita starter balls in the Pokemon Arena case',
    characterName: 'Johto Starters',
    portrait: 'assets/images/PokemonArena/BIB/cyndaquil.png',
    portraitAlt: 'Johto starter selection',
    requirements: ['Choose one Johto starter from the homepage.'],
    goals: [],
    special_pve: { enabled: false },
    sortOrder: 4,
};

const POKEMON_GEN2_EVOLUTION_MISSION_ENTRIES = [
    {
        starterId: 'cyndaquil',
        starterName: 'Cyndaquil',
        secondName: 'Quilava',
        finalName: 'Typhlosion',
        secondSkinId: 'cyndaquil-quilava-evolution',
        finalSkinId: 'cyndaquil-typhlosion-evolution',
        secondImage: 'assets/images/PokemonArena/Cyndaquil/quilavafp.png',
        finalImage: 'assets/images/PokemonArena/Cyndaquil/typlosionfp.png',
    },
    {
        starterId: 'chikorita',
        starterName: 'Chikorita',
        secondName: 'Bayleaf',
        finalName: 'Meganium',
        secondSkinId: 'chikorita-bayleaf-evolution',
        finalSkinId: 'chikorita-meganium-evolution',
        secondImage: 'assets/images/PokemonArena/Cyndaquil/Chikorita/bayleaffp.png',
        finalImage: 'assets/images/PokemonArena/Cyndaquil/Chikorita/meganiumfp.png',
    },
    {
        starterId: 'totodile',
        starterName: 'Totodile',
        secondName: 'Croconaw',
        finalName: 'Feraligatr',
        secondSkinId: 'totodile-croconaw-evolution',
        finalSkinId: 'totodile-feraligatr-evolution',
        secondImage: 'assets/images/PokemonArena/Cyndaquil/Totodile/croconawfp.png',
        finalImage: 'assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrfp.png',
    },
].flatMap((entry, starterIndex) => {
    const secondMissionId = `${entry.starterId}-evolve-${normalizeCharacterId(entry.secondName)}`;
    return [
        {
            missionId: secondMissionId,
            title: `Evolve ${entry.starterName} into ${entry.secondName}`,
            level_requirement: 1,
            rank: '1',
            starter_character_id: entry.starterId,
            reward_skin_id: entry.secondSkinId,
            reward: `${entry.starterName} permanently becomes ${entry.secondName}.`,
            arena: 'pokemon',
            mode_restriction: { allowed_modes: ['ladder'] },
            image: entry.secondImage,
            imageAlt: `${entry.secondName} evolution artwork`,
            characterName: entry.secondName,
            portrait: entry.secondImage,
            portraitAlt: `${entry.secondName} portrait`,
            requirements: [`Choose ${entry.starterName} as your Johto starter.`, `Win 16 ranked matches with ${entry.starterName} on your team.`],
            goals: [{ type: 'win_ladder_matches', character_id: entry.starterId, character_name: entry.starterName, wins: 16 }],
            special_pve: { enabled: false },
            sortOrder: 5 + starterIndex * 2,
        },
        {
            missionId: `${entry.starterId}-evolve-${normalizeCharacterId(entry.finalName)}`,
            title: `Evolve ${entry.secondName} into ${entry.finalName}`,
            level_requirement: 1,
            rank: '1',
            starter_character_id: entry.starterId,
            prerequisite_mission_id: secondMissionId,
            reward_skin_id: entry.finalSkinId,
            reward: `${entry.secondName} permanently becomes ${entry.finalName}.`,
            arena: 'pokemon',
            mode_restriction: { allowed_modes: ['ladder'] },
            image: entry.finalImage,
            imageAlt: `${entry.finalName} evolution artwork`,
            characterName: entry.finalName,
            portrait: entry.finalImage,
            portraitAlt: `${entry.finalName} portrait`,
            requirements: [`First evolve ${entry.starterName} into ${entry.secondName}.`, `Then win 36 additional ranked matches with ${entry.secondName} on your team.`],
            goals: [{ type: 'win_ladder_matches', character_id: entry.starterId, character_name: entry.secondName, wins: 36 }],
            special_pve: { enabled: false },
            sortOrder: 6 + starterIndex * 2,
        },
    ];
});

const shouldNormalizeComicMissionDifficulty = (mission = {}) => {
    const normalizedArena = normalizeArenaMode(mission?.arena || '');
    if (normalizedArena === 'pokemon') {
        return false;
    }
    if (Boolean(mission?.special_pve?.enabled)) {
        return false;
    }
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    return !goals.some((goal) => String(goal?.type || '').trim().toLowerCase() === 'reach_rank');
};

const OPEN_TEAM_PVE_MISSION_GOAL_TEXT_BY_ID = {
    walker: 'Defeat the Walker Herd at Greene Farm to unlock Walker.',
    'rage-infected-mission': 'Defeat the Rage Outbreak to unlock Rage Infected.',
    predatorstalker: 'Defeat the Predator Hunting Party to unlock Predator Stalker.',
    'raid-on-the-xenomorph-hive': 'Beat the Xenomorph Nest to unlock Xenomorph Drone.',
};

const normalizeOpenTeamPveMission = (mission = {}) => {
    if (!Boolean(mission?.special_pve?.enabled)) {
        return mission;
    }
    const missionId = String(mission?.missionId || '').trim();
    const goalText = OPEN_TEAM_PVE_MISSION_GOAL_TEXT_BY_ID[missionId];
    return {
        ...mission,
        goals: goalText
            ? [
                  {
                      type: 'text',
                      text: goalText,
                  },
              ]
            : Array.isArray(mission?.goals)
            ? mission.goals
            : [],
        special_pve: {
            ...(mission?.special_pve || {}),
            playerTeamCharacterIds: [],
        },
    };
};

const COMIC_MISSION_REQUIRED_PAIR_OVERRIDES = {
    venom: [
        { characterId: 'spider-man', characterName: 'Spider-Man' },
        { characterId: 'batman', characterName: 'Batman' },
    ],
    omniman: [
        { characterId: 'invincible', characterName: 'Invincible' },
        { characterId: 'atom-eve', characterName: 'Atom Eve' },
    ],
    'sorrow-mission': [
        { characterId: 'atrocitus', characterName: 'Atrocitus' },
        { characterId: 'sinestro', characterName: 'Sinestro' },
    ],
    'sinestro-mission': [
        { characterId: 'green-lantern-hal-jordan', characterName: 'Green Lantern (Hal Jordan)' },
        { characterId: 'indigo-1', characterName: 'Indigo-1' },
    ],
    'boba-fett': [
        { characterId: 'ghost-rider', characterName: 'Ghost Rider' },
        { characterId: 'captain-america', characterName: 'Captain America' },
    ],
    'obi-wan-kenobi': [
        { characterId: 'wonder-woman', characterName: 'Wonder Woman' },
        { characterId: 'ghost-rider', characterName: 'Ghost Rider' },
    ],
};

const collectComicMissionCharacterReferences = (mission = {}) => {
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    const references = [];
    const seen = new Set();
    const addReference = (characterId, characterName) => {
        const normalizedCharacterId = normalizeCharacterId(characterId);
        if (!normalizedCharacterId || seen.has(normalizedCharacterId)) {
            return;
        }
        seen.add(normalizedCharacterId);
        references.push({
            characterId: normalizedCharacterId,
            characterName:
                String(characterName || '').trim() || getCharacterDisplayNameById(normalizedCharacterId),
        });
    };

    goals.forEach((goal) => {
        const goalType = String(goal?.type || '').trim().toLowerCase();
        if (goalType === 'win_matches' || goalType === 'win_streak') {
            addReference(goal?.character_id ?? goal?.characterId, goal?.character_name ?? goal?.characterName);
            return;
        }
        if (goalType === 'win_matches_same_team' || goalType === 'win_streak_same_team') {
            const ids = Array.isArray(goal?.character_ids) ? goal.character_ids : [];
            const names = Array.isArray(goal?.character_names) ? goal.character_names : [];
            ids.forEach((characterId, index) => {
                addReference(characterId, names[index]);
            });
        }
    });

    return references;
};

const getComicMissionRequiredPair = (mission = {}) => {
    const missionId = String(mission?.missionId || '').trim();
    const overridePair = COMIC_MISSION_REQUIRED_PAIR_OVERRIDES[missionId];
    if (Array.isArray(overridePair) && overridePair.length >= 2) {
        return overridePair.slice(0, 2).map((entry) => ({
            characterId: normalizeCharacterId(entry?.characterId),
            characterName:
                String(entry?.characterName || '').trim() ||
                getCharacterDisplayNameById(normalizeCharacterId(entry?.characterId)),
        }));
    }
    return collectComicMissionCharacterReferences(mission).slice(0, 2);
};

const normalizeComicMissionDifficulty = (mission = {}) => {
    if (!shouldNormalizeComicMissionDifficulty(mission)) {
        return mission;
    }
    const requiredPair = getComicMissionRequiredPair(mission);
    if (requiredPair.length < 2) {
        return mission;
    }
    const first = requiredPair[0];
    const second = requiredPair[1];
    const missionLevel = Math.max(
        0,
        Number(mission?.level_requirement ?? mission?.levelRequirement ?? mission?.rank ?? 0) || 0
    );
    const earlyMatchWins = missionLevel > 0 && missionLevel <= 3 ? 5 : 10;
    const earlySameTeamStreak = missionLevel > 0 && missionLevel <= 3 ? 2 : 4;
    return {
        ...mission,
        goals: [
            {
                type: 'win_matches',
                character_id: first.characterId,
                character_name: first.characterName,
                wins: earlyMatchWins,
            },
            {
                type: 'win_matches',
                character_id: second.characterId,
                character_name: second.characterName,
                wins: earlyMatchWins,
            },
            {
                type: 'win_streak_same_team',
                character_ids: [first.characterId, second.characterId],
                character_names: [first.characterName, second.characterName],
                wins: earlySameTeamStreak,
            },
        ],
    };
};

const POKEMON_LADDER_MILESTONE_MISSION_ENTRY = {
    missionId: 'pokemon-ladder-first-25-wins',
    title: 'Road to Champion: 25 Ladder Wins',
    level_requirement: 1,
    rank: '1',
    reward_character: '',
    reward_character_name: '',
    reward: 'Earn 1,000 Pokemon Arena points.',
    reward_unlock_points: 1000,
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['ladder'] },
    image: 'assets/images/PokemonArena/found-pokeball.png',
    imageAlt: 'Pokemon Arena 25 Ladder wins reward',
    characterName: 'Pokemon Arena Champion',
    portrait: 'assets/images/PokemonArena/found-pokeball.png',
    portraitAlt: 'Pokemon Arena points reward',
    requirements: [
        'Win 25 Ladder matches in Pokemon Arena.',
        'Human and battle-bot Ladder wins both count. Quick, Private, and mission battles do not.',
        'Spend points on character unlocks, skins, and additional Eevee evolutions.',
    ],
    goals: [{ type: 'win_ladder_matches', wins: 25 }],
    special_pve: { enabled: false },
    sortOrder: 1,
};

const POKEMON_WAVE_2_MISSION_CONFIGS = [
    ['clefairy','Clefairy','Moon Stone Melody','clefairy.jpg',['chansey','mr-mime'],5,3],
    ['jigglypuff','Jigglypuff','The Encore That Never Ends','jigglypuff.jpg',['gastly','clefairy'],5,4],
    ['beedrill','Beedrill','Trial of the Hive','beedrill.jpg',['butterfree','scyther'],6,5],
    ['articuno','Articuno','Frozen Legendary Trial','articuno.jpg',['squirtle','vaporeon'],7,20],
    ['moltres','Moltres','Blazing Legendary Trial','moltres.webp',['charmander','flareon'],7,21],
    ['zapdos','Zapdos','Storm Legendary Trial','zapdos.jpg',['pikachu','jolteon'],7,22],
    ['mew','Mew','A Mythical Discovery','mew.jpg',['clefairy','jigglypuff'],8,23],
    ['mewtwo','Mewtwo','Genetic Power Unbound','mewtwo.avif',['mew','dragonite'],9,25],
    ['dragonite','Dragonite','Dragon Mastery','dragonite.webp',['aerodactyl','gyarados'],8,18],
];
const POKEMON_WAVE_2_LEGENDARY_MISSION_IDS = new Set(['articuno','moltres','zapdos','mew','mewtwo']);
const getPokemonWave2SameTeamStreakWins = (missionRank) => {
    const rank = Math.max(0, Number(missionRank) || 0);
    if (rank <= 6) return 3;
    if (rank <= 12) return 4;
    if (rank <= 17) return 5;
    return 6;
};

const POKEMON_WAVE_2_MISSION_ENTRIES = POKEMON_WAVE_2_MISSION_CONFIGS.map(
    ([characterId, characterName, title, imageFile, team, wins, missionRank], index) => {
        const isLegendaryMission = POKEMON_WAVE_2_LEGENDARY_MISSION_IDS.has(characterId);
        const sameTeamStreakWins = getPokemonWave2SameTeamStreakWins(missionRank);
        const teamNames = team.map((id) => id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '));
        return {
        missionId: `pokemon-wave-2-${characterId}`,
        title,
        level_requirement: missionRank,
        rank: String(missionRank),
        reward_character: characterId,
        reward_character_name: characterName,
        reward: `Unlock ${characterName}.`,
        unlock_point_cost: isLegendaryMission ? 600 : getMissionUnlockPointCostForRank(missionRank),
        ...(isLegendaryMission ? { purchase_requires_rank: true } : {}),
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        image: `assets/images/PokemonArena/missionpics/${imageFile}`,
        imageAlt: `${characterName} mission artwork`,
        characterName,
        portrait: `assets/images/PokemonArena/missionpics/${imageFile}`,
        portraitAlt: `${characterName} mission portrait`,
        requirements: [
            `Win ${wins} Quick or Ladder matches with ${team[0]} and ${team[1]} on the same team.`,
            `Win ${sameTeamStreakWins} Quick or Ladder matches in a row with ${team[0]} and ${team[1]} on the same team.`,
            'Bot and human opponents both count.',
        ],
        goals: [
            {
                type: 'win_matches_same_team',
                character_ids: team,
                character_names: teamNames,
                wins,
            },
            {
                type: 'win_streak_same_team',
                character_ids: team,
                character_names: teamNames,
                wins: sameTeamStreakWins,
            },
        ],
        special_pve: { enabled: false },
        sortOrder: 210 + index,
    };
    }
);

const ensureRequiredMissionCatalogEntries = (missions = []) => {
    const removedPokemonStarterMissionIds = new Set([
        'squirtle-starter-path',
        'charmander-starter-path',
        'bulbasaur-starter-path',
        'hitmons-magnemite-power-grid',
    ]);
    const catalog = cloneMissionCatalog(missions).filter(
        (mission) =>
            !removedPokemonStarterMissionIds.has(mission?.missionId)
    );
    const upsertRequiredMission = (entry, matcher) => {
        const normalizedEntry = normalizeMissionCatalogEntry(entry, catalog.length);
        const existingIndex = catalog.findIndex((mission) => matcher(mission));
        if (existingIndex === -1) {
            catalog.push(normalizedEntry);
            return;
        }
        catalog[existingIndex] = {
            ...normalizedEntry,
        };
    };

    upsertRequiredMission(XENOMORPH_DRONE_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'xenomorph-drone');

    const ghostRiderMission = DEFAULT_MISSION_CATALOG.find(
        (m) => normalizeCharacterId(m.reward_character) === 'ghost-rider'
    );
    if (ghostRiderMission) {
        upsertRequiredMission(ghostRiderMission, (mission) => normalizeCharacterId(mission?.reward_character) === 'ghost-rider');
    }
    const darthMaulMission = DEFAULT_MISSION_CATALOG.find(
        (m) => normalizeCharacterId(m.reward_character) === 'darth-maul'
    );
    if (darthMaulMission) {
        upsertRequiredMission(darthMaulMission, (mission) => normalizeCharacterId(mission?.reward_character) === 'darth-maul');
    }
    DEFAULT_MISSION_CATALOG
        .filter((entry) => normalizeArenaMode(entry?.arena) === 'comic')
        .forEach((entry) => {
            const rewardCharacterId = normalizeCharacterId(entry?.reward_character);
            upsertRequiredMission(entry, (mission) => {
                if (rewardCharacterId) {
                    return normalizeCharacterId(mission?.reward_character) === rewardCharacterId;
                }
                return mission?.missionId === entry?.missionId;
            });
        });

    POKEMON_STARTER_MISSION_ENTRIES.forEach((entry) => {
        upsertRequiredMission(entry, (mission) => normalizeCharacterId(mission?.reward_character) === normalizeCharacterId(entry.reward_character));
    });
    upsertRequiredMission(
        POKEMON_GEN2_STARTER_MISSION_ENTRY,
        (mission) => mission?.missionId === POKEMON_GEN2_STARTER_MISSION_ENTRY.missionId
    );
    POKEMON_GEN2_EVOLUTION_MISSION_ENTRIES.forEach((entry) => {
        upsertRequiredMission(entry, (mission) => mission?.missionId === entry.missionId);
    });
    upsertRequiredMission(POKEMON_EEVEE_EVOLUTION_MISSION_ENTRY, (mission) => mission?.missionId === 'eevee-evolution-path');
    upsertRequiredMission(POKEMON_SCYTHER_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'scyther');
    upsertRequiredMission(POKEMON_GASTLY_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'gastly');
    upsertRequiredMission(POKEMON_KRABBY_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'krabby');
    upsertRequiredMission(POKEMON_EKANS_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'ekans');
    upsertRequiredMission(POKEMON_MACHOP_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'machop');
    upsertRequiredMission(POKEMON_MAGIKARP_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'magikarp');
    upsertRequiredMission(POKEMON_MR_MIME_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'mr-mime');
    upsertRequiredMission(POKEMON_HITMONCHAN_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'hitmonchan');
    upsertRequiredMission(POKEMON_HITMONLEE_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'hitmonlee');
    upsertRequiredMission(POKEMON_MAGNEMITE_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'magnemite');
    upsertRequiredMission(POKEMON_AERODACTYL_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'aerodactyl');
    upsertRequiredMission(POKEMON_ONIX_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'onix');
    upsertRequiredMission(POKEMON_AEGISLASH_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'aegislash');
    upsertRequiredMission(POKEMON_DITTO_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'ditto');
    upsertRequiredMission(POKEMON_SCRAGGY_MISSION_ENTRY, (mission) => normalizeCharacterId(mission?.reward_character) === 'scraggy');
    POKEMON_WAVE_2_MISSION_ENTRIES.forEach((entry) => {
        upsertRequiredMission(
            entry,
            (mission) => normalizeCharacterId(mission?.reward_character) === normalizeCharacterId(entry.reward_character)
        );
    });
    upsertRequiredMission(
        POKEMON_LADDER_MILESTONE_MISSION_ENTRY,
        (mission) => mission?.missionId === POKEMON_LADDER_MILESTONE_MISSION_ENTRY.missionId
    );
    return normalizeMissionCatalog(catalog)
        .map((mission) => normalizeOpenTeamPveMission(mission))
        .map((mission) => normalizeComicMissionDifficulty(mission));
};

const getDefaultMissionCatalog = () =>
    ensureRequiredMissionCatalogEntries(DEFAULT_MISSION_CATALOG);

const getStoredMissionCatalog = async () => {
    const defaultCatalog = getDefaultMissionCatalog();
    if (!appStateCollection) {
        missionCatalogCache = defaultCatalog;
        return defaultCatalog;
    }
    try {
        const storedState = await appStateCollection.findOne({ key: MISSION_CATALOG_STATE_KEY });
        const storedCatalog = normalizeMissionCatalog(
            storedState && Array.isArray(storedState.missions) ? storedState.missions : []
        );
        const nextCatalog = ensureRequiredMissionCatalogEntries(
            storedCatalog.length ? storedCatalog : defaultCatalog
        );
        missionCatalogCache = nextCatalog;
        return nextCatalog;
    } catch (error) {
        console.error('Mission catalog fallback engaged:', error);
        missionCatalogCache = defaultCatalog;
        return defaultCatalog;
    }
};

const saveMissionCatalog = async (missions, updatedBy) => {
    const normalizedCatalog = normalizeMissionCatalog(missions);
    if (!normalizedCatalog.length) {
        throw new Error('At least one mission is required.');
    }

    await appStateCollection.updateOne(
        { key: MISSION_CATALOG_STATE_KEY },
        {
            $set: {
                key: MISSION_CATALOG_STATE_KEY,
                missions: normalizedCatalog,
                updatedAt: new Date(),
                updatedBy: updatedBy || '',
            },
        },
        { upsert: true }
    );

    missionCatalogCache = normalizedCatalog;
    return normalizedCatalog;
};

const normalizeBotTeam = (team = {}, index = 0) => {
    const source = team && typeof team === 'object' ? team : {};
    const teamId = typeof source.teamId === 'string' && source.teamId.trim()
        ? source.teamId.trim()
        : `team-${index + 1}`;
    const name = typeof source.name === 'string' && source.name.trim()
        ? source.name.trim()
        : `Bot Team ${index + 1}`;
    const characterIds = (Array.isArray(source.characterIds) ? source.characterIds : [])
        .map((id) => normalizeCharacterId(id))
        .filter(Boolean)
        .slice(0, 3);
    
    return {
        teamId,
        name,
        characterIds,
    };
};

const getStoredBotTeams = async () => {
    if (botTeamsCache && Array.isArray(botTeamsCache)) {
        return botTeamsCache;
    }
    if (!appStateCollection) {
        return [];
    }

    const storedState = await appStateCollection.findOne({ key: BOT_TEAMS_STATE_KEY });
    const teams = (storedState && Array.isArray(storedState.teams) ? storedState.teams : [])
        .map((team, index) => normalizeBotTeam(team, index));
    
    botTeamsCache = teams;
    return teams;
};

const saveBotTeams = async (teams, updatedBy) => {
    const normalizedTeams = (Array.isArray(teams) ? teams : [])
        .map((team, index) => normalizeBotTeam(team, index));

    await appStateCollection.updateOne(
        { key: BOT_TEAMS_STATE_KEY },
        {
            $set: {
                key: BOT_TEAMS_STATE_KEY,
                teams: normalizedTeams,
                updatedAt: new Date(),
                updatedBy: updatedBy || '',
            },
        },
        { upsert: true }
    );

    botTeamsCache = normalizedTeams;
    return normalizedTeams;
};

const getMissionLockedCharacterIds = async () => {
    const catalog = missionCatalogCache && Array.isArray(missionCatalogCache)
        ? missionCatalogCache
        : await getStoredMissionCatalog();
    return new Set(
        (Array.isArray(catalog) ? catalog : [])
            .flatMap((mission) => [
                normalizeCharacterId(mission.reward_character),
                ...(Array.isArray(mission.reward_character_ids)
                    ? mission.reward_character_ids.map((entry) => normalizeCharacterId(entry))
                    : []),
            ])
            .filter(Boolean)
    );
};

const getMissionUnlockRewardCharacterIds = (mission = {}) => [
    normalizeCharacterId(mission.reward_character),
    ...(Array.isArray(mission.reward_character_ids)
        ? mission.reward_character_ids.map((entry) => normalizeCharacterId(entry))
        : []),
].filter(Boolean);

const findMissionForPurchasableCharacter = (missions = [], characterId = '', arena = DEFAULT_ARENA_MODE) => {
    const normalizedCharacterId = normalizeCharacterId(characterId);
    const normalizedArena = normalizeArenaMode(arena);
    if (!normalizedCharacterId) {
        return null;
    }
    return (Array.isArray(missions) ? missions : []).find((mission) => {
        if (normalizeArenaMode(mission?.arena) !== normalizedArena) {
            return false;
        }
        return getMissionUnlockRewardCharacterIds(mission).includes(normalizedCharacterId);
    }) || null;
};

const resolveMissionUnlockPointCost = (mission = {}) => {
    if (mission?.missionId === 'eevee-evolution-path') {
        return MISSION_EEVEE_EVOLUTION_UNLOCK_POINT_COST;
    }

    const explicitCost = Number(
        mission.unlock_point_cost ??
            mission.unlockPointCost ??
            mission.shop_cost ??
            mission.shopCost
    );
    if (Number.isFinite(explicitCost) && explicitCost > 0) {
        return Math.max(
            MISSION_UNLOCK_POINT_PRICE_MIN,
            Math.min(
                Math.max(MISSION_UNLOCK_POINT_PRICE_MAX, MISSION_EEVEE_EVOLUTION_UNLOCK_POINT_COST),
                Math.floor(explicitCost)
            )
        );
    }

    return getMissionUnlockPointCostForRank(
        mission.level_requirement ?? mission.levelRequirement ?? mission.rank ?? 1
    );
};

const addUnlockPointCostsToMissions = (missions = []) =>
    (Array.isArray(missions) ? missions : []).map((mission = {}) => ({
        ...mission,
        unlockPointCost: resolveMissionUnlockPointCost(mission),
    }));

const profileHasUnlockedCharacter = (profile, characterId, lockedCharacterIds = new Set(), arena = DEFAULT_ARENA_MODE) => {
    const normalizedCharacterId =
        typeof characterId === 'string' ? normalizeCharacterId(characterId) : '';
    if (!normalizedCharacterId) {
        return true;
    }
    const arenaState = getProfileArenaState(profile, arena);
    const missions = arenaState && typeof arenaState.missions === 'object' ? arenaState.missions : {};
    if (
        normalizeArenaMode(arena) === 'pokemon' &&
        normalizedCharacterId === 'eevee' &&
        getPokemonEeveeEvolutionCharacterIds().has(
            normalizeCharacterId(missions.eeveeEvolutionCharacterId)
        )
    ) {
        return false;
    }
    const unlocked = new Set(
        (Array.isArray(missions.unlockedCharacterIds) ? missions.unlockedCharacterIds : [])
            .map((entry) => normalizeCharacterId(entry))
            .filter(Boolean)
    );
    if (!lockedCharacterIds.has(normalizedCharacterId)) {
        return true;
    }
    return unlocked.has(normalizedCharacterId);
};

const assertTeamCanBeUsed = async (profile, team = [], userRole = 'player', arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    if (teamHasDuplicateCharacters(team)) {
        throw new Error('Team characters must be unique.');
    }
    if (!isValidTeamSelectionForMatch(team)) {
        throw new Error('Invalid team selection.');
    }
    if (String(userRole || '').trim().toLowerCase() === 'admin') {
        return;
    }
    const lockedCharacterIds = await getMissionLockedCharacterIds();
    const normalizedProfile = normalizeUserProfile({
        profile,
    });
    const invalidCharacter = Array.isArray(team)
        ? team.find((slot) => {
              const rosterCharacterId = getRosterCharacterId(slot);
              const rosterArena = getRosterCharacterArena(slot);
              if (!rosterCharacterId) {
                  return true;
              }
              if (rosterArena !== normalizedArena) {
                  return true;
              }
              return !profileHasUnlockedCharacter(
                  normalizedProfile,
                  rosterCharacterId,
                  lockedCharacterIds,
                  normalizedArena
              );
          })
        : null;
    if (invalidCharacter === undefined || invalidCharacter === null) {
        return;
    }
    const rosterCharacterId = getRosterCharacterId(invalidCharacter);
    const rosterCharacterName = getRosterCharacterName(invalidCharacter) || rosterCharacterId || 'Character';
    if (!rosterCharacterId) {
        throw new Error('Invalid team selection.');
    }
    const rosterArena = getRosterCharacterArena(invalidCharacter);
    if (rosterArena && rosterArena !== normalizedArena) {
        throw new Error(`${rosterCharacterName} does not belong to ${normalizedArena === 'pokemon' ? 'Pokemon Arena' : 'Comic Arena'}.`);
    }
    throw new Error(`${rosterCharacterName} is locked.`);
};

const buildDefaultUserProfile = (user = {}) => {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt || Date.now());
    return {
        avatarUrl: DEFAULT_PROFILE_AVATAR,
        backgrounds: {
            selectionUrl: '',
            ingameUrl: '',
        },
        posts: 0,
        clan: null,
        clanInvitations: [],
        recentQuickGames: [],
        recentPrivateGames: [],
        recentLadderGames: [],
        missions: createDefaultMissionState(),
        matchmaking: {
            battleBotEnabled: true,
        },
        ladder: {
            level: 1,
            rank: 'Academy Student',
            rankHatUrl: 'assets/images/hats/academy.png',
            experiencePoints: 0,
            ladderRank: null,
            wins: 0,
            losses: 0,
            streak: 0,
            highestStreak: 0,
            highestLevel: 1,
            famePoints: 0,
            unlockPoints: 0,
            isHokage: false,
        },
        activity: {
            lastOnlineAt: createdAt,
            currentPage: '',
        },
    };
};

const normalizeArenaProgressState = (source = {}, user = {}) => {
    const defaults = buildDefaultUserProfile(user);
    const arenaSource = source && typeof source === 'object' ? source : {};
    const ladder = arenaSource.ladder && typeof arenaSource.ladder === 'object' ? arenaSource.ladder : {};
    const storedExperiencePoints = Number.isFinite(Number(ladder.experiencePoints))
        ? Math.max(0, Number(ladder.experiencePoints))
        : defaults.ladder.experiencePoints;
    const storedLevel = Number.isFinite(Number(ladder.level))
        ? Math.max(1, Number(ladder.level))
        : defaults.ladder.level;
    const inferredExperiencePoints = Math.max(
        storedExperiencePoints,
        getCumulativeExperienceForLevel(storedLevel)
    );
    const normalizedLadderState = deriveLadderStateFromExperience(inferredExperiencePoints);
    const recentLadderGames = normalizeRecentLadderGames(arenaSource.recentLadderGames);
    const storedStreak = Number.isFinite(Number(ladder.streak)) ? Number(ladder.streak) : defaults.ladder.streak;
    const inferredLossStreak = inferCurrentLadderLossStreak({
        username: user.username,
        recentLadderGames,
    });
    const resolvedStreak = storedStreak === 0 && inferredLossStreak < 0 ? inferredLossStreak : storedStreak;
    const isHokage = Boolean(ladder.isHokage) && normalizedLadderState.level >= 46;
    const rankInfo = getRankInfoForLevel(normalizedLadderState.level, isHokage);
    return {
        avatarUrl:
            typeof arenaSource.avatarUrl === 'string' && arenaSource.avatarUrl.trim()
                ? arenaSource.avatarUrl.trim()
                : '',
        recentQuickGames: normalizeRecentQuickGames(arenaSource.recentQuickGames),
        recentPrivateGames: normalizeRecentQuickGames(arenaSource.recentPrivateGames),
        recentLadderGames,
        recentQuickGamesCount24Hours: normalizeRecentQuickGames(arenaSource.recentQuickGames).length,
        recentPrivateGamesCount24Hours: normalizeRecentQuickGames(arenaSource.recentPrivateGames).length,
        recentLadderGamesCount24Hours: recentLadderGames.length,
        missions: normalizeMissionState(arenaSource.missions),
        skins: normalizeArenaSkinState(arenaSource.skins, 'pokemon'),
        ladder: {
            level: normalizedLadderState.level,
            rank: rankInfo.rank,
            rankHatUrl: rankInfo.hatUrl,
            experiencePoints: normalizedLadderState.experiencePoints,
            experienceIntoLevel: normalizedLadderState.experienceIntoLevel,
            experienceForNextLevel: normalizedLadderState.experienceForNextLevel,
            experienceToNextLevel: normalizedLadderState.experienceToNextLevel,
            ladderRank: Number.isFinite(Number(ladder.ladderRank))
                ? Math.max(1, Number(ladder.ladderRank))
                : null,
            wins: Number.isFinite(Number(ladder.wins)) ? Math.max(0, Number(ladder.wins)) : defaults.ladder.wins,
            losses: Number.isFinite(Number(ladder.losses))
                ? Math.max(0, Number(ladder.losses))
                : defaults.ladder.losses,
            streak: resolvedStreak,
            highestStreak: Number.isFinite(Number(ladder.highestStreak))
                ? Number(ladder.highestStreak)
                : defaults.ladder.highestStreak,
            highestLevel: Math.max(
                normalizedLadderState.level,
                Number.isFinite(Number(ladder.highestLevel))
                    ? Math.max(1, Number(ladder.highestLevel))
                    : defaults.ladder.highestLevel
            ),
            famePoints: Number.isFinite(Number(ladder.famePoints))
                ? Math.max(0, Number(ladder.famePoints))
                : defaults.ladder.famePoints,
            unlockPoints: Number.isFinite(Number(ladder.unlockPoints))
                ? Math.max(0, Math.floor(Number(ladder.unlockPoints)))
                : defaults.ladder.unlockPoints,
            isHokage,
        },
    };
};

const normalizeArenaProgressStates = (arenas = {}, user = {}) => {
    const source = arenas && typeof arenas === 'object' ? arenas : {};
    return {
        pokemon: normalizeArenaProgressState(source.pokemon, user),
    };
};

const getProfileArenaState = (profile, arena = DEFAULT_ARENA_MODE) => {
    if (normalizeArenaMode(arena) !== 'pokemon') {
        return profile;
    }
    return {
        ...profile,
        ...(profile?.arenas?.pokemon || normalizeArenaProgressState({}, profile)),
    };
};

const setProfileArenaState = (profile, arena = DEFAULT_ARENA_MODE, arenaState = {}) => {
    if (normalizeArenaMode(arena) !== 'pokemon') {
        return {
            ...profile,
            recentQuickGames: arenaState.recentQuickGames,
            recentPrivateGames: arenaState.recentPrivateGames,
            recentLadderGames: arenaState.recentLadderGames,
            recentQuickGamesCount24Hours: arenaState.recentQuickGamesCount24Hours,
            recentPrivateGamesCount24Hours: arenaState.recentPrivateGamesCount24Hours,
            recentLadderGamesCount24Hours: arenaState.recentLadderGamesCount24Hours,
            missions: arenaState.missions,
            ladder: arenaState.ladder,
        };
    }
    return {
        ...profile,
        arenas: {
            ...(profile?.arenas || {}),
            pokemon: normalizeArenaProgressState(arenaState, profile),
        },
    };
};

const QUICK_GAME_RETENTION_MS = 24 * 60 * 60 * 1000;
const REPEAT_LADDER_SURRENDER_LOOKBACK_COUNT = 3;

const normalizeClanInvitations = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            clanName: typeof entry?.clanName === 'string' ? entry.clanName.trim() : '',
            clanAbbreviation: typeof entry?.clanAbbreviation === 'string' ? entry.clanAbbreviation.trim() : '',
            invitedBy: typeof entry?.invitedBy === 'string' ? entry.invitedBy.trim() : '',
            invitedUsername: typeof entry?.invitedUsername === 'string' ? entry.invitedUsername.trim() : '',
            invitedAt: entry?.invitedAt || null,
        }))
        .filter((entry) => entry.clanName && entry.invitedBy && entry.invitedUsername);

const normalizeCustomRankList = (value, fallbackLabel) => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
            .slice(0, 25);
    }
    if (typeof value === 'string' && value.trim() && value.trim() !== fallbackLabel) {
        return [value.trim()];
    }
    return [];
};

const normalizeClanRankNames = (value = {}) => ({
    clanLeader: normalizeCustomRankList(value?.clanLeader, DEFAULT_CLAN_RANK_NAMES.clanLeader),
    leader: normalizeCustomRankList(value?.leader, DEFAULT_CLAN_RANK_NAMES.leader),
    captain: normalizeCustomRankList(value?.captain, DEFAULT_CLAN_RANK_NAMES.captain),
    lieutenant: normalizeCustomRankList(value?.lieutenant, DEFAULT_CLAN_RANK_NAMES.lieutenant),
    member: normalizeCustomRankList(value?.member, DEFAULT_CLAN_RANK_NAMES.member),
    trial: normalizeCustomRankList(value?.trial, DEFAULT_CLAN_RANK_NAMES.trial),
});

const CLAN_RANK_KEYS = ['clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial'];

const normalizeClanRankKey = (value, fallbackUser = {}, clan = null) => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (CLAN_RANK_KEYS.includes(raw)) {
        return raw;
    }

    const rankLabel = typeof clan?.rank === 'string' ? clan.rank.trim().toLowerCase() : '';
    if (rankLabel === 'clan leader') {
        return 'clanLeader';
    }
    if (rankLabel === 'leader') {
        if (
            typeof clan?.createdBy === 'string' &&
            typeof fallbackUser?.username === 'string' &&
            clan.createdBy.trim().toLowerCase() === fallbackUser.username.trim().toLowerCase()
        ) {
            return 'clanLeader';
        }
        return 'leader';
    }
    if (rankLabel === 'captain') {
        return 'captain';
    }
    if (rankLabel === 'lieutenant') {
        return 'lieutenant';
    }
    if (rankLabel === 'member') {
        return 'member';
    }
    if (rankLabel === 'trial') {
        return 'trial';
    }

    if (
        typeof clan?.createdBy === 'string' &&
        typeof fallbackUser?.username === 'string' &&
        clan.createdBy.trim().toLowerCase() === fallbackUser.username.trim().toLowerCase()
    ) {
        return 'clanLeader';
    }

    return 'member';
};

const resolveClanRankLabel = (rankKey, customRankName = '') => {
    const baseLabel = resolveBaseClanRankLabel(rankKey);
    const label = typeof customRankName === 'string' ? customRankName.trim() : '';
    if (!label) {
        return baseLabel;
    }
    return `${label} (Based On ${baseLabel})`;
};

const resolveBaseClanRankLabel = (rankKey) =>
    DEFAULT_CLAN_RANK_NAMES[normalizeClanRankKey(rankKey)] || DEFAULT_CLAN_RANK_NAMES.member;

const clanRankHasPermission = (rankKey, permission) => {
    const normalizedRankKey = normalizeClanRankKey(rankKey);
    const permissionMap = {
        clanLeader: {
            invite: true,
            assignRanks: true,
            manageInfo: true,
            manageAvatar: true,
        },
        leader: {
            invite: true,
            assignRanks: true,
            manageInfo: false,
            manageAvatar: true,
        },
        captain: {
            invite: true,
            assignRanks: true,
            manageInfo: false,
            manageAvatar: false,
        },
        lieutenant: {
            invite: true,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
        member: {
            invite: false,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
        trial: {
            invite: false,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
    };
    return Boolean(permissionMap[normalizedRankKey]?.[permission]);
};

const normalizeRecentQuickGames = (entries = []) => {
    const cutoff = Date.now() - QUICK_GAME_RETENTION_MS;
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            playedAt: entry?.playedAt || null,
            opponentUsername:
                typeof entry?.opponentUsername === 'string' ? entry.opponentUsername.trim() : '',
            winnerUsername:
                typeof entry?.winnerUsername === 'string' ? entry.winnerUsername.trim() : '',
        }))
        .filter((entry) => entry.playedAt && entry.opponentUsername)
        .map((entry) => {
            const playedDate = new Date(entry.playedAt);
            return Number.isNaN(playedDate.getTime())
                ? null
                : {
                      ...entry,
                      playedAt: playedDate,
                  };
        })
        .filter(Boolean)
        .filter((entry) => entry.playedAt.getTime() >= cutoff)
        .sort((left, right) => right.playedAt.getTime() - left.playedAt.getTime())
        .slice(0, 25);
};

const normalizeRecentLadderGames = (entries = []) => {
    const cutoff = Date.now() - QUICK_GAME_RETENTION_MS;
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            playedAt: entry?.playedAt || null,
            opponentUsername:
                typeof entry?.opponentUsername === 'string' ? entry.opponentUsername.trim() : '',
            winnerUsername:
                typeof entry?.winnerUsername === 'string' ? entry.winnerUsername.trim() : '',
            expDelta: Number(entry?.expDelta) || 0,
            clanExpDelta: Math.max(0, Number(entry?.clanExpDelta) || 0),
            unlockPointDelta: Math.max(0, Number(entry?.unlockPointDelta) || 0),
            surrenderedBy:
                typeof entry?.surrenderedBy === 'string' ? entry.surrenderedBy.trim() : '',
            endReason:
                typeof entry?.endReason === 'string' ? entry.endReason.trim().toLowerCase() : '',
            rewardSuppressedReason:
                typeof entry?.rewardSuppressedReason === 'string' ? entry.rewardSuppressedReason.trim() : '',
        }))
        .filter((entry) => entry.playedAt && entry.opponentUsername)
        .map((entry) => {
            const playedDate = new Date(entry.playedAt);
            return Number.isNaN(playedDate.getTime())
                ? null
                : {
                      ...entry,
                      playedAt: playedDate,
                  };
        })
        .filter(Boolean)
        .filter((entry) => entry.playedAt.getTime() >= cutoff)
        .sort((left, right) => right.playedAt.getTime() - left.playedAt.getTime())
        .slice(0, 25);
};

const countCurrentLadderSurrenderStreakByUser = ({ username = '', recentLadderGames = [] } = {}) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!normalizedUsername || !Array.isArray(recentLadderGames)) return 0;
    let streak = 0;
    for (const game of recentLadderGames) {
        const surrenderedBy =
            typeof game?.surrenderedBy === 'string' ? game.surrenderedBy.trim().toLowerCase() : '';
        const endReason =
            typeof game?.endReason === 'string' ? game.endReason.trim().toLowerCase() : '';
        if (endReason !== 'surrender' || surrenderedBy !== normalizedUsername) {
            break;
        }
        streak += 1;
    }
    return streak;
};

const isRepeatLadderSurrenderer = ({ username = '', recentLadderGames = [] } = {}) =>
    countCurrentLadderSurrenderStreakByUser({ username, recentLadderGames }) >=
    REPEAT_LADDER_SURRENDER_LOOKBACK_COUNT;

const inferCurrentLadderLossStreak = ({ username = '', recentLadderGames = [] } = {}) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!normalizedUsername || !Array.isArray(recentLadderGames)) return 0;
    let losses = 0;
    for (const game of recentLadderGames) {
        const winnerUsername =
            typeof game?.winnerUsername === 'string' ? game.winnerUsername.trim().toLowerCase() : '';
        if (!winnerUsername) break;
        if (winnerUsername === normalizedUsername) break;
        losses += 1;
    }
    return losses > 0 ? -losses : 0;
};

const normalizeUserProfile = (user = {}) => {
    const defaults = buildDefaultUserProfile(user);
    const source = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const ladder = source.ladder && typeof source.ladder === 'object' ? source.ladder : {};
    const activity = source.activity && typeof source.activity === 'object' ? source.activity : {};
    const matchmaking =
        source.matchmaking && typeof source.matchmaking === 'object' ? source.matchmaking : {};
    const clan =
        source.clan && typeof source.clan === 'object'
            ? (() => {
                  const customRankNames = normalizeClanRankNames(source.clan.customRankNames);
                  const rankKey = normalizeClanRankKey(source.clan.rankKey, user, source.clan);
                  return {
                      name: typeof source.clan.name === 'string' ? source.clan.name : '',
                      abbreviation:
                          typeof source.clan.abbreviation === 'string' ? source.clan.abbreviation : '',
                      rankKey,
                      customRankName:
                          typeof source.clan.customRankName === 'string' ? source.clan.customRankName.trim() : '',
                      rank:
                          typeof source.clan.customRankName === 'string' && source.clan.customRankName.trim()
                              ? resolveClanRankLabel(rankKey, source.clan.customRankName)
                          : resolveBaseClanRankLabel(rankKey),
                      avatarUrl:
                          typeof source.clan.avatarUrl === 'string' ? source.clan.avatarUrl.trim() : '',
                      joinedAt: source.clan.joinedAt || null,
                      bio: typeof source.clan.bio === 'string' ? source.clan.bio : '',
                      experiencePoints: Math.max(0, Number(source.clan.experiencePoints) || 0),
                      createdBy: typeof source.clan.createdBy === 'string' ? source.clan.createdBy : '',
                      createdAt: source.clan.createdAt || null,
                      customRankNames,
                  };
              })()
            : null;

    const storedExperiencePoints = Number.isFinite(Number(ladder.experiencePoints))
        ? Math.max(0, Number(ladder.experiencePoints))
        : defaults.ladder.experiencePoints;
    const storedLevel = Number.isFinite(Number(ladder.level))
        ? Math.max(1, Number(ladder.level))
        : defaults.ladder.level;
    const inferredExperiencePoints = Math.max(
        storedExperiencePoints,
        getCumulativeExperienceForLevel(storedLevel)
    );
    const normalizedLadderState = deriveLadderStateFromExperience(inferredExperiencePoints);
    const isHokage = Boolean(ladder.isHokage) && normalizedLadderState.level >= 46;
    const rankInfo = getRankInfoForLevel(normalizedLadderState.level, isHokage);
    const recentLadderGames = normalizeRecentLadderGames(source.recentLadderGames);
    const storedStreak = Number.isFinite(Number(ladder.streak)) ? Number(ladder.streak) : defaults.ladder.streak;
    const inferredLossStreak = inferCurrentLadderLossStreak({
        username: user.username,
        recentLadderGames,
    });
    const resolvedStreak = storedStreak === 0 && inferredLossStreak < 0 ? inferredLossStreak : storedStreak;

    return {
        avatarUrl:
            typeof source.avatarUrl === 'string' && source.avatarUrl.trim()
                ? source.avatarUrl.trim() === LEGACY_DEFAULT_PROFILE_AVATAR
                    ? defaults.avatarUrl
                    : source.avatarUrl.trim()
                : defaults.avatarUrl,
        backgrounds: {
            selectionUrl:
                typeof source.backgrounds?.selectionUrl === 'string'
                    ? source.backgrounds.selectionUrl.trim()
                    : defaults.backgrounds.selectionUrl,
            ingameUrl:
                typeof source.backgrounds?.ingameUrl === 'string'
                    ? source.backgrounds.ingameUrl.trim()
                    : defaults.backgrounds.ingameUrl,
        },
        posts: Number.isFinite(Number(source.posts)) ? Math.max(0, Number(source.posts)) : defaults.posts,
        clan,
        clanInvitations: normalizeClanInvitations(source.clanInvitations),
        recentQuickGames: normalizeRecentQuickGames(source.recentQuickGames),
        recentPrivateGames: normalizeRecentQuickGames(source.recentPrivateGames),
        recentLadderGames,
        recentQuickGamesCount24Hours: normalizeRecentQuickGames(source.recentQuickGames).length,
        recentPrivateGamesCount24Hours: normalizeRecentQuickGames(source.recentPrivateGames).length,
        recentLadderGamesCount24Hours: recentLadderGames.length,
        missions: normalizeMissionState(source.missions),
        arenas: normalizeArenaProgressStates(source.arenas, user),
        matchmaking: {
            battleBotEnabled:
                typeof matchmaking.battleBotEnabled === 'boolean'
                    ? matchmaking.battleBotEnabled
                    : defaults.matchmaking.battleBotEnabled,
        },
        ladder: {
            level: normalizedLadderState.level,
            rank: rankInfo.rank,
            rankHatUrl: rankInfo.hatUrl,
            experiencePoints: normalizedLadderState.experiencePoints,
            experienceIntoLevel: normalizedLadderState.experienceIntoLevel,
            experienceForNextLevel: normalizedLadderState.experienceForNextLevel,
            experienceToNextLevel: normalizedLadderState.experienceToNextLevel,
            ladderRank: Number.isFinite(Number(ladder.ladderRank))
                ? Math.max(1, Number(ladder.ladderRank))
                : null,
            wins: Number.isFinite(Number(ladder.wins)) ? Math.max(0, Number(ladder.wins)) : defaults.ladder.wins,
            losses: Number.isFinite(Number(ladder.losses))
                ? Math.max(0, Number(ladder.losses))
                : defaults.ladder.losses,
            streak: resolvedStreak,
            highestStreak: Number.isFinite(Number(ladder.highestStreak))
                ? Number(ladder.highestStreak)
                : defaults.ladder.highestStreak,
            highestLevel: Math.max(
                normalizedLadderState.level,
                Number.isFinite(Number(ladder.highestLevel))
                    ? Math.max(1, Number(ladder.highestLevel))
                    : defaults.ladder.highestLevel
            ),
            famePoints: Number.isFinite(Number(ladder.famePoints))
                ? Math.max(0, Number(ladder.famePoints))
                : defaults.ladder.famePoints,
            unlockPoints: Number.isFinite(Number(ladder.unlockPoints))
                ? Math.max(0, Math.floor(Number(ladder.unlockPoints)))
                : defaults.ladder.unlockPoints,
            isHokage,
        },
        activity: {
            lastOnlineAt: activity.lastOnlineAt || defaults.activity.lastOnlineAt,
            currentPage: typeof activity.currentPage === 'string' ? activity.currentPage.trim().slice(0, 120) : '',
        },
    };
};

const isGameBotUsername = (username) =>
    typeof username === 'string' && username.trim().toLowerCase().startsWith(GAME_BOT_USERNAME_PREFIX);

const buildHumanMatchStatsFilter = ({ arena = DEFAULT_ARENA_MODE, mode = '' } = {}) => {
    const normalizedArena = normalizeArenaMode(arena);
    const normalizedMode = ['quick', 'ladder'].includes(String(mode || '').trim().toLowerCase())
        ? String(mode).trim().toLowerCase()
        : null;
    return {
        arena: normalizedArena,
        status: 'ended',
        ...(normalizedMode ? { mode: normalizedMode } : { mode: { $in: ['quick', 'ladder'] } }),
        'botMatch.enabled': { $ne: true },
        players: {
            $not: {
                $elemMatch: {
                    $or: [
                        { isBot: true },
                        { username: { $regex: '^__game_bot__:', $options: 'i' } },
                    ],
                },
            },
        },
    };
};

const inferMatchArenaFromTeams = (match = {}) => {
    const rosterIndices = (Array.isArray(match.players) ? match.players : [])
        .flatMap((player) => (Array.isArray(player?.team) ? player.team : []))
        .map((index) => Number.parseInt(index, 10))
        .filter((index) => Number.isInteger(index) && index >= 0);
    if (!rosterIndices.length) return null;
    const arenas = new Set(
        rosterIndices.map((index) => {
            const character = charactersData?.[index];
            return character ? normalizeArenaMode(character.arena || character.universe) : null;
        })
    );
    arenas.delete(null);
    return arenas.size === 1 ? Array.from(arenas)[0] : null;
};

const getStoredMatchArena = (match = {}) => {
    const storedArena = typeof match?.arena === 'string' ? match.arena.trim().toLowerCase() : '';
    return ARENA_MODES.has(storedArena) ? storedArena : inferMatchArenaFromTeams(match);
};

const isTrackedMatchForArena = (match = {}, arena = DEFAULT_ARENA_MODE, mode = 'ladder') => {
    if (match?.status !== 'ended' || match?.mode !== mode) return false;
    return getStoredMatchArena(match) === normalizeArenaMode(arena);
};

const buildCharacterWinrateEntries = ({ matches = [], arena = DEFAULT_ARENA_MODE, mode = 'ladder', resetAt = null } = {}) => {
    const normalizedArena = normalizeArenaMode(arena);
    const resetTimestamp = resetAt ? new Date(resetAt).getTime() : Number.NaN;
    const characters = (Array.isArray(charactersData) ? charactersData : [])
        .map((character = {}, index) => ({
            characterIndex: index,
            characterId: typeof character.characterId === 'string' ? character.characterId : '',
            name: typeof character.name === 'string' ? character.name : `Character ${index + 1}`,
            facePicture: typeof character.facePicture === 'string' ? character.facePicture : '',
            totalGamesWon: 0,
            totalMatchesPlayed: 0,
            arena: normalizeArenaMode(character.arena || character.universe),
        }))
        .filter((character) => character.arena === normalizedArena);
    const charactersByIndex = new Map(characters.map((character) => [character.characterIndex, character]));

    (Array.isArray(matches) ? matches : []).forEach((match = {}) => {
        if (!isTrackedMatchForArena(match, normalizedArena, mode)) return;
        if (Number.isFinite(resetTimestamp)) {
            const endedTimestamp = new Date(match.endedAt || 0).getTime();
            if (!Number.isFinite(endedTimestamp) || endedTimestamp < resetTimestamp) return;
        }
        const winnerUsername = typeof match.winner === 'string' ? match.winner : '';
        (Array.isArray(match.players) ? match.players : []).forEach((player = {}) => {
            const didWin = winnerUsername && usernamesEqual(player.username, winnerUsername);
            (Array.isArray(player.team) ? player.team : []).forEach((characterIndex) => {
                const index = Number.parseInt(characterIndex, 10);
                const characterStats = charactersByIndex.get(index);
                if (!Number.isInteger(index) || !characterStats) return;
                characterStats.totalMatchesPlayed += 1;
                if (didWin) characterStats.totalGamesWon += 1;
            });
        });
    });

    return characters;
};

const backfillMatchArenaMetadata = async () => {
    if (!matchesCollection) return { updated: 0, skipped: 0 };
    const matches = await matchesCollection.find(
        { $or: [{ arena: { $exists: false } }, { arena: { $nin: ['comic', 'pokemon'] } }] },
        { projection: { _id: 1, players: 1 } }
    ).toArray();
    const operations = [];
    let skipped = 0;
    matches.forEach((match) => {
        const arena = inferMatchArenaFromTeams(match);
        if (!arena) {
            skipped += 1;
            return;
        }
        operations.push({
            updateOne: {
                filter: { _id: match._id },
                update: { $set: { arena, arenaBackfilledAt: new Date() } },
            },
        });
    });
    if (operations.length) {
        await matchesCollection.bulkWrite(operations, { ordered: false });
    }
    return { updated: operations.length, skipped };
};

const getPlayerDisplayName = (player) => {
    const displayName =
        typeof player?.displayName === 'string' && player.displayName.trim()
            ? player.displayName.trim()
            : '';
    if (displayName) {
        return displayName;
    }
    const username = typeof player?.username === 'string' ? player.username.trim() : '';
    return isGameBotUsername(username) ? GAME_BOT_DISPLAY_NAME : username;
};

const recordRecentQuickGameForUsers = async ({ players, winnerUsername, endedAt, arena = DEFAULT_ARENA_MODE }) => {
    const usernames = Array.isArray(players)
        ? players
              .map((player) => (typeof player?.username === 'string' ? player.username : ''))
              .filter(Boolean)
        : [];
    if (usernames.length < 2) {
        return;
    }

    const endedDate = endedAt instanceof Date ? endedAt : new Date(endedAt || Date.now());
    const existingUsers = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    await Promise.all(
        existingUsers.map(async (user) => {
            const opponentPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && !usernamesEqual(player.username, user.username)
            );
            const opponentUsername = getPlayerDisplayName(opponentPlayer) || '';
            const winnerPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && usernamesEqual(player.username, winnerUsername)
            );
            const profile = normalizeUserProfile(user);
            const arenaState = getProfileArenaState(profile, arena);
            arenaState.recentQuickGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: getPlayerDisplayName(winnerPlayer) || winnerUsername || '',
                },
                ...(Array.isArray(arenaState.recentQuickGames) ? arenaState.recentQuickGames : []),
            ]);
            const normalizedProfile = normalizeUserProfile({
                ...user,
                profile: setProfileArenaState(profile, arena, arenaState),
            });
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile: normalizedProfile,
                    },
                }
            );
        })
    );
};

const recordRecentPrivateGameForUsers = async ({ players, winnerUsername, endedAt, arena = DEFAULT_ARENA_MODE }) => {
    const usernames = Array.isArray(players)
        ? players
              .map((player) => (typeof player?.username === 'string' ? player.username : ''))
              .filter(Boolean)
        : [];
    if (usernames.length < 2) {
        return;
    }

    const endedDate = endedAt instanceof Date ? endedAt : new Date(endedAt || Date.now());
    const existingUsers = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    await Promise.all(
        existingUsers.map(async (user) => {
            const opponentPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && !usernamesEqual(player.username, user.username)
            );
            const opponentUsername = getPlayerDisplayName(opponentPlayer) || '';
            const winnerPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && usernamesEqual(player.username, winnerUsername)
            );
            const profile = normalizeUserProfile(user);
            const arenaState = getProfileArenaState(profile, arena);
            arenaState.recentPrivateGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: getPlayerDisplayName(winnerPlayer) || winnerUsername || '',
                },
                ...(Array.isArray(arenaState.recentPrivateGames) ? arenaState.recentPrivateGames : []),
            ]);
            const normalizedProfile = normalizeUserProfile({
                ...user,
                profile: setProfileArenaState(profile, arena, arenaState),
            });
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile: normalizedProfile,
                    },
                }
            );
        })
    );
};

const teamHasCharacterId = (match, username, characterId) => {
    if (!match || !username || !characterId) {
        return false;
    }
    const playerEntry = findMatchPlayerByUsername(match, username);
    const team = Array.isArray(playerEntry?.team) ? playerEntry.team : [];
    return team.some((rosterIndex) => getRosterCharacterId(rosterIndex) === characterId);
};

const buildMissionUserMap = (users = []) => new Map(
    (Array.isArray(users) ? users : []).map((user) => [
        String(user?.usernameLower || user?.username || '').trim().toLowerCase(),
        user,
    ])
);

const applyMissionProgressForUsers = async (match, winnerUsername, endedAt) => {
    if (!match || !Array.isArray(match.players) || match.players.length < 2) {
        return null;
    }
    const specialPveMissionId = slugifyMissionId(
        match.specialPveMissionId || match.pveBattle?.missionId || ''
    );
    const arena = normalizeArenaMode(match.arena);
    if (match.mode !== 'quick' && match.mode !== 'ladder' && !specialPveMissionId) {
        return null;
    }

    const usernames = match.players
        .map((player) => (typeof player?.username === 'string' ? player.username : ''))
        .filter(Boolean);
    if (!usernames.length) {
        return null;
    }

    const usernameKeys = usernames.map((username) => username.trim().toLowerCase());
    const users = await usersCollection
        .find(
            { usernameLower: { $in: usernameKeys } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    usernameLower: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();
    if (!users.length) {
        return null;
    }

    const userByUsername = buildMissionUserMap(users);
    const missionCatalog = (await getStoredMissionCatalog()).filter(
        (mission) => normalizeArenaMode(mission?.arena) === arena
    );

    await Promise.all(
        usernames.map(async (username) => {
            const user = userByUsername.get(username.trim().toLowerCase());
            if (!user) {
                return;
            }

            const profile = normalizeUserProfile(user);
            const arenaState = getProfileArenaState(profile, arena);
            const missionState = normalizeMissionState(arenaState.missions);
            const progressByMissionId = {
                ...(missionState.progressByMissionId || {}),
            };
            const completedMissionIdsAtMatchStart = new Set(
                Object.entries(progressByMissionId)
                    .filter(([, progress]) => Boolean(progress?.completedAt))
                    .map(([missionId]) => missionId)
            );
            const skinState = normalizeArenaSkinState(arenaState.skins, arena);
            const unlockedIds = new Set(missionState.unlockedCharacterIds || []);
            const userLevel = Number(arenaState?.ladder?.level) || 1;
            const didWin = Boolean(winnerUsername) && usernamesEqual(winnerUsername, username);
            let mutated = false;
            let unlockPointRewardDelta = 0;

            for (const mission of missionCatalog) {
                if (!mission || !mission.missionId) {
                    continue;
                }

                const levelRequirement = Math.max(0, Number(mission.level_requirement) || 0);
                const meetsLevelRequirement = levelRequirement <= 0 || userLevel >= levelRequirement;
                const requiredStarterId = normalizeCharacterId(mission.starter_character_id);
                if (
                    requiredStarterId &&
                    normalizeCharacterId(missionState.gen2StarterCharacterId) !== requiredStarterId
                ) {
                    continue;
                }
                const prerequisiteMissionId = slugifyMissionId(mission.prerequisite_mission_id || '');
                if (
                    prerequisiteMissionId &&
                    !completedMissionIdsAtMatchStart.has(prerequisiteMissionId)
                ) {
                    continue;
                }

                const rewardCharacterId = normalizeCharacterId(mission.reward_character);
                const specialPve = mission.special_pve || {};
                const existingProgress = normalizeMissionProgressEntry(
                    progressByMissionId[mission.missionId] || {}
                );
                const alreadyCompleted = Boolean(existingProgress.completedAt);
                if (specialPve.enabled) {
                    if (!meetsLevelRequirement) {
                        continue;
                    }
                    if (specialPveMissionId !== mission.missionId) {
                        continue;
                    }
                    if (rewardCharacterId && unlockedIds.has(rewardCharacterId)) {
                        if (!alreadyCompleted) {
                            progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                                ...existingProgress,
                                completedAt: endedAt || existingProgress.completedAt || new Date(),
                                unlockedAt: endedAt || existingProgress.unlockedAt || new Date(),
                            });
                            mutated = true;
                        }
                        continue;
                    }
                    if (didWin) {
                        const completedAt = endedAt || new Date();
                        progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                            ...existingProgress,
                            completedAt: existingProgress.completedAt || completedAt,
                            unlockedAt: existingProgress.unlockedAt || completedAt,
                        });
                        if (rewardCharacterId) {
                            unlockedIds.add(rewardCharacterId);
                        }
                        mutated = true;
                    }
                    continue;
                }

                const allowedModes = Array.isArray(mission.mode_restriction?.allowed_modes)
                    ? mission.mode_restriction.allowed_modes
                    : ['quick', 'ladder'];
                if (!allowedModes.includes(match.mode)) {
                    continue;
                }

                const missionGoals = normalizeMissionGoalList(mission.goals || []);
                const trackedGoals = missionGoals;
                const existingGoalProgressByIndex = {
                    ...(existingProgress.goalProgressByIndex || existingProgress.goalProgress || {}),
                };
                if (rewardCharacterId && unlockedIds.has(rewardCharacterId)) {
                    if (!alreadyCompleted) {
                        progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                            ...existingProgress,
                            completedAt: endedAt || existingProgress.completedAt || new Date(),
                        });
                        mutated = true;
                    }
                    continue;
                }
                const nextGoalProgressByIndex = { ...existingGoalProgressByIndex };
                let hasTrackableGoals = false;
                let allTrackableGoalsComplete = trackedGoals.length > 0;

                trackedGoals.forEach((goal, goalIndex) => {
                    if (!goal || !goal.type) {
                        return;
                    }
                    const goalType = String(goal.type).trim().toLowerCase();
                    if (
                        goalType !== 'win_matches' &&
                        goalType !== 'win_ladder_matches' &&
                        goalType !== 'win_streak' &&
                        goalType !== 'win_streak_same_team' &&
                        goalType !== 'reach_rank' &&
                        goalType !== 'win_matches_same_team'
                    ) {
                        return;
                    }
                    hasTrackableGoals = true;
                    const targetCount =
                        goalType === 'reach_rank'
                            ? Math.max(0, Number(goal.rank) || 0)
                            : Math.max(0, Number(goal.wins) || 0);
                    if (!targetCount) {
                        allTrackableGoalsComplete = false;
                        return;
                    }
                    const goalCharacterId = normalizeCharacterId(goal.character_id);
                    const hasGoalCharacter = goalCharacterId
                        ? teamHasCharacterId(match, username, goalCharacterId)
                        : true;
                    const sameTeamCharacterIds = Array.isArray(goal.character_ids)
                        ? goal.character_ids.map((value) => normalizeCharacterId(value)).filter(Boolean)
                        : [];
                    const hasSameTeamCharacters =
                        sameTeamCharacterIds.length >= 2 &&
                        sameTeamCharacterIds.every((characterId) =>
                            teamHasCharacterId(match, username, characterId)
                        );
                    const existingGoalProgress = normalizeMissionGoalProgressEntry(
                        nextGoalProgressByIndex[goalIndex] || {}
                    );
                    const nextGoalProgress = {
                        ...existingGoalProgress,
                    };

                    if (goalType === 'win_ladder_matches') {
                        if (match.mode === 'ladder' && didWin && hasGoalCharacter) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        }
                    } else if (goalType === 'win_matches') {
                        if (didWin && hasGoalCharacter) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        }
                    } else if (goalType === 'win_streak') {
                        if (didWin && hasGoalCharacter) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        } else if (winnerUsername) {
                            nextGoalProgress.count = 0;
                        }
                    } else if (goalType === 'win_streak_same_team') {
                        if (didWin && hasSameTeamCharacters) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        } else if (winnerUsername) {
                            nextGoalProgress.count = 0;
                        }
                    } else if (goalType === 'reach_rank') {
                        nextGoalProgress.count = Math.min(targetCount, Math.max(0, userLevel));
                    } else if (goalType === 'win_matches_same_team') {
                        if (didWin && hasSameTeamCharacters) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        }
                    }

                    if (nextGoalProgress.count >= targetCount) {
                        nextGoalProgress.completedAt =
                            existingGoalProgress.completedAt || endedAt || new Date();
                    }
                    nextGoalProgress.updatedAt = endedAt || new Date();
                    nextGoalProgressByIndex[goalIndex] = normalizeMissionGoalProgressEntry(
                        nextGoalProgress
                    );

                    if (!nextGoalProgressByIndex[goalIndex].completedAt) {
                        allTrackableGoalsComplete = false;
                    }
                });

                const nextProgress = normalizeMissionProgressEntry({
                    ...existingProgress,
                    goalProgressByIndex: nextGoalProgressByIndex,
                    goalProgress: nextGoalProgressByIndex,
                });

                if (hasTrackableGoals && allTrackableGoalsComplete && meetsLevelRequirement) {
                    nextProgress.completedAt = existingProgress.completedAt || endedAt || new Date();
                    nextProgress.unlockedAt = nextProgress.completedAt;
                    if (!alreadyCompleted) {
                        unlockPointRewardDelta += Math.max(
                            0,
                            Math.floor(Number(mission.reward_unlock_points) || 0)
                        );
                    }
                    if (rewardCharacterId) {
                        unlockedIds.add(rewardCharacterId);
                    }
                    const rewardSkinId = normalizeSkinId(mission.reward_skin_id || '');
                    const rewardSkin = getArenaSkinCatalogById(arena).get(rewardSkinId);
                    if (rewardSkinId && rewardSkin) {
                        skinState.unlockedSkinIds = Array.from(
                            new Set([...skinState.unlockedSkinIds, rewardSkinId])
                        );
                        skinState.equippedSkinByCharacterId[rewardSkin.characterId] = rewardSkinId;
                    }
                }

                const progressChanged =
                    JSON.stringify(nextProgress) !== JSON.stringify(existingProgress);
                if (progressChanged) {
                    progressByMissionId[mission.missionId] = nextProgress;
                    mutated = true;
                } else if (
                    rewardCharacterId &&
                    hasTrackableGoals &&
                    allTrackableGoalsComplete &&
                    meetsLevelRequirement &&
                    !unlockedIds.has(rewardCharacterId)
                ) {
                    unlockedIds.add(rewardCharacterId);
                    mutated = true;
                }
            }

            if (!mutated) {
                return;
            }

            arenaState.missions = {
                ...arenaState.missions,
                unlockPoints:
                    Math.max(0, Number(arenaState.missions?.unlockPoints) || 0) +
                    unlockPointRewardDelta,
                progressByMissionId,
                progress: progressByMissionId,
                unlockedCharacterIds: Array.from(unlockedIds),
            };
            arenaState.skins = normalizeArenaSkinState(skinState, arena);
            arenaState.ladder.unlockPoints = arenaState.missions.unlockPoints;

            const normalizedProfile = normalizeUserProfile({
                ...user,
                profile: setProfileArenaState(profile, arena, arenaState),
            });
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile: normalizedProfile,
                    },
                }
            );
        })
    );

    return true;
};

const addClanExperience = async (clanName, clanExpDelta) => {
    const normalizedClanName = typeof clanName === 'string' ? clanName.trim().toLowerCase() : '';
    const gain = Math.max(0, Number(clanExpDelta) || 0);
    if (!normalizedClanName || gain <= 0) {
        return 0;
    }

    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    _id: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    const matchingUsers = users.filter((entry) => {
        const profile = normalizeUserProfile(entry);
        const clan = profile.clan;
        return (
            clan &&
            String(clan.name || '').trim().toLowerCase() === normalizedClanName
        );
    });

    if (!matchingUsers.length) {
        return 0;
    }

    await Promise.all(
        matchingUsers.map(async (entry) => {
            const profile = normalizeUserProfile(entry);
            if (!profile.clan) {
                return;
            }
            profile.clan.experiencePoints = Math.max(0, Number(profile.clan.experiencePoints) || 0) + gain;
            await usersCollection.updateOne(
                { _id: entry._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        })
    );

    return gain;
};

const recalculatePlayerLadderStandings = async (arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    _id: 1,
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    if (!users.length) {
        return new Map();
    }

    const normalizedUsers = users.map((user) => ({
        user,
        profile: normalizeUserProfile(user),
    }));

    normalizedUsers.sort((left, right) => {
        const leftLadder = getProfileArenaState(left.profile, normalizedArena).ladder || {};
        const rightLadder = getProfileArenaState(right.profile, normalizedArena).ladder || {};
        if ((rightLadder.level || 0) !== (leftLadder.level || 0)) {
            return (rightLadder.level || 0) - (leftLadder.level || 0);
        }
        if ((rightLadder.experiencePoints || 0) !== (leftLadder.experiencePoints || 0)) {
            return (rightLadder.experiencePoints || 0) - (leftLadder.experiencePoints || 0);
        }
        if ((rightLadder.wins || 0) !== (leftLadder.wins || 0)) {
            return (rightLadder.wins || 0) - (leftLadder.wins || 0);
        }
        return String(left.user.username || '').localeCompare(String(right.user.username || ''));
    });

    const hokageIndex = normalizedUsers.findIndex(
        (entry) => (Number(getProfileArenaState(entry.profile, normalizedArena)?.ladder?.level) || 0) >= 46
    );
    const updates = [];
    const profileByUsername = new Map();

    normalizedUsers.forEach((entry, index) => {
        const normalizedProfile = entry.profile;
        const shouldBeHokage = hokageIndex >= 0 && index === hokageIndex;
        const arenaState = getProfileArenaState(normalizedProfile, normalizedArena);
        arenaState.ladder.ladderRank = index + 1;
        arenaState.ladder.isHokage = shouldBeHokage;
        const rankedProfile = setProfileArenaState(normalizedProfile, normalizedArena, arenaState);
        const finalProfile = normalizeUserProfile({
            ...entry.user,
            profile: rankedProfile,
        });
        profileByUsername.set(entry.user.username, finalProfile);
        const profileChanged =
            JSON.stringify(entry.user.profile || null) !== JSON.stringify(finalProfile);
        if (profileChanged) {
            updates.push({
                updateOne: {
                    filter: { _id: entry.user._id },
                    update: {
                        $set: {
                            profile: finalProfile,
                        },
                    },
                },
            });
        }
    });

    if (updates.length > 0) {
        await usersCollection.bulkWrite(updates, { ordered: false });
    }

    return profileByUsername;
};

const applyMatchCompletionRewards = async (match, winnerUsername, endedAt) => {
    if (!match || !Array.isArray(match.players) || match.players.length < 2) {
        return null;
    }

    const arena = normalizeArenaMode(match.arena);
    await applyMissionProgressForUsers(match, winnerUsername, endedAt);

    if (match.mode === 'private') {
        await recordRecentPrivateGameForUsers({
            players: match.players || [],
            winnerUsername: winnerUsername || '',
            endedAt,
            arena,
        });
        return null;
    }

    if (match.mode === 'pve') {
        return null;
    }

    if (match.mode !== 'ladder') {
        await recordRecentQuickGameForUsers({
            players: match.players || [],
            winnerUsername: winnerUsername || '',
            endedAt,
            arena,
        });
        return null;
    }

    const usernames = match.players
        .map((player) => (typeof player?.username === 'string' ? player.username : ''))
        .filter(Boolean);
    if (usernames.length < 2) {
        return null;
    }

    const users = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();
    if (users.length < 1) {
        return null;
    }

    const userByUsername = new Map(users.map((user) => [user.username, user]));
    const initialProfiles = new Map(users.map((user) => [user.username, normalizeUserProfile(user)]));
    const initialArenaProfiles = new Map(
        users.map((user) => {
            const profile = initialProfiles.get(user.username);
            return [user.username, getProfileArenaState(profile, arena)];
        })
    );
    const preliminaryResults = new Map();
    const profileUpdates = [];
    const clanExperienceByName = new Map();
    const surrenderedByUsername =
        typeof match?.surrenderedBy === 'string' ? match.surrenderedBy.trim() : '';
    const endedBySurrender = match?.endReason === 'surrender' && Boolean(surrenderedByUsername);

    for (const username of usernames) {
        const user = userByUsername.get(username);
        const profile = initialProfiles.get(username);
        const arenaProfile = initialArenaProfiles.get(username);
        const opponentEntry = (Array.isArray(match.players) ? match.players : []).find(
            (entry) => entry?.username && entry.username !== username
        );
        const opponentUsername =
            typeof opponentEntry?.username === 'string' ? opponentEntry.username : '';
        const opponentProfile = initialArenaProfiles.get(opponentUsername) || {
            ...buildDefaultUserProfile(),
            ladder: {
                ...buildDefaultUserProfile().ladder,
                level: Math.max(
                    1,
                    Number(opponentEntry?.ladderLevel) || Number(arenaProfile?.ladder?.level) || 1
                ),
            },
        };
        if (!user || !profile || !arenaProfile) {
            continue;
        }

        const didWin = Boolean(winnerUsername) && winnerUsername === username;
        const opponentIsRepeatSurrenderer =
            endedBySurrender &&
            didWin &&
            opponentUsername &&
            isRepeatLadderSurrenderer({
                username: opponentUsername,
                recentLadderGames: initialArenaProfiles.get(opponentUsername)?.recentLadderGames || [],
            });
        const suppressRankedPointRewards = opponentIsRepeatSurrenderer;
        const rewardSuppressedReason = opponentIsRepeatSurrenderer
            ? 'opponent-repeat-surrender'
            : '';
        const expChange = winnerUsername && !suppressRankedPointRewards
            ? resolveLadderExperienceDelta({
                  playerLevel: arenaProfile.ladder.level,
                  opponentLevel: opponentProfile.ladder.level,
                  didWin,
              })
            : 0;
        const previousExperiencePoints = arenaProfile.ladder.experiencePoints;
        const nextExperiencePoints = Math.min(
            LADDER_MAX_EXPERIENCE_POINTS,
            Math.max(0, previousExperiencePoints + expChange)
        );
        arenaProfile.ladder.experiencePoints = nextExperiencePoints;
        if (didWin) {
            arenaProfile.ladder.wins += 1;
            arenaProfile.ladder.streak = Math.max(0, Number(arenaProfile.ladder.streak) || 0) + 1;
            arenaProfile.ladder.highestStreak = Math.max(
                Number(arenaProfile.ladder.highestStreak) || 0,
                arenaProfile.ladder.streak
            );
        } else if (winnerUsername) {
            arenaProfile.ladder.losses += 1;
            arenaProfile.ladder.streak = Math.min(0, Number(arenaProfile.ladder.streak) || 0) - 1;
        }
        const unlockPointDelta = winnerUsername && !suppressRankedPointRewards
            ? didWin
                ? LADDER_UNLOCK_POINTS_WIN
                : LADDER_UNLOCK_POINTS_LOSS
            : 0;
        arenaProfile.missions = normalizeMissionState(arenaProfile.missions);
        arenaProfile.missions.unlockPoints += unlockPointDelta;
        arenaProfile.ladder.unlockPoints = arenaProfile.missions.unlockPoints;

        const expDelta = nextExperiencePoints - previousExperiencePoints;
        const clanRankKey = normalizeClanRankKey(profile.clan?.rankKey || '', user, profile.clan);
        const clanExpDelta =
            expDelta > 0 && profile.clan?.name && clanRankKey !== 'trial'
                ? Math.floor(expDelta / 2)
                : 0;

        arenaProfile.recentLadderGames = normalizeRecentLadderGames([
            {
                playedAt: endedAt,
                opponentUsername: getPlayerDisplayName(opponentEntry) || opponentUsername,
                winnerUsername:
                    getPlayerDisplayName(
                        (Array.isArray(match.players) ? match.players : []).find(
                            (entry) => entry?.username && entry.username === winnerUsername
                        )
                    ) ||
                    winnerUsername ||
                    '',
                expDelta,
                clanExpDelta,
                unlockPointDelta,
                surrenderedBy: surrenderedByUsername,
                endReason: match?.endReason || '',
                rewardSuppressedReason,
            },
            ...(Array.isArray(arenaProfile.recentLadderGames) ? arenaProfile.recentLadderGames : []),
        ]);

        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: setProfileArenaState(profile, arena, arenaProfile),
        });
        profileUpdates.push({
            updateOne: {
                filter: { _id: user._id },
                update: {
                    $set: {
                        profile: normalizedProfile,
                    },
                },
            },
        });

        if (clanExpDelta > 0) {
            const clanName = String(profile.clan?.name || '').trim();
            const clanKey = clanName.toLowerCase();
            if (clanKey) {
                const currentClanGain = clanExperienceByName.get(clanKey) || {
                    name: clanName,
                    gain: 0,
                };
                currentClanGain.gain += clanExpDelta;
                clanExperienceByName.set(clanKey, currentClanGain);
            }
        }

        preliminaryResults.set(username, {
            didWin,
            expDelta,
            clanExpDelta,
            unlockPointDelta,
            rewardSuppressedReason,
            previousExperiencePoints,
            previousUnlockPoints: initialArenaProfiles.get(username)?.missions?.unlockPoints || 0,
            previousLevel: initialArenaProfiles.get(username)?.ladder?.level || 1,
            previousRank: initialArenaProfiles.get(username)?.ladder?.rank || 'Academy Student',
        });
    }

    if (profileUpdates.length > 0) {
        await usersCollection.bulkWrite(profileUpdates, { ordered: false });
    }
    for (const clanGain of clanExperienceByName.values()) {
        await addClanExperience(clanGain.name, clanGain.gain);
    }

    const refreshedProfiles = await recalculatePlayerLadderStandings(arena);
    const results = {};
    usernames.forEach((username) => {
        const prelim = preliminaryResults.get(username);
        const finalProfile = refreshedProfiles.get(username);
        if (!prelim || !finalProfile) {
            return;
        }
        results[username] = {
            didWin: prelim.didWin,
            expDelta: prelim.expDelta,
            clanExpDelta: prelim.clanExpDelta || 0,
            unlockPointDelta: prelim.unlockPointDelta || 0,
            rewardSuppressedReason: prelim.rewardSuppressedReason || '',
            previousExperiencePoints: prelim.previousExperiencePoints,
            currentExperiencePoints: getProfileArenaState(finalProfile, arena).ladder.experiencePoints,
            previousUnlockPoints: prelim.previousUnlockPoints || 0,
            currentUnlockPoints: getProfileArenaState(finalProfile, arena).missions.unlockPoints || 0,
            previousLevel: prelim.previousLevel,
            currentLevel: getProfileArenaState(finalProfile, arena).ladder.level,
            previousRank: prelim.previousRank,
            currentRank: getProfileArenaState(finalProfile, arena).ladder.rank,
            ladderRank: getProfileArenaState(finalProfile, arena).ladder.ladderRank || null,
            rankHatUrl: getProfileArenaState(finalProfile, arena).ladder.rankHatUrl || '',
        };
    });

    return results;
};

const applyRewardsToPersistedMatch = async (match) => {
    if (!match || match.status !== 'ended') {
        throw new Error('Match rewards require a persisted ended match.');
    }
    if (match.rewardsAppliedAt) {
        return match.ladderResults || null;
    }
    const ladderResults = await applyMatchCompletionRewards(
        match,
        match.winner || null,
        match.endedAt || new Date()
    );
    const rewardsAppliedAt = new Date();
    match.ladderResults = ladderResults || null;
    match.rewardsAppliedAt = rewardsAppliedAt;
    await persistMatchState(match, {
        ladderResults: match.ladderResults,
        rewardsAppliedAt,
    });
    return ladderResults;
};

const serializeUserForClient = (user = {}) => {
    const savedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena(user);
    return {
        username: user.username,
        email: user.email,
        role: user.role || 'player',
        createdAt: user.createdAt,
        savedTeamIndices: savedTeamIndicesByArena.comic,
        savedTeamIndicesByArena,
        profile: normalizeUserProfile(user),
    };
};

const serializePublicUserProfile = (user = {}) => ({
    username: user.username,
    role: user.role || 'player',
    createdAt: user.createdAt,
    profile: normalizeUserProfile(user),
});

const serializeArenaProfileForClient = (profile = {}, arena = DEFAULT_ARENA_MODE) => {
    const normalizedProfile = normalizeUserProfile({ profile });
    const arenaState = getProfileArenaState(normalizedProfile, arena);
    return {
        ...normalizedProfile,
        recentQuickGames: arenaState.recentQuickGames,
        recentPrivateGames: arenaState.recentPrivateGames,
        recentLadderGames: arenaState.recentLadderGames,
        recentQuickGamesCount24Hours: arenaState.recentQuickGamesCount24Hours,
        recentPrivateGamesCount24Hours: arenaState.recentPrivateGamesCount24Hours,
        recentLadderGamesCount24Hours: arenaState.recentLadderGamesCount24Hours,
        missions: arenaState.missions,
        skins: arenaState.skins,
        ladder: arenaState.ladder,
    };
};

const buildBattleProfileSnapshot = (profile = {}, arena = DEFAULT_ARENA_MODE) => {
    if (profile?.battleSnapshotVersion === 1) {
        return cloneSerializable(profile);
    }
    const serialized = serializeArenaProfileForClient(profile, arena);
    const ladder =
        serialized?.ladder && typeof serialized.ladder === 'object' ? serialized.ladder : {};
    const clan = serialized?.clan && typeof serialized.clan === 'object' ? serialized.clan : null;
    const equippedSkins =
        serialized?.skins?.equippedSkinByCharacterId &&
        typeof serialized.skins.equippedSkinByCharacterId === 'object'
            ? serialized.skins.equippedSkinByCharacterId
            : {};
    return {
        battleSnapshotVersion: 1,
        avatarUrl: serialized?.avatarUrl || DEFAULT_PROFILE_AVATAR,
        clan: clan
            ? {
                name: clan.name || '',
                abbreviation: clan.abbreviation || '',
                avatarUrl: clan.avatarUrl || '',
                rankKey: clan.rankKey || '',
                rankName: clan.rankName || '',
            }
            : null,
        ladder: {
            level: Number(ladder.level) || 1,
            rank: ladder.rank || 'Academy Student',
            ladderRank: Number(ladder.ladderRank) || null,
            rankHatUrl: ladder.rankHatUrl || '',
        },
        skins: {
            equippedSkinByCharacterId: cloneSerializable(equippedSkins),
        },
    };
};

const serializeCommunityUserSummary = (user = {}) => {
    const profile = normalizeUserProfile(user);
    const wins = Number(profile?.ladder?.wins) || 0;
    const losses = Number(profile?.ladder?.losses) || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(1)) : 0;
    return {
        username: typeof user.username === 'string' ? user.username : '',
        role: typeof user.role === 'string' ? user.role : 'player',
        createdAt: user.createdAt || null,
        avatarUrl: profile?.avatarUrl || DEFAULT_PROFILE_AVATAR,
        clan: profile?.clan
            ? {
                  name: profile.clan.name || '',
                  abbreviation: profile.clan.abbreviation || '',
                  rank: profile.clan.rank || '',
                  avatarUrl: profile.clan.avatarUrl || '',
              }
            : null,
        ladder: {
            level: Number(profile?.ladder?.level) || 1,
            rank: profile?.ladder?.rank || 'Academy Student',
            ladderRank: Number.isFinite(Number(profile?.ladder?.ladderRank))
                ? Number(profile.ladder.ladderRank)
                : null,
            wins,
            losses,
            totalGames,
            winRate,
            streak: Number(profile?.ladder?.streak) || 0,
            highestStreak: Number(profile?.ladder?.highestStreak) || 0,
        },
    };
};

const serializeAdminUserDocument = (user = {}) => {
    const savedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena(user);
    return {
        username: user.username,
        usernameLower: user.usernameLower,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role || 'player',
        createdAt: user.createdAt,
        savedTeamIndices: savedTeamIndicesByArena.comic,
        savedTeamIndicesByArena,
        profile: normalizeUserProfile(user),
    };
};

const normalizeNewsParagraphs = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .slice(0, 100);

const buildCharacterCatalog = () =>
    charactersData.map((character = {}) => ({
        characterId: typeof character.characterId === 'string' ? character.characterId : '',
        name: typeof character.name === 'string' ? character.name : '',
        facePicture: typeof character.facePicture === 'string' ? character.facePicture : '',
        role: typeof character.role === 'string' ? character.role : '',
        roleCategory: typeof character.roleCategory === 'string' ? character.roleCategory : '',
        universe: typeof character.universe === 'string' ? character.universe : '',
        skills: (Array.isArray(character.skills) ? character.skills : []).map((skill = {}) => ({
            id: typeof skill.id === 'string' ? skill.id : '',
            name: typeof skill.name === 'string' ? skill.name : '',
            skillimage: typeof skill.skillimage === 'string' ? skill.skillimage : '',
            classes: Array.isArray(skill.classes) ? skill.classes : [],
        })),
    }));

let characterCatalog = [];
let cachedCharactersBrowserPayload = '';
let cachedCharactersBrowserEtag = '';

const serializeCharactersDataFile = (nextCharacters) =>
    'const characters = ' +
    JSON.stringify(nextCharacters, null, 4) +
    ';\n\nif (typeof window !== \'undefined\') {\n    window.characters = characters;\n}\n\nif (typeof module !== \'undefined\') {\n    module.exports = characters;\n}\n';

const serializeCharactersBrowserPayload = (nextCharacters) =>
    'const characters=' +
    JSON.stringify(Array.isArray(nextCharacters) ? nextCharacters : []) +
    ';if(typeof window!=="undefined"){window.characters=characters;}';

const mirroredExternalImageUrls = (() => {
    try {
        const manifest = JSON.parse(
            fs.readFileSync(EXTERNAL_IMAGE_MIRROR_MANIFEST_PATH, 'utf8')
        );
        return new Map(
            Object.entries(manifest).map(([externalUrl, entry]) => [
                externalUrl,
                `/${String(entry?.localPath || '').replaceAll('\\', '/')}`,
            ])
        );
    } catch (error) {
        console.warn('Unable to load the external image mirror manifest:', error.message);
        return new Map();
    }
})();

const rewriteMirroredExternalImageUrls = (value) => {
    if (typeof value === 'string') {
        return mirroredExternalImageUrls.get(value) || value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => rewriteMirroredExternalImageUrls(entry));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
            key,
            rewriteMirroredExternalImageUrls(entry),
        ])
    );
};

const getCharacterRecordId = (character = {}) =>
    typeof character?.characterId === 'string' && character.characterId.trim()
        ? character.characterId.trim()
        : typeof character?.id === 'string' && character.id.trim()
            ? character.id.trim()
            : '';

const loadCharactersDataFromFile = () => {
    delete require.cache[require.resolve(CHARACTERS_FILE_PATH)];
    const fileCharacters = require(CHARACTERS_FILE_PATH);
    return Array.isArray(fileCharacters) ? fileCharacters : [];
};

const CANONICAL_CHARACTER_ASSET_PATCHES = new Map([
    [
        'billy-butcher',
        {
            facePicture: 'assets/images/billybutchernewfp.png',
            statusFacePictureOverrides: new Map([
                ['billy_butcher_v24_active', 'assets/images/billybutcherv24fp.png'],
            ]),
        },
    ],
    ['charmander', { facePicture: 'assets/images/PokemonArena/newcharmanderfp.jpeg' }],
    ['squirtle', { facePicture: 'assets/images/PokemonArena/newsquirtlefp.jpeg' }],
    ['pikachu', { facePicture: 'assets/images/PokemonArena/newpikachufp.jpeg' }],
]);

const applyCanonicalCharacterAssetPaths = (nextCharacters = []) =>
    (Array.isArray(nextCharacters) ? nextCharacters : []).map((character = {}) => {
        const characterId = getCharacterRecordId(character);
        const patch = CANONICAL_CHARACTER_ASSET_PATCHES.get(characterId);
        if (!patch) {
            return character;
        }

        const nextCharacter = {
            ...character,
            facePicture: patch.facePicture || character.facePicture,
        };

        if (patch.statusFacePictureOverrides instanceof Map && Array.isArray(character.skills)) {
            nextCharacter.skills = character.skills.map((skill = {}) => ({
                ...skill,
                effects: Array.isArray(skill.effects)
                    ? skill.effects.map((effect = {}) => {
                          const overridePath = patch.statusFacePictureOverrides.get(effect.statusId);
                          if (!overridePath) {
                              return effect;
                          }
                          return {
                              ...effect,
                              metadata: {
                                  ...(effect.metadata || {}),
                                  facePictureOverride: overridePath,
                              },
                          };
                      })
                    : skill.effects,
            }));
        }

        return nextCharacter;
    });

const mergeCharacterOverrideArraysByKey = (baseArray = [], overrideArray = [], key) => {
    const baseEntries = Array.isArray(baseArray) ? baseArray : [];
    const overrideEntries = Array.isArray(overrideArray) ? overrideArray : [];
    const overrideByKey = new Map();
    overrideEntries.forEach((entry) => {
        const entryKey = entry && typeof entry === 'object' ? entry?.[key] : '';
        if (entryKey) {
            overrideByKey.set(entryKey, entry);
        }
    });
    const merged = baseEntries.map((entry) => {
        const entryKey = entry && typeof entry === 'object' ? entry?.[key] : '';
        if (!entryKey || !overrideByKey.has(entryKey)) {
            return entry;
        }
        const overrideEntry = overrideByKey.get(entryKey);
        overrideByKey.delete(entryKey);
        return mergeCharacterOverrideValue(entry, overrideEntry, key);
    });
    overrideByKey.forEach((entry) => {
        merged.push(entry);
    });
    return merged;
};

const mergeCharacterOverrideEffects = (baseEffects = [], overrideEffects = []) => {
    const nextBaseEffects = Array.isArray(baseEffects) ? baseEffects : [];
    const nextOverrideEffects = Array.isArray(overrideEffects) ? overrideEffects : [];
    const maxLength = Math.max(nextBaseEffects.length, nextOverrideEffects.length);
    const merged = [];
    for (let index = 0; index < maxLength; index += 1) {
        const baseEntry = nextBaseEffects[index];
        const overrideEntry = nextOverrideEffects[index];
        if (overrideEntry === undefined) {
            merged.push(baseEntry);
            continue;
        }
        if (baseEntry === undefined) {
            merged.push(overrideEntry);
            continue;
        }
        merged.push(mergeCharacterOverrideValue(baseEntry, overrideEntry, 'effects'));
    }
    return merged;
};

const mergeCharacterOverrideValue = (baseValue, overrideValue, parentKey = '') => {
    if (overrideValue === undefined) {
        return baseValue;
    }
    if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
        if (parentKey === 'skills') {
            return mergeCharacterOverrideArraysByKey(baseValue, overrideValue, 'id');
        }
        if (parentKey === 'startStatuses') {
            return mergeCharacterOverrideArraysByKey(baseValue, overrideValue, 'statusId');
        }
        if (parentKey === 'effects') {
            return mergeCharacterOverrideEffects(baseValue, overrideValue);
        }
        return overrideValue;
    }
    if (
        baseValue &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue) &&
        overrideValue &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue)
    ) {
        const merged = { ...baseValue };
        Object.keys(overrideValue).forEach((key) => {
            merged[key] = mergeCharacterOverrideValue(baseValue?.[key], overrideValue[key], key);
        });
        return merged;
    }
    return overrideValue;
};

const mergeCharacterOverrideRecord = (baseCharacter, overrideCharacter) => {
    if (!baseCharacter || typeof baseCharacter !== 'object') {
        return overrideCharacter;
    }
    if (!overrideCharacter || typeof overrideCharacter !== 'object') {
        return baseCharacter;
    }
    return mergeCharacterOverrideValue(baseCharacter, overrideCharacter);
};

const applyRequiredCanonicalSkillCorrections = (mergedCharacters = [], canonicalCharacters = []) => {
    const requiredFieldsByCharacterAndSkill = {
        magnemite: {
            'magneton-flash-cannon': ['skilldescription'],
        },
        koffing: {
            'koffing-smokescreen': ['energy'],
            'koffing-weezing-smokescreen': ['energy'],
            'koffing-weezing-self-destruct': ['useBaseSkillCooldown'],
        },
        abra: {
            'abra-teleport': ['target'],
            'kadabra-teleport': ['target'],
        },
        squirtle: {
            'wartortle-shell-guard': ['target', 'skilldescription'],
        },
        bulbasaur: {
            'bulbasaur-leech-seed': ['skilldescription', 'effects'],
            'ivysaur-leech-seed': ['skilldescription', 'effects'],
        },
        zubat: {
            'zubat-leech-life': ['skilldescription'],
            'golbat-leech-life': ['skilldescription'],
        },
        mewtwo: {
            'mewtwo-psychic': ['skilldescription', 'description'],
            'mewtwo-shadow-ball': ['skilldescription', 'description'],
            'mewtwo-drain-punch': ['skilldescription', 'description'],
        },
        'pokemon-trainer': {
            'pokemon-trainer-potion': ['skilldescription', 'energy', 'cooldown', 'maxUses', 'effects'],
            'pokemon-trainer-x-stats': ['skilldescription', 'effects'],
            'pokemon-trainer-revive': ['skilldescription', 'target', 'effects'],
        },
        machop: {
            'machop-brick-break': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machop-counter': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machop-bulk-up': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machop-taunt': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machop-passive-evolution-machoke': ['skilldescription', 'energy', 'target', 'cooldown', 'classes'],
            'machoke-brick-break': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machoke-counter': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machoke-bulk-up': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
            'machoke-taunt': ['skilldescription', 'energy', 'target', 'cooldown', 'classes', 'effects'],
        },
        pidgey: {
            'pidgey-passive-evolution-pidgeotto': ['skilldescription'],
        },
        gastly: {
            'gastly-passive-evolution-haunter': ['skilldescription'],
        },
        scyther: {
            'scyther-fury-cutter': ['skilldescription', 'effects'],
            'scyther-swords-dance': ['skilldescription', 'effects'],
            'scyther-x-cutter': ['skilldescription', 'effects'],
            'scyther-double-team': ['skilldescription', 'cooldown', 'effects'],
        },
    };
    const canonicalById = new Map(
        (Array.isArray(canonicalCharacters) ? canonicalCharacters : []).map((character) => [
            getCharacterRecordId(character),
            character,
        ])
    );
    return (Array.isArray(mergedCharacters) ? mergedCharacters : []).map((character) => {
        const characterId = getCharacterRecordId(character);
        const requiredSkillFields = requiredFieldsByCharacterAndSkill[characterId];
        const canonicalCharacter = canonicalById.get(characterId);
        if (!requiredSkillFields || !canonicalCharacter) return character;
        const canonicalSkillById = new Map(
            (Array.isArray(canonicalCharacter.skills) ? canonicalCharacter.skills : []).map((skill) => [skill?.id, skill])
        );
        const correctedCharacter = {
            ...character,
            skills: (Array.isArray(character.skills) ? character.skills : []).map((skill) => {
                const fields = requiredSkillFields[skill?.id];
                const canonicalSkill = canonicalSkillById.get(skill?.id);
                if (!Array.isArray(fields) || !canonicalSkill) return skill;
                const correctedSkill = { ...skill };
                fields.forEach((field) => {
                    if (canonicalSkill[field] !== undefined) correctedSkill[field] = canonicalSkill[field];
                });
                if (
                    characterId === 'zubat' &&
                    (skill?.id === 'zubat-leech-life' || skill?.id === 'golbat-leech-life') &&
                    Array.isArray(canonicalSkill.effects)
                ) {
                    const canonicalBaseSteal = canonicalSkill.effects.find(
                        (effect) => effect?.type === 'health_steal_damage' && !effect?.condition
                    );
                    const mergedBaseStealIndex = Array.isArray(skill.effects)
                        ? skill.effects.findIndex(
                            (effect) => effect?.type === 'health_steal_damage' && !effect?.condition
                        )
                        : -1;
                    if (canonicalBaseSteal && mergedBaseStealIndex >= 0) {
                        correctedSkill.effects = skill.effects.slice();
                        correctedSkill.effects[mergedBaseStealIndex] = {
                            ...skill.effects[mergedBaseStealIndex],
                            amount: canonicalBaseSteal.amount,
                        };
                    }
                }
                const isCanonicalDualRecipientSkill =
                    (
                        characterId === 'abra' &&
                        (skill?.id === 'abra-teleport' || skill?.id === 'kadabra-teleport')
                    ) ||
                    (
                        characterId === 'squirtle' &&
                        skill?.id === 'wartortle-shell-guard'
                    );
                if (isCanonicalDualRecipientSkill && Array.isArray(canonicalSkill.effects)) {
                    const mergedEffects = Array.isArray(skill.effects) ? skill.effects : [];
                    const canonicalFamilies = canonicalSkill.effects.map((effect) => ({
                        type: effect?.type || '',
                        statusId: effect?.statusId || '',
                    }));
                    const findCompatibleEffect = (canonicalEffect) =>
                        mergedEffects.find(
                            (effect) =>
                                effect?.type === canonicalEffect?.type &&
                                (effect?.statusId || '') === (canonicalEffect?.statusId || '')
                        ) ||
                        mergedEffects.find(
                            (effect) =>
                                canonicalEffect?.statusId && effect?.statusId === canonicalEffect.statusId
                        ) ||
                        mergedEffects.find((effect) => effect?.type === canonicalEffect?.type) ||
                        {};
                    const requiredShapeFields = ['type', 'statusId', 'duration', 'scope', 'sourceRelation'];
                    correctedSkill.effects = canonicalSkill.effects.map((canonicalEffect) => {
                        const compatibleEffect = findCompatibleEffect(canonicalEffect);
                        const correctedEffect = {
                            ...canonicalEffect,
                            ...compatibleEffect,
                            metadata: {
                                ...(canonicalEffect?.metadata || {}),
                                ...(compatibleEffect?.metadata || {}),
                            },
                        };
                        requiredShapeFields.forEach((field) => {
                            if (canonicalEffect[field] !== undefined) {
                                correctedEffect[field] = canonicalEffect[field];
                            } else {
                                delete correctedEffect[field];
                            }
                        });
                        if (
                            characterId === 'squirtle' &&
                            skill?.id === 'wartortle-shell-guard'
                        ) {
                            delete correctedEffect.metadata.harmful;
                            delete correctedEffect.metadata.onEnemySkillTargetedHarmfulOnly;
                            delete correctedEffect.metadata.onEnemySkillTargetedApplyStatusToOwner;
                        }
                        return correctedEffect;
                    });
                    mergedEffects.forEach((effect) => {
                        const belongsToTeleportStructure = canonicalFamilies.some(
                            (family) =>
                                (family.statusId && effect?.statusId === family.statusId) ||
                                effect?.type === family.type
                        );
                        if (!belongsToTeleportStructure) correctedSkill.effects.push(effect);
                    });
                }
                if (
                    characterId === 'mewtwo' &&
                    Array.isArray(canonicalSkill.effects)
                ) {
                    const comboStatusIds = new Set([
                        'mewtwo_psychic_followup',
                        'mewtwo_drain_punch_followup',
                        'mewtwo_shadow_ball_followup',
                    ]);
                    const isComboEffect = (effect) =>
                        comboStatusIds.has(effect?.statusId) ||
                        comboStatusIds.has(effect?.condition?.statusId);
                    const preservedOverrideEffects = (Array.isArray(correctedSkill.effects)
                        ? correctedSkill.effects
                        : []
                    ).filter((effect) => !isComboEffect(effect));
                    const canonicalComboEffects = canonicalSkill.effects.filter(isComboEffect);
                    correctedSkill.effects = [
                        ...preservedOverrideEffects,
                        ...canonicalComboEffects,
                    ];
                }
                return correctedSkill;
            }),
        };
        if (characterId === 'pokemon-trainer') {
            const canonicalBallCycle = (Array.isArray(canonicalCharacter.startStatuses)
                ? canonicalCharacter.startStatuses
                : []
            ).find((status) => status?.statusId === 'pokemon_trainer_ball_cycle');
            correctedCharacter.startStatuses = (Array.isArray(character.startStatuses)
                ? character.startStatuses
                : []
            ).map((status) => {
                if (status?.statusId !== 'pokemon_trainer_ball_cycle' || !canonicalBallCycle) {
                    return status;
                }
                return {
                    ...status,
                    metadata: {
                        ...(status.metadata || {}),
                        tooltipText: canonicalBallCycle.metadata?.tooltipText,
                        turnStartApplyRandomSkillReplacementToOwner:
                            canonicalBallCycle.metadata?.turnStartApplyRandomSkillReplacementToOwner,
                    },
                };
            });
        }
        if (characterId === 'machop') {
            ['characterdeescription', 'description', 'descriptionHtml', 'role', 'roleCategory'].forEach(
                (field) => {
                    if (canonicalCharacter[field] !== undefined) {
                        correctedCharacter[field] = canonicalCharacter[field];
                    }
                }
            );
        }
        const canonicalEvolutionTrackerStatusId = {
            pidgey: 'pidgey_evolution_tracker',
            gastly: 'gastly_evolution_tracker',
        }[characterId];
        if (canonicalEvolutionTrackerStatusId) {
            const canonicalTracker = (Array.isArray(canonicalCharacter.startStatuses)
                ? canonicalCharacter.startStatuses
                : []
            ).find((status) => status?.statusId === canonicalEvolutionTrackerStatusId);
            const mergedStartStatuses = Array.isArray(character.startStatuses)
                ? character.startStatuses
                : [];
            correctedCharacter.startStatuses = mergedStartStatuses.map((status) => {
                if (status?.statusId !== canonicalEvolutionTrackerStatusId || !canonicalTracker) {
                    return status;
                }
                return {
                    ...status,
                    ...canonicalTracker,
                    metadata: {
                        ...(status.metadata || {}),
                        ...(canonicalTracker.metadata || {}),
                    },
                };
            });
        }
        return correctedCharacter;
    });
};

const applyCharacterOverrides = (baseCharacters = []) => {
    const nextCharacters = (Array.isArray(baseCharacters) ? baseCharacters : []).slice();
    characterOverrideCache.forEach((overrideCharacter, characterId) => {
        if (!characterId || !overrideCharacter || typeof overrideCharacter !== 'object') {
            return;
        }
        const existingIndex = nextCharacters.findIndex(
            (entry) => getCharacterRecordId(entry) === characterId
        );
        if (existingIndex === -1) {
            nextCharacters.push(overrideCharacter);
            return;
        }
        nextCharacters[existingIndex] = mergeCharacterOverrideRecord(
            nextCharacters[existingIndex],
            overrideCharacter
        );
    });
    return applyPokemonTypeSystem(
        applyCanonicalCharacterAssetPaths(
            applyRequiredCanonicalSkillCorrections(nextCharacters, baseCharacters)
        ),
        { strict: true }
    );
};

const rebuildCharacterCatalog = (nextCharacters) => {
    charactersData = rewriteMirroredExternalImageUrls(
        Array.isArray(nextCharacters) ? nextCharacters : []
    );
    characterCatalog = buildCharacterCatalog();
    cachedCharactersBrowserPayload = serializeCharactersBrowserPayload(charactersData);
    cachedCharactersBrowserEtag = `"${crypto
        .createHash('sha256')
        .update(cachedCharactersBrowserPayload)
        .digest('base64url')}"`;
};

rebuildCharacterCatalog(charactersData);

const normalizeStoredCharacterOverrides = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            const character =
                entry && typeof entry === 'object' && entry.character && typeof entry.character === 'object'
                    ? entry.character
                    : entry;
            const characterId = getCharacterRecordId(character);
            return characterId ? { characterId, character } : null;
        })
        .filter(Boolean);

const loadStoredCharacterOverrides = async () => {
    if (!appStateCollection) {
        characterOverrideCache = new Map();
        return characterOverrideCache;
    }

    const state = await appStateCollection.findOne({ key: CHARACTER_OVERRIDES_STATE_KEY });
    const overrides = normalizeStoredCharacterOverrides(
        state && Array.isArray(state.overrides)
            ? state.overrides
            : state?.value && Array.isArray(state.value.overrides)
                ? state.value.overrides
                : []
    );
    characterOverrideCache = new Map(
        overrides.map((entry) => [entry.characterId, entry.character])
    );
    return characterOverrideCache;
};

const hydrateCharactersDataFromStoredOverrides = async () => {
    await loadStoredCharacterOverrides();
    const fileCharacters = loadCharactersDataFromFile();
    const mergedCharacters = applyCharacterOverrides(fileCharacters);
    rebuildCharacterCatalog(mergedCharacters);

    if (characterOverrideCache.size > 0) {
        try {
            await fs.promises.writeFile(
                CHARACTERS_FILE_PATH,
                serializeCharactersDataFile(mergedCharacters),
                'utf8'
            );
        } catch (error) {
            console.error('Character data startup file sync error:', error);
        }
    }
};

const saveCharacterOverride = async ({ character, previousCharacterId = '', updatedBy = '' }) => {
    if (!appStateCollection || !character || typeof character !== 'object') {
        return;
    }
    const characterId = getCharacterRecordId(character);
    if (!characterId) {
        return;
    }

    characterOverrideCache.set(characterId, character);
    if (previousCharacterId && previousCharacterId !== characterId) {
        characterOverrideCache.delete(previousCharacterId);
    }

    const now = new Date();
    const overrides = Array.from(characterOverrideCache.entries()).map(([id, overrideCharacter]) => ({
        characterId: id,
        character: overrideCharacter,
        updatedAt: now,
        updatedBy: updatedBy || '',
    }));

    await appStateCollection.updateOne(
        { key: CHARACTER_OVERRIDES_STATE_KEY },
        {
            $set: {
                key: CHARACTER_OVERRIDES_STATE_KEY,
                overrides,
                updatedAt: now,
                updatedBy: updatedBy || '',
            },
        },
        { upsert: true }
    );
};

const saveCharactersDataFile = async (nextCharacters, options = {}) => {
    const canonicalCharacters = loadCharactersDataFromFile();
    const correctedCharacters = applyPokemonTypeSystem(
        applyCanonicalCharacterAssetPaths(
            applyRequiredCanonicalSkillCorrections(nextCharacters, canonicalCharacters)
        ),
        { strict: true }
    );
    const serialized = serializeCharactersDataFile(correctedCharacters);
    await fs.promises.writeFile(CHARACTERS_FILE_PATH, serialized, 'utf8');
    rebuildCharacterCatalog(correctedCharacters);
    if (options.characterOverride) {
        await saveCharacterOverride({
            character: options.characterOverride,
            previousCharacterId: options.previousCharacterId,
            updatedBy: options.updatedBy,
        });
    }
};

const runGitCommand = (args) =>
    execFilePromise('git', args, {
        cwd: __dirname,
        maxBuffer: 10 * 1024 * 1024,
    });

const getGitCommandOutput = async (args) => {
    const result = await runGitCommand(args);
    return String(result?.stdout || '').trim();
};

const getConfiguredGitPushTarget = async () => {
    const configuredRemote = String(
        process.env.GIT_PUSH_REMOTE ||
            process.env.GITHUB_PUSH_REMOTE ||
            process.env.GITHUB_REMOTE ||
            ''
    ).trim();
    const configuredBranch = String(
        process.env.GIT_PUSH_BRANCH ||
            process.env.GITHUB_PUSH_BRANCH ||
            process.env.RENDER_GIT_BRANCH ||
            process.env.BRANCH ||
            ''
    ).trim();

    const remoteList = (await getGitCommandOutput(['remote']).catch(() => ''))
        .split(/\s+/)
        .map((remote) => remote.trim())
        .filter(Boolean);
    const currentBranch = await getGitCommandOutput(['branch', '--show-current']).catch(() => '');
    const upstreamRemote = currentBranch
        ? await getGitCommandOutput(['config', '--get', `branch.${currentBranch}.remote`]).catch(() => '')
        : '';
    const upstreamMerge = currentBranch
        ? await getGitCommandOutput(['config', '--get', `branch.${currentBranch}.merge`]).catch(() => '')
        : '';
    const upstreamBranch = upstreamMerge.replace(/^refs\/heads\//, '').trim();
    const remote =
        configuredRemote ||
        upstreamRemote ||
        (remoteList.includes('kitos-comic-arena') ? 'kitos-comic-arena' : '') ||
        (remoteList.includes('origin') ? 'origin' : '') ||
        remoteList[0] ||
        '';
    const branch = configuredBranch || upstreamBranch || currentBranch || 'main';

    if (!remote) {
        throw new Error('No Git remote is configured. Set GIT_PUSH_REMOTE or add a repository remote.');
    }

    return { remote, branch };
};

const syncCharactersDataToGitHub = async ({ updatedBy = '' } = {}) => {
    await runGitCommand(['add', '--', 'characters.js']);
    let hasStagedCharacterChanges = false;
    try {
        await runGitCommand(['diff', '--cached', '--quiet', '--', 'characters.js']);
    } catch (error) {
        if (error && error.code === 1) {
            hasStagedCharacterChanges = true;
        } else {
            throw error;
        }
    }

    if (!hasStagedCharacterChanges) {
        return {
            committed: false,
            pushed: false,
            message: 'No character file changes to commit.',
        };
    }

    const safeUsername = String(updatedBy || 'admin').replace(/\s+/g, ' ').trim() || 'admin';
    await runGitCommand(['commit', '-m', `Admin: Update character data by ${safeUsername}`]);
    const pushTarget = await getConfiguredGitPushTarget();
    await runGitCommand(['push', pushTarget.remote, `HEAD:${pushTarget.branch}`]);
    return {
        committed: true,
        pushed: true,
        message: `Changes committed and pushed to ${pushTarget.remote}/${pushTarget.branch}.`,
    };
};

const refreshCharactersDataFromFile = () => {
    // Optimization: Only reload from file if we don't have data yet
    // Otherwise, rely on rebuildCharacterCatalog calls during saves
    if (!Array.isArray(charactersData) || charactersData.length === 0) {
        try {
            rebuildCharacterCatalog(applyCharacterOverrides(loadCharactersDataFromFile()));
        } catch (error) {
            console.error('Character data refresh error:', error);
        }
    }
    return Array.isArray(charactersData) ? charactersData : [];
};

const resolveNewsChangeAssets = (entry = {}) => {
    const characterId = typeof entry.characterId === 'string' ? entry.characterId.trim() : '';
    const skillId = typeof entry.skillId === 'string' ? entry.skillId.trim() : '';
    const characterName = typeof entry.characterName === 'string' ? entry.characterName.trim() : '';
    const skillName = typeof entry.skillName === 'string' ? entry.skillName.trim() : '';

    const character = characterCatalog.find((item) =>
        (characterId && item.characterId === characterId) ||
        (characterName && item.name.toLowerCase() === characterName.toLowerCase())
    );
    const skill = character && character.skills
        ? character.skills.find((item) =>
            (skillId && item.id === skillId) ||
            (skillName && item.name.toLowerCase() === skillName.toLowerCase())
        )
        : null;

    return {
        characterId: character ? character.characterId : characterId,
        characterName: character ? character.name : characterName,
        facePicture:
            typeof entry.facePicture === 'string' && entry.facePicture.trim()
                ? entry.facePicture.trim()
                : character
                ? character.facePicture
                : '',
        skillId: skill ? skill.id : skillId,
        skillName:
            typeof entry.skillName === 'string' && entry.skillName.trim()
                ? entry.skillName.trim()
                : skill
                ? skill.name
                : skillName,
        skillimage:
            typeof entry.skillimage === 'string' && entry.skillimage.trim()
                ? entry.skillimage.trim()
                : skill
                ? skill.skillimage
                : '',
    };
};

const normalizeNewsChanges = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => {
            if (typeof entry === 'string') {
                const text = entry.trim();
                return text ? { text } : null;
            }
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const text = typeof entry.text === 'string' ? entry.text.trim() : '';
            if (!text) {
                return null;
            }
            const assets = resolveNewsChangeAssets(entry);
            return {
                text,
                changeType:
                    typeof entry.changeType === 'string' && entry.changeType.trim()
                        ? entry.changeType.trim().toLowerCase()
                        : '',
                groupKey:
                    typeof entry.groupKey === 'string' && entry.groupKey.trim()
                        ? entry.groupKey.trim()
                        : '',
                groupName:
                    typeof entry.groupName === 'string' && entry.groupName.trim()
                        ? entry.groupName.trim()
                        : '',
                collapsible: Boolean(entry.collapsible),
                characterId: assets.characterId,
                characterName: assets.characterName,
                facePicture: assets.facePicture,
                skillId: assets.skillId,
                skillName: assets.skillName,
                skillimage: assets.skillimage,
            };
        })
        .filter(Boolean)
        .slice(0, 200);

const normalizeNewsBlocks = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => ({
            type: typeof entry?.type === 'string' ? entry.type.trim().toLowerCase() : 'paragraph',
            text: typeof entry?.text === 'string' ? entry.text.trim() : '',
        }))
        .filter((entry) => entry.type === 'divider' || (entry.type === 'paragraph' && entry.text))
        .slice(0, 200);

const normalizeNewsArena = (post = {}) => {
    const explicitArena = typeof post.arena === 'string' ? post.arena.trim().toLowerCase() : '';
    if (explicitArena === 'pokemon' || explicitArena === 'comic') {
        return explicitArena;
    }
    return /pokemon\s*arena/i.test(typeof post.title === 'string' ? post.title : '')
        ? 'pokemon'
        : 'comic';
};

const serializeNewsPost = (post = {}) => ({
    id: post._id ? String(post._id) : '',
    title: typeof post.title === 'string' ? post.title : 'Untitled Post',
    paragraphs: normalizeNewsParagraphs(post.paragraphs),
    changes: normalizeNewsChanges(post.changes),
    blocks: normalizeNewsBlocks(post.blocks),
    arena: normalizeNewsArena(post),
    author: typeof post.author === 'string' ? post.author : 'Unknown',
    createdAt: post.createdAt || null,
    updatedAt: post.updatedAt || null,
});

const buildPublicClanProfile = async (requestedClanName = '') => {
    const normalizedRequestedName = typeof requestedClanName === 'string' ? requestedClanName.trim().toLowerCase() : '';
    if (!normalizedRequestedName) {
        return null;
    }

    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    const clanMap = new Map();
    users.forEach((user = {}) => {
        const normalizedUser = {
            username: user.username,
            createdAt: user.createdAt,
            profile: normalizeUserProfile(user),
        };
        const clan = normalizedUser.profile.clan;
        if (!clan || !clan.name) {
            return;
        }

        const clanKey = String(clan.name || '').trim().toLowerCase();
        if (!clanKey) {
            return;
        }

        if (!clanMap.has(clanKey)) {
            clanMap.set(clanKey, {
                key: clanKey,
                name: clan.name,
                abbreviation: clan.abbreviation || '',
                avatarUrl: clan.avatarUrl || '',
                bio: clan.bio || '',
                experiencePoints: Math.max(0, Number(clan.experiencePoints) || 0),
                createdBy: clan.createdBy || '',
                createdAt: clan.createdAt || normalizedUser.createdAt || null,
                totalLevel: 0,
                totalExperiencePoints: 0,
                totalWins: 0,
                totalLosses: 0,
                members: [],
            });
        }

        const bucket = clanMap.get(clanKey);
        const ladder = normalizedUser.profile.ladder || {};
        bucket.name = bucket.name || clan.name;
        bucket.abbreviation = bucket.abbreviation || clan.abbreviation || '';
        bucket.avatarUrl = bucket.avatarUrl || clan.avatarUrl || '';
        bucket.bio = bucket.bio || clan.bio || '';
        bucket.experiencePoints = Math.max(
            Number(bucket.experiencePoints) || 0,
            Number(clan.experiencePoints) || 0
        );
        bucket.createdBy = bucket.createdBy || clan.createdBy || '';
        bucket.createdAt = bucket.createdAt || clan.createdAt || normalizedUser.createdAt || null;
        bucket.totalLevel += Number(ladder.level) || 0;
        bucket.totalExperiencePoints += Number(ladder.experiencePoints) || 0;
        bucket.totalWins += Number(ladder.wins) || 0;
        bucket.totalLosses += Number(ladder.losses) || 0;
        bucket.members.push({
            username: normalizedUser.username,
            avatarUrl: normalizedUser.profile.avatarUrl || DEFAULT_PROFILE_AVATAR,
            level: Number(ladder.level) || 1,
            joinedAt: clan.joinedAt || null,
            rankKey: clan.rankKey || 'member',
            rank: clan.rank || resolveBaseClanRankLabel(clan.rankKey || 'member'),
        });
    });

    const clans = Array.from(clanMap.values()).sort((left, right) => {
        const leftClanLadder = deriveLadderStateFromExperience(left.experiencePoints || 0);
        const rightClanLadder = deriveLadderStateFromExperience(right.experiencePoints || 0);
        if (rightClanLadder.level !== leftClanLadder.level) {
            return rightClanLadder.level - leftClanLadder.level;
        }
        if ((right.experiencePoints || 0) !== (left.experiencePoints || 0)) {
            return (right.experiencePoints || 0) - (left.experiencePoints || 0);
        }
        return String(left.name || '').localeCompare(String(right.name || ''));
    });

    const targetClan = clans.find((entry) => entry.key === normalizedRequestedName);
    if (!targetClan) {
        return null;
    }

    const ladderRank = clans.findIndex((entry) => entry.key === targetClan.key) + 1;
    const totalGames = targetClan.totalWins + targetClan.totalLosses;
    const winPercentage = totalGames > 0 ? Number(((targetClan.totalWins / totalGames) * 100).toFixed(2)) : 0;
    const rankOrder = {
        clanLeader: 0,
        leader: 1,
        captain: 2,
        lieutenant: 3,
        member: 4,
        trial: 5,
    };

    targetClan.members.sort((left, right) => {
        const leftRankOrder =
            Object.prototype.hasOwnProperty.call(rankOrder, left.rankKey) ? rankOrder[left.rankKey] : rankOrder.member;
        const rightRankOrder =
            Object.prototype.hasOwnProperty.call(rankOrder, right.rankKey)
                ? rankOrder[right.rankKey]
                : rankOrder.member;
        if (leftRankOrder !== rightRankOrder) {
            return leftRankOrder - rightRankOrder;
        }
        return String(left.username || '').localeCompare(String(right.username || ''));
    });

    const clanLadderState = deriveLadderStateFromExperience(targetClan.experiencePoints || 0);

    return {
        name: targetClan.name,
        abbreviation: targetClan.abbreviation,
        avatarUrl: targetClan.avatarUrl,
        bio: targetClan.bio,
        createdBy: targetClan.createdBy,
        createdAt: targetClan.createdAt,
        ladder: {
            level: clanLadderState.level,
            experiencePoints: Math.max(0, targetClan.totalExperiencePoints || 0),
            clanExperiencePoints: Math.max(0, targetClan.experiencePoints || 0),
            experienceIntoLevel: clanLadderState.experienceIntoLevel,
            experienceForNextLevel: clanLadderState.experienceForNextLevel,
            experienceToNextLevel: clanLadderState.experienceToNextLevel,
            ladderRank: ladderRank > 0 ? ladderRank : null,
            wins: Math.max(0, targetClan.totalWins || 0),
            losses: Math.max(0, targetClan.totalLosses || 0),
            winPercentage,
        },
        members: targetClan.members,
    };
};

const buildSidebarLeaderboards = async (arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    username: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    const normalizedUsers = users.map((user) => ({
        username: user.username,
        profile: normalizeUserProfile(user),
    }));

    const byNumberDescThenName = (getValue) => (left, right) => {
        const leftValue = Number(getValue(left)) || 0;
        const rightValue = Number(getValue(right)) || 0;
        if (rightValue !== leftValue) {
            return rightValue - leftValue;
        }
        return String(left.username || '').localeCompare(String(right.username || ''));
    };

    const topPlayerLevels = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => getProfileArenaState(entry.profile, normalizedArena).ladder.level))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: getProfileArenaState(entry.profile, normalizedArena).ladder.level,
            progressPercent: getLevelProgressPercent(
                getProfileArenaState(entry.profile, normalizedArena).ladder.experienceIntoLevel,
                getProfileArenaState(entry.profile, normalizedArena).ladder.experienceForNextLevel,
                getProfileArenaState(entry.profile, normalizedArena).ladder.level
            ),
        }));

    const topCurrentStreaks = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => getProfileArenaState(entry.profile, normalizedArena).ladder.streak))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: getProfileArenaState(entry.profile, normalizedArena).ladder.streak,
        }));

    const topWins = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => getProfileArenaState(entry.profile, normalizedArena).ladder.wins))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: getProfileArenaState(entry.profile, normalizedArena).ladder.wins,
        }));

    const topHighestStreaks = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => getProfileArenaState(entry.profile, normalizedArena).ladder.highestStreak))
        .slice(0, 20)
        .map((entry) => ({
            username: entry.username,
            value: getProfileArenaState(entry.profile, normalizedArena).ladder.highestStreak,
        }));

    const clansByName = new Map();
    normalizedUsers.forEach((entry) => {
        const clan = entry.profile.clan;
        const clanName = typeof clan?.name === 'string' ? clan.name.trim() : '';
        if (!clanName) {
            return;
        }
        const existing = clansByName.get(clanName) || {
            clanName,
            abbreviation: typeof clan?.abbreviation === 'string' ? clan.abbreviation.trim() : '',
            value: 0,
            members: 0,
            clanExperiencePoints: 0,
        };
        existing.clanExperiencePoints = Math.max(
            Number(existing.clanExperiencePoints) || 0,
            Number(clan?.experiencePoints) || 0
        );
        const clanLadderState = deriveLadderStateFromExperience(existing.clanExperiencePoints);
        existing.value = clanLadderState.level;
        existing.progressPercent = getLevelProgressPercent(
            clanLadderState.experienceIntoLevel,
            clanLadderState.experienceForNextLevel,
            clanLadderState.level
        );
        existing.members += 1;
        if (!existing.abbreviation && typeof clan?.abbreviation === 'string') {
            existing.abbreviation = clan.abbreviation.trim();
        }
        clansByName.set(clanName, existing);
    });

    const topClanLevels = Array.from(clansByName.values())
        .sort((left, right) => {
            if (right.value !== left.value) {
                return right.value - left.value;
            }
            if ((right.clanExperiencePoints || 0) !== (left.clanExperiencePoints || 0)) {
                return (right.clanExperiencePoints || 0) - (left.clanExperiencePoints || 0);
            }
            return left.clanName.localeCompare(right.clanName);
        })
        .slice(0, 10);

    return {
        arena: normalizedArena,
        topPlayerLevels,
        topClanLevels,
        topCurrentStreaks,
        topWins,
        topHighestStreaks,
    };
};

const backfillUserProfiles = async () => {
    const cursor = usersCollection.find(
        {},
        {
            projection: {
                _id: 1,
                username: 1,
                usernameLower: 1,
                createdAt: 1,
                profile: 1,
                savedTeamIndices: 1,
            },
        }
    );

    while (await cursor.hasNext()) {
        const user = await cursor.next();
        if (!user) {
            continue;
        }
        const normalizedProfile = normalizeUserProfile(user);
        const nextSavedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena(user);
        const nextSavedTeamIndices = nextSavedTeamIndicesByArena.comic;
        const nextUsernameLower =
            typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
        const needsProfile =
            JSON.stringify(user.profile || null) !== JSON.stringify(normalizedProfile);
        const needsSavedTeams =
            JSON.stringify(Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : []) !==
            JSON.stringify(nextSavedTeamIndices);
        const needsSavedTeamsByArena =
            JSON.stringify(
                user.savedTeamIndicesByArena && typeof user.savedTeamIndicesByArena === 'object'
                    ? user.savedTeamIndicesByArena
                    : {}
            ) !== JSON.stringify(nextSavedTeamIndicesByArena);
        const needsUsernameLower = user.usernameLower !== nextUsernameLower;
        if (!needsProfile && !needsSavedTeams && !needsSavedTeamsByArena && !needsUsernameLower) {
            continue;
        }
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    usernameLower: nextUsernameLower,
                    profile: normalizedProfile,
                    savedTeamIndices: nextSavedTeamIndices,
                    savedTeamIndicesByArena: nextSavedTeamIndicesByArena,
                },
            }
        );
    }

    await recalculatePlayerLadderStandings();
};

const buildCharacterFaceMap = () =>
    new Map(
        (Array.isArray(charactersData) ? charactersData : [])
            .filter((character) => character && typeof character === 'object')
            .map((character) => {
                const key = character.characterId || character.id || character.name;
                if (!key) return null;
                return [key, character.facePicture || ''];
            })
            .filter(Boolean)
    );

const buildCharacterSummaryMap = () =>
    new Map(
        (Array.isArray(charactersData) ? charactersData : [])
            .filter((character) => character && typeof character === 'object')
            .map((character) => {
                const key = character.characterId || character.id || character.name;
                if (!key) return null;
                return [
                    key,
                    {
                        characterId: key,
                        label: character.name || key,
                        facePicture: character.facePicture || '',
                        arena: normalizeArenaMode(character.arena || character.universe),
                    },
                ];
            })
            .filter(Boolean)
    );

const normalizeLatestReleasesArenaMode = (arena = '') =>
    (String(arena || '').trim().toLowerCase() === 'pokemon' ? 'pokemon' : 'comic');

const normalizeLatestCharacterReleases = (entries = [], arena = 'comic') => {
    const characterMap = buildCharacterSummaryMap();
    const normalizedArena = normalizeLatestReleasesArenaMode(arena);
    const defaults = Array.isArray(LATEST_CHARACTER_RELEASES_BY_ARENA[normalizedArena])
        ? LATEST_CHARACTER_RELEASES_BY_ARENA[normalizedArena]
        : LATEST_CHARACTER_RELEASES_BY_ARENA.comic;
    return [0, 1, 2].map((index) => {
        const entry = Array.isArray(entries) ? entries[index] || {} : {};
        const fallback = defaults[index] || { label: `Latest Character ${index + 1}`, characterId: '' };
        const requestedCharacterId =
            typeof entry?.characterId === 'string' ? entry.characterId.trim() : '';
        const character = requestedCharacterId ? characterMap.get(requestedCharacterId) : null;
        if (character) {
            return {
                label: character.label,
                characterId: character.characterId,
                facePicture: character.facePicture,
            };
        }
        return {
            label: fallback.label || `Latest Character ${index + 1}`,
            characterId: '',
            facePicture: '',
        };
    });
};

const buildLatestReleasesPersistenceFields = (
    releasesByArena = {},
    updatedBy = 'admin'
) => {
    const toCharacterReferences = (entries = []) =>
        (Array.isArray(entries) ? entries : []).map((entry) => ({
            characterId: typeof entry?.characterId === 'string' ? entry.characterId : '',
        }));
    const comic = toCharacterReferences(releasesByArena.comic);
    const pokemon = toCharacterReferences(releasesByArena.pokemon);
    const mirroredReleasesByArena = { comic, pokemon };
    return {
        key: LATEST_CHARACTER_RELEASES_STATE_KEY,
        version: LATEST_CHARACTER_RELEASES_VERSION,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: mirroredReleasesByArena,
        value: {
            version: LATEST_CHARACTER_RELEASES_VERSION,
            releases: comic,
            comicReleases: comic,
            pokemonReleases: pokemon,
            releasesByArena: mirroredReleasesByArena,
        },
        updatedAt: new Date(),
        updatedBy,
    };
};

const getLatestCharacterReleases = async (arena = 'comic') => {
    if (!appStateCollection) {
        return normalizeLatestCharacterReleases(
            LATEST_CHARACTER_RELEASES_BY_ARENA[normalizeLatestReleasesArenaMode(arena)],
            arena
        );
    }
    const state = await appStateCollection.findOne({ key: LATEST_CHARACTER_RELEASES_STATE_KEY });
    const normalizedArena = normalizeLatestReleasesArenaMode(arena);
    const stateValue = state?.value && typeof state.value === 'object' ? state.value : null;
    const releasesByArena = {
        comic: Array.isArray(state?.releasesByArena?.comic)
            ? state.releasesByArena.comic
            : Array.isArray(stateValue?.releasesByArena?.comic)
                ? stateValue.releasesByArena.comic
                : Array.isArray(state?.comicReleases)
                    ? state.comicReleases
                    : Array.isArray(stateValue?.comicReleases)
                        ? stateValue.comicReleases
                        : Array.isArray(state?.releases) && (state.version === LATEST_CHARACTER_RELEASES_VERSION || state.updatedBy === 'sync_balance_3_1_1_news')
                            ? state.releases
                            : Array.isArray(stateValue?.releases) && stateValue.version === LATEST_CHARACTER_RELEASES_VERSION
                                ? stateValue.releases
                                : LATEST_CHARACTER_RELEASES_BY_ARENA.comic,
        pokemon: Array.isArray(state?.releasesByArena?.pokemon)
            ? state.releasesByArena.pokemon
            : Array.isArray(stateValue?.releasesByArena?.pokemon)
                ? stateValue.releasesByArena.pokemon
                : Array.isArray(state?.pokemonReleases)
                    ? state.pokemonReleases
                    : Array.isArray(stateValue?.pokemonReleases)
                        ? stateValue.pokemonReleases
                        : LATEST_CHARACTER_RELEASES_BY_ARENA.pokemon,
    };
    return normalizeLatestCharacterReleases(releasesByArena[normalizedArena], normalizedArena);
};

const getMaintenanceModeState = async () => {
    if (!appStateCollection) {
        return false;
    }
    const now = Date.now();
    if (maintenanceModeCache.expiresAt > now) {
        return maintenanceModeCache.enabled;
    }
    if (!maintenanceModeStatePromise) {
        maintenanceModeStatePromise = appStateCollection
            .findOne({ key: MAINTENANCE_MODE_STATE_KEY })
            .then((state) => {
                const enabled = Boolean(state?.enabled);
                maintenanceModeCache = {
                    enabled,
                    expiresAt: Date.now() + MAINTENANCE_MODE_CACHE_TTL_MS,
                };
                return enabled;
            })
            .finally(() => {
                maintenanceModeStatePromise = null;
            });
    }
    return maintenanceModeStatePromise;
};

const parseSessionTokenFromRequest = (req = {}) => {
    const cookies = String(req.headers?.cookie || '')
        .split(';')
        .reduce((acc, part) => {
            const [rawKey, ...rawValueParts] = String(part).split('=');
            const key = rawKey ? rawKey.trim() : '';
            if (!key) {
                return acc;
            }
            acc[key] = decodeURIComponent(rawValueParts.join('=').trim() || '');
            return acc;
        }, {});
    return cookies[SESSION_COOKIE_NAME] || '';
};

const getSessionUserFromRequest = async (req = {}) => {
    const token = parseSessionTokenFromRequest(req);
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        return user || null;
    } catch (error) {
        return null;
    }
};

const shouldBypassMaintenanceCheckForAsset = (req = {}) => {
    const method = String(req.method || '').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        return false;
    }
    const extension = path.extname(String(req.path || '')).toLowerCase();
    return Boolean(extension && extension !== '.html');
};

const renderMaintenancePage = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comic-Arena Maintenance</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #fff4cd 0%, #f5dd9e 34%, #f7b44a 100%);
      color: #15110b;
      font-family: Arial, sans-serif;
    }
    .panel {
      width: min(90vw, 560px);
      padding: 32px 28px;
      border: 4px solid #16120d;
      background: #fff7de;
      box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.95);
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 32px;
    }
    p {
      margin: 0;
      font-size: 20px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Maintenance Mode</h1>
    <p>This game is under maintenance.</p>
  </div>
</body>
</html>`;

const normalizeOrigin = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    try {
        return new URL(value.trim()).origin;
    } catch (error) {
        return '';
    }
};

const configuredCorsOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4000,https://localhost:4001'
)
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const resolveRequestOrigin = (req) => {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
    if (!host) {
        return '';
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').trim().split(',')[0];
    const protocol =
        forwardedProto || (ALLOW_INSECURE_HTTP ? 'http' : 'https') || req.protocol || 'http';
    return normalizeOrigin(`${protocol}://${host}`);
};

const resolvePublicAppUrl = (req) => normalizeOrigin(PUBLIC_APP_URL) || resolveRequestOrigin(req);

const isAllowedCorsOrigin = (origin, req) => {
    if (!origin) {
        return true;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
        return false;
    }

    if (configuredCorsOrigins.includes(normalizedOrigin)) {
        return true;
    }

    return normalizedOrigin === resolveRequestOrigin(req);
};

app.use((req, res, next) => {
    cors({
        origin(origin, callback) {
            if (isAllowedCorsOrigin(origin, req)) {
                callback(null, true);
                return;
            }

            callback(new Error('CORS origin not allowed.'));
        },
        credentials: true,
    })(req, res, next);
});
app.use(async (req, res, next) => {
    const protectedMissionPages = new Set(['/editmission', '/editmission.html']);
    if (!protectedMissionPages.has(req.path)) {
        return next();
    }

    try {
        const cookies = String(req.headers?.cookie || '')
            .split(';')
            .reduce((acc, part) => {
                const [rawKey, ...rawValueParts] = String(part).split('=');
                const key = rawKey ? rawKey.trim() : '';
                if (!key) {
                    return acc;
                }
                acc[key] = decodeURIComponent(rawValueParts.join('=').trim() || '');
                return acc;
            }, {});
        const token = cookies[SESSION_COOKIE_NAME];
        if (!token) {
            return res.redirect('/');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        if (!user || String(user.role || '').trim().toLowerCase() !== 'admin') {
            return res.redirect('/');
        }

        return next();
    } catch (error) {
        return res.redirect('/');
    }
});
app.use(async (req, res, next) => {
    if (shouldBypassMaintenanceCheckForAsset(req)) {
        return next();
    }

    try {
        const maintenanceEnabled = await getMaintenanceModeState();
        if (!maintenanceEnabled) {
            return next();
        }

        const requestPath = String(req.path || '');
        const adminBypassPaths = new Set(['/newspost', '/newspost.html', '/api/login', '/health']);
        if (adminBypassPaths.has(requestPath)) {
            return next();
        }

        const sessionUser = await getSessionUserFromRequest(req);
        if (sessionUser && String(sessionUser.role || '').trim().toLowerCase() === 'admin') {
            return next();
        }

        if (requestPath.startsWith('/api/')) {
            return res.status(503).json({
                error: 'This game is under maintenance.',
                maintenance: true,
            });
        }

        if (req.method === 'GET' || req.method === 'HEAD') {
            return res.status(503).type('html').send(renderMaintenancePage());
        }

        return res.status(503).json({
            error: 'This game is under maintenance.',
            maintenance: true,
        });
    } catch (error) {
        return next();
    }
});
const noIndexPagePaths = new Set([
    '/character-builder',
    '/character-builder.html',
    '/charactereditor',
    '/charactereditor.html',
    '/editmission',
    '/editmission.html',
    '/newspost',
    '/newspost.html',
    '/playeraccounts',
    '/playeraccounts.html',
]);

app.use((req, res, next) => {
    if (noIndexPagePaths.has(req.path)) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
});

app.use(async (req, res, next) => {
    if (!noIndexPagePaths.has(req.path)) {
        return next();
    }

    try {
        const sessionUser = await getSessionUserFromRequest(req);
        if (sessionUser && String(sessionUser.role || '').trim().toLowerCase() === 'admin') {
            return next();
        }
    } catch (error) {
        // Fall through to the public landing page for unauthenticated or invalid sessions.
    }

    return res.redirect('/');
});

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', '*'],
                connectSrc: [
                    "'self'",
                    ...configuredCorsOrigins,
                    'https://www.googletagmanager.com',
                    'https://www.google-analytics.com',
                    'https://region1.google-analytics.com',
                ],
                objectSrc: ["'none'"],
                frameSrc: ["'self'", 'https://www.googletagmanager.com'],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
    })
);
app.get('/characters.js', (req, res) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    res.type('application/javascript');
    try {
        if (!cachedCharactersBrowserPayload) {
            rebuildCharacterCatalog(applyCharacterOverrides(loadCharactersDataFromFile()));
        }
        if (cachedCharactersBrowserEtag) {
            res.set('ETag', cachedCharactersBrowserEtag);
        }
        if (
            cachedCharactersBrowserEtag &&
            String(req.headers['if-none-match'] || '') === cachedCharactersBrowserEtag
        ) {
            return res.status(304).end();
        }
        return res.send(cachedCharactersBrowserPayload);
    } catch (error) {
        console.error('Failed to serve current characters.js payload:', error);
        return res
            .status(500)
            .send('window.characters = [];');
    }
});
app.use(
    '/assets/images/selection-thumbnails',
    express.static(path.join(__dirname, 'assets', 'images', 'selection-thumbnails'), {
        etag: true,
        maxAge: '7d',
    })
);
const PUBLIC_ROOT_JAVASCRIPT_FILES = new Set([
    '/characters.js',
    '/pokemonDittoTransformationFaces.js',
    '/pokemon-wave-2-live.js',
]);
const isPrivateStaticSourcePath = (requestPath = '') => {
    const normalizedPath = String(requestPath || '')
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/');
    const lowerPath = normalizedPath.toLowerCase();
    if (
        lowerPath === '/package.json' ||
        lowerPath === '/package-lock.json' ||
        lowerPath === '/render.yaml' ||
        lowerPath === '/playwright.config.js' ||
        lowerPath === '/project_id.txt' ||
        lowerPath === '/server_log.txt' ||
        lowerPath === '/debug.log' ||
        lowerPath.startsWith('/test/') ||
        lowerPath.startsWith('/test-results/') ||
        lowerPath.startsWith('/.git/') ||
        lowerPath.startsWith('/.codex/')
    ) {
        return true;
    }
    const isRootFile = /^\/[^/]+$/.test(normalizedPath);
    if (!isRootFile) return false;
    if (/^\/sync_[^/]+\.js$/i.test(normalizedPath)) return true;
    if (/^\/(?:server|battleLogic|matchStability|pokemonTypeSystem)\.js$/i.test(normalizedPath)) {
        return true;
    }
    if (
        /\.(?:md|log|ya?ml|py)$/i.test(normalizedPath) ||
        /^\/\.(?:env|gitignore)/i.test(normalizedPath)
    ) {
        return true;
    }
    return (
        /\.js$/i.test(normalizedPath) &&
        !PUBLIC_ROOT_JAVASCRIPT_FILES.has(normalizedPath)
    );
};
app.use((req, res, next) => {
    if (!isPrivateStaticSourcePath(req.path)) {
        next();
        return;
    }
    res.status(404).type('text/plain').send('Not found.');
});
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(cookieParser());
app.use(
    morgan('combined', {
        skip: () => process.env.NODE_ENV === 'test',
    })
);

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait a moment and try again.' },
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please wait a moment and try again.' },
});


const signSession = (user) =>
    jwt.sign(
        {
            sub: user._id?.toString?.() || user.username,
            username: user.username,
            role: user.role || 'player',
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );

const setSessionCookie = (res, token) => {
    res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: !ALLOW_INSECURE_HTTP,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_MS,
    });
};

const clearSessionCookie = (res) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: !ALLOW_INSECURE_HTTP,
        sameSite: 'lax',
    });
};

const getRemoteImageBuffer = async (url, redirectCount = 0) => {
    if (redirectCount > 3) {
        throw new Error('Too many redirects.');
    }
    const response = await fetch(url, {
        redirect: 'manual',
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
            throw new Error('Invalid image response.');
        }
        const nextUrl = new URL(location, url).toString();
        return getRemoteImageBuffer(nextUrl, redirectCount + 1);
    }
    if (!response.ok) {
        throw new Error('Image URL could not be reached.');
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error('URL must point directly to an image.');
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

const readPngDimensions = (buffer) => {
    if (buffer.length < 24) return null;
    if (
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
    ) {
        return null;
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
};

const readGifDimensions = (buffer) => {
    if (buffer.length < 10) return null;
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header !== 'GIF87a' && header !== 'GIF89a') {
        return null;
    }
    return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
    };
};

const readJpegDimensions = (buffer) => {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        return null;
    }
    let offset = 2;
    while (offset + 8 < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2) return null;
        const isStartOfFrame =
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf);
        if (isStartOfFrame) {
            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }
        offset += 2 + length;
    }
    return null;
};

const readWebpDimensions = (buffer) => {
    if (buffer.length < 30) return null;
    if (
        buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
        return null;
    }
    const chunkType = buffer.subarray(12, 16).toString('ascii');
    if (chunkType === 'VP8X' && buffer.length >= 30) {
        return {
            width: 1 + buffer.readUIntLE(24, 3),
            height: 1 + buffer.readUIntLE(27, 3),
        };
    }
    if (chunkType === 'VP8 ' && buffer.length >= 30) {
        return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
        };
    }
    if (chunkType === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
        };
    }
    return null;
};

const getImageDimensionsFromBuffer = (buffer) =>
    readPngDimensions(buffer) ||
    readGifDimensions(buffer) ||
    readJpegDimensions(buffer) ||
    readWebpDimensions(buffer);

const getAvatarImageBuffer = async (url) => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';
    if (!normalizedUrl) {
        throw new Error('A valid image is required.');
    }

    if (normalizedUrl.toLowerCase().startsWith('data:image/')) {
        const commaIndex = normalizedUrl.indexOf(',');
        if (commaIndex === -1) {
            throw new Error('Unsupported image format.');
        }
        const base64Payload = normalizedUrl.slice(commaIndex + 1).replace(/\s+/g, '');
        const buffer = Buffer.from(base64Payload, 'base64');
        if (!buffer.length) {
            throw new Error('Unsupported image format.');
        }
        return buffer;
    }

    return getRemoteImageBuffer(normalizedUrl);
};

const validateAvatarUrl = async (url) => {
    const buffer = await getAvatarImageBuffer(url);
    const dimensions = getImageDimensionsFromBuffer(buffer);
    if (!dimensions) {
        throw new Error('Unsupported image format.');
    }
    if (dimensions.width !== 75 || dimensions.height !== 75) {
        throw new Error('Avatars must be exactly 75x75.');
    }
    return true;
};

const validateBackgroundUrl = async (url) => {
    if (!url) {
        return true;
    }
    const buffer = await getRemoteImageBuffer(url);
    const dimensions = getImageDimensionsFromBuffer(buffer);
    if (!dimensions) {
        throw new Error('Unsupported image format.');
    }
    if (dimensions.width !== 770 || dimensions.height !== 560) {
        throw new Error('Backgrounds must be exactly 770x560.');
    }
    return true;
};

const requireSession = async (req, res, next) => {
    try {
        const token = req.cookies?.[SESSION_COOKIE_NAME];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        req.authUser = {
            ...serializeUserForClient(user),
        };
        next();
    } catch (error) {
        console.error('Session verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized.' });
    }
};

const parseCookieHeader = (cookieHeader = '') => {
    if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) return {};
    return cookieHeader.split(';').reduce((acc, part) => {
        const [rawKey, ...rawValueParts] = String(part).split('=');
        const key = rawKey ? rawKey.trim() : '';
        if (!key) return acc;
        const value = rawValueParts.join('=').trim();
        acc[key] = decodeURIComponent(value || '');
        return acc;
    }, {});
};

const getSessionUserFromToken = async (token) => {
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await usersCollection.findOne({ username: decoded.username });
    if (!user) return null;
    return {
        ...serializeUserForClient(user),
    };
};

const getMatchRoom = (matchId) => {
    const key = typeof matchId === 'string' ? matchId.trim() : '';
    if (!key) return null;
    if (!matchSocketRooms.has(key)) {
        matchSocketRooms.set(key, new Set());
    }
    return matchSocketRooms.get(key);
};

const removeSocketFromRoom = (ws) => {
    if (!ws || !ws.matchId) return;
    const room = matchSocketRooms.get(ws.matchId);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) {
        matchSocketRooms.delete(ws.matchId);
    }
};

const sendJsonToSocket = (ws, payload) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(JSON.stringify(payload));
        return true;
    } catch (error) {
        return false;
    }
};

const normalizeMatchChatText = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, MATCH_CHAT_MAX_LENGTH);
};

const broadcastMatchChatMessage = async (ws, rawText) => {
    if (!ws?.matchId || !ws?.username) return;
    const now = Date.now();
    if (ws.lastMatchChatAt && now - ws.lastMatchChatAt < MATCH_CHAT_MIN_INTERVAL_MS) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Slow down before sending another message.' },
        });
        return;
    }
    const text = normalizeMatchChatText(rawText);
    if (!text) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Enter a message first.' },
        });
        return;
    }
    const match = await matchesCollection.findOne(
        { matchId: ws.matchId },
        { projection: { matchId: 1, status: 1, players: 1 } }
    );
    if (!match || match.status === 'ended' || !Array.isArray(match.players)) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Chat is closed for this match.' },
        });
        return;
    }
    const playerEntry = findMatchPlayerByUsername(match, ws.username);
    if (!playerEntry) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'You are not part of this match.' },
        });
        return;
    }
    ws.lastMatchChatAt = now;
    const payload = {
        id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
        matchId: ws.matchId,
        username: ws.username,
        displayName: getPlayerDisplayName(playerEntry),
        text,
        sentAt: new Date(now).toISOString(),
    };
    const room = getMatchRoom(ws.matchId);
    room.forEach((client) => {
        if (!client || client.readyState !== WebSocket.OPEN) {
            removeSocketFromRoom(client);
            return;
        }
        sendJsonToSocket(client, { type: 'chat_message', payload });
    });
};

const cloneSerializable = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const CLIENT_SAFE_STATUS_METADATA_KEYS = new Set([
    '_destructibleDefenseRestoreTurnsLeft',
    'banished',
    'bloodlineCostIncrease',
    'bloodlineCostReduction',
    'cannotUseHarmfulSkills',
    'cannotUseNonMentalSkills',
    'cannotUseSkillClasses',
    'cannotUseSkillIndices',
    'cannotUseSkills',
    'DamageDebuff',
    'destructibleDefenseRestore',
    'delayedDamage',
    'delayEnemyDamageUntilExpire',
    'effectiveCharacterId',
    'effectiveSkinId',
    'effectiveStatusIds',
    'evadeAgainstNonMental',
    'evadeChancePercent',
    'evadedSkillName',
    'evadedSourceName',
    'facePictureOverride',
    'genjutsuCostIncrease',
    'genjutsuCostReduction',
    'hulkRage',
    'ignoreAfflictionDamage',
    'ignoreEnemyDamage',
    'invulnerable',
    'invulnerableToHarmfulEffects',
    'invulnerableToHelpfulSkills',
    'invulnerableToNonAffliction',
    'invulnerableToNonMentalSkills',
    'invulnerableToSkillClasses',
    'missedSkillName',
    'missedSourceName',
    'NonAfflictionDamageDebuff',
    'ninjutsuCostIncrease',
    'ninjutsuCostReduction',
    'nonMentalRandomCostIncrease',
    'overrideAllSkillsToAllRandom',
    'overrideAllSkillsToAllRandomSkillIdsAny',
    'onOwnerUseSkillApplyStatusToEnemies',
    'randomCostIncrease',
    'randomCostReduction',
    'skillCostOverridesByRemainingTurns',
    'skillCostOverridesBySkillId',
    'skillDamageBonuses',
    'skillReplacements',
    'skillReplacementsByRemainingTurns',
    'skillReplacementsRequireSourceSkillId',
    'sourceSkillName',
    'stackMetadataKey',
    'stackDerivedNumericKeys',
    'scraggyFocusEnergyStacks',
    'statusIconUrl',
    'taijutsuCostIncrease',
    'taijutsuCostReduction',
    'tooltipText',
    'tooltipTextTemplate',
    'currentUnpierceableDamageReduction',
    'currentUnpierceableDamageReductionFlat',
    'unpierceableDamageReductionFlatPerStatusMetadataAmount',
    'unpierceableDamageReductionFlatPerStatusMetadataKey',
    'unpierceableDamageReductionFlatPerStatusMetadataStep',
    'turnEndDamage',
    'turnEndApplyStatusToAllies',
    'turnEndApplyStatusToEnemies',
    'turnStartChoiceOptions',
    'turnStartChoicePromptText',
    'turnStartChoiceMaxUses',
    'turnStartChoiceUsesUsed',
    'turnStartChoiceQueued',
    'useEvolvedSkills',
]);

const extractTooltipPlaceholderKeys = (template) => {
    if (typeof template !== 'string' || !template) return [];
    const matches = template.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
    return Array.from(new Set(Array.from(matches, (match) => match[1]).filter(Boolean)));
};

const sanitizeStatusMetadataForClient = (metadata = {}) => {
    if (!metadata || typeof metadata !== 'object') return {};
    const sanitized = {};
    const safeKeys = new Set(CLIENT_SAFE_STATUS_METADATA_KEYS);
    extractTooltipPlaceholderKeys(metadata.tooltipTextTemplate).forEach((key) => safeKeys.add(key));
    extractTooltipPlaceholderKeys(
        metadata?.destructibleDefenseRestore?.pendingTooltipTextTemplate
    ).forEach((key) => safeKeys.add(key));
    safeKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            sanitized[key] = cloneSerializable(metadata[key]);
        }
    });
    return sanitized;
};

const shouldHideStatusFromViewer = ({ status, unitUsername, viewerUsername }) => {
    const metadata = status?.metadata || {};
    if (Boolean(metadata.hideTooltip)) {
        return true;
    }
    if (viewerUsername !== unitUsername && Boolean(metadata.hideTooltipFromEnemy)) {
        return true;
    }
    if (
        viewerUsername === unitUsername &&
        (Boolean(metadata.hideTooltipFromOwner) || Boolean(metadata.hideTooltipFromUnitOwner))
    ) {
        return true;
    }
    return false;
};

const sanitizeStatusForViewer = ({ status, unitUsername, viewerUsername }) => {
    if (!status || typeof status !== 'object') return null;
    if (shouldHideStatusFromViewer({ status, unitUsername, viewerUsername })) {
        return null;
    }
    return {
        id: typeof status.id === 'string' ? status.id : '',
        remainingTurns: Math.max(0, Number(status.remainingTurns) || 0),
        sourceSkillId: typeof status.sourceSkillId === 'string' ? status.sourceSkillId : null,
        sourceUsername: typeof status.sourceUsername === 'string' ? status.sourceUsername : null,
        sourceSlot: Number.isInteger(status.sourceSlot) ? status.sourceSlot : null,
        metadata: sanitizeStatusMetadataForClient(status.metadata),
    };
};

const sanitizeUnitStateForViewer = ({ unit, unitUsername, viewerUsername }) => {
    const statuses = Array.isArray(unit?.state?.statuses)
        ? unit.state.statuses
              .map((status) => sanitizeStatusForViewer({ status, unitUsername, viewerUsername }))
              .filter(Boolean)
        : [];
    const state = { statuses };
    if (unit?.state?.killedByCharacterId) {
        state.killedByCharacterId = unit.state.killedByCharacterId;
    }
    if (unit?.state?.lastCombatEvent && typeof unit.state.lastCombatEvent === 'object') {
        const event = unit.state.lastCombatEvent;
        state.lastCombatEvent = {
            sequence: Math.max(0, Number(event.sequence) || 0),
            type: event.type === 'heal' ? 'heal' : 'damage',
            amount: Math.max(0, Number(event.amount) || 0),
            sourceUsername:
                typeof event.sourceUsername === 'string' ? event.sourceUsername : null,
            sourceSlot: Number.isInteger(event.sourceSlot) ? event.sourceSlot : null,
            sourceCharacterId:
                typeof event.sourceCharacterId === 'string' ? event.sourceCharacterId : null,
            sourceSkillId:
                typeof event.sourceSkillId === 'string' ? event.sourceSkillId : null,
            skillClasses: Array.isArray(event.skillClasses)
                ? event.skillClasses
                      .map((entry) =>
                          typeof entry === 'string' ? entry.trim().toLowerCase() : ''
                      )
                      .filter(Boolean)
                : [],
            affliction: Boolean(event.affliction),
            piercing: Boolean(event.piercing),
            fixed: Boolean(event.fixed),
            reason: typeof event.reason === 'string' ? event.reason : null,
        };
    }
    if (unitUsername === viewerUsername) {
        state.cooldowns =
            unit?.state?.cooldowns && typeof unit.state.cooldowns === 'object'
                ? cloneSerializable(unit.state.cooldowns)
                : {};
        state.skillUses =
            unit?.state?.skillUses && typeof unit.state.skillUses === 'object'
                ? cloneSerializable(unit.state.skillUses)
                : {};
    }
    return state;
};

const sanitizeBoardForViewer = (board, viewerUsername) => {
    if (!board || typeof board !== 'object' || !viewerUsername) return null;
    return Object.fromEntries(
        Object.entries(board).map(([unitUsername, units]) => [
            unitUsername,
            Array.isArray(units)
                ? units.map((unit) => ({
                      slot: Number.isInteger(unit?.slot)
                          ? unit.slot
                          : Number.isInteger(Number.parseInt(unit?.slot, 10))
                              ? Number.parseInt(unit.slot, 10)
                              : null,
                      rosterIndex: Number.isInteger(unit?.rosterIndex)
                          ? unit.rosterIndex
                          : Number.isInteger(Number.parseInt(unit?.rosterIndex, 10))
                              ? Number.parseInt(unit.rosterIndex, 10)
                              : null,
                      alive: unit?.alive !== false,
                      hp: Number.isFinite(Number(unit?.hp)) ? Number(unit.hp) : 0,
                      state: sanitizeUnitStateForViewer({ unit, unitUsername, viewerUsername }),
                  }))
                : [],
        ])
    );
};

const getViewerScopedValueForUsername = (recordMap, viewerUsername) => {
    if (!recordMap || typeof recordMap !== 'object' || !viewerUsername) return null;
    const directValue = recordMap?.[viewerUsername];
    if (directValue && typeof directValue === 'object') {
        return cloneSerializable(directValue);
    }
    const matchedKey = Object.keys(recordMap).find((key) => usernamesEqual(key, viewerUsername));
    if (!matchedKey) return null;
    const matchedValue = recordMap?.[matchedKey];
    return matchedValue && typeof matchedValue === 'object' ? cloneSerializable(matchedValue) : null;
};

const buildMatchVersionPayload = (match) => ({
    stateRevision: getMatchStateRevision(match),
    turnNumber: getMatchTurnNumber(match),
    serverTime: new Date().toISOString(),
});

const sanitizeChakraPoolsForViewer = (chakraPools, viewerUsername) => {
    const ownPool = getViewerScopedValueForUsername(chakraPools, viewerUsername);
    return ownPool ? { [viewerUsername]: ownPool } : null;
};

const sanitizeLastChakraGainForViewer = (lastChakraGain, viewerUsername) => {
    const ownGain = getViewerScopedValueForUsername(lastChakraGain, viewerUsername);
    return ownGain ? { [viewerUsername]: ownGain } : null;
};

const serializedMatchProfileCache = new WeakMap();
const serializeMatchProfileForClient = (profile, arena) => {
    if (!profile || typeof profile !== 'object') return null;
    if (profile.battleSnapshotVersion === 1) {
        return cloneSerializable(profile);
    }
    const normalizedArena = normalizeArenaMode(arena);
    const cachedByArena = serializedMatchProfileCache.get(profile);
    if (cachedByArena?.has(normalizedArena)) {
        return cloneSerializable(cachedByArena.get(normalizedArena));
    }
    const serializedProfile = serializeArenaProfileForClient(profile, normalizedArena);
    delete serializedProfile.arenas;
    const nextCache = cachedByArena || new Map();
    nextCache.set(normalizedArena, serializedProfile);
    if (!cachedByArena) {
        serializedMatchProfileCache.set(profile, nextCache);
    }
    return cloneSerializable(serializedProfile);
};

const serializeMatchPlayerForViewer = (
    player = {},
    arena = DEFAULT_ARENA_MODE,
    boardUnits = []
) => {
    if (!player || typeof player !== 'object') return null;
    const safePlayer = {
        ...cloneSerializable(player),
        displayName: getPlayerDisplayName(player),
    };
    safePlayer.team = resolveRenderableMatchTeamForArena({
        team: safePlayer.team,
        boardUnits,
        arena,
    });
    if (player.profile && typeof player.profile === 'object') {
        safePlayer.profile = serializeMatchProfileForClient(player.profile, arena);
    }
    if (safePlayer.isBot) {
        delete safePlayer.isBot;
    }
    return safePlayer;
};

const buildMatchPayloadForUser = (match, username) => {
    if (!match || !username) return null;
    const playerEntry = Array.isArray(match.players)
        ? match.players.find((player) => usernamesEqual(player?.username, username)) || null
        : null;
    if (!playerEntry) return null;
    const opponentEntry = Array.isArray(match.players)
        ? match.players.find((player) => !usernamesEqual(player?.username, username)) || null
        : null;
    const ladderResultKey =
        match?.ladderResults && typeof match.ladderResults === 'object'
            ? Object.keys(match.ladderResults).find((key) => usernamesEqual(key, username))
            : null;
    return {
        ok: true,
        matchId: match.matchId || null,
        ...buildMatchVersionPayload(match),
        mode: match.mode || 'quick',
        arena: normalizeArenaMode(match.arena),
        status: match.status || 'active',
        winner: match.winner || null,
        surrenderedBy: match.surrenderedBy || null,
        endReason: match.endReason || null,
        endedAt: match.endedAt || null,
        player: serializeMatchPlayerForViewer(playerEntry, match.arena, match.board?.[playerEntry?.username]),
        opponent: serializeMatchPlayerForViewer(
            opponentEntry,
            match.arena,
            match.board?.[opponentEntry?.username]
        ),
        currentTurn: match.currentTurn || null,
        turnOrder: match.turnOrder || null,
        turnStartedAt: match.turnStartedAt || null,
        turnExpiresAt: match.turnExpiresAt || null,
        turnDurationMs: getTurnDurationMsForUser(match, match?.currentTurn),
        board: sanitizeBoardForViewer(match.board, username),
        chakraPools: sanitizeChakraPoolsForViewer(match.chakraPools, username),
        lastChakraGain: sanitizeLastChakraGainForViewer(match.economy?.lastChakraGain, username),
        pendingTurn: getPendingTurn(match, username),
        ladderResult: ladderResultKey ? match.ladderResults?.[ladderResultKey] || null : null,
        backgroundOverride: normalizeMatchBackgroundOverride(match.backgroundOverride, match.arena),
        pveBattle:
            match.pveBattle && typeof match.pveBattle === 'object'
                ? cloneSerializable(match.pveBattle)
                : null,
    };
};

const buildMatchActionStatePayload = (match, username, extra = {}) => {
    const safePayload = buildMatchPayloadForUser(match, username) || {};
    return {
        ok: true,
        staleAction: true,
        matchId: safePayload.matchId || match?.matchId || null,
        ...buildMatchVersionPayload(match),
        mode: safePayload.mode || match?.mode || 'quick',
        arena: safePayload.arena || normalizeArenaMode(match?.arena),
        status: safePayload.status || match?.status || 'active',
        winner: safePayload.winner || match?.winner || null,
        surrenderedBy: safePayload.surrenderedBy || match?.surrenderedBy || null,
        endReason: safePayload.endReason || match?.endReason || null,
        endedAt: safePayload.endedAt || match?.endedAt || null,
        player: safePayload.player || null,
        opponent: safePayload.opponent || null,
        currentTurn: safePayload.currentTurn || match?.currentTurn || null,
        turnOrder: safePayload.turnOrder || match?.turnOrder || null,
        turnStartedAt: safePayload.turnStartedAt || match?.turnStartedAt || null,
        turnExpiresAt: safePayload.turnExpiresAt || match?.turnExpiresAt || null,
        turnDurationMs:
            safePayload.turnDurationMs || getTurnDurationMsForUser(match, match?.currentTurn),
        board: safePayload.board || null,
        chakraPools: safePayload.chakraPools || null,
        lastChakraGain: safePayload.lastChakraGain || null,
        pendingTurn: safePayload.pendingTurn || makeEmptyPendingTurn(),
        ladderResult: safePayload.ladderResult || null,
        backgroundOverride: safePayload.backgroundOverride || '',
        pveBattle: safePayload.pveBattle || null,
        ...extra,
    };
};

const findMostRecentActiveMatchForUser = async (username, arena = '') => {
    const normalizedArena =
        typeof arena === 'string' && arena.trim() ? normalizeArenaMode(arena) : '';
    return matchesCollection.findOne(
        {
            'players.username': username,
            status: 'active',
            ...(normalizedArena ? { arena: normalizedArena } : {}),
        },
        {
            sort: {
                matchStartsAt: -1,
                createdAt: -1,
            },
        }
    );
};

const respondWithCurrentMatchState = (res, match, username, extra = {}) =>
    res.json(buildMatchActionStatePayload(match, username, extra));

const respondWithRevisionConflict = (res, match, username) =>
    respondWithCurrentMatchState(res, match, username, {
        staleAction: true,
        actionRejected: 'revision-conflict',
    });

const isMatchRevisionConflict = (error) => error instanceof MatchRevisionConflictError;

const respondWithLatestRevisionConflict = async (res, matchId, username) => {
    const latestMatch = await matchesCollection.findOne({ matchId });
    if (!latestMatch) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydrated = await ensureMatchVersionData(latestMatch);
    const playerEntry = findMatchPlayerByUsername(hydrated, username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    return respondWithRevisionConflict(res, hydrated, playerEntry.username);
};

const broadcastMatchState = async (matchOrMatchId) => {
    const match =
        typeof matchOrMatchId === 'string'
            ? await matchesCollection.findOne({ matchId: matchOrMatchId })
            : matchOrMatchId;
    if (!match || !Array.isArray(match.players) || match.players.length === 0) {
        return null;
    }
    scheduleBattleBotTurn(match);
    const room = matchSocketRooms.get(match.matchId);
    if (!room || room.size === 0) {
        return match;
    }
    room.forEach((ws) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            removeSocketFromRoom(ws);
            return;
        }
        const payload = buildMatchPayloadForUser(match, ws.username);
        if (payload) {
            sendJsonToSocket(ws, { type: 'match_state', payload });
        }
    });
    return match;
};

const queueMatchStateBroadcast = (matchOrMatchId) => {
    broadcastMatchState(matchOrMatchId).catch((error) => {
        console.warn('Failed to broadcast match state:', error);
    });
};

const hydrateAndAdvanceMatch = async (matchId) => {
    const match = await matchesCollection.findOne({ matchId });
    if (!match) return null;
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    return autoAdvanceTurnIfExpired(hydratedBoard);
};

const advanceExpiredMatchAndBroadcast = async (matchId) => {
    const advanced = await hydrateAndAdvanceMatch(matchId);
    if (!advanced) return null;
    await broadcastMatchState(advanced);
    return advanced;
};

const sweepExpiredMatches = async () => {
    if (!matchesCollection || turnSweepInFlight) return;
    turnSweepInFlight = true;
    try {
        const now = new Date();
        const expiredMatches = await matchesCollection
            .find(
                {
                    status: 'active',
                    turnExpiresAt: { $lte: now },
                },
                { projection: { matchId: 1 } }
            )
            .limit(50)
            .toArray();
        for (const entry of expiredMatches) {
            const matchId = typeof entry?.matchId === 'string' ? entry.matchId : '';
            if (!matchId) continue;
            await matchCommandCoordinator.execute(matchId, 'turn-expiry-sweep', () =>
                advanceExpiredMatchAndBroadcast(matchId)
            );
        }
    } finally {
        turnSweepInFlight = false;
    }
};

const attachWebSocketSupport = (server) => {
    if (!server || typeof server.on !== 'function') return;
    server.on('upgrade', async (req, socket, head) => {
        try {
            const requestUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            if (requestUrl.pathname !== '/ws') {
                socket.destroy();
                return;
            }
            const matchId = String(requestUrl.searchParams.get('matchId') || '').trim();
            if (!matchId) {
                socket.destroy();
                return;
            }
            const cookies = parseCookieHeader(req.headers.cookie || '');
            const token = cookies[SESSION_COOKIE_NAME];
            const authUser = await getSessionUserFromToken(token);
            if (!authUser?.username) {
                socket.destroy();
                return;
            }
            const match = await matchesCollection.findOne({ matchId });
            if (!match || !Array.isArray(match.players)) {
                socket.destroy();
                return;
            }
            const playerEntry = findMatchPlayerByUsername(match, authUser.username);
            if (!playerEntry) {
                socket.destroy();
                return;
            }
            wsServer.handleUpgrade(req, socket, head, (ws) => {
                ws.matchId = matchId;
                ws.username = authUser.username;
                ws.authUser = authUser;
                const room = getMatchRoom(matchId);
                room.add(ws);
                wsConnections.add(ws);
                ws.on('close', () => {
                    wsConnections.delete(ws);
                    removeSocketFromRoom(ws);
                });
                ws.on('error', () => {
                    wsConnections.delete(ws);
                    removeSocketFromRoom(ws);
                });
                ws.on('message', (rawMessage) => {
                    let message = null;
                    try {
                        message = JSON.parse(String(rawMessage || ''));
                    } catch (error) {
                        return;
                    }
                    if (message?.type === 'match_ping') {
                        sendJsonToSocket(ws, {
                            type: 'match_pong',
                            payload: {
                                clientAt: Number(message?.payload?.clientAt) || null,
                                serverAt: Date.now(),
                            },
                        });
                        return;
                    }
                    if (message?.type === 'chat_message') {
                        broadcastMatchChatMessage(ws, message?.payload?.text).catch((error) => {
                            console.warn('Failed to broadcast match chat message:', error);
                            sendJsonToSocket(ws, {
                                type: 'chat_error',
                                payload: { error: 'Unable to send chat message.' },
                            });
                        });
                    }
                });
                wsServer.emit('connection', ws, req);
            });
        } catch (error) {
            socket.destroy();
        }
    });
};

wsServer.on('connection', async (ws) => {
    if (!ws?.matchId || !ws?.username) {
        try {
            ws.close();
        } catch (error) {
            // Ignore close failures.
        }
        return;
    }
    try {
        const hydrated = await matchCommandCoordinator.execute(
            ws.matchId,
            'websocket-initial-sync',
            () => hydrateAndAdvanceMatch(ws.matchId),
            { log: false }
        );
        if (!hydrated) {
            ws.close();
            return;
        }
        const payload = buildMatchPayloadForUser(hydrated, ws.username);
        if (payload) {
            sendJsonToSocket(ws, { type: 'match_state', payload });
        }
    } catch (error) {
        try {
            ws.close();
        } catch (closeError) {
            // Ignore close failures.
        }
    }
});

// In-memory matchmaking queues (demo)
let quickQueue = [];
let ladderQueue = [];
let privateQueue = [];
const quickMatches = new Map(); // matchId -> { players, createdAt }
const userToMatch = new Map(); // username -> { matchId, opponent }
const draftSessions = new Map(); // draftId -> draft state
const userToDraft = new Map(); // username -> draftId
const DRAFT_BAN_COUNT = 5;
const DRAFT_TEAM_SIZE = 3;
const DRAFT_PHASE_DURATION_MS = 60 * 1000;
const DEFAULT_ARENA_MODE = 'comic';
const ARENA_MODES = new Set([DEFAULT_ARENA_MODE, 'pokemon']);

const normalizeArenaMode = (value = DEFAULT_ARENA_MODE) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ARENA_MODES.has(normalized) ? normalized : DEFAULT_ARENA_MODE;
};

const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];

const createEmptyChakraPool = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const createEmptyChakraCost = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const getTotalChakra = (pool = {}) =>
    chakraTypes.reduce((sum, type) => sum + (Number(pool[type]) || 0), 0);

const normalizeEnergyCost = (energy = []) => {
    const reservedSpecific = createEmptyChakraCost();
    let requiredRandom = 0;
    (Array.isArray(energy) ? energy : []).forEach((entry) => {
        const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
        if (normalized === 'random') {
            requiredRandom += 1;
            return;
        }
        if (Object.prototype.hasOwnProperty.call(reservedSpecific, normalized)) {
            reservedSpecific[normalized] += 1;
        }
    });
    return { reservedSpecific, requiredRandom };
};

const createGameBotUsername = (seed = '') =>
    `${GAME_BOT_USERNAME_PREFIX}${String(seed || Date.now()).replace(/[^a-z0-9_-]+/gi, '').toLowerCase()}`;

const getQueueForMode = (mode = 'quick') => {
    if (mode === 'ladder') return ladderQueue;
    if (mode === 'private') return privateQueue;
    return quickQueue;
};

const setQueueForMode = (mode = 'quick', nextQueue = []) => {
    if (mode === 'ladder') {
        ladderQueue = nextQueue;
        return;
    }
    if (mode === 'private') {
        privateQueue = nextQueue;
        return;
    }
    quickQueue = nextQueue;
};

const findQueuedEntry = (username, mode = null, arena = null) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const queues = mode ? [mode] : ['quick', 'ladder', 'private'];
    const normalizedArena = arena ? normalizeArenaMode(arena) : '';
    for (const queueMode of queues) {
        const queue = getQueueForMode(queueMode);
        const entry = queue.find(
            (item) =>
                typeof item?.username === 'string' &&
                item.username.trim().toLowerCase() === normalizedUsername &&
                (!normalizedArena || normalizeArenaMode(item?.arena) === normalizedArena)
        );
        if (entry) {
            return { mode: queueMode, entry };
        }
    }
    return null;
};

const removeQueuedEntry = (username, mode = null) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const queues = mode ? [mode] : ['quick', 'ladder', 'private'];
    queues.forEach((queueMode) => {
        setQueueForMode(
            queueMode,
            getQueueForMode(queueMode).filter(
                (entry) =>
                    typeof entry?.username !== 'string' ||
                    entry.username.trim().toLowerCase() !== normalizedUsername
            )
        );
    });
};

const getCharacterSpecificChakraProfile = (character = {}) => {
    const specificCounts = createEmptyChakraCost();
    let randomCount = 0;
    const skills = Array.isArray(character?.skills) ? character.skills : [];
    skills.forEach((skill) => {
        const costs = Array.isArray(skill?.energy) ? skill.energy : [];
        costs.forEach((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            if (normalized === 'random') {
                randomCount += 1;
                return;
            }
            if (Object.prototype.hasOwnProperty.call(specificCounts, normalized)) {
                specificCounts[normalized] += 1;
            }
        });
    });
    const dominantType = chakraTypes.reduce((best, type) => {
        if ((specificCounts[type] || 0) > (specificCounts[best] || 0)) {
            return type;
        }
        return best;
    }, chakraTypes[0]);
    const specificTotal = chakraTypes.reduce((sum, type) => sum + (specificCounts[type] || 0), 0);
    const diversity = chakraTypes.filter((type) => (specificCounts[type] || 0) > 0).length;
    return {
        specificCounts,
        dominantType: specificTotal > 0 ? dominantType : '',
        specificTotal,
        diversity,
        randomCount,
    };
};

const shuffleList = (items = []) => {
    const next = Array.isArray(items) ? items.slice() : [];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = next[index];
        next[index] = next[swapIndex];
        next[swapIndex] = temp;
    }
    return next;
};

const getBattleBotAllowedCharacterIdsForArena = (arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    return new Set(
        (Array.isArray(charactersData) ? charactersData : [])
            .filter((character) => normalizeArenaMode(character?.arena || character?.universe) === normalizedArena)
            .map((character) => normalizeCharacterId(character?.characterId || character?.id))
            .filter(Boolean)
    );
};

const isRosterIndexInArena = (rosterIndex, arena = DEFAULT_ARENA_MODE) =>
    getRosterCharacterArena(rosterIndex) === normalizeArenaMode(arena);

const isTeamRosterInArena = (team = [], arena = DEFAULT_ARENA_MODE) =>
    Array.isArray(team) &&
    team.length > 0 &&
    team.every((rosterIndex) => isRosterIndexInArena(rosterIndex, arena));

const assertMatchTeamsBelongToArena = (players = [], arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    const invalidPlayer = (Array.isArray(players) ? players : []).find(
        (player) => !isTeamRosterInArena(player?.team, normalizedArena)
    );
    if (!invalidPlayer) {
        return;
    }
    const displayName = getPlayerDisplayName(invalidPlayer) || invalidPlayer?.username || 'Player';
    throw new Error(
        `${displayName}'s team includes a character that does not belong to ${normalizedArena === 'pokemon' ? 'Pokemon Arena' : 'Comic Arena'}.`
    );
};

const getPokemonStarterCharacterIds = () => new Set(['pikachu', 'charmander', 'bulbasaur', 'squirtle']);
const getPokemonGen2StarterCharacterIds = () => new Set(['cyndaquil', 'chikorita', 'totodile']);
const getPokemonEeveeEvolutionCharacterIds = () => new Set(['jolteon', 'flareon', 'vaporeon']);

const buildBattleBotTeam = async (arena = DEFAULT_ARENA_MODE) => {
    const normalizedArena = normalizeArenaMode(arena);
    const allowedCharacterIds = getBattleBotAllowedCharacterIdsForArena(normalizedArena);
    const storedTeams = await getStoredBotTeams();
    if (storedTeams.length > 0) {
        const eligibleStoredTeams = storedTeams.filter((team) => {
            if (!Array.isArray(team?.characterIds) || team.characterIds.length < 3) {
                return false;
            }
            return team.characterIds.every((characterId) => allowedCharacterIds.has(characterId));
        });
        if (eligibleStoredTeams.length > 0) {
            const team = eligibleStoredTeams[Math.floor(Math.random() * eligibleStoredTeams.length)];
            const indices = team.characterIds
                .map((id) => getRosterIndexByCharacterId(id))
                .filter((idx) => idx !== -1 && isRosterIndexInArena(idx, normalizedArena));
            if (indices.length >= 3 && isTeamRosterInArena(indices.slice(0, 3), normalizedArena)) {
                return indices.slice(0, 3);
            }
            // Fallback to random if stored team is invalid/incomplete
        }
    }

    const candidates = shuffleList(
        (Array.isArray(charactersData) ? charactersData : [])
            .map((character, rosterIndex) => ({
                rosterIndex,
                character,
                profile: getCharacterSpecificChakraProfile(character),
            }))
            .filter(
                (entry) =>
                    entry.character &&
                    typeof entry.character.characterId === 'string' &&
                    Array.isArray(entry.character.skills) &&
                    entry.character.skills.length > 0 &&
                    allowedCharacterIds.has(normalizeCharacterId(entry.character.characterId))
            )
    );
    const selected = [];
    const usedDominantTypes = new Set();

    candidates.forEach((entry) => {
        if (selected.length >= 3) return;
        const dominantType = entry.profile.dominantType;
        if (!dominantType || usedDominantTypes.has(dominantType)) {
            return;
        }
        selected.push(entry);
        usedDominantTypes.add(dominantType);
    });

    const fallbackPool = candidates
        .filter((entry) => !selected.some((picked) => picked.rosterIndex === entry.rosterIndex))
        .sort((left, right) => {
            const leftScore = left.profile.diversity * 10 + left.profile.randomCount + left.profile.specificTotal;
            const rightScore =
                right.profile.diversity * 10 + right.profile.randomCount + right.profile.specificTotal;
            return rightScore - leftScore;
        });
    while (selected.length < 3 && fallbackPool.length > 0) {
        selected.push(fallbackPool.shift());
    }

    return selected
        .slice(0, 3)
        .map((entry) => entry.rosterIndex)
        .filter((rosterIndex) => isRosterIndexInArena(rosterIndex, normalizedArena));
};

const getPlayableRosterIndices = (arena = '') => {
    const normalizedArena = typeof arena === 'string' && arena.trim() ? normalizeArenaMode(arena) : '';
    return (Array.isArray(charactersData) ? charactersData : [])
        .map((character, rosterIndex) => ({ character, rosterIndex }))
        .filter(
            (entry) =>
                entry.character &&
                typeof entry.character.characterId === 'string' &&
                Array.isArray(entry.character.skills) &&
                entry.character.skills.length > 0 &&
                (!normalizedArena ||
                    normalizeArenaMode(entry.character.arena || entry.character.universe) === normalizedArena)
        )
        .map((entry) => entry.rosterIndex);
};

const normalizeDraftBans = (bans = [], arena = '') => {
    const validRoster = new Set(getPlayableRosterIndices(arena));
    const seen = new Set();
    return (Array.isArray(bans) ? bans : [])
        .map((slot) => Number.parseInt(slot, 10))
        .filter((slot) => {
            if (!Number.isInteger(slot) || !validRoster.has(slot) || seen.has(slot)) return false;
            seen.add(slot);
            return true;
        })
        .slice(0, DRAFT_BAN_COUNT);
};

const normalizeDraftTeam = (team = [], bannedSet = new Set(), arena = '') => {
    const validRoster = new Set(getPlayableRosterIndices(arena));
    const seen = new Set();
    return (Array.isArray(team) ? team : [])
        .map((slot) => Number.parseInt(slot, 10))
        .filter((slot) => {
            if (
                !Number.isInteger(slot) ||
                !validRoster.has(slot) ||
                bannedSet.has(slot) ||
                seen.has(slot)
            ) {
                return false;
            }
            seen.add(slot);
            return true;
        })
        .slice(0, DRAFT_TEAM_SIZE);
};

const pickRandomDraftBans = (arena = '') =>
    shuffleList(getPlayableRosterIndices(arena)).slice(0, DRAFT_BAN_COUNT);

const pickRandomDraftTeam = (bannedSet = new Set(), arena = '') =>
    shuffleList(getPlayableRosterIndices(arena).filter((slot) => !bannedSet.has(slot))).slice(0, DRAFT_TEAM_SIZE);

const makeEmptyPendingTurn = () => ({
    queuedByActorSlot: {},
    queueOrder: [],
    unresolvedRandom: 0,
    randomAssignments: createEmptyChakraCost(),
    turnStartChoice: null,
});

const clonePendingTurn = (pending = {}) => ({
    queuedByActorSlot:
        pending && typeof pending.queuedByActorSlot === 'object' ? { ...pending.queuedByActorSlot } : {},
    queueOrder: Array.isArray(pending?.queueOrder)
        ? pending.queueOrder
              .map((slot) => Number.parseInt(slot, 10))
              .filter((slot) => Number.isInteger(slot) && slot >= 0)
        : [],
    unresolvedRandom: Number.isInteger(pending?.unresolvedRandom) ? pending.unresolvedRandom : 0,
    randomAssignments: {
        ...createEmptyChakraCost(),
        ...(pending && typeof pending.randomAssignments === 'object' ? pending.randomAssignments : {}),
    },
    turnStartChoice:
        pending?.turnStartChoice && typeof pending.turnStartChoice === 'object'
            ? {
                  actorSlot: Number.isInteger(pending.turnStartChoice.actorSlot)
                      ? pending.turnStartChoice.actorSlot
                      : null,
                  sourceSkillId:
                      typeof pending.turnStartChoice.sourceSkillId === 'string'
                          ? pending.turnStartChoice.sourceSkillId
                          : null,
                  sourceUsername:
                      typeof pending.turnStartChoice.sourceUsername === 'string'
                          ? pending.turnStartChoice.sourceUsername
                          : null,
                  sourceSlot: Number.isInteger(pending.turnStartChoice.sourceSlot)
                      ? pending.turnStartChoice.sourceSlot
                      : null,
                  sourceStatusId:
                      typeof pending.turnStartChoice.sourceStatusId === 'string'
                          ? pending.turnStartChoice.sourceStatusId
                          : null,
                  promptText:
                      typeof pending.turnStartChoice.promptText === 'string'
                          ? pending.turnStartChoice.promptText
                          : '',
                  options: Array.isArray(pending.turnStartChoice.options)
                      ? pending.turnStartChoice.options
                            .map((option) => {
                                if (!option || typeof option !== 'object') return null;
                                const key =
                                    typeof option.key === 'string' ? option.key.trim().toLowerCase() : '';
                                const label =
                                    typeof option.label === 'string' ? option.label.trim() : '';
                                if (!key || !label) return null;
                                return {
                                    key,
                                    label,
                                    targetStrategy:
                                        typeof option.targetStrategy === 'string'
                                            ? option.targetStrategy.trim().toLowerCase()
                                            : '',
                                    effect:
                                        option.effect && typeof option.effect === 'object'
                                            ? { ...option.effect }
                                            : null,
                                };
                            })
                            .filter(Boolean)
                      : [],
                  maxUses: Number.isInteger(pending.turnStartChoice.maxUses)
                      ? pending.turnStartChoice.maxUses
                      : 0,
                  usesUsed: Number.isInteger(pending.turnStartChoice.usesUsed)
                      ? pending.turnStartChoice.usesUsed
                      : 0,
              }
            : null,
});

const clampPendingTurnRandom = (pendingTurn, pool) => {
    const next = clonePendingTurn(pendingTurn);
    const queuedKeys = new Set(Object.keys(next.queuedByActorSlot || {}));
    const normalizedOrder = [];
    next.queueOrder.forEach((slot) => {
        const key = String(slot);
        if (!queuedKeys.has(key)) return;
        if (normalizedOrder.includes(slot)) return;
        normalizedOrder.push(slot);
    });
    Object.keys(next.queuedByActorSlot || {}).forEach((slotKey) => {
        const slot = Number.parseInt(slotKey, 10);
        if (!Number.isInteger(slot)) return;
        if (!normalizedOrder.includes(slot)) {
            normalizedOrder.push(slot);
        }
    });
    next.queueOrder = normalizedOrder;
    chakraTypes.forEach((type) => {
        next.randomAssignments[type] = Math.max(0, Number(next.randomAssignments[type]) || 0);
    });
    const queued = next.queuedByActorSlot && typeof next.queuedByActorSlot === 'object'
        ? Object.values(next.queuedByActorSlot)
        : [];
    const requiredFromQueue = queued.reduce((sum, item) => sum + (Number(item?.requiredRandom) || 0), 0);
    let assigned = getTotalChakra(next.randomAssignments);
    let overAssigned = Math.max(0, assigned - requiredFromQueue);
    if (overAssigned > 0) {
        chakraTypes.forEach((type) => {
            if (overAssigned <= 0) return;
            const used = Math.min(next.randomAssignments[type], overAssigned);
            if (used <= 0) return;
            next.randomAssignments[type] -= used;
            if (pool && Object.prototype.hasOwnProperty.call(pool, type)) {
                pool[type] = (Number(pool[type]) || 0) + used;
            }
            overAssigned -= used;
        });
        assigned = getTotalChakra(next.randomAssignments);
    }
    next.unresolvedRandom = Math.max(0, requiredFromQueue - assigned);
    return next;
};

const pickInitialTurn = (players = []) => {
    const uniquePlayers = Array.from(new Set(players.filter(Boolean)));
    for (let i = uniquePlayers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniquePlayers[i], uniquePlayers[j]] = [uniquePlayers[j], uniquePlayers[i]];
    }
    const turnOrder = uniquePlayers.slice(0, 2);
    return { turnOrder, currentTurn: turnOrder[0] || null };
};

const generateRandomChakra = (count = 0) => {
    const gains = [];
    for (let i = 0; i < count; i += 1) {
        const pick = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
        gains.push(pick);
    }
    return gains;
};

const applyChakraGain = (pool, gains = []) => {
    const updated = { ...pool };
    gains.forEach((type) => {
        if (updated[type] !== undefined) {
            updated[type] += 1;
        }
    });
    return updated;
};

const getTurnDurationMsForUser = (match, username) => {
    if (!match || !username) return TURN_DURATION_MS;
    if (isGameBotUsername(username)) {
        return 45 * 1000;
    }
    const collectTeamMetadataSum = (targetUsername, metadataKey) => {
        if (!targetUsername || !metadataKey) return 0;
        const units = Array.isArray(match.board?.[targetUsername]) ? match.board[targetUsername] : [];
        return units.reduce((teamTotal, unit, slot) => {
            if (!unit || unit.alive === false) return teamTotal;
            const state = battleLogic.getUnitState(match, targetUsername, slot);
            const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
            const unitTotal = statuses.reduce((statusTotal, status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return statusTotal;
                return statusTotal + (Number(status?.metadata?.[metadataKey]) || 0);
            }, 0);
            return teamTotal + unitTotal;
        }, 0);
    };

    const opponentUsername = findMatchOpponentByUsername(match, username)?.username || null;
    const bonusMs = collectTeamMetadataSum(username, 'ownTurnDurationBonusMs');
    const penaltyMs = opponentUsername ? collectTeamMetadataSum(opponentUsername, 'enemyTurnDurationPenaltyMs') : 0;
    return Math.max(10000, TURN_DURATION_MS + bonusMs - penaltyMs);
};

const initializeEconomyState = (players, currentTurn, aliveLookup = {}) => {
    const chakraPools = {};
    const economy = {
        turnCounts: {},
        startGranted: {},
        lastChakraGain: {},
    };

    players.forEach((username) => {
        chakraPools[username] = createEmptyChakraPool();
        economy.turnCounts[username] = 0;
        economy.startGranted[username] = false;
        economy.lastChakraGain[username] = [];
    });

    if (currentTurn && chakraPools[currentTurn]) {
        const gains = generateRandomChakra(1);
        chakraPools[currentTurn] = applyChakraGain(chakraPools[currentTurn], gains);
        economy.startGranted[currentTurn] = true;
        economy.lastChakraGain[currentTurn] = gains;
    }

    return {
        chakraPools,
        economy,
        turnExpiresAt: new Date(Date.now() + getTurnDurationMsForUser({ players, board: {} }, currentTurn)),
    };
};

const buildMatch = (players, aliveLookup = {}, options = {}) => {
    const arena = normalizeArenaMode(options.arena);
    const { turnOrder, currentTurn } = pickInitialTurn(players);
    const matchId = options.matchId || `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const matchStartsAt = new Date(Date.now() + MATCH_FOUND_HOLD_MS);
    const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
        players,
        currentTurn,
        aliveLookup
    );
    const delayedTurnExpiry = turnExpiresAt
        ? new Date(new Date(turnExpiresAt).getTime() + MATCH_FOUND_HOLD_MS)
        : matchStartsAt;
    const turnStartedAt = matchStartsAt;
    quickMatches.set(matchId, {
        players,
        stateRevision: 0,
        turnNumber: 0,
        createdAt: new Date(),
        arena,
        matchStartsAt,
        turnOrder,
        currentTurn,
        turnStartedAt,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    });
    players.forEach((p) => {
        const opponent = players.find((x) => x !== p) || null;
        if (!isGameBotUsername(p)) {
            userToMatch.set(p, {
                matchId,
                opponent: isGameBotUsername(opponent) ? GAME_BOT_DISPLAY_NAME : opponent,
                arena,
            });
        }
    });
    return {
        matchId,
        stateRevision: 0,
        turnNumber: 0,
        matchStartsAt,
        turnOrder,
        currentTurn,
        turnStartedAt,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    };
};

const enqueuePlayer = (entry) => {
    if (!isValidTeamSelectionForMatch(entry?.team)) {
        return;
    }
    const normalizedEntry = {
        ...entry,
        arena: normalizeArenaMode(entry?.arena),
    };
    if (normalizedEntry.profile && typeof normalizedEntry.profile === 'object') {
        normalizedEntry.profile = buildBattleProfileSnapshot(
            normalizedEntry.profile,
            normalizedEntry.arena
        );
    }
    quickQueue = quickQueue.filter((u) => u.username !== entry.username);
    ladderQueue = ladderQueue.filter((u) => u.username !== entry.username);
    privateQueue = privateQueue.filter((u) => u.username !== entry.username);
    if (normalizedEntry.mode === 'private') {
        privateQueue.push(normalizedEntry);
        return;
    }
    if (normalizedEntry.mode === 'ladder') {
        ladderQueue.push(normalizedEntry);
        return;
    }
    quickQueue.push(normalizedEntry);
};

const dequeueOpponent = (username, mode = 'quick', draftMode = false, arena = DEFAULT_ARENA_MODE) => {
    const wantsDraft = Boolean(draftMode);
    const normalizedArena = normalizeArenaMode(arena);
    const queue = (mode === 'ladder' ? ladderQueue : quickQueue).filter((entry) =>
        isValidTeamSelectionForMatch(entry?.team)
    );
    if (mode === 'ladder') {
        ladderQueue = queue;
    } else {
        quickQueue = queue;
    }
    const opponent = queue.find(
        (u) =>
            u.username !== username &&
            Boolean(u?.draftMode) === wantsDraft &&
            normalizeArenaMode(u?.arena) === normalizedArena
    );
    if (!opponent) return null;
    if (mode === 'ladder') {
        ladderQueue = ladderQueue.filter((u) => u.username !== opponent.username);
    } else {
        quickQueue = quickQueue.filter((u) => u.username !== opponent.username);
    }
    return opponent;
};

const createBattleBotPlayer = ({ matchId, team, ladderLevel = 1, arena = DEFAULT_ARENA_MODE }) => {
    const account = getFakeBattlePlayerAccount(matchId, arena);
    return {
        username: createGameBotUsername(matchId),
        displayName: account.username,
        isBot: true,
        team,
        aliveCount: Array.isArray(team) ? team.length : 3,
        ladderLevel: Math.max(1, Number(ladderLevel) || Number(account.level) || 1),
        profile: buildFakeBattlePlayerProfile(account),
    };
};

const buildPairedMatchDocument = ({ username, team, opponent, mode, arena, profile }) => {
    const normalizedArena = normalizeArenaMode(arena);
    assertMatchTeamsBelongToArena(
        [
            { username, team },
            { username: opponent?.username, team: opponent?.team },
        ],
        normalizedArena
    );
    const aliveLookup = {
        [username]: Array.isArray(team) ? team.length : 3,
        [opponent.username]: Array.isArray(opponent.team) ? opponent.team.length : 3,
    };
    const {
        matchId,
        matchStartsAt,
        turnOrder,
        currentTurn,
        chakraPools,
        economy,
        pendingTurns,
        turnStartedAt,
        turnExpiresAt,
    } = buildMatch([username, opponent.username], aliveLookup, {
        arena: normalizedArena,
    });
    const playerDocs = [
        {
            username,
            team,
            aliveCount: aliveLookup[username],
            profile: buildBattleProfileSnapshot(profile, normalizedArena),
        },
        {
            username: opponent.username,
            team: opponent.team,
            aliveCount: aliveLookup[opponent.username],
            profile:
                opponent.profile && typeof opponent.profile === 'object'
                    ? buildBattleProfileSnapshot(opponent.profile, normalizedArena)
                    : null,
        },
    ];
    const board = battleLogic.buildInitialBoard(playerDocs);
    return {
        matchId,
        stateRevision: 0,
        turnNumber: 0,
        mode,
        arena: normalizedArena,
        status: 'active',
        createdAt: new Date(),
        matchStartsAt,
        chakraPools,
        economy,
        pendingTurns,
        currentTurn,
        turnStartedAt,
        turnOrder,
        turnExpiresAt,
        board,
        players: playerDocs,
        backgroundOverride: getRandomRegularBackground(normalizedArena),
    };
};

const buildBattleBotMatch = async ({ username, team, mode, arena, playerProfile }) => {
    const normalizedArena = normalizeArenaMode(arena);
    const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const botPlayer = createBattleBotPlayer({
        matchId,
        team: await buildBattleBotTeam(normalizedArena),
        ladderLevel: Number(getProfileArenaState(playerProfile, normalizedArena)?.ladder?.level) || 1,
        arena: normalizedArena,
    });
    const aliveLookup = {
        [username]: Array.isArray(team) ? team.length : 3,
        [botPlayer.username]: Array.isArray(botPlayer.team) ? botPlayer.team.length : 3,
    };
    const built = buildMatch([username, botPlayer.username], aliveLookup, {
        matchId,
        arena: normalizedArena,
    });
    const playerDocs = [
        {
            username,
            team,
            aliveCount: aliveLookup[username],
            profile: buildBattleProfileSnapshot(playerProfile, normalizedArena),
        },
        botPlayer,
    ];
    assertMatchTeamsBelongToArena(playerDocs, normalizedArena);
    const board = battleLogic.buildInitialBoard(playerDocs);
    const matchDocument = {
        matchId: built.matchId,
        stateRevision: getMatchStateRevision(built),
        turnNumber: getMatchTurnNumber(built),
        mode,
        arena: normalizedArena,
        status: 'active',
        createdAt: new Date(),
        matchStartsAt: built.matchStartsAt,
        chakraPools: built.chakraPools,
        economy: built.economy,
        pendingTurns: built.pendingTurns,
        currentTurn: built.currentTurn,
        turnStartedAt: built.turnStartedAt,
        turnOrder: built.turnOrder,
        turnExpiresAt: built.turnExpiresAt,
        board,
        players: playerDocs,
        botMatch: {
            enabled: true,
            displayName: botPlayer.displayName,
        },
        backgroundOverride: getRandomRegularBackground(normalizedArena),
    };
    await matchesCollection.insertOne(matchDocument);
    return matchDocument;
};

const createMatchDocumentFromTeams = async ({ mode, arena, players, botMatch = null, extraFields = null }) => {
    const normalizedArena = normalizeArenaMode(arena);
    const aliveLookup = Object.fromEntries(
        players.map((player) => [
            player.username,
            Array.isArray(player.team) ? player.team.length : DRAFT_TEAM_SIZE,
        ])
    );
    const built = buildMatch(players.map((player) => player.username), aliveLookup, {
        arena: normalizedArena,
    });
    const playerDocs = players.map((player) => ({
        ...player,
        aliveCount: aliveLookup[player.username],
    }));
    assertMatchTeamsBelongToArena(playerDocs, normalizedArena);
    const board = battleLogic.buildInitialBoard(playerDocs);
    const matchDocument = {
        matchId: built.matchId,
        stateRevision: getMatchStateRevision(built),
        turnNumber: getMatchTurnNumber(built),
        mode,
        arena: normalizedArena,
        status: 'active',
        createdAt: new Date(),
        matchStartsAt: built.matchStartsAt,
        chakraPools: built.chakraPools,
        economy: built.economy,
        pendingTurns: built.pendingTurns,
        currentTurn: built.currentTurn,
        turnStartedAt: built.turnStartedAt,
        turnOrder: built.turnOrder,
        turnExpiresAt: built.turnExpiresAt,
        board,
        players: playerDocs,
    };
    if (extraFields && typeof extraFields === 'object') {
        Object.assign(matchDocument, cloneSerializable(extraFields));
    }
    if (botMatch) {
        matchDocument.botMatch = botMatch;
    }

    // Assign random background for regular matches if not already set by extraFields (like PvE missions)
    if (!matchDocument.backgroundOverride && (mode === 'quick' || mode === 'ladder' || mode === 'private')) {
        matchDocument.backgroundOverride = getRandomRegularBackground(normalizedArena);
    }

    await matchesCollection.insertOne(matchDocument);
    return matchDocument;
};

const maybeCreateBattleBotMatch = async ({ username, mode, arena, userProfile = null }) => {
    const normalizedArena = normalizeArenaMode(arena);
    if (!BATTLE_BOTS_ENABLED || (mode !== 'quick' && mode !== 'ladder')) {
        return null;
    }
    const queued = findQueuedEntry(username, mode, normalizedArena);
    if (!queued?.entry) {
        return null;
    }
    const queuedAtMs = new Date(queued.entry.queuedAt || Date.now()).getTime();
    if (Number.isNaN(queuedAtMs) || Date.now() - queuedAtMs < BATTLE_BOT_QUEUE_TIMEOUT_MS) {
        return null;
    }
    if (!isValidTeamSelectionForMatch(queued.entry.team)) {
        removeQueuedEntry(username, mode);
        return null;
    }
    removeQueuedEntry(username, mode);
    if (queued.entry.draftMode) {
        const botPlayer = createBattleBotPlayer({
            matchId: `draft-bot-${Date.now()}`,
            team: await buildBattleBotTeam(normalizedArena),
            ladderLevel: Number(getProfileArenaState(userProfile, normalizedArena)?.ladder?.level) || 1,
            arena: normalizedArena,
        });
        return createDraftSession({
            mode,
            arena: normalizedArena,
            players: [
                {
                    ...queued.entry,
                    draftMode: true,
                },
                botPlayer,
            ],
        });
    }
    const matchDocument = await buildBattleBotMatch({
        username,
        team: queued.entry.team,
        mode,
        arena: normalizedArena,
        playerProfile: userProfile,
    });
    return matchDocument;
};

const getDraftOpponentName = (draft, username) => {
    const opponent = (draft?.players || []).find((player) => !usernamesEqual(player.username, username));
    if (!opponent) return null;
    return getPlayerDisplayName(opponent);
};

const serializeDraftForUser = (draft, username) => {
    if (!draft) return null;
    const submitted = draft.submissions?.[username] || {};
    const opponentUsername =
        (draft.players || []).find((player) => !usernamesEqual(player.username, username))?.username || null;
    const opponentSubmitted = opponentUsername ? draft.submissions?.[opponentUsername] || {} : {};
    const bansRevealed = draft.phase !== 'ban';
    return {
        ok: true,
        draft: true,
        draftId: draft.draftId,
        mode: draft.mode,
        arena: normalizeArenaMode(draft.arena),
        phase: draft.phase,
        opponent: getDraftOpponentName(draft, username),
        phaseEndsAt: draft.phaseEndsAt,
        banCount: DRAFT_BAN_COUNT,
        teamSize: DRAFT_TEAM_SIZE,
        myBans: Array.isArray(submitted.bans) ? submitted.bans : [],
        myTeam: Array.isArray(submitted.team) ? submitted.team : [],
        myBanSubmitted: Boolean(submitted.banSubmitted),
        myTeamSubmitted: Boolean(submitted.teamSubmitted),
        opponentBanSubmitted: Boolean(opponentSubmitted.banSubmitted),
        opponentTeamSubmitted: Boolean(opponentSubmitted.teamSubmitted),
        revealedBans: bansRevealed ? draft.revealedBans || [] : [],
        matchId: draft.matchId || null,
        matchStartsAt: draft.matchStartsAt || null,
        requeued: Boolean(draft.requeued?.[username]),
        failed: Boolean(draft.failed?.[username]),
        failureReason: draft.failureReason || '',
    };
};

const finishDraftWithFailure = (draft, failedUsernames = [], reason = 'Draft failed.') => {
    const failedSet = new Set(failedUsernames);
    draft.phase = 'failed';
    draft.failureReason = reason;
    draft.failed = {};
    draft.requeued = {};
    (draft.players || []).forEach((player) => {
        if (player.isBot) return;
        const submitted = draft.submissions?.[player.username] || {};
        if (failedSet.has(player.username)) {
            draft.failed[player.username] = true;
            removeQueuedEntry(player.username, draft.mode);
            return;
        }
        if (isValidTeamSelectionForMatch(submitted.team)) {
            enqueuePlayer({
                ...player,
                team: submitted.team,
                mode: draft.mode,
                draftMode: true,
                queuedAt: new Date(),
            });
            draft.requeued[player.username] = true;
        }
    });
};

const finishDraftWithMatch = async (draft) => {
    if (draft.phase === 'completed') return draft;
    const players = (draft.players || []).map((player) => ({
        ...player,
        team: draft.submissions?.[player.username]?.team || player.team,
    }));
    const matchDocument = await createMatchDocumentFromTeams({
        mode: draft.mode,
        arena: draft.arena,
        players,
        botMatch: players.some((player) => player.isBot)
            ? {
                  enabled: true,
                  displayName: getPlayerDisplayName(players.find((player) => player.isBot)),
              }
            : null,
    });
    draft.phase = 'completed';
    draft.matchId = matchDocument.matchId;
    draft.matchStartsAt = matchDocument.matchStartsAt;
    players.forEach((player) => {
        if (player.isBot) return;
        const opponent = players.find((entry) => !usernamesEqual(entry.username, player.username));
        userToMatch.set(player.username, {
            matchId: matchDocument.matchId,
            opponent: opponent ? getPlayerDisplayName(opponent) : null,
            arena: normalizeArenaMode(draft.arena),
        });
    });
    scheduleBattleBotTurn(matchDocument);
    return draft;
};

const advanceDraftIfNeeded = async (draft) => {
    if (!draft || draft.phase === 'completed' || draft.phase === 'failed') return draft;
    const now = Date.now();
    const players = draft.players || [];
    const allBanSubmitted = players.every((player) => draft.submissions?.[player.username]?.banSubmitted);
    if (draft.phase === 'ban' && (allBanSubmitted || new Date(draft.phaseEndsAt).getTime() <= now)) {
        const allBans = [];
        players.forEach((player) => {
            const submitted = draft.submissions?.[player.username] || {};
            submitted.bans = normalizeDraftBans(submitted.bans, draft.arena);
            submitted.banSubmitted = true;
            draft.submissions[player.username] = submitted;
            allBans.push(...submitted.bans);
        });
        draft.revealedBans = Array.from(new Set(allBans));
        draft.phase = 'pick';
        draft.phaseEndsAt = new Date(Date.now() + DRAFT_PHASE_DURATION_MS);
        const bannedSet = new Set(draft.revealedBans || []);
        players.forEach((player) => {
            if (!player.isBot) return;
            draft.submissions[player.username] = {
                ...(draft.submissions[player.username] || {}),
                team: pickRandomDraftTeam(bannedSet, draft.arena),
                teamSubmitted: true,
            };
        });
    }

    const allTeamSubmitted = players.every((player) => draft.submissions?.[player.username]?.teamSubmitted);
    if (draft.phase === 'pick' && (allTeamSubmitted || new Date(draft.phaseEndsAt).getTime() <= Date.now())) {
        const bannedSet = new Set(draft.revealedBans || []);
        const failed = [];
        players.forEach((player) => {
            const submitted = draft.submissions?.[player.username] || {};
            submitted.team = normalizeDraftTeam(submitted.team, bannedSet, draft.arena);
            if (submitted.team.length !== DRAFT_TEAM_SIZE) {
                failed.push(player.username);
            } else {
                submitted.teamSubmitted = true;
            }
            draft.submissions[player.username] = submitted;
        });
        if (failed.length > 0) {
            finishDraftWithFailure(draft, failed, 'A player did not select a valid team.');
            return draft;
        }
        await finishDraftWithMatch(draft);
    }
    return draft;
};

const createDraftSession = ({ mode, arena, players }) => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draft = {
        draftId,
        mode,
        arena: normalizeArenaMode(arena),
        players,
        phase: 'ban',
        phaseEndsAt: new Date(Date.now() + DRAFT_PHASE_DURATION_MS),
        createdAt: new Date(),
        submissions: {},
        revealedBans: [],
    };
    players.forEach((player) => {
        const bans = player.isBot ? pickRandomDraftBans(arena) : [];
        draft.submissions[player.username] = {
            bans,
            banSubmitted: player.isBot,
            team: [],
            teamSubmitted: false,
        };
        if (!player.isBot) {
            userToDraft.set(player.username, draftId);
        }
    });
    draftSessions.set(draftId, draft);
    return draft;
};

const dequeuePrivateOpponent = (username, targetUsername, arena = DEFAULT_ARENA_MODE) => {
    const normalizedTarget = typeof targetUsername === 'string' ? targetUsername.trim().toLowerCase() : '';
    const normalizedArena = normalizeArenaMode(arena);
    if (!normalizedTarget) return null;
    privateQueue = privateQueue.filter((entry) => isValidTeamSelectionForMatch(entry?.team));
    const opponent = privateQueue.find((entry) => {
        const entryTarget = typeof entry?.targetUsername === 'string'
            ? entry.targetUsername.trim().toLowerCase()
            : '';
        return (
            entry.username !== username &&
            entry.username.toLowerCase() === normalizedTarget &&
            entryTarget === username.toLowerCase() &&
            normalizeArenaMode(entry?.arena) === normalizedArena
        );
    });
    if (!opponent) return null;
    privateQueue = privateQueue.filter((entry) => entry.username !== opponent.username);
    return opponent;
};

const getAliveCountForUser = (match, username) => {
    const playerEntry = findMatchPlayerByUsername(match, username);
    if (playerEntry && Number.isInteger(playerEntry.aliveCount)) {
        return playerEntry.aliveCount;
    }
    if (Array.isArray(playerEntry?.team)) {
        return playerEntry.team.length;
    }
    return 0;
};

const countActiveBattleUnits = (units) =>
    (Array.isArray(units) ? units : []).reduce((count, unit) => {
        if (!unit || unit.alive === false || battleLogic.isUnitBanished(unit)) return count;
        return count + 1;
    }, 0);

const getTeamStatusFlagCount = (match, username, flagName) => {
    if (!match || !username || !flagName) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    let count = 0;
    units.forEach((unit, slot) => {
        if (!unit || unit.alive === false) return;
        const state = battleLogic.getUnitState(match, username, slot);
        const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining > 0 && Boolean(status?.metadata?.[flagName])) {
                count += 1;
            }
        });
    });
    return count;
};

const getTeamStatusMetadataSum = (match, username, metadataKey) => {
    if (!match || !username || !metadataKey) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    let total = 0;
    units.forEach((unit, slot) => {
        if (!unit || unit.alive === false) return;
        const state = battleLogic.getUnitState(match, username, slot);
        const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            total += Number(status?.metadata?.[metadataKey]) || 0;
        });
    });
    return Math.max(0, total);
};

const ensureMatchVersionData = async (match) => {
    if (!match) return match;
    const hadRevision = Number.isInteger(match.stateRevision) && match.stateRevision >= 0;
    const hadTurnNumber = Number.isInteger(match.turnNumber) && match.turnNumber >= 0;
    normalizeMatchVersionFields(match);
    if (!hadRevision || !hadTurnNumber) {
        await persistMatchState(match, {}, { skipInvariants: true });
    }
    return match;
};

const ensureMatchTurnData = async (match) => {
    await ensureMatchVersionData(match);
    if (!match || match.status === 'ended' || match.currentTurn) {
        return match;
    }
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);
    const { turnOrder, currentTurn } = pickInitialTurn(usernames);
    const turnStartedAt = new Date();
    const turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, currentTurn));
    Object.assign(match, { currentTurn, turnOrder, turnStartedAt, turnExpiresAt });
    await persistMatchState(
        match,
        { currentTurn, turnOrder, turnStartedAt, turnExpiresAt },
        { skipInvariants: true }
    );
    return match;
};

const ensureMatchEconomy = async (match) => {
    if (!match || match.status === 'ended') return match;
    let changed = false;
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);

    if (!match.chakraPools || !match.economy) {
        const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
            usernames,
            match.currentTurn
        );
        match.chakraPools = chakraPools;
        match.economy = economy;
        match.turnStartedAt = match.turnStartedAt || new Date();
        match.turnExpiresAt = match.turnExpiresAt || turnExpiresAt;
        changed = true;
    } else {
        // Backfill missing users or keys
        match.chakraPools = match.chakraPools || {};
        match.economy.turnCounts = match.economy.turnCounts || {};
        match.economy.startGranted = match.economy.startGranted || {};
        match.economy.lastChakraGain = match.economy.lastChakraGain || {};
        usernames.forEach((u) => {
            if (!match.chakraPools[u]) {
                match.chakraPools[u] = createEmptyChakraPool();
                changed = true;
            }
            if (!Number.isInteger(match.economy.turnCounts[u])) {
                match.economy.turnCounts[u] = 0;
                changed = true;
            }
            if (typeof match.economy.startGranted[u] !== 'boolean') {
                match.economy.startGranted[u] = false;
                changed = true;
            }
            if (!Array.isArray(match.economy.lastChakraGain[u])) {
                match.economy.lastChakraGain[u] = [];
                changed = true;
            }
        });
        if (!match.turnStartedAt) {
            match.turnStartedAt = new Date();
            changed = true;
        }
        if (!match.turnExpiresAt) {
            match.turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, match.currentTurn));
            changed = true;
        }
    }

    // Ensure first-turn start gain happens once per player
    const current = match.currentTurn;
    if (
        current &&
        !match.economy.startGranted[current] &&
        match.economy.turnCounts[current] === 0
    ) {
        const gains = generateRandomChakra(1);
        match.chakraPools[current] = applyChakraGain(match.chakraPools[current], gains);
        match.economy.startGranted[current] = true;
        match.economy.lastChakraGain[current] = gains;
        changed = true;
    }

    if (changed) {
        await persistMatchState(
            match,
            {
                chakraPools: match.chakraPools,
                economy: match.economy,
                turnStartedAt: match.turnStartedAt,
                turnExpiresAt: match.turnExpiresAt,
            },
            { skipInvariants: true }
        );
    }
    return match;
};

const ensurePendingTurnState = async (match) => {
    if (!match || match.status === 'ended') return match;
    let changed = false;
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);
    if (!match.pendingTurns || typeof match.pendingTurns !== 'object') {
        match.pendingTurns = {};
        changed = true;
    }
    usernames.forEach((username) => {
        const pending = match.pendingTurns[username];
        if (!pending || typeof pending !== 'object') {
            match.pendingTurns[username] = makeEmptyPendingTurn();
            changed = true;
            return;
        }
        const normalized = clampPendingTurnRandom(pending, match.chakraPools?.[username] || {});
        if (JSON.stringify(normalized) !== JSON.stringify(pending)) {
            match.pendingTurns[username] = normalized;
            changed = true;
        }
    });
    if (changed) {
        await persistMatchState(
            match,
            {
                pendingTurns: match.pendingTurns,
            },
            { skipInvariants: true }
        );
    }
    return match;
};

const getPendingTurn = (match, username) => {
    if (!match || !username) return makeEmptyPendingTurn();
    const pending = match.pendingTurns?.[username];
    return clonePendingTurn(pending || makeEmptyPendingTurn());
};

const hasPendingTurnStartChoice = (pendingTurn) =>
    Boolean(
        pendingTurn?.turnStartChoice &&
            Array.isArray(pendingTurn.turnStartChoice.options) &&
            pendingTurn.turnStartChoice.options.length > 0
    );

const persistMatchState = async (
    match,
    fields = {},
    { incrementTurn = false, skipInvariants = false } = {}
) => {
    normalizeMatchVersionFields(match);
    const expectedRevision = getMatchStateRevision(match);
    const nextRevision = expectedRevision + 1;
    const nextTurnNumber = getMatchTurnNumber(match) + (incrementTurn ? 1 : 0);
    const nextFields = {
        ...fields,
        stateRevision: nextRevision,
        turnNumber: nextTurnNumber,
    };
    const candidate = { ...match, ...nextFields };
    if (!skipInvariants) {
        assertMatchInvariants(candidate, {
            chakraTypes,
            isUnitBanished: battleLogic.isUnitBanished,
        });
    }
    const revisionFilter =
        expectedRevision === 0
            ? {
                  matchId: match.matchId,
                  $or: [{ stateRevision: 0 }, { stateRevision: { $exists: false } }],
              }
            : { matchId: match.matchId, stateRevision: expectedRevision };
    const result = await matchesCollection.updateOne(revisionFilter, { $set: nextFields });
    if (result && result.matchedCount === 0) {
        throw new MatchRevisionConflictError();
    }
    Object.assign(match, nextFields);
    if (quickMatches.has(match.matchId)) {
        quickMatches.set(match.matchId, {
            ...(quickMatches.get(match.matchId) || {}),
            ...nextFields,
        });
    }
    return match;
};

const parseExpectedMatchRevision = (body = {}) => {
    if (body?.expectedRevision === undefined || body?.expectedRevision === null) return null;
    return toNonNegativeInteger(body.expectedRevision, -1);
};

const hasExpectedRevisionConflict = (match, body = {}) => {
    const expectedRevision = parseExpectedMatchRevision(body);
    return expectedRevision !== null && expectedRevision !== getMatchStateRevision(match);
};

const getBattleBotPlayer = (match) =>
    Array.isArray(match?.players) ? match.players.find((player) => player?.isBot) || null : null;

const getBattleBotUsername = (match) => getBattleBotPlayer(match)?.username || null;

const isBattleBotTurn = (match) => isGameBotUsername(match?.currentTurn || '');

const botCanAffordSkill = ({ match, username, skill, actorState }) => {
    const pool = match?.chakraPools?.[username];
    if (!pool || !skill) {
        return false;
    }
    const pending = getPendingTurn(match, username);
    const { reservedSpecific, requiredRandom } = battleLogic.computeEffectiveEnergyCost({
        skill,
        actorState,
    });
    for (const type of chakraTypes) {
        if ((Number(pool[type]) || 0) < (Number(reservedSpecific[type]) || 0)) {
            return false;
        }
    }
    const remainingPool = chakraTypes.reduce((sum, type) => {
        const remaining = (Number(pool[type]) || 0) - (Number(reservedSpecific[type]) || 0);
        return sum + Math.max(0, remaining);
    }, 0);
    return remainingPool >= Math.max(0, Number(pending.unresolvedRandom) || 0) + requiredRandom;
};

const getBattleBotUnitForTarget = (match, target) => {
    if (!match || !target || typeof target.username !== 'string') return null;
    const slot = Number.parseInt(target.slot, 10);
    if (!Number.isInteger(slot) || slot < 0) return null;
    const team = Array.isArray(match.board?.[target.username]) ? match.board[target.username] : [];
    return team[slot] || null;
};

const getBattleBotUnitStateForTarget = (match, target) => {
    if (!match || !target || typeof target.username !== 'string') return null;
    const slot = Number.parseInt(target.slot, 10);
    if (!Number.isInteger(slot) || slot < 0) return null;
    return battleLogic.getUnitState(match, target.username, slot);
};

const isBattleBotStatusActive = (status, unit) => {
    const remaining = Number(status?.remainingTurns) || 0;
    if (remaining <= 0) return false;
    const metadata = status?.metadata || {};
    const currentHp = Math.max(0, Number(unit?.hp) || 0);
    const hpAtLeast = Number(metadata?.activeWhileOwnerCurrentHpAtLeast);
    if (Number.isFinite(hpAtLeast) && currentHp < hpAtLeast) {
        return false;
    }
    const hpAtMost = Number(metadata?.activeWhileOwnerCurrentHpAtMost);
    if (Number.isFinite(hpAtMost) && currentHp > hpAtMost) {
        return false;
    }
    return true;
};

const getBattleBotActiveStatusesForTarget = (match, target) => {
    const unit = getBattleBotUnitForTarget(match, target);
    const state = getBattleBotUnitStateForTarget(match, target);
    if (!unit || !state) return [];
    return (Array.isArray(state.statuses) ? state.statuses : []).filter((status) => isBattleBotStatusActive(status, unit));
};

const countBattleBotHarmfulStatusesForTarget = (match, target) =>
    getBattleBotActiveStatusesForTarget(match, target).filter((status) => Boolean(status?.metadata?.harmful)).length;

const countBattleBotLivingUnits = (match, username) => {
    const team = Array.isArray(match?.board?.[username]) ? match.board[username] : [];
    return countActiveBattleUnits(team);
};

const countBattleBotUnitsMatching = (match, username, predicate) => {
    const team = Array.isArray(match?.board?.[username]) ? match.board[username] : [];
    return team.reduce((count, unit, slot) => {
        if (!unit || typeof predicate !== 'function') return count;
        return predicate(unit, slot) ? count + 1 : count;
    }, 0);
};

const getBattleBotSkillText = (skill) => {
    if (!skill || typeof skill !== 'object') return '';
    const parts = [
        skill.name,
        skill.skilldescription,
        skill.description,
        skill.target,
        Array.isArray(skill.classes) ? skill.classes.join(' ') : '',
    ];
    try {
        parts.push(JSON.stringify(skill.effects || []));
    } catch (error) {
        // Ignore malformed skill data and keep the readable fields.
    }
    return parts.filter(Boolean).join(' ').toLowerCase();
};

const isLikelyBattleBotDefensiveSkill = (skill, skillIndex = -1) => {
    const text = getBattleBotSkillText(skill);
    const helpfulTarget = /self|ally|allies/.test(String(skill?.target || '').toLowerCase());
    const defensiveWords =
        /defense|defence|destructible|protect|invulner|heal|restore|reduce|reduction|counter|reflect|evade|ignore|cleanse|remove harmful|cannot be killed|minimum hp/.test(
            text
        );
    return defensiveWords || (skillIndex === 3 && helpfulTarget);
};

const getBattleBotRecentDamage = (match, username, actorSlot) => {
    const damageEntry = match?.lastTurnDamageByUsername?.byUsername?.[username] || {};
    const bySlot = damageEntry.bySlot || {};
    return {
        slotDamage: Math.max(0, Number(bySlot[String(actorSlot)]) || 0),
        teamDamage: Math.max(0, Number(damageEntry.total) || 0),
    };
};

const collectBattleBotEffectAmount = (value, acceptedTypes, acceptedKeys, depth = 0) => {
    if (!value || depth > 5) return 0;
    if (Array.isArray(value)) {
        return value.reduce(
            (sum, entry) => sum + collectBattleBotEffectAmount(entry, acceptedTypes, acceptedKeys, depth + 1),
            0
        );
    }
    if (typeof value !== 'object') return 0;
    const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
    let total = 0;
    if (acceptedTypes.has(type)) {
        acceptedKeys.forEach((key) => {
            total += Math.max(0, Number(value[key]) || 0);
        });
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key === 'condition') return;
        total += collectBattleBotEffectAmount(entry, acceptedTypes, acceptedKeys, depth + 1);
    });
    return total;
};

const hasBattleBotEffectType = (value, acceptedTypes, depth = 0) => {
    if (!value || depth > 5) return false;
    if (Array.isArray(value)) {
        return value.some((entry) => hasBattleBotEffectType(entry, acceptedTypes, depth + 1));
    }
    if (typeof value !== 'object') return false;
    const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
    if (acceptedTypes.has(type)) {
        return true;
    }
    return Object.entries(value).some(([key, entry]) => key !== 'condition' && hasBattleBotEffectType(entry, acceptedTypes, depth + 1));
};

const collectBattleBotAppliedStatusIds = (value, depth = 0, statusIds = new Set()) => {
    if (!value || depth > 5) return statusIds;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectBattleBotAppliedStatusIds(entry, depth + 1, statusIds));
        return statusIds;
    }
    if (typeof value !== 'object') return statusIds;
    const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
    if (type === 'apply_status' && typeof value.statusId === 'string' && value.statusId) {
        statusIds.add(value.statusId);
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key === 'condition') return;
        collectBattleBotAppliedStatusIds(entry, depth + 1, statusIds);
    });
    return statusIds;
};

const collectBattleBotStackableStatusIds = (value, depth = 0, statusIds = new Set()) => {
    if (!value || depth > 5) return statusIds;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectBattleBotStackableStatusIds(entry, depth + 1, statusIds));
        return statusIds;
    }
    if (typeof value !== 'object') return statusIds;
    const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
    const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : {};
    if (
        type === 'apply_status' &&
        typeof value.statusId === 'string' &&
        value.statusId &&
        (
            metadata.stackMetadataKey ||
            Number(metadata.stackDelta) > 0 ||
            (Array.isArray(metadata.mergeNumericAddKeys) && metadata.mergeNumericAddKeys.length > 0)
        )
    ) {
        statusIds.add(value.statusId);
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key === 'condition') return;
        collectBattleBotStackableStatusIds(entry, depth + 1, statusIds);
    });
    return statusIds;
};

const estimateBattleBotPersistentDamage = (skill) => {
    const visit = (value, depth = 0) => {
        if (!value || depth > 5) return 0;
        if (Array.isArray(value)) {
            return value.reduce((sum, entry) => sum + visit(entry, depth + 1), 0);
        }
        if (typeof value !== 'object') return 0;
        const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
        let total = 0;
        if (type === 'apply_status') {
            const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : {};
            total += Math.max(0, Number(metadata.turnStartDamage) || 0);
            total += Math.max(0, Number(metadata.turnEndDamage) || 0);
        }
        Object.entries(value).forEach(([key, entry]) => {
            if (key === 'condition' || key === 'metadata') return;
            total += visit(entry, depth + 1);
        });
        return total;
    };
    return visit(skill?.effects || []);
};

const estimateBattleBotSkillDamage = (skill) => {
    const directDamage = Math.max(0, Number(skill?.damage) || 0);
    const effectDamage = collectBattleBotEffectAmount(
        skill?.effects || [],
        new Set(['damage', 'health_steal_damage']),
        ['amount', 'damage', 'turnEndDamage']
    );
    const text = getBattleBotSkillText(skill);
    const textDamage = Array.from(text.matchAll(/(?:deal|deals|damage|take|takes)\D{0,16}(\d+)\s+damage/g)).reduce(
        (sum, match) => sum + Math.max(0, Number(match[1]) || 0),
        0
    );
    return Math.max(directDamage, effectDamage, textDamage);
};

const estimateBattleBotSkillHealing = (skill) =>
    collectBattleBotEffectAmount(skill?.effects || [], new Set(['heal', 'revive']), ['amount', 'heal']);

const isLikelyBattleBotReviveSkill = (skill) =>
    hasBattleBotEffectType(skill?.effects || [], new Set(['revive'])) || /\brevive\b/.test(getBattleBotSkillText(skill));

const isLikelyBattleBotCleanseSkill = (skill) =>
    hasBattleBotEffectType(skill?.effects || [], new Set(['cleanse_statuses'])) ||
    /cleanse|remove harmful|remove all enemy skills currently affecting/.test(getBattleBotSkillText(skill));

const isLikelyBattleBotControlSkill = (skill) =>
    /stun|disable|cooldown|drain|remove chakra|cannot use|paraly|fail|countered|ignore healing/.test(
        getBattleBotSkillText(skill)
    );

const scoreBattleBotDamageCoordination = ({ hp = 0, projectedDamage = 0, candidateDamage = 0 } = {}) => {
    const safeHp = Math.max(0, Number(hp) || 0);
    const committedDamage = Math.max(0, Number(projectedDamage) || 0);
    const nextDamage = Math.max(0, Number(candidateDamage) || 0);
    if (safeHp <= 0 || nextDamage <= 0) return 0;
    if (committedDamage >= safeHp) return -180;
    const remainingHp = Math.max(1, safeHp - committedDamage);
    let score = Math.min(36, committedDamage * 0.8);
    if (nextDamage >= remainingHp) score += 110;
    const wastedDamage = Math.max(0, nextDamage - remainingHp);
    score -= Math.min(45, wastedDamage * 0.75);
    return score;
};

const getBattleBotQueuedDamageForTarget = (match, username, target) => {
    const pending = getPendingTurn(match, username);
    return Object.values(pending?.queuedByActorSlot || {}).reduce((total, queued) => {
        const hitsTarget = (Array.isArray(queued?.targetSelection) ? queued.targetSelection : [])
            .some((entry) => usernamesEqual(entry?.username, target?.username) && Number(entry?.slot) === Number(target?.slot));
        if (!hitsTarget) return total;
        const actorSlot = Number.parseInt(queued.actorSlot, 10);
        const actorUnit = match?.board?.[username]?.[actorSlot];
        if (!actorUnit) return total;
        const actorState = battleLogic.getUnitState(match, username, actorSlot);
        const skill = battleLogic.resolveEffectiveSkill({
            characters: charactersData,
            rosterIndex: actorUnit.rosterIndex,
            skillIndex: queued.skillIndex,
            actorState,
        });
        return total + estimateBattleBotSkillDamage(skill);
    }, 0);
};

const scoreBattleBotTarget = ({ match, username, actorSlot, skill, target, damageEstimate, healingEstimate }) => {
    const unit = getBattleBotUnitForTarget(match, target);
    if (!unit) return 0;
    const hp = Math.max(0, Number(unit.hp) || 0);
    const sameTeam = target.username === username;
    const isReviveSkill = isLikelyBattleBotReviveSkill(skill);
    const isCleanseSkill = isLikelyBattleBotCleanseSkill(skill);
    const isControlSkill = isLikelyBattleBotControlSkill(skill);
    const harmfulStatusCount = countBattleBotHarmfulStatusesForTarget(match, target);
    const appliedStatusIds = Array.from(collectBattleBotAppliedStatusIds(skill?.effects || []));
    const stackableStatusIds = collectBattleBotStackableStatusIds(skill?.effects || []);
    const activeStatuses = getBattleBotActiveStatusesForTarget(match, target);
    const duplicateStatusCount = appliedStatusIds.filter((statusId) =>
        !stackableStatusIds.has(statusId) &&
        activeStatuses.some((status) => status?.id === statusId)
    ).length;
    const persistentDamageEstimate = estimateBattleBotPersistentDamage(skill);
    let score = Math.random() * 4;
    if (sameTeam) {
        if (isReviveSkill) {
            if (unit.alive === false || hp <= 0) {
                return score + 260;
            }
            return score - 120;
        }
        const missingHpScore = Math.max(0, 100 - hp);
        const recentDamage = getBattleBotRecentDamage(match, username, target.slot);
        score += missingHpScore;
        score += Math.min(40, recentDamage.slotDamage);
        if (Number.parseInt(target.slot, 10) === actorSlot) score += 8;
        if (healingEstimate > 0 && hp < 75) score += 25;
        if (healingEstimate > 0 && hp <= 40) score += 45;
        if (isCleanseSkill && harmfulStatusCount > 0) score += 30 + harmfulStatusCount * 16;
        if (duplicateStatusCount > 0 && harmfulStatusCount === 0) score -= duplicateStatusCount * 24;
        return score;
    }
    const projectedDamage = getBattleBotQueuedDamageForTarget(match, username, target);
    const projectedHp = Math.max(0, hp - projectedDamage);
    score += Math.max(0, 100 - projectedHp) / 2;
    if (damageEstimate > 0) score += Math.min(60, damageEstimate);
    if (persistentDamageEstimate > 0) {
        score += Math.min(72, persistentDamageEstimate * 7);
        if (Array.from(stackableStatusIds).some((statusId) =>
            activeStatuses.some((status) => status?.id === statusId)
        )) {
            score += 20;
        }
    }
    score += scoreBattleBotDamageCoordination({ hp, projectedDamage, candidateDamage: damageEstimate });
    if (isControlSkill && hp > damageEstimate) score += 18;
    if (duplicateStatusCount > 0 && damageEstimate <= 0) score -= duplicateStatusCount * 18;
    return score;
};

const chooseBattleBotTargetSelection = (options = {}, context = {}) => {
    const targets = Array.isArray(options.targets) ? options.targets : [];
    if (!targets.length) {
        return null;
    }
    if (options.mode === 'single' || options.mode === 'self') {
        const scoredTargets = shuffleList(targets).map((target) => ({
            target,
            score: scoreBattleBotTarget({
                match: context.match,
                username: context.username,
                actorSlot: context.actorSlot,
                skill: context.skill,
                target,
                damageEstimate: context.damageEstimate || 0,
                healingEstimate: context.healingEstimate || 0,
            }),
        }));
        scoredTargets.sort((a, b) => b.score - a.score);
        return scoredTargets[0]?.target ? [scoredTargets[0].target] : null;
    }
    return targets;
};

const scoreBattleBotSkillCandidate = ({
    match,
    username,
    actorSlot,
    actorUnit,
    skill,
    skillIndex,
    targetSelection,
    preferDefense,
}) => {
    const damageEstimate = estimateBattleBotSkillDamage(skill);
    const healingEstimate = estimateBattleBotSkillHealing(skill);
    const targetType = String(skill?.target || '').toLowerCase();
    const defensive = isLikelyBattleBotDefensiveSkill(skill, skillIndex);
    const reviveSkill = isLikelyBattleBotReviveSkill(skill);
    const cleanseSkill = isLikelyBattleBotCleanseSkill(skill);
    const controlSkill = isLikelyBattleBotControlSkill(skill);
    const persistentDamageEstimate = estimateBattleBotPersistentDamage(skill);
    const recentDamage = getBattleBotRecentDamage(match, username, actorSlot);
    const actorHp = Math.max(0, Number(actorUnit?.hp) || 0);
    const opponentUsername = findMatchOpponentByUsername(match, username)?.username || null;
    const enemyAliveCount = opponentUsername ? countBattleBotLivingUnits(match, opponentUsername) : 0;
    const deadAllyCount = countBattleBotUnitsMatching(match, username, (unit) => unit && (unit.alive === false || (Number(unit.hp) || 0) <= 0));
    const lowAllyCount = countBattleBotUnitsMatching(match, username, (unit) => unit && unit.alive !== false && (Number(unit.hp) || 0) <= 45);
    const hurtAllyCount = countBattleBotUnitsMatching(match, username, (unit) => unit && unit.alive !== false && (Number(unit.hp) || 0) <= 70);
    const harmfulAllyStatusCount = countBattleBotUnitsMatching(match, username, (unit, slot) => {
        if (!unit || unit.alive === false) return false;
        return countBattleBotHarmfulStatusesForTarget(match, { username, slot }) > 0;
    });
    const selectedTargets = Array.isArray(targetSelection) ? targetSelection : [];
    const selectedEnemyKillCount = selectedTargets.filter((target) => {
        if (target?.username === username) return false;
        const targetUnit = getBattleBotUnitForTarget(match, target);
        const targetHp = Math.max(0, Number(targetUnit?.hp) || 0);
        return damageEstimate > 0 && targetHp > 0 && damageEstimate >= targetHp;
    }).length;
    const selectedDeadAllyCount = selectedTargets.filter((target) => {
        if (target?.username !== username) return false;
        const targetUnit = getBattleBotUnitForTarget(match, target);
        return targetUnit && (targetUnit.alive === false || (Number(targetUnit.hp) || 0) <= 0);
    }).length;
    const selectedLowAllyCount = selectedTargets.filter((target) => {
        if (target?.username !== username) return false;
        const targetUnit = getBattleBotUnitForTarget(match, target);
        return targetUnit && targetUnit.alive !== false && (Number(targetUnit.hp) || 0) <= 45;
    }).length;
    const selectedHarmfulStatusCount = selectedTargets.reduce((sum, target) => {
        if (target?.username !== username) return sum;
        return sum + countBattleBotHarmfulStatusesForTarget(match, target);
    }, 0);
    let score = Math.random() * 4;

    if (preferDefense && defensive) score += 110;
    if (preferDefense && skillIndex === 3) score += 70;
    if (!preferDefense && damageEstimate > 0) score += 20;
    if (!preferDefense && persistentDamageEstimate > 0) {
        score += Math.min(80, 25 + persistentDamageEstimate * 6);
    }
    if (defensive && (recentDamage.slotDamage >= 30 || actorHp <= 45)) score += 25;
    if (/all-enemy/.test(targetType)) score += Math.max(15, damageEstimate) + Math.max(0, enemyAliveCount - 1) * 18;
    if (/self|ally|allies/.test(targetType)) score += healingEstimate > 0 ? healingEstimate : 12;
    if (controlSkill) score += 18;
    if (selectedEnemyKillCount > 0) score += 140 * selectedEnemyKillCount;
    if (reviveSkill) {
        score += deadAllyCount > 0 ? 220 + selectedDeadAllyCount * 80 : -90;
    }
    if (healingEstimate > 0) {
        score += selectedLowAllyCount * 60;
        if (lowAllyCount === 0 && hurtAllyCount === 0) score -= 35;
    }
    if (cleanseSkill) {
        score += harmfulAllyStatusCount > 0 ? 90 + selectedHarmfulStatusCount * 18 : -30;
    }
    if (defensive && lowAllyCount === 0 && harmfulAllyStatusCount === 0 && recentDamage.teamDamage < 25 && damageEstimate <= 0) {
        score -= 90;
    }

    selectedTargets.forEach((target) => {
        score += scoreBattleBotTarget({
            match,
            username,
            actorSlot,
            skill,
            target,
            damageEstimate,
            healingEstimate,
        });
    });

    return {
        score,
        defensive,
    };
};

const chooseBattleBotSkillCandidate = ({ match, username, actorSlot, actorUnit, actorState, character }) => {
    const skills = Array.isArray(character?.skills) ? character.skills : [];
    const recentDamage = getBattleBotRecentDamage(match, username, actorSlot);
    const actorHp = Math.max(0, Number(actorUnit?.hp) || 0);
    const tookHeavyDamage =
        recentDamage.slotDamage >= 30 ||
        recentDamage.teamDamage >= 55 ||
        (actorHp <= 40 && recentDamage.slotDamage > 0);
    const preferDefense = tookHeavyDamage && Math.random() < 0.5;
    const candidates = [];

    shuffleList(skills.map((_, index) => index)).forEach((skillIndex) => {
        const baseSkill = skills[skillIndex];
        if (baseSkill?.hiddenFromSelectionViewer) {
            return;
        }
        const options = battleLogic.computeTargetOptions({
            match,
            actingUsername: username,
            actorSlot,
            skillIndex,
            characters: charactersData,
        });
        if (!options?.targetType || options.mode === 'unknown' || !Array.isArray(options.targets) || !options.targets.length) {
            return;
        }
        const skill = battleLogic.resolveEffectiveSkill({
            characters: charactersData,
            rosterIndex: actorUnit.rosterIndex,
            skillIndex,
            actorState,
        });
        if (!botCanAffordSkill({ match, username, skill, actorState })) {
            return;
        }
        const damageEstimate = estimateBattleBotSkillDamage(skill);
        const healingEstimate = estimateBattleBotSkillHealing(skill);
        const targetSelection = chooseBattleBotTargetSelection(options, {
            match,
            username,
            actorSlot,
            skill,
            damageEstimate,
            healingEstimate,
        });
        if (!targetSelection) {
            return;
        }
        const classChoiceOptions = Array.isArray(skill?.classChoiceOptions)
            ? skill.classChoiceOptions.map((entry) => normalizeClassChoice(entry)).filter(Boolean)
            : [];
        const absorptionChoiceKeys = getAbsorptionChoiceKeysForSkill(skill);
        const scored = scoreBattleBotSkillCandidate({
            match,
            username,
            actorSlot,
            actorUnit,
            skill,
            skillIndex,
            targetSelection,
            preferDefense,
        });
        candidates.push({
            skillIndex,
            targetSelection,
            classChoice: classChoiceOptions.length
                ? classChoiceOptions[Math.floor(Math.random() * classChoiceOptions.length)]
                : null,
            absorptionChoice: absorptionChoiceKeys.length
                ? absorptionChoiceKeys[Math.floor(Math.random() * absorptionChoiceKeys.length)]
                : null,
            score: scored.score,
            defensive: scored.defensive || skillIndex === 3,
        });
    });

    const pool = preferDefense && candidates.some((candidate) => candidate.defensive)
        ? candidates.filter((candidate) => candidate.defensive)
        : candidates;
    pool.sort((a, b) => b.score - a.score);
    return pool[0] || null;
};

const snapshotBattleHpByUsername = (match) => {
    const snapshot = {};
    (match?.players || []).forEach((player) => {
        if (!player?.username) return;
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        snapshot[player.username] = {};
        units.forEach((unit, slot) => {
            snapshot[player.username][String(slot)] = Math.max(0, Number(unit?.hp) || 0);
        });
    });
    return snapshot;
};

const buildLastTurnDamageByUsername = ({ match, hpBefore, endedBy }) => {
    const byUsername = {};
    (match?.players || []).forEach((player) => {
        if (!player?.username) return;
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        const bySlot = {};
        let total = 0;
        units.forEach((unit, slot) => {
            const previousHp = Math.max(0, Number(hpBefore?.[player.username]?.[String(slot)]) || 0);
            const nextHp = Math.max(0, Number(unit?.hp) || 0);
            const damage = Math.max(0, previousHp - nextHp);
            if (damage > 0) {
                bySlot[String(slot)] = damage;
                total += damage;
            }
        });
        byUsername[player.username] = { total, bySlot };
    });
    return {
        endedBy,
        createdAt: new Date(),
        byUsername,
    };
};

const assignBattleBotRandomChakra = ({ match, username }) => {
    const pending = getPendingTurn(match, username);
    while ((pending.unresolvedRandom || 0) > 0) {
        const pool = match?.chakraPools?.[username] || createEmptyChakraPool();
        const availableTypes = chakraTypes.filter((type) => (Number(pool[type]) || 0) > 0);
        if (!availableTypes.length) {
            break;
        }
        const chakraType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        adjustRandomAssignment({ match, username, chakraType, delta: 1 });
        const nextPending = getPendingTurn(match, username);
        pending.unresolvedRandom = nextPending.unresolvedRandom;
    }
};

const resolveTurnStartChoiceForUser = ({
    match,
    username,
    choiceKey,
    targetUsername = null,
    targetSlot = null,
}) => {
    const pendingTurn = getPendingTurn(match, username);
    const prompt = pendingTurn.turnStartChoice;
    if (!hasPendingTurnStartChoice(pendingTurn) || !prompt) {
        throw new Error('No turn-start choice is pending.');
    }
    const option = Array.isArray(prompt.options)
        ? prompt.options.find((entry) => entry?.key === choiceKey)
        : null;
    if (!option) {
        throw new Error('Invalid turn-start choice.');
    }

    const manualTarget =
        typeof targetUsername === 'string' && Number.isInteger(targetSlot)
            ? { username: targetUsername, slot: targetSlot }
            : null;

    const sourceUnit = Array.isArray(match.board?.[username]) ? match.board[username][prompt.actorSlot] : null;
    const targetPick = battleLogic.selectTurnStartChoiceTarget({
        match,
        actingUsername: username,
        choice: option,
        manualTarget,
    });
    if (!targetPick?.unit) {
        throw new Error('No valid target available.');
    }
    const targetUnit = targetPick.unit;
    const targetState = battleLogic.getUnitState(match, targetPick.username, targetPick.slot);
    const effects = Array.isArray(option.effects) ? option.effects : [option.effect || {}];
    effects.forEach((effect) => {
        const effectType = typeof effect.type === 'string' ? effect.type.trim().toLowerCase() : '';
        if (effectType === 'heal') {
            battleLogic.applyHealToUnit(targetUnit, Math.max(0, Number(effect.amount) || 0));
        } else if (effectType === 'cleanse_harmful') {
            battleLogic.cleanseHarmfulStatuses(targetUnit, effect.count);
        } else if (effectType === 'revive') {
            battleLogic.reviveUnitToHp(targetUnit, Math.max(1, Number(effect.amount) || 30));
            targetState.statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
        } else if (effectType === 'apply_status') {
            battleLogic.applyStatus({
                targetState,
                statusId: effect.statusId,
                duration: effect.duration,
                sourceSkillId: prompt.sourceSkillId,
                sourceUsername: username,
                sourceSlot: prompt.actorSlot,
                metadata: effect.metadata,
            });
        }
    });

    match.players.forEach((player) => {
        if (!player?.username) return;
        player.aliveCount = getAliveCountForUser(match, player.username);
    });

    const sourceState = sourceUnit ? battleLogic.getUnitState(match, username, prompt.actorSlot) : null;
    if (sourceState && prompt.sourceStatusId) {
        const status = Array.isArray(sourceState.statuses)
            ? sourceState.statuses.find((entry) => entry?.id === prompt.sourceStatusId)
            : null;
        if (status) {
            const metadata = status?.metadata && typeof status.metadata === 'object' ? { ...status.metadata } : {};
            metadata.turnStartChoiceQueued = false;
            metadata.turnStartChoiceUsesUsed = Math.max(0, Number(metadata.turnStartChoiceUsesUsed) || 0) + 1;
            status.metadata = metadata;
            const maxUses = Math.max(0, Number(metadata.turnStartChoiceMaxUses) || 0);
            if (maxUses > 0 && metadata.turnStartChoiceUsesUsed >= maxUses) {
                status.metadata = {
                    ...metadata,
                    tooltipText: "Doctor's Bag has been used.",
                    turnStartChoiceQueued: false,
                };
            }
        }
    }
    pendingTurn.turnStartChoice = null;
    match.pendingTurns[username] = pendingTurn;
};

const resolveExpiredTurnStartChoiceIfNeeded = ({ match, username }) => {
    if (!match || !username) return false;
    const pendingTurn = getPendingTurn(match, username);
    if (!hasPendingTurnStartChoice(pendingTurn)) {
        return false;
    }
    const defaultChoice = Array.isArray(pendingTurn.turnStartChoice?.options)
        ? pendingTurn.turnStartChoice.options[0]
        : null;
    if (!defaultChoice?.key) {
        return false;
    }
    resolveTurnStartChoiceForUser({
        match,
        username,
        choiceKey: defaultChoice.key,
    });
    return true;
};

const getBattleBotMaxQueuedSkillsForMatch = (match = {}) => {
    const pveMissionId = slugifyMissionId(match.specialPveMissionId || match.pveBattle?.missionId || '');
    if (!pveMissionId) {
        return Number.POSITIVE_INFINITY;
    }
    const explicitLimit = Number(match.pveBattle?.botMaxQueuedSkillsPerTurn);
    if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
        return Math.max(1, Math.min(3, Math.floor(explicitLimit)));
    }
    if (pveMissionId === 'predatorstalker' || pveMissionId === 'raid-on-the-xenomorph-hive') {
        return 2;
    }
    return 1;
};

const runBattleBotTurnUnlocked = async (matchId) => {
    if (!matchId || activeBattleBotTurns.has(matchId)) {
        return;
    }
    activeBattleBotTurns.add(matchId);
    try {
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return;
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated || hydrated.status === 'ended' || !isBattleBotTurn(hydrated)) {
            return;
        }
        const username = hydrated.currentTurn;
        const pendingTurn = getPendingTurn(hydrated, username);
        if (hasPendingTurnStartChoice(pendingTurn)) {
            const choice = Array.isArray(pendingTurn.turnStartChoice?.options)
                ? pendingTurn.turnStartChoice.options[0]
                : null;
            if (choice?.key) {
                resolveTurnStartChoiceForUser({
                    match: hydrated,
                    username,
                    choiceKey: choice.key,
                });
            }
        }

        const team = Array.isArray(hydrated.board?.[username]) ? hydrated.board[username] : [];
        const remainingActorSlots = team
            .map((unit, slot) => (unit && unit.alive !== false ? slot : null))
            .filter((slot) => Number.isInteger(slot));
        const maxQueuedSkills = getBattleBotMaxQueuedSkillsForMatch(hydrated);
        let queuedSkills = 0;
        while (remainingActorSlots.length && queuedSkills < maxQueuedSkills) {
            const turnPlans = remainingActorSlots.map((actorSlot) => {
                const actorUnit = hydrated.board?.[username]?.[actorSlot];
                if (!actorUnit || actorUnit.alive === false) return null;
                const actorState = battleLogic.getUnitState(hydrated, username, actorSlot);
                if (battleLogic.isActorUnableToUseSkills(actorState)) return null;
                const candidate = chooseBattleBotSkillCandidate({
                    match: hydrated,
                    username,
                    actorSlot,
                    actorUnit,
                    actorState,
                    character: charactersData?.[actorUnit.rosterIndex],
                });
                return candidate ? { actorSlot, candidate } : null;
            }).filter(Boolean).sort((left, right) => right.candidate.score - left.candidate.score);
            const bestPlan = turnPlans[0] || null;
            if (!bestPlan || bestPlan.candidate.score < 5) break;
            const { actorSlot, candidate } = bestPlan;
            remainingActorSlots.splice(remainingActorSlots.indexOf(actorSlot), 1);
            try {
                queueSkillForActorSlot({
                    match: hydrated,
                    username,
                    actorSlot,
                    skillIndex: candidate.skillIndex,
                    targetSelection: candidate.targetSelection,
                    classChoice: candidate.classChoice,
                    absorptionChoice: candidate.absorptionChoice,
                });
                queuedSkills += 1;
            } catch (error) {
                continue;
            }
        }

        assignBattleBotRandomChakra({ match: hydrated, username });
        const updated = await finalizeTurn(hydrated, username);
        await broadcastMatchState(updated || hydrated);
        if (updated && isBattleBotTurn(updated)) {
            scheduleBattleBotTurn(updated);
        }
    } finally {
        activeBattleBotTurns.delete(matchId);
    }
};

const runBattleBotTurn = (matchId) =>
    matchCommandCoordinator.execute(matchId, 'battle-bot-turn', () => runBattleBotTurnUnlocked(matchId));

const getBattleBotActionDelayRange = (match = {}) => {
    const isExplicitPveBattle =
        match.mode === 'pve' &&
        Boolean(match.specialPveMissionId || match.pveBattle?.missionId);
    return isExplicitPveBattle
        ? { minMs: PVE_BOT_ACTION_DELAY_MIN_MS, maxMs: PVE_BOT_ACTION_DELAY_MAX_MS }
        : { minMs: BATTLE_BOT_ACTION_DELAY_MIN_MS, maxMs: BATTLE_BOT_ACTION_DELAY_MAX_MS };
};

function scheduleBattleBotTurn(match) {
    if (!match || match.status === 'ended' || !isBattleBotTurn(match)) {
        return;
    }
    const matchId = match.matchId;
    if (!matchId || activeBattleBotTurns.has(matchId) || scheduledBattleBotTurns.has(matchId)) {
        return;
    }
    const matchStartsAtMs = match.matchStartsAt ? new Date(match.matchStartsAt).getTime() : Date.now();
    const turnStartedAtMs = match.turnStartedAt ? new Date(match.turnStartedAt).getTime() : matchStartsAtMs;
    const { minMs: actionDelayMinMs, maxMs: actionDelayMaxMs } =
        getBattleBotActionDelayRange(match);
    const actionDelayMs =
        actionDelayMinMs +
        Math.floor(Math.random() * (actionDelayMaxMs - actionDelayMinMs + 1));
    const turnExpiresAtMs = match.turnExpiresAt ? new Date(match.turnExpiresAt).getTime() : NaN;
    const earliestActionAtMs = Math.max(
        matchStartsAtMs,
        Number.isNaN(turnStartedAtMs) ? matchStartsAtMs : turnStartedAtMs + actionDelayMs
    );
    const latestActionAtMs = Number.isNaN(turnExpiresAtMs)
        ? earliestActionAtMs
        : Math.max(matchStartsAtMs, turnExpiresAtMs - 1000);
    const actionAtMs = Math.min(earliestActionAtMs, latestActionAtMs);
    const delayMs = Math.max(0, actionAtMs - Date.now());
    scheduledBattleBotTurns.add(matchId);
    setTimeout(() => {
        scheduledBattleBotTurns.delete(matchId);
        runBattleBotTurn(matchId).catch((error) => {
            console.error('Battle bot turn failed:', error);
        });
    }, delayMs);
}

const normalizeClassChoice = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeAbsorptionChoice = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeTargetSelectionForComparison = (selection) => {
    if (Array.isArray(selection)) {
        return selection
            .map((entry) => ({
                username: typeof entry?.username === 'string' ? entry.username.trim().toLowerCase() : '',
                slot: Number.parseInt(entry?.slot, 10),
            }))
            .filter((entry) => entry.username && Number.isInteger(entry.slot))
            .sort((left, right) =>
                left.username === right.username ? left.slot - right.slot : left.username.localeCompare(right.username)
            );
    }
    if (selection && typeof selection === 'object') {
        const username =
            typeof selection.username === 'string' ? selection.username.trim().toLowerCase() : '';
        const slot = Number.parseInt(selection.slot, 10);
        if (username && Number.isInteger(slot)) {
            return { username, slot };
        }
    }
    return null;
};

const areQueuedSkillRequestsEquivalent = (
    existing = null,
    { skillIndex, targetSelection, classChoice, absorptionChoice } = {}
) => {
    if (!existing || Number.parseInt(existing.skillIndex, 10) !== Number.parseInt(skillIndex, 10)) {
        return false;
    }
    if (normalizeClassChoice(existing.classChoice) !== normalizeClassChoice(classChoice)) {
        return false;
    }
    if (normalizeAbsorptionChoice(existing.absorptionChoice) !== normalizeAbsorptionChoice(absorptionChoice)) {
        return false;
    }
    return (
        JSON.stringify(normalizeTargetSelectionForComparison(existing.targetSelection)) ===
        JSON.stringify(normalizeTargetSelectionForComparison(targetSelection))
    );
};

const getAbsorptionChoiceKeysForSkill = (skill = {}) => {
    const config =
        skill?.absorptionChoiceOptions && typeof skill.absorptionChoiceOptions === 'object'
            ? skill.absorptionChoiceOptions
            : null;
    if (!config) return [];
    const entries = [
        ...(Array.isArray(config.negative) ? config.negative : []),
        ...(Array.isArray(config.positive) ? config.positive : []),
    ];
    return Array.from(
        new Set(
            entries
                .map((entry) => normalizeAbsorptionChoice(typeof entry === 'string' ? entry : entry?.key))
                .filter(Boolean)
        )
    );
};

const usernamesEqual = (left, right) =>
    typeof left === 'string' &&
    typeof right === 'string' &&
    left.trim().toLowerCase() === right.trim().toLowerCase();

const findMatchPlayerByUsername = (match, username) =>
    Array.isArray(match?.players)
        ? match.players.find(
              (player) => typeof player?.username === 'string' && usernamesEqual(player.username, username)
          ) || null
        : null;

const findMatchOpponentByUsername = (match, username) =>
    Array.isArray(match?.players)
        ? match.players.find(
              (player) => typeof player?.username === 'string' && !usernamesEqual(player.username, username)
          ) || null
        : null;

const queueSkillForActorSlot = ({
    match,
    username,
    actorSlot,
    skillIndex,
    targetSelection,
    classChoice,
    absorptionChoice,
}) => {
    const pool = match.chakraPools?.[username];
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    const pending = getPendingTurn(match, username);
    const actorKey = String(actorSlot);
    const existing = pending.queuedByActorSlot[actorKey];
    if (existing) {
        chakraTypes.forEach((type) => {
            pool[type] = (pool[type] || 0) + (existing.reservedSpecific?.[type] || 0);
        });
        pending.unresolvedRandom = Math.max(0, pending.unresolvedRandom - (existing.requiredRandom || 0));
        delete pending.queuedByActorSlot[actorKey];
        pending.queueOrder = pending.queueOrder.filter((slot) => slot !== actorSlot);
        const clamped = clampPendingTurnRandom(pending, pool);
        pending.unresolvedRandom = clamped.unresolvedRandom;
        pending.randomAssignments = clamped.randomAssignments;
        pending.queueOrder = clamped.queueOrder;
    }
    const actorBoard = match.board?.[username] || [];
    const actorUnit = actorBoard[actorSlot];
    if (!actorUnit || actorUnit.alive === false) {
        throw new Error('Actor is unavailable.');
    }
    const actorState = battleLogic.getUnitState(match, username, actorSlot);
    if (battleLogic.isActorUnableToUseSkills(actorState)) {
        throw new Error('Actor is stunned and cannot use skills.');
    }
    const rosterIndex = actorUnit?.rosterIndex;
    const skill = battleLogic.resolveEffectiveSkill({
        characters: charactersData,
        rosterIndex,
        skillIndex,
        actorState,
    });
    if (!skill) {
        throw new Error('Skill not found.');
    }
    const classChoiceOptions = Array.isArray(skill?.classChoiceOptions)
        ? skill.classChoiceOptions.map((entry) => normalizeClassChoice(entry)).filter(Boolean)
        : [];
    const normalizedClassChoice = normalizeClassChoice(classChoice);
    if (normalizedClassChoice && classChoiceOptions.length > 0 && !classChoiceOptions.includes(normalizedClassChoice)) {
        throw new Error('Invalid class choice.');
    }
    const absorptionChoiceKeys = getAbsorptionChoiceKeysForSkill(skill);
    const normalizedAbsorptionChoice = normalizeAbsorptionChoice(absorptionChoice);
    if (
        normalizedAbsorptionChoice &&
        absorptionChoiceKeys.length > 0 &&
        !absorptionChoiceKeys.includes(normalizedAbsorptionChoice)
    ) {
        throw new Error('Invalid absorption choice.');
    }
    if (battleLogic.isSkillIndexBlockedForActor(actorState, skillIndex)) {
        throw new Error('This skill is unusable this turn.');
    }
    const baseSkill = Array.isArray(charactersData?.[rosterIndex]?.skills)
        ? charactersData[rosterIndex].skills[skillIndex]
        : null;
    const cooldownSkillId =
        skill?.useBaseSkillCooldown && baseSkill?.id ? baseSkill.id : skill?.id || baseSkill?.id || null;
    if (cooldownSkillId && battleLogic.getSkillCooldownRemaining(actorState, cooldownSkillId) > 0) {
        throw new Error('Skill is on cooldown.');
    }
    const { reservedSpecific, requiredRandom } = battleLogic.computeEffectiveEnergyCost({
        skill,
        actorState,
    });
    chakraTypes.forEach((type) => {
        if ((pool[type] || 0) < reservedSpecific[type]) {
            throw new Error('Not enough chakra.');
        }
    });
    chakraTypes.forEach((type) => {
        pool[type] = (pool[type] || 0) - reservedSpecific[type];
    });
    if (getTotalChakra(pool) < pending.unresolvedRandom + requiredRandom) {
        chakraTypes.forEach((type) => {
            pool[type] = (pool[type] || 0) + reservedSpecific[type];
        });
        throw new Error('Not enough chakra for random cost.');
    }
    pending.queuedByActorSlot[actorKey] = {
        actorSlot,
        skillIndex,
        targetSelection,
        ...(normalizedClassChoice ? { classChoice: normalizedClassChoice } : {}),
        ...(normalizedAbsorptionChoice ? { absorptionChoice: normalizedAbsorptionChoice } : {}),
        reservedSpecific,
        requiredRandom,
    };
    if (!pending.queueOrder.includes(actorSlot)) {
        pending.queueOrder.push(actorSlot);
    }
    pending.unresolvedRandom += requiredRandom;
    const clamped = clampPendingTurnRandom(pending, pool);
    pending.unresolvedRandom = clamped.unresolvedRandom;
    pending.randomAssignments = clamped.randomAssignments;
    pending.queueOrder = clamped.queueOrder;
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
};

const cancelQueuedSkillForActorSlot = ({ match, username, actorSlot }) => {
    const pool = match.chakraPools?.[username];
    const pending = getPendingTurn(match, username);
    const actorKey = String(actorSlot);
    const existing = pending.queuedByActorSlot[actorKey];
    if (!pool || !existing) {
        return false;
    }
    chakraTypes.forEach((type) => {
        pool[type] = (pool[type] || 0) + (existing.reservedSpecific?.[type] || 0);
    });
    pending.unresolvedRandom = Math.max(0, pending.unresolvedRandom - (existing.requiredRandom || 0));
    delete pending.queuedByActorSlot[actorKey];
    pending.queueOrder = pending.queueOrder.filter((slot) => slot !== actorSlot);
    const clamped = clampPendingTurnRandom(pending, pool);
    pending.unresolvedRandom = clamped.unresolvedRandom;
    pending.randomAssignments = clamped.randomAssignments;
    pending.queueOrder = clamped.queueOrder;
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
    return true;
};

const reorderQueuedSkills = ({ match, username, actorSlots }) => {
    const pending = getPendingTurn(match, username);
    const queuedKeys = new Set(Object.keys(pending.queuedByActorSlot || {}));
    const normalized = Array.isArray(actorSlots)
        ? actorSlots
              .map((slot) => Number.parseInt(slot, 10))
              .filter((slot) => Number.isInteger(slot) && slot >= 0)
        : [];
    const unique = [];
    normalized.forEach((slot) => {
        const key = String(slot);
        if (!queuedKeys.has(key)) return;
        if (unique.includes(slot)) return;
        unique.push(slot);
    });
    Object.keys(pending.queuedByActorSlot || {}).forEach((slotKey) => {
        const slot = Number.parseInt(slotKey, 10);
        if (!Number.isInteger(slot)) return;
        if (!unique.includes(slot)) {
            unique.push(slot);
        }
    });
    pending.queueOrder = unique;
    match.pendingTurns[username] = pending;
};

const adjustRandomAssignment = ({ match, username, chakraType, delta }) => {
    if (!chakraTypes.includes(chakraType)) {
        throw new Error('Invalid chakra type.');
    }
    if (delta !== 1 && delta !== -1) {
        throw new Error('Invalid delta.');
    }
    const pool = match.chakraPools?.[username];
    const pending = getPendingTurn(match, username);
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    if (delta === 1) {
        if (pending.unresolvedRandom <= 0) {
            throw new Error('No unresolved random chakra.');
        }
        if ((pool[chakraType] || 0) <= 0) {
            throw new Error('Not enough chakra.');
        }
        pool[chakraType] -= 1;
        pending.randomAssignments[chakraType] = (pending.randomAssignments[chakraType] || 0) + 1;
        pending.unresolvedRandom -= 1;
    } else {
        if ((pending.randomAssignments[chakraType] || 0) <= 0) {
            throw new Error('No assigned chakra to remove.');
        }
        pending.randomAssignments[chakraType] -= 1;
        pool[chakraType] = (pool[chakraType] || 0) + 1;
        pending.unresolvedRandom += 1;
    }
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
};

const adjustRandomAssignments = ({ match, username, adjustments }) => {
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
        throw new Error('At least one random chakra adjustment is required.');
    }
    if (adjustments.length > 24) {
        throw new Error('Too many random chakra adjustments.');
    }
    const originalPool = cloneSerializable(match.chakraPools?.[username] || {});
    const originalPending = cloneSerializable(
        match.pendingTurns?.[username] || getPendingTurn(match, username)
    );
    try {
        adjustments.forEach((adjustment) => {
            const chakraType =
                typeof adjustment?.chakraType === 'string'
                    ? adjustment.chakraType.trim().toLowerCase()
                    : '';
            const deltaRaw = Number.parseInt(adjustment?.delta, 10);
            adjustRandomAssignment({
                match,
                username,
                chakraType,
                delta: deltaRaw > 0 ? 1 : deltaRaw < 0 ? -1 : 0,
            });
        });
    } catch (error) {
        match.chakraPools[username] = originalPool;
        match.pendingTurns[username] = originalPending;
        throw error;
    }
};

const exchangeChakra = ({ match, username, chakraType, cost = 2, spendAssignments = null }) => {
    if (!chakraTypes.includes(chakraType)) {
        throw new Error('Invalid chakra type.');
    }
    const pool = match.chakraPools?.[username];
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    const exchangeCost = Math.max(1, Number(cost) || 2);
    const hasExchangeableColor = chakraTypes.some((type) => (Number(pool[type]) || 0) >= exchangeCost);
    if (!hasExchangeableColor) {
        throw new Error(`Need ${exchangeCost} chakra of one color to exchange.`);
    }

    let normalizedAssignments = null;
    if (spendAssignments && typeof spendAssignments === 'object') {
        normalizedAssignments = createEmptyChakraPool();
        chakraTypes.forEach((type) => {
            const value = Number.parseInt(spendAssignments[type], 10);
            normalizedAssignments[type] = Math.max(0, Number.isFinite(value) ? value : 0);
        });
        const assignedTotal = chakraTypes.reduce(
            (sum, type) => sum + (normalizedAssignments[type] || 0),
            0
        );
        if (assignedTotal !== exchangeCost) {
            throw new Error(`Assign exactly ${exchangeCost} chakra of one color.`);
        }
        const assignedColors = chakraTypes.filter((type) => (normalizedAssignments[type] || 0) > 0);
        if (assignedColors.length !== 1 || normalizedAssignments[assignedColors[0]] !== exchangeCost) {
            throw new Error(`Choose ${exchangeCost} chakra of one color.`);
        }
        const exceeds = chakraTypes.some(
            (type) => (normalizedAssignments[type] || 0) > (Number(pool[type]) || 0)
        );
        if (exceeds) {
            throw new Error('Assigned chakra exceeds available pool.');
        }
    }

    if (normalizedAssignments) {
        chakraTypes.forEach((type) => {
            pool[type] = Math.max(0, (Number(pool[type]) || 0) - (normalizedAssignments[type] || 0));
        });
    } else {
        const spendType = chakraTypes.find((type) => (Number(pool[type]) || 0) >= exchangeCost);
        if (!spendType) throw new Error('Unable to exchange chakra.');
        pool[spendType] = Math.max(0, (Number(pool[spendType]) || 0) - exchangeCost);
    }
    pool[chakraType] = (Number(pool[chakraType]) || 0) + 1;
    match.chakraPools[username] = pool;
};

const ensureBoardState = async (match) => {
    if (!match || match.status === 'ended') return match;
    let changed = false;
    const players = Array.isArray(match.players) ? match.players : [];
    if (!match.board) {
        match.board = battleLogic.buildInitialBoard(players);
        changed = true;
    }
    // Backfill aliveCount and board entries
    players.forEach((player) => {
        if (!Number.isInteger(player.aliveCount)) {
            player.aliveCount = Array.isArray(player.team) ? player.team.length : 0;
            changed = true;
        }
        if (!match.board[player.username]) {
            match.board[player.username] = battleLogic.buildInitialBoard([player])[player.username];
            changed = true;
        }
        const units = Array.isArray(match.board[player.username]) ? match.board[player.username] : [];
        let aliveCount = 0;
        units.forEach((unit, slot) => {
            if (!unit || typeof unit !== 'object') return;
            if (!Number.isInteger(unit.slot)) {
                unit.slot = slot;
                changed = true;
            }
            const numericHp = Number(unit.hp);
            if (!Number.isFinite(numericHp)) {
                unit.hp = battleLogic.DEFAULT_HP;
                changed = true;
            } else if (unit.hp !== numericHp) {
                unit.hp = numericHp;
                changed = true;
            }
            if (unit.hp <= 0) {
                if (unit.alive !== false) {
                    unit.alive = false;
                    changed = true;
                }
            } else if (unit.alive === false) {
                // Preserve explicit dead state only when hp is zero.
                unit.alive = true;
                changed = true;
            }
            const state = battleLogic.getUnitState(match, player.username, slot);
            if (!state || !Array.isArray(state.statuses) || typeof state.cooldowns !== 'object') {
                changed = true;
            }
            if (unit.alive !== false && !battleLogic.isUnitBanished(unit)) {
                aliveCount += 1;
            }
        });
        if (player.aliveCount !== aliveCount) {
            player.aliveCount = aliveCount;
            changed = true;
        }
    });
    if (changed) {
        await persistMatchState(
            match,
            { board: match.board, players },
            { skipInvariants: true }
        );
    }
    return match;
};

const finalizeTurn = async (match, username, options = {}) => {
    if (!match || !usernamesEqual(match.currentTurn, username)) return match;
    if (match.status === 'ended') return match;
    match.expiredTurnCountsByUsername =
        match.expiredTurnCountsByUsername && typeof match.expiredTurnCountsByUsername === 'object'
            ? match.expiredTurnCountsByUsername
            : {};
    const canonicalUsername = (match.players || []).find((player) =>
        usernamesEqual(player?.username, username)
    )?.username || username;
    if (options.expired) {
        match.expiredTurnCountsByUsername[canonicalUsername] =
            (Number(match.expiredTurnCountsByUsername[canonicalUsername]) || 0) + 1;
    } else {
        match.expiredTurnCountsByUsername[canonicalUsername] = 0;
    }
    if (options.expired && match.expiredTurnCountsByUsername[canonicalUsername] >= MATCH_INACTIVITY_TURN_LIMIT) {
        const opponentEntry = findMatchOpponentByUsername(match, canonicalUsername);
        match.status = 'ended';
        match.winner = opponentEntry?.username || null;
        match.surrenderedBy = canonicalUsername;
        match.endReason = 'inactivity';
        match.endedAt = new Date();
        match.currentTurn = null;
        match.turnStartedAt = null;
        match.turnExpiresAt = null;
        await persistMatchState(
            match,
            {
                status: match.status,
                winner: match.winner,
                surrenderedBy: match.surrenderedBy,
                endReason: match.endReason,
                endedAt: match.endedAt,
                currentTurn: null,
                turnStartedAt: null,
                turnExpiresAt: null,
                expiredTurnCountsByUsername: match.expiredTurnCountsByUsername,
            },
            { incrementTurn: true }
        );
        await applyRewardsToPersistedMatch(match);
        quickMatches.delete(match.matchId);
        (match.players || []).forEach((player) => userToMatch.delete(player.username));
        return match;
    }
    if (!match.board) {
        match.board = battleLogic.buildInitialBoard(match.players || []);
    }
    const econ = match.economy;
    const pools = match.chakraPools;
    match.pendingTurns = match.pendingTurns || {};
    const blockedActorGainCount = getTeamStatusFlagCount(match, username, 'preventNextTurnChakraGain');
    const pendingTurnBeforeResolve = getPendingTurn(match, username);
    const hpBeforeResolve = snapshotBattleHpByUsername(match);
    battleLogic.resolvePendingTurnSkills({
        match,
        actingUsername: username,
        characters: charactersData,
    });
    battleLogic.reduceHulkRageForInactiveTurn({
        match,
        endingUsername: username,
        pendingTurn: pendingTurnBeforeResolve,
    });
    if (match._manualSkillActorSlotsByUsername) {
        delete match._manualSkillActorSlotsByUsername;
    }
    battleLogic.tickStatusesForTurnEnd({
        match,
        endingUsername: username,
    });
    battleLogic.tickCooldownsForTurnEnd({
        match,
        endingUsername: username,
    });
    (match.players || []).forEach((player) => {
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        player.aliveCount = units.reduce((sum, unit) => {
            if (!unit || typeof unit !== 'object') return sum;
            if ((Number(unit.hp) || 0) <= 0) {
                unit.alive = false;
            }
            return sum + (unit.alive === false || battleLogic.isUnitBanished(unit) ? 0 : 1);
        }, 0);
    });
    match.lastTurnDamageByUsername = buildLastTurnDamageByUsername({
        match,
        hpBefore: hpBeforeResolve,
        endedBy: username,
    });

    const alivePlayers = (match.players || []).filter(
        (player) => (Number(player?.aliveCount) || 0) > 0
    );
    if (alivePlayers.length <= 1) {
        const winner = alivePlayers.length === 1 ? alivePlayers[0].username : null;
        match.status = 'ended';
        match.winner = winner;
        match.surrenderedBy = null;
        match.endReason = 'elimination';
        match.endedAt = new Date();
        match.currentTurn = null;
        match.turnStartedAt = null;
        match.turnExpiresAt = null;
        await persistMatchState(
            match,
            {
                    mode: match.mode || 'quick',
                    status: match.status,
                    winner: match.winner,
                    surrenderedBy: match.surrenderedBy,
                    endReason: match.endReason,
                    endedAt: match.endedAt,
                    currentTurn: match.currentTurn,
                    turnStartedAt: match.turnStartedAt,
                    turnExpiresAt: match.turnExpiresAt,
                    board: match.board,
                    players: match.players,
                    chakraPools: match.chakraPools,
                    economy: match.economy,
                    pendingTurns: match.pendingTurns,
                    lastTurnDamageByUsername: match.lastTurnDamageByUsername,
            },
            { incrementTurn: true }
        );
        await applyRewardsToPersistedMatch(match);
        quickMatches.delete(match.matchId);
        (match.players || []).forEach((player) => userToMatch.delete(player.username));
        return match;
    }

    econ.turnCounts[username] = econ.turnCounts[username] || 0;
    const aliveCount = Math.max(1, getAliveCountForUser(match, username));
    const additionalTurnGains = getTeamStatusMetadataSum(
        match,
        username,
        'additionalRandomChakraPerTurn'
    );
    const effectiveGainCount = Math.max(0, aliveCount - blockedActorGainCount);
    const turnGains = generateRandomChakra(effectiveGainCount + additionalTurnGains);
    pools[username] = applyChakraGain(pools[username], turnGains);
    econ.lastChakraGain[username] = turnGains;

    econ.turnCounts[username] += 1;

    const opponentEntry = findMatchOpponentByUsername(match, username);
    const opponent = opponentEntry ? opponentEntry.username : username;
    const nextTurn = opponent;
    match.currentTurn = nextTurn;

    econ.turnCounts[nextTurn] = econ.turnCounts[nextTurn] || 0;
    if (!econ.startGranted[nextTurn] && econ.turnCounts[nextTurn] === 0) {
        const aliveCount = Math.max(1, getAliveCountForUser(match, nextTurn));
        const additionalStartGains = getTeamStatusMetadataSum(
            match,
            nextTurn,
            'additionalRandomChakraPerTurn'
        );
        const blockedNextStartCount = getTeamStatusFlagCount(
            match,
            nextTurn,
            'preventNextTurnChakraGain'
        );
        const effectiveStartGainCount = Math.max(0, aliveCount - blockedNextStartCount);
        const startGains = generateRandomChakra(effectiveStartGainCount + additionalStartGains);
        pools[nextTurn] = applyChakraGain(pools[nextTurn], startGains);
        econ.startGranted[nextTurn] = true;
        econ.lastChakraGain[nextTurn] = startGains;
    }

    battleLogic.queueTurnStartChoicePrompts({
        match,
        startingUsername: nextTurn,
    });

    match.turnStartedAt = new Date();
    match.turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, nextTurn));
    match.pendingTurns[username] = makeEmptyPendingTurn();

    await persistMatchState(
        match,
        {
                currentTurn: match.currentTurn,
                board: match.board,
                players: match.players,
                chakraPools: pools,
                economy: econ,
                pendingTurns: match.pendingTurns,
                lastTurnDamageByUsername: match.lastTurnDamageByUsername,
                expiredTurnCountsByUsername: match.expiredTurnCountsByUsername,
                turnStartedAt: match.turnStartedAt,
                turnExpiresAt: match.turnExpiresAt,
        },
        { incrementTurn: true }
    );

    return match;
};

const autoAdvanceTurnIfExpired = async (match) => {
    if (!match || match.status === 'ended' || !match.turnExpiresAt) return match;
    await ensureBoardState(match);
    const expiry =
        match.turnExpiresAt instanceof Date
            ? match.turnExpiresAt.getTime()
            : new Date(match.turnExpiresAt).getTime();
    if (Number.isNaN(expiry)) return match;
    if (Date.now() <= expiry + TURN_EXPIRY_GRACE_MS) return match;
    resolveExpiredTurnStartChoiceIfNeeded({
        match,
        username: match.currentTurn,
    });
    return finalizeTurn(match, match.currentTurn, { expired: true });
};

async function initDb() {
    if (!DEFAULT_URI) {
        throw new Error('MONGODB_URI is required. Set it in your environment before starting the server.');
    }
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is required. Set it in your environment before starting the server.');
    }
    mongoClient = new MongoClient(DEFAULT_URI, MONGO_CLIENT_OPTIONS);
    mongoClient.on('serverHeartbeatFailed', (event) => {
        console.warn('MongoDB heartbeat failed:', event?.failure?.message || 'unknown topology error');
    });
    await mongoClient.connect();
    const db = mongoClient.db(DATABASE_NAME);
    usersCollection = db.collection(USERS_COLLECTION);
    matchesCollection = db.collection(MATCHES_COLLECTION);
    appStateCollection = db.collection(APP_STATE_COLLECTION);
    newsPostsCollection = db.collection(NEWS_POSTS_COLLECTION);
    pointPurchasesCollection = db.collection(POINT_PURCHASES_COLLECTION);
    await Promise.all([
        usersCollection.createIndex({ username: 1 }, { unique: true }),
        usersCollection.createIndex({ usernameLower: 1 }),
        usersCollection.createIndex(
            { email: 1 },
            { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
        ),
        matchesCollection.createIndex({ matchId: 1 }, { unique: true }),
        matchesCollection.createIndex({ status: 1, turnExpiresAt: 1 }),
        matchesCollection.createIndex({
            'players.username': 1,
            status: 1,
            matchStartsAt: -1,
        }),
        matchesCollection.createIndex({ status: 1, mode: 1, arena: 1, endedAt: -1 }),
        matchesCollection.createIndex({ arena: 1 }),
        appStateCollection.createIndex({ key: 1 }, { unique: true }),
        newsPostsCollection.createIndex({ createdAt: -1 }),
        pointPurchasesCollection.createIndex({ provider: 1, orderId: 1 }, { unique: true }),
        pointPurchasesCollection.createIndex({ username: 1, createdAt: -1 }),
    ]);
    await hydrateCharactersDataFromStoredOverrides();
    const startupMigrationState = await appStateCollection.findOne(
        { key: STARTUP_MIGRATION_STATE_KEY },
        { projection: { version: 1 } }
    );
    if (startupMigrationState?.version !== STARTUP_MIGRATION_VERSION) {
        const matchArenaBackfill = await backfillMatchArenaMetadata();
        if (matchArenaBackfill.updated > 0) {
            console.log(`Backfilled arena metadata for ${matchArenaBackfill.updated} matches.`);
        }
        const onixReleaseSync = await syncPokemonOnixRelease(db);
        if (onixReleaseSync.migrated) {
            console.log('Applied the Pokemon Arena V.3.3.1 Onix release to MongoDB.');
        }
        const meowthReleaseSync = await syncPokemonMeowthRelease(db);
        if (meowthReleaseSync.migrated) {
            console.log('Published Meowth and the upcoming 12-character Pokemon Arena announcement.');
        }
        const wave2ReleaseSync = await syncPokemonWave2Release(db);
        if (wave2ReleaseSync?.migrated) {
            console.log(
                'Published the nine-character Pokemon Arena launch, latest releases, and news post.'
            );
        }
        const gen2StarterReleaseSync = await syncPokemonGen2StarterRelease(db);
        if (gen2StarterReleaseSync.migrated) {
            console.log(
                'Published the Generation 2 starter launch and community-character announcement.'
            );
        }
        await syncPokemonTypeClassNews(db);
        console.log('Synced the Pokemon Arena Type-Class Overhaul news post.');
        const aegislashReleaseSync = await syncPokemonAegislashRelease(db);
        if (aegislashReleaseSync.migrated) {
            console.log('Published Aegislash, the Pokemon class overhaul, and iPhone audio news.');
        }
        const dittoReleaseSync = await syncPokemonDittoRelease(db);
        if (dittoReleaseSync.migrated) {
            console.log('Published the Ditto and Scraggy community-character batch.');
        }
        await syncPokemonBattleExperienceNews(db);
        console.log('Synced the Pokemon Arena Battle Experience Update news post.');
        await backfillUserProfiles();
        await appStateCollection.updateOne(
            { key: STARTUP_MIGRATION_STATE_KEY },
            {
                $set: {
                    key: STARTUP_MIGRATION_STATE_KEY,
                    version: STARTUP_MIGRATION_VERSION,
                    completedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }
    console.log('Connected to MongoDB.');
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const RESERVED_MATCH_ROUTE_IDS = new Set(['status', 'join', 'cancel']);
app.use('/api/match/:matchId', (req, res, next) => {
    const matchId = String(req.params?.matchId || '').trim();
    if (!matchId || RESERVED_MATCH_ROUTE_IDS.has(matchId)) {
        next();
        return;
    }
    const sendJson = res.json.bind(res);
    res.json = (payload) => {
        const revision = Number(payload?.stateRevision);
        const turnNumber = Number(payload?.turnNumber);
        if (Number.isInteger(revision) && revision >= 0) {
            res.set('X-Match-State-Revision', String(revision));
        }
        if (Number.isInteger(turnNumber) && turnNumber >= 0) {
            res.set('X-Match-Turn-Number', String(turnNumber));
        }
        return sendJson(payload);
    };
    const commandName = `${String(req.method || 'GET').toLowerCase()} ${req.path || '/'}`;
    matchCommandCoordinator
        .execute(
            matchId,
            commandName,
            () =>
                new Promise((resolve) => {
                    let settled = false;
                    const release = () => {
                        if (settled) return;
                        settled = true;
                        resolve();
                    };
                    res.once('finish', release);
                    res.once('close', release);
                    next();
                }),
            { log: req.method !== 'GET' }
        )
        .catch(next);
});

app.get('/api/latest-releases', async (req, res) => {
    const arena = normalizeArenaMode(req.query?.arena || '');
    if (req.query?.arena) {
        const releases = await getLatestCharacterReleases(arena);
        return res.json({
            ok: true,
            arena,
            releases,
        });
    }
    const comicReleases = await getLatestCharacterReleases('comic');
    const pokemonReleases = await getLatestCharacterReleases('pokemon');
    return res.json({
        ok: true,
        arena: 'all',
        releases: comicReleases,
        releasesByArena: {
            comic: comicReleases,
            pokemon: pokemonReleases,
        },
        comicReleases,
        pokemonReleases,
    });
});

app.get('/api/admin/latest-releases', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const arena = normalizeArenaMode(req.query?.arena || '');
    const releases = await getLatestCharacterReleases(arena);
    return res.json({
        ok: true,
        arena,
        releases,
    });
});

app.put('/api/admin/latest-releases', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const { error: validationError, value } = latestReleasesUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid latest releases payload.' });
    }
    const arena = normalizeArenaMode(value.arena);
    const normalizedReleases = normalizeLatestCharacterReleases(value.releases, arena);
    const existingState = appStateCollection
        ? await appStateCollection.findOne({ key: LATEST_CHARACTER_RELEASES_STATE_KEY })
        : null;
    const existingValue =
        existingState && typeof existingState.value === 'object' ? existingState.value : null;
    const existingByArena =
        existingState?.releasesByArena ||
        existingValue?.releasesByArena ||
        {};
    const nextReleasesByArena = {
        comic: arena === 'comic' ? normalizedReleases : normalizeLatestCharacterReleases(existingByArena.comic || existingState?.releases || existingValue?.releases || [], 'comic'),
        pokemon: arena === 'pokemon' ? normalizedReleases : normalizeLatestCharacterReleases(existingByArena.pokemon || existingState?.pokemonReleases || existingValue?.pokemonReleases || [], 'pokemon'),
    };
    await appStateCollection.updateOne(
        { key: LATEST_CHARACTER_RELEASES_STATE_KEY },
        {
            $set: buildLatestReleasesPersistenceFields(
                nextReleasesByArena,
                req.authUser.username
            ),
        },
        { upsert: true }
    );
    return res.json({
        ok: true,
        arena,
        releases: normalizedReleases,
        releasesByArena: nextReleasesByArena,
    });
});

app.get('/api/admin/maintenance', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    return res.json({
        ok: true,
        enabled: await getMaintenanceModeState(),
    });
});

app.put('/api/admin/maintenance', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const { error: validationError, value } = maintenanceModeUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid maintenance payload.' });
    }
    await appStateCollection.updateOne(
        { key: MAINTENANCE_MODE_STATE_KEY },
        {
            $set: {
                key: MAINTENANCE_MODE_STATE_KEY,
                enabled: Boolean(value.enabled),
                updatedAt: new Date(),
            },
        },
        { upsert: true }
    );
    maintenanceModeCache = {
        enabled: Boolean(value.enabled),
        expiresAt: Date.now() + MAINTENANCE_MODE_CACHE_TTL_MS,
    };
    return res.json({
        ok: true,
        enabled: Boolean(value.enabled),
    });
});

app.post('/api/characters/faces', requireSession, async (req, res) => {
    const lookupSchema = Joi.object({
        characterIds: Joi.array().items(Joi.string().trim().min(1).max(128)).max(3).required(),
    });
    const { error: validationError, value } = lookupSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'characterIds are required.' });
    }

    const faceMap = buildCharacterFaceMap();

    return res.json({
        ok: true,
        faces: value.characterIds.map((characterId) => ({
            characterId,
            facePicture: faceMap.get(characterId) || '',
        })),
    });
});

const loginSchema = Joi.object({
    username: Joi.string().min(3).max(64).required(),
    password: Joi.string().min(8).max(128).required(),
});

const registerSchema = Joi.object({
    username: Joi.string().trim().min(3).max(64).required(),
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
});

const teamSchema = Joi.array()
    .items(Joi.number().integer().min(0))
    .length(3)
    .custom((team, helpers) =>
        teamHasDuplicateCharacters(team) ? helpers.error('array.unique') : team
    )
    .messages({
        'array.unique': 'Team characters must be unique.',
    });

const getTeamValidationErrorMessage = (validationError, fallback = 'Invalid team selection.') => {
    const details = Array.isArray(validationError?.details) ? validationError.details : [];
    if (details.some((detail) => detail?.type === 'array.unique')) {
        return 'Team characters must be unique.';
    }
    return fallback;
};

const matchJoinSchema = Joi.object({
    team: teamSchema.required(),
    mode: Joi.string().valid('quick', 'ladder', 'private').default('quick'),
    arena: Joi.string().valid('comic', 'pokemon').default(DEFAULT_ARENA_MODE),
    targetUsername: Joi.string().trim().min(1).max(64).allow('').optional(),
    draftMode: Joi.boolean().default(false),
});

const teamSaveSchema = Joi.object({
    team: teamSchema.required(),
    arena: Joi.string().valid('comic', 'pokemon').default(DEFAULT_ARENA_MODE),
});

const publicProfileLookupSchema = Joi.object({
    username: Joi.string().trim().min(1).max(64).required(),
});

const activityUpdateSchema = Joi.object({
    currentPage: Joi.string().trim().max(120).allow('').required(),
});

const latestReleasesUpdateSchema = Joi.object({
    arena: Joi.string().valid('comic', 'pokemon').default('comic'),
    releases: Joi.array()
        .length(3)
        .items(
            Joi.object({
                characterId: Joi.string().trim().max(128).allow('').required(),
            }).required()
        )
        .required(),
});

const maintenanceModeUpdateSchema = Joi.object({
    enabled: Joi.boolean().required(),
});

const avatarUpdateSchema = Joi.object({
    avatarUrl: Joi.string().trim().max(200000).required(),
    arena: Joi.string().trim().valid('comic', 'pokemon').default('comic'),
});

const backgroundUpdateSchema = Joi.object({
    selectionUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
    ingameUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
});

const matchmakingSettingsSchema = Joi.object({
    battleBotEnabled: Joi.boolean().required(),
});

const pokemonStarterSelectionSchema = Joi.object({
    starterCharacterId: Joi.string().trim().required(),
});

const pokemonGen2StarterSelectionSchema = Joi.object({
    starterCharacterId: Joi.string().trim().required(),
    confirmed: Joi.boolean().valid(true).required(),
});

const pokemonEeveeEvolutionSelectionSchema = Joi.object({
    evolutionCharacterId: Joi.string().trim().required(),
    confirmed: Joi.boolean().valid(true).required(),
});

const clanCreateSchema = Joi.object({
    name: Joi.string().trim().min(3).max(35).required(),
    abbreviation: Joi.string().trim().min(2).max(4).required(),
    bio: Joi.string().allow('').max(1000).required(),
});

const clanUpdateSchema = Joi.object({
    name: Joi.string().trim().min(3).max(35).required(),
    abbreviation: Joi.string().trim().min(2).max(4).required(),
    bio: Joi.string().allow('').max(1000).required(),
});

const clanInviteSchema = Joi.object({
    username: Joi.string().trim().min(3).max(64).required(),
});

const clanRankNamesSchema = Joi.object({
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    name: Joi.string().trim().min(1).max(40).required(),
    previousName: Joi.string().trim().allow('').max(40).required(),
});

const clanRankDeleteSchema = Joi.object({
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    name: Joi.string().trim().min(1).max(40).required(),
});

const clanMemberRankSchema = Joi.object({
    username: Joi.string().trim().min(1).max(64).required(),
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    customRankName: Joi.string().allow('').max(40).required(),
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { error: validationError, value } = loginSchema.validate(req.body || {});
        if (validationError) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }
        const { username, password } = value;

        const user = await usersCollection.findOne({ usernameLower: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const isMatch = await comparePassword(password, user.passwordHash || '');
        if (!isMatch) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const normalizedProfile = normalizeUserProfile(user);
        normalizedProfile.activity.lastOnlineAt = new Date();
        const savedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena(user);
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                    savedTeamIndices: savedTeamIndicesByArena.comic,
                    savedTeamIndicesByArena,
                },
            }
        );
        const hydratedUser = {
            ...user,
            profile: normalizedProfile,
            savedTeamIndices: savedTeamIndicesByArena.comic,
            savedTeamIndicesByArena,
        };

        const token = signSession(hydratedUser);
        setSessionCookie(res, token);

        return res.json({
            ok: true,
            user: serializeUserForClient(hydratedUser),
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
});

app.post('/api/register', registerLimiter, async (req, res) => {
    try {
        const { error: validationError, value } = registerSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Invalid registration details.' });
        }

        const { username, password, confirmPassword, email } = value;
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const [existingUsername, existingEmail] = await Promise.all([
            usersCollection.findOne({ username }),
            usersCollection.findOne({ email }),
        ]);

        if (existingUsername) {
            return res.status(409).json({ error: 'Username is already taken.' });
        }

        if (existingEmail) {
            return res.status(409).json({ error: 'Email is already in use.' });
        }

        const passwordHash = await hashPassword(password);
        const createdAt = new Date();
        const profile = buildDefaultUserProfile({ createdAt });
        const newUser = {
            username,
            usernameLower: username.toLowerCase(),
            email,
            passwordHash,
            role: 'player',
            createdAt,
            savedTeamIndices: [],
            savedTeamIndicesByArena: {
                comic: [],
                pokemon: [],
            },
            profile,
        };

        const result = await usersCollection.insertOne(newUser);
        const token = signSession({ ...newUser, _id: result.insertedId });
        setSessionCookie(res, token);
        await recalculatePlayerLadderStandings();
        const createdUser = await usersCollection.findOne({ _id: result.insertedId });

        return res.status(201).json({
            ok: true,
            user: serializeUserForClient(createdUser || newUser),
        });
    } catch (error) {
        if (error?.code === 11000) {
            const field = error?.keyPattern?.email ? 'Email' : 'Username';
            return res.status(409).json({ error: `${field} is already in use.` });
        }
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// Save preferred team
app.post('/api/team/save', requireSession, async (req, res) => {
    const { error: validationError, value } = teamSaveSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: getTeamValidationErrorMessage(validationError) });
    }
    const team = value.team;
    const arena = normalizeArenaMode(value.arena);
    if (!isValidTeamSelectionForMatch(team)) {
        return res.status(400).json({ error: 'Invalid team selection.' });
    }
    const user = await usersCollection.findOne({ username: req.authUser.username });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const profile = normalizeUserProfile(user);
    try {
        await assertTeamCanBeUsed(profile, team, user.role, arena);
    } catch (error) {
        return res.status(403).json({ error: error.message || 'Character is locked.' });
    }
    const savedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena({
        ...user,
        savedTeamIndicesByArena: {
            ...(user.savedTeamIndicesByArena && typeof user.savedTeamIndicesByArena === 'object'
                ? user.savedTeamIndicesByArena
                : {}),
            [arena]: sanitizeSavedTeamIndicesForArena(team, arena),
        },
    });
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                savedTeamIndices: savedTeamIndicesByArena.comic,
                savedTeamIndicesByArena,
                profile,
            },
        }
    );
    return res.json({ ok: true });
});

// Quick matchmaking endpoints (demo/in-memory)
app.post('/api/match/join', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const { error: validationError, value } = matchJoinSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({
                error: getTeamValidationErrorMessage(
                    validationError,
                    'Team selection required to join match.'
                ),
            });
        }
        const team = value.team;
        const draftMode = Boolean(value.draftMode);
        if (!isValidTeamSelectionForMatch(team)) {
            return res.status(400).json({ error: 'Invalid team selection.' });
        }
        const mode = value.mode;
        const arena = normalizeArenaMode(value.arena);
        const targetUsername = typeof value.targetUsername === 'string' ? value.targetUsername.trim() : '';
        if (mode === 'private') {
            if (!targetUsername) {
                return res.status(400).json({ error: 'Opponent username is required for a private game.' });
            }
            if (targetUsername.toLowerCase() === username.toLowerCase()) {
                return res.status(400).json({ error: 'You cannot start a private game with yourself.' });
            }
        }

        const draftId = userToDraft.get(username);
        if (draftId) {
            const draft = await advanceDraftIfNeeded(draftSessions.get(draftId));
            if (draft && draft.phase !== 'failed') {
                return res.json(serializeDraftForUser(draft, username));
            }
            userToDraft.delete(username);
        }

        // Already matched
        const existingMapping = userToMatch.get(username);
        if (existingMapping && (!existingMapping.arena || existingMapping.arena === arena)) {
            try {
                const { matchId, opponent } = existingMapping;
                const existing = await matchesCollection.findOne({ matchId });
                if (!existing || existing.status === 'ended') {
                    userToMatch.delete(username);
                } else {
                    const hydrated = await hydrateMatchForStatus(existing.matchId);
                    if (!hydrated || hydrated.status === 'ended') {
                        userToMatch.delete(username);
                    } else {
                        scheduleBattleBotTurn(hydrated);
                        const safePayload = buildMatchPayloadForUser(hydrated, username);
                        return res.json({
                            ok: true,
                            matchFound: true,
                            matchId,
                            mode: existing.mode || 'quick',
                            arena: normalizeArenaMode(existing.arena),
                            opponent,
                            matchStartsAt: existing.matchStartsAt || existing.createdAt || null,
                            matchReady:
                                !existing.matchStartsAt ||
                                new Date(existing.matchStartsAt).getTime() <= Date.now(),
                            currentTurn: hydrated?.currentTurn || null,
                            turnOrder: hydrated?.turnOrder || null,
                            turnExpiresAt: hydrated?.turnExpiresAt || null,
                            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                            chakraPools: safePayload?.chakraPools || null,
                            lastChakraGain: safePayload?.lastChakraGain || null,
                            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
                        });
                    }
                }
            } catch (error) {
                console.error('[matchmaking] failed to hydrate mapped match', {
                    username,
                    requestedArena: arena,
                    mappedMatchId: existingMapping.matchId || null,
                    mappedArena: existingMapping.arena || null,
                    error: error?.message || String(error),
                });
                userToMatch.delete(username);
            }
        }

        // If already stored in DB from earlier pairing, surface it
        const existingMatch = await matchesCollection.findOne({
            'players.username': username,
            status: 'active',
            arena,
        });
        if (existingMatch) {
            try {
                const hydrated = await hydrateMatchForStatus(existingMatch.matchId);
                if (!hydrated || hydrated.status === 'ended') {
                    return res.json({ ok: true, matchFound: false });
                }
                const opponentEntry = findMatchOpponentByUsername(hydrated, username);
                const opponent = opponentEntry ? getPlayerDisplayName(opponentEntry) : null;
                userToMatch.set(username, { matchId: hydrated.matchId, opponent, arena });
                scheduleBattleBotTurn(hydrated);
                const safePayload = buildMatchPayloadForUser(hydrated, username);
                return res.json({
                    ok: true,
                    matchFound: true,
                    matchId: hydrated.matchId,
                    mode: hydrated.mode || 'quick',
                    arena: normalizeArenaMode(hydrated.arena),
                    opponent,
                    matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
                    matchReady:
                        !hydrated.matchStartsAt ||
                        new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
                    currentTurn: hydrated.currentTurn || null,
                    turnOrder: hydrated.turnOrder || null,
                    turnExpiresAt: hydrated.turnExpiresAt || null,
                    turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                    chakraPools: safePayload?.chakraPools || null,
                    lastChakraGain: safePayload?.lastChakraGain || null,
                    pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
                });
            } catch (error) {
                console.error('[matchmaking] failed to hydrate stored active match', {
                    username,
                    requestedArena: arena,
                    matchId: existingMatch.matchId || null,
                    storedArena: existingMatch.arena || null,
                    error: error?.message || String(error),
                });
            }
        }

        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        try {
            await assertTeamCanBeUsed(profile, team, user.role, arena);
        } catch (error) {
            return res.status(403).json({ error: error.message || 'Character is locked.' });
        }

        // Try to pair with waiting opponent
        const opponent = mode === 'private'
            ? dequeuePrivateOpponent(username, targetUsername, arena)
            : dequeueOpponent(username, mode, draftMode, arena);
        if (opponent) {
            try {
                if (!isValidTeamSelectionForMatch(team) || !isValidTeamSelectionForMatch(opponent.team)) {
                    return res.status(400).json({ error: 'Invalid team selection.' });
                }
                const shouldDraft = mode === 'private'
                    ? draftMode || Boolean(opponent.draftMode)
                    : draftMode && Boolean(opponent.draftMode);
                if (shouldDraft) {
                    const draft = createDraftSession({
                        mode,
                        arena,
                        players: [
                            {
                                username,
                                team,
                                mode,
                                arena,
                                profile: buildBattleProfileSnapshot(profile, arena),
                                draftMode: true,
                                targetUsername,
                                queuedAt: new Date(),
                                allowBattleBot: true,
                                ladderLevel: Number(getProfileArenaState(profile, arena)?.ladder?.level) || 1,
                            },
                            {
                                ...opponent,
                                draftMode: true,
                            },
                        ],
                    });
                    return res.json(serializeDraftForUser(draft, username));
                }
                const matchDocument = buildPairedMatchDocument({
                    username,
                    team,
                    opponent,
                    mode,
                    arena,
                    profile,
                });
                await matchesCollection.insertOne(matchDocument);
                const createdMatch = matchDocument;
                scheduleBattleBotTurn(createdMatch);
                const opponentName = opponent.username;
                return res.json({
                    ok: true,
                    matchFound: true,
                    matchId: matchDocument.matchId,
                    mode,
                    arena,
                    opponent: opponentName,
                    matchStartsAt: matchDocument.matchStartsAt,
                    matchReady: new Date(matchDocument.matchStartsAt).getTime() <= Date.now(),
                    currentTurn: matchDocument.currentTurn,
                    turnOrder: matchDocument.turnOrder,
                    turnExpiresAt: matchDocument.turnExpiresAt,
                    turnDurationMs: getTurnDurationMsForUser(matchDocument, matchDocument.currentTurn),
                    pendingTurn: makeEmptyPendingTurn(),
                    backgroundOverride: matchDocument.backgroundOverride,
                });
            } catch (error) {
                console.error('[matchmaking] failed to create paired match', {
                    username,
                    opponentUsername: opponent.username || null,
                    mode,
                    arena,
                    draftMode,
                    opponentDraftMode: Boolean(opponent.draftMode),
                    error: error?.message || String(error),
                });
            }
        }

        const queuedBotMatch = await maybeCreateBattleBotMatch({
            username,
            mode,
            arena,
            userProfile: profile,
        });
        if (queuedBotMatch?.draftId) {
            return res.json(serializeDraftForUser(queuedBotMatch, username));
        }
        if (queuedBotMatch) {
            scheduleBattleBotTurn(queuedBotMatch);
            const safePayload = buildMatchPayloadForUser(queuedBotMatch, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: queuedBotMatch.matchId,
                mode: queuedBotMatch.mode || mode,
                arena: normalizeArenaMode(queuedBotMatch.arena || arena),
                opponent: safePayload?.opponent?.displayName || getPlayerDisplayName(queuedBotMatch.players?.find((player) => player.isBot)),
                matchStartsAt: queuedBotMatch.matchStartsAt || queuedBotMatch.createdAt || null,
                matchReady:
                    !queuedBotMatch.matchStartsAt ||
                    new Date(queuedBotMatch.matchStartsAt).getTime() <= Date.now(),
                currentTurn: queuedBotMatch.currentTurn || null,
                turnOrder: queuedBotMatch.turnOrder || null,
                turnExpiresAt: queuedBotMatch.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(queuedBotMatch, queuedBotMatch?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        // Otherwise enqueue
        enqueuePlayer({
            username,
            team,
            mode,
            arena,
            draftMode,
            targetUsername,
            queuedAt: new Date(),
            allowBattleBot: true,
            profile: buildBattleProfileSnapshot(profile, arena),
            ladderLevel: Number(getProfileArenaState(profile, arena)?.ladder?.level) || 1,
        });
        return res.json({ ok: true, queued: true, mode, arena });
    } catch (error) {
        console.error('Matchmaking error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

const hydrateMatchForStatus = (matchId) =>
    matchCommandCoordinator.execute(
        matchId,
        'get /api/match/status',
        () => hydrateAndAdvanceMatch(matchId),
        { log: false }
    );

app.get('/api/match/status', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const requestedArena =
            typeof req.query?.arena === 'string' && req.query.arena.trim()
                ? normalizeArenaMode(req.query.arena)
                : '';
        const user = await usersCollection.findOne(
            { username },
            { projection: { _id: 1, username: 1, createdAt: 1, profile: 1 } }
        );
        const normalizedProfile = user ? normalizeUserProfile(user) : null;
        const draftId = userToDraft.get(username);
        if (draftId) {
            const draft = await advanceDraftIfNeeded(draftSessions.get(draftId));
            if (draft) {
                if (draft.phase === 'completed' && draft.matchId) {
                    userToDraft.delete(username);
                }
                if (draft.phase === 'failed') {
                    userToDraft.delete(username);
                }
                return res.json(serializeDraftForUser(draft, username));
            }
            userToDraft.delete(username);
        }
        const mapping = userToMatch.get(username);
        if (mapping && (!requestedArena || !mapping.arena || mapping.arena === requestedArena)) {
            const match = await matchesCollection.findOne({ matchId: mapping.matchId });
            if (!match || match.status === 'ended') {
                userToMatch.delete(username);
                return res.json({ ok: true, matchFound: false });
            }
            const hydrated = await hydrateMatchForStatus(match.matchId);
            if (!hydrated || hydrated.status === 'ended') {
                userToMatch.delete(username);
                return res.json({ ok: true, matchFound: false });
            }
            scheduleBattleBotTurn(hydrated);
            const safePayload = buildMatchPayloadForUser(hydrated, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: mapping.matchId,
                mode: hydrated.mode || 'quick',
                arena: normalizeArenaMode(hydrated.arena),
                opponent: mapping.opponent,
                matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
                matchReady:
                    !hydrated.matchStartsAt ||
                    new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
                currentTurn: hydrated?.currentTurn || null,
                turnOrder: hydrated?.turnOrder || null,
                turnExpiresAt: hydrated?.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                board: safePayload?.board || null,
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        // Prefer a persisted active match before creating any new bot match.
        const match = await findMostRecentActiveMatchForUser(username, requestedArena);
        if (!match) {
            const queuedEntry = findQueuedEntry(username, null, requestedArena || null);
            const botMatch = await maybeCreateBattleBotMatch({
                username,
                mode: queuedEntry?.mode || 'quick',
                arena: queuedEntry?.entry?.arena || requestedArena || DEFAULT_ARENA_MODE,
                userProfile: normalizedProfile,
            });
            if (botMatch?.draftId) {
                return res.json(serializeDraftForUser(botMatch, username));
            }
            if (!botMatch) {
                return res.json({ ok: true, matchFound: false });
            }
            scheduleBattleBotTurn(botMatch);
            const safePayload = buildMatchPayloadForUser(botMatch, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: botMatch.matchId,
                mode: botMatch.mode || 'quick',
                arena: normalizeArenaMode(botMatch.arena),
                opponent: safePayload?.opponent?.displayName || getPlayerDisplayName(botMatch.players?.find((player) => player.isBot)),
                matchStartsAt: botMatch.matchStartsAt || botMatch.createdAt || null,
                matchReady:
                    !botMatch.matchStartsAt ||
                    new Date(botMatch.matchStartsAt).getTime() <= Date.now(),
                currentTurn: botMatch.currentTurn || null,
                turnOrder: botMatch.turnOrder || null,
                turnExpiresAt: botMatch.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(botMatch, botMatch?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }
        const hydrated = await hydrateMatchForStatus(match.matchId);
        if (!hydrated || hydrated.status === 'ended') {
            return res.json({ ok: true, matchFound: false });
        }
        const opponentEntry = findMatchOpponentByUsername(hydrated, username);
        const opponent = opponentEntry ? getPlayerDisplayName(opponentEntry) : null;
        userToMatch.set(username, { matchId: hydrated.matchId, opponent, arena: normalizeArenaMode(hydrated.arena) });
        scheduleBattleBotTurn(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            matchFound: true,
            matchId: hydrated.matchId,
            mode: hydrated.mode || 'quick',
            arena: normalizeArenaMode(hydrated.arena),
            opponent,
            matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
            matchReady:
                !hydrated.matchStartsAt ||
                new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
            currentTurn: hydrated.currentTurn || null,
            turnOrder: hydrated.turnOrder || null,
            turnExpiresAt: hydrated.turnExpiresAt || null,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
            board: safePayload?.board || null,
            chakraPools: safePayload?.chakraPools || null,
            lastChakraGain: safePayload?.lastChakraGain || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
        });
    } catch (error) {
        console.error('Match status error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/match/cancel', requireSession, (req, res) => {
    const username = req.authUser.username;
    // If already matched, do not allow cancelling
    if (userToMatch.has(username)) {
        return res.json({ ok: false, message: 'Match already found.' });
    }
    const draftId = userToDraft.get(username);
    if (draftId) {
        const draft = draftSessions.get(draftId);
        if (draft && draft.phase !== 'completed' && draft.phase !== 'failed') {
            finishDraftWithFailure(draft, [username], 'A player left draft.');
        }
        userToDraft.delete(username);
    }
    removeQueuedEntry(username);
    // Do not remove from existing matches here; only queue
    return res.json({ ok: true, cancelled: true });
});

app.post('/api/draft/:draftId/bans', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const draft = await advanceDraftIfNeeded(draftSessions.get(req.params.draftId));
        const draftPlayer = draft?.players?.find((player) => usernamesEqual(player.username, username));
        if (!draft || !draftPlayer) {
            return res.status(404).json({ error: 'Draft not found.' });
        }
        const draftUsername = draftPlayer.username;
        if (draft.phase !== 'ban') {
            return res.status(400).json({ error: 'Ban phase is closed.' });
        }
        const bans = normalizeDraftBans(req.body?.bans, draft.arena);
        if (bans.length !== DRAFT_BAN_COUNT) {
            return res.status(400).json({ error: `Select ${DRAFT_BAN_COUNT} bans.` });
        }
        draft.submissions[draftUsername] = {
            ...(draft.submissions[draftUsername] || {}),
            bans,
            banSubmitted: true,
        };
        await advanceDraftIfNeeded(draft);
        return res.json(serializeDraftForUser(draft, draftUsername));
    } catch (error) {
        console.error('Draft ban error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/draft/:draftId/team', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const draft = await advanceDraftIfNeeded(draftSessions.get(req.params.draftId));
        const draftPlayer = draft?.players?.find((player) => usernamesEqual(player.username, username));
        if (!draft || !draftPlayer) {
            return res.status(404).json({ error: 'Draft not found.' });
        }
        const draftUsername = draftPlayer.username;
        if (draft.phase !== 'pick') {
            return res.status(400).json({ error: 'Pick phase is not open.' });
        }
        const bannedSet = new Set(draft.revealedBans || []);
        const team = normalizeDraftTeam(req.body?.team, bannedSet, draft.arena);
        if (team.length !== DRAFT_TEAM_SIZE) {
            return res.status(400).json({ error: `Select ${DRAFT_TEAM_SIZE} available characters.` });
        }
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        try {
            await assertTeamCanBeUsed(normalizeUserProfile(user), team, user.role, draft.arena);
        } catch (error) {
            return res.status(403).json({ error: error.message || 'Character is locked.' });
        }
        draft.submissions[draftUsername] = {
            ...(draft.submissions[draftUsername] || {}),
            team,
            teamSubmitted: true,
        };
        await advanceDraftIfNeeded(draft);
        return res.json(serializeDraftForUser(draft, draftUsername));
    } catch (error) {
        console.error('Draft team error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/match/:matchId/version', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const match = await matchesCollection.findOne(
        { matchId },
        {
            projection: {
                matchId: 1,
                stateRevision: 1,
                turnNumber: 1,
                currentTurn: 1,
                turnExpiresAt: 1,
                status: 1,
                players: 1,
            },
        }
    );
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const playerEntry = findMatchPlayerByUsername(match, req.authUser.username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    return res.json({
        ok: true,
        ...buildMatchVersionPayload(match),
        currentTurn: match.currentTurn || null,
        turnExpiresAt: match.turnExpiresAt || null,
        status: match.status || 'active',
    });
});

app.get('/api/match/:matchId', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const match = await matchesCollection.findOne({ matchId });
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const playerEntry = findMatchPlayerByUsername(hydrated, req.authUser.username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    scheduleBattleBotTurn(hydrated);
    return res.json(buildMatchPayloadForUser(hydrated, req.authUser.username));
});

app.post('/api/match/:matchId/surrender', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const storedMatch = await matchesCollection.findOne({ matchId });
    if (!storedMatch) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const match = await ensureMatchVersionData(storedMatch);
    const username = req.authUser.username;
    const playerEntry = findMatchPlayerByUsername(match, username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (match.status === 'ended') {
        return res.json({
            ok: true,
            ...buildMatchVersionPayload(match),
            mode: match.mode || 'quick',
            status: 'ended',
            winner: match.winner || null,
            surrenderedBy: match.surrenderedBy || null,
            endReason: match.endReason || null,
            endedAt: match.endedAt || null,
            ladderResult: match.ladderResults?.[username] || null,
        });
    }
    if (hasExpectedRevisionConflict(match, req.body)) {
        return respondWithRevisionConflict(res, match, playerEntry.username);
    }
    const opponentEntry = findMatchOpponentByUsername(match, username);
    const endedAt = new Date();
    const winnerUsername = opponentEntry ? opponentEntry.username : null;
    const endedMatch = {
        ...match,
        mode: match.mode || 'quick',
        status: 'ended',
        winner: winnerUsername,
        surrenderedBy: username,
        endReason: 'surrender',
        endedAt,
        currentTurn: null,
        turnExpiresAt: null,
    };
    try {
        await persistMatchState(
            endedMatch,
            {
                mode: endedMatch.mode,
                status: 'ended',
                winner: winnerUsername,
                surrenderedBy: username,
                endReason: 'surrender',
                endedAt,
                currentTurn: null,
                turnExpiresAt: null,
            },
            { incrementTurn: true }
        );
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        throw error;
    }
    quickMatches.delete(matchId);
    (match.players || []).forEach((player) => userToMatch.delete(player.username));
    queueMatchStateBroadcast(endedMatch);
    let ladderResults = null;
    try {
        ladderResults = await applyRewardsToPersistedMatch(endedMatch);
        queueMatchStateBroadcast(endedMatch);
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        console.error('Surrender reward processing error:', error);
    }
    return res.json({
        ok: true,
        ...buildMatchVersionPayload(endedMatch),
        mode: endedMatch.mode,
        status: 'ended',
        surrenderedBy: username,
        winner: winnerUsername,
        endReason: 'surrender',
        endedAt,
        ladderResult: ladderResults?.[username] || null,
    });
});

app.post('/api/match/:matchId/turn/end', requireSession, async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        if (hydrated.status === 'ended') {
            queueMatchStateBroadcast(hydrated);
            return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
                actionRejected: 'match-ended',
            });
        }

        const authUsername = req.authUser.username;
        const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
        if (!playerEntry) {
            return res.status(403).json({ error: 'Not part of this match.' });
        }
        const username = playerEntry.username;
        if (hasExpectedRevisionConflict(hydrated, req.body)) {
            return respondWithRevisionConflict(res, hydrated, username);
        }
        console.info('[match-turn-end] request', {
            matchId,
            username,
            arena: normalizeArenaMode(hydrated.arena),
            currentTurn: hydrated.currentTurn,
            status: hydrated.status,
        });
        if (!usernamesEqual(hydrated.currentTurn, username)) {
            queueMatchStateBroadcast(hydrated);
            console.warn('[match-turn-end] rejected-not-your-turn', {
                matchId,
                username,
                currentTurn: hydrated.currentTurn,
            });
            return respondWithCurrentMatchState(res, hydrated, username, {
                actionRejected: 'not-your-turn',
            });
        }
        const pendingTurn = getPendingTurn(hydrated, username);
        if (hasPendingTurnStartChoice(pendingTurn)) {
            console.warn('[match-turn-end] rejected-pending-choice', {
                matchId,
                username,
                turnStartChoice: pendingTurn.turnStartChoice?.sourceStatusId || null,
            });
            return respondWithCurrentMatchState(res, hydrated, username, {
                actionRejected: 'pending-turn-start-choice',
            });
        }
        if ((pendingTurn.unresolvedRandom || 0) > 0) {
            console.warn('[match-turn-end] rejected-unresolved-random', {
                matchId,
                username,
                unresolvedRandom: pendingTurn.unresolvedRandom || 0,
            });
            return respondWithCurrentMatchState(res, hydrated, username, {
                actionRejected: 'unresolved-random',
            });
        }

        const updated = await finalizeTurn(hydrated, username);
        console.info('[match-turn-end] success', {
            matchId,
            username,
            nextTurn: updated?.currentTurn || null,
            status: updated?.status || hydrated.status,
            winner: updated?.winner || null,
        });
        await broadcastMatchState(updated || hydrated);
        scheduleBattleBotTurn(updated || hydrated);

        return res.json(buildMatchPayloadForUser(updated, username));
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, req.params.matchId, req.authUser.username);
        }
        console.error('Failed to end turn:', error);
        return res.status(500).json({
            error: 'Failed to end turn.',
            details: String(error?.stack || error?.message || error),
        });
    }
});

app.post('/api/match/:matchId/skill/queue', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    const skillIndex = Number.parseInt(req.body?.skillIndex, 10);
    const targetSelection = req.body?.targetSelection;
    const classChoice = req.body?.classChoice;
    const absorptionChoice = req.body?.absorptionChoice;
    if (!Number.isInteger(actorSlot) || actorSlot < 0 || !Number.isInteger(skillIndex) || skillIndex < 0) {
        return res.status(400).json({ error: 'actorSlot and skillIndex are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
        });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (hasExpectedRevisionConflict(hydrated, req.body)) {
        return respondWithRevisionConflict(res, hydrated, username);
    }
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
        });
    }
    const pendingTurn = getPendingTurn(hydrated, username);
    if (hasPendingTurnStartChoice(pendingTurn)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
        });
    }
    if (
        areQueuedSkillRequestsEquivalent(pendingTurn.queuedByActorSlot?.[String(actorSlot)] || null, {
            skillIndex,
            targetSelection,
            classChoice,
            absorptionChoice,
        })
    ) {
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            ...buildMatchVersionPayload(hydrated),
            staleAction: true,
            actionRejected: 'duplicate-skill-queue',
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    }
    const options = battleLogic.computeTargetOptions({
        match: hydrated,
        actingUsername: username,
        actorSlot,
        skillIndex,
        characters: charactersData,
    });
    if (!options.targetType || options.mode === 'unknown') {
        return res.status(400).json({ error: 'Skill target could not be resolved.' });
    }
    if (!battleLogic.validateTargetSelection(options, targetSelection)) {
        return res.status(400).json({ error: 'Invalid target selection.' });
    }
    try {
        queueSkillForActorSlot({
            match: hydrated,
            username,
            actorSlot,
            skillIndex,
            targetSelection,
            classChoice,
            absorptionChoice,
        });
        console.info('[match-skill-queue] success', {
            matchId,
            username,
            actorSlot,
            skillIndex,
            arena: normalizeArenaMode(hydrated.arena),
            targetCount: Array.isArray(targetSelection) ? targetSelection.length : targetSelection ? 1 : 0,
        });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            ...buildMatchVersionPayload(hydrated),
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        console.warn('[match-skill-queue] failed', {
            matchId,
            username,
            actorSlot,
            skillIndex,
            arena: normalizeArenaMode(hydrated.arena),
            error: error.message || String(error),
        });
        return res.status(400).json({ error: error.message || 'Failed to queue skill.' });
    }
});

app.post('/api/match/:matchId/turn/start-choice', requireSession, async (req, res) => {
    try {
        const { matchId } = req.params;
        const choiceKey =
            typeof req.body?.choiceKey === 'string' ? req.body.choiceKey.trim().toLowerCase() : '';
        if (!choiceKey) {
            return res.status(400).json({ error: 'choiceKey is required.' });
        }
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        if (hydrated.status === 'ended') {
            return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
                actionRejected: 'match-ended',
            });
        }
        const authUsername = req.authUser.username;
        const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
        if (!playerEntry) {
            return res.status(403).json({ error: 'Not part of this match.' });
        }
        const username = playerEntry.username;
        if (hasExpectedRevisionConflict(hydrated, req.body)) {
            return respondWithRevisionConflict(res, hydrated, username);
        }
        if (!usernamesEqual(hydrated.currentTurn, username)) {
            return respondWithCurrentMatchState(res, hydrated, username, {
                actionRejected: 'not-your-turn',
            });
        }

        const targetUsername = typeof req.body?.targetUsername === 'string' ? req.body.targetUsername : null;
        const targetSlot = Number.isInteger(req.body?.targetSlot) ? req.body.targetSlot : null;

        const pendingTurn = getPendingTurn(hydrated, username);
        const prompt = pendingTurn.turnStartChoice;
        if (!hasPendingTurnStartChoice(pendingTurn) || !prompt) {
            return respondWithCurrentMatchState(res, hydrated, username, {
                actionRejected: 'no-pending-turn-start-choice',
            });
        }
        const option = Array.isArray(prompt.options)
            ? prompt.options.find((entry) => entry?.key === choiceKey)
            : null;
        if (!option) {
            return res.status(400).json({ error: 'Invalid choice.' });
        }
        resolveTurnStartChoiceForUser({
            match: hydrated,
            username,
            choiceKey,
            targetUsername,
            targetSlot,
        });
        await persistMatchState(hydrated, {
            board: hydrated.board,
            players: hydrated.players,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        scheduleBattleBotTurn(hydrated);
        return res.json(buildMatchPayloadForUser(hydrated, username));
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, req.params.matchId, req.authUser.username);
        }
        console.error('Failed to resolve turn start choice:', error);
        return res.status(500).json({
            error: 'Failed to resolve turn start choice.',
        });
    }
});

app.post('/api/match/:matchId/skill/cancel', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    if (!Number.isInteger(actorSlot) || actorSlot < 0) {
        return res.status(400).json({ error: 'actorSlot is required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
        });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (hasExpectedRevisionConflict(hydrated, req.body)) {
        return respondWithRevisionConflict(res, hydrated, username);
    }
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
        });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
        });
    }
    const changed = cancelQueuedSkillForActorSlot({ match: hydrated, username, actorSlot });
    if (changed) {
        try {
            await persistMatchState(hydrated, {
                chakraPools: hydrated.chakraPools,
                pendingTurns: hydrated.pendingTurns,
            });
        } catch (error) {
            if (isMatchRevisionConflict(error)) {
                return respondWithLatestRevisionConflict(res, matchId, username);
            }
            throw error;
        }
        queueMatchStateBroadcast(hydrated);
    }
    const safePayload = buildMatchPayloadForUser(hydrated, username);
    return res.json({
        ok: true,
        ...buildMatchVersionPayload(hydrated),
        chakraPools: safePayload?.chakraPools || null,
        pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
    });
});

app.post('/api/match/:matchId/skill/reorder', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlots = Array.isArray(req.body?.actorSlots) ? req.body.actorSlots : [];
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
        });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (hasExpectedRevisionConflict(hydrated, req.body)) {
        return respondWithRevisionConflict(res, hydrated, username);
    }
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
        });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
        });
    }
    reorderQueuedSkills({ match: hydrated, username, actorSlots });
    try {
        await persistMatchState(hydrated, {
            pendingTurns: hydrated.pendingTurns,
        });
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        throw error;
    }
    await broadcastMatchState(hydrated);
    return res.json({
        ok: true,
        ...buildMatchVersionPayload(hydrated),
        pendingTurn: getPendingTurn(hydrated, username),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
    });
});

app.post('/api/match/:matchId/turn/random/adjust', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const chakraType = typeof req.body?.chakraType === 'string' ? req.body.chakraType.trim().toLowerCase() : '';
    const deltaRaw = Number.parseInt(req.body?.delta, 10);
    const delta = deltaRaw > 0 ? 1 : deltaRaw < 0 ? -1 : 0;
    const adjustments = Array.isArray(req.body?.adjustments)
        ? req.body.adjustments
        : [{ chakraType, delta }];
    if (
        adjustments.length === 0 ||
        adjustments.length > 24 ||
        adjustments.some((adjustment) => {
            const type =
                typeof adjustment?.chakraType === 'string'
                    ? adjustment.chakraType.trim().toLowerCase()
                    : '';
            const adjustmentDelta = Number.parseInt(adjustment?.delta, 10);
            return !chakraTypes.includes(type) || (adjustmentDelta !== 1 && adjustmentDelta !== -1);
        })
    ) {
        return res.status(400).json({ error: 'chakraType and delta are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
        });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (hasExpectedRevisionConflict(hydrated, req.body)) {
        return respondWithRevisionConflict(res, hydrated, username);
    }
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
        });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
        });
    }
    try {
        adjustRandomAssignments({ match: hydrated, username, adjustments });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            ...buildMatchVersionPayload(hydrated),
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        return res.status(400).json({ error: error.message || 'Unable to adjust random chakra.' });
    }
});

app.post('/api/match/:matchId/chakra/exchange', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const chakraType = typeof req.body?.chakraType === 'string' ? req.body.chakraType.trim().toLowerCase() : '';
    const spendAssignments =
        req.body?.spendAssignments && typeof req.body.spendAssignments === 'object'
            ? req.body.spendAssignments
            : null;
    if (!chakraTypes.includes(chakraType)) {
        return res.status(400).json({ error: 'chakraType is required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
        });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (hasExpectedRevisionConflict(hydrated, req.body)) {
        return respondWithRevisionConflict(res, hydrated, username);
    }
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
        });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
        });
    }
    try {
        exchangeChakra({
            match: hydrated,
            username,
            chakraType,
            cost: 2,
            spendAssignments,
        });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            ...buildMatchVersionPayload(hydrated),
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        if (isMatchRevisionConflict(error)) {
            return respondWithLatestRevisionConflict(res, matchId, username);
        }
        return res.status(400).json({ error: error.message || 'Unable to exchange chakra.' });
    }
});

app.post('/api/match/:matchId/skill/targets', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    const skillIndex = Number.parseInt(req.body?.skillIndex, 10);
    if (!Number.isInteger(actorSlot) || actorSlot < 0 || !Number.isInteger(skillIndex) || skillIndex < 0) {
        return res.status(400).json({ error: 'actorSlot and skillIndex are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return respondWithCurrentMatchState(res, hydrated, req.authUser.username, {
            actionRejected: 'match-ended',
            targetType: '',
            mode: 'none',
            targets: [],
        });
    }

    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'not-your-turn',
            targetType: '',
            mode: 'none',
            targets: [],
        });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return respondWithCurrentMatchState(res, hydrated, username, {
            actionRejected: 'pending-turn-start-choice',
            targetType: '',
            mode: 'none',
            targets: [],
        });
    }

    const probingMatch = {
        ...hydrated,
        chakraPools: {
            ...(hydrated.chakraPools || {}),
            [username]: {
                ...(hydrated.chakraPools?.[username] || {}),
            },
        },
        pendingTurns: {
            ...(hydrated.pendingTurns || {}),
            [username]: clonePendingTurn(hydrated.pendingTurns?.[username]),
        },
    };

    try {
        queueSkillForActorSlot({
            match: probingMatch,
            username,
            actorSlot,
            skillIndex,
            targetSelection: null,
        });
    } catch (error) {
        return res.status(400).json({
            error: error?.message || 'This skill cannot be used right now.',
        });
    }

    const options = battleLogic.computeTargetOptions({
        match: hydrated,
        actingUsername: username,
        actorSlot,
        skillIndex,
        characters: charactersData,
    });

    if (!options.targetType || options.mode === 'unknown') {
        return res.status(400).json({ error: 'Skill target could not be resolved.' });
    }

    return res.json({
        ok: true,
        targetType: options.targetType,
        mode: options.mode,
        targets: options.targets,
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        pendingTurn: getPendingTurn(hydrated, username),
    });
});

app.post('/api/refresh', requireSession, async (req, res) => {
    try {
        const token = signSession(req.authUser);
        setSessionCookie(res, token);
        return res.json({ ok: true, user: req.authUser });
    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/me', requireSession, async (req, res) => {
    const user = await usersCollection.findOne({ username: req.authUser.username });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const normalizedProfile = normalizeUserProfile(user);
    normalizedProfile.activity.lastOnlineAt = new Date();
    const savedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena(user);
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                profile: normalizedProfile,
                savedTeamIndices: savedTeamIndicesByArena.comic,
                savedTeamIndicesByArena,
            },
        }
    );
    const hydratedUser = {
        ...user,
        profile: normalizedProfile,
        savedTeamIndices: savedTeamIndicesByArena.comic,
        savedTeamIndicesByArena,
    };
    res.json({ ok: true, user: serializeUserForClient(hydratedUser) });
});

app.post('/api/activity', requireSession, async (req, res) => {
    const { error: validationError, value } = activityUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid activity payload.' });
    }
    const activity = {
        lastOnlineAt: new Date(),
        currentPage: value.currentPage || '',
    };
    const result = await usersCollection.updateOne(
        { username: req.authUser.username },
        {
            $set: {
                'profile.activity.lastOnlineAt': activity.lastOnlineAt,
                'profile.activity.currentPage': activity.currentPage,
            },
        }
    );
    if (!result?.matchedCount) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    return res.json({
        ok: true,
        activity,
    });
});

app.get('/api/admin/winrates', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const arena = normalizeArenaMode(req.query?.arena);
        const mode = ['quick', 'ladder'].includes(String(req.query?.mode || '').toLowerCase())
            ? String(req.query.mode).toLowerCase()
            : 'ladder';
        const winratesState = await appStateCollection.findOne({ key: `winrates:${arena}` });
        const legacyWinratesState = winratesState
            ? null
            : await appStateCollection.findOne({ key: 'winrates' });
        const effectiveWinratesState = winratesState || legacyWinratesState;
        const resetAt =
            effectiveWinratesState && effectiveWinratesState.resetAt
                ? new Date(effectiveWinratesState.resetAt)
                : null;
        const matchFilter = {
            status: 'ended',
            mode,
            arena,
            ...(resetAt && !Number.isNaN(resetAt.getTime())
                ? {
                    endedAt: { $gte: resetAt },
                }
                : {}),
        };
        const winrateAggregates = await matchesCollection
            .aggregate([
                { $match: matchFilter },
                { $project: { winner: 1, 'players.username': 1, 'players.team': 1 } },
                { $unwind: '$players' },
                { $unwind: '$players.team' },
                {
                    $project: {
                        characterIndex: {
                            $convert: {
                                input: '$players.team',
                                to: 'int',
                                onError: null,
                                onNull: null,
                            },
                        },
                        didWin: {
                            $eq: [
                                { $toLower: { $ifNull: ['$players.username', ''] } },
                                { $toLower: { $ifNull: ['$winner', ''] } },
                            ],
                        },
                    },
                },
                { $match: { characterIndex: { $ne: null } } },
                {
                    $group: {
                        _id: '$characterIndex',
                        totalMatchesPlayed: { $sum: 1 },
                        totalGamesWon: { $sum: { $cond: ['$didWin', 1, 0] } },
                    },
                },
            ])
            .toArray();
        const aggregateByCharacterIndex = new Map(
            winrateAggregates.map((entry) => [Number(entry._id), entry])
        );
        const characters = buildCharacterWinrateEntries({ matches: [], arena, mode, resetAt }).map(
            (entry) => {
                const aggregate = aggregateByCharacterIndex.get(entry.characterIndex);
                if (!aggregate) return entry;
                return {
                    ...entry,
                    totalMatchesPlayed: Number(aggregate.totalMatchesPlayed) || 0,
                    totalGamesWon: Number(aggregate.totalGamesWon) || 0,
                };
            }
        );

        return res.json({
            ok: true,
            arena,
            mode,
            characters,
        });
    } catch (error) {
        console.error('Admin winrates load error:', error);
        return res.status(500).json({ error: 'Unable to load winrates.' });
    }
});

app.post('/api/admin/winrates/reset', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const arena = normalizeArenaMode(req.query?.arena);
        const resetAt = new Date();
        await appStateCollection.updateOne(
            { key: `winrates:${arena}` },
            {
                $set: {
                    key: `winrates:${arena}`,
                    arena,
                    resetAt,
                    updatedBy: req.authUser.username,
                },
            },
            { upsert: true }
        );

        return res.json({
            ok: true,
            arena,
            resetAt,
        });
    } catch (error) {
        console.error('Admin winrates reset error:', error);
        return res.status(500).json({ error: 'Unable to reset winrates.' });
    }
});

app.get('/api/news', async (req, res) => {
    try {
        const requestedArena = typeof req.query?.arena === 'string' && req.query.arena.trim()
            ? normalizeArenaMode(req.query.arena)
            : '';
        const storedPosts = await newsPostsCollection
            .find({}, { sort: { createdAt: -1 } })
            .toArray();
        const posts = requestedArena
            ? storedPosts.filter((post) => normalizeNewsArena(post) === requestedArena)
            : storedPosts;
        return res.json({
            ok: true,
            posts: posts.map(serializeNewsPost),
        });
    } catch (error) {
        console.error('News load error:', error);
        return res.status(500).json({ error: 'Unable to load news posts.' });
    }
});

const buildArenaSkinsResponse = ({ arena = DEFAULT_ARENA_MODE, profile = null } = {}) => {
    const normalizedArena = normalizeArenaMode(arena);
    const arenaProfile = profile ? getProfileArenaState(profile, normalizedArena) : {};
    const missionState = normalizeMissionState(arenaProfile?.missions);
    const skinState = normalizeArenaSkinState(arenaProfile?.skins, normalizedArena);
    const catalog = Array.from(getArenaSkinCatalogById(normalizedArena).values()).map(
        serializeSkinCatalogEntryForClient
    );
    return {
        ok: true,
        arena: normalizedArena,
        skins: catalog,
        unlockedSkinIds: skinState.unlockedSkinIds,
        equippedSkinByCharacterId: skinState.equippedSkinByCharacterId,
        unlockPoints: missionState.unlockPoints,
        pointStore: buildUnlockPointStoreResponse({ arena: normalizedArena, profile }),
    };
};

app.get('/api/missions', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const arena = normalizeArenaMode(req.query?.arena);
        let missions = addUnlockPointCostsToMissions((await getStoredMissionCatalog()).filter(
            (mission) => normalizeArenaMode(mission?.arena) === arena
        ));
        let missionState = createDefaultMissionState();
        let normalizedProfile = null;
        try {
            const token = req.cookies?.[SESSION_COOKIE_NAME];
            const authUser = token ? await getSessionUserFromToken(token) : null;
            if (authUser) {
                normalizedProfile = normalizeUserProfile(authUser);
                missionState = normalizeMissionState(getProfileArenaState(normalizedProfile, arena).missions);
                if (arena === 'pokemon' && missionState.gen2StarterCharacterId) {
                    missions = missions.filter((mission) => {
                        const requiredStarterId = normalizeCharacterId(mission.starter_character_id);
                        return !requiredStarterId || requiredStarterId === missionState.gen2StarterCharacterId;
                    });
                }
            }
        } catch (sessionError) {
            console.warn('Mission session lookup failed:', sessionError);
        }
        return res.json({
            ok: true,
            arena,
            missions,
            missionProgressByMissionId: missionState.progressByMissionId,
            unlockedCharacterIds: missionState.unlockedCharacterIds,
            unlockPoints: missionState.unlockPoints,
            playerLevel: Number(getProfileArenaState(normalizedProfile || {}, arena)?.ladder?.level) || 1,
            unlockPointPriceMin: MISSION_UNLOCK_POINT_PRICE_MIN,
            unlockPointPriceMax: Math.max(
                MISSION_UNLOCK_POINT_PRICE_MAX,
                MISSION_EEVEE_EVOLUTION_UNLOCK_POINT_COST
            ),
            purchasedUnlocks: missionState.purchasedUnlocks,
            pointStore: buildUnlockPointStoreResponse({ arena, profile: normalizedProfile }),
        });
    } catch (error) {
        console.error('Mission catalog load error:', error);
        return res.status(500).json({ error: 'Unable to load missions.' });
    }
});

app.get('/api/skins', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const arena = normalizeArenaMode(req.query?.arena);
        let normalizedProfile = null;
        try {
            const token = req.cookies?.[SESSION_COOKIE_NAME];
            const authUser = token ? await getSessionUserFromToken(token) : null;
            if (authUser) {
                normalizedProfile = normalizeUserProfile(authUser);
            }
        } catch (sessionError) {
            console.warn('Skin session lookup failed:', sessionError);
        }
        return res.json(buildArenaSkinsResponse({ arena, profile: normalizedProfile }));
    } catch (error) {
        console.error('Skin catalog load error:', error);
        return res.status(500).json({ error: 'Unable to load skins.' });
    }
});

app.post('/api/missions/unlock-points/purchase', requireSession, async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const characterId = normalizeCharacterId(req.body?.characterId || req.body?.character_id || '');
        if (!characterId) {
            return res.status(400).json({ error: 'Character is required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const missions = await getStoredMissionCatalog();
        const mission = findMissionForPurchasableCharacter(missions, characterId, arena);
        if (!mission) {
            return res.status(400).json({ error: 'This character is not a mission-locked unlock.' });
        }
        const unlockPointCost = resolveMissionUnlockPointCost(mission);

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, arena);
        const missionState = normalizeMissionState(arenaState.missions);
        const playerLevel = Number(arenaState?.ladder?.level) || 1;
        const requiredRank = Math.max(1, Number(mission.level_requirement ?? mission.rank) || 1);
        if (mission.purchase_requires_rank && playerLevel < requiredRank) {
            return res.status(403).json({
                error: `Reach rank ${requiredRank} before buying this character.`,
                playerLevel,
                requiredRank,
            });
        }
        const unlockedIds = new Set(
            missionState.unlockedCharacterIds
                .map((entry) => normalizeCharacterId(entry))
                .filter(Boolean)
        );
        if (unlockedIds.has(characterId)) {
            return res.status(409).json({ error: 'Character is already unlocked.' });
        }
        if (
            arena === 'pokemon' &&
            mission.missionId === 'eevee-evolution-path' &&
            getPokemonEeveeEvolutionCharacterIds().has(characterId)
        ) {
            const eeveeMissionProgress = normalizeMissionProgressEntry(
                missionState.progressByMissionId?.['eevee-evolution-path'] || {}
            );
            if (!eeveeMissionProgress.completedAt) {
                return res.status(403).json({ error: 'Complete Eevee Evolution Path first.' });
            }
            if (!getPokemonEeveeEvolutionCharacterIds().has(missionState.eeveeEvolutionCharacterId)) {
                return res.status(403).json({
                    error: 'Choose your first Eevee evolution before buying the others.',
                });
            }
        }
        if (missionState.unlockPoints < unlockPointCost) {
            return res.status(400).json({
                error: `You need ${unlockPointCost} unlock points to buy this character.`,
                unlockPoints: missionState.unlockPoints,
                unlockPointCost,
            });
        }

        const now = new Date();
        missionState.unlockPoints -= unlockPointCost;
        unlockedIds.add(characterId);
        missionState.unlockedCharacterIds = Array.from(unlockedIds);
        missionState.purchasedUnlocks = [
            ...missionState.purchasedUnlocks,
            {
                characterId,
                missionId: mission.missionId || '',
                cost: unlockPointCost,
                purchasedAt: now,
            },
        ];
        arenaState.missions = normalizeMissionState(missionState);
        arenaState.ladder = {
            ...(arenaState.ladder || {}),
            unlockPoints: arenaState.missions.unlockPoints,
        };

        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: setProfileArenaState(profile, arena, arenaState),
        });
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                },
            }
        );

        return res.json({
            ok: true,
            arena,
            characterId,
            missionId: mission.missionId || '',
            unlockPoints: arenaState.missions.unlockPoints,
            unlockPointCost,
            unlockPointPriceMin: MISSION_UNLOCK_POINT_PRICE_MIN,
            unlockPointPriceMax: Math.max(
                MISSION_UNLOCK_POINT_PRICE_MAX,
                MISSION_EEVEE_EVOLUTION_UNLOCK_POINT_COST
            ),
            unlockedCharacterIds: arenaState.missions.unlockedCharacterIds,
            purchasedUnlocks: arenaState.missions.purchasedUnlocks,
            missionProgressByMissionId: arenaState.missions.progressByMissionId,
            profile: normalizedProfile,
        });
    } catch (error) {
        console.error('Unlock point purchase error:', error);
        return res.status(500).json({ error: 'Unable to buy character unlock.' });
    }
});

app.post('/api/skins/unlock', requireSession, async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const skinId = normalizeSkinId(req.body?.skinId || req.body?.skin_id || '');
        if (!skinId) {
            return res.status(400).json({ error: 'Skin is required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const catalogEntry = getArenaSkinCatalogById(arena).get(skinId);
        if (!catalogEntry) {
            return res.status(404).json({ error: 'Skin not found.' });
        }
        if (catalogEntry.missionRewardOnly) {
            return res.status(403).json({ error: 'This evolution is unlocked through ranked missions.' });
        }

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, arena);
        const missionState = normalizeMissionState(arenaState.missions);
        const skinState = normalizeArenaSkinState(arenaState.skins, arena);
        if (skinState.unlockedSkinIds.includes(skinId)) {
            return res.status(409).json({ error: 'Skin is already unlocked.' });
        }
        if (missionState.unlockPoints < catalogEntry.unlockPointCost) {
            return res.status(400).json({
                error: `You need ${catalogEntry.unlockPointCost} unlock points to buy this skin.`,
                unlockPoints: missionState.unlockPoints,
                unlockPointCost: catalogEntry.unlockPointCost,
            });
        }

        missionState.unlockPoints -= catalogEntry.unlockPointCost;
        skinState.unlockedSkinIds = [...skinState.unlockedSkinIds, skinId];
        arenaState.missions = normalizeMissionState(missionState);
        arenaState.skins = normalizeArenaSkinState(skinState, arena);
        arenaState.ladder = {
            ...(arenaState.ladder || {}),
            unlockPoints: arenaState.missions.unlockPoints,
        };

        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: setProfileArenaState(profile, arena, arenaState),
        });
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                },
            }
        );

        return res.json({
            ...buildArenaSkinsResponse({ arena, profile: normalizedProfile }),
            skinId,
            unlockPointCost: catalogEntry.unlockPointCost,
            profile: normalizedProfile,
        });
    } catch (error) {
        console.error('Skin unlock error:', error);
        return res.status(500).json({ error: 'Unable to unlock skin.' });
    }
});

app.post('/api/skins/equip', requireSession, async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const characterId = normalizeCharacterId(req.body?.characterId || req.body?.character_id || '');
        const skinId = normalizeSkinId(req.body?.skinId || req.body?.skin_id || '');
        if (!characterId) {
            return res.status(400).json({ error: 'Character is required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, arena);
        const skinState = normalizeArenaSkinState(arenaState.skins, arena);
        const currentSkinId = skinState.equippedSkinByCharacterId[characterId] || '';
        const currentSkin = getArenaSkinCatalogById(arena).get(currentSkinId);
        const requestedSkin = skinId ? getArenaSkinCatalogById(arena).get(skinId) : null;
        if (currentSkin?.missionRewardOnly || requestedSkin?.missionRewardOnly) {
            return res.status(403).json({ error: 'Starter evolutions are permanent mission rewards.' });
        }
        if (!skinId) {
            delete skinState.equippedSkinByCharacterId[characterId];
        } else {
            const catalogEntry = getArenaSkinCatalogById(arena).get(skinId);
            if (!catalogEntry) {
                return res.status(404).json({ error: 'Skin not found.' });
            }
            if (catalogEntry.characterId !== characterId) {
                return res.status(400).json({ error: 'That skin does not belong to this Pokemon.' });
            }
            if (!skinState.unlockedSkinIds.includes(skinId)) {
                return res.status(403).json({ error: 'Unlock the skin before equipping it.' });
            }
            skinState.equippedSkinByCharacterId[characterId] = skinId;
        }
        arenaState.skins = normalizeArenaSkinState(skinState, arena);

        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: setProfileArenaState(profile, arena, arenaState),
        });
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                },
            }
        );

        return res.json({
            ...buildArenaSkinsResponse({ arena, profile: normalizedProfile }),
            characterId,
            skinId: skinId || null,
            profile: normalizedProfile,
        });
    } catch (error) {
        console.error('Skin equip error:', error);
        return res.status(500).json({ error: 'Unable to equip skin.' });
    }
});

app.post('/api/unlock-points/paypal/create-order', requireSession, async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const packageId = String(req.body?.packageId || req.body?.package_id || '').trim().toLowerCase();
        if (!isPayPalConfigured()) {
            return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
        }
        const packageEntry = findUnlockPointStorePackage(packageId, arena);
        if (!packageEntry || packageEntry.provider !== 'paypal') {
            return res.status(404).json({ error: 'Point package not found.' });
        }
        const baseUrl = resolvePublicAppUrl(req);
        if (!baseUrl) {
            return res.status(500).json({ error: 'Unable to resolve the public app URL.' });
        }
        const username = req.authUser.username;
        const requestedLayout = ['classic', 'experimental'].includes(req.body?.layout)
            ? req.body.layout
            : '';
        const layoutQuery = requestedLayout ? `&layout=${encodeURIComponent(requestedLayout)}` : '';
        const returnUrl = `${baseUrl}/selection.html?arena=${encodeURIComponent(arena)}${layoutQuery}&unlockPointsPayment=paypal`;
        const cancelUrl = `${baseUrl}/selection.html?arena=${encodeURIComponent(arena)}${layoutQuery}&unlockPointsPayment=paypal-cancelled`;
        const headers = await buildPayPalOrderHeaders();
        const response = await fetch(`${PAYPAL_API_BASE_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        custom_id: createPayPalPointsCustomId({ username, arena, packageId }),
                        description: packageEntry.description,
                        amount: {
                            currency_code: packageEntry.currency,
                            value: packageEntry.amountUsd,
                        },
                    },
                ],
                payment_source: {
                    paypal: {
                        experience_context: {
                            brand_name: 'Comic Arena',
                            shipping_preference: 'NO_SHIPPING',
                            user_action: 'PAY_NOW',
                            return_url: returnUrl,
                            cancel_url: cancelUrl,
                        },
                    },
                },
            }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.message || payload?.name || 'Unable to create PayPal order.');
        }
        const approveUrl = extractPayPalApproveUrl(payload);
        if (!payload?.id || !approveUrl) {
            throw new Error('PayPal did not return an approval URL.');
        }
        const now = new Date();
        await pointPurchasesCollection.updateOne(
            { provider: 'paypal', orderId: payload.id },
            {
                $set: {
                    provider: 'paypal',
                    orderId: payload.id,
                    username,
                    arena,
                    packageId: packageEntry.packageId,
                    pointsGranted: packageEntry.points,
                    amountUsd: packageEntry.amountUsd,
                    currency: packageEntry.currency,
                    merchantEmail: PAYPAL_MERCHANT_EMAIL,
                    status: 'created',
                    approveUrl,
                    paypalEnvironment: PAYPAL_ENV,
                    updatedAt: now,
                },
                $setOnInsert: {
                    createdAt: now,
                },
            },
            { upsert: true }
        );
        return res.json({
            ok: true,
            arena,
            packageId: packageEntry.packageId,
            orderId: payload.id,
            approveUrl,
        });
    } catch (error) {
        console.error('PayPal order creation error:', error);
        return res.status(500).json({ error: error.message || 'Unable to create PayPal order.' });
    }
});

app.post('/api/unlock-points/paypal/capture', requireSession, async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const orderId = String(req.body?.orderId || req.body?.order_id || req.body?.token || '').trim();
        if (!isPayPalConfigured()) {
            return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
        }
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required.' });
        }
        const existingPurchase = await pointPurchasesCollection.findOne({ provider: 'paypal', orderId });
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (existingPurchase?.status === 'granted') {
            const currentProfile = normalizeUserProfile(user);
            return res.json({
                ok: true,
                arena,
                orderId,
                alreadyGranted: true,
                profile: currentProfile,
                pointStore: buildUnlockPointStoreResponse({ arena, profile: currentProfile }),
            });
        }

        const headers = await buildPayPalOrderHeaders();
        const response = await fetch(`${PAYPAL_API_BASE_URL}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: 'POST',
            headers,
            body: '{}',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.message || payload?.name || 'Unable to capture PayPal order.');
        }
        const capture = extractCompletedPayPalCapture(payload);
        if (!capture) {
            throw new Error('PayPal order was not completed.');
        }
        const customId = parsePayPalPointsCustomId(capture.customId);
        if (!customId?.username || !usernamesEqual(customId.username, req.authUser.username)) {
            return res.status(403).json({ error: 'This PayPal order does not belong to your account.' });
        }
        const packageEntry = findUnlockPointStorePackage(customId.packageId, customId.arena || arena);
        if (!packageEntry || packageEntry.provider !== 'paypal') {
            return res.status(400).json({ error: 'The purchased point package is no longer available.' });
        }
        if (
            capture.amountValue !== packageEntry.amountUsd ||
            capture.currencyCode !== String(packageEntry.currency || 'USD').trim().toUpperCase()
        ) {
            return res.status(400).json({ error: 'The captured PayPal amount does not match this point package.' });
        }
        const nextProfile = await grantUnlockPointsPurchase({
            user,
            arena: customId.arena || arena,
            packageEntry,
            orderId,
            captureId: capture.captureId,
            payerId: capture.payerId,
            payerEmail: capture.payerEmail,
        });
        return res.json({
            ok: true,
            arena: customId.arena || arena,
            orderId,
            packageId: packageEntry.packageId,
            pointsGranted: packageEntry.points,
            profile: nextProfile,
            pointStore: buildUnlockPointStoreResponse({ arena: customId.arena || arena, profile: nextProfile }),
        });
    } catch (error) {
        console.error('PayPal capture error:', error);
        return res.status(500).json({ error: error.message || 'Unable to capture PayPal order.' });
    }
});

app.post('/api/missions/:missionId/pve/start', requireSession, async (req, res) => {
    try {
        const missionId = slugifyMissionId(req.params?.missionId || '');
        const arena = normalizeArenaMode(req.body?.arena || req.query?.arena);
        const missions = await getStoredMissionCatalog();
        const mission = missions.find((entry) => entry?.missionId === missionId);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found.' });
        }
        const specialPve = mission.special_pve || {};
        if (!specialPve.enabled) {
            return res.status(400).json({ error: 'This mission does not have a PvE fight.' });
        }

        const username = req.authUser.username;
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Session expired.' });
        }
        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, arena);
        const userLevel = Number(arenaState?.ladder?.level) || 1;
        const levelRequirement = Math.max(0, Number(mission.level_requirement) || 0);
        const isAdmin = String(user.role || '').trim().toLowerCase() === 'admin';
        if (!isAdmin && levelRequirement > 0 && userLevel < levelRequirement) {
            return res.status(403).json({ error: `Requires level ${levelRequirement}.` });
        }

        const team = Array.isArray(req.body?.team)
            ? req.body.team.map((slot) => Number.parseInt(slot, 10))
            : [];
        await assertTeamCanBeUsed(profile, team, user.role, arena);

        const botRosterIndex = getRosterIndexByCharacterId(specialPve.botTeamCharacterId);
        if (!Number.isInteger(botRosterIndex) || botRosterIndex < 0) {
            return res.status(400).json({ error: 'Mission PvE bot character is not in the roster.' });
        }
        const botTeamSize = Math.max(1, Math.min(6, Number(specialPve.botTeamSize) || 3));
        const botTeam = Array.from({ length: botTeamSize }, () => botRosterIndex);
        const botName = specialPve.botName || 'Mission Bot';
        const botPlayer = createBattleBotPlayer({
            matchId: `${missionId}-${Date.now()}`,
            team: botTeam,
            ladderLevel: userLevel,
            arena,
        });
        botPlayer.displayName = botName;

        const matchDocument = await createMatchDocumentFromTeams({
            mode: 'pve',
            arena,
            players: [
                {
                    username,
                    team,
                    profile: buildBattleProfileSnapshot(profile, arena),
                },
                botPlayer,
            ],
            botMatch: {
                enabled: true,
                displayName: botName,
            },
            extraFields: {
                specialPveMissionId: mission.missionId,
                backgroundOverride: getRegularMatchBackgroundForArena(arena),
                pveBattle: {
                    missionId: mission.missionId,
                    rewardCharacterId: normalizeCharacterId(mission.reward_character),
                    botName,
                    botMaxQueuedSkillsPerTurn: Math.max(
                        1,
                        Math.min(3, Number(specialPve.botMaxQueuedSkillsPerTurn) || 1)
                    ),
                },
            },
        });
        userToMatch.set(username, {
            matchId: matchDocument.matchId,
            opponent: botName,
            arena,
        });
        scheduleBattleBotTurn(matchDocument);
        const hydrated = await hydrateMatchForStatus(matchDocument.matchId);
        return res.json(buildMatchPayloadForUser(hydrated || matchDocument, username));
    } catch (error) {
        console.error('Mission PvE start error:', error);
        return res.status(400).json({ error: error.message || 'Unable to start mission fight.' });
    }
});

app.get('/api/admin/missions', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const missions = await getStoredMissionCatalog();
        return res.json({
            ok: true,
            missions,
        });
    } catch (error) {
        console.error('Admin mission catalog load error:', error);
        return res.status(500).json({ error: 'Unable to load missions.' });
    }
});

app.put('/api/admin/missions', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const missions = Array.isArray(req.body?.missions) ? req.body.missions : null;
    if (!missions) {
        return res.status(400).json({ error: 'Missions are required.' });
    }

    try {
        const savedMissions = await saveMissionCatalog(missions, req.authUser.username);
        return res.json({
            ok: true,
            missions: savedMissions,
        });
    } catch (error) {
        console.error('Admin mission catalog save error:', error);
        return res.status(400).json({ error: error.message || 'Unable to save missions.' });
    }
});

app.get('/api/admin/bot-teams', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const teams = await getStoredBotTeams();
        return res.json({
            ok: true,
            teams,
        });
    } catch (error) {
        console.error('Admin bot teams load error:', error);
        return res.status(500).json({ error: 'Unable to load bot teams.' });
    }
});

app.put('/api/admin/bot-teams', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const teams = Array.isArray(req.body?.teams) ? req.body.teams : null;
    if (!teams) {
        return res.status(400).json({ error: 'Teams are required.' });
    }

    try {
        const savedTeams = await saveBotTeams(teams, req.authUser.username);
        return res.json({
            ok: true,
            teams: savedTeams,
        });
    } catch (error) {
        console.error('Admin bot teams save error:', error);
        return res.status(400).json({ error: error.message || 'Unable to save bot teams.' });
    }
});

app.get('/api/characters/catalog', (req, res) => {
    res.set('Cache-Control', 'no-store');
    refreshCharactersDataFromFile();
    return res.json({
        ok: true,
        characters: characterCatalog,
    });
});

app.get('/api/characters/play-rates', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
        const arena = normalizeArenaMode(req.query?.arena);
        const requestedMode = String(req.query?.mode || '').trim().toLowerCase();
        const mode = ['quick', 'ladder'].includes(requestedMode) ? requestedMode : '';
        const rosterIndexToCharacterId = new Map(
            (Array.isArray(charactersData) ? charactersData : []).map((character, rosterIndex) => [
                rosterIndex,
                typeof character?.characterId === 'string' ? character.characterId : '',
            ])
        );
        const pickCountsByCharacterId = new Map();
        let totalPicks = 0;

        const rows = await matchesCollection
            .aggregate([
                { $match: buildHumanMatchStatsFilter({ arena, mode }) },
                { $unwind: '$players' },
                { $unwind: '$players.team' },
                {
                    $group: {
                        _id: '$players.team',
                        pickCount: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        rows.forEach((row) => {
            const rosterIndex = Number.parseInt(row?._id, 10);
            if (!Number.isInteger(rosterIndex)) return;
            const characterId = rosterIndexToCharacterId.get(rosterIndex);
            if (!characterId) return;
            const pickCount = Math.max(0, Number(row?.pickCount) || 0);
            totalPicks += pickCount;
            pickCountsByCharacterId.set(
                characterId,
                (pickCountsByCharacterId.get(characterId) || 0) + pickCount
            );
        });

        return res.json({
            ok: true,
            arena,
            mode: mode || 'all-pvp',
            totalPicks,
            playRates: (Array.isArray(charactersData) ? charactersData : [])
                .filter((character) => normalizeArenaMode(character?.arena || character?.universe) === arena)
                .map((character) => {
                const characterId = typeof character?.characterId === 'string' ? character.characterId : '';
                const pickCount = pickCountsByCharacterId.get(characterId) || 0;
                return {
                    characterId,
                    pickCount,
                    playRatePercent: totalPicks > 0 ? (pickCount / totalPicks) * 100 : 0,
                };
                }),
        });
    } catch (error) {
        console.error('Character play rate load error:', error);
        return res.status(500).json({ error: 'Unable to load character play rates.' });
    }
});

app.get('/api/admin/characters', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    return res.json({
        ok: true,
        characters: characterCatalog,
    });
});

app.get('/api/admin/characters/export', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const serialized = serializeCharactersDataFile(Array.isArray(charactersData) ? charactersData : []);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="characters.js"');
    return res.send(serialized);
});

app.post('/api/admin/git/sync', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const serialized = serializeCharactersDataFile(Array.isArray(charactersData) ? charactersData : []);
        await fs.promises.writeFile(CHARACTERS_FILE_PATH, serialized, 'utf8');
        const syncResult = await syncCharactersDataToGitHub({
            updatedBy: req.authUser.username,
        });

        return res.json({
            ok: true,
            ...syncResult,
        });
    } catch (error) {
        console.error('Git sync error:', error);
        return res.status(500).json({
            error: 'Failed to sync with GitHub. ' + (error.stderr || error.message),
        });
    }
});

app.get('/api/admin/characters/:characterId', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const characterId = typeof req.params?.characterId === 'string' ? req.params.characterId.trim() : '';
    const currentCharacters = refreshCharactersDataFromFile();
    const character = currentCharacters.find(
        (entry) => typeof entry?.characterId === 'string' && entry.characterId === characterId
    );
    if (!character) {
        return res.status(404).json({ error: 'Character not found.' });
    }

    return res.json({
        ok: true,
        character,
    });
});

app.put('/api/admin/characters/:characterId', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const characterId = typeof req.params?.characterId === 'string' ? req.params.characterId.trim() : '';
    const nextCharacter = req.body && typeof req.body === 'object' ? req.body : null;
    if (!characterId || !nextCharacter || typeof nextCharacter.characterId !== 'string' || !nextCharacter.characterId.trim()) {
        return res.status(400).json({ error: 'A valid character payload is required.' });
    }

    const currentCharacters = refreshCharactersDataFromFile();
    const characterIndex = currentCharacters.findIndex(
        (entry) => typeof entry?.characterId === 'string' && entry.characterId === characterId
    );

    const duplicateCharacterIndex = currentCharacters.findIndex(
        (entry, index) =>
            index !== characterIndex &&
            typeof entry?.characterId === 'string' &&
            entry.characterId === nextCharacter.characterId.trim()
    );
    if (duplicateCharacterIndex !== -1) {
        return res.status(409).json({ error: 'Character id is already in use.' });
    }

    try {
        const updatedCharacters = currentCharacters.slice();
        const saveIndex = characterIndex === -1 ? updatedCharacters.length : characterIndex;
        updatedCharacters[saveIndex] = {
            ...nextCharacter,
            characterId: nextCharacter.characterId.trim(),
        };
        await saveCharactersDataFile(updatedCharacters, {
            characterOverride: updatedCharacters[saveIndex],
            previousCharacterId: characterId,
            updatedBy: req.authUser.username,
        });
        let syncResult;
        try {
            syncResult = await syncCharactersDataToGitHub({
                updatedBy: req.authUser.username,
            });
        } catch (gitError) {
            console.error('Admin character Git sync warning:', gitError);
            syncResult = {
                committed: false,
                pushed: false,
                warning: true,
                message: 'Character saved locally, but Git sync did not complete.',
                error: String(gitError?.stderr || gitError?.message || gitError || '').trim(),
            };
        }
        return res.json({
            ok: true,
            character: updatedCharacters[saveIndex],
            git: syncResult,
        });
    } catch (error) {
        console.error('Admin character update error:', error);
        return res.status(500).json({
            error: 'Unable to update character. ' + (error.stderr || error.message || ''),
        });
    }
});

app.get('/api/admin/news', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const posts = await newsPostsCollection
            .find({}, { sort: { createdAt: -1 } })
            .toArray();
        return res.json({
            ok: true,
            posts: posts.map(serializeNewsPost),
        });
    } catch (error) {
        console.error('Admin news load error:', error);
        return res.status(500).json({ error: 'Unable to load news posts.' });
    }
});

app.post('/api/admin/news', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const blocks = normalizeNewsBlocks(req.body?.blocks);
    const paragraphs = normalizeNewsParagraphs(req.body?.paragraphs);
    const changes = normalizeNewsChanges(req.body?.changes);
    const arena = normalizeArenaMode(req.body?.arena);
    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const now = new Date();
        const post = {
            title,
            arena,
            blocks,
            paragraphs,
            changes,
            author: req.authUser.username,
            createdAt: now,
            updatedAt: now,
        };
        const result = await newsPostsCollection.insertOne(post);
        return res.status(201).json({
            ok: true,
            post: serializeNewsPost({ ...post, _id: result.insertedId }),
        });
    } catch (error) {
        console.error('Admin news create error:', error);
        return res.status(500).json({ error: 'Unable to create news post.' });
    }
});

app.put('/api/admin/news/:id', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid news post id.' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const blocks = normalizeNewsBlocks(req.body?.blocks);
    const paragraphs = normalizeNewsParagraphs(req.body?.paragraphs);
    const changes = normalizeNewsChanges(req.body?.changes);
    const arena = normalizeArenaMode(req.body?.arena || 'comic');
    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const existing = await newsPostsCollection.findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({ error: 'News post not found.' });
        }
        const nextPost = {
            title,
            arena,
            blocks,
            paragraphs,
            changes,
            author: existing.author || req.authUser.username,
            createdAt: existing.createdAt || new Date(),
            updatedAt: new Date(),
        };
        await newsPostsCollection.updateOne(
            { _id: existing._id },
            {
                $set: nextPost,
            }
        );
        return res.json({
            ok: true,
            post: serializeNewsPost({ ...existing, ...nextPost }),
        });
    } catch (error) {
        console.error('Admin news update error:', error);
        return res.status(500).json({ error: 'Unable to update news post.' });
    }
});

app.delete('/api/admin/news/:id', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid news post id.' });
    }

    try {
        const result = await newsPostsCollection.deleteOne({ _id: new ObjectId(id) });
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'News post not found.' });
        }
        return res.json({ ok: true });
    } catch (error) {
        console.error('Admin news delete error:', error);
        return res.status(500).json({ error: 'Unable to delete news post.' });
    }
});

app.get('/api/admin/users', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        username: 1,
                        role: 1,
                        profile: 1,
                    },
                    sort: { username: 1 },
                }
            )
            .toArray();

        return res.json({
            ok: true,
            users: users.map((user = {}) => {
                const profile = normalizeUserProfile(user);
                const wins = Number(profile?.ladder?.wins) || 0;
                const losses = Number(profile?.ladder?.losses) || 0;
                const total = wins + losses;
                return {
                    username: typeof user.username === 'string' ? user.username : '',
                    role: typeof user.role === 'string' ? user.role : 'player',
                    ladderRatio: total > 0 ? ((wins / total) * 100).toFixed(2) + '%' : '0.00%',
                };
            }),
        });
    } catch (error) {
        console.error('Admin users list error:', error);
        return res.status(500).json({ error: 'Unable to load player accounts.' });
    }
});

app.get('/api/admin/users/:username', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const username = typeof req.params?.username === 'string' ? req.params.username.trim() : '';
    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    try {
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const profile = normalizeUserProfile(user);
        const wins = Number(profile?.ladder?.wins) || 0;
        const losses = Number(profile?.ladder?.losses) || 0;
        const total = wins + losses;

        return res.json({
            ok: true,
            username: user.username,
            role: user.role || 'player',
            ladderRatio: total > 0 ? ((wins / total) * 100).toFixed(2) + '%' : '0.00%',
            document: serializeAdminUserDocument(user),
        });
    } catch (error) {
        console.error('Admin user detail error:', error);
        return res.status(500).json({ error: 'Unable to load player account.' });
    }
});

app.put('/api/admin/users/:username', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const originalUsername = typeof req.params?.username === 'string' ? req.params.username.trim() : '';
    const document = req.body && typeof req.body === 'object' ? req.body : null;
    if (!originalUsername || !document) {
        return res.status(400).json({ error: 'A username and document payload are required.' });
    }

    const nextUsername = typeof document.username === 'string' ? document.username.trim() : '';
    if (!nextUsername) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    try {
        const existingUser = await usersCollection.findOne({ username: originalUsername });
        if (!existingUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        if (nextUsername !== originalUsername) {
            const conflictingUser = await usersCollection.findOne({ username: nextUsername });
            if (conflictingUser) {
                return res.status(409).json({ error: 'Username is already taken.' });
            }
        }

        const nextEmail = typeof document.email === 'string' ? document.email.trim().toLowerCase() : '';
        if (nextEmail) {
            const conflictingEmailUser = await usersCollection.findOne({
                email: nextEmail,
                username: { $ne: originalUsername },
            });
            if (conflictingEmailUser) {
                return res.status(409).json({ error: 'Email is already in use.' });
            }
        }

        const nextSavedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena({
            ...existingUser,
            savedTeamIndices: Array.isArray(document.savedTeamIndices) ? document.savedTeamIndices : [],
            savedTeamIndicesByArena:
                document.savedTeamIndicesByArena &&
                typeof document.savedTeamIndicesByArena === 'object'
                    ? document.savedTeamIndicesByArena
                    : existingUser.savedTeamIndicesByArena,
        });
        const nextUser = {
            username: nextUsername,
            usernameLower: nextUsername.toLowerCase(),
            email: nextEmail,
            passwordHash:
                typeof document.passwordHash === 'string' && document.passwordHash.trim()
                    ? document.passwordHash.trim()
                    : existingUser.passwordHash,
            role:
                typeof document.role === 'string' && document.role.trim()
                    ? document.role.trim().toLowerCase()
                    : existingUser.role || 'player',
            createdAt: document.createdAt || existingUser.createdAt,
            savedTeamIndices: nextSavedTeamIndicesByArena.comic,
            savedTeamIndicesByArena: nextSavedTeamIndicesByArena,
            profile: normalizeUserProfile({
                ...existingUser,
                profile: document.profile || existingUser.profile,
                createdAt: document.createdAt || existingUser.createdAt,
            }),
        };

        await usersCollection.updateOne(
            { _id: existingUser._id },
            {
                $set: nextUser,
            }
        );

        const updatedUser = await usersCollection.findOne({ _id: existingUser._id });
        return res.json({
            ok: true,
            user: serializeAdminUserDocument(updatedUser || { ...existingUser, ...nextUser }),
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Username or email is already in use.' });
        }
        console.error('Admin user update error:', error);
        return res.status(500).json({ error: 'Unable to update player account.' });
    }
});

app.get('/api/users/:username/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { error: validationError, value } = publicProfileLookupSchema.validate({
        username: req.params.username,
    });
    if (validationError) {
        return res.status(400).json({ error: 'Invalid username.' });
    }
    const requestedUsername = value.username.trim();
    const normalizedRequestedUsername = requestedUsername.toLowerCase();
    let user = await usersCollection.findOne({ usernameLower: normalizedRequestedUsername });
    if (!user) {
        user = await usersCollection.findOne({ username: requestedUsername });
    }
    if (!user) {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        username: 1,
                    },
                }
            )
            .toArray();
        const matchedUser = users.find((candidate) => {
            const candidateUsername =
                typeof candidate?.username === 'string' ? candidate.username.trim().toLowerCase() : '';
            return candidateUsername === normalizedRequestedUsername;
        });
        if (matchedUser?._id) {
            user = await usersCollection.findOne({ _id: matchedUser._id });
            if (user) {
                await usersCollection.updateOne(
                    { _id: matchedUser._id },
                    {
                        $set: {
                            usernameLower: normalizedRequestedUsername,
                        },
                    }
                );
            }
        }
    }
    if (!user) {
        return res.status(404).json({ error: 'Player not found.' });
    }

    return res.json({
        ok: true,
        user: serializePublicUserProfile(user),
    });
});

app.get('/api/clans/:clanName/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const requestedClanName = typeof req.params?.clanName === 'string' ? req.params.clanName.trim() : '';
    if (!requestedClanName || requestedClanName.length > 35) {
        return res.status(400).json({ error: 'Invalid clan name.' });
    }

    try {
        const clan = await buildPublicClanProfile(requestedClanName);
        if (!clan) {
            return res.status(404).json({ error: 'Clan not found.' });
        }
        return res.json({
            ok: true,
            clan,
        });
    } catch (error) {
        console.error('Public clan profile error:', error);
        return res.status(500).json({ error: 'Unable to load clan.' });
    }
});

app.get('/api/leaderboards/sidebar', async (req, res) => {
    try {
        const arena = normalizeArenaMode(req.query?.arena);
        const leaderboards = await buildSidebarLeaderboards(arena);
        return res.json({
            ok: true,
            arena,
            leaderboards,
        });
    } catch (error) {
        console.error('Sidebar leaderboard error:', error);
        return res.status(500).json({ error: 'Unable to load leaderboards.' });
    }
});

app.get('/api/community/users', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        username: 1,
                        role: 1,
                        createdAt: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const communityUsers = users
            .filter((user) => !isGameBotUsername(user?.username))
            .map(serializeCommunityUserSummary)
            .sort((left, right) => {
                const rankDelta =
                    (Number(left?.ladder?.ladderRank) || Number.MAX_SAFE_INTEGER) -
                    (Number(right?.ladder?.ladderRank) || Number.MAX_SAFE_INTEGER);
                if (rankDelta !== 0) {
                    return rankDelta;
                }
                const levelDelta = (Number(right?.ladder?.level) || 0) - (Number(left?.ladder?.level) || 0);
                if (levelDelta !== 0) {
                    return levelDelta;
                }
                const winsDelta = (Number(right?.ladder?.wins) || 0) - (Number(left?.ladder?.wins) || 0);
                if (winsDelta !== 0) {
                    return winsDelta;
                }
                return String(left?.username || '').localeCompare(String(right?.username || ''));
            });

        return res.json({
            ok: true,
            users: communityUsers,
            stats: {
                totalRegisteredPlayers: communityUsers.length,
                rankedPlayers: communityUsers.filter((user) => Number(user?.ladder?.totalGames) > 0).length,
                clanPlayers: communityUsers.filter((user) => user?.clan?.name).length,
            },
        });
    } catch (error) {
        console.error('Community users load error:', error);
        return res.status(500).json({ error: 'Unable to load community players.' });
    }
});

app.post('/api/profile/avatar', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = avatarUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid image URL or uploaded image is required.' });
        }

        await validateAvatarUrl(value.avatarUrl);
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        if (value.arena === 'pokemon') {
            profile.arenas = {
                ...(profile.arenas || {}),
                pokemon: {
                    ...(profile.arenas?.pokemon || normalizeArenaProgressState({}, user)),
                    avatarUrl: value.avatarUrl,
                },
            };
        } else {
            profile.avatarUrl = value.avatarUrl;
        }
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        const updatedUser = {
            ...user,
            profile,
        };
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update avatar.' });
    }
});

app.post('/api/profile/matchmaking', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = matchmakingSettingsSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid matchmaking preference is required.' });
        }
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.matchmaking = {
            ...profile.matchmaking,
            battleBotEnabled: Boolean(value.battleBotEnabled),
        };
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        return res.json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to update matchmaking settings.' });
    }
});

app.post('/api/clan/avatar', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = avatarUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid image URL or uploaded image is required.' });
        }

        await validateAvatarUrl(value.avatarUrl);
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'manageAvatar')) {
            return res.status(403).json({ error: 'Your clan rank cannot manage the clan avatar.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                entryProfile.clan = {
                    ...entryProfile.clan,
                    avatarUrl: value.avatarUrl,
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update clan avatar.' });
    }
});

app.post('/api/profile/reset-account', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.recentQuickGames = [];
        profile.recentPrivateGames = [];
        profile.recentLadderGames = [];
        profile.ladder.level = 1;
        profile.ladder.rank = 'Academy Student';
        profile.ladder.rankHatUrl = 'assets/images/hats/academy.png';
        profile.ladder.experiencePoints = 0;
        profile.ladder.experienceIntoLevel = 0;
        profile.ladder.experienceForNextLevel = getExperienceRequiredForNextLevel(1);
        profile.ladder.experienceToNextLevel = getExperienceRequiredForNextLevel(1);
        profile.ladder.ladderRank = null;
        profile.ladder.wins = 0;
        profile.ladder.losses = 0;
        profile.ladder.streak = 0;
        profile.ladder.highestStreak = 0;
        profile.ladder.highestLevel = 1;
        profile.ladder.famePoints = 0;
        profile.ladder.isHokage = false;

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        await recalculatePlayerLadderStandings();
        const updatedUser = await usersCollection.findOne({ _id: user._id });

        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser || { ...user, profile }),
        });
    } catch (error) {
        console.error('Reset account error:', error);
        return res.status(500).json({ error: 'Unable to reset account.' });
    }
});

app.post('/api/profile/backgrounds', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = backgroundUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Direct background URLs are required.' });
        }

        await validateBackgroundUrl(value.selectionUrl);
        await validateBackgroundUrl(value.ingameUrl);

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.backgrounds = {
            selectionUrl: value.selectionUrl,
            ingameUrl: value.ingameUrl,
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        return res.json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update backgrounds.' });
    }
});

app.post('/api/profile/pokemon/starter', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = pokemonStarterSelectionSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A starter character is required.' });
        }

        const starterCharacterId = normalizeCharacterId(value.starterCharacterId);
        if (!getPokemonStarterCharacterIds().has(starterCharacterId)) {
            return res.status(400).json({ error: 'Invalid starter character.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, 'pokemon');
        const missionState = normalizeMissionState(arenaState.missions);
        const existingStarterId = normalizeCharacterId(missionState.starterCharacterId);
        const existingSelectionVersion = Number(missionState.starterSelectionVersion) || 0;
        if (
            existingStarterId &&
            existingStarterId !== starterCharacterId &&
            existingSelectionVersion >= POKEMON_STARTER_SELECTION_VERSION
        ) {
            return res.status(409).json({ error: 'You have already chosen a starter.' });
        }

        missionState.starterCharacterId = starterCharacterId;
        missionState.starterSelectionVersion = POKEMON_STARTER_SELECTION_VERSION;
        const unlockedIds = new Set(
            Array.isArray(missionState.unlockedCharacterIds) ? missionState.unlockedCharacterIds : []
        );
        unlockedIds.add(starterCharacterId);
        missionState.unlockedCharacterIds = Array.from(unlockedIds);

        const missionCatalog = await getStoredMissionCatalog();
        missionCatalog
            .filter((mission) => normalizeCharacterId(mission?.reward_character) === starterCharacterId)
            .forEach((mission) => {
                if (!mission?.missionId) {
                    return;
                }
                const existingProgress = normalizeMissionProgressEntry(
                    missionState.progressByMissionId?.[mission.missionId] || {}
                );
                missionState.progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                    ...existingProgress,
                    completedAt: existingProgress.completedAt || new Date(),
                    unlockedAt: existingProgress.unlockedAt || new Date(),
                });
            });

        const updatedArenaState = setProfileArenaState(profile, 'pokemon', {
            ...arenaState,
            missions: missionState,
        });
        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: updatedArenaState,
        });

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                },
            }
        );

        return res.json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile: normalizedProfile,
            }),
        });
    } catch (error) {
        console.error('Pokemon starter selection error:', error);
        return res.status(500).json({ error: 'Unable to save starter selection.' });
    }
});

app.post('/api/profile/pokemon/gen2-starter', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = pokemonGen2StarterSelectionSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A confirmed Gen 2 starter choice is required.' });
        }

        const starterCharacterId = normalizeCharacterId(value.starterCharacterId);
        if (!getPokemonGen2StarterCharacterIds().has(starterCharacterId)) {
            return res.status(400).json({ error: 'Invalid Gen 2 starter character.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, 'pokemon');
        const missionState = normalizeMissionState(arenaState.missions);
        const existingStarterId = normalizeCharacterId(missionState.gen2StarterCharacterId);
        if (existingStarterId) {
            return res.status(409).json({
                error: 'You have already chosen a Gen 2 starter.',
                starterCharacterId: existingStarterId,
            });
        }

        missionState.gen2StarterCharacterId = starterCharacterId;
        missionState.gen2StarterSelectionVersion = POKEMON_GEN2_STARTER_SELECTION_VERSION;
        const unlockedIds = new Set(
            Array.isArray(missionState.unlockedCharacterIds) ? missionState.unlockedCharacterIds : []
        );
        unlockedIds.add(starterCharacterId);
        missionState.unlockedCharacterIds = Array.from(unlockedIds);

        const now = new Date();
        const existingProgress = normalizeMissionProgressEntry(
            missionState.progressByMissionId?.[POKEMON_GEN2_STARTER_MISSION_ENTRY.missionId] || {}
        );
        missionState.progressByMissionId[POKEMON_GEN2_STARTER_MISSION_ENTRY.missionId] =
            normalizeMissionProgressEntry({
                ...existingProgress,
                completedAt: existingProgress.completedAt || now,
                unlockedAt: existingProgress.unlockedAt || now,
            });

        const updatedArenaState = setProfileArenaState(profile, 'pokemon', {
            ...arenaState,
            missions: normalizeMissionState(missionState),
        });
        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: updatedArenaState,
        });

        const updateResult = await usersCollection.updateOne(
            {
                _id: user._id,
                $or: [
                    { 'profile.arenas.pokemon.missions.gen2StarterCharacterId': { $exists: false } },
                    { 'profile.arenas.pokemon.missions.gen2StarterCharacterId': null },
                    { 'profile.arenas.pokemon.missions.gen2StarterCharacterId': '' },
                ],
            },
            { $set: { profile: normalizedProfile } }
        );
        if (updateResult.matchedCount !== 1) {
            return res.status(409).json({ error: 'You have already chosen a Gen 2 starter.' });
        }

        return res.json({
            ok: true,
            starterCharacterId,
            user: serializeUserForClient({
                ...user,
                profile: normalizedProfile,
            }),
        });
    } catch (error) {
        console.error('Pokemon Gen 2 starter selection error:', error);
        return res.status(500).json({ error: 'Unable to save Gen 2 starter selection.' });
    }
});

app.post('/api/profile/pokemon/eevee-evolution', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } =
            pokemonEeveeEvolutionSelectionSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A confirmed Eevee evolution choice is required.' });
        }

        const evolutionCharacterId = normalizeCharacterId(value.evolutionCharacterId);
        if (!getPokemonEeveeEvolutionCharacterIds().has(evolutionCharacterId)) {
            return res.status(400).json({ error: 'Invalid Eevee evolution.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const arenaState = getProfileArenaState(profile, 'pokemon');
        const missionState = normalizeMissionState(arenaState.missions);
        if (missionState.eeveeEvolutionCharacterId) {
            return res.status(409).json({ error: 'You have already chosen an Eevee evolution.' });
        }

        const eeveeMissionProgress = normalizeMissionProgressEntry(
            missionState.progressByMissionId?.['eevee-evolution-path'] || {}
        );
        if (!eeveeMissionProgress.completedAt) {
            return res.status(403).json({ error: 'Complete Eevee Evolution Path first.' });
        }

        const unlockedIds = new Set(
            Array.isArray(missionState.unlockedCharacterIds) ? missionState.unlockedCharacterIds : []
        );
        unlockedIds.delete('eevee');
        getPokemonEeveeEvolutionCharacterIds().forEach((characterId) => {
            unlockedIds.delete(characterId);
        });
        unlockedIds.add(evolutionCharacterId);

        missionState.eeveeEvolutionCharacterId = evolutionCharacterId;
        missionState.unlockedCharacterIds = Array.from(unlockedIds);
        missionState.progressByMissionId['eevee-evolution-path'] = normalizeMissionProgressEntry({
            ...eeveeMissionProgress,
            completedAt: eeveeMissionProgress.completedAt || new Date(),
            unlockedAt: eeveeMissionProgress.unlockedAt || eeveeMissionProgress.completedAt || new Date(),
        });
        missionState.progress = missionState.progressByMissionId;

        const updatedArenaState = setProfileArenaState(profile, 'pokemon', {
            ...arenaState,
            missions: missionState,
        });
        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile: updatedArenaState,
        });

        const eeveeRosterIndex = getRosterIndexByCharacterId('eevee');
        const savedTeamIndicesByArena = {
            ...(user.savedTeamIndicesByArena && typeof user.savedTeamIndicesByArena === 'object'
                ? user.savedTeamIndicesByArena
                : {}),
        };
        if (
            Number.isInteger(eeveeRosterIndex) &&
            Array.isArray(savedTeamIndicesByArena.pokemon) &&
            savedTeamIndicesByArena.pokemon.some((slot) => Number(slot) === eeveeRosterIndex)
        ) {
            savedTeamIndicesByArena.pokemon = [];
        }
        const nextSavedTeamIndicesByArena = buildSanitizedSavedTeamIndicesByArena({
            ...user,
            savedTeamIndicesByArena,
        });

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                    savedTeamIndices: nextSavedTeamIndicesByArena.comic,
                    savedTeamIndicesByArena: nextSavedTeamIndicesByArena,
                },
            }
        );

        return res.json({
            ok: true,
            evolutionCharacterId,
            user: serializeUserForClient({
                ...user,
                profile: normalizedProfile,
                savedTeamIndices: nextSavedTeamIndicesByArena.comic,
                savedTeamIndicesByArena: nextSavedTeamIndicesByArena,
            }),
        });
    } catch (error) {
        console.error('Pokemon Eevee evolution selection error:', error);
        return res.status(500).json({ error: 'Unable to save Eevee evolution choice.' });
    }
});

app.post('/api/clan/create', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanCreateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid clan details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        if (profile.clan && profile.clan.name) {
            return res.status(409).json({ error: 'You are already in a clan.' });
        }

        const requestedName = value.name.trim();
        const requestedAbbreviation = value.abbreviation.trim();
        const requestedNameLower = requestedName.toLowerCase();
        const requestedAbbreviationLower = requestedAbbreviation.toLowerCase();

        const existingClanHolder = await usersCollection.findOne(
            {},
            {
                projection: {
                    _id: 1,
                    profile: 1,
                },
            }
        );

        if (existingClanHolder) {
            const users = await usersCollection
                .find(
                    {},
                    {
                        projection: {
                            _id: 1,
                            profile: 1,
                        },
                    }
                )
                .toArray();
            const duplicateClan = users.some((entry) => {
                const clan = normalizeUserProfile(entry).clan;
                if (!clan || !clan.name) {
                    return false;
                }
                const clanName = String(clan.name || '').trim().toLowerCase();
                const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
                return clanName === requestedNameLower || clanAbbreviation === requestedAbbreviationLower;
            });
            if (duplicateClan) {
                return res.status(409).json({ error: 'Clan name or abbreviation is already in use.' });
            }
        }

        const now = new Date();
        profile.clan = {
            name: requestedName,
            abbreviation: requestedAbbreviation,
            rankKey: 'clanLeader',
            customRankName: '',
            rank: DEFAULT_CLAN_RANK_NAMES.clanLeader,
            avatarUrl: '',
            joinedAt: now,
            bio: value.bio || '',
            createdBy: user.username,
            createdAt: now,
            customRankNames: normalizeClanRankNames(),
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        return res.status(201).json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        console.error('Clan creation error:', error);
        return res.status(500).json({ error: 'Unable to create clan.' });
    }
});

app.post('/api/clan/leave', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;

        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const isClanLeader = String(clan.rankKey || '').trim() === 'clanLeader';
        const allUsers = await usersCollection.find({}).toArray();
        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }

            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            if (!entryClanName) {
                return false;
            }

            if (clanAbbreviation && entryClanAbbreviation) {
                return entryClanName === clanName && entryClanAbbreviation === clanAbbreviation;
            }

            return entryClanName === clanName;
        });

        const otherClanLeaders = clanMembers.filter((entry = {}) => {
            if (String(entry.username || '') === String(user.username || '')) {
                return false;
            }
            const entryClan = normalizeUserProfile(entry).clan;
            return String(entryClan && entryClan.rankKey ? entryClan.rankKey : '').trim() === 'clanLeader';
        });

        const shouldDisbandClan = isClanLeader && otherClanLeaders.length === 0;

        if (shouldDisbandClan) {
            await Promise.all(clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                entryProfile.clan = null;
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile
                        }
                    }
                );
            }));
        } else {
            profile.clan = null;
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile
                    }
                }
            );
        }

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            disbanded: shouldDisbandClan,
            user: serializeUserForClient(updatedUser)
        });
    } catch (error) {
        console.error('Failed to leave clan', error);
        return res.status(500).json({ error: 'Unable to leave clan right now.' });
    }
});

app.post('/api/clan/update', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid clan details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'manageInfo')) {
            return res.status(403).json({ error: 'Your clan rank cannot manage clan info.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const requestedName = value.name.trim();
        const requestedAbbreviation = value.abbreviation.trim();
        const requestedNameLower = requestedName.toLowerCase();
        const requestedAbbreviationLower = requestedAbbreviation.toLowerCase();

        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const duplicateClan = allUsers.some((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            const sameCurrentClan = currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
            if (sameCurrentClan) {
                return false;
            }
            return entryClanName === requestedNameLower || entryClanAbbreviation === requestedAbbreviationLower;
        });

        if (duplicateClan) {
            return res.status(409).json({ error: 'Clan name or abbreviation is already in use.' });
        }

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                entryProfile.clan = {
                    ...entryProfile.clan,
                    name: requestedName,
                    abbreviation: requestedAbbreviation,
                    bio: value.bio || '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan update error:', error);
        return res.status(500).json({ error: 'Unable to update clan.' });
    }
});

app.post('/api/clan/ranks', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanRankNamesSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid custom rank details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'assignRanks')) {
            return res.status(403).json({ error: 'Your clan rank cannot assign ranks.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const normalizedName = value.name.trim();
        const previousName = value.previousName.trim();
        const rankKey = value.rankKey;
        const existingRankNames = normalizeClanRankNames(clan.customRankNames);
        const updatedRankNames = {
            ...existingRankNames,
            [rankKey]: [...existingRankNames[rankKey]],
        };

        if (previousName) {
            const targetIndex = updatedRankNames[rankKey].findIndex((entry) => entry === previousName);
            if (targetIndex === -1) {
                return res.status(404).json({ error: 'Custom rank not found.' });
            }
            const duplicateElsewhere = updatedRankNames[rankKey].some(
                (entry, index) => index !== targetIndex && entry.toLowerCase() === normalizedName.toLowerCase()
            );
            if (duplicateElsewhere) {
                return res.status(409).json({ error: 'That custom rank already exists for this tier.' });
            }
            updatedRankNames[rankKey][targetIndex] = normalizedName;
        } else {
            const duplicateRank = updatedRankNames[rankKey].some(
                (entry) => entry.toLowerCase() === normalizedName.toLowerCase()
            );
            if (duplicateRank) {
                return res.status(409).json({ error: 'That custom rank already exists for this tier.' });
            }
            updatedRankNames[rankKey].push(normalizedName);
        }

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                const entryRankKey = normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                const nextCustomRankName =
                    entryProfile.clan.customRankName === previousName ? normalizedName : entryProfile.clan.customRankName;
                entryProfile.clan = {
                    ...entryProfile.clan,
                    customRankNames: updatedRankNames,
                    rankKey: entryRankKey,
                    rank:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? resolveClanRankLabel(entryRankKey, nextCustomRankName)
                        : resolveBaseClanRankLabel(entryRankKey),
                    customRankName:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? nextCustomRankName
                            : '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan rank update error:', error);
        return res.status(500).json({ error: 'Unable to update clan ranks.' });
    }
});

app.post('/api/clan/ranks/delete', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanRankDeleteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid custom rank details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const rankKey = value.rankKey;
        const targetName = value.name.trim();
        const existingRankNames = normalizeClanRankNames(clan.customRankNames);
        const targetIndex = existingRankNames[rankKey].findIndex((entry) => entry === targetName);
        if (targetIndex === -1) {
            return res.status(404).json({ error: 'Custom rank not found.' });
        }

        const updatedRankNames = {
            ...existingRankNames,
            [rankKey]: existingRankNames[rankKey].filter((entry) => entry !== targetName),
        };

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                const entryRankKey = normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                const nextCustomRankName =
                    entryProfile.clan.customRankName === targetName ? '' : entryProfile.clan.customRankName;
                entryProfile.clan = {
                    ...entryProfile.clan,
                    customRankNames: updatedRankNames,
                    rankKey: entryRankKey,
                    rank:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? resolveClanRankLabel(entryRankKey, nextCustomRankName)
                            : resolveBaseClanRankLabel(entryRankKey),
                    customRankName:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? nextCustomRankName
                            : '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan rank delete error:', error);
        return res.status(500).json({ error: 'Unable to delete custom rank.' });
    }
});

app.get('/api/clan/members', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const members = allUsers
            .map((entry = {}) => ({
                username: entry.username,
                profile: normalizeUserProfile(entry),
            }))
            .filter((entry) => {
                const entryClan = entry.profile.clan;
                if (!entryClan || !entryClan.name) {
                    return false;
                }
                const entryClanName = String(entryClan.name || '').trim().toLowerCase();
                const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
                return clanAbbreviation && entryClanAbbreviation
                    ? entryClanName === clanName && entryClanAbbreviation === clanAbbreviation
                    : entryClanName === clanName;
            })
            .map((entry) => ({
                username: entry.username,
                rankKey: entry.profile.clan.rankKey || 'member',
                customRankName: entry.profile.clan.customRankName || '',
                rank: entry.profile.clan.rank || DEFAULT_CLAN_RANK_NAMES.member,
            }))
            .sort((left, right) => left.username.localeCompare(right.username));

        return res.json({ ok: true, members });
    } catch (error) {
        console.error('Clan member list error:', error);
        return res.status(500).json({ error: 'Unable to load clan members.' });
    }
});

app.post('/api/clan/member-rank', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanMemberRankSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid member and rank are required.' });
        }

        const actingUser = await usersCollection.findOne({ username: req.authUser.username });
        if (!actingUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const actingProfile = normalizeUserProfile(actingUser);
        const clan = actingProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'assignRanks')) {
            return res.status(403).json({ error: 'Your clan rank cannot assign ranks.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const targetUser = await usersCollection.findOne({ usernameLower: value.username.trim().toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        const targetClan = targetProfile.clan;
        if (!targetClan || !targetClan.name) {
            return res.status(400).json({ error: 'That player is not in a clan.' });
        }

        const targetClanName = String(targetClan.name || '').trim().toLowerCase();
        const targetClanAbbreviation = String(targetClan.abbreviation || '').trim().toLowerCase();
        const sameClan = clanAbbreviation && targetClanAbbreviation
            ? targetClanName === clanName && targetClanAbbreviation === clanAbbreviation
            : targetClanName === clanName;
        if (!sameClan) {
            return res.status(400).json({ error: 'That player is not in your clan.' });
        }

        const requestedCustomRankName = value.customRankName.trim();
        const allowedCustomRanks = normalizeClanRankNames(clan.customRankNames)[value.rankKey];
        if (requestedCustomRankName && !allowedCustomRanks.includes(requestedCustomRankName)) {
            return res.status(400).json({ error: 'That custom rank does not exist for the selected tier.' });
        }

        if (value.rankKey === 'clanLeader') {
            const allUsers = await usersCollection
                .find(
                    {},
                    {
                        projection: {
                            _id: 1,
                            username: 1,
                            profile: 1,
                        },
                    }
                )
                .toArray();

            const clanMembers = allUsers.filter((entry = {}) => {
                const entryClan = normalizeUserProfile(entry).clan;
                if (!entryClan || !entryClan.name) {
                    return false;
                }
                const entryClanName = String(entryClan.name || '').trim().toLowerCase();
                const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
                return clanAbbreviation && entryClanAbbreviation
                    ? entryClanName === clanName && entryClanAbbreviation === clanAbbreviation
                    : entryClanName === clanName;
            });

            await Promise.all(
                clanMembers.map(async (entry = {}) => {
                    const entryProfile = normalizeUserProfile(entry);
                    if (!entryProfile.clan) {
                        return;
                    }
                    const isTarget =
                        String(entry.username || '').trim().toLowerCase() === targetUser.username.trim().toLowerCase();
                    const nextRankKey = isTarget
                        ? 'clanLeader'
                        : normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan) === 'clanLeader'
                            ? 'leader'
                            : normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                    const nextCustomRankName = isTarget ? requestedCustomRankName : '';
                    entryProfile.clan = {
                        ...entryProfile.clan,
                        rankKey: nextRankKey,
                        customRankName: nextCustomRankName,
                        rank: nextCustomRankName
                            ? resolveClanRankLabel(nextRankKey, nextCustomRankName)
                            : resolveBaseClanRankLabel(nextRankKey),
                    };
                    await usersCollection.updateOne(
                        { _id: entry._id },
                        {
                            $set: {
                                profile: entryProfile,
                            },
                        }
                    );
                })
            );
        } else {
            targetProfile.clan = {
                ...targetProfile.clan,
                rankKey: value.rankKey,
                customRankName: requestedCustomRankName,
                rank:
                    requestedCustomRankName
                        ? resolveClanRankLabel(value.rankKey, requestedCustomRankName)
                        : resolveBaseClanRankLabel(value.rankKey),
            };
            await usersCollection.updateOne(
                { _id: targetUser._id },
                {
                    $set: {
                        profile: targetProfile,
                    },
                }
            );
        }

        const updatedUser = await usersCollection.findOne({ username: req.authUser.username });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan member rank update error:', error);
        return res.status(500).json({ error: 'Unable to update member rank.' });
    }
});

app.get('/api/clan/recruitment', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const outgoingInvitations = [];
        users.forEach((entry = {}) => {
            const entryProfile = normalizeUserProfile(entry);
            entryProfile.clanInvitations.forEach((invite) => {
                const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
                const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
                const sameClan = clanAbbreviation && inviteClanAbbreviation
                    ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                    : inviteClanName === clanName;
                if (!sameClan) {
                    return;
                }
                outgoingInvitations.push({
                    username: entry.username,
                    invitedAt: invite.invitedAt || null,
                });
            });
        });

        return res.json({
            ok: true,
            invitations: outgoingInvitations.sort((left, right) => {
                const leftTime = new Date(left.invitedAt || 0).getTime() || 0;
                const rightTime = new Date(right.invitedAt || 0).getTime() || 0;
                return rightTime - leftTime;
            }),
        });
    } catch (error) {
        console.error('Clan recruitment lookup error:', error);
        return res.status(500).json({ error: 'Unable to load clan invitations.' });
    }
});

app.post('/api/clan/invite', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid username is required.' });
        }

        const inviter = await usersCollection.findOne({ username: req.authUser.username });
        if (!inviter) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const clan = inviterProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You must be in a clan to invite players.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'invite')) {
            return res.status(403).json({ error: 'Your clan rank cannot invite players.' });
        }

        const requestedUsername = value.username.trim();
        if (requestedUsername.toLowerCase() === inviter.username.toLowerCase()) {
            return res.status(400).json({ error: 'You cannot invite yourself.' });
        }

        const targetUser = await usersCollection.findOne({ usernameLower: requestedUsername.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        if (targetProfile.clan && targetProfile.clan.name) {
            return res.status(409).json({ error: 'That player is already in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const alreadyInvited = targetProfile.clanInvitations.some((invite) => {
            const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
            const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
            return clanAbbreviation && inviteClanAbbreviation
                ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                : inviteClanName === clanName;
        });

        if (alreadyInvited) {
            return res.status(409).json({ error: 'That player already has an invitation from your clan.' });
        }

        targetProfile.clanInvitations = [
            {
                clanName: clan.name,
                clanAbbreviation: clan.abbreviation || '',
                invitedBy: inviter.username,
                invitedUsername: targetUser.username,
                invitedAt: new Date(),
            },
            ...targetProfile.clanInvitations,
        ].slice(0, 50);

        await usersCollection.updateOne(
            { _id: targetUser._id },
            {
                $set: {
                    profile: targetProfile,
                },
            }
        );

        return res.status(201).json({ ok: true });
    } catch (error) {
        console.error('Clan invite error:', error);
        return res.status(500).json({ error: 'Unable to send clan invitation.' });
    }
});

app.post('/api/clan/invite/retract', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid username is required.' });
        }

        const inviter = await usersCollection.findOne({ username: req.authUser.username });
        if (!inviter) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const clan = inviterProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You must be in a clan to retract invitations.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'invite')) {
            return res.status(403).json({ error: 'Your clan rank cannot retract invitations.' });
        }

        const targetUser = await usersCollection.findOne({ usernameLower: value.username.trim().toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const startingCount = targetProfile.clanInvitations.length;

        targetProfile.clanInvitations = targetProfile.clanInvitations.filter((invite) => {
            const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
            const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
            const sameClan = clanAbbreviation && inviteClanAbbreviation
                ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                : inviteClanName === clanName;
            return !sameClan;
        });

        if (targetProfile.clanInvitations.length === startingCount) {
            return res.status(404).json({ error: 'No active invitation found for that player.' });
        }

        await usersCollection.updateOne(
            { _id: targetUser._id },
            {
                $set: {
                    profile: targetProfile,
                },
            }
        );

        return res.json({ ok: true });
    } catch (error) {
        console.error('Clan invite retract error:', error);
        return res.status(500).json({ error: 'Unable to retract clan invitation.' });
    }
});

app.get('/api/clan/invitations', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const invitations = Array.isArray(profile.clanInvitations) ? profile.clanInvitations : [];
        if (!invitations.length) {
            return res.json({
                ok: true,
                invitations: [],
            });
        }

        const inviters = await usersCollection
            .find(
                { username: { $in: invitations.map((entry) => entry.invitedBy).filter(Boolean) } },
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();
        const inviterMap = new Map(
            inviters.map((entry) => [String(entry.username || '').trim().toLowerCase(), normalizeUserProfile(entry)])
        );
        const validInvitations = invitations.filter((entry) => {
            const inviterProfile = inviterMap.get(String(entry.invitedBy || '').trim().toLowerCase());
            const inviterClan = inviterProfile && inviterProfile.clan ? inviterProfile.clan : null;
            if (!inviterClan || !inviterClan.name) {
                return false;
            }
            const sameClanName =
                String(inviterClan.name || '').trim().toLowerCase() === String(entry.clanName || '').trim().toLowerCase();
            if (!sameClanName) {
                return false;
            }
            if (entry.clanAbbreviation) {
                return (
                    String(inviterClan.abbreviation || '').trim().toLowerCase() ===
                    String(entry.clanAbbreviation || '').trim().toLowerCase()
                );
            }
            return true;
        });

        if (validInvitations.length !== invitations.length) {
            profile.clanInvitations = validInvitations;
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        }

        return res.json({
            ok: true,
            invitations: validInvitations,
        });
    } catch (error) {
        console.error('Clan invitations lookup error:', error);
        return res.status(500).json({ error: 'Unable to load clan invitations.' });
    }
});

app.post('/api/clan/invitations/accept', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid clan name is required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        if (profile.clan && profile.clan.name) {
            return res.status(409).json({ error: 'You are already in a clan.' });
        }

        const requestedClanName = value.username.trim().toLowerCase();
        const invitation = (Array.isArray(profile.clanInvitations) ? profile.clanInvitations : []).find(
            (entry) => String(entry.clanName || '').trim().toLowerCase() === requestedClanName
        );
        if (!invitation) {
            return res.status(404).json({ error: 'Clan invitation not found.' });
        }

        const inviter = await usersCollection.findOne({ username: invitation.invitedBy });
        if (!inviter) {
            return res.status(404).json({ error: 'Inviting clan could not be found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const inviterClan = inviterProfile.clan;
        if (!inviterClan || !inviterClan.name) {
            return res.status(404).json({ error: 'Inviting clan could not be found.' });
        }

        const sameClanName =
            String(inviterClan.name || '').trim().toLowerCase() === String(invitation.clanName || '').trim().toLowerCase();
        if (!sameClanName) {
            return res.status(409).json({ error: 'That invitation is no longer valid.' });
        }

        profile.clan = {
            name: inviterClan.name,
            abbreviation: inviterClan.abbreviation || '',
            rankKey: 'member',
            customRankName: '',
            rank: resolveBaseClanRankLabel('member'),
            avatarUrl: inviterClan.avatarUrl || '',
            joinedAt: new Date(),
            bio: inviterClan.bio || '',
            experiencePoints: Math.max(0, Number(inviterClan.experiencePoints) || 0),
            createdBy: inviterClan.createdBy || inviter.username,
            createdAt: inviterClan.createdAt || new Date(),
            customRankNames: normalizeClanRankNames(inviterClan.customRankNames),
        };
        profile.clanInvitations = (Array.isArray(profile.clanInvitations) ? profile.clanInvitations : []).filter(
            (entry) => String(entry.clanName || '').trim().toLowerCase() !== requestedClanName
        );

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan invitation accept error:', error);
        return res.status(500).json({ error: 'Unable to accept clan invitation.' });
    }
});

// Basic static routes for the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(['/selection-login', '/selection-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'selection-login.html'));
});

app.get(['/register', '/register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get(['/selection', '/selection.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'selection.html'));
});

app.get(['/ingame', '/ingame.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'ingame.html'));
});

app.get(['/profile', '/profile.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get(['/community', '/community.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'community.html'));
});

app.get(['/events', '/events.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'events.html'));
});

app.get(['/manual', '/manual.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'manual.html'));
});

app.get(['/changeavatar', '/changeavatar.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'changeavatar.html'));
});

app.get(['/resetaccount', '/resetaccount.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'resetaccount.html'));
});

app.get(['/changebackgrounds', '/changebackgrounds.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'changebackgrounds.html'));
});

app.get(['/clan-panel', '/clan panel.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'clan panel.html'));
});

app.get(['/editmission', '/editmission.html'], requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.redirect('/');
    }
    return res.sendFile(path.join(__dirname, 'editmission.html'));
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    console.error('Unhandled Express request error:', error);
    if (String(req.path || '').startsWith('/api/')) {
        res.status(500).json({ error: 'The server could not complete that request.' });
        return;
    }
    res.status(500).type('text/plain').send('The server could not complete that request.');
});

const startServer = async () => {
    await initDb();

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Naruto-Arena API listening on http://localhost:${PORT}`);
    });
    attachWebSocketSupport(server);

    let httpsServer = null;
    if (HTTPS_KEY_PATH && HTTPS_CERT_PATH) {
        try {
            const key = fs.readFileSync(HTTPS_KEY_PATH);
            const cert = fs.readFileSync(HTTPS_CERT_PATH);
            httpsServer = https.createServer({ key, cert }, app);
            httpsServer.listen(PORT + 1, () =>
                console.log(`Naruto-Arena API (HTTPS) listening on https://localhost:${PORT + 1}`)
            );
            attachWebSocketSupport(httpsServer);
        } catch (error) {
            console.error('Failed to start HTTPS server:', error);
        }
    }

    if (!turnSweepTimer) {
        turnSweepTimer = setInterval(() => {
            sweepExpiredMatches().catch((error) => {
                console.error('Failed to sweep expired matches:', error);
            });
        }, 2000);
    }

    let shutdownStarted = false;
    const shutdownServer = async (signal, exitCode = 0) => {
        if (shutdownStarted) return;
        shutdownStarted = true;
        console.log(`Received ${signal}; shutting down cleanly.`);
        if (turnSweepTimer) {
            clearInterval(turnSweepTimer);
            turnSweepTimer = null;
        }
        wsConnections.forEach((ws) => {
            try {
                ws.close();
            } catch (error) {
                // Ignore socket close failures.
            }
        });
        wsConnections.clear();
        if (mongoClient) {
            await mongoClient.close();
        }
        server.close(() => {});
        if (httpsServer) {
            httpsServer.close(() => {});
        }
        try {
            wsServer.close();
        } catch (error) {
            // Ignore websocket server shutdown failures.
        }
        process.exit(exitCode);
    };
    process.once('SIGINT', () => {
        shutdownServer('SIGINT').catch((error) => {
            console.error('SIGINT shutdown failed:', error);
            process.exit(1);
        });
    });
    process.once('SIGTERM', () => {
        shutdownServer('SIGTERM').catch((error) => {
            console.error('SIGTERM shutdown failed:', error);
            process.exit(1);
        });
    });
    process.on('unhandledRejection', (error) => {
        console.error('Unhandled promise rejection:', error);
    });
    process.once('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        shutdownServer('uncaughtException', 1).catch((shutdownError) => {
            console.error('Fatal shutdown failed:', shutdownError);
            process.exit(1);
        });
    });
};

const setCachedBotTeamsForTests = (teams = null) => {
    botTeamsCache = Array.isArray(teams)
        ? teams.map((team, index) => normalizeBotTeam(team, index))
        : teams;
};

const resetMatchmakingStateForTests = () => {
    quickQueue = [];
    ladderQueue = [];
    privateQueue = [];
    quickMatches.clear();
    userToMatch.clear();
    draftSessions.clear();
    userToDraft.clear();
};

const getUserMatchForTests = (username) => userToMatch.get(username) || null;

const setPersistenceCollectionsForTests = ({ matches = null, users = null } = {}) => {
    matchesCollection = matches;
    usersCollection = users;
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Failed to initialize the server:', error);
        process.exit(1);
    });
} else {
    module.exports = {
        app,
        normalizeArenaMode,
        applyRequiredCanonicalSkillCorrections,
        adjustRandomAssignments,
        createEmptyChakraPool,
        makeEmptyPendingTurn,
        assertTeamCanBeUsed,
        usernamesEqual,
        findMatchPlayerByUsername,
        findMatchOpponentByUsername,
        buildBattleBotTeam,
        isTeamRosterInArena,
        buildPairedMatchDocument,
        sanitizeSavedTeamIndicesForArena,
        buildSanitizedSavedTeamIndicesByArena,
        serializeUserForClient,
        buildBattleProfileSnapshot,
        sanitizeBoardForViewer,
        serializeMatchPlayerForViewer,
        buildMatchPayloadForUser,
        buildMatchActionStatePayload,
        buildMissionUserMap,
        ensureRequiredMissionCatalogEntries,
        resolveMissionUnlockPointCost,
        areQueuedSkillRequestsEquivalent,
        resolveExpiredTurnStartChoiceIfNeeded,
        autoAdvanceTurnIfExpired,
        normalizeRecentLadderGames,
        countCurrentLadderSurrenderStreakByUser,
        isRepeatLadderSurrenderer,
        setCachedBotTeamsForTests,
        resetMatchmakingStateForTests,
        getUserMatchForTests,
        setPersistenceCollectionsForTests,
        persistMatchState,
        ensureMatchTurnData,
        getBattleBotActionDelayRange,
        POKEMON_SKIN_CATALOG,
        scoreBattleBotDamageCoordination,
        estimateBattleBotPersistentDamage,
        exchangeChakra,
        buildHumanMatchStatsFilter,
        inferMatchArenaFromTeams,
        buildCharacterWinrateEntries,
        buildLatestReleasesPersistenceFields,
        normalizeNewsArena,
        countActiveBattleUnits,
        isPrivateStaticSourcePath,
        rewriteMirroredExternalImageUrls,
    };
}
