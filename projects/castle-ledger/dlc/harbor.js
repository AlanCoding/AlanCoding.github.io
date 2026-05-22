import { DLC_KEYS, appendHarborLog, getInstallProgress, isInstalled, loadSharedState, saveSharedState, syncInstallCompletion } from './shared-state.js?v=2';

const ITEM_CATALOG = {
  venture_seal: { name: 'Venture seal', description: 'A wax-and-brass venture seal from the furious financiers.' },
  capstan_order_tally: { name: 'Capstan order tally', description: 'A tally stick proving somebody meant to tell the capstan crew something.' },
  launch_order: { name: 'Launch order', description: 'A seal-backed order serious enough to make hauling men move.' },
  warp_hook: { name: 'Warp hook', description: 'A blunt iron hook for re-leading a quay-side warp.' },
  bollard_pin: { name: 'Bollard pin', description: 'A tapered pin from the slip fittings by the berth.' },
  proper_warp_lead: { name: 'Proper warp lead', description: 'The corrected hardware and line logic for hauling clear without fouling.' },
  tide_slate: { name: 'Tide slate', description: 'A smeared slate giving the local water mark in practical terms.' },
  lantern_slide: { name: 'Lantern slide', description: 'A sliding shutter plate for the proper launch signal.' },
  moon_mark_scrap: { name: 'Moon-mark scrap', description: 'A notched scrap from the nest watch showing which tide mark was meant.' },
  cleared_launch_signal: { name: 'Cleared launch signal', description: 'A corrected tide-and-lantern instruction finally fit for public waving.' },
  oakum_twist: { name: 'Oakum twist', description: 'Tarred oakum twisted for wedging and making things hold one more day.' },
  boat_hook_collar_pin: { name: 'Boat-hook collar pin', description: 'A small iron pin from the collar of a harbor boat hook.' },
  mast_band_wedge: { name: 'Mast-band wedge', description: 'A hard wedge from the upper rigging where no one wanted you climbing.' },
  departure_fittings: { name: 'Departure fittings', description: 'A bundle of corrected little hardware no great man would have thought to ask about.' },
};

const DISCARDABLE_ITEMS = new Set([
  'venture_seal',
  'capstan_order_tally',
  'warp_hook',
  'bollard_pin',
  'tide_slate',
  'lantern_slide',
  'moon_mark_scrap',
  'oakum_twist',
  'boat_hook_collar_pin',
  'mast_band_wedge',
]);

const SELECTORS = {
  app: document.getElementById('harborApp'),
  notInstalled: document.getElementById('notInstalled'),
  notInstalledMessage: document.getElementById('notInstalledMessage'),
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

const ILLUSTRATION_BASE_DIR = '../assets/illustrations/dlc/harbor-of-delays';
const ILLUSTRATION_VERSION = 'v1';
const ROOM_ILLUSTRATIONS = {
  harbor_road: { file: 'harbor_road.jpeg', caption: 'Harbor Road, where urgency starts clean and gets fouled by specifics.' },
  reckoning_house: { file: 'reckoning_house.jpeg', caption: 'The reckoning house where money shouts and still claims no delay exists.' },
  salt_storehouse: { file: 'salt_storehouse.jpeg', caption: 'Salt, barrels, and labor pretending launch is a foregone conclusion.' },
  victualler_row: { file: 'victualler_row.jpeg', caption: 'Victualler Row, where cabbage is for rowers and confidence is free.' },
  rope_crane_pier: { file: 'rope_crane_pier.jpeg', caption: 'The rope crane pier where heavy lines become somebody else’s omission.' },
  capstan_walk: { file: 'capstan_walk.jpeg', caption: 'Men and timber in circles, all technically ready.' },
  boatyard_slip: { file: 'boatyard_slip.jpeg', caption: 'Rollers, wedges, pins, and the kind of details that stop wars from leaving.' },
  signal_beacon_tower: { file: 'signal_beacon_tower.jpeg', caption: 'The tower where proper signaling and practical confusion share a ladder.' },
  lamp_room: { file: 'lamp_room.jpeg', caption: 'Lantern shutters and oily authority in a cramped room above the quay.' },
  crows_nest: { file: 'crows_nest.jpeg', caption: 'High rigging, thin wind, and the view from which the harbor looks falsely simple.' },
  launch_quay: { file: 'launch_quay.jpeg', caption: 'The launch quay where readiness fails in ever finer detail.' },
  mudflat_skiff_landing: { file: 'mudflat_skiff_landing.jpeg', caption: 'Low mud, skiffs, and the underside of harbor certainty.' },
  pilots_tavern: { file: 'pilots_tavern.jpeg', caption: 'Pilots, tides, and the local expertise least likely to agree with itself.' },
  caulking_shed: { file: 'caulking_shed.jpeg', caption: 'Tar smoke and oakum where one more tiny fix becomes one more large delay.' },
  oarmaker_yard: { file: 'oarmaker_yard.jpeg', caption: 'Shavings, collars, hooks, and practical timber indifference.' },
  war_launch: { file: 'war_launch.jpeg', caption: 'At last the ship leaves, proving only that it had not been ready before.' },
};

const DEFAULT_FLAGS = {
  firstLaunchFailure: false,
  secondLaunchFailure: false,
  thirdLaunchFailure: false,
  fourthLaunchFailure: false,
  capstanCleared: false,
  warpCleared: false,
  signalCleared: false,
  departureCleared: false,
  launchDone: false,
  tookVentureSeal: false,
  tookCapstanOrderTally: false,
  tookWarpHook: false,
  tookBollardPin: false,
  tookTideSlate: false,
  tookLanternSlide: false,
  tookMoonMarkScrap: false,
  tookOakumTwist: false,
  tookBoatHookCollarPin: false,
  tookMastBandWedge: false,
  launchOrderMade: false,
  properWarpLeadMade: false,
  clearedLaunchSignalMade: false,
  departureFittingsMade: false,
  reckoningFuryCounted: false,
  kingFuryCounted: false,
};

function ensureHarborState(rootState) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  harbor.visited = harbor.visited && typeof harbor.visited === 'object' ? harbor.visited : {};
  harbor.inventory = harbor.inventory && typeof harbor.inventory === 'object' ? harbor.inventory : {};
  harbor.flags = harbor.flags && typeof harbor.flags === 'object' ? harbor.flags : {};
  harbor.counters = harbor.counters && typeof harbor.counters === 'object' ? harbor.counters : {};
  if (!Number.isFinite(Number(harbor.counters.failedLaunches))) {
    harbor.counters.failedLaunches = 0;
  }
  if (!Number.isFinite(Number(harbor.counters.assurancesHeard))) {
    harbor.counters.assurancesHeard = 0;
  }
  if (!Number.isFinite(Number(harbor.counters.furiousMeetings))) {
    harbor.counters.furiousMeetings = 0;
  }
  Object.keys(DEFAULT_FLAGS).forEach(key => {
    if (!(key in harbor.flags)) {
      harbor.flags[key] = DEFAULT_FLAGS[key];
    }
  });
  harbor.log = Array.isArray(harbor.log) ? harbor.log.slice(-18) : [];
  if (!harbor.log.length) {
    harbor.log.push('The harbor assures you the ship is ready. This appears to be the least useful true statement in the county.');
  }
  return harbor;
}

