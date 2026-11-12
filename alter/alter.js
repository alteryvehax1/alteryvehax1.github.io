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
  const META = { times: 0, asked: new Set(), hinted: new Set(), guide: false, more: 0, dry: 0, liked: new Set(), used: new Set(), early: 0, right: 0, taught: false, ended: 0, end2: new Set(), who: null };   // what it remembers between conversations in one visit
  const fresh = () => ({ picked: [], sent: 0, typing: null, guess: null, used: new Set(), busy: false, shown: new Set(), usedPoem: false,
    ask: null, answering: null, asked: new Set(), offering: null, choice: -1, answer: null, answerId: -1, early: 0, right: 0, note: null, said: [], saidIds: [], who2: false, same: false, starters: null, doors: new Set(), ctx: { poems: [] }, read: new Set(),
    POEM_ROUND: 1 + Math.floor(Math.random() * 2), run: 0, onSent: null });
  const poemTime = () => S.sent === S.POEM_ROUND || (S.sent === A.LIMIT - 2 && !S.usedPoem);
  const choice = list => { const f = list.filter(r => !S.used.has(r) && !META.used.has(r)), g = list.filter(r => !S.used.has(r)), r = rnd(f.length ? f : g.length ? g : list);   // not twice in a talk, and not again later in the same visit if it can be helped
    S.used.add(r); META.used.add(r); return r; };

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
    let ids = Object.keys(m).map(t => ID.get(t)).filter(i => i !== undefined && !S.shown.has(i) && !(ask === A.WHO && S.who2 && PH[i][0] === META.who));
    const many = ask === A.WHO ? 6 : 3;
    if (ids.length < 2 && maps.length > 1) ids = Object.keys(Object.assign({}, ...maps)).map(t => ID.get(t)).filter(i => i !== undefined && !S.shown.has(i));
    if (ids.length < 2 && ask.k){                          // only when the hand-picked ones have run out
      const more = PH.map((p, i) => i).filter(i => !S.shown.has(i) && !ids.some(j => PH[j][0] === PH[i][0]) && !['said', 'own'].includes(kindOf(i)) && ask.k.some(k => PH[i][0].includes(k)));
      while (ids.length < many && more.length) ids.push(more.splice(Math.floor(Math.random() * more.length), 1)[0]);
    }
    if (poemTime()){ const poems = ids.filter(i => kindOf(i) === 'poem'); if (poems.length >= many) ids = poems; }
    const out = [], pool = ids.slice();
    const isRead = i => kindOf(i) === 'poem' && S.read.has(SRC[PH[i][1]].title);
    let want = Math.min(ask === A.WHO ? 3 : 2, pool.filter(isRead).length);   // lines from poems you have read come first
    while (out.length < many && pool.length){              // not two from the same poem or the same day
      let f = pool.filter(i => !out.some(j => PH[j][1] === PH[i][1])); if (!f.length) f = pool;
      if (want > 0){ want--; const r = f.filter(isRead); if (r.length) f = r; }
      const k = rnd(f); out.push(k); pool.splice(pool.indexOf(k), 1);
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
      const st = ask === A.WHO ? (S.who2 ? A.WHO2.s : null) : ask.s; S.starters = st;   // asked again in the same visit, 「你覺得我是誰」 starts from what you said last time
      if (st){ list = st.map(starterId); S.offering = 'starter'; }
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
    if (kind === 'starter'){ S.choice = S.starters.indexOf(PH[j][0]);
      if (S.answering === A.WHO && S.choice === 0){ S.answer = META.who; S.same = true; return send(); } }   // 「還是」: nothing more to choose
    if (kind === 'answer'){
      S.answer = PH[j][0]; S.answerId = j;
      if (A.TEACH && !META.taught){ META.taught = true; stopTyping(); say(A.TEACH, 'a door'); }   // once: you can go on stringing lines, or send
      const guess = S.guess !== null ? S.guess : rnd(S.list); S.guess = null;
      if (guess !== null && guess !== j && META.early < 1 && Math.random() < .35){ META.early++; S.note = choice(A.EARLY); }
      else if (guess === j && A.RIGHT && META.right < 1 && Math.random() < .25){ META.right++; S.note = choice(A.RIGHT); }
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
    const want = S.sent + 1, f0 = A.ASK.filter(q => !S.asked.has(q.q)), f1 = f0.filter(q => !META.asked.has(q.q)), f = f1.length >= 4 ? f1 : f0;
    const exact = f.filter(q => (q.d || 1) === want), near = f.filter(q => Math.abs((q.d || 1) - want) <= 1);
    const q = rnd(exact.length && Math.random() < .85 ? exact : near.length ? near : f.length ? f : A.ASK);
    S.asked.add(q.q); META.asked.add(q.q); return q;
  }
  function replyFor(ids){
    const a = S.answering, parts = [];
    if (a === A.WHO){                                     // the fourth answer gets its own reply, and then it is over
      const first = S.answer || PH[ids[0]][0], t = first.length <= 10 ? first : first.slice(0, 8) + '⋯';
      parts.push(S.same && A.WHO2 ? choice(A.WHO2.same) : (replyTo(a, first, -1) || fill(rnd(a.r), { t }))); META.who = first;
      const prevs = S.said.filter(x => x.length >= 3 && x.length <= 12 && x !== first && !ids.some(i => PH[i][0] === x));
      const after = a.after.filter(r => !r.includes('{prev}') || prevs.length);
      const want = prevs.length && Math.random() < .5 ? after.filter(r => r.includes('{prev}')) : after.filter(r => !r.includes('{prev}'));
      parts.push(fill(choice(want.length ? want : after), { prev: prevs.length ? rnd(prevs) : '' }));
      return parts;
    }
    const mine = a && S.answer ? replyTo(a, S.answer, S.choice) : null;
    if (mine){ S.used.add(mine); parts.push(mine); }
    else if (a && a.sr && S.choice >= 0) parts.push(choice(a.sr[S.choice]));
    else if (a && a.r) parts.push(choice(a.r));
    else if (a && a.sr) parts.push(choice(a.sr.flat()));
    // if they went on stringing lines after the answer, it sometimes picks up a word from that tail
    const tail = ids.slice(ids.indexOf(S.answerId) + 1).map(i => PH[i][0]); let extra = false;
    if (a && a.share){                                    // every round it also says something of its own about what it just asked you
      const mine0 = ids.map(i => PH[i][0]).filter(t => t.length >= 3), b0 = bigrams(parts[0] || '');
      const c = a.share.filter(r => !S.used.has(r) && !mine0.some(t => r.includes(t)) && [...bigrams(r)].filter(g => b0.has(g)).length < 3);
      if (c.length){ parts.push(choice(c)); extra = true; }
    }
    if (tail.length && !extra){
      const text = tail.join(' '), bi = bigrams(text), ch = new Set([...text].filter(c => !STOP.has(c) && c.trim()));
      const hit = new Set(); for (const t of A.TOPICS) if (t.k.some(k => text.includes(k))) t.r.forEach(r => hit.add(r));
      const own = ids.map(i => PH[i][0]).filter(t => t.length >= 3);
      const all = [...new Set([...A.TOPICS.flatMap(t => t.r), ...A.SHARE, ...(window.LIFE || [])])].filter(r => !S.used.has(r) && !parts.includes(r) && !own.some(t => r.includes(t)) && !QUESTIONY.test(r));
      const scored = all.map(r => { let sc = hit.has(r) ? 4 : 0; for (const g of bigrams(r)) if (bi.has(g)) sc += 3; for (const c of new Set(r)) if (ch.has(c)) sc += 1; return [sc + Math.random() * .5, r]; })
                        .filter(x => x[0] >= 7).sort((x, y) => y[0] - x[0]);
      if (scored.length && (!parts.length || Math.random() < .45)){ const l = rnd(scored.slice(0, 3))[1]; S.used.add(l); parts.push(l); extra = true; }
    }
    if (!parts.length) parts.push(choice(A.SHARE.concat(window.LIFE || []).filter(r => !QUESTIONY.test(r))));
    S.ask = S.sent === A.LIMIT - 1 ? A.WHO : nextAsk(); S.who2 = S.ask === A.WHO && !!META.who && !!A.WHO2;
    if (S.ask.lead && !S.who2 && (!extra || S.ask === A.WHO)) parts.push(choice(S.ask.lead));   // something of its own, then the question
    parts.push(S.who2 ? fill(A.WHO2.q, { who: META.who }) : S.ask.q);
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
    ids.forEach(i => { if (kindOf(i) !== 'own'){ S.said.push(PH[i][0]); S.saidIds.push(i); } });
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
    const endTime = t => 650 + [...t].length * 70;
    let closing = A.END;                                    // the first full talk of a visit ends the way she wrote it; later ones end another way
    if (META.ended && A.END2 && A.END2.length){ const f = A.END2.filter((x, i) => !META.end2.has(i)), set = rnd(f.length ? f : A.END2); META.end2.add(A.END2.indexOf(set)); closing = set; }
    META.ended++;
    for (const l of closing){ await wait(endTime(before)); if (run !== S.run) return; say(l, 'a'); before = l; }
    await wait(endTime(before) + 600); if (run !== S.run) return;
    opts.innerHTML = '';                                  // what is left: the poems your sentences came from, and its own, which opens only if you ask
    const ref = (text, cls, go) => { const b = document.createElement('button'); b.className = cls; b.textContent = text; b.addEventListener('click', go); opts.appendChild(b); };
    [...new Set(S.saidIds.filter(i => kindOf(i) === 'poem').map(i => SRC[PH[i][1]].title))].slice(0, 5).forEach(t => ref('〈' + t + '〉', 'ref', () => { if (el.onPoem) el.onPoem(t); }));
    ref(A.POEM_LINK || '— ａｌｔｅｒ　ｙｖｅｔｔｅ', 'ref mine', () => { poem.querySelector('pre').textContent = A.POEM; poem.classList.add('on'); });
  }

  /* ── before the talk: it knows what you did on this visit, and it can tell you what else there is ── */
  const COND = {
    move: c => c.dist !== undefined && c.dist < 700, poems0: c => !c.poems.length, book: c => c.poems.length < 3,
    reg: c => !!c.reg && Object.keys(c.reg).some(k => k !== '鏡' && !c.reg[k]),
    sound: c => c.sounds === 0, film: c => c.films === 0, link: c => c.links === 0,
    receipt: c => (c.items || 0) >= 3 && !c.torn, save: c => c.poems.length >= 1, wall: c => c.secret === false, walled: c => c.secret === true,
  };
  const hintsLeft = () => (A.HINTS || []).filter(h => !META.hinted.has(h.if) && COND[h.if] && COND[h.if](S.ctx));
  const hintText = h => { const c = S.ctx, t = Array.isArray(h.t) ? h.t[c.touch ? 1 : 0] : h.t;
    return fill(t, { el: c.reg ? rnd(Object.keys(c.reg).filter(k => k !== '鏡' && !c.reg[k])) : '' }); };
  function here(){ const p = S.ctx.poems, n = p.length, H = A.HERE; if (!H) return null;
    return fill(choice(n === 0 ? H.none : n === 1 ? H.one : n < 8 ? H.few : H.many), { n, title: p[n - 1] }); }
  function firstAsk(){ const light = A.ASK.filter(q => (q.d || 1) === 1), f = light.filter(q => !META.asked.has(q.q)), q = rnd(f.length ? f : light.length ? light : A.ASK);
    S.asked.add(q.q); META.asked.add(q.q); return q; }
  // which line did you like: only lines from poems you have read; it says where the line comes from, then goes on
  const likeLines = () => PH.map((p, i) => i).filter(i => kindOf(i) === 'poem' && S.read.has(SRC[PH[i][1]].title) && !META.liked.has(i) && [...PH[i][0]].length >= 4 && [...PH[i][0]].length <= 16);
  async function like(){
    const run = S.run, seen = new Set(), pool = likeLines().filter(i => !seen.has(PH[i][0]) && seen.add(PH[i][0])), list = [];
    while (list.length < 3 && pool.length){ let f = pool.filter(i => !list.some(j => PH[j][1] === PH[i][1])); if (!f.length) f = pool; const k = rnd(f); list.push(k); pool.splice(pool.indexOf(k), 1); }
    S.typing = say('⋯', 'a typing'); await wait(800); stopTyping(); if (run !== S.run) return;
    say(choice(A.LIKE.q), 'a door'); await wait(400); if (run !== S.run) return;
    opts.innerHTML = '';
    list.forEach((j, n) => { S.shown.add(j); META.liked.add(j); const b = document.createElement('button'); b.textContent = PH[j][0]; b.style.animationDelay = (n * 60) + 'ms';
      b.addEventListener('click', () => { if (run === S.run) liked(j); }); opts.appendChild(b); });
  }
  async function liked(j){
    const run = S.run, src = SRC[PH[j][1]], nx = PH[j][2], next = nx >= 0 && PH[nx] && PH[nx][1] === PH[j][1] ? PH[nx][0] : null;
    opts.innerHTML = ''; say(PH[j][0], 'v door'); S.said.push(PH[j][0]); S.saidIds.push(j);
    await wait(EARLY_MS); if (run !== S.run) return;
    const note = A.NOTES && A.NOTES[src.title];
    say(note || fill(rnd(next ? A.LIKE.next : A.LIKE.alone), { title: src.title, year: src.year, next }), 'a door');
    S.typing = say('⋯', 'a typing'); await wait(1200); stopTyping(); if (run !== S.run) return;
    say(choice(A.LIKE.after), 'a door'); await wait(600); if (run !== S.run) return;
    doors();
  }
  function doors(){
    opts.innerHTML = ''; const run = S.run, D = A.DOORS, list = [];
    list.push(['guide', META.guide ? D.more : D.guide]);  // it can always be asked again, even when it has nothing left
    if (!S.doors.has('who')) list.push(['who', D.who]);
    else if (D.yvette && A.WHOIS && !S.doors.has('yvette')) list.push(['yvette', D.yvette]);   // and who is she, then
    if (S.canChat) list.push(['chat', D.chat]);           // not the first time: first you look around
    if (D.bye) list.push(['bye', D.bye]);
    list.forEach(([k, t], n) => { const b = document.createElement('button'); b.textContent = t; b.style.animationDelay = (n * 60) + 'ms';
      b.addEventListener('click', () => { if (run === S.run) door(k, t); }); opts.appendChild(b); });
  }
  async function door(k, t){
    const run = S.run; opts.innerHTML = ''; say(t, 'v door'); S.doors.add(k);
    await wait(EARLY_MS); if (run !== S.run) return;
    if (k === 'chat'){ S.ask = firstAsk(); say(S.ask.q, 'a'); await wait(600); if (run !== S.run) return; return offer(); }
    if (k === 'bye'){ say(rnd(A.BYE || ['掰掰']), 'a door'); await wait(1300); if (run !== S.run) return; if (el.onBye) el.onBye(); return; }
    let lines;
    if (k === 'who') lines = A.ABOUT;
    else if (k === 'yvette') lines = A.WHOIS;
    else {
      const first = !META.guide; META.guide = true; if (!first){ META.more++; if (el.onMore) el.onMore(META.more); }
      const hs = hintsLeft().slice(0, first ? 3 : 1), dry = A.SPEECHLESS || [A.NOHINT || '⋯'];
      if (!first && META.more === 10 && A.ACHIEVE){ lines = [A.ACHIEVE]; if (el.onAchieve) el.onAchieve('more'); }
      else if (hs.length) lines = hs.map(h => { const x = hintText(h); META.hinted.add(h.if); return x; });
      else lines = [dry[Math.min(META.dry++, dry.length - 1)]];
    }
    for (let n = 0; n < lines.length; n++){
      if (n){ S.typing = say('⋯', 'a typing'); await wait(Math.min(2000, 450 + [...lines[n]].length * 40)); stopTyping(); if (run !== S.run) return; }
      say(lines[n], 'a door');
    }
    await wait(500); if (run !== S.run) return; doors();
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
    async start(onSent, ctx){                             // a new meeting: it speaks first, and it knows what you have done here
      const run = (S ? S.run : 0) + 1; S = fresh(); S.run = run; S.onSent = onSent;
      S.ctx = Object.assign({ poems: [] }, ctx || {}); S.read = new Set(S.ctx.poems);
      const first = META.times === 0 && !S.ctx.known && !!A.FIRST, book = S.ctx.at === 'book';
      S.canChat = !first; META.times++;
      log.innerHTML = ''; line.innerHTML = ''; opts.innerHTML = ''; poem.classList.remove('on');
      await wait(700); if (run !== S.run) return;
      // the first time it only shows you around; when you come back, it knows what you did and it can talk
      const lines = first ? A.FIRST[book ? 'book' : 'mirror'] : [META.times > 1 && A.AGAIN ? choice(META.times > 2 && A.AGAIN3 ? A.AGAIN3 : A.AGAIN) : book && A.FIRST ? A.FIRST.book[0] : A.OPEN[0], here()].filter(Boolean);
      for (let n = 0; n < lines.length; n++){
        if (n){ S.typing = say('⋯', 'a typing'); await wait(900); stopTyping(); if (run !== S.run) return; }
        say(lines[n], 'a door');
      }
      await wait(600); if (run !== S.run) return;
      if (!A.DOORS){ S.ask = firstAsk(); say(S.ask.q, 'a'); return offer(); }
      if (!first && A.LIKE && likeLines().length >= 2) like(); else doors();
    },
    show(){ live = true; size(); if (!raf) raf = requestAnimationFrame(frame); },
    hide(){ live = false; },
    stop(){ if (S){ S.run++; S.busy = true; stopTyping(); } opts.innerHTML = ''; line.innerHTML = ''; poem.classList.remove('on'); },   // closed: whatever it was about to say, it will not
  };
};
