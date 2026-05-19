// Resources — every craftable/lootable in the game, with category, tier, and purpose.
// Editable, CRUD, persists. Athena can suggest recipes / crafts using these.

const RESOURCE_CATEGORIES = [
  { id:'core',     name:'Core Survival',      icon:'🍞', color:'#c9a14a',
    desc:'Constantly needed for camps, systems, and world events.' },
  { id:'biomut',   name:'Biological & Mutation', icon:'🧬', color:'#7a9a52',
    desc:'Evolution, cloning, experiments, SCP systems, advanced survivor upgrades.' },
  { id:'scp',      name:'SCP / Anomaly',      icon:'⚠️', color:'#a878d4',
    desc:'Dangerous and highly valuable. Forbidden crafting.' },
  { id:'camp',     name:'Camp & Industrial',  icon:'🏗', color:'#7d8590',
    desc:'Maintaining large camps and infrastructure.' },
  { id:'trade',    name:'Trade & Black Market', icon:'💰', color:'#d4a86a',
    desc:'Economy-focused — currency, contracts, smuggling.' },
  { id:'event',    name:'Rare Event',         icon:'★', color:'#d2b8ff',
    desc:'Appears during world events or legendary encounters.' },
];

const RESOURCE_TIERS = [
  { id:'1', name:'Tier 1 · Essential',  color:'#7a9a52' },
  { id:'2', name:'Tier 2 · Valuable',   color:'#c9a14a' },
  { id:'3', name:'Tier 3 · High-end',   color:'#a878d4' },
  { id:'4', name:'Tier 4 · Legendary',  color:'#cc2a3a' },
];

