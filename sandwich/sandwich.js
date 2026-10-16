/* =====================================================
   SANDWICHABEND — renders everything from window.SANDWICH_DATA
   (see sandwich-data.js). No build step, no dependencies.
   Most data is optional: whatever is missing is left out.
   ===================================================== */
(function () {
  const DATA = window.SANDWICH_DATA;

  /* ── Helpers ── */
  const $  = sel => document.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const fmt = n => n.toFixed(1).replace('.', ',');
  const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  const people   = Object.fromEntries(DATA.people.map(p => [p.id, p]));
  const person   = id => people[id] || { name: id };
  const regulars = DATA.people.filter(p => !p.guest);

  const CUBE_EMOJI = { Sandwich: '🥪', Toast: '🍞', Taco: '🌮', Sushi: '🍣', Quiche: '🥧', Calzone: '🥟', Salad: '🥗', Cake: '🍰' };

  // Initial in a coloured circle — no invented emojis for real people
  const avatar = (p, extraCls = '') =>
    `<span class="avatar ${extraCls}" style="--av:${p.color || 'var(--diner-kraft)'}" aria-hidden="true">${esc((p.name || '?').charAt(0))}</span>`;

  const nameOf = s => s.name || 'Name folgt';

  /* ── Derived data ── */
  // Events in data order (oldest first)
  const events = [...DATA.events];

  // Every sandwich with its evening; overall = final score if given, else average of judges (null if unrated)
  const sandwiches = events.flatMap(ev => (ev.sandwiches || []).map(s => ({
    ...s,
    event: ev,
    overall: typeof s.score === 'number' ? s.score : avg(Object.values(s.scores || {})),
  })));
  const sandwichById = Object.fromEntries(sandwiches.map(s => [s.id, s]));
  const rated = sandwiches.filter(s => s.overall !== null);

  // Does a sandwich have anything worth a detail view?
  // The description alone is shown on the card itself, so it doesn't need the detail view
  const hasDetails = s => !!(s.overall !== null || s.stats || s.cube || s.photo || s.disaster);

  // Ranking order: higher score first; on a tie, more favourite votes wins (house rule)
  const byRank = (a, b) => (b.overall ?? -1) - (a.overall ?? -1) || (b.favoriteVotes ?? 0) - (a.favoriteVotes ?? 0);

  // Winner: set explicitly, otherwise the best rated sandwich of the evening
  function winnerOf(ev) {
    if (ev.winner) return sandwichById[ev.winner] || null;
    return sandwiches
      .filter(s => s.event === ev && s.overall !== null)
      .sort(byRank)[0] || null;
  }

  // Title defender = winner of the most recent evening that has one
  const championEvent = [...events].reverse().find(ev => winnerOf(ev));
  const champion      = championEvent ? winnerOf(championEvent) : null;

  // All-time leaderboard — regulars only
  const leaderboard = regulars.map(p => {
    const own = sandwiches.filter(s => s.creator === p.id);
    return {
      person: p,
      wins: events.filter(ev => winnerOf(ev)?.creator === p.id).length,
      average: avg(own.filter(s => s.overall !== null).map(s => s.overall)),
    };
  }).sort((a, b) => b.wins - a.wins || (b.average ?? -1) - (a.average ?? -1));
  const hasRanking = leaderboard.some(r => r.wins > 0 || r.average !== null);

  // Fame = best rated; Shame = worst rated that aren't already famous
  const byScore = [...rated].sort(byRank);
  const fame  = byScore.slice(0, 3);
  const shame = [...byScore].reverse().filter(s => !fame.includes(s)).slice(0, 3);

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
  const scoreBadge = n => {
    if (n === null || n === undefined) return '';
    const cls = n >= 8 ? 'score--good' : n < 4.5 ? 'score--bad' : '';
    return `<span class="score ${cls}" aria-label="Gesamtnote ${fmt(n)} von 10">${fmt(n)}<small>/10</small></span>`;
  };

  // Favourite-sandwich votes — the tie-breaker
  const favVotes = s => s.favoriteVotes
    ? `<span class="fav-votes">♥ ${s.favoriteVotes} ${s.favoriteVotes === 1 ? 'Lieblings-Vote' : 'Lieblings-Votes'}</span>`
    : '';

  const cubeTag = cube => cube
    ? `<span class="cube-tag" title="Cube Rule: ${esc(DATA.cubeRule[cube] || '')}">${CUBE_EMOJI[cube] || '🍽️'} ${esc(cube)}</span>`
    : '';

  const emptyState = (icon, title, text) => `
    <div class="empty-state">
      <span class="empty-state__icon" aria-hidden="true">${icon}</span>
      <div><b>${esc(title)}</b><p>${esc(text)}</p></div>
    </div>`;

  // A sandwich card. Only clickable when there's something to show in the detail view.
  function sandwichCard(s, { extra = '', flag = '' } = {}) {
    const p = person(s.creator);
    const clickable = hasDetails(s);
    const attrs = clickable
      ? `role="button" tabindex="0" data-sandwich="${esc(s.id)}" aria-label="${esc(nameOf(s))} von ${esc(p.name)} — Details öffnen"`
      : '';
    return `
      <div class="s-card ${clickable ? '' : 's-card--plain'}" ${attrs}>
        ${flag}
        ${s.photo ? `<div class="s-card__photo"><img src="${esc(s.photo)}" alt="${esc(nameOf(s))}" loading="lazy" /></div>` : ''}
        <div class="s-card__body">
          <div class="s-card__top">
            <div class="s-card__who">
              ${avatar(p, 'avatar--sm')}
              <div>
                <div class="s-card__name ${s.name ? '' : 'is-missing'}">${esc(nameOf(s))}</div>
                <div class="s-card__by">${esc(p.name)}${p.guest ? ' · Gast' : ''}</div>
              </div>
            </div>
            ${scoreBadge(s.overall)}
          </div>
          ${s.description ? `<p class="s-card__desc">${esc(s.description)}</p>` : ''}
          ${s.cube ? `<div class="s-card__tags">${cubeTag(s.cube)}</div>` : ''}
          ${extra}
          ${clickable ? '<span class="s-card__more">Details ansehen →</span>' : ''}
        </div>
      </div>`;
  }

  /* ── Ticker ── */
  function renderTicker() {
    const items = [
      `+++ ${events.length} Sandwichabende überlebt, ${sandwiches.length} Sandwiches gebaut +++`,
      champion ? `+++ Titelverteidiger: ${person(champion.creator).name} +++` : '+++ Titel aktuell vakant +++',
      fame[0] ? `+++ Bestes Sandwich aller Zeiten: „${nameOf(fame[0])}“ (${fmt(fame[0].overall)}) +++` : '+++ Bewertet wird ab dem nächsten Abend +++',
      '+++ Die Cube Rule ist Gesetz +++',
      '+++ Sound einschalten für maximalen Crunch +++',
    ];
    // Doubled so the loop has no gap
    $('#ticker').innerHTML = [...items, ...items].map(t => `<span>${esc(t)}</span>`).join('');
  }

  /* ── Hero: title defender ── */
  function renderChampion() {
    const body = champion ? (() => {
      const p = person(champion.creator);
      return `
        <div class="champion__name">${esc(p.name)}</div>
        <p class="champion__meta">Gewinner von <b>${esc(championEvent.title)}</b>${championEvent.date ? `<br />${fmtDate(championEvent.date)}` : ''}</p>
        ${champion.name || hasDetails(champion) ? `
          <button class="champion__sandwich" ${hasDetails(champion) ? `data-sandwich="${esc(champion.id)}"` : 'disabled'}>
            <span><b>${esc(nameOf(champion))}</b>${hasDetails(champion) ? '<span>Details ansehen →</span>' : ''}</span>
            ${scoreBadge(champion.overall)}
          </button>` : ''}`;
    })() : `
        <div class="champion__name">Titel vakant</div>
        <p class="champion__meta">Für die bisherigen Abende ist kein Sieger eingetragen. Der nächste Abend entscheidet.</p>`;

    $('#champion').innerHTML = `
      <div class="champion__banner">★ Titelverteidiger ★</div>
      <button class="champion__trophy" id="trophy" aria-label="Pokal — Siegerfanfare abspielen">🏆</button>
      <p class="champion__hint">Klick den Pokal</p>
      ${body}`;

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
      <div class="lb-row ${hasRanking && i === 0 ? 'lb-row--first' : ''}">
        <div class="lb-rank">${hasRanking ? (medals[i] || '#' + (i + 1)) : '–'}</div>
        ${avatar(r.person)}
        <div>
          <div class="lb-name">${esc(r.person.name)}</div>
          ${r.person.tagline ? `<div class="lb-tagline">${esc(r.person.tagline)}</div>` : ''}
        </div>
        <div class="lb-stats">
          <div class="lb-stat lb-stat--wins"><b>${r.wins}</b><span>Siege</span></div>
          <div class="lb-stat ${r.average !== null ? 'lb-stat--avg' : ''}"><b>${r.average !== null ? fmt(r.average) : '–'}</b><span>Ø Note</span></div>
        </div>
      </div>`).join('') +
      (hasRanking ? '' : '<p class="lb-note">Für die bisherigen Abende gibt es keine Wertungen. Sobald Noten und Sieger eingetragen sind, entsteht hier die Rangliste.</p>');
  }

  /* ── Wins column chart — one column per regular, coloured by person ── */
  function renderWinsChart() {
    const chart = $('#leaderboardChart');
    const max   = Math.max(1, ...leaderboard.map(r => r.wins));
    const ticks = Array.from({ length: max + 1 }, (_, i) => i);   // whole wins only
    const pct   = n => (n / max) * 100;

    // Which evenings someone won, for the tooltip
    const winsOf = p => events
      .filter(ev => winnerOf(ev)?.creator === p.id)
      .map(ev => `${ev.edition}${winnerOf(ev).name ? ` (${winnerOf(ev).name})` : ''}`);

    chart.style.setProperty('--cols', leaderboard.length);
    chart.innerHTML = `
      <figcaption class="lb-chart__title">Siege aller Zeiten</figcaption>
      <div class="lb-chart__plot">
        <div class="lb-chart__grid" aria-hidden="true">
          ${ticks.map(t => `<span class="lb-chart__tick" style="bottom:${pct(t)}%"><i>${t}</i></span>`).join('')}
        </div>
        <div class="lb-chart__cols" role="list">
          ${leaderboard.map(r => {
            const list = winsOf(r.person);
            const text = `${r.person.name}: ${r.wins} ${r.wins === 1 ? 'Sieg' : 'Siege'}${list.length ? ' · ' + list.join(', ') : ''}`;
            return `
              <div class="lb-col" style="--h:${pct(r.wins)}%;--c:${r.person.color}" role="listitem" tabindex="0" aria-label="${esc(text)}" data-tip="${esc(text)}">
                <span class="lb-col__value">${r.wins}</span>
                <span class="lb-col__fill"></span>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="lb-chart__names" aria-hidden="true">
        ${leaderboard.map(r => `<span>${esc(r.person.name)}</span>`).join('')}
      </div>
      <div class="lb-chart__tip" role="tooltip" hidden></div>`;

    // Hover / focus tooltip, centred above the hovered column
    const tip = chart.querySelector('.lb-chart__tip');
    const show = col => {
      tip.textContent = col.dataset.tip;
      tip.hidden = false;
      const c = chart.getBoundingClientRect();
      const v = col.querySelector('.lb-col__value').getBoundingClientRect();
      const left = v.left + v.width / 2 - c.left - tip.offsetWidth / 2;
      tip.style.left = `${Math.max(8, Math.min(left, c.width - tip.offsetWidth - 8))}px`;
      tip.style.top  = `${v.top - c.top - tip.offsetHeight - 6}px`;
    };
    const hide = () => { tip.hidden = true; };
    chart.querySelectorAll('.lb-col').forEach(col => {
      col.addEventListener('mouseenter', () => show(col));
      col.addEventListener('focus', () => show(col));
      col.addEventListener('mouseleave', hide);
      col.addEventListener('blur', hide);
    });
  }

  /* ── House rules ── */
  function renderRules() {
    const rules = DATA.rules || [];
    $('#rulesList').innerHTML = rules.map((r, i) => `
      <li class="rule">
        <span class="rule__no" aria-hidden="true">§${i + 1}</span>
        <div class="rule__body">
          <div class="rule__head">
            <h3 class="rule__title">${esc(r.title)}</h3>
            ${r.since ? `<span class="rule__since">Seit ${esc(r.since)}</span>` : ''}
          </div>
          <p class="rule__text">${esc(r.text)}</p>
          ${r.reason ? `<p class="rule__reason"><b>Warum?</b> ${esc(r.reason)}</p>` : ''}
        </div>
      </li>`).join('');
  }

  /* ── Hall of Fame ── */
  function renderFame() {
    if (!fame.length) {
      $('#podium').outerHTML = `<div id="podium">${emptyState('🏆', 'Das Podest ist noch leer.', 'Sobald Sandwiches Noten bekommen, stehen hier die drei besten aller Zeiten.')}</div>`;
      return;
    }
    const badge = i => `<span class="fame-badge" style="${i === 0 ? '' : `background:${i === 1 ? 'var(--diner-cheddar)' : 'var(--diner-kraft)'};color:var(--diner-black)`}" aria-hidden="true">#${i + 1}</span>`;
    $('#podium').innerHTML = fame.map((s, i) => `
      <div class="podium__place podium__place--${i + 1}">
        ${sandwichCard(s, { flag: badge(i) })}
        <div class="podium__block" aria-hidden="true">${i + 1}</div>
      </div>`).join('');
  }

  /* ── Hall of Shame ── */
  function renderShame() {
    if (!shame.length) {
      $('#shameList').outerHTML = `<div id="shameList">${emptyState('🧼', 'Noch keine Schande dokumentiert.', 'Die Akten sind leer. Das wird nicht so bleiben.')}</div>`;
      return;
    }
    $('#shameList').innerHTML = shame.map(s => sandwichCard(s, {
      extra: s.disaster ? `<div class="shame-note"><b>Tatbestand:</b> ${esc(s.disaster)}</div>` : '',
    })).join('');
  }

  /* ── Chronik ── */
  const tilt = i => ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg'][i % 5];

  function eventHtml(ev) {
    const winner  = winnerOf(ev);
    // Winner first, then by score
    const entries = sandwiches.filter(s => s.event === ev)
      .sort((a, b) => (b === winner) - (a === winner) || byRank(a, b));

    const judgesOf = s => s.scores
      ? `<div class="judges" aria-label="Einzelwertungen">${Object.entries(s.scores)
          .map(([id, v]) => `<span class="judge">${esc(person(id).name)} <b>${fmt(v)}</b></span>`).join('')}</div>`
      : '';
    const cardExtra = s => favVotes(s) + judgesOf(s);

    const facts = [
      ev.date     && `📅 <b>${fmtDate(ev.date)}</b>`,
      ev.host     && `🏠 Host: <b>${esc(person(ev.host).name)}</b>`,
      ev.guest    && `⭐ Gast: <b>${esc(person(ev.guest).name)}</b>`,
      ev.location && `📍 ${esc(ev.location)}`,
    ].filter(Boolean);

    const winnerBlock = winner ? `
      <button class="event-winner" ${hasDetails(winner) ? `data-sandwich="${esc(winner.id)}"` : 'disabled'}>
        <span class="event-winner__icon" aria-hidden="true">🏆</span>
        <span>
          <span class="event-winner__label">Winner Winner Sandwich Dinner</span>
          <span class="event-winner__name">${esc(nameOf(winner))}</span><br />
          <span class="event-winner__by">${esc(person(winner.creator).name)}</span>
        </span>
        ${scoreBadge(winner.overall)}
      </button>` : `
      <div class="event-winner event-winner--empty">
        <span class="event-winner__icon" aria-hidden="true">❔</span>
        <span>
          <span class="event-winner__label">Sieger</span>
          <span class="event-winner__name">Nicht überliefert</span>
        </span>
      </div>`;

    return `
      <article class="event ${ev.special ? 'event--special' : ''}" aria-labelledby="ev-${esc(ev.id)}">
        <header class="event__head">
          <div>
            <span class="event__edition">${esc(ev.edition)}</span>
            <h3 class="event__title" id="ev-${esc(ev.id)}">${esc(ev.title)}</h3>
          </div>
          ${facts.length ? `<div class="event__facts">${facts.map(f => `<span class="fact">${f}</span>`).join('')}</div>` : ''}
        </header>

        <div class="event__body">
          <div>
            <h4 class="sub-title">Sieger des Abends</h4>
            ${winnerBlock}
          </div>

          ${ev.photos?.length ? `
          <div>
            <h4 class="sub-title">Impressionen</h4>
            <div class="gallery">
              ${ev.photos.map((ph, i) => `
                <figure class="polaroid" style="--tilt:${tilt(i)}">
                  <div class="polaroid__img"><img src="${esc(ph.src)}" alt="${esc(ph.caption || '')}" loading="lazy" /></div>
                  ${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}
                </figure>`).join('')}
            </div>
          </div>` : ''}

          <div>
            <h4 class="sub-title">Die Sandwiches</h4>
            <div class="entries">
              ${entries.map(s => sandwichCard(s, {
                flag: s === winner ? '<span class="winner-flag">★ Sieger</span>' : '',
                extra: cardExtra(s),
              })).join('')}
            </div>
          </div>

          ${ev.comments?.length ? `
          <div>
            <h4 class="sub-title">Trashtalk & Zitate</h4>
            <div class="comments">
              ${ev.comments.map(c => {
                const a = person(c.author);
                return `
                  <div class="comment">
                    ${avatar(a)}
                    <div class="comment__bubble">
                      <div class="comment__author">${esc(a.name)}</div>
                      <div class="comment__text">${esc(c.text)}</div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>
      </article>`;
  }

  function renderChronik() {
    const newestFirst = [...events].reverse();
    const tabs = $('#eventTabs');
    tabs.innerHTML = newestFirst.map((ev, i) => `
      <button class="event-tab ${ev.special ? 'event-tab--special' : ''}" role="tab" id="tab-${esc(ev.id)}"
              aria-selected="${i === 0}" aria-controls="eventList" data-event="${esc(ev.id)}">
        ${ev.special ? '⭐ ' : ''}${esc(ev.edition)}${ev.date ? ' · ' + ev.date.slice(0, 4) : ''}
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

  /* ── Detail modal — shows only what's known ── */
  const modal = $('#modal');
  let lastFocus = null;

  function openDetail(id) {
    const s = sandwichById[id];
    if (!s || !hasDetails(s)) return;
    const p = person(s.creator);
    const won = winnerOf(s.event) === s;
    const rank = byScore.indexOf(s) + 1;

    const statsBlock = s.stats ? `
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
      </div>` : '';

    $('#modalBody').innerHTML = `
      <div class="detail">
        ${s.photo ? `<div class="detail__photo"><img src="${esc(s.photo)}" alt="${esc(nameOf(s))}" /></div>` : ''}
        <div class="detail__body ${s.photo ? '' : 'detail__body--no-photo'}">
          <div class="detail__head">
            <div>
              <h2 class="detail__name" id="modalTitle">${esc(nameOf(s))}</h2>
              <p class="detail__meta">von <b>${esc(p.name)}</b> · ${esc(s.event.title)}${s.event.date ? ', ' + fmtDate(s.event.date) : ''}${won ? ' · 🏆 <b>Sieger des Abends</b>' : ''}</p>
            </div>
            ${scoreBadge(s.overall)}
          </div>

          ${s.description ? `<p class="detail__desc">${esc(s.description)}</p>` : ''}
          ${favVotes(s)}

          ${s.cube ? `
          <div class="cube-box">
            <b>Cube Rule of Food: ${CUBE_EMOJI[s.cube] || ''} ${esc(s.cube)}</b>
            ${esc(DATA.cubeRule[s.cube] || '')}
          </div>` : ''}

          ${statsBlock}

          ${s.scores ? `
          <div>
            <h3 class="sub-title">Einzelwertungen</h3>
            <div class="judges">
              ${Object.entries(s.scores).map(([jid, v]) => `<span class="judge">${esc(person(jid).name)}: <b>${fmt(v)}</b></span>`).join('')}
            </div>
          </div>` : ''}

          ${s.disaster ? `<div class="shame-note"><b>Tatbestand:</b> ${esc(s.disaster)}</div>` : ''}
          ${rank ? `<p class="pixel-label">Platz ${rank} von ${rated.length} aller Zeiten</p>` : ''}
        </div>
      </div>`;

    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal__panel').scrollTop = 0;
    modal.querySelector('.modal__close').focus();
    if (won && champion === s) sound.fanfare(); else sound.crunch();
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

  /* ── 2005 visitor counter — shared via /api/counter ──
     Each browser is counted once (anonymous id in localStorage);
     the counter shows all visitors so far. */
  async function renderCounter() {
    const el = $('#visitorCounter');
    let visitor = null;
    try {
      visitor = localStorage.getItem('sandwichVisitor');
      if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem('sandwichVisitor', visitor); }
      localStorage.removeItem('sandwichVisitCount');   // old per-browser counters
      localStorage.removeItem('sandwichVisits');
    } catch (e) {}

    try {
      const res = visitor
        ? await fetch('/api/counter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: 'sandwich', visitor }),
          })
        : await fetch('/api/counter?page=sandwich');   // no storage: show, don't count
      if (!res.ok) throw new Error(res.status);
      const { count } = await res.json();
      el.textContent = String(count).padStart(6, '0');
    } catch (e) {
      el.textContent = '??????';
    }
  }

  /* ── Go ── */
  renderTicker();
  renderChampion();
  renderLeaderboard();
  renderWinsChart();
  renderRules();
  renderFame();
  renderShame();
  renderChronik();
  renderCounter();
})();
