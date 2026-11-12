// alter yvette: the one in the mirror region who is always a little early.
// It talks with a visitor in her words: four rounds, the fourth always 「你覺得我是誰」, then a poem signed by itself.
// A round: it asks → you answer with one of her lines → it answers that line (each answer has its own reply)
//          → it says something of its own → it asks the next thing. Questions go from light to inward.
// Needs window.PH / SRC / LIFE (phrases.js) and window.ALTER (replies.js).
window.makeAlter = function (el){
  const PH = window.PH, SRC = window.SRC, A = window.ALTER;
  const { log, line, opts, poem, canvas } = el;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EARLY_MS = 51;
  const HOVER = matchMedia('(hover: hover)').matches;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const wait = ms => new Promise(r => setTimeout(r, window.ALTER_FAST ? 0 : ms));   // reading time is not motion: it stays
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ── her phrases, and which character leads where ── */
  const STOP = new Set('的了是我你他她它在有也就都會要不一這那和跟到說看去來很還又被把嗎吧啦喔欸呢啊人們個上下裡中自己什麼沒');
  const BY = new Map();
  PH.forEach((p, i) => { for (const ch of new Set(p[0])) if (!STOP.has(ch)){ if (!BY.has(ch)) BY.set(ch, []); BY.get(ch).push(i); } });
  if (!SRC.some(s => s.k === 'own')) SRC.push({ k: 'own' });
  const OWN = SRC.findIndex(s => s.k === 'own');
  const kindOf = i => SRC[PH[i][1]].k;
  const ID = new Map(); PH.forEach((p, i) => { if (p[1] !== OWN && !ID.has(p[0])) ID.set(p[0], i); });
  const OPENERS = PH.map((p, i) => i).filter(i => kindOf(i) !== 'own' && /^(我|你|如果|剛剛|欸|今天|從前|因為|所以|只是|現在|明天|其實|好像|然後|最近|昨天)/.test(PH[i][0]));
  const starterId = t => { let i = PH.findIndex(p => p[0] === t && p[1] === OWN); if (i < 0){ PH.push([t, OWN, -1]); i = PH.length - 1; } return i; };
  const QUESTIONY = /嗎|哪一|什麼|你呢|是不是|誰/;
  const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  const bigrams = t => { const z = new Set(); const c = t.replace(/\s/g, ''); for (let i = 0; i < c.length - 1; i++){ const g = c.slice(i, i + 2); if (!STOP.has(g[0]) && !STOP.has(g[1])) z.add(g); } return z; };
  const readTime = t => 1100 + [...t].length * 110;
  // a question's answers: one map (answer → its reply), or one map per short starter
  const mapsOf = ask => !ask || !ask.a ? [] : Array.isArray(ask.a) ? (typeof ask.a[0] === 'string' ? [Object.fromEntries(ask.a.map(t => [t, null]))] : ask.a) : [ask.a];

  let S;                                                  // one conversation's state
  const fresh = () => ({ picked: [], sent: 0, typing: null, guess: null, used: new Set(), busy: false, shown: new Set(), usedPoem: false,
    ask: null, answering: null, asked: new Set(), offering: null, choice: -1, answer: null, answerId: -1, early: 0, right: 0, note: null, said: [],
    POEM_ROUND: 1 + Math.floor(Math.random() * 2), run: 0, onSent: null });
  const poemTime = () => S.sent === S.POEM_ROUND || (S.sent === A.LIMIT - 2 && !S.usedPoem);
  const choice = list => { const f = list.filter(r => !S.used.has(r)); const r = rnd(f.length ? f : list); S.used.add(r); return r; };

  function leap(i){                                       // somewhere else that shares a character with this phrase
    const p = PH[i], chars = [...p[0]].filter(ch => BY.has(ch)).reverse();
    const ok = { days: k => k === 'life' || k === 'dream' || k === 'ig', notpoem: k => k !== 'poem' && k !== 'own', poem: k => k === 'poem', any: k => k !== 'own' };
    for (const pass of poemTime() ? ['poem', 'any'] : Math.random() < .75 ? ['days', 'notpoem', 'any'] : ['any']){
      for (const ch of chars){
        const pool = BY.get(ch).filter(j => j !== i && PH[j][1] !== p[1] && !S.shown.has(j) && ok[pass](kindOf(j)));
        if (pool.length) return rnd(pool);
      }
    }
    const all = PH.map((q, j) => j).filter(j => j !== i && kindOf(j) !== 'own');
    const other = all.filter(j => kindOf(j) !== kindOf(i) && !S.shown.has(j));
    return rnd(other.length ? other : all);
  }
  function answersTo(ask, which){                         // the lines that really answer this question, picked by hand
    const maps = mapsOf(ask), m = which >= 0 && maps.length > 1 ? maps[which] : Object.assign({}, ...maps);
    let ids = Object.keys(m).map(t => ID.get(t)).filter(i => i !== undefined && !S.shown.has(i));
    const many = ask === A.WHO ? 6 : 3;
    if (ids.length < 2 && maps.length > 1) ids = Object.keys(Object.assign({}, ...maps)).map(t => ID.get(t)).filter(i => i !== undefined && !S.shown.has(i));
    if (ids.length < 2 && ask.k){                          // only when the hand-picked ones have run out
      const more = PH.map((p, i) => i).filter(i => !S.shown.has(i) && !ids.some(j => PH[j][0] === PH[i][0]) && !['said', 'own'].includes(kindOf(i)) && ask.k.some(k => PH[i][0].includes(k)));
      while (ids.length < many && more.length) ids.push(more.splice(Math.floor(Math.random() * more.length), 1)[0]);
    }
    if (poemTime()){ const poems = ids.filter(i => kindOf(i) === 'poem'); if (poems.length >= many) ids = poems; }
    const out = [], pool = ids.slice();
    while (out.length < many && pool.length){              // not two from the same poem or the same day
      const f = pool.filter(i => !out.some(j => PH[j][1] === PH[i][1]));
      const k = rnd(f.length ? f : pool); out.push(k); pool.splice(pool.indexOf(k), 1);
    }
    if (ask === A.WHO && !out.some(i => PH[i][0] === '分身')){ const twin = ID.get('分身'); if (twin !== undefined){ if (out.length < many) out.push(twin); else out[out.length - 1] = twin; } }
    for (let n = 0; out.length < 2 && n < 20; n++){ const a = out.length ? leap(out[0]) : rnd(OPENERS); if (!out.some(j => PH[j][0] === PH[a][0])) out.push(a); }
    return shuffle(out);
  }
  function offer(){
    opts.innerHTML = '';
    if (S.busy) return;
    let list;
    if (!S.picked.length){                                // a new question is on the table
      const ask = S.ask || rnd(A.ASK); S.answering = ask; S.ask = null; S.choice = -1; S.answer = null; S.answerId = -1; S.guess = null;
      if (ask.s){ list = ask.s.map(starterId); S.offering = 'starter'; }
      else { list = answersTo(ask, -1); S.offering = 'answer'; }
    } else if (S.offering === 'starter'){                 // after 「喜歡」 or 「還好欸」: now the real answer
      list = answersTo(S.answering, S.choice); S.offering = 'answer'; S.guess = null;
    } else {                                              // the answer is in: keep stringing her lines, or send
      const last = S.picked[S.picked.length - 1], nx = PH[last][2];
      const on = nx >= 0 && !S.shown.has(nx) ? nx : leap(last); let off = leap(last);
      const same = () => PH[off][0] === PH[on][0] || S.picked.some(i => PH[i][0] === PH[off][0]);
      for (let n = 0; n < 8 && same(); n++) off = leap(last);
      list = same() ? [on] : Math.random() < .5 ? [on, off] : [off, on]; S.offering = 'more';
    }
    const run = S.run, kind = S.offering;
    list.forEach((j, k) => {
      S.shown.add(j);
      const b = document.createElement('button'); b.textContent = PH[j][0]; b.style.animationDelay = (k * 60) + 'ms';
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && S.guess === null && kind === 'answer') S.guess = j; startTyping(); });
      b.addEventListener('focus', startTyping);
      b.addEventListener('click', () => { if (run === S.run) choose(j); });
      opts.appendChild(b);
    });
    if (kind === 'more'){
      const b = document.createElement('button'); b.textContent = '送出'; b.className = 'send';
      b.addEventListener('click', () => { if (run === S.run) send(); });
      opts.appendChild(b);
    }
    // it starts answering before you have chosen: it has already guessed which one you will take
    S.list = list;
    setTimeout(() => { if (run !== S.run || S.busy) return; startTyping(); if (kind === 'answer' && S.offering === 'answer' && S.guess === null && !HOVER) S.guess = rnd(list); }, EARLY_MS);
  }
  function choose(j){
    const kind = S.offering;
    S.picked.push(j); if (kindOf(j) === 'poem') S.usedPoem = true;
    const s = document.createElement('span'); s.textContent = (S.picked.length > 1 ? ' ' : '') + PH[j][0]; line.appendChild(s);
    if (kind === 'starter') S.choice = S.answering.s.indexOf(PH[j][0]);
    if (kind === 'answer'){
      S.answer = PH[j][0]; S.answerId = j;
      const guess = S.guess !== null ? S.guess : rnd(S.list); S.guess = null;
      if (guess !== null && guess !== j && S.early < 1 && Math.random() < .35){ S.early++; S.note = choice(A.EARLY); }
      else if (guess === j && A.RIGHT && S.right < 1 && Math.random() < .25){ S.right++; S.note = choice(A.RIGHT); }
      else S.note = null;
    }
    if (S.picked.length >= 5) return send();
    offer();
  }
  function startTyping(){ if (S.typing || S.busy) return; S.typing = say('⋯', 'a typing'); }
  function stopTyping(){ if (S.typing){ S.typing.remove(); S.typing = null; } }
  function say(text, cls){ const m = document.createElement('p'); m.className = 'm ' + cls; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }

  function replyTo(ask, answer, which){                   // the reply written for exactly this answer, if there is one
    const maps = mapsOf(ask), order = which >= 0 && maps.length > 1 ? [maps[which], ...maps] : maps;
    for (const m of order){ const r = m[answer]; if (r) return Array.isArray(r) ? choice(r) : r; }
    return null;
  }
  function nextAsk(){                                     // light things first, then further in
    const want = S.sent + 1, f = A.ASK.filter(q => !S.asked.has(q.q));
    const exact = f.filter(q => (q.d || 1) === want), near = f.filter(q => Math.abs((q.d || 1) - want) <= 1);
    const q = rnd(exact.length && Math.random() < .85 ? exact : near.length ? near : f.length ? f : A.ASK);
    S.asked.add(q.q); return q;
  }
  function replyFor(ids){
    const a = S.answering, parts = [];
    if (a === A.WHO){                                     // the fourth answer gets its own reply, and then it is over
      const first = S.answer || PH[ids[0]][0], t = first.length <= 10 ? first : first.slice(0, 8) + '⋯';
      parts.push(replyTo(a, first, -1) || fill(rnd(a.r), { t }));
      const prevs = S.said.filter(x => x.length >= 3 && x.length <= 12 && x !== first && !ids.some(i => PH[i][0] === x));
      const after = a.after.filter(r => !r.includes('{prev}') || prevs.length);
      const want = prevs.length && Math.random() < .5 ? after.filter(r => r.includes('{prev}')) : after.filter(r => !r.includes('{prev}'));
      parts.push(fill(rnd(want.length ? want : after), { prev: prevs.length ? rnd(prevs) : '' }));
      return parts;
    }
    const mine = a && S.answer ? replyTo(a, S.answer, S.choice) : null;
    if (mine){ S.used.add(mine); parts.push(mine); }
    else if (a && a.sr && S.choice >= 0) parts.push(choice(a.sr[S.choice]));
    else if (a && a.r) parts.push(choice(a.r));
    else if (a && a.sr) parts.push(choice(a.sr.flat()));
    // if they went on stringing lines after the answer, it sometimes picks up a word from that tail
    const tail = ids.slice(ids.indexOf(S.answerId) + 1).map(i => PH[i][0]); let extra = false;
    if (tail.length){
      const text = tail.join(' '), bi = bigrams(text), ch = new Set([...text].filter(c => !STOP.has(c) && c.trim()));
      const hit = new Set(); for (const t of A.TOPICS) if (t.k.some(k => text.includes(k))) t.r.forEach(r => hit.add(r));
      const own = ids.map(i => PH[i][0]).filter(t => t.length >= 3);
      const all = [...new Set([...A.TOPICS.flatMap(t => t.r), ...A.SHARE, ...(window.LIFE || [])])].filter(r => !S.used.has(r) && !parts.includes(r) && !own.some(t => r.includes(t)) && !QUESTIONY.test(r));
      const scored = all.map(r => { let sc = hit.has(r) ? 4 : 0; for (const g of bigrams(r)) if (bi.has(g)) sc += 3; for (const c of new Set(r)) if (ch.has(c)) sc += 1; return [sc + Math.random() * .5, r]; })
                        .filter(x => x[0] >= 7).sort((x, y) => y[0] - x[0]);
      if (scored.length && (!parts.length || Math.random() < .45)){ const l = rnd(scored.slice(0, 3))[1]; S.used.add(l); parts.push(l); extra = true; }
    }
    if (!parts.length) parts.push(choice(A.SHARE.concat(window.LIFE || []).filter(r => !QUESTIONY.test(r))));
    S.ask = S.sent === A.LIMIT - 1 ? A.WHO : nextAsk();
    if (S.ask.lead && (!extra || S.ask === A.WHO)) parts.push(choice(S.ask.lead));   // something of its own, then the question
    parts.push(S.ask.q);
    return parts;
  }
  async function send(){
    if (!S.picked.length || S.busy) return;
    const run = S.run, ids = S.picked.slice(), text = ids.map(i => PH[i][0]).join(' ');
    S.busy = true; opts.innerHTML = ''; line.innerHTML = ''; S.picked = [];
    stopTyping(); say(text, 'v'); S.sent++; if (S.onSent) S.onSent(S.sent);
    await wait(EARLY_MS); if (run !== S.run) return;
    if (S.note){ say(S.note, 'a'); S.note = null; await wait(800); if (run !== S.run) return; }   // it had guessed: 「欸 早了」 or 「我就知道」
    const parts = replyFor(ids);
    ids.forEach(i => { if (kindOf(i) !== 'own') S.said.push(PH[i][0]); });
    for (let k = 0; k < parts.length; k++){
      if (k || log.lastChild.classList.contains('a')){ S.typing = say('⋯', 'a typing'); await wait(Math.min(2400, 500 + [...parts[k]].length * 45)); stopTyping(); if (run !== S.run) return; }
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
  let W = 0, H = 0, dpr = 1, px = innerWidth / 2, py = innerHeight * .3, vx = 0, vy = 0, bx = px, by = py, t0 = performance.now(), live = false, lastMove = t0, raf = 0;
  function size(){ dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
  addEventListener('resize', () => { if (live){ size(); if (REDUCED) frame(performance.now()); } });
  canvas.parentElement.addEventListener('pointermove', e => { const now = performance.now(), dt = Math.max(8, now - lastMove); lastMove = now;
    vx = vx * .7 + (e.clientX - px) / dt * .3; vy = vy * .7 + (e.clientY - py) / dt * .3; px = e.clientX; py = e.clientY; }, { passive: true });
  function frame(now){
    raf = 0; if (!live) return;
    const t = (now - t0) / 1000, tx = px + vx * 51 * 6, ty = py + vy * 51 * 6;
    bx += (tx - bx) * .06; by += (ty - by) * .06; vx *= .96; vy *= .96;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++){
      const a = t * (.3 + i * .07) + i * 1.7, r = 70 + 18 * Math.sin(t * .8 + i), x = bx + Math.cos(a) * 26, y = by + Math.sin(a * 1.3) * 20;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,146,136,.10)'); gr.addColorStop(1, 'rgba(150,146,136,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    if (!REDUCED) raf = requestAnimationFrame(frame);
  }

  return {
    get done(){ return !!S && (poem.classList.contains('on') || S.sent >= A.LIMIT); },   // over, or on its way to the poem
    async start(onSent){                                  // a new conversation: it speaks first
      const run = (S ? S.run : 0) + 1; S = fresh(); S.run = run; S.onSent = onSent;
      log.innerHTML = ''; line.innerHTML = ''; opts.innerHTML = ''; poem.classList.remove('on');
      await wait(700); if (run !== S.run) return;
      say(A.OPEN[0], 'a'); await wait(1100); if (run !== S.run) return;
      const light = A.ASK.filter(q => (q.d || 1) === 1);
      S.ask = rnd(light.length ? light : A.ASK); S.asked.add(S.ask.q); say(S.ask.q, 'a'); await wait(600); if (run !== S.run) return;
      offer();
    },
    show(){ live = true; size(); if (!raf) raf = requestAnimationFrame(frame); },
    hide(){ live = false; },
    stop(){ if (S){ S.run++; S.busy = true; stopTyping(); } opts.innerHTML = ''; line.innerHTML = ''; poem.classList.remove('on'); },   // closed: whatever it was about to say, it will not
  };
};
