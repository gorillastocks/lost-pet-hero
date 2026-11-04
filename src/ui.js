import { h } from './dom.js';
import {
  DIFFICULTY, FULL_GAME_PRICE, FREE_RESCUES, TREATS, TUNES, animalById, jobById,
  heartsNeeded, kindnessTitle, pictureChoices,
} from './data.js';
import {
  abandonJob, beginJob, dismissPending, freshState, hintTarget,
  interactHere, journal, listJobs, movePlayer, resolveOffer, statusLine, tapFern, tapLog,
  tapPicture, tapSwitch,
} from './game.js';
import { checkAnswer, devUnlockAvailable, isFullGameUnlocked, makeQuestion, rescuesLeft, setFullGameUnlocked } from './progress.js';
import { SAVE_KEY, SETTINGS_KEY, readRaw, writeRaw } from './storage.js';
import { cameraFor, drawWorld, tileCenter, tileFromPoint } from './render.js';
import { createTrail } from './world.js';
import { inZone, zoneBand } from './calm.js';
import { drawSymbol, paintAnimal } from './art.js';
import { audio, LINES } from './audio.js';
import { cluePicture } from './clues.js';

const FERN_LABELS = ['Sunset side', 'Left of middle', 'Middle', 'Right of middle', 'Sunrise side'];
const params = new URLSearchParams(globalThis.location?.search || '');
const INSTANT = params.has('instant') || (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function createApp(root, store) {
  let state = null;
  let settings = loadSettings();
  let raf = 0;
  let idleTimer = 0;
  let walking = false;
  let question = null;
  let gatePassed = false;
  let settingsFrom = 'title';
  let titleReady = false;
  let modeIntroPlayed = false;
  let gateNext = 'unlock';

  function loadSettings() {
    try {
      const raw = store.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        difficulty: parsed?.difficulty === 'normal' ? 'normal' : 'easy',
        sound: parsed?.sound !== false,
        speech: parsed?.speech !== false,
      };
    } catch { return { difficulty: 'easy', sound: true, speech: true }; }
  }

  function saveSettings() {
    writeRaw(store, SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadSave() {
    const found = readRaw(store, SAVE_KEY);
    if (!found) return null;
    const data = found.data;
    if (data.active && !jobById(data.active.jobId)) data.active = null;
    data.settings = { sound: true, speech: true, ...(data.settings || {}) };
    return data;
  }

  function persist() {
    if (!state) return;
    state.settings = { ...settings, difficulty: state.difficulty };
    writeRaw(store, SAVE_KEY, JSON.stringify(state));
    saveSettings();
  }

  function unlocked() { return isFullGameUnlocked(store); }

  function say(id) { audio.line(id); }
  function sfx(name) { audio.play(name); }

  function stopLoops() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(idleTimer);
    walking = false;
  }

  function toast(text) {
    let el = root.querySelector('#toast');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }

  function screen(node) {
    stopLoops();
    audio.stopVoice();
    root.replaceChildren(node);
  }

  function cornerButtons() {
    const muted = !audio.settings.musicOn && !audio.settings.sfxOn && !audio.settings.voiceOn;
    return h('div', { class: 'corners' },
      h('button', {
        id: 'btn-mute', class: 'iconbtn', type: 'button',
        'aria-pressed': muted ? 'true' : 'false',
        'aria-label': muted ? 'Sound off' : 'Sound on',
        onclick: () => {
          const off = audio.settings.musicOn || audio.settings.sfxOn || audio.settings.voiceOn;
          audio.set({ musicOn: !off, sfxOn: !off, voiceOn: !off });
          sfx('tap');
          showTitle();
        },
      }, muted ? '🔇' : '🔊'),
      h('button', {
        id: 'btn-settings', class: 'iconbtn', type: 'button', 'aria-label': 'Settings',
        onclick: () => { sfx('tap'); openSettings('title'); },
      }, '⚙'),
    );
  }

  function peekPet(id, kind, name) {
    return h('button', {
      type: 'button', class: `peek peek-${id}`, id: `peek-${id}`, 'aria-label': name,
      onclick: (ev) => {
        ev.stopPropagation();
        const el = ev.currentTarget;
        el.classList.remove('hop');
        void el.offsetWidth;
        el.classList.add('hop');
        sfx('heart-pop');
        const heart = h('span', { class: 'floater heart popheart', 'aria-hidden': 'true' }, '♥');
        el.append(heart);
        setTimeout(() => heart.remove(), 700);
      },
    }, h('canvas', { 'data-kind': kind, 'data-mood': 'happy', width: '160', height: '150', 'aria-hidden': 'true' }));
  }

  function titleBackdrop() {
    return [
      h('div', { class: 'sky', 'aria-hidden': 'true' },
        h('span', { class: 'cloud c1' }), h('span', { class: 'cloud c2' }), h('span', { class: 'cloud c3' }),
        h('span', { class: 'floater heart h1a' }, '♥'), h('span', { class: 'floater heart h2a' }, '♥'),
        h('span', { class: 'floater spark s1' }, '✦'), h('span', { class: 'floater spark s2' }, '✦'),
        h('span', { class: 'floater spark s3' }, '✦')),
      h('div', { class: 'hills', 'aria-hidden': 'true' }, h('span', { class: 'hill hill-a' }), h('span', { class: 'hill hill-b' })),
      cornerButtons(),
      h('div', { class: 'logo-wrap' },
        h('h1', { class: 'logo' }, h('span', { class: 't1' }, 'Lost Pet '), h('span', { class: 't2' }, 'Hero')),
        h('p', { class: 'ribbon' }, 'Wildwood')),
    ];
  }

  function peekRow() {
    return h('div', { class: 'peeks' },
      peekPet('pip', 'kitten', 'Pip'),
      peekPet('bramble', 'puppy', 'Bramble'),
      peekPet('luma', 'owl', 'Luma'));
  }

  function paintPeeks() {
    for (const canvas of root.querySelectorAll('.peek canvas')) paintAnimal(canvas, canvas.dataset.kind, 'happy');
  }

  function showTitle() {
    if (!titleReady) showSplash();
    else showMode();
  }

  function showSplash() {
    screen(h('section', { class: 'screen title title-splash', id: 'title' },
      ...titleBackdrop(),
      h('button', { id: 'btn-tap-play', class: 'tap-play primary', type: 'button', onclick: () => beginPlay() }, 'Tap to Play!'),
      h('p', { class: 'tap-caption' }, LINES['title-tap']),
      peekRow(),
    ));
    paintPeeks();
    if (audio.unlocked) say('title-tap');
  }

  function beginPlay() {
    titleReady = true;
    audio.unlock();
    audio.setScene(true);
    sfx('sparkle');
    showMode({ quiet: true });
    say('title-greeting')?.then?.((started) => {
      if (!started) { say('mode-choose'); return; }
      audio.whenEnded().then(() => { if (titleReady && root.querySelector('#mode-panel')) say('mode-choose'); });
    });
    modeIntroPlayed = true;
  }

  function showMode({ quiet = false } = {}) {
    const save = loadSave();
    screen(h('section', { class: 'screen title title-mode', id: 'title' },
      ...titleBackdrop(),
      h('div', { class: 'mode-panel', id: 'mode-panel' },
        h('div', { class: 'segment', role: 'group', 'aria-label': 'Difficulty' },
          diffButton('easy'), diffButton('normal')),
        h('p', { class: 'hint', id: 'diff-blurb' }, DIFFICULTY[settings.difficulty].blurb),
        save ? h('button', { id: 'btn-continue', class: 'primary', type: 'button', onclick: () => continueGame(save) }, 'Continue') : null,
        h('button', { id: 'btn-play', class: save ? '' : 'primary', type: 'button', onclick: () => newGame() }, save ? 'New story' : 'Play'),
      ),
      peekRow(),
    ));
    paintPeeks();
    if (!quiet && !modeIntroPlayed) { modeIntroPlayed = true; say('mode-choose'); }
  }

  function diffButton(id) {
    const on = settings.difficulty === id;
    return h('button', {
      id: `diff-${id}`,
      type: 'button',
      class: on ? 'on' : '',
      'aria-pressed': on ? 'true' : 'false',
      onclick: () => {
        settings.difficulty = id;
        saveSettings();
        sfx('tap');
        showMode({ quiet: true });
        say(id === 'easy' ? 'mode-easy' : 'mode-normal');
      },
    }, DIFFICULTY[id].label);
  }

  function newGame() {
    state = freshState(settings.difficulty);
    state.settings = { ...settings };
    persist();
    showTown();
  }

  function continueGame(save) {
    state = save;
    settings = { ...settings, ...state.settings, difficulty: state.difficulty || settings.difficulty };
    saveSettings();
    if (state.active?.pending === 'sanctuary') showSanctuary();
    else if (state.active) showTrail();
    else showTown();
  }

  function header() {
    const left = state ? rescuesLeft(state, unlocked()) : FREE_RESCUES;
    const limit = unlocked() ? 'Full game' : `Free stories left: ${left}`;
    return h('header', { class: 'top' },
      h('div', {},
        h('strong', {}, 'Emberhollow'),
        h('small', {}, kindnessTitle(state?.kindness || 0))),
      h('div', { class: 'stats' },
        h('span', { id: 'stat-coins' }, `${state?.coins || 0} coins`),
        h('span', { id: 'stat-kind' }, `${state?.kindness || 0} kindness`),
        h('span', { id: 'stat-left', class: 'limit' }, limit)),
    );
  }

  function showTown() {
    const jobs = listJobs();
    screen(h('section', { class: 'screen' },
      header(),
      h('div', { class: 'scroll' },
        h('h2', {}, 'Job board'),
        h('p', { class: 'lede' }, 'Tap a picture. The owner lends you something their pet loves.'),
        h('p', { id: 'toast', 'aria-live': 'polite' }),
        ...jobs.map(({ job, animal }) => jobCard(job, animal)),
        state.sanctuary.length ? h('button', { id: 'btn-sanctuary', onclick: () => showSanctuary() }, `Sanctuary (${state.sanctuary.length})`) : null,
        state.active ? h('button', { id: 'btn-resume', class: 'primary', onclick: () => showTrail() }, 'Back to Wildwood') : null,
      ),
      h('footer', { class: 'bar' },
        h('button', { id: 'btn-settings', onclick: () => openSettings('town') }, 'Settings'),
        h('button', { id: 'btn-title', class: 'quiet', onclick: () => { showMode({ quiet: true }); say('come-back'); } }, 'Title')),
    ));
    for (const canvas of root.querySelectorAll('canvas[data-kind]')) {
      paintAnimal(canvas, canvas.dataset.kind, canvas.dataset.mood || 'scared');
    }
    say('jobboard-intro');
  }

  function jobCard(job, animal) {
    const done = state.completedJobs.includes(job.id);
    const current = state.active?.jobId === job.id;
    return h('button', {
      id: `job-${job.id}`,
      class: `job${done ? ' done' : ''}${current ? ' current' : ''}`,
      disabled: done ? 'true' : null,
      onclick: () => onJob(job.id),
    },
      h('span', { class: 'badge' }, h('canvas', { 'data-kind': animal.kind, 'data-mood': done ? 'happy' : 'scared', width: '120', height: '96', 'aria-hidden': 'true' })),
      h('span', { class: 'jobtext' },
        h('strong', { class: 'jobtitle' }, `${animal.name} the ${animal.kind}`),
        h('span', { class: 'jobline' }, `${job.owner} · ${heartsNeeded(animal)} hearts`),
        h('span', { class: 'jobdesc' }, done ? 'Home safe' : current ? 'Searching in Wildwood' : job.card)));
  }

  function onJob(id) {
    sfx('tap');
    if (state.active && state.active.jobId !== id) {
      toast('Finish the search you already started.');
      showTown();
      toast('Finish the search you already started.');
      return;
    }
    if (state.active?.jobId === id) { showTrail(); return; }
    if (!rescuesLeft(state, unlocked())) { gateNext = 'unlock'; showGate(); return; }
    const started = beginJob(state, id, Math.random, { unlocked: unlocked() });
    if (!started.ok) {
      if (started.reason === 'gate') { gateNext = 'unlock'; showGate(); }
      return;
    }
    persist();
    showGift(started.text);
  }

  function showGift(text) {
    const job = jobById(state.active.jobId);
    const animal = animalById(job.animalId);
    screen(h('section', { class: 'screen sheet' },
      h('canvas', { id: 'gift-art', 'data-kind': animal.kind, width: '220', height: '160' }),
      h('h2', {}, job.owner),
      h('p', { class: 'lede', id: 'gift-copy' }, text),
      h('p', {}, `You are carrying ${job.itemId === 'scarf' ? 'the red scarf' : job.itemId === 'ball' ? 'the squeaky ball' : 'the silver bell'}. It starts one heart.`),
      h('button', { id: 'btn-enter', class: 'primary', onclick: () => { sfx('sparkle'); showTrail(); } }, 'Into Wildwood'),
    ));
    paintAnimal(root.querySelector('#gift-art'), animal.kind, 'scared');
    say(`job-${job.id}`);
  }

  function showTrail() {
    const active = state.active;
    if (!active) { showTown(); return; }
    screen(h('section', { class: 'screen trail' },
      h('header', { class: 'top slim' },
        h('button', { id: 'btn-town', onclick: () => { persist(); showTown(); } }, 'Town'),
        h('strong', { id: 'trail-name' }, animalById(jobById(active.jobId).animalId).name),
        h('button', { id: 'btn-clues' }, 'Clues'),
        h('button', { id: 'btn-settings', onclick: () => openSettings('trail') }, 'Settings')),
      h('div', { class: 'stage' },
        h('canvas', { id: 'world', 'aria-label': 'Wildwood trail' }),
        h('div', { id: 'hint-arrow', hidden: 'true', 'aria-hidden': 'true' }, 'This way')),
      h('p', { id: 'status', 'aria-live': 'polite' }),
      h('div', { id: 'toast', 'aria-live': 'polite' }),
      h('div', { id: 'actions' }),
      h('div', { id: 'journal', hidden: 'true' }),
    ));
    const canvas = root.querySelector('#world');
    const clueBtn = root.querySelector('#btn-clues');
    clueBtn.addEventListener('click', () => {
      const panel = root.querySelector('#journal');
      const open = panel.hidden;
      panel.hidden = !open;
      panel.replaceChildren(...journalList());
    });
    canvas.addEventListener('pointerdown', (ev) => {
      audio.unlock();
      const r = canvas.getBoundingClientRect();
      const px = (ev.clientX - r.left) * (canvas.clientWidth / r.width);
      const py = (ev.clientY - r.top) * (canvas.clientHeight / r.height);
      const cam = cameraFor(state.active, canvas.clientWidth, canvas.clientHeight);
      const tile = tileFromPoint(cam, px, py);
      go(tile.x, tile.y, tile);
    });
    refreshTrail();
    const loop = (t) => {
      if (!root.querySelector('#world')) return;
      paint(t || performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    armIdle();
  }

  function onKey(ev) {
    if (!state?.active || !root.querySelector('#world')) return;
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const d = map[ev.key];
    if (!d) return;
    ev.preventDefault();
    go(state.active.x + d[0], state.active.y + d[1], null);
  }

  function journalList() {
    const rows = journal(state);
    if (!rows.length) return [h('p', {}, 'Pictures you find will sit here.')];
    const job = jobById(state.active.jobId);
    return [h('div', { class: 'clue-row' }, rows.map((c) => {
      const pic = cluePicture(job, c.id, state.active.difficulty);
      const canvas = h('canvas', { width: '84', height: '72', 'aria-hidden': 'true' });
      const btn = h('button', {
        type: 'button', class: 'clue-mini', 'aria-label': LINES[pic.line] || 'Clue',
        onclick: () => { sfx('sparkle'); say(pic.line); },
      }, canvas);
      queueMicrotask(() => paintClue(canvas, pic));
      return btn;
    }))];
  }

  function paintClue(canvas, pic) {
    const w = Number(canvas.getAttribute('width')) || 320;
    const hgt = Number(canvas.getAttribute('height')) || 140;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const n = pic.symbols.length || 1;
    pic.symbols.forEach((sym, i) => {
      const x = ((i + 0.5) / n) * w;
      const y = hgt * 0.52;
      const size = Math.min(hgt * 0.7, w / n * 0.7);
      if (i === pic.mark) {
        ctx.fillStyle = 'rgba(255,216,77,0.9)';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSymbol(ctx, sym, x, y, size);
    });
  }

  function showClueCard(clueId) {
    const job = jobById(state.active.jobId);
    const pic = cluePicture(job, clueId, state.active.difficulty);
    const canvas = h('canvas', { width: '320', height: '150', 'aria-hidden': 'true' });
    const card = h('div', { class: 'cluepic', id: 'clue-card', role: 'dialog', 'aria-label': LINES[pic.line] || 'Clue' },
      canvas,
      h('button', { id: 'clue-ok', class: 'primary', type: 'button', onclick: () => card.remove() }, 'OK'));
    root.querySelector('.trail')?.append(card);
    paintClue(canvas, pic);
    sfx('sparkle');
    say(pic.line);
  }

  function paint(time) {
    const canvas = root.querySelector('#world');
    if (!canvas || !state?.active) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = canvas.clientWidth || 300;
    const hgt = canvas.clientHeight || 400;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(hgt * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(hgt * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWorld(ctx, w, hgt, state, { x: state.active.x, y: state.active.y }, time);
    canvas.dataset.x = String(state.active.x);
    canvas.dataset.y = String(state.active.y);
    canvas.dataset.following = state.active.following ? '1' : '0';
    const arrow = root.querySelector('#hint-arrow');
    canvas.dataset.hint = arrow && !arrow.hidden ? '1' : '0';
  }

  function refreshTrail() {
    const status = root.querySelector('#status');
    if (status) status.textContent = statusLine(state);
    const actions = root.querySelector('#actions');
    if (!actions) return;
    const list = interactHere(state);
    actions.replaceChildren(...list.map((action) => h('button', {
      id: `act-${action.id}`,
      class: action.id === 'calm-pet' || action.id === 'calm-wild' ? 'primary' : '',
      onclick: () => doAction(action.id),
    }, action.label)));
    const clueBtn = root.querySelector('#btn-clues');
    if (clueBtn) clueBtn.textContent = `Clues (${journal(state).length})`;
    const panel = root.querySelector('#journal');
    if (panel && !panel.hidden) panel.replaceChildren(...journalList());
  }

  function armIdle() {
    clearTimeout(idleTimer);
    const arrow = root.querySelector('#hint-arrow');
    if (arrow) arrow.hidden = true;
    if (!state?.active) return;
    const diff = DIFFICULTY[state.active.difficulty];
    if (!diff.hintArrows) return;
    idleTimer = setTimeout(() => {
      const target = hintTarget(state);
      const live = root.querySelector('#hint-arrow');
      if (!target || !live || !state.active) return;
      const from = { x: state.active.x, y: state.active.y };
      const goal = { x: target.x, y: target.y };
      let dir = 'n';
      if (Math.abs(goal.x - from.x) > Math.abs(goal.y - from.y)) dir = goal.x > from.x ? 'e' : 'w';
      else if (goal.y !== from.y) dir = goal.y > from.y ? 's' : 'n';
      live.hidden = false;
      live.dataset.dir = dir;
      if (target.id && state.active.lastHint !== target.id) {
        state.active.lastHint = target.id;
        const pic = cluePicture(jobById(state.active.jobId), target.id, state.active.difficulty);
        say(pic.line);
      }
    }, diff.idleMs);
  }

  function go(x, y, tapped) {
    if (!state?.active || walking) return;
    armIdle();
    const before = state.active.cluesFound.length;
    const result = movePlayer(state, x, y);
    if (!result.ok) {
      toast('Trees are in the way.');
      return;
    }
    const afterClues = result.events?.find((e) => e.type === 'clues');
    const reunion = result.events?.find((e) => e.type === 'reunion');
    const arrived = tapped;
    walking = !INSTANT && result.path && result.path.length > 2;
    const finish = () => {
      walking = false;
      if (!state) return;
      if (afterClues) {
        const last = afterClues.clues[afterClues.clues.length - 1];
        showClueCard(last.id);
      } else if (before === (state.active?.cluesFound.length || before)) {
        toast('');
      }
      persist();
      if (reunion) { sfx('reunion-fanfare'); showReunion(reunion.reunion); return; }
      if (!root.querySelector('#world')) return;
      refreshTrail();
      if (arrived) maybeOpen(arrived);
    };
    if (!walking) finish();
    else setTimeout(finish, Math.min(700, (result.path.length - 1) * 70));
  }

  function maybeOpen(tile) {
    if (!state?.active) return;
    const trail = createTrail(jobById(state.active.jobId));
    const kind = trail.tiles[tile.y]?.[tile.x]?.kind;
    if (!kind) return;
    if ((kind === 'log' || kind === 'crawl') && !state.active.solved.log) showLog();
    else if ((kind === 'picture' || kind === 'pictureDoor') && !state.active.solved.picture) showPictures();
    else if (kind === 'switch' && !state.active.solved.switches) showSwitches();
    else if (kind === 'fern' && !state.active.solved.fern) showFerns();
    else if (kind === 'den' && state.active.petWhere === 'den') showCalm('pet');
    else if (kind === 'grove' && state.active.wildWhere === 'grove' && !state.active.following) showCalm('wild');
  }

  function doAction(id) {
    sfx('tap');
    audio.unlock();
    if (id === 'climb') applyPuzzle(tapLog(state, 'climb'));
    else if (id === 'crawl') applyPuzzle(tapLog(state, 'crawl'));
    else if (id === 'picture') showPictures();
    else if (id === 'switches') showSwitches();
    else if (id === 'fern') showFerns();
    else if (id === 'calm-pet') showCalm('pet');
    else if (id === 'calm-wild') showCalm('wild');
  }

  function applyPuzzle(result) {
    toast(result.text);
    if (result.ok) sfx('sparkle');
    persist();
    if (root.querySelector('#world')) refreshTrail();
    else showTrail();
  }

  function puzzleSheet(title, body, extra) {
    root.querySelector('#actions')?.replaceChildren();
    const sheet = h('div', { class: 'sheet overlay', id: 'puzzle' },
      h('h2', {}, title),
      ...body,
      extra || null,
      h('button', { id: 'btn-close-puzzle', onclick: () => { root.querySelector('#puzzle')?.remove(); refreshTrail(); } }, 'Back to the trail'));
    root.querySelector('.trail')?.append(sheet);
  }

  function showLog() {
    const easy = state.active.difficulty === 'easy';
    puzzleSheet('Fallen log', [
      h('p', {}, easy ? 'The log is low. You can climb, or crawl the gap.' : 'This log is too big to climb. The sunrise side has a gap.'),
      h('div', { class: 'choices' },
        h('button', { id: 'act-climb', class: easy ? 'primary glow' : '', onclick: () => { const r = tapLog(state, 'climb'); closePuzzle(); applyPuzzle(r); } }, 'Climb the log'),
        h('button', { id: 'act-crawl', class: easy ? '' : 'primary glow', onclick: () => { const r = tapLog(state, 'crawl'); closePuzzle(); applyPuzzle(r); } }, 'Crawl through the gap')),
    ]);
  }

  function closePuzzle() { root.querySelector('#puzzle')?.remove(); }

  function showPictures() {
    const job = jobById(state.active.jobId);
    const easy = DIFFICULTY[state.active.difficulty].simplePuzzles;
    const pics = pictureChoices(job);
    puzzleSheet(easy ? 'Tap the bright picture' : 'Copy the pictures in order', [
      h('p', { id: 'pic-progress' }, easy ? 'One picture opens the path.' : `${state.active.pictureSeq.length} / ${job.pictureOrder.length}`),
      h('div', { class: 'choices pics' }, pics.map((p) => h('button', {
        id: `pic-${p.id}`,
        class: easy && p.id === job.pictureOrder[0] ? 'pic glow' : 'pic',
        onclick: () => {
          const r = tapPicture(state, p.id);
          sfx(r.ok ? 'open' : 'miss');
          toast(r.text);
          persist();
          if (state.active.solved.picture) { closePuzzle(); refreshTrail(); }
          else {
            const label = root.querySelector('#pic-progress');
            if (label) label.textContent = `${state.active.pictureSeq.length} / ${job.pictureOrder.length}`;
          }
        },
      }, p.name))),
    ]);
  }

  function showSwitches() {
    const job = jobById(state.active.jobId);
    const easy = DIFFICULTY[state.active.difficulty].simplePuzzles;
    const symbols = [
      { id: 'moon', name: 'Moon' },
      { id: 'star', name: 'Star' },
      { id: 'leaf', name: 'Leaf' },
    ];
    puzzleSheet(easy ? 'Press the glowing stone' : 'Press the stones in order', [
      h('p', { id: 'sw-progress' }, easy ? 'One stone opens the door.' : `${state.active.switchSeq.length} / ${job.switchOrder.length}`),
      h('div', { class: 'choices' }, symbols.map((s) => h('button', {
        id: `sw-${s.id}`,
        class: easy && s.id === job.switchOrder[0] ? 'glow' : '',
        onclick: () => {
          const r = tapSwitch(state, s.id);
          sfx(r.ok ? 'open' : 'miss');
          toast(r.text);
          persist();
          if (state.active.solved.switches) { closePuzzle(); refreshTrail(); }
          else {
            const label = root.querySelector('#sw-progress');
            if (label) label.textContent = `${state.active.switchSeq.length} / ${job.switchOrder.length}`;
          }
        },
      }, s.name))),
    ]);
  }

  function showFerns() {
    const job = jobById(state.active.jobId);
    const easy = DIFFICULTY[state.active.difficulty].simplePuzzles;
    puzzleSheet('Hidden fern path', [
      h('p', {}, easy ? 'The bright clump is hiding a path.' : 'One clump hides a path. Your clues say which.'),
      h('div', { class: 'choices ferns' }, FERN_LABELS.map((label, index) => h('button', {
        id: `fern-${index}`,
        class: easy && index === job.fernIndex ? 'glow' : '',
        onclick: () => {
          const r = tapFern(state, index);
          sfx(r.ok ? 'open' : 'miss');
          toast(r.text);
          persist();
          if (r.ok) { closePuzzle(); refreshTrail(); }
        },
      }, label))),
    ]);
  }

  function showCalm(target) {
    const active = state.active;
    const animal = target === 'wild' ? animalById(active.wildId) : animalById(jobById(active.jobId).animalId);
    const diff = DIFFICULTY[active.difficulty];
    const needed = heartsNeeded(animal);
    const hearts = () => (target === 'wild' ? state.active.wildHearts : state.active.petHearts);
    const band = zoneBand(diff.timingZone);
    let chosen = null;
    let startedAt = 0;

    screen(h('section', { class: 'screen calm' },
      h('canvas', { id: 'calm-art', width: '240', height: '160' }),
      h('h2', { id: 'calm-name' }, animal.name),
      h('p', { class: 'lede', id: 'calm-line' }, target === 'pet'
        ? `${animal.scared} ${jobById(active.jobId).owner.split(' ')[0]}'s item already made one heart.`
        : `${animal.scared} This is a wild pet. Every heart starts as a face.`),
      h('div', { id: 'hearts', 'aria-label': 'hearts' }),
      h('p', { id: 'calm-msg', 'aria-live': 'polite' }, diff.showFavourite ? 'Tap the bright snack or tune.' : 'Match the picture. A miss only hides them.'),
      h('div', { class: 'choices snacks' },
        ...TREATS.map((t) => h('button', {
          id: `treat-${t.id}`,
          class: diff.showFavourite && animal.favourite.kind === 'treat' && animal.favourite.id === t.id ? 'glow' : '',
          onclick: () => pick('treat', t.id, t.name),
        }, `${t.short}`)),
        ...TUNES.map((t) => h('button', {
          id: `tune-${t.id}`,
          class: diff.showFavourite && animal.favourite.kind === 'tune' && animal.favourite.id === t.id ? 'glow' : '',
          onclick: () => pick('tune', t.id, t.name),
        }, t.short))),
      h('div', { id: 'timing', hidden: 'true' },
        h('div', { class: 'track' },
          h('div', { class: 'zone' }),
          h('div', { id: 'star', 'aria-hidden': 'true' })),
        h('button', { id: 'btn-tap', class: 'primary', onclick: () => tapNow() }, 'Tap in the green'),
        h('button', { id: 'btn-rechoose', class: 'quiet', onclick: () => { chosen = null; root.querySelector('#timing').hidden = true; } }, 'Choose another')),
      h('button', { id: 'btn-leave-calm', onclick: () => showTrail() }, 'Not now'),
    ));
    paintHearts();
    paintAnimal(root.querySelector('#calm-art'), animal.kind, 'scared');
    say('calm-start');
    const zone = root.querySelector('.zone');
    zone.style.left = `${band.start * 100}%`;
    zone.style.width = `${(band.end - band.start) * 100}%`;
    function paintHearts() {
      const row = root.querySelector('#hearts');
      if (!row || !state.active) return;
      const have = hearts();
      row.dataset.filled = String(have);
      row.dataset.needed = String(needed);
      row.replaceChildren(...Array.from({ length: needed }, (_, i) => h('span', {
        class: i < have ? 'pip heart' : 'pip face',
      }, i < have ? 'Heart' : 'Face')));
    }

    function pick(kind, id, name) {
      if (kind === 'treat' && (state.active.treats[id] || 0) <= 0) {
        root.querySelector('#calm-msg').textContent = `No ${name} left.`;
        return;
      }
      chosen = { kind, id, name };
      startedAt = performance.now();
      root.querySelector('#timing').hidden = false;
      root.querySelector('#calm-msg').textContent = 'Tap when the star is in the green.';
      sfx('tap');
      say('calm-gently');
    }

    function tapNow() {
      if (!chosen || !state.active) return;
      const timing = root.querySelector('#timing');
      const period = diff.timingPeriodMs;
      const live = ((performance.now() - startedAt) % period) / period;
      // If the button says Now, use the green the player saw. A slow tap still counts.
      const phase = timing?.dataset.hot === '1' ? Number(timing.dataset.phase) : live;
      const result = resolveOffer(state, { target, kind: chosen.kind, id: chosen.id, phase });
      root.querySelector('#calm-msg').textContent = result.ok ? 'A heart!' : 'Hearts stay.';
      persist();
      if (result.hide) {
        sfx('tap');
        showTrail();
        toast('Hearts stay. Try again.');
        say('calm-oops');
        return;
      }
      if (result.done && target === 'pet') {
        sfx('heart-pop');
        showTrail();
        toast(`${animal.name} will follow you home.`);
        say('calm-success');
        return;
      }
      if (result.done && target === 'wild') {
        sfx('heart-pop');
        showSanctuary();
        return;
      }
      if (result.ok) sfx('heart-pop');
      chosen = null;
      root.querySelector('#timing').hidden = true;
      paintHearts();
      paintAnimal(root.querySelector('#calm-art'), animal.kind, 'calm');
    }

    const loop = (now) => {
      if (!root.querySelector('#timing')) return;
      const timing = root.querySelector('#timing');
      if (chosen && timing && !timing.hidden) {
        const phase = ((now - startedAt) % diff.timingPeriodMs) / diff.timingPeriodMs;
        const hot = inZone(phase, diff.timingZone);
        const star = root.querySelector('#star');
        if (star) star.style.left = `${phase * 100}%`;
        timing.dataset.hot = hot ? '1' : '0';
        timing.dataset.phase = phase.toFixed(3);
        const btn = root.querySelector('#btn-tap');
        if (btn) btn.textContent = hot ? 'Now!' : 'Tap in the green';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function showReunion(summary) {
    const animal = animalById(summary.animalId);
    screen(h('section', { class: 'screen sheet' },
      h('canvas', { id: 'reunion-art', width: '240', height: '170' }),
      h('h2', {}, 'Home'),
      h('p', { class: 'lede', id: 'reunion-copy' }, summary.text),
      h('p', { class: 'reward', id: 'reward' }, `+${summary.coins} coins    +${summary.kindness} kindness`),
      h('p', {}, `You have ${summary.totalCoins} coins and ${summary.totalKindness} kindness.`),
      h('button', { id: 'btn-town', class: 'primary', onclick: () => showTown() }, 'Back to Emberhollow'),
    ));
    paintAnimal(root.querySelector('#reunion-art'), animal.kind, 'happy');
    say('reunion-cheer')?.then?.((started) => {
      if (!started) return;
      audio.whenEnded().then(() => { if (root.querySelector('#reunion-copy')) say('reunion-thanks'); });
    });
  }

  function showSanctuary() {
    if (state.active?.pending === 'sanctuary') dismissPending(state);
    const pets = state.sanctuary.map((id) => animalById(id)).filter(Boolean);
    const newest = pets[pets.length - 1];
    screen(h('section', { class: 'screen' },
      header(),
      h('div', { class: 'scroll', id: 'sanctuary' },
        h('h2', {}, 'Sanctuary'),
        h('p', { class: 'lede' }, pets.length ? 'Wild pets who chose to stay. Lost pets go home to their people.' : 'No wild pets yet. Explore the side grove in Wildwood.'),
        newest ? h('p', { id: 'sanctuary-new' }, `${newest.name} the ${newest.kind} trusts you.`) : null,
        ...pets.map((pet) => h('div', { class: 'job', id: `pet-${pet.id}` },
          h('canvas', { 'data-kind': pet.kind, 'data-mood': 'happy', width: '120', height: '96' }),
          h('span', { class: 'jobtext' }, h('strong', {}, pet.name), h('span', {}, `${pet.kind} · ${pet.rarity}`)))),
      ),
      h('footer', { class: 'bar' },
        h('button', { id: 'btn-sanctuary-back', class: 'primary', onclick: () => state.active ? showTrail() : showTown() }, state.active ? 'Back to the trail' : 'Back to town')),
    ));
    for (const canvas of root.querySelectorAll('canvas[data-kind]')) paintAnimal(canvas, canvas.dataset.kind, 'happy');
    persist();
    say('sanctuary-new');
  }

  function openSettings(back) {
    settingsFrom = back;
    gateNext = 'settings';
    showGate();
  }

  function showGate() {
    question = makeQuestion(Math.random);
    gatePassed = false;
    const forSettings = gateNext === 'settings';
    screen(h('section', { class: 'screen sheet', id: 'gate' },
      h('h2', {}, 'Grown-ups'),
      h('p', { class: 'lede' }, forSettings ? 'Settings are for grown-ups.' : 'Two stories are free to try. A grown-up can look at the full game.'),
      h('p', { id: 'gate-q' }, question.prompt),
      h('p', { id: 'gate-answer', 'aria-live': 'polite' }, ''),
      h('div', { class: 'pad' },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => h('button', {
          'data-digit': String(n),
          onclick: () => typeDigit(n),
        }, String(n)))),
      h('p', { id: 'gate-msg' }, 'Ask a grown-up to answer.'),
      h('button', { id: 'btn-clear', onclick: () => { root.querySelector('#gate-answer').textContent = ''; } }, 'Clear'),
      h('button', { id: 'btn-check', class: 'primary', onclick: () => submitGate() }, 'Check'),
      h('button', { id: 'btn-gate-back', onclick: () => {
        if (gateNext === 'settings') {
          if (settingsFrom === 'trail' && state?.active) showTrail();
          else if (state && settingsFrom !== 'title') showTown();
          else showTitle();
        } else showTown();
      } }, 'Back'),
    ));
    say('grownups-gate');
  }

  function typeDigit(n) {
    const el = root.querySelector('#gate-answer');
    const next = (el.textContent + n).replace(/\D/g, '').slice(0, 2);
    el.textContent = next;
    sfx('tap');
  }

  function submitGate() {
    const value = root.querySelector('#gate-answer')?.textContent || '';
    if (!checkAnswer(question, value)) {
      root.querySelector('#gate-msg').textContent = 'Not quite. A grown-up can try the next one.';
      question = makeQuestion(Math.random);
      root.querySelector('#gate-q').textContent = question.prompt;
      root.querySelector('#gate-answer').textContent = '';
      sfx('tap');
      return;
    }
    gatePassed = true;
    sfx('sparkle');
    if (gateNext === 'settings') { showSettings(settingsFrom); return; }
    showUnlock();
  }

  function showUnlock() {
    screen(h('section', { class: 'screen sheet', id: 'unlock-card' },
      h('h2', {}, 'Full Game'),
      h('p', { class: 'price', id: 'price' }, FULL_GAME_PRICE),
      h('p', { class: 'lede' }, 'Every lost pet in Wildwood, and room for new ones later.'),
      h('p', {}, 'Nothing is charged. The shop is not open yet.'),
      h('button', { id: 'btn-not-for-sale', disabled: 'true' }, 'Not for sale yet'),
      import.meta.env.DEV ? h('button', { id: 'btn-dev-unlock', onclick: () => previewUnlock() }, 'Preview unlock (dev only)') : null,
      h('button', { id: 'btn-unlock-back', onclick: () => showTown() }, 'Back to town'),
    ));
  }

  function previewUnlock() {
    setFullGameUnlocked(true, store);
    persist();
    toast('Full game preview is on.');
    showTown();
  }

  function showSettings(back) {
    settingsFrom = back || settingsFrom;
    screen(h('section', { class: 'screen sheet', id: 'settings' },
      h('h2', {}, 'Settings'),
      h('p', {}, 'Difficulty'),
      h('div', { class: 'segment' },
        h('button', { id: 'set-easy', class: settings.difficulty === 'easy' ? 'on' : '', onclick: () => setDiff('easy') }, 'Easy'),
        h('button', { id: 'set-normal', class: settings.difficulty === 'normal' ? 'on' : '', onclick: () => setDiff('normal') }, 'Normal')),
      h('p', { class: 'hint' }, DIFFICULTY[settings.difficulty].blurb),
      audioPanel(),
      import.meta.env.DEV ? h('button', { id: 'btn-dev-unlock', onclick: () => previewUnlock() }, 'Preview unlock (dev only)') : null,
      state ? h('button', { id: 'btn-abandon', onclick: () => { if (state.active) { abandonJob(state); persist(); } showTown(); } }, 'Leave the current search') : null,
      h('button', { id: 'btn-settings-back', class: 'primary', onclick: () => {
        if (back === 'trail' && state?.active) showTrail();
        else if (state && back !== 'title') showTown();
        else showTitle();
      } }, 'Back'),
    ));
  }

  function audioPanel() {
    const row = (id, label) => {
      const on = audio.settings[id + 'On'];
      return h('button', {
        type: 'button', id: `aud-${id}`, 'aria-pressed': on ? 'true' : 'false',
        onclick: () => {
          audio.set({ [id + 'On']: !audio.settings[id + 'On'] });
          showSettings(settingsFrom);
          if (audio.settings.sfxOn) sfx('tap');
        },
      }, `${label} ${on ? 'on' : 'off'}`);
    };
    return h('div', { class: 'audiopanel', id: 'audio-box' }, row('sfx', 'Sounds'), row('music', 'Music'), row('voice', 'Voice'));
  }

  function setDiff(id) {
    settings.difficulty = id;
    if (state) {
      state.difficulty = id;
      if (state.active) {
        state.active.difficulty = id;
        state.active.pictureSeq = [];
        state.active.switchSeq = [];
      }
      persist();
    } else saveSettings();
    sfx('tap');
    showSettings(settingsFrom);
  }

  saveSettings();
  window.addEventListener('pointerdown', () => {
    audio.unlock();
    if (root.querySelector('#world')) armIdle();
  }, { capture: true });
  window.addEventListener('keydown', onKey);

  const api = {
    showTitle, showTown, showTrail,
    get state() { return state; },
    get settings() { return settings; },
    fresh: () => freshState(settings.difficulty),
    adopt(next) { state = next; persist(); showTown(); },
    tileCenter(x, y) {
      const canvas = root.querySelector('#world');
      if (!canvas || !state?.active) return null;
      const cam = cameraFor(state.active, canvas.clientWidth, canvas.clientHeight);
      return tileCenter(cam, x, y);
    },
    unlocked,
  };
  if (params.has('debug') || devUnlockAvailable()) globalThis.__lph = api;
  return api;
}
