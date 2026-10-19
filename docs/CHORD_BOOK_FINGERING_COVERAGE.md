# Chord Book Fingering Coverage

## What is fully covered now

- Every chord symbol collected from the book is mapped into `ChordBookCatalog`.
- Current catalog size: 326 symbols.
- Every catalogued symbol resolves through `GuitarFingeringEngine`.
- The movable-chord section is represented algorithmically by generated multi-position variants.
- A dedicated `BookChordShapeBank` now exposes source-backed page references plus all generated guitar variants for each mapped book symbol.

## What is **not** yet guaranteed 1:1 from the PDF

The PDF is image-heavy. Its chord diagrams and fingering photos are not available as structured text.
That means the current system does **not** yet certify that every exact printed book diagram/fingering/photo position was digitized one-by-one from the source pages.

Current status is:
- symbol-level coverage: complete
- engine-generated playable positions: complete for catalogued symbols
- exact per-diagram book transcription: not yet guaranteed

## Current engine coverage snapshot

- Catalogued symbols: 326
- Symbols with at least one generated fingering: 326
- Symbols with zero generated fingerings: 0
- Variant counts range from 1 to 63 in the source-backed bank summary snapshot

## To reach exact book-diagram parity

A separate ingestion pass is required for:
1. extracting each printed chord diagram/photo from every page
2. reading exact string/fret/finger placements
3. storing them in a dedicated `bookChordShapes` dataset with page references
4. preferring those exact book shapes in the UI when available

Without that diagram-level ingestion, the system can guarantee musical/catalog coverage, but not exact printed-shape parity.
