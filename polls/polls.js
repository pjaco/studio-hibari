/* Shared logic for /polls (overview) and every /polls/<id> page.
   A page is a poll page when <body data-poll="<id>"> is set. */

/* =====================================================
   LANGUAGE — mirrors the choice made on the main page
   ===================================================== */
let currentLang = 'en';
try { if (localStorage.getItem('lang') === 'de') currentLang = 'de'; } catch (e) {}

const str = v => (typeof v === 'object' && v !== null) ? (v[currentLang] ?? v.en) : v;

const ui = {
  sub:        { en: 'Small decisions, crowdsourced. Pick a poll, have a look, tell me what you think.', de: 'Kleine Entscheidungen, gemeinsam getroffen. Umfrage auswählen, reinschauen, mitreden.' },
  cta:        { en: 'view poll', de: 'zur Umfrage' },
  back:       { en: 'All polls', de: 'Alle Umfragen' },
  option:     { en: 'Option', de: 'Option' },
  options:    { en: 'The options', de: 'Die Optionen' },
  voteFor:    { en: 'Vote for', de: 'Für' },
  voteForEnd: { en: '', de: 'stimmen' },
  changeTo:   { en: 'Change vote to', de: 'Stimme ändern zu' },
  yourVote:   { en: 'Your vote', de: 'Deine Stimme' },
  hint:       { en: 'Results appear after you vote.', de: 'Die Ergebnisse siehst du nach deiner Stimme.' },
  votes:      { en: n => `${n} ${n === 1 ? 'vote' : 'votes'} · you can change your vote anytime`, de: n => `${n} ${n === 1 ? 'Stimme' : 'Stimmen'} · du kannst deine Stimme jederzeit ändern` },
  loading:    { en: 'Loading…', de: 'Lädt…' },
  error:      { en: 'Voting is unavailable right now.', de: 'Abstimmen ist gerade nicht möglich.' },
  limit:      { en: 'Too many votes from this network today.', de: 'Heute schon zu viele Stimmen aus diesem Netzwerk.' },
  share:      { en: 'Share this poll', de: 'Umfrage teilen' },
  copied:     { en: 'Link copied', de: 'Link kopiert' },
};

/* =====================================================
   POLL DATA — add a poll here and create polls/<id>/index.html
   ===================================================== */
const G = '/images/polls/glasses/';
const pollData = {
  glasses: {
    title: { en: 'Which glasses suit me best?', de: 'Welche Brille steht mir am besten?' },
    desc:  { en: 'Five frames, one face. Flip through the options and help me decide which pair I should get.', de: 'Fünf Gestelle, ein Gesicht. Klick dich durch die Optionen und hilf mir zu entscheiden, welche Brille ich nehmen soll.' },
    // Short option name used on small screens ("Brille 1" instead of "Option 1")
    optionShort: { en: 'Pair', de: 'Brille' },
    options: [
      { images: [G + 'glasses1/photo_5352732336040126861_y.jpg', G + 'glasses1/photo_5352732336040126862_y.jpg', G + 'glasses1/photo_5352732336040126863_y.jpg'] },
      { images: [G + 'glasses2/photo_5352732336040126869_y.jpg', G + 'glasses2/photo_5352732336040126870_y.jpg'] },
      { images: [G + 'glasses3/photo_5352732336040126868_y.jpg'] },
      { images: [G + 'glasses4/photo_5352732336040126866_y.jpg'] },
      { images: [G + 'glasses5/photo_5352732336040126865_y.jpg'] },
    ],
  },
};
const pollOrder = Object.keys(pollData);

const root     = document.documentElement;
const pageType = document.body.dataset.poll ? 'poll' : 'overview';
const pollId   = document.body.dataset.poll;

/* =====================================================
   SCROLL REVEAL
   ===================================================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* =====================================================
   OVERVIEW — cards linking to each poll page
   ===================================================== */
const arrowSvg = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const pollsGrid = document.getElementById('pollsGrid');

