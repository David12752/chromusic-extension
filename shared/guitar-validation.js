/**
 * ChroMusic — Guitar Validation
 * =============================
 * Smoke validations for guitar note map, interval bank, triads, scales, and fingering engine.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-validation.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  function runAll() {
    const noteMap = window.ChroMusic?.GuitarNoteMap;
    const intervalBank = window.ChroMusic?.GuitarVerticalIntervalBank;
    const triadBank = window.ChroMusic?.GuitarTriadBank;
    const seventhBank = window.ChroMusic?.GuitarSeventhBank;
    const advancedBank = window.ChroMusic?.GuitarAdvancedBank;
    const scaleBank = window.ChroMusic?.GuitarScaleBank;
    const fingeringEngine = window.ChroMusic?.GuitarFingeringEngine;

    const results = {
      noteMapLoaded: Boolean(noteMap),
      intervalBankLoaded: Boolean(intervalBank),
      triadBankLoaded: Boolean(triadBank),
      seventhBankLoaded: Boolean(seventhBank),
      advancedBankLoaded: Boolean(advancedBank),
      scaleBankLoaded: Boolean(scaleBank),
      fingeringEngineLoaded: Boolean(fingeringEngine),
      openStrings: noteMap ? [6, 5, 4, 3, 2, 1].map((stringNumber) => noteMap.getNoteAt(stringNumber, 0)?.scientific) : [],
      fret24: noteMap ? [6, 5, 4, 3, 2, 1].map((stringNumber) => noteMap.getNoteAt(stringNumber, 24)?.scientific) : [],
      noteCount: noteMap ? noteMap.getAllNotes().length : 0,
      intervalCount: intervalBank ? intervalBank.getAllIntervals().length : 0,
      cMajorTriads123: triadBank ? triadBank.getPreferredTriads('C', 'major', '123').length : 0,
      cMaj7Sevenths2345: seventhBank ? seventhBank.getPreferredSeventhChords('C', 'major7', '2345').length : 0,
      cMajor9Advanced: advancedBank ? advancedBank.getVariants('C', 'major9').length : 0,
      cMajor13Advanced: advancedBank ? advancedBank.getVariants('C', 'major13').length : 0,
      dMinor11Advanced: advancedBank ? advancedBank.getVariants('D', 'minor11').length : 0,
      aMajor7Sharp5Advanced: advancedBank ? advancedBank.getVariants('A', 'major7Sharp5').length : 0,
      eMinorMajor9Advanced: advancedBank ? advancedBank.getVariants('E', 'minorMajor9').length : 0,
      cMajor9Sharp11Advanced: advancedBank ? advancedBank.getVariants('C', 'major9Sharp11').length : 0,
      bHalfDiminished11Advanced: advancedBank ? advancedBank.getVariants('B', 'halfDiminished11').length : 0,
      gMajorPositions: scaleBank ? scaleBank.getScalePositions('G', 'major').length : 0,
      dDorianPositions: scaleBank ? scaleBank.getScalePositions('D', 'dorian').length : 0,
      bLocrianNatural2Positions: scaleBank ? scaleBank.getScalePositions('B', 'locrianNatural2').length : 0,
      gLydianDominantPositions: scaleBank ? scaleBank.getScalePositions('G', 'lydianDominant').length : 0,
      aAlteredPositions: scaleBank ? scaleBank.getScalePositions('A', 'altered').length : 0,
      cWholeTonePositions: scaleBank ? scaleBank.getScalePositions('C', 'wholeTone').length : 0,
      cmaj7Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'C', quality: 'maj7', strictness: 'musical' }).length : 0,
      cmaj9Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'C', quality: 'maj9', strictness: 'musical' }).length : 0,
      cmaj13Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'C', quality: 'maj13', strictness: 'musical' }).length : 0,
      dm11Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'D', quality: 'm11', strictness: 'musical' }).length : 0,
      amaj7sharp5Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'A', quality: 'maj7#5', strictness: 'musical' }).length : 0,
      eminmaj9Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'E', quality: 'mMaj9', strictness: 'musical' }).length : 0,
      cmaj9sharp11Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'C', quality: 'maj9#11', strictness: 'musical' }).length : 0,
      bm11b5Fingerings: fingeringEngine ? fingeringEngine.findChordFingerings({ root: 'B', quality: 'm11b5', strictness: 'musical' }).length : 0,
    };

    return Object.freeze(results);
  }

  ChroMusic.GuitarValidation = Object.freeze({ runAll });
  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-validation.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-validation.js FAILED:', e);
}
