// =============================================
//  PROJECTS
// =============================================
function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  if (!PROJECTS.length) {
    grid.innerHTML = `<div style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">
    Loading projects…</div>`;
    return;
  }
  grid.innerHTML = PROJECTS.map(p => `
  <div class="project-card">
    <div class="project-img-wrap">
      <img src="${p.image || ''}" alt="${p.title}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        onload="this.nextElementSibling.style.display='none'"
        class="project-img" />
      <div class="project-img-placeholder" style="display:flex">
        <span style="font-size:3rem">${p.icon}</span>
      </div>
    </div>
    <div class="project-body">
      <span class="project-level level-${p.level}">${p.level}</span>
      <span class="project-status status-${p.status.replace(' ', '-')}">${p.status}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <div class="project-components">
        ${(p.components || []).slice(0, 3).map(c => `<span class="tag">${c}</span>`).join('')}
        ${p.components?.length > 3 ? `<span class="tag">+${p.components.length - 3} more</span>` : ''}
      </div>
    </div>
  </div>`).join('');
}
