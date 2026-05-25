// World data for Abraxas — Mythic Spellbook
// 21 elements + 40 factions from the live game export

const ELEMENTS = [
  { id:'fire',       name:'Fire',       icon:'🔥',  color:'#ff7755', strongVs:['nature','wind','ice','metal'] },
  { id:'water',      name:'Water',      icon:'💧',  color:'#5aa8ff', strongVs:['fire','earth','blood'] },
  { id:'earth',      name:'Earth',      icon:'🪨',  color:'#c89060', strongVs:['fire','storm','poison'] },
  { id:'wind',       name:'Wind',       icon:'🌬️', color:'#a8e0d8', strongVs:['earth','nature','poison'] },
  { id:'light',      name:'Light',      icon:'✨',  color:'#ffe66d', strongVs:['shadow','storm','void'] },
  { id:'shadow',     name:'Shadow',     icon:'🌑',  color:'#a878d4', strongVs:['light','nature','psychic'] },
  { id:'nature',     name:'Nature',     icon:'🌿',  color:'#6ad880', strongVs:['water','shadow','crystal'] },
  { id:'storm',      name:'Storm',      icon:'⚡',  color:'#9b8bff', strongVs:['water','wind','metal'] },
  { id:'ice',        name:'Ice',        icon:'❄️',  color:'#88ddee', strongVs:['nature','water','blood'] },
  { id:'metal',      name:'Metal',      icon:'⚙️',  color:'#aabbc8', strongVs:['earth','ice','crystal'] },
  { id:'poison',     name:'Poison',     icon:'☠️',  color:'#8e4eb5', strongVs:['nature','water','light'] },
  { id:'psychic',    name:'Psychic',    icon:'🧠',  color:'#ff77bb', strongVs:['poison','fire','void'] },
  { id:'arcane',     name:'Arcane',     icon:'🌟',  color:'#c9a5ff', strongVs:['shadow','ice','metal'] },
  { id:'void',       name:'Void',       icon:'⚫',  color:'#4a3a5a', strongVs:['psychic','arcane','crystal'] },
  { id:'blood',      name:'Blood',      icon:'🩸',  color:'#cc2a3a', strongVs:['light','ice','nature'] },
  { id:'crystal',    name:'Crystal',    icon:'💎',  color:'#b6d4ff', strongVs:['storm','fire','arcane'] },
  { id:'corruption', name:'Corruption', icon:'☣️',  color:'#6e8a30', strongVs:['nature','light','water'] },
  { id:'spirit',     name:'Spirit',     icon:'👻',  color:'#b8c8d8', strongVs:['metal','shadow','psychic'] },
  { id:'lava',       name:'Lava',       icon:'🌋',  color:'#d45a1c', strongVs:['ice','metal','nature'] },
  { id:'sound',      name:'Sound',      icon:'🔊',  color:'#7fc4e6', strongVs:['crystal','ice','psychic'] },
  { id:'gravity',    name:'Gravity',    icon:'🌌',  color:'#2e2a5a', strongVs:['wind','fire','spirit'] },
];

// Effectiveness: 2x if defender in attacker.strongVs (covers mutual); 0.5 if defender beats attacker only; 1 otherwise
const effectiveness = (aId, bId) => {
  const A = ELEMENTS.find(e=>e.id===aId), B = ELEMENTS.find(e=>e.id===bId);
  if(!A||!B||aId===bId) return 1;
  if(A.strongVs.includes(bId)) return 2;
  if(B.strongVs.includes(aId)) return 0.5;
  return 1;
};

