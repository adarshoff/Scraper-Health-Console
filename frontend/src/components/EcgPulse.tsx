import React from 'react';
import { CollectorStatus } from '../types';

interface EcgPulseProps {
  status: CollectorStatus;
  className?: string;
}

export const EcgPulse: React.FC<EcgPulseProps> = ({ status, className = "h-16 w-full" }) => {
  // Define SVG wave paths based on state
  const getWavePath = () => {
    switch (status) {
      case 'healthy':
      case 'recovered':
        // Steady heartbeat pulse waveform
        return "M 0 25 L 40 25 L 45 10 L 50 40 L 55 5 L 60 45 L 65 25 L 120 25 L 125 12 L 130 38 L 135 25 L 200 25";
      case 'degraded':
      case 'heal_failed':
        // Flatline with erratic spike
        return "M 0 25 L 80 25 L 85 45 L 90 2 L 95 48 L 100 25 L 200 25";
      case 'diagnosing':
      case 'healing':
        // Scanning sine wave pattern
        return "M 0 25 Q 25 5, 50 25 T 100 25 T 150 25 T 200 25";
      default:
        return "M 0 25 L 200 25";
    }
  };

  const getColor = () => {
    switch (status) {
      case 'healthy':
        return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' };
      case 'recovered':
        return { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)' };
      case 'degraded':
        return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' };
      case 'diagnosing':
      case 'healing':
        return { stroke: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' };
      case 'heal_failed':
        return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)' };
    }
  };

  const { stroke, glow } = getColor();

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-950/60 border border-slate-800/80 p-2 ${className}`}>
      {/* Background grid line */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:10px_10px]" />

      <svg viewBox="0 0 200 50" preserveAspectRatio="none" className="w-full h-full relative z-10">
        <defs>
          <filter id={`glow-${status}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Glow shadow line */}
        <path
          d={getWavePath()}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeOpacity="0.4"
          filter={`url(#glow-${status})`}
        />

        {/* Main active line */}
        <path
          d={getWavePath()}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            status === 'healthy' || status === 'recovered'
              ? 'animate-ecg-healthy'
              : status === 'degraded' || status === 'heal_failed'
              ? 'animate-ecg-break'
              : 'animate-ecg-scan'
          }
        />
      </svg>
    </div>
  );
};
