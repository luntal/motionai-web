import { CHAPTER_COUNT, LEVEL_COUNT, chapterDescriptions, levelDescriptions } from './constants.js';

export const uiState = {
  activeChapter: 0,
  activeLevel: null
};

let hoverDescriptionEl = null;

function setHoverDescription(text) {
  if (!hoverDescriptionEl) return;
  hoverDescriptionEl.textContent = text;
  hoverDescriptionEl.classList.add('visible');
}

function clearHoverDescription() {
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
      `Chapter ${index + 1}`,
      uiState.activeChapter === index,
      () => {
        uiState.activeChapter = index;
        uiState.activeLevel = null;
        renderChapterButtons(chapterRow, levelRow);
        renderLevelButtons(levelRow);
      },
      chapterDescriptions[index]
    );
    chapterRow.appendChild(button);
  }
}

function renderLevelButtons(levelRow) {
  levelRow.innerHTML = '';
  for (let index = 0; index < LEVEL_COUNT; index += 1) {
    const isActive = uiState.activeLevel === index;
    const button = createButton(
      `Level ${index + 1}`,
      isActive,
      () => {
        uiState.activeLevel = isActive ? null : index;
        renderLevelButtons(levelRow);
      },
      levelDescriptions[uiState.activeChapter][index]
    );
    levelRow.appendChild(button);
  }
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

  hoverDescriptionEl = document.createElement('div');
  hoverDescriptionEl.className = 'hover-description';
  document.body.appendChild(hoverDescriptionEl);

  renderChapterButtons(chapterRow, levelRow);
  renderLevelButtons(levelRow);
}
