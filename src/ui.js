import { h } from './dom.js';
import {
  DIFFICULTY, FULL_GAME_PRICE, FREE_RESCUES, REUNION_MS, TREATS, TUNES, animalById, jobById,
  heartsNeeded, kindnessTitle, pictureChoices, prizeFor, reunionPhase,
} from './data.js';
import {
  abandonJob, beginJob, dismissPending, freshState, hintTarget,
  describeJob, interactHere, journal, listJobs, movePlayer, planMove, resolveOffer, statusLine, tapFern, tapLog,
  tapPicture, tapSwitch,
} from './game.js';
import { devUnlockAvailable, isFullGameUnlocked, rescuesLeft, setFullGameUnlocked } from './progress.js';
import { cancelGate, cooldownLeft, freshGate, isLocked, makeQuestion, submitAttempt } from './gate.js';
import { presentPurchase, restorePurchases } from './store.js';
import { SAVE_KEY, SETTINGS_KEY, readRaw, writeRaw } from './storage.js';
import { cameraFor, drawWorld, tileCenter, tileFromPoint } from './render.js';
import { createTrail, tileAt } from './world.js';
import { followerPose, samplePath, QUEUE_LIMIT, STEP_MS } from './motion.js';
import { inZone, zoneBand } from './calm.js';
import { drawSymbol, paintAnimal } from './art.js';
import { audio, LINES } from './audio.js';
import { cluePicture } from './clues.js';
import { AVATARS, normaliseAvatar, readAvatarChoice } from './avatar.js';
import {
  HOME_TILE, START_TILE, TUTORIAL_KEY, WALK_TILE,
  allows, coachCopy, loadTutorial, nextStep, rememberComplete, rememberOffer, replayTutorial,
  saveTutorial, shouldOffer,
} from './tutorial.js';
import { drawAnimal, drawAvatar, drawCottage, drawHeart, drawOwner } from './art.js';

