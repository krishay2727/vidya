// =============================================
//  BOOTSTRAP — load all JSON files
// =============================================
async function init() {
  try {
    const siteRes = await fetch('site.json?t=' + Date.now());
    SITE = await siteRes.json();
  } catch (e) {
    console.error('Could not load site.json', e);
    return;
  }

  // Load all session JSONs in parallel
  const sessionLoads = SITE.sessions.map(async (entry) => {
    try {
      const res = await fetch(entry.file + '?t=' + Date.now());
      const data = await res.json();
      SESSIONS[data.id] = data;
    } catch (e) {
      console.warn(`Could not load ${entry.file}`, e);
    }
  });

  // Load projects JSON
  const projectLoad = (async () => {
    try {
      const res = await fetch(SITE.projects_file + '?t=' + Date.now());
      const data = await res.json();
      PROJECTS = data.projects || [];
    } catch (e) {
      console.warn('Could not load projects.json', e);
    }
  })();

  await Promise.all([...sessionLoads, projectLoad]);

  renderHome();
  renderSessionsList();
  renderProjects();
  renderLeaderboard();
  renderAbout();

  // Handle initial load based on hash
  let pageName = 'home';
  if (window.location.hash) {
      pageName = window.location.hash.substring(1);
  }
  const validPages = ['home', 'sessions', 'projects', 'whiteboard', 'live-quiz', 'about', 'session-detail'];
  
  if (validPages.includes(pageName)) {
    showPage(pageName);
  } else {
    showPage('home');
  }
}

// =============================================
//  HISTORY NAV (Back/Forward)
// =============================================
window.addEventListener('popstate', () => {
  let pageName = 'home';
  if (window.location.hash) {
      pageName = window.location.hash.substring(1);
  }
  const validPages = ['home', 'sessions', 'projects', 'whiteboard', 'live-quiz', 'about', 'session-detail'];
  
  if (validPages.includes(pageName)) {
    showPage(pageName);
  } else {
    showPage('home');
  }
});

// =============================================
//  KEYBOARD NAV (Lightbox only)
// =============================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// =============================================
//  NAVBAR SCROLL
// =============================================
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.background =
    window.scrollY > 20 ? 'rgba(13,15,26,0.98)' : 'rgba(13,15,26,0.9)';
});

// =============================================
//  BOOT
// =============================================
document.addEventListener('DOMContentLoaded', init);
