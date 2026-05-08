// =============================================
//  VIDYA STEAM — app.js  (v2)
// =============================================

let SITE = null;          // site.json
let SESSIONS = {};        // { id: sessionData }
let PROJECTS = [];        // from projects.json
let currentSession = null;
let currentSlide = 0;
let inlineQuizState = {};

// =============================================
//  BOOTSTRAP — load all JSON files
// =============================================
async function init() {
  try {
    const siteRes = await fetch('site.json');
    SITE = await siteRes.json();
  } catch (e) {
    console.error('Could not load site.json', e);
    return;
  }

  // Load all session JSONs in parallel
  const sessionLoads = SITE.sessions.map(async (entry) => {
    try {
      const res = await fetch(entry.file);
      const data = await res.json();
      SESSIONS[data.id] = data;
    } catch (e) {
      console.warn(`Could not load ${entry.file}`, e);
    }
  });

  // Load projects JSON
  const projectLoad = (async () => {
    try {
      const res = await fetch(SITE.projects_file);
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
  showPage('home');
}

// =============================================
//  PAGE ROUTING
// =============================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.page === name)
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('navMobile').classList.toggle('open');
}

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

// =============================================
//  SESSIONS LIST
// =============================================
function renderSessionsList() {
  const grid = document.getElementById('sessionsListGrid');
  if (!grid || !SITE) return;
  const ordered = SITE.sessions.map(e => SESSIONS[e.id]).filter(Boolean);
  grid.innerHTML = ordered.map(s => sessionCardHTML(s)).join('');
}

function sessionCardHTML(s) {
  if (!s) return '';
  const slideCount = s.slides?.images?.length || 0;
  const imgCount   = s.images?.gallery?.length || 0;
  return `
    <div class="session-card" style="--card-color:${s.color}" onclick="openSession('${s.id}')">
      <div class="session-card-num">Session ${String(s.number).padStart(2,'0')} · ${s.phase}</div>
      <div class="session-card-icon">${s.icon}</div>
      <h3>${s.title}</h3>
      <p>${s.overview.substring(0,120)}…</p>
      <div class="session-card-tags">${(s.tags||[]).slice(0,4).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <div class="session-card-footer">
        <span class="session-card-meta">⏱ ${s.duration} · ${slideCount} Slides · ${imgCount} Photos</span>
        <button class="btn-sm" style="background:${s.color}" onclick="event.stopPropagation();openSession('${s.id}')">Open ↗</button>
      </div>
    </div>`;
}

// =============================================
//  SESSION DETAIL
// =============================================
function openSession(id) {
  currentSession = SESSIONS[id];
  if (!currentSession) return;
  currentSlide = 0;
  renderSessionDetail();
  showPage('session-detail');
}

function renderSessionDetail() {
  const s = currentSession;
  const container = document.getElementById('sessionDetailContent');
  if (!container) return;

  const slideCount = s.slides?.images?.length || 0;
  const imgCount   = s.images?.gallery?.length || 0;
  const hasPDF     = s.slides?.pdf;

  container.innerHTML = `
    <div class="session-detail-header">
      <div class="sd-back" onclick="showPage('sessions')">← Back to Sessions</div>
      <div class="sd-phase" style="color:${s.color}">Session ${String(s.number).padStart(2,'0')} · ${s.phase}</div>
      <h1 class="sd-title">${s.icon} ${s.title}</h1>
      <p class="sd-subtitle">${s.subtitle}</p>
      <div class="sd-meta-row">
        <span class="sd-meta-item">⏱ ${s.duration}</span>
        <span class="sd-meta-item">📅 ${s.date}</span>
        <span class="sd-meta-item">🗂 ${slideCount} Slides</span>
        <span class="sd-meta-item">🖼 ${imgCount} Photos</span>
        <span class="sd-meta-item">🧠 ${s.quiz.length} Quiz Qs</span>
        <span class="sd-meta-item">🎬 ${s.youtubeVideos.length} Videos</span>
      </div>
      <div class="sd-overview" style="border-color:${s.color}">${s.overview}</div>
    </div>

    <div class="sd-tabs" id="sdTabs">
      <button class="sd-tab active" onclick="switchTab('slides',this)">📊 Slides (${slideCount})</button>
      <button class="sd-tab" onclick="switchTab('topics',this)">📚 Key Topics</button>
      <button class="sd-tab" onclick="switchTab('videos',this)">🎬 Videos</button>
      <button class="sd-tab" onclick="switchTab('images',this)">🖼 Images (${imgCount})</button>
      <button class="sd-tab" onclick="switchTab('activity',this)">🔧 Activity</button>
      <button class="sd-tab" onclick="switchTab('resources',this)">🔗 Resources</button>
      <button class="sd-tab" onclick="switchTab('quiz',this)">🧠 Quiz</button>
    </div>

    <!-- SLIDES -->
    <div id="tab-slides" class="sd-tab-content active">
      ${renderSlidesTab(s)}
    </div>

    <!-- KEY TOPICS -->
    <div id="tab-topics" class="sd-tab-content">
      <div class="topics-list">
        ${(s.keyTopics||[]).map(t=>`
          <div class="topic-item">
            <div class="topic-bullet" style="background:${s.color}"></div>
            <span class="topic-text">${t}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- VIDEOS -->
    <div id="tab-videos" class="sd-tab-content">
      <div class="videos-grid">
        ${(s.youtubeVideos||[]).map(v=>`
          <div class="video-card">
            <div class="video-thumb">
              <iframe src="https://www.youtube.com/embed/${v.videoId}" allowfullscreen loading="lazy"></iframe>
            </div>
            <div class="video-info">
              <div class="video-title">${v.title}</div>
              <div class="video-desc">${v.desc}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- IMAGES GALLERY -->
    <div id="tab-images" class="sd-tab-content">
      ${renderImagesTab(s)}
    </div>

    <!-- ACTIVITY -->
    <div id="tab-activity" class="sd-tab-content">
      <h2 style="font-family:var(--font-head);font-size:1.5rem;font-weight:800;margin-bottom:24px;color:${s.color}">
        🔧 ${s.activity.title}
      </h2>
      <div class="activity-box">
        <div class="activity-panel">
          <h3>🛒 What You Need</h3>
          <div class="activity-parts">
            ${(s.activity.parts||[]).map(p=>`
              <div class="activity-part">
                <div class="activity-part-dot" style="background:${s.color}"></div>${p}
              </div>`).join('')}
          </div>
        </div>
        <div class="activity-panel">
          <h3>📋 Steps</h3>
          <div class="activity-steps">
            ${(s.activity.steps||[]).map((step,i)=>`
              <div class="activity-step">
                <div class="activity-step-num" style="background:${s.color}">${i+1}</div>
                <div class="activity-step-text">${step}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- RESOURCES -->
    <div id="tab-resources" class="sd-tab-content">
      <div class="resources-list">
        ${(s.resources||[]).map(r=>`
          <a href="${r.url}" target="_blank" class="resource-card">
            <span class="resource-icon">${r.icon}</span>
            <span class="resource-title">${r.title}</span>
            <span class="resource-arrow">→</span>
          </a>`).join('')}
      </div>
    </div>

    <!-- QUIZ -->
    <div id="tab-quiz" class="sd-tab-content">
      <div id="quizInline">${renderQuizStart(s)}</div>
    </div>
  `;
}

// =============================================
//  SLIDES TAB  (image-based + PDF fallback)
// =============================================
function renderSlidesTab(s) {
  const slides = s.slides?.images || [];
  const pdf    = s.slides?.pdf || null;

  // If no slides at all — placeholder
  if (slides.length === 0 && !pdf) {
    return `
      <div class="slides-placeholder">
        <div class="placeholder-icon">📊</div>
        <h3>Slides Coming Soon</h3>
        <p>Export your PPT slides as JPG images into<br>
           <code>sessions/${s.id}/slides/</code><br>
           named <code>slide-01.jpg, slide-02.jpg …</code><br>
           then add their paths to <code>session.json</code></p>
        <p style="margin-top:12px">Or place a <code>slides.pdf</code> in that folder.</p>
      </div>`;
  }

  // PDF viewer mode
  if (pdf && slides.length === 0) {
    return `
      <div class="pdf-viewer-wrap">
        <div class="pdf-toolbar">
          <span class="pdf-label">📄 ${s.title} — Slides PDF</span>
          <a href="${pdf}" target="_blank" class="pdf-open-btn">Open Full PDF ↗</a>
        </div>
        <iframe class="pdf-iframe" src="${pdf}" title="Session Slides"></iframe>
      </div>`;
  }

  // Image slides mode
  const slide = slides[currentSlide];
  const pct   = Math.round(((currentSlide + 1) / slides.length) * 100);
  const dots  = slides.map((_, i) => `<div class="slide-dot${i===currentSlide?' active':''}" onclick="goToSlide(${i})"></div>`).join('');

  // Check if image exists — show placeholder if missing
  return `
    <div class="slides-ppt">
      <div class="slide-progress">
        <div class="slide-progress-fill" id="slideProgressFill" style="width:${pct}%"></div>
      </div>
      <div class="slide-viewer" id="slideViewer">
        <span class="slide-number" id="slideNumber">${currentSlide+1} / ${slides.length}</span>
        <div class="slide-img-wrap" id="slideImgWrap">
          ${buildSlideImg(slide, s.color)}
        </div>
        <div class="slide-caption" id="slideCaption">
          <span class="slide-caption-title">${slide.title||''}</span>
          ${slide.caption ? `<span class="slide-caption-sub">${slide.caption}</span>` : ''}
        </div>
      </div>
      <div class="slide-nav">
        <button class="slide-nav-btn" onclick="changeSlide(-1)">←</button>
        <div class="slide-dots" id="slideDots">${dots}</div>
        <button class="slide-nav-btn" onclick="changeSlide(1)">→</button>
      </div>
      ${pdf ? `<div style="text-align:center;margin-top:16px">
        <a href="${pdf}" target="_blank" class="pdf-open-btn">📄 Also view as PDF ↗</a>
      </div>` : ''}
    </div>`;
}

function buildSlideImg(slide, color) {
  return `<img
    class="slide-image"
    src="${slide.file}"
    alt="${slide.title||'Slide'}"
    onerror="this.style.display='none';document.getElementById('slideImgPlaceholder').style.display='flex'"
    onload="document.getElementById('slideImgPlaceholder').style.display='none'"
  />
  <div id="slideImgPlaceholder" class="slide-img-placeholder" style="display:none;border-color:${color}">
    <div class="placeholder-icon">🖼️</div>
    <p>Image not found</p>
    <code>${slide.file}</code>
    <p style="margin-top:8px;font-size:0.8rem;color:var(--text-dim)">Export PPT slide as JPG and place at the path above</p>
  </div>`;
}

function changeSlide(dir) {
  if (!currentSession) return;
  const slides = currentSession.slides?.images || [];
  if (!slides.length) return;
  currentSlide = Math.max(0, Math.min(slides.length - 1, currentSlide + dir));
  updateSlideDisplay();
}

function goToSlide(idx) {
  currentSlide = idx;
  updateSlideDisplay();
}

function updateSlideDisplay() {
  const s      = currentSession;
  const slides = s.slides?.images || [];
  const slide  = slides[currentSlide];
  if (!slide) return;
  const pct = Math.round(((currentSlide + 1) / slides.length) * 100);

  const imgWrap = document.getElementById('slideImgWrap');
  if (imgWrap) imgWrap.innerHTML = buildSlideImg(slide, s.color);

  const caption = document.getElementById('slideCaption');
  if (caption) caption.innerHTML = `
    <span class="slide-caption-title">${slide.title||''}</span>
    ${slide.caption ? `<span class="slide-caption-sub">${slide.caption}</span>` : ''}`;

  const numEl = document.getElementById('slideNumber');
  if (numEl) numEl.textContent = `${currentSlide+1} / ${slides.length}`;

  const fill = document.getElementById('slideProgressFill');
  if (fill) fill.style.width = pct + '%';

  document.querySelectorAll('.slide-dot').forEach((d,i) => d.classList.toggle('active', i===currentSlide));
}

// =============================================
//  IMAGES GALLERY TAB
// =============================================
function renderImagesTab(s) {
  const gallery = s.images?.gallery || [];

  if (gallery.length === 0) {
    return `
      <div class="slides-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <h3>No Images Yet</h3>
        <p>Add photos from the session into<br>
           <code>sessions/${s.id}/images/</code><br>
           then add their paths to <code>session.json</code> under <code>images.gallery</code></p>
      </div>`;
  }

  // Group by category
  const categories = [...new Set(gallery.map(g => g.category || 'General'))];

  return `
    <div class="gallery-filters" id="galleryFilters">
      <button class="gallery-filter-btn active" onclick="filterGallery('all', this)">All (${gallery.length})</button>
      ${categories.map(c => `
        <button class="gallery-filter-btn" onclick="filterGallery('${c}', this)">
          ${c} (${gallery.filter(g=>(g.category||'General')===c).length})
        </button>`).join('')}
    </div>
    <div class="gallery-grid" id="galleryGrid">
      ${gallery.map((img, i) => `
        <div class="gallery-item" data-category="${img.category||'General'}" onclick="openLightbox(${i}, '${s.id}')">
          <div class="gallery-img-wrap">
            <img
              src="${img.file}"
              alt="${img.caption||''}"
              class="gallery-img"
              loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=\\'gallery-img-missing\\'><span>🖼️</span><small>${img.file.split('/').pop()}</small></div>'"
            />
            <div class="gallery-overlay">
              <span class="gallery-zoom">🔍</span>
            </div>
          </div>
          <div class="gallery-caption">
            <span class="gallery-cat-badge">${img.category||'General'}</span>
            <p>${img.caption||''}</p>
          </div>
        </div>`).join('')}
    </div>

    <!-- Lightbox -->
    <div id="lightbox" class="lightbox" style="display:none" onclick="closeLightbox()">
      <div class="lightbox-inner" onclick="event.stopPropagation()">
        <button class="lightbox-close" onclick="closeLightbox()">✕</button>
        <button class="lightbox-prev" onclick="lightboxNav(-1)">←</button>
        <button class="lightbox-next" onclick="lightboxNav(1)">→</button>
        <img id="lightboxImg" src="" alt="" class="lightbox-img" />
        <div class="lightbox-caption" id="lightboxCaption"></div>
        <div class="lightbox-counter" id="lightboxCounter"></div>
      </div>
    </div>`;
}

let lightboxIndex = 0;
function openLightbox(idx, sessionId) {
  const s = SESSIONS[sessionId] || currentSession;
  const gallery = s.images?.gallery || [];
  lightboxIndex = idx;
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.style.display = 'flex';
  updateLightbox(gallery);
}

function updateLightbox(gallery) {
  const img     = gallery[lightboxIndex];
  const imgEl   = document.getElementById('lightboxImg');
  const capEl   = document.getElementById('lightboxCaption');
  const cntEl   = document.getElementById('lightboxCounter');
  if (imgEl)  imgEl.src = img.file;
  if (capEl)  capEl.textContent = img.caption || '';
  if (cntEl)  cntEl.textContent = `${lightboxIndex + 1} / ${gallery.length}`;
}

function lightboxNav(dir) {
  const gallery = currentSession?.images?.gallery || [];
  lightboxIndex = (lightboxIndex + dir + gallery.length) % gallery.length;
  updateLightbox(gallery);
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
}

function filterGallery(category, btn) {
  document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.gallery-item').forEach(item => {
    const show = category === 'all' || item.dataset.category === category;
    item.style.display = show ? '' : 'none';
  });
}

// =============================================
//  TAB SWITCHING
// =============================================
function switchTab(name, btn) {
  document.querySelectorAll('.sd-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sd-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
}

// =============================================
//  QUIZ
// =============================================
function renderQuizStart(s) {
  return `
    <div class="quiz-start">
      <div style="font-size:3rem;margin-bottom:16px">🧠</div>
      <h2>Session Quiz</h2>
      <p>${s.title}</p>
      <div class="quiz-meta-info">
        <span class="quiz-meta-badge">📝 ${s.quiz.length} Questions</span>
        <span class="quiz-meta-badge">🎯 Test your knowledge</span>
        <span class="quiz-meta-badge">🏆 Score saved to Leaderboard</span>
      </div>
      <input id="quizNameInput" class="quiz-name-input" type="text"
        placeholder="Enter your name to start…" maxlength="30"
        onkeydown="if(event.key==='Enter')startInlineQuiz('${s.id}')" />
      <button class="btn-primary" style="margin-top:8px" onclick="startInlineQuiz('${s.id}')">
        Start Quiz ⚡
      </button>
    </div>`;
}

function startInlineQuiz(sessionId) {
  const inp = document.getElementById('quizNameInput');
  const name = inp ? inp.value.trim() : '';
  if (!name) { if (inp) inp.style.borderColor = 'var(--red)'; return; }
  const s = SESSIONS[sessionId];
  if (!s) return;
  inlineQuizState = {
    sessionId, playerName: name,
    questions: [...s.quiz].sort(() => Math.random() - 0.5),
    currentQ: 0, score: 0, answers: [], answered: false
  };
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const state   = inlineQuizState;
  const q       = state.questions[state.currentQ];
  const total   = state.questions.length;
  const pct     = Math.round((state.currentQ / total) * 100);
  const letters = ['A','B','C','D'];
  const container = document.getElementById('quizInline');
  if (!container) return;

  container.innerHTML = `
    <div class="quiz-session">
      <div class="quiz-header">
        <span class="quiz-q-num">Question ${state.currentQ+1} of ${total}</span>
        <span class="quiz-score-live">Score: ${state.score}/${state.currentQ}</span>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options" id="quizOptions">
        ${q.options.map((opt,i)=>`
          <button class="quiz-option" onclick="answerQuiz(${i})" id="opt-${i}">
            <span class="opt-letter">${letters[i]}</span>${opt}
          </button>`).join('')}
      </div>
      <div id="quizExplanation" style="display:none" class="quiz-explanation"></div>
      <div id="quizNextWrap" style="display:none;margin-top:12px">
        <button class="quiz-next-btn" onclick="nextQuestion()">
          ${state.currentQ+1===total ? 'See Results 🎉' : 'Next Question →'}
        </button>
      </div>
    </div>`;
}

function answerQuiz(chosen) {
  const state = inlineQuizState;
  if (state.answered) return;
  state.answered = true;
  const q       = state.questions[state.currentQ];
  const correct = q.answer;
  const isRight = chosen === correct;
  if (isRight) state.score++;
  state.answers.push({ q:q.q, chosen, correct, isRight, explanation:q.explanation, correctText:q.options[correct] });

  document.querySelectorAll('.quiz-option').forEach((btn,i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    if (i === chosen && !isRight) btn.classList.add('wrong');
    if (i !== chosen && i !== correct) btn.style.opacity = '0.4';
  });

  const expEl = document.getElementById('quizExplanation');
  if (expEl) {
    expEl.style.display = 'block';
    expEl.innerHTML = `<strong>${isRight ? '✅ Correct!' : '❌ Not quite!'}</strong><br>${q.explanation}`;
  }
  document.getElementById('quizNextWrap').style.display = 'block';
  const scoreEl = document.querySelector('.quiz-score-live');
  if (scoreEl) scoreEl.textContent = `Score: ${state.score}/${state.currentQ+1}`;
}

function nextQuestion() {
  inlineQuizState.answered = false;
  inlineQuizState.currentQ++;
  if (inlineQuizState.currentQ >= inlineQuizState.questions.length) showQuizResults();
  else renderQuizQuestion();
}

function showQuizResults() {
  const state   = inlineQuizState;
  const total   = state.questions.length;
  const pct     = Math.round((state.score / total) * 100);
  const session = SESSIONS[state.sessionId];
  saveScore(state.sessionId, state.playerName, state.score, total);

  let emoji = '🌱', msg = 'Keep practicing!';
  if (pct >= 90) { emoji = '🏆'; msg = 'Outstanding! You\'re a master tinkerer!'; }
  else if (pct >= 75) { emoji = '🌟'; msg = 'Great work! You really understand this!'; }
  else if (pct >= 60) { emoji = '👍'; msg = 'Good job! Review slides and try again!'; }
  else if (pct >= 40) { emoji = '💪'; msg = 'Nice try! Go through the session again!'; }

  const stars = '⭐'.repeat(Math.max(1, Math.round(pct / 20)));
  const container = document.getElementById('quizInline');
  container.innerHTML = `
    <div class="quiz-results">
      <div style="font-size:3rem">${emoji}</div>
      <h2>${msg}</h2>
      <div class="quiz-score-big" style="color:${pct>=60?'var(--green)':'var(--orange)'}">
        ${state.score}<span style="font-size:2rem;color:var(--text-muted)">/${total}</span>
      </div>
      <div class="quiz-score-label">${pct}% Correct · ${session?.title||''}</div>
      <div class="quiz-stars">${stars}</div>
      <div class="quiz-breakdown">
        <h4>Answer Review</h4>
        ${state.answers.map((a,i)=>`
          <div class="quiz-bd-item">
            <span class="quiz-bd-icon">${a.isRight?'✅':'❌'}</span>
            <div>
              <div class="quiz-bd-text">Q${i+1}: ${a.q.substring(0,60)}${a.q.length>60?'…':''}</div>
              ${!a.isRight?`<div class="quiz-bd-answer">✓ ${a.correctText}</div>`:''}
            </div>
          </div>`).join('')}
      </div>
      <div class="quiz-results-btns">
        <button class="btn-primary" onclick="retryQuiz('${state.sessionId}')">Retry Quiz 🔄</button>
        <button class="btn-outline" onclick="showPage('leaderboard');renderLeaderboard()">Leaderboard 🏆</button>
      </div>
    </div>`;
}

function retryQuiz(sessionId) {
  const s = SESSIONS[sessionId];
  if (!s) return;
  document.getElementById('quizInline').innerHTML = renderQuizStart(s);
}

// =============================================
//  LEADERBOARD
// =============================================
function getScores() {
  try { return JSON.parse(localStorage.getItem('vidyaSteamScores') || '{}'); }
  catch { return {}; }
}

function saveScore(sessionId, name, score, total) {
  const scores = getScores();
  if (!scores[sessionId]) scores[sessionId] = [];
  scores[sessionId].push({
    name, score, total,
    pct: Math.round((score / total) * 100),
    date: new Date().toLocaleDateString('en-IN')
  });
  scores[sessionId].sort((a,b) => b.pct - a.pct || b.score - a.score);
  scores[sessionId] = scores[sessionId].slice(0, 20);
  localStorage.setItem('vidyaSteamScores', JSON.stringify(scores));
}

function renderLeaderboard() {
  const wrap = document.getElementById('leaderboardWrap');
  if (!wrap || !SITE) return;
  const scores = getScores();
  const ordered = SITE.sessions.map(e => SESSIONS[e.id]).filter(Boolean);

  wrap.innerHTML = ordered.map(s => {
    const entries = scores[s.id] || [];
    const medals  = ['🥇','🥈','🥉'];
    const rows = entries.slice(0,10).map((e,i)=>`
      <tr>
        <td class="lb-rank lb-rank-${i+1}">${medals[i]||i+1}</td>
        <td>${e.name}</td>
        <td>${e.date||''}</td>
        <td class="lb-score">${e.score}/${e.total} (${e.pct}%)</td>
      </tr>`).join('');
    return `
      <div class="lb-section">
        <h3>
          <span style="background:${s.color};padding:4px 10px;border-radius:6px;font-size:0.75rem">
            Session ${s.number}
          </span>
          ${s.icon} ${s.title}
        </h3>
        ${entries.length === 0
          ? `<div class="lb-empty">No scores yet. Take the quiz to be first! 🏆</div>`
          : `<table class="lb-table">
              <thead><tr><th>#</th><th>Name</th><th>Date</th><th>Score</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`}
      </div>`;
  }).join('');
}

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
        <img src="${p.image||''}" alt="${p.title}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          onload="this.nextElementSibling.style.display='none'"
          class="project-img" />
        <div class="project-img-placeholder" style="display:flex">
          <span style="font-size:3rem">${p.icon}</span>
        </div>
      </div>
      <div class="project-body">
        <span class="project-level level-${p.level}">${p.level}</span>
        <span class="project-status status-${p.status.replace(' ','-')}">${p.status}</span>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <div class="project-components">
          ${(p.components||[]).slice(0,3).map(c=>`<span class="tag">${c}</span>`).join('')}
          ${p.components?.length > 3 ? `<span class="tag">+${p.components.length-3} more</span>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// =============================================
//  ABOUT
// =============================================
function renderAbout() {
  if (!SITE) return;
  const grid = document.getElementById('cultureGrid');
  if (grid) {
    grid.innerHTML = SITE.lab_culture.map(c=>`
      <div class="culture-card">
        <div style="font-size:1.5rem;margin-bottom:8px">${c.icon}</div>
        <h4>${c.title}</h4>
        <p>${c.desc}</p>
      </div>`).join('');
  }
}

// =============================================
//  KEYBOARD NAV
// =============================================
document.addEventListener('keydown', e => {
  const slidesActive = document.getElementById('tab-slides')?.classList.contains('active');
  const detailActive = document.getElementById('page-session-detail')?.classList.contains('active');
  if (detailActive && slidesActive) {
    if (e.key === 'ArrowRight') changeSlide(1);
    if (e.key === 'ArrowLeft')  changeSlide(-1);
  }
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
