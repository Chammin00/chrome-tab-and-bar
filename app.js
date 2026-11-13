/**
 * Chrome Tab & Bar - Antigravity Index Hub
 * Interactive Application Controller
 */

(function () {
  'use strict';

  // State
  let currentCategory = 'all';
  let searchQuery = '';
  let selectedProjectId = null;

  // DOM Elements
  const searchInput = document.getElementById('project-search');
  const projectsGrid = document.getElementById('projects-grid');
  const resultsCount = document.getElementById('results-count');
  const activeCountLabel = document.getElementById('active-count-label');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const tabsGroup = document.getElementById('tabs-group');
  const categoryNavList = document.getElementById('category-nav-list');
  const fullscreenToggle = document.getElementById('btn-fullscreen-toggle');
  const syncBookmarksBtn = document.getElementById('btn-sync-bookmarks');
  const syncModal = document.getElementById('sync-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');

  // Inspector Elements
  const detailName = document.getElementById('detail-name');
  const detailDesc = document.getElementById('detail-desc');
  const detailPath = document.getElementById('detail-path');
  const detailUrl = document.getElementById('detail-url');
  const detailStack = document.getElementById('detail-stack');
  const detailTypeBadge = document.getElementById('detail-type-badge');
  const inspectorOpenLink = document.getElementById('inspector-open-link');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const btnCopyPath = document.getElementById('btn-copy-path');
  const copyUrlLabel = document.getElementById('copy-url-label');
  const copyPathLabel = document.getElementById('copy-path-label');

  // Bookmarks Folder Bar Trigger
  const bookmarkFolderBtn = document.getElementById('bookmark-folder-btn');

  // Load Projects from global PROJECTS_DATA
  const allProjects = (window.PROJECTS_DATA && window.PROJECTS_DATA.projects) ? window.PROJECTS_DATA.projects : [];

  // Initialize
  function init() {
    activeCountLabel.textContent = `${allProjects.length} Index Files Ready`;
    renderProjects();
    setupEventListeners();

    // Select first project by default
    if (allProjects.length > 0) {
      selectProject(allProjects[0].id);
    }
  }

  // Filter projects by category and query
  function getFilteredProjects() {
    return allProjects.filter(p => {
      const matchesCat = (currentCategory === 'all' || p.category === currentCategory);
      if (!matchesCat) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.desc.toLowerCase().includes(q);
      const stackMatch = p.stack && p.stack.some(s => s.toLowerCase().includes(q));
      const typeMatch = p.type && p.type.toLowerCase().includes(q);

      return nameMatch || descMatch || stackMatch || typeMatch;
    });
  }

  // Render cards grid
  function renderProjects() {
    const list = getFilteredProjects();
    resultsCount.textContent = `Showing ${list.length} of ${allProjects.length}`;

    if (list.length === 0) {
      projectsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--color-fg-muted); background: var(--color-canvas-subtle); border: 1px dashed var(--color-border-default); border-radius: 8px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; color: var(--color-fg-subtle);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div style="font-size: 14px; font-weight: 500; color: var(--color-fg-default);">No index files match your search</div>
          <div style="font-size: 12px; margin-top: 4px;">Try searching for a different keyword, category, or clear the search input.</div>
        </div>
      `;
      return;
    }

    projectsGrid.innerHTML = list.map(p => {
      const isSelected = (p.id === selectedProjectId);
      const stackBadges = (p.stack || []).slice(0, 3).map(s => `<span class="stack-tag">${escapeHtml(s)}</span>`).join('');
      const tagClass = p.tagClass || 'tag-cyber';

      return `
        <div class="project-card ${isSelected ? 'selected' : ''}" data-id="${p.id}">
          <div>
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-cat-indicator ${tagClass}"></span>
                <span class="card-title">${escapeHtml(p.name)}</span>
              </div>
              <span class="type-badge">${escapeHtml(p.type || 'HTML')}</span>
            </div>
            <p class="card-desc">${escapeHtml(p.desc || '')}</p>
            <div class="card-stack-row">
              ${stackBadges}
            </div>
          </div>
          <div class="card-footer">
            <span class="path-preview" title="${escapeHtml(p.filePath)}">${escapeHtml(p.filePath)}</span>
            <div class="card-actions-group">
              <button class="icon-btn btn-card-copy" title="Copy file:/// URL" data-url="${escapeHtml(p.url)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <a class="launch-btn" href="${escapeHtml(p.url)}" target="_blank" title="Open Index in Chrome Tab">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Launch</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to cards
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent trigger if launch link or copy button was clicked
        if (e.target.closest('.launch-btn') || e.target.closest('.btn-card-copy')) return;
        const id = card.getAttribute('data-id');
        selectProject(id);
      });
    });

    // Attach copy url buttons on cards
    document.querySelectorAll('.btn-card-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        copyText(url, () => {
          btn.style.color = '#3fb950';
          setTimeout(() => { btn.style.color = ''; }, 1200);
        });
      });
    });
  }

  // Select project and populate inspector
  function selectProject(id) {
    selectedProjectId = id;
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    // Highlight card
    document.querySelectorAll('.project-card').forEach(card => {
      if (card.getAttribute('data-id') === id) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Update inspector
    detailName.textContent = project.name;
    detailDesc.textContent = project.desc || 'No detailed description provided.';
    detailPath.textContent = project.filePath;
    detailUrl.textContent = project.url;
    detailTypeBadge.textContent = project.type || 'HTML / JS';
    inspectorOpenLink.href = project.url;

    if (project.stack && project.stack.length > 0) {
      detailStack.innerHTML = project.stack.map(s => `<span class="stack-tag">${escapeHtml(s)}</span>`).join('');
    } else {
      detailStack.innerHTML = `<span class="stack-tag">Standard Web</span>`;
    }
  }

  // Change category filter
  function setCategory(cat) {
    currentCategory = cat;

    // Update category nav list
    categoryNavList.querySelectorAll('.category-nav-item').forEach(item => {
      if (item.getAttribute('data-category') === cat) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update tabs
    tabsGroup.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-category') === cat) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderProjects();
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderProjects();
    });

    // Keyboard shortcut Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === 'Escape') {
        if (syncModal.classList.contains('active')) {
          syncModal.classList.remove('active');
        } else if (searchInput === document.activeElement) {
          searchInput.value = '';
          searchQuery = '';
          renderProjects();
          searchInput.blur();
        }
      }
    });

    // Category Tabs click
    tabsGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn) {
        const cat = btn.getAttribute('data-category');
        setCategory(cat);
      }
    });

    // Sidebar Category Nav click
    categoryNavList.addEventListener('click', (e) => {
      const item = e.target.closest('.category-nav-item');
      if (item) {
        const cat = item.getAttribute('data-category');
        setCategory(cat);
      }
    });

    // Sidebar Toggle
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Fullscreen Toggle
    fullscreenToggle.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Bookmarks Bar Sync Modal
    syncBookmarksBtn.addEventListener('click', () => {
      syncModal.classList.add('active');
    });

    bookmarkFolderBtn.addEventListener('click', () => {
      syncModal.classList.add('active');
    });

    modalCloseBtn.addEventListener('click', () => {
      syncModal.classList.remove('active');
    });

    modalDismissBtn.addEventListener('click', () => {
      syncModal.classList.remove('active');
    });

    syncModal.addEventListener('click', (e) => {
      if (e.target === syncModal) {
        syncModal.classList.remove('active');
      }
    });

    // Copy buttons in inspector
    btnCopyUrl.addEventListener('click', () => {
      const url = detailUrl.textContent;
      copyText(url, () => {
        copyUrlLabel.textContent = 'Copied to Clipboard!';
        setTimeout(() => { copyUrlLabel.textContent = 'Copy file:/// URL'; }, 1500);
      });
    });

    btnCopyPath.addEventListener('click', () => {
      const path = detailPath.textContent;
      copyText(path, () => {
        copyPathLabel.textContent = 'Copied to Clipboard!';
        setTimeout(() => { copyPathLabel.textContent = 'Copy Local Disk Path'; }, 1500);
      });
    });

    // Copy buttons in modal
    const btnCopyHtmlPath = document.getElementById('btn-copy-html-path');
    if (btnCopyHtmlPath) {
      btnCopyHtmlPath.addEventListener('click', () => {
        copyText('G:\\My Drive\\Antigravity\\Projects\\chrome tab and bar\\Antigravity_Index_Bookmarks.html', () => {
          btnCopyHtmlPath.textContent = 'Copied!';
          setTimeout(() => { btnCopyHtmlPath.textContent = 'Copy'; }, 1500);
        });
      });
    }

    const btnCopyPsCmd = document.getElementById('btn-copy-ps-cmd');
    if (btnCopyPsCmd) {
      btnCopyPsCmd.addEventListener('click', () => {
        copyText('powershell -ExecutionPolicy Bypass -File "G:\\My Drive\\Antigravity\\Projects\\chrome tab and bar\\Install-ChromeBookmarks.ps1"', () => {
          btnCopyPsCmd.textContent = 'Copied!';
          setTimeout(() => { btnCopyPsCmd.textContent = 'Copy'; }, 1500);
        });
      });
    }
  }

  // Copy helper
  function copyText(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(callback).catch(() => fallbackCopy(text, callback));
    } else {
      fallbackCopy(text, callback);
    }
  }

  function fallbackCopy(text, callback) {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    if (callback) callback();
  }

  // Escaping helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
