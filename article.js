/* ============================================================
   AI FUTURES BLOG — ARTICLE PAGE (article.js)
   Handles: article rendering, TOC, reading progress,
            related articles, share buttons
   ============================================================ */

'use strict';

// ============================================================
// GET SLUG FROM URL
// ============================================================
function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || '';
}

// ============================================================
// RENDER ARTICLE HERO
// ============================================================
function renderArticleHero(article) {
  const cat = DB.getCategoryById(article.category);
  const catColor = cat ? cat.color : '#3b82f6';
  const catName  = cat ? cat.name : '';

  // Set hero background
  const hero = document.getElementById('articleHero');
  if (hero && article.coverImage) {
    hero.style.backgroundImage = `url('${article.coverImage}')`;
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';
  }

  // Badge + breadcrumb
  const metaTop = document.getElementById('articleMetaTop');
  if (metaTop) {
    metaTop.innerHTML = `
      <a href="index.html" style="color:rgba(255,255,255,0.6);font-size:0.85rem;display:flex;align-items:center;gap:6px;">
        <i class="fa-solid fa-house"></i> Home
      </a>
      <span style="color:rgba(255,255,255,0.3);">/</span>
      <span class="article-cat-badge" style="background:${catColor}25;color:${catColor};border:1px solid ${catColor}40;">
        ${catName}
      </span>`;
  }

  // Title
  const titleEl = document.getElementById('articleHeroTitle');
  if (titleEl) titleEl.textContent = article.title;

  // Meta
  const metaEl = document.getElementById('articleHeroMeta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span><i class="fa-regular fa-calendar"></i> ${formatDate(article.createdAt)}</span>
      <span><i class="fa-regular fa-clock"></i> ${estimateReadTime(article.content)}</span>
      <span><i class="fa-solid fa-eye"></i> ${DB.getViews(article.slug).toLocaleString()} views</span>
      ${article.tags ? `<span><i class="fa-solid fa-tag"></i> ${article.tags.split(',')[0].trim()}</span>` : ''}`;
  }

  // Page title & meta description
  document.title = `${article.title} — AI Reportly`;
  const descMeta = document.getElementById('pageDescription');
  if (descMeta) descMeta.setAttribute('content', article.excerpt || truncate(article.content, 160));
}

// ============================================================
// RENDER ARTICLE BODY
// ============================================================
function renderArticleBody(article) {
  const body = document.getElementById('articleBody');
  if (!body) return;

  const imagePos = article.imagePos || 'cover';
  let contentHtml = article.content || '<p>Content not available.</p>';

  // Apply image position for non-cover layouts
  if (article.coverImage && imagePos === 'top') {
    contentHtml = `<img src="${article.coverImage}" alt="${article.title}" style="width:100%;border-radius:12px;margin-bottom:2rem;" />${contentHtml}`;
  }

  // Apply layout class
  if (article.layout === 'wide') {
    body.style.maxWidth = '100%';
  }

  body.innerHTML = contentHtml;

  // Make all links open in new tab
  body.querySelectorAll('a').forEach(a => {
    if (a.href && !a.href.startsWith('#')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Add copy button to code blocks
  body.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fa-solid fa-copy"></i>';
    btn.title = 'Copy code';
    btn.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.1);border:none;color:#94a3b8;border-radius:6px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8rem;';
    pre.style.position = 'relative';
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.style.color = '#10b981';
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; btn.style.color = '#94a3b8'; }, 2000);
      });
    });
    pre.appendChild(btn);
  });
}

// ============================================================
// TABLE OF CONTENTS
// ============================================================
function renderTOC() {
  const body   = document.getElementById('articleBody');
  const tocNav = document.getElementById('tocNav');
  const tocCard = document.getElementById('tocCard');
  if (!body || !tocNav) return;

  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    if (tocCard) tocCard.style.display = 'none';
    return;
  }

  headings.forEach((h, i) => {
    if (!h.id) h.id = `heading-${i}`;
  });

  tocNav.innerHTML = Array.from(headings).map(h => {
    const isH3 = h.tagName === 'H3';
    return `<a href="#${h.id}" class="toc-link${isH3 ? ' toc-h3' : ''}">${h.textContent}</a>`;
  }).join('');

  // Smooth scroll on TOC click
  tocNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ============================================================
// READING PROGRESS
// ============================================================
function initReadingProgress() {
  const bar  = document.getElementById('readingProgress');
  const body = document.getElementById('articleBody');
  if (!bar || !body) return;

  window.addEventListener('scroll', () => {
    const bodyTop    = body.offsetTop;
    const bodyHeight = body.offsetHeight;
    const scrolled   = window.scrollY - bodyTop;
    const progress   = Math.min(100, Math.max(0, (scrolled / (bodyHeight - window.innerHeight)) * 100));
    bar.style.width  = `${progress}%`;
  }, { passive: true });
}

// ============================================================
// TOC ACTIVE HIGHLIGHT ON SCROLL
// ============================================================
function initTOCHighlight() {
  const tocLinks = document.querySelectorAll('.toc-link');
  if (!tocLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.toc-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  document.querySelectorAll('#articleBody h2, #articleBody h3').forEach(h => observer.observe(h));
}

// ============================================================
// RELATED ARTICLES
// ============================================================
function renderRelatedArticles(article) {
  const list = document.getElementById('relatedList');
  if (!list) return;

  const all = DB.getPublishedArticles();
  let related = all.filter(a => a.slug !== article.slug && a.category === article.category);

  // If not enough same-category, fill with any
  if (related.length < 3) {
    const others = all.filter(a => a.slug !== article.slug && a.category !== article.category);
    related = [...related, ...others].slice(0, 4);
  } else {
    related = related.slice(0, 4);
  }

  if (related.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">No related articles yet.</p>';
    return;
  }

  list.innerHTML = related.map(a => `
    <div class="related-item" onclick="navigateToArticle('${a.slug}')">
      ${a.coverImage
        ? `<img class="related-thumb" src="${a.coverImage}" alt="${a.title}" loading="lazy" />`
        : `<div class="related-thumb" style="background:#141d35;display:flex;align-items:center;justify-content:center;color:#2d3f60;font-size:1.2rem;"><i class="fa-solid fa-image"></i></div>`}
      <div>
        <div class="related-title">${a.title}</div>
        <div class="related-date">${formatDate(a.createdAt)}</div>
      </div>
    </div>`).join('');
}

// ============================================================
// MORE FROM CATEGORY
// ============================================================
function renderMoreFromCategory(article) {
  const section = document.getElementById('moreFromCategory');
  const title   = document.getElementById('moreFromTitle');
  const grid    = document.getElementById('moreArticlesGrid');
  if (!section || !grid) return;

  const cat = DB.getCategoryById(article.category);
  const more = DB.getPublishedArticles()
    .filter(a => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3);

  if (more.length === 0) return;

  if (title && cat) title.textContent = `More from ${cat.name}`;
  grid.innerHTML = more.map(a => renderArticleCard(a)).join('');
  section.style.display = 'block';
}

// ============================================================
// TAGS
// ============================================================
function renderArticleTags(article) {
  const tagsEl = document.getElementById('articleTags');
  if (!tagsEl || !article.tags) return;

  const tags = article.tags.split(',').map(t => t.trim()).filter(Boolean);
  tagsEl.innerHTML = `<span style="color:#94a3b8;font-size:0.85rem;margin-right:8px;"><i class="fa-solid fa-tags"></i> Tags:</span>` +
    tags.map(t => `<span class="article-tag" onclick="window.location.href='index.html'">${t}</span>`).join('');
}

// ============================================================
// CATEGORY SIDEBAR CARD
// ============================================================
function renderCategoryCard(article) {
  const cardEl = document.getElementById('categoryCard');
  if (!cardEl) return;

  const cat = DB.getCategoryById(article.category);
  if (!cat) return;

  const count = DB.getArticlesByCategory(cat.id).length;
  cardEl.innerHTML = `
    <h4><i class="fa-solid fa-folder"></i> Category</h4>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="width:36px;height:36px;border-radius:8px;background:${cat.color}20;color:${cat.color};display:flex;align-items:center;justify-content:center;">
        <i class="fa-solid ${getCategoryIcon(cat.id)}"></i>
      </div>
      <div>
        <div style="font-weight:600;color:#fff;font-size:0.9rem;">${cat.name}</div>
        <div style="font-size:0.75rem;color:#94a3b8;">${count} article${count !== 1 ? 's' : ''}</div>
      </div>
    </div>
    ${cat.description ? `<p style="font-size:0.8rem;color:#94a3b8;margin:0 0 12px;">${cat.description}</p>` : ''}
    <a onclick="filterByCategory('${cat.id}')" href="index.html" style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;color:${cat.color};font-weight:600;cursor:pointer;">
      View all <i class="fa-solid fa-arrow-right"></i>
    </a>`;
}

// ============================================================
// SHARE BUTTONS
// ============================================================
function initShareButtons(article) {
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);

  const twitterBtn = document.getElementById('shareTwitter');
  if (twitterBtn) {
    twitterBtn.addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?text=${title}&url=${url}`, '_blank');
    });
  }

  const linkedInBtn = document.getElementById('shareLinkedIn');
  if (linkedInBtn) {
    linkedInBtn.addEventListener('click', () => {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    });
  }

  const copyBtn = document.getElementById('shareCopy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        copyBtn.style.background = 'rgba(16,185,129,0.12)';
        copyBtn.style.color = '#10b981';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-solid fa-link"></i> Copy Link';
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2500);
      });
    });
  }
}

