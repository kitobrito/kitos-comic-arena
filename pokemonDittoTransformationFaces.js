const DITTO_TRANSFORMATION_FACE_BASE_PATH =
    'assets/images/PokemonArena/Ditto/transformationfps/optimized';

const toDittoTransformationFacePath = (filename) =>
    `${DITTO_TRANSFORMATION_FACE_BASE_PATH}/${filename}`;

const DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID = Object.freeze({
    'pokemon-trainer': toDittoTransformationFacePath('pokemontrainer.webp'),
    bulbasaur: toDittoTransformationFacePath('bulbasaur.webp'),
    charmander: toDittoTransformationFacePath('charmander.webp'),
    squirtle: toDittoTransformationFacePath('squritle.webp'),
    butterfree: toDittoTransformationFacePath('butterfree.webp'),
    beedrill: toDittoTransformationFacePath('beedrill.webp'),
    pidgey: toDittoTransformationFacePath('pidgey.webp'),
    ekans: toDittoTransformationFacePath('ekans.webp'),
    pikachu: toDittoTransformationFacePath('pikachu.webp'),
    clefairy: toDittoTransformationFacePath('clefairy.webp'),
    jigglypuff: toDittoTransformationFacePath('jigglypuff.webp'),
    zubat: toDittoTransformationFacePath('zubat.webp'),
    meowth: toDittoTransformationFacePath('meowth.webp'),
    abra: toDittoTransformationFacePath('abra.webp'),
    machop: toDittoTransformationFacePath('machop.webp'),
    primeape: toDittoTransformationFacePath('primeape.webp'),
    magnemite: toDittoTransformationFacePath('magnemite.webp'),
    gastly: toDittoTransformationFacePath('gastley.webp'),
    onix: toDittoTransformationFacePath('onix.webp'),
    krabby: toDittoTransformationFacePath('krabby.webp'),
    hitmonlee: toDittoTransformationFacePath('hitmonlee.webp'),
    hitmonchan: toDittoTransformationFacePath('hitmonchan.webp'),
    koffing: toDittoTransformationFacePath('koffing.webp'),
    chansey: toDittoTransformationFacePath('chansey.webp'),
    'mr-mime': toDittoTransformationFacePath('mrmime.webp'),
    scyther: toDittoTransformationFacePath('scyther.webp'),
    magikarp: toDittoTransformationFacePath('magikarp.webp'),
    eevee: toDittoTransformationFacePath('eevee.webp'),
    vaporeon: toDittoTransformationFacePath('vaporeon.webp'),
    jolteon: toDittoTransformationFacePath('jolteon.webp'),
    flareon: toDittoTransformationFacePath('flareon.webp'),
    aerodactyl: toDittoTransformationFacePath('aerodactyl.webp'),
    articuno: toDittoTransformationFacePath('articuno.webp'),
    zapdos: toDittoTransformationFacePath('zapdos.webp'),
    moltres: toDittoTransformationFacePath('moltres.webp'),
    dragonite: toDittoTransformationFacePath('dragonite.webp'),
    mewtwo: toDittoTransformationFacePath('mewtwo.webp'),
    mew: toDittoTransformationFacePath('mew.webp'),
    chikorita: toDittoTransformationFacePath('chikorita.webp'),
    cyndaquil: toDittoTransformationFacePath('cyndaquil.webp'),
    totodile: toDittoTransformationFacePath('totodile.webp'),
    scraggy: toDittoTransformationFacePath('scraggy.webp'),
    aegislash: toDittoTransformationFacePath('aegislashshield.webp'),
    dragapult: toDittoTransformationFacePath('dragapult.webp'),
    nincada: toDittoTransformationFacePath('nincada.webp'),
    ninjask: toDittoTransformationFacePath('ninjask.webp'),
    shedinja: toDittoTransformationFacePath('shedinja.webp'),
    drowzee: toDittoTransformationFacePath('drowzee.webp'),
});

const DITTO_TRANSFORMATION_FACE_BY_STATUS_ID = Object.freeze({
    bulbasaur_ivysaur_evolution: toDittoTransformationFacePath('ivysaur.webp'),
    charmander_charmeleon_evolution: toDittoTransformationFacePath('charmeleon.webp'),
    squirtle_wartortle_evolution: toDittoTransformationFacePath('wartortle.webp'),
    chansey_blissey_evolution: toDittoTransformationFacePath('blissey.webp'),
    pidgey_pidgeotto_evolution: toDittoTransformationFacePath('pidgeotto.webp'),
    koffing_weezing_evolution: toDittoTransformationFacePath('weezing.webp'),
    zubat_golbat_evolution: toDittoTransformationFacePath('golbat.webp'),
    gastly_haunter_evolution: toDittoTransformationFacePath('haunter.webp'),
    abra_kadabra_evolution: toDittoTransformationFacePath('kadabra.webp'),
    krabby_kingler_evolution: toDittoTransformationFacePath('kingler.webp'),
    ekans_arbok_evolution: toDittoTransformationFacePath('arbok.webp'),
    machop_machoke_evolution: toDittoTransformationFacePath('machoke.webp'),
    magikarp_gyarados_evolution: toDittoTransformationFacePath('gyarados.webp'),
    magnemite_magneton_evolution: toDittoTransformationFacePath('magneton.webp'),
    clefairy_clefable_evolution: toDittoTransformationFacePath('clefable.webp'),
    jigglypuff_wigglytuff_evolution: toDittoTransformationFacePath('wigglytuff.webp'),
    meowth_persian_evolution: toDittoTransformationFacePath('persian.webp'),
    beedrill_mega_evolution: toDittoTransformationFacePath('megabeedrill.webp'),
    scraggy_scrafty_evolution: toDittoTransformationFacePath('scrafty.webp'),
    aegislash_blade_stance: toDittoTransformationFacePath('aegislashsword.webp'),
    aegislash_shield_stance: toDittoTransformationFacePath('aegislashshield.webp'),
    nincada_ninjask_evolution: toDittoTransformationFacePath('ninjask.webp'),
    nincada_shedinja_evolution: toDittoTransformationFacePath('shedinja.webp'),
    hypno_evolution: toDittoTransformationFacePath('hypno.webp'),
});

