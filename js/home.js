// =============================================
//  HOME PAGE
// =============================================
function renderHome() {
  if (!SITE) return;

  // STEAM grid
  const steamGrid = document.getElementById('steamGrid');
  if (steamGrid) {
    steamGrid.innerHTML = SITE.steam.map(s => `
      <div class="steam-card">
        <div class="steam-card-top" style="background:${s.color}">${s.letter}</div>
        <div class="steam-card-body"><h4>${s.name}</h4><p>${s.desc}</p></div>
      </div>`).join('');
  }

  // Sessions grid on home
  const homeGrid = document.getElementById('homeSessionsGrid');
  if (homeGrid) {
    const ordered = SITE.sessions.map(e => SESSIONS[e.id]).filter(Boolean);
    homeGrid.innerHTML = ordered.map(s => sessionCardHTML(s)).join('');
  }

  // Stat counter
  const statEl = document.getElementById('statSessions');
  if (statEl) statEl.textContent = SITE.sessions.length;

  // Roadmap
  const rmEl = document.getElementById('roadmapItems');
  if (rmEl) {
    rmEl.innerHTML = SITE.roadmap.map(p => `
      <div class="roadmap-item ${p.final ? 'roadmap-final' : ''}">
        <div class="roadmap-label-top">
          <div class="rm-num" style="color:${p.color}">${p.num}</div>
          <h4>${p.label}</h4>
        </div>
        <div class="roadmap-dot" style="--dot-color:${p.color}"></div>
        <div class="roadmap-label-bot"><p>${p.desc}</p></div>
      </div>`).join('');
  }

  // Tools grid
  const toolsGrid = document.getElementById('toolsGrid');
  if (toolsGrid) {
    toolsGrid.innerHTML = SITE.lab_tools.map(t => `
      <div class="tool-card">
        <div class="tool-icon">${t.icon}</div>
        <div class="tool-name">${t.name}</div>
        <div class="tool-role">${t.role}</div>
        <div class="tool-desc">${t.desc}</div>
      </div>`).join('');
  }
}
