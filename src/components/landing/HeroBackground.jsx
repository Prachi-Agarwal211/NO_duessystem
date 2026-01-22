/* Royal background for landing pages using inline SVG */
'use client';

import React from 'react';

export default function HeroBackground() {
  return (
    <svg
      className="hero-background"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none', mixBlendMode: 'multiply' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(196,30,58,0.25)" />
          <stop offset="100%" stopColor="rgba(139,0,0,0.0)" />
        </linearGradient>
        <radialGradient id="rg2" cx="70%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#lg)" />
      <circle cx="420" cy="260" r="260" fill="url(#rg2)" />
      <circle cx="1180" cy="180" r="320" fill="url(#rg2)" />
      <circle cx="980" cy="640" r="420" fill="url(#rg2)" />
    </svg>
  );
}
