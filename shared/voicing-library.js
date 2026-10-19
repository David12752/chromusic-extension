(() => {
  'use strict';

  function familyFromLabels(labels) {
    const has = (label) => labels.includes(label);
    const dominantAlterations = [has('b9'), has('#9'), has('b13'), has('#11')].filter(Boolean).length;
    if (has('3') && has('7') && has('9') && has('#11')) return 'major9Sharp11';
    if (has('3') && has('7') && has('#5')) return 'major7Sharp5';
    if (has('b3') && has('7') && has('9')) return 'minorMajor9';
    if (has('b3') && has('7')) return 'minorMajor7';
    if (has('3') && has('7') && has('9') && has('13')) return 'major13';
    if (has('3') && has('7') && has('9') && has('11')) return 'major11';
    if (has('b3') && has('b7') && has('9') && has('13')) return 'minor13';
    if (has('b3') && has('b7') && has('9') && has('11')) return 'minor11';
    if (has('b3') && has('b5') && has('b7') && has('11')) return 'halfDiminished11';
    if (has('3') && has('b7') && dominantAlterations >= 2) return 'dominantAlt';
    if (has('3') && has('b7') && has('#11') && !has('b9') && !has('#9')) return 'dominantSharp11';
    if (has('3') && has('b7') && has('b13') && !has('b9') && !has('#9')) return 'dominantFlat13';
    if (has('3') && has('b7') && has('#5')) return 'dominantSharp5';
    if (has('3') && has('b7') && has('b5')) return 'dominantFlat5';
    if (has('3') && has('7') && has('#11')) return 'majorSharp11';
    if (has('3') && has('b7') && has('b9')) return 'dominantFlatNine';
    if (has('3') && has('b7') && has('#9')) return 'dominantSharpNine';
    if (has('3') && has('b7') && (has('b9') || has('#9') || has('b13') || has('#11'))) return 'dominantAlt';
    if (has('3') && has('b7') && has('13')) return 'dominant13';
    if (has('3') && has('7') && has('9')) return 'major9';
    if (has('b3') && has('b7') && has('9')) return 'minor9';
    if (has('9') && has('5') && !has('7') && !has('b7') && !has('b3')) return 'add9';
    if (has('9') && has('5') && !has('3') && !has('b3')) return 'sus2';
    if (has('3') && has('13') && !has('7') && !has('b7')) return 'major6';
    if (has('b3') && has('13') && !has('7') && !has('b7')) return 'minor6';
    if (has('b3') && has('b5') && has('b7')) return 'halfDiminished';
    if (has('b3') && has('dim7')) return 'diminished';
    if (has('b3') && has('b5')) return 'diminished';
    if (has('3') && has('#5')) return 'augmented';
    if (has('b3') && (has('b7') || has('13'))) return 'minor7';
    if (has('b3')) return 'minor';
    if (has('11') && !has('3') && !has('b3')) return 'sus';
    if (has('3') && has('b7')) return 'dominant';
    if (has('3') && has('7')) return 'major7';
    if (has('3')) return 'major';
    return 'other';
  }

  function positions(...list) {
    return list;
  }

  const GUITAR_LIBRARY = {
    major9Sharp11: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#11'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 1, slot: ['3'], finger: 3 }, { string: 2, offset: 2, slot: ['#11'], finger: 4 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#11'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 2, slot: ['#11'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
    ],
    major7Sharp5: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#5'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 1, slot: ['3'], finger: 3 }, { string: 2, offset: 1, slot: ['#5'], finger: 4 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['#5'], finger: 3 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
    ],
    minorMajor9: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['b3'], ['5'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 0, slot: ['b3'], finger: 1 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }, { string: 1, offset: 2, slot: ['9'], finger: 3 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['b3'], ['5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['b3'], finger: 2 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
    ],
    minorMajor7: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['7'], ['b3'], ['5']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 0, slot: ['b3'], finger: 1 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['7'], ['b3'], ['5']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['b3'], finger: 2 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }] },
    ],
    major13: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['13'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 1, slot: ['3'], finger: 3 }, { string: 2, offset: 2, slot: ['13'], finger: 4 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['13'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 2, slot: ['13'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['13'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['13'], ['9']], positions: positions('mid', 'high') },
    ],
    major11: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['11'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 1, slot: ['3'], finger: 3 }, { string: 2, offset: 3, slot: ['11'], finger: 4 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['11'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['7'], finger: 3 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 3, slot: ['11'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
    ],
    minor13: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['13'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 0, slot: ['b3'], finger: 1 }, { string: 2, offset: 2, slot: ['13'], finger: 3 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['13'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['b3'], finger: 2 }, { string: 2, offset: 2, slot: ['13'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['13'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['13'], ['9']], positions: positions('mid', 'high') },
    ],
    minor11: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['11'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 0, slot: ['b3'], finger: 1 }, { string: 2, offset: 3, slot: ['11'], finger: 4 }, { string: 1, offset: 2, slot: ['9'], finger: 3 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['11'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['b3'], finger: 2 }, { string: 2, offset: 3, slot: ['11'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
    ],
    dominantSharp11: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#11'], ['9', '5']], positions: positions('mid'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['#11'], finger: 3 }, { string: 1, offset: 0, slot: ['9', '5'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#11'], ['9']], positions: positions('mid', 'high') },
    ],
    dominantFlat13: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13'], ['9', '5']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['b13'], finger: 3 }, { string: 1, offset: 0, slot: ['9', '5'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13'], ['9']], positions: positions('mid', 'high') },
    ],
    add9: [
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2, 1], slots: [['R'], ['5'], ['3'], ['5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 0, slot: ['3'], finger: 1 }, { string: 2, offset: 3, slot: ['9'], finger: 4 }, { string: 1, offset: 0, slot: ['5'], finger: 1 }] },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2, 1], slots: [['R'], ['5'], ['3'], ['5'], ['9']], positions: positions('mid', 'high') },
    ],
    sus2: [
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2, 1], slots: [['R'], ['5'], ['9'], ['5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 2, slot: ['9'], finger: 4 }, { string: 2, offset: 3, slot: ['5'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2, 1], slots: [['R'], ['5'], ['9'], ['5'], ['9']], positions: positions('mid', 'high') },
    ],
    majorSharp11: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#11'], ['5', '9']], positions: positions('mid'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 1, slot: ['7'], finger: 2 }, { string: 2, offset: 2, slot: ['3'], finger: 4 }, { string: 1, offset: 2, slot: ['#11'], finger: 4 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['#11'], ['9']], positions: positions('mid', 'high') },
    ],
    dominantFlatNine: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b9'], ['5']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['b9'], finger: 3 }, { string: 1, offset: 0, slot: ['5'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b9'], ['5']], positions: positions('mid', 'high') },
    ],
    dominantSharpNine: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#9'], ['5']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 3, slot: ['#9'], finger: 4 }, { string: 1, offset: 0, slot: ['5'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#9'], ['5']], positions: positions('mid', 'high') },
    ],
    dominantSharp5: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['#5'], finger: 3 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['#5'], ['9']], positions: positions('mid', 'high') },
    ],
    dominantFlat5: [
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 0, slot: ['b5'], finger: 1 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b5'], ['9']], positions: positions('mid', 'high') },
    ],
    major6: [
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['3'], ['13', '9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 2, slot: ['3'], finger: 4 }, { string: 2, offset: 2, slot: ['13', '9'], finger: 4 }] },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['3'], ['13', '9']], positions: positions('mid', 'high') },
    ],
    minor6: [
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b3'], ['13', '9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 1, slot: ['b3'], finger: 2 }, { string: 2, offset: 2, slot: ['13', '9'], finger: 4 }] },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b3'], ['13', '9']], positions: positions('mid', 'high') },
    ],
    major9: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['3'], ['7'], ['9'], ['5']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['7'], finger: 2 }, { string: 3, offset: 1, slot: ['3'], finger: 3 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }, { string: 1, offset: 2, slot: ['9'], finger: 4 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['3'], ['7'], ['9'], ['5']], positions: positions('high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['9'], ['5']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 0, slot: ['7'], finger: 1 }, { string: 2, offset: 0, slot: ['3'], finger: 1 }, { string: 1, offset: 2, slot: ['9'], finger: 3 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['9'], ['5']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['9', '5']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['5'], ['9']] , positions: positions('mid', 'high')},
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['5'], ['9']], positions: positions('mid', 'high') },
    ],
    minor9: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 0, slot: ['b3'], finger: 1 }, { string: 2, offset: 0, slot: ['5'], finger: 1 }, { string: 1, offset: 2, slot: ['9'], finger: 3 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 2, slot: ['5'], finger: 3 }, { string: 2, offset: 1, slot: ['b3'], finger: 2 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['9', '5']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9']], positions: positions('mid', 'high') },
    ],
    dominant13: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 0, slot: ['13'], finger: 1 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 2, slot: ['13'], finger: 4 }, { string: 1, offset: 0, slot: ['9'], finger: 1 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13'], ['9']], positions: positions('mid', 'high') },
    ],
    dominantAlt: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#9', 'b9'], ['#9', 'b9', '#11']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['b13', '#9', 'b9'], finger: 3 }, { string: 1, offset: 3, slot: ['#9', 'b9', '#11'], finger: 4 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#9', 'b9'], ['#9', 'b9', '#11']], positions: positions('high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#9', 'b9'], ['#9', 'b9', '#11']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['b7'], finger: 1 }, { string: 3, offset: 1, slot: ['3'], finger: 2 }, { string: 2, offset: 1, slot: ['b13', '#9', 'b9'], finger: 3 }, { string: 1, offset: 3, slot: ['#9', 'b9', '#11'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#9', 'b9'], ['#9', 'b9', '#11']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#11'], ['#9', 'b9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['b13', '#11'], ['#9', 'b9']], positions: positions('mid', 'high') },
    ],
    major7: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['3'], ['7'], ['5', '9']], positions: positions('low'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['3'], finger: 2 }, { string: 3, offset: 1, slot: ['7'], finger: 3 }, { string: 2, offset: 0, slot: ['5', '9'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['3'], ['7'], ['5', '9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['7'], ['3', '9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 1, slot: ['7'], finger: 2 }, { string: 2, offset: 2, slot: ['3', '9'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['7'], ['3', '9']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['7'], ['3', '9']], positions: positions('low'), pattern: [{ string: 4, offset: 0, slot: ['R'], finger: 1 }, { string: 3, offset: 2, slot: ['5'], finger: 3 }, { string: 2, offset: 2, slot: ['7'], finger: 4 }, { string: 1, offset: 2, slot: ['3', '9'], finger: 4 }] },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['7'], ['3', '9']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['3'], ['7'], ['5']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['7'], ['3']], positions: positions('low', 'mid', 'high') },
      { rootString: 4, voicingType: 'root', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['7'], ['3']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['5'], ['9', '13']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['7'], ['3'], ['5', '13'], ['9']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop3', strings: [6, 5, 4, 3, 2], slots: [['R'], ['5'], ['7'], ['3'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop3', strings: [5, 4, 3, 2, 1], slots: [['R'], ['5'], ['7'], ['3'], ['9']], positions: positions('mid', 'high') },
    ],
    minor7: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('low'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['5'], finger: 1 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 0, slot: ['b3', '9'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 1, slot: ['b3', '9'], finger: 2 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('low'), pattern: [{ string: 4, offset: 0, slot: ['R'], finger: 0 }, { string: 3, offset: 2, slot: ['5'], finger: 2 }, { string: 2, offset: 1, slot: ['b7'], finger: 1 }, { string: 1, offset: 1, slot: ['b3', '9'], finger: 1 }] },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['b3', '9']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3']], positions: positions('low', 'mid', 'high') },
      { rootString: 4, voicingType: 'root', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['b3']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9', '11']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['5'], ['9', '11']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop3', strings: [6, 5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['b3'], ['9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop3', strings: [5, 4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['b3'], ['9']], positions: positions('mid', 'high') },
    ],
    dominant: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('low'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 0, slot: ['5'], finger: 1 }, { string: 3, offset: 1, slot: ['b7'], finger: 2 }, { string: 2, offset: 0, slot: ['3', '13'], finger: 1 }] },
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 2, slot: ['3', '13'], finger: 4 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('low'), pattern: [{ string: 4, offset: 0, slot: ['R'], finger: 0 }, { string: 3, offset: 2, slot: ['5'], finger: 2 }, { string: 2, offset: 1, slot: ['b7'], finger: 1 }, { string: 1, offset: 2, slot: ['3', '13'], finger: 3 }] },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['3', '13']], positions: positions('mid', 'high') },
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3']], positions: positions('low', 'mid', 'high') },
      { rootString: 4, voicingType: 'root', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['3']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13', '5'], ['9', 'b9', '#9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['3'], ['13', '5'], ['9', 'b9', '#9']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop3', strings: [6, 5, 4, 3, 2], slots: [['R'], ['5'], ['b7'], ['3'], ['9', 'b9', '#9']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop3', strings: [5, 4, 3, 2, 1], slots: [['R'], ['5'], ['b7'], ['3'], ['9', 'b9', '#9']], positions: positions('mid', 'high') },
    ],
    halfDiminished: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2], slots: [['R'], ['b5'], ['b7'], ['b3', '11']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['b5'], ['b7'], ['b3', '11']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['b5'], finger: 2 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 1, slot: ['b3', '11'], finger: 2 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2], slots: [['R'], ['b5'], ['b7'], ['b3', '11']], positions: positions('mid', 'high') },
      { rootString: 4, voicingType: 'shell', strings: [4, 3, 2, 1], slots: [['R'], ['b5'], ['b7'], ['b3', '11']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['b5'], ['b7'], ['b3']], positions: positions('low', 'mid', 'high') },
      { rootString: 6, voicingType: 'drop2', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['b5'], ['11']], positions: positions('mid', 'high') },
      { rootString: 5, voicingType: 'drop2', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b7'], ['b3'], ['b5'], ['11']], positions: positions('low', 'mid', 'high') },
    ],
    halfDiminished11: [
      { rootString: 6, voicingType: 'shell', strings: [6, 4, 3, 2, 1], slots: [['R'], ['b5'], ['b7'], ['b3'], ['11']], positions: positions('mid'), pattern: [{ string: 6, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['b5'], finger: 2 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 1, slot: ['b3'], finger: 2 }, { string: 1, offset: 1, slot: ['11'], finger: 2 }] },
      { rootString: 5, voicingType: 'shell', strings: [5, 4, 3, 2, 1], slots: [['R'], ['b5'], ['b7'], ['b3'], ['11']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['b5'], finger: 2 }, { string: 3, offset: 0, slot: ['b7'], finger: 1 }, { string: 2, offset: 1, slot: ['b3'], finger: 2 }, { string: 1, offset: 1, slot: ['11'], finger: 2 }] },
    ],
    major: [
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
      { rootString: 4, voicingType: 'root', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
    ],
    minor: [
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
      { rootString: 4, voicingType: 'root', strings: [4, 3, 2, 1], slots: [['R'], ['5'], ['b3'], ['5', '9']], positions: positions('low', 'mid', 'high') },
    ],
    diminished: [
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['b5'], ['dim7'], ['b3']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['b5'], ['dim7'], ['b3']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 1, slot: ['b5'], finger: 2 }, { string: 3, offset: 2, slot: ['dim7'], finger: 3 }, { string: 2, offset: 1, slot: ['b3'], finger: 2 }] },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['b5'], ['dim7'], ['b3']], positions: positions('mid', 'high') },
    ],
    sus: [
      { rootString: 6, voicingType: 'root', strings: [6, 4, 3, 2], slots: [['R'], ['5'], ['b7', '5'], ['11', '9']], positions: positions('low', 'mid', 'high') },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7', '5'], ['11', '9']], positions: positions('low'), pattern: [{ string: 5, offset: 0, slot: ['R'], finger: 1 }, { string: 4, offset: 2, slot: ['5'], finger: 3 }, { string: 3, offset: 0, slot: ['b7', '5'], finger: 1 }, { string: 2, offset: 3, slot: ['11', '9'], finger: 4 }] },
      { rootString: 5, voicingType: 'root', strings: [5, 4, 3, 2], slots: [['R'], ['5'], ['b7', '5'], ['11', '9']], positions: positions('mid', 'high') },
    ],
  };

  const PIANO_LIBRARY = {
    major9Sharp11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['#11']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['#11']] },
    ],
    major7Sharp5: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['#5']], right: [['3'], ['7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['#5']], right: [['3'], ['7']] },
    ],
    minorMajor9: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['7']] },
    ],
    minorMajor7: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['7']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['7']] },
    ],
    major13: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['13']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['13'], ['9']] },
    ],
    major11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['11']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['11']] },
    ],
    minor13: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9'], ['13']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['13'], ['9']] },
    ],
    minor11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9'], ['11']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['11']] },
    ],
    dominantSharp11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['#11'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['#11']] },
    ],
    dominantFlat13: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b13'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['b13']] },
    ],
    add9: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['9']] },
    ],
    sus2: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['9'], ['5']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['9'], ['5']] },
    ],
    majorSharp11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['#11'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['#11']] },
    ],
    dominantFlatNine: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b9'], ['5']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['b9']] },
    ],
    dominantSharpNine: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['#9'], ['5']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['#9']] },
    ],
    dominantSharp5: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['#5'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['#5']] },
    ],
    dominantFlat5: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b5'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b5']] },
    ],
    major6: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['13']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['13']] },
    ],
    minor6: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['5'], ['13']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['13']] },
    ],
    major9: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['5']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['7'], ['9'], ['3'], ['5']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9']] },
    ],
    minor9: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9'], ['5']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['b7'], ['9'], ['b3'], ['5']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['5'], ['b7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9']] },
    ],
    dominant13: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['9'], ['13']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['b7'], ['9'], ['3'], ['13']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['13'], ['9']] },
    ],
    dominantAlt: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b13', '#11'], ['#9', 'b9']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['b7']], right: [['b13', '#11'], ['3'], ['#9', 'b9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b7']], right: [['3'], ['b13', '#11'], ['#9', 'b9']] },
    ],
    major7: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['13', '5']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['7'], ['9'], ['3'], ['13', '5']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['7'], ['9']] },
      { voicingType: 'closed', inversion: '1st', register: 'mid', left: [['R']], right: [['3'], ['5'], ['7'], ['9'], ['R']] },
      { voicingType: 'drop2', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['R'], ['3'], ['5'], ['7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['7'], ['9']] },
      { voicingType: 'rootless', inversion: 'root', register: 'high', left: [['R'], ['5']], right: [['3'], ['7'], ['9'], ['13', '5']] },
    ],
    minor7: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9'], ['11', '5']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['b7'], ['9'], ['b3'], ['11', '5']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['5'], ['b7'], ['9']] },
      { voicingType: 'drop2', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['R'], ['b3'], ['5'], ['b7'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9']] },
      { voicingType: 'rootless', inversion: 'root', register: 'high', left: [['R'], ['5']], right: [['b3'], ['b7'], ['9'], ['11', '5']] },
    ],
    dominant: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['9', 'b9', '#9'], ['13', 'b13']] },
      { voicingType: 'rootless', inversion: '1st', register: 'mid', left: [['R'], ['5']], right: [['b7'], ['9', 'b9', '#9'], ['3'], ['13', 'b13']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['b7'], ['9', 'b9', '#9']] },
      { voicingType: 'drop2', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['R'], ['3'], ['5'], ['b7'], ['9', 'b9', '#9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['b7'], ['13', '9']] },
      { voicingType: 'rootless', inversion: 'root', register: 'high', left: [['R'], ['5']], right: [['3'], ['b7'], ['9', 'b9', '#9'], ['13', 'b13']] },
    ],
    halfDiminished: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b5']], right: [['b3'], ['b7'], ['11'], ['b5']] },
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['b5'], ['b7'], ['11']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b5']], right: [['b3'], ['b7'], ['11']] },
    ],
    halfDiminished11: [
      { voicingType: 'rootless', inversion: 'root', register: 'mid', left: [['R'], ['b5']], right: [['b3'], ['b7'], ['11']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b5']], right: [['b3'], ['b7'], ['11']] },
    ],
    major: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['3'], ['5'], ['9']] },
      { voicingType: 'drop2', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['R'], ['3'], ['5'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['3'], ['9']] },
    ],
    minor: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['5'], ['9']] },
      { voicingType: 'drop2', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['R'], ['b3'], ['5'], ['9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['b3'], ['9']] },
    ],
    diminished: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['b3'], ['b5'], ['dim7']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['b5']], right: [['b3'], ['dim7']] },
    ],
    sus: [
      { voicingType: 'closed', inversion: 'root', register: 'mid', left: [['R']], right: [['R'], ['11'], ['5'], ['b7', '9']] },
      { voicingType: 'shell', inversion: 'root', register: 'mid', left: [['R'], ['5']], right: [['11'], ['b7', '9']] },
    ],
  };

  function getGuitarDescriptors(family) {
    return GUITAR_LIBRARY[family] || GUITAR_LIBRARY.major || [];
  }

  function getPianoDescriptors(family) {
    return PIANO_LIBRARY[family] || PIANO_LIBRARY.major || [];
  }

  window.ChroMusic = window.ChroMusic || {};
  window.ChroMusic.VoicingLibrary = {
    familyFromLabels,
    getGuitarDescriptors,
    getPianoDescriptors,
  };
})();
