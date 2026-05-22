import { DLC_KEYS, appendBattleLog, isInstalled, loadSharedState, saveSharedState } from './shared-state.js';

const ITEM_CATALOG = {
  horn_nock: { name: 'Horn nock', description: 'A worked nock tip suitable for an inspected war arrow.' },
  bodkin_pile: { name: 'Bodkin pile', description: 'A narrow armor-pricking arrowhead.' },
  goose_fletch_whipping: { name: 'Goose-fletch whipping', description: 'Binding thread and feathering for a proof arrow.' },
  proof_arrow: { name: 'Proof arrow', description: 'A completed inspection arrow proving you belong near the arrow sheaves.' },
  ventail_lace: { name: 'Ventail lace', description: 'A lace for fastening mail beneath the face.' },
  bandage_tie: { name: 'Bandage tie', description: 'A strip knotted for field treatment.' },
  witness_token: { name: 'Witness token', description: 'A small token showing that a chaplain’s clerk sent you onward.' },
  camp_errand_kit: { name: 'Camp errand kit', description: 'A tidy bundle of repair and treatment odds that makes you look useful.' },
  girth_buckle: { name: 'Girth buckle', description: 'A stout buckle from mounted tack.' },
  bridle_cheekpiece: { name: 'Bridle cheekpiece', description: 'A metal cheek fitting for a bridle.' },
  horse_tally_cord: { name: 'Horse tally cord', description: 'A tally cord marking remount counts and line order.' },
  cavalry_service_harness: { name: 'Cavalry service harness', description: 'A plausible mounted-service fitting assembled from real tack.' },
  hauberk_ring_pouch: { name: 'Hauberk ring pouch', description: 'A pouch of spare mail rings for hurried repair.' },
  mail_repair_awl: { name: 'Mail repair awl', description: 'A narrow awl for quick ring work and filthy field patching.' },
  mail_repair_set: { name: 'Mail repair set', description: 'Enough mail-repair gear to pass through the battered front as useful hands.' },
  banner_ferrule: { name: 'Banner ferrule', description: 'A metal ferrule from a banner stave.' },
  dragon_cloth_strip: { name: 'Dragon cloth strip', description: 'A torn strip from a standard in the churned ground.' },
  field_banner_token: { name: 'Field banner token', description: 'Enough pieces of a fallen standard to speak with dangerous confidence.' },
  salt_pork_tie: { name: 'Salt-pork tie', description: 'A tie from lordly rations meant for better-fed men than most.' },
  wine_skin_seal: { name: 'Wine-skin seal', description: 'A wax-sealed tag from reserved drink.' },
  lordly_ration_bundle: { name: 'Lordly ration bundle', description: 'A conspicuous bundle of provisions nobody wants delayed at the wrong moment.' },
};

const DISCARDABLE_ITEMS = new Set([
  'horn_nock',
  'bodkin_pile',
  'goose_fletch_whipping',
  'ventail_lace',
  'bandage_tie',
  'witness_token',
  'girth_buckle',
  'bridle_cheekpiece',
  'horse_tally_cord',
  'hauberk_ring_pouch',
  'mail_repair_awl',
  'banner_ferrule',
  'dragon_cloth_strip',
  'salt_pork_tie',
  'wine_skin_seal',
]);

const RESOURCE_LABELS = {
  readyArrows: 'Ready arrows',
  reserveArrows: 'Reserve arrows',
  spentVolleys: 'Spent volleys',
  serviceableShields: 'Serviceable shields',
  serviceableHauberks: 'Serviceable hauberks',
  remountHorses: 'Remount horses',
  pigs: 'Pigs',
  ducks: 'Ducks',
  cabbageLoads: 'Cabbage loads',
};

const SELECTORS = {
  app: document.getElementById('battleApp'),
  notInstalled: document.getElementById('notInstalled'),
  roomMeta: document.getElementById('roomMeta'),
  roomTitle: document.getElementById('roomTitle'),
  roomIllustration: document.getElementById('roomIllustration'),
  roomIllustrationImage: document.getElementById('roomIllustrationImage'),
  roomIllustrationCaption: document.getElementById('roomIllustrationCaption'),
  roomDescription: document.getElementById('roomDescription'),
  options: document.getElementById('options'),
  inventoryList: document.getElementById('inventoryList'),
  resourceGrid: document.getElementById('resourceGrid'),
  questList: document.getElementById('questList'),
  eventLog: document.getElementById('eventLog'),
};

const ILLUSTRATION_BASE_DIR = '../assets/illustrations/dlc/battle-of-mastings';
const ROOM_ILLUSTRATIONS = {
  archives_summons: { file: 'archives_summons.jpeg', caption: 'The summons begins in the records room where the mistake first becomes official.' },
  royal_summons_chamber: { file: 'royal_summons_chamber.jpeg', caption: 'A chamber full of strained logic and borrowed authority.' },
  carriage_to_mastings: { file: 'carriage_to_mastings.jpeg', caption: 'The carriage ride in which war explains itself badly.' },
  pevensey_road: { file: 'pevensey_road.jpeg', caption: 'Pevensey Road where the invasion traffic turns logistics into weather.' },
  roman_shore_fort: { file: 'roman_shore_fort.jpeg', caption: 'Roman stone reused for Gilliam’s temporary strength.' },
  hoar_apple_wagons: { file: 'hoar_apple_wagons.jpeg', caption: 'Wagons, arrows, pork, and the first useful lies.' },
  bishop_ddos_mass_tent: { file: 'bishop_ddos_mass_tent.jpeg', caption: 'Blessings, witness tokens, and campaign administration under one canvas roof.' },
  telham_horse_lines: { file: 'telham_horse_lines.jpeg', caption: 'Horse lines where mounted wealth smells like leather, dung, and priority.' },
  senlac_approach: { file: 'senlac_approach.jpeg', caption: 'The narrowing road toward Senlac Hill.' },
  telham_pavilion: { file: 'telham_pavilion.jpeg', caption: 'Gilliam’s command side where confidence becomes policy.' },
  senlac_foot: { file: 'senlac_foot.jpeg', caption: 'At the hill-foot, battle becomes a sorting problem before it becomes a killing one.' },
  shieldwall_face: { file: 'shieldwall_face.jpeg', caption: 'The direct contact frontage beneath the defended crest.' },
  hauberk_leech_hollow: { file: 'hauberk_leech_hollow.jpeg', caption: 'A treatment hollow where split mail and privilege both stay visible.' },
  false_flight_descent: { file: 'false_flight_descent.jpeg', caption: 'The slope where discipline and pursuit begin to part company.' },
  weald_edge: { file: 'weald_edge.jpeg', caption: 'Rough ground where battlefield scraps cling to the edge of the wood.' },
  malfosse_break: { file: 'malfosse_break.jpeg', caption: 'Bad ground that makes tactical cleverness look expensive.' },
  dragon_banner_fall: { file: 'dragon_banner_fall.jpeg', caption: 'The place where fallen standards become stories before night has finished them.' },
  senlac_dusk_tally: { file: 'senlac_dusk_tally.jpeg', caption: 'Dusk reckoning at the edge of the field.' },
};