// Default seed — full canonical resource set from the design doc
window.RESOURCES = window.RESOURCES || [
  // CORE SURVIVAL
  { id:'food',                  name:'Food',                  icon:'🍞', category:'core',   tier:'1', purpose:'Feeds survivors, prevents morale loss, supports camp growth' },
  { id:'food-supplies',         name:'Food Supplies',         icon:'🥫', category:'core',   tier:'1', purpose:'Preserved stockpiles for extended operations and siege scenarios' },
  { id:'military-rations',      name:'Military Rations',      icon:'🥡', category:'core',   tier:'2', purpose:'High-calorie field rations for combat units and expeditions' },
  { id:'water',                 name:'Water',                 icon:'💧', category:'core',   tier:'1', purpose:'Hydration, farming, medical use, camp sustainability' },
  { id:'purified-water',        name:'Purified Water',        icon:'🚰', category:'core',   tier:'2', purpose:'Safe for medical use, brewing, and advanced lab procedures' },
  { id:'water-supplies',        name:'Water Supplies',        icon:'🪣', category:'core',   tier:'1', purpose:'Bulk water reserves for camp systems and irrigation' },
  { id:'medicine',              name:'Medicine',              icon:'💊', category:'core',   tier:'1', purpose:'Healing injuries, curing infection, reviving survivors' },
  { id:'medical-supplies',      name:'Medical Supplies',      icon:'🩹', category:'core',   tier:'1', purpose:'Bandages, antiseptics, field surgery kits' },
  { id:'supplies',              name:'Supplies',              icon:'📦', category:'core',   tier:'1', purpose:'Generic crafting, repairs, camp operations' },
  { id:'camp-supplies',         name:'Camp Supplies',         icon:'🏕', category:'core',   tier:'1', purpose:'Tents, tools, and basic equipment for establishing camps' },
  { id:'supply-crates',         name:'Supply Crates',         icon:'📫', category:'core',   tier:'2', purpose:'Sealed bulk supplies dropped by convoys or airlifts' },
  { id:'survival-gear',         name:'Survival Gear',         icon:'🎒', category:'core',   tier:'2', purpose:'Multi-purpose field equipment for hostile-zone operations' },
  { id:'fuel',                  name:'Fuel',                  icon:'⛽', category:'core',   tier:'1', purpose:'Powers generators, vehicles, drones, labs' },
  { id:'ammo',                  name:'Ammo',                  icon:'🔫', category:'core',   tier:'1', purpose:'Firearms, turrets, defense systems' },
  { id:'ammunition',            name:'Ammunition',            icon:'🪖', category:'core',   tier:'1', purpose:'Standardized rounds for military-grade weapons and defense emplacements' },
  { id:'metal',                 name:'Metal',                 icon:'⚙', category:'core',   tier:'1', purpose:'Construction, weapons, camp upgrades' },
  { id:'scrap-metal',           name:'Scrap Metal',           icon:'🔩', category:'core',   tier:'1', purpose:'Raw salvaged metal for quick repairs and improvised crafting' },
  { id:'wood',                  name:'Wood',                  icon:'🪵', category:'core',   tier:'1', purpose:'Barricades, camp expansion, crafting' },
  { id:'stone',                 name:'Stone',                 icon:'🪨', category:'core',   tier:'1', purpose:'Foundations, walls, and heavy fortifications' },
  { id:'cloth',                 name:'Cloth',                 icon:'🎀', category:'core',   tier:'1', purpose:'Basic armor padding, bandages, and shelter material' },
  { id:'leather',               name:'Leather',               icon:'🦺', category:'core',   tier:'1', purpose:'Durable armor crafting and equipment strapping' },
  { id:'fabric',                name:'Fabric',                icon:'🧵', category:'core',   tier:'1', purpose:'Armor, medical wraps, survivor gear' },
  { id:'electronics',           name:'Electronics',           icon:'🔌', category:'core',   tier:'2', purpose:'Drones, scanners, advanced crafting' },
  { id:'batteries',             name:'Batteries',             icon:'🔋', category:'core',   tier:'2', purpose:'Portable power, field devices, robotics' },
  { id:'battery-cells',         name:'Battery Cells',         icon:'⚡', category:'core',   tier:'2', purpose:'High-capacity power cells for energy weapons and vehicles' },
  { id:'power-cells',           name:'Power Cells',           icon:'🔆', category:'core',   tier:'2', purpose:'Universal power source for camps, systems, and special gear' },
  { id:'energy-gel',            name:'Energy Gel',            icon:'💉', category:'core',   tier:'2', purpose:'Rapid energy source for survivors and power-hungry devices' },
  { id:'seeds',                 name:'Seeds',                 icon:'🌱', category:'core',   tier:'1', purpose:'Farming, resource generation, and ecosystem restoration' },
  { id:'fertilizer',            name:'Fertilizer',            icon:'🌿', category:'core',   tier:'1', purpose:'Boosts crop yield and accelerates biological growth systems' },
  { id:'tool-kits',             name:'Tool Kits',             icon:'🔧', category:'core',   tier:'1', purpose:'Essential tools for construction, salvage, and field repairs' },
  { id:'repair-kits',           name:'Repair Kits',           icon:'🛠', category:'core',   tier:'1', purpose:'Field repair of weapons, armor, and camp structures' },

  // BIO + MUTATION
  { id:'dna',                   name:'DNA',                   icon:'🧬', category:'biomut', tier:'2', purpose:'Cloning, fusion, evolution, genetic crafting' },
  { id:'bio-matter',            name:'Bio Matter',            icon:'🫧', category:'biomut', tier:'1', purpose:'Raw organic material harvested from creatures and zones' },
  { id:'mutation-strands',      name:'Mutation Strands',      icon:'🔀', category:'biomut', tier:'2', purpose:'Drives mutation upgrades and genetic divergence crafting' },
  { id:'mutant-organs',         name:'Mutant Organs',         icon:'🫀', category:'biomut', tier:'2', purpose:'Advanced biological upgrades and dark crafting' },
  { id:'bio-samples',           name:'Bio Samples',           icon:'🧪', category:'biomut', tier:'2', purpose:'Lab research and mutation studies' },
  { id:'blood-samples',         name:'Blood Samples',         icon:'🩸', category:'biomut', tier:'2', purpose:'Medical testing, infection analysis' },
  { id:'corrupted-blood',       name:'Corrupted Blood',       icon:'🫀', category:'biomut', tier:'3', purpose:'Dark mutation crafting and infection-based upgrade systems' },
  { id:'neural-tissue',         name:'Neural Tissue',         icon:'🧠', category:'biomut', tier:'2', purpose:'AI-linked units and memory extraction' },
  { id:'neural-gel',            name:'Neural Gel',            icon:'💊', category:'biomut', tier:'3', purpose:'Neural enhancement, memory implants, and AI calibration fluid' },
  { id:'bone-fragments',        name:'Bone Fragments',        icon:'🦴', category:'biomut', tier:'2', purpose:'Dark crafting and relic fusion' },
  { id:'toxic-spores',          name:'Toxic Spores',          icon:'☣️', category:'biomut', tier:'2', purpose:'Poison crafting and contamination events' },
  { id:'toxic-waste',           name:'Toxic Waste',           icon:'🧫', category:'biomut', tier:'2', purpose:'Industrial byproduct used in chemical weapons and hazard zones' },
  { id:'medical-herbs',         name:'Medical Herbs',         icon:'🌿', category:'biomut', tier:'1', purpose:'Natural remedies, potion brewing, and infection treatment' },
  { id:'plant-spores',          name:'Plant Spores',          icon:'🍃', category:'biomut', tier:'1', purpose:'Rapid-growth farming accelerant and biological trap material' },
  { id:'fungal-samples',        name:'Fungal Samples',        icon:'🍄', category:'biomut', tier:'2', purpose:'Mycological research, spore bombs, and adaptive organism studies' },
  { id:'virus-samples',         name:'Virus Samples',         icon:'🦠', category:'biomut', tier:'3', purpose:'Weaponized biological agents and immunity research' },
  { id:'creature-eggs',         name:'Creature Eggs',         icon:'🥚', category:'biomut', tier:'2', purpose:'Creature taming, biological research, and rare unit spawning' },
  { id:'monster-hide',          name:'Monster Hide',          icon:'🐉', category:'biomut', tier:'1', purpose:'Heavy-duty armor crafting from apex creature skin' },
  { id:'beast-hearts',          name:'Beast Hearts',          icon:'❤️', category:'biomut', tier:'3', purpose:'Powering beast-fusion upgrades and rare consumables' },
  { id:'demon-flesh',           name:'Demon Flesh',           icon:'👹', category:'biomut', tier:'3', purpose:'Forbidden crafting ingredient — fuels dark upgrade trees' },
  { id:'synthetic-organs',      name:'Synthetic Organs',      icon:'🤖', category:'biomut', tier:'3', purpose:'Cybernetic grafting and survivor enhancement systems' },

  // SCP / ANOMALY
  { id:'corrupted-essence',     name:'Corrupted Essence',     icon:'🦠', category:'scp',    tier:'2', purpose:'Mutation systems, cursed upgrades, forbidden crafting' },
  { id:'corrupted-artifacts',   name:'Corrupted Artifacts',   icon:'⚗️', category:'scp',    tier:'3', purpose:'Dangerous relics that destabilize reality around them' },
  { id:'memory-shards',         name:'Memory Shards',         icon:'💠', category:'scp',    tier:'2', purpose:'Skill transfer, lore unlocks, revive systems' },
  { id:'memory-echoes',         name:'Memory Echoes',         icon:'💭', category:'scp',    tier:'2', purpose:'Recovered ghost-data from deceased survivors and entities' },
  { id:'relic-shards',          name:'Relic Shards',          icon:'❖',  category:'scp',    tier:'2', purpose:'Crafting relic weapons and artifacts' },
  { id:'relic-fragments',       name:'Relic Fragments',       icon:'🔮', category:'scp',    tier:'2', purpose:'Fragmented relic pieces — combine for full relic crafting' },
  { id:'relic-dust',            name:'Relic Dust',            icon:'✨', category:'scp',    tier:'2', purpose:'Residual energy from destroyed relics — used in enhancement' },
  { id:'demon-cores',           name:'Demon Cores',           icon:'🔴', category:'scp',    tier:'3', purpose:'Infernal power source extracted from demon-tier entities' },
  { id:'ether-crystals',        name:'Ether Crystals',        icon:'🔷', category:'scp',    tier:'3', purpose:'Condensed ambient energy — powers anomaly-based systems' },
  { id:'anomaly-essence',       name:'Anomaly Essence',       icon:'🌀', category:'scp',    tier:'3', purpose:'Pure distilled anomaly energy for high-tier crafting' },
  { id:'anomaly-cores',         name:'Anomaly Cores',         icon:'🌀', category:'scp',    tier:'3', purpose:'High-tier crafting and dimensional systems' },
  { id:'soul-energy',           name:'Soul Energy',           icon:'👻', category:'scp',    tier:'3', purpose:'Harvested from fallen entities — fuels resurrection and spirit systems' },
  { id:'quantum-dust',          name:'Quantum Dust',          icon:'🌟', category:'scp',    tier:'3', purpose:'Subatomic anomalous material enabling probability manipulation' },
  { id:'chaos-fragments',       name:'Chaos Fragments',       icon:'💥', category:'scp',    tier:'3', purpose:'Raw instability crystallized — unpredictable but powerful' },
  { id:'void-fragments',        name:'Void Fragments',        icon:'⚫', category:'scp',    tier:'3', purpose:'Reality-based crafting and unstable powers' },
  { id:'void-residue',          name:'Void Residue',          icon:'🕳', category:'scp',    tier:'3', purpose:'Leakage from void rifts — used in dimensional weaponry' },
  { id:'kalon-fragments',       name:'Kalon Fragments',       icon:'⟁',  category:'scp',    tier:'3', purpose:'Kalon upgrades and evolution systems' },
  { id:'shadow-essence',        name:'Shadow Essence',        icon:'🌑', category:'scp',    tier:'3', purpose:'Condensed shadow energy from darkzone entities' },
  { id:'spirit-ashes',          name:'Spirit Ashes',          icon:'💨', category:'scp',    tier:'3', purpose:'Remains of spiritual entities — used in ghost-tier crafting' },
  { id:'phantom-dust',          name:'Phantom Dust',          icon:'🫥', category:'scp',    tier:'3', purpose:'Intangibility agent harvested from phase-shifted creatures' },
  { id:'nightmare-fuel',        name:'Nightmare Fuel',        icon:'😨', category:'scp',    tier:'3', purpose:'Psychic energy extracted from fear-based anomalies' },
  { id:'nanite-clusters',       name:'Nanite Clusters',       icon:'🔬', category:'scp',    tier:'3', purpose:'Self-replicating nanomachines for automated repair and assault' },
  { id:'holo-shards',           name:'Holo Shards',           icon:'🪩', category:'scp',    tier:'3', purpose:'Light-refracting anomalous crystals used in illusion systems' },
  { id:'ancient-bones',         name:'Ancient Bones',         icon:'💀', category:'scp',    tier:'3', purpose:'Pre-collapse remains imbued with anomalous resonance' },
  { id:'radioactive-material',  name:'Radioactive Material',  icon:'☢️', category:'scp',    tier:'3', purpose:'Hazardous isotopes — essential for high-yield weapon crafting' },
  { id:'containment-cells',     name:'Containment Cells',     icon:'⬜', category:'scp',    tier:'3', purpose:'Specialized chambers for storing anomalous entities and samples' },
  { id:'containment-fluid',     name:'Containment Fluid',     icon:'🧴', category:'scp',    tier:'3', purpose:'Chemical medium that neutralizes and preserves anomalous matter' },
  { id:'crystal-dust',          name:'Crystal Dust',          icon:'💎', category:'scp',    tier:'2', purpose:'Pulverized anomalous crystal used as a crafting reagent' },
  { id:'dimensional-shards',    name:'Dimensional Shards',    icon:'💠', category:'scp',    tier:'4', purpose:'Fragments of collapsed dimensions — enables portal and rift systems' },
  { id:'gravity-stones',        name:'Gravity Stones',        icon:'🪨', category:'scp',    tier:'3', purpose:'Anomalous stones that warp local gravity fields' },
  { id:'time-fragments',        name:'Time Fragments',        icon:'⏳', category:'scp',    tier:'4', purpose:'Crystallized temporal energy — used in timeline manipulation' },
  { id:'scp-samples',           name:'SCP Samples',           icon:'⚠️', category:'scp',    tier:'4', purpose:'Classified samples from high-threat anomalous entities' },
  { id:'dark-matter',           name:'Dark Matter',           icon:'🌌', category:'scp',    tier:'4', purpose:'Endgame crafting and legendary upgrades' },
  { id:'echo-dust',             name:'Echo Dust',             icon:'👻', category:'scp',    tier:'3', purpose:'Ghost units and memory reconstruction' },

  // CAMP + INDUSTRIAL
  { id:'concrete',              name:'Concrete',              icon:'🧱', category:'camp',   tier:'1', purpose:'Heavy structures and fortifications' },
  { id:'reinforced-concrete',   name:'Reinforced Concrete',   icon:'🏗', category:'camp',   tier:'2', purpose:'Advanced structural builds able to withstand heavy bombardment' },
  { id:'iron-ore',              name:'Iron Ore',              icon:'⛏', category:'camp',   tier:'1', purpose:'Raw smelting material for weapons, tools, and construction' },
  { id:'steel-plates',          name:'Steel Plates',          icon:'🛡', category:'camp',   tier:'2', purpose:'Reinforced buildings and armored units' },
  { id:'steel-plating',         name:'Steel Plating',         icon:'⬜', category:'camp',   tier:'2', purpose:'Hull reinforcement for vehicles and heavy defensive structures' },
  { id:'carbon-fiber',          name:'Carbon Fiber',          icon:'⬛', category:'camp',   tier:'3', purpose:'Lightweight high-strength material for advanced armor and vehicles' },
  { id:'titan-alloy',           name:'Titan Alloy',           icon:'🔩', category:'camp',   tier:'4', purpose:'Endgame-grade super-material for legendary equipment crafting' },
  { id:'nano-fiber',            name:'Nano Fiber',            icon:'🕸', category:'camp',   tier:'3', purpose:'Microscale weave for stealth suits and energy-dispersal armor' },
  { id:'circuit-boards',        name:'Circuit Boards',        icon:'🖥', category:'camp',   tier:'2', purpose:'Advanced electronics and AI systems' },
  { id:'mechanical-parts',      name:'Mechanical Parts',      icon:'⚙', category:'camp',   tier:'2', purpose:'Vehicles, generators, turrets' },
  { id:'mechanical-limbs',      name:'Mechanical Limbs',      icon:'🦾', category:'camp',   tier:'3', purpose:'Prosthetics, combat exoskeletons, and heavy-load attachments' },
  { id:'copper-wiring',         name:'Copper Wiring',         icon:'🧰', category:'camp',   tier:'1', purpose:'Camp power systems' },
  { id:'chemicals',             name:'Chemicals',             icon:'⚗️', category:'camp',   tier:'2', purpose:'Industrial reactions, explosives, and material processing' },
  { id:'glass-shards',          name:'Glass Shards',          icon:'🪟', category:'camp',   tier:'1', purpose:'Optics, lenses, containment barriers, and improvised weapons' },
  { id:'plastic-components',    name:'Plastic Components',    icon:'📎', category:'camp',   tier:'1', purpose:'Lightweight housing for devices, tubing, and camp utilities' },
  { id:'gasoline',              name:'Gasoline',              icon:'⛽', category:'camp',   tier:'1', purpose:'Vehicles and heavy machinery' },
  { id:'ether-fuel',            name:'Ether Fuel',            icon:'🌫', category:'camp',   tier:'3', purpose:'Advanced propellant for anomaly-class vehicles and reactors' },
  { id:'solar-cells',           name:'Solar Cells',           icon:'☀', category:'camp',   tier:'2', purpose:'Renewable camp energy' },
  { id:'wind-turbine-parts',    name:'Wind Turbine Parts',    icon:'💨', category:'camp',   tier:'2', purpose:'Off-grid wind power generation for remote camps' },
  { id:'hydro-cores',           name:'Hydro Cores',           icon:'🌊', category:'camp',   tier:'2', purpose:'Water-powered energy generation and purification systems' },
  { id:'heat-cores',            name:'Heat Cores',            icon:'🔥', category:'camp',   tier:'3', purpose:'Thermal energy storage for forges and high-heat crafting' },
  { id:'cooling-units',         name:'Cooling Units',         icon:'❄️', category:'camp',   tier:'2', purpose:'Thermal regulation for reactors, cryo-storage, and labs' },
  { id:'reactor-components',    name:'Reactor Components',    icon:'⚛️', category:'camp',   tier:'3', purpose:'Core parts for building power reactors and energy grids' },
  { id:'generator-parts',       name:'Generator Parts',       icon:'🔌', category:'camp',   tier:'2', purpose:'Repair and construction of camp power generators' },
  { id:'salvaged-tech',         name:'Salvaged Tech',         icon:'📱', category:'camp',   tier:'2', purpose:'Pre-collapse technology repurposed for camp upgrades' },
  { id:'ai-chips',              name:'AI Chips',              icon:'💻', category:'camp',   tier:'3', purpose:'Powers autonomous systems, smart turrets, and tactical AI units' },
  { id:'drone-parts',           name:'Drone Parts',           icon:'🚁', category:'camp',   tier:'2', purpose:'Assembly and repair of surveillance and combat drones' },
  { id:'drone-batteries',       name:'Drone Batteries',       icon:'🔋', category:'camp',   tier:'2', purpose:'Extended-flight power packs for all drone classes' },
  { id:'weapon-parts',          name:'Weapon Parts',          icon:'🔫', category:'camp',   tier:'2', purpose:'Components for weapon assembly, upgrades, and field modification' },
  { id:'armor-fragments',       name:'Armor Fragments',       icon:'🛡', category:'camp',   tier:'2', purpose:'Salvaged plating used to reinforce existing armor sets' },
  { id:'tactical-equipment',    name:'Tactical Equipment',    icon:'🎖', category:'camp',   tier:'2', purpose:'Specialized combat gear for elite units and operations' },
  { id:'signal-transmitters',   name:'Signal Transmitters',   icon:'📡', category:'camp',   tier:'2', purpose:'Communications infrastructure and long-range coordination' },
  { id:'radar-components',      name:'Radar Components',      icon:'🔭', category:'camp',   tier:'2', purpose:'Detection systems for enemy tracking and zone mapping' },
  { id:'security-modules',      name:'Security Modules',      icon:'🔒', category:'camp',   tier:'3', purpose:'Camp defense AI, access control, and perimeter alarm systems' },
  { id:'beacon-parts',          name:'Beacon Parts',          icon:'🔦', category:'camp',   tier:'2', purpose:'Navigation beacons, distress signals, and rally-point markers' },
  { id:'fusion-materials',      name:'Fusion Materials',      icon:'⚡', category:'camp',   tier:'3', purpose:'Exotic compounds enabling matter-fusion crafting systems' },
  { id:'plasma-cells',          name:'Plasma Cells',          icon:'🔆', category:'camp',   tier:'3', purpose:'Superheated plasma containers for energy weapons and cutting tools' },
  { id:'plasma-ore',            name:'Plasma Ore',            icon:'💫', category:'camp',   tier:'3', purpose:'Raw plasma-infused mineral smelted into high-energy components' },
  { id:'energy-cubes',          name:'Energy Cubes',          icon:'🟧', category:'camp',   tier:'3', purpose:'Compact high-density energy storage for advanced camp systems' },
  { id:'weather-batteries',     name:'Weather Batteries',     icon:'🌩', category:'camp',   tier:'2', purpose:'Atmospheric energy harvesters — convert storm energy to power' },
  { id:'reinforced-concrete-2', name:'Construction Materials',icon:'🔨', category:'camp',   tier:'1', purpose:'Bulk material bundles for rapid base building' },
  { id:'memory-chips',          name:'Memory Chips',          icon:'💾', category:'camp',   tier:'2', purpose:'Data storage and AI programming for automated camp systems' },
  { id:'cybernetic-parts',      name:'Cybernetic Parts',      icon:'🤖', category:'camp',   tier:'3', purpose:'Augmentation components for cyborg survivors and mech builds' },
  { id:'excavation-tools',      name:'Excavation Tools',      icon:'⛏', category:'camp',   tier:'1', purpose:'Digging, tunneling, and buried supply extraction' },
  { id:'mining-charges',        name:'Mining Charges',        icon:'💣', category:'camp',   tier:'2', purpose:'Controlled explosive blasting for resource extraction' },
  { id:'rare-minerals',         name:'Rare Minerals',         icon:'💎', category:'camp',   tier:'3', purpose:'High-purity mineral deposits used in precision crafting' },

  // TRADE + BLACK MARKET
  { id:'credits',               name:'Credits',               icon:'💵', category:'trade',  tier:'1', purpose:'Standard market currency' },
  { id:'camp-tokens',           name:'Camp Tokens',           icon:'🎫', category:'trade',  tier:'1', purpose:'Local currency used within camp economies and markets' },
  { id:'survivor-tags',         name:'Survivor Tags',         icon:'🏷', category:'trade',  tier:'1', purpose:'ID markers used to track and register survivor status' },
  { id:'black-market-tokens',   name:'Black Market Tokens',   icon:'🎟', category:'trade',  tier:'2', purpose:'Underground market currency' },
  { id:'ancient-coins',         name:'Ancient Coins',         icon:'🪙', category:'trade',  tier:'2', purpose:'Pre-collapse currency accepted by factions and black markets' },
  { id:'gold-bars',             name:'Gold Bars',             icon:'🥇', category:'trade',  tier:'3', purpose:'High-value universal commodity — accepted everywhere' },
  { id:'silver-fragments',      name:'Silver Fragments',      icon:'🪙', category:'trade',  tier:'2', purpose:'Valuable metal fragments used in trade and light crafting' },
  { id:'contraband',            name:'Contraband',            icon:'📦', category:'trade',  tier:'3', purpose:'Rare black market trade goods' },
  { id:'trade-goods',           name:'Trade Goods',           icon:'💼', category:'trade',  tier:'2', purpose:'General commodities for faction trading and diplomacy' },
  { id:'intel-files',           name:'Intel Files',           icon:'📡', category:'trade',  tier:'2', purpose:'Missions, contracts, hidden zones' },
  { id:'research-data',         name:'Research Data',         icon:'📊', category:'trade',  tier:'2', purpose:'Scientific findings tradeable to labs and research factions' },
  { id:'ancient-data-drives',   name:'Ancient Data Drives',   icon:'💿', category:'trade',  tier:'2', purpose:'Pre-collapse hard drives containing schematics, maps, or intel' },
  { id:'data-fragments',        name:'Data Fragments',        icon:'📀', category:'trade',  tier:'2', purpose:'Partial encrypted data recovered from terminals and ruins' },
  { id:'encrypted-data',        name:'Encrypted Data',        icon:'🔐', category:'trade',  tier:'3', purpose:'AI research and advanced crafting' },
  { id:'tactical-intel',        name:'Tactical Intel',        icon:'📋', category:'trade',  tier:'2', purpose:'Enemy positions, supply routes, and faction movement data' },
  { id:'blueprint-pages',       name:'Blueprint Pages',       icon:'📜', category:'trade',  tier:'2', purpose:'Partial schematics that unlock crafting recipes when completed' },
  { id:'crafting-schematics',   name:'Crafting Schematics',   icon:'📐', category:'trade',  tier:'3', purpose:'Complete engineering plans for advanced equipment and structures' },
  { id:'survivor-manuals',      name:'Survivor Manuals',      icon:'📚', category:'trade',  tier:'2', purpose:'Skill guides for training survivors in specialized disciplines' },
  { id:'forgery-kits',          name:'Forgery Kits',          icon:'📝', category:'trade',  tier:'2', purpose:'Smuggling and fake identities' },
  { id:'bunker-keys',           name:'Bunker Keys',           icon:'🔑', category:'trade',  tier:'3', purpose:'Access codes and physical keys to locked pre-collapse bunkers' },
  { id:'loot-keys',             name:'Loot Keys',             icon:'🗝', category:'trade',  tier:'2', purpose:'Unlock sealed caches, safes, and locked expedition containers' },
  { id:'vault-codes',           name:'Vault Codes',           icon:'🔏', category:'trade',  tier:'3', purpose:'Digital and physical credentials to access high-security vaults' },
  { id:'expedition-maps',       name:'Expedition Maps',       icon:'🗺', category:'trade',  tier:'2', purpose:'Charted routes to resource zones, ruins, and faction territories' },

  // RARE EVENT
  { id:'ancient-tome',          name:'Ancient Tome',          icon:'📖', category:'event',  tier:'3', purpose:'Unlocks rare abilities and lore' },
  { id:'world-seeds',           name:'World Seeds',           icon:'🌱', category:'event',  tier:'4', purpose:'Legendary crafting and world systems' },
  { id:'dimensional-crystals',  name:'Dimensional Crystals',  icon:'💎', category:'event',  tier:'4', purpose:'Portal systems and endgame upgrades' },
  { id:'hero-shards',           name:'Hero Shards',           icon:'⭐', category:'event',  tier:'4', purpose:'Fragments of a hero essence — used to summon or evolve hero units' },
  { id:'mythic-essence',        name:'Mythic Essence',        icon:'✨', category:'event',  tier:'4', purpose:'The rarest condensed power — required for mythic-tier crafting' },
  { id:'divine-sigils',         name:'Divine Sigils',         icon:'✝', category:'event',  tier:'4', purpose:'Sacred marks of divine origin — powers celestial upgrade trees' },
  { id:'angel-feathers',        name:'Angel Feathers',        icon:'🪶', category:'event',  tier:'4', purpose:'Extremely rare — used in blessed armor and resurrection rituals' },
  { id:'phoenix-ash',           name:'Phoenix Ash',           icon:'🔥', category:'event',  tier:'4', purpose:'Resurrection crafting' },
  { id:'frozen-hearts',         name:'Frozen Hearts',         icon:'❄', category:'event',  tier:'3', purpose:'Cryo crafting and frost mutations' },
  { id:'frozen-cores',          name:'Frozen Cores',          icon:'🧊', category:'event',  tier:'3', purpose:'Solid energy cores from cryo-zones — power ice-class systems' },
  { id:'living-flame',          name:'Living Flame',          icon:'🌋', category:'event',  tier:'3', purpose:'Fire upgrades and destruction builds' },
  { id:'lava-fragments',        name:'Lava Fragments',        icon:'🌋', category:'event',  tier:'3', purpose:'Solidified magma chunks imbued with volcanic energy' },
  { id:'fire-salts',            name:'Fire Salts',            icon:'🧂', category:'event',  tier:'2', purpose:'Accelerant used in fire-based crafting and weapon coating' },
  { id:'ice-crystals',          name:'Ice Crystals',          icon:'💠', category:'event',  tier:'2', purpose:'Cryo-mineral used in cold-weapon crafting and medical stasis' },
  { id:'storm-essence',         name:'Storm Essence',         icon:'⛈', category:'event',  tier:'3', purpose:'Atmospheric anomalous charge — powers storm-class abilities' },
  { id:'earth-shards',          name:'Earth Shards',          icon:'🪨', category:'event',  tier:'2', purpose:'Geomantic crystal fragments used in earth-affinity crafting' },
  { id:'nature-bloom',          name:'Nature Bloom',          icon:'🌸', category:'event',  tier:'3', purpose:'Rare blossom of anomalous origin — heals and empowers nature builds' },
  { id:'light-essence',         name:'Light Essence',         icon:'☀', category:'event',  tier:'3', purpose:'Purified radiant energy — counters shadow and powers holy systems' },
  { id:'light-cores',           name:'Light Cores',           icon:'💡', category:'event',  tier:'3', purpose:'Contained photonic cores for beacon systems and light-based weapons' },
  { id:'anomaly-essence-event', name:'Anomaly Essence',       icon:'🌀', category:'event',  tier:'3', purpose:'Wild anomaly energy that surges during world events' },
  { id:'ritual-candles',        name:'Ritual Candles',        icon:'🕯', category:'event',  tier:'2', purpose:'Required in summoning and ritual systems during event phases' },
];


