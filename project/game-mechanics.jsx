// Mythic Spellbook — game mechanics catalog
// Statuses, passives, moves, natures, traits — sourced from the engine spec.

const CARD_TYPES = [
  { id:'unit',     name:'Unit',     icon:'🛡', desc:'A creature placed on the board. Acts each turn.' },
  { id:'hero',     name:'Hero',     icon:'👑', desc:'Your commander. Lose if reduced to 0 HP.' },
  { id:'spell',    name:'Spell',    icon:'✨', desc:'One-shot effect. No board presence.' },
  { id:'trap',     name:'Trap',     icon:'⚠️', desc:'Hidden tile. Triggers on enemy entry.' },
  { id:'location', name:'Location', icon:'🏛', desc:'Persistent field effect on a tile or zone.' },
  { id:'weather',  name:'Weather',  icon:'🌪', desc:'Global field effect, looped audio + aura.' },
  { id:'wall',     name:'Wall',     icon:'🧱', desc:'50 HP barrier; blocks movement and attacks.' },
  { id:'counterSpell',    name:'Counter (Spell)',    icon:'🚫', desc:'Negates or counters an enemy Spell when triggered.' },
  { id:'counterWall',     name:'Counter (Wall)',     icon:'🚧', desc:'Counters or neutralizes an enemy Wall.' },
  { id:'counterLocation', name:'Counter (Location)', icon:'📍', desc:'Counters an enemy Location effect.' },
  { id:'counterUnit',     name:'Counter (Unit)',     icon:'🔰', desc:'Counters an enemy Unit — locks or negates it.' },
  { id:'counterTrap',     name:'Counter (Trap)',     icon:'🪤', desc:'Counters an enemy Trap before it resolves.' },
  { id:'enchantment',     name:'Enchantment',        icon:'🔮', desc:'Persistent aura attached to a card, unit, or tile.' },
  { id:'assault',         name:'Assault',            icon:'💥', desc:'Aggressive strike card built for high-tempo offense.' },
  { id:'archon',          name:'Archon',             icon:'🌠', desc:'Ascended apex form. A powerful unit with a full stat block.' },
  { id:'fusion',          name:'Fusion',             icon:'🧬', desc:'Combined form fused from other cards. Has a stat block.' },
];

const STAT_KEYS = [
  { id:'hp',  name:'HP',  icon:'❤',  desc:'Hit Points' },
  { id:'atk', name:'ATK', icon:'⚔',  desc:'Physical Attack' },
  { id:'def', name:'DEF', icon:'🛡', desc:'Physical Defense' },
  { id:'mag', name:'MAG', icon:'✦',  desc:'Magical Attack' },
  { id:'res', name:'RES', icon:'◈',  desc:'Magical Resistance' },
  { id:'spd', name:'SPD', icon:'➤',  desc:'Speed tier (1-3)' },
];

