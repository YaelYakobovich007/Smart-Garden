import React from 'react';

export function PlantSvg({ irrigating, blocked }: { irrigating: boolean; blocked: boolean }): JSX.Element {
    const stem = blocked ? '#6b7280' : '#2f7d32';
    const leaf1 = blocked ? '#9aa5b1' : '#34d399';
    const leaf2 = blocked ? '#7c8794' : '#059669';
    const soil1 = '#6b4423';
    const soil2 = '#2b1d12';

    return (
        <svg className="plantSvg" viewBox="0 0 220 160" aria-hidden>
            <defs>
                <linearGradient id="leafGradSvg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={leaf1} />
                    <stop offset="100%" stopColor={leaf2} />
                </linearGradient>
                <linearGradient id="soilGradSvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={soil1} />
                    <stop offset="100%" stopColor={soil2} />
                </linearGradient>
                <linearGradient id="tapGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#374151" />
                </linearGradient>
                <filter id="softSvgShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
                </filter>
                <filter id="dropGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* ground (soil) */}
            <g filter="url(#softSvgShadow)">
                <ellipse cx="110" cy="142" rx="50" ry="7" fill="rgba(0,0,0,0.30)" />
                <ellipse cx="110" cy="136" rx="56" ry="14" fill="url(#soilGradSvg)" stroke="#1a1410" strokeWidth="0.8" />
            </g>

            {/* stem */}
            <path d="M110 126 C108 92 108 76 110 48" stroke={stem} strokeWidth="4" fill="none" />

            {/* leaves */}
            <g fill="url(#leafGradSvg)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8">
                {/* upper left (raised) */}
                <path d="M110 70 C90 67 82 56 80 46 C96 48 102 54 110 70 Z" />
                {/* upper right (raised) */}
                <path d="M112 64 C132 62 142 52 146 42 C130 43 122 50 112 64 Z" />
                {/* mid right (raised) */}
                <path d="M114 80 C134 84 150 80 160 72 C138 70 124 72 114 80 Z" />
                {/* mid left (raised) */}
                <path d="M106 82 C88 82 76 78 70 72 C90 70 98 74 106 82 Z" />
                {/* lower left (raised) */}
                <path d="M108 96 C92 96 84 92 78 86 C93 84 100 88 108 96 Z" />
                {/* lower right (raised) */}
                <path d="M112 96 C130 100 140 96 148 90 C132 88 122 90 112 96 Z" />
            </g>

            {/* probe removed per request */}

            {/* simple tap above plant */}
            <g>
                <rect x="96" y="8" width="28" height="6" rx="3" fill="url(#tapGrad)" />
                <rect x="109" y="14" width="2" height="10" rx="1" fill="url(#tapGrad)" />
                <circle cx="110" cy="25" r="2.6" fill="#cbd5e1" />
            </g>

            {/* irrigation drops */}
            {irrigating && (
                <g fill="#7dd3fc" filter="url(#dropGlow)">
                    <circle cx="110" cy="28" r="3" className="drop d1" />
                    <circle cx="110" cy="28" r="2.6" className="drop d2" />
                    <circle cx="110" cy="28" r="2.4" className="drop d3" />
                </g>
            )}
        </svg>
    );
}


