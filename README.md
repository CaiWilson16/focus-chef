# FocusChef 

> Cook your goals, one task at a time.

FocusChef is a gamified, mobile-first productivity web application that reframes task management as a restaurant kitchen experience. Users "cook" their assignments as plates in a Silent Oven that deliberately hides time — rewarding focus over clock-watching — and progress through seven chef ranks while unlocking 27 hand-drawn recipe badges.

Built as the final project for **CSCI 411/412: Senior Seminar** under Dr. Qi Li, Spring 2026.

## Live Demo

**Try it now:** [https://focus-chef-one.vercel.app](https://focus-chef-one.vercel.app)

The app is a Progressive Web App (PWA) — install it to your iPhone or Android home screen via "Add to Home Screen" for a full-screen, native-like experience.

## Core Features

- **Google Sign-In** — secure authentication via Firebase Auth
- **Prep Station** — add tasks ("plates") with custom time goals
- **Silent Oven** — distraction-free focus timer with no visible clock
- **XP & Ranks** — earn XP for on-time completion; progress from Kitchen Newbie to Master Chef (7 tiers)
- **Recipe Vault** — unlock 27 hand-drawn food badges as you level up
- **Pilot Light Streak** — daily streak tracking with a custom gas-flame SVG indicator
- **Food for Thought** — daily reflection journal with 60 rotating prompts
- **Mobile-first PWA** — installable on iOS and Android home screens

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** CSS-in-JS (single-file component styling)
- **Backend:** Firebase Authentication (Google OAuth) + Cloud Firestore
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Assets:** Hand-drawn PNG artwork (chef mascot + 27 food badges)

## 📁 Project Structure

```
focus-chef/
├── public/
│   ├── logo.png              # Chef hat mascot
│   ├── manifest.json         # PWA manifest
│   └── badges/               # 27 hand-drawn recipe badge PNGs
├── src/
│   ├── App.tsx               # Root component with all UI
│   ├── main.tsx              # React entry point
│   ├── firebase.ts           # Firebase initialization
│   ├── xp.ts                 # XP, ranks, and cooking logic
│   ├── streak.ts             # Daily streak logic
│   └── foodForThought.ts     # Daily questions & journaling
├── index.html
├── package.json
└── vite.config.ts
```

## Running Locally

### Prerequisites
- Node.js 18+ and npm
- A Firebase project with Authentication (Google provider) and Firestore enabled

### Setup

1. Clone the repository:
```
   git clone https://github.com/CaiWilson16/focus-chef.git
   cd focus-chef
```

2. Install dependencies:
```
   npm install
```

3. Configure Firebase (if using your own project): Update `src/firebase.ts` with your Firebase project's configuration.

4. Run the development server:
```
   npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```
npm run build
```

The built site is output to `/dist` and can be deployed to any static host (Vercel, Netlify, Firebase Hosting, etc.).

## Using the App

1. **Sign in** with a Google account
2. **Clock in** on the welcome screen to start your day
3. **Add a plate** to your Prep Station (task name + goal time in minutes)
4. Tap **"Cook It"** to enter the Silent Oven and focus
5. When finished, tap **"Plate It Up"** — earn XP based on whether you were early, on time, or burnt
6. View your rank, streak, and Recipe Vault in the profile screen
7. **Clock out** at day's end to write a short reflection in Food for Thought

## Acknowledgments

### AI Tool Usage

This project was developed with the assistance of AI tools (Claude by Anthropic) used as a pair-programming assistant. AI assistance was used for:

- **Code generation and debugging:** Generating boilerplate React/TypeScript components, CSS animations, and SVG illustrations; helping interpret Vite build errors and TypeScript type errors.
-  Assisting with the structure and phrasing of this README and the final report.

All architectural decisions, feature scoping, design direction, hand-drawn artwork, final code review, testing, and deployment were my own. 

### Third-Party Services and Libraries

- **React** (MIT) — UI framework
- **TypeScript** (Apache 2.0) — type-safe JavaScript
- **Vite** (MIT) — build tool and dev server
- **Firebase** by Google — Authentication and Firestore
- **Vercel** — hosting and continuous deployment
- **Google Fonts** — "Playfair Display" and "Nunito" typefaces
- **Weavy**- AI PNG Generations

### Original Assets

The chef hat mascot logo (`/public/logo.png`) are original hand-drawn artwork created for this project.

## Author

**Cai Wilson**  
CSCI 411/412: Senior Seminar — Spring 2026  
GitHub: [@CaiWilson16](https://github.com/CaiWilson16)
