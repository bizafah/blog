/* ============================================================
   AI FUTURES BLOG — ADMIN PANEL (admin.js)
   Handles: login, dashboard, article CRUD, rich text editor,
            image upload (ImgBB), categories, settings,
            Google Sheets sync
   ============================================================ */

'use strict';

// ============================================================
// DATA LAYER (mirrors script.js but inline for standalone use)
// ============================================================
const AdminDB = {
  KEY_ARTICLES:   'aifutures_articles',
  KEY_CATEGORIES: 'aifutures_categories',
  KEY_SETTINGS:   'aifutures_settings',
  KEY_PASSWORD:   'aifutures_password',

  getSettings()  { try { return JSON.parse(localStorage.getItem(this.KEY_SETTINGS) || '{}'); } catch { return {}; } },
  saveSettings(s){ localStorage.setItem(this.KEY_SETTINGS, JSON.stringify(s)); },

  getPassword()  { return localStorage.getItem(this.KEY_PASSWORD) || BLOG_CONFIG.ADMIN_PASSWORD; },
  setPassword(p) { localStorage.setItem(this.KEY_PASSWORD, p); },

  getCategories(){ try { const s=localStorage.getItem(this.KEY_CATEGORIES); return s?JSON.parse(s):BLOG_CONFIG.DEFAULT_CATEGORIES; } catch { return BLOG_CONFIG.DEFAULT_CATEGORIES; } },
  saveCategories(c){ localStorage.setItem(this.KEY_CATEGORIES, JSON.stringify(c)); },

  getArticles()  { try { const s=localStorage.getItem(this.KEY_ARTICLES); return s?JSON.parse(s):[]; } catch { return []; } },
  saveArticles(a){ localStorage.setItem(this.KEY_ARTICLES, JSON.stringify(a)); },

  getCategoryById(id){ return this.getCategories().find(c=>c.id===id)||null; },

  saveArticle(article) {
    const articles = this.getArticles();
    const idx = articles.findIndex(a => a.id === article.id);
    if (idx >= 0) articles[idx] = article;
    else articles.unshift(article);
    this.saveArticles(articles);
    SheetsSync.pushArticle(article);
  },

  deleteArticle(id) {
    const articles = this.getArticles().filter(a => a.id !== id);
    this.saveArticles(articles);
    SheetsSync.deleteArticle(id);
  },

  getArticleById(id){ return this.getArticles().find(a=>a.id===id)||null; },

  saveCategory(cat) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) cats[idx] = cat;
    else cats.push(cat);
    this.saveCategories(cats);
    SheetsSync.pushCategory(cat);
  },

  deleteCategory(id) {
    const cats = this.getCategories().filter(c => c.id !== id);
    this.saveCategories(cats);
  },

  seedData() {
    const existing = this.getArticles();
    if (existing.length === 0 && BLOG_CONFIG.SEED_ARTICLES) {
      const seeded = BLOG_CONFIG.SEED_ARTICLES.map((a,i) => ({
        ...a,
        id: 'seed_'+i+'_'+Date.now(),
        createdAt: new Date(Date.now()-(BLOG_CONFIG.SEED_ARTICLES.length-i)*86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        views: Math.floor(Math.random()*2000)+100
      }));
      this.saveArticles(seeded);
    }
    if (!localStorage.getItem(this.KEY_CATEGORIES)) {
      this.saveCategories(BLOG_CONFIG.DEFAULT_CATEGORIES);
    }
  }
};