function syncIllustration(sceneKey) {
  const illustration = ROOM_ILLUSTRATIONS[sceneKey];
  if (!illustration) {
    SELECTORS.roomIllustration.hidden = true;
    SELECTORS.roomIllustrationImage.removeAttribute('src');
    SELECTORS.roomIllustrationCaption.textContent = '';
    return;
  }
  SELECTORS.roomIllustration.hidden = false;
  SELECTORS.roomIllustrationImage.src = `${ILLUSTRATION_BASE_DIR}/${illustration.file}?${ILLUSTRATION_VERSION}`;
  SELECTORS.roomIllustrationImage.alt = illustration.caption;
  SELECTORS.roomIllustrationCaption.textContent = illustration.caption;
}

function harborItemCount(harbor, itemKey) {
  return Number(harbor.inventory[itemKey] || 0);
}

function hasHarborItem(harbor, itemKey, amount = 1) {
  return harborItemCount(harbor, itemKey) >= amount;
}

function adjustHarborItem(rootState, itemKey, delta) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  harbor.inventory[itemKey] = Math.max(0, harborItemCount(harbor, itemKey) + delta);
  saveSharedState(rootState);
}

function discardHarborItem(rootState, itemKey) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  if (!harborItemCount(harbor, itemKey)) {
    return;
  }
  harbor.inventory[itemKey] = 0;
  saveSharedState(rootState);
  appendHarborLog(rootState, `You discard the spare ${ITEM_CATALOG[itemKey].name.toLowerCase()} rather than drag one more solved detail across the harbor.`);
}

function setHarborLocation(rootState, nextLocation, logMessage) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  harbor.location = nextLocation;
  harbor.visited[nextLocation] = true;
  saveSharedState(rootState);
  if (logMessage) {
    appendHarborLog(rootState, logMessage);
  }
  render(rootState);
}

function addOption(options, label, onSelect, config = {}) {
  options.push({
    label,
    onSelect,
    disabled: Boolean(config.disabled),
    hidden: Boolean(config.hidden),
  });
}

function countClearedBlockers(harbor) {
  return [
    harbor.flags.capstanCleared,
    harbor.flags.warpCleared,
    harbor.flags.signalCleared,
    harbor.flags.departureCleared,
  ].filter(Boolean).length;
}

function describeCurrentBlocker(harbor) {
  if (harbor.flags.launchDone) {
    return 'No blocker left. The ship has finally gone.';
  }
  if (harbor.flags.fourthLaunchFailure && !harbor.flags.departureCleared) {
    return 'Final departure fittings still missing at the berth.';
  }
  if (harbor.flags.thirdLaunchFailure && !harbor.flags.signalCleared) {
    return 'Launch signal and tide mark still disagree.';
  }
  if (harbor.flags.secondLaunchFailure && !harbor.flags.warpCleared) {
    return 'The shore warp is still led wrong for clearing the quay.';
  }
  if (harbor.flags.firstLaunchFailure && !harbor.flags.capstanCleared) {
    return 'The capstan crew were never properly told to haul.';
  }
  return 'Publicly none. Privately everyone is hiding behind wording.';
}