function renderCards() {
  pollsGrid.innerHTML = pollOrder.map((id, i) => {
    const p = pollData[id];
    return `
      <a class="card reveal reveal-delay-${(i % 2) + 1}" href="/polls/${id}">
        <div class="card__thumbnail">
          <div class="card__strip">
            ${p.options.map(o => `<img src="${o.images[0]}" alt="" loading="lazy" />`).join('')}
          </div>
        </div>
        <div class="card__body">
          <h2 class="card__title">${str(p.title)}</h2>
          <p class="card__desc">${str(p.desc)}</p>
          <span class="card__cta"><span>${str(ui.cta)}</span> ${arrowSvg}</span>
        </div>
      </a>`;
  }).join('');
  pollsGrid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* =====================================================
   POLL PAGE
   ===================================================== */
const poll = pollData[pollId];

// "Option" on desktop, the poll's short name ("Brille") on mobile
const mobileQuery = window.matchMedia('(max-width: 860px)');
const optionName  = () => str(mobileQuery.matches && poll.optionShort ? poll.optionShort : ui.option);

/* ── Swipe helper ── */
function addSwipe(el, onLeft, onRight) {
  let sx = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 44) { dx < 0 ? onLeft() : onRight(); }
  }, { passive: true });
}

/* ── Image viewer — all options' images in one track ── */
const imgTrack  = document.getElementById('imageTrack');
const imgDotsEl = document.getElementById('imgDots');
const imgPrev   = document.getElementById('imgPrev');
const imgNext   = document.getElementById('imgNext');
const optionsEl = document.getElementById('pollOptions');

let slides = [];   // [{ src, option, indexInOption }]
let imgIdx = 0;

function imgGoTo(idx, skipAnim) {
  imgIdx = ((idx % slides.length) + slides.length) % slides.length;
  if (skipAnim) {
    imgTrack.style.transition = 'none';
    imgTrack.style.transform  = `translateX(-${imgIdx * 100}%)`;
    requestAnimationFrame(() => { imgTrack.style.transition = ''; });
  } else {
    imgTrack.style.transform = `translateX(-${imgIdx * 100}%)`;
  }
  syncOptionState();
}

function optionGoTo(optIdx) {
  imgGoTo(slides.findIndex(s => s.option === optIdx));
}

// Slide indices belonging to an option (default: the active one)
function optionSlideIdxs(opt = slides[imgIdx].option) {
  return slides.map((s, i) => i).filter(i => slides[i].option === opt);
}

// Arrows / keys step through every image; crossing into the next option selects it
function imgStep(dir) {
  imgGoTo(imgIdx + dir);
}

/* ── Native-feeling swipe: the photo follows the finger ── */
let lastSwipeEnd = 0;   // a tap right after a swipe isn't a tap
const justSwiped = () => performance.now() - lastSwipeEnd < 400;

function addDrag(viewer) {
  let x0 = null, y0 = 0, t0 = 0, dx = 0, axis = null, width = 0;

  viewer.addEventListener('touchstart', e => {
    if (e.touches.length > 1) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    t0 = performance.now();
    dx = 0;
    axis = null;
    width = viewer.offsetWidth;
  }, { passive: true });

  viewer.addEventListener('touchmove', e => {
    if (x0 === null) return;
    const mx = e.touches[0].clientX - x0;
    const my = e.touches[0].clientY - y0;

    // Decide the direction once, after a few pixels — favour horizontal
    if (!axis) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      axis = Math.abs(mx) >= Math.abs(my) * 0.7 ? 'x' : 'y';
      if (axis === 'x') imgTrack.style.transition = 'none';
    }
    if (axis !== 'x') return;

    // Lock the page while swiping through photos
    e.preventDefault();
    dx = mx;
    // Rubber band at the first / last photo
    const atEdge = (imgIdx === 0 && dx > 0) || (imgIdx === slides.length - 1 && dx < 0);
    const shown  = atEdge ? dx * 0.3 : dx;
    imgTrack.style.transform = `translateX(${-imgIdx * width + shown}px)`;
  }, { passive: false });

  const end = () => {
    if (axis === 'x') {
      lastSwipeEnd = performance.now();
      imgTrack.style.transition = '';
      const fast = Math.abs(dx) / (performance.now() - t0) > 0.4 && Math.abs(dx) > 20;
      const far  = Math.abs(dx) > width * 0.2;
      let target = imgIdx;
      if (fast || far) target = imgIdx + (dx < 0 ? 1 : -1);
      // No wrap-around while dragging — snap back at the ends
      imgGoTo(Math.max(0, Math.min(slides.length - 1, target)));
    }
    x0 = null;
    axis = null;
  };
  viewer.addEventListener('touchend', end);
  viewer.addEventListener('touchcancel', end);
}