const DITTO_TRANSFORMATION_FACE_BY_SKIN_ID = Object.freeze({
    'pikachu-raichu': toDittoTransformationFacePath('raichu.webp'),
    'butterfree-pink': toDittoTransformationFacePath('pinkbutterfree.webp'),
    'onix-crystal': toDittoTransformationFacePath('crystalonix.webp'),
    'onix-bismuth': toDittoTransformationFacePath('bismuthonix.webp'),
    'onix-golden': toDittoTransformationFacePath('goldenonix.webp'),
    'onix-magma': toDittoTransformationFacePath('magmaonix.webp'),
    'onix-cosmic': toDittoTransformationFacePath('cosmiconix.webp'),
    'magikarp-golden-gyarados-red': toDittoTransformationFacePath('goldenmagikarp.webp'),
    'charmander-charizard-legendary': toDittoTransformationFacePath('charizard.webp'),
    'cyndaquil-quilava-evolution': toDittoTransformationFacePath('quilava.webp'),
    'cyndaquil-typhlosion-evolution': toDittoTransformationFacePath('typhlosion.webp'),
    'chikorita-bayleaf-evolution': toDittoTransformationFacePath('bayleef.webp'),
    'chikorita-meganium-evolution': toDittoTransformationFacePath('meganium.webp'),
    'totodile-croconaw-evolution': toDittoTransformationFacePath('croconaw.webp'),
    'totodile-feraligatr-evolution': toDittoTransformationFacePath('feraligatyr.webp'),
    'primeape-annihilape-evolution': toDittoTransformationFacePath('annihilape.webp'),
});

const DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID = Object.freeze({
    'magikarp-golden-gyarados-red:magikarp_gyarados_evolution':
        toDittoTransformationFacePath('redgyarados.webp'),
    'charmander-charizard-legendary:charmander_charizard_x_evolution_branch':
        toDittoTransformationFacePath('megacharizardX.webp'),
    'charmander-charizard-legendary:charmander_charizard_y_evolution_branch':
        toDittoTransformationFacePath('megacharizardY.webp'),
});

const normalizeLookupId = (value) => String(value || '').trim().toLowerCase();
const normalizeAssetPath = (value) =>
    String(value || '').trim().replace(/\\/g, '/').toLowerCase();

const resolveDittoTransformationFacePicture = ({
    characterId = '',
    effectiveSkinId = '',
    activeStatusIds = [],
    targetFacePicture = '',
    characterFacePicture = '',
} = {}) => {
    const currentFace = String(targetFacePicture || '').trim();
    const rawCharacterFace = String(characterFacePicture || '').trim();
    if (
        normalizeAssetPath(currentFace).startsWith(
            `${normalizeAssetPath(DITTO_TRANSFORMATION_FACE_BASE_PATH)}/`
        )
    ) {
        return currentFace;
    }

    const normalizedSkinId = normalizeLookupId(effectiveSkinId);
    const normalizedActiveStatusIds = (Array.isArray(activeStatusIds) ? activeStatusIds : [])
        .map(normalizeLookupId)
        .filter(Boolean);
    const skinStatusFace = normalizedSkinId
        ? normalizedActiveStatusIds
              .map(
                  (statusId) =>
                      DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID[
                          `${normalizedSkinId}:${statusId}`
                      ] || ''
              )
              .filter(Boolean)
              .pop()
        : '';
    if (skinStatusFace) {
        return skinStatusFace;
    }
    if (
        normalizedSkinId &&
        currentFace &&
        normalizeAssetPath(currentFace) !== normalizeAssetPath(rawCharacterFace)
    ) {
        return currentFace;
    }
    if (normalizedSkinId) {
        return (
            DITTO_TRANSFORMATION_FACE_BY_SKIN_ID[normalizedSkinId] ||
            currentFace ||
            rawCharacterFace
        );
    }

    const statusFace = normalizedActiveStatusIds
        .map((statusId) => DITTO_TRANSFORMATION_FACE_BY_STATUS_ID[normalizeLookupId(statusId)] || '')
        .filter(Boolean)
        .pop();
    if (statusFace) {
        return statusFace;
    }

    if (
        currentFace &&
        normalizeAssetPath(currentFace) !== normalizeAssetPath(rawCharacterFace)
    ) {
        return currentFace;
    }

    return (
        DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID[normalizeLookupId(characterId)] ||
        currentFace ||
        rawCharacterFace
    );
};

module.exports = {
    DITTO_TRANSFORMATION_FACE_BASE_PATH,
    DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID,
    DITTO_TRANSFORMATION_FACE_BY_SKIN_ID,
    DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID,
    DITTO_TRANSFORMATION_FACE_BY_STATUS_ID,
    resolveDittoTransformationFacePicture,
};
