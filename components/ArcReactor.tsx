import React from 'react';

interface ArcReactorProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ isActive, volume }) => {
  // Enhance the volume for visual effect
  const scale = 1 + volume * 0.5;
  const glowOpacity = 0.5 + volume * 0.5;
  
  // Color states
  const coreColor = isActive ? 'bg-cyan-400' : 'bg-slate-700';
  const ringColor = isActive ? 'border-cyan-500' : 'border-slate-700';
  const glowColor = isActive ? 'shadow-[0_0_50px_#22d3ee]' : 'shadow-none';

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      {/* Outer Ring - Rotating Slow */}
      <div className={`absolute w-full h-full rounded-full border-4 ${ringColor} border-dashed opacity-30 animate-spin-slow`}></div>
      
      {/* Middle Ring - Rotating Reverse */}
      <div className={`absolute w-3/4 h-3/4 rounded-full border-2 ${ringColor} border-dotted opacity-50 animate-spin-reverse`}></div>
      
      {/* Inner Ring - Static or Pulsing */}
      <div 
        className={`absolute w-1/2 h-1/2 rounded-full border-8 ${ringColor} opacity-80 transition-all duration-75 ease-out`}
        style={{ transform: `scale(${scale})` }}
      ></div>
      
      {/* Core */}
      <div 
        className={`relative w-1/4 h-1/4 rounded-full ${coreColor} ${glowColor} transition-all duration-75`}
        style={{ 
            opacity: glowOpacity,
            boxShadow: isActive ? `0 0 ${30 + volume * 100}px ${volume * 20}px #06b6d4` : 'none'
        }}
      >
        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse-fast"></div>
      </div>

      {/* Decorative HUD Lines */}
      <div className="absolute w-[120%] h-[1px] bg-cyan-900/50 rotate-0"></div>
      <div className="absolute w-[120%] h-[1px] bg-cyan-900/50 rotate-90"></div>
      <div className="absolute w-[120%] h-[1px] bg-cyan-900/50 rotate-45 opacity-30"></div>
      <div className="absolute w-[120%] h-[1px] bg-cyan-900/50 -rotate-45 opacity-30"></div>
    </div>
  );
};