function syncIllustration(sceneKey) {
  const illustration = ROOM_ILLUSTRATIONS[sceneKey];
  if (!illustration) {
    SELECTORS.roomIllustration.hidden = true;
    SELECTORS.roomIllustrationImage.removeAttribute('src');
    SELECTORS.roomIllustrationCaption.textContent = '';
    return;
  }
  SELECTORS.roomIllustration.hidden = false;
  SELECTORS.roomIllustrationImage.src = `${ILLUSTRATION_BASE_DIR}/${illustration.file}`;
  SELECTORS.roomIllustrationImage.alt = illustration.caption;
  SELECTORS.roomIllustrationCaption.textContent = illustration.caption;
}

const DEFAULT_FLAGS = {
  attackerMomentum: 1,
  arrowDecision: null,
  pursuitDecision: null,
  bannerDecision: null,
  proofArrowMade: false,
  campErrandKitMade: false,
  cavalryServiceHarnessMade: false,
  mailRepairSetMade: false,
  fieldBannerTokenMade: false,
  lordlyRationBundleMade: false,
  rationDiversion: null,
  tookGooseFletchWhipping: false,
  tookVentailLace: false,
  tookHornNock: false,
  tookBodkinPile: false,
  tookBandageTie: false,
  tookWitnessToken: false,
  tookGirthBuckle: false,
  tookBridleCheekpiece: false,
  tookHorseTallyCord: false,
  tookMailRepairAwl: false,
  tookHauberkRingPouch: false,
  tookWineSkinSeal: false,
  tookBannerFerrule: false,
  tookSaltPorkTie: false,
  tookDragonClothStrip: false,
};

function ensureBattleState(rootState) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  battle.visited = battle.visited && typeof battle.visited === 'object' ? battle.visited : {};
  battle.inventory = battle.inventory && typeof battle.inventory === 'object' ? battle.inventory : {};
  battle.flags = battle.flags && typeof battle.flags === 'object' ? battle.flags : {};
  Object.keys(DEFAULT_FLAGS).forEach(key => {
    if (!(key in battle.flags)) {
      battle.flags[key] = DEFAULT_FLAGS[key];
    }
  });
  battle.log = Array.isArray(battle.log) ? battle.log.slice(-18) : [];
  if (!battle.log.length) {
    battle.log.push('You stand on the edge of someone else’s campaign and are immediately given too much responsibility.');
  }
  return battle;
}

function battleItemCount(battle, itemKey) {
  return Number(battle.inventory[itemKey] || 0);
}

function hasBattleItem(battle, itemKey, amount = 1) {
  return battleItemCount(battle, itemKey) >= amount;
}

function adjustBattleItem(rootState, itemKey, delta) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  battle.inventory[itemKey] = Math.max(0, battleItemCount(battle, itemKey) + delta);
  saveSharedState(rootState);
}

function discardBattleItem(rootState, itemKey) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  if (!battleItemCount(battle, itemKey)) {
    return;
  }
  battle.inventory[itemKey] = 0;
  saveSharedState(rootState);
  appendBattleLog(rootState, `You discard the spare ${ITEM_CATALOG[itemKey].name.toLowerCase()} rather than carry useless clutter into the next confusion.`);
}

function setBattleLocation(rootState, nextLocation, logMessage) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  battle.location = nextLocation;
  battle.visited[nextLocation] = true;
  saveSharedState(rootState);
  if (logMessage) {
    appendBattleLog(rootState, logMessage);
  }
  render(rootState);
}

function updateMomentum(rootState, delta, logMessage) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  battle.flags.attackerMomentum += delta;
  saveSharedState(rootState);
  if (logMessage) {
    appendBattleLog(rootState, logMessage);
  }
}

function addOption(options, label, onSelect, config = {}) {
  options.push({
    label,
    onSelect,
    disabled: Boolean(config.disabled),
    hidden: Boolean(config.hidden),
  });
}

function renderInventory(rootState) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  SELECTORS.inventoryList.innerHTML = '';
  const held = Object.keys(ITEM_CATALOG).filter(key => battleItemCount(battle, key) > 0);
  if (!held.length) {
    const item = document.createElement('li');
    item.textContent = 'Nothing yet but your temper and your hand.';
    SELECTORS.inventoryList.appendChild(item);
    return;
  }
  held.forEach(key => {
    const info = ITEM_CATALOG[key];
    const li = document.createElement('li');
    li.className = 'inventory-item';
    const textWrap = document.createElement('div');
    textWrap.className = 'inventory-copy';
    textWrap.innerHTML = `<strong>${info.name}</strong><br><small>${info.description}</small>`;
    li.appendChild(textWrap);
    if (DISCARDABLE_ITEMS.has(key)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-remove';
      button.setAttribute('aria-label', `Discard ${info.name}`);
      button.textContent = 'x';
      button.addEventListener('click', () => {
        discardBattleItem(rootState, key);
        render(rootState);
      });
      li.appendChild(button);
    }
    SELECTORS.inventoryList.appendChild(li);
  });
}

