/* Road to Turkey — Level 1: The Mirror Incident. Pure data: map, props, dialogue, items, missions.
   Coordinates are in map tiles (1 tile = 48 world pixels). */
(function (R) {
  'use strict';
  var L = R.level1 = { name: 'The Mirror Incident', num: 1 };

  // # wall   . wood   , bathroom tile   _ kitchen lino   + pharmacy floor
  // D doorway   F front door (locked at first)   P pharmacy door   = pavement   ~ road (no walking)
  L.rows = [
    '##############            ',
    '#,,,,#.......#            ',
    '#,,,,#.......#  ##########',
    '#,,,,#.......#  #++++++++#',
    '#,,,,#.......#  #++++++++#',
    '#,,,,#.......#  #++++++++#',
    '##D######D####  #++++++++#',
    '#......._____#  #++++++++#',
    '#......._____#  #++++++++#',
    '#......._____#  #++++++++#',
    '#......._____#  #++++++++#',
    '#............#  #++++++++#',
    '######F#######  ####P#####',
    '==========================',
    '==========================',
    '==========================',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];
  L.w = 26; L.h = L.rows.length;
  L.start = { x: 8.6, y: 3.9 };
  L.door = { x: 6, y: 12 };

  // flat: true = decoration you can walk over
  L.props = [
    // bathroom
    { t: 'mat', x: 2.2, y: 3.6, w: 1.3, h: 0.8, flat: true },
    { t: 'sink', x: 2, y: 1, w: 1, h: 0.6 },
    { t: 'cabinet', x: 3.1, y: 1, w: 0.8, h: 0.5 },
    { t: 'toilet', x: 4.1, y: 1, w: 0.85, h: 0.95 },
    { t: 'bath', x: 1, y: 3, w: 1, h: 2.9 },
    // bedroom
    { t: 'rug', x: 7.6, y: 2.9, w: 2.2, h: 1.5, flat: true },
    { t: 'wardrobe', x: 6, y: 1, w: 1.7, h: 0.85 },
    { t: 'nightstand', x: 9.2, y: 1, w: 0.8, h: 0.7 },
    { t: 'bed', x: 10.1, y: 1, w: 2.9, h: 2.1 },
    { t: 'laundry', x: 6.1, y: 4.6, w: 1.2, h: 0.9 },
    // living room + kitchen
    { t: 'doormat', x: 6.05, y: 11.3, w: 0.9, h: 0.6, flat: true },
    { t: 'tv', x: 4.2, y: 7, w: 1.7, h: 0.55 },
    { t: 'sofa', x: 1, y: 8.2, w: 1.1, h: 2.5 },
    { t: 'ctable', x: 2.8, y: 8.9, w: 1.3, h: 0.9 },
    { t: 'plant', x: 6.5, y: 7, w: 0.8, h: 0.8 },
    { t: 'fridge', x: 8, y: 7, w: 0.9, h: 1 },
    { t: 'counter', x: 10.1, y: 7, w: 2.9, h: 0.75 },
    { t: 'ktable', x: 10.3, y: 9.1, w: 1.7, h: 1 },
    // street
    { t: 'puddle', x: 12.2, y: 14.6, w: 1.6, h: 0.6, flat: true },
    { t: 'cross', x: 21.3, y: 12.42, w: 0.5, h: 0.5, flat: true },
    { t: 'lamp', x: 3.3, y: 13.05, w: 0.3, h: 0.3 },
    { t: 'lamp', x: 14.4, y: 13.05, w: 0.3, h: 0.3 },
    { t: 'lamp', x: 24.6, y: 13.05, w: 0.3, h: 0.3 },
    { t: 'bin', x: 8.2, y: 13.05, w: 0.8, h: 0.8 },
    { t: 'bench', x: 16.3, y: 13.05, w: 2, h: 0.6 },
    { t: 'aboard', x: 21.9, y: 13.3, w: 0.8, h: 0.6 },
    // pharmacy
    { t: 'backshelf', x: 17, y: 3, w: 8, h: 0.8 },
    { t: 'pcounter', x: 17, y: 5.1, w: 8, h: 0.9 },
    { t: 'shelf', x: 17, y: 7, w: 0.7, h: 3.4 },
    { t: 'shelf', x: 24.3, y: 7, w: 0.7, h: 3.4 },
    { t: 'shelf', x: 19.4, y: 8.2, w: 3.2, h: 0.8 },
  ];

  L.npcs = [
    { who: 'gary', x: 11.6, y: 13.8, expr: 'smug' },
    { who: 'moira', x: 21, y: 5.0, expr: 'dead', ghost: true },
  ];

  // wind gusts patrolling the pavement (tiles; speed in px/s)
  L.gusts = [
    { y: 14.25, min: 9.2, max: 25.2, x: 18, v: 120 },
    { y: 15.5, min: 8.2, max: 25.2, x: 12, v: -95 },
  ];

  // loose change: picked up by walking over it
  L.pickups = [
    { id: 'c1', x: 7.4, y: 2.5, v: 2 },
    { id: 'c2', x: 3.3, y: 10.6, v: 3 },
    { id: 'c3', x: 11.7, y: 10.7, v: 5 },
    { id: 'c4', x: 3.6, y: 4.9, v: 1 },
    { id: 'c5', x: 15.4, y: 14.9, v: 5 },
    { id: 'c6', x: 19.2, y: 15.6, v: 2 },
    { id: 'c7', x: 23.4, y: 10.4, v: 1 },
  ];

  L.items = {
    beanie: { type: 'hat', name: 'Emotional Support Beanie', desc: 'Smells of 2016. Hides everything. Stops the wind.' },
    dadcap: { type: 'hat', name: '"World\'s Okayest Dad" Cap', desc: 'Found in a bin. You are not a dad. Stops the wind.' },
    fibers_old: { type: 'product', name: 'Hair Fibres (exp. 2019)', desc: 'Basically pepper. But it is YOUR pepper.', fx: { conf: 8 }, line: 'You shake it on. You look like a seasoned egg. A CONFIDENT seasoned egg.' },
    minoxidil: { type: 'product', name: 'Minoxidil 5%', desc: 'Twice a day. Results in 4–6 months. Or never.', fx: { hair: 12, conf: 4 }, line: 'You apply it. You check the mirror after 4–6 seconds. Nothing yet.' },
    fibers: { type: 'product', name: 'Hair Fibres (fresh)', desc: 'Instant cover. Fears rain, sneezes and hand dryers.', fx: { hair: 6, conf: 12 }, line: 'Coverage achieved. Do not let anyone touch your head. Ever.' },
    sachet: { type: 'product', name: 'Caffeine Shampoo Sachet', desc: 'A free sample. Your scalp is about to be very awake.', fx: { hair: 3, conf: 6 }, line: 'Your scalp tingles. It is either working or an allergy.' },
  };

  L.missions = [
    { id: 'mirror', t: 'Face the bathroom mirror' },
    { id: 'cash', t: 'Scrape together €40', prog: function (S) { return R.euro(Math.min(40, S.cash)) + ' / €40'; } },
    { id: 'hat', t: 'Find something to hide under', opt: true },
    { id: 'out', t: 'Leave the flat' },
    { id: 'pharm', t: 'Find the pharmacy' },
    { id: 'buy', t: 'Get a hair product from the pharmacist' },
  ];

  L.names = { narr: '', barry: 'Barry', mirror: 'The Mirror', gary: 'Gary from No. 6', moira: 'Moira, Pharmacist' };

  function once(flag, a, b) { return function (S) { return S.flags[flag] ? b : a; }; }
  function price(S) { return S.flags.brave ? 25 : 30; }

  // Things you can walk up to and press the action button on. rect = [x, y, w, h] in tiles.
  L.things = [
    { id: 'mirror', rect: [2, 1, 1, 0.6], label: 'LOOK', say: once('mirror', 'm_a1', 'm_r1') },
    { id: 'cabinet', rect: [3.1, 1, 0.8, 0.5], label: 'SEARCH', say: once('cabinet', 'cab1', 'cab2') },
    { id: 'toilet', rect: [4.1, 1, 0.85, 0.95], label: 'LOOK', say: 'toilet' },
    { id: 'bath', rect: [1, 3, 1, 2.9], label: 'LOOK', say: 'bath' },
    { id: 'wardrobe', rect: [6, 1, 1.7, 0.85], label: 'SEARCH', say: once('wardrobe', 'ward1', 'ward2') },
    { id: 'nightstand', rect: [9.2, 1, 0.8, 0.7], label: 'SEARCH', say: once('nightstand', 'night1', 'night2') },
    { id: 'bed', rect: [10.1, 1, 2.9, 2.1], label: 'LOOK', say: 'bed1' },
    { id: 'laundry', rect: [6.1, 4.6, 1.2, 0.9], label: 'SEARCH', say: once('laundry', 'laun1', 'laun2') },
    { id: 'tv', rect: [4.2, 7, 1.7, 0.55], label: 'LOOK', say: 'tv' },
    { id: 'sofa', rect: [1, 8.2, 1.1, 2.5], label: 'SEARCH', say: once('sofa', 'sofa1', 'sofa2') },
    { id: 'plant', rect: [6.5, 7, 0.8, 0.8], label: 'LOOK', say: 'plant' },
    { id: 'fridge', rect: [8, 7, 0.9, 1], label: 'OPEN', say: 'fridge' },
    { id: 'jar', rect: [11.8, 7, 1.2, 0.75], label: 'SEARCH', say: once('jar', 'jar1', 'jar2') },
    { id: 'ktable', rect: [10.3, 9.1, 1.7, 1], label: 'LOOK', say: 'letter' },
    { id: 'door', rect: [6, 12, 1, 1], label: 'OPEN', hide: function (S) { return !!S.flags.doorOpen; }, act: 'frontDoor' },
    { id: 'bin', rect: [8.2, 13.05, 0.8, 0.8], label: 'SEARCH', say: once('bin', 'bin1', 'bin9') },
    { id: 'gary', rect: [11.3, 13.5, 0.6, 0.35], label: 'TALK', say: once('gary', 'g1', 'g9') },
    { id: 'bench', rect: [16.3, 13.05, 2, 0.6], label: 'LOOK', say: 'bench' },
    { id: 'aboard', rect: [21.9, 13.3, 0.8, 0.6], label: 'READ', say: 'aboard' },
    { id: 'moira', rect: [19.5, 5.1, 3, 0.9], label: 'TALK', say: 'p1' },
    { id: 'shelfL', rect: [17, 7, 0.7, 3.4], label: 'LOOK', say: 'shelf1' },
    { id: 'shelfR', rect: [24.3, 7, 0.7, 3.4], label: 'LOOK', say: 'shelf2' },
    { id: 'shelfM', rect: [19.4, 8.2, 3.2, 0.8], label: 'LOOK', say: 'shelf3' },
  ];

  /* Dialogue nodes.
     who: speaker   face: expression   text: string or function(S)
     next: node id (or function)   fx: effects applied when the node is shown
     choices: [{ t, go, fx, show(S), ok(S), why }]  — "go" may be a function(S) for branching */
  L.nodes = {
    // ---- opening ----
    intro1: { who: 'narr', text: 'Barry Thinley, 35, wakes up. Something feels... lighter.', next: 'intro2' },
    intro2: { who: 'barry', face: 'shock', text: "There's more of me on the pillow than on my head. Bathroom. Mirror. Assess the damage." },

    // ---- the mirror ----
    m_a1: { who: 'narr', text: '07:14. The bathroom light. The only honest thing in this flat.', next: 'm_a2' },
    m_a2: { who: 'barry', face: 'shock', text: "That's... no. That's the lighting. It has ALWAYS been the lighting.", next: 'm_a3' },
    m_a3: { who: 'mirror', face: 'smug', text: 'Barry. Mate. I can see the extractor fan reflected in your scalp.', choices: [
      { t: 'Deny everything.', go: 'm_b1', fx: { conf: 5 } },
      { t: 'Count the survivors.', go: 'm_b2', fx: { conf: -8 } },
      { t: "Tug one. Check it's still attached.", go: 'm_b3', fx: { hair: -6, conf: -4 } },
    ] },
    m_b1: { who: 'barry', face: 'grit', text: "It's a high forehead. Dad had a high forehead.", next: 'm_b1b' },
    m_b1b: { who: 'mirror', face: 'smug', text: "Your dad's forehead went all the way round to his neck.", next: 'm_c1' },
    m_b2: { who: 'barry', face: 'sad', text: "One... two... a clump... no, that one's a toast crumb.", next: 'm_b2b' },
    m_b2b: { who: 'mirror', face: 'neutral', text: "I'd stop there. The final number isn't going to cheer you up.", next: 'm_c1' },
    m_b3: { who: 'barry', face: 'shock', text: 'It was not attached.', next: 'm_b3b' },
    m_b3b: { who: 'mirror', face: 'smug', text: 'Bold. Pulling out the witnesses.', next: 'm_c1' },
    m_c1: { who: 'mirror', face: 'neutral', text: "Listen. There's a clinic in Istanbul. €3,000. Flights, hotel, four thousand grafts and a little lunch.", next: 'm_c2' },
    m_c2: { who: 'barry', face: 'shock', text: "Three GRAND? I've got a drawer of coppers and a loyalty card for a sandwich shop that closed.", choices: [
      { t: 'Start a Turkey Fund. Today.', go: 'm_d1', fx: { conf: 10 } },
      { t: 'Ask the mirror for a loan.', go: 'm_d2' },
      { t: 'Go back to bed. Forever.', go: 'm_d3', fx: { conf: -12 } },
    ] },
    m_d1: { who: 'barry', face: 'grit', text: 'Right. Every coin in this flat now works for my scalp.', next: 'm_e1' },
    m_d2: { who: 'mirror', face: 'smug', text: "I'm a mirror, Barry. I've got exactly what you've got. But backwards.", next: 'm_e1' },
    m_d3: { who: 'mirror', face: 'neutral', text: 'Bed is where the pillow is. The pillow is where they go to die. Get up.', next: 'm_e1' },
    m_e1: { who: 'mirror', face: 'smug', text: 'Step one: the pharmacy. Buy yourself some time. Step two: Istanbul.', fx: { flag: 'mirror', mission: 'mirror' }, next: 'm_e2' },
    m_e2: { who: 'barry', face: 'grit', text: 'Scrape together €40. Find something for my head. Do NOT make eye contact with Gary.' },
    m_r1: { who: 'mirror', face: 'smug', text: "Back again? Nothing's grown. I checked.", choices: [
      { t: 'Ask for a pep talk.', go: once('pep', 'm_r2', 'm_r2b') },
      { t: 'Tug another one.', go: 'm_r3', fx: { hair: -6, conf: -3 } },
      { t: 'Leave.' },
    ] },
    m_r2: { who: 'mirror', face: 'neutral', text: "You've got a lovely... shaped... head. Under there. Probably.", fx: { conf: 6, flag: 'pep' } },
    m_r2b: { who: 'mirror', face: 'smug', text: "I've run out of nice things. It was a short list." },
    m_r3: { who: 'barry', face: 'sad', text: 'Why do I keep doing that.' },

    // ---- the flat ----
    cab1: { who: 'barry', face: 'neutral', text: "Hair fibres. Expired 2019. It's basically pepper. But it's MY pepper.", fx: { item: 'fibers_old', flag: 'cabinet' } },
    cab2: { who: 'barry', face: 'neutral', text: 'Plasters and one cotton bud. A used one.' },
    toilet: { who: 'barry', face: 'dead', text: 'No.' },
    bath: { who: 'barry', face: 'sad', text: "I'm not looking in the plughole. That's where the rest of me lives." },
    ward1: { who: 'barry', face: 'happy', text: 'The Emotional Support Beanie. Smells of 2016. Hides everything.', fx: { item: 'beanie', flag: 'wardrobe', mission: 'hat' }, next: 'ward1b' },
    ward1b: { who: 'narr', text: 'Open your BAG (top right) to wear it. Hats keep the wind off your head.' },
    ward2: { who: 'barry', face: 'sad', text: 'Shirts that fit a younger, hairier man.' },
    night1: { who: 'barry', face: 'happy', text: 'Emergency twenty! Hidden from myself, under the hair-loss leaflets.', fx: { cash: 20, flag: 'nightstand' } },
    night2: { who: 'barry', face: 'neutral', text: "Just the leaflets now. 'Baldness and You'. Thanks." },
    bed1: { who: 'barry', face: 'sad', text: 'The pillow. Every morning it looks more like a crime scene.', choices: [
      { t: 'Count the hairs on it.', go: 'bed2', fx: { conf: -3 } },
      { t: 'Flip the pillow.', go: once('flip', 'bed3', 'bed3b') },
      { t: 'Walk away.' },
    ] },
    bed2: { who: 'barry', face: 'sad', text: "Forty-one. I've named the long one Keith." },
    bed3: { who: 'barry', face: 'smug', text: 'Out of sight, out of scalp.', fx: { conf: 3, flag: 'flip' } },
    bed3b: { who: 'barry', face: 'shock', text: 'The other side is worse. The other side is HISTORY.' },
    laun1: { who: 'barry', face: 'neutral', text: "Yesterday's jeans. Yesterday's fiver. Smells like yesterday.", fx: { cash: 5, flag: 'laundry' } },
    laun2: { who: 'barry', face: 'neutral', text: 'The pile has given all it can give.' },
    tv: { who: 'barry', face: 'dead', text: 'Daytime telly. An advert for a hair clinic in Istanbul. The algorithm knows.' },
    sofa1: { who: 'barry', face: 'happy', text: 'Down the back of the sofa: €12, a pen, and something that used to be a grape.', fx: { cash: 12, flag: 'sofa' } },
    sofa2: { who: 'barry', face: 'neutral', text: 'Just the grape now.' },
    plant: { who: 'barry', face: 'sad', text: "Dead. Still got more on top than me." },
    fridge: { who: 'barry', face: 'neutral', text: "One egg. A jar that was once pesto. A magnet that says 'Live, Laugh, Love'. Bold claims, all three." },
    jar1: { who: 'barry', face: 'grit', text: "The holiday jar. The label used to say 'IBIZA'. Now it says 'SCALP'.", fx: { cash: 10, flag: 'jar' } },
    jar2: { who: 'barry', face: 'neutral', text: 'Empty. Like the top of— no. Not finishing that.' },
    letter: { who: 'barry', face: 'dead', text: "A letter. 'FINAL NOTICE'. I'll open it when I have hair." },
    door_a: { who: 'barry', face: 'grit', text: "Not without checking the hairline first. It's a ritual. A terrible ritual." },
    door_b: { who: 'barry', face: 'sad', text: function (S) { return "The pharmacy doesn't take 'vibes'. I need €40. I've got " + R.euro(S.cash) + '.'; } },
    door_c: { who: 'barry', face: 'shock', text: 'No hat. Just me, my scalp and the weather. Fine. FINE.' },
    door_d: { who: 'barry', face: 'neutral', text: "It's windy out there. I own a hat. I could WEAR the hat. (Open your BAG.)" },
    door_e: { who: 'barry', face: 'grit', text: 'Hat on. Head down. Pharmacy is right, past Gary. Go.' },

    // ---- the street ----
    bin1: { who: 'barry', face: 'neutral', text: "The communal bin. There's something in there.", choices: [
      { t: 'Rummage.', go: 'bin2', fx: { conf: -2 } },
      { t: 'Have some dignity.', go: 'bin3', fx: { conf: 2 } },
    ] },
    bin2: { who: 'barry', face: 'smug', text: "A cap. 'World's Okayest Dad'. I'm not a dad. I'm barely okay. It's perfect.", fx: { item: 'dadcap', flag: 'bin', mission: 'hat' } },
    bin3: { who: 'barry', face: 'grit', text: "Dignity doesn't keep the wind off. But fine." },
    bin9: { who: 'barry', face: 'dead', text: 'I have already taken everything this bin can teach me.' },
    g1: { who: 'gary', face: 'smug', text: "Baz! Morning! Breezy, innit? Good job I've got all this insulation.", fx: { flag: 'gary' }, choices: [
      { t: 'Compliment the hair. Through your teeth.', go: 'g2', fx: { conf: -8 } },
      { t: 'Ask what his secret is.', go: 'g3' },
      { t: 'Pretend to take a phone call.', go: 'g4', fx: { conf: 3 } },
      { t: 'Ask to borrow a tenner.', go: function (S) { return S.conf >= 55 ? 'g5' : 'g6'; } },
    ] },
    g2: { who: 'barry', face: 'grit', text: 'Looking... full, Gary. Very full.', next: 'g2b' },
    g2b: { who: 'gary', face: 'happy', text: "Cheers! It just GROWS. I don't even want it." },
    g3: { who: 'gary', face: 'smug', text: "Honestly? Never worried about a thing. And I never wear hats. Hats are for quitters.", choices: [
      { t: 'Believe him. Take the hat off.', go: 'g3a', fx: { hatOff: true, conf: -5 }, show: function (S) { return !!S.hat; } },
      { t: 'Tell him his gutters are illegal.', go: 'g3b', fx: { conf: 8 } },
      { t: 'Nod. Die inside.', fx: { conf: -3 } },
    ] },
    g3a: { who: 'barry', face: 'sad', text: "He's right. I'm a quitter. A cold quitter." },
    g3b: { who: 'gary', face: 'shock', text: "...They're decorative.", next: 'g3c' },
    g3c: { who: 'barry', face: 'smug', text: "They're a violation, Gary." },
    g4: { who: 'barry', face: 'neutral', text: 'Yeah. Yeah. No, I AM busy. Bye... Mum.', next: 'g4b' },
    g4b: { who: 'gary', face: 'smug', text: "That's your torch, Baz. It's on." },
    g5: { who: 'gary', face: 'happy', text: 'A tenner? Go on then. I respect a man who asks with his chin up.', fx: { cash: 10 } },
    g6: { who: 'gary', face: 'happy', text: "Borrow a— oh, you're serious. Sorry, mate. Laughed so hard I think one of yours fell out.", fx: { hair: -2, conf: -5 } },
    g9: { who: 'gary', face: 'smug', text: "Can't stop, Baz. Hair appointment. Just a trim. Tiny bit off the VOLUME." },
    bench: { who: 'barry', face: 'sad', text: "'In memory of Norman, who loved this spot.' Norman had a full head of hair. I can tell." },
    aboard: { who: 'barry', face: 'neutral', text: "'PHARMACY. We've seen worse.' Have they, though." },

    // ---- the pharmacy ----
    shelf1: { who: 'barry', face: 'dead', text: "Vitamins that 'support' hair. Support it doing what? Leaving?" },
    shelf2: { who: 'barry', face: 'grit', text: "Shampoo 'for thick, full hair'. Rub it in, why don't you." },
    shelf3: { who: 'barry', face: 'neutral', text: 'Combs. A whole shelf of combs. Optimistic stock.' },
    p1: { who: 'moira', face: 'dead', text: 'Next. ...Oh. Let me guess.', choices: [
      { t: '"It\'s for a friend."', go: 'p2', fx: { conf: -5 } },
      { t: 'Whisper: "...minoxidil."', go: 'p3', fx: { conf: -10 } },
      { t: '"I\'m going bald and I\'m here to fight."', go: 'p4', fx: { conf: 10, flag: 'brave' } },
    ] },
    p2: { who: 'moira', face: 'dead', text: "Your friend's got your exact hairline. Funny, that.", next: 'shop' },
    p3: { who: 'moira', face: 'shock', text: 'MINOXIDIL FOR THE BALD GENTLEMAN! ...It\'s behind me. It\'s always behind me.', next: 'p3b' },
    p3b: { who: 'barry', face: 'sad', text: 'Thank you. Thank you for that.', next: 'shop' },
    p4: { who: 'moira', face: 'happy', text: 'Finally. A man with a plan and a visible scalp. Fiver off the minoxidil.', next: 'shop' },
    shop: { who: 'moira', face: 'dead', text: function (S) { return "What'll it be? You've got " + R.euro(S.cash) + '.'; }, choices: [
      { t: function (S) { return 'Minoxidil 5% — ' + R.euro(price(S)); }, go: 'buy1', fx: function (S) { return { cash: -price(S), item: 'minoxidil' }; },
        ok: function (S) { return S.cash >= price(S); }, why: 'not enough cash' },
      { t: 'Hair fibres — €18', go: 'buy2', fx: { cash: -18, item: 'fibers' }, ok: function (S) { return S.cash >= 18; }, why: 'not enough cash' },
      { t: 'Finasteride, please.', go: 'fin' },
      { t: 'Got any free samples?', go: function (S) { return S.conf >= 65 ? 'free1' : 'free0'; }, show: function (S) { return !S.flags.askedFree; } },
      { t: 'Leave with nothing.', go: 'leave' },
    ] },
    fin: { who: 'moira', face: 'dead', text: "Prescription only. You'll need a GP who can look you in the eye.", next: 'shop' },
    free0: { who: 'moira', face: 'dead', text: 'Samples are for confident people.', fx: { conf: -5, flag: 'askedFree' }, next: 'shop' },
    free1: { who: 'moira', face: 'happy', text: '...Go on. Caffeine shampoo. You asked like a man with hair.', fx: { item: 'sachet', flag: 'askedFree' }, next: 'done' },
    buy1: { who: 'moira', face: 'dead', text: 'Twice a day. Results in four to six months. Or never. NEXT!', next: 'done' },
    buy2: { who: 'moira', face: 'dead', text: "Shake it on. Don't sneeze. Don't stand under a hand dryer. NEXT!", next: 'done' },
    done: { who: 'barry', face: 'happy', text: 'I have a PRODUCT. I am a man with a REGIMEN.', fx: { mission: 'buy', end: 'complete' } },
    leave: { who: 'barry', face: 'sad', text: "I'll... come back." },
  };

  L.defeat = {
    hair: {
      titles: ['Total follicle collapse', 'Fully bald', 'The last one left'],
      lines: [
        "The final hair left a note. It said: 'It's not you.' Then, underneath: 'It is you.'",
        'Barry is now aerodynamic. Nobody asked for that.',
        'A pigeon mistook his head for an egg and has become protective.',
      ],
    },
    conf: {
      titles: ['Confidence: 0', 'Social death', 'Barry has left the chat'],
      lines: [
        'Barry has gone back to bed. He will re-emerge in 6–8 business years.',
        'He apologised to a lamp post and went home.',
        'Barry is now communicating only through closed curtains.',
      ],
    },
  };
})(window.RTT);
