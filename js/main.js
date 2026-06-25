// =============================================
//  BOOTSTRAP — load all JSON files
// =============================================
async function init() {
  try {
    const siteRes = await fetch('site.json');
    globalThis.SITE = await siteRes.json();
  } catch (e) {
    console.error('Could not load site.json', e);
    return;
  }

  // Load all session JSONs in parallel (grade-grouped structure)
  const allSessionPaths = [];
  if (SITE.sessions && typeof SITE.sessions === 'object' && !Array.isArray(SITE.sessions)) {
    for (const [grade, paths] of Object.entries(SITE.sessions)) {
      if (Array.isArray(paths)) {
        for (const path of paths) {
          allSessionPaths.push({ grade, path });
        }
      }
    }
  }

  const sessionLoads = allSessionPaths.map(async ({ grade, path }) => {
    try {
      const res = await fetch(path);
      if (!res.ok) return;                  // skip missing files silently
      const data = await res.json();

      // Parse grade and session number from path/filename to guarantee uniqueness
      // e.g. "sessions/grade-1/3session.json" -> grade = "grade-1", number = 3
      const match = path.match(/sessions\/(grade-\d+)\/(\d+)session\.json/i);
      let sessionGrade = grade;
      let sessionNum = data.number;
      if (match) {
        sessionGrade = match[1];
        sessionNum = Number.parseInt(match[2]);
      }

      data.id = `${sessionGrade}-session-${sessionNum}`;
      data.number = sessionNum;
      data._grade = sessionGrade;                  // tag which grade it belongs to

      SESSIONS[data.id] = data;
    } catch (e) {
      console.warn(`Could not load ${path}`, e);
    }
  });

  // Load projects index and individual files
  const projectLoad = (async () => {
    try {
      const res = await fetch(SITE.projects_file);
      const indexData = await res.json();
      const projectPaths = indexData.projects || [];
      
      const projectFetches = projectPaths.map(async (path) => {
        try {
          const pRes = await fetch(path);
          if (pRes.ok) {
            const pData = await pRes.json();
            PROJECTS.push(pData);
          }
        } catch (err) {
          console.warn(`Could not load project file: ${path}`, err);
        }
      });
      
      await Promise.all(projectFetches);
    } catch (e) {
      console.warn('Could not load projects index', e);
    }
  })();

  await Promise.all([...sessionLoads, projectLoad]);

  // Sort successfully loaded sessions and reconstruct SITE.sessions array for backward compatibility
  const loadedSessions = Object.values(SESSIONS).sort((a, b) => {
    const gA = Number.parseInt(a._grade.replace('grade-', '')) || 0;
    const gB = Number.parseInt(b._grade.replace('grade-', '')) || 0;
    if (gA !== gB) return gA - gB;
    return a.number - b.number;
  });

  SITE.sessions = loadedSessions.map(s => ({
    id: s.id,
    number: s.number,
    file: `sessions/${s._grade}/${s.number}session.json`
  }));

  renderHome();
  renderSessionsList();
  renderProjects();
  renderLeaderboard();
  renderAbout();

  // Handle initial load based on path or redirect
  const urlParams = new URLSearchParams(globalThis.location.search);
  const redirectPage = urlParams.get('p');
  let targetPage = 'home';
  let targetParam = null;
  const validPages = new Set(['home', 'sessions', 'projects', 'whiteboard', 'live-quiz', 'about', 'session-detail', 'project-detail']);

  if (redirectPage) {
    const base = globalThis.BASE_PATH || '/';
    // Check if the redirect is a project deep link like "project/weather-station"
    const projectMatch = /^project\/(.+)$/.exec(redirectPage);
    if (projectMatch) {
      targetPage = 'project-detail';
      targetParam = decodeURIComponent(projectMatch[1]);
      globalThis.history.replaceState(null, null, base + 'project/' + encodeURIComponent(targetParam));
    } else if (validPages.has(redirectPage)) {
      targetPage = redirectPage;
      // Clean up the URL in history (removes ?p=live-quiz)
      globalThis.history.replaceState(null, null, base + redirectPage);
    }
  } else {
    const pathSegments = globalThis.location.pathname.split('/').filter(Boolean);
    // Filter out the repo name (e.g. "vidya") from the path segments
    const repoIndex = pathSegments.indexOf('vidya');
    const routeSegments = repoIndex >= 0 ? pathSegments.slice(repoIndex + 1) : pathSegments;

    if (routeSegments.length >= 2 && routeSegments.at(-2) === 'project') {
      targetPage = 'project-detail';
      targetParam = decodeURIComponent(routeSegments.at(-1));
    } else {
      const pathSegment = routeSegments.pop();
      if (pathSegment && validPages.has(pathSegment) && pathSegment !== 'VIDYA') {
        targetPage = pathSegment;
      }
    }
  }

  if (targetPage === 'project-detail' && targetParam) {
    currentProject = PROJECTS.find(p => p.id === targetParam);
    if (currentProject) {
      showPage(targetPage, targetParam);
      return;
    } else {
      targetPage = 'projects';
    }
  }

  showPage(targetPage);
}

// =============================================
//  HISTORY NAV (Back/Forward)
// =============================================
globalThis.addEventListener('popstate', () => {
  const pathSegments = globalThis.location.pathname.split('/').filter(Boolean);
  const validPages = ['home', 'sessions', 'projects', 'whiteboard', 'live-quiz', 'about', 'session-detail', 'project-detail'];

  // Filter out the repo name (e.g. "vidya") from the path segments
  const repoIndex = pathSegments.indexOf('vidya');
  const routeSegments = repoIndex >= 0 ? pathSegments.slice(repoIndex + 1) : pathSegments;

  if (routeSegments.length >= 2 && routeSegments.at(-2) === 'project') {
    const targetParam = decodeURIComponent(routeSegments.at(-1));
    currentProject = PROJECTS.find(p => p.id === targetParam);
    if (currentProject) {
      showPage('project-detail', targetParam);
      return;
    }
  }

  const pathSegment = routeSegments.pop();
  if (pathSegment && validPages.includes(pathSegment) && pathSegment !== 'VIDYA') {
    showPage(pathSegment);
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
