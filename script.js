// HYDRATE GUYSS — Enhanced with stop/reset and break management

/* Config */
const HYDRATION_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes (TESTING)
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
  "assets/audio/hydration4.mp3",
  "assets/audio/hydration5.mp3",
];

// Siren audio file
const SIREN_AUDIO_FILE = "assets/audio/siren.mp3";

/* DOM */
const countdownEl = document.getElementById("countdown");
const clockEl = document.getElementById("clock");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const testAudioButton = document.getElementById("testAudioButton");
const testSirenButton = document.getElementById("testSirenButton");
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
  console.log("🔧 Initializing audio graph...");
  if (audioCtx) {
    console.log("✅ Audio context already exists");
    return;
  }
  
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    console.log("🔧 AudioContext constructor:", Ctx);
    
    audioCtx = new Ctx();
    console.log("✅ Audio context created:", audioCtx.state);

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioCtx.destination);
    console.log("✅ Master gain created and connected");

    hydrationGain = audioCtx.createGain();
    hydrationGain.gain.value = 0.0;
    hydrationGain.connect(masterGain);
    console.log("✅ Hydration gain created and connected");

    sirenGain = audioCtx.createGain();
    sirenGain.gain.value = 0.0;
    sirenGain.connect(masterGain);
    console.log("✅ Siren gain created and connected");
    
  } catch (error) {
    console.error("❌ Failed to initialize audio graph:", error);
    throw error;
  }
}

// Simple test function to verify audio works
async function testAudio() {
  console.log("🧪 Testing basic audio...");
  try {
    if (!audioCtx) {
      console.log("❌ No audio context, initializing...");
      initAudioGraph();
    }
    
    if (audioCtx.state === "suspended") {
      console.log("⏸️ Audio context suspended, resuming...");
      await audioCtx.resume();
    }
    
    console.log("🔊 Audio context state:", audioCtx.state);
    
    // Create a simple test tone
    const testOsc = audioCtx.createOscillator();
    const testGain = audioCtx.createGain();
    
    testOsc.type = "sine";
    testOsc.frequency.value = 800;
    testGain.gain.value = 0.3;
    
    testOsc.connect(testGain);
    testGain.connect(audioCtx.destination);
    
    console.log("🔊 Playing test tone...");
    testOsc.start();
    testOsc.stop(audioCtx.currentTime + 0.5);
    
    console.log("✅ Test audio completed");
    return true;
    
  } catch (error) {
    console.error("❌ Test audio failed:", error);
    return false;
  }
}

async function unlockAudio() {
  console.log("🔓 Unlocking audio...");
  try {
    initAudioGraph();
    if (audioCtx.state === "suspended") {
      console.log("⏸️ Audio context suspended, resuming...");
      await audioCtx.resume();
    }
    console.log("✅ Audio context state:", audioCtx.state);
    
    // Test audio immediately after unlock
    console.log("🧪 Testing audio after unlock...");
    const testResult = await testAudio();
    if (testResult) {
      console.log("🔊 Audio unlocked and tested successfully");
    } else {
      console.log("⚠️ Audio unlocked but test failed");
    }
    
  } catch (error) {
    console.error("❌ Failed to unlock audio:", error);
    throw error;
  }
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
  console.log("🎵 Starting hydration reminder...");

  try {
    const src = hydrationShuffle[hydrationIndex % hydrationShuffle.length];
    hydrationIndex++;
    if (hydrationIndex % hydrationShuffle.length === 0) {
      hydrationShuffle = shuffle(HYDRATION_TRACKS); // reshuffle after a full cycle
    }
    console.log("🎵 Attempting to play MP3 track:", src);
    await playHydrationTrack(src);
    
  } catch (err) {
    // Fallback to synthesized beeps if file fails
    console.error("❌ MP3 playback failed:", err);
    console.log("🔄 Falling back to synthesized audio...");
    statusLine.textContent = "MP3 failed, using synthesized audio...";
    await playHydrationSynth();
  } finally {
    hydrationPlaying = false;
    console.log("✅ Hydration reminder completed");
    
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
  console.log("🎵 playHydrationTrack called with:", src);
  
  if (!audioCtx) {
    console.log("🔧 Audio context not initialized, creating...");
    initAudioGraph();
  }
  
  // Stop previous element if any
  stopHydrationElement();

  try {
    console.log("🔧 Creating new Audio element...");
    const el = new Audio();
    
    // Add error event listener
    el.addEventListener('error', (e) => {
      console.error("❌ Audio element error:", e);
      console.error("❌ Error details:", el.error);
    });
    
    // Add load event listener
    el.addEventListener('loadstart', () => console.log("📥 Audio loading started"));
    el.addEventListener('canplay', () => console.log("✅ Audio can play"));
    el.addEventListener('canplaythrough', () => console.log("✅ Audio can play through"));
    
    el.src = src;
    el.crossOrigin = "anonymous";
    el.loop = true;
    el.preload = "auto";
    
    console.log("🔧 Audio element created, attempting to play...");
    
    // Try to play the audio
    const playPromise = el.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log("✅ Audio playback started successfully");
    }

    attachHydrationElement(el);

    const fadeInSec = 0.5;
    const fadeOutSec = 0.8;

    // Fade in
    const now = audioCtx.currentTime;
    hydrationGain.gain.cancelScheduledValues(now);
    hydrationGain.gain.setValueAtTime(0.0, now);
    hydrationGain.gain.linearRampToValueAtTime(0.9, now + fadeInSec);
    console.log("🔊 Fade in applied");

    // Play for PLAY_DURATION_MS, then fade out and stop
    console.log(`⏱️ Playing for ${PLAY_DURATION_MS}ms...`);
    await waitMs(PLAY_DURATION_MS - fadeOutSec * 1000);

    const t = audioCtx.currentTime;
    hydrationGain.gain.cancelScheduledValues(t);
    hydrationGain.gain.setValueAtTime(hydrationGain.gain.value, t);
    hydrationGain.gain.linearRampToValueAtTime(0.0, t + fadeOutSec);
    console.log("🔊 Fade out applied");

    await waitMs(fadeOutSec * 1000 + 50);
    stopHydrationElement();
    console.log("✅ MP3 playback completed successfully");
    
  } catch (error) {
    console.error("❌ Failed to play MP3 track:", error);
    console.error("❌ Error details:", error.message);
    throw error; // Re-throw to trigger fallback
  }
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
  console.log("🎵 Starting synthesized hydration audio...");
  if (!audioCtx) initAudioGraph();
  
  const base = audioCtx.createOscillator();
  base.type = "sawtooth";
  const gain = audioCtx.createGain();
  gain.gain.value = 0;
  base.connect(gain).connect(hydrationGain);

  const now = audioCtx.currentTime;
  base.frequency.setValueAtTime(440, now);
  base.start();
  console.log("🔊 Oscillator started at 440Hz");

  // Enhanced pattern: more noticeable beeps
  const pulses = Math.floor(PLAY_DURATION_MS / 200); // Slower, more noticeable
  console.log(`🎵 Playing ${pulses} audio pulses...`);
  
  for (let i = 0; i < pulses; i++) {
    const t0 = audioCtx.currentTime;
    const f = 440 + (i % 2 === 0 ? 200 : -150); // More frequency variation
    base.frequency.setValueAtTime(f, t0);
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.9, t0 + 0.08); // Longer beep
    gain.gain.linearRampToValueAtTime(0.0, t0 + 0.18);
    await waitMs(200); // Slower tempo
  }

  console.log("✅ Synthesized audio completed");
  base.stop();
}

