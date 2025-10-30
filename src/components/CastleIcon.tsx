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

  const getColorScheme = (color: PlayerColor) => {
    switch (color) {
      case 'red':
        return {
          main: '#dc2626',
          light: '#ef4444',
          dark: '#991b1b',
          shadow: '#7f1d1d'
        };
      case 'blue':
        return {
          main: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
          shadow: '#1e3a8a'
        };
      case 'yellow':
        return {
          main: '#ca8a04',
          light: '#eab308',
          dark: '#a16207',
          shadow: '#854d0e'
        };
      case 'green':
        return {
          main: '#16a34a',
          light: '#22c55e',
          dark: '#15803d',
          shadow: '#166534'
        };
    }
  };

  const renderCastle = () => {
    const colors = getColorScheme(color);
    
    switch (rank) {
      case 1:
        // Single tower castle with 3D effect
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], className)}>
            <defs>
              <linearGradient id={`grad1-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.light} />
                <stop offset="50%" stopColor={colors.main} />
                <stop offset="100%" stopColor={colors.dark} />
              </linearGradient>
              <linearGradient id={`shadow1-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.dark} />
                <stop offset="100%" stopColor={colors.shadow} />
              </linearGradient>
            </defs>
            
            {/* Shadow base */}
            <rect x="9" y="26" width="24" height="12" fill={colors.shadow} rx="1"/>
            
            {/* Main base */}
            <rect x="8" y="25" width="24" height="12" fill={`url(#grad1-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Shadow tower */}
            <rect x="16" y="9" width="10" height="20" fill={colors.shadow} rx="1"/>
            
            {/* Main tower */}
            <rect x="15" y="8" width="10" height="20" fill={`url(#grad1-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Tower crenellations with 3D effect */}
            <rect x="15" y="8" width="2" height="3" fill={colors.light} stroke={colors.dark} strokeWidth="0.3"/>
            <rect x="19" y="8" width="2" height="3" fill={colors.light} stroke={colors.dark} strokeWidth="0.3"/>
            <rect x="23" y="8" width="2" height="3" fill={colors.light} stroke={colors.dark} strokeWidth="0.3"/>
            
            {/* Windows */}
            <rect x="18" y="12" width="2" height="3" fill={colors.shadow} rx="0.5"/>
            <rect x="18" y="17" width="2" height="3" fill={colors.shadow} rx="0.5"/>
            
            {/* Door with arch */}
            <path d="M18 30 Q20 28 22 30 L22 36 L18 36 Z" fill={colors.shadow} stroke={colors.dark} strokeWidth="0.3"/>
            
            {/* Rank number with glow effect */}
            <circle cx="20" cy="22" r="3" fill="rgba(255,255,255,0.9)" stroke={colors.dark} strokeWidth="0.5"/>
            <text x="20" y="24" textAnchor="middle" className="text-xs font-bold" fill={colors.dark}>1</text>
          </svg>
        );
      
      case 2:
        // Twin tower castle with 3D effect
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], className)}>
            <defs>
              <linearGradient id={`grad2-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.light} />
                <stop offset="50%" stopColor={colors.main} />
                <stop offset="100%" stopColor={colors.dark} />
              </linearGradient>
            </defs>
            
            {/* Shadow base */}
            <rect x="5" y="26" width="30" height="12" fill={colors.shadow} rx="1"/>
            
            {/* Main base */}
            <rect x="4" y="25" width="30" height="12" fill={`url(#grad2-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Shadow towers */}
            <rect x="7" y="11" width="8" height="18" fill={colors.shadow} rx="1"/>
            <rect x="25" y="11" width="8" height="18" fill={colors.shadow} rx="1"/>
            
            {/* Left tower */}
            <rect x="6" y="10" width="8" height="18" fill={`url(#grad2-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Right tower */}
            <rect x="24" y="10" width="8" height="18" fill={`url(#grad2-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Crenellations */}
            <rect x="6" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="9" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="11.5" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="24" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="27" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="29.5" y="10" width="1.5" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            {/* Windows */}
            <rect x="8" y="14" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            <rect x="26" y="14" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            
            {/* Central connecting wall */}
            <rect x="14" y="20" width="10" height="8" fill={`url(#grad2-${color})`} stroke={colors.dark} strokeWidth="0.3" rx="0.5"/>
            
            {/* Door */}
            <path d="M18 30 Q20 28 22 30 L22 36 L18 36 Z" fill={colors.shadow} stroke={colors.dark} strokeWidth="0.3"/>
            
            {/* Rank number */}
            <circle cx="20" cy="22" r="3" fill="rgba(255,255,255,0.9)" stroke={colors.dark} strokeWidth="0.5"/>
            <text x="20" y="24" textAnchor="middle" className="text-xs font-bold" fill={colors.dark}>2</text>
          </svg>
        );
      
      case 3:
        // Triple tower castle with tall center tower
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], className)}>
            <defs>
              <linearGradient id={`grad3-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.light} />
                <stop offset="50%" stopColor={colors.main} />
                <stop offset="100%" stopColor={colors.dark} />
              </linearGradient>
            </defs>
            
            {/* Shadow base */}
            <rect x="3" y="26" width="34" height="12" fill={colors.shadow} rx="1"/>
            
            {/* Main base */}
            <rect x="2" y="25" width="34" height="12" fill={`url(#grad3-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Shadow towers */}
            <rect x="5" y="13" width="7" height="16" fill={colors.shadow} rx="1"/>
            <rect x="16.5" y="6" width="7" height="23" fill={colors.shadow} rx="1"/>
            <rect x="28" y="13" width="7" height="16" fill={colors.shadow} rx="1"/>
            
            {/* Left tower */}
            <rect x="4" y="12" width="7" height="16" fill={`url(#grad3-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Center tower (tallest) */}
            <rect x="15.5" y="5" width="7" height="23" fill={`url(#grad3-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Right tower */}
            <rect x="27" y="12" width="7" height="16" fill={`url(#grad3-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Crenellations */}
            <rect x="4" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="6.5" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="9" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            <rect x="15.5" y="5" width="1.2" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="18" y="5" width="1.2" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="20.5" y="5" width="1.2" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            <rect x="27" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="29.5" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="32" y="12" width="1.2" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            {/* Windows */}
            <rect x="6" y="16" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            <rect x="17.5" y="10" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            <rect x="17.5" y="15" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            <rect x="29" y="16" width="1.5" height="2" fill={colors.shadow} rx="0.3"/>
            
            {/* Door */}
            <path d="M18 30 Q20 28 22 30 L22 36 L18 36 Z" fill={colors.shadow} stroke={colors.dark} strokeWidth="0.3"/>
            
            {/* Rank number */}
            <circle cx="20" cy="22" r="3" fill="rgba(255,255,255,0.9)" stroke={colors.dark} strokeWidth="0.5"/>
            <text x="20" y="24" textAnchor="middle" className="text-xs font-bold" fill={colors.dark}>3</text>
          </svg>
        );
      
      case 4:
        // Grand four-tower castle
        return (
          <svg viewBox="0 0 40 40" className={cn(sizeClasses[size], className)}>
            <defs>
              <linearGradient id={`grad4-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.light} />
                <stop offset="50%" stopColor={colors.main} />
                <stop offset="100%" stopColor={colors.dark} />
              </linearGradient>
            </defs>
            
            {/* Shadow base */}
            <rect x="1" y="26" width="38" height="12" fill={colors.shadow} rx="1"/>
            
            {/* Main base */}
            <rect x="0" y="25" width="38" height="12" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Shadow towers */}
            <rect x="3" y="15" width="6" height="14" fill={colors.shadow} rx="1"/>
            <rect x="11" y="8" width="6" height="21" fill={colors.shadow} rx="1"/>
            <rect x="23" y="8" width="6" height="21" fill={colors.shadow} rx="1"/>
            <rect x="31" y="15" width="6" height="14" fill={colors.shadow} rx="1"/>
            
            {/* Four towers with varying heights */}
            <rect x="2" y="14" width="6" height="14" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            <rect x="10" y="7" width="6" height="21" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            <rect x="22" y="7" width="6" height="21" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            <rect x="30" y="14" width="6" height="14" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.5" rx="1"/>
            
            {/* Crenellations on all towers */}
            <rect x="2" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="4" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="6" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            <rect x="10" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="12.5" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="15" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            <rect x="22" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="24.5" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="27" y="7" width="1" height="2" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            <rect x="30" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="32.5" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            <rect x="35" y="14" width="1" height="1.5" fill={colors.light} stroke={colors.dark} strokeWidth="0.2"/>
            
            {/* Windows on towers */}
            <rect x="4" y="18" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            <rect x="12" y="12" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            <rect x="12" y="17" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            <rect x="24" y="12" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            <rect x="24" y="17" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            <rect x="32" y="18" width="1.2" height="1.5" fill={colors.shadow} rx="0.3"/>
            
            {/* Central connecting walls */}
            <rect x="16" y="20" width="6" height="8" fill={`url(#grad4-${color})`} stroke={colors.dark} strokeWidth="0.3" rx="0.5"/>
            
            {/* Grand entrance */}
            <path d="M17 30 Q20 27 23 30 L23 36 L17 36 Z" fill={colors.shadow} stroke={colors.dark} strokeWidth="0.3"/>
            
            {/* Rank number */}
            <circle cx="20" cy="22" r="3.5" fill="rgba(255,255,255,0.9)" stroke={colors.dark} strokeWidth="0.5"/>
            <text x="20" y="24.5" textAnchor="middle" className="text-xs font-bold" fill={colors.dark}>4</text>
          </svg>
        );
      
      default:
        return null;
    }
  };

  return renderCastle();
};

export default CastleIcon;