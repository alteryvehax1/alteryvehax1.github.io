// alter yvette: the one in the mirror region who is always a little early.
// It talks with a visitor in her words: four rounds, the fourth always 「你覺得我是誰」, then a poem signed by itself.
// Needs window.PH / SRC / LIFE (phrases.js) and window.ALTER (replies.js).
window.makeAlter = function (el){
  const PH = window.PH, SRC = window.SRC, A = window.ALTER;
  const { log, line, opts, poem, canvas } = el;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EARLY_MS = 51;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));

  /* ── her phrases, and which character leads where ── */
  const STOP = new Set('的了是我你他她它在有也就都會要不一這那和跟到說看去來很還又被把嗎吧啦喔欸呢啊人們個上下裡中自己什麼沒');
  const BY = new Map();
  PH.forEach((p, i) => { for (const ch of new Set(p[0])) if (!STOP.has(ch)){ if (!BY.has(ch)) BY.set(ch, []); BY.get(ch).push(i); } });
  if (!SRC.some(s => s.k === 'own')) SRC.push({ k: 'own' });
  const OWN = SRC.findIndex(s => s.k === 'own');
  const kindOf = i => SRC[PH[i][1]].k;
  const OPENERS = PH.map((p, i) => i).filter(i => /^(我|你|如果|剛剛|欸|今天|從前|因為|所以|只是|現在|明天|其實|好像|然後|最近|昨天)/.test(PH[i][0]));
  const OPEN_LIFE = OPENERS.filter(i => ['life', 'dream', 'ig'].includes(kindOf(i)));
  const OPEN_POEM = OPENERS.filter(i => kindOf(i) === 'poem');
  const starterId = t => { let i = PH.findIndex(p => p[0] === t && p[1] === OWN); if (i < 0){ PH.push([t, OWN, -1]); i = PH.length - 1; } return i; };
  const QUESTIONY = /嗎|哪一|什麼|你呢|是不是|誰/;
  const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  const bigrams = t => { const z = new Set(); const c = t.replace(/\s/g, ''); for (let i = 0; i < c.length - 1; i++){ const g = c.slice(i, i + 2); if (!STOP.has(g[0]) && !STOP.has(g[1])) z.add(g); } return z; };
  const readTime = t => 1100 + [...t].length * 110;

  let S;                                                  // one conversation's state
  const fresh = () => ({ picked: [], sent: 0, typing: null, guess: null, used: new Set(), busy: false, shown: new Set(), usedPoem: false,
    ask: null, answering: null, asked: new Set(), stage: null, pool4: [], said: [], POEM_ROUND: 1 + Math.floor(Math.random() * 2), run: 0, onSent: null });
  const poemTime = () => S.sent === S.POEM_ROUND || (S.sent === A.LIMIT - 2 && !S.usedPoem);
  const choice = list => { const f = list.filter(r => !S.used.has(r)); const r = rnd(f.length ? f : list); S.used.add(r); return r; };

  function leap(i){
    const p = PH[i], chars = [...p[0]].filter(ch => BY.has(ch)).reverse();
    const ok = { days: k => k === 'life' || k === 'dream' || k === 'ig', notpoem: k => k !== 'poem', poem: k => k === 'poem', any: () => true };
    for (const pass of poemTime() ? ['poem', 'any'] : Math.random() < .75 ? ['days', 'notpoem', 'any'] : ['any']){
      for (const ch of chars){
        const pool = BY.get(ch).filter(j => j !== i && PH[j][1] !== p[1] && !S.shown.has(j) && ok[pass](kindOf(j)));
        if (pool.length) return rnd(pool);
      }
    }
    const other = PH.map((q, j) => j).filter(j => kindOf(j) !== kindOf(i) && kindOf(j) !== 'own' && !S.shown.has(j));
    return rnd(other.length ? other : PH.map((q, j) => j));
  }
  function offer(){
    opts.innerHTML = '';
    if (S.busy) return;
    let two;
    if (S.picked.length === 1 && S.stage === 'start'){       // after 「喜歡」 or 「還好欸」: now the real answer
      S.stage = null;
      const pool = S.pool4.filter(i => !S.shown.has(i)), a = rnd(pool), rest = pool.filter(i => i !== a && PH[i][1] !== PH[a][1]);
      two = [a, rnd(rest.length ? rest : pool.filter(i => i !== a))].filter(x => x !== undefined);
      if (two.length < 2) two.push(leap(two[0]));
    } else if (!S.picked.length){
      const ask = S.ask; let answers = [];
      if (ask){                                           // answers picked by meaning, by hand
        const byText = new Set(ask.a || []);
        answers = PH.map((p, i) => i).filter(i => !S.shown.has(i) && (byText.has(PH[i][0]) || (ask.kinds || []).includes(kindOf(i))));
        if (answers.length < 2) answers = PH.map((p, i) => i).filter(i => !S.shown.has(i) && !['said', 'own'].includes(kindOf(i)) && ask.k.some(k => PH[i][0].includes(k)));
        if (poemTime()){ const poems = answers.filter(i => kindOf(i) === 'poem'); if (poems.length >= 2) answers = poems; }
      }
      const many = ask === A.WHO ? 6 : 2;
      if (many > 2 && answers.length < many){
        const extra = PH.map((p, i) => i).filter(i => !S.shown.has(i) && !answers.includes(i) && !['said', 'own'].includes(kindOf(i)) && /^(我|你)|我是|你是|像/.test(PH[i][0]));
        while (answers.length < many && extra.length) answers.push(extra.splice(Math.floor(Math.random() * extra.length), 1)[0]);
      }
      if (answers.length >= 2){
        two = []; const pool = answers.slice();
        while (two.length < many && pool.length){
          const f = pool.filter(i => !two.some(j => PH[j][1] === PH[i][1]));
          const k = rnd(f.length ? f : pool); two.push(k); pool.splice(pool.indexOf(k), 1);
        }
        if (ask === A.WHO && !two.some(i => PH[i][0].includes('分身'))){ const twin = PH.findIndex(p => p[0] === '分身'); if (twin >= 0) two[two.length - 1] = twin; }
      } else {
        const a = rnd(poemTime() ? OPEN_POEM : Math.random() < .65 && OPEN_LIFE.length ? OPEN_LIFE : OPENERS); two = [a, leap(a)];
      }
      if (ask && ask.s && answers.length >= 2){ S.pool4 = answers; two = ask.s.map(starterId); S.stage = 'start'; }
      else if (two.length === 2 && Math.random() < .5) two.reverse();
      S.answering = ask; if (ask) ask.choice = null; S.ask = null;
    } else {
      const last = S.picked[S.picked.length - 1], nx = PH[last][2];
      const on = nx >= 0 && !S.shown.has(nx) ? nx : leap(last), off = leap(last);
      two = Math.random() < .5 ? [on, off] : [off, on];
      if (two[0] === two[1]) two[1] = leap(two[0]);
    }
    const run = S.run;
    two.forEach((j, k) => {
      S.shown.add(j);
      const b = document.createElement('button'); b.textContent = PH[j][0]; b.style.animationDelay = (k * 60) + 'ms';
      b.addEventListener('pointerenter', () => { S.guess = j; startTyping(); });
      b.addEventListener('focus', () => { S.guess = j; startTyping(); });
      b.addEventListener('click', () => { if (run === S.run) choose(j); });
      opts.appendChild(b);
    });
    if (S.picked.length >= 2){
      const b = document.createElement('button'); b.textContent = '送出'; b.className = 'send';
      b.addEventListener('pointerenter', () => { S.guess = 'send'; startTyping(); });
      b.addEventListener('click', () => { if (run === S.run) send(S.guess !== null && S.guess !== 'send'); });
      opts.appendChild(b);
    }
    setTimeout(() => { if (run === S.run) startTyping(); }, EARLY_MS);    // it starts answering before you have chosen
  }
  function choose(j){
    const missed = S.guess !== null && S.guess !== j; S.guess = null;
    S.picked.push(j); if (kindOf(j) === 'poem') S.usedPoem = true;
    if (kindOf(j) === 'own' && S.answering && S.answering.s) S.answering.choice = S.answering.s.indexOf(PH[j][0]);
    const s = document.createElement('span'); s.textContent = (S.picked.length > 1 ? ' ' : '') + PH[j][0]; line.appendChild(s);
    if (missed && Math.random() < .35){ stopTyping(); say(rnd(A.EARLY), 'a'); }
    if (S.picked.length >= 5) return send(false);
    offer();
  }
  function startTyping(){ if (S.typing || S.busy) return; S.typing = say('⋯', 'a typing'); }
  function stopTyping(){ if (S.typing){ S.typing.remove(); S.typing = null; } }
  function say(text, cls){ const m = document.createElement('p'); m.className = 'm ' + cls; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }

  function replyFor(ids){
    const text = ids.map(i => PH[i][0]).join(' '), parts = [], a = S.answering;
    if (a === A.WHO){                                     // the fourth answer gets its own reply, and then it is over
      const first = PH[ids[0]][0], t = first.length <= 10 ? first : first.slice(0, 8) + '⋯';
      const prevs = S.said.filter(x => x.length >= 3 && x.length <= 12 && x !== first), prev = prevs.length ? rnd(prevs) : null;
      return [fill(rnd(A.WHO.r.filter(r => prev || !r.includes('{prev}'))), { t, prev }), rnd(A.WHO.after)];
    }
    if (a && a.sr && a.choice !== null && a.choice >= 0) parts.push(choice(a.sr[a.choice]));
    else if (a && a.r) parts.push(choice(a.r));
    else if (a && a.sr) parts.push(choice(a.sr.flat()));
    const bi = bigrams(text), ch = new Set([...text].filter(c => !STOP.has(c) && c.trim()));
    const hit = new Set(); for (const t of A.TOPICS) if (t.k.some(k => text.includes(k))) t.r.forEach(r => hit.add(r));
    const own = ids.map(i => PH[i][0]).filter(t => t.length >= 3);
    const all = [...new Set([...A.TOPICS.flatMap(t => t.r), ...A.SHARE, ...(window.LIFE || [])])].filter(r => !S.used.has(r) && !parts.includes(r) && !own.some(t => r.includes(t)) && !QUESTIONY.test(r));
    const scored = all.map(r => { let sc = hit.has(r) ? 4 : 0; for (const g of bigrams(r)) if (bi.has(g)) sc += 3; for (const c of new Set(r)) if (ch.has(c)) sc += 1; return [sc + Math.random() * .5, r]; })
                      .filter(x => x[0] >= 7).sort((x, y) => y[0] - x[0]);
    if (scored.length && (!parts.length || Math.random() < .4)){ const l = rnd(scored.slice(0, 3))[1]; S.used.add(l); parts.push(l); }
    if (!parts.length) parts.push(choice(A.SHARE.concat(window.LIFE || []).filter(r => !QUESTIONY.test(r))));
    if (S.sent === A.LIMIT - 1) S.ask = A.WHO;
    else { const f = A.ASK.filter(q => !S.asked.has(q.q)); S.ask = rnd(f.length ? f : A.ASK); S.asked.add(S.ask.q); }
    parts.push(S.ask.q);
    return parts;
  }
  async function send(missed){
    if (!S.picked.length) return;
    const run = S.run, ids = S.picked.slice(), text = ids.map(i => PH[i][0]).join(' ');
    ids.forEach(i => { if (kindOf(i) !== 'own') S.said.push(PH[i][0]); });
    S.busy = true; opts.innerHTML = ''; line.innerHTML = ''; S.picked = [];
    stopTyping(); say(text, 'v'); S.sent++; if (S.onSent) S.onSent(S.sent);
    await wait(EARLY_MS); if (run !== S.run) return;
    if (missed){ say(choice(A.EARLY), 'a'); await wait(700); if (run !== S.run) return; }
    const parts = replyFor(ids);
    for (let k = 0; k < parts.length; k++){
      if (k){ S.typing = say('⋯', 'a typing'); await wait(Math.min(2400, 500 + [...parts[k]].length * 45)); stopTyping(); if (run !== S.run) return; }
      say(parts[k], 'a');
    }
    if (S.sent >= A.LIMIT) return end(run);
    await wait(900); if (run !== S.run) return;
    S.busy = false; offer();
  }
  async function end(run){
    let before = [...log.querySelectorAll('.m.a')].slice(-2).map(m => m.textContent).join('');
    for (const l of A.END){ await wait(readTime(before)); if (run !== S.run) return; say(l, 'a'); before = l; }
    await wait(readTime(before) + 1500); if (run !== S.run) return;
    poem.querySelector('pre').textContent = A.POEM; poem.classList.add('on');
  }

  /* ── its body: soft, grey, a little ahead of your hand ── */
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, px = innerWidth / 2, py = innerHeight * .3, vx = 0, vy = 0, bx = px, by = py, t0 = performance.now(), live = false, lastMove = t0;
  function size(){ dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
  addEventListener('resize', () => { if (live) size(); });
  canvas.parentElement.addEventListener('pointermove', e => { const now = performance.now(), dt = Math.max(8, now - lastMove); lastMove = now;
    vx = vx * .7 + (e.clientX - px) / dt * .3; vy = vy * .7 + (e.clientY - py) / dt * .3; px = e.clientX; py = e.clientY; }, { passive: true });
  function frame(now){
    if (!live) return;
    const t = (now - t0) / 1000, tx = px + vx * 51 * 6, ty = py + vy * 51 * 6;
    bx += (tx - bx) * .06; by += (ty - by) * .06; vx *= .96; vy *= .96;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++){
      const a = t * (.3 + i * .07) + i * 1.7, r = 70 + 18 * Math.sin(t * .8 + i), x = bx + Math.cos(a) * 26, y = by + Math.sin(a * 1.3) * 20;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,146,136,.10)'); gr.addColorStop(1, 'rgba(150,146,136,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    if (!REDUCED) requestAnimationFrame(frame);
  }

  return {
    get done(){ return S && poem.classList.contains('on'); },
    get started(){ return !!S && S.run > 0; },
    async start(onSent){                                  // a new conversation: it speaks first
      const run = (S ? S.run : 0) + 1; S = fresh(); S.run = run; S.onSent = onSent;
      log.innerHTML = ''; line.innerHTML = ''; opts.innerHTML = ''; poem.classList.remove('on');
      await wait(700); if (run !== S.run) return;
      say(A.OPEN[0], 'a'); await wait(1100); if (run !== S.run) return;
      S.ask = rnd(A.ASK); S.asked.add(S.ask.q); say(S.ask.q, 'a'); await wait(600); if (run !== S.run) return;
      offer();
    },
    show(){ live = true; size(); requestAnimationFrame(frame); },
    hide(){ live = false; },
  };
};