// Highlight the active option and show dots for its images
function syncOptionState() {
  const cur = slides[imgIdx];
  optionsEl.querySelectorAll('.poll-option').forEach((b, i) => {
    b.classList.toggle('is-active', i === cur.option);
    b.setAttribute('aria-pressed', i === cur.option ? 'true' : 'false');
  });

  const inOption = slides.map((s, i) => ({ ...s, i })).filter(s => s.option === cur.option);
  imgDotsEl.innerHTML = inOption.length > 1
    ? inOption.map(s => `<button class="viewer__dot${s.i === imgIdx ? ' is-active' : ''}" data-i="${s.i}" aria-label="Image ${s.indexInOption + 1}"></button>`).join('')
    : '';
  imgDotsEl.querySelectorAll('.viewer__dot').forEach(d =>
    d.addEventListener('click', () => imgGoTo(+d.dataset.i)));

  renderVote();
}

function renderPoll() {
  const keep = slides.length ? imgIdx : 0;
  document.title = `${str(poll.title)} · Studio Hibari`;
  document.getElementById('pollTitle').textContent = str(poll.title);
  document.getElementById('pollDesc').textContent  = str(poll.desc);

  slides = poll.options.flatMap((o, optIdx) =>
    o.images.map((src, i) => ({ src, option: optIdx, indexInOption: i })));

  imgTrack.innerHTML = slides.map((s, i) => `
    <div class="viewer__slide" data-index="${i}">
      <span class="viewer__badge">${optionName()} ${s.option + 1}</span>
      <img src="${s.src}" alt="${optionName()} ${s.option + 1}" ${i ? 'loading="lazy"' : ''} />
      <div class="viewer__zoom" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.8"/>
          <path d="M18 18l6 6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 12h6M12 9v6" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
    </div>`).join('');

  optionsEl.innerHTML = poll.options.map((o, i) => `
    <button class="poll-option" data-option="${i}" aria-pressed="false">
      <span class="poll-option__thumb"><img src="${o.images[0]}" alt="" /></span>
      <span class="poll-option__check" hidden>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      ${optionName()} ${i + 1}
      <span class="poll-option__result" hidden>
        <span class="poll-option__bar"><span></span></span>
        <span class="poll-option__pct"></span>
      </span>
    </button>`).join('');

  optionsEl.querySelectorAll('.poll-option').forEach(b =>
    b.addEventListener('click', () => optionGoTo(+b.dataset.option)));

  // Slide tap → lightbox (but not at the end of a swipe)
  imgTrack.querySelectorAll('.viewer__slide').forEach(slide =>
    slide.addEventListener('click', () => {
      if (justSwiped()) return;
      openLightbox(+slide.dataset.index);
    }));

  imgGoTo(keep, true);
}

/* ── Voting ── */
const voteBtn    = document.getElementById('voteBtn');
const voteStatus = document.getElementById('voteStatus');
const checkSvg   = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Anonymous, random id so a visitor can see and change their own vote
const voterId = (() => {
  const make = () => crypto.randomUUID();
  try {
    let id = localStorage.getItem('pollVoter');
    if (!id) { id = make(); localStorage.setItem('pollVoter', id); }
    return id;
  } catch (e) { return make(); }
})();

