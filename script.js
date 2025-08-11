// HYDRATE GUYSS — Enhanced with stop/reset and break management

/* Config */
const HYDRATION_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const PLAY_DURATION_MS = 30 * 1000; // 30 seconds
const SIREN_PLAY_DURATION_MS = 30 * 1000; // 30 seconds
const BREAK_DURATION_MS = 20 * 60 * 1000; // 20 minutes for breaks
const LUNCH_DURATION_MS = 60 * 60 * 1000; // 1 hour for lunch

// Siren schedule (24-hour values) in local time
const SIREN_SCHEDULE = [
  { h: 10, m: 25, label: "Break Siren", duration: BREAK_DURATION_MS },
  { h: 12, m: 25, label: "Lunch Siren", duration: LUNCH_DURATION_MS },
  { h: 15, m: 5,  label: "Break Siren", duration: BREAK_DURATION_MS },
];

// Local MP3s rotation — place files in assets/audio and update these names
const HYDRATION_TRACKS = [
  "assets/audio/hydration1.mp3",
  "assets/audio/hydration2.mp3",
  "assets/audio/hydration3.mp3",
];

/* DOM */
const countdownEl = document.getElementById("countdown");
const clockEl = document.getElementById("clock");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const statusLine = document.getElementById("statusLine");
const nextSirensEl = document.getElementById("nextSirens");
const breakInfoEl = document.getElementById("breakInfo");
const cycleInfoEl = document.getElementById("cycleInfo");

/* State */
let appStarted = false;
let timerRunning = false;
let currentCycle = 1;
let nextHydrationDeadline = Date.now() + HYDRATION_INTERVAL_MS;
let hydrationPlaying = false;
let sirenPlaying = false;
let currentBreakEnd = null;
let hydrationShuffle = shuffle(HYDRATION_TRACKS);
let hydrationIndex = 0;
let uiTickHandle = null;
let scheduledSirens = [];
let pausedTimeRemaining = HYDRATION_INTERVAL_MS;

/* Audio */
let audioCtx = null;
let masterGain = null;
let hydrationGain = null;
let sirenGain = null;
let currentHydrationEl = null; // HTMLAudioElement
let currentHydrationNode = null; // MediaElementAudioSourceNode

function initAudioGraph() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new Ctx();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(audioCtx.destination);

  hydrationGain = audioCtx.createGain();
  hydrationGain.gain.value = 0.0;
  hydrationGain.connect(masterGain);

  sirenGain = audioCtx.createGain();
  sirenGain.gain.value = 0.0;
  sirenGain.connect(masterGain);
}

