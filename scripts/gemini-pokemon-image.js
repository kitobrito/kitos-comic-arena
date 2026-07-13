const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const DEFAULT_ASPECT_RATIO = '1:1';
const DEFAULT_IMAGE_SIZE = '1K';

function slugify(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .replace(/^_+|_+$/g, '');
}

function parseArgs(argv) {
    const options = {
        pokemon: '',
        name: '',
        type: 'skill',
        prompt: '',
        out: '',
        ext: 'jpg',
        model: DEFAULT_MODEL,
        aspectRatio: DEFAULT_ASPECT_RATIO,
        imageSize: DEFAULT_IMAGE_SIZE,
        json: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--pokemon' || arg === '-p') {
            options.pokemon = argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (arg === '--name' || arg === '-n') {
            options.name = argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (arg === '--type' || arg === '-t') {
            options.type = (argv[index + 1] || 'skill').trim().toLowerCase();
            index += 1;
            continue;
        }
        if (arg === '--prompt') {
            options.prompt = argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (arg === '--out' || arg === '-o') {
            options.out = argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (arg === '--ext') {
            options.ext = (argv[index + 1] || 'png').trim().toLowerCase();
            index += 1;
            continue;
        }
        if (arg === '--model') {
            options.model = argv[index + 1] || DEFAULT_MODEL;
            index += 1;
            continue;
        }
        if (arg === '--aspect-ratio') {
            options.aspectRatio = argv[index + 1] || DEFAULT_ASPECT_RATIO;
            index += 1;
            continue;
        }
        if (arg === '--image-size') {
            options.imageSize = argv[index + 1] || DEFAULT_IMAGE_SIZE;
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.json = true;
        }
    }

    return options;
}

function getMimeTypeFromExt(ext = 'jpg') {
    const normalized = ext.trim().toLowerCase();
    if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'png') return 'image/jpeg';
    if (normalized === 'webp') return 'image/jpeg';
    return 'image/jpeg';
}

function resolvePokemonFolder(pokemon = '') {
    const safePokemon = pokemon.trim();
    if (!safePokemon) {
        throw new Error('Pokemon name is required.');
    }
    return path.join(projectRoot, 'assets', 'images', 'PokemonArena', safePokemon);
}

function resolveOutputPath({ pokemon = '', name = '', out = '', ext = 'jpg' }) {
    if (out) {
        return path.isAbsolute(out) ? out : path.join(projectRoot, out);
    }
    const folder = resolvePokemonFolder(pokemon);
    const basename = slugify(name);
    if (!basename) {
        throw new Error('Picture or skill name is required.');
    }
    return path.join(folder, `${basename}.${ext}`);
}

function buildPrompt({ pokemon = '', name = '', type = 'skill', prompt = '' }) {
    if (prompt && prompt.trim()) {
        return prompt.trim();
    }

    const subject = `${pokemon.trim()} ${name.trim()}`.trim();
    const baseStyle =
        'Use the digital art anime style of the official Pokemon anime: bright clean colors, cel-shaded anime rendering, crisp outlines, expressive motion, polished 2D digital painting, no realistic textures, no photorealism, no text, no watermark, no frame.';

    if (type === 'portrait' || type === 'face' || type === 'profile') {
        return `Create a clean character portrait of ${pokemon.trim()} in the digital art anime style of the official Pokemon anime for a battle game UI. ${baseStyle} Center the Pokemon, keep the background simple and readable, and make it suitable for an in-game face picture asset.`;
    }

    if (type === 'passive' || type === 'status' || type === 'icon') {
        return `Create a square game icon for ${subject} in the digital art anime style of the official Pokemon anime. ${baseStyle} Show the move or passive effect clearly with strong silhouette readability for a battle skill icon.`;
    }

    if (type === 'mission' || type === 'splash') {
        return `Create polished promotional artwork for ${subject} in the digital art anime style of the official Pokemon anime. ${baseStyle} Compose it like game key art, with dynamic posing and a background that supports the move or character theme.`;
    }

    return `Create a square skill image for ${subject} in the digital art anime style of the official Pokemon anime for a Pokemon Arena battle game. ${baseStyle} The move should read clearly at small size and feel like an authentic Pokemon anime attack visual.`;
}

async function generateImage({
    apiKey,
    model,
    prompt,
    aspectRatio = DEFAULT_ASPECT_RATIO,
    imageSize = DEFAULT_IMAGE_SIZE,
    mimeType = 'image/png',
}) {
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            input: [{ type: 'text', text: prompt }],
            response_format: {
                type: 'image',
                mime_type: mimeType,
                aspect_ratio: aspectRatio,
                image_size: imageSize,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed (${response.status}): ${errorText}`);
    }

    const payload = await response.json();
    const imageData = payload?.output_image?.data;
    if (!imageData) {
        throw new Error('Gemini API returned no output_image data.');
    }
    return {
        payload,
        buffer: Buffer.from(imageData, 'base64'),
    };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options.pokemon || !options.name) {
        throw new Error('Usage: node scripts/gemini-pokemon-image.js --pokemon <name> --name <skill-or-picture>');
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('Set GEMINI_API_KEY or GOOGLE_API_KEY in .env before generating images.');
    }

    const outputPath = resolveOutputPath(options);
    const prompt = buildPrompt(options);
    const mimeType = getMimeTypeFromExt(options.ext);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const { buffer } = await generateImage({
        apiKey,
        model: options.model,
        prompt,
        aspectRatio: options.aspectRatio,
        imageSize: options.imageSize,
        mimeType,
    });
    fs.writeFileSync(outputPath, buffer);

    const result = {
        pokemon: options.pokemon,
        name: options.name,
        type: options.type,
        model: options.model,
        prompt,
        outputPath,
        bytes: buffer.length,
    };

    const manifestPath = `${outputPath}.json`;
    fs.writeFileSync(
        manifestPath,
        JSON.stringify(
            {
                ...result,
                generatedAt: new Date().toISOString(),
            },
            null,
            2
        )
    );

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(`Saved image to ${outputPath}`);
    console.log(`Saved prompt manifest to ${manifestPath}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}

module.exports = {
    buildPrompt,
    getMimeTypeFromExt,
    parseArgs,
    resolveOutputPath,
    slugify,
};
