const {
    buildCharacterMap,
    loadEffectiveCharacterState,
    normalizeArenaMode,
} = require('./lib/runtime-toolkit');

function parseArgs(argv) {
    const options = {
        characterId: null,
        arena: 'pokemon',
        json: false,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--character' || arg === '-c') {
            options.characterId = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--arena') {
            options.arena = argv[index + 1] || 'pokemon';
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.json = true;
        }
    }
    return options;
}

function parseNumber(text, pattern) {
    const match = text.match(pattern);
    return match ? Number(match[1]) : null;
}

function detectSkillDrift(skill = {}) {
    const description = typeof skill.skilldescription === 'string' ? skill.skilldescription : '';
    const lower = description.toLowerCase();
    const issues = [];
    const effects = Array.isArray(skill.effects) ? skill.effects : [];
    const damageEffects = effects.filter((effect) => effect?.type === 'damage');
    const statusEffects = effects.filter((effect) => effect?.type === 'apply_status');
    const healthLoss = effects.find((effect) => effect?.type === 'HealthLoss');

    const describedDamage = parseNumber(description, /Deals\s+(\d+)\s+(?:affliction\s+)?damage/i);
    if (describedDamage !== null && damageEffects.length > 0) {
        const maxDamage = Math.max(...damageEffects.map((effect) => Number(effect.amount) || 0));
        if (maxDamage !== describedDamage) {
            issues.push(`description damage ${describedDamage} != effect damage ${maxDamage}`);
        }
    }

    const describedTurns = parseNumber(description, /for\s+(\d+)\s+turn/i);
    if (describedTurns !== null && statusEffects.length > 0) {
        const playerFacingDurations = statusEffects
            .filter((effect) => !effect?.metadata?.infiniteDuration)
            .map((effect) => Number(effect.duration) || 0)
            .filter((duration) => duration > 0 && duration < 90);
        if (playerFacingDurations.length > 0) {
            const maxDuration = Math.max(...playerFacingDurations);
            if (maxDuration !== describedTurns) {
                issues.push(`description duration ${describedTurns} != status duration ${maxDuration}`);
            }
        }
    }

    const describedHealthLoss = parseNumber(description, /loses\s+(\d+)\s+health/i);
    if (describedHealthLoss !== null) {
        const actualHealthLoss = Number(healthLoss?.amount) || 0;
        if (actualHealthLoss !== describedHealthLoss) {
            issues.push(`description health loss ${describedHealthLoss} != effect health loss ${actualHealthLoss}`);
        }
    }

    const describedCooldownLock = parseNumber(description, /may not use a new skill for\s+(\d+)\s+turn/i);
    if (describedCooldownLock !== null) {
        const lockStatus = statusEffects.find((effect) => effect?.metadata?.cannotUseSkills);
        const actualDuration = Number(lockStatus?.duration) || 0;
        if (actualDuration !== describedCooldownLock) {
            issues.push(`description lock duration ${describedCooldownLock} != effect duration ${actualDuration}`);
        }
    }

    if (lower.includes('all of') && lower.includes('other skills are on cooldown')) {
        if (!skill?.actorCondition?.allOtherSkillsOnCooldown) {
            issues.push('description says all other skills on cooldown but actorCondition is missing');
        }
    }

    return issues;
}

function scanCharacters(characters = []) {
    return characters
        .map((character) => {
            const skillIssues = (Array.isArray(character.skills) ? character.skills : [])
                .map((skill) => {
                    const issues = detectSkillDrift(skill);
                    if (!issues.length) return null;
                    return {
                        skillId: skill.id,
                        skillName: skill.name,
                        issues,
                    };
                })
                .filter(Boolean);
            if (!skillIssues.length) return null;
            return {
                characterId: character.characterId || character.id || null,
                characterName: character.name || null,
                skillIssues,
            };
        })
        .filter(Boolean);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const state = await loadEffectiveCharacterState();
    const effectiveMap = buildCharacterMap(state.effectiveCharacters);
    const sourceCharacters = options.characterId
        ? [effectiveMap.get(options.characterId)].filter(Boolean)
        : state.effectiveCharacters.filter(
              (character) => normalizeArenaMode(character.arena || character.universe) === normalizeArenaMode(options.arena)
          );
    const result = {
        arena: normalizeArenaMode(options.arena),
        characterId: options.characterId,
        findings: scanCharacters(sourceCharacters),
    };
    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    detectSkillDrift,
    parseArgs,
    scanCharacters,
};
