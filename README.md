#Does Not Work.
# 🌍 Atlas: Echoes of Earth

> The world's first living emotional map — a geography game shaped not by data, but by human impressions.

Atlas transforms the traditional Atlas word game into an AI-driven experience where cities develop emotional personalities based on collective player choices.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)
![Gemini](https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?logo=google)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)
![Google Maps](https://img.shields.io/badge/Google_Maps-JS_API-34A853?logo=google-maps)

---

## ✨ How It Works

1. **Enter a city** — following Atlas rules (next city starts with the last letter of the previous)
2. **Experience a moment** — AI generates a short, culturally grounded human scene
3. **Make a choice** — your decision shapes the city's emotional profile
4. **Leave an echo** — future players experience a subtly different version

Cities develop collective personalities over time: a warm Tokyo, a lonely Paris, a tense Cairo.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express |
| **AI** | Google Gemini 2.0 Flash |
| **Database** | Firebase Firestore |
| **Maps** | Google Maps JavaScript API |
| **Frontend** | Vanilla HTML/CSS/JS |
| **Security** | Helmet, Rate Limiting, CORS |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- Google Cloud account (for API keys)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/atlas-echoes-of-earth.git
cd atlas-echoes-of-earth
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your keys:

| Variable | Where to Get It |
|----------|----------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GOOGLE_MAPS_API_KEY` | [Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Firebase Console → Project Settings → Service Accounts → Generate New Private Key |

> **Note:** Download the Firebase service account JSON and place it in the project root as `firebase-service-account.json`.

### 3. Enable Google Cloud APIs
In your Google Cloud Console, enable:
- **Maps JavaScript API**
- **Generative Language API** (Gemini)

### 4. Run
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Run Tests
```bash
npm test
```

---

## 📁 Project Structure

```
atlas-echoes-of-earth/
├── server.js                  # Express entry point
├── src/
│   ├── config/
│   │   ├── firebase.js        # Firestore connection
│   │   └── gemini.js          # Gemini AI client
│   ├── data/
│   │   └── cities.js          # 5000+ cities dataset
│   ├── routes/
│   │   └── api.js             # REST API endpoints
│   └── services/
│       ├── cityValidator.js   # Atlas rule engine
│       ├── emotionEngine.js   # Emotion merging & Firestore
│       └── scenarioGenerator.js # AI scenario generation
├── public/
│   ├── index.html             # Main page
│   ├── css/styles.css         # Design system
│   └── js/
│       ├── app.js             # Game logic
│       └── map.js             # Google Maps integration
├── tests/                     # Jest test suite
├── .env.example               # Environment template
└── package.json
```

---

## 🎮 Gameplay

- **Atlas Rule:** Each city must begin with the last letter of the previous city
- **Sessions:** 20-40 seconds per city interaction
- **Non-competitive:** No points, no winners — progress is understanding
- **Shared World:** Every player contributes to the same emotional map

### Emotional Dimensions

| Emotion | Color | Meaning |
|---------|-------|---------|
| ☀️ Warmth | Amber | Welcoming, comfort |
| 🌙 Loneliness | Blue | Isolation, solitude |
| ⚡ Tension | Red | Stress, urgency |
| 🌸 Nostalgia | Violet | Memory, past |
| 🏡 Belonging | Green | Connection, home |

---

## 🔒 Security

- All API keys stored in `.env` (never committed)
- Helmet.js for HTTP security headers
- Rate limiting (100 req/min per IP)
- Input sanitization on all user inputs
- Gemini safety filters enabled
- CORS configured for production

---

## 🧪 Testing

```bash
# Run all tests with coverage
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Atlas rule validation (last-letter matching, valid cities, no repeats)
- Emotion vector merging mathematics
- API endpoint responses and error handling
- Static file serving

---

## ♿ Accessibility

- Semantic HTML5 structure
- ARIA labels on all interactive elements
- Keyboard navigation support
- `prefers-reduced-motion` respected
- `prefers-contrast: high` support
- Screen reader friendly live regions

---

## 📜 License

[MIT](LICENSE)