// { vote, counts, loading, error }
let voteState = { loading: true };

function renderVote() {
  if (!voteBtn) return;
  const s = voteState;
  const active = slides[imgIdx].option;
  const total  = s.counts ? s.counts.reduce((a, b) => a + b, 0) : 0;
  const hasVoted = s.vote !== null && s.vote !== undefined;

  optionsEl.querySelectorAll('.poll-option').forEach((b, i) => {
    b.classList.toggle('is-voted', hasVoted && i === s.vote);
    b.querySelector('.poll-option__check').hidden = !(hasVoted && i === s.vote);
    b.querySelector('.poll-option__result').hidden = !hasVoted;
    if (hasVoted) {
      const pct = total ? Math.round(s.counts[i] / total * 100) : 0;
      b.querySelector('.poll-option__pct').textContent = `${pct} %`;
      // Next frame so the bar animates from its previous width
      requestAnimationFrame(() => { b.querySelector('.poll-option__bar span').style.width = `${pct}%`; });
    }
  });

  const n = active + 1;
  if (hasVoted && active === s.vote) {
    voteBtn.innerHTML = `${checkSvg} ${str(ui.yourVote)}: ${optionName()} ${n}`;
    voteBtn.disabled = true;
  } else {
    voteBtn.textContent = hasVoted
      ? `${str(ui.changeTo)} ${optionName()} ${n}`
      : `${str(ui.voteFor)} ${optionName()} ${n} ${str(ui.voteForEnd)}`.trim();
    voteBtn.disabled = false;
  }
  voteBtn.classList.toggle('is-loading', !!s.loading);

  voteStatus.classList.toggle('is-error', !!s.error);
  voteStatus.textContent = s.error ? str(ui[s.error])
    : s.loading ? str(ui.loading)
    : hasVoted ? str(ui.votes)(total)
    : str(ui.hint);
}

async function voteRequest(init) {
  const qs  = init ? '' : `?poll=${encodeURIComponent(pollId)}&voter=${voterId}`;
  const res = await fetch(`/api/vote${qs}`, init);
  if (res.status === 429) throw Object.assign(new Error(), { key: 'limit' });
  if (!res.ok) throw Object.assign(new Error(), { key: 'error' });
  return res.json();
}

async function loadVote() {
  voteState = { loading: true };
  renderVote();
  try {
    const data = await voteRequest();
    voteState = { vote: data.vote, counts: data.counts };
  } catch (err) {
    voteState = { error: err.key || 'error' };
  }
  renderVote();
}

/* ── Lightbox ── */
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxImgWrap = document.getElementById('lightboxImgWrap');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxPrev    = document.getElementById('lightboxPrev');
const lightboxNext    = document.getElementById('lightboxNext');

// The lightbox walks through the same slides as the viewer
let lbIdx = 0;

function lbUpdateCounter() {
  const s     = slides[lbIdx];
  const count = optionSlideIdxs(s.option).length;
  lightboxCounter.textContent = count > 1
    ? `${optionName()} ${s.option + 1} · ${s.indexInOption + 1} / ${count}`
    : `${optionName()} ${s.option + 1}`;
}

function lbGoTo(idx) {
  lbIdx = ((idx % slides.length) + slides.length) % slides.length;
  lightboxImgWrap.classList.add('is-transitioning');
  setTimeout(() => {
    lightboxImg.src = slides[lbIdx].src;
    lightboxImgWrap.classList.remove('is-transitioning');
    lbUpdateCounter();
  }, 220);
  // Keep the viewer (and selected option) behind in sync
  imgGoTo(lbIdx, true);
}

