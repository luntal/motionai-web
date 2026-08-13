export const CHAPTER_COUNT = 6;
export const LEVEL_COUNT = 5;
export const chapterLevelCounts = [3, 5, 6, 5, 5, 5];

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
  'Grundfiguren',
  'Einsätze geben',
  'Prüfung'
];

export const chapterDescriptions = [
  'Kallibrierung: Positioniere dich vor der Kamera und kalibriere deine Handbewegungen.',
  'Eingewöhnung: Einfache Übungen zur Gewöhnung an die Bewegungserkennung und das Feedback.',
  'Gleichmäßigkeit: Übe deine Bewegungen gleichmäßig auszuführen.',
  'Grundfiguren: Übe grundlegende Dirigierschläge und Bewegungsmuster.',
  'Einsätze geben: Platzhalter für zukünftige Einsatzübungen.',
  'Prüfung: Platzhalter für die Prüfungsstruktur und spätere Aufgaben.'
];

export const levelTitles = [
  ['Oberkörper', 'forte', 'piano'],
  ['Rechts', 'Links', 'Symmetrisch', 'Alternierend', 'Parallele Linien'],
  ['Rechte Linie', 'Linke Linie', 'Synchron', 'Versetzt', '2:1 Tempo', 'Ellipsen'],
  ['Einserfigur', 'Zweierfigur', 'Dreierfigur', 'Viererfigur', 'Fünferfigur'],
  ['Einsatz 1', 'Einsatz 2', 'Einsatz 3', 'Einsatz 4', 'Einsatz 5'],
  ['Prüfung 1', 'Prüfung 2', 'Prüfung 3', 'Prüfung 4', 'Prüfung 5']
];

export const levelDescriptions = [
  [
    'Oberkörper: Augen- und Hüftbereich in die vorgegebenen Rechtecke ausrichten und danach die Armkalibrierung freischalten.',
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
    'Einserfigur: Die Folge stetig gleicher Bewegungen, reduziert auf zwei Grundbedürfnisse: Eine Aufwärtsbewegung und eine Abwärtsbewegung und eine Abwärtsbewegung.',
    'Level 2: Handle edge cases smoothly.',
    'Level 3: Customize advanced behavior.',
    'Level 4: Enable expert-level controls.',
    'Level 5: Finalize and polish the experience.'
  ],
  [
    'Level 1: Platzhalter für Einsatzübungen.',
    'Level 2: Platzhalter für Einsatzübungen.',
    'Level 3: Platzhalter für Einsatzübungen.',
    'Level 4: Platzhalter für Einsatzübungen.',
    'Level 5: Platzhalter für Einsatzübungen.'
  ],
  [
    'Level 1: Platzhalter für Prüfungsaufgaben.',
    'Level 2: Platzhalter für Prüfungsaufgaben.',
    'Level 3: Platzhalter für Prüfungsaufgaben.',
    'Level 4: Platzhalter für Prüfungsaufgaben.',
    'Level 5: Platzhalter für Prüfungsaufgaben.'
  ]
];