// 33 statuses (engine spec)
const STATUSES = [
  { id:'poison',       name:'Poison',        icon:'☠️', color:'#8e4eb5', trigger:'turnStart', desc:'1-5 dmg at turn start. Stacks scale with intensity.' },
  { id:'burn',         name:'Burn',          icon:'🔥', color:'#ff7755', trigger:'turnStart', desc:'Fire DOT; reduces ATK while active.' },
  { id:'bleed',        name:'Bleed',         icon:'🩸', color:'#cc2a3a', trigger:'onAction',  desc:'Damage on every action taken.' },
  { id:'siphoned',     name:'Siphoned',      icon:'🌀', color:'#5b3a8a', trigger:'turnStart', desc:'Steals 1 energy/turn for the inflictor.' },
  { id:'stun',         name:'Stun',          icon:'💥', color:'#ffe066', trigger:'preTurn',   desc:'Skip next turn entirely.' },
  { id:'slow',         name:'Slow',          icon:'🐌', color:'#7d8590', trigger:'aura',      desc:'SPD reduced by 1 tier.' },
  { id:'haste',        name:'Haste',         icon:'⚡', color:'#9b8bff', trigger:'aura',      desc:'SPD raised by 1 tier.' },
  { id:'weak',         name:'Weak',          icon:'⬇',  color:'#9aa0a6', trigger:'aura',      desc:'-25% damage dealt.' },
  { id:'strong',       name:'Strong',        icon:'⬆',  color:'#d4af37', trigger:'aura',      desc:'+25% damage dealt.' },
  { id:'shielded',     name:'Shielded',      icon:'🔰', color:'#5aa8ff', trigger:'onHit',     desc:'Absorbs the next instance of damage.' },
  { id:'focused',      name:'Focused',       icon:'🧿', color:'#a070d9', trigger:'onCast',    desc:'+50% magical power on next spell.' },
  { id:'frozen',       name:'Frozen',        icon:'❄️', color:'#88ddee', trigger:'preTurn',   desc:'Cannot act for 2 turns. Brittle.' },
  { id:'sleep',        name:'Sleep',         icon:'💤', color:'#b8c8d8', trigger:'preTurn',   desc:'Skips turns until damaged.' },
  { id:'confusion',    name:'Confusion',     icon:'❓', color:'#ff77bb', trigger:'preAction', desc:'May target self or ally instead.' },
  { id:'paralysis',    name:'Paralysis',     icon:'⚡', color:'#ffe066', trigger:'preAction', desc:'25% chance to skip action.' },
  { id:'dispel',       name:'Dispel',        icon:'🌬', color:'#a8e0d8', trigger:'instant',   desc:'Removes all buffs from target.' },
  { id:'assisted',     name:'Assisted',      icon:'🤝', color:'#6ad880', trigger:'onAttack',  desc:'Bonded ally adds bonus damage.' },
  { id:'spectralHaze', name:'Spectral Haze', icon:'👻', color:'#b8c8d8', trigger:'aura',      desc:'Ranged attacks 50% miss.' },
  { id:'stumble',      name:'Stumble',       icon:'🥾', color:'#c89060', trigger:'preMove',   desc:'-1 movement tile this turn.' },
  { id:'protected',    name:'Protected',     icon:'🪬', color:'#ffe66d', trigger:'onTarget',  desc:'Cannot be targeted by enemies.' },
  { id:'countering',   name:'Countering',    icon:'↩',  color:'#d4af37', trigger:'onHit',     desc:'Reflects 50% of melee damage.' },
  { id:'rage',         name:'Rage',          icon:'🪓', color:'#b03a2a', trigger:'aura',      desc:'+50% ATK, -25% DEF. Auto-attacks nearest enemy.' },
  { id:'infected',     name:'Infected',      icon:'🦠', color:'#7ad07a', trigger:'turnEnd',   desc:'Spreads to adjacent units. Alien mechanic.' },
  { id:'happy',        name:'Happy',         icon:'😊', color:'#ffd166', trigger:'aura',      desc:'+10 morale. Cleanses minor debuffs each turn.' },
  { id:'followLead',   name:'Follow-Lead',   icon:'🎯', color:'#6c92d4', trigger:'turnStart', desc:'Inherits bonded hero\'s buffs.' },
  { id:'blessed',      name:'Blessed',       icon:'😇', color:'#ffd166', trigger:'aura',      desc:'+15% RES. Immune to curses.' },
  { id:'cursed',       name:'Cursed',        icon:'🕯', color:'#5a2a6a', trigger:'aura',      desc:'-15% all stats. Visible to enemies.' },
  { id:'mirror',       name:'Mirror',        icon:'🪞', color:'#b6d4ff', trigger:'onCast',    desc:'Next spell cast on target reflects to caster.' },
  { id:'toxic',        name:'Toxic',         icon:'☣️', color:'#6e8a30', trigger:'turnStart', desc:'Doubling poison DOT each turn.' },
  { id:'doom',         name:'Doom',          icon:'⏳', color:'#4a3a5a', trigger:'countdown', desc:'KO at end of 3rd turn.' },
  { id:'reraise',      name:'Re-raise',      icon:'🌟', color:'#ffe066', trigger:'onDeath',   desc:'Revives once at 25% HP.' },
  { id:'moxie',        name:'Moxie',         icon:'🏆', color:'#d4af37', trigger:'onKill',    desc:'+1 ATK stage on each kill.' },
  { id:'knockdown',    name:'Knockdown',     icon:'⤵',  color:'#7d8590', trigger:'instant',   desc:'Loses next turn. Cannot dodge.' },
];

