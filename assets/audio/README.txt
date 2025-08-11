Place your MP3 files in this folder and update HYDRATION_TRACKS in ../script.js if needed.

Required files:
- siren.mp3 (for break/lunch sirens)
- hydration1.mp3 through hydration5.mp3 (for hydration reminders)

Notes:
- Audio will only start after you click "Start Timer" due to browser autoplay policies.
- Sirens now use siren.mp3 instead of synthesized audio.
- If siren.mp3 fails to load, it falls back to synthesized sirens.
- Make sure to serve via local server (http://localhost:5500) to avoid CORS issues. 