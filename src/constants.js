export const CHAPTER_COUNT = 7;
export const LEVEL_COUNT = 5;
export const chapterLevelCounts = [3, 5, 6, 7, 4, 5, 5];

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
  'Dynamikebenen',
  'Einsätze geben',
  'Prüfungen'
];

export const chapterDescriptions = [
  'Kallibrierung: Positioniere dich vor der Kamera und kalibriere deine Handbewegungen.',
  'Eingewöhnung: Einfache Übungen zur Gewöhnung an die Bewegungserkennung und das Feedback.',
  'Gleichmäßigkeit: Übe deine Bewegungen gleichmäßig auszuführen.',
  'Grundfiguren: Übe grundlegende Dirigierschläge und Bewegungsmuster.',
  'Dynamikebenen: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.',
  'Einsätze geben: Platzhalter für zukünftige Einsatzübungen.',
  'Prüfungen: Platzhalter für die Prüfungsstruktur und spätere Aufgaben.'
];

export const levelTitles = [
  ['Oberkörper', 'forte', 'piano'],
  ['Rechts', 'Links', 'Symmetrisch', 'Alternierend', 'Parallele Linien'],
  ['Rechte Linie', 'Linke Linie', 'Synchron', 'Versetzt', '2:1 Tempo', 'Ellipsen'],
  ['Einserfigur', 'Zweierfigur', 'Dreierfigur', 'Viererfigur', 'Fünferfigur', 'Sechserfigur', 'Siebenerfigur'],
  ['Lehrübung 1', 'Lehrübung 2', 'Lehrübung 3', 'Lehrübung 4'],
  ['Lehrübung 1', 'Lehrübung 2', 'Lehrübung 3', 'Lehrübung 4', 'Lehrübung 5'],
  ['Lehrübung 1', 'Lehrübung 2', 'Lehrübung 3', 'Lehrübung 4', 'Lehrübung 5']
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
    'Einserfigur: Zwei Segmente, weich/hart interpoliert am zentralen Fixpunkt.',
    'Zweierfigur: Vier Segmente, weich/hart interpoliert am zentralen Fixpunkt.',
    'Dreierfigur: Sechs Segmente, weich/hart interpoliert am zentralen Fixpunkt.',
    'Viererfigur: Acht Segmente, weich/hart interpoliert am zentralen Fixpunkt.',
    'Fünferfigur: Bei der Fünferfigur handelt es sich um eine Viererfigur mit Verdopplung der zweiten oder dritten Zählzeit.',
    'Sechserfigur: Viererfigur mit Verdopplung der zweiten und dritten Zählzeit.',
    'Siebenerfigur: Viererfigur mit Verdopplung der ersten, zweiten und dritten Zählzeit.'
  ],
  [
    'Dynamikebene 1: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.',
    'Dynamikebene 2: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.',
    'Dynamikebene 3: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.',
    'Dynamikebene 4: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.'
  ],
  [
    'Lehrübung 1: Platzhalter für Einsatzübungen ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 2: Platzhalter für Einsatzübungen ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 3: Platzhalter für Einsatzübungen ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 4: Platzhalter für Einsatzübungen ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 5: Platzhalter für Einsatzübungen ohne Zuordnung zu Grundfiguren.'
  ],
  [
    'Lehrübung 1: Platzhalter für Prüfungsaufgaben ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 2: Platzhalter für Prüfungsaufgaben ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 3: Platzhalter für Prüfungsaufgaben ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 4: Platzhalter für Prüfungsaufgaben ohne Zuordnung zu Grundfiguren.',
    'Lehrübung 5: Platzhalter für Prüfungsaufgaben ohne Zuordnung zu Grundfiguren.'
  ]
];

export const basicFigurePaths = {
  'Einserfigur': {
    softD: 'M 0 0 C -10 0 -10 -15 0 -15 C 10 -15 10 0 0 0 Z',
    hardD: 'M 0 0 L 0 -16 L 0 0 Z'
  },
  'Zweierfigur': {
    softD: 'M 0 0 C -4.511 1.459 -7.415 -6.85 -6.305 -8.648 C -4.533 -11.106 -3.344 -8.277 -2.18 -8.145 C 0.305 -7.854 3.134 -15.436 1.982 -16.012 C 1.403 -16.283 1.08 -15.659 0.964 -14.689 C 0.918 -14.227 0.98 -5.941 0.988 -1.567 C 0.968 -1.1 0.687 -0.296 0 0 Z',
    hardD: 'M 0 0 L -6.877 -11.533 L -2.456 -8.078 L 0 -16.177 L 0 0 Z'
  },
  'Dreierfigur': {
    softD: 'M 0 0 C 2.818 -0.035 3.407 -6.675 -0.517 -7.642 C -2.792 -8.135 -3.969 -5.436 -5.388 -5.492 C -8.959 -5.75 -10.069 -12.199 -7.401 -12.24 C -5.905 -12.213 -5.56 -10.696 -3.682 -10.978 C -0.807 -11.729 0.583 -15.768 -0.626 -16.458 C -0.911 -16.58 -1.031 -16.315 -1.034 -15.995 C -1.036 -15.43 -1.122 -1.722 -0.98 -1.141 C -0.776 -0.388 -0.47 -0.021 0 0 Z',
    hardD: 'M 0 0 L 3.894 -9.535 L -4.384 -5.424 L -7.198 -13.481 L -2.011 -10.97 L 0.00 -16.268 L 0 0 Z'
  },
  'Viererfigur': {
    softD: 'M 0 0 C -2.916 -0.028 -4.25 -6.048 -1.229 -6.673 C 1.26 -7.038 4.239 -3.642 6.79 -3.813 C 10.405 -4.153 8.989 -8.819 7.145 -9.579 C 4.408 -10.527 -0.347 -7.905 -3.495 -7.8 C -8.253 -7.735 -8.524 -12.509 -5.835 -12.971 C -3.579 -13.209 -2.86 -11.411 -1.095 -11.674 C 1.843 -12.376 3.202 -15.752 2.095 -16.136 C 1.812 -16.22 1.61 -16.125 1.59 -15.601 C 1.59 -10.805 1.59 -6.009 1.59 -1.213 C 1.594 -0.715 0.865 0.003 0 0',
    hardD: 'M 0 0 L 7.583 -6.859 L -4.615 -4.101 L -6.669 -9.771 L 4.426 -8.269 L 6.878 -14.675 L 2.526 -11.916 L 0 -16.115 L 0 0'
  }
};

