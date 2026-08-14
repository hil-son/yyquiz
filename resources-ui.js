(function () {
  const STORAGE_KEY = 'yy-resource-library-state';
  const PREVIEW_LIMIT = 3;

  const state = {
    subject: null,
    tutor: null,
    alphaRange: null,
    viewMode: 'list',
    expanded: false,
  };

  const bookIconSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4h12v2H6V4zm0 4h12v12H6V8zm2 2v8h8v-8H8z"/>
    </svg>
  `;

  function loadState() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      state.subject = parsed.subject || null;
      state.tutor = parsed.tutor || null;
      state.alphaRange = parsed.alphaRange || null;
      state.viewMode = parsed.viewMode === 'grid' ? 'grid' : 'list';
      state.expanded = Boolean(parsed.expanded);
    } catch (_) {
      /* ignore invalid storage */
    }
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      subject: state.subject,
      tutor: state.tutor,
      alphaRange: state.alphaRange,
      viewMode: state.viewMode,
      expanded: state.expanded,
    }));
  }

  function getTutorFirstLetter(name) {
    const match = name.trim().match(/[A-Za-z]/);
    return match ? match[0].toUpperCase() : '';
  }

  function tutorMatchesAlphaRange(tutors, rangeId) {
    const range = TUTOR_ALPHA_RANGES.find((item) => item.id === rangeId);
    if (!range) return true;
    return tutors.some((tutor) => {
      const letter = getTutorFirstLetter(tutor);
      return letter && range.test(letter);
    });
  }

  function getFilteredResources() {
    return RESOURCES.filter((resource) => {
      if (state.subject && !resource.subjects.includes(state.subject)) return false;
      if (state.tutor && !resource.tutors.includes(state.tutor)) return false;
      if (state.alphaRange && !tutorMatchesAlphaRange(resource.tutors, state.alphaRange)) return false;
      return true;
    });
  }

  function hasActiveFilters() {
    return Boolean(state.subject || state.tutor || state.alphaRange);
  }

  function renderSubjectTags(subjects) {
    return subjects.map((subject) => (
      `<span class="resource-tag resource-tag--subject">${escapeHtml(subject)}</span>`
    )).join('');
  }

  function renderTutorTags(tutors) {
    return tutors.map((tutor) => (
      `<span class="resource-tag resource-tag--tutor">${escapeHtml(tutor)}</span>`
    )).join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderListCard(resource) {
    return `
      <a href="resource-detail.html?id=${encodeURIComponent(resource.id)}" class="resource-row resource-card-link flex items-start gap-2.5 px-5 py-2.5 no-underline text-inherit">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center pt-1 text-brand-green">${bookIconSvg}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[16px] font-medium leading-5 text-[#282828]">${escapeHtml(resource.title)}</p>
          <div class="resource-tags mt-1.5">${renderSubjectTags(resource.subjects)}${renderTutorTags(resource.tutors)}</div>
          <p class="mt-1.5 text-[12px] text-[#818181]">${escapeHtml(resource.date)}</p>
        </div>
        <span class="shrink-0 pt-2 text-[22px] text-[#818181]" aria-hidden="true">›</span>
      </a>
    `;
  }

  function renderGridCard(resource) {
    return `
      <a href="resource-detail.html?id=${encodeURIComponent(resource.id)}" class="resource-grid-card resource-card-link flex h-full flex-col gap-2 rounded-[16px] border border-brand-border bg-white p-3 no-underline text-inherit">
        <span class="flex h-8 w-8 items-center justify-center text-brand-green">${bookIconSvg}</span>
        <p class="line-clamp-3 flex-1 text-[14px] font-medium leading-5 text-[#282828]">${escapeHtml(resource.title)}</p>
        <div class="resource-tags">${renderSubjectTags(resource.subjects)}${renderTutorTags(resource.tutors)}</div>
        <p class="text-[12px] text-[#818181]">${escapeHtml(resource.date)}</p>
      </a>
    `;
  }

  function renderActiveChips() {
    const chips = [];
    if (state.subject) {
      chips.push({ type: 'subject', label: state.subject });
    }
    if (state.tutor) {
      chips.push({ type: 'tutor', label: state.tutor });
    }
    if (state.alphaRange) {
      const range = TUTOR_ALPHA_RANGES.find((item) => item.id === state.alphaRange);
      chips.push({ type: 'alphaRange', label: range ? range.label : state.alphaRange });
    }

    if (!chips.length) return '';

    return `
      <div class="resource-active-filters flex flex-wrap gap-2 px-1 pb-2.5" aria-label="已選篩選">
        ${chips.map((chip) => `
          <button type="button" class="resource-chip" data-remove-filter="${chip.type}">
            <span>${escapeHtml(chip.label)}</span>
            <span class="resource-chip__close" aria-hidden="true">✕</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderFilterOption(type, value, label, selected) {
    return `
      <button
        type="button"
        class="resource-filter-option${selected ? ' resource-filter-option--active' : ''}"
        data-filter-type="${type}"
        data-filter-value="${escapeHtml(value)}"
      >${escapeHtml(label)}</button>
    `;
  }

  function renderFilterSheet() {
    return `
      <div id="resource-filter-backdrop" class="resource-filter-backdrop" hidden></div>
      <div id="resource-filter-sheet" class="resource-filter-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="resource-filter-title">
        <div class="resource-filter-sheet__handle" aria-hidden="true"></div>
        <div class="resource-filter-sheet__header">
          <h2 id="resource-filter-title" class="text-[18px] font-bold text-[#282828]">篩選</h2>
          <button type="button" id="resource-filter-clear" class="resource-filter-clear">清除全部</button>
        </div>
        <div class="resource-filter-sheet__body">
          <section class="resource-filter-group">
            <h3 class="resource-filter-group__title">科目</h3>
            <div class="resource-filter-group__options">
              ${RESOURCE_SUBJECTS.map((subject) => renderFilterOption('subject', subject, subject, state.subject === subject)).join('')}
            </div>
          </section>
          <section class="resource-filter-group">
            <h3 class="resource-filter-group__title">導師</h3>
            <div class="resource-filter-group__options">
              ${RESOURCE_TUTORS.map((tutor) => renderFilterOption('tutor', tutor, tutor, state.tutor === tutor)).join('')}
            </div>
          </section>
          <section class="resource-filter-group">
            <h3 class="resource-filter-group__title">A-Z 導師姓名</h3>
            <div class="resource-filter-group__options">
              ${TUTOR_ALPHA_RANGES.map((range) => renderFilterOption('alphaRange', range.id, range.label, state.alphaRange === range.id)).join('')}
            </div>
          </section>
        </div>
        <div class="resource-filter-sheet__footer">
          <button type="button" id="resource-filter-apply" class="resource-filter-apply">顯示結果</button>
        </div>
      </div>
    `;
  }

  function renderResources() {
    const listEl = document.getElementById('resource-list');
    const chipsEl = document.getElementById('resource-active-filters');
    const emptyEl = document.getElementById('resource-empty');
    const viewMoreWrap = document.getElementById('resource-view-more-wrap');
    const filterBtn = document.getElementById('resource-filter-btn');
    const viewToggleBtn = document.getElementById('resource-view-toggle');

    if (!listEl) return;

    const filtered = getFilteredResources();
    const visible = state.expanded ? filtered : filtered.slice(0, PREVIEW_LIMIT);
    const isGrid = state.viewMode === 'grid';

    listEl.className = isGrid
      ? 'resource-grid grid grid-cols-2 gap-2.5'
      : 'resource-list overflow-hidden rounded-[20px] bg-white';

    listEl.innerHTML = visible.map((resource) => (
      isGrid ? renderGridCard(resource) : renderListCard(resource)
    )).join('');

    if (chipsEl) {
      chipsEl.innerHTML = renderActiveChips();
    }

    if (emptyEl) {
      emptyEl.hidden = filtered.length > 0;
    }

    if (viewMoreWrap) {
      viewMoreWrap.hidden = filtered.length <= PREVIEW_LIMIT || state.expanded;
    }

    if (filterBtn) {
      filterBtn.classList.toggle('resource-control-btn--active', hasActiveFilters());
      filterBtn.setAttribute('aria-pressed', hasActiveFilters() ? 'true' : 'false');
    }

    if (viewToggleBtn) {
      const isGrid = state.viewMode === 'grid';
      viewToggleBtn.setAttribute('aria-pressed', isGrid ? 'true' : 'false');
      viewToggleBtn.setAttribute('aria-label', isGrid ? '切換至列表檢視' : '切換至網格檢視');
      viewToggleBtn.innerHTML = isGrid ? listViewIcon() : gridViewIcon();
    }

    saveState();
  }

  function gridViewIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    `;
  }

  function listViewIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13"/>
        <path d="M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    `;
  }

  function filterIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4"/>
      </svg>
    `;
  }

  function syncFilterOptions() {
    document.querySelectorAll('.resource-filter-option').forEach((btn) => {
      const type = btn.dataset.filterType;
      const value = btn.dataset.filterValue;
      btn.classList.toggle('resource-filter-option--active', state[type] === value);
    });
  }

  function openFilterSheet() {
    const backdrop = document.getElementById('resource-filter-backdrop');
    const sheet = document.getElementById('resource-filter-sheet');
    if (!backdrop || !sheet) return;
    syncFilterOptions();
    backdrop.hidden = false;
    sheet.hidden = false;
    document.body.classList.add('resource-filter-open');
  }

  function closeFilterSheet() {
    const backdrop = document.getElementById('resource-filter-backdrop');
    const sheet = document.getElementById('resource-filter-sheet');
    if (!backdrop || !sheet) return;
    backdrop.hidden = true;
    sheet.hidden = true;
    document.body.classList.remove('resource-filter-open');
  }

  function toggleFilter(type, value) {
    if (state[type] === value) {
      state[type] = null;
    } else {
      state[type] = value;
    }
  }

  function clearAllFilters() {
    state.subject = null;
    state.tutor = null;
    state.alphaRange = null;
  }

  function bindEvents(root) {
    root.addEventListener('click', (event) => {
      const filterBtn = event.target.closest('#resource-filter-btn');
      if (filterBtn) {
        openFilterSheet();
        return;
      }

      const viewToggleBtn = event.target.closest('#resource-view-toggle');
      if (viewToggleBtn) {
        state.viewMode = state.viewMode === 'list' ? 'grid' : 'list';
        renderResources();
        return;
      }

      const viewMoreBtn = event.target.closest('#resource-view-more');
      if (viewMoreBtn) {
        state.expanded = true;
        renderResources();
        return;
      }

      const removeChip = event.target.closest('[data-remove-filter]');
      if (removeChip) {
        const type = removeChip.dataset.removeFilter;
        state[type] = null;
        renderResources();
        return;
      }

      const filterOption = event.target.closest('.resource-filter-option');
      if (filterOption) {
        toggleFilter(filterOption.dataset.filterType, filterOption.dataset.filterValue);
        syncFilterOptions();
        renderResources();
        return;
      }

      if (event.target.closest('#resource-filter-backdrop')) {
        closeFilterSheet();
        return;
      }

      if (event.target.closest('#resource-filter-apply')) {
        closeFilterSheet();
        return;
      }

      if (event.target.closest('#resource-filter-clear')) {
        clearAllFilters();
        syncFilterOptions();
        renderResources();
      }
    });
  }

  function initResourceLibrary() {
    const root = document.getElementById('resource-library');
    if (!root) return;

    loadState();

    root.insertAdjacentHTML('beforeend', renderFilterSheet());

    const filterBtn = document.getElementById('resource-filter-btn');
    if (filterBtn) {
      filterBtn.innerHTML = filterIcon();
    }

    bindEvents(root);
    renderResources();

    if (window.location.hash === '#resource-library') {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.addEventListener('DOMContentLoaded', initResourceLibrary);
})();
