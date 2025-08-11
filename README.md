# HYDRATE GUYSS

A visually stunning dark-themed web app that reminds you to hydrate every 20 minutes, plays rotating music snippets, shows a real-time clock, and triggers special sirens at fixed times.

## Features
- 20-minute repeating countdown timer
- 30-second hydration music playback per cycle (rotating across multiple tracks)
- Real-time clock (HH:MM:SS)
- Special sirens auto-play at:
  - 10:25 AM → Break siren
  - 12:25 PM → Lunch siren
  - 3:05 PM → Break siren
- Works while tab is minimized (subject to browser policies; uses Web Audio API)
- Dark neon UI with smooth animations

## Quick Start
1. Clone or download this repository.
2. Add a few MP3 files into `assets/audio/`:
   - `hydration1.mp3`, `hydration2.mp3`, `hydration3.mp3` (or rename and update `script.js`)
3. Open `index.html` in a modern browser.
4. Click "Start Timer" to grant audio permission and begin the cycle.

Tip: For best results and to avoid cross-origin issues, serve locally with a simple static server.

### Serve locally
- Python 3: `python -m http.server 5500`
- Node: `npx http-server -p 5500 --no-dotfiles`
Then open `http://localhost:5500/`.

## Customization
- Change interval: update `HYDRATION_INTERVAL_MS` in `script.js`.
- Change play durations: edit `PLAY_DURATION_MS` and `SIREN_PLAY_DURATION_MS`.
- Update hydration tracks: change `HYDRATION_TRACKS` in `script.js`.
- Modify siren times or labels: edit `SIREN_SCHEDULE` in `script.js`.

## Spotify (optional)
This project ships with local MP3 rotation by default. If you prefer Spotify, you can implement OAuth and fetch random tracks from a playlist, then feed their preview URLs to the same playback logic. Preview streams are short and may not always be available.

## Browser Notes
- Most browsers require a user gesture to start audio; press the Start button once per session.
- Background throttling: the app uses timers resilient enough for minimized tabs, but exact second-level accuracy may vary when fully backgrounded.

## License
MIT