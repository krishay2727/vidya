// =============================================
//  PROJECTS GALLERY
// =============================================

let currentProjectFilter = 'all';
let currentProjectStatus = 'all';
let tagsInitialized = false;

function initProjectFilters() {
  if (tagsInitialized || !PROJECTS) return;
  const tagSet = new Set();
  PROJECTS.forEach(p => {
    if (p.tags) p.tags.forEach(t => tagSet.add(t));
  });
  const filtersContainer = document.getElementById('projectsTagFilters');
  if (filtersContainer) {
    let html = `<button class="filter-pill active" data-filter="all" onclick="setProjectFilter('all', this)">All</button>`;
    Array.from(tagSet).sort().forEach(tag => {
      html += `<button class="filter-pill" data-filter="${tag}" onclick="setProjectFilter('${tag}', this)">${tag}</button>`;
    });
    filtersContainer.innerHTML = html;
  }
  tagsInitialized = true;
}

function renderProjects() {
  initProjectFilters();
  const grid = document.getElementById('projectsGrid');
  const countEl = document.getElementById('projectsCount');
  if (!grid) return;

  if (!PROJECTS || !PROJECTS.length) {
    grid.innerHTML = `<div class="projects-empty">
      <div class="projects-empty-icon">📂</div>
      <h3>No Projects Found</h3>
      <p>Projects are still loading or none exist yet.</p>
    </div>`;
    if (countEl) countEl.textContent = '0 Projects';
    return;
  }

  const searchInput = document.getElementById('projectSearchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = PROJECTS.filter(p => {
    // Search match
    const matchesSearch = searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm) ||
      (p.desc && p.desc.toLowerCase().includes(searchTerm));

    // Tag match
    const matchesTag = currentProjectFilter === 'all' || (p.tags && p.tags.includes(currentProjectFilter));

    // Status match
    const matchesStatus = currentProjectStatus === 'all' || p.status === currentProjectStatus;

    return matchesSearch && matchesTag && matchesStatus;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} Project${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="projects-empty">
      <div class="projects-empty-icon">🔍</div>
      <h3>No Matches</h3>
      <p>Try adjusting your filters or search term.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="project-card" onclick="openProject('${p.id}')">
      <div class="project-img-wrap">
        <img src="${p.image || ''}" alt="${p.title}"
          onerror="this.src='icons/vidya-logo.png'; this.classList.add('fallback-img')"
          class="project-img" />
        <div class="project-img-overlay"></div>
        <div class="project-card-status status-${(p.status || 'Available').replace(' ', '-')}">${p.status || 'Available'}</div>
      </div>
      
      <div class="project-body">
        <div class="project-body-top">
          <span class="project-level level-${p.level || 'Beginner'}">${p.level || 'Beginner'}</span>
        </div>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        
        <div class="project-tags">
          ${(p.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
          ${p.tags?.length > 3 ? `<span class="tag">+${p.tags.length - 3}</span>` : ''}
        </div>
        
        <div class="project-difficulty-wrap">
          <span class="project-difficulty-label">Diff</span>
          <div class="project-difficulty-bars">
            ${[1, 2, 3, 4, 5].map(n => `<div class="difficulty-bar ${n <= (p.difficulty || 1) ? 'filled' : ''}" style="--bar-color: ${p.color || 'var(--orange)'}"></div>`).join('')}
          </div>
        </div>
      </div>
      
      <div class="project-card-footer">
        <div class="project-card-meta">
          <span>📅 Session ${p.session || '?'}</span>
        </div>
        <button class="project-card-open" style="background-color: ${p.color || 'var(--orange)'};" onclick="event.stopPropagation();openProject('${p.id}')">Open ↗</button>
      </div>
    </div>
  `).join('');
}

function setProjectFilter(level, btn) {
  currentProjectFilter = level;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjects();
}

function setStatusFilter(status, btn) {
  currentProjectStatus = status;
  document.querySelectorAll('.status-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjects();
}

function filterProjects() {
  renderProjects();
}

// =============================================
//  PROJECT DETAIL
// =============================================

function openProject(id) {
  currentProject = PROJECTS.find(p => p.id === id);
  if (!currentProject) return;
  renderProjectDetail();
  showPage('project-detail');
}

function renderProjectDetail() {
  const p = currentProject;
  const container = document.getElementById('projectDetailContent');
  if (!container) return;

  const files3dCount = p.files3d?.length || 0;
  const codeCount = p.codeFiles?.length || 0;
  const videoCount = (p.youtubeVideos?.length || 0) + (p.dataVideos?.length || 0);
  const imgCount = p.gallery?.length || 0;
  const resCount = p.resources?.length || 0;

  container.innerHTML = `
    <!-- Header -->
    <div class="pd-header">
      <button class="pd-back" onclick="showPage('projects')">← Back to Projects</button>
      
      <div class="pd-hero-row">
        <div class="pd-hero-image-wrap">
          <img src="${p.image || ''}" alt="${p.title}" class="pd-hero-image"
               onerror="this.src='icons/vidya-logo.png'; this.classList.add('fallback-img')" />
        </div>
        
        <div class="pd-hero-info">
          <span class="pd-level-badge level-${p.level || 'Beginner'}">${p.level || 'Beginner'}</span>
          <h1 class="pd-title" style="--project-color: ${p.color || 'var(--orange)'}">${p.title}</h1>
          <p class="pd-subtitle">${p.desc}</p>
          
          <div class="pd-meta-row">
            <span class="pd-meta-chip">📅 Session ${p.session || '?'}</span>
            <span class="pd-meta-chip">👤 Contributor: ${p.author || 'Tinkering Lab'}</span>
            <span class="pd-meta-chip">🕒 Updated ${p.date || 'Unknown'}</span>
            <span class="project-card-status status-${(p.status || 'Available').replace(' ', '-')}">${p.status || 'Available'}</span>
          </div>
          
          ${p.liveUrl ? `<div style="margin-top: 15px;"><a href="${p.liveUrl}" target="_blank" class="btn-primary" style="display:inline-block; text-decoration:none; background-color:${p.color || 'var(--orange)'}">🚀 Launch Live Project</a></div>` : ''}
          
          <div class="pd-tags">
            ${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Nav -->
    <div class="pd-tabs-container">
      <div class="pd-tabs">
        <button class="pd-tab active" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('overview', this)">📋 Overview</button>
        ${files3dCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('3d', this)">🖨️ 3D Files (${files3dCount})</button>` : ''}
        ${codeCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('code', this)">💻 Code (${codeCount})</button>` : ''}
        ${videoCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('videos', this)">🎬 Videos (${videoCount})</button>` : ''}
        ${imgCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('gallery', this)">🖼️ Gallery (${imgCount})</button>` : ''}
        ${resCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('resources', this)">🔗 Resources (${resCount})</button>` : ''}
      </div>
    </div>

    <!-- Overview Tab -->
    <div id="ptab-overview" class="pd-tab-content active">
      <div class="pd-overview-grid">
        <div class="pd-overview-desc" style="--project-color: ${p.color || 'var(--orange)'}">
          ${p.fullDesc ? p.fullDesc.replace(/\\n/g, '<br>') : p.desc}
        </div>
        
        <div class="pd-components-panel">
          <h3 class="pd-panel-title"><span style="color: ${p.color || 'var(--orange)'}">🛒</span> Components</h3>
          <div class="pd-component-list">
            ${(p.components || []).length > 0 ?
      p.components.map(c => `
                <div class="pd-component-item">
                  <div class="pd-component-dot" style="--project-color: ${p.color || 'var(--orange)'}"></div>
                  ${c}
                </div>
              `).join('') : '<p class="text-muted">No components listed yet.</p>'}
          </div>
        </div>
        
        <div class="pd-skills-panel">
          <h3 class="pd-panel-title"><span style="color: var(--cyan)">⚡</span> Step-by-Step Guide</h3>
          <div class="pd-guide-list">
            ${(p.guide || []).length > 0 ?
              '<ol class="pd-guide-ol">' + p.guide.map(s => `<li>${s}</li>`).join('') + '</ol>' :
              '<p class="text-muted">No step-by-step guide available.</p>'}
          </div>
        </div>
        
        <div class="pd-difficulty-meter">
          <span class="pd-difficulty-label">DIFFICULTY</span>
          <div class="pd-difficulty-bars">
            ${[1, 2, 3, 4, 5].map(n => `<div class="pd-diff-bar ${n <= (p.difficulty || 1) ? 'filled' : ''}" style="--bar-color: ${p.color || 'var(--orange)'}"></div>`).join('')}
          </div>
          <span class="pd-difficulty-text">${p.difficulty || 1} / 5</span>
        </div>
      </div>
    </div>

    <!-- 3D Files Tab -->
    <div id="ptab-3d" class="pd-tab-content">
      ${files3dCount === 0 ? renderProjectEmptyState('🖨️', 'No 3D Files Yet', '3D printable files will appear here.') : `
        <div class="pd-files-grid">
          ${p.files3d.map(f => `
            <div class="pd-file-card">
              <div class="pd-file-icon">🖨️</div>
              <div class="pd-file-info">
                <div class="pd-file-name" title="${f.name}">${f.name}</div>
                <div class="pd-file-size">${f.size || 'Unknown Size'}</div>
              </div>
              <a href="${f.url}" target="_blank" class="pd-file-download" title="Download">⬇️</a>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Code Tab -->
    <div id="ptab-code" class="pd-tab-content">
      ${codeCount === 0 ? renderProjectEmptyState('💻', 'No Code Files Yet', 'Arduino sketches and scripts will appear here.') : `
        <div class="pd-code-list">
          ${p.codeFiles.map(c => `
            <div class="pd-code-card">
              <div class="pd-code-icon">📝</div>
              <div class="pd-code-info">
                <div class="pd-code-name">${c.name}</div>
                <div>
                  ${c.language ? `<span class="pd-code-lang">${c.language}</span>` : ''}
                  <span class="pd-code-desc">${c.desc || ''}</span>
                </div>
              </div>
              <a href="${c.url}" target="_blank" class="pd-code-download" title="Download Code">⬇️</a>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Videos Tab -->
    <div id="ptab-videos" class="pd-tab-content">
      ${videoCount === 0 ? renderProjectEmptyState('🎬', 'No Videos Yet', 'Tutorial and assembly videos will appear here.') : `
        ${p.youtubeVideos?.length > 0 ? `
          <h3 class="pd-videos-section-title">📺 YouTube Guides</h3>
          <div class="pd-videos-grid">
            ${p.youtubeVideos.map(v => `
              <div class="pd-video-card">
                <div class="pd-video-thumb">
                  <iframe src="https://www.youtube.com/embed/${v.videoId}" allowfullscreen loading="lazy"></iframe>
                </div>
                <div class="pd-video-info">
                  <div class="pd-video-title">${v.title || 'Video'}</div>
                  <div class="pd-video-desc">${v.desc || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${p.dataVideos?.length > 0 ? `
          <h3 class="pd-videos-section-title">📂 Local Videos</h3>
          <div class="pd-videos-grid">
            ${p.dataVideos.map(v => `
              <div class="pd-video-card">
                <div class="pd-video-thumb">
                  <video src="${v.url}" controls preload="metadata"></video>
                </div>
                <div class="pd-video-info">
                  <div class="pd-video-title">${v.name || 'Local Video'}</div>
                  <div class="pd-video-desc">${v.desc || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `}
    </div>

    <!-- Gallery Tab -->
    <div id="ptab-gallery" class="pd-tab-content">
      ${imgCount === 0 ? renderProjectEmptyState('🖼️', 'No Gallery Images Yet', 'Photos of the project will appear here.') : `
        <div class="gallery-grid">
          ${p.gallery.map((img, i) => `
            <div class="gallery-item" onclick="openProjectLightbox(${i})">
              <div class="gallery-img-wrap">
                <img src="${img.file}" alt="${img.caption || ''}" class="gallery-img" loading="lazy" 
                  onerror="this.parentElement.innerHTML='<div class=\\'gallery-img-missing\\'><span>🖼️</span><small>Missing Image</small></div>'" />
                <div class="gallery-overlay"><span class="gallery-zoom">🔍</span></div>
              </div>
              <div class="gallery-caption">
                ${img.category ? `<span class="gallery-cat-badge">${img.category}</span>` : ''}
                <p>${img.caption || ''}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Resources Tab -->
    <div id="ptab-resources" class="pd-tab-content">
      ${resCount === 0 ? renderProjectEmptyState('🔗', 'No Resources Yet', 'Datasheets and external links will appear here.') : `
        <div class="pd-resources-list">
          ${p.resources.map(r => `
            <a href="${r.url}" target="_blank" class="pd-resource-card">
              <span class="pd-resource-icon">${r.icon || '🔗'}</span>
              <span class="pd-resource-title">${r.title}</span>
              <span class="pd-resource-arrow">→</span>
            </a>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderProjectEmptyState(icon, title, desc) {
  return `
    <div class="pd-placeholder">
      <div class="pd-placeholder-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  `;
}

function switchProjectTab(name, btn) {
  document.querySelectorAll('.pd-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));

  const tab = document.getElementById('ptab-' + name);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
}

// Project Lightbox (Reusing existing lightbox container from sessions if possible, or handling uniquely)
function openProjectLightbox(idx) {
  const p = currentProject;
  if (!p || !p.gallery || !p.gallery.length) return;

  lightboxIndex = idx; // using global from session.js
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  lb.style.display = 'flex';
  updateProjectLightbox(p.gallery);
}

function updateProjectLightbox(gallery) {
  const img = gallery[lightboxIndex];
  const imgEl = document.getElementById('lightboxImg');
  const capEl = document.getElementById('lightboxCaption');
  const cntEl = document.getElementById('lightboxCounter');

  if (imgEl) imgEl.src = img.file;
  if (capEl) capEl.textContent = img.caption || '';
  if (cntEl) cntEl.textContent = `${lightboxIndex + 1} / ${gallery.length}`;

  // Override lightbox nav for project gallery context
  document.querySelector('.lightbox-prev').onclick = () => projectLightboxNav(-1);
  document.querySelector('.lightbox-next').onclick = () => projectLightboxNav(1);
}

function projectLightboxNav(dir) {
  const p = currentProject;
  if (!p || !p.gallery) return;
  lightboxIndex = (lightboxIndex + dir + p.gallery.length) % p.gallery.length;
  updateProjectLightbox(p.gallery);
}