const FERN_LABELS = ['Sunset side', 'Left of middle', 'Middle', 'Right of middle', 'Sunrise side'];
const params = new URLSearchParams(globalThis.location?.search || '');
const INSTANT = params.has('instant') || (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function createApp(root, store) {
  let state = null;
  let settings = loadSettings();
  let raf = 0;
  let idleTimer = 0;
  let walking = false;
  let walk = null;
  let moveQueue = [];
  let petAt = null;
  let question = null;
  let gatePassed = false;
  let settingsFrom = 'title';
  let titleReady = false;
  let modeIntroPlayed = false;
  let gateNext = 'unlock';
  let gateState = freshGate();
  let gateQuestion = null;
  let purchaseAllowed = false;
  let tutor = null;
  let tutorRecord = loadTutorial(store);
  let tutorSnapshot = null;

  function loadSettings() {
    try {
      const raw = store.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const hero = readAvatarChoice(parsed);
      return {
        difficulty: parsed?.difficulty === 'normal' ? 'normal' : 'easy',
        sound: parsed?.sound !== false,
        speech: parsed?.speech !== false,
        avatar: hero.avatar,
        avatarChosen: hero.avatarChosen,
      };
    } catch {
      return { difficulty: 'easy', sound: true, speech: true, avatar: 'avery', avatarChosen: false };
    }
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
    if (tutor) return;
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
    walk = null;
    moveQueue = [];
    petAt = null;
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
    if (tutor) requestAnimationFrame(syncCoach);
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
      heroButton('mode'),
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
    else if (!settings.avatarChosen) showPicker('mode', { quiet: true });
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
    paintHeroes();
    if (audio.unlocked) say('title-tap');
  }

  function beginPlay() {
    titleReady = true;
    audio.unlock();
    audio.setScene(true);
    sfx('sparkle');
    if (settings.avatarChosen) showMode({ quiet: true });
    else showPicker('mode', { quiet: true });
    say('title-greeting')?.then?.((started) => {
      if (!started) {
        if (root.querySelector('#hero-picker')) say('pick-hero');
        else say('mode-choose');
        return;
      }
      audio.whenEnded().then(() => {
        if (!titleReady) return;
        if (root.querySelector('#hero-picker')) say('pick-hero');
        else if (root.querySelector('#mode-panel')) say('mode-choose');
      });
    });
    modeIntroPlayed = true;
  }

  function showPicker(back = 'mode', opts = {}) {
    const selected = normaliseAvatar(opts.selected || settings.avatar);
    screen(h('section', { class: 'screen', id: 'hero-picker' },
      h('h2', {}, 'Pick your hero!'),
      h('p', { class: 'lede' }, 'This is you. The lost pets are someone else.'),
      h('div', { class: 'scroll hero-grid', id: 'hero-grid' },
        ...AVATARS.map((a) => h('button', {
          id: `hero-${a.id}`,
          type: 'button',
          class: `hero-card${a.id === selected ? ' glow' : ''}`,
          'aria-pressed': a.id === selected ? 'true' : 'false',
          onclick: () => {
            sfx('tap');
            showPicker(back, { quiet: true, selected: a.id });
          },
        },
          h('canvas', { 'data-avatar': a.id, width: '160', height: '160', 'aria-hidden': 'true' }),
          h('strong', { class: 'heroname' }, a.name),
          h('span', { class: 'you-tag' }, 'You')))),
      h('footer', { class: 'bar' },
        settings.avatarChosen ? h('button', {
          id: 'btn-hero-back', type: 'button',
          onclick: () => { sfx('tap'); leavePicker(back); },
        }, 'Back') : null,
        h('button', {
          id: 'btn-hero-continue', class: 'primary', type: 'button',
          onclick: () => confirmHero(selected, back),
        }, 'Continue')),
    ));
    paintHeroes();
    if (!opts.quiet) say('pick-hero');
  }

  function confirmHero(id, back) {
    settings.avatar = normaliseAvatar(id);
    settings.avatarChosen = true;
    if (state) state.avatar = settings.avatar;
    saveSettings();
    if (state) persist();
    sfx('sparkle');
    if (back === 'tutorial') { startPebbleBoard(); return; }
    leavePicker(back);
  }

  function startPebbleBoard() {
    if (!state || state.active?.tutorial) state = freshState(settings.difficulty);
    state.avatar = normaliseAvatar(settings.avatar);
    tutor = { step: 'job', ready: false };
    showTown();
  }

  function leavePicker(back) {
    if (back === 'town' && state) showTown();
    else if (back === 'trail' && state?.active) showTrail();
    else if (back === 'settings') showSettings(settingsFrom);
    else showMode({ quiet: true });
  }

  function actionFromEvent(ev) {
    const el = ev.target?.closest?.bind(ev.target) ? ev.target : null;
    const hit = (sel) => ev.target?.closest?.(sel);
    if (hit('#btn-hero-continue')) return 'hero-continue';
    if (hit('.hero-card')) return 'hero';
    if (hit('#job-pebble')) return 'job-pebble';
    if (hit('#btn-enter')) return 'enter-woods';
    if (hit('#clue-ok')) return 'clue-ok';
    if (hit('#btn-tap')) return 'tap-green';
    if (hit('[id^="treat-"]')) return 'treat';
    if (hit('#world') && state?.active) {
      const canvas = root.querySelector('#world');
      const r = canvas.getBoundingClientRect();
      const px = (ev.clientX - r.left) * (canvas.clientWidth / r.width);
      const py = (ev.clientY - r.top) * (canvas.clientHeight / r.height);
      const cam = cameraFor(focusPos(), canvas.clientWidth, canvas.clientHeight);
      const tile = tileFromPoint(cam, px, py);
      return `tile:${tile.x},${tile.y}`;
    }
    return 'other';
  }

  function shakeRing() {
    const ring = root.querySelector('#coach-ring');
    if (!ring) return;
    ring.classList.remove('shake');
    void ring.offsetWidth;
    ring.classList.add('shake');
  }

  function syncCoach() {
    if (!tutor || !root.querySelector('.screen')) return;
    let coach = root.querySelector('#coach');
    let ring = root.querySelector('#coach-ring');
    if (!coach) {
      coach = h('div', { id: 'coach' },
        h('p', { id: 'coach-line' }),
        h('div', { class: 'coach-actions' },
          h('button', { id: 'coach-again', type: 'button' }, 'Hear again'),
          h('button', { id: 'coach-got', class: 'primary', type: 'button' }, 'Got it')));
      ring = h('div', { id: 'coach-ring', 'aria-hidden': 'true' });
      root.append(ring, coach);
      coach.querySelector('#coach-got').onclick = () => {
        if (!tutor) return;
        tutor.ready = true;
        coach.classList.add('away');
        sfx('tap');
      };
      coach.querySelector('#coach-again').onclick = () => {
        if (!tutor) return;
        const copy = coachCopy(tutor.step, settings.difficulty === 'easy');
        say(copy.id);
      };
    }
    const copy = coachCopy(tutor.step, settings.difficulty === 'easy');
    const line = coach.querySelector('#coach-line');
    if (line && line.dataset.id !== copy.id) {
      line.dataset.id = copy.id;
      line.textContent = copy.text;
      coach.classList.remove('away');
      tutor.ready = false;
      say(copy.id);
    }
    coach.dataset.step = tutor.step;
    placeRing();
  }

  function placeRing() {
    const ring = root.querySelector('#coach-ring');
    if (!ring || !tutor) return;
    const app = root.getBoundingClientRect();
    if (tutor.step === 'walk' || tutor.step === 'home') {
      const canvas = root.querySelector('#world');
      if (!canvas || !state?.active) { ring.hidden = true; return; }
      const cam = cameraFor(focusPos(), canvas.clientWidth, canvas.clientHeight);
      const goal = tutor.step === 'walk' ? WALK_TILE : HOME_TILE;
      const p = tileCenter(cam, goal.x, goal.y);
      const c = canvas.getBoundingClientRect();
      const size = Math.max(52, cam.tile * 0.9);
      ring.hidden = false;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.left = `${c.left - app.left + p.x - size / 2}px`;
      ring.style.top = `${c.top - app.top + p.y - size / 2}px`;
      return;
    }
    const sel = tutor.step === 'hero' ? '#btn-hero-continue'
      : tutor.step === 'clue' ? '#clue-ok'
        : tutor.step === 'calm' ? (root.querySelector('#timing:not([hidden])') ? '#btn-tap' : '#treat-berry')
          : (root.querySelector('#btn-enter') ? '#btn-enter' : '#job-pebble');
    const el = root.querySelector(sel);
    if (!el) { ring.hidden = true; return; }
    const r = el.getBoundingClientRect();
    const pad = 8;
    ring.hidden = false;
    ring.style.left = `${r.left - app.left - pad}px`;
    ring.style.top = `${r.top - app.top - pad}px`;
    ring.style.width = `${r.width + pad * 2}px`;
    ring.style.height = `${r.height + pad * 2}px`;
  }

  function tutorGuard(ev) {
    if (!tutor) return;
    if (ev.target?.closest?.('#coach')) return;
    const action = actionFromEvent(ev);
    if (allows(tutor.step, action, tutor.ready)) return;
    ev.preventDefault();
    ev.stopPropagation();
    shakeRing();
  }

  function showTutorialOffer() {
    tutorRecord = rememberOffer(tutorRecord, 'ask');
    screen(h('section', { class: 'screen sheet', id: 'tutorial-offer' },
      h('h2', {}, 'Want a practice rescue?'),
      h('p', { class: 'lede' }, 'Pebble the turtle is lost. This one does not use a free rescue.'),
      h('button', { id: 'btn-tutorial-yes', class: 'primary', type: 'button', onclick: () => acceptTutorial() }, 'Yes'),
      h('button', { id: 'btn-tutorial-later', type: 'button', onclick: () => declineTutorial() }, 'Maybe later')));
    say('tutor-offer');
  }

  function acceptTutorial() {
    tutorRecord = saveTutorial(store, rememberOffer(tutorRecord, 'yes'));
    sfx('sparkle');
    beginPractice();
  }

  function declineTutorial() {
    tutorRecord = saveTutorial(store, rememberOffer(tutorRecord, 'later'));
    sfx('tap');
    newGame();
  }

  function beginPractice() {
    tutorSnapshot = state ? JSON.parse(JSON.stringify(state)) : loadSave();
    tutor = { step: 'hero', ready: false };
    showPicker('tutorial', { quiet: true });
  }

  function finishPractice() {
    tutor = null;
    tutorRecord = saveTutorial(store, rememberComplete(tutorRecord));
    state = tutorSnapshot || freshState(settings.difficulty);
    tutorSnapshot = null;
    if (state) state.avatar = normaliseAvatar(settings.avatar);
    persist();
    showTown();
  }

  function paintHeroes() {
    for (const canvas of root.querySelectorAll('canvas[data-avatar]')) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      ctx.clearRect(0, 0, w, canvas.height);
      drawAvatar(ctx, canvas.dataset.avatar, w / 2, w * 0.72, w * 0.7, 'portrait');
    }
  }

  function heroButton(back) {
    return h('button', {
      id: 'btn-hero', class: 'iconbtn hero-mini', type: 'button', 'aria-label': 'Change your hero',
      onclick: (ev) => {
        ev.stopPropagation();
        sfx('tap');
        titleReady = true;
        showPicker(back);
      },
    }, h('canvas', { 'data-avatar': settings.avatar, width: '96', height: '96', 'aria-hidden': 'true' }));
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
        h('button', { id: 'btn-play', class: save ? '' : 'primary', type: 'button', onclick: () => onPlay() }, save ? 'New story' : 'Play'),
        h('button', {
          id: 'btn-tutorial-replay', class: 'quiet', type: 'button',
          onclick: () => {
            sfx('tap');
            tutorRecord = saveTutorial(store, replayTutorial(tutorRecord));
            beginPractice();
          },
        }, 'Replay tutorial'),
      ),
      peekRow(),
    ));
    paintPeeks();
    paintHeroes();
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

  function onPlay() {
    tutorRecord = loadTutorial(store);
    if (shouldOffer(tutorRecord)) { showTutorialOffer(); return; }
    newGame();
  }

  function newGame() {
    state = freshState(settings.difficulty);
    state.avatar = normaliseAvatar(settings.avatar);
    state.settings = { ...settings };
    persist();
    showTown();
  }

  function continueGame(save) {
    state = save;
    const hero = readAvatarChoice({ ...settings, ...state.settings });
    settings = {
      ...settings,
      ...state.settings,
      difficulty: state.difficulty || settings.difficulty,
      avatar: settings.avatarChosen ? settings.avatar : hero.avatar,
      avatarChosen: settings.avatarChosen || hero.avatarChosen,
    };
    state.avatar = normaliseAvatar(settings.avatar);
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
      heroButton('town'),
    );
  }

  function showTown() {
    const jobs = tutor?.step === 'job' ? [describeJob(jobById('pebble'))] : listJobs();
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
        h('button', { id: 'btn-grownups', onclick: () => openPurchaseGate('town') }, 'Grown-ups'),
        h('button', { id: 'btn-title', class: 'quiet', onclick: () => { showMode({ quiet: true }); say('come-back'); } }, 'Title')),
    ));
    for (const canvas of root.querySelectorAll('canvas[data-kind]')) {
      paintAnimal(canvas, canvas.dataset.kind, canvas.dataset.mood || 'scared');
    }
    paintHeroes();
    if (!tutor) say('jobboard-intro');
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
    if (tutor?.step === 'job' && id === 'pebble') {
      if (!state) state = freshState(settings.difficulty);
      state.avatar = normaliseAvatar(settings.avatar);
      const practice = beginJob(state, 'pebble', () => 0, { tutorial: true, unlocked: true });
      if (!practice.ok) return;
      showGift(practice.text);
      return;
    }
    if (state.active?.jobId === id) { showTrail(); return; }
    if (!rescuesLeft(state, unlocked())) { openPurchaseGate('town'); return; }
    const started = beginJob(state, id, Math.random, { unlocked: unlocked() });
    if (!started.ok) {
      if (started.reason === 'gate') openPurchaseGate('town');
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
      h('p', {}, `You are carrying ${job.itemId === 'scarf' ? 'the red scarf' : job.itemId === 'ball' ? 'the squeaky ball' : job.itemId === 'stone' ? "Pebble's smooth stone" : 'the silver bell'}. It starts one heart.`),
      h('button', {
        id: 'btn-enter', class: 'primary', type: 'button',
        onclick: () => {
          sfx('sparkle');
          if (tutor?.step === 'job') tutor = { step: 'walk', ready: false };
          showTrail();
        },
      }, 'Into Wildwood'),
    ));
    paintAnimal(root.querySelector('#gift-art'), animal.kind, 'scared');
    if (!state.active?.tutorial) say(`job-${job.id}`);
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
      const cam = cameraFor(focusPos(), canvas.clientWidth, canvas.clientHeight);
      const tile = tileFromPoint(cam, px, py);
      go(tile.x, tile.y, tile);
    });
    refreshTrail();
    const loop = (t) => {
      if (!root.querySelector('#world')) return;
      if (walk && t >= walk.start + walk.ms) finishWalk();
      if (!root.querySelector('#world') || !state?.active) return;
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
    const base = cursor();
    go(base.x + d[0], base.y + d[1], null);
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
      h('button', {
        id: 'clue-ok', class: 'primary', type: 'button',
        onclick: () => {
          card.remove();
          if (tutor?.step === 'clue' && state?.active) {
            tutor = { step: 'calm', ready: false };
            state.active.petWhere = 'den';
            state.active.petHearts = 1;
            state.active.following = false;
            showCalm('pet');
          }
        },
      }, 'OK'));
    root.querySelector('.trail')?.append(card);
    paintClue(canvas, pic);
    sfx('sparkle');
    if (!tutor) say(pic.line);
    else syncCoach();
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
    const pose = walkPose(time);
    drawWorld(ctx, w, hgt, state, { x: pose.x, y: pose.y }, time, pose.motion);
    canvas.dataset.moving = walk ? '1' : '0';
    state.avatar = normaliseAvatar(settings.avatar);
    state.active.glowTile = tutor?.step === 'walk' ? WALK_TILE : tutor?.step === 'home' ? HOME_TILE : null;
    canvas.dataset.avatar = state.avatar;
    if (tutor) placeRing();
    canvas.dataset.x = String(state.active.x);
    canvas.dataset.y = String(state.active.y);
    canvas.dataset.following = state.active.following ? '1' : '0';
    const arrow = root.querySelector('#hint-arrow');
    if (arrow && walk) arrow.hidden = true;
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

  function focusPos() {
    if (walk && state?.active) {
      const t = Math.min(1, (performance.now() - walk.start) / walk.ms);
      return samplePath(walk.path, t);
    }
    return { x: state.active.x, y: state.active.y };
  }

  function cursor() {
    if (moveQueue.length) return moveQueue[moveQueue.length - 1].end;
    if (walk) return walk.path[walk.path.length - 1];
    return { x: state.active.x, y: state.active.y };
  }

  function idlePet() {
    const a = state.active;
    const trail = createTrail(jobById(a.jobId));
    if (tileAt(trail, a.x, a.y + 1)) return { x: a.x, y: a.y + 1, hop: 0 };
    return { x: a.x + 0.35, y: a.y, hop: 0 };
  }

  function walkPose(time) {
    if (!walk) {
      return {
        x: state.active.x,
        y: state.active.y,
        motion: { walking: false, bob: 0, dirx: 0, follow: state.active.following ? petAt : null },
      };
    }
    const t = Math.min(1, ((time || performance.now()) - walk.start) / walk.ms);
    const sample = samplePath(walk.path, t);
    const follow = walk.rest ? followerPose(walk.path, t, walk.rest) : null;
    return {
      x: sample.x,
      y: sample.y,
      motion: { walking: true, bob: Math.sin(sample.frac * Math.PI), dirx: sample.dirx, follow },
    };
  }

  function go(x, y, tapped) {
    if (!state?.active) return;
    armIdle();
    if (walk) {
      enqueue(x, y, tapped);
      return;
    }
    beginWalk(x, y, tapped);
  }

  function enqueue(x, y, tapped) {
    if (moveQueue.length >= QUEUE_LIMIT) return;
    const from = cursor();
    const ghost = { ...state, active: { ...state.active, x: from.x, y: from.y } };
    const plan = planMove(ghost, x, y);
    if (!plan.ok) {
      toast('Trees are in the way.');
      return;
    }
    if (plan.path.length < 2) return;
    const end = plan.path[plan.path.length - 1];
    moveQueue.push({ x, y, tapped, end: { x: end.x, y: end.y } });
  }

  function beginWalk(x, y, tapped) {
    const plan = planMove(state, x, y);
    if (!plan.ok) {
      toast('Trees are in the way.');
      pumpQueue();
      return;
    }
    if (INSTANT || plan.path.length < 2) {
      const before = state.active.cluesFound.length;
      const result = movePlayer(state, x, y);
      if (settle(result, tapped, before)) pumpQueue();
      return;
    }
    const rest = state.active.following ? (petAt || idlePet()) : null;
    walk = {
      path: plan.path,
      interact: plan.interact,
      rest,
      start: performance.now(),
      ms: (plan.path.length - 1) * STEP_MS,
      x,
      y,
      tapped,
    };
    walking = true;
    root.querySelector('#actions')?.replaceChildren();
  }

  function pumpQueue() {
    if (walk || !moveQueue.length || !state?.active || !root.querySelector('#world')) return;
    const next = moveQueue.shift();
    beginWalk(next.x, next.y, next.tapped);
  }

  function finishWalk() {
    const done = walk;
    walk = null;
    walking = false;
    if (!done || !state?.active) return;
    if (done.rest) petAt = followerPose(done.path, 1, done.rest);
    const before = state.active.cluesFound.length;
    const result = movePlayer(state, done.x, done.y, { ok: true, path: done.path, interact: done.interact });
    if (!result.ok) {
      toast('Trees are in the way.');
      pumpQueue();
      return;
    }
    if (settle(result, done.tapped, before)) pumpQueue();
  }

  function settle(result, tapped, before) {
    walking = false;
    if (!state) return false;
    const afterClues = result.events?.find((e) => e.type === 'clues');
    const reunion = result.events?.find((e) => e.type === 'reunion');
    if (afterClues || reunion) moveQueue.length = 0;
    if (afterClues) {
      const last = afterClues.clues[afterClues.clues.length - 1];
      if (tutor?.step === 'walk') tutor = { step: 'clue', ready: false };
      showClueCard(last.id);
    } else if (before === (state.active?.cluesFound.length || before)) {
      toast('');
    }
    persist();
    if (reunion) {
      if (reunion.reunion?.tutorial) {
        tutor = null;
        tutorRecord = saveTutorial(store, rememberComplete(tutorRecord));
      }
      sfx('reunion-fanfare');
      showReunion(reunion.reunion);
      return false;
    }
    if (!root.querySelector('#world')) return false;
    refreshTrail();
    if (tapped && maybeOpen(tapped)) {
      moveQueue.length = 0;
      return false;
    }
    return !afterClues;
  }

  function maybeOpen(tile) {
    if (!state?.active) return false;
    const trail = createTrail(jobById(state.active.jobId));
    const kind = trail.tiles[tile.y]?.[tile.x]?.kind;
    if (!kind) return false;
    if ((kind === 'log' || kind === 'crawl') && !state.active.solved.log) { showLog(); return true; }
    if ((kind === 'picture' || kind === 'pictureDoor') && !state.active.solved.picture) { showPictures(); return true; }
    if (kind === 'switch' && !state.active.solved.switches) { showSwitches(); return true; }
    if (kind === 'fern' && !state.active.solved.fern) { showFerns(); return true; }
    if (kind === 'den' && state.active.petWhere === 'den') { showCalm('pet'); return true; }
    if (kind === 'grove' && state.active.wildWhere === 'grove' && !state.active.following) { showCalm('wild'); return true; }
    return false;
  }

  function doAction(id) {
    if (walk) return;
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
        audio.playCue('pet-found');
        if (tutor?.step === 'calm' && state.active) {
          state.active.following = true;
          state.active.x = START_TILE.x;
          state.active.y = START_TILE.y;
          tutor = { step: 'home', ready: false };
          showTrail();
          return;
        }
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
      if (tutor) placeRing();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  const OWNER_SKIN = { 'Nana Moss': '#F3C39A', 'Coach Wren': '#C4886A', 'Keeper Sol': '#8C5A3C' };

  function showReunion(summary) {
    audio.playCue('celebration');
    if (INSTANT) { showCelebration(summary); return; }
    const animal = animalById(summary.animalId);
    const skin = OWNER_SKIN[summary.owner] || '#F3C39A';
    screen(h('section', { class: 'screen reunion', id: 'reunion-play' },
      h('canvas', { id: 'reunion-stage', 'aria-label': 'The pet runs home' }),
      h('button', {
        id: 'btn-reunion-skip', class: 'quiet', type: 'button',
        onclick: () => showCelebration(summary),
      }, 'Skip'),
    ));
    const canvas = root.querySelector('#reunion-stage');
    const started = performance.now();
    let shown = false;
    const frame = (now) => {
      if (!root.querySelector('#reunion-play') || shown) return;
      const phase = reunionPhase(now - started);
      canvas.dataset.phase = phase;
      paintHomecoming(canvas, animal.kind, skin, phase, now - started, now);
      if (phase === 'card') { shown = true; showCelebration(summary); return; }
      raf = requestAnimationFrame(frame);
    };
    canvas.addEventListener('pointerdown', () => { if (!shown) { shown = true; showCelebration(summary); } });
    raf = requestAnimationFrame(frame);
  }

  function paintHomecoming(canvas, kind, skin, phase, elapsed, now) {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = canvas.clientWidth || 320;
    const hgt = canvas.clientHeight || 480;
    if (canvas.width !== Math.floor(w * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(hgt * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, hgt);
    sky.addColorStop(0, '#7FD3FF');
    sky.addColorStop(0.55, '#D7F4FF');
    sky.addColorStop(1, '#8EE07A');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hgt);
    const houseX = w * 0.72;
    const ground = hgt * 0.62;
    drawCottage(ctx, houseX, ground, Math.min(w, hgt) * 0.42, now);
    drawOwner(ctx, houseX - 8, ground + 8, Math.min(w, hgt) * 0.22, skin);
    const runU = phase === 'wait' ? 0 : phase === 'run'
      ? Math.min(1, (elapsed - REUNION_MS * 0.12) / (REUNION_MS * 0.43))
      : 1;
    const bounce = phase === 'run' ? Math.abs(Math.sin(runU * Math.PI * 4)) * 18 : 0;
    const petX = w * 0.16 + (houseX - w * 0.28) * runU;
    if (phase === 'wait' || phase === 'run') {
      drawAnimal(ctx, kind, petX, ground - bounce, Math.min(w, hgt) * 0.28, 'happy');
    } else {
      drawAnimal(ctx, kind, houseX - 28, ground - 4, Math.min(w, hgt) * 0.26, 'happy');
    }
    if (phase === 'hearts') {
      const burst = (elapsed - REUNION_MS * 0.72) / (REUNION_MS * 0.28);
      for (let i = 0; i < 6; i++) {
        const rise = Math.max(0, burst - i * 0.08);
        drawHeart(ctx, houseX - 36 + (i - 2.5) * 28, ground - 40 - rise * 120, 26 + i * 3);
      }
    }
  }

  function showCelebration(summary) {
    const stars = Math.max(1, Math.min(3, summary.kindness || 1));
    const bits = [];
    if (!INSTANT) {
      for (let i = 0; i < 14; i++) bits.push(h('i', { class: 'bit', style: `--i:${i}` }));
    }
    screen(h('section', { class: 'screen sheet reunion-card', id: 'reunion' },
      h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...bits),
      h('h2', {}, 'You did it!'),
      h('p', { class: 'lede', id: 'reunion-copy' }, summary.text),
      h('p', { class: 'reward', id: 'reward' }, `+${summary.coins} coins`),
      h('p', { id: 'coin-total' }, `${summary.totalCoins} coins`),
      h('p', { id: 'kind-line' }, `+${summary.kindness} kindness`),
      h('div', { id: 'stars', 'aria-label': 'reputation stars' },
        ...[1, 2, 3].map((n) => h('span', { class: n <= stars ? 'star on' : 'star' }, '★'))),
      h('div', { id: 'prize-box', class: INSTANT ? 'open' : '' },
        h('p', { id: 'prize-name' }, summary.prize?.name || 'A gift'),
        h('p', { class: 'hint', id: 'prize-blurb' }, summary.prize?.blurb || '')),
      h('button', {
        id: 'btn-town', class: 'primary', type: 'button',
        onclick: () => (summary.tutorial ? finishPractice() : showTown()),
      }, 'Back to Emberhollow'),
    ));
    const line = LINES[`reunion-${summary.animalId}`] ? `reunion-${summary.animalId}` : 'reunion-cheer';
    say(line);
    if (!INSTANT) {
      const box = root.querySelector('#prize-box');
      setTimeout(() => box?.classList.add('open'), 700);
      const total = root.querySelector('#coin-total');
      const from = Math.max(0, summary.totalCoins - summary.coins);
      const start = performance.now();
      const tick = (now) => {
        if (!total || !root.querySelector('#reunion')) return;
        const u = Math.min(1, (now - start) / 900);
        total.textContent = `${Math.round(from + (summary.totalCoins - from) * u)} coins`;
        if (u < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
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
    paintHeroes();
    persist();
    say('sanctuary-new');
  }

  function openSettings(back) {
    settingsFrom = back;
    gateNext = 'settings';
    purchaseAllowed = false;
    showGate();
  }

  function openPurchaseGate(back) {
    settingsFrom = back || 'town';
    gateNext = 'purchase';
    purchaseAllowed = false;
    showGate();
  }

  function leaveGate() {
    purchaseAllowed = false;
    const back = gateNext === 'settings' || gateNext === 'purchase' ? settingsFrom : 'town';
    if (back === 'trail' && state?.active) showTrail();
    else if (state && back !== 'title') showTown();
    else if (state) showTown();
    else showTitle();
  }

  function showGate() {
    question = isLocked(gateState, Date.now()) ? gateQuestion : makeQuestion(Math.random);
    gateQuestion = question;
    gatePassed = false;
    purchaseAllowed = false;
    const locked = isLocked(gateState, Date.now());
    const forSettings = gateNext === 'settings';
    screen(h('section', { class: 'screen sheet', id: 'gate' },
      h('h2', {}, 'Grown-ups'),
      h('p', { class: 'lede' }, forSettings ? 'Settings are for grown-ups.' : 'A grown-up can open the full game.'),
      h('p', { id: 'gate-q' }, locked ? 'Please wait.' : question.prompt),
      h('p', { id: 'gate-answer', 'aria-live': 'polite' }, ''),
      h('div', { class: 'pad', id: 'gate-pad' },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => h('button', {
          type: 'button',
          'data-digit': String(n),
          disabled: locked ? 'true' : null,
          onclick: () => typeDigit(n),
        }, String(n)))),
      h('p', { id: 'gate-msg' }, locked ? 'Ask a grown-up!' : 'Ask a grown-up to answer.'),
      h('p', { id: 'gate-tries', class: 'hint' }, locked ? '' : `${gateState.triesLeft} tries`),
      h('button', { id: 'btn-clear', type: 'button', disabled: locked ? 'true' : null, onclick: () => { const el = root.querySelector('#gate-answer'); if (el) el.textContent = ''; } }, 'Clear'),
      h('button', { id: 'btn-check', class: 'primary', type: 'button', disabled: locked ? 'true' : null, onclick: () => submitGate() }, 'Check'),
      h('button', { id: 'btn-gate-back', type: 'button', onclick: () => { cancelGate(); leaveGate(); } }, 'Back'),
    ));
    say('grownups-gate');
    if (locked) armCooldown();
  }

  function armCooldown() {
    clearTimeout(idleTimer);
    const tick = () => {
      if (!root.querySelector('#gate')) return;
      const left = cooldownLeft(gateState, Date.now());
      const msg = root.querySelector('#gate-msg');
      if (left <= 0) { showGate(); return; }
      if (msg) msg.textContent = `Ask a grown-up! ${Math.ceil(left / 1000)}s`;
      idleTimer = setTimeout(tick, 500);
    };
    tick();
  }

  function typeDigit(n) {
    if (isLocked(gateState, Date.now())) return;
    const el = root.querySelector('#gate-answer');
    if (!el) return;
    el.textContent = (el.textContent + n).replace(/\D/g, '').slice(0, 2);
    sfx('tap');
  }

  function submitGate() {
    const value = root.querySelector('#gate-answer')?.textContent || '';
    const result = submitAttempt(gateState, question, value, Date.now());
    gateState = result.gate;
    if (!result.purchase) {
      purchaseAllowed = false;
      sfx('tap');
      const msg = root.querySelector('#gate-msg');
      if (msg) msg.textContent = result.message || 'Ask a grown-up!';
      if (result.reason === 'fail') { leaveGate(); toast('Ask a grown-up!'); return; }
      if (result.reason === 'cooldown') { showGate(); return; }
      question = makeQuestion(Math.random);
      gateQuestion = question;
      const q = root.querySelector('#gate-q');
      if (q) q.textContent = question.prompt;
      const ans = root.querySelector('#gate-answer');
      if (ans) ans.textContent = '';
      const tries = root.querySelector('#gate-tries');
      if (tries) tries.textContent = `${result.triesLeft} tries`;
      return;
    }
    purchaseAllowed = true;
    gatePassed = true;
    sfx('sparkle');
    if (gateNext === 'settings') { showSettings(settingsFrom); return; }
    showPurchaseSheet();
  }

  function showPurchaseSheet() {
    if (!purchaseAllowed) return;
    screen(h('section', { class: 'screen sheet', id: 'purchase-sheet' },
      h('h2', {}, 'Full Game'),
      h('p', { class: 'price', id: 'price' }, FULL_GAME_PRICE),
      h('p', { class: 'lede' }, 'Every lost pet in Wildwood, for keeps.'),
      h('button', { id: 'btn-buy', class: 'primary', type: 'button', onclick: () => onBuy() }, `${FULL_GAME_PRICE} Full Game`),
      h('button', { id: 'btn-restore', type: 'button', onclick: () => onRestore() }, 'Restore purchases'),
      h('p', { id: 'purchase-note' }, 'On iPhone this opens the App Store sheet. This web page does not charge anyone.'),
      h('a', { id: 'link-privacy', href: './privacy.html' }, 'Privacy policy'),
      h('a', { id: 'link-website', href: 'https://gorillastocks.github.io/lost-pet-hero/' }, 'Website'),
      h('a', { id: 'link-credits', href: './credits.html' }, 'Credits'),
      h('button', { id: 'btn-rate', type: 'button', onclick: () => openRating() }, 'Rate this game'),
      h('button', { id: 'btn-unlock-back', type: 'button', onclick: () => { purchaseAllowed = false; showTown(); } }, 'Back to town'),
    ));
  }

  async function onBuy() {
    if (!purchaseAllowed) return;
    const result = await presentPurchase();
    const note = root.querySelector('#purchase-note');
    if (result.owned) {
      setFullGameUnlocked(true, store);
      persist();
      purchaseAllowed = false;
      showTown();
      return;
    }
    if (note) {
      note.textContent = result.platform === 'web'
        ? 'Nothing is charged. The App Store sheet opens on iPhone.'
        : (result.cancelled ? 'The App Store sheet was closed.' : (result.error || 'The purchase did not finish.'));
    }
  }

  async function onRestore() {
    if (!purchaseAllowed) return;
    const result = await restorePurchases();
    const note = root.querySelector('#purchase-note');
    if (result.owned) {
      setFullGameUnlocked(true, store);
      persist();
      purchaseAllowed = false;
      showTown();
      return;
    }
    if (note) note.textContent = 'No purchases to restore.';
  }

  function openRating() {
    if (!purchaseAllowed) return;
    const url = 'https://apps.apple.com';
    try { window.open(url, '_blank', 'noopener'); } catch { /* stay in the game */ }
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
      h('p', {}, `Your hero: ${AVATARS.find((a) => a.id === settings.avatar)?.name || 'Avery'}`),
      h('button', {
        id: 'btn-settings-hero', type: 'button',
        onclick: () => { sfx('tap'); showPicker('settings'); },
      }, 'Change hero'),
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
  root.addEventListener('pointerdown', tutorGuard, true);
  root.addEventListener('click', tutorGuard, true);

  window.addEventListener('pointerdown', () => {
    audio.unlock();
    if (root.querySelector('#world')) armIdle();
  }, { capture: true });
  window.addEventListener('keydown', onKey);

  function ensureJob() {
    if (!state) state = freshState(settings.difficulty);
    if (!state.active) beginJob(state, 'pip', () => 0, { unlocked: true });
  }

  // Debug-only jumps so layout checks can open each screen without a full rescue.
  function preview(which) {
    if (which === 'title') { titleReady = false; showSplash(); return; }
    if (which === 'picker') { titleReady = true; showPicker('mode', { quiet: true }); return; }
    if (which === 'mode') { titleReady = true; settings.avatarChosen = true; showMode({ quiet: true }); return; }
    if (which === 'gate') { if (!state) state = freshState(settings.difficulty); openSettings('town'); return; }
    if (which === 'settings') { if (!state) state = freshState(settings.difficulty); showSettings('town'); return; }
    if (which === 'jobs') { if (!state) state = freshState(settings.difficulty); showTown(); return; }
    if (which === 'map') { ensureJob(); showTrail(); return; }
    if (which === 'clues') { ensureJob(); showTrail(); showClueCard('paw'); return; }
    if (which === 'calm') { ensureJob(); showCalm('pet'); return; }
    if (which === 'reunion') {
      ensureJob();
      const job = jobById('pip');
      showReunion({
        animalId: 'pip', text: job.reunion, coins: 10, kindness: 1, totalCoins: 10, totalKindness: 1,
        prize: prizeFor('pip'), owner: job.owner,
      });
      return;
    }
    if (which === 'sanctuary') {
      if (!state) state = freshState(settings.difficulty);
      state.sanctuary = ['dew', 'fern', 'star'];
      showSanctuary();
    }
  }

  const api = {
    showTitle, showTown, showTrail, preview,
    get state() { return state; },
    get settings() { return settings; },
    fresh: () => freshState(settings.difficulty),
    adopt(next) { state = next; persist(); showTown(); },
    tileCenter(x, y) {
      const canvas = root.querySelector('#world');
      if (!canvas || !state?.active) return null;
      const cam = cameraFor(focusPos(), canvas.clientWidth, canvas.clientHeight);
      return tileCenter(cam, x, y);
    },
    unlocked,
  };
  if (params.has('debug') || devUnlockAvailable()) globalThis.__lph = api;
  return api;
}