async function unlockAudio() {
  initAudioGraph();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  // Play and stop a silent click to ensure gesture-unlocked state
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  g.gain.value = 0.00001;
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

/* Time helpers */
function pad2(n) { return n.toString().padStart(2, "0"); }

function formatClock(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)} ${ampm}`;
}

function mmssFromMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Timer Control */
function startTimer() {
  if (timerRunning) return;
  
  timerRunning = true;
  appStarted = true;
  
  if (currentBreakEnd && Date.now() < currentBreakEnd) {
    // Still in break time
    nextHydrationDeadline = currentBreakEnd + HYDRATION_INTERVAL_MS;
    statusLine.textContent = "Timer started. Will resume after break.";
  } else {
    // Normal cycle
    nextHydrationDeadline = Date.now() + pausedTimeRemaining;
    statusLine.textContent = "Timer started. Stay hydrated!";
  }
  
  updateButtonStates();
  updateCycleInfo();
}

function stopTimer() {
  if (!timerRunning) return;
  
  timerRunning = false;
  pausedTimeRemaining = nextHydrationDeadline - Date.now();
  
  if (pausedTimeRemaining < 0) pausedTimeRemaining = HYDRATION_INTERVAL_MS;
  
  statusLine.textContent = "Timer paused. Click Start to resume.";
  updateButtonStates();
  
  // Add paused visual state
  countdownEl.classList.add("paused");
}

function resetTimer() {
  timerRunning = false;
  appStarted = false;
  currentCycle = 1;
  pausedTimeRemaining = HYDRATION_INTERVAL_MS;
  nextHydrationDeadline = Date.now() + HYDRATION_INTERVAL_MS;
  currentBreakEnd = null;
  
  // Stop any playing audio
  stopHydrationElement();
  
  statusLine.textContent = "Press Start to begin the 20-minute hydration cycle.";
  updateButtonStates();
  updateCycleInfo();
  
  // Remove paused visual state
  countdownEl.classList.remove("paused");
}

function updateButtonStates() {
  startButton.disabled = timerRunning;
  stopButton.disabled = !timerRunning;
  resetButton.disabled = !appStarted;
}

function updateCycleInfo() {
  cycleInfoEl.textContent = `Cycle ${currentCycle}`;
}

/* Hydration playback */
async function playHydrationReminder() {
  if (hydrationPlaying || sirenPlaying) return;
  
  hydrationPlaying = true;
  statusLine.textContent = "Hydration reminder playing for 30s…";

  try {
    const src = hydrationShuffle[hydrationIndex % hydrationShuffle.length];
    hydrationIndex++;
    if (hydrationIndex % hydrationShuffle.length === 0) {
      hydrationShuffle = shuffle(HYDRATION_TRACKS); // reshuffle after a full cycle
    }

    await playHydrationTrack(src);
  } catch (err) {
    // Fallback to synthesized beeps if file fails
    console.warn("Hydration track failed, using synth fallback", err);
    await playHydrationSynth();
  } finally {
    hydrationPlaying = false;
    
    // Check if we're in break time
    if (currentBreakEnd && Date.now() < currentBreakEnd) {
      statusLine.textContent = "In break time. Timer will resume after break.";
    } else {
      // Start next cycle automatically
      currentCycle++;
      nextHydrationDeadline = Date.now() + HYDRATION_INTERVAL_MS;
      statusLine.textContent = "Next hydration in 20 minutes.";
      updateCycleInfo();
    }
  }
}

function attachHydrationElement(el) {
  currentHydrationEl = el;
  currentHydrationNode = audioCtx.createMediaElementSource(el);
  currentHydrationNode.connect(hydrationGain);
}

async function playHydrationTrack(src) {
  if (!audioCtx) initAudioGraph();
  // Stop previous element if any
  stopHydrationElement();

  const el = new Audio();
  el.src = src;
  el.crossOrigin = "anonymous";
  el.loop = true;
  el.preload = "auto";

  attachHydrationElement(el);

  const fadeInSec = 0.5;
  const fadeOutSec = 0.8;

  await el.play();

  // Fade in
  const now = audioCtx.currentTime;
  hydrationGain.gain.cancelScheduledValues(now);
  hydrationGain.gain.setValueAtTime(0.0, now);
  hydrationGain.gain.linearRampToValueAtTime(0.9, now + fadeInSec);

  // Play for PLAY_DURATION_MS, then fade out and stop
  await waitMs(PLAY_DURATION_MS - fadeOutSec * 1000);

  const t = audioCtx.currentTime;
  hydrationGain.gain.cancelScheduledValues(t);
  hydrationGain.gain.setValueAtTime(hydrationGain.gain.value, t);
  hydrationGain.gain.linearRampToValueAtTime(0.0, t + fadeOutSec);

  await waitMs(fadeOutSec * 1000 + 50);
  stopHydrationElement();
}

function stopHydrationElement() {
  try {
    if (currentHydrationEl) {
      currentHydrationEl.pause();
      currentHydrationEl.src = "";
    }
    if (currentHydrationNode) {
      currentHydrationNode.disconnect();
    }
  } catch (_) {}
  currentHydrationEl = null;
  currentHydrationNode = null;
}

async function playHydrationSynth() {
  if (!audioCtx) initAudioGraph();
  const base = audioCtx.createOscillator();
  base.type = "sawtooth";
  const gain = audioCtx.createGain();
  gain.gain.value = 0;
  base.connect(gain).connect(hydrationGain);

  const now = audioCtx.currentTime;
  base.frequency.setValueAtTime(440, now);
  base.start();

  // Pattern: 6 short pulses per second alternating frequencies
  const pulses = Math.floor(PLAY_DURATION_MS / 160);
  for (let i = 0; i < pulses; i++) {
    const t0 = audioCtx.currentTime;
    const f = 440 + (i % 2 === 0 ? 120 : -80);
    base.frequency.setValueAtTime(f, t0);
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.8, t0 + 0.04);
    gain.gain.linearRampToValueAtTime(0.0, t0 + 0.14);
    await waitMs(160);
  }

  base.stop();
}

/* Sirens and Breaks */
async function playSiren(label, duration) {
  if (sirenPlaying) return;
  
  sirenPlaying = true;
  statusLine.textContent = `${label} playing for 30s…`;

  // Set break end time
  currentBreakEnd = Date.now() + duration;
  
  // Preempt hydration if active
  if (hydrationPlaying) {
    try {
      const t = audioCtx.currentTime;
      hydrationGain.gain.cancelScheduledValues(t);
      hydrationGain.gain.setTargetAtTime(0.0, t, 0.2);
    } catch (_) {}
  }

  await playSynthSiren(label);

  sirenPlaying = false;
  
  // Update status based on break type
  if (duration === LUNCH_DURATION_MS) {
    statusLine.textContent = "Lunch break started. Timer paused for 1 hour.";
  } else {
    statusLine.textContent = "Break started. Timer paused for 20 minutes.";
  }
  
  updateBreakInfo();
}

async function playSynthSiren(label) {
  if (!audioCtx) initAudioGraph();

  // Two different flavors for break vs lunch
  const type = /lunch/i.test(label) ? "lunch" : "break";

  if (type === "break") {
    // Break: classic two-tone warble
    const osc = audioCtx.createOscillator();
    osc.type = "square";
    const g = audioCtx.createGain();
    g.gain.value = 0.0;
    osc.connect(g).connect(sirenGain);

    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 6; // warble rate
    lfoGain.gain.value = 120; // warble depth
    lfoGain.connect(osc.frequency);

    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(650, now);

    const fadeIn = 0.2;
    sirenGain.gain.cancelScheduledValues(now);
    sirenGain.gain.setValueAtTime(0, now);
    sirenGain.gain.linearRampToValueAtTime(0.9, now + fadeIn);

    osc.start();
    lfo.start();
    await waitMs(SIREN_PLAY_DURATION_MS - 500);

    const t = audioCtx.currentTime;
    sirenGain.gain.linearRampToValueAtTime(0.0, t + 0.4);
    await waitMs(450);
    lfo.stop();
    osc.stop();
  } else {
    // Lunch: rising-falling siren sweep
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    const g = audioCtx.createGain();
    g.gain.value = 0.0;
    osc.connect(g).connect(sirenGain);

    const now = audioCtx.currentTime;
    const fadeIn = 0.15;
    sirenGain.gain.cancelScheduledValues(now);
    sirenGain.gain.setValueAtTime(0, now);
    sirenGain.gain.linearRampToValueAtTime(0.9, now + fadeIn);

    osc.start();

    const start = performance.now();
    while (performance.now() - start < SIREN_PLAY_DURATION_MS - 400) {
      const t0 = audioCtx.currentTime;
      osc.frequency.cancelScheduledValues(t0);
      osc.frequency.setValueAtTime(400, t0);
      osc.frequency.linearRampToValueAtTime(1200, t0 + 0.7);
      osc.frequency.linearRampToValueAtTime(400, t0 + 1.4);
      await waitMs(1400);
    }

    const t = audioCtx.currentTime;
    sirenGain.gain.linearRampToValueAtTime(0.0, t + 0.4);
    await waitMs(450);
    osc.stop();
  }
}

function updateBreakInfo() {
  if (currentBreakEnd && Date.now() < currentBreakEnd) {
    const remaining = currentBreakEnd - Date.now();
    const minutes = Math.ceil(remaining / 60000);
    const type = remaining >= LUNCH_DURATION_MS * 0.8 ? "Lunch" : "Break";
    breakInfoEl.textContent = `${type} in progress. ${minutes} min remaining.`;
    breakInfoEl.style.display = "block";
  } else {
    breakInfoEl.style.display = "none";
    currentBreakEnd = null;
  }
}

/* Scheduling */
function scheduleSirens() {
  // Clear existing
  for (const h of scheduledSirens) clearTimeout(h);
  scheduledSirens = [];

  const upcoming = [];
  const now = new Date();
  for (const s of SIREN_SCHEDULE) {
    const next = nextOccurrence(now, s.h, s.m);
    const msUntil = next.getTime() - now.getTime();
    const handle = setTimeout(async () => {
      await playSiren(s.label, s.duration);
      // After firing, schedule the next day's occurrence
      const tomorrow = new Date(next.getTime() + 24 * 60 * 60 * 1000);
      const ms = tomorrow.getTime() - Date.now();
      const h2 = setTimeout(() => playSiren(s.label, s.duration), ms);
      scheduledSirens.push(h2);
      updateNextSirensUI();
    }, msUntil);
    scheduledSirens.push(handle);
    upcoming.push({ label: s.label, when: next });
  }

  updateNextSirensUI(upcoming);
}

function nextOccurrence(base, hour, minute) {
  const d = new Date(base);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= base.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function updateNextSirensUI(precomputed) {
  const now = new Date();
  const list = (precomputed || SIREN_SCHEDULE.map(s => ({ label: s.label, when: nextOccurrence(now, s.h, s.m) })))
    .sort((a,b) => a.when - b.when)
    .map(x => `${x.label}: ${formatClock12(x.when)}`)
    .join("  •  ");
  nextSirensEl.textContent = list ? `Upcoming — ${list}` : "";
}

function formatClock12(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)} ${ampm}`;
}

