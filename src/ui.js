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

  if (hasActiveChapter) {
    levelRow.classList.add('active');
    const title = document.createElement('div');
    title.className = 'level-section-title';
    title.textContent = uiState.activeChapter === 0 ? 'Bereiche' : 'Übungen';
    levelRow.appendChild(title);
  } else {
    levelRow.classList.remove('active');
  }

  for (let index = 0; index < levelCount; index += 1) {
    if (uiState.activeChapter === 3 && index === 4) {
      const divider = document.createElement('div');
      divider.className = 'level-subsection-divider';
      levelRow.appendChild(divider);

      const extendedTitle = document.createElement('div');
      extendedTitle.className = 'level-section-title';
      extendedTitle.textContent = 'Erweiterte Dirigierfiguren';
      levelRow.appendChild(extendedTitle);
    }
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
  const sidebar = document.createElement('aside');
  sidebar.className = 'left-navigation';

  const chapterRow = document.createElement('div');
  chapterRow.className = 'chapter-row nav-stack';

  const levelRow = document.createElement('div');
  levelRow.className = 'level-row nav-stack';

  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'nav-header-row';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'nav-section-title';
  sectionTitle.textContent = 'Navigation';

  const headerActions = document.createElement('div');
  headerActions.className = 'nav-header-actions';

  sidebarHeader.appendChild(sectionTitle);
  sidebarHeader.appendChild(headerActions);
  sidebar.appendChild(sidebarHeader);
  sidebar.appendChild(chapterRow);
  sidebar.appendChild(levelRow);
  document.body.prepend(sidebar);

  chapterRowElement = chapterRow;
  levelRowElement = levelRow;

  hoverDescriptionEl = document.createElement('div');
  hoverDescriptionEl.className = 'hover-description';
  document.body.appendChild(hoverDescriptionEl);

  renderChapterButtons(chapterRow, levelRow);
  renderLevelButtons(levelRow);
}
