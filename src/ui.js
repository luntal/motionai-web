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
  activeLevel: null,
  hoverHelpEnabled: false
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

function setHoverDescription(text, position = null) {
  if (!hoverDescriptionEl || !uiState.hoverHelpEnabled) return;

  hoverDescriptionEl.textContent = text;
  hoverDescriptionEl.classList.remove('panel-help');

  const nextPosition = position || { left: '50%', top: 18 };
  const isCenteredTopHover = nextPosition.left === '50%' || nextPosition.left === window.innerWidth / 2;

  hoverDescriptionEl.style.left = isCenteredTopHover ? '50%' : `${nextPosition.left}px`;
  hoverDescriptionEl.style.top = `${nextPosition.top}px`;
  hoverDescriptionEl.style.maxWidth = '260px';
  hoverDescriptionEl.style.textAlign = 'center';
  hoverDescriptionEl.style.transform = 'translateX(-50%)';

  if (position) {
    hoverDescriptionEl.classList.add('panel-help');
  }

  hoverDescriptionEl.classList.add('visible');
}

export function clearHoverDescription() {
  if (!hoverDescriptionEl) return;

  hoverDescriptionEl.textContent = '';
  hoverDescriptionEl.classList.remove('visible');
  hoverDescriptionEl.classList.remove('panel-help');
  hoverDescriptionEl.style.left = '50%';
  hoverDescriptionEl.style.top = '18px';
  hoverDescriptionEl.style.transform = 'translateX(-50%)';
  hoverDescriptionEl.style.maxWidth = '260px';
  hoverDescriptionEl.style.textAlign = 'center';
}

export function setHoverHelpEnabled(enabled) {
  uiState.hoverHelpEnabled = Boolean(enabled);
  if (!uiState.hoverHelpEnabled) {
    clearHoverDescription();
  }
}

export function registerHoverHelp(element, description) {
  if (!(element instanceof Element) || !description) {
    return element;
  }

  if (element.dataset.hoverHelpBound === 'true') {
    return element;
  }

  const showDescription = () => {
    if (!uiState.hoverHelpEnabled) {
      return;
    }

    setHoverDescription(description, { left: '50%', top: 18 });
  };

  element.addEventListener('mouseenter', showDescription);
  element.addEventListener('mouseover', showDescription);
  element.addEventListener('pointerenter', showDescription);
  element.addEventListener('focus', showDescription);
  element.addEventListener('mouseleave', clearHoverDescription);
  element.addEventListener('mouseout', clearHoverDescription);
  element.addEventListener('pointerleave', clearHoverDescription);
  element.addEventListener('blur', clearHoverDescription);
  element.setAttribute('aria-label', description);
  element.setAttribute('title', description);
  element.dataset.hoverHelpBound = 'true';

  return element;
}

export function attachPanelHoverHelp(panel) {
  if (!(panel instanceof Element)) {
    return panel;
  }

  if (panel.dataset.hoverHelpAttached === 'true') {
    return panel;
  }

  const candidates = panel.querySelectorAll('button, input, select, textarea, label');
  candidates.forEach((element) => {
    if (element.dataset.hoverHelpBound === 'true') {
      return;
    }

    const explicitDescription = element.dataset.help || element.getAttribute('title') || element.getAttribute('aria-label');
    if (explicitDescription) {
      registerHoverHelp(element, explicitDescription);
      return;
    }

    const textNode = element.textContent ? element.textContent.replace(/\s+/g, ' ').trim() : '';
    if (textNode && element.tagName !== 'INPUT' && element.tagName !== 'SELECT' && element.tagName !== 'TEXTAREA') {
      registerHoverHelp(element, textNode);
    }
  });

  panel.dataset.hoverHelpAttached = 'true';
  return panel;
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
    button.setAttribute('title', description);
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