// ============================================================
// GOOGLE SHEETS SYNC
// ============================================================
const SheetsSync = {
  async pushArticle(article) {
    const settings = AdminDB.getSettings();
    if (!settings.scriptUrl) return;
    try {
      await fetch(settings.scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveArticle', article }),
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch {}
  },

  async pushCategory(cat) {
    const settings = AdminDB.getSettings();
    if (!settings.scriptUrl) return;
    try {
      await fetch(settings.scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveCategory', category: cat }),
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch {}
  },

  async deleteArticle(id) {
    const settings = AdminDB.getSettings();
    if (!settings.scriptUrl) return;
    try {
      await fetch(settings.scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteArticle', id }),
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch {}
  },

  async testConnection() {
    const settings = AdminDB.getSettings();
    if (!settings.scriptUrl) return false;
    try {
      const res = await fetch(`${settings.scriptUrl}?action=ping`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      return data.status === 'ok';
    } catch { return false; }
  },

  async pullAll() {
    const settings = AdminDB.getSettings();
    if (!settings.scriptUrl) return false;
    try {
      const [artRes, catRes] = await Promise.all([
        fetch(`${settings.scriptUrl}?action=getArticles`),
        fetch(`${settings.scriptUrl}?action=getCategories`)
      ]);
      const artData = await artRes.json();
      const catData = await catRes.json();
      if (artData.articles) AdminDB.saveArticles(artData.articles);
      if (catData.categories) AdminDB.saveCategories(catData.categories);
      return true;
    } catch { return false; }
  }
};

// ============================================================
// IMGBB UPLOAD
// ============================================================
async function uploadToImgBB(file, progressCallback) {
  const settings = AdminDB.getSettings();
  const apiKey = settings.imgbbKey || BLOG_CONFIG.IMGBB_API_KEY;
  const formData = new FormData();
  formData.append('image', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.imgbb.com/1/upload?key=${apiKey}`);
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && progressCallback) progressCallback(Math.round(e.loaded/e.total*100));
    });
    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.data && data.data.url) resolve(data.data.url);
        else reject(new Error(data.error?.message || 'Upload failed'));
      } catch { reject(new Error('Invalid response')); }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(formData);
  });
}

// ============================================================
// UTILITY
// ============================================================
function generateId() {
  return 'art_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
}

function formatDateShort(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  catch { return iso; }
}

function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function setTopbarStatus(msg, type='') {
  const el = document.getElementById('topbarStatus');
  if (el) { el.textContent = msg; el.className = `topbar-status ${type}`; }
}

// ============================================================
// LOGIN
// ============================================================
function initLogin() {
  const overlay  = document.getElementById('loginOverlay');
  const layout   = document.getElementById('adminLayout');
  const form     = document.getElementById('loginForm');
  const pwInput  = document.getElementById('adminPassword');
  const errEl    = document.getElementById('loginError');
  const togglePw = document.getElementById('togglePassword');

  // Check session
  if (sessionStorage.getItem('aifutures_admin_auth') === '1') {
    overlay.style.display = 'none';
    layout.style.display  = 'flex';
    initAdminUI();
    return;
  }

  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const isText = pwInput.type === 'text';
      pwInput.type = isText ? 'password' : 'text';
      togglePw.innerHTML = isText ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const pw = pwInput.value.trim();
    if (pw === AdminDB.getPassword()) {
      sessionStorage.setItem('aifutures_admin_auth', '1');
      overlay.style.display = 'none';
      layout.style.display  = 'flex';
      initAdminUI();
    } else {
      errEl.textContent = 'Incorrect password. Please try again.';
      errEl.style.display = 'block';
      pwInput.value = '';
      pwInput.focus();
      setTimeout(() => errEl.style.display='none', 3000);
    }
  });
}

// ============================================================
// ADMIN UI INIT
// ============================================================
function initAdminUI() {
  AdminDB.seedData();
  initSidebar();
  initSidebarToggle();
  initLogout();
  initModals();
  initTableSizeGrid();
  showView('dashboard');

  // Wire up "New Article" buttons
  document.querySelectorAll('[data-view="editor"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      clearEditor();
      showView('editor');
    });
  });
}

// ============================================================
// SIDEBAR / VIEWS
// ============================================================
function initSidebar() {
  document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) showView(view);
    });
  });
}

function showView(viewId) {
  document.querySelectorAll('.admin-view').forEach(v => v.style.display='none');
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.style.display = 'block';

  document.querySelectorAll('.sidebar-link[data-view]').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-view="${viewId}"]`);
  if (activeLink) activeLink.classList.add('active');

  const titles = { dashboard:'Dashboard', articles:'All Articles', editor:'Article Editor', categories:'Categories', settings:'Settings' };
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = titles[viewId] || viewId;

  // Render view content
  if (viewId === 'dashboard')  renderDashboard();
  if (viewId === 'articles')   renderArticlesTable();
  if (viewId === 'categories') renderCategoriesView();
  if (viewId === 'settings')   renderSettings();
  if (viewId === 'editor' && !document.getElementById('editingArticleId').value) clearEditor();

  // Close mobile sidebar
  document.getElementById('adminSidebar').classList.remove('open');
}

function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) sidebar.classList.toggle('open');
    else sidebar.classList.toggle('collapsed');
    // Update main margin
    const main = document.querySelector('.admin-main');
    if (main) main.style.marginLeft = sidebar.classList.contains('collapsed') ? '64px' : '240px';
  });
}

function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', () => {
    sessionStorage.removeItem('aifutures_admin_auth');
    location.reload();
  });
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const articles   = AdminDB.getArticles();
  const categories = AdminDB.getCategories();
  const published  = articles.filter(a=>a.status==='published');
  const drafts     = articles.filter(a=>a.status==='draft');

  setText('dash-total',     articles.length);
  setText('dash-published', published.length);
  setText('dash-drafts',    drafts.length);
  setText('dash-cats',      categories.length);

  // Latest articles (sorted by createdAt)
  const sorted = [...articles].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  renderDashList('dashLatest', sorted.slice(0,5));

  // Recently updated
  const updated = [...articles].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  renderDashList('dashUpdated', updated.slice(0,5));
}

function renderDashList(elId, articles) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!articles.length) { el.innerHTML='<p style="color:#94a3b8;font-size:0.875rem;padding:16px;">No articles yet.</p>'; return; }
  el.innerHTML = articles.map(a => {
    const cat = AdminDB.getCategoryById(a.category);
    return `
      <div class="dash-article-row" onclick="editArticle('${a.id}')">
        ${a.coverImage ? `<img class="dash-row-img" src="${a.coverImage}" alt="" />` : `<div class="dash-row-img" style="background:#141d35;display:flex;align-items:center;justify-content:center;color:#2d3f60;"><i class="fa-solid fa-image"></i></div>`}
        <div style="flex:1;min-width:0;">
          <div class="dash-row-title">${a.title}</div>
          <div class="dash-row-meta">${cat?cat.name:''} · ${formatDateShort(a.createdAt)}</div>
        </div>
        <span class="dash-row-status status-${a.status}">${a.status}</span>
      </div>`;
  }).join('');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