/* Loop */
function startUiLoop() {
  if (uiTickHandle) return;
  const tick = () => {
    const now = new Date();
    clockEl.textContent = formatClock(now);

    if (appStarted) {
      updateBreakInfo();
      
      if (timerRunning && !currentBreakEnd) {
        const remaining = nextHydrationDeadline - now.getTime();
        countdownEl.textContent = mmssFromMs(remaining);
        countdownEl.classList.remove("paused");
        
        // Tick animation
        countdownEl.classList.toggle("tick");
        setTimeout(() => countdownEl.classList.toggle("tick"), 120);

        if (!hydrationPlaying && !sirenPlaying && remaining <= 0) {
          playHydrationReminder();
        }
      } else if (currentBreakEnd && now.getTime() < currentBreakEnd) {
        // In break time
        const breakRemaining = currentBreakEnd - now.getTime();
        countdownEl.textContent = mmssFromMs(breakRemaining);
        countdownEl.classList.add("paused");
      } else if (currentBreakEnd && now.getTime() >= currentBreakEnd) {
        // Break ended, resume timer
        currentBreakEnd = null;
        if (timerRunning) {
          nextHydrationDeadline = now.getTime() + HYDRATION_INTERVAL_MS;
          statusLine.textContent = "Break ended. Timer resumed.";
          updateBreakInfo();
        }
      }
    }
  };
  tick();
  uiTickHandle = setInterval(tick, 500);
}

function waitMs(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* Event Listeners */
startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  statusLine.textContent = "Initializing audio…";
  try {
    await unlockAudio();
    startTimer();
    scheduleSirens();
  } catch (err) {
    console.error(err);
    statusLine.textContent = "Audio initialization failed. Try clicking Start again.";
    startButton.disabled = false;
  }
});

stopButton.addEventListener("click", stopTimer);
resetButton.addEventListener("click", resetTimer);

window.addEventListener("visibilitychange", () => {
  // Re-sync countdown to system time when tab becomes visible again
  if (!document.hidden && appStarted && timerRunning) {
    if (currentBreakEnd && Date.now() < currentBreakEnd) {
      // Still in break
      return;
    }
    nextHydrationDeadline = Math.max(nextHydrationDeadline, Date.now());
  }
});

/* Init */
updateNextSirensUI();
startUiLoop(); 