import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, provider, db } from './firebase';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, updateDoc
} from 'firebase/firestore';
import {
  getCookResult, calculateXP, getCookMessage,
  awardXP, getUserXP, getRank, CHEF_RANKS
} from './xp';
import {
  getDailyQuestion, getTodayEntry, saveTodayEntry
} from './foodForThought';
import { getStreak, updateStreak, StreakData } from './streak';

interface Plate {
  id: string;
  text: string;
  goalMinutes: number;
  completed: boolean;
}

interface TicketResult {
  result: 'early' | 'ontime' | 'late';
  xp: number;
  message: string;
  taskText: string;
  leveledUp: boolean;
  newTitle: string;
}

type Screen = 'main' | 'oven' | 'profile' | 'foodForThought';

interface RecipeBadge {
  name: string;
  xp: number;
  file: string;
  tier: number;
}

const RECIPE_BADGES: RecipeBadge[] = [
  { name: 'Toast',         xp: 0,    file: 'Toast.png',         tier: 1 },
  { name: 'Boiled Egg',    xp: 50,   file: 'Boiled.png',        tier: 1 },
  { name: 'Cereal',        xp: 100,  file: 'Cereal.png',        tier: 1 },
  { name: 'Hotdog',        xp: 200,  file: 'Hotdog.png',        tier: 1 },
  { name: 'Salad',         xp: 400,  file: 'Salad.png',         tier: 2 },
  { name: 'Sandwich',      xp: 500,  file: 'Sandwich.png',      tier: 2 },
  { name: 'Scrambled Eggs',xp: 600,  file: 'ScrambledEggs.png', tier: 2 },
  { name: 'Mashed Potato', xp: 700,  file: 'Mashpotatoes.png',  tier: 2 },
  { name: 'Hamburger',     xp: 800,  file: 'Hamburger.png',     tier: 3 },
  { name: 'Taco',          xp: 1000, file: 'Taco.png',          tier: 3 },
  { name: 'Spaghetti',     xp: 1300, file: 'Spaghetti.png',     tier: 3 },
  { name: 'Loaded Fries',  xp: 1600, file: 'LoadedFries.png',   tier: 3 },
  { name: 'Pizza',         xp: 1800, file: 'Pizza.png',         tier: 4 },
  { name: 'Ramen',         xp: 2200, file: 'Ramen.png',         tier: 4 },
  { name: 'Steak',         xp: 2700, file: 'Steak.png',         tier: 4 },
  { name: 'Chicken',       xp: 3100, file: 'Chicken.png',       tier: 4 },
  { name: 'Lobster',       xp: 3500, file: 'Lobster.png',       tier: 5 },
  { name: 'Sushi',         xp: 4200, file: 'Sushi.png',         tier: 5 },
  { name: 'Turkey',        xp: 5000, file: 'Turkey.png',        tier: 5 },
  { name: 'Red Snapper',   xp: 5800, file: 'RedSnapper.png',    tier: 5 },
  { name: 'Beef Wellington', xp: 6500, file: 'BeefWellington.png', tier: 6 },
  { name: 'Scallops',      xp: 7500, file: 'Scallops.png',      tier: 6 },
  { name: 'Truffle Risotto', xp: 8500, file: 'TruffleRisotto.png', tier: 6 },
  { name: 'Crab Bisque',   xp: 9200, file: 'CrabBisque.png',    tier: 6 },
  { name: 'Caviar',        xp: 10000, file: 'Caviar.png',       tier: 7 },
  { name: 'Wagyu A5',      xp: 11000, file: 'Waygu A5.png',     tier: 7 },
  { name: 'Soufflé',       xp: 12500, file: 'Soufle.png',       tier: 7 },
];

const getNextRank = (xp: number) => CHEF_RANKS.find(r => xp < r.minXP);

const Logo: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <img
    src="/logo.png"
    alt="FocusChef"
    style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', display: 'block' }}
  />
);

const PilotFlame: React.FC<{ size?: number; lit?: boolean; showBurner?: boolean }> = ({
  size = 60,
  lit = true,
  showBurner = true,
}) => (
  <svg width={size} height={size * 1.15} viewBox="0 0 80 92" style={{ display: 'block' }}>
    <defs>
      <linearGradient id="gasFlameOuter" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#7DD3FC" />
        <stop offset="50%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="gasFlameInner" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#BAE6FD" />
        <stop offset="100%" stopColor="#7DD3FC" />
      </linearGradient>
    </defs>
    {lit ? (
      <g style={{ transformOrigin: '40px 76px', animation: 'flameBreathe 1.2s ease-in-out infinite' }}>
        <path
          d="M 40 78 Q 22 72 22 50 Q 22 30 40 10 Q 58 30 58 50 Q 58 72 40 78 Z"
          fill="url(#gasFlameOuter)"
          stroke="#1E3A8A"
          strokeWidth="2"
        />
        <path
          d="M 40 72 Q 30 68 30 52 Q 30 38 40 22 Q 50 38 50 52 Q 50 68 40 72 Z"
          fill="url(#gasFlameInner)"
          opacity="0.95"
        />
        <ellipse cx="40" cy="55" rx="4" ry="9" fill="#FFFFFF" opacity="0.9" />
      </g>
    ) : (
      <g opacity="0.4">
        <rect x="37" y="60" width="6" height="20" fill="#6B4020" stroke="#3D1800" strokeWidth="1.5" />
        <path d="M 40 58 Q 36 48 40 38 Q 44 28 40 18" stroke="#999" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>
    )}
    {showBurner && (
      <g>
        <rect x="4" y="80" width="72" height="10" rx="4" fill="#6B7280" stroke="#374151" strokeWidth="1.5" />
        <rect x="6" y="82" width="68" height="6" rx="3" fill="#9CA3AF" />
        <circle cx="18" cy="85" r="1.8" fill="#1F2937" />
        <circle cx="32" cy="85" r="1.8" fill="#1F2937" />
        <circle cx="48" cy="85" r="1.8" fill="#1F2937" />
        <circle cx="62" cy="85" r="1.8" fill="#1F2937" />
      </g>
    )}
  </svg>
);