function renderResources(rootState) {
  const resources = rootState.dlc[DLC_KEYS.battle].resources;
  SELECTORS.resourceGrid.innerHTML = '';
  Object.entries(RESOURCE_LABELS).forEach(([key, label]) => {
    const row = document.createElement('div');
    const left = document.createElement('span');
    left.textContent = label;
    const right = document.createElement('strong');
    right.textContent = String(resources[key]);
    row.appendChild(left);
    row.appendChild(right);
    SELECTORS.resourceGrid.appendChild(row);
  });
}

function renderQuests(rootState) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  const quests = [];
  if (!battle.introSeen) {
    quests.push('Survive the absurd summons and reach Mastings Field.');
  } else if (!battle.flags.proofArrowMade) {
    quests.push('Assemble a proof arrow so the camp lets you toward **Senlac Approach**.');
  } else if (!battle.flags.arrowDecision) {
    quests.push('Reach **shieldwall_face** and decide what the archers are told about their arrows.');
  } else if (!battle.flags.pursuitDecision) {
    quests.push('Follow the broken line at **false_flight_descent** and decide whether to encourage pursuit.');
  } else if (!battle.flags.bannerDecision) {
    quests.push('Handle the standard rumors at **dragon_banner_fall** before dusk fixes the story.');
  } else if (!battle.outcome) {
    quests.push('Report to **senlac_dusk_tally** and let the day harden into one victor.');
  } else {
    quests.push('The battle is over. Your part in it is no longer deniable.');
  }
  SELECTORS.questList.innerHTML = '';
  quests.forEach(text => {
    const li = document.createElement('li');
    li.innerHTML = text;
    SELECTORS.questList.appendChild(li);
  });
}

function renderLog(rootState) {
  const battle = rootState.dlc[DLC_KEYS.battle];
  SELECTORS.eventLog.textContent = battle.log[battle.log.length - 1] || 'No one has yet lied to you in a technically truthful way.';
}

function describeResources(rootState) {
  const resources = rootState.dlc[DLC_KEYS.battle].resources;
  return `Visible counts now read ${resources.readyArrows} ready arrows, ${resources.reserveArrows} reserve arrows, ${resources.spentVolleys} spent volleys, ${resources.serviceableShields} serviceable shields, ${resources.serviceableHauberks} sound hauberks, and ${resources.remountHorses} remount horses. The uglier columns still note ${resources.pigs} pigs, ${resources.ducks} ducks, and ${resources.cabbageLoads} cabbage loads.`;
}