const FACTIONS = [
  { id:'warrior',      name:'Warrior',      icon:'⚔️',  color:'#d4af37', desc:'Knights, soldiers, paladins, mortal fighters.' },
  { id:'mage',         name:'Mage',         icon:'🔮',  color:'#a070d9', desc:'Wizards, archmages, scholars, sorcerers.' },
  { id:'rogue',        name:'Rogue',        icon:'🗡️',  color:'#7d8590', desc:'Assassins, scouts, thieves, hunters.' },
  { id:'beast',        name:'Beast',        icon:'🐺',  color:'#8a6f4a', desc:'Wolves, bears, predators, four-legged animals.' },
  { id:'bird',         name:'Bird',         icon:'🦅',  color:'#6cb6f2', desc:'Hawks, owls, eagles, harpies — winged mortals.' },
  { id:'bug',          name:'Bug',          icon:'🕷️',  color:'#5b3a8a', desc:'Spiders, scarabs, beetles, insectoids.' },
  { id:'goblinoid',    name:'Goblinoid',    icon:'👹',  color:'#5eb37a', desc:'Goblins, orcs, hobgoblins, trolls.' },
  { id:'demon',        name:'Demon',        icon:'😈',  color:'#e85d3c', desc:'Fiends, devils, infernal lords.' },
  { id:'undead',       name:'Undead',       icon:'💀',  color:'#9aa0a6', desc:'Zombies, ghosts, liches, skeletons.' },
  { id:'elemental',    name:'Elemental',    icon:'🌀',  color:'#5da7b8', desc:'Fire/water/earth/air spirits, sentient nature.' },
  { id:'fairy',        name:'Fairy',        icon:'🧚',  color:'#f4a8d4', desc:'Sprites, pixies, fey, dryads.' },
  { id:'dragonkin',    name:'Dragonkin',    icon:'🐉',  color:'#d97a3a', desc:'Dragons, drakes, wyverns.' },
  { id:'construct',    name:'Construct',    icon:'🤖',  color:'#7a8aa0', desc:'Golems, automatons, magical machines.' },
  { id:'celestial',    name:'Celestial',    icon:'😇',  color:'#ffd166', desc:'Angels, seraphim, divine beings.' },
  { id:'plant',        name:'Plant',        icon:'🌿',  color:'#5eb37a', desc:'Treants, dryads, vines, shamblers.' },
  { id:'reptile',      name:'Reptile',      icon:'🦎',  color:'#3aa86b', desc:'Serpents, basilisks, lizardfolk.' },
  { id:'vampire',      name:'Vampire',      icon:'🧛',  color:'#9a2a3a', desc:'Aristocratic bloodfeeders, night-stalkers, sanguine lords.' },
  { id:'slime',        name:'Slime',        icon:'🟢',  color:'#7ed27b', desc:'Oozes, blobs, gelatinous engulfers.' },
  { id:'aquatic',      name:'Aquatic',      icon:'🐟',  color:'#4ab8d4', desc:'Merfolk, leviathans, deep-sea horrors, fish.' },
  { id:'giant',        name:'Giant',        icon:'🗿',  color:'#c8a878', desc:'Titans, ogres, colossi, mountain-folk.' },
  { id:'shapeshifter', name:'Shapeshifter', icon:'🦊',  color:'#e89060', desc:'Druids, kitsune, doppelgangers, were-beasts.' },
  { id:'eldritch',     name:'Eldritch',     icon:'🐙',  color:'#3d2a5a', desc:'Cosmic horrors, abyssal entities, otherworldly madness.' },
  { id:'artificer',    name:'Artificer',    icon:'🔧',  color:'#b08a4a', desc:'Inventors, tinkerers, machinists.' },
  { id:'necromancer',  name:'Necromancer',  icon:'☠️',  color:'#5a3a6a', desc:'Death magic wielders, plague-callers, bone-mages.' },
  { id:'samurai',      name:'Samurai',      icon:'🗾',  color:'#c83a3a', desc:'Honor-bound blade masters, ronin, shogun.' },
  { id:'pirate',       name:'Pirate',       icon:'🏴‍☠️', color:'#3a3a3a', desc:'Buccaneers, corsairs, sea-raiders.' },
  { id:'merchant',     name:'Merchant',     icon:'💰',  color:'#d4af37', desc:'Traders, guildmasters, golden-tongued negotiators.' },
  { id:'scholar',      name:'Scholar',      icon:'📚',  color:'#6c92d4', desc:'Sages, lorekeepers, runesmiths, archivists.' },
  { id:'soldier',      name:'Soldier',      icon:'🪖',  color:'#6c8a3a', desc:'Rank-and-file military, conscripts, foot legions.' },
  { id:'corrupted',    name:'Corrupted',    icon:'🦠',  color:'#6e8a30', desc:'Tainted beings, fallen heroes, infected by corruption.' },
  { id:'spirit_f',     name:'Spirit',       icon:'👻',  color:'#b8c8d8', desc:'Ghosts, wisps, ethereal echoes of the dead.' },
  { id:'berserker',    name:'Berserker',    icon:'🪓',  color:'#b03a2a', desc:'Rage-driven brutes, blood-frenzied warriors.' },
  { id:'monk',         name:'Monk',         icon:'🥋',  color:'#d4a86a', desc:'Martial artists, ascetics, disciplined ki-channelers.' },
  { id:'divine',       name:'Divine',       icon:'🌟',  color:'#ffe066', desc:'Gods, avatars, primordial deities above the celestial.' },
  { id:'cultist',      name:'Cultist',      icon:'🕯',  color:'#5a2a6a', desc:'Dark worshippers, ritualists, sacrificial fanatics.' },
  { id:'tribal',       name:'Tribal',       icon:'🪶',  color:'#a06a30', desc:'Primitive clans, shamans, hunter-gatherers.' },
  { id:'champion',     name:'Champion',     icon:'🏆',  color:'#d4af37', desc:'Tournament victors, legendary duelists, named heroes.' },
  { id:'swarm',        name:'Swarm',        icon:'🐜',  color:'#6a4a2a', desc:'Collective consciousnesses, hive-minds, locust clouds.' },
  { id:'alien',        name:'Alien',        icon:'👽',  color:'#7ad07a', desc:'Xenomorphs, parasites, things from beyond the stars. Carriers of the Infection.' },
];

