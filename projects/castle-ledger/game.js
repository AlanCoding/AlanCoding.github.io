(function () {
  'use strict';

  const COOKIE_NAME = 'castle_ledger_state_v1';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  const ITEM_CATALOG = {
    silver_pennies: { name: 'Silver pennies', description: 'Coin of the realm minted under Earl Radulf.' },
    salted_pork: { name: 'Salted pork haunch', description: 'Wrapped in waxed linen, fit to sate a hungry hound.' },
    hemp_rope: { name: 'Coil of hemp rope', description: 'Thirty cubits of braided hemp with an iron hook.' },
    linen_bandage: { name: 'Linen field bandage', description: 'Boiled in wine and ready to bind a wound.' },
    iron_spike: { name: 'Iron gate spike', description: 'A tapered wedge for locking a drawbridge chain.' },
    wax_tablet: { name: 'Wax tablet & stylus', description: 'A clerk’s writing surface for jotting testimony.' },
    sealed_dispatch: { name: 'Sealed dispatch', description: 'A pigeon-borne warning bound for the master-at-arms.' },
  };

  const DEFAULT_STATE = {
    location: 'south_road',
    visited: { south_road: true },
    inventory: {
      silver_pennies: 6,
      salted_pork: 0,
      hemp_rope: 0,
      linen_bandage: 0,
      iron_spike: 0,
      wax_tablet: 0,
      sealed_dispatch: 0,
    },
    flags: {
      butcherMet: false,
      meatPurchased: false,
      ropemakerMet: false,
      ropeSecured: false,
      dogFed: false,
      dogLocation: 'postern',
      shrineBlessing: false,
      scribeQuiz: false,
      bandageEarned: false,
      injuredGuardTreated: false,
      enteredCastle: false,
      courtIndex: 0,
      scrollAssigned: false,
      scrollDelivered: false,
      rearBridgeSecured: false,
      millersHelped: false,
      reportComplete: false,
      earlRewarded: false,
    },
    log: ['You arrive on the southern road to Beldane Keep with a satchel of writs and a ledger.'],
  };

  const SELECTORS = {
    roomMeta: document.getElementById('roomMeta'),
    roomTitle: document.getElementById('roomTitle'),
    roomIllustration: document.getElementById('roomIllustration'),
    roomIllustrationImage: document.getElementById('roomIllustrationImage'),
    roomIllustrationCaption: document.getElementById('roomIllustrationCaption'),
    roomDescription: document.getElementById('roomDescription'),
    options: document.getElementById('options'),
    inventoryList: document.getElementById('inventoryList'),
    questList: document.getElementById('questList'),
    eventLog: document.getElementById('eventLog'),
    resetButton: document.getElementById('resetGame'),
    progressNote: document.getElementById('progressNote'),
  };

  function cloneState(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function overwriteState(nextState) {
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, nextState);
    saveState();
  }

  function loadState() {
    const cookieValue = readCookie(COOKIE_NAME);
    if (!cookieValue) {
      saveState(DEFAULT_STATE);
      return cloneState(DEFAULT_STATE);
    }
    try {
      const parsed = JSON.parse(cookieValue);
      return normalizeState(parsed);
    } catch (error) {
      console.warn('Failed to parse castle ledger cookie, resetting state.', error);
      saveState(DEFAULT_STATE);
      return cloneState(DEFAULT_STATE);
    }
  }

  function normalizeState(raw) {
    const next = cloneState(DEFAULT_STATE);
    if (raw && typeof raw === 'object') {
      if (typeof raw.location === 'string') {
        next.location = raw.location;
      }
      if (raw.visited && typeof raw.visited === 'object') {
        next.visited = Object.keys(raw.visited).reduce((acc, key) => {
          acc[key] = Boolean(raw.visited[key]);
          return acc;
        }, {});
      }
      if (raw.inventory && typeof raw.inventory === 'object') {
        for (const key of Object.keys(ITEM_CATALOG)) {
          const value = Number.parseInt(raw.inventory[key], 10);
          next.inventory[key] = Number.isFinite(value) && value >= 0 ? value : 0;
        }
      }
      if (raw.flags && typeof raw.flags === 'object') {
        Object.keys(next.flags).forEach(flag => {
          if (flag === 'dogLocation') {
            const location = raw.flags[flag];
            if (location === 'postern' || location === 'pond') {
              next.flags[flag] = location;
            }
          } else if (typeof next.flags[flag] === 'boolean') {
            next.flags[flag] = Boolean(raw.flags[flag]);
          } else if (typeof next.flags[flag] === 'number') {
            const value = Number.parseInt(raw.flags[flag], 10);
            next.flags[flag] = Number.isFinite(value) ? value : next.flags[flag];
          }
        });
      }
      if (Array.isArray(raw.log)) {
        next.log = raw.log.slice(-12).map(entry => String(entry));
      }
    }
    saveState(next);
    return next;
  }

  function saveState(customState = state) {
    writeCookie(COOKIE_NAME, JSON.stringify(customState), COOKIE_MAX_AGE);
  }

  function readCookie(name) {
    const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, maxAgeSeconds) {
    document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAgeSeconds};path=/;SameSite=Lax`;
  }

  function appendLog(message) {
    state.log.push(message);
    state.log = state.log.slice(-12);
    saveState();
  }

  function setLocation(nextLocation, logMessage) {
    state.location = nextLocation;
    state.visited[nextLocation] = true;
    saveState();
    if (logMessage) {
      appendLog(logMessage);
    }
    render();
  }

  function adjustItem(itemKey, delta) {
    if (!Object.prototype.hasOwnProperty.call(state.inventory, itemKey)) {
      return;
    }
    state.inventory[itemKey] = Math.max(0, state.inventory[itemKey] + delta);
    saveState();
  }

  function hasItem(itemKey, amount = 1) {
    return (state.inventory[itemKey] || 0) >= amount;
  }

  function spendCoins(amount) {
    if (!hasItem('silver_pennies', amount)) {
      return false;
    }
    adjustItem('silver_pennies', -amount);
    return true;
  }

  function render() {
    const room = ROOMS[state.location];
    if (!room) {
      SELECTORS.roomTitle.textContent = 'Unknown location';
      SELECTORS.roomDescription.textContent = 'The ledger shows a smudged entry. Something has gone awry.';
      SELECTORS.options.innerHTML = '';
      return;
    }
    const snapshot = room(state);
    SELECTORS.roomMeta.textContent = snapshot.meta || '';
    SELECTORS.roomTitle.textContent = snapshot.title;
    if (snapshot.illustration) {
      SELECTORS.roomIllustration.hidden = false;
      SELECTORS.roomIllustrationImage.src = snapshot.illustration;
      SELECTORS.roomIllustrationImage.alt = snapshot.illustrationAlt || snapshot.title;
      if (snapshot.illustrationCaption) {
        SELECTORS.roomIllustrationCaption.hidden = false;
        SELECTORS.roomIllustrationCaption.textContent = snapshot.illustrationCaption;
      } else {
        SELECTORS.roomIllustrationCaption.textContent = '';
        SELECTORS.roomIllustrationCaption.hidden = true;
      }
    } else {
      SELECTORS.roomIllustration.hidden = true;
      SELECTORS.roomIllustrationImage.removeAttribute('src');
      SELECTORS.roomIllustrationImage.alt = '';
      SELECTORS.roomIllustrationCaption.textContent = '';
      SELECTORS.roomIllustrationCaption.hidden = true;
    }
    if (typeof snapshot.description === 'string') {
      SELECTORS.roomDescription.innerHTML = `<p>${snapshot.description.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
    } else if (Array.isArray(snapshot.description)) {
      SELECTORS.roomDescription.innerHTML = snapshot.description.map(paragraph => `<p>${paragraph}</p>`).join('');
    } else {
      SELECTORS.roomDescription.textContent = '';
    }

    SELECTORS.options.innerHTML = '';
    snapshot.options
      .filter(option => !option.hidden)
      .forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-button';
        button.textContent = option.label;
        if (option.disabled) {
          button.disabled = true;
        }
        button.addEventListener('click', () => {
          option.onSelect();
        });
        SELECTORS.options.appendChild(button);
      });

    renderInventory();
    renderQuests();
    renderLog();
    renderProgress();
  }

  function renderInventory() {
    SELECTORS.inventoryList.innerHTML = '';
    Object.keys(ITEM_CATALOG).forEach(itemKey => {
      const info = ITEM_CATALOG[itemKey];
      const li = document.createElement('li');
      li.className = 'inventory-item';
      const name = document.createElement('span');
      name.innerHTML = `<strong>${info.name}</strong><br><small>${info.description}</small>`;
      const count = document.createElement('span');
      count.textContent = state.inventory[itemKey];
      li.appendChild(name);
      li.appendChild(count);
      SELECTORS.inventoryList.appendChild(li);
    });
  }

  function renderQuests() {
    const quests = [];
    if (!state.flags.enteredCastle) {
      quests.push('Gain entry to Beldane Keep.');
    } else {
      quests.push('Keep exploring the castle interior.');
    }
    if (!state.flags.dogFed) {
      quests.push('Find something to distract the mastiff guarding the eastern postern.');
    } else if (state.flags.dogLocation === 'pond') {
      quests.push('The kennel mastiff is gnawing his reward by the mill pond.');
    }
    if (!state.flags.bandageEarned) {
      quests.push('Someone in need of care might exchange a bandage for your help.');
    } else if (!state.flags.injuredGuardTreated) {
      quests.push('Deliver the bandage to the wounded guard at the training yard gate.');
    }
    if (!state.flags.scrollAssigned) {
      quests.push('Watch for urgent news from the guard station.');
    } else if (!state.flags.scrollDelivered) {
      quests.push('Deliver the sealed dispatch to the master-at-arms.');
    } else if (!state.flags.rearBridgeSecured) {
      quests.push('Use the iron spike to secure the rear drawbridge chains.');
    } else if (!state.flags.reportComplete) {
      quests.push('Report back to the guard station once the rear bridge is secured.');
    } else if (!state.flags.earlRewarded) {
      quests.push('Present yourself in the great hall to witness the earl’s decision.');
    } else {
      quests.push('Keep the ledger current as the keep braces for the coming storm.');
    }

    SELECTORS.questList.innerHTML = '';
    quests.forEach(text => {
      const item = document.createElement('li');
      item.textContent = text;
      SELECTORS.questList.appendChild(item);
    });
  }

  function renderLog() {
    const latest = state.log[state.log.length - 1];
    SELECTORS.eventLog.textContent = latest || 'The ledger is blank for now.';
  }

  function renderProgress() {
    const visitedCount = Object.values(state.visited).filter(Boolean).length;
    SELECTORS.progressNote.textContent = `Visited ${visitedCount} scenes • Ledger entries kept: ${state.log.length}`;
  }

  function addOption(options, label, handler, config = {}) {
    options.push({
      label,
      onSelect: () => {
        handler();
        render();
      },
      disabled: Boolean(config.disabled),
      hidden: Boolean(config.hidden),
    });
  }

  const COURT_CASES = [
    'A tenant from the low meadow petitions for remission of rent after hail crushed his barley.',
    'Two merchants argue over a shipment of Flemish cloth mistakenly dyed the wrong hue.',
    'A cooper pleads for timber rights while the forester insists the oaks belong to the lord.',
    'A pair of sisters demand judgment about a dowry chest left in the abbey’s care.',
    'A veteran archer seeks recompense for a bowstring snapped during the earl’s hunt.',
  ];

  function describeDogState() {
    if (!state.flags.dogFed) {
      return 'A brindled mastiff, muscles like twisted rope, watches you from beside the postern with hackles raised. His handler is nowhere in sight.';
    }
    if (state.flags.dogLocation === 'pond') {
      return 'The mastiff you fed earlier now lies beside the mill pond, gnawing happily on the pork you offered.';
    }
    return 'The kennel mastiff looks at you expectantly, clearly remembering your previous kindness.';
  }
  const ROOMS = {
    south_road: state => {
      const description = [
        'The southern road rises gently toward Beldane Keep. Wagon ruts trace muddy grooves past carts stacked with barley sheaves. A thatcher hums while repairing a roadside shelter, and smoke from the castle kitchens drifts on the wind.',
        'Children play at knights with willow sticks, pausing to stare as you pass. The keep’s front drawbridge looms ahead, chains taut above the moat’s green sheen.'
      ];
      if (!state.flags.shrineBlessing) {
        description.push('A wayside shrine to Saint Guthlac sits beneath a hawthorn tree. Fresh rushes are spread before it.');
      } else {
        description.push('You feel the smooth pebble from Saint Guthlac’s shrine in your palm, a reminder of the blessing you received.');
      }
      const options = [];
      addOption(options, 'Continue along the lane toward the market bustle by the southern wall', () => setLocation('south_market_lane', 'You follow the wagon ruts toward the market lane.'));
      addOption(options, 'Circle west along the moat toward the dyers’ yards', () => setLocation('west_sally_port', 'You skirt the moat’s edge toward the west sally port.'));
      addOption(options, 'Visit the hawthorn shrine tended by passing pilgrims', () => setLocation('pilgrim_shrine', 'You bow your head and step beneath the hawthorn branches.'));
      return {
        title: 'Southern Road to Beldane Keep',
        meta: 'Outer ring — South road approach',
        illustration: 'assets/illustrations/south_road.png',
        illustrationAlt: 'Castle clerk approaching Beldane Keep along a muddy southern road lined with carts and villagers.',
        illustrationCaption: 'Southern road at daybreak — early errands toward Beldane Keep.',
        description,
        options,
      };
    },
    south_market_lane: state => {
      const description = [
        'Canvas awnings flap above the market lane. Peddlers hawk dried eels, onions plaited in strings, and pots of goose fat. The moat lies to your left, while timbered cottages cluster to your right.',
      ];
      if (!state.flags.butcherMet) {
        description.push('A butcher under a red canopy watches you, his cleaver resting on a block. He eyes your purse with interest.');
      } else if (!state.flags.meatPurchased) {
        description.push('The butcher waits, cleaver gleaming, ready to strike another bargain if you change your mind.');
      } else {
        description.push('The butcher nods when he sees you, satisfied that his best cut is already spoken for.');
      }
      const options = [];
      addOption(options, 'Approach the drawbridge plaza before the gatehouse', () => setLocation('front_drawbridge', 'You step closer to the great chains of the drawbridge.'));
      addOption(options, 'Return south toward the pilgrim road', () => setLocation('south_road', 'You leave the market chatter behind.'));
      addOption(options, 'Step beneath the red awning of the butcher’s stall', () => setLocation('butchers_stall', 'The butcher wipes his hands and looks you square in the eye.'));
      return {
        title: 'Market Lane Beside the South Wall',
        meta: 'Outer ring — Southern market',
        description,
        options,
      };
    },
    front_drawbridge: state => {
      const description = [
        'The main drawbridge of Beldane Keep hangs raised. Its oak planks drip from the morning rain, and water beads on the iron chains leading into the gatehouse. A line of peasants waits with tithe carts, muttering about the delay.',
        'The gate warden peers from a murder hole, demanding proof of purpose before lowering the bridge. Heralds’ banners snap overhead.'
      ];
      if (state.flags.enteredCastle) {
        description.push('Now that you are known to the gatehouse, the wardens nod when they see you, recognizing the clerk with the urgent errands.');
      }
      const options = [];
      addOption(options, 'Head east along the path toward the shanties by the mill stream', () => setLocation('southeast_shanty', 'You leave the gatehouse shouts behind for the eastern shanties.'));
      addOption(options, 'Return to the bustle of the market lane', () => setLocation('south_market_lane', 'You step back among the vendors.'));
      addOption(options, 'Step aside to the village green where minstrels rest their feet', () => setLocation('village_green', 'You stroll across the trampled green.'));
      addOption(options, 'Present yourself again to the gate warden', () => {
        if (state.flags.enteredCastle) {
          setLocation('outer_bailey', 'Recognizing you, the gatehouse crew lowers the drawbridge with a groan of chains.');
        } else {
          appendLog('Without writ or escort, the gate warden refuses to lower the main drawbridge.');
        }
      }, { disabled: !state.flags.enteredCastle });
      return {
        title: 'Front Drawbridge Plaza',
        meta: 'Outer ring — Southern gatehouse',
        description,
        options,
      };
    },
    southeast_shanty: state => {
      const description = [
        'Lean-to sheds press against the moat, their roofs patched with sailcloth. Ropewalkers twist hemp fibers while washerwomen beat linen against smooth stones. The air smells of tar, wet wool, and bread baking at a nearby oven.'
      ];
      if (!state.flags.ropemakerMet) {
        description.push('Matilde the ropemaker waves a calloused hand, inviting you closer with a grin. Coils of freshly tarred rope hang from a rack beside her.');
      } else if (!state.flags.ropeSecured) {
        description.push('Matilde waits for your decision about the fine rope she keeps aside for skilled climbers and daring messengers.');
      } else if (hasItem('hemp_rope')) {
        description.push('The rope you bought is looped around your torso, its hemp fibers leaving faint marks on your cloak.');
      }
      const options = [];
      addOption(options, 'Follow the moat toward the mill stream', () => setLocation('east_mill_stream', 'You keep to the bank where the mill’s sluice hums.'));
      addOption(options, 'Return to the main drawbridge plaza', () => setLocation('front_drawbridge', 'You weave back through the shanties to the gate plaza.'));
      addOption(options, 'Enter Matilde the ropemaker’s lean-to', () => setLocation('ropemaker_shack', 'You duck beneath drying ropes as Matilde sizes you up.'));
      return {
        title: 'Shanties of the Ropewalkers',
        meta: 'Outer ring — Southeastern quarter',
        description,
        options,
      };
    },
    east_mill_stream: state => {
      const description = [
        'The moat narrows where the mill stream feeds it. A wooden weir channels water toward the great wheel, whose paddles creak rhythmically. Waterfowl dabble in the shallows. A boy kneels to repair a leaking coracle with fresh pitch.'
      ];
      if (!state.flags.millersHelped) {
        description.push('The miller’s wife waves a dripping paddle, complaining that the sluice cord frayed overnight. A clever hand with rope could secure it.');
      } else {
        description.push('The patched sluice cord holds fast thanks to your help. Grain sacks thud inside the mill as the wheel turns steadily.');
      }
      const options = [];
      addOption(options, 'Walk toward the guarded eastern postern', () => setLocation('east_postern', 'You follow the stream toward the postern tower.'));
      addOption(options, 'Head back toward the ropewalkers’ shanties', () => setLocation('southeast_shanty', 'You retrace your steps past the ropewalk.'));
      addOption(options, 'Cross the plank to speak with the miller’s family', () => setLocation('mill_jetty', 'You balance along the slick plank to the mill jetty.'));
      return {
        title: 'Mill Stream Curve',
        meta: 'Outer ring — Eastern approach',
        description,
        options,
      };
    },
    east_postern: state => {
      const description = [
        'A narrow postern bridge spans the moat to a side gate barred with iron. The stone tower above bears crossbow slits.',
        describeDogState()
      ];
      if (state.flags.ropeSecured && !state.flags.enteredCastle) {
        description.push('The rope you bartered for is coiled around a metal ring. With the mastiff distracted, you could descend to the sally ladder hidden beneath the bridge.');
      }
      const options = [];
      addOption(options, 'Return along the mill stream toward the weir', () => setLocation('east_mill_stream', 'You back away from the postern, senses sharp.'));
      addOption(options, 'Continue north along the moat path toward the monastery gardens', () => setLocation('northeast_monastery', 'You pass the tower and head toward the quiet monastery plots.'));
      if (hasItem('salted_pork')) {
        addOption(options, 'Toss the salted pork to the mastiff to distract him', () => {
          adjustItem('salted_pork', -1);
          state.flags.dogFed = true;
          state.flags.dogLocation = 'pond';
          appendLog('The mastiff snatches the salted pork and lopes off toward the mill pond to feast.');
          saveState();
        }, { disabled: state.flags.dogFed });
      }
      addOption(options, 'Secure your rope to the iron ring beneath the parapet', () => {
        if (!hasItem('hemp_rope')) {
          appendLog('You need a sturdy rope to trust your weight on the postern descent.');
          return;
        }
        state.flags.ropeSecured = true;
        appendLog('You knot the rope to the ring, letting it dangle toward the concealed service ladder below.');
        saveState();
      }, { disabled: state.flags.ropeSecured });
      addOption(options, 'Descend the rope to the service ladder inside the wall', () => {
        if (!state.flags.ropeSecured || (!state.flags.dogFed && state.flags.dogLocation === 'postern')) {
          appendLog('The mastiff growls menacingly and the rope swings uselessly above the cold water. It is not yet safe to descend.');
          return;
        }
        state.flags.enteredCastle = true;
        appendLog('Hand over hand, you lower yourself to the hidden ladder and slip through the postern into the outer bailey.');
        setLocation('outer_bailey', 'You emerge inside the walls where the keep’s bustle thrums.');
      }, { disabled: !state.flags.ropeSecured });
      return {
        title: 'Eastern Postern Bridge',
        meta: 'Outer ring — Eastern postern',
        description,
        options,
      };
    },
    northeast_monastery: state => {
      const description = [
        'Beyond the moat stands a modest priory with stone walls washed in lime. Monks bend over herb plots, tending sage, feverfew, and rue. A parchment-lined dovecote clatters as messenger birds flutter within.'
      ];
      if (!state.flags.scribeQuiz) {
        description.push('Brother Aldwin raises a brow, asking whether you can recall the statutes that govern the earl’s tolls. He clutches a wax tablet, clearly mislaid by a courier.');
      } else {
        description.push('Brother Aldwin thanks you again for reciting the toll statutes. The wax tablet he entrusted to you rests safely in your satchel.');
      }
      const options = [];
      addOption(options, 'Continue north along the reed marsh toward the rear bridge', () => setLocation('north_reed_marsh', 'You tread the damp path beside whispering reeds.'));
      addOption(options, 'Return south to the postern tower', () => setLocation('east_postern', 'You head back toward the vigilant mastiff’s haunt.'));
      addOption(options, 'Step through the priory gate toward the scriptorium', () => setLocation('scriptorium', 'You pass into the quiet cloister where Brother Aldwin waits.'));
      return {
        title: 'Monastery Gardens by the Priory',
        meta: 'Outer ring — Northeastern cloister',
        description,
        options,
      };
    },
    north_reed_marsh: state => {
      const description = [
        'Reeds sway beside the moat’s northern bend. Frogs croak as they bask on stones. Fishermen mend nets under willow trees, while geese hiss protectively at anyone who nears their goslings.'
      ];
      const options = [];
      addOption(options, 'Proceed west toward the rear service bridge', () => setLocation('rear_drawbridge', 'You crunch along the gravel toward the back bridge.'));
      addOption(options, 'Head south toward the monastery gardens', () => setLocation('northeast_monastery', 'You walk back toward the quiet priory.'));
      addOption(options, 'Wade carefully to the fishers’ huts along the marsh', () => setLocation('fishers_huts', 'You follow a plank path to the huts raised above the marshy ground.'));
      return {
        title: 'Northern Reed Marsh',
        meta: 'Outer ring — Marsh walk',
        description,
        options,
      };
    },
    rear_drawbridge: state => {
      const description = [
        'A smaller drawbridge spans the service moat at the rear of the keep. It is lowered for carts laden with firewood. Chain winches creak as stableboys haul sacks of oats across. Guards posted here squint against the wind.'
      ];
      if (state.flags.rearBridgeSecured) {
        description.push('Thanks to the iron spike you drove into the winch gear, the rear bridge cannot drop unexpectedly for saboteurs. The guards salute your foresight.');
      } else {
        description.push('The winch gear rattles dangerously; a saboteur could loose it in moments unless it is secured.');
      }
      const options = [];
      addOption(options, 'Head west toward the hunters’ stands and archery butts', () => setLocation('northwest_hunters', 'You follow deer tracks toward the archery grounds.'));
      addOption(options, 'Return east along the reed marsh path', () => setLocation('north_reed_marsh', 'You follow the reeds rustling back eastward.'));
      addOption(options, 'Inspect the winch gear beneath the rear bridge', () => {
        if (!hasItem('iron_spike')) {
          appendLog('The iron gear chatters but you lack a sturdy spike to lock it. Perhaps the castle smith can supply one.');
          return;
        }
        if (state.flags.rearBridgeSecured) {
          appendLog('The iron spike already holds firm, keeping the winch from dropping the bridge.');
          return;
        }
        state.flags.rearBridgeSecured = true;
        adjustItem('iron_spike', -1);
        appendLog('You hammer the iron spike into the winch gear, locking the rear drawbridge tight against attack.');
        saveState();
      }, { disabled: state.flags.rearBridgeSecured });
      return {
        title: 'Rear Service Drawbridge',
        meta: 'Outer ring — Northern service gate',
        description,
        options,
      };
    },
    northwest_hunters: state => {
      const description = [
        'Game racks and archery butts line the moat path. Fletchers trim goose feathers while hunters share tales of the earl’s winter boar. A weathered sergeant sits with his foot bandaged, nodding to you as he sharpens a skinning knife.'
      ];
      if (!state.flags.bandageEarned) {
        description.push('A young page frets over dwindling bandages for the practice yard. Perhaps help from the traveling leech in a nearby tent could secure more.');
      }
      const options = [];
      addOption(options, 'Continue south toward the west floodgate', () => setLocation('west_floodgate', 'You leave the hunters behind and head toward the floodgate.'));
      addOption(options, 'Return east toward the rear drawbridge', () => setLocation('rear_drawbridge', 'You stroll back toward the creaking winch.'));
      addOption(options, 'Visit the surgeon’s pavilion pitched beside the archery butts', () => setLocation('surgeons_pavilion', 'You lift the tent flap where the leech keeps his instruments.'));
      return {
        title: 'Hunters’ Stands and Archery Butts',
        meta: 'Outer ring — Northwestern grounds',
        description,
        options,
      };
    },
    west_floodgate: state => {
      const description = [
        'Heavy timbers form a floodgate regulating the moat’s flow to the river. Wheelwrights stack spokes nearby while dyers rinse cloth in the outflow. The scent of wet leather clings to the air.'
      ];
      const options = [];
      addOption(options, 'Proceed south toward the guarded west sally port', () => setLocation('west_sally_port', 'You tread toward the stout tower guarding the sally port.'));
      addOption(options, 'Return north toward the hunters’ grounds', () => setLocation('northwest_hunters', 'You walk back to the archery butts.'));
      addOption(options, 'Detour to the tanners’ drying yard', () => setLocation('tanners_yard', 'You approach the racks of hides stretched taut.'));
      return {
        title: 'West Floodgate',
        meta: 'Outer ring — Western sluice',
        description,
        options,
      };
    },
    west_sally_port: state => {
      const description = [
        'A stout tower protects the west sally port. The iron-studded door is barred from within. Defensive machicolations jut overhead, and a heraldic banner depicting a tower and quill flaps in the breeze.'
      ];
      const options = [];
      addOption(options, 'Continue south to the pilgrim road', () => setLocation('south_road', 'You complete the circuit back to the southern road.'));
      addOption(options, 'Return north toward the floodgate', () => setLocation('west_floodgate', 'You head back toward the sluice.'));
      addOption(options, 'Rap upon the barred sally port', () => {
        if (!state.flags.enteredCastle) {
          appendLog('A guard from within shouts for you to seek entry by the postern or present a written order at the main gate.');
        } else {
          appendLog('Once you announce yourself as the clerk on duty, the inner guard unbars the sally port if you need to exit swiftly.');
          setLocation('outer_bailey', 'The guard lets you slip back inside the bailey.');
        }
      }, { disabled: !state.flags.enteredCastle });
      return {
        title: 'West Sally Port Tower',
        meta: 'Outer ring — Western gate',
        description,
        options,
      };
    },
    pilgrim_shrine: state => {
      const description = [
        'Votive ribbons flutter before a carved wooden figure of Saint Guthlac. Pilgrims kneel, leaving tokens—a spindle whorl, a pilgrim badge shaped like a scallop, a wax taper burning low.'
      ];
      const options = [];
      addOption(options, 'Leave an offering and ask for a safe ledger', () => {
        if (spendCoins(1)) {
          state.flags.shrineBlessing = true;
          appendLog('You place a silver penny among the offerings. The pilgrims press a smooth river pebble into your palm for luck.');
          saveState();
        } else {
          appendLog('Your purse is too light to leave a silver penny today. The pilgrims nod in understanding.');
        }
      }, { disabled: state.flags.shrineBlessing });
      addOption(options, 'Return to the southern road', () => setLocation('south_road', 'You step away from the shrine and back to the road.'));
      return {
        title: 'Hawthorn Shrine of Saint Guthlac',
        meta: 'Detour — Wayside devotion',
        description,
        options,
      };
    },
    butchers_stall: state => {
      const description = [
        'Gervais the butcher rests his cleaver on a block scarred with years of cuts. Sides of pork hang from hooks, salted and spiced. He watches you assess the meat, gauging how flush your purse might be.'
      ];
      const options = [];
      if (!state.flags.butcherMet) {
        description.push('"You look like a clerk running errands," he says. "What price the garrison pays this week for a haunch fit for hounds?"');
        addOption(options, 'Answer that the kennel pays three silver pennies for salted pork', () => {
          state.flags.butcherMet = true;
          state.flags.meatPurchased = spendCoins(3);
          if (state.flags.meatPurchased) {
            adjustItem('salted_pork', 1);
            appendLog('You count out three pennies. Gervais wraps a salted haunch for you, warning that the mastiff prefers it warm.');
          } else {
            appendLog('Your purse comes up short. Gervais laughs and tells you to return when you carry three pennies.');
          }
        });
        addOption(options, 'Haggle that two pennies should suffice', () => {
          state.flags.butcherMet = true;
          appendLog('Gervais snorts. "Two pennies? Feed that to the baron’s geese. Come back with three."');
          saveState();
        });
        addOption(options, 'Confess you do not know the price and listen closely', () => {
          state.flags.butcherMet = true;
          appendLog('Gervais shakes his head. "Every kennel boy knows the price is three pennies. Remember it before the mastiff remembers you."');
          saveState();
        });
      } else {
        if (!state.flags.meatPurchased) {
          addOption(options, 'Pay the proper three pennies now that you remember the price', () => {
            if (spendCoins(3)) {
              state.flags.meatPurchased = true;
              adjustItem('salted_pork', 1);
              appendLog('Gervais nods approvingly as you hand over three pennies and tucks a salted haunch into your satchel.');
            } else {
              appendLog('You still lack the three pennies needed. The butcher folds his arms.');
            }
          }, { disabled: state.flags.meatPurchased });
        } else {
          description.push('The salted haunch waits in your satchel; the butcher is content with the bargain struck.');
        }
      }
      addOption(options, 'Return to the market lane', () => setLocation('south_market_lane', 'You leave the aroma of smoked pork behind.'));
      return {
        title: 'Gervais the Butcher’s Stall',
        meta: 'Detour — Market bargaining',
        description,
        options,
      };
    },
    village_green: state => {
      const description = [
        'Minstrels lounge beneath an elm, tuning lutes. A jongleur balances on a barrel to amuse waiting peasants. A reeve tallies grain levies on a parchment roll. The chatter blends with the creak of the raised drawbridge.'
      ];
      const options = [];
      addOption(options, 'Listen to the reeve enumerate petitions bound for court', () => {
        appendLog('The reeve lists five petitions awaiting the earl, from hail-struck fields to a dispute over a dowry chest. You note each on your wax tablet.');
        saveState();
      });
      addOption(options, 'Return to the drawbridge plaza', () => setLocation('front_drawbridge', 'You step back toward the gatehouse.'));
      return {
        title: 'Village Green Beside the Gate',
        meta: 'Detour — Waiting green',
        description,
        options,
      };
    },
    ropemaker_shack: state => {
      const description = [
        'Matilde’s shack smells of tar and horsehair. Spools of flax and hemp line the walls. She squints at you, measuring your shoulders as though gauging whether you can handle her sturdiest rope.'
      ];
      const options = [];
      if (!state.flags.ropemakerMet) {
        description.push('"Tell me," she says, "how many strands must I twist to make a rope worthy of a war-dog’s collar?"');
        addOption(options, 'Answer: Three strands, each well tarred', () => {
          state.flags.ropemakerMet = true;
          if (spendCoins(2)) {
            adjustItem('hemp_rope', 1);
            appendLog('Matilde grins. "Aye, three well-tarred strands. Two pennies and the rope is yours."');
          } else {
            appendLog('Matilde agrees with your answer but shakes an empty purse at you. "Come back with two pennies and I’ll coil one for you."');
          }
        });
        addOption(options, 'Answer: Four strands, doubled back on themselves', () => {
          state.flags.ropemakerMet = true;
          appendLog('Matilde laughs. "Too stiff by half. Try again when you know your craft."');
          saveState();
        });
        addOption(options, 'Admit ignorance and ask to be taught', () => {
          state.flags.ropemakerMet = true;
          appendLog('Matilde shrugs. "Honesty earns leniency. Bring me two pennies and I’ll sell you my stoutest coil."');
          saveState();
        });
      } else {
        if (!hasItem('hemp_rope')) {
          addOption(options, 'Pay two pennies for the rope Matilde saved', () => {
            if (spendCoins(2)) {
              adjustItem('hemp_rope', 1);
              appendLog('Matilde presses a coil of rope into your arms. "Mind the tar; it stains."');
            } else {
              appendLog('You still cannot muster the two pennies required. Matilde wags a finger.');
            }
          });
        } else {
          description.push('The rope hangs from your shoulder. Matilde nods, satisfied you know how to use it.');
        }
      }
      addOption(options, 'Leave the shack for the shanty lane', () => setLocation('southeast_shanty', 'You duck back into the open air of the shanties.'));
      return {
        title: 'Matilde the Ropemaker’s Shack',
        meta: 'Detour — Craft and barter',
        description,
        options,
      };
    },
    mill_jetty: state => {
      const description = [
        'You balance atop the wet plank leading to the mill jetty. Water sprays your boots as the wheel turns. The miller’s wife grips a frayed sluice cord, struggling to loop it through an iron eye.'
      ];
      const options = [];
      addOption(options, 'Use your rope skills to splice a new loop for the sluice', () => {
        if (!hasItem('hemp_rope')) {
          appendLog('Without spare rope, you can only offer advice. The miller’s wife sighs, still wrestling with the cord.');
          return;
        }
        if (state.flags.millersHelped) {
          appendLog('The sluice already runs true with your earlier handiwork.');
          return;
        }
        state.flags.millersHelped = true;
        adjustItem('silver_pennies', 1);
        appendLog('You cut a short length from your rope coil and fashion a secure splice. The miller’s wife thanks you with a warm oatcake, slips a silver penny into your palm, and promises to speak well of you at the guard station.');
        saveState();
      });
      addOption(options, 'Return to the mill stream bank', () => setLocation('east_mill_stream', 'You hop back to the damp bank.'));
      return {
        title: 'Mill Jetty and Sluice',
        meta: 'Detour — Millwright assistance',
        description,
        options,
      };
    },
    scriptorium: state => {
      const description = [
        'Inside the priory cloister, a scriptorium glows with beeswax candles. Brother Aldwin pores over a parchment roll listing the earl’s toll exemptions. He gestures for you to sit upon a worn bench.'
      ];
      const options = [];
      if (!state.flags.scribeQuiz) {
        description.push('"If you are truly the castle’s clerk," he says, "tell me: what toll do Flemish cloth merchants pay at the bridge?"');
        addOption(options, 'Respond: One denier per bolt, unless sworn to the guild', () => {
          state.flags.scribeQuiz = true;
          adjustItem('wax_tablet', 1);
          appendLog('Brother Aldwin smiles. "Correct. Take this wax tablet; its last courier never returned."');
          saveState();
        });
        addOption(options, 'Respond: A tithe of their profit at market’s close', () => {
          appendLog('Brother Aldwin frowns. "That would empty the guild hall. Return when you know the statutes."');
          saveState();
        });
        addOption(options, 'Respond: No toll at all; the earl is generous', () => {
          appendLog('Brother Aldwin laughs softly. "Generous? Perhaps in stories. Study harder."');
          saveState();
        });
      } else {
        description.push('You jot notes on your wax tablet as Brother Aldwin shares the latest priory gossip about messengers arriving by pigeon.');
      }
      addOption(options, 'Return to the monastery gardens', () => setLocation('northeast_monastery', 'You step back into the herb-scented air.'));
      return {
        title: 'Priory Scriptorium',
        meta: 'Detour — Toll statutes',
        description,
        options,
      };
    },
    fishers_huts: state => {
      const description = [
        'Rough huts stand on stilts above the marsh. Fisherfolk smoke tench over peat fires. Nets hang to dry, and eels wriggle in wicker traps. An old woman weaves rush mats, humming a wordless tune.'
      ];
      const options = [];
      addOption(options, 'Share news from the castle in exchange for marsh lore', () => {
        appendLog('The fishers warn you that saboteurs favor the rear bridge during fog. You resolve to secure it once inside.');
        saveState();
      });
      addOption(options, 'Return to the reed marsh path', () => setLocation('north_reed_marsh', 'You leave the smoky huts behind.'));
      return {
        title: 'Fishers’ Marsh Huts',
        meta: 'Detour — Marsh folk',
        description,
        options,
      };
    },
    surgeons_pavilion: state => {
      const description = [
        'Inside the pavilion, the castle leech lays out bronze lancets beside steaming vinegar. An apprentice crushes herbs while a huntsman winces, arrow removed from his calf. Jugs of wine stand ready for dressing wounds.'
      ];
      const options = [];
      if (!state.flags.bandageEarned) {
        description.push('"Hold this man steady," the leech orders. "Do it well, and I shall spare a clean bandage for the guard you mentioned."');
        addOption(options, 'Steady the wounded hunter during the leech’s work', () => {
          state.flags.bandageEarned = true;
          adjustItem('linen_bandage', 1);
          appendLog('You brace the hunter while the leech stitches the wound. Grateful, he presses a fresh linen bandage into your hands.');
          saveState();
        });
        addOption(options, 'Decline; blood unsettles you', () => {
          appendLog('The leech shrugs. "Then do not speak of needing bandages."');
          saveState();
        });
      } else {
        description.push('The leech nods to you. "The guard by the training yard still waits for that bandage," he reminds you.');
      }
      addOption(options, 'Return to the hunters’ grounds', () => setLocation('northwest_hunters', 'You step back into the cool air beside the archery butts.'));
      return {
        title: 'Leech’s Pavilion',
        meta: 'Detour — Field surgery',
        description,
        options,
      };
    },
    tanners_yard: state => {
      const description = [
        'Hides stretch on frames while apprentices scrape hair with dull blades. Pits of oak bark liquor bubble ominously. The sharp tang of tannin stings your nose. A cooper rolls barrels toward the floodgate.'
      ];
      const options = [];
      addOption(options, 'Chat with the apprentices about recent deliveries', () => {
        appendLog('They complain about a mastiff stealing scraps—no doubt the same hound guarding the postern. Better to keep him well fed.');
        saveState();
      });
      addOption(options, 'Return to the west floodgate', () => setLocation('west_floodgate', 'You leave the tannery’s reek for fresher air.'));
      return {
        title: 'Tanners’ Drying Yard',
        meta: 'Detour — Leather works',
        description,
        options,
      };
    },
    outer_bailey: state => {
      const description = [
        "Inside the walls, the outer bailey bustles. Grooms lead destriers to the stables while cooks haul baskets of leeks toward the kitchens. Pages run messages beneath fluttering pennons. The stone keep rises ahead, its windows arrow-slit narrow."
      ];
      if (!state.flags.injuredGuardTreated) {
        description.push("To the north, a gate to the training yard stands half-open, a guard seated with a bloody binding at his thigh. To the west, the smithy’s hammer falls like a heartbeat.");
      } else {
        description.push("The guard you treated now stands proudly at his post, saluting as you pass toward the training yard.");
      }
      const options = [];
      addOption(options, 'Approach the training yard gate', () => setLocation('training_yard_gate', 'You stride toward the clang of practice swords.'));
      addOption(options, 'Visit the stables and messenger roosts', () => setLocation('stables', 'You walk toward the smell of hay and horse.'));
      addOption(options, 'Head to the blacksmith’s forge', () => setLocation('blacksmith_forge', 'Sparks fly as you approach the forge.'));
      addOption(options, 'Enter the guard station beneath the wall walk', () => setLocation('guard_station', 'You duck beneath the wall walk where guards tally messages.'));
      addOption(options, 'Ascend toward the great hall', () => setLocation('great_hall_entry', 'You climb the stone stair toward the great hall doors.'));
      addOption(options, 'Climb the stair to the wall walk', () => setLocation('wall_walk', 'You ascend the narrow stair to the rampart.'));
      addOption(options, 'Slip back out the postern to the outer path', () => setLocation('east_postern', 'You retrace your steps to the postern bridge.'));
      return {
        title: 'Outer Bailey of Beldane Keep',
        meta: 'Inner ward — Bailey crossroads',
        description,
        options,
      };
    },
    stables: state => {
      const description = [
        'Stablehands curry foam from courser flanks. Hawks hooded with stitched leather perch along a beam. The stable master jots notes on feed rations while pigeons coo from wicker cages overhead.'
      ];
      const options = [];
      addOption(options, 'Examine the pigeon post ledgers', () => {
        appendLog('The pigeon master mutters about a frantic bird arriving from the coastal watchtower. He sent the scroll to the guard station.');
        saveState();
      });
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You leave the smell of hay and leather behind.'));
      addOption(options, 'Climb to the messenger loft above the stables', () => setLocation('messenger_loft', 'You ascend the ladder into the messenger loft.'));
      return {
        title: 'Castle Stables and Pigeon Loft',
        meta: 'Inner ward — Stables',
        description,
        options,
      };
    },
    messenger_loft: state => {
      const description = [
        'Up in the loft, clerks sort ribbons tied to pigeon legs, copying messages onto parchment strips. The air smells of feathers and ink. A narrow window overlooks the moat.'
      ];
      const options = [];
      addOption(options, 'Study the incoming messages', () => {
        appendLog('One ribbon bears the seal of the coastal watch, warning of sails on the horizon. The guards below prepare to respond.');
        saveState();
      });
      addOption(options, 'Climb down to the stables', () => setLocation('stables', 'You descend into the stable bustle.'));
      return {
        title: 'Messenger Loft',
        meta: 'Inner ward — Pigeon roost',
        description,
        options,
      };
    },
    blacksmith_forge: state => {
      const description = [
        'Master smith Hrodgar hammers glowing iron on an anvil. Sparks dance as apprentices pump bellows. Horseshoes, chain links, and spearheads line the walls.'
      ];
      if (state.flags.scrollDelivered && !hasItem('iron_spike') && !state.flags.rearBridgeSecured) {
        description.push('Hrodgar eyes you. "Sir Merrick sent word—you\'re to take a spike to wedge the rear drawbridge. Say the word and it is yours."');
      }
      const options = [];
      addOption(options, 'Request an iron spike for the rear drawbridge', () => {
        if (!state.flags.scrollDelivered) {
          appendLog('Hrodgar grunts. "Orders come from Sir Merrick. Bring me proof his dispatch reached you."');
          return;
        }
        if (state.flags.rearBridgeSecured) {
          appendLog('"The rear bridge already stands fast," Hrodgar notes. "Keep that spike in mind should it ever loosen."');
          return;
        }
        if (hasItem('iron_spike')) {
          appendLog('You already carry the iron spike Hrodgar forged.');
          return;
        }
        adjustItem('iron_spike', 1);
        appendLog('Hrodgar quenches a fresh spike and presses it into your hands, its tip still steaming.');
        saveState();
      });
      addOption(options, 'Observe the apprentices quenching steel', () => {
        appendLog('The apprentices chant the sequence of quenching—heat, hammer, quench, temper. Their rhythm steadies your thoughts.');
        saveState();
      });
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You step away from the heat of the forge.'));
      return {
        title: 'Blacksmith’s Forge',
        meta: 'Inner ward — Craft hall',
        description,
        options,
      };
    },
    training_yard_gate: state => {
      const description = [
        'Swords clash in the training yard beyond. Straw-stuffed pell targets bear the scars of countless blows. At the gate sits a guard with a blood-soaked rag tied about his thigh, grimacing against the pain.'
      ];
      if (!state.flags.injuredGuardTreated) {
        description.push('"Clerk," he groans, "do you carry a bandage? I cannot leave my post, but the master-at-arms waits within."');
      } else {
        description.push('Thanks to your bandage, the guard stands straight, saluting as you pass. The master-at-arms drills squires within.');
      }
      const options = [];
      if (!state.flags.injuredGuardTreated) {
        addOption(options, 'Bind the guard’s wound with the linen bandage', () => {
          if (!hasItem('linen_bandage')) {
            appendLog('You search your satchel, but you carry no bandage yet. The guard clenches his jaw and resumes his vigil.');
            return;
          }
          adjustItem('linen_bandage', -1);
          state.flags.injuredGuardTreated = true;
          appendLog('You wind the clean linen about the guard’s thigh. Relieved, he grants you entry to the training yard and promises to vouch for you.');
          saveState();
        });
      }
      addOption(options, 'Enter the training yard to seek the master-at-arms', () => setLocation('training_yard', 'You step into the yard where squires drill under the master-at-arms’ gaze.'), {
        disabled: !state.flags.injuredGuardTreated,
      });
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You step back into the bailey bustle.'));
      return {
        title: 'Training Yard Gate',
        meta: 'Inner ward — Guarded entry',
        description,
        options,
      };
    },
    training_yard: state => {
      const description = [
        'Squires practice sword forms under the stern eye of Sir Merrick, the master-at-arms. Archers loose shafts at straw butts while a drummer keeps time. Sir Merrick’s mail gleams despite the dust.'
      ];
      if (state.flags.scrollAssigned && !state.flags.scrollDelivered) {
        description.push('Sir Merrick looks up as you approach. "The guard station said you bear urgent news. Hand me the dispatch."');
      } else if (state.flags.scrollDelivered && !state.flags.rearBridgeSecured) {
        description.push('Sir Merrick studies the horizon. "Lock the rear drawbridge gear with a spike. Hrodgar will supply it once I mark the order. Report back when it is done."');
      } else if (state.flags.rearBridgeSecured) {
        description.push('"Well done securing the rear bridge," Sir Merrick says. "See the guard station informed; the earl must know our readiness."');
      }
      const options = [];
      if (state.flags.scrollAssigned && !state.flags.scrollDelivered) {
        addOption(options, 'Deliver the sealed dispatch to Sir Merrick', () => {
          if (!hasItem('sealed_dispatch')) {
            appendLog('You pat your satchel but the sealed dispatch is missing. The master-at-arms waits impatiently.');
            return;
          }
          adjustItem('sealed_dispatch', -1);
          state.flags.scrollDelivered = true;
          appendLog('Sir Merrick breaks the seal, eyes widening. "Enemy sails. We must secure the rear gate. Fetch an iron spike from Hrodgar once I send word."');
          saveState();
        });
      }
      addOption(options, 'Observe the squires’ drills for insight', () => {
        appendLog('You note each drill in your wax tablet, ready to brief the steward should he ask about the castle’s readiness.');
        saveState();
      });
      addOption(options, 'Return to the training yard gate', () => setLocation('training_yard_gate', 'You leave the clang of steel behind.'));
      return {
        title: 'Training Yard',
        meta: 'Inner ward — Master-at-arms’ domain',
        description,
        options,
      };
    },
    guard_station: state => {
      const description = [
        'The guard station houses racks of spears and pigeon cages. A duty sergeant counts signal horns while scribes copy reports. On a central table lies a fresh scroll sealed with blue wax bearing the coastal watchmark.'
      ];
      if (!state.flags.scrollAssigned) {
        description.push('The duty sergeant beckons you. "A pigeon from the coast brought dire warning. Take this dispatch to Sir Merrick without delay."');
      } else if (!state.flags.scrollDelivered) {
        description.push('The sergeant drums fingers on the table. "Sir Merrick must have that dispatch; we rely on you."');
      } else if (!state.flags.rearBridgeSecured) {
        description.push('"Sir Merrick needs the rear bridge locked tight," the sergeant reminds you. "When it is done, bring us word."');
      } else {
        description.push('Guards cheer quietly as you report the rear bridge secured. The sergeant drafts a commendation for the earl.');
      }
      const options = [];
      if (!state.flags.scrollAssigned) {
        addOption(options, 'Accept the sealed dispatch', () => {
          state.flags.scrollAssigned = true;
          adjustItem('sealed_dispatch', 1);
          appendLog('The sergeant presses the scroll into your hands. "Do not tarry—our safety depends upon it."');
          saveState();
        });
      }
      if (state.flags.rearBridgeSecured) {
        addOption(options, 'Report the secured rear bridge', () => {
          if (!state.flags.scrollDelivered) {
            appendLog('"Not before Sir Merrick reads his dispatch," the sergeant says.');
            return;
          }
          if (!state.flags.reportComplete) {
            state.flags.reportComplete = true;
            appendLog('You report the rear bridge secured. The sergeant nods approvingly and records your diligence, promising to brief the earl.');
          } else {
            appendLog('The sergeant has already logged your report; preparations continue apace.');
          }
          saveState();
        });
      }
      addOption(options, 'Study the news board tracking the coastline', () => {
        appendLog('Colored pegs mark merchant routes and known pirate coves. A fresh black peg marks the approaching fleet that triggered the alarm.');
        saveState();
      });
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You step back beneath the wall walk arch.'));
      return {
        title: 'Guard Station and Message Room',
        meta: 'Inner ward — Watch headquarters',
        description,
        options,
      };
    },
    great_hall_entry: state => {
      const description = [
        'Grand doors carved with hunting scenes open into the great hall. Squires polish shields while a steward arranges benches for the midday meal. The scent of roasted venison wafts from within.'
      ];
      const options = [];
      addOption(options, 'Enter the great hall', () => setLocation('great_hall', 'You pass beneath the carved lintel into the great hall.'));
      addOption(options, 'Visit the castle kitchens below the hall', () => setLocation('kitchens', 'You descend the stone steps toward the bustling kitchens.'));
      addOption(options, 'Turn aside into the chapel', () => setLocation('chapel', 'You step through a pointed arch into the chapel’s glow.'));
      addOption(options, 'Inspect the archives adjoining the stair', () => setLocation('archives', 'You unlock the oak door into the archives.'));
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You descend back to the bailey.'));
      return {
        title: 'Great Hall Stair',
        meta: 'Inner ward — Approach to the hall',
        description,
        options,
      };
    },
    kitchens: state => {
      const description = [
        'The kitchens roar with activity. Cooks turn spits heavy with geese while scullions chop leeks atop stained tables. Cauldrons of pottage simmer beside stacks of trenchers. A cook thrusts a ladle toward you, demanding a taster’s opinion.'
      ];
      const options = [];
      addOption(options, 'Taste the pottage and offer a verdict', () => {
        appendLog('The pottage needs more dill. The cook nods appreciatively and tosses you a crust of bread for the road.');
        saveState();
      });
      addOption(options, 'Observe the kitchen clerks tallying provisions', () => {
        appendLog('You note the stores of salt beef, barley, and ale barrels. If siege comes, the keep can hold for a fortnight.');
        saveState();
      });
      addOption(options, 'Return to the great hall stair', () => setLocation('great_hall_entry', 'You climb back toward the carved doors.'));
      return {
        title: 'Castle Kitchens',
        meta: 'Inner ward — Hearth of the keep',
        description,
        options,
      };
    },
    great_hall: state => {
      const caseIndex = state.flags.courtIndex % COURT_CASES.length;
      const description = [
        'Sunlight filters through stained glass, painting the rushes underfoot. The earl’s banner hangs behind a dais where the lord’s bench awaits. Courtiers whisper as serjeants usher petitioners forward.',
        `Today’s case: ${COURT_CASES[caseIndex]}`,
      ];
      if (state.flags.reportComplete && state.flags.rearBridgeSecured) {
        description.push('Word of the looming fleet has reached the earl. He confers quietly with Sir Merrick, praising the clerk who kept the ledger tight and the bridges sealed.');
      }
      const options = [];
      addOption(options, 'Advance to the court dais to take notes', () => {
        state.flags.courtIndex += 1;
        appendLog(`You record the details of case ${caseIndex + 1}. The steward nods approvingly as you keep pace with the petitions.`);
        saveState();
      });
      if (state.flags.reportComplete && state.flags.rearBridgeSecured && !state.flags.earlRewarded) {
        addOption(options, 'Approach the dais to receive the earl’s thanks', () => {
          state.flags.earlRewarded = true;
          appendLog('The earl commends your vigilance. A purse of two silver pennies finds its way into your hand as the court applauds the secured keep.');
          adjustItem('silver_pennies', 2);
          saveState();
        });
      }
      addOption(options, 'Step into the solar beyond the hall', () => setLocation('solar', 'You slip through a tapestry into the solar where the steward works.'));
      addOption(options, 'Return to the great hall entry', () => setLocation('great_hall_entry', 'You step back toward the stair.'));
      return {
        title: 'Great Hall of Beldane',
        meta: 'Inner ward — Seat of judgment',
        description,
        options,
      };
    },
    solar: state => {
      const description = [
        'The solar is warmed by a brazier. Ledgers and tallies spill across a table where the steward, Lady Ysabet, balances accounts. She glances at your wax tablet, expecting diligence.'
      ];
      const options = [];
      addOption(options, 'Report on the court petitions recorded', () => {
        appendLog('Lady Ysabet thanks you for tracking each plea. "Keep Sir Merrick informed as well; readiness depends on clear ledgers," she says.');
        saveState();
      });
      addOption(options, 'Study the castle’s inventory rolls', () => {
        appendLog('You memorize figures for grain, arrows, and lamp oil. Knowledge that may prove vital if the siege arrives.');
        saveState();
      });
      addOption(options, 'Return to the great hall', () => setLocation('great_hall', 'You slip back through the tapestry into the murmur of court.'));
      return {
        title: 'Steward’s Solar',
        meta: 'Inner ward — Ledger room',
        description,
        options,
      };
    },
    wall_walk: state => {
      const description = [
        'A narrow walk atop the curtain wall offers a view of the countryside. Horns hang from pegs, and signal flags lie folded beside a brazier ready to blaze at a moment’s notice.'
      ];
      const options = [];
      addOption(options, 'Raise the signal torch to practice the alarm', () => {
        appendLog('You rehearse the signal sequence: three quick flares for ships, one long blaze for riders. Guards nod, pleased you remember.');
        saveState();
      });
      addOption(options, 'Return to the outer bailey', () => setLocation('outer_bailey', 'You descend the stair from the wall walk.'));
      return {
        title: 'Wall Walk Overlooking the Fields',
        meta: 'Inner ward — Watchful rampart',
        description,
        options,
      };
    },
    chapel: state => {
      const description = [
        'Candles flicker before the altar in the castle chapel. A priest intones the hours while a pair of knights kneel in prayer. The air smells of incense and beeswax.'
      ];
      const options = [];
      addOption(options, 'Light a taper and reflect on your duties', () => {
        appendLog('You light a taper for safe passage of the coastal patrol. Resolve settles in your chest.');
        saveState();
      });
      addOption(options, 'Return to the great hall stair', () => setLocation('great_hall_entry', 'You leave the chapel’s hush behind.'));
      return {
        title: 'Castle Chapel',
        meta: 'Inner ward — Place of devotion',
        description,
        options,
      };
    },
    archives: state => {
      const description = [
        'Shelves of scrolls line the castle archives. Wooden boxes labeled with decades of tithe rolls rest beside survey maps inked in precise hand. A clerk sharpens goose quills at a tall desk.'
      ];
      const options = [];
      addOption(options, 'Compare the current ledger with the archives', () => {
        appendLog('You confirm the toll rates you quoted outside match last year’s rolls—no magistrate will catch you unprepared.');
        saveState();
      });
      addOption(options, 'Return to the great hall entry', () => setLocation('great_hall_entry', 'You close the archive door softly.'));
      return {
        title: 'Castle Archives',
        meta: 'Inner ward — Records room',
        description,
        options,
      };
    },
  };

  const state = loadState();
  render();

  if (SELECTORS.resetButton) {
    SELECTORS.resetButton.addEventListener('click', () => {
      overwriteState(cloneState(DEFAULT_STATE));
      appendLog('You close the ledger, scrape the wax smooth, and begin anew.');
      render();
    });
  }

})();
