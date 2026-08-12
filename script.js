/* ============================================================
   AI FUTURES BLOG — MAIN SCRIPT (script.js)
   Handles: data layer, homepage rendering, search, navigation
   ============================================================ */

'use strict';

// ============================================================
// DATA LAYER — localStorage + Google Sheets fallback
// ============================================================
const DB = {
  KEY_ARTICLES:   'aifutures_articles',
  KEY_CATEGORIES: 'aifutures_categories',
  KEY_SETTINGS:   'aifutures_settings',
  KEY_VIEWS:      'aifutures_views',

  getSettings() {
    try { return JSON.parse(localStorage.getItem(this.KEY_SETTINGS) || '{}'); }
    catch { return {}; }
  },

  getCategories() {
    try {
      const stored = localStorage.getItem(this.KEY_CATEGORIES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return BLOG_CONFIG.DEFAULT_CATEGORIES;
  },

  getArticles() {
    try {
      const stored = localStorage.getItem(this.KEY_ARTICLES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },

  getPublishedArticles() {
    return this.getArticles().filter(a => a.status === 'published');
  },

  getArticleBySlug(slug) {
    return this.getArticles().find(a => a.slug === slug) || null;
  },

  getArticlesByCategory(categoryId) {
    return this.getPublishedArticles().filter(a => a.category === categoryId);
  },

  getCategoryById(id) {
    return this.getCategories().find(c => c.id === id) || null;
  },

  incrementView(slug) {
    try {
      const views = JSON.parse(localStorage.getItem(this.KEY_VIEWS) || '{}');
      views[slug] = (views[slug] || 0) + 1;
      localStorage.setItem(this.KEY_VIEWS, JSON.stringify(views));
      return views[slug];
    } catch { return 0; }
  },

  getViews(slug) {
    try {
      const views = JSON.parse(localStorage.getItem(this.KEY_VIEWS) || '{}');
      return views[slug] || 0;
    } catch { return 0; }
  },

  // Seed default data if articles array is empty
  seedIfEmpty() {
    const articles = this.getArticles();
    if (articles.length === 0 && BLOG_CONFIG.SEED_ARTICLES && BLOG_CONFIG.SEED_ARTICLES.length > 0) {
      const seeded = BLOG_CONFIG.SEED_ARTICLES.map((a, i) => ({
        ...a,
        id: 'seed_' + i + '_' + Date.now(),
        createdAt: new Date(Date.now() - (BLOG_CONFIG.SEED_ARTICLES.length - i) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - (BLOG_CONFIG.SEED_ARTICLES.length - i) * 86400000).toISOString(),
        views: Math.floor(Math.random() * 2000) + 100
      }));
      localStorage.setItem(this.KEY_ARTICLES, JSON.stringify(seeded));
      localStorage.setItem(this.KEY_CATEGORIES, JSON.stringify(BLOG_CONFIG.DEFAULT_CATEGORIES));
      return seeded;
    }
    return articles;
  }
};

// ============================================================
// GOOGLE SHEETS API LAYER
// Always uses BLOG_CONFIG.APPS_SCRIPT_URL — never depends on
// localStorage being pre-configured. This ensures every browser,
// device, and account sees the same centralized data.
// ============================================================
const SheetsAPI = {
  // Get the script URL from config (hardcoded) with localStorage as override
  getUrl() {
    const settings = DB.getSettings();
    return settings.scriptUrl || BLOG_CONFIG.APPS_SCRIPT_URL || null;
  },

  async fetchArticles() {
    const url = this.getUrl();
    if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE') return null;
    try {
      const res = await fetch(`${url}?action=getArticles`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        localStorage.setItem(DB.KEY_ARTICLES, JSON.stringify(data.articles));
        return data.articles;
      }
    } catch { return null; }
    return null;
  },

  async fetchCategories() {
    const url = this.getUrl();
    if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE') return null;
    try {
      const res = await fetch(`${url}?action=getCategories`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        localStorage.setItem(DB.KEY_CATEGORIES, JSON.stringify(data.categories));
        return data.categories;
      }
    } catch { return null; }
    return null;
  },

  // Fetch both in parallel, return true if at least articles loaded
  async fetchAll() {
    const [articles, categories] = await Promise.all([
      this.fetchArticles(),
      this.fetchCategories()
    ]);
    return { articles, categories };
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  } catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function estimateReadTime(content) {
  if (!content) return '1 min read';
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function stripHtml(html) {
  return html ? html.replace(/<[^>]+>/g, '') : '';
}

function truncate(text, maxLen = 120) {
  if (!text) return '';
  const plain = stripHtml(text);
  return plain.length > maxLen ? plain.slice(0, maxLen).trim() + '…' : plain;
}

function getCategoryColor(categoryId) {
  const cat = DB.getCategoryById(categoryId);
  return cat ? cat.color : '#3b82f6';
}

function getCategoryName(categoryId) {
  const cat = DB.getCategoryById(categoryId);
  return cat ? cat.name : categoryId;
}

function getCategoryIcon(categoryId) {
  const icons = {
    'ai-healthcare': 'fa-heart-pulse',
    'ai-jobs': 'fa-briefcase',
    'generative-ai': 'fa-wand-magic-sparkles',
    'ai-education': 'fa-graduation-cap',
    'ai-ethics': 'fa-scale-balanced'
  };
  return icons[categoryId] || 'fa-microchip';
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function renderArticleCard(article, size = 'normal') {
  const cat = DB.getCategoryById(article.category);
  const catName = cat ? cat.name : '';
  const catColor = cat ? cat.color : '#3b82f6';
  const excerpt = article.excerpt || truncate(article.content, 140);
  const imgHtml = article.coverImage
    ? `<img class="article-card-img" src="${article.coverImage}" alt="${article.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="article-card-img-placeholder" style="display:none;"><i class="fa-solid fa-image"></i></div>`
    : `<div class="article-card-img-placeholder"><i class="fa-solid fa-image"></i></div>`;
  const sizeClass = size === 'big' ? 'featured-big' : '';

  return `
    <div class="article-card ${sizeClass}" onclick="navigateToArticle('${article.slug}')">
      ${imgHtml}
      <div class="article-card-body">
        <div class="article-card-cat">
          <span class="cat-dot" style="background:${catColor}"></span>
          <span style="color:${catColor}">${catName}</span>
        </div>
        <div class="article-card-title">${article.title}</div>
        <div class="article-card-excerpt">${excerpt}</div>
        <div class="article-card-footer">
          <span class="article-card-date"><i class="fa-regular fa-calendar"></i> ${formatDate(article.createdAt)}</span>
          <span class="article-card-read"><i class="fa-regular fa-clock"></i> ${estimateReadTime(article.content)}</span>
        </div>
      </div>
    </div>`;
}

function renderCategoryCard(cat, articleCount) {
  const icons = {
    'ai-healthcare': 'fa-heart-pulse',
    'ai-jobs': 'fa-briefcase',
    'generative-ai': 'fa-wand-magic-sparkles',
    'ai-education': 'fa-graduation-cap',
    'ai-ethics': 'fa-scale-balanced'
  };
  const icon = icons[cat.id] || 'fa-microchip';
  return `
    <a class="category-card-link" style="--cat-color:${cat.color}" onclick="filterByCategory('${cat.id}')">
      <div class="cat-icon" style="background:${cat.color}20;color:${cat.color}">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="cat-card-name">${cat.name}</div>
      <div class="cat-card-desc">${cat.description || ''}</div>
      <span class="cat-card-count" style="background:${cat.color}20;color:${cat.color}">${articleCount} article${articleCount !== 1 ? 's' : ''}</span>
    </a>`;
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateToArticle(slug) {
  window.location.href = `article.html?slug=${encodeURIComponent(slug)}`;
}

function filterByCategory(categoryId) {
  // Scroll to articles section and apply filter
  document.getElementById('latest').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const btn = document.querySelector(`.filter-btn[data-category="${categoryId}"]`);
    if (btn) btn.click();
  }, 400);
}

// ============================================================
// HOMEPAGE INIT
// Strategy:
//   1. Render instantly from localStorage (0 ms — user sees content immediately)
//   2. Seed default categories if nothing is stored yet
//   3. Fetch fresh data from Google Sheets IN THE BACKGROUND
//   4. When Sheets responds, silently update localStorage so the
//      NEXT page load picks up the latest articles — no blank waiting
// ============================================================
async function initHomepage() {

  // ---- STEP 1: seed categories if this is a brand-new browser ----
  if (!localStorage.getItem(DB.KEY_CATEGORIES)) {
    localStorage.setItem(DB.KEY_CATEGORIES, JSON.stringify(BLOG_CONFIG.DEFAULT_CATEGORIES));
  }

  // ---- STEP 2: render immediately from whatever is in localStorage ----
  renderAll();

  // ---- STEP 3: background sync — don't make the user wait ----
  const sheetsUrl = SheetsAPI.getUrl();
  if (sheetsUrl && sheetsUrl !== 'YOUR_APPS_SCRIPT_URL_HERE') {
    // Fire and forget — no await, no spinner, no blocking
    SheetsAPI.fetchAll().then(({ articles, categories }) => {
      // If Sheets returned fresh data, re-render silently
      if (articles || categories) renderAll();
    }).catch(() => {
      // Network error — silently ignore, local data is already showing
    });
  }
}

// Render the full homepage from whatever is currently in localStorage
function renderAll() {
  const articles   = DB.getPublishedArticles();
  const categories = DB.getCategories();
  articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  renderHero(articles, categories);
  renderTicker(articles);
  renderNavCategories(categories);
  renderCategoriesGrid(categories, articles);
  renderFeaturedGrid(articles);
  renderArticlesGrid(articles, categories);
  renderFooter(categories, articles);
  updateHeroStats(articles, categories);
}

function renderHero(articles, categories) {
  // Hero featured card (first article)
  const featured = articles[0];
  if (featured) {
    const heroFeatured = document.getElementById('heroFeatured');
    if (heroFeatured) {
      const cat = DB.getCategoryById(featured.category);
      heroFeatured.innerHTML = `
        ${featured.coverImage ? `<img class="hero-featured-img" src="${featured.coverImage}" alt="${featured.title}" />` : ''}
        <div class="hero-featured-body">
          <div class="hero-featured-tag">${cat ? cat.name : ''}</div>
          <div class="hero-featured-title">${featured.title}</div>
          <a class="hero-featured-link" onclick="navigateToArticle('${featured.slug}')">
            Read Article <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>`;
    }
  }
}

function updateHeroStats(articles, categories) {
  const el1 = document.getElementById('statArticles');
  const el2 = document.getElementById('statCategories');
  if (el1) animateCount(el1, articles.length);
  if (el2) animateCount(el2, categories.length);
}

function animateCount(el, target) {
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

function renderTicker(articles) {
  const inner = document.getElementById('tickerInner');
  if (!inner || articles.length === 0) return;
  const items = [...articles, ...articles].map(a =>
    `<span onclick="navigateToArticle('${a.slug}')">${a.title}</span>`
  ).join('');
  inner.innerHTML = items;
}

function renderNavCategories(categories) {
  const nav = document.getElementById('navCategories');
  if (!nav) return;
  const icons = { 'ai-healthcare':'fa-heart-pulse','ai-jobs':'fa-briefcase','generative-ai':'fa-wand-magic-sparkles','ai-education':'fa-graduation-cap','ai-ethics':'fa-scale-balanced' };
  nav.innerHTML = categories.map(cat => `
    <a onclick="filterByCategory('${cat.id}')">
      <span class="cat-dot" style="background:${cat.color}"></span>
      ${cat.name}
    </a>`).join('');

  // Mobile nav
  const mobileLinks = document.getElementById('mobileNavLinks');
  if (mobileLinks) {
    mobileLinks.innerHTML = `
      <a href="index.html">Home</a>
      <div style="padding:10px 14px;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-top:8px;">Categories</div>
      ${categories.map(cat => `<a onclick="filterByCategory('${cat.id}');closeMobileNav()">${cat.name}</a>`).join('')}
      <a href="index.html#services" onclick="closeMobileNav()">Services</a>
      <a href="index.html#latest" onclick="closeMobileNav()">Latest Articles</a>
      <a href="index.html#about-us" onclick="closeMobileNav()">About Us</a>
      <a href="index.html#contact" onclick="closeMobileNav()">Contact</a>
      <a href="admin.html">Admin Panel</a>`;
  }
}

function renderCategoriesGrid(categories, articles) {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  if (categories.length === 0) {
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No categories yet.</p>';
    return;
  }
  grid.innerHTML = categories.map(cat => {
    const count = articles.filter(a => a.category === cat.id).length;
    return renderCategoryCard(cat, count);
  }).join('');
}

function renderFeaturedGrid(articles) {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  const featured = articles.slice(0, 4);
  if (featured.length === 0) {
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No articles yet.</p>';
    return;
  }
  grid.innerHTML = featured.map((a, i) => renderArticleCard(a, i < 2 ? 'big' : 'normal')).join('');
}

// ============================================================
// ARTICLES GRID + FILTER
// ============================================================
let currentPage = 1;
const PAGE_SIZE = 6;
let currentFilter = 'all';
let allArticles = [];

function renderArticlesGrid(articles, categories) {
  allArticles = articles;

  // Render filter buttons
  const filterBar = document.getElementById('filterBar');
  if (filterBar) {
    const catButtons = categories.map(cat =>
      `<button class="filter-btn" data-category="${cat.id}">${cat.name}</button>`
    ).join('');
    filterBar.innerHTML = `<button class="filter-btn active" data-category="all">All</button>${catButtons}`;

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.category;
        currentPage = 1;
        applyFilter();
      });
    });
  }
  applyFilter();
}

function applyFilter() {
  const filtered = currentFilter === 'all'
    ? allArticles
    : allArticles.filter(a => a.category === currentFilter);

  const total = filtered.length;
  const page = filtered.slice(0, currentPage * PAGE_SIZE);

  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  if (page.length === 0) {
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;grid-column:1/-1;">No articles in this category yet.</p>';
  } else {
    grid.innerHTML = page.map(a => renderArticleCard(a)).join('');
  }

  const loadMoreWrap = document.getElementById('loadMoreWrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = (total > currentPage * PAGE_SIZE) ? 'block' : 'none';
  }
}

// ============================================================
// FOOTER
// ============================================================
function renderFooter(categories, articles) {
  const footerCats = document.getElementById('footerCategories');
  if (footerCats) {
    footerCats.innerHTML = categories.map(cat =>
      `<li><a onclick="filterByCategory('${cat.id}')" style="cursor:pointer">${cat.name}</a></li>`
    ).join('');
  }

  // Collect all tags
  const tagSet = new Set();
  articles.forEach(a => {
    if (a.tags) a.tags.split(',').forEach(t => tagSet.add(t.trim()));
  });
  const footerTags = document.getElementById('footerTags');
  if (footerTags) {
    footerTags.innerHTML = [...tagSet].slice(0, 16).map(t =>
      `<span class="footer-tag" onclick="searchFor('${t}')">${t}</span>`
    ).join('');
  }
}

function searchFor(term) {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = term;
    document.getElementById('searchBar').classList.add('open');
    input.dispatchEvent(new Event('input'));
    input.focus();
  }
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const toggleBtn  = document.getElementById('searchToggle');
  const closeBtn   = document.getElementById('searchClose');
  const searchBar  = document.getElementById('searchBar');
  const input      = document.getElementById('searchInput');
  const results    = document.getElementById('searchResults');

  if (!toggleBtn || !searchBar || !input) return;

  toggleBtn.addEventListener('click', () => {
    searchBar.classList.toggle('open');
    if (searchBar.classList.contains('open')) input.focus();
  });
  if (closeBtn) closeBtn.addEventListener('click', () => {
    searchBar.classList.remove('open');
    input.value = '';
    if (results) results.innerHTML = '';
  });

  let searchTimeout;
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = input.value.trim();
    if (!query) { if (results) results.innerHTML = ''; return; }
    searchTimeout = setTimeout(() => performSearch(query, results), 200);
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      searchBar.classList.remove('open');
      input.value = '';
      if (results) results.innerHTML = '';
    }
  });
}