// ARTICLES TABLE
// ============================================================
function renderArticlesTable(filter = {}) {
  let articles = AdminDB.getArticles();

  // Populate category filter
  const catFilter = document.getElementById('articleFilterCat');
  if (catFilter && catFilter.options.length <= 1) {
    AdminDB.getCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id; opt.textContent = cat.name;
      catFilter.appendChild(opt);
    });
  }

  // Apply filters
  const search  = (document.getElementById('articleSearch')?.value||'').toLowerCase();
  const catVal  = document.getElementById('articleFilterCat')?.value||'all';
  const statVal = document.getElementById('articleFilterStatus')?.value||'all';

  if (search)           articles = articles.filter(a=>a.title.toLowerCase().includes(search));
  if (catVal !== 'all') articles = articles.filter(a=>a.category===catVal);
  if (statVal!== 'all') articles = articles.filter(a=>a.status===statVal);

  articles.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const tbody = document.getElementById('articlesTableBody');
  if (!tbody) return;

  if (!articles.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:40px;">No articles found.</td></tr>`;
    return;
  }

  tbody.innerHTML = articles.map(a => {
    const cat = AdminDB.getCategoryById(a.category);
    return `
      <tr>
        <td>${a.coverImage ? `<img class="table-thumb" src="${a.coverImage}" alt="" />` : `<div class="table-thumb" style="background:#0a1020;display:flex;align-items:center;justify-content:center;color:#2d3f60;font-size:1.2rem;"><i class="fa-solid fa-image"></i></div>`}</td>
        <td><div class="table-title">${a.title}</div><div style="font-size:0.75rem;color:#94a3b8;margin-top:3px;">${formatDateShort(a.createdAt)}</div></td>
        <td><span class="table-cat" style="background:${cat?cat.color+'20':'rgba(255,255,255,0.05)'};color:${cat?cat.color:'#94a3b8'}">${cat?cat.name:'—'}</span></td>
        <td><span class="dash-row-status status-${a.status}">${a.status}</span></td>
        <td style="color:#94a3b8;font-size:0.85rem;">${formatDateShort(a.updatedAt||a.createdAt)}</td>
        <td>
          <div class="table-actions">
            <button class="table-btn edit" title="Edit" onclick="editArticle('${a.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="table-btn view" title="View" onclick="viewArticle('${a.slug}')"><i class="fa-solid fa-eye"></i></button>
            <button class="table-btn del" title="Delete" onclick="confirmDeleteArticle('${a.id}','${a.title.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Attach search/filter listeners once
  if (!document.getElementById('articleSearch')._bound) {
    document.getElementById('articleSearch')._bound = true;
    ['articleSearch','articleFilterCat','articleFilterStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => renderArticlesTable());
    });
  }

  // Wire "New from list" button
  const newBtn = document.getElementById('newFromList');
  if (newBtn && !newBtn._bound) {
    newBtn._bound = true;
    newBtn.addEventListener('click', () => { clearEditor(); showView('editor'); });
  }
}

function viewArticle(slug) {
  window.open(`article.html?slug=${encodeURIComponent(slug)}`, '_blank');
}

function editArticle(id) {
  const article = AdminDB.getArticleById(id);
  if (!article) return;
  loadArticleIntoEditor(article);
  showView('editor');
}

function confirmDeleteArticle(id, title) {
  const msg = document.getElementById('deleteModalMsg');
  if (msg) msg.textContent = `Delete "${title}"? This cannot be undone.`;
  openModal('deleteModal');

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => {
    AdminDB.deleteArticle(id);
    closeModal('deleteModal');
    renderArticlesTable();
    showToast('Article deleted.', 'error');
  });
}

// ============================================================
// ARTICLE EDITOR
// ============================================================
function initEditor() {
  initRTE();
  initCoverUpload();
  initSlugGenerate();
  initTagsInput();
  initMetaDescCounter();
  populateCategorySelect('artCategory');

  // Save Draft
  document.getElementById('saveDraftBtn').addEventListener('click', () => saveArticle('draft'));
  // Publish
  document.getElementById('publishBtn').addEventListener('click', () => saveArticle('published'));
}

function clearEditor() {
  document.getElementById('editingArticleId').value = '';
  document.getElementById('editorTitle').textContent = 'New Article';
  document.getElementById('artTitle').value = '';
  document.getElementById('artSlug').value = '';
  document.getElementById('artExcerpt').value = '';
  document.getElementById('artTags').value = '';
  document.getElementById('artMetaDesc').value = '';
  document.getElementById('artCoverUrl').value = '';
  document.getElementById('artCategory').value = '';
  document.getElementById('artStatus').value = 'draft';
  document.getElementById('artImagePos').value = 'cover';
  document.getElementById('artLayout').value = 'standard';
  document.getElementById('tagsPreview').innerHTML = '';
  document.getElementById('metaDescCount').textContent = '0 / 160';

  const coverPreview = document.getElementById('coverPreview');
  const coverPlaceholder = document.getElementById('coverPlaceholder');
  if (coverPreview) { coverPreview.src=''; coverPreview.style.display='none'; }
  if (coverPlaceholder) coverPlaceholder.style.display='flex';

  const editor = document.getElementById('rteEditor');
  if (editor) editor.innerHTML = '';
  setTopbarStatus('');
}

function loadArticleIntoEditor(article) {
  document.getElementById('editingArticleId').value = article.id;
  document.getElementById('editorTitle').textContent = 'Edit Article';
  document.getElementById('artTitle').value = article.title || '';
  document.getElementById('artSlug').value = article.slug || '';
  document.getElementById('artExcerpt').value = article.excerpt || '';
  document.getElementById('artTags').value = article.tags || '';
  document.getElementById('artMetaDesc').value = article.metaDesc || '';
  document.getElementById('artCoverUrl').value = article.coverImage || '';
  document.getElementById('artStatus').value = article.status || 'draft';
  document.getElementById('artImagePos').value = article.imagePos || 'cover';
  document.getElementById('artLayout').value = article.layout || 'standard';
  populateCategorySelect('artCategory', article.category);
  updateTagsPreview(article.tags || '');

  const editor = document.getElementById('rteEditor');
  if (editor) editor.innerHTML = article.content || '';

  if (article.coverImage) {
    const coverPreview = document.getElementById('coverPreview');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    if (coverPreview) { coverPreview.src=article.coverImage; coverPreview.style.display='block'; }
    if (coverPlaceholder) coverPlaceholder.style.display='none';
  }

  updateMetaDescCount(article.metaDesc || '');
}

function saveArticle(status) {
  const title = document.getElementById('artTitle').value.trim();
  const content = document.getElementById('rteEditor').innerHTML.trim();

  if (!title) { showToast('Please enter a title.', 'error'); document.getElementById('artTitle').focus(); return; }
  if (!content || content === '<br>') { showToast('Please add some content.', 'error'); return; }

  const id = document.getElementById('editingArticleId').value || generateId();
  const existingArticle = AdminDB.getArticleById(id);

  const article = {
    id,
    title,
    slug:       document.getElementById('artSlug').value.trim() || slugify(title),
    excerpt:    document.getElementById('artExcerpt').value.trim(),
    content,
    tags:       document.getElementById('artTags').value.trim(),
    metaDesc:   document.getElementById('artMetaDesc').value.trim(),
    coverImage: document.getElementById('artCoverUrl').value.trim(),
    category:   document.getElementById('artCategory').value,
    status,
    imagePos:   document.getElementById('artImagePos').value,
    layout:     document.getElementById('artLayout').value,
    createdAt:  existingArticle ? existingArticle.createdAt : new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    views:      existingArticle ? (existingArticle.views || 0) : 0
  };

  setTopbarStatus('Saving…', 'saving');
  AdminDB.saveArticle(article);
  document.getElementById('editingArticleId').value = id;
  document.getElementById('artSlug').value = article.slug;
  document.getElementById('editorTitle').textContent = 'Edit Article';

  setTimeout(() => setTopbarStatus(`${status === 'published' ? 'Published' : 'Draft saved'} ✓`, 'saved'), 300);
  showToast(`Article ${status === 'published' ? 'published' : 'saved as draft'}!`, 'success');
}

function populateCategorySelect(selectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = selectedValue || select.value;
  const cats = AdminDB.getCategories();
  select.innerHTML = '<option value="">Select category…</option>' +
    cats.map(c => `<option value="${c.id}" ${c.id===current?'selected':''}>${c.name}</option>`).join('');
}

// ============================================================
// COVER IMAGE UPLOAD
// ============================================================
function initCoverUpload() {
  const area     = document.getElementById('coverUploadArea');
  const fileInput= document.getElementById('coverFile');
  const preview  = document.getElementById('coverPreview');
  const placeholder=document.getElementById('coverPlaceholder');
  const progress = document.getElementById('coverProgress');
  const fill     = document.getElementById('coverProgressFill');
  const text     = document.getElementById('coverProgressText');
  const urlInput = document.getElementById('artCoverUrl');
  const useUrl   = document.getElementById('useCoverUrl');

  if (area) {
    area.addEventListener('click', () => fileInput.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
      e.preventDefault(); area.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleCoverFile(file);
    });
  }

  if (fileInput) fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleCoverFile(e.target.files[0]);
  });

  if (useUrl) useUrl.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
      preview.src = url; preview.style.display='block';
      if (placeholder) placeholder.style.display='none';
    }
  });

  async function handleCoverFile(file) {
    if (file.size > 5*1024*1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    progress.style.display='block';
    fill.style.width='0%';
    text.textContent='Uploading…';
    try {
      const url = await uploadToImgBB(file, pct => {
        fill.style.width = pct+'%';
        text.textContent = `Uploading… ${pct}%`;
      });
      urlInput.value = url;
      preview.src = url; preview.style.display='block';
      if (placeholder) placeholder.style.display='none';
      fill.style.width='100%';
      text.textContent='Upload complete!';
      setTimeout(() => progress.style.display='none', 1500);
      showToast('Cover image uploaded!');
    } catch(err) {
      progress.style.display='none';
      showToast('Upload failed: '+err.message, 'error');
    }
  }
}

// ============================================================
// SLUG GENERATOR
// ============================================================
function initSlugGenerate() {
  const btn = document.getElementById('generateSlug');
  if (btn) btn.addEventListener('click', () => {
    const title = document.getElementById('artTitle').value;
    if (title) document.getElementById('artSlug').value = slugify(title);
  });

  // Auto-generate slug on title input (only if slug is empty)
  const titleInput = document.getElementById('artTitle');
  if (titleInput) titleInput.addEventListener('blur', () => {
    const slugInput = document.getElementById('artSlug');
    if (slugInput && !slugInput.value && titleInput.value) {
      slugInput.value = slugify(titleInput.value);
    }
  });
}

// ============================================================
// TAGS INPUT
// ============================================================
function initTagsInput() {
  const input = document.getElementById('artTags');
  if (input) input.addEventListener('input', () => updateTagsPreview(input.value));
}

function updateTagsPreview(value) {
  const preview = document.getElementById('tagsPreview');
  if (!preview) return;
  const tags = value.split(',').map(t=>t.trim()).filter(Boolean);
  preview.innerHTML = tags.map(t=>`<span class="tag-chip">${t}</span>`).join('');
}

// ============================================================
// META DESC COUNTER
// ============================================================
function initMetaDescCounter() {
  const textarea = document.getElementById('artMetaDesc');
  if (textarea) textarea.addEventListener('input', () => updateMetaDescCount(textarea.value));
}

function updateMetaDescCount(value) {
  const count = document.getElementById('metaDescCount');
  if (count) {
    const len = value.length;
    count.textContent = `${len} / 160`;
    count.style.color = len > 160 ? '#ef4444' : '#94a3b8';
  }
}

// ============================================================
// RICH TEXT EDITOR
// ============================================================
function initRTE() {
  const editor   = document.getElementById('rteEditor');
  const source   = document.getElementById('rteSource');
  const htmlBtn  = document.getElementById('rteHtml');
  const toolbar  = document.getElementById('rteToolbar');

  if (!editor) return;

  // Toolbar buttons
  toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      editor.focus();
      document.execCommand(cmd, false, val);
      updateToolbarState();
    });
  });

  // Link insert
  document.getElementById('rteLink')?.addEventListener('click', e => {
    e.preventDefault();
    // Store selection
    const sel = window.getSelection();
    if (sel.rangeCount) {
      editor._savedRange = sel.getRangeAt(0).cloneRange();
      const selectedText = sel.toString();
      const linkText = document.getElementById('linkText');
      if (linkText && selectedText) linkText.value = selectedText;
    }
    openModal('linkModal');
  });

  // Image insert
  document.getElementById('rteImage')?.addEventListener('click', e => {
    e.preventDefault();
    editor._savedRange = saveSelection();
    openModal('imageModal');
  });

  // Table insert
  document.getElementById('rteTable')?.addEventListener('click', e => {
    e.preventDefault();
    editor._savedRange = saveSelection();
    openModal('tableModal');
  });

  // Horizontal rule
  document.getElementById('rteHr')?.addEventListener('click', e => {
    e.preventDefault();
    editor.focus();
    document.execCommand('insertHTML', false, '<hr/>');
  });

  // HTML toggle
  let htmlMode = false;
  if (htmlBtn) htmlBtn.addEventListener('click', e => {
    e.preventDefault();
    htmlMode = !htmlMode;
    if (htmlMode) {
      source.value = editor.innerHTML;
      editor.style.display = 'none';
      source.style.display = 'block';
      htmlBtn.classList.add('active');
    } else {
      editor.innerHTML = source.value;
      source.style.display = 'none';
      editor.style.display = 'block';
      htmlBtn.classList.remove('active');
    }
  });

  // Update toolbar state on selection change
  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);
  document.addEventListener('selectionchange', updateToolbarState);

  // Prevent losing focus when clicking toolbar
  toolbar.addEventListener('mousedown', e => e.preventDefault());

  // Handle paste — strip extra formatting but keep structure
  editor.addEventListener('paste', e => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const clean = sanitizePastedHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
  });

  // Tab key inserts spaces
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  });
}

function sanitizePastedHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove script/style tags
  div.querySelectorAll('script,style,meta,link').forEach(el=>el.remove());
  // Remove inline styles
  div.querySelectorAll('[style]').forEach(el=>el.removeAttribute('style'));
  div.querySelectorAll('[class]').forEach(el=>el.removeAttribute('class'));
  return div.innerHTML;
}

function updateToolbarState() {
  const toolbar = document.getElementById('rteToolbar');
  if (!toolbar) return;
  const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight'];
  cmds.forEach(cmd => {
    const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount) return sel.getRangeAt(0).cloneRange();
  return null;
}

function restoreSelection(range) {
  if (!range) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ============================================================
// LINK MODAL INSERT
// ============================================================
function initLinkInsert() {
  const insertBtn = document.getElementById('insertLinkBtn');
  if (!insertBtn) return;
  insertBtn.addEventListener('click', () => {
    const text    = document.getElementById('linkText').value.trim();
    const url     = document.getElementById('linkUrl').value.trim();
    const newTab  = document.getElementById('linkNewTab').checked;
    if (!url) { showToast('Please enter a URL', 'error'); return; }

    const editor = document.getElementById('rteEditor');
    editor.focus();
    const range = editor._savedRange;
    if (range) restoreSelection(range);

    const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const linkHtml = `<a href="${url}"${target}>${text || url}</a>`;
    document.execCommand('insertHTML', false, linkHtml);

    document.getElementById('linkText').value = '';
    document.getElementById('linkUrl').value  = '';
    closeModal('linkModal');
  });
}

// ============================================================
// IMAGE MODAL INSERT
// ============================================================
function initImageInsert() {
  // Tab switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('imgTabUpload').style.display = target==='upload'?'block':'none';
      document.getElementById('imgTabUrl').style.display    = target==='url'?'block':'none';
    });
  });

  // Drop/click upload
  const drop  = document.getElementById('imgUploadDrop');
  const file  = document.getElementById('imgUploadFile');
  const fill  = document.getElementById('imgUploadFill');
  const text  = document.getElementById('imgUploadText');
  const prog  = document.getElementById('imgUploadProgress');

  if (drop) {
    drop.addEventListener('click', () => file.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleEditorImageUpload(f, fill, text, prog);
    });
  }
  if (file) file.addEventListener('change', e => {
    if (e.target.files[0]) handleEditorImageUpload(e.target.files[0], fill, text, prog);
  });

  // Insert button
  const insertBtn = document.getElementById('insertImageBtn');
  if (insertBtn) insertBtn.addEventListener('click', () => {
    const url   = document.getElementById('imgUrl').value.trim() || (window._lastUploadedImgUrl || '');
    const alt   = document.getElementById('imgAlt').value.trim();
    const align = document.getElementById('imgAlign').value;
    if (!url) { showToast('No image URL', 'error'); return; }

    const alignClass = align !== 'none' ? ` class="${align==='center'?'align-center':align==='left'?'float-left':'float-right'}"` : '';
    const imgHtml = `<img src="${url}" alt="${alt}"${alignClass} />${align==='left'||align==='right'?'':''}`;

    const editor = document.getElementById('rteEditor');
    editor.focus();
    const range = editor._savedRange;
    if (range) restoreSelection(range);
    document.execCommand('insertHTML', false, imgHtml);

    document.getElementById('imgUrl').value = '';
    document.getElementById('imgAlt').value = '';
    window._lastUploadedImgUrl = '';
    closeModal('imageModal');
  });
}

async function handleEditorImageUpload(file, fill, text, prog) {
  if (file.size > 5*1024*1024) { showToast('Image too large (max 5MB)', 'error'); return; }
  prog.style.display = 'block'; fill.style.width = '0%'; text.textContent='Uploading…';
  try {
    const url = await uploadToImgBB(file, pct => {
      fill.style.width = pct+'%';
      text.textContent = `Uploading… ${pct}%`;
    });
    fill.style.width='100%'; text.textContent='Done!';
    window._lastUploadedImgUrl = url;
    document.getElementById('imgUrl').value = url;
    showToast('Image uploaded!');
    setTimeout(() => prog.style.display='none', 1500);
  } catch(err) {
    prog.style.display='none';
    showToast('Upload failed: '+err.message, 'error');
  }
}

// ============================================================
// TABLE SIZE GRID
// ============================================================
function initTableSizeGrid() {
  const grid  = document.getElementById('tableSizeGrid');
  const label = document.getElementById('tableSizeLabel');
  if (!grid) return;

  let cells = [];
  for (let r=1; r<=6; r++) {
    for (let c=1; c<=8; c++) {
      const cell = document.createElement('div');
      cell.className = 'table-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('mouseover', () => highlightCells(r,c));
      cell.addEventListener('click', () => insertTable(r,c));
      grid.appendChild(cell);
      cells.push(cell);
    }
  }

  function highlightCells(maxR, maxC) {
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      cell.classList.toggle('hover', r<=maxR && c<=maxC);
    });
    if (label) label.textContent = `${maxR} × ${maxC}`;
  }

  function insertTable(rows, cols) {
    let html = '<table><thead><tr>';
    for (let c=0; c<cols; c++) html += `<th>Header ${c+1}</th>`;
    html += '</tr></thead><tbody>';
    for (let r=0; r<rows-1; r++) {
      html += '<tr>';
      for (let c=0; c<cols; c++) html += '<td>Cell</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    const editor = document.getElementById('rteEditor');
    editor.focus();
    const range = editor._savedRange;
    if (range) restoreSelection(range);
    document.execCommand('insertHTML', false, html);
    closeModal('tableModal');
  }
}

// ============================================================
// CATEGORIES VIEW
// ============================================================
let editingCategoryId = null;

function renderCategoriesView() {
  const listPanel = document.getElementById('categoriesListPanel');
  if (!listPanel) return;

  const categories = AdminDB.getCategories();
  const articles   = AdminDB.getArticles();

  if (categories.length === 0) {
    listPanel.innerHTML = '<p style="color:#94a3b8;font-size:0.875rem;padding:20px;">No categories yet. Click "New Category".</p>';
  } else {
    listPanel.innerHTML = categories.map(cat => {
      const count = articles.filter(a=>a.category===cat.id).length;
      return `
        <div class="cat-list-item" id="catItem_${cat.id}" onclick="editCategory('${cat.id}')">
          <span class="cat-list-dot" style="background:${cat.color}"></span>
          <span class="cat-list-name">${cat.name}</span>
          <span class="cat-list-count">${count}</span>
          <div class="cat-list-actions">
            <button class="cat-list-btn edit" onclick="editCategory('${cat.id}');event.stopPropagation()"><i class="fa-solid fa-pen"></i></button>
            <button class="cat-list-btn del" onclick="confirmDeleteCategory('${cat.id}','${cat.name.replace(/'/g,"\\'")}');event.stopPropagation()"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    }).join('');
  }

  // New category button
  const newBtn = document.getElementById('newCategoryBtn');
  if (newBtn && !newBtn._bound) {
    newBtn._bound = true;
    newBtn.addEventListener('click', () => { editingCategoryId=null; showCategoryForm(null); });
  }
}

