// =============================================
//  HOME PAGE
// =============================================

const heroCarouselImages = [
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600"
];

let carouselCurrentIndex = 1; 
let carouselAutoPlayTimer;
const carouselAutoPlaySpeed = 3000;

function updateHeroCarousel() {
    const items = document.querySelectorAll('#heroCarouselTrack .carousel-item');
    if (!items.length) return;
    items.forEach((item, index) => {
        item.className = 'carousel-item'; // Reset classes
        if (index === carouselCurrentIndex) {
            item.classList.add('active');
        } else if (index === (carouselCurrentIndex - 1 + items.length) % items.length) {
            item.classList.add('prev');
        } else if (index === (carouselCurrentIndex + 1) % items.length) {
            item.classList.add('next');
        } else {
            item.classList.add('hidden');
        }
    });
}

function moveHeroCarousel(direction) {
    const items = document.querySelectorAll('#heroCarouselTrack .carousel-item');
    if (!items.length) return;
    carouselCurrentIndex = (carouselCurrentIndex + direction + items.length) % items.length;
    updateHeroCarousel();
}

function startHeroCarouselAutoPlay() {
    clearInterval(carouselAutoPlayTimer);
    carouselAutoPlayTimer = setInterval(() => {
        moveHeroCarousel(1); 
    }, carouselAutoPlaySpeed);
}

window.handleManualMove = function(direction) {
    moveHeroCarousel(direction);
    startHeroCarouselAutoPlay(); 
};

function renderHome() {
  if (!SITE) return;

  // Hero Carousel
  const track = document.getElementById('heroCarouselTrack');
  if (track) {
      track.innerHTML = heroCarouselImages.map(src => `
          <div class="carousel-item">
              <img src="${src}" alt="VIDYA DigiSpark Works">
          </div>
      `).join('');
      carouselCurrentIndex = 1;
      updateHeroCarousel();
      startHeroCarouselAutoPlay();
  }

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
