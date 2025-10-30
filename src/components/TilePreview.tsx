import React from 'react';
import { Tile } from '@/types/game';
import { cn } from '@/lib/utils';

interface TilePreviewProps {
  tile: Tile;
  className?: string;
}

const TilePreview: React.FC<TilePreviewProps> = ({ tile, className }) => {
  return (
    <div className={cn(
      "w-16 h-16 flex flex-col items-center justify-center rounded text-center text-xs font-semibold relative overflow-hidden",
      tile.type === 'resource' && "bg-green-200",
      tile.type === 'hazard' && "bg-red-200",
      tile.type === 'mountain' && "bg-gray-400",
      tile.type === 'dragon' && "bg-purple-500",
      tile.type === 'goldmine' && "bg-yellow-400",
      tile.type === 'wizard' && "bg-indigo-400",
      className
    )}>
      <img 
        src={tile.imagePath} 
        alt={`Tile value ${tile.value}`}
        className="w-full h-full object-cover"
      />
      {tile.value !== 0 && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 text-xs font-bold py-0.5",
          tile.type === 'resource' && "bg-green-800/80 text-white",
          tile.type === 'hazard' && "bg-red-800/80 text-white"
        )}>
          {tile.value > 0 ? '+' : ''}{tile.value}
        </div>
      )}
    </div>
  );
};

export default TilePreview;