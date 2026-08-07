// ============================================================
// AI FUTURES BLOG — GOOGLE APPS SCRIPT
// 
// HOW TO USE:
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Delete all existing code
// 3. Paste this entire file
// 4. Click Save (💾)
// 5. Click Deploy → New Deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Click Deploy → Copy the Web App URL
// 7. Paste URL in Admin Panel → Settings → Apps Script URL
// ============================================================

const SHEET_NAME_ARTICLES   = 'Articles';
const SHEET_NAME_CATEGORIES = 'Categories';
const SHEET_NAME_SUBSCRIBERS= 'Subscribers';

// ---- Article columns (in order) ----
const ART_COLS = ['id','title','slug','excerpt','content','tags','metaDesc','coverImage','category','status','imagePos','layout','createdAt','updatedAt','views'];
// ---- Category columns ----
const CAT_COLS = ['id','name','slug','description','color','icon','parent'];

// ============================================================
// GET HANDLER
// ============================================================
function doGet(e) {
  const action = e.parameter.action || '';
  let result;

  if (action === 'ping') {
    result = { status: 'ok', timestamp: new Date().toISOString() };
  } else if (action === 'getArticles') {
    result = { articles: getArticles() };
  } else if (action === 'getCategories') {
    result = { categories: getCategories() };
  } else if (action === 'getArticle') {
    const slug = e.parameter.slug || '';
    const articles = getArticles();
    const article  = articles.find(a => a.slug === slug) || null;
    result = { article };
  } else {
    result = { error: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// POST HANDLER
// ============================================================
function doPost(e) {
  let body, result;
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' });
  }

  const action = body.action || '';

  if (action === 'saveArticle') {
    saveArticle(body.article);
    result = { success: true };
  } else if (action === 'deleteArticle') {
    deleteArticle(body.id);
    result = { success: true };
  } else if (action === 'saveCategory') {
    saveCategory(body.category);
    result = { success: true };
  } else if (action === 'deleteCategory') {
    deleteCategory(body.id);
    result = { success: true };
  } else if (action === 'addSubscriber') {
    addSubscriber(body.email);
    result = { success: true };
  } else {
    result = { error: 'Unknown action' };
  }

  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ARTICLES CRUD
// ============================================================
function getArticles() {
  const sheet = getOrCreateSheet(SHEET_NAME_ARTICLES, ART_COLS);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] === '' ? null : row[i]; });
    return obj;
  }).filter(a => a.id);
}

function saveArticle(article) {
  const sheet = getOrCreateSheet(SHEET_NAME_ARTICLES, ART_COLS);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];

  // Look for existing row
  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === article.id) {
      // Update row
      const row = ART_COLS.map(col => article[col] !== undefined ? article[col] : '');
      sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }

  // Append new row
  const row = ART_COLS.map(col => article[col] !== undefined ? article[col] : '');
  sheet.appendRow(row);
}

function deleteArticle(id) {
  const sheet = getOrCreateSheet(SHEET_NAME_ARTICLES, ART_COLS);
  const data  = sheet.getDataRange().getValues();
  for (let r = data.length - 1; r >= 1; r--) {
    if (data[r][0] === id) {
      sheet.deleteRow(r + 1);
      break;
    }
  }
}

// ============================================================
// CATEGORIES CRUD
// ============================================================
function getCategories() {
  const sheet = getOrCreateSheet(SHEET_NAME_CATEGORIES, CAT_COLS);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] === '' ? null : row[i]; });
    return obj;
  }).filter(c => c.id);
}

function saveCategory(category) {
  const sheet = getOrCreateSheet(SHEET_NAME_CATEGORIES, CAT_COLS);
  const data  = sheet.getDataRange().getValues();

  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === category.id) {
      const row = CAT_COLS.map(col => category[col] !== undefined ? category[col] : '');
      sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }

  const row = CAT_COLS.map(col => category[col] !== undefined ? category[col] : '');
  sheet.appendRow(row);
}

function deleteCategory(id) {
  const sheet = getOrCreateSheet(SHEET_NAME_CATEGORIES, CAT_COLS);
  const data  = sheet.getDataRange().getValues();
  for (let r = data.length - 1; r >= 1; r--) {
    if (data[r][0] === id) {
      sheet.deleteRow(r + 1);
      break;
    }
  }
}

// ============================================================
// SUBSCRIBERS
// ============================================================
function addSubscriber(email) {
  if (!email) return;
  const sheet = getOrCreateSheet(SHEET_NAME_SUBSCRIBERS, ['email','subscribedAt']);
  const data  = sheet.getDataRange().getValues();
  const exists = data.slice(1).some(row => row[0] === email);
  if (!exists) sheet.appendRow([email, new Date().toISOString()]);
}

// ============================================================
// HELPER — Get or create sheet with headers
// ============================================================
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
      .setBackground('#1a73e8').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