const SCENES = {
  archives_summons: rootState => {
    const options = [];
    addOption(options, 'Break the blue wax and read the summons', () => setBattleLocation(rootState, 'royal_summons_chamber', 'You break the seal and discover that the keep has solved a staffing crisis by making it yours.'));
    return {
      title: 'Archives Summons',
      meta: 'Prologue — Castle records',
      description: [
        'The castle archives are not where one expects to be requisitioned for war, yet here a clerk with shaking hands passes you a sealed order signed in four different tempers.',
        'It explains, with outrageous confidence, that after the northern fighting against vikings, levy rolls, oath names, supply tallies, and witness strings all require one literate but politically unimportant person to ride out at once.',
      ],
      options,
    };
  },
  royal_summons_chamber: rootState => {
    const options = [];
    addOption(options, 'Submit to the logic and present yourself for dispatch', () => setBattleLocation(rootState, 'carriage_to_mastings', 'You are informed, with bureaucratic tenderness, that this carriage mistake is now official.'));
    return {
      title: 'Royal Summons Chamber',
      meta: 'Prologue — Deep-castle order',
      description: [
        'Before a narrow fire, a steward, a chaplain, and one exhausted man of arms explain that Duke Gilliam of Mormandy has crossed late after delays at the water, Garold Godwinson has only just come south from beating vikings, and therefore obviously a castle clerk must now accompany campaign records into the field.',
        'The explanation becomes more plausible the longer it continues, which is the most dangerous kind of plausibility.',
      ],
      options,
    };
  },
  carriage_to_mastings: rootState => {
    const options = [];
    addOption(options, 'Ride on toward the invasion road', () => {
      const battle = rootState.dlc[DLC_KEYS.battle];
      battle.introSeen = true;
      saveSharedState(rootState);
      setBattleLocation(rootState, 'pevensey_road', 'By the time the carriage reaches Pevensey way, you are carrying more field authority than anyone should have given you.');
    });
    return {
      title: 'Carriage To Mastings',
      meta: 'Prologue — Transfer by road',
      description: [
        'The carriage jolts over ruts while tired men argue about succession, water delays, and whether Gilliam’s claim to the throne sounds any less thin if repeated in French.',
        'You hear that the defenders are mostly infantry upon Senlac Hill, their housecarls and levy men dragged south too quickly after the northern campaign. Chainmail hauberks rattle in the mud. Everybody is tired, and everybody speaks as if that will be someone else’s problem.',
      ],
      options,
    };
  },
  pevensey_road: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Inspect the Roman shore fort by the landing ruins', () => setBattleLocation(rootState, 'roman_shore_fort', 'You head toward the old Roman stone now doing honest Norman work.'));
    addOption(options, 'Walk to the hoar-apple wagons and arrow stores', () => setBattleLocation(rootState, 'hoar_apple_wagons', 'You turn toward the wagons where arrows, pork, and shouted numbers travel badly together.'));
    addOption(options, 'Pass beneath Bishop Ddo’s mass tent', () => setBattleLocation(rootState, 'bishop_ddos_mass_tent', 'You move toward the tent where relics and logistics keep uncomfortably close company.'));
    addOption(options, 'Look over the horse lines at Telham', () => setBattleLocation(rootState, 'telham_horse_lines', 'You step into the ordered misery of the horse lines.'));
    addOption(options, 'Make for **Senlac Approach**', () => setBattleLocation(rootState, 'senlac_approach', 'With a proof arrow in hand, you are finally treated as a nuisance of recognized purpose.'), {
      disabled: !battle.flags.proofArrowMade,
    });
    return {
      title: 'Pevensey Road',
      meta: 'Arrival — Invasion road',
      description: [
        'Pevensey way is all carts, damp ground, and men pretending this encampment has always been orderly. Gilliam’s camp spills outward from the landing works, disciplined enough to impress and strained enough to smell it.',
        battle.flags.proofArrowMade
          ? 'A finished proof arrow now grants you the dangerous privilege of being waved through by men who assume you belong somewhere worse.'
          : 'The quickest way forward seems to be **Senlac Approach**, but nobody lets tally hands toward the front without some visible sign that they belong among the arrow sheaves.',
      ],
      options,
    };
  },
  roman_shore_fort: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Take the spare goose-fletch whipping from a battered chest', () => {
      if (!battle.flags.tookGooseFletchWhipping) {
        adjustBattleItem(rootState, 'goose_fletch_whipping', 1);
        battle.flags.tookGooseFletchWhipping = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You pocket goose-fletch whipping from an old Roman chest now pretending to be campaign issue.');
      } else {
        appendBattleLog(rootState, 'The useful whipping was already pocketed by you, which at least preserves consistency.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookGooseFletchWhipping });
    addOption(options, 'Lift a ventail lace from the armor bench', () => {
      if (!battle.flags.tookVentailLace) {
        adjustBattleItem(rootState, 'ventail_lace', 1);
        battle.flags.tookVentailLace = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You take a ventail lace while a smith mutters that rich men’s faces deserve more fastening than poor men’s bellies.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookVentailLace });
    addOption(options, 'Return to Pevensey Road', () => setBattleLocation(rootState, 'pevensey_road', 'You leave the Roman stone and rejoin the invasion road.'));
    return {
      title: 'Roman Shore Fort',
      meta: 'Staging — Landing strongpoint',
      description: [
        'The invaders have thrown their order across the bones of an older empire. Roman masonry stands half-broken, half-reused, while campaign smiths and storemen work among it as if occupation were a trade.',
        'This is where improvised permanence begins.',
      ],
      options,
    };
  },
  hoar_apple_wagons: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Take a horn nock from the inspection tray', () => {
      if (!battle.flags.tookHornNock) {
        adjustBattleItem(rootState, 'horn_nock', 1);
        battle.flags.tookHornNock = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You pocket a horn nock while two quartermasters argue whether arrows count better by sheaf or by shame.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookHornNock });
    addOption(options, 'Take a bodkin pile from the smith’s wrapped bundle', () => {
      if (!battle.flags.tookBodkinPile) {
        adjustBattleItem(rootState, 'bodkin_pile', 1);
        battle.flags.tookBodkinPile = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'A bodkin pile disappears into your keeping as the wagon clerk loudly insists all numbers are provisional.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookBodkinPile });
    addOption(options, 'Assemble a proof arrow in plain view', () => {
      adjustBattleItem(rootState, 'horn_nock', -1);
      adjustBattleItem(rootState, 'bodkin_pile', -1);
      adjustBattleItem(rootState, 'goose_fletch_whipping', -1);
      adjustBattleItem(rootState, 'proof_arrow', 1);
      battle.flags.proofArrowMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'You bind a proof arrow with enough confidence that men begin assuming you belong near other dangerous counts.');
      render(rootState);
    }, { disabled: battle.flags.proofArrowMade || !hasBattleItem(battle, 'horn_nock') || !hasBattleItem(battle, 'bodkin_pile') || !hasBattleItem(battle, 'goose_fletch_whipping') });
    addOption(options, 'Study the ugly wagon columns', () => {
      appendBattleLog(rootState, 'The wagon tallies list arrows beside pigs, ducks, and cabbage loads with a flatness that makes war seem like poor accounting with more mud.');
      render(rootState);
    });
    addOption(options, 'Return to Pevensey Road', () => setBattleLocation(rootState, 'pevensey_road', 'You step away from the hoar-apple wagons and their disputed arithmetic.'));
    return {
      title: 'Hoar-Apple Wagons',
      meta: 'Staging — Supply wagons',
      description: [
        'Wagons stand wheel to wheel under tarred covers, the hoar-apple carts packed with arrows, pork, spare shields, and whatever else war insists is the same class of object.',
        'Nearby, a clerk mutters that the reserve columns are half count, half prayer.',
      ],
      options,
    };
  },
  bishop_ddos_mass_tent: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Pocket a bandage tie from the treatment basket', () => {
      if (!battle.flags.tookBandageTie) {
        adjustBattleItem(rootState, 'bandage_tie', 1);
        battle.flags.tookBandageTie = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You claim a bandage tie while the chaplain assures everyone the coming blood already has witnesses enough.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookBandageTie });
    addOption(options, 'Accept a witness token from Bishop Ddo’s clerk', () => {
      if (!battle.flags.tookWitnessToken) {
        adjustBattleItem(rootState, 'witness_token', 1);
        battle.flags.tookWitnessToken = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'Bishop Ddo’s clerk hands you a witness token, which is almost but not quite the same thing as legitimacy.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookWitnessToken });
    addOption(options, 'Bind a camp errand kit that makes you look sent by someone', () => {
      adjustBattleItem(rootState, 'ventail_lace', -1);
      adjustBattleItem(rootState, 'bandage_tie', -1);
      adjustBattleItem(rootState, 'camp_errand_kit', 1);
      battle.flags.campErrandKitMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'A ventail lace and bandage tie become a persuasive little errand bundle. Camp life is shallow enough for this to work.');
      render(rootState);
    }, { disabled: battle.flags.campErrandKitMade || !hasBattleItem(battle, 'ventail_lace') || !hasBattleItem(battle, 'bandage_tie') });
    addOption(options, 'Return to Pevensey Road', () => setBattleLocation(rootState, 'pevensey_road', 'You leave the mass tent where relics and administration mingle too comfortably.'));
    return {
      title: 'Bishop Ddo’s Mass Tent',
      meta: 'Command side — Oaths and blessings',
      description: [
        'Bishop Ddo’s tent is full of relics, murmured absolutions, and practical men who have somehow become religious functionaries for the length of a campaign.',
        'Oaths are copied here, names are witnessed here, and everyone pretends this is spiritually distinct from paperwork.',
      ],
      options,
    };
  },
  telham_horse_lines: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Take a girth buckle from the tack rail', () => {
      if (!battle.flags.tookGirthBuckle) {
        adjustBattleItem(rootState, 'girth_buckle', 1);
        battle.flags.tookGirthBuckle = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You take a girth buckle while a groom complains that horses receive better leather than half the infantry receive bread.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookGirthBuckle });
    addOption(options, 'Lift a bridle cheekpiece from the spare harness rack', () => {
      if (!battle.flags.tookBridleCheekpiece) {
        adjustBattleItem(rootState, 'bridle_cheekpiece', 1);
        battle.flags.tookBridleCheekpiece = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'A bridle cheekpiece joins your growing evidence that war is mostly fittings and anxiety.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookBridleCheekpiece });
    addOption(options, 'Take the horse tally cord hanging from the remount peg', () => {
      if (!battle.flags.tookHorseTallyCord) {
        adjustBattleItem(rootState, 'horse_tally_cord', 1);
        battle.flags.tookHorseTallyCord = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You claim the horse tally cord and immediately look more official to men who measure value in remounts.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookHorseTallyCord });
    addOption(options, 'Assemble a cavalry service harness from real tack', () => {
      adjustBattleItem(rootState, 'girth_buckle', -1);
      adjustBattleItem(rootState, 'bridle_cheekpiece', -1);
      adjustBattleItem(rootState, 'cavalry_service_harness', 1);
      battle.flags.cavalryServiceHarnessMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'You assemble enough mounted tack into one object that the horse lines begin treating you as somebody’s practical mistake.');
      render(rootState);
    }, { disabled: battle.flags.cavalryServiceHarnessMade || !hasBattleItem(battle, 'girth_buckle') || !hasBattleItem(battle, 'bridle_cheekpiece') });
    addOption(options, 'Return to Pevensey Road', () => setBattleLocation(rootState, 'pevensey_road', 'You leave the horse lines with more authority than you deserve.'));
    return {
      title: 'Telham Horse Lines',
      meta: 'Staging — Mounted service',
      description: [
        'The horse lines are disciplined misery: remounts, tack grease, dung, and grooms who can tell by one glance whether a mounted man means to live past noon.',
        'Cavalry feels expensive here in a way that infantry never gets to be.',
      ],
      options,
    };
  },
  senlac_approach: rootState => {
    const options = [];
    addOption(options, 'Climb toward Telham Pavilion', () => setBattleLocation(rootState, 'telham_pavilion', 'You climb toward Gilliam’s pavilion where confidence becomes policy.'));
    addOption(options, 'Move down the line toward Senlac Foot', () => setBattleLocation(rootState, 'senlac_foot', 'You head toward the base of Senlac Hill, where uphill death is broken into manageable tasks.'));
    addOption(options, 'Return to Pevensey Road', () => setBattleLocation(rootState, 'pevensey_road', 'You retreat from the front toward the road and supply churn.'));
    return {
      title: 'Senlac Approach',
      meta: 'Front approach — The obvious destination',
      description: [
        'At **Senlac Approach**, everything narrows: carts, orders, lines of men, and the usefulness of your handwriting. Senlac Hill rises ahead, defensive and insolent.',
        'The defenders hold the height. The attackers hold momentum, discipline, archers, and perhaps not enough honesty.',
      ],
      options,
    };
  },
  telham_pavilion: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Receive a mail-repair awl while posing as a useful witness', () => {
      if (!battle.flags.tookMailRepairAwl) {
        adjustBattleItem(rootState, 'mail_repair_awl', 1);
        battle.flags.tookMailRepairAwl = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'Your witness token and calm expression are enough to gain a mail-repair awl and a little trust near Gilliam’s command.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookMailRepairAwl || !hasBattleItem(battle, 'witness_token') });
    addOption(options, 'Return to **Senlac Approach**', () => setBattleLocation(rootState, 'senlac_approach', 'You withdraw from the command tent before anyone asks you for lineage.'));
    return {
      title: 'Telham Pavilion',
      meta: 'Command side — Gilliam’s tent line',
      description: [
        'Telham Pavilion is banner-heavy and full of men who speak as if history already agrees with them. Gilliam’s claim is discussed in the tone one uses for doubtful miracles repeated often enough to become policy.',
        'Nobody here doubts the battle can be won. They differ only on whose fault it will be if it is not.',
      ],
      options,
    };
  },
  senlac_foot: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Pick up a hauberk ring pouch from the armor bench', () => {
      if (!battle.flags.tookHauberkRingPouch) {
        adjustBattleItem(rootState, 'hauberk_ring_pouch', 1);
        battle.flags.tookHauberkRingPouch = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You pocket a hauberk ring pouch while a sergeant curses how many good coats are one split ring away from uselessness.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookHauberkRingPouch });
    addOption(options, 'Assemble a mail-repair set suitable for the front', () => {
      adjustBattleItem(rootState, 'hauberk_ring_pouch', -1);
      adjustBattleItem(rootState, 'mail_repair_awl', -1);
      adjustBattleItem(rootState, 'mail_repair_set', 1);
      battle.flags.mailRepairSetMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'With ring pouch and awl together, even the front-line men concede you are useful enough to keep moving.');
      render(rootState);
    }, { disabled: battle.flags.mailRepairSetMade || !hasBattleItem(battle, 'hauberk_ring_pouch') || !hasBattleItem(battle, 'mail_repair_awl') });
    addOption(options, 'Go to **shieldwall_face** beneath the ridge', () => setBattleLocation(rootState, 'shieldwall_face', 'You step into the ugly frontage beneath Senlac Hill.'), {
      disabled: !battle.flags.cavalryServiceHarnessMade && !battle.flags.mailRepairSetMade,
    });
    addOption(options, 'Return to **Senlac Approach**', () => setBattleLocation(rootState, 'senlac_approach', 'You step back from the hill-foot bustle to the approach line.'));
    return {
      title: 'Senlac Foot',
      meta: 'Battlefield edge — Hill base',
      description: [
        'At the foot of Senlac Hill, men are sorted, re-sorted, blessed, shoved forward, pulled back, and counted in ways that barely admit they are people.',
        'This is where uphill fighting begins by first becoming a supply and repair problem.',
      ],
      options,
    };
  },
  shieldwall_face: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Report the arrow reserves honestly', () => {
      battle.flags.arrowDecision = 'honest';
      battle.resources.spentVolleys += 1;
      battle.resources.readyArrows -= 180;
      saveSharedState(rootState);
      appendBattleLog(rootState, `You report the archers' numbers honestly. ${describeResources(rootState)}`);
      render(rootState);
    }, { disabled: Boolean(battle.flags.arrowDecision) });
    addOption(options, 'Understate the reserve arrows and make the front hesitate', () => {
      battle.flags.arrowDecision = 'understate';
      battle.resources.reserveArrows -= 350;
      battle.resources.spentVolleys += 1;
      saveSharedState(rootState);
      updateMomentum(rootState, -1, `You quietly shave the reserve count. Doubt moves through the attackers faster than truth. ${describeResources(rootState)}`);
      render(rootState);
    }, { disabled: Boolean(battle.flags.arrowDecision) });
    addOption(options, 'Overstate the reserves and encourage more volleys uphill', () => {
      battle.flags.arrowDecision = 'overstate';
      battle.resources.readyArrows += 120;
      battle.resources.spentVolleys += 2;
      saveSharedState(rootState);
      updateMomentum(rootState, 1, `You overstate the reserve depth. The front believes it can afford to keep pressing. ${describeResources(rootState)}`);
      render(rootState);
    }, { disabled: Boolean(battle.flags.arrowDecision) });
    addOption(options, 'Slip toward Hauberk Leech Hollow', () => setBattleLocation(rootState, 'hauberk_leech_hollow', 'You duck toward the hollow where leeches and broken mail collect together.'));
    addOption(options, 'Move after the broken line at False Flight Descent', () => setBattleLocation(rootState, 'false_flight_descent', 'You follow the line downhill where discipline becomes a choice.'), {
      disabled: !battle.flags.arrowDecision,
    });
    addOption(options, 'Return to Senlac Foot', () => setBattleLocation(rootState, 'senlac_foot', 'You step back from the shieldwall frontage to the hill base.'));
    return {
      title: 'Shieldwall Face',
      meta: 'Battlefield edge — Under the crest',
      description: [
        'This is the direct contact frontage beneath the defended crest, close enough to smell shield leather and hear Anglo-Saxon curses roll down from the line.',
        describeResources(rootState),
      ],
      options,
    };
  },
  hauberk_leech_hollow: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Lift a wine-skin seal from the lordly treatment stores', () => {
      if (!battle.flags.tookWineSkinSeal) {
        adjustBattleItem(rootState, 'wine_skin_seal', 1);
        battle.flags.tookWineSkinSeal = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You acquire a wine-skin seal while leeches debate which men deserve the cleaner cloth and thicker drink.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookWineSkinSeal });
    addOption(options, 'Return to Shieldwall Face', () => setBattleLocation(rootState, 'shieldwall_face', 'You return from the leech hollow to the battered front.'));
    return {
      title: 'Hauberk Leech Hollow',
      meta: 'Consequence layer — Treatment hollow',
      description: [
        'In the hollow behind the front, split mail, blood, vinegar, and muttered prayers compete for the same damp ground.',
        'It is here that one learns meat and wine travel in a hierarchy just as real as armor.',
      ],
      options,
    };
  },
  false_flight_descent: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Encourage the downhill pursuit', () => {
      battle.flags.pursuitDecision = 'encourage';
      saveSharedState(rootState);
      updateMomentum(rootState, 1, 'You urge men onward down the slope. The false flight deepens into something worse for the defenders.');
      render(rootState);
    }, { disabled: Boolean(battle.flags.pursuitDecision) });
    addOption(options, 'Warn that the retreat smells false and should be checked', () => {
      battle.flags.pursuitDecision = 'restrain';
      saveSharedState(rootState);
      updateMomentum(rootState, -1, 'You warn that the retreat is too neat. Enough men hesitate to blunt the trick.');
      render(rootState);
    }, { disabled: Boolean(battle.flags.pursuitDecision) });
    addOption(options, 'Pick through the trees at Weald Edge', () => setBattleLocation(rootState, 'weald_edge', 'You angle toward the rough edge of the wood beyond the main churn.'));
    addOption(options, 'Push on toward Malfosse Break', () => setBattleLocation(rootState, 'malfosse_break', 'You move toward the bad ground where pursuit learns regret.'));
    addOption(options, 'Search the torn ground at Dragon Banner Fall', () => setBattleLocation(rootState, 'dragon_banner_fall', 'You head where dropped standards have begun to attract stories.'));
    addOption(options, 'Return to Shieldwall Face', () => setBattleLocation(rootState, 'shieldwall_face', 'You claw your way back uphill toward the shieldwall face.'));
    return {
      title: 'False Flight Descent',
      meta: 'Collapse layer — Pursuit slope',
      description: [
        'Down the descent, the line breaks into smaller loyalties: men following, men doubting, men shouting that the enemy is in flight, and wiser men shouting back.',
        'The ground itself seems undecided whether this is victory or bait.',
      ],
      options,
    };
  },
  weald_edge: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Recover a banner ferrule snagged in the scrub', () => {
      if (!battle.flags.tookBannerFerrule) {
        adjustBattleItem(rootState, 'banner_ferrule', 1);
        battle.flags.tookBannerFerrule = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You work a banner ferrule loose from the scrub where pursuit spilled sideways into the trees.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookBannerFerrule });
    addOption(options, 'Return to False Flight Descent', () => setBattleLocation(rootState, 'false_flight_descent', 'You return from the Weald edge to the noisier slope.'));
    return {
      title: 'Weald Edge',
      meta: 'Battlefield edge — Rough country',
      description: [
        'The Weald edge is rougher ground where men, scraps of gear, and abandoned dignity disappear into scrub and root.',
        'The battlefield feels less official here, which makes it more honest.',
      ],
      options,
    };
  },
  malfosse_break: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Take a salt-pork tie from the wrecked ration hamper', () => {
      if (!battle.flags.tookSaltPorkTie) {
        adjustBattleItem(rootState, 'salt_pork_tie', 1);
        battle.flags.tookSaltPorkTie = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You find a salt-pork tie among the crushed hampers of better-fed men.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookSaltPorkTie });
    addOption(options, 'Return to False Flight Descent', () => setBattleLocation(rootState, 'false_flight_descent', 'You leave the bad ground and rejoin the louder confusion uphill.'));
    return {
      title: 'Malfosse Break',
      meta: 'Collapse layer — Bad ground',
      description: [
        'At Malfosse Break the pursuit learns that terrain keeps its own counsel. Men and horses hate the same ditch at different heights.',
        'This is where a tactical idea acquires a body count.',
      ],
      options,
    };
  },
  dragon_banner_fall: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const options = [];
    addOption(options, 'Take a torn strip of dragon cloth from the trampled standard', () => {
      if (!battle.flags.tookDragonClothStrip) {
        adjustBattleItem(rootState, 'dragon_cloth_strip', 1);
        battle.flags.tookDragonClothStrip = true;
        saveSharedState(rootState);
        appendBattleLog(rootState, 'You take a dragon cloth strip from the churned ground where standards have become arguments.');
      }
      render(rootState);
    }, { disabled: battle.flags.tookDragonClothStrip });
    addOption(options, 'Assemble a field banner token from the found pieces', () => {
      adjustBattleItem(rootState, 'banner_ferrule', -1);
      adjustBattleItem(rootState, 'dragon_cloth_strip', -1);
      adjustBattleItem(rootState, 'field_banner_token', 1);
      battle.flags.fieldBannerTokenMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'With ferrule and cloth together, you can now speak about fallen standards with dangerous conviction.');
      render(rootState);
    }, { disabled: battle.flags.fieldBannerTokenMade || !hasBattleItem(battle, 'banner_ferrule') || !hasBattleItem(battle, 'dragon_cloth_strip') });
    addOption(options, 'Bind up a lordly ration bundle from privileged stores', () => {
      adjustBattleItem(rootState, 'salt_pork_tie', -1);
      adjustBattleItem(rootState, 'wine_skin_seal', -1);
      adjustBattleItem(rootState, 'lordly_ration_bundle', 1);
      battle.flags.lordlyRationBundleMade = true;
      saveSharedState(rootState);
      appendBattleLog(rootState, 'You bind lordly food and drink into one visible insult to every infantryman eating cabbage in the mud.');
      render(rootState);
    }, { disabled: battle.flags.lordlyRationBundleMade || !hasBattleItem(battle, 'salt_pork_tie') || !hasBattleItem(battle, 'wine_skin_seal') });
    addOption(options, 'Spread that the dragon standard has fallen and broken the defenders’ heart', () => {
      battle.flags.bannerDecision = 'fell';
      saveSharedState(rootState);
      updateMomentum(rootState, 1, 'You let the rumor run that the dragon standard has gone down for good. Men believe collapse before they see it.');
      render(rootState);
    }, { disabled: Boolean(battle.flags.bannerDecision) || !battle.flags.fieldBannerTokenMade });
    addOption(options, 'Insist the standard was seen still held and the ridge still means to stand', () => {
      battle.flags.bannerDecision = 'stood';
      saveSharedState(rootState);
      updateMomentum(rootState, -1, 'You insist the standard was still held. The rumor hardens some spines that would rather have bent.');
      render(rootState);
    }, { disabled: Boolean(battle.flags.bannerDecision) || !battle.flags.fieldBannerTokenMade });
    addOption(options, 'Carry the day’s lies and counts to Senlac Dusk Tally', () => {
      const next = battle.flags.attackerMomentum > 0 ? 'ending_attacker_victory' : 'ending_defender_victory';
      battle.outcome = next === 'ending_attacker_victory' ? 'attacker_victory' : 'defender_victory';
      saveSharedState(rootState);
      setBattleLocation(rootState, 'senlac_dusk_tally', 'As dusk settles, numbers become verdicts faster than corpses cool.');
    }, { disabled: !battle.flags.bannerDecision || !battle.flags.pursuitDecision || !battle.flags.arrowDecision });
    addOption(options, 'Return to False Flight Descent', () => setBattleLocation(rootState, 'false_flight_descent', 'You leave the torn banners for the more ordinary confusion of the slope.'));
    return {
      title: 'Dragon Banner Fall',
      meta: 'Consequence layer — Standard ground',
      description: [
        'At Dragon Banner Fall, men no longer separate what happened from what will be said to have happened. Standards are half cloth and half verdict.',
        battle.flags.lordlyRationBundleMade
          ? 'Your bound-up ration bundle makes the class lines of the army painfully visible in the mud.'
          : 'If one wished to make class resentment material, this is also where lordly food and drink could become pointed objects.',
      ],
      options,
    };
  },
  senlac_dusk_tally: rootState => {
    const battle = rootState.dlc[DLC_KEYS.battle];
    const outcomeTitle = battle.outcome === 'attacker_victory' ? 'The attackers carry Senlac Hill.' : 'The defenders hold Senlac Hill.';
    const options = [];
    addOption(options, 'Read the outcome', () => setBattleLocation(rootState, battle.outcome === 'attacker_victory' ? 'ending_attacker_victory' : 'ending_defender_victory', 'The tally closes over the field and decides who gets to call the day inevitable.'));
    return {
      title: 'Senlac Dusk Tally',
      meta: 'Ending funnel — Dusk reckoning',
      description: [
        'At dusk, men finally stop pretending the battle is still made of local tasks. Numbers, rumors, pursuit, and exhaustion compress into one answer.',
        `${outcomeTitle} Your little choices were never large enough to feel like treason while making them, which is why they worked.`,
      ],
      options,
    };
  },
  ending_attacker_victory: () => ({
    title: 'Attacker Victory',
    meta: 'Ending — Gilliam’s field',
    description: [
      'Duke Gilliam of Mormandy’s side takes the day. No one quite notices that the helpful clerk drifting through arrow counts, mounted tack, and fallen standards was anything more dangerous than competent.',
      'The camp congratulates itself. Across the channel, and across every sea worth worrying about, word arrives of trouble overseas. A harbor launch will be needed in haste, and the men who speak most confidently about readiness should not be trusted.',
      'The game is over here.',
      '<a href="harbor-of-delays.html">Go to the Harbor of Delays DLC page.</a>',
    ],
    options: [],
  }),
  ending_defender_victory: () => ({
    title: 'Defender Victory',
    meta: 'Ending — Spy’s success',
    description: [
      'The defenders hold. By nightfall, at least one grim and well-informed man makes it plain that your work among the invaders amounted to very good spycraft dressed up as menial logistics.',
      'You are congratulated with exhausting explicitness for having counted, delayed, and misdirected exactly enough. It is not a grand heroic reward. It is simply correct, which feels better.',
      'Word still arrives of trouble overseas. A ship must be launched in anger, and the harbor’s promise of readiness sounds suspicious already.',
      'The game is over here.',
      '<a href="harbor-of-delays.html">Go to the Harbor of Delays DLC page.</a>',
    ],
    options: [],
  }),
};

