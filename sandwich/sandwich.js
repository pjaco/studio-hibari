/* =====================================================
   SANDWICHABEND — renders everything from window.SANDWICH_DATA
   (see sandwich-data.js). No build step, no dependencies.
   ===================================================== */
(function () {
  const DATA = window.SANDWICH_DATA;

  /* ── Helpers ── */
  const $  = sel => document.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const fmt = n => n.toFixed(1).replace('.', ',');
  const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  const people   = Object.fromEntries(DATA.people.map(p => [p.id, p]));
  const person   = id => people[id] || { name: id, emoji: '❓' };
  const regulars = DATA.people.filter(p => !p.guest);

  const CUBE_EMOJI = { Sandwich: '🥪', Toast: '🍞', Taco: '🌮', Sushi: '🍣', Quiche: '🥧', Calzone: '🥟', Salad: '🥗', Cake: '🍰' };
  const PH_COLORS  = ['#E4D5BC', '#FFE2B8', '#D9EBDD', '#FFD6D6', '#F2E6CF'];

  /* ── Derived data ── */
  // Events oldest → newest
  const events = [...DATA.events].sort((a, b) => a.date.localeCompare(b.date));

  // Every sandwich, with its evening and overall score (average of all judges)
  const sandwiches = events.flatMap(ev => ev.sandwiches.map(s => ({
    ...s,
    event: ev,
    overall: avg(Object.values(s.scores)),
  })));
  const sandwichById = Object.fromEntries(sandwiches.map(s => [s.id, s]));

  // Winner of an evening = best overall score
  const winnerOf = ev => sandwiches
    .filter(s => s.event === ev)
    .reduce((best, s) => (!best || s.overall > best.overall ? s : best), null);

  const latestEvent = events[events.length - 1];
  const champion    = winnerOf(latestEvent);

  // All-time leaderboard — regulars only
  const leaderboard = regulars.map(p => {
    const own = sandwiches.filter(s => s.creator === p.id);
    return {
      person: p,
      wins: events.filter(ev => winnerOf(ev)?.creator === p.id).length,
      entries: new Set(own.map(s => s.event.id)).size,
      average: avg(own.map(s => s.overall)),
    };
  }).sort((a, b) => b.wins - a.wins || b.average - a.average);

  const byScore = [...sandwiches].sort((a, b) => b.overall - a.overall);
  const fame  = byScore.slice(0, 3);
  const shame = byScore.slice(-3).reverse();

  /* =====================================================
     SOUND — Web Audio, synthesized. Muted until the visitor
     switches it on (that click also unlocks audio on iOS).
     ===================================================== */
  const sound = {
    on: false,
    ctx: null,
    lastCrunch: 0,

    unlock() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },

    // A short burst of filtered noise, a few times in a row = crunch
    crunch() {
      if (!this.on || !this.ctx) return;
      const now = performance.now();
      if (now - this.lastCrunch < 180) return;   // no machine-gun crunching
      this.lastCrunch = now;

      const ctx = this.ctx;
      const t0  = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.22);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      [0, 0.045, 0.1].forEach((offset, i) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 0.8 + Math.random() * 0.5;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800 + Math.random() * 2200;
        bp.Q.value = 0.9;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 600;

        const g = ctx.createGain();
        const t = t0 + offset;
        const peak = i === 0 ? 0.55 : 0.35;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + Math.random() * 0.04);

        src.connect(bp).connect(hp).connect(g).connect(ctx.destination);
        src.start(t);
        src.stop(t + 0.15);
      });
    },

    // 8-bit "ta-da-da-daaa"
    fanfare() {
      if (!this.on || !this.ctx) return;
      const ctx = this.ctx;
      const t0  = ctx.currentTime + 0.02;
      const notes = [
        [523.25, 0.00, 0.11], [523.25, 0.12, 0.11], [523.25, 0.24, 0.11],
        [659.25, 0.36, 0.30], [587.33, 0.68, 0.11], [659.25, 0.80, 0.11],
        [783.99, 0.92, 0.55],
      ];
      notes.forEach(([freq, at, dur]) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const t = t0 + at;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        g.gain.setValueAtTime(0.12, t + dur - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    },

    // Tiny blip so switching on is audible
    blip() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.setValueAtTime(990, t + 0.06);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    },
  };

  const soundToggle = $('#soundToggle');
  soundToggle.addEventListener('click', () => {
    const wantOn = !sound.on;
    if (wantOn && !sound.unlock()) {
      // No Web Audio — stay silent, but say so
      $('#soundState').textContent = 'n/a';
      return;
    }
    sound.on = wantOn;
    soundToggle.setAttribute('aria-pressed', String(wantOn));
    soundToggle.setAttribute('aria-label', wantOn ? 'Sound ausschalten' : 'Sound einschalten');
    $('#soundState').textContent = wantOn ? 'ON' : 'OFF';
    if (wantOn) sound.blip();
  });

  /* =====================================================
     RENDERING
     ===================================================== */
  const scoreBadge = (n, size = '') => {
    const cls = n >= 8 ? 'score--good' : n < 4.5 ? 'score--bad' : '';
    return `<span class="score ${cls} ${size}" aria-label="Gesamtnote ${fmt(n)} von 10">${fmt(n)}<small>/10</small></span>`;
  };

  const cubeTag = cube => `<span class="cube-tag" title="Cube Rule: ${esc(DATA.cubeRule[cube] || '')}">${CUBE_EMOJI[cube] || '🍽️'} ${esc(cube)}</span>`;

  const photoOf = (s, i = 0) => s.photo
    ? `<img src="${esc(s.photo)}" alt="${esc(s.name)}" loading="lazy" />`
    : `<div class="placeholder" style="--ph-bg:${PH_COLORS[i % PH_COLORS.length]}" aria-hidden="true">${CUBE_EMOJI[s.cube] || '🥪'}<span class="placeholder__label">Foto folgt</span></div>`;

  // A sandwich card; opens the detail view
  function sandwichCard(s, { extra = '', flag = '', index = 0 } = {}) {
    const p = person(s.creator);
    return `
      <div class="s-card" role="button" tabindex="0" data-sandwich="${esc(s.id)}" aria-label="${esc(s.name)} von ${esc(p.name)} — Details öffnen">
        ${flag}
        <div class="s-card__photo">${photoOf(s, index)}</div>
        <div class="s-card__body">
          <div class="s-card__top">
            <div>
              <div class="s-card__name">${esc(s.name)}</div>
              <div class="s-card__by">${p.emoji} ${esc(p.name)} · ${esc(s.event.edition)}</div>
            </div>
            ${scoreBadge(s.overall)}
          </div>
          <div class="s-card__tags">${cubeTag(s.cube)}</div>
          ${extra}
          <span class="s-card__more">Stats ansehen →</span>
        </div>
      </div>`;
  }

  /* ── Ticker ── */
  function renderTicker() {
    const items = [
      `+++ Titelverteidiger: ${person(champion.creator).name} mit „${champion.name}“ +++`,
      `+++ ${sandwiches.length} Sandwiches bewertet, ${events.length} Abende überlebt +++`,
      `+++ Bestes Sandwich aller Zeiten: „${fame[0].name}“ (${fmt(fame[0].overall)}) +++`,
      `+++ Schlimmstes Sandwich aller Zeiten: „${shame[0].name}“ (${fmt(shame[0].overall)}). Wir reden nicht drüber. +++`,
      '+++ Die Cube Rule ist Gesetz +++',
      '+++ Sound einschalten für maximalen Crunch +++',
    ];
    // Doubled so the loop has no gap
    $('#ticker').innerHTML = [...items, ...items].map(t => `<span>${esc(t)}</span>`).join('');
  }

  /* ── Hero: title defender ── */
  function renderChampion() {
    const p = person(champion.creator);
    $('#champion').innerHTML = `
      <div class="champion__banner">★ Titelverteidiger ★</div>
      <button class="champion__trophy" id="trophy" aria-label="Pokal — Siegerfanfare abspielen">🏆</button>
      <p class="champion__hint">Klick den Pokal</p>
      <div class="champion__name">${p.emoji} ${esc(p.name)}</div>
      <p class="champion__meta">Gewinner von <b>${esc(latestEvent.title)}</b><br />${fmtDate(latestEvent.date)}</p>
      <button class="champion__sandwich" data-sandwich="${esc(champion.id)}">
        <span><b>${esc(champion.name)}</b><span>${esc(champion.cube)} · Details ansehen →</span></span>
        ${scoreBadge(champion.overall)}
      </button>`;

    const trophy = $('#trophy');
    trophy.addEventListener('click', () => {
      sound.fanfare();
      trophy.classList.remove('is-cheering');
      void trophy.offsetWidth;   // restart the animation
      trophy.classList.add('is-cheering');
    });
  }

  /* ── Leaderboard ── */
  function renderLeaderboard() {
    const medals = ['🥇', '🥈', '🥉'];
    $('#leaderboardList').innerHTML = leaderboard.map((r, i) => `
      <div class="lb-row ${i === 0 ? 'lb-row--first' : ''}">
        <div class="lb-rank">${medals[i] || '#' + (i + 1)}</div>
        <div class="avatar" style="background:${r.person.color}22">${r.person.emoji}</div>
        <div>
          <div class="lb-name">${esc(r.person.name)}</div>
          <div class="lb-tagline">${esc(r.person.tagline || '')}</div>
        </div>
        <div class="lb-stats">
          <div class="lb-stat lb-stat--wins"><b>${r.wins}</b><span>Siege</span></div>
          <div class="lb-stat"><b>${r.entries}</b><span>Teilnahmen</span></div>
          <div class="lb-stat lb-stat--avg"><b>${fmt(r.average)}</b><span>Ø Note</span></div>
        </div>
      </div>`).join('');
  }

  /* ── Hall of Fame ── */
  function renderFame() {
    $('#podium').innerHTML = fame.map((s, i) => `
      <div class="podium__place podium__place--${i + 1}">
        ${sandwichCard(s, {
          index: i,
          flag: i === 0 ? '<span class="fame-badge" aria-hidden="true">#1</span>' : `<span class="fame-badge" style="background:${i === 1 ? 'var(--diner-cheddar)' : 'var(--diner-kraft)'};color:var(--diner-black)" aria-hidden="true">#${i + 1}</span>`,
        })}
        <div class="podium__block" aria-hidden="true">${i + 1}</div>
      </div>`).join('');
  }

  /* ── Hall of Shame ── */
  function renderShame() {
    $('#shameList').innerHTML = shame.map((s, i) => sandwichCard(s, {
      index: i + 2,
      extra: `<div class="shame-note"><b>Tatbestand:</b> ${esc(s.disaster || 'Wurde aus Höflichkeit aufgegessen. Größtenteils.')}</div>`,
    })).join('');
  }

  /* ── Chronik ── */
  const tilt = i => ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg'][i % 5];

  function eventHtml(ev) {
    const host   = person(ev.host);
    const winner = winnerOf(ev);
    const wp     = person(winner.creator);
    const entries = sandwiches.filter(s => s.event === ev).sort((a, b) => b.overall - a.overall);

    const judgesOf = s => Object.entries(s.scores)
      .map(([id, v]) => `<span class="judge" title="${esc(person(id).name)}">${person(id).emoji} <b>${fmt(v)}</b></span>`)
      .join('');

    return `
      <article class="event ${ev.special ? 'event--special' : ''}" aria-labelledby="ev-${esc(ev.id)}">
        <header class="event__head">
          <div>
            <span class="event__edition">${esc(ev.edition)}</span>
            <h3 class="event__title" id="ev-${esc(ev.id)}">${esc(ev.title)}</h3>
          </div>
          <div class="event__facts">
            <span class="fact">📅 <b>${fmtDate(ev.date)}</b></span>
            <span class="fact">🏠 Host: <b>${esc(host.name)}</b></span>
            ${ev.guest ? `<span class="fact">⭐ Gast: <b>${esc(person(ev.guest).name)}</b></span>` : ''}
            ${ev.location ? `<span class="fact">📍 ${esc(ev.location)}</span>` : ''}
          </div>
        </header>

        <div class="event__body">
          <div>
            <h4 class="sub-title">Sieger des Abends</h4>
            <button class="event-winner" data-sandwich="${esc(winner.id)}">
              <span class="event-winner__icon" aria-hidden="true">🏆</span>
              <span>
                <span class="event-winner__label">Winner Winner Sandwich Dinner</span>
                <span class="event-winner__name">${esc(winner.name)}</span><br />
                <span class="event-winner__by">${wp.emoji} ${esc(wp.name)}</span>
              </span>
              ${scoreBadge(winner.overall)}
            </button>
          </div>

          <div>
            <h4 class="sub-title">Impressionen</h4>
            <div class="gallery">
              ${(ev.photos || []).map((ph, i) => `
                <figure class="polaroid" style="--tilt:${tilt(i)}">
                  <div class="polaroid__img">${ph.src
                    ? `<img src="${esc(ph.src)}" alt="${esc(ph.caption)}" loading="lazy" />`
                    : `<div class="placeholder" style="--ph-bg:${PH_COLORS[i % PH_COLORS.length]}" aria-hidden="true">${ph.emoji || '📸'}</div>`}</div>
                  <figcaption>${esc(ph.caption)}</figcaption>
                </figure>`).join('')}
            </div>
          </div>

          <div>
            <h4 class="sub-title">Alle Sandwiches & Wertungen</h4>
            <div class="entries">
              ${entries.map((s, i) => sandwichCard(s, {
                index: i,
                flag: s === winner ? '<span class="winner-flag">★ Sieger</span>' : '',
                extra: `<div class="judges" aria-label="Einzelwertungen">${judgesOf(s)}</div>`,
              })).join('')}
            </div>
          </div>

          <div>
            <h4 class="sub-title">Trashtalk & Zitate</h4>
            <div class="comments">
              ${(ev.comments || []).map(c => {
                const a = person(c.author);
                return `
                  <div class="comment">
                    <div class="avatar" style="background:${a.color || '#E4D5BC'}22" aria-hidden="true">${a.emoji}</div>
                    <div class="comment__bubble">
                      <div class="comment__author">${esc(a.name)}</div>
                      <div class="comment__text">${esc(c.text)}</div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderChronik() {
    const newestFirst = [...events].reverse();
    const tabs = $('#eventTabs');
    tabs.innerHTML = newestFirst.map((ev, i) => `
      <button class="event-tab ${ev.special ? 'event-tab--special' : ''}" role="tab" id="tab-${esc(ev.id)}"
              aria-selected="${i === 0}" aria-controls="eventList" data-event="${esc(ev.id)}">
        ${ev.special ? '⭐ ' : ''}${esc(ev.edition)} · ${new Date(ev.date).getFullYear()}
      </button>`).join('');

    const show = id => {
      const ev = events.find(e => e.id === id);
      $('#eventList').innerHTML = eventHtml(ev);
      $('#eventList').setAttribute('aria-labelledby', 'tab-' + id);
      tabs.querySelectorAll('.event-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.event === id)));
    };

    tabs.addEventListener('click', e => {
      const tab = e.target.closest('.event-tab');
      if (tab) show(tab.dataset.event);
    });
    $('#eventList').setAttribute('role', 'tabpanel');
    show(newestFirst[0].id);
  }

  /* ── Radar / stat hexagon (SVG) ── */
  function radarSvg(stats) {
    const axes = DATA.statAxes;
    const size = 320, c = size / 2, R = 104;
    const angle = i => (-90 + i * (360 / axes.length)) * Math.PI / 180;
    const pt = (i, r) => [c + Math.cos(angle(i)) * r, c + Math.sin(angle(i)) * r];
    const poly = r => axes.map((_, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');

    const rings = [2, 4, 6, 8].map(v => `<polygon class="radar__ring" points="${poly(R * v / 10)}" />`).join('');
    const spokes = axes.map((_, i) => { const [x, y] = pt(i, R); return `<line class="radar__axis" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`; }).join('');
    const shape = axes.map((a, i) => pt(i, R * (stats[a.key] || 0) / 10).map(n => n.toFixed(1)).join(',')).join(' ');
    const dots = axes.map((a, i) => { const [x, y] = pt(i, R * (stats[a.key] || 0) / 10); return `<circle class="radar__dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" />`; }).join('');
    const labels = axes.map((a, i) => {
      const [x, y] = pt(i, R + 22);
      const anchor = Math.abs(x - c) < 4 ? 'middle' : x > c ? 'start' : 'end';
      const dy = y < c - 20 ? -4 : y > c + 20 ? 12 : 4;
      return `<text class="radar__label" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(a.short)}</text>
              <text class="radar__value" x="${x.toFixed(1)}" y="${(y + dy + 12).toFixed(1)}" text-anchor="${anchor}">${stats[a.key] ?? '–'}/10</text>`;
    }).join('');

    return `
      <svg class="radar" viewBox="-40 -10 ${size + 80} ${size + 20}" role="img"
           aria-label="Stat-Diagramm: ${axes.map(a => `${a.label} ${stats[a.key]} von 10`).join(', ')}">
        <polygon class="radar__ring radar__ring--outer" points="${poly(R)}" />
        ${rings}${spokes}
        <polygon class="radar__shape" points="${shape}" />
        ${dots}${labels}
      </svg>`;
  }

  /* ── Detail modal ── */
  const modal = $('#modal');
  let lastFocus = null;

  function openDetail(id) {
    const s = sandwichById[id];
    if (!s) return;
    const p = person(s.creator);
    const won = winnerOf(s.event) === s;
    const rank = byScore.indexOf(s) + 1;

    $('#modalBody').innerHTML = `
      <div class="detail">
        <div class="detail__photo">${photoOf(s, rank)}</div>
        <div class="detail__body">
          <div class="detail__head">
            <div>
              <h2 class="detail__name" id="modalTitle">${esc(s.name)}</h2>
              <p class="detail__meta">${p.emoji} von <b>${esc(p.name)}</b> · ${esc(s.event.edition)}, ${fmtDate(s.event.date)}${won ? ' · 🏆 <b>Sieger des Abends</b>' : ''}</p>
            </div>
            ${scoreBadge(s.overall)}
          </div>

          ${s.description ? `<p class="detail__desc">${esc(s.description)}</p>` : ''}

          <div class="cube-box">
            <b>Cube Rule of Food: ${CUBE_EMOJI[s.cube] || ''} ${esc(s.cube)}</b>
            ${esc(DATA.cubeRule[s.cube] || '')}
          </div>

          <div class="detail__grid">
            ${radarSvg(s.stats)}
            <div class="stats">
              ${DATA.statAxes.map(a => {
                const v = s.stats[a.key] || 0;
                // For heart attack risk, high isn't "good" — keep it orange
                const cls = a.key === 'heart' ? '' : v >= 8 ? 'is-high' : v <= 3 ? 'is-low' : '';
                return `
                  <div>
                    <div class="stat__row"><span>${esc(a.label)}</span><span>${v}/10</span></div>
                    <div class="stat__bar"><span class="${cls}" style="width:${v * 10}%"></span></div>
                    <div class="stat__hint">${esc(a.hint)}</div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <div>
            <h3 class="sub-title">Einzelwertungen</h3>
            <div class="judges">
              ${Object.entries(s.scores).map(([jid, v]) => `<span class="judge">${person(jid).emoji} ${esc(person(jid).name)}: <b>${fmt(v)}</b></span>`).join('')}
            </div>
          </div>

          ${s.disaster ? `<div class="shame-note"><b>Tatbestand:</b> ${esc(s.disaster)}</div>` : ''}
          <p class="pixel-label">Platz ${rank} von ${sandwiches.length} aller Zeiten</p>
        </div>
      </div>`;

    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal__panel').scrollTop = 0;
    modal.querySelector('.modal__close').focus();
    if (won && winnerOf(latestEvent) === s) sound.fanfare(); else sound.crunch();
  }

  function closeDetail() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDetail(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDetail();
  });

  // Any [data-sandwich] opens its detail view; hovering a card crunches
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-sandwich]');
    if (el && !modal.contains(el)) openDetail(el.dataset.sandwich);
  });
  // Keyboard for the card-style buttons (role=button)
  document.addEventListener('keydown', e => {
    const el = e.target.closest?.('[data-sandwich][role="button"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(el.dataset.sandwich); }
  });
  document.addEventListener('mouseover', e => {
    const card = e.target.closest('.s-card');
    if (!card || card.contains(e.relatedTarget)) return;   // only on entering the card
    sound.crunch();
    if (sound.on) {
      card.classList.remove('is-crunching');
      void card.offsetWidth;
      card.classList.add('is-crunching');
    }
  });

  /* ── 2005 visitor counter (per browser, purely for nostalgia) ── */
  function renderCounter() {
    let visits = 1;
    try {
      visits = (parseInt(localStorage.getItem('sandwichVisits'), 10) || 0) + 1;
      localStorage.setItem('sandwichVisits', visits);
    } catch (e) {}
    $('#visitorCounter').textContent = String(1336 + visits).padStart(6, '0');
  }

  /* ── Go ── */
  renderTicker();
  renderChampion();
  renderLeaderboard();
  renderFame();
  renderShame();
  renderChronik();
  renderCounter();
})();