/* Sirens and Breaks */
async function playSiren(label, duration) {
  if (sirenPlaying) return;
  
  sirenPlaying = true;
  statusLine.textContent = `${label} playing for 30s…`;
  console.log("🚨 Starting siren:", label);

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

  try {
    // Try to play the siren MP3 file
    console.log("🎵 Attempting to play siren MP3:", SIREN_AUDIO_FILE);
    await playSirenMP3();
  } catch (error) {
    // Fallback to synthesized siren if MP3 fails
    console.error("❌ Siren MP3 failed, using synthesized fallback:", error);
    statusLine.textContent = `${label} (synthesized) playing for 30s…`;
    await playSynthSiren(label);
  }

  sirenPlaying = false;
  
  // Update status based on break type
  if (duration === LUNCH_DURATION_MS) {
    statusLine.textContent = "Lunch break started. Timer paused for 1 hour.";
  } else {
    statusLine.textContent = "Break started. Timer paused for 20 minutes.";
  }
  
  updateBreakInfo();
}

async function playSirenMP3() {
  console.log("🚨 playSirenMP3 called");
  
  if (!audioCtx) {
    console.log("🔧 Audio context not initialized, creating...");
    initAudioGraph();
  }
  
  // Stop any previous siren audio
  try {
    if (sirenGain) {
      sirenGain.gain.cancelScheduledValues(audioCtx.currentTime);
      sirenGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
  } catch (_) {}

  try {
    console.log("🔧 Creating siren Audio element...");
    const el = new Audio();
    
    // Add error event listener
    el.addEventListener('error', (e) => {
      console.error("❌ Siren audio element error:", e);
      console.error("❌ Error details:", el.error);
    });
    
    // Add load event listener
    el.addEventListener('loadstart', () => console.log("📥 Siren audio loading started"));
    el.addEventListener('canplay', () => console.log("✅ Siren audio can play"));
    el.addEventListener('canplaythrough', () => console.log("✅ Siren audio can play through"));
    
    el.src = SIREN_AUDIO_FILE;
    el.crossOrigin = "anonymous";
    el.loop = false; // Don't loop siren
    el.preload = "auto";
    
    console.log("🔧 Siren audio element created, attempting to play...");
    
    // Try to play the audio
    const playPromise = el.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log("✅ Siren audio playback started successfully");
    }

    // Connect to siren gain node
    const sirenSource = audioCtx.createMediaElementSource(el);
    sirenSource.connect(sirenGain);

    const fadeInSec = 0.2;
    const fadeOutSec = 0.5;

    // Fade in
    const now = audioCtx.currentTime;
    sirenGain.gain.cancelScheduledValues(now);
    sirenGain.gain.setValueAtTime(0.0, now);
    sirenGain.gain.linearRampToValueAtTime(0.9, now + fadeInSec);
    console.log("🔊 Siren fade in applied");

    // Play for SIREN_PLAY_DURATION_MS, then fade out and stop
    console.log(`⏱️ Playing siren for ${SIREN_PLAY_DURATION_MS}ms...`);
    await waitMs(SIREN_PLAY_DURATION_MS - fadeOutSec * 1000);

    const t = audioCtx.currentTime;
    sirenGain.gain.cancelScheduledValues(t);
    sirenGain.gain.setValueAtTime(sirenGain.gain.value, t);
    sirenGain.gain.linearRampToValueAtTime(0.0, t + fadeOutSec);
    console.log("🔊 Siren fade out applied");

    await waitMs(fadeOutSec * 1000 + 50);
    
    // Clean up
    el.pause();
    el.src = "";
    sirenSource.disconnect();
    console.log("✅ Siren MP3 playback completed successfully");
    
  } catch (error) {
    console.error("❌ Failed to play siren MP3:", error);
    console.error("❌ Error details:", error.message);
    throw error; // Re-throw to trigger fallback
  }
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
  console.log("🔔 Scheduling sirens...");
  
  // Clear existing
  for (const h of scheduledSirens) clearTimeout(h);
  scheduledSirens = [];

  const upcoming = [];
  const now = new Date();
  console.log("🕐 Current time:", formatClock(now));
  
  for (const s of SIREN_SCHEDULE) {
    const next = nextOccurrence(now, s.h, s.m);
    const msUntil = next.getTime() - now.getTime();
    
    console.log(`🔔 Scheduling ${s.label} for ${formatClock12(next)} (in ${Math.round(msUntil/1000/60)} minutes)`);
    
    const handle = setTimeout(async () => {
      console.log(`🚨 SIREN TRIGGERED: ${s.label} at ${formatClock(new Date())}`);
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
  console.log(`✅ Scheduled ${scheduledSirens.length} sirens`);
}

function nextOccurrence(base, hour, minute) {
  const d = new Date(base);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  
  console.log(`🔍 nextOccurrence: base=${formatClock(base)}, hour=${hour}, minute=${minute}, initial=${formatClock(d)}`);
  
  // If the time has already passed today, schedule for tomorrow
  if (d.getTime() <= base.getTime()) {
    d.setDate(d.getDate() + 1);
    console.log(`⏰ Time passed today, scheduling for tomorrow: ${formatClock(d)}`);
  }
  
  // Special handling for 12:XX times to ensure AM/PM is correct
  if (hour === 12) {
    // Force AM for 12:XX times
    d.setHours(0, minute, 0, 0); // 0 = 12 AM
    if (d.getTime() <= base.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    console.log(`🌅 12:XX time converted to AM: ${formatClock(d)}`);
  }
  
  console.log(`✅ Final scheduled time: ${formatClock(d)}`);
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

testAudioButton.addEventListener("click", async () => {
  console.log("🧪 Manual audio test requested...");
  statusLine.textContent = "Testing audio...";
  try {
    const result = await testAudio();
    if (result) {
      statusLine.textContent = "Audio test successful! You should have heard a beep.";
    } else {
      statusLine.textContent = "Audio test failed. Check console for details.";
    }
  } catch (error) {
    console.error("❌ Manual audio test failed:", error);
    statusLine.textContent = "Audio test failed. Check console for details.";
  }
});

testSirenButton.addEventListener("click", async () => {
  console.log("🧪 Manual siren test requested...");
  statusLine.textContent = "Testing siren...";
  try {
    // Show current siren status
    console.log("🔍 Current siren status:");
    const now = new Date();
    console.log("🕐 Current time:", formatClock(now));
    console.log("🔔 Next scheduled sirens:");
    for (const s of SIREN_SCHEDULE) {
      const next = nextOccurrence(now, s.h, s.m);
      const msUntil = next.getTime() - now.getTime();
      console.log(`  - ${s.label}: ${formatClock12(next)} (in ${Math.round(msUntil/1000/60)} minutes)`);
    }
    
    await playSiren("Break Siren", BREAK_DURATION_MS);
    statusLine.textContent = "Siren test successful! You should have heard a break siren.";
  } catch (error) {
    console.error("❌ Manual siren test failed:", error);
    statusLine.textContent = "Siren test failed. Check console for details.";
  }
});

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

// Schedule sirens immediately when page loads
console.log("🌐 Page loaded, scheduling sirens immediately...");
scheduleSirens();

// Test audio on page load to check if it works at all
window.addEventListener("load", async () => {
  console.log("🌐 Page loaded, testing audio capabilities...");
  try {
    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to initialize audio context
    initAudioGraph();
    console.log("✅ Audio context initialized on page load");
    
    // Test if we can create audio nodes
    if (audioCtx && audioCtx.state === "running") {
      console.log("🔊 Audio context is running, audio should work");
    } else {
      console.log("⚠️ Audio context not running, may need user interaction");
    }
    
  } catch (error) {
    console.error("❌ Failed to initialize audio on page load:", error);
  }
}); 