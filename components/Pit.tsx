import React from 'react';

interface PitProps {
  count: number;
  index: number;
  onClick?: () => void;
  isStore?: boolean;
  disabled?: boolean;
  isTopPlayer?: boolean; // For visual orientation
  highlight?: boolean;
  prediction?: boolean;
}

export const Pit: React.FC<PitProps> = ({ 
  count, 
  index, 
  onClick, 
  isStore = false, 
  disabled = false, 
  isTopPlayer = false,
  highlight = false,
  prediction = false
}) => {
  
  // Generate random positions for seeds to make it look organic
  const seeds = React.useMemo(() => {
    return Array.from({ length: Math.min(count, 50) }).map((_, i) => ({
      left: Math.random() * 60 + 20 + '%',
      top: Math.random() * 60 + 20 + '%',
      rotation: Math.random() * 360,
      color: ['#FDE047', '#FBBF24', '#D97706', '#FFFBEB'][i % 4] // Gold/Shell variations
    }));
  }, [count]);

  const baseClasses = `
    relative flex items-center justify-center transition-all duration-300
    ${isStore ? 'w-24 h-48 rounded-full' : 'w-16 h-16 rounded-full'}
    ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white'}
    ${highlight ? 'ring-4 ring-yellow-400 bg-black/40' : 'bg-black/30'}
    ${prediction ? 'ring-2 ring-dashed ring-green-400' : ''}
    pit-shadow border-2 border-white/10
  `;

  return (
    <div className="flex flex-col items-center gap-1 relative group">
      {/* Seed Counter Badge */}
      <div className={`
        absolute z-10 font-bold text-white text-xs px-2 py-0.5 rounded-full bg-black/50 shadow-sm
        ${isStore ? 'top-4' : isTopPlayer ? '-top-3' : '-bottom-3'}
        transition-all
      `}>
        {count}
      </div>

      <button 
        className={baseClasses}
        onClick={onClick}
        disabled={disabled}
        aria-label={`Lubang index ${index} dengan ${count} biji`}
      >
        {seeds.map((seed, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full seed border-[0.5px] border-black/20"
            style={{
              left: seed.left,
              top: seed.top,
              backgroundColor: seed.color,
              transform: `translate(-50%, -50%) rotate(${seed.rotation}deg)`,
            }}
          />
        ))}
      </button>
      
      {/* Tooltip for index/math help */}
      {!isStore && (
        <span className={`text-[10px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity absolute ${isTopPlayer ? '-top-8' : '-bottom-8'}`}>
           Idx: {index}
        </span>
      )}
    </div>
  );
};