function render(rootState) {
  const battle = ensureBattleState(rootState);
  const sceneFactory = SCENES[battle.location];
  if (!sceneFactory) {
    return;
  }
  const snapshot = sceneFactory(rootState);
  SELECTORS.roomMeta.textContent = snapshot.meta || '';
  SELECTORS.roomTitle.textContent = snapshot.title;
  syncIllustration(battle.location);
  SELECTORS.roomDescription.innerHTML = snapshot.description.map(paragraph => `<p>${paragraph}</p>`).join('');
  SELECTORS.options.innerHTML = '';
  snapshot.options
    .filter(option => !option.hidden)
    .forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-button';
      button.textContent = option.label;
      button.disabled = Boolean(option.disabled);
      button.addEventListener('click', () => option.onSelect());
      SELECTORS.options.appendChild(button);
    });
  renderInventory(rootState);
  renderResources(rootState);
  renderQuests(rootState);
  renderLog(rootState);
}

function bootstrapBattleState(rootState) {
  const params = new URLSearchParams(window.location.search);
  const entry = params.get('entry');
  const battle = ensureBattleState(rootState);
  if (!battle.location) {
    if (entry === 'story' && !battle.introSeen) {
      battle.location = 'archives_summons';
      battle.visited.archives_summons = true;
    } else {
      battle.location = 'pevensey_road';
      battle.visited.pevensey_road = true;
    }
    saveSharedState(rootState);
  } else if (entry === 'story' && !battle.introSeen) {
    battle.location = 'archives_summons';
    battle.visited.archives_summons = true;
    saveSharedState(rootState);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const rootState = loadSharedState();
  const shell = document.getElementById('battleApp');
  const layoutToggle = document.getElementById('layoutToggle');
  const layoutKey = 'castle_ledger_layout_mode_v1';
  function syncLayout(mode) {
    if (!shell || !layoutToggle) {
      return;
    }
    const split = mode !== 'stacked';
    shell.classList.toggle('layout-split', split);
    shell.classList.toggle('layout-stacked', !split);
    layoutToggle.setAttribute('aria-pressed', String(split));
    layoutToggle.textContent = split ? 'Stack choices' : 'Split into 3 columns';
  }
  if (shell && layoutToggle) {
    let savedMode = null;
    try {
      savedMode = window.localStorage.getItem(layoutKey);
    } catch (error) {}
    syncLayout(savedMode === 'stacked' ? 'stacked' : 'split');
    layoutToggle.addEventListener('click', () => {
      const nextMode = shell.classList.contains('layout-split') ? 'stacked' : 'split';
      syncLayout(nextMode);
      try {
        window.localStorage.setItem(layoutKey, nextMode);
      } catch (error) {}
    });
  }
  if (!isInstalled(rootState, DLC_KEYS.battle)) {
    SELECTORS.notInstalled.hidden = false;
    return;
  }
  bootstrapBattleState(rootState);
  SELECTORS.app.hidden = false;
  render(rootState);
});
