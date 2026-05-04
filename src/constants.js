export const CHAPTER_COUNT = 3;
export const LEVEL_COUNT = 5;
export const chapterLevelCounts = [3, 5, 5];

export function getLevelCountForChapter(chapter) {
  if (!Number.isInteger(chapter) || chapter < 0 || chapter >= chapterLevelCounts.length) {
    return 0;
  }
  return chapterLevelCounts[chapter];
}

export const chapterTitles = [
  'Kallibrierung',
  'Eingewöhnung',
  'Grundfiguren'
];

export const chapterDescriptions = [
  'Kallibrierung: Positioniere dich vor der Kamera und kalibriere deine Handbewegungen.',
  'Eingewöhnung: Einfache Übungen zur Gewöhnung an die Bewegungserkennung und das Feedback.',
  'Grundfiguren: Übe grundlegende Dirigierschläge und Bewegungsmuster.'
];

export const levelTitles = [
  ['Dynamikbereich', 'forte', 'piano'],
  ['Rechts', 'Links', 'Symmetrisch', 'Alternierend', 'Parallele Linien'],
  ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
];

export const levelDescriptions = [
  [
    'Dynamikbereich: Grundausrichtung vor der Kamera kalibrieren.',
    'forte: Grosse, geführte Handbewegung entlang der Referenzpfade.',
    'piano: Kleinere, zentrierte Handbewegung entlang der Referenzpfade.'
  ],
  [
    'Rechts: Rechte Hand entlang einer vertikalen Linie am rechten Rand führen.',
    'Links: Linke Hand entlang einer vertikalen Linie am linken Rand führen.',
    'Symmetrisch: Beide Hände gleichzeitig spiegelbildlich von oben nach unten.',
    'Alternierend: Beide Hände wechseln sich ab – links/rechts im Wechsel.',
    'Parallele Linien: Beide Hände gleichzeitig zwei innere vertikale Linien von oben nach unten durchlaufen.'
  ],
  [
    'Level 1: Optimize motion detection.',
    'Level 2: Handle edge cases smoothly.',
    'Level 3: Customize advanced behavior.',
    'Level 4: Enable expert-level controls.',
    'Level 5: Finalize and polish the experience.'
  ]
];