// ============================================================
// 404 STATE
// ============================================================
function renderNotFound() {
  document.title = 'Article Not Found — AI Reportly';
  const hero = document.getElementById('articleHero');
  if (hero) {
    hero.style.background = 'var(--bg2)';
    hero.innerHTML = `
      <div class="article-hero-overlay"></div>
      <div class="container article-hero-content">
        <h1 class="article-hero-title" style="text-align:center;width:100%;padding:40px 0;">
          <i class="fa-solid fa-circle-exclamation" style="color:#ef4444;"></i><br/>Article Not Found
        </h1>
      </div>`;
  }
  const body = document.getElementById('articleBody');
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <p style="margin-bottom:24px;">The article you're looking for doesn't exist or may have been moved.</p>
        <a href="index.html" class="btn btn-primary" style="display:inline-flex;">
          <i class="fa-solid fa-arrow-left"></i> Back to Home
        </a>
      </div>`;
  }
}

// ============================================================
// BOOT — ARTICLE PAGE
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const slug = getSlugFromUrl();
  if (!slug) { renderNotFound(); return; }

  // Show a loading shimmer on the hero while we fetch
  showArticleLoader(true);

  // ALWAYS fetch from Google Sheets first so every browser sees
  // the same content regardless of what is in localStorage.
  const sheetsUrl = (BLOG_CONFIG && BLOG_CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE')
    ? BLOG_CONFIG.APPS_SCRIPT_URL
    : null;

  if (sheetsUrl) {
    // Fetch articles and categories in parallel before rendering
    await Promise.all([
      SheetsAPI.fetchArticles(),
      SheetsAPI.fetchCategories()
    ]);
  } else {
    // Sheets not configured — use local seed so site still works offline
    DB.seedIfEmpty();
  }

  showArticleLoader(false);

  const article = DB.getArticleBySlug(slug);
  if (!article || article.status !== 'published') { renderNotFound(); return; }

  // Increment view counter
  DB.incrementView(slug);

  // Render everything
  renderArticleHero(article);
  renderArticleBody(article);
  renderTOC();
  renderRelatedArticles(article);
  renderMoreFromCategory(article);
  renderArticleTags(article);
  renderCategoryCard(article);
  initShareButtons(article);
  initReadingProgress();

  // Delay TOC highlight until DOM is painted
  setTimeout(initTOCHighlight, 300);
});

function showArticleLoader(show) {
  const heroTitle = document.getElementById('articleHeroTitle');
  if (heroTitle) {
    heroTitle.textContent = show ? 'Loading…' : '';
  }
  // Top progress bar (reuse the reading-progress bar slot with a shimmer)
  let bar = document.getElementById('fetchLoader');
  if (show && !bar) {
    bar = document.createElement('div');
    bar.id = 'fetchLoader';
    bar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#3b82f6);background-size:200%;animation:shimmer 1.2s linear infinite;z-index:9999;';
    const style = document.createElement('style');
    style.textContent = '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(style);
    document.body.prepend(bar);
  }
  if (!show && bar) {
    bar.style.opacity = '0';
    bar.style.transition = 'opacity 0.4s';
    setTimeout(() => bar && bar.remove(), 500);
  }
}
