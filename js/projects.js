// =============================================
//  PROJECTS GALLERY
// =============================================

let tagsInitialized = false;

function initProjectFilters() {
  if (tagsInitialized || !PROJECTS) return;
  const mcSet = new Set();
  const compSet = new Set();
  
  PROJECTS.forEach(p => {
    if (p.hardwareSpecs && p.hardwareSpecs.microcontroller) {
      mcSet.add(p.hardwareSpecs.microcontroller);
    }
    if (p.componentRefs) {
      p.componentRefs.forEach(c => compSet.add(c));
    }
  });

  const mcSelect = document.getElementById('filterMicrocontroller');
  if (mcSelect) {
    Array.from(mcSet).sort().forEach(mc => {
      mcSelect.innerHTML += `<option value="${mc}">${mc}</option>`;
    });
  }

  const compSelect = document.getElementById('filterComponent');
  if (compSelect) {
    Array.from(compSet).sort().forEach(c => {
      compSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
  }
  
  tagsInitialized = true;
}

function renderProjects() {
  initProjectFilters();
  const grid = document.getElementById('projectsGrid');
  const countEl = document.getElementById('projectsCount');
  if (!grid) return;

  if (!PROJECTS || !PROJECTS.length) {
    grid.innerHTML = `<div class="projects-empty"><div class="projects-empty-icon">📂</div><h3>No Projects Found</h3></div>`;
    if (countEl) countEl.textContent = '0 Projects';
    return;
  }

  const searchInput = document.getElementById('projectSearchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const diffSelect = document.getElementById('filterDifficulty');
  const diffVal = diffSelect ? diffSelect.value : 'all';
  
  const mcSelect = document.getElementById('filterMicrocontroller');
  const mcVal = mcSelect ? mcSelect.value : 'all';
  
  const compSelect = document.getElementById('filterComponent');
  const compVal = compSelect ? compSelect.value : 'all';

  let filtered = PROJECTS.filter(p => {
    // Search match
    const searchString = `${p.id} ${p.title} ${p.subtitle || ''} ${p.desc || ''} ${p.fullDesc || ''}`.toLowerCase();
    const matchesSearch = searchTerm === '' || searchString.includes(searchTerm);

    const matchesDiff = diffVal === 'all' || p.difficulty == diffVal;
    
    const matchesMc = mcVal === 'all' || (p.hardwareSpecs && p.hardwareSpecs.microcontroller === mcVal);
    
    const matchesComp = compVal === 'all' || (p.componentRefs && p.componentRefs.includes(compVal));

    return matchesSearch && matchesDiff && matchesMc && matchesComp;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} Project${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="projects-empty"><div class="projects-empty-icon">🔍</div><h3>No Matches</h3><p>Try adjusting your filters or search term.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="project-card" onclick="openProject('${p.id}')" style="--card-glow: ${p.color || 'var(--orange)'}33">
      <div class="project-img-wrap">
        <img src="${p.image || ''}" alt="${p.title}" onerror="this.src='icons/vidya-logo.png'; this.classList.add('fallback-img')" class="project-img" />
        <div class="project-img-overlay"></div>
      </div>
      
      <div class="project-body">
        <div class="project-body-top">
          <span class="project-level level-${p.level || 'Beginner'}">${p.level || 'Beginner'}</span>
        </div>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        
        <div class="project-difficulty-wrap">
          <span class="project-difficulty-label">Diff</span>
          <div class="project-difficulty-bars">
            ${[1, 2, 3, 4, 5].map(n => `<div class="difficulty-bar ${n <= (p.difficulty || 1) ? 'filled' : ''}" style="--bar-color: ${p.color || 'var(--orange)'}"></div>`).join('')}
          </div>
        </div>
      </div>
      
      <div class="project-card-footer">
        <div class="project-card-meta">
        </div>
        <button class="project-card-open" style="background-color: ${p.color || 'var(--orange)'};" onclick="event.stopPropagation();openProject('${p.id}')">Open ↗</button>
      </div>
    </div>
  `).join('');
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
  
  const hasResearch = !!p.researchPaper;
  const hasCircuit = !!p.circuitDiagram;
  const hasComponents = (p.componentRefs && p.componentRefs.length > 0) || (p.components && p.components.length > 0);
  const hasAchievements = p.achievements && p.achievements.length > 0;
  const hasPresentationTab = hasPoster || hasResearch || hasCircuit || ytVideoCount > 0;
  
  // Custom slider for weather station or general
  const isWeatherStation = p.id === 'weather-station';
  const slideImages = isWeatherStation && p.gallery && p.gallery.length > 0 
    ? p.gallery.map(g => g.file) 
    : [p.bannerImage || p.image || ''];

  const bannerContent = (isWeatherStation && slideImages.length > 1) ? `
    <div class="ws-slider" id="wsSliderTrack" style="position:absolute; top:0; left:0; width:${slideImages.length * 100}%; height:100%; display:flex; transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94);">
        ${slideImages.map((src, i) => `
          <div style="width:${100 / slideImages.length}%; height:100%; flex-shrink:0;">
            <img src="${src}" style="width:100%; height:100%; object-fit:cover; display:block;" />
          </div>
        `).join('')}
    </div>
    <button class="ws-slider-arrow ws-slider-prev" onclick="event.stopPropagation(); wsSliderNav(-1)" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); z-index:5; background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%; width:36px; height:36px; font-size:1.2rem; cursor:pointer; backdrop-filter:blur(4px); transition:background 0.2s;">❮</button>
    <button class="ws-slider-arrow ws-slider-next" onclick="event.stopPropagation(); wsSliderNav(1)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); z-index:5; background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%; width:36px; height:36px; font-size:1.2rem; cursor:pointer; backdrop-filter:blur(4px); transition:background 0.2s;">❯</button>
    <div class="ws-slider-dots" id="wsSliderDots" style="position:absolute; bottom:80px; left:50%; transform:translateX(-50%); z-index:5; display:flex; gap:8px;">
      ${slideImages.map((_, i) => `<span onclick="event.stopPropagation(); wsSliderGoTo(${i})" style="width:10px; height:10px; border-radius:50%; background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.4)'}; cursor:pointer; transition:background 0.3s;"></span>`).join('')}
    </div>
  ` : `<div style="background-image: url('${slideImages[0]}'); width:100%; height:100%; position:absolute; top:0; left:0; background-size:cover; background-position:center; opacity:0.6;"></div>`;

  container.innerHTML = `
    <!-- Header -->
    <div class="pd-header" style="position:relative; overflow:hidden;">
      <button class="pd-back" onclick="showPage('projects')" style="position:relative; z-index:10;">← Back to Projects</button>
      
      <div class="pd-banner" style="background: #000; position:relative;">
        ${bannerContent}
        <div class="pd-banner-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to top, #0d0f1a, transparent); z-index:1;"></div>
        <div class="pd-banner-content" style="z-index:2;">
          <h1 class="pd-banner-title" style="--project-color: ${p.color || 'var(--orange)'}">${p.title}</h1>
          
          <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="btn-primary" style="background: ${p.color || 'var(--orange)'}; border: none; box-shadow: 0 0 20px ${p.color || 'var(--orange)'}44; padding: 12px 24px; font-size: 0.95rem;">🚀 Launch Live Project</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" class="btn-outline" style="border-color: #fff; color: #fff; padding: 12px 24px; font-size: 0.95rem;">GitHub Repo ↗</a>` : ''}
            <div style="display: flex; gap: 12px; align-items: center;">
              <span class="pd-meta-chip">👤 ${p.author || 'Tinkering Lab'}</span>
              <span class="pd-meta-chip">🕒 ${p.date || 'Unknown'}</span>
              <div class="pd-difficulty-stars" style="color: ${p.color || 'var(--orange)'}; font-size: 1.2rem; margin-left: 4px;">
                ${'★'.repeat(p.difficulty || 1)}${'☆'.repeat(5 - (p.difficulty || 1))}
              </div>
            </div>
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
        ${hasAchievements ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('achievements', this)">🏆 Achievements</button>` : ''}
        ${files3dCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('3d', this)">🖨️ 3D (${files3dCount})</button>` : ''}
        ${codeCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('code', this)">💻 Code (${codeCount})</button>` : ''}
        ${dataVideoCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('videos', this)">🎬 Videos (${dataVideoCount})</button>` : ''}
        ${imgCount > 0 ? `<button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('gallery', this)">🖼️ Gallery (${imgCount})</button>` : ''}
        <button class="pd-tab" style="--project-color: ${p.color || 'var(--orange)'}" onclick="switchProjectTab('resources', this)">🔗 Resources & Components</button>
      </div>
    </div>

    <!-- Overview Tab -->
    <div id="ptab-overview" class="pd-tab-content active">
      <div class="pd-overview-grid">
        <div class="pd-overview-main">
          ${p.innovation ? `<div class="pd-innovation-quote" style="--project-color: ${p.color || 'var(--orange)'};">"${p.innovation}"</div>` : ''}
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
          ${p.fullDesc ? `<div style="margin-bottom: 32px; line-height: 1.7; color: var(--text-muted);">${p.fullDesc.replaceAll('\n', '<br>')}</div>` : (p.desc ? `<div style="margin-bottom: 32px; line-height: 1.7; color: var(--text-muted);">${p.desc}</div>` : '')}
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
        </div>
      </div>
    </div>
    
    <!-- Unified Presentation Tab -->
    <div id="ptab-presentation" class="pd-tab-content">
      <div style="max-width: 1000px; margin: 0 auto;">
        
        <!-- Square grid for poster, circuit, research -->
        <div class="presentation-grid">
          ${hasPoster ? `
            <div class="presentation-box" onclick="openFullscreenMedia('${p.poster}', 'img')">
              <div class="presentation-box-img">
                <img src="${p.poster}" alt="Poster" onerror="this.parentElement.innerHTML='<div class=\'pd-placeholder\' style=\'height:100%;\'>Image not found</div>'" />
              </div>
              <div class="presentation-box-label">
                <span class="presentation-box-icon">📊</span>
                <span>Poster</span>
              </div>
            </div>
          ` : ''}
          
          ${hasCircuit ? `
            <div class="presentation-box" onclick="openFullscreenMedia('${p.circuitDiagram}', 'img')">
              <div class="presentation-box-img">
                <img src="${p.circuitDiagram}" alt="Circuit Diagram" onerror="this.parentElement.innerHTML='<div class=\'pd-placeholder\' style=\'height:100%;\'>Image not found</div>'" />
              </div>
              <div class="presentation-box-label">
                <span class="presentation-box-icon">🔌</span>
                <span>Circuit Diagram</span>
              </div>
            </div>
          ` : ''}
          
          ${hasResearch ? `
            <div class="presentation-box" onclick="openFullscreenMedia('${p.researchPaper}', 'pdf')">
              <div class="presentation-box-img" style="background: #fff;">
                <iframe src="${p.researchPaper}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" style="width: 100%; height: 100%; border: none; pointer-events: none;" title="Research Paper"></iframe>
              </div>
              <div class="presentation-box-label">
                <span class="presentation-box-icon">🔬</span>
                <span>Research Paper</span>
                <a href="${p.researchPaper}" target="_blank" onclick="event.stopPropagation()" class="presentation-box-dl">↗</a>
              </div>
            </div>
          ` : ''}
        </div>
        
        ${ytVideoCount > 0 ? `
          <div style="margin-top: 32px;">
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
      </div>
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
          ${p.codeFiles.map((c, i) => `
            <div class="pd-code-card" style="display:block; width:100%; background: var(--surface); padding:20px; border-radius:12px; border:1px solid var(--border); margin-bottom: 24px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div class="pd-code-info">
                  <div class="pd-code-name" style="font-size: 1.2rem;">📝 ${c.name}</div>
                  <div>
                    ${c.language ? `<span class="pd-code-lang">${c.language}</span>` : ''}
                    <span class="pd-code-desc">${c.desc || ''}</span>
                  </div>
                </div>
                <a href="${c.url}" target="_blank" class="btn-primary" title="Download Code">⬇️ Download</a>
              </div>
              <div class="code-preview" id="code-preview-${i}" style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.9rem; max-height: 400px; overflow-y: auto;">
                Loading code...
              </div>
              <div style="text-align:center; margin-top:16px;">
                <a href="${c.url}" target="_blank" class="btn-outline" style="border-color: var(--border); color: var(--text);">⬇️ Download File</a>
              </div>
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

    <!-- Resources Tab (includes Components) -->
    <div id="ptab-resources" class="pd-tab-content">
      ${(resCount === 0 && !hasComponents) ? renderProjectEmptyState('🔗', 'No Resources or Components Yet', 'Datasheets and external links will appear here.') : ''}
      
      ${resCount > 0 ? `
        <h3 class="pd-panel-title" style="margin-bottom:24px;">🔗 External Links & Datasheets</h3>
        <div class="pd-resources-list">
          ${p.resources.map(r => `
            <a href="${r.url}" target="_blank" class="pd-resource-card">
              <span class="pd-resource-icon">${r.icon || '🔗'}</span>
              <span class="pd-resource-title">${r.title}</span>
              <span class="pd-resource-arrow">→</span>
            </a>
          `).join('')}
        </div>
      ` : ''}
      
      ${hasComponents ? `
        <h3 class="pd-panel-title" style="margin-top:40px; margin-bottom:24px;">🧩 Hardware Components</h3>
        <div id="components-loading" style="text-align:center; padding: 40px; color: var(--text-muted);">Loading component data...</div>
        <div id="components-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; display: none;"></div>
      ` : ''}
    </div>
  `;
  
  if (hasComponents) {
    loadComponentCards(p);
  }
  
  // Fetch code contents
  if (codeCount > 0) {
    p.codeFiles.forEach((c, i) => {
      fetch(c.url)
        .then(res => res.text())
        .then(text => {
          const el = document.getElementById('code-preview-' + i);
          if (el) el.textContent = text;
        })
        .catch(err => {
          const el = document.getElementById('code-preview-' + i);
          if (el) el.textContent = 'Error loading code preview.';
        });
    });
  }

  // Initialize Weather Station slider auto-play
  if (isWeatherStation && slideImages.length > 1) {
    window._wsSliderIndex = 0;
    window._wsSliderCount = slideImages.length;
    window._wsSliderInterval = setInterval(() => { wsSliderNav(1); }, 4000);
  }
}

// Lightbox for media (Poster, Circuit, PDF)
globalThis.openFullscreenMedia = function(url, type) {
  let modal = document.getElementById('mediaFullscreenModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mediaFullscreenModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column;';
    modal.innerHTML = `
      <div style="position:absolute; top:20px; right:20px; color:#fff; font-size:2rem; cursor:pointer; z-index:10001;" onclick="closeFullscreenMedia()">✕</div>
      <div id="mediaFullscreenContent" style="width:90%; height:90%; display:flex; align-items:center; justify-content:center; position:relative;"></div>
      <div style="color:var(--text-muted); font-size:0.9rem; margin-top:10px;">Press ESC to close</div>
    `;
    document.body.appendChild(modal);
    
    // Keydown event
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('mediaFullscreenModal').style.display === 'flex') {
        closeFullscreenMedia();
      }
    });
  }
  
  const content = document.getElementById('mediaFullscreenContent');
  if (type === 'img') {
    content.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />`;
  } else if (type === 'pdf') {
    content.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0&view=Fit" style="width:100%; height:100%; border:none; border-radius:8px; background:white;"></iframe>`;
  }
  
  modal.style.display = 'flex';
};

globalThis.closeFullscreenMedia = function() {
  const modal = document.getElementById('mediaFullscreenModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('mediaFullscreenContent').innerHTML = ''; // clear iframe
  }
};

// =============================================
//  WEATHER STATION SLIDER CONTROLS
// =============================================
globalThis._wsSliderIndex = 0;
globalThis._wsSliderCount = 0;

globalThis.wsSliderNav = function(dir) {
  const track = document.getElementById('wsSliderTrack');
  const dots = document.getElementById('wsSliderDots');
  if (!track) return;
  const count = window._wsSliderCount;
  if (count <= 1) return;
  window._wsSliderIndex = (window._wsSliderIndex + dir + count) % count;
  track.style.transform = `translateX(-${window._wsSliderIndex * (100 / count)}%)`;
  // Update dots
  if (dots) {
    Array.from(dots.children).forEach((dot, i) => {
      dot.style.background = i === window._wsSliderIndex ? '#fff' : 'rgba(255,255,255,0.4)';
    });
  }
  // Reset auto-slide timer
  if (window._wsSliderInterval) clearInterval(window._wsSliderInterval);
  window._wsSliderInterval = setInterval(() => { wsSliderNav(1); }, 4000);
};

globalThis.wsSliderGoTo = function(idx) {
  const track = document.getElementById('wsSliderTrack');
  const dots = document.getElementById('wsSliderDots');
  if (!track) return;
  const count = window._wsSliderCount;
  window._wsSliderIndex = idx;
  track.style.transform = `translateX(-${idx * (100 / count)}%)`;
  if (dots) {
    Array.from(dots.children).forEach((dot, i) => {
      dot.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.4)';
    });
  }
  if (window._wsSliderInterval) clearInterval(window._wsSliderInterval);
  window._wsSliderInterval = setInterval(() => { wsSliderNav(1); }, 4000);
};

// =============================================
//  LOAD COMPONENT CARDS (from data/components/)
// =============================================
async function loadComponentCards(project) {
  const loadingEl = document.getElementById('components-loading');
  const containerEl = document.getElementById('components-container');
  if (!containerEl) return;

  // Determine which component refs to load
  const refs = project.componentRefs || [];
  if (refs.length === 0 && project.components && project.components.length > 0) {
    // Fallback: just show a simple list if no componentRefs
    if (loadingEl) loadingEl.style.display = 'none';
    containerEl.style.display = 'grid';
    containerEl.innerHTML = project.components.map(c => `
      <div style="background: var(--surface); padding: 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">🔧</span>
        <span style="font-weight: 600;">${c}</span>
      </div>
    `).join('');
    return;
  }

  try {
    const componentData = await Promise.all(
      refs.map(async (refId) => {
        try {
          const res = await fetch(`data/components/${refId}.json`);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          console.warn('Could not load component:', refId, e);
          return null;
        }
      })
    );

    const validComponents = componentData.filter(Boolean);

    if (loadingEl) loadingEl.style.display = 'none';
    containerEl.style.display = 'grid';

    if (validComponents.length === 0) {
      containerEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); grid-column: 1/-1;">No component data found.</div>`;
      return;
    }

    containerEl.innerHTML = validComponents.map(comp => `
      <div class="component-card" style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${comp.color || '#FF6B35'}22, ${comp.color || '#FF6B35'}08); padding: 20px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${comp.image ? `<img src="${comp.image}" alt="${comp.name}" style="width: 64px; height: 64px; border-radius: 12px; object-fit: cover; border: 2px solid ${comp.color || 'var(--border)'};" onerror="this.style.display='none'" />` : ''}
            <div>
              <div style="font-size: 0.75rem; color: ${comp.color || 'var(--orange)'}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${comp.category || 'Component'}</div>
              <h4 style="margin: 4px 0 0; font-size: 1.2rem;">${comp.fullName || comp.name}</h4>
            </div>
          </div>
          ${comp.tagline ? `<p style="margin-top: 12px; font-size: 0.9rem; color: var(--text-muted); line-height: 1.5;">${comp.tagline}</p>` : ''}
        </div>

        <div style="padding: 20px;">
          <!-- Description -->
          ${comp.description ? `<p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">${comp.description}</p>` : ''}

          <!-- Specs Table -->
          ${comp.specs ? `
            <div style="margin-bottom: 20px;">
              <h5 style="font-size: 0.85rem; color: ${comp.color || 'var(--orange)'}; margin-bottom: 10px;">⚙️ Specifications</h5>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                ${Object.entries(comp.specs).map(([key, val]) => `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid var(--border); color: var(--text-muted); text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid var(--border); text-align: right; color: var(--text); font-weight: 500;">${val}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}

          <!-- Pinout -->
          ${comp.pinout && comp.pinout.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h5 style="font-size: 0.85rem; color: ${comp.color || 'var(--orange)'}; margin-bottom: 10px;">📌 Pinout</h5>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${comp.pinout.map(pin => `
                  <div style="display: flex; align-items: center; gap: 10px; background: var(--surface2); padding: 8px 12px; border-radius: 8px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${pin.color || '#888'}; flex-shrink: 0;"></div>
                    <span style="font-weight: 700; min-width: 50px; font-size: 0.85rem;">${pin.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${pin.desc}</span>
                  </div>
                `).join('')}
              </div>
              ${comp.wiringNote ? `<div style="margin-top: 10px; padding: 10px 14px; background: rgba(255, 200, 0, 0.1); border: 1px solid rgba(255, 200, 0, 0.3); border-radius: 8px; font-size: 0.85rem; color: #FFC800;">⚠️ ${comp.wiringNote}</div>` : ''}
            </div>
          ` : ''}

          <!-- Code Snippet -->
          ${comp.codeSnippet ? `
            <div style="margin-bottom: 20px;">
              <h5 style="font-size: 0.85rem; color: ${comp.color || 'var(--orange)'}; margin-bottom: 10px;">💻 Quick Start Code</h5>
              ${comp.libraryName ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">📦 Library: ${comp.libraryName}</div>` : ''}
              <pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.8rem; line-height: 1.5; max-height: 250px; overflow-y: auto;">${comp.codeSnippet.replace(/\\n/g, '\n')}</pre>
            </div>
          ` : ''}

          <!-- Common Mistakes -->
          ${comp.commonMistakes && comp.commonMistakes.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h5 style="font-size: 0.85rem; color: #FF4757; margin-bottom: 10px;">🚫 Common Mistakes</h5>
              <ul style="padding-left: 20px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.7;">
                ${comp.commonMistakes.map(m => `<li>${m}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Links -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${comp.datasheetUrl ? `<a href="${comp.datasheetUrl}" target="_blank" style="background: var(--surface2); color: var(--text); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='var(--surface2)'">📄 Datasheet</a>` : ''}
            ${comp.buyLink ? `<a href="${comp.buyLink}" target="_blank" style="background: ${comp.color || 'var(--orange)'}; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">🛒 Buy</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading component cards:', err);
    if (loadingEl) loadingEl.textContent = 'Failed to load component data.';
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
