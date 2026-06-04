// =============================================
//  ABOUT
// =============================================
function renderAbout() {
  if (!SITE) return;
  const grid = document.getElementById('cultureGrid');
  if (grid) {
    grid.innerHTML = SITE.lab_culture.map(c => `
    <div class="culture-card">
      <div style="font-size:1.5rem;margin-bottom:8px">${c.icon}</div>
      <h4>${c.title}</h4>
      <p>${c.desc}</p>
    </div>`).join('');
  }
}

//about