function renderInventory(rootState) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  SELECTORS.inventoryList.innerHTML = '';
  const held = Object.keys(ITEM_CATALOG).filter(key => harborItemCount(harbor, key) > 0);
  if (!held.length) {
    const item = document.createElement('li');
    item.textContent = 'Nothing yet but your authority and your irritation.';
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
        discardHarborItem(rootState, key);
        render(rootState);
      });
      li.appendChild(button);
    }
    SELECTORS.inventoryList.appendChild(li);
  });
}

function renderResources(rootState) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  const rows = [
    ['Public claim', 'Ship fully ready'],
    ['Actual blocker', describeCurrentBlocker(harbor)],
    ['Failed launches', String(harbor.counters.failedLaunches)],
    ['Assurances heard', String(harbor.counters.assurancesHeard)],
    ['Furious audiences', String(harbor.counters.furiousMeetings)],
    ['Blockers cleared', String(countClearedBlockers(harbor))],
  ];
  SELECTORS.resourceGrid.innerHTML = '';
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    const left = document.createElement('span');
    left.textContent = label;
    const right = document.createElement('strong');
    right.textContent = value;
    row.appendChild(left);
    row.appendChild(right);
    SELECTORS.resourceGrid.appendChild(row);
  });
}

function renderQuests(rootState) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  const quests = [];
  if (!harbor.flags.firstLaunchFailure) {
    quests.push('Reach **launch_quay** and discover what “ready” means today.');
  } else if (!harbor.flags.capstanCleared) {
    quests.push('Make the capstan crew move by producing a proper launch order.');
  } else if (!harbor.flags.secondLaunchFailure) {
    quests.push('Return to **launch_quay** and test whether the capstan solved anything.');
  } else if (!harbor.flags.warpCleared) {
    quests.push('Build a proper warp lead and carry it back to **launch_quay**.');
  } else if (!harbor.flags.thirdLaunchFailure) {
    quests.push('Return to **launch_quay** and learn the next omitted truth.');
  } else if (!harbor.flags.signalCleared) {
    quests.push('Correct the signal and tide logic from **signal_beacon_tower**.');
  } else if (!harbor.flags.fourthLaunchFailure) {
    quests.push('Return to **launch_quay** and see which tiny part now blocks war.');
  } else if (!harbor.flags.departureCleared) {
    quests.push('Assemble the final departure fittings and bring them back to the berth.');
  } else if (!harbor.flags.launchDone) {
    quests.push('Launch the ship before somebody else explains that it was always ready.');
  } else {
    quests.push('The ship has launched. The delay has finally become history instead of process.');
  }
  SELECTORS.questList.innerHTML = '';
  quests.forEach(text => {
    const li = document.createElement('li');
    li.innerHTML = text;
    SELECTORS.questList.appendChild(li);
  });
}

function renderLog(rootState) {
  const harbor = rootState.dlc[DLC_KEYS.harbor];
  SELECTORS.eventLog.textContent = harbor.log[harbor.log.length - 1] || 'No one has yet declared the ship ready in your hearing.';
}