const RARITIES = [
  { id:'common',    name:'Common',    color:'#9a8e6a' },
  { id:'uncommon',  name:'Uncommon',  color:'#7a9a52' },
  { id:'rare',      name:'Rare',      color:'#4a8aa8' },
  { id:'epic',      name:'Epic',      color:'#a48ad2' },
  { id:'legendary', name:'Legendary', color:'#e6c068' },
  { id:'mythic',    name:'Mythic',    color:'#d35a3a' },
];

// Design-side mechanical systems ported from the live game (game-deploy/public/index.html).
// These let card designers specify the behavioral wiring of a card.

const TRIGGERS = [
  { id:'on_play',       name:'On Play',         icon:'▶',  desc:'Resolves the moment the card enters play.' },
  { id:'on_summon',     name:'On Summon',       icon:'✨', desc:'Triggers when a unit is summoned from any zone.' },
  { id:'on_death',      name:'On Death',        icon:'💀', desc:'Resolves when the source is destroyed or sent to the graveyard.' },
  { id:'on_attack',     name:'On Attack',       icon:'⚔️', desc:'Triggers when the source declares an attack.' },
  { id:'on_damage',     name:'On Damage Taken', icon:'🩸', desc:'Triggers when the source takes damage.' },
  { id:'on_heal',       name:'On Heal',         icon:'➕', desc:'Triggers when the source is healed.' },
  { id:'start_of_turn', name:'Start of Turn',   icon:'🌅', desc:"Resolves at the start of the owner's turn." },
  { id:'end_of_turn',   name:'End of Turn',     icon:'🌃', desc:"Resolves at the end of the owner's turn." },
  { id:'on_cast',       name:'On Cast',         icon:'🌀', desc:'Triggers when a spell is cast.' },
  { id:'on_discard',    name:'On Discard',      icon:'🗑', desc:'Triggers when the card is discarded.' },
  { id:'passive',       name:'Passive',         icon:'∞',  desc:'Always active while in the listed zone.' },
];

const ZONES = [
  { id:'play',      name:'In Play',   icon:'🟢', desc:'Active on the battlefield.' },
  { id:'hand',      name:'In Hand',   icon:'🃏', desc:"Held in the owner's hand." },
  { id:'deck',      name:'In Deck',   icon:'📚', desc:'Inside the library before being drawn.' },
  { id:'graveyard', name:'Graveyard', icon:'⚰️', desc:'Destroyed or discarded.' },
  { id:'exile',     name:'Exile',     icon:'🌌', desc:'Removed from the game.' },
  { id:'spellbook', name:'Spellbook', icon:'📖', desc:'Sideboard / reserve pool.' },
];

const TIERS = [
  { id:'t1', name:'Tier I',   power:1, color:'#9a8e6a', desc:'Starter / common power band.' },
  { id:'t2', name:'Tier II',  power:2, color:'#7a9a52', desc:'Reliable mid-range.' },
  { id:'t3', name:'Tier III', power:3, color:'#4a8aa8', desc:'Strong, format-defining.' },
  { id:'t4', name:'Tier IV',  power:4, color:'#a48ad2', desc:'Tournament staple.' },
  { id:'t5', name:'Tier V',   power:5, color:'#e6c068', desc:'Apex / banned-list candidates.' },
];

const CARD_TYPES_LEGACY = ['Spell','Unit','Relic','Hero','Location'];

// Cards — empty in production. Use the Card Forge to create.
const CARDS = [];

const HEROES = [];

const LINEAGE = {
  root: 'g0',
  nodes: {
    g0: { name:'Founder', role:'(role)', born:'', died:null, glyph:'?', children:[] },
  },
};

const TIMELINE = [];

const ACTIVITY = [];

Object.assign(window, { ELEMENTS, FACTIONS, RARITIES, TRIGGERS, ZONES, TIERS, CARD_TYPES_LEGACY, CARDS, HEROES, LINEAGE, TIMELINE, ACTIVITY, effectiveness });
