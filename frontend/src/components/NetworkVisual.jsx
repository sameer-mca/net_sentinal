import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

const NetworkVisual = ({ size = '100%', maxWidth = '500px' }) => {
  return (
    <div
      className="network-visual-root"
      style={{
        width: size,
        maxWidth,
        aspectRatio: '1 / 1',
        position: 'relative',
        margin: '0 auto',
        animation: 'visualFloat 6s ease-in-out infinite alternate',
      }}
    >
      <svg
        viewBox="0 0 500 500"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Radial Gradients for Nodes */}
          <radialGradient id="nodeCyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="1" />
            <stop offset="80%" stopColor="#00e5ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.1" />
          </radialGradient>

          <radialGradient id="nodeViolet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="1" />
            <stop offset="80%" stopColor="#7c5cff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.1" />
          </radialGradient>

          <radialGradient id="nodeMagenta" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff2bd6" stopOpacity="1" />
            <stop offset="80%" stopColor="#ff2bd6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff2bd6" stopOpacity="0.1" />
          </radialGradient>

          {/* Central Shield Gradient */}
          <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="50%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#ff2bd6" />
          </linearGradient>

          {/* Paths for animateMotion */}
          <path id="wire-1" d="M 250 250 L 250 70" />
          <path id="wire-2" d="M 250 250 L 375 115" />
          <path id="wire-3" d="M 250 250 L 430 220" />
          <path id="wire-4" d="M 250 250 L 410 350" />
          <path id="wire-5" d="M 250 250 L 310 430" />
          <path id="wire-6" d="M 250 250 L 190 430" />
          <path id="wire-7" d="M 250 250 L 90 350" />
          <path id="wire-8" d="M 250 250 L 70 220" />
          <path id="wire-9" d="M 250 250 L 125 115" />

          {/* Cross Perimeter Interlinks */}
          <path id="perim-1" d="M 250 70 L 375 115 L 430 220 L 410 350 L 310 430 L 190 430 L 90 350 L 70 220 L 125 115 Z" />
        </defs>

        {/* Ambient Glow Disk Behind Central Core */}
        <circle cx="250" cy="250" r="90" fill="url(#centerGrad)" opacity="0.12" filter="blur(20px)" />

        {/* Perimeter Web Links */}
        <path
          d="M 250 70 L 375 115 L 430 220 L 410 350 L 310 430 L 190 430 L 90 350 L 70 220 L 125 115 Z"
          fill="none"
          stroke="rgba(120, 140, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Connecting Radial Wires */}
        <line x1="250" y1="250" x2="250" y2="70" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="375" y2="115" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="430" y2="220" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="410" y2="350" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="310" y2="430" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="190" y2="430" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="90" y2="350" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="70" y2="220" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />
        <line x1="250" y1="250" x2="125" y2="115" stroke="rgba(120, 140, 255, 0.3)" strokeWidth="1.2" />

        {/* Traveling Packet Dots along Wires */}
        <circle r="3.5" fill="#00e5ff" opacity="0.9">
          <animateMotion dur="3.2s" repeatCount="indefinite">
            <mpath href="#wire-1" />
          </animateMotion>
        </circle>
        <circle r="3" fill="#7c5cff" opacity="0.9">
          <animateMotion dur="4.5s" begin="0.8s" repeatCount="indefinite">
            <mpath href="#wire-2" />
          </animateMotion>
        </circle>
        <circle r="3.5" fill="#ff2bd6" opacity="0.9">
          <animateMotion dur="3.8s" begin="1.4s" repeatCount="indefinite">
            <mpath href="#wire-3" />
          </animateMotion>
        </circle>
        <circle r="3" fill="#00e5ff" opacity="0.9">
          <animateMotion dur="5.0s" begin="0.4s" repeatCount="indefinite">
            <mpath href="#wire-4" />
          </animateMotion>
        </circle>
        <circle r="3.5" fill="#7c5cff" opacity="0.9">
          <animateMotion dur="4.2s" begin="1.9s" repeatCount="indefinite">
            <mpath href="#wire-5" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#ff3b6b" opacity="0.95">
          <animateMotion dur="3.4s" begin="0.2s" repeatCount="indefinite">
            <mpath href="#wire-6" />
          </animateMotion>
        </circle>
        <circle r="3" fill="#ff2bd6" opacity="0.9">
          <animateMotion dur="5.5s" begin="1.1s" repeatCount="indefinite">
            <mpath href="#wire-7" />
          </animateMotion>
        </circle>
        <circle r="3.5" fill="#00e5ff" opacity="0.9">
          <animateMotion dur="4.8s" begin="0.6s" repeatCount="indefinite">
            <mpath href="#wire-8" />
          </animateMotion>
        </circle>
        <circle r="3" fill="#7c5cff" opacity="0.9">
          <animateMotion dur="3.9s" begin="1.7s" repeatCount="indefinite">
            <mpath href="#wire-9" />
          </animateMotion>
        </circle>

        {/* 9 Outer Glowing Nodes */}
        {/* Node 1: Cyan (Top) */}
        <circle cx="250" cy="70" r="14" fill="url(#nodeCyan)" />
        <circle cx="250" cy="70" r="6" fill="#00e5ff" />

        {/* Node 2: Violet (Top Right) */}
        <circle cx="375" cy="115" r="13" fill="url(#nodeViolet)" />
        <circle cx="375" cy="115" r="5" fill="#7c5cff" />

        {/* Node 3: Magenta (Right Top) */}
        <circle cx="430" cy="220" r="14" fill="url(#nodeMagenta)" />
        <circle cx="430" cy="220" r="5.5" fill="#ff2bd6" />

        {/* Node 4: Cyan (Right Bottom) */}
        <circle cx="410" cy="350" r="12" fill="url(#nodeCyan)" />
        <circle cx="410" cy="350" r="5" fill="#00e5ff" />

        {/* Node 5: Violet (Bottom Right) */}
        <circle cx="310" cy="430" r="13" fill="url(#nodeViolet)" />
        <circle cx="310" cy="430" r="5.5" fill="#7c5cff" />

        {/* Node 6: Threat Node (Bottom Left) with Red Ping Animation */}
        <g className="threat-node-group">
          <circle cx="190" cy="430" r="24" className="threat-ping-ring" />
          <circle cx="190" cy="430" r="14" className="threat-node-glow" />
          <circle cx="190" cy="430" r="6" className="threat-node-core" />
        </g>

        {/* Node 7: Magenta (Left Bottom) */}
        <circle cx="90" cy="350" r="13" fill="url(#nodeMagenta)" />
        <circle cx="90" cy="350" r="5" fill="#ff2bd6" />

        {/* Node 8: Cyan (Left Top) */}
        <circle cx="70" cy="220" r="14" fill="url(#nodeCyan)" />
        <circle cx="70" cy="220" r="6" fill="#00e5ff" />

        {/* Node 9: Violet (Top Left) */}
        <circle cx="125" cy="115" r="12" fill="url(#nodeViolet)" />
        <circle cx="125" cy="115" r="5" fill="#7c5cff" />

        {/* Central Core Pulsing Rings */}
        <circle cx="250" cy="250" r="48" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1.5" className="center-pulse-ring" />
        <circle cx="250" cy="250" r="38" fill="rgba(22, 26, 54, 0.9)" stroke="url(#centerGrad)" strokeWidth="2.5" />

        {/* Central Shield Icon */}
        <g transform="translate(235, 235)">
          <path
            d="M 15 2 L 4 7 L 4 14 C 4 21 8.7 27.5 15 29 C 21.3 27.5 26 21 26 14 L 26 7 Z"
            fill="url(#centerGrad)"
            stroke="#070812"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* Floating Threat Alert Tag */}
      <div
        className="threat-badge-tag"
        style={{
          position: 'absolute',
          bottom: '2%',
          left: '2%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: 'rgba(255, 59, 107, 0.15)',
          border: '1px solid rgba(255, 59, 107, 0.45)',
          boxShadow: '0 0 16px rgba(255, 59, 107, 0.35)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--red)',
            boxShadow: '0 0 8px var(--red)',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--red)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
          }}
        >
          SYN flood detected
        </span>
      </div>

      <style>{`
        @keyframes visualFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }

        @keyframes centerRingPulse {
          0% { r: 40px; opacity: 0.8; stroke-width: 2px; }
          100% { r: 64px; opacity: 0; stroke-width: 0.5px; }
        }

        .center-pulse-ring {
          animation: centerRingPulse 2.8s ease-out infinite;
          transform-origin: 250px 250px;
        }

        /* 8-second threat cycle: silent most of the time, then bursts red */
        @keyframes threatNodeCycle {
          0%, 65% {
            fill: #7c5cff;
            opacity: 0.7;
          }
          72%, 92% {
            fill: #ff3b6b;
            opacity: 1;
            filter: drop-shadow(0 0 12px #ff3b6b);
          }
          100% {
            fill: #7c5cff;
            opacity: 0.7;
          }
        }

        @keyframes threatRingPing {
          0%, 65% {
            r: 14px;
            opacity: 0;
            stroke: transparent;
          }
          70% {
            r: 16px;
            opacity: 0.9;
            stroke: #ff3b6b;
            stroke-width: 2px;
          }
          92% {
            r: 32px;
            opacity: 0;
            stroke: #ff3b6b;
            stroke-width: 0.5px;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes threatTagPulse {
          0%, 65% {
            opacity: 0.2;
            transform: scale(0.95);
          }
          72%, 92% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.2;
            transform: scale(0.95);
          }
        }

        .threat-node-glow {
          fill: url(#nodeViolet);
          animation: threatNodeCycle 8s infinite ease-in-out;
        }

        .threat-node-core {
          fill: #7c5cff;
          animation: threatNodeCycle 8s infinite ease-in-out;
        }

        .threat-ping-ring {
          fill: none;
          animation: threatRingPing 8s infinite ease-out;
        }

        .threat-badge-tag {
          animation: threatTagPulse 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default NetworkVisual;