export const extendedFigurePaths = {
  'Fünferfigur':{
    softD:'M 0 0 C 3.704 -0.007 4.968 -6.307 2.082 -7.395 C -0.939 -8.748 -4.252 -3.996 -6.466 -4.279 C -10.072 -5.282 -8.96 -10.906 -5.245 -12.196 C 2.287 -14.59 5.622 -8.552 0.608 -8.238 C -2.726 -8.966 -0.895 -11.974 0.44 -12.449 C 2.137 -12.997 2.723 -11.32 4.04 -11.492 C 6.45 -12.148 6.058 -14.917 4.567 -15.101 C 2.723 -15.374 1.917 -13.587 0.356 -13.965 C -2.072 -14.851 -3.206 -18.404 -2.1 -18.475 C -1.658 -18.464 -1.55 -18.173 -1.539 -17.965 C -1.567 -12.7153 -1.595 -7.4657 -1.623 -2.216 C -1.578 -0.833 -0.768 -0.023 0 0 Z',
    hardD: 'M 0 0 L 8.299 -7.257 L -3.084 -4.173 L 8.299 -7.257 L -3.098 -4.16 L -5.801 -11.003 L 4.343 -8.399 L 6.539 -14.498 L 1.934 -12.577 L 0 -16.437 L 0 0 Z'
  },
  'Sechserfigur':{
    softD:'M 0 0 C 4.446 -0.036 6.392 -7.034 3.39 -8.495 C -3.011 -10.037 -11.944 -6.037 -6.01 -3.841 C -1.73 -4.27 -4.18 -7.304 -5.15 -7.82 C -6.841 -8.399 -7.545 -7.053 -8.442 -7.233 C -11.524 -8.244 -8.221 -11.745 -6.152 -12.421 C 2.442 -14.271 4.491 -8.701 0.348 -8.212 C -2.989 -8.343 -2.074 -11.804 -0.1 -12.481 C 1.427 -12.998 2.116 -11.365 3.204 -11.52 C 6.042 -12.063 5.466 -14.908 4.054 -15.209 C 2.302 -15.505 1.109 -13.774 0.069 -13.952 C -2.671 -14.57 -3.626 -18.31 -2.77 -18.515 C -2.273 -18.593 -2.182 -18.005 -2.161 -17.499 C -2.1453 -12.3763 -2.1297 -7.2537 -2.114 -2.131 C -2.097 -0.814 -1.008 -0.012 0 0 Z',
    hardD:'M 0 0 L 8.205 -7.579 L -3.349 -4.347 L 8.205 -7.579 L -3.289 -4.347 L -5.88 -11.33 L 4.015 -8.657 L -5.88 -11.33 L 4.015 -8.657 L 6.11 -13.805 L 1.805 -12.72 L 0 -16.679 L 0 0 Z'
  },
  'Siebenerfigur':{
    softD:'M 0 0 C -3.036 -0.073 -2.985 -4.385 -0.527 -4.964 C 2.395 -5.633 1.764 -2.274 3.899 -2.391 C 7.581 -2.647 8.022 -7.27 5.604 -7.937 C -2.662 -9.814 -6.596 -4.328 -1.904 -3.606 C 1.251 -3.901 0.051 -6.635 -1.059 -7.289 C -2.489 -8.365 -3.772 -6.607 -4.984 -7.112 C -7.456 -9.035 -3.227 -11.86 -1.826 -12.099 C 8.996 -13.78 6.285 -7.105 3.751 -7.879 C 0.569 -8.815 2.196 -11.318 3.22 -11.863 C 5.137 -12.695 5.408 -11.089 6.732 -11.155 C 9.706 -11.491 8.841 -14.7 7.613 -14.7 C 5.464 -14.811 4.97 -13.175 3.635 -13.509 C 0.881 -14.343 0.153 -17.801 0.973 -17.887 C 1.322 -17.906 1.584 -17.809 1.597 -16.998 C 1.6167 -11.9813 1.6363 -6.9647 1.656 -1.948 C 1.678 -0.596 0.745 -0.002 0 0 Z',
    hardD:'M 0 0 L 8.163 -7.455 L -3.163 -4.287 L 8.163 -7.455 L -3.163 -4.287 L -5.651 -11.108 L 4.173 -8.32 L -5.651 -11.108 L 4.173 -8.32 L 6.146 -13.467 L 2.028 -12.438 L 0 -16.441 L 0 0 L 0 -16.441 L 0 0 Z'
  }
};