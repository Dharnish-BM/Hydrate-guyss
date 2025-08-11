# 🚰 HYDRATE GUYSS

> **Stay Hydrated, Stay Healthy** - A beautiful dark-themed web app that reminds you to hydrate every 20 minutes with custom music and smart break management.

![HYDRATE GUYSS](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Audio](https://img.shields.io/badge/Audio-MP3%20%2B%20Custom%20Sirens-blue)
![Timer](https://img.shields.io/badge/Timer-20%20Minutes-orange)

## ✨ Features

### 🎯 **Core Functionality**
- **20-minute hydration cycles** with automatic restart
- **Custom MP3 music rotation** for hydration reminders
- **Real-time clock** display (HH:MM:SS AM/PM)
- **Cycle counter** showing current hydration round
- **Smooth animations** and modern dark neon UI

### 🚨 **Smart Break System**
- **10:25 AM** → Break Siren (20-minute pause)
- **12:25 PM** → Lunch Siren (1-hour pause)
- **3:05 PM** → Break Siren (20-minute pause)
- **Automatic timer pause/resume** during breaks
- **Custom siren audio** for all break notifications

### 🎵 **Audio Features**
- **Hydration reminders**: Rotating MP3 playlist
- **Break sirens**: Custom siren.mp3 file
- **Automatic fallback** to synthesized audio if files fail
- **30-second playback** for all audio reminders
- **Works in background** (subject to browser policies)

## 🚀 Quick Start

### **Prerequisites**
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Python 3.x or Node.js (for local server)
- MP3 audio files (see Audio Setup below)

### **1. Clone/Download**
```bash
git clone https://github.com/yourusername/Hydrate-guyss.git
cd Hydrate-guyss
```

### **2. Add Audio Files**
Place your audio files in the `assets/audio/` folder:

```
assets/audio/
├── siren.mp3          ← Custom siren sound for breaks
├── hydration1.mp3     ← Hydration reminder 1
├── hydration2.mp3     ← Hydration reminder 2
├── hydration3.mp3     ← Hydration reminder 3
├── hydration4.mp3     ← Hydration reminder 4
└── hydration5.mp3     ← Hydration reminder 5
```

**Note**: You can add more or fewer hydration MP3s by updating the `HYDRATION_TRACKS` array in `script.js`.

### **3. Start Local Server**
**Option A: Python (Recommended)**
```bash
python -m http.server 5500
```

**Option B: Node.js**
```bash
npx http-server -p 5500 --no-dotfiles
```

### **4. Open the App**
Navigate to: `http://localhost:5500/`

**Important**: Always use the local server to avoid CORS issues with audio files.

## 🎮 How to Use

### **Starting the App**
1. **Open** `http://localhost:5500/` in your browser
2. **Click "Start Timer"** to begin the hydration cycle
3. **Grant audio permissions** when prompted
4. **Timer starts** with 20-minute countdown

### **During Operation**
- **Countdown displays** remaining time in large digits
- **Cycle counter** shows current hydration round
- **Real-time clock** always visible at the top
- **Status line** shows current app state

### **When Timer Hits Zero**
1. **Hydration music plays** for 30 seconds
2. **Next cycle automatically starts** (20 minutes)
3. **Cycle counter increases**
4. **Process repeats indefinitely**

### **Break Times**
- **Sirens trigger automatically** at scheduled times
- **Timer pauses** during breaks
- **Break countdown** shows remaining break time
- **Timer resumes automatically** after breaks end

### **Controls**
- **Start Timer**: Begin/resume hydration cycles
- **Stop**: Pause timer (preserves remaining time)
- **Reset**: Complete reset to cycle 1
- **Test Audio**: Verify audio system works
- **Test Siren**: Test siren functionality

## ⚙️ Configuration

### **Timer Settings**
Edit these constants in `script.js`:

```javascript
const HYDRATION_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const PLAY_DURATION_MS = 30 * 1000;           // 30 seconds
const BREAK_DURATION_MS = 20 * 60 * 1000;     // 20 minutes
const LUNCH_DURATION_MS = 60 * 60 * 1000;     // 1 hour
```

### **Break Schedule**
Modify the `SIREN_SCHEDULE` array in `script.js`:

```javascript
const SIREN_SCHEDULE = [
  { h: 10, m: 25, label: "Break Siren", duration: BREAK_DURATION_MS },
  { h: 12, m: 25, label: "Lunch Siren", duration: LUNCH_DURATION_MS },
  { h: 15, m: 5,  label: "Break Siren", duration: BREAK_DURATION_MS },
];
```

### **Audio Files**
Update file paths in `script.js`:

```javascript
const HYDRATION_TRACKS = [
  "assets/audio/hydration1.mp3",
  "assets/audio/hydration2.mp3",
  // Add more files as needed
];

const SIREN_AUDIO_FILE = "assets/audio/siren.mp3";
```

## 🔧 Troubleshooting

### **Audio Not Playing**
1. **Check browser console** (F12) for error messages
2. **Verify audio files exist** in correct folders
3. **Ensure local server is running** (not opening file directly)
4. **Grant audio permissions** when prompted
5. **Use "Test Audio" button** to verify functionality

### **Sirens Not Triggering**
1. **Refresh the page** to reschedule sirens
2. **Check console logs** for scheduling information
3. **Verify break times** are set correctly
4. **Ensure siren.mp3 file exists**

### **Timer Issues**
1. **Click "Reset"** to start fresh
2. **Check if in break time** (timer pauses during breaks)
3. **Verify browser tab is active** (some browsers throttle background tabs)

### **Common Console Errors**
- **CORS errors**: Use local server, not file:// protocol
- **Audio context errors**: Click "Start Timer" to unlock audio
- **File not found**: Check audio file paths and names

## 🎨 Customization

### **UI Themes**
Modify CSS variables in `styles.css`:

```css
:root {
  --bg-0: #070a12;        /* Dark background */
  --primary: #7b5cff;     /* Neon purple */
  --accent: #00e5ff;      /* Neon cyan */
  --pink: #ff3ea5;        /* Neon pink */
}
```

### **Animations**
Adjust animation timings in `styles.css`:

```css
@keyframes titleGlow {
  0% { /* Start state */ }
  100% { /* End state */ }
}
```

### **Audio Behavior**
Modify audio settings in `script.js`:

```javascript
const fadeInSec = 0.5;    // Fade in duration
const fadeOutSec = 0.8;   // Fade out duration
```

## 📱 Browser Compatibility

### **Fully Supported**
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13.1+

### **Features**
- ✅ Web Audio API
- ✅ ES6+ JavaScript
- ✅ CSS Grid & Flexbox
- ✅ CSS Custom Properties

### **Limitations**
- ⚠️ Audio requires user interaction (browser policy)
- ⚠️ Background throttling may affect accuracy
- ⚠️ Some mobile browsers may have audio restrictions

## 🚀 Deployment

### **Local Development**
```bash
# Start development server
python -m http.server 5500

# Access at http://localhost:5500/
```

### **Production Deployment**
1. **Upload files** to your web server
2. **Ensure audio files** are accessible
3. **Configure server** to serve audio files correctly
4. **Test functionality** in production environment

### **Docker (Optional)**
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature-name`
3. **Commit changes**: `git commit -m 'Add feature'`
4. **Push to branch**: `git push origin feature-name`
5. **Submit pull request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Web Audio API** for advanced audio functionality
- **Google Fonts** for beautiful typography
- **CSS Grid & Flexbox** for responsive layouts
- **Modern browsers** for supporting cutting-edge features

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/Hydrate-guyss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/Hydrate-guyss/discussions)
- **Wiki**: [Project Wiki](https://github.com/yourusername/Hydrate-guyss/wiki)

---

**Made with ❤️ for healthy hydration habits**

*Remember: Proper hydration is essential for health, productivity, and well-being!*