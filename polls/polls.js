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
  voteFor:    { en: 'Vote for Option', de: 'Für Option' },
  voteForEnd: { en: '', de: 'stimmen' },
  changeTo:   { en: 'Change vote to Option', de: 'Stimme ändern zu Option' },
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
    tags:  [{ en: '5 options', de: '5 Optionen' }, 'Style', { en: 'Open', de: 'Offen' }],
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
          <div class="tags">${p.tags.map(t => `<span class="tag">${str(t)}</span>`).join('')}</div>
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

// Arrows / swipe / keys cycle within the active option only
function imgStep(dir) {
  const idxs = optionSlideIdxs();
  if (idxs.length < 2) return;
  const pos = idxs.indexOf(imgIdx);
  imgGoTo(idxs[(pos + dir + idxs.length) % idxs.length]);
}

// Highlight the active option and show dots for its images
function syncOptionState() {
  const cur = slides[imgIdx];
  optionsEl.querySelectorAll('.poll-option').forEach((b, i) => {
    b.classList.toggle('is-active', i === cur.option);
    b.setAttribute('aria-pressed', i === cur.option ? 'true' : 'false');
  });

  const inOption = slides.map((s, i) => ({ ...s, i })).filter(s => s.option === cur.option);
  imgPrev.hidden = imgNext.hidden = inOption.length < 2;
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
  document.getElementById('pollTags').innerHTML = poll.tags
    .map(t => `<span class="tag">${str(t)}</span>`).join('');
  document.getElementById('pollTitle').textContent = str(poll.title);
  document.getElementById('pollDesc').textContent  = str(poll.desc);

  slides = poll.options.flatMap((o, optIdx) =>
    o.images.map((src, i) => ({ src, option: optIdx, indexInOption: i })));

  imgTrack.innerHTML = slides.map((s, i) => `
    <div class="viewer__slide" data-index="${i}">
      <span class="viewer__badge">${str(ui.option)} ${s.option + 1}</span>
      <img src="${s.src}" alt="${str(ui.option)} ${s.option + 1}" ${i ? 'loading="lazy"' : ''} />
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
      ${str(ui.option)} ${i + 1}
      <span class="poll-option__result" hidden>
        <span class="poll-option__bar"><span></span></span>
        <span class="poll-option__pct"></span>
      </span>
    </button>`).join('');

  optionsEl.querySelectorAll('.poll-option').forEach(b =>
    b.addEventListener('click', () => optionGoTo(+b.dataset.option)));

  // Slide click → lightbox with that option's images
  imgTrack.querySelectorAll('.viewer__slide').forEach(slide =>
    slide.addEventListener('click', () => {
      const i    = +slide.dataset.index;
      const idxs = optionSlideIdxs(slides[i].option);
      openLightbox(idxs.map(j => ({ ...slides[j], i: j })), idxs.indexOf(i));
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
    voteBtn.innerHTML = `${checkSvg} ${str(ui.yourVote)}: ${str(ui.option)} ${n}`;
    voteBtn.disabled = true;
  } else {
    voteBtn.textContent = hasVoted
      ? `${str(ui.changeTo)} ${n}`
      : `${str(ui.voteFor)} ${n} ${str(ui.voteForEnd)}`.trim();
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

let lbSlides = [];
let lbIdx    = 0;

function lbUpdateCounter() {
  const s = lbSlides[lbIdx];
  lightboxCounter.textContent = lbSlides.length > 1
    ? `${str(ui.option)} ${s.option + 1} · ${lbIdx + 1} / ${lbSlides.length}`
    : `${str(ui.option)} ${s.option + 1}`;
  lightboxPrev.hidden = lightboxNext.hidden = lbSlides.length < 2;
}

function lbGoTo(idx) {
  if (lbSlides.length < 2) return;
  lbIdx = ((idx % lbSlides.length) + lbSlides.length) % lbSlides.length;
  lightboxImgWrap.classList.add('is-transitioning');
  setTimeout(() => {
    lightboxImg.src = lbSlides[lbIdx].src;
    lightboxImgWrap.classList.remove('is-transitioning');
    lbUpdateCounter();
  }, 220);
  // Keep the viewer behind in sync
  imgGoTo(lbSlides[lbIdx].i, true);
}

function openLightbox(items, startIdx) {
  lbSlides = items;
  lbIdx    = startIdx ?? 0;
  lightboxImg.src = lbSlides[lbIdx].src;
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
  addSwipe(document.getElementById('imageViewer'), () => imgStep(1), () => imgStep(-1));

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

if (pageType === 'poll') loadVote();

/* =====================================================
   THEME TOGGLE — dark / light
   ===================================================== */
document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = root.getAttribute('data-theme') === 'light';
  if (isLight) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', 'light');
  try { localStorage.setItem('theme', isLight ? 'dark' : 'light'); } catch (e) {}
});