const CoffeeCupArt: React.FC = () => (
  <svg width="160" height="140" viewBox="0 0 160 140">
    <defs>
      <linearGradient id="cupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFDF4" />
        <stop offset="100%" stopColor="#E8D5B0" />
      </linearGradient>
      <linearGradient id="saucerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#E8D5B0" />
        <stop offset="100%" stopColor="#A07840" />
      </linearGradient>
    </defs>
    <ellipse cx="80" cy="118" rx="56" ry="10" fill="url(#saucerGrad)" stroke="#5C2800" strokeWidth="2.5" />
    <ellipse cx="80" cy="116" rx="50" ry="6" fill="#A07840" stroke="#5C2800" strokeWidth="2" />
    <path d="M 62 30 Q 58 18 64 10 Q 68 20 62 28" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" style={{ animation: 'steamDrift 3s ease-in-out infinite' }} />
    <path d="M 80 24 Q 76 12 82 4 Q 86 14 80 22" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" style={{ animation: 'steamDrift 3s ease-in-out infinite 0.5s' }} />
    <path d="M 98 30 Q 94 18 100 10 Q 104 20 98 28" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" style={{ animation: 'steamDrift 3s ease-in-out infinite 1s' }} />
    <path d="M 122 60 Q 142 62 142 82 Q 142 102 122 104" fill="none" stroke="#5C2800" strokeWidth="3" />
    <path d="M 122 66 Q 136 68 136 82 Q 136 98 122 100" fill="none" stroke="#5C2800" strokeWidth="2" />
    <path d="M 36 48 L 38 100 Q 40 112 52 112 L 108 112 Q 120 112 122 100 L 124 48 Z" fill="url(#cupGrad)" stroke="#5C2800" strokeWidth="3" />
    <ellipse cx="80" cy="48" rx="44" ry="8" fill="#3D1800" stroke="#5C2800" strokeWidth="2.5" />
    <ellipse cx="80" cy="48" rx="42" ry="6" fill="#6B3410" />
    <ellipse cx="80" cy="48" rx="38" ry="5" fill="#4A2810" />
    <path d="M 58 48 Q 70 42 82 48 Q 94 54 102 48" fill="none" stroke="#E8D5B0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    <path d="M 44 60 Q 44 80 48 100" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
    <path d="M 80 44 Q 76 40 74 44 Q 72 48 80 52 Q 88 48 86 44 Q 84 40 80 44 Z" fill="#D4A078" opacity="0.9" />
  </svg>
);

const ServiceBell: React.FC = () => (
  <svg width="52" height="48" viewBox="0 0 52 48">
    <defs>
      <linearGradient id="bellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD166" />
        <stop offset="50%" stopColor="#E8941A" />
        <stop offset="100%" stopColor="#A05828" />
      </linearGradient>
    </defs>
    <rect x="6" y="38" width="40" height="6" rx="2" fill="#5C2800" stroke="#3D1800" strokeWidth="1.5" />
    <rect x="8" y="36" width="36" height="4" rx="1" fill="#7A4020" />
    <path d="M 12 36 L 14 16 Q 14 8 26 8 Q 38 8 38 16 L 40 36 Z" fill="url(#bellGrad)" stroke="#5C2800" strokeWidth="2" />
    <path d="M 18 14 Q 20 18 19 24" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
    <circle cx="26" cy="7" r="3" fill="#5C2800" stroke="#3D1800" strokeWidth="1" />
  </svg>
);

