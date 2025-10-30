import React from 'react';
import { PlayerColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface CastleIconProps {
  rank: 1 | 2 | 3 | 4;
  color: PlayerColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CastleIcon: React.FC<CastleIconProps> = ({ rank, color, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600'
  };

  const renderCastle = () => {
    const baseColor = colorClasses[color];
    const strokeColor = color === 'yellow' ? 'stroke-yellow-800' : 'stroke-gray-800';
    
    switch (rank) {
      case 1:
        // Single tower castle
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], baseColor, className)}>
            {/* Base */}
            <rect x="8" y="25" width="24" height="12" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Main tower */}
            <rect x="15" y="8" width="10" height="20" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Tower top crenellations */}
            <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
            <rect x="19" y="8" width="2" height="3" fill="currentColor"/>
            <rect x="23" y="8" width="2" height="3" fill="currentColor"/>
            {/* Door */}
            <rect x="18" y="30" width="4" height="6" fill="white" className={strokeColor} strokeWidth="0.5"/>
            {/* Number */}
            <text x="20" y="22" textAnchor="middle" className="text-xs font-bold fill-white">1</text>
          </svg>
        );
      
      case 2:
        // Two tower castle
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], baseColor, className)}>
            {/* Base */}
            <rect x="6" y="25" width="28" height="12" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Left tower */}
            <rect x="8" y="10" width="8" height="18" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Right tower */}
            <rect x="24" y="10" width="8" height="18" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Tower top crenellations */}
            <rect x="8" y="10" width="2" height="2" fill="currentColor"/>
            <rect x="12" y="10" width="2" height="2" fill="currentColor"/>
            <rect x="24" y="10" width="2" height="2" fill="currentColor"/>
            <rect x="28" y="10" width="2" height="2" fill="currentColor"/>
            {/* Door */}
            <rect x="18" y="30" width="4" height="6" fill="white" className={strokeColor} strokeWidth="0.5"/>
            {/* Number */}
            <text x="20" y="22" textAnchor="middle" className="text-xs font-bold fill-white">2</text>
          </svg>
        );
      
      case 3:
        // Three tower castle
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], baseColor, className)}>
            {/* Base */}
            <rect x="4" y="25" width="32" height="12" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Left tower */}
            <rect x="6" y="12" width="7" height="16" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Center tower (taller) */}
            <rect x="16.5" y="8" width="7" height="20" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Right tower */}
            <rect x="27" y="12" width="7" height="16" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Tower top crenellations */}
            <rect x="6" y="12" width="1.5" height="2" fill="currentColor"/>
            <rect x="9" y="12" width="1.5" height="2" fill="currentColor"/>
            <rect x="16.5" y="8" width="1.5" height="2" fill="currentColor"/>
            <rect x="20" y="8" width="1.5" height="2" fill="currentColor"/>
            <rect x="27" y="12" width="1.5" height="2" fill="currentColor"/>
            <rect x="30" y="12" width="1.5" height="2" fill="currentColor"/>
            {/* Door */}
            <rect x="18" y="30" width="4" height="6" fill="white" className={strokeColor} strokeWidth="0.5"/>
            {/* Number */}
            <text x="20" y="22" textAnchor="middle" className="text-xs font-bold fill-white">3</text>
          </svg>
        );
      
      case 4:
        // Four tower castle (grand castle)
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], baseColor, className)}>
            {/* Base */}
            <rect x="2" y="25" width="36" height="12" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Four towers */}
            <rect x="4" y="14" width="6" height="14" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            <rect x="12" y="10" width="6" height="18" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            <rect x="22" y="10" width="6" height="18" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            <rect x="30" y="14" width="6" height="14" fill="currentColor" className={strokeColor} strokeWidth="1"/>
            {/* Tower top crenellations */}
            <rect x="4" y="14" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="7" y="14" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="12" y="10" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="15" y="10" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="22" y="10" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="25" y="10" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="30" y="14" width="1.2" height="1.5" fill="currentColor"/>
            <rect x="33" y="14" width="1.2" height="1.5" fill="currentColor"/>
            {/* Door */}
            <rect x="18" y="30" width="4" height="6" fill="white" className={strokeColor} strokeWidth="0.5"/>
            {/* Number */}
            <text x="20" y="22" textAnchor="middle" className="text-xs font-bold fill-white">4</text>
          </svg>
        );
      
      default:
        return null;
    }
  };

  return renderCastle();
};

export default CastleIcon;