const SCENES = {
  harbor_road: rootState => {
    const options = [];
    addOption(options, 'Proceed toward the reckoning house and the financiers’ fury', () => setHarborLocation(rootState, 'reckoning_house', 'You head down Harbor Road toward the building where money shouts in complete confidence.'));
    return {
      title: 'Harbor Road',
      meta: 'Entry — Road into the lower harbor',
      description: [
        'Harbor Road pitches downhill through carts, cordage, gulls, and men who keep pointing seaward whenever anyone asks a practical question.',
        'Every third person tells you the warship is fully ready. Every fourth person says there is no blocker at all. Nobody offers a detail that would let a ship move one cubit.',
      ],
      options,
    };
  },
  reckoning_house: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the venture seal from the financiers’ table', () => {
      if (!harbor.flags.tookVentureSeal) {
        adjustHarborItem(rootState, 'venture_seal', 1);
        harbor.flags.tookVentureSeal = true;
        if (!harbor.flags.reckoningFuryCounted) {
          harbor.flags.reckoningFuryCounted = true;
          harbor.counters.furiousMeetings += 1;
        }
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The lords financing the voyage are furious that nothing has launched, then assure you the ship is nevertheless entirely ready. You leave with their venture seal.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookVentureSeal });
    addOption(options, 'Stamp the tally into a formal launch order', () => {
      adjustHarborItem(rootState, 'venture_seal', -1);
      adjustHarborItem(rootState, 'capstan_order_tally', -1);
      adjustHarborItem(rootState, 'launch_order', 1);
      harbor.flags.launchOrderMade = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'With seal and tally together, the reckoning house reluctantly emits a proper launch order, as if this should have happened hours ago.');
      render(rootState);
    }, { disabled: harbor.flags.launchOrderMade || !hasHarborItem(harbor, 'venture_seal') || !hasHarborItem(harbor, 'capstan_order_tally') });
    addOption(options, 'Continue to the salt storehouse', () => setHarborLocation(rootState, 'salt_storehouse', 'You leave money behind and head back into the labor that money pretends to command.'));
    addOption(options, 'Return up Harbor Road', () => setHarborLocation(rootState, 'harbor_road', 'You retreat uphill while the shouting of investors follows you.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    return {
      title: 'Reckoning House',
      meta: 'Town side — Money and blame',
      description: [
        'Inside the reckoning house, ledgers lie open beside sanded ink, venture tallies, and men who financed the campaign and would now prefer to finance time itself.',
        'They are absolutely furious that the ship has not launched. They are equally committed to insisting that no real delay exists.',
      ],
      options,
    };
  },
  salt_storehouse: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Go on toward the rope crane pier', () => setHarborLocation(rootState, 'rope_crane_pier', 'You follow the pier traffic toward heavy lines, hooks, and shouted half-instructions.'));
    addOption(options, 'Turn into Victualler Row', () => setHarborLocation(rootState, 'victualler_row', 'You step away from the salt carts toward the victuallers and their cabbage certainty.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    addOption(options, 'Visit the caulking shed', () => setHarborLocation(rootState, 'caulking_shed', 'You follow the pitch smoke toward the caulkers at work.'), { hidden: !harbor.flags.fourthLaunchFailure });
    addOption(options, 'Detour into the oarmaker yard', () => setHarborLocation(rootState, 'oarmaker_yard', 'You cut inland to the yard of poles, hooks, collars, and shaved timber.'), { hidden: !harbor.flags.fourthLaunchFailure });
    addOption(options, 'Return to the reckoning house', () => setHarborLocation(rootState, 'reckoning_house', 'You go back toward the building where financial certainty still fails to move ships.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    return {
      title: 'Salt Storehouse',
      meta: 'Town side — Barrels and traffic',
      description: [
        'Great barrels of salt fish, pickled goods, and hard biscuit sit under beams darkened by years of harbor damp. Men keep telling one another that the vessel is provisioning beautifully.',
        harbor.flags.fourthLaunchFailure
          ? 'Now that the berth itself has found a final little reason not to depart, even the storehouse opens new paths of irritation.'
          : 'For now it mostly feels like a straight road to the water, which is how these things become dangerous.',
      ],
      options,
    };
  },
  victualler_row: rootState => {
    const options = [];
    addOption(options, 'Return to the salt storehouse', () => setHarborLocation(rootState, 'salt_storehouse', 'You leave the barrels, eels, pork, and cabbages to their own hierarchy.'));
    return {
      title: 'Victualler Row',
      meta: 'Town side — Food and class',
      description: [
        'Victualler Row reeks of onions, old ale, fish brine, cabbage, and the tiny line between campaign necessity and insult.',
        'Here it becomes plain that pork is for important men, while cabbages are for the rowing and carrying classes who are somehow still expected to admire readiness from below.',
      ],
      options,
    };
  },
  rope_crane_pier: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Continue to the signal beacon tower', () => setHarborLocation(rootState, 'signal_beacon_tower', 'You push onward beneath the tower where signals go to look official.'));
    addOption(options, 'Go out to the capstan walk', () => setHarborLocation(rootState, 'capstan_walk', 'You head toward the great capstan where motion depends on being told to exist.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    addOption(options, 'Cut over to the boatyard slip', () => setHarborLocation(rootState, 'boatyard_slip', 'You step toward the slip where wedges and pins matter more than anyone admits.'), {
      hidden: !harbor.flags.secondLaunchFailure,
    });
    addOption(options, 'Bind the corrected warp hardware into a proper warp lead', () => {
      adjustHarborItem(rootState, 'warp_hook', -1);
      adjustHarborItem(rootState, 'bollard_pin', -1);
      adjustHarborItem(rootState, 'proper_warp_lead', 1);
      harbor.flags.properWarpLeadMade = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'With hook and pin together, the pier finally yields a proper warp lead, which everyone assures you was implied all along.');
      render(rootState);
    }, { disabled: harbor.flags.properWarpLeadMade || !hasHarborItem(harbor, 'warp_hook') || !hasHarborItem(harbor, 'bollard_pin') });
    addOption(options, 'Return to the salt storehouse', () => setHarborLocation(rootState, 'salt_storehouse', 'You back away from the rope crane toward the thicker town traffic.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    return {
      title: 'Rope Crane Pier',
      meta: 'Quay side — Heavy lines and omitted steps',
      description: [
        'The rope crane pier is all wet planks, coiled hawsers, labor gangs, and the sort of heavy work that is somehow never the source of delay until exactly now.',
        harbor.flags.firstLaunchFailure
          ? 'Now that the first failed launch has exposed the capstan omission, men here speak in even tighter little technical phrases.'
          : 'At first glance, this seems like only one more obvious step on the way to a ship that is “already ready.”',
      ],
      options,
    };
  },
  capstan_walk: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the capstan order tally from the waiting crew bench', () => {
      if (!harbor.flags.tookCapstanOrderTally) {
        adjustHarborItem(rootState, 'capstan_order_tally', 1);
        harbor.flags.tookCapstanOrderTally = true;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The capstan master assures you the capstan was fully ready, only nobody had formally told him the launch decision had truly been made. You take the order tally.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookCapstanOrderTally });
    addOption(options, 'Present the formal launch order and make the crew haul', () => {
      adjustHarborItem(rootState, 'launch_order', -1);
      harbor.flags.capstanCleared = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'The capstan crew now hauls dutifully. This solves the first blocker so completely that it reveals the second.');
      render(rootState);
    }, { disabled: harbor.flags.capstanCleared || !hasHarborItem(harbor, 'launch_order') });
    addOption(options, 'Return to the rope crane pier', () => setHarborLocation(rootState, 'rope_crane_pier', 'You leave the walking circles of the capstan and head back to the pier.'));
    return {
      title: 'Capstan Walk',
      meta: 'Ship side — Hauling circle',
      description: [
        'Around the capstan, men wait in professional idleness, ready in every sense except the only one that counts.',
        'No one disputes that the ship can be hauled clear. They merely observe that no proper launch word ever reached them.',
      ],
      options,
    };
  },
  boatyard_slip: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take a bollard pin from the slip fittings bench', () => {
      if (!harbor.flags.tookBollardPin) {
        adjustHarborItem(rootState, 'bollard_pin', 1);
        harbor.flags.tookBollardPin = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'You claim a bollard pin while two shipwrights debate whether the quay warp should ever have been led that way in the first place.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookBollardPin });
    addOption(options, 'Assemble the final departure fittings at the slip bench', () => {
      adjustHarborItem(rootState, 'oakum_twist', -1);
      adjustHarborItem(rootState, 'boat_hook_collar_pin', -1);
      adjustHarborItem(rootState, 'mast_band_wedge', -1);
      adjustHarborItem(rootState, 'departure_fittings', 1);
      harbor.flags.departureFittingsMade = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'The slip bench finally yields a bundle of departure fittings so small and so consequential that it deserves resentment.');
      render(rootState);
    }, { disabled: harbor.flags.departureFittingsMade || !hasHarborItem(harbor, 'oakum_twist') || !hasHarborItem(harbor, 'boat_hook_collar_pin') || !hasHarborItem(harbor, 'mast_band_wedge') });
    addOption(options, 'Return to the rope crane pier', () => setHarborLocation(rootState, 'rope_crane_pier', 'You leave the slip and head back to the main pier traffic.'));
    return {
      title: 'Boatyard Slip',
      meta: 'Ship side — Fittings and wedges',
      description: [
        'The slip is scattered with rollers, wedges, collars, spare irons, and the practical little hardware that great men forget exists until a warship refuses to move.',
        harbor.flags.fourthLaunchFailure
          ? 'Now the final blocker has driven you back here, and the small parts suddenly matter more than every earlier speech about urgency.'
          : 'Even before that final stage, this place smells like future embarrassment.',
      ],
      options,
    };
  },
  signal_beacon_tower: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Continue to the launch quay', () => setHarborLocation(rootState, 'launch_quay', 'You descend toward the berth where readiness keeps failing in public.'));
    addOption(options, 'Enter the lamp room under the tower', () => setHarborLocation(rootState, 'lamp_room', 'You duck into the lamp room among shutters, oil, and procedural certainty.'), {
      hidden: !harbor.flags.thirdLaunchFailure,
    });
    addOption(options, 'Climb up into the crow’s nest view', () => setHarborLocation(rootState, 'crows_nest', 'You climb higher into rigging and wind in search of the next tiny truth.'), {
      hidden: !harbor.flags.thirdLaunchFailure,
    });
    addOption(options, 'Correct the launch signal with tide slate, lantern slide, and moon mark', () => {
      adjustHarborItem(rootState, 'tide_slate', -1);
      adjustHarborItem(rootState, 'lantern_slide', -1);
      adjustHarborItem(rootState, 'moon_mark_scrap', -1);
      adjustHarborItem(rootState, 'cleared_launch_signal', 1);
      harbor.flags.clearedLaunchSignalMade = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'At last the tide mark, lantern slide, and moon scrap agree. The tower emits a corrected launch signal with humiliating dignity.');
      render(rootState);
    }, { disabled: harbor.flags.clearedLaunchSignalMade || !hasHarborItem(harbor, 'tide_slate') || !hasHarborItem(harbor, 'lantern_slide') || !hasHarborItem(harbor, 'moon_mark_scrap') });
    addOption(options, 'Set the corrected launch signal and clear the tower-side objection', () => {
      adjustHarborItem(rootState, 'cleared_launch_signal', -1);
      harbor.flags.signalCleared = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'The corrected launch signal finally flies. Naturally this only prepares the harbor to discover one last physical objection at the berth.');
      render(rootState);
    }, { disabled: harbor.flags.signalCleared || !hasHarborItem(harbor, 'cleared_launch_signal') });
    addOption(options, 'Return to the rope crane pier', () => setHarborLocation(rootState, 'rope_crane_pier', 'You leave the tower and head back toward the lower pier.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    return {
      title: 'Signal Beacon Tower',
      meta: 'Quay side — Signals and oversight',
      description: [
        'The signal tower overlooks the harbor with the serene uselessness of any place that mistakes visibility for clarity.',
        harbor.flags.thirdLaunchFailure
          ? 'Now that the berth has failed for signal reasons, every lamp, shutter, and tide mark in this tower becomes an article of war.'
          : 'Until then it mostly seems decorative, which is exactly how signal problems thrive.',
      ],
      options,
    };
  },
  lamp_room: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the proper lantern slide from the wall rack', () => {
      if (!harbor.flags.tookLanternSlide) {
        adjustHarborItem(rootState, 'lantern_slide', 1);
        harbor.flags.tookLanternSlide = true;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The tower keeper swears the signals were ready, only the wrong lantern slide had remained fitted. You take the proper one.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookLanternSlide });
    addOption(options, 'Return to the signal tower stairs', () => setHarborLocation(rootState, 'signal_beacon_tower', 'You leave the lamp room clutching one more tiny authority.'));
    return {
      title: 'Lamp Room',
      meta: 'Quay side — Lantern apparatus',
      description: [
        'The lamp room is cramped with oil, soot, shutters, slides, and the offended dignity of men who think a wrong signal plate is too small to count as a delay.',
      ],
      options,
    };
  },
  crows_nest: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the moon-mark scrap from the nest watcher’s notes', () => {
      if (!harbor.flags.tookMoonMarkScrap) {
        adjustHarborItem(rootState, 'moon_mark_scrap', 1);
        harbor.flags.tookMoonMarkScrap = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'From the height of the crow’s nest, the wrong moon mark becomes embarrassingly obvious. You take the scrap proving it.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookMoonMarkScrap, hidden: harbor.flags.signalCleared });
    addOption(options, 'Pry loose a mast-band wedge from the upper rigging', () => {
      if (!harbor.flags.tookMastBandWedge) {
        adjustHarborItem(rootState, 'mast_band_wedge', 1);
        harbor.flags.tookMastBandWedge = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'You come down from the rigging with a mast-band wedge that no one thought to miss until departure depended on it.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookMastBandWedge, hidden: !harbor.flags.fourthLaunchFailure });
    addOption(options, 'Climb back down to the signal beacon tower', () => setHarborLocation(rootState, 'signal_beacon_tower', 'You descend from the nest with a better view and worse opinions.'));
    return {
      title: 'Crow’s Nest',
      meta: 'Ship side — Rigging view',
      description: [
        'From the nest the harbor arranges itself into lines, marks, tide edges, and lies. Everything below looks simpler from above, which is part of the problem.',
        harbor.flags.fourthLaunchFailure
          ? 'By the final blocker, even the upper rigging has become another source of one tiny indispensable part.'
          : 'Before that, the height is mostly useful for understanding how much ground your errands are about to cover.',
      ],
      options,
    };
  },
  launch_quay: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Try to launch the ship everyone says is ready', () => {
      if (!harbor.flags.firstLaunchFailure) {
        harbor.flags.firstLaunchFailure = true;
        harbor.counters.failedLaunches += 1;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'At the launch quay you learn the ship cannot even begin leaving, because the capstan crew were never properly told that launch had truly been ordered. The ship remains, in everyone’s words, “ready.”');
        render(rootState);
        return;
      }
      if (harbor.flags.capstanCleared && !harbor.flags.secondLaunchFailure) {
        harbor.flags.secondLaunchFailure = true;
        harbor.counters.failedLaunches += 1;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'Now the hauling begins and immediately reveals the shore warp is led wrong for clearing the quay. Several men explain this is not a real blocker, only a quay-side correction.');
        render(rootState);
        return;
      }
      if (harbor.flags.warpCleared && !harbor.flags.thirdLaunchFailure) {
        harbor.flags.thirdLaunchFailure = true;
        harbor.counters.failedLaunches += 1;
        harbor.counters.assurancesHeard += 1;
        if (!harbor.flags.kingFuryCounted) {
          harbor.flags.kingFuryCounted = true;
          harbor.counters.furiousMeetings += 1;
        }
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The ship finally lies clear enough to leave, whereupon the king himself appears furious and is told, with complete straightness, that the vessel is ready apart from a technical signal-and-tide misunderstanding.');
        render(rootState);
        return;
      }
      if (harbor.flags.signalCleared && !harbor.flags.fourthLaunchFailure) {
        harbor.flags.fourthLaunchFailure = true;
        harbor.counters.failedLaunches += 1;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'Signal and tide now agree, which finally exposes the last blocker: a ridiculous cluster of departure fittings at the berth that no one had thought worth naming aloud.');
        render(rootState);
        return;
      }
      if (harbor.flags.departureCleared && !harbor.flags.launchDone) {
        harbor.flags.launchDone = true;
        harbor.outcome = 'launched';
        saveSharedState(rootState);
        setHarborLocation(rootState, 'war_launch', 'The berth finally yields. The ship goes out as if it had always meant to.');
      }
    }, {
      disabled:
        harbor.flags.launchDone ||
        (harbor.flags.firstLaunchFailure && !harbor.flags.capstanCleared) ||
        (harbor.flags.secondLaunchFailure && !harbor.flags.warpCleared) ||
        (harbor.flags.thirdLaunchFailure && !harbor.flags.signalCleared) ||
        (harbor.flags.fourthLaunchFailure && !harbor.flags.departureCleared),
    });
    addOption(options, 'Go out to the mudflat skiff landing', () => setHarborLocation(rootState, 'mudflat_skiff_landing', 'You head down toward the mudflat where the underside of quay work becomes visible.'), {
      hidden: !harbor.flags.secondLaunchFailure,
    });
    addOption(options, 'Step into the pilots’ tavern for the tide truth', () => setHarborLocation(rootState, 'pilots_tavern', 'You leave the berth for the tavern where tide wisdom grows loud and local.'), {
      hidden: !harbor.flags.thirdLaunchFailure,
    });
    addOption(options, 'Re-lead the shore warp properly with the corrected hardware', () => {
      adjustHarborItem(rootState, 'proper_warp_lead', -1);
      harbor.flags.warpCleared = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'The shore warp is finally led the way it should have been led from the first. Several men now speak as if they had implied this all morning.');
      render(rootState);
    }, { disabled: harbor.flags.warpCleared || !hasHarborItem(harbor, 'proper_warp_lead'), hidden: !harbor.flags.secondLaunchFailure });
    addOption(options, 'Fit the final departure hardware at the berth', () => {
      adjustHarborItem(rootState, 'departure_fittings', -1);
      harbor.flags.departureCleared = true;
      saveSharedState(rootState);
      appendHarborLog(rootState, 'The little departure fittings go into place. Nobody apologizes. Everyone now agrees the ship is truly ready for the first time.');
      render(rootState);
    }, { disabled: harbor.flags.departureCleared || !hasHarborItem(harbor, 'departure_fittings'), hidden: !harbor.flags.fourthLaunchFailure });
    addOption(options, 'Return to the signal beacon tower', () => setHarborLocation(rootState, 'signal_beacon_tower', 'You leave the berth for the tower and its official outlook.'), {
      hidden: !harbor.flags.firstLaunchFailure,
    });
    return {
      title: 'Launch Quay',
      meta: 'Ship side — The obvious endpoint',
      description: [
        'Here at the berth the gangway is clear, the crew are present, the lords are impatient, the war is waiting, and every responsible person insists with exemplary seriousness that the ship is ready to launch.',
        describeCurrentBlocker(harbor),
      ],
      options,
    };
  },
  mudflat_skiff_landing: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the warp hook from the skiff tackle crate', () => {
      if (!harbor.flags.tookWarpHook) {
        adjustHarborItem(rootState, 'warp_hook', 1);
        harbor.flags.tookWarpHook = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'You retrieve a warp hook from the skiff tackle where the low-water crew insist the quay-side men should have known better.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookWarpHook });
    addOption(options, 'Return to the launch quay', () => setHarborLocation(rootState, 'launch_quay', 'You slog back from the mudflat to the main berth.'));
    return {
      title: 'Mudflat Skiff Landing',
      meta: 'Ship side — Low-water access',
      description: [
        'At low water the mudflat skiff landing shows the harbor’s underside: slimy piles, skiff ropes, bent irons, and practical knowledge kept below the dignity of the main quay.',
      ],
      options,
    };
  },
  pilots_tavern: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take the tide slate from the pilot bench', () => {
      if (!harbor.flags.tookTideSlate) {
        adjustHarborItem(rootState, 'tide_slate', 1);
        harbor.flags.tookTideSlate = true;
        harbor.counters.assurancesHeard += 1;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The pilots insist the launch is ready and only the tower mark is wrong. You take the tide slate that proves what they mean by that.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookTideSlate });
    addOption(options, 'Return to the launch quay', () => setHarborLocation(rootState, 'launch_quay', 'You leave the pilots and their loud water certainty behind.'));
    return {
      title: 'Pilots’ Tavern',
      meta: 'Town edge — Tide knowledge',
      description: [
        'The pilots’ tavern is full of wet cloaks, slapped tables, tide marks cut into wood, and men whose local confidence would be reassuring if it ever agreed with itself.',
      ],
      options,
    };
  },
  caulking_shed: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take a tarred oakum twist from the caulker’s bench', () => {
      if (!harbor.flags.tookOakumTwist) {
        adjustHarborItem(rootState, 'oakum_twist', 1);
        harbor.flags.tookOakumTwist = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'The caulkers surrender a twist of tarred oakum after explaining that this is not a launch blocker, merely the reason the last little hardware cannot yet sit properly.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookOakumTwist });
    addOption(options, 'Return to the salt storehouse', () => setHarborLocation(rootState, 'salt_storehouse', 'You leave the pitch smoke and return toward the barrels and traffic.'));
    return {
      title: 'Caulking Shed',
      meta: 'Town side — Tar and seam work',
      description: [
        'Pitch smoke hangs under the shed roof while oakum, seam tools, and buckets of blackened matter wait on benches scarred by practical impatience.',
      ],
      options,
    };
  },
  oarmaker_yard: rootState => {
    const harbor = rootState.dlc[DLC_KEYS.harbor];
    const options = [];
    addOption(options, 'Take a boat-hook collar pin from the spare fittings rail', () => {
      if (!harbor.flags.tookBoatHookCollarPin) {
        adjustHarborItem(rootState, 'boat_hook_collar_pin', 1);
        harbor.flags.tookBoatHookCollarPin = true;
        saveSharedState(rootState);
        appendHarborLog(rootState, 'In the oarmaker yard you acquire a boat-hook collar pin, which everyone treats as too minor to matter right up until departure depends on it.');
      }
      render(rootState);
    }, { disabled: harbor.flags.tookBoatHookCollarPin });
    addOption(options, 'Return to the salt storehouse', () => setHarborLocation(rootState, 'salt_storehouse', 'You leave the timber curls and head back toward the main harbor path.'));
    return {
      title: 'Oarmaker Yard',
      meta: 'Town side — Timber fittings',
      description: [
        'Long poles, shaved ash, hook collars, and spare fittings line the oarmaker yard, all smelling of sap, salt, and the confidence of men whose work only matters when everything else is supposed to be done.',
      ],
      options,
    };
  },
  war_launch: () => ({
    title: 'War Launch',
    meta: 'Ending — Finally under way',
    description: [
      'At last the ship moves free of the quay, every tiny hidden condition having finally been dragged out into daylight and corrected.',
      'No one says they were wrong. They merely begin speaking as if this smooth departure had always been the expected outcome.',
      'The harbor falls behind. There is a war to reach, and the game is over here.',
    ],
    options: [],
  }),
};

