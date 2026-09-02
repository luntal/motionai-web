export const CHAPTER_COUNT = 8;
export const LEVEL_COUNT = 5;
export const chapterLevelCounts = [3, 5, 6, 7, 4, 8, 5, 5];

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
  'Handunabhängigkeit',
  'Einsätze geben',
  'Prüfungen'
];

export const chapterDescriptions = [
  'Kallibrierung: Positioniere dich vor der Kamera und kalibriere deine Handbewegungen.',
  'Eingewöhnung: Einfache Übungen zur Gewöhnung an die Bewegungserkennung und das Feedback.',
  'Gleichmäßigkeit: Übe deine Bewegungen gleichmäßig auszuführen.',
  'Grundfiguren: Übe grundlegende Dirigierschläge und Bewegungsmuster.',
  'Dynamikebenen: Platzhalter für zukünftige Übungen zu dynamischen Bewegungsstufen.',
  'Handunabhängigkeit: Übe die Unabhängigkeit deiner Hände durch unterschiedliche Bewegungsmuster in der linken und rechten Hand.',
  'Einsätze geben: Platzhalter für zukünftige Einsatzübungen.',
  'Prüfungen: Platzhalter für die Prüfungsstruktur und spätere Aufgaben.'
];

export const levelTitles = [
  ['Oberkörper', 'forte', 'piano'],
  ['Ziffern', 'Punkte', 'Freie Bewegung', 'Leer 1', 'Leer 2'],
  ['Rechte Linie', 'Linke Linie', 'Synchron', 'Versetzt', '2:1 Tempo', 'Ellipsen'],
  ['Einserfigur', 'Zweierfigur', 'Dreierfigur', 'Viererfigur', 'Fünferfigur', 'Sechserfigur', 'Siebenerfigur'],
  ['Einsertakt', 'Zweiertakt', 'Dreiertakt', 'Vierertakt'],
  ['Preset 1', 'Preset 2', 'Preset 3', 'Preset 4', 'Preset 5', 'Preset 6', 'Preset 7', 'Preset 8'],
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
    'Ziffern: Malen nach Zahlen. Berühre die orangenen Kreise mit der rechten Hand und die blauen Kreise mit der linken.',
    'Punkte: Berühre den aktiven Punkt.',
    'Freie Bewegung: Führe freie Bewegungen mit beiden Händen aus.',
    'Leer 1: Berühre den aktiven Punkt.',
    'Leer 2: Berühre den aktiven Punkt.'
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
  ['Preset 1', 'Preset 2', 'Preset 3', 'Preset 4', 'Preset 5', 'Preset 6', 'Preset 7', 'Preset 8'],
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

export const basicFigurePathsStyle2 = {
  'Vierviertel': {
    softD: 'M 0 0 C 1.951 -0.02 1.951 -3.107 0.001 -2.978 C -1.043 -2.807 -1.803 0.003 -4.453 0.001 C -7.1 0.003 -6.018 -3.245 -4.058 -3.222 C -2.402 -3.199 1.859 -0.02 5.092 0.001 C 7.363 0.003 7.363 -3.084 5.166 -3.111 C 2.78 -3.084 2.297 0.003 1.375 0.026 C -0.651 -0.066 -0.168 -12.872 -0.905 -15.728 C -1.0123 -10.991 -1.1197 -6.254 -1.227 -1.517 C -1.204 -0.688 -1.066 -0.089 -0.007 -0.02 Z',
    hardD: 'M 0 0 C 0.185 -1.716 0.39 -2.418 -1.161 -2.447 C -2.272 -2.506 -2.594 -1.336 -2.565 0 C -2.682 -1.921 -3.618 -3.12 0.536 -3.12 C 4.369 -3.032 3.432 -2.126 3.725 0 C 4.047 -1.921 4.486 -2.389 2.994 -2.418 C 2.028 -2.389 1.414 -2.506 1.385 0 C 0.916 -0.838 0.419 -13.067 -0.4 -15.554 C -0.371 -13.243 -0.751 -1.511 0 0 Z'
  },
  'Dreiviertel': {
    softD: 'M -3 0 C -6.068 0.009 -5.2 -3.336 -2.959 -3.468 C 0.57 -3.821 4.63 0.009 6.904 0.08 C 9.558 -0.016 10.011 -3.273 6.571 -3.273 C 4.043 -3.182 3.507 0.009 1.926 0.034 C -0.579 -0.042 0.723 -14.341 -0.102 -16.925 C -0.194 -11.165 -0.17 -4.587 -0.196 -3.182 C -0.221 -1.267 -0.936 -0.042 -3 0 Z',
    hardD: 'M 0 0 C -0.408 -2.662 -0.869 -3.295 1.722 -3.295 C 4.341 -3.324 3.564 -2.201 4.11 -0.014 C 4.398 -1.971 4.485 -2.604 3.276 -2.662 C 2.211 -2.604 2.355 -1.626 2.067 0.015 C 1.75 -1.712 1.204 -14.922 0.455 -16.591 C 0.398 -11.267 0.513 -5.05 0.484 -3.784 C 0.369 -1.367 0.196 -0.849 0 0 Z'
  },
  'Zweiviertel': {
    softD: 'M 3 0 C 6.178 -0.004 6.882 -3.642 6.694 -4.228 C 5.779 -3.102 4.618 -1.952 3.177 -1.927 C -0.668 -2.053 0.748 -14.423 -0.006 -16.032 C 0.0113 -11.679 0.0287 -7.326 0.046 -2.973 C 0.123 -1.6 0.968 -0.004 3 0 Z',
    hardD: 'M 1 0 C 1.693 -0.034 1.885 -4.215 1.621 -4.239 C 1.38 -3.614 1.308 -1.644 0.852 -1.644 C 0.227 -1.62 0.748 -14.423 -0.006 -16.032 C 0.0113 -11.679 0.0287 -7.326 0.046 -2.973 C 0.123 -1.6 0.395 -0.058 1 0 Z'
  }
}


export const uiElementDescriptions = {
  'Calibration': {

  },
  'Einstellungen': {
    'Einstellungen': 'Öffnet oder schließt das Einstellungsmenü.',
    'Einstellungen schließen': 'Schließt das Einstellungsmenü.',
    'Model': 'Wähle das verwendete Erkennungsmodell für Hand- oder Pose-Erkennung aus.',
    'Camera': 'Wähle die Kamera aus, mit der die Bewegungserkennung arbeitet.',
    'Calibration Sets': 'Wähle einen gespeicherten Kalibrierungs-Set aus.',
    'Calibration Strictness': 'Bestimmt, wie streng die Kalibrierung auf Abweichungen reagiert.',
    'Playback': 'Legt fest, wie die Übung nach der Ausführung weiterläuft.',
    'Resolution': 'Wechselt zwischen der normalen und der reduzierten Auflösung für eine schnelle oder leichtere Verarbeitung.',
    'Info Box': 'Aktiviert oder deaktiviert die individuelle Info-Box in der Mitte oben im Fenster beim Hover.',
    'Camera: ON': 'Aktiviert die Kamera für die Live-Erkennung.',
    'Camera: OFF': 'Deaktiviert die Kamera und pausiert die Erkennung.',
    'Stabilization': 'Aktiviert oder deaktiviert die Stabilisierung der Bewegungserkennung.',
    'Landmarks': 'Blendet die Landmarken im Video für die Verifikation der Erkennung ein oder aus.',
    'Pose Warning Landmarks': 'Blendet zusätzliche Warnhinweise für die Pose-Erkennung ein oder aus.'
  },
  'Eingewöhnung': {
    Form: 'Wähle die Form der Bewegung aus, die du üben möchtest.',
    Hand: 'Übe die Bewegung mit der ausgewählten Hand oder mit beiden Händen gleichzeitig.',
    Synchronität: 'Führe die bewegung gleichzeitig mit beiden Händen aus oder unabhängig voneinander.',
    Kreisdurchmesser: 'Bestimme die Genauigkeit der Bewegung, indem du die Durchmesser der Kreise einstellst, die du berühren musst.',
    GridAuflösung: 'Bestimme die Genauigkeit der Bewegung, indem du die Auflösung des Gitters einstellst, indem die Kreise angezeigt werden.',
    AbstandZumMittelpunkt: 'Stelle den Abstand der Kreise zum Mittelpunkt ein.',
    Bearbeiten: 'Stelle den Bearbeitungsmodus ein, um verschiedene Formen zu erstellen und diese zu speichern. Klicke dazu nacheinander auf die Kreise im Bild, in der Reihenfolge, in der du die Bewegung ausführen möchtest.',
    Presets: 'Wähle aus den vordefinierten Bewegungsmustern aus, um die Übung zu starten.',
    Nacheinander: 'Nacheinander bezieht sich auf die Reihenfolge für die Hände. Aktiviert müssen Kreise für die linke und rechte Hand nacheinander berührt werden, so wie sie beim Erstellen des Presets angeklickt wurden. Deaktiviert können die Kreise für die linke und rechte Hand unabhängig voneinander berührt werden.',
    Reset: 'Lösche die aktuelle Auswahl an Kreisen. Es werden keine bereits gespeicherten Presets gelöscht.',
    Speichern: 'Speichere die aktuelle Konfiguration. Die gespeicherte Konfiguration kann später über die Presets wieder aufgerufen werden. Beim Speichern in einen Slot wird der vorherige Inhalt des Slots überschrieben.',
    KontaktFade: 'Stelle den Kontakt-Fade-Effekt ein oder aus. Der Effekt bewirkt, dass die Kreise nach dem Berühren langsam ausblenden, anstatt sofort zu verschwinden. So kannst du besser nachvollziehen, was für eine Bewegung ausgeführt wurde.',
  },
  'Gleichmäßigkeit': {
    Tempo: 'Stelle das Tempo der Bewegung ein.',
    Strenge: 'Es wird ein Score angezeigt, der die Ausführungsgenauigkeit der Bewegung bewertet. Hier kannst du seine Strenge einstellen.',
    Kurve: 'Höhere Werte bremsen die Bewegung an den Eckpunkten ab, während niedrigere Werte die Bewegungsgeschwindigkeit überall gleichmäßig halten.',
  },
  'Grundfiguren': {
    weichHart: 'Wähle die Art der Bewegung aus, die du üben möchtest. Weiche Bewegungen sind fließend und rund, während harte Bewegungen kantig und abrupt sind.',
    Hand: 'Wählt die Hand aus, mit der du die Bewegung üben möchtest. Du kannst entweder die linke Hand, die rechte Hand oder beide gleichzeitig auswählen.',
    Dynamiklinien: 'Blendet die Dynamiklinien ein oder aus.',
    Zählzeiten: 'Blendet die Zählzeiten ein oder aus, die an der Grundfigur angezeigt werden.',
    Groesse: 'Stelle die Größe der Grundfigur ein, um die Bewegungsreichweite und damit die Dynamik zu bestimmen.',
    x: 'Stellt den Abstand zur Mitte in horizontaler Richtung ein.',
    y: 'Stellt Position in vertikaler Richtung ein.',
    BPM: 'Stellt die Bewegungsgeschwindigkeit in Beats pro Minute ein.',
    Linearität: 'Stellt die Linearität der Bewegung ein. Linearität = 100 hält das Bewegungsgeschwindigkeit konstant, während Linearität = 0 die Geschwindigkeit an den Zählzeit-Eckpunkten der Bewegung beschleunigt, um ein abfedern der Bewegung zu erzeugen.',
    Übergangslänge: 'Stellt die Übergangslänge für die Bewegungsgeschwindigkeit zwischen den farblich markierten Segmanten ein. Da jedes Segment unterschiedlich lang ist, aber die Zeit, in der es durchlaufen wird, gleich bleibt, braucht jedes Segment eine eigene Bewegungsgeschwindigkeit. Damit es keine Geschwindigkeitssprünge gibt, kann mit der Übergangslänge die Geschwindigkeit sanft von einem Segment auf das nächste abgeändert/angepasst werden. Die Übergangslänge bestimmt, wie lange es dauert, bis die Bewegungsgeschwindigkeit von einem Segment auf das nächste übergeht.',
    Stroke: 'Bestimmmt die Strichstärke der Grundfigur.',
  },
  'Dynamikebenen': {
    weichHart: 'Wähle die Art der Bewegung aus, die du üben möchtest. Weiche Bewegungen sind fließend und rund, während harte Bewegungen kantig und abrupt sind.',
    Hand: 'Wähle die Hand aus, mit der du die Bewegung üben möchtest. Du kannst entweder die linke Hand, die rechte Hand oder beide gleichzeitig auswählen.',
    Dynamiklinien: 'Blendet die Dynamiklinien ein oder aus.',
    Zählzeiten: 'Blendet die Zählzeiten ein oder aus, die an der Grundfigur angezeigt werden.',
    Groesse: 'Stellt die Größe der Grundfigur ein, um die Bewegungsreichweite und damit die Dynamik zu bestimmen.',
    x: 'Stellt den Abstand zur Mitte in horizontaler Richtung ein.',
    y: 'Stellt die Position in vertikaler Richtung ein.',
    BPM: 'Stellt die Bewegungsgeschwindigkeit in Beats pro Minute ein.',
    Linearität: 'Stellt die Linearität der Bewegung ein. Linearität = 100 hält das Bewegungsgeschwindigkeit konstant, während Linearität = 0 die Geschwindigkeit an den Zählzeit-Eckpunkten der Bewegung beschleunigt, um ein abfedern der Bewegung zu erzeugen.',
    Übergangslänge: 'Stellt die Übergangslänge für die Bewegungsgeschwindigkeit zwischen den farblich markierten Segmanten ein. Da jedes Segment unterschiedlich lang ist, aber die Zeit, in der es durchlaufen wird, gleich bleibt, braucht jedes Segment eine eigene Bewegungsgeschwindigkeit. Damit es keine Geschwindigkeitssprünge gibt, kann mit der Übergangslänge die Geschwindigkeit sanft von einem Segment auf das nächste abgeändert/angepasst werden. Die Übergangslänge bestimmt, wie lange es dauert, bis die Bewegungsgeschwindigkeit von einem Segment auf das nächste übergeht.',
    Stroke: 'Bestimmmt die Strichstärke der Grundfigur.',
    ZählzeitSlider: 'Kontrolliert die genauere Form der Figur. Bestimme auf welcher Dynamikebene diese Zählzeit erscheinen soll.',
    ZwischenpunktSlider: 'Kontolliert die genauere Form der Figur. Bestimme auf welcher Dynamikebene dieser Zwischenpunkt erscheinen soll.',
    Presets: 'Wählt ein vorgegebenes Preset aus.',
    Speichern: 'Speichert die aktuelle Konfiguration.',
    Zurücksetzen: 'Setzt die Konfiguration auf den Standard zurück.',
  },
  'Handunabhängigkeit': {
    Umkehren: 'Vertauscht die Formen der linken und rechten Hand. Eine Form ist immer die Taktgebung (Grundfigur im vorgegebenen Takt), die andere Form ist die Handunabhängigkeit (freie Form, die in der Handunabhängigkeit geübt wird).',
    Dynamiklinien: 'Blendet die Dynamiklinien ein oder aus.',
    Stroke: 'Stellt die Strichstärke der Grundfigur ein.',
    x: 'Stellt den Abstand zur Mitte in horizontaler Richtung ein.',
    y: 'Stellt die Position in vertikaler Richtung ein.',
    BPM: 'Stellt die Bewegungsgeschwindigkeit in Beats pro Minute ein.',
    Geschwindigkeitsverhältnis: 'Stellt das Verhältnis der Geschwindigkeit zwischen den beiden Händen ein.',
    Taktgebung: 'Stellt die Form derTaktgebung ein.',
    weichHart: 'Stellt die Art der Bewegung ein. Weiche Bewegungen sind fließend und rund, während harte Bewegungen kantig und abrupt sind.',
    Zählzeiten: 'Blendet die Zählzeiten ein oder aus, die an der Grundfigur angezeigt werden.',
    Grösse: 'Stellt die Größe der Grundfigur ein, um die Bewegungsreichweite und damit die Dynamik zu bestimmen.',
    Übergangslänge: 'Stellt die Übergangslänge für die Bewegungsgeschwindigkeit zwischen den farblich markierten Segmanten ein. Da jedes Segment unterschiedlich lang ist, aber die Zeit, in der es durchlaufen wird, gleich bleibt, braucht jedes Segment eine eigene Bewegungsgeschwindigkeit. Damit es keine Geschwindigkeitssprünge gibt, kann mit der Übergangslänge die Geschwindigkeit sanft von einem Segment auf das nächste abgeändert/angepasst werden. Die Übergangslänge bestimmt, wie lange es dauert, bis die Bewegungsgeschwindigkeit von einem Segment auf das nächste übergeht.',
    ZählzeitSlider: 'Kontrolliert die genauere Form der Figur. Bestimme auf welcher Dynamikebene diese Zählzeit erscheinen soll.',
    ZwischenpunktSlider: 'Kontolliert die genauere Form der Figur. Bestimme auf welcher Dynamikebene dieser Zwischenpunkt erscheinen soll.',
    Gegensatz: 'Stellt die Form für die zweite Hand ein, die eine gegensätzliche Form zur ersten Hand darstellt. Die erste Hand ist die Taktgebung, die zweite Hand ist die Handunabhängigkeit.',
    Länge: 'Stellt die Länge der Gegensatzfigur ein.',
    Rotation: 'Stellt die Rotation der Gegensatzfigur ein.',
  }

}