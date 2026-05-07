export const CHAPTER_COUNT = 4;
export const LEVEL_COUNT = 5;
export const chapterLevelCounts = [3, 5, 6, 5];

export function getLevelCountForChapter(chapter) {
  if (!Number.isInteger(chapter) || chapter < 0 || chapter >= chapterLevelCounts.length) {
    return 0;
  }
  return chapterLevelCounts[chapter];
}

export const chapterTitles = [
  'Kallibrierung',
  'Eingewöhnung',
  'Gleichmäßigkeit',
  'Grundfiguren'
];

export const chapterDescriptions = [
  'Kallibrierung: Positioniere dich vor der Kamera und kalibriere deine Handbewegungen.',
  'Eingewöhnung: Einfache Übungen zur Gewöhnung an die Bewegungserkennung und das Feedback.',
  'Gleichmäßigkeit: Übe deine Bewegungen gleichmäßig auszuführen.',
  'Grundfiguren: Übe grundlegende Dirigierschläge und Bewegungsmuster.'
];

export const levelTitles = [
  ['Dynamikbereich', 'forte', 'piano'],
  ['Rechts', 'Links', 'Symmetrisch', 'Alternierend', 'Parallele Linien'],
  ['Rechte Linie', 'Linke Linie', 'Synchron', 'Versetzt', '2:1 Tempo', 'Ellipsen'],
  ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
];

export const levelDescriptions = [
  [
    'Dynamikbereich: Grundausrichtung vor der Kamera kalibrieren.',
    'forte: Große, geführte Handbewegung entlang der Referenzpfade.',
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
    'Rechte Linie: Folge mit der rechten Hand einem Punkt auf einer vertikalen Linie von oben nach unten.',
    'Linke Linie: Folge mit der linken Hand einem Punkt auf einer vertikalen Linie von oben nach unten.',
    'Synchron: Beide Hände folgen gleichzeitig zwei synchronen vertikalen Linien von oben nach unten.',
    'Versetzt: Beide Hände folgen zwei vertikalen Linien mit zeitlich versetzten Punkten.',
    '2:1 Tempo: Zwei vertikale Linien, wobei die linke Hand doppelt so schnell wie die rechte geführt wird.',
    'Ellipsen: Beide Hände folgen zwei Punkten auf elliptischen Kreisbahnen in einer Dauerschleife.'
  ],
  [
    'Level 1: Optimize motion detection.',
    'Level 2: Handle edge cases smoothly.',
    'Level 3: Customize advanced behavior.',
    'Level 4: Enable expert-level controls.',
    'Level 5: Finalize and polish the experience.'
  ]
];