function editCategory(id) {
  editingCategoryId = id;
  const cat = AdminDB.getCategoryById(id);
  showCategoryForm(cat);
  document.querySelectorAll('.cat-list-item').forEach(el=>el.classList.remove('active'));
  const item = document.getElementById(`catItem_${id}`);
  if (item) item.classList.add('active');
}

function showCategoryForm(cat) {
  const panel = document.getElementById('categoryFormPanel');
  if (!panel) return;

  const icons = ['fa-heart-pulse','fa-briefcase','fa-wand-magic-sparkles','fa-graduation-cap','fa-scale-balanced','fa-microchip','fa-robot','fa-brain','fa-flask','fa-code','fa-globe','fa-bolt','fa-chart-line','fa-shield-halved','fa-lightbulb'];

  panel.innerHTML = `
    <h3 style="color:#fff;font-size:1rem;margin-bottom:20px;">${cat ? 'Edit Category' : 'New Category'}</h3>
    <div class="meta-field">
      <label>Name <span class="required">*</span></label>
      <input type="text" id="catName" class="admin-input" value="${cat?cat.name:''}" placeholder="Category name" />
    </div>
    <div class="meta-field">
      <label>Slug / ID</label>
      <input type="text" id="catSlug" class="admin-input" value="${cat?cat.id:''}" placeholder="category-slug" />
    </div>
    <div class="meta-field">
      <label>Description</label>
      <textarea id="catDesc" class="admin-textarea" rows="3" placeholder="Brief description…">${cat?cat.description||'':''}</textarea>
    </div>
    <div class="meta-field">
      <label>Color</label>
      <div class="color-input-wrap">
        <input type="color" id="catColor" value="${cat?cat.color:'#3b82f6'}" />
        <input type="text" id="catColorHex" class="admin-input small" value="${cat?cat.color:'#3b82f6'}" style="width:100px;" />
      </div>
    </div>
    <div class="meta-field">
      <label>Icon</label>
      <div class="icon-picker" id="iconPicker">
        ${icons.map(ic=>`<div class="icon-opt ${cat&&cat.icon===ic?'selected':''}" data-icon="${ic}" title="${ic}"><i class="fa-solid ${ic}"></i></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="btn-primary-admin" id="saveCatBtn"><i class="fa-solid fa-floppy-disk"></i> ${cat?'Update':'Create'}</button>
      ${cat?`<button class="btn-danger-admin" id="deleteCatBtn"><i class="fa-solid fa-trash"></i> Delete</button>`:''}
    </div>`;

  // Color sync
  const colorPicker = panel.querySelector('#catColor');
  const colorHex    = panel.querySelector('#catColorHex');
  colorPicker.addEventListener('input', () => { colorHex.value = colorPicker.value; });
  colorHex.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(colorHex.value)) colorPicker.value = colorHex.value;
  });

  // Icon picker
  let selectedIcon = cat ? (cat.icon || 'fa-microchip') : 'fa-microchip';
  panel.querySelectorAll('.icon-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      panel.querySelectorAll('.icon-opt').forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedIcon = opt.dataset.icon;
    });
  });

  // Auto-slug from name
  panel.querySelector('#catName').addEventListener('blur', () => {
    const slugInput = panel.querySelector('#catSlug');
    if (slugInput && !slugInput.value) {
      slugInput.value = slugify(panel.querySelector('#catName').value);
    }
  });

  // Save button
  panel.querySelector('#saveCatBtn').addEventListener('click', () => {
    const name  = panel.querySelector('#catName').value.trim();
    const slug  = panel.querySelector('#catSlug').value.trim() || slugify(name);
    const desc  = panel.querySelector('#catDesc').value.trim();
    const color = panel.querySelector('#catColor').value;

    if (!name) { showToast('Category name required', 'error'); return; }

    const category = {
      id:          cat ? cat.id : slug,
      name,
      slug,
      description: desc,
      color,
      icon:        selectedIcon,
      parent:      'future-of-ai'
    };

    AdminDB.saveCategory(category);
    showToast(`Category ${cat?'updated':'created'}!`);
    renderCategoriesView();
    showCategoryForm(AdminDB.getCategoryById(category.id));
  });

  // Delete button
  const delBtn = panel.querySelector('#deleteCatBtn');
  if (delBtn) {
    delBtn.addEventListener('click', () => confirmDeleteCategory(cat.id, cat.name));
  }
}

function confirmDeleteCategory(id, name) {
  const msg = document.getElementById('deleteModalMsg');
  if (msg) msg.textContent = `Delete category "${name}"? Articles in this category will remain but lose their category.`;
  openModal('deleteModal');

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => {
    AdminDB.deleteCategory(id);
    closeModal('deleteModal');
    renderCategoriesView();
    document.getElementById('categoryFormPanel').innerHTML = `
      <div class="cat-form-placeholder">
        <i class="fa-solid fa-folder-plus"></i>
        <p>Category deleted. Select another or create a new one.</p>
      </div>`;
    showToast('Category deleted.', 'error');
  });
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function renderSettings() {
  const settings = AdminDB.getSettings();
  const sheetId  = document.getElementById('settingsSheetId');
  const scriptUrl= document.getElementById('settingsScriptUrl');
  const imgbbKey = document.getElementById('settingsImgbbKey');
  if (sheetId)   sheetId.value   = settings.sheetId    || '';
  if (scriptUrl) scriptUrl.value = settings.scriptUrl  || '';
  if (imgbbKey)  imgbbKey.value  = settings.imgbbKey   || BLOG_CONFIG.IMGBB_API_KEY;

  renderSetupSteps();
  initSettingsButtons();
  updateConnectionStatus(settings.scriptUrl ? 'configured' : 'offline');
}

function initSettingsButtons() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn && !saveBtn._bound) {
    saveBtn._bound = true;
    saveBtn.addEventListener('click', () => {
      const s = AdminDB.getSettings();
      s.sheetId   = document.getElementById('settingsSheetId').value.trim();
      s.scriptUrl = document.getElementById('settingsScriptUrl').value.trim();
      AdminDB.saveSettings(s);
      showToast('Settings saved!');
      updateConnectionStatus(s.scriptUrl ? 'configured' : 'offline');
    });
  }

  const testBtn = document.getElementById('testConnectionBtn');
  if (testBtn && !testBtn._bound) {
    testBtn._bound = true;
    testBtn.addEventListener('click', async () => {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing…';
      const ok = await SheetsSync.testConnection();
      testBtn.disabled = false;
      testBtn.innerHTML = '<i class="fa-solid fa-wifi"></i> Test Connection';
      updateConnectionStatus(ok ? 'online' : 'error');
      showToast(ok ? 'Connected to Google Sheets!' : 'Connection failed. Check your URL.', ok?'success':'error');
    });
  }

  const saveImgbbBtn = document.getElementById('saveImgbbBtn');
  if (saveImgbbBtn && !saveImgbbBtn._bound) {
    saveImgbbBtn._bound = true;
    saveImgbbBtn.addEventListener('click', () => {
      const s = AdminDB.getSettings();
      s.imgbbKey = document.getElementById('settingsImgbbKey').value.trim();
      AdminDB.saveSettings(s);
      showToast('ImgBB key saved!');
    });
  }

  const seedBtn = document.getElementById('seedDataBtn');
  if (seedBtn && !seedBtn._bound) {
    seedBtn._bound = true;
    seedBtn.addEventListener('click', () => {
      localStorage.removeItem(AdminDB.KEY_ARTICLES);
      AdminDB.seedData();
      showToast('Default data seeded! Refresh to see articles.');
    });
  }

  const changePwBtn = document.getElementById('changePasswordBtn');
  if (changePwBtn && !changePwBtn._bound) {
    changePwBtn._bound = true;
    changePwBtn.addEventListener('click', () => {
      const newPw   = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;
      if (!newPw)          { showToast('Enter a new password', 'error'); return; }
      if (newPw !== confirm){ showToast('Passwords do not match', 'error'); return; }
      AdminDB.setPassword(newPw);
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      showToast('Password updated!');
    });
  }
}

function updateConnectionStatus(state) {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  const states = {
    online:     ['online', 'Connected to Google Sheets'],
    offline:    ['offline', 'Not configured'],
    configured: ['offline', 'Configured — test to verify'],
    error:      ['error', 'Connection failed']
  };
  const [cls, msg] = states[state] || states.offline;
  el.innerHTML = `<span class="status-dot ${cls}"></span> ${msg}`;
}

function renderSetupSteps() {
  const el = document.getElementById('setupSteps');
  if (!el) return;
  const steps = [
    { title: 'Create Google Sheet', body: 'Go to <a href="https://sheets.google.com" target="_blank" style="color:#3b82f6;">sheets.google.com</a> and create a new spreadsheet. Name it "AI Futures Blog".' },
    { title: 'Create 3 sheets (tabs)', body: 'Rename Sheet1 to <code>Articles</code>, add <code>Categories</code> and <code>Subscribers</code> tabs.' },
    { title: 'Add Headers — Articles', body: '<code>id, title, slug, excerpt, content, tags, metaDesc, coverImage, category, status, imagePos, layout, createdAt, updatedAt, views</code>' },
    { title: 'Add Headers — Categories', body: '<code>id, name, slug, description, color, icon, parent</code>' },
    { title: 'Open Apps Script', body: 'In your sheet, go to <b>Extensions → Apps Script</b>. Delete existing code and paste the Apps Script code.' },
    { title: 'Deploy as Web App', body: 'Click <b>Deploy → New deployment</b>. Type: Web App. Execute as: Me. Who has access: Anyone. Click Deploy and copy the URL.' },
    { title: 'Paste URL in Settings', body: 'Come back here to Settings, paste the deployment URL in the <b>Apps Script URL</b> field, and click Save Settings.' },
    { title: 'Seed & Sync', body: 'Click <b>Seed Default Data</b> to populate the blog, then click <b>Test Connection</b> to verify the link.' }
  ];
  el.innerHTML = steps.map((s,i) => `
    <div class="setup-step">
      <div class="step-num">${i+1}</div>
      <div class="step-content">
        <h5>${s.title}</h5>
        <p>${s.body}</p>
      </div>
    </div>`).join('');
}

// ============================================================
// MODALS
// ============================================================
function initModals() {
  // Close buttons
  document.querySelectorAll('.modal-close[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  // Click outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => {
        if (m.style.display !== 'none') closeModal(m.id);
      });
    }
  });

  initLinkInsert();
  initImageInsert();
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
});

// Init editor once the editor view is first shown (lazy init)
const _origShowView = typeof showView === 'function' ? null : null;
document.addEventListener('DOMContentLoaded', () => {
  // Patch showView to init editor on first open
  let editorInited = false;
  const origShowView = window.showView;

  // Override after DOMContentLoaded since showView is defined above
  setTimeout(() => {
    const patchedShow = (viewId) => {
      showView(viewId);
      if (viewId === 'editor' && !editorInited) {
        editorInited = true;
        initEditor();
      }
    };
    // Re-wire sidebar links with patched version
    document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
      link.replaceWith(link.cloneNode(true));
    });
    document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const v = link.dataset.view;
        if (v === 'editor' && !editorInited) { editorInited = true; initEditor(); }
        showView(v);
      });
    });
    document.querySelectorAll('[data-view="editor"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (!editorInited) { editorInited = true; initEditor(); }
        clearEditor();
        showView('editor');
      });
    });
  }, 100);
});