function openLightbox(startIdx) {
  lbIdx = startIdx;
  lightboxImg.src = slides[lbIdx].src;
  lbUpdateCounter();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (pageType === 'poll') {
  imgPrev.addEventListener('click', () => imgStep(-1));
  imgNext.addEventListener('click', () => imgStep(1));
  addDrag(document.getElementById('imageViewer'));

  voteBtn.addEventListener('click', async () => {
    const option = slides[imgIdx].option;
    const prev   = voteState;
    voteState = { ...prev, loading: true, error: null };
    renderVote();
    try {
      const data = await voteRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll: pollId, voter: voterId, option }),
      });
      voteState = { vote: data.vote, counts: data.counts };
    } catch (err) {
      voteState = { ...prev, loading: false, error: err.key || 'error' };
    }
    renderVote();
  });

  // Share: native share sheet where available, otherwise copy the link
  const shareBtn   = document.getElementById('shareBtn');
  const shareLabel = document.getElementById('shareLabel');
  shareBtn.addEventListener('click', async () => {
    const url = `${location.origin}/polls/${pollId}`;
    if (navigator.share) {
      try { await navigator.share({ title: str(poll.title), url }); } catch (e) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      shareLabel.textContent = str(ui.copied);
      setTimeout(() => { shareLabel.textContent = str(ui.share); }, 2000);
    } catch (e) {}
  });

  lightboxPrev.addEventListener('click', () => lbGoTo(lbIdx - 1));
  lightboxNext.addEventListener('click', () => lbGoTo(lbIdx + 1));
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
  addSwipe(lightbox, () => lbGoTo(lbIdx + 1), () => lbGoTo(lbIdx - 1));

  document.addEventListener('keydown', e => {
    if (lightbox.classList.contains('is-open')) {
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  lbGoTo(lbIdx - 1);
      if (e.key === 'ArrowRight') lbGoTo(lbIdx + 1);
      return;
    }
    if (e.key === 'ArrowLeft')  imgStep(-1);
    if (e.key === 'ArrowRight') imgStep(1);
  });
}

/* =====================================================
   LANGUAGE TOGGLE
   ===================================================== */
const langToggle = document.getElementById('langToggle');
let rendered = false;

function setLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  root.lang = lang;
  langToggle.textContent = lang === 'en' ? 'DE' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = str(ui[el.dataset.i18n]); });

  if (pageType === 'overview') {
    renderCards();
  } else {
    renderPoll();
  }
  // Content already on screen shouldn't animate in again
  if (rendered) document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  rendered = true;
}

setLang(currentLang);
langToggle.addEventListener('click', () => setLang(currentLang === 'en' ? 'de' : 'en'));

if (pageType === 'poll') {
  loadVote();
  // Re-label options when crossing the mobile breakpoint (rotation, resize)
  mobileQuery.addEventListener('change', renderPoll);
}

/* =====================================================
   FOOTER LOGO — 3D tilt + glow on mousemove (as on the main page)
   ===================================================== */
(function () {
  const logoWrap = document.querySelector('.footer__logo');
  const imgs     = logoWrap.querySelectorAll('img');

  function visibleImg() {
    return Array.from(imgs).find(i => i.offsetParent !== null) || imgs[0];
  }

  logoWrap.addEventListener('mousemove', (e) => {
    const img  = visibleImg();
    const rect = logoWrap.getBoundingClientRect();
    const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);

    const rotX = -dy * 16;
    const rotY =  dx * 16;
    const tx   =  dx * 8;
    const ty   =  dy * 8;

    img.style.transform = `perspective(500px) translateX(${tx}px) translateY(${ty}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.08)`;
    img.style.filter    = `drop-shadow(${-dx * 6}px ${-dy * 6}px 20px rgba(245,200,66,0.45))`;
  });

  logoWrap.addEventListener('mouseleave', () => {
    const img = visibleImg();
    img.style.transform = '';
    img.style.filter    = '';
  });
})();

/* =====================================================
   THEME TOGGLE — dark / light
   ===================================================== */
document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = root.getAttribute('data-theme') === 'light';
  if (isLight) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', 'light');
  try { localStorage.setItem('theme', isLight ? 'dark' : 'light'); } catch (e) {}
});