const ResourcesPage = () => {
  const [resources, setResources] = window.useEntities ? window.useEntities('resources') : React.useState(window.RESOURCES);
  const [openId, setOpenId] = React.useState(null);
  const [filterCat, setFilterCat] = React.useState('all');
  const [filterTier, setFilterTier] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [view, setView] = React.useState('grouped'); // grouped | tier | list
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'Team';

  const open = resources.find(r => r.id === openId);

  const update = (id, patch) => setResources(resources.map(r => r.id===id ? {...r, ...patch} : r));
  const create = () => {
    const id = (window.makeId ? window.makeId('res') : 'res-'+Date.now().toString(36));
    const r = { id, name:'New Resource', icon:'◇', category:'core', tier:'1', purpose:'Describe what it is used for.' };
    setResources([r, ...resources]); setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this resource? Recipes referencing it may need to be re-checked.')) return;
    setResources(resources.filter(r=>r.id!==id)); setOpenId(null);
  };

  const filtered = resources.filter(r =>
    (filterCat==='all' || r.category===filterCat)
    && (filterTier==='all' || r.tier===filterTier)
    && (!q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.purpose||'').toLowerCase().includes(q.toLowerCase()))
  );

  // Group by category for the default view
  const byCat = {};
  RESOURCE_CATEGORIES.forEach(c => byCat[c.id] = []);
  filtered.forEach(r => { if(byCat[r.category]) byCat[r.category].push(r); });

  const byTier = {};
  RESOURCE_TIERS.forEach(t => byTier[t.id] = []);
  filtered.forEach(r => { if(byTier[r.tier]) byTier[r.tier].push(r); });

  const renderCard = (r) => {
    const cat = RESOURCE_CATEGORIES.find(c=>c.id===r.category);
    const tier = RESOURCE_TIERS.find(t=>t.id===r.tier);
    return (
      <div key={r.id} className="resource-card" onClick={()=>setOpenId(r.id)}
        style={{borderLeftColor: cat?.color,
                borderColor: openId===r.id?'var(--gold-bright)':'var(--rule)',
                boxShadow: openId===r.id?'0 0 0 1px var(--gold-bright)':undefined}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:28,lineHeight:1,flex:'none',filter:`drop-shadow(0 0 4px ${cat?.color}55)`}}>{r.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--display)',fontSize:14,color:'var(--ink)',letterSpacing:'.02em',lineHeight:1.2}}>{r.name}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink-faint)',marginTop:2,letterSpacing:'.08em',textTransform:'uppercase'}}>
              <span style={{color:tier?.color}}>T{r.tier}</span>
              <span style={{margin:'0 4px',color:'var(--ink-faint)'}}>·</span>
              <span>{cat?.name}</span>
            </div>
          </div>
        </div>
        <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:6,lineHeight:1.4,
                     display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{r.purpose}</div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">📦</span>Resources</h1>
          <div className="page-sub">
            {resources.length} resource{resources.length!==1?'s':''} across {RESOURCE_CATEGORIES.length} categories ·
            {' '}<span style={{color:'#7a9a52'}}>{resources.filter(r=>r.tier==='1').length} essential</span> ·
            {' '}<span style={{color:'#cc2a3a'}}>{resources.filter(r=>r.tier==='4').length} legendary</span>
          </div>
        </div>
        <div className="page-actions">
          <div className="chip-row">
            <div className={`chip ${view==='grouped'?'active':''}`} onClick={()=>setView('grouped')}>By category</div>
            <div className={`chip ${view==='tier'?'active':''}`} onClick={()=>setView('tier')}>By tier</div>
            <div className={`chip ${view==='list'?'active':''}`} onClick={()=>setView('list')}>List</div>
          </div>
          <div className="search" style={{width:200}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search resources..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          {!window.IS_VIEWER && <button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New resource</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterCat==='all'?'active':''}`} onClick={()=>setFilterCat('all')}>All categories</div>
        {RESOURCE_CATEGORIES.map(c => {
          const n = resources.filter(r=>r.category===c.id).length;
          return <div key={c.id} className={`chip ${filterCat===c.id?'active':''}`}
                      onClick={()=>setFilterCat(filterCat===c.id?'all':c.id)}
                      style={filterCat===c.id?{borderColor:c.color,color:c.color,background:c.color+'20'}:{}}>
            {c.icon} {c.name} ({n})
          </div>;
        })}
      </div>
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterTier==='all'?'active':''}`} onClick={()=>setFilterTier('all')}>All tiers</div>
        {RESOURCE_TIERS.map(t => {
          const n = resources.filter(r=>r.tier===t.id).length;
          return <div key={t.id} className={`chip ${filterTier===t.id?'active':''}`}
                      onClick={()=>setFilterTier(filterTier===t.id?'all':t.id)}
                      style={filterTier===t.id?{borderColor:t.color,color:t.color,background:t.color+'20'}:{}}>
            <span className="dot" style={{background:t.color}}/>{t.name} ({n})
          </div>;
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns: openId?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>
        <div>
          {/* GROUPED BY CATEGORY */}
          {view === 'grouped' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              {RESOURCE_CATEGORIES.map(c => {
                const items = byCat[c.id] || [];
                if(items.length === 0) return null;
                return (
                  <div key={c.id}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontSize:18,filter:`drop-shadow(0 0 8px ${c.color}55)`}}>{c.icon}</span>
                      <span style={{fontFamily:'var(--display)',fontSize:14,letterSpacing:'.16em',textTransform:'uppercase',color:c.color}}>{c.name}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{items.length}</span>
                      <div style={{flex:1,height:1,background:`linear-gradient(90deg, ${c.color}66, transparent)`,marginLeft:4}}/>
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:12,color:'var(--ink-dim)',marginBottom:10,paddingLeft:28}}>{c.desc}</div>
                    <div className="resource-grid">
                      {items.map(renderCard)}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center'}}>No resources match these filters.</div>}
            </div>
          )}

          {/* BY TIER */}
          {view === 'tier' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              {RESOURCE_TIERS.map(t => {
                const items = byTier[t.id] || [];
                if(items.length === 0) return null;
                return (
                  <div key={t.id}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <span className="pill" style={{borderColor:t.color,color:t.color,fontSize:11}}>{t.name}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{items.length}</span>
                      <div style={{flex:1,height:1,background:`linear-gradient(90deg, ${t.color}66, transparent)`,marginLeft:4}}/>
                    </div>
                    <div className="resource-grid">
                      {items.map(renderCard)}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center'}}>No resources match these filters.</div>}
            </div>
          )}

          {/* LIST */}
          {view === 'list' && (
            <div className="panel">
              <table className="ledger">
                <thead><tr>
                  <th></th><th>Name</th><th>Category</th><th>Tier</th><th>Purpose</th>
                </tr></thead>
                <tbody>
                  {filtered.map(r => {
                    const cat = RESOURCE_CATEGORIES.find(c=>c.id===r.category);
                    const tier = RESOURCE_TIERS.find(t=>t.id===r.tier);
                    return (
                      <tr key={r.id} style={{cursor:'pointer',background:r.id===openId?'rgba(201,161,74,.05)':undefined}} onClick={()=>setOpenId(r.id)}>
                        <td style={{fontSize:20,width:32}}>{r.icon}</td>
                        <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{r.name}</td>
                        <td><span className="pill" style={{borderColor:cat?.color,color:cat?.color}}>{cat?.icon} {cat?.name}</span></td>
                        <td><span className="pill" style={{borderColor:tier?.color,color:tier?.color}}>{tier?.name.split(' ')[0]+' '+tier?.name.split(' ')[1]}</span></td>
                        <td style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,maxWidth:480}}>{r.purpose}</td>
                      </tr>
                    );
                  })}
                  {filtered.length===0 && <tr><td colSpan="5" style={{textAlign:'center',padding:30,color:'var(--ink-faint)',fontStyle:'italic'}}>No resources match.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAIL */}
        {open && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head">
              <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                <span style={{fontSize:24,lineHeight:1}}>{open.icon}</span>
                <input value={open.name} onChange={e=>update(open.id,{name:e.target.value})}
                  style={{flex:1,background:'transparent',border:'none',outline:'none',
                    fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--gold-bright)',padding:0}}/>
              </div>
              <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
            </div>
            <div className="panel-body" style={{display:'grid',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:8}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Icon</label>
                  <input className="field-input" value={open.icon} maxLength={4} style={{textAlign:'center',fontSize:18}}
                         onChange={e=>update(open.id,{icon:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">ID</label>
                  <input className="field-input" value={open.id} disabled style={{fontFamily:'var(--mono)',fontSize:11,opacity:.6}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Category</label>
                  <select className="field-select" value={open.category} onChange={e=>update(open.id,{category:e.target.value})}>
                    {RESOURCE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Tier</label>
                  <select className="field-select" value={open.tier} onChange={e=>update(open.id,{tier:e.target.value})}>
                    {RESOURCE_TIERS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Purpose</label>
                <textarea className="field-area" rows="4" value={open.purpose||''} onChange={e=>update(open.id,{purpose:e.target.value})}/>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Crafting notes (optional)</label>
                <textarea className="field-area" rows="3" value={open.notes||''} onChange={e=>update(open.id,{notes:e.target.value})}
                  placeholder="Where it drops, what it crafts, alternative names…"/>
              </div>
              <div style={{display:'flex',gap:6,marginTop:6}}>
                {!window.IS_VIEWER && <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete</button>}
                <div style={{flex:1}}/>
                <button className="btn" onClick={async ()=>{
                  try {
                    const reply = await window.claude.complete({
                      messages:[{ role:'user', content:
`You are Athena, a creative AI for a game studio. Suggest 3 craftable items or upgrades that use the resource "${open.name}" (${open.purpose}). Be concise (one line each). Lean into the world of Abraxas (dark fantasy, illuminated-manuscript tone).` }],
                    });
                    update(open.id, { notes: (open.notes ? open.notes + '\n\n' : '') + '🦉 Athena suggestions:\n' + reply });
                  } catch(err) {
                    alert('Athena stumbled: ' + (err.message||err));
                  }
                }}>🦉 Suggest crafts</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ResourcesPage = ResourcesPage;
