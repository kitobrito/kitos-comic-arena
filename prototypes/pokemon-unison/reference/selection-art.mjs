const renderRoot = '/game-assets/images/selection-featured/PokemonArena/BIB/';

export const SELECTION_RENDER_BY_ID = Object.freeze({
    'pokemon-trainer': 'POKEMONTRAINER.png.webp',
    charmander: 'Charmander.png.webp',
    squirtle: 'Pokémon_Squirtle_art.png.webp',
    bulbasaur: 'BULBASAUR.png.webp',
    pikachu: 'PIKACHU.png.webp',
    butterfree: 'Butterfree.png.webp',
    koffing: 'Koffing.webp.webp',
    gastly: 'Gastly.webp.webp',
    abra: 'ABRA.png.webp',
    krabby: 'KRABBY.png.webp',
    scyther: 'SCYTHER.png.webp',
    eevee: 'EEVEE.png.webp',
    jolteon: 'JOLTEON.png.webp',
    flareon: 'Flareon.webp.webp',
    vaporeon: 'VAPOREON.png.webp',
    ekans: '0023-ekans (1).webp.webp',
    machop: 'MACHOP.png.webp',
    magikarp: 'MAGIKARP.png.webp',
    'mr-mime': 'MRMIME.png.webp',
    hitmonchan: 'Hitmonchan.webp.webp',
    hitmonlee: '106_hitmonlee__rb__by_hilsonity_dhf06vd-fullview.png.webp',
    aerodactyl: 'AERODACTYL.png.webp',
    magnemite: 'Magnemite.webp.webp',
    onix: 'ONIX.png.webp',
    meowth: 'Meowth.png.webp',
    clefairy: 'CLEFAIRY.png.webp',
    jigglypuff: 'JIGGLYPUFF.png.webp',
    beedrill: '015BeedrillRB.webp.webp',
    articuno: 'ARTICUNO.png.webp',
    moltres: 'MOLTRES.png.webp',
    zapdos: 'ZAPDOS.png.webp',
    zubat: 'ZUBAT.png.webp',
    chansey: 'CHANSEY.png.webp',
    pidgey: 'Pidgey.webp.webp',
    mew: 'Pokémon_Mew_art.png.webp',
    mewtwo: 'Mewtwo_Render.webp.webp',
    dragonite: 'Dragonite.png.webp',
    cyndaquil: 'cyndaquil.png.webp',
    chikorita: 'chikorita.png.webp',
    totodile: 'totodile.png.webp',
    aegislash: 'AEGISLASH.webp',
});

export const SELECTION_EVOLUTION_RENDER_BY_ID = Object.freeze({
    abra: { name: 'Kadabra', filename: 'kadabra.png.webp' },
    bulbasaur: { name: 'Ivysaur', filename: 'ivysaur.png.webp' },
    chansey: { name: 'Blissey', filename: 'blissey.png.webp' },
    charmander: { name: 'Charmeleon', filename: 'charmeleon.png.webp' },
    clefairy: { name: 'Clefable', filename: 'clefable.png.webp' },
    ekans: { name: 'Arbok', filename: 'Arbok_Pokemon.webp.webp' },
    gastly: { name: 'Haunter', filename: 'haunter.png.webp' },
    jigglypuff: { name: 'Wigglytuff', filename: 'wigglytuff.webp.webp' },
    beedrill: { name: 'Mega Beedrill', filename: 'megabeedrill.png.webp' },
    koffing: { name: 'Weezing', filename: 'weezing.png.webp' },
    krabby: { name: 'Kingler', filename: 'Kingler_Pokemon.webp.webp' },
    machop: { name: 'Machoke', filename: 'Machoke.webp.webp' },
    magikarp: { name: 'Gyarados', filename: 'gyarados.png.webp' },
    magnemite: { name: 'Magneton', filename: 'magneton.png.webp' },
    meowth: { name: 'Persian', filename: 'persian.png.webp' },
    pidgey: { name: 'Pidgeotto', filename: 'pidgeotto.png.webp' },
    squirtle: { name: 'Wartortle', filename: 'Wartortle.webp.webp' },
    zubat: { name: 'Golbat', filename: 'Golbat_Render_01.webp.webp' },
});

export function selectionRenderUrl(filename = '') {
    return filename ? encodeURI(`${renderRoot}${filename}`) : '';
}

export function selectionRenderForms(speciesId, baseName = '') {
    const baseFilename = SELECTION_RENDER_BY_ID[speciesId];
    const evolution = SELECTION_EVOLUTION_RENDER_BY_ID[speciesId];
    return [
        baseFilename ? {
            id: 'base',
            label: 'Base',
            name: baseName,
            url: selectionRenderUrl(baseFilename),
        } : null,
        evolution ? {
            id: 'evolution',
            label: 'Evolution',
            name: evolution.name,
            url: selectionRenderUrl(evolution.filename),
        } : null,
    ].filter(Boolean);
}