function performSearch(query, resultsEl) {
  if (!resultsEl) return;
  const q = query.toLowerCase();
  const articles = DB.getPublishedArticles();
  const matches = articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.excerpt || '').toLowerCase().includes(q) ||
    (a.tags || '').toLowerCase().includes(q) ||
    getCategoryName(a.category).toLowerCase().includes(q)
  ).slice(0, 6);

  if (matches.length === 0) {
    resultsEl.innerHTML = '<p style="color:#94a3b8;padding:16px;font-size:0.875rem;">No results found.</p>';
    return;
  }

  resultsEl.innerHTML = matches.map(a => {
    const cat = DB.getCategoryById(a.category);
    return `
      <div class="search-result-item" onclick="navigateToArticle('${a.slug}')">
        ${a.coverImage ? `<img class="search-result-img" src="${a.coverImage}" alt="" />` : ''}
        <div>
          <div class="search-result-title">${a.title}</div>
          <div class="search-result-cat" style="color:${cat ? cat.color : '#94a3b8'}">${cat ? cat.name : ''}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// HEADER SCROLL BEHAVIOR
// ============================================================
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  const backToTop = document.getElementById('backToTop');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    if (backToTop) {
      if (window.scrollY > 400) backToTop.classList.add('visible');
      else backToTop.classList.remove('visible');
    }
  }, { passive: true });

  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================================
// MOBILE NAV
// ============================================================
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const overlay   = document.getElementById('mobileNavOverlay');
  const closeBtn  = document.getElementById('mobileNavClose');

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => overlay.classList.add('open'));
  }
  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  if (overlay) overlay.addEventListener('click', e => {
    if (e.target === overlay) closeMobileNav();
  });
}

function closeMobileNav() {
  const overlay = document.getElementById('mobileNavOverlay');
  if (overlay) overlay.classList.remove('open');
}

// ============================================================
// LOAD MORE
// ============================================================
function initLoadMore() {
  const btn = document.getElementById('loadMoreBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    currentPage++;
    applyFilter();
    btn.blur();
  });
}

// ============================================================
// NEWSLETTER FORM
// ============================================================
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    if (input && input.value) {
      const subs = JSON.parse(localStorage.getItem('aifutures_subscribers') || '[]');
      if (!subs.includes(input.value)) subs.push(input.value);
      localStorage.setItem('aifutures_subscribers', JSON.stringify(subs));
      form.innerHTML = `<p style="color:#10b981;font-weight:600;font-size:1rem;"><i class="fa-solid fa-circle-check"></i> Thanks for subscribing! Welcome to AI Reportly.</p>`;
    }
  });
}

// ============================================================
// CONTACT FORM
// ============================================================
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…'; }
    setTimeout(() => {
      const success = document.getElementById('cfSuccess');
      if (success) success.style.display = 'flex';
      form.reset();
      if (btn) { btn.disabled = false; btn.innerHTML = 'Send Message <i class="fa-solid fa-paper-plane"></i>'; }
    }, 1200);
  });
}

// ============================================================
// MISSION WHEEL — 3D drum scroll (all 3 cards always visible)
// ============================================================
function initMissionWheel() {
  const drum  = document.getElementById('mwheelDrum');
  const upBtn = document.getElementById('mwheelUp');
  const dnBtn = document.getElementById('mwheelDown');
  if (!drum) return;

  const CARD_H  = 140; // px — must match CSS height
  const GAP     = 14;  // px — must match CSS gap
  const STEP    = CARD_H + GAP;
  const TOTAL   = 3;
  let current   = 0;
  let autoTimer;

  const cards = Array.from(drum.querySelectorAll('.mwheel-card'));
  const dots  = Array.from(document.querySelectorAll('.mwheel-dot'));

  // Position drum so the active card sits in the middle slot (slot index 1)
  // When current=0: translateY(0) → card 0 is at top, we want it centred → shift down by STEP
  // When current=1: shift down by 0
  // When current=2: shift up by STEP
  function getTranslate(idx) {
    // Centre offset: window shows 3 cards; active goes to slot 1 (0-indexed)
    return (1 - idx) * STEP;
  }

  function render(idx) {
    current = ((idx % TOTAL) + TOTAL) % TOTAL;

    // Move the drum
    drum.style.transform = `translateY(${getTranslate(current)}px)`;

    // Apply state classes
    cards.forEach((card, i) => {
      card.classList.remove('mwheel-active', 'mwheel-prev', 'mwheel-next');
      const diff = ((i - current) + TOTAL) % TOTAL;
      if (diff === 0)            card.classList.add('mwheel-active');
      else if (diff === TOTAL-1) card.classList.add('mwheel-prev');  // wraps = above
      else                       card.classList.add('mwheel-next');  // below
    });

    // Dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => render(current + 1), 3200);
  }
  function stopAuto() { clearInterval(autoTimer); }

  // Init
  render(0);
  startAuto();

  upBtn.addEventListener('click', () => { stopAuto(); render(current - 1); startAuto(); });
  dnBtn.addEventListener('click', () => { stopAuto(); render(current + 1); startAuto(); });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { stopAuto(); render(i); startAuto(); });
  });

  // Touch / swipe support
  let touchStartY = 0;
  drum.closest('.mwheel-wrap').addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  drum.closest('.mwheel-wrap').addEventListener('touchend', e => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 30) {
      stopAuto();
      render(current + (delta > 0 ? 1 : -1));
      startAuto();
    }
  }, { passive: true });
}

// ============================================================
// TERMS ACCORDION
// ============================================================
function initTermsAccordion() {
  const items = document.querySelectorAll('.ta-item');
  items.forEach(item => {
    const toggle = item.querySelector('.ta-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      items.forEach(i => i.classList.remove('open'));
      // Toggle clicked
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ============================================================
// ARTICLE PAGE — FOOTER / NAV (shared, non-blocking)
// ============================================================
function initSharedFooter() {
  // Render nav/footer instantly from localStorage
  const categories = DB.getCategories();
  const articles   = DB.getPublishedArticles();
  renderFooter(categories, articles);

  const navCats = document.getElementById('navCategories');
  if (navCats) {
    navCats.innerHTML = categories.map(cat => `
      <a href="index.html#categories" onclick="sessionStorage.setItem('filterCat','${cat.id}')">
        <span class="cat-dot" style="background:${cat.color}"></span>
        ${cat.name}
      </a>`).join('');
  }

  const mobileLinks = document.getElementById('mobileNavLinks');
  if (mobileLinks) {
    mobileLinks.innerHTML = `
      <a href="index.html">Home</a>
      ${categories.map(cat => `<a href="index.html#categories">${cat.name}</a>`).join('')}
      <a href="index.html#services">Services</a>
      <a href="index.html#latest">Latest Articles</a>
      <a href="index.html#about-us">About Us</a>
      <a href="index.html#contact">Contact</a>
      <a href="admin.html">Admin Panel</a>`;
  }

  // Background sync — quietly refresh categories for next load
  const sheetsUrl = SheetsAPI.getUrl();
  if (sheetsUrl && sheetsUrl !== 'YOUR_APPS_SCRIPT_URL_HERE') {
    SheetsAPI.fetchCategories().catch(() => {});
  }
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Always init shared UI
  initHeaderScroll();
  initSearch();
  initMobileNav();

  // Homepage-specific
  const isHomepage = !!document.getElementById('categoriesGrid');
  if (isHomepage) {
    initHomepage();
    initLoadMore();
    initNewsletter();
    initContactForm();
    initMissionWheel();
    initTermsAccordion();

    // Check if returning from category filter
    const savedFilter = sessionStorage.getItem('filterCat');
    if (savedFilter) {
      sessionStorage.removeItem('filterCat');
      setTimeout(() => filterByCategory(savedFilter), 600);
    }
  } else {
    // Article page or other — just load shared footer/nav
    initSharedFooter();
  }
});