const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Nunito:wght@400;600;700;800&display=swap');

    html, body, #root { margin:0; padding:0; min-height:100vh; min-height:100dvh; background:#1a0800; overflow-x:hidden; }
    body { -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent; }

    .fc-app * { box-sizing: border-box; }
    .fc-app { font-family:'Nunito',sans-serif; background:#C8834A; min-height:100vh; min-height:100dvh; width:100%; position:relative; }

    @keyframes flicker { 0%{transform:scaleY(1)} 100%{transform:scaleY(0.82) scaleX(1.1)} }
    @keyframes steamup { 0%{opacity:0;transform:translateY(0)} 40%{opacity:0.55} 100%{opacity:0;transform:translateY(-28px)} }
    @keyframes steamDrift { 0%,100%{opacity:0.4;transform:translateY(0)} 50%{opacity:0.9;transform:translateY(-4px)} }
    @keyframes glow { 0%,100%{opacity:0.2} 50%{opacity:0.5} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes bob { 0%,100%{transform:translate(-50%,-70%)} 50%{transform:translate(-50%,-76%)} }
    @keyframes flameBreathe { 0%,100%{transform:scaleY(1) scaleX(1)} 50%{transform:scaleY(1.05) scaleX(0.95)} }
    @keyframes ticketSlam { 0% { transform: translateY(-200px) rotate(-8deg); opacity: 0; } 60% { transform: translateY(20px) rotate(2deg); opacity: 1; } 80% { transform: translateY(-10px) rotate(-1deg); } 100% { transform: translateY(0) rotate(0deg); opacity: 1; } }
    @keyframes stampDown { 0% { transform: scale(3) rotate(-25deg); opacity: 0; } 70% { transform: scale(0.9) rotate(-12deg); opacity: 1; } 100% { transform: scale(1) rotate(-12deg); opacity: 1; } }
    @keyframes dotPulse { 0%,100%{opacity:0.3} 50%{opacity:0.9} }

    .fc-screen {
      width:100%; min-height:100vh; min-height:100dvh;
      margin:0 auto; background:#F5EDD8;
      position:relative; display:flex; flex-direction:column;
      padding-top:env(safe-area-inset-top);
      padding-bottom:env(safe-area-inset-bottom);
    }
    .fc-screen-content { flex:1; display:flex; flex-direction:column; }

    .fc-scene { width:100%; height:220px; position:relative; overflow:hidden; background:#C8834A; flex-shrink:0; }
    .fc-wall { position: absolute; inset: 0; background: #C8834A; }
    .fc-tiles { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 48px 48px; }
    .fc-left-shadow { position: absolute; top:0; left:0; width:40%; bottom:0; background:rgba(80,30,0,0.3); z-index:1; }
    .fc-light-glow { position:absolute; top:0; left:0; right:0; height:160px; background:radial-gradient(ellipse 70% 60% at 50% 0%, rgba(255,210,120,0.3) 0%, transparent 70%); z-index:2; }
    .fc-ceiling { position:absolute; top:0; left:0; right:0; height:18px; background:#3D1800; border-bottom:3px solid #5C2800; z-index:10; }
    .fc-pot-rail { position:absolute; top:18px; left:26%; right:0; height:7px; background:#4A2800; border-bottom:2px solid #2D1000; z-index:9; }
    .fc-floor { position:absolute; bottom:0; left:0; right:0; height:46px; background:#5C2800; border-top:4px solid #7A3A00; z-index:5; }
    .fc-counter { position:absolute; bottom:46px; left:0; right:0; height:14px; background:#8B5020; border-top:3px solid #AA6030; border-bottom:3px solid #5C2800; z-index:6; }
    .fc-lamp { position:absolute; top:18px; left:50%; transform:translateX(-50%); z-index:11; display:flex; flex-direction:column; align-items:center; }
    .fc-lamp-stem { width:4px; height:24px; background:#3D1800; }
    .fc-lamp-shade { width:32px; height:20px; background:#E8C090; border-radius:4px 4px 10px 10px; border:2px solid #3D1800; box-shadow:0 0 18px rgba(255,210,120,0.5); }
    .fc-hpot { position:absolute; top:25px; z-index:8; display:flex; flex-direction:column; align-items:center; }
    .fc-hpot-wire { width:2px; background:#4A2800; }
    .fc-hpot-body { border:2.5px solid #3D1800; border-radius:2px 2px 6px 6px; position:relative; }
    .fc-hpot-handle { position:absolute; top:-6px; left:20%; right:20%; height:6px; border:2.5px solid #3D1800; border-bottom:none; border-radius:3px 3px 0 0; }
    .fc-stove { position:absolute; bottom:60px; right:12px; width:110px; z-index:7; }
    .fc-stove-body { background:#3D1800; border:3px solid #2D1000; border-radius:4px 4px 0 0; height:58px; padding:7px; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:5px; }
    .fc-stove-burner { background:#2D1000; border-radius:50%; border:3px solid #1A0800; display:flex; align-items:center; justify-content:center; position:relative; }
    .fc-flame { width:9px; height:12px; background:#FF8C00; border-radius:50% 50% 30% 30%; animation:flicker 0.5s ease-in-out infinite alternate; position:absolute; }
    .fc-flame-i { width:4px; height:7px; background:#FFD166; border-radius:50% 50% 30% 30%; position:absolute; animation:flicker 0.4s ease-in-out infinite alternate-reverse; z-index:1; }
    .fc-stove-base { background:#5C2800; height:11px; border:3px solid #2D1000; border-top:none; border-radius:0 0 3px 3px; display:flex; align-items:center; justify-content:space-around; padding:0 6px; }
    .fc-stove-knob { width:8px; height:8px; border-radius:50%; background:#7A3A00; border:2px solid #3D1800; }
    .fc-pot-on { position:absolute; z-index:8; }
    .fc-pot-body2 { width:52px; height:36px; background:#CCC; border:3px solid #888; border-radius:3px 3px 9px 9px; position:relative; }
    .fc-pot-rim2 { position:absolute; top:-6px; left:-4px; right:-4px; height:7px; background:#BBB; border:2px solid #888; border-radius:4px; }
    .fc-pot-lh2 { position:absolute; left:-10px; top:8px; width:10px; height:6px; background:#AAA; border-radius:3px 0 0 3px; border:2px solid #888; }
    .fc-pot-rh2 { position:absolute; right:-10px; top:8px; width:10px; height:6px; background:#AAA; border-radius:0 3px 3px 0; border:2px solid #888; }
    .fc-pot-soup2 { position:absolute; bottom:3px; left:4px; right:4px; height:12px; background:rgba(200,131,74,0.4); border-radius:0 0 6px 6px; }
    .fc-steam { position:absolute; width:3px; border-radius:3px; background:rgba(255,255,255,0.45); animation:steamup 2s ease-in-out infinite; }

    .fc-card { background:#F5EDD8; border-top:4px solid #C8834A; position:relative; z-index:20; flex:1; display:flex; flex-direction:column; }
    .fc-card-bar { height:6px; background:#E8D5B0; border-bottom:1px solid #D4BC8C; flex-shrink:0; }
    .fc-card-inner { padding:16px 18px 24px; flex:1; }
    .fc-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:8px; }
    .fc-card-logo { font-family:'Playfair Display',serif; font-style:italic; font-size:22px; color:#5C2800; cursor:pointer; display:flex; align-items:center; gap:6px; min-width:0; }
    .fc-card-logo-text { white-space:nowrap; }
    .fc-card-logo-text span { color:#C8834A; }
    .fc-chips { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
    .fc-chip { background:#EDE0C4; border:1.5px solid #C8A878; border-radius:20px; padding:4px 10px; font-size:10px; font-weight:700; color:#7A4020; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap; }
    .fc-chip.streak { color:#3B82F6; }
    .fc-chip-flame { display:inline-flex; align-items:center; }
    .fc-clock-out { font-size:11px; color:#C8834A; background:none; border:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700; text-decoration:underline; padding:4px 6px; }

    .fc-menu-paper { background:#FFFDF4; border:2px solid #D4BC8C; border-radius:4px; padding:14px 14px 20px; box-shadow:2px 2px 0 #D4BC8C; position:relative; margin-bottom:14px; }
    .fc-menu-paper::before { content:''; position:absolute; top:-6px; left:16px; right:16px; height:6px; background:repeating-linear-gradient(90deg, #FFFDF4 0px, #FFFDF4 7px, #D4BC8C 7px, #D4BC8C 9px); }
    .fc-menu-paper::after { content:''; position:absolute; bottom:-6px; left:16px; right:16px; height:6px; background:repeating-linear-gradient(90deg, #FFFDF4 0px, #FFFDF4 7px, #D4BC8C 7px, #D4BC8C 9px); }
    .fc-menu-heading { font-family:'Playfair Display',serif; font-style:italic; font-size:18px; color:#5C2800; text-align:center; border-bottom:1.5px dashed #D4BC8C; padding-bottom:8px; margin-bottom:12px; }
    .fc-menu-sub { font-size:10px; color:#A07840; font-style:italic; text-align:center; display:block; margin-top:2px; }
    .fc-menu-item { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px dotted #D4BC8C; gap:8px; }
    .fc-menu-item:last-child { border-bottom:none; }
    .fc-menu-item-name { font-weight:800; font-size:13px; color:#3D1800; }
    .fc-menu-item-meta { font-size:10px; color:#A07840; margin-top:2px; }
    .fc-cook-btn { background:#C8834A; border:2px solid #8B5020; border-radius:8px; padding:6px 12px; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:#FFF5E0; cursor:pointer; white-space:nowrap; box-shadow:0 2px 0 #8B5020; min-height:32px; }
    .fc-icon-btn { background:#FFFDF4; border:1.5px solid #C8A878; border-radius:6px; padding:6px 9px; font-size:12px; cursor:pointer; color:#7A4020; font-weight:700; min-height:32px; min-width:32px; }
    .fc-icon-btn.danger { color:#C84B31; }

    .fc-prep-board { background:#DEB887; border:2.5px solid #8B6340; border-radius:12px; padding:14px; margin-bottom:14px; position:relative; }
    .fc-prep-board::after { content:''; position:absolute; right:10px; top:50%; transform:translateY(-50%); width:6px; height:32px; background:#A0724A; border-radius:3px; opacity:0.35; }
    .fc-prep-title { font-family:'Playfair Display',serif; font-style:italic; font-size:15px; color:#5C2800; margin-bottom:10px; }
    .fc-prep-input { width:100%; background:rgba(255,248,231,0.9); border:2px solid #8B6340; border-radius:8px; padding:10px 12px; font-family:'Nunito',sans-serif; font-size:14px; color:#3D1800; outline:none; margin-bottom:10px; -webkit-appearance:none; }
    .fc-prep-input::placeholder { color:#B8956A; }
    .fc-prep-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .fc-prep-time { width:68px; background:rgba(255,248,231,0.9); border:2px solid #8B6340; border-radius:6px; padding:8px; font-size:14px; text-align:center; outline:none; font-family:'Nunito',sans-serif; color:#3D1800; -webkit-appearance:none; }
    .fc-prep-label { font-size:13px; font-weight:700; color:#5C2800; }
    .fc-prep-add { width:100%; background:#C8834A; border:2.5px solid #8B5020; border-radius:8px; padding:12px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:800; color:#FFF5E0; cursor:pointer; box-shadow:0 3px 0 #8B5020; min-height:46px; }
    .fc-prep-add:disabled { opacity:0.5; cursor:not-allowed; }

    .fc-oven-scene { width:100%; height:280px; position:relative; overflow:hidden; background:#1A0800; flex-shrink:0; }
    .fc-oven-outer { position:absolute; bottom:40px; left:50%; transform:translateX(-50%); width:240px; background:#2D1000; border:4px solid #5C2800; border-radius:12px; padding:12px; z-index:7; }
    .fc-oven-top-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .fc-oven-brand { font-family:'Playfair Display',serif; font-style:italic; font-size:12px; color:#C8834A; }
    .fc-oven-knobs-row { display:flex; gap:5px; }
    .fc-oven-knob-big { width:14px; height:14px; border-radius:50%; background:#5C2800; border:2.5px solid #8B5020; position:relative; }
    .fc-oven-knob-big::after { content:''; position:absolute; top:2px; left:50%; transform:translateX(-50%); width:2px; height:5px; background:#C8834A; border-radius:1px; }
    .fc-oven-window { background:#0D0500; border:3px solid #5C2800; border-radius:8px; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; }
    .fc-oven-window-frame { position:absolute; inset:0; border:6px solid #3D1800; border-radius:6px; z-index:3; pointer-events:none; }
    .fc-oven-glow-bottom { position:absolute; bottom:0; left:0; right:0; height:40px; background:#E8941A; opacity:0.2; animation:glow 2s ease-in-out infinite; }
    .fc-oven-glow-inner { position:absolute; bottom:0; left:20%; right:20%; height:14px; background:#FF6B00; opacity:0.15; border-radius:50%; animation:glow 1.5s ease-in-out infinite 0.3s; }
    .fc-oven-burners-row { display:flex; justify-content:space-around; padding:8px 10px 0; }
    .fc-oven-burner-big { width:30px; height:30px; border-radius:50%; background:#1A0800; border:3px solid #5C2800; display:flex; align-items:center; justify-content:center; }
    .fc-oven-burner-dot { width:10px; height:10px; border-radius:50%; background:#FF6B00; opacity:0.45; animation:dotPulse 1.3s ease-in-out infinite; }
    .fc-oven-floor { position:absolute; bottom:0; left:0; right:0; height:40px; background:#0D0500; z-index:1; }

    .fc-done-btn { width:100%; background:#FFD166; border:2.5px solid #8B5020; border-radius:10px; padding:14px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:800; color:#3D1800; cursor:pointer; box-shadow:0 3px 0 #C8834A; margin-top:12px; min-height:48px; }

    .fc-oven-focus-card { background:#FFFDF4; border:2px solid #D4BC8C; border-radius:10px; padding:18px; margin-bottom:12px; text-align:center; }
    .fc-oven-focus-title { font-family:'Playfair Display',serif; font-style:italic; font-size:18px; color:#5C2800; margin-bottom:8px; }
    .fc-oven-focus-sub { font-size:12px; color:#A07840; font-style:italic; line-height:1.5; }

    .fc-xp-card { background:#FFFDF4; border:2px solid #D4BC8C; border-radius:8px; padding:14px; margin-bottom:12px; }
    .fc-xp-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .fc-xp-rank-name { font-family:'Playfair Display',serif; font-style:italic; font-size:16px; color:#5C2800; }
    .fc-xp-count { font-size:11px; color:#A07840; font-weight:700; }
    .fc-xp-bar-bg { height:10px; background:#E8D5B0; border-radius:5px; margin-bottom:6px; overflow:hidden; }
    .fc-xp-bar-fill { height:100%; background:linear-gradient(90deg,#E8941A,#C8834A); border-radius:5px; transition:width 0.6s; }
    .fc-xp-next { font-size:10px; color:#A07840; }
    .fc-sticker-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .fc-sticker-card { background:#FFFDF4; border:2px solid #D4BC8C; border-radius:10px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; gap:4px; transition:transform 0.2s; }
    .fc-sticker-card:not(.locked):active { transform:translateY(-2px); }
    .fc-sticker-card.locked { opacity:0.35; filter:grayscale(80%); }
    .fc-sticker-img { width:48px; height:48px; object-fit:contain; }
    .fc-sticker-name { font-size:9px; color:#7A4020; text-align:center; font-weight:700; line-height:1.2; }
    .fc-sticker-xp { font-size:8px; color:#A07840; }
    .fc-tier-label { font-size:10px; font-weight:800; color:#A07840; letter-spacing:1px; text-transform:uppercase; margin:14px 0 6px; padding-bottom:4px; border-bottom:1.5px dashed #D4BC8C; }

    .fc-fft-bg { width:100%; height:280px; background:linear-gradient(180deg,#D89560 0%,#C8834A 60%,#A86530 100%); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; flex-shrink:0; }
    .fc-fft-bg-tiles { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px); background-size:48px 48px; }
    .fc-fft-bg-glow { position:absolute; inset:0; background:radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,210,120,0.25) 0%, transparent 70%); }
    .fc-fft-bowl { position:relative; z-index:2; filter:drop-shadow(0 8px 20px rgba(0,0,0,0.25)); }
    .fc-fft-title { font-family:'Playfair Display',serif; font-style:italic; font-size:24px; color:#5C2800; text-align:center; margin-bottom:4px; }
    .fc-fft-subtitle { font-size:12px; color:#A07840; text-align:center; font-style:italic; margin-bottom:16px; }
    .fc-fft-question { font-family:'Playfair Display',serif; font-style:italic; font-size:15px; color:#3D1800; text-align:center; line-height:1.6; margin-bottom:16px; padding:14px; background:#FFFDF4; border:1.5px solid #D4BC8C; border-radius:8px; }
    .fc-fft-textarea { width:100%; background:#FFFDF4; border:2px solid #C8A878; border-radius:8px; padding:12px; font-family:'Nunito',sans-serif; font-size:14px; color:#3D1800; outline:none; resize:none; height:100px; margin-bottom:12px; -webkit-appearance:none; }
    .fc-fft-save { width:100%; background:#C8834A; border:2.5px solid #8B5020; border-radius:10px; padding:14px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:800; color:#FFF5E0; cursor:pointer; box-shadow:0 3px 0 #8B5020; margin-bottom:8px; min-height:48px; }
    .fc-fft-save:disabled { opacity:0.5; cursor:not-allowed; }
    .fc-fft-skip { width:100%; background:none; border:none; font-size:12px; color:#A07840; cursor:pointer; text-decoration:underline; font-family:'Nunito',sans-serif; padding:10px; }

    .fc-welcome-outer { min-height:100vh; min-height:100dvh; background:#C8834A; display:flex; flex-direction:column; padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom); }
    .fc-welcome-hero { width:100%; flex:0 0 38vh; min-height:260px; max-height:360px; position:relative; overflow:hidden; background:linear-gradient(180deg,#D89560 0%,#C8834A 60%,#A86530 100%); }
    .fc-welcome-logo-wrap { position:absolute; top:50%; left:50%; transform:translate(-50%,-70%); z-index:5; animation:bob 4s ease-in-out infinite; filter:drop-shadow(0 10px 30px rgba(0,0,0,0.3)); }
    .fc-welcome-body { background:#F5EDD8; padding:28px 24px 28px; flex:1; display:flex; flex-direction:column; justify-content:flex-start; text-align:center; max-width:440px; margin:0 auto; width:100%; }
    .fc-welcome-logo-text { font-family:'Playfair Display',serif; font-style:italic; font-size:44px; color:#5C2800; margin:0 0 4px; line-height:1; }
    .fc-welcome-logo-text span { color:#C8834A; }
    .fc-welcome-tag { font-size:11px; color:#A07840; letter-spacing:3px; text-transform:uppercase; font-weight:700; margin-bottom:22px; }
    .fc-welcome-greet { font-family:'Playfair Display',serif; font-style:italic; font-size:19px; color:#7A4020; margin-bottom:20px; }
    .fc-pilot-card { background:linear-gradient(135deg,#FFFDF4 0%,#FFF5E0 100%); border:2.5px solid #D4BC8C; border-radius:14px; padding:16px 18px; margin-bottom:20px; display:flex; align-items:center; gap:16px; box-shadow:2px 2px 0 #D4BC8C; }
    .fc-pilot-info { flex:1; text-align:left; }
    .fc-pilot-label { font-size:9px; color:#A07840; letter-spacing:2px; font-weight:800; text-transform:uppercase; }
    .fc-pilot-num { font-family:'Playfair Display',serif; font-style:italic; font-size:30px; color:#3B82F6; font-weight:700; line-height:1; }
    .fc-pilot-longest { font-size:10px; color:#A07840; margin-top:4px; }
    .fc-welcome-btn { width:100%; background:linear-gradient(180deg,#D89560 0%,#C8834A 100%); border:2.5px solid #8B5020; border-radius:12px; padding:16px; font-family:'Nunito',sans-serif; font-size:16px; font-weight:800; color:#FFF5E0; cursor:pointer; box-shadow:0 5px 0 #8B5020; letter-spacing:1.5px; transition:transform 0.1s; min-height:54px; }
    .fc-welcome-btn:active { transform:translateY(3px); box-shadow:0 2px 0 #8B5020; }
    .fc-welcome-signout { margin-top:14px; background:none; border:none; color:#A07840; cursor:pointer; font-size:12px; text-decoration:underline; font-family:'Nunito',sans-serif; letter-spacing:1px; padding:8px; }

    .fc-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
    .fc-ticket { background:#FFFDF4; padding:24px; border-radius:6px; max-width:340px; width:100%; position:relative; animation:ticketSlam 0.6s cubic-bezier(.22,1.5,.55,.95) forwards; border:2px dashed #A07840; background-image:repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(160,120,64,0.08) 22px, rgba(160,120,64,0.08) 23px); font-family:'Nunito',sans-serif; }
    .fc-ticket-bell-svg { display:flex; justify-content:center; margin-bottom:10px; }
    .fc-ticket-order { border-top:2px solid #5C2800; border-bottom:2px solid #5C2800; padding:8px 0; text-align:center; margin-bottom:14px; }
    .fc-ticket-num { font-size:10px; letter-spacing:2px; color:#A07840; font-weight:700; }
    .fc-ticket-task { font-family:'Playfair Display',serif; font-style:italic; font-size:18px; color:#3D1800; text-align:center; margin-bottom:14px; }
    .fc-ticket-stamp-area { position:relative; height:90px; display:flex; justify-content:center; align-items:center; margin:10px 0; }
    .fc-ticket-stamp { padding:8px 22px; font-size:26px; font-weight:900; letter-spacing:3px; font-family:'Nunito',sans-serif; animation:stampDown 0.35s cubic-bezier(.3,2,.5,1) forwards; transform:rotate(-12deg); opacity:0.9; }
    .fc-ticket-msg { border-top:2px dashed #A07840; padding-top:12px; text-align:center; color:#3D1800; font-size:13px; line-height:1.4; }
    .fc-ticket-rankup { text-align:center; margin-top:12px; padding:10px; background:#FFD166; color:#3D1800; border-radius:4px; font-weight:800; font-size:12px; letter-spacing:1.5px; border:2px solid #8B5020; }
    .fc-ticket-close { width:100%; padding:12px; margin-top:14px; border-radius:8px; border:2.5px solid #8B5020; background:#C8834A; color:#FFF5E0; font-weight:800; font-size:14px; letter-spacing:1px; cursor:pointer; box-shadow:0 3px 0 #8B5020; font-family:'Nunito',sans-serif; min-height:48px; }

    .fc-back-btn { background:#FFFDF4; border:2px solid #C8A878; color:#7A4020; border-radius:8px; padding:8px 14px; font-family:'Nunito',sans-serif; font-size:12px; font-weight:700; cursor:pointer; min-height:36px; }
  `}</style>
);

const WelcomeHero: React.FC<{ logoSize?: number }> = ({ logoSize = 200 }) => (
  <div className="fc-welcome-hero">
    <div className="fc-tiles" />
    <div className="fc-light-glow" />
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(180deg,transparent,rgba(92,40,0,0.4))' }} />
    <div className="fc-welcome-logo-wrap">
      <Logo size={logoSize} />
    </div>
    <div className="fc-steam" style={{ bottom: '60px', left: '22%', height: '26px', animationDelay: '0s' }} />
    <div className="fc-steam" style={{ bottom: '60px', left: '28%', height: '20px', animationDelay: '0.7s' }} />
    <div className="fc-steam" style={{ bottom: '60px', right: '22%', height: '22px', animationDelay: '0.3s' }} />
    <div className="fc-steam" style={{ bottom: '60px', right: '28%', height: '28px', animationDelay: '1s' }} />
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [screen, setScreen] = useState<Screen>('main');
  const [plates, setPlates] = useState<Plate[]>([]);
  const [task, setTask] = useState<string>('');
  const [goal, setGoal] = useState<number>(30);
  const [activePlate, setActivePlate] = useState<Plate | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isCooking, setIsCooking] = useState<boolean>(false);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [totalXP, setTotalXP] = useState<number>(0);
  const [chefTitle, setChefTitle] = useState<string>('Kitchen Newbie');
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastActiveDate: '' });
  const [dailyQuestion, setDailyQuestion] = useState<string>('');
  const [journalResponse, setJournalResponse] = useState<string>('');
  const [todayEntry, setTodayEntry] = useState<string | null>(null);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadPlates(currentUser.uid);
        const { totalXP: xp, rank } = await getUserXP();
        setTotalXP(xp);
        setChefTitle(rank.title);
        const entry = await getTodayEntry();
        setTodayEntry(entry);
        const streakData = await getStreak();
        setStreak(streakData);
        const q = await getDailyQuestion();
        setDailyQuestion(q);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isCooking && !isOvertime) {
      interval = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { setIsOvertime(true); return 0; }
          return s - 1;
        });
      }, 1000);
    } else if (isCooking && isOvertime) {
      interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isCooking, isOvertime]);

  async function loadPlates(uid: string) {
    const q = query(collection(db, 'tasks'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plate));
    setPlates(data);
  }

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (error) { console.error('Login failed:', error); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsClockedIn(false);
    setScreen('main');
  };

  const handleClockIn = async () => {
    const updatedStreak = await updateStreak();
    setStreak(updatedStreak);
    setIsClockedIn(true);
    setScreen('main');
  };

  const handleClockOut = async () => {
    const question = await getDailyQuestion();
    setDailyQuestion(question);
    const entry = await getTodayEntry();
    setTodayEntry(entry);
    setScreen('foodForThought');
  };

  const handleAddToMenu = async () => {
    if (!task.trim() || !user) return;
    await addDoc(collection(db, 'tasks'), {
      uid: user.uid, text: task, goalMinutes: goal,
      completed: false, createdAt: Date.now(),
    });
    setTask('');
    setGoal(30);
    await loadPlates(user.uid);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'tasks', id));
    await loadPlates(user.uid);
  };

  const handleStartCooking = (plate: Plate) => {
    setActivePlate(plate);
    setSecondsLeft(plate.goalMinutes * 60);
    setIsOvertime(false);
    setIsCooking(true);
    setScreen('oven');
  };

  const handleDone = async () => {
    if (!activePlate || !user) return;
    const result = isOvertime ? 'late' : getCookResult(secondsLeft, activePlate.goalMinutes);
    const xp = calculateXP(activePlate.goalMinutes, result);
    const message = getCookMessage(result, xp);
    await updateDoc(doc(db, 'tasks', activePlate.id), { completed: true });
    const { totalXP: newTotal, leveledUp, newTitle } = await awardXP(xp);
    setTotalXP(newTotal);
    setChefTitle(getRank(newTotal).title);
    setTicketResult({ result, xp, message, taskText: activePlate.text, leveledUp, newTitle });
    await loadPlates(user.uid);
    setIsCooking(false);
    setActivePlate(null);
    setScreen('main');
  };

  const handleSaveJournal = async () => {
    if (!journalResponse.trim()) return;
    await saveTodayEntry(journalResponse, dailyQuestion);
    setTodayEntry(journalResponse);
    setJournalResponse('');
    setIsClockedIn(false);
    setScreen('main');
  };

  const handleSkipJournal = () => {
    setJournalResponse('');
    setIsClockedIn(false);
    setScreen('main');
  };

  const rank = getRank(totalXP);
  const nextRank = getNextRank(totalXP);
  const xpIntoRank = totalXP - rank.minXP;
  const xpNeeded = nextRank ? nextRank.minXP - rank.minXP : 0;
  const progressPct = nextRank ? (xpIntoRank / xpNeeded) * 100 : 100;
  const activePlates = plates.filter(p => !p.completed);

  if (!user) {
    return (
      <div className="fc-app">
        <GlobalStyles />
        <div className="fc-welcome-outer">
          <WelcomeHero logoSize={200} />
          <div className="fc-welcome-body">
            <div className="fc-welcome-logo-text">Focus<span>Chef</span></div>
            <div className="fc-welcome-tag">Cook Your Goals</div>
            <div style={{ flex: 1 }} />
            <button onClick={handleLogin} className="fc-welcome-btn">Sign in with Google</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isClockedIn) {
    return (
      <div className="fc-app">
        <GlobalStyles />
        <div className="fc-welcome-outer">
          <WelcomeHero logoSize={180} />
          <div className="fc-welcome-body">
            <div className="fc-welcome-logo-text">Focus<span>Chef</span></div>
            <div className="fc-welcome-tag">Chef's Station</div>
            <div className="fc-welcome-greet">Welcome back, {user.displayName?.split(' ')[0] || 'Chef'}</div>
            <div className="fc-pilot-card">
              <PilotFlame size={48} lit={streak.currentStreak > 0} />
              <div className="fc-pilot-info">
                <div className="fc-pilot-label">Streak</div>
                <div className="fc-pilot-num">{streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}</div>
                <div className="fc-pilot-longest">Longest: {streak.longestStreak} days</div>
              </div>
            </div>
            <button onClick={handleClockIn} className="fc-welcome-btn">Clock In</button>
            <button onClick={handleLogout} className="fc-welcome-signout">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'foodForThought') {
    return (
      <div className="fc-app">
        <GlobalStyles />
        <div className="fc-screen">
          <div className="fc-fft-bg">
            <div className="fc-fft-bg-tiles" />
            <div className="fc-fft-bg-glow" />
            <div className="fc-fft-bowl"><CoffeeCupArt /></div>
          </div>
          <div className="fc-card">
            <div className="fc-card-bar" />
            <div style={{ padding: '20px 18px 24px' }}>
              <div className="fc-fft-title">Food for Thought</div>
              <div className="fc-fft-subtitle">A little moment just for you before you go.</div>
              <div className="fc-fft-question">"{dailyQuestion}"</div>
              {todayEntry ? (
                <>
                  <div style={{ background: '#FFFDF4', border: '1.5px solid #D4BC8C', borderRadius: '8px', padding: '14px', marginBottom: '14px', fontSize: '14px', color: '#3D1800', minHeight: '70px', fontStyle: 'italic' }}>
                    "{todayEntry}"
                  </div>
                  <button onClick={handleSkipJournal} className="fc-fft-save">Clock Out</button>
                </>
              ) : (
                <>
                  <textarea value={journalResponse} onChange={(e) => setJournalResponse(e.target.value)} className="fc-fft-textarea" placeholder="Let it all out, Chef..." />
                  <button onClick={handleSaveJournal} disabled={!journalResponse.trim()} className="fc-fft-save">Save &amp; Clock Out</button>
                  <button onClick={handleSkipJournal} className="fc-fft-skip">Skip for now</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'oven' && activePlate) {
    return (
      <div className="fc-app">
        <GlobalStyles />
        <div className="fc-screen">
          <div className="fc-oven-scene">
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0D0500 0%,#1A0800 60%,#2D1000 100%)' }} />
            <div className="fc-oven-outer">
              <div className="fc-oven-top-row">
                <span className="fc-oven-brand">Silent Oven</span>
                <div className="fc-oven-knobs-row">
                  <div className="fc-oven-knob-big" />
                  <div className="fc-oven-knob-big" />
                  <div className="fc-oven-knob-big" />
                </div>
              </div>
              <div className="fc-oven-window">
                <div className="fc-oven-window-frame" />
                <div className="fc-oven-glow-bottom" />
                <div className="fc-oven-glow-inner" />
              </div>
              <div className="fc-oven-burners-row">
                <div className="fc-oven-burner-big"><div className="fc-oven-burner-dot" /></div>
                <div className="fc-oven-burner-big"><div className="fc-oven-burner-dot" style={{ animationDelay: '0.3s' }} /></div>
                <div className="fc-oven-burner-big"><div className="fc-oven-burner-dot" style={{ animationDelay: '0.6s' }} /></div>
                <div className="fc-oven-burner-big"><div className="fc-oven-burner-dot" style={{ animationDelay: '0.9s' }} /></div>
              </div>
            </div>
            <div className="fc-oven-floor" />
          </div>
          <div className="fc-card">
            <div className="fc-card-bar" />
            <div className="fc-card-inner">
              <div className="fc-card-header">
                <div className="fc-card-logo">
                  <Logo size={36} />
                  <span className="fc-card-logo-text">Focus<span>Chef</span></span>
                </div>
                <div className="fc-chips">
                  <div className="fc-chip">{chefTitle}</div>
                </div>
              </div>
              <div className="fc-oven-focus-card">
                <div className="fc-oven-focus-title">Your meal is cooking, Chef</div>
                <div className="fc-oven-focus-sub">
                  The oven door is closed. Focus on your work — when you're done, plate it up and we'll see how you did.
                </div>
              </div>
              <button onClick={handleDone} className="fc-done-btn">Plate It Up</button>
            </div>
          </div>
        </div>
        {ticketResult && <TicketModal {...ticketResult} onClose={() => setTicketResult(null)} />}
      </div>
    );
  }

  if (screen === 'profile') {
    const badgesByTier: Record<number, RecipeBadge[]> = {};
    RECIPE_BADGES.forEach(b => {
      if (!badgesByTier[b.tier]) badgesByTier[b.tier] = [];
      badgesByTier[b.tier].push(b);
    });

    return (
      <div className="fc-app">
        <GlobalStyles />
        <div className="fc-screen">
          <KitchenScene />
          <div className="fc-card">
            <div className="fc-card-bar" />
            <div className="fc-card-inner">
              <div className="fc-card-header">
                <div className="fc-card-logo" onClick={() => setScreen('main')}>
                  <Logo size={36} />
                  <span className="fc-card-logo-text">Focus<span>Chef</span></span>
                </div>
                <button onClick={handleClockOut} className="fc-clock-out">Clock Out</button>
              </div>
              <button onClick={() => setScreen('main')} className="fc-back-btn" style={{ marginBottom: '14px' }}>← Back to Kitchen</button>
              <div className="fc-xp-card">
                <div className="fc-xp-top">
                  <span className="fc-xp-rank-name">{rank.title}</span>
                  <span className="fc-xp-count">{totalXP} XP</span>
                </div>
                <div className="fc-xp-bar-bg">
                  <div className="fc-xp-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="fc-xp-next">
                  {nextRank ? `${nextRank.minXP - totalXP} XP until ${nextRank.title}` : 'MAX RANK — You are a legend!'}
                </div>
              </div>
              <div style={{ background: '#FFFDF4', border: '2px solid #D4BC8C', borderRadius: '8px', padding: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <PilotFlame size={48} lit={streak.currentStreak > 0} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#A07840', letterSpacing: '1.5px', fontWeight: 700 }}>STREAK</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '22px', color: '#3B82F6' }}>
                    {streak.currentStreak}-day streak
                  </div>
                  <div style={{ fontSize: '10px', color: '#A07840' }}>Longest: {streak.longestStreak} days</div>
                </div>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '20px', textAlign: 'center', color: '#5C2800', marginBottom: '4px' }}>
                Recipe Vault
              </div>
              <div style={{ fontSize: '11px', color: '#A07840', textAlign: 'center', marginBottom: '14px', fontStyle: 'italic' }}>
                {RECIPE_BADGES.filter(b => totalXP >= b.xp).length} of {RECIPE_BADGES.length} recipes mastered
              </div>
              {Object.keys(badgesByTier).map(tierStr => {
                const tier = parseInt(tierStr);
                const tierRank = CHEF_RANKS[tier - 1];
                const badges = badgesByTier[tier];
                return (
                  <div key={tier}>
                    <div className="fc-tier-label">{tierRank.title} — Tier {tier}</div>
                    <div className="fc-sticker-grid">
                      {badges.map(b => (
                        <RecipeBadgeCard key={b.name} badge={b} unlocked={totalXP >= b.xp} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: '11px', color: '#A07840', textAlign: 'center', marginTop: '18px', fontStyle: 'italic' }}>
                Complete tasks on time to unlock more recipes!
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-app">
      <GlobalStyles />
      <div className="fc-screen">
        <KitchenScene />
        <div className="fc-card">
          <div className="fc-card-bar" />
          <div className="fc-card-inner">
            <div className="fc-card-header">
              <div className="fc-card-logo">
                <Logo size={36} />
                <span className="fc-card-logo-text">Focus<span>Chef</span></span>
              </div>
              <div className="fc-chips">
                <div className="fc-chip" onClick={() => setScreen('profile')}>{chefTitle}</div>
                <div className="fc-chip" onClick={() => setScreen('profile')}>{totalXP} XP</div>
                <div className="fc-chip streak" onClick={() => setScreen('profile')}>
                  <PilotFlame size={16} lit={streak.currentStreak > 0} showBurner={false} />
                  {streak.currentStreak}
                </div>
              </div>
            </div>
            <div className="fc-prep-board">
              <div className="fc-prep-title">Prep Station</div>
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddToMenu()}
                className="fc-prep-input"
                placeholder="What assignment are we prepping?"
              />
              <div className="fc-prep-row">
                <span className="fc-prep-label">Goal:</span>
                <input
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(Math.max(1, parseInt(e.target.value) || 1))}
                  className="fc-prep-time"
                  min={1}
                  max={180}
                />
                <span className="fc-prep-label">mins</span>
              </div>
              <button onClick={handleAddToMenu} disabled={!task.trim()} className="fc-prep-add">+ Add to Menu</button>
            </div>
            <div className="fc-menu-paper">
              <div className="fc-menu-heading">
                Chef's Orders
                <span className="fc-menu-sub">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long' })}'s Kitchen — Table for 1
                </span>
              </div>
              {activePlates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#A07840', fontStyle: 'italic', fontSize: '13px' }}>
                  No orders yet — add one from your prep station.
                </div>
              ) : (
                activePlates.map(p => (
                  <div key={p.id} className="fc-menu-item">
                    <div style={{ flex: 1 }}>
                      <div className="fc-menu-item-name">{p.text}</div>
                      <div className="fc-menu-item-meta">{p.goalMinutes} mins • {p.goalMinutes * 10} XP possible</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleDelete(p.id)} className="fc-icon-btn danger" title="Delete">✕</button>
                      <button onClick={() => handleStartCooking(p)} className="fc-cook-btn">Cook It</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={handleClockOut} className="fc-clock-out" style={{ width: '100%', textAlign: 'center', padding: '10px' }}>
              Clock Out for the Day →
            </button>
          </div>
        </div>
      </div>
      {ticketResult && <TicketModal {...ticketResult} onClose={() => setTicketResult(null)} />}
    </div>
  );
}

const KitchenScene: React.FC = () => (
  <div className="fc-scene">
    <div className="fc-wall" />
    <div className="fc-tiles" />
    <div className="fc-left-shadow" />
    <div className="fc-light-glow" />
    <div className="fc-ceiling" />
    <div className="fc-lamp">
      <div className="fc-lamp-stem" />
      <div className="fc-lamp-shade" />
    </div>
    <div className="fc-pot-rail" />
    <div className="fc-hpot" style={{ left: '28%' }}>
      <div className="fc-hpot-wire" style={{ height: '28px' }} />
      <div className="fc-hpot-body" style={{ width: '36px', height: '26px', background: '#A07840' }}>
        <div className="fc-hpot-handle" style={{ background: '#8B6030' }} />
      </div>
    </div>
    <div className="fc-hpot" style={{ left: '42%' }}>
      <div className="fc-hpot-wire" style={{ height: '40px' }} />
      <div className="fc-hpot-body" style={{ width: '28px', height: '20px', background: '#8B6030' }}>
        <div className="fc-hpot-handle" style={{ background: '#6B4020' }} />
      </div>
    </div>
    <div className="fc-hpot" style={{ left: '55%' }}>
      <div className="fc-hpot-wire" style={{ height: '22px' }} />
      <div className="fc-hpot-body" style={{ width: '34px', height: '24px', background: '#B08050' }}>
        <div className="fc-hpot-handle" style={{ background: '#8B6030' }} />
      </div>
    </div>
    <div className="fc-hpot" style={{ left: '68%' }}>
      <div className="fc-hpot-wire" style={{ height: '34px' }} />
      <div className="fc-hpot-body" style={{ width: '30px', height: '22px', background: '#7A5020' }}>
        <div className="fc-hpot-handle" style={{ background: '#5C3810' }} />
      </div>
    </div>
    <div className="fc-stove">
      <div className="fc-stove-body">
        <div className="fc-stove-burner" style={{ background: '#1A0800' }}>
          <div className="fc-flame" />
          <div className="fc-flame-i" />
        </div>
        <div className="fc-stove-burner" />
        <div className="fc-stove-burner" />
        <div className="fc-stove-burner" />
      </div>
      <div className="fc-stove-base">
        <div className="fc-stove-knob" />
        <div className="fc-stove-knob" />
        <div className="fc-stove-knob" />
        <div className="fc-stove-knob" />
      </div>
    </div>
    <div className="fc-pot-on" style={{ bottom: '118px', right: '20px' }}>
      <div className="fc-pot-body2">
        <div className="fc-pot-rim2" />
        <div className="fc-pot-lh2" />
        <div className="fc-pot-rh2" />
        <div className="fc-pot-soup2" />
      </div>
    </div>
    <div className="fc-steam" style={{ bottom: '154px', right: '50px', height: '14px', animationDelay: '0s' }} />
    <div className="fc-steam" style={{ bottom: '154px', right: '42px', height: '20px', animationDelay: '0.5s' }} />
    <div className="fc-steam" style={{ bottom: '154px', right: '34px', height: '12px', animationDelay: '1s' }} />
    <div className="fc-counter" />
    <div className="fc-floor" />
  </div>
);

const RecipeBadgeCard: React.FC<{ badge: RecipeBadge; unlocked: boolean }> = ({ badge, unlocked }) => (
  <div className={`fc-sticker-card ${unlocked ? '' : 'locked'}`}>
    <img
      src={`/badges/${badge.file}`}
      alt={badge.name}
      className="fc-sticker-img"
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
    />
    <div className="fc-sticker-name">{badge.name}</div>
    <div className="fc-sticker-xp">{unlocked ? '✓' : 'Locked'} {badge.xp} XP</div>
  </div>
);

interface TicketModalProps {
  result: 'early' | 'ontime' | 'late';
  taskText: string;
  xp: number;
  message: string;
  leveledUp: boolean;
  newTitle: string;
  onClose: () => void;
}
const TicketModal: React.FC<TicketModalProps> = ({ result, taskText, message, leveledUp, newTitle, onClose }) => {
  const stampColor = result === 'early' ? '#C84B31' : result === 'ontime' ? '#7A9B3C' : '#3D1800';
  const stampText = result === 'early' ? 'EARLY' : result === 'ontime' ? 'ON TIME' : 'BURNT';
  const [showStamp, setShowStamp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowStamp(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fc-modal-bg">
      <div className="fc-ticket">
        <div className="fc-ticket-bell-svg"><ServiceBell /></div>
        <div className="fc-ticket-order">
          <div className="fc-ticket-num">ORDER #{Math.floor(Math.random() * 9000 + 1000)}</div>
          <div style={{ fontSize: '10px', color: '#A07840' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="fc-ticket-task">{taskText}</div>
        <div className="fc-ticket-stamp-area">
          {showStamp && (
            <div className="fc-ticket-stamp" style={{ color: stampColor, border: `4px solid ${stampColor}`, boxShadow: `inset 0 0 0 2px ${stampColor}` }}>
              {stampText}
            </div>
          )}
        </div>
        <div className="fc-ticket-msg">{message}</div>
        {leveledUp && (
          <div className="fc-ticket-rankup">RANK UP: {newTitle.toUpperCase()}</div>
        )}
        <button onClick={onClose} className="fc-ticket-close">Next Order →</button>
      </div>
    </div>
  );
};