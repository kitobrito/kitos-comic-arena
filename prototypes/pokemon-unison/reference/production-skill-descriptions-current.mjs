import { DESCRIPTION_PART_1 } from './production-skill-descriptions-part-1.mjs';
import { DESCRIPTION_PART_2 } from './production-skill-descriptions-part-2.mjs';
import { DESCRIPTION_PART_3 } from './production-skill-descriptions-part-3.mjs';
import { DESCRIPTION_PART_4 } from './production-skill-descriptions-part-4.mjs';
import { DESCRIPTION_PART_5 } from './production-skill-descriptions-part-5.mjs';
import { DESCRIPTION_PART_6 } from './production-skill-descriptions-part-6.mjs';
import { DESCRIPTION_PART_7 } from './production-skill-descriptions-part-7.mjs';
import { DESCRIPTION_PART_8 } from './production-skill-descriptions-part-8.mjs';

export const CURRENT_PRODUCTION_SKILL_DESCRIPTIONS = Object.freeze({
    ...DESCRIPTION_PART_1,
    ...DESCRIPTION_PART_2,
    ...DESCRIPTION_PART_3,
    ...DESCRIPTION_PART_4,
    ...DESCRIPTION_PART_5,
    ...DESCRIPTION_PART_6,
    ...DESCRIPTION_PART_7,
    ...DESCRIPTION_PART_8,
});

export function productionSkillDescription(skillId) {
    return CURRENT_PRODUCTION_SKILL_DESCRIPTIONS[skillId] ?? null;
}
