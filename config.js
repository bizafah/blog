// ============================================================
// AI REPORTLY — BLOG CONFIGURATION
// ============================================================

const BLOG_CONFIG = {

  // ---- Google Sheets / Apps Script ----
  SPREADSHEET_ID: "1HA3Wo2L7qO5FxC2yPYJfXN-rR8EWGadVOsILIuwcfCY",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyqVjVBwI6aF5byePKfO82wY6_1BxwWMfQNkcFIWgs9DVqLaIPWv_bT367L18Tz2sz60Q/exec",

  // ---- Contact Form Service (Optional: Web3Forms key) ----
  WEB3FORMS_ACCESS_KEY: "YOUR_WEB3FORMS_KEY",

  // ---- Image Hosting ----
  IMGBB_API_KEY: "c64bdf9b051e440356c814b990048bd6",

  // ---- Admin ----
  ADMIN_PASSWORD: "1234",

  // ---- Blog Meta ----
  BLOG_NAME: "AI Reportly",
  BLOG_TAGLINE: "Exploring the Future of Artificial Intelligence",
  BLOG_DESCRIPTION: "In-depth articles on AI in Healthcare, Future Jobs, Generative AI, Education, and Ethics.",

  // ---- Default Categories ----
  // These are written to localStorage on first load if no categories exist.
  DEFAULT_CATEGORIES: [
    {
      id: "ai-healthcare",
      name: "AI in Healthcare",
      slug: "ai-in-healthcare",
      parent: "future-of-ai",
      description: "How AI is revolutionizing medicine, diagnostics, and patient care.",
      color: "#0ea5e9"
    },
    {
      id: "ai-jobs",
      name: "AI and Future Jobs",
      slug: "ai-and-future-jobs",
      parent: "future-of-ai",
      description: "The impact of AI on careers, employment, and the workforce.",
      color: "#8b5cf6"
    },
    {
      id: "generative-ai",
      name: "Generative AI & Creative Technology",
      slug: "generative-ai-creative-technology",
      parent: "future-of-ai",
      description: "Exploring generative AI tools and their creative applications.",
      color: "#f59e0b"
    },
    {
      id: "ai-education",
      name: "AI in Education",
      slug: "ai-in-education",
      parent: "future-of-ai",
      description: "How AI is transforming learning, teaching, and educational systems.",
      color: "#10b981"
    },
    {
      id: "ai-ethics",
      name: "AI Ethics & Regulation",
      slug: "ai-ethics-regulation",
      parent: "future-of-ai",
      description: "Ethical considerations, policy, and governance around AI.",
      color: "#ef4444"
    }
  ],

  // ---- Fake/seed articles removed ----
  // No seed articles. The site starts empty and gets populated
  // entirely through the admin panel → Google Sheets pipeline.
  SEED_ARTICLES: []

};
