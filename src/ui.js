import {
  CHAPTER_COUNT,
  chapterTitles,
  chapterDescriptions,
  levelTitles,
  levelDescriptions,
  getLevelCountForChapter
} from './constants.js';

export const uiState = {
  activeChapter: null,
  activeLevel: null
};

let isLevelActive = false;
const chapterChangeHandlers = [];
const levelChangeHandlers = [];
let chapterRowElement = null;
let levelRowElement = null;

export function onChapterChange(handler) {
  if (typeof handler === 'function') chapterChangeHandlers.push(handler);
}

export function onLevelChange(handler) {
  if (typeof handler === 'function') levelChangeHandlers.push(handler);
}

export function setLevelActive(active) {
  isLevelActive = active;
}

function emitChapterChange(chapter) {
  chapterChangeHandlers.forEach((fn) => fn(chapter));
}

function emitLevelChange(level) {
  levelChangeHandlers.forEach((fn) => fn(level));
}

let hoverDescriptionEl = null;

function setHoverDescription(text) {
  if (!hoverDescriptionEl || isLevelActive) return;
  hoverDescriptionEl.textContent = text;
  hoverDescriptionEl.classList.add('visible');
}

export function clearHoverDescription() {
  if (!hoverDescriptionEl) return;
  hoverDescriptionEl.textContent = '';
  hoverDescriptionEl.classList.remove('visible');
}
function createButton(label, isActive, onClick, description) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (isActive) {
    button.classList.add('selected-btn');
  }
  button.addEventListener('click', onClick);
  if (description) {
    button.addEventListener('mouseenter', () => setHoverDescription(description));
    button.addEventListener('mouseleave', clearHoverDescription);
    button.setAttribute('aria-label', description);
  }
  return button;
}

function renderChapterButtons(chapterRow, levelRow) {
  chapterRow.innerHTML = '';
  for (let index = 0; index < CHAPTER_COUNT; index += 1) {
    const button = createButton(
      chapterTitles[index] || `Chapter ${index + 1}`,
      uiState.activeChapter === index,
      () => {
        uiState.activeChapter = index;
        uiState.activeLevel = null;
        renderChapterButtons(chapterRow, levelRow);
        renderLevelButtons(levelRow);
        emitChapterChange(index);
        emitLevelChange(uiState.activeLevel);
      },
      chapterDescriptions[index]
    );
    chapterRow.appendChild(button);
  }
}

function renderLevelButtons(levelRow) {
  levelRow.innerHTML = '';
  const hasActiveChapter = Number.isInteger(uiState.activeChapter);
  const levelCount = hasActiveChapter ? getLevelCountForChapter(uiState.activeChapter) : 0;
  for (let index = 0; index < levelCount; index += 1) {
    const isActive = uiState.activeLevel === index;
    const label = hasActiveChapter && levelTitles[uiState.activeChapter]
      ? levelTitles[uiState.activeChapter][index] || `Level ${index + 1}`
      : `Level ${index + 1}`;
    const button = createButton(
      label,
      isActive,
      () => {
        if (!hasActiveChapter) {
          return;
        }
        uiState.activeLevel = isActive ? null : index;
        renderLevelButtons(levelRow);
        emitLevelChange(uiState.activeLevel);
      },
      hasActiveChapter && levelDescriptions[uiState.activeChapter]
        ? levelDescriptions[uiState.activeChapter][index]
        : 'Select a chapter first.'
    );
    button.disabled = !hasActiveChapter;
    levelRow.appendChild(button);
  }
}

export function setActiveLevel(level) {
  uiState.activeLevel = level;
  if (levelRowElement) {
    renderLevelButtons(levelRowElement);
  }
  emitLevelChange(uiState.activeLevel);
}

export function setActiveChapter(chapter) {
  uiState.activeChapter = chapter;
  uiState.activeLevel = null;

  if (chapterRowElement && levelRowElement) {
    renderChapterButtons(chapterRowElement, levelRowElement);
    renderLevelButtons(levelRowElement);
  }

  emitChapterChange(chapter);
  emitLevelChange(uiState.activeLevel);
}

export function createNavigationUI() {
  const topBar = document.createElement('div');
  topBar.className = 'top-ui-bar';

  const chapterRow = document.createElement('div');
  chapterRow.className = 'chapter-row';

  const levelRow = document.createElement('div');
  levelRow.className = 'level-row';

  topBar.appendChild(chapterRow);
  topBar.appendChild(levelRow);
  document.body.prepend(topBar);

  chapterRowElement = chapterRow;
  levelRowElement = levelRow;

  hoverDescriptionEl = document.createElement('div');
  hoverDescriptionEl.className = 'hover-description';
  document.body.appendChild(hoverDescriptionEl);

  renderChapterButtons(chapterRow, levelRow);
  renderLevelButtons(levelRow);
}