// 24 natures (Pokémon-style ±10% bias)
const NATURES = [
  { id:'adamant', name:'Adamant', plus:'atk', minus:'mag' },
  { id:'modest',  name:'Modest',  plus:'mag', minus:'atk' },
  { id:'bold',    name:'Bold',    plus:'def', minus:'atk' },
  { id:'calm',    name:'Calm',    plus:'res', minus:'atk' },
  { id:'brave',   name:'Brave',   plus:'atk', minus:'spd' },
  { id:'timid',   name:'Timid',   plus:'spd', minus:'atk' },
  { id:'careful', name:'Careful', plus:'res', minus:'mag' },
  { id:'quiet',   name:'Quiet',   plus:'mag', minus:'spd' },
  { id:'impish',  name:'Impish',  plus:'def', minus:'mag' },
  { id:'lax',     name:'Lax',     plus:'def', minus:'res' },
  { id:'lonely',  name:'Lonely',  plus:'atk', minus:'def' },
  { id:'naive',   name:'Naive',   plus:'spd', minus:'res' },
  { id:'naughty', name:'Naughty', plus:'atk', minus:'res' },
  { id:'sassy',   name:'Sassy',   plus:'res', minus:'spd' },
  { id:'mild',    name:'Mild',    plus:'mag', minus:'def' },
  { id:'rash',    name:'Rash',    plus:'mag', minus:'res' },
  { id:'relaxed', name:'Relaxed', plus:'def', minus:'spd' },
  { id:'gentle',  name:'Gentle',  plus:'res', minus:'def' },
  { id:'jolly',   name:'Jolly',   plus:'spd', minus:'mag' },
  { id:'hardy',   name:'Hardy',   plus:null,  minus:null  },
  { id:'docile',  name:'Docile',  plus:null,  minus:null  },
  { id:'bashful', name:'Bashful', plus:null,  minus:null  },
  { id:'quirky',  name:'Quirky',  plus:null,  minus:null  },
  { id:'serious', name:'Serious', plus:null,  minus:null  },
];

// 23 traits (flat stat package, rarity-tagged)
const TRAITS = [
  { id:'sturdy',     name:'Sturdy',     rarity:'common',    stats:'+8 HP, +2 DEF' },
  { id:'keen',       name:'Keen',       rarity:'common',    stats:'+3 ATK, +1 SPD' },
  { id:'arcane',     name:'Arcane',     rarity:'uncommon',  stats:'+4 MAG, +2 RES' },
  { id:'warded',     name:'Warded',     rarity:'uncommon',  stats:'+5 RES, +3 HP' },
  { id:'hardy',      name:'Hardy',      rarity:'common',    stats:'+5 HP' },
  { id:'balanced',   name:'Balanced',   rarity:'uncommon',  stats:'+2 to all' },
  { id:'brutal',     name:'Brutal',     rarity:'rare',      stats:'+6 ATK, -2 DEF' },
  { id:'ironhide',   name:'Ironhide',   rarity:'rare',      stats:'+8 DEF, -1 SPD' },
  { id:'mystic',     name:'Mystic',     rarity:'rare',      stats:'+7 MAG, -2 ATK' },
  { id:'vigorous',   name:'Vigorous',   rarity:'rare',      stats:'+12 HP' },
  { id:'tactician',  name:'Tactician',  rarity:'epic',      stats:'+3 SPD, +3 to MAG/ATK choice' },
  { id:'stalwart',   name:'Stalwart',   rarity:'epic',      stats:'+10 DEF, +5 RES' },
  { id:'berserker',  name:'Berserker',  rarity:'epic',      stats:'+10 ATK at low HP' },
  { id:'juggernaut', name:'Juggernaut', rarity:'legendary', stats:'+15 HP, +5 ATK, -1 SPD' },
  { id:'archmage',   name:'Archmage',   rarity:'legendary', stats:'+12 MAG, +6 RES' },
  { id:'warbander',  name:'Warbander',  rarity:'legendary', stats:'Aura: +2 ATK to allies' },
  { id:'packhunter', name:'Packhunter', rarity:'epic',      stats:'+4 ATK per allied Beast' },
  { id:'necrobound', name:'Necrobound', rarity:'rare',      stats:'Revives at 1 HP once' },
  { id:'feywild',   name:'Feywild',    rarity:'rare',      stats:'+5 MAG, +2 SPD, Fey synergy' },
  { id:'ancient',    name:'Ancient',    rarity:'legendary', stats:'Immune to first stun/sleep' },
  { id:'apex',       name:'Apex',       rarity:'mythic',    stats:'+20 to all stats, single-card' },
  { id:'dragonblood',name:'Dragon-blood',rarity:'legendary',stats:'+10 HP, +5 RES, +1 SPD' },
  { id:'sanguine',   name:'Sanguine',   rarity:'epic',      stats:'Lifesteal 15% (physical)' },
];

// Passives — curated subset of the 90+ in the engine. Categorised.
const PASSIVE_CATEGORIES = ['offense','defense','utility','aura','ward','weather','tribal','elemental'];
const PASSIVES = [
  { id:'regeneration',    name:'Regeneration',     cat:'defense',   desc:'Heals 5% max HP at the start of each turn.' },
  { id:'lifesteal',       name:'Lifesteal',        cat:'offense',   desc:'Heals for 25% of physical damage dealt.' },
  { id:'swift',           name:'Swift',            cat:'utility',   desc:'+1 SPD tier.' },
  { id:'tough',           name:'Tough',            cat:'defense',   desc:'+15% physical damage reduction.' },
  { id:'magicWard',       name:'Magic Ward',       cat:'ward',      desc:'+30% magical damage reduction.' },
  { id:'warlord',         name:'Warlord',          cat:'aura',      desc:'Allies gain +3 ATK while in 2-tile range.' },
  { id:'archmage',        name:'Archmage',         cat:'aura',      desc:'Allies gain +3 MAG while in 2-tile range.' },
  { id:'guardian',        name:'Guardian',         cat:'aura',      desc:'Intercepts 1 attack against adjacent ally per turn.' },
  { id:'inspire',         name:'Inspire',          cat:'aura',      desc:'Allies in range gain Strong on summon.' },
  { id:'venomous',        name:'Venomous',         cat:'offense',   desc:'Applies Poison on physical hit.' },
  { id:'bloodthirst',     name:'Bloodthirst',      cat:'offense',   desc:'+1 ATK stage on each kill (permanent).' },
  { id:'weatherSummoner', name:'Weather Summoner', cat:'weather',   desc:'Summons a weather of own element on entry.' },
  { id:'taunt',           name:'Taunt',            cat:'utility',   desc:'Forces enemy in range to attack this unit.' },
  { id:'physicalImmortal',name:'Physical Immortal',cat:'defense',   desc:'Immune to physical KO. Magic only.' },
  { id:'magicalImmortal', name:'Magical Immortal', cat:'defense',   desc:'Immune to magical KO. Physical only.' },
  { id:'physicalRetribution', name:'Physical Retribution', cat:'defense', desc:'Reflects 25% of physical damage taken.' },
  { id:'magicalRetribution',  name:'Magical Retribution',  cat:'defense', desc:'Reflects 25% of magical damage taken.' },
  { id:'sturdy',          name:'Sturdy',           cat:'defense',   desc:'Survives any single hit at 1 HP if at full HP.' },
  { id:'adaptability',    name:'Adaptability',     cat:'offense',   desc:'STAB raised from 1.5x → 1.75x on same-element moves.' },
  { id:'sneakAttack',     name:'Sneak Attack',     cat:'offense',   desc:'+50% damage from behind.' },
  { id:'geomancer',       name:'Geomancer',        cat:'utility',   desc:'Generates a Location tile beneath self on entry.' },
  { id:'xenoBond',        name:'Xeno-Bond',        cat:'tribal',    desc:'+5 to all stats per allied Alien.' },
  { id:'phoenixRebirth',  name:'Phoenix Rebirth',  cat:'defense',   desc:'On KO, revive at 50% HP. Once per match.' },
  { id:'rebirthShift',    name:'Rebirth Shift',    cat:'defense',   desc:'On KO, return as a 1-cost spirit token.' },
  { id:'raiseFromDead',   name:'Raise From Dead',  cat:'utility',   desc:'On entry, revive a fallen ally at 25% HP.' },
  // elemental wards
  { id:'wardFire',        name:'Ward of Fire',     cat:'ward',      desc:'Immune to Burn. -50% Fire damage.' },
  { id:'wardWater',       name:'Ward of Water',    cat:'ward',      desc:'Immune to Drown. -50% Water damage.' },
  { id:'wardShadow',      name:'Ward of Shadow',   cat:'ward',      desc:'-50% Shadow damage. +25% accuracy at night.' },
  { id:'wardBlood',       name:'Ward of Blood',    cat:'ward',      desc:'Immune to Bleed. -50% Blood damage.' },
  { id:'wardLight',       name:'Ward of Light',    cat:'ward',      desc:'Immune to Blind/Cursed. -50% Light damage.' },
  // faction wards
  { id:'wardVsWarrior',   name:'Vs Warrior',       cat:'ward',      desc:'-25% damage from Warrior faction.' },
  { id:'wardVsMage',      name:'Vs Mage',          cat:'ward',      desc:'-25% damage from Mage faction.' },
  { id:'wardVsBeast',     name:'Vs Beast',         cat:'ward',      desc:'-25% damage from Beast faction.' },
  { id:'wardVsUndead',    name:'Vs Undead',        cat:'ward',      desc:'-25% damage from Undead faction.' },
  // weather synergy
  { id:'solarFlare',      name:'Solar Flare',      cat:'weather',   desc:'+20% MAG in Sun. Burn duration +1.' },
  { id:'monsoonMight',    name:'Monsoon Might',    cat:'weather',   desc:'+20% ATK in Rain. Cleanses Burn.' },
  { id:'stormChannel',    name:'Storm Channel',    cat:'weather',   desc:'Storm grants +1 SPD and +15% crit.' },
  { id:'sandShroud',      name:'Sand Shroud',      cat:'weather',   desc:'In Sand, 25% ranged miss vs this unit.' },
  { id:'mistDancer',      name:'Mist Dancer',      cat:'weather',   desc:'In Mist, +1 tile movement and Stealth.' },
  { id:'eclipseLord',     name:'Eclipse Lord',     cat:'weather',   desc:'In Eclipse, Shadow moves are +50% damage.' },
  // tribal / aura
  { id:'warriorOath',     name:'Warrior Oath',     cat:'tribal',    desc:'+2 ATK per allied Warrior.' },
  { id:'arcaneBond',      name:'Arcane Bond',      cat:'tribal',    desc:'+2 MAG per allied Mage.' },
  { id:'packTactics',     name:'Pack Tactics',     cat:'tribal',    desc:'+10% crit per allied Beast.' },
  { id:'dragonsBoon',     name:'Dragon\'s Boon',   cat:'tribal',    desc:'+3 RES per allied Dragonkin.' },
  { id:'coldScales',      name:'Cold Scales',      cat:'tribal',    desc:'+2 DEF per allied Reptile.' },
];

// Move targets/types (engine vocabulary)
const MOVE_KINDS = ['Physical','Magical','Support','Field'];
const MOVE_TARGETS = ['Enemy','Ally','Self','All Enemies','All Allies','Tile','Line','Aura'];

// Moves — empty in production. Build your catalog in the Moves module.
const MOVES = [];

// Subclasses (faction-flavored hero specialisations)
const SUBCLASSES = [
  { id:'paladin',      faction:'warrior',     name:'Paladin',      desc:'Heavy ward, oath-binding moves.' },
  { id:'oathbreaker',  faction:'warrior',     name:'Oathbreaker',  desc:'Trades vows for raw ATK.' },
  { id:'archmage',     faction:'mage',        name:'Archmage',     desc:'MAG focus, area-of-effect spells.' },
  { id:'chronomancer', faction:'mage',        name:'Chronomancer', desc:'Slow/haste, doom timer mastery.' },
  { id:'shadowstalker',faction:'rogue',       name:'Shadowstalker',desc:'Stealth and assassinate.' },
  { id:'corsair',      faction:'pirate',      name:'Corsair',      desc:'Steal energy, boarding actions.' },
  { id:'lifeweaver',   name:'Lifeweaver',     faction:'fairy',     desc:'Healing + Photosynth synergy.' },
  { id:'voidherald',   name:'Voidherald',     faction:'eldritch',  desc:'Doom, unmake, name-burn.' },
];

// Kalon forms (built-in)
const KALON_FORMS = [
  { id:'goblinKing',     base:'goblin',     name:'Goblin King',     desc:'+50% stats, gains Inspire aura.' },
  { id:'orcChampion',    base:'orc',        name:'Orc Champion',    desc:'Berserker trait, +75% ATK, -2 SPD.' },
  { id:'alphaWolf',      base:'wolf',       name:'Alpha Wolf',      desc:'Pack Tactics aura, +1 SPD.' },
  { id:'archlich',       base:'lich',       name:'Archlich',        desc:'Raise From Dead each turn.' },
  { id:'infernoLord',    base:'imp',        name:'Inferno Lord',    desc:'Summons burning tiles. +50% MAG.' },
  { id:'broodmother',    base:'spider',     name:'Broodmother',     desc:'Generates Swarm tokens each turn.' },
];

Object.assign(window, {
  CARD_TYPES, STAT_KEYS, STATUSES, NATURES, TRAITS,
  PASSIVES, PASSIVE_CATEGORIES, MOVES, MOVE_KINDS, MOVE_TARGETS,
  SUBCLASSES, KALON_FORMS,
});