function render(rootState) {
  const harbor = ensureHarborState(rootState);
  const sceneFactory = SCENES[harbor.location];
  if (!sceneFactory) {
    return;
  }
  const scene = sceneFactory(rootState);
  SELECTORS.roomMeta.textContent = scene.meta || '';
  SELECTORS.roomTitle.textContent = scene.title;
  syncIllustration(harbor.location);
  if (typeof scene.description === 'string') {
    SELECTORS.roomDescription.innerHTML = `<p>${scene.description}</p>`;
  } else {
    SELECTORS.roomDescription.innerHTML = scene.description.map(paragraph => `<p>${paragraph}</p>`).join('');
  }
  SELECTORS.options.innerHTML = '';
  scene.options
    .filter(option => !option.hidden)
    .forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-button';
      button.textContent = option.label;
      button.disabled = Boolean(option.disabled);
      button.addEventListener('click', option.onSelect);
      SELECTORS.options.appendChild(button);
    });
  renderInventory(rootState);
  renderResources(rootState);
  renderQuests(rootState);
  renderLog(rootState);
}

function bootstrapHarborState(rootState) {
  const harbor = ensureHarborState(rootState);
  if (!harbor.location) {
    harbor.location = 'harbor_road';
    harbor.visited.harbor_road = true;
    harbor.introSeen = true;
    saveSharedState(rootState);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const rootState = loadSharedState();
  const shell = document.getElementById('harborApp');
  const layoutToggle = document.getElementById('layoutToggle');
  const layoutKey = 'castle_ledger_layout_mode_v1';
  const layoutModes = ['split', 'choices-stacked', 'all-stacked'];
  const layoutLabels = {
    split: 'Stack choices',
    'choices-stacked': 'Stack ledger too',
    'all-stacked': 'Split into 3 columns',
  };
  function normalizeLayoutMode(mode) {
    if (mode === 'stacked') {
      return 'choices-stacked';
    }
    return layoutModes.includes(mode) ? mode : 'split';
  }
  function syncLayout(mode) {
    if (!shell || !layoutToggle) {
      return;
    }
    const normalized = normalizeLayoutMode(mode);
    shell.classList.toggle('layout-split', normalized === 'split');
    shell.classList.toggle('layout-choices-stacked', normalized === 'choices-stacked');
    shell.classList.toggle('layout-all-stacked', normalized === 'all-stacked');
    layoutToggle.setAttribute('aria-pressed', String(normalized === 'split'));
    layoutToggle.textContent = layoutLabels[normalized];
  }
  if (shell && layoutToggle) {
    let savedMode = null;
    try {
      savedMode = window.localStorage.getItem(layoutKey);
    } catch (error) {}
    syncLayout(savedMode);
    layoutToggle.addEventListener('click', () => {
      let currentMode = 'split';
      if (shell.classList.contains('layout-choices-stacked')) {
        currentMode = 'choices-stacked';
      } else if (shell.classList.contains('layout-all-stacked')) {
        currentMode = 'all-stacked';
      }
      const currentIndex = layoutModes.indexOf(currentMode);
      const nextMode = layoutModes[(currentIndex + 1) % layoutModes.length];
      syncLayout(nextMode);
      try {
        window.localStorage.setItem(layoutKey, nextMode);
      } catch (error) {}
    });
  }
  if (!isInstalled(rootState, DLC_KEYS.harbor)) {
    const install = rootState.dlc.installs[DLC_KEYS.harbor];
    if (install?.startedAt) {
      const percent = Math.round(getInstallProgress(rootState, DLC_KEYS.harbor) * 100);
      SELECTORS.notInstalledMessage.textContent = `The premium installer is still dramatizing itself. Harbor of Delays is currently installing at about ${percent}%.`;
      window.setTimeout(() => {
        const nextState = loadSharedState();
        syncInstallCompletion(nextState, DLC_KEYS.harbor);
        if (isInstalled(nextState, DLC_KEYS.harbor)) {
          bootstrapHarborState(nextState);
          SELECTORS.notInstalled.hidden = true;
          SELECTORS.app.hidden = false;
          render(nextState);
        }
      }, 600);
    } else {
      SELECTORS.notInstalledMessage.textContent = 'You cannot fail to launch this warship until the premium installer has formally finished pretending to help.';
    }
    SELECTORS.notInstalled.hidden = false;
    return;
  }
  bootstrapHarborState(rootState);
  SELECTORS.app.hidden = false;
  render(rootState);
});
