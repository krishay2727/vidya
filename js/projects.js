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
    <div class="project-card" onclick="openProject('${p.id}')" style="--card-glow: ${p.color || 'var(--orange)'}33">
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
  showPage('project-detail', id);
}

async function renderProjectDetail() {
  const p = currentProject;
  const container = document.getElementById('projectDetailContent');
  if (!container) return;

  const files3dCount = p.files3d?.length || 0;
  const codeCount = p.codeFiles?.length || 0;
  const dataVideoCount = p.dataVideos?.length || 0;
  const ytVideoCount = p.youtubeVideos?.length || 0;
  const imgCount = p.gallery?.length || 0;
  const resCount = p.resources?.length || 0;
  
  const hasPdf = !!p.pdf;
  const hasPoster = !!p.poster;
  const hasPpt = !!p.ppt;
  const hasResearch = !!p.researchPaper;
  const hasCircuit = !!p.circuitDiagram;
  const hasComponents = (p.componentRefs && p.componentRefs.length > 0) || (p.components && p.components.length > 0);
  const hasAchievements = p.achievements && p.achievements.length > 0;
  const hasPresentationTab = hasPdf || hasPoster || hasPpt || hasResearch || hasCircuit || ytVideoCount > 0;

  container.innerHTML = `
    <!-- Header -->
    <div class="pd-header">
      <button class="pd-back" onclick="showPage('projects')">← Back to Projects</button>
      
      <div class="pd-banner" style="background-image: url('${p.bannerImage || p.image || ''}')">
        <div class="pd-banner-overlay"></div>
        <div class="pd-banner-content">
          <h1 class="pd-banner-title" style="--project-color: ${p.color || 'var(--orange)'}">${p.title}</h1>
          
          <div class="pd-meta-row">
            <span class="pd-meta-chip">📅 Session ${p.session || '?'}</span>
            <span class="pd-meta-chip">👤 ${p.author || 'Tinkering Lab'}</span>
            <span class="pd-meta-chip">🕒 ${p.date || 'Unknown'}</span>
            <span class="pd-status-badge status-${(p.status || 'Available').replace(' ', '-')}">${p.status || 'Available'}</span>
            <div class="pd-difficulty-stars" style="color: ${p.color || 'var(--orange)'}; font-size: 1.2rem;">
              ${'★'.repeat(p.difficulty || 1)}${'☆'.repeat(5 - (p.difficulty || 1))}
            </div>
          </div>
          
          <div style="margin-top: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="btn-primary" style="background: ${p.color || 'var(--orange)'}; border: none; box-shadow: none;">🚀 Launch Live Project</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" class="btn-outline" style="border-color: #fff; color: #fff;">GitHub Repo ↗</a>` : ''}
          </div>
        </div>
      </div>
      
      <div class="pd-team-section" style="margin-bottom: 32px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
        ${(p.team || []).length > 0 ? p.team.map(member => `
          <div class="pd-team-member" style="display: flex; align-items: center; gap: 10px;">
            <div class="pd-team-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid ${p.color || 'var(--orange)'};">${member.name.substring(0,2).toUpperCase()}</div>
            <div>
              <div style="font-weight: bold; font-size: 0.95rem;">${member.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${member.role}</div>
            </div>
          </div>
        `).join('') : ''}
      </div>
    </div>

    <!-- Tabs Nav -->
    <div class="pd-tabs-container">
      <div class="pd-tabs" style="overflow-x: auto; flex-wrap: nowrap; padding-bottom: 10px;">
        <button class="pd-tab active" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('overview', this)">📋 Overview</button>
        ${hasPresentationTab ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('presentation', this)">📑 Presentation</button>` : ''}
        ${hasComponents ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('components', this)">🧩 Components</button>` : ''}
        ${hasAchievements ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('achievements', this)">🏆 Achievements</button>` : ''}
        ${files3dCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('3d', this)">🖨️ 3D (${files3dCount})</button>` : ''}
        ${codeCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('code', this)">💻 Code (${codeCount})</button>` : ''}
        ${dataVideoCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('videos', this)">🎬 Videos (${dataVideoCount})</button>` : ''}
        ${imgCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('gallery', this)">🖼️ Gallery (${imgCount})</button>` : ''}
        ${resCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('resources', this)">🔗 Resources (${resCount})</button>` : ''}
      </div>
    </div>

    <!-- Overview Tab -->
    <div id="ptab-overview" class="pd-tab-content active">
      <div class="pd-overview-grid">
        
        <div class="pd-overview-main">
          ${p.innovation ? `
            <div class="pd-innovation-quote" style="--project-color: ${p.color || 'var(--orange)'};">
              "${p.innovation}"
            </div>
          ` : ''}
          
          ${p.problemStatement || p.solutionApproach ? `
            <div class="pd-problem-solution" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: stretch; margin-bottom: 32px;">
              <div class="pd-problem-card" style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); padding: 20px; border-radius: 12px;">
                <h4 style="color: #FF4757; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">⚠️ Problem</h4>
                <p style="font-size: 0.95rem;">${p.problemStatement || 'Not specified'}</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 1.5rem;">→</div>
              <div class="pd-solution-card" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); padding: 20px; border-radius: 12px;">
                <h4 style="color: #00FF88; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">✅ Solution</h4>
                <p style="font-size: 0.95rem;">${p.solutionApproach || 'Not specified'}</p>
              </div>
            </div>
          ` : ''}

          ${p.fullDesc ? `<div style="margin-bottom: 32px; line-height: 1.7; color: var(--text-muted);">${p.fullDesc.replace(/\n/g, '<br>')}</div>` : (p.desc ? `<div style="margin-bottom: 32px; line-height: 1.7; color: var(--text-muted);">${p.desc}</div>` : '')}

          ${(p.guide || []).length > 0 ? `
            <div class="pd-skills-panel" style="margin-bottom: 32px;">
              <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                ${p.estimatedTime ? `<span style="background: var(--surface2); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem;">⏱️ ${p.estimatedTime}</span>` : ''}
                ${(p.prerequisites || []).length > 0 ? `<span style="background: var(--surface2); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem;">📚 ${p.prerequisites.join(', ')}</span>` : ''}
              </div>
              <h3 class="pd-panel-title" style="margin-bottom: 24px;"><span style="color: var(--cyan)">⚡</span> Step-by-Step Guide</h3>
              <div class="pd-stepper" style="display: flex; flex-direction: column; gap: 0;">
                ${p.guide.map((step, i) => `
                  <div style="display: flex; gap: 16px; position: relative; padding-bottom: ${i === p.guide.length - 1 ? '0' : '24px'};">
                    ${i !== p.guide.length - 1 ? `<div style="position: absolute; left: 14px; top: 32px; bottom: 0; width: 2px; background: var(--surface2);"></div>` : ''}
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: ${p.color || 'var(--orange)'}; color: #000; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; z-index: 1;">${i+1}</div>
                    <div style="background: var(--surface); padding: 16px; border-radius: 12px; flex: 1; border: 1px solid var(--border); ${i === p.guide.length - 1 ? 'border-color: rgba(0,255,136,0.3); box-shadow: 0 0 10px rgba(0,255,136,0.1);' : ''}">
                      ${step} ${i === p.guide.length - 1 ? ' <div style="color: var(--green); font-weight: bold; margin-top: 8px;">✓ Done</div>' : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="pd-overview-sidebar">
          ${p.hardwareSpecs ? `
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h4 style="margin-bottom: 16px; color: ${p.color || 'var(--orange)'}; display: flex; align-items: center; gap: 8px;">⚙️ Hardware Specs</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                ${Object.entries(p.hardwareSpecs).map(([key, val]) => `
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid var(--border); color: var(--text-muted); text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid var(--border); text-align: right; color: var(--text);">${Array.isArray(val) ? val.join('<br>') : val}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          <div style="margin-bottom: 24px;">
            <h4 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🏷️ Tags</h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${(p.tags || []).map(t => `<span class="tag" style="background: var(--surface);">${t}</span>`).join('')}
            </div>
          </div>
        </div>

      </div>
    </div>
    
    <!-- Unified Presentation Tab -->
    <div id="ptab-presentation" class="pd-tab-content">
      <div style="display: flex; flex-direction: column; gap: 40px; max-width: 1000px; margin: 0 auto;">
        
        ${ytVideoCount > 0 ? `
          <div>
            <h3 class="pd-videos-section-title">📺 YouTube Guides</h3>
            <div class="pd-videos-grid" style="margin-bottom: 0;">
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
          </div>
        ` : ''}

        ${hasPoster ? `
          <div>
            <h3 class="pd-videos-section-title">📊 Poster</h3>
            <div style="background: var(--surface); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <img src="${p.poster}" alt="Poster" style="width: 100%; border-radius: 8px; display: block;" onerror="this.parentElement.innerHTML='<div class=\'pd-placeholder\'>Image not found</div>'" />
            </div>
          </div>
        ` : ''}
        
        ${hasCircuit ? `
          <div>
            <h3 class="pd-videos-section-title">🔌 Circuit Diagram</h3>
            <div style="background: var(--surface); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <img src="${p.circuitDiagram}" alt="Circuit Diagram" style="width: 100%; border-radius: 8px; display: block;" onerror="this.parentElement.innerHTML='<div class=\'pd-placeholder\'>Image not found</div>'" />
            </div>
          </div>
        ` : ''}

        ${hasPdf ? `
          <div>
            <h3 class="pd-videos-section-title">📄 PDF Guide</h3>
            <div class="slides-ppt" id="projectPdfWrap" style="position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); display: flex; flex-direction: column; height: 70vh; min-height: 500px; background: #f8fafc;">
              <div class="pdf-toolbar" style="background: var(--surface); padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                <span class="pdf-label" style="font-weight: 700; color: var(--text);">📄 Project PDF</span>
                <div style="display: flex; gap: 10px;">
                  <button onclick="toggleFullScreen(document.getElementById('projectPdfWrap'))" style="background: var(--orange); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                    ⛶ Full Screen
                  </button>
                  <a href="${p.pdf}" target="_blank" class="pdf-open-btn" style="text-decoration: none; background: var(--surface-alt); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; border: 1px solid var(--border);">Download ↗</a>
                </div>
              </div>
              <div style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: white;">
                 <iframe src="${p.pdf}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" style="width: 100%; height: 100%; border: none;" title="Project PDF"></iframe>
              </div>
            </div>
          </div>
        ` : ''}

        ${hasResearch ? `
          <div>
            <h3 class="pd-videos-section-title">🔬 Research Paper</h3>
            <div class="slides-ppt" style="position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); display: flex; flex-direction: column; height: 70vh; min-height: 500px; background: #f8fafc;">
              <div class="pdf-toolbar" style="background: var(--surface); padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <span class="pdf-label" style="font-weight: 700; color: var(--text);">🔬 Research</span>
                <a href="${p.researchPaper}" target="_blank" class="pdf-open-btn" style="text-decoration: none; background: var(--surface-alt); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; border: 1px solid var(--border);">Download ↗</a>
              </div>
              <iframe src="${p.researchPaper}#toolbar=0&view=Fit" style="flex:1; border: none;" title="Research Paper"></iframe>
            </div>
          </div>
        ` : ''}
        
        ${hasPpt ? `
          <div>
            <h3 class="pd-videos-section-title">📑 Presentation File</h3>
            <div style="background: var(--surface); border-radius: 12px; border: 1px solid var(--border); padding: 24px; text-align: center;">
               <a href="${p.ppt}" target="_blank" class="btn-primary" style="display: inline-block;">Download Presentation (.pptx)</a>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Components Tab -->
    <div id="ptab-components" class="pd-tab-content">
      <div id="components-loading" style="text-align:center; padding: 40px; color: var(--text-muted);">Loading component data...</div>
      <div id="components-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; display: none;"></div>
    </div>
    
    <!-- Achievements Tab -->
    <div id="ptab-achievements" class="pd-tab-content">
      ${hasAchievements ? `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${p.achievements.map(ach => `
            <div style="background: var(--surface); padding: 20px 24px; border-radius: 12px; border-left: 4px solid var(--yellow); display: flex; align-items: center; gap: 16px;">
              <span style="font-size: 2rem;">🏆</span>
              <span style="font-size: 1.1rem; font-weight: 600;">${ach}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
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

    <!-- Videos Tab (Local Only) -->
    <div id="ptab-videos" class="pd-tab-content">
      ${dataVideoCount === 0 ? renderProjectEmptyState('🎬', 'No Videos Yet', 'Local videos will appear here.') : `
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
                  onerror="this.parentElement.innerHTML='<div class=\'gallery-img-missing\'><span>🖼️</span><small>Missing Image</small></div>'" />
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
  
  if (hasComponents) {
    loadComponentCards(p);
  }
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
