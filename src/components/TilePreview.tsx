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
      "w-16 h-16 flex flex-col items-center justify-center rounded text-center text-xs font-semibold",
      tile.type === 'resource' && "bg-green-200 text-green-800",
      tile.type === 'hazard' && "bg-red-200 text-red-800",
      tile.type === 'mountain' && "bg-gray-400 text-white",
      tile.type === 'dragon' && "bg-purple-500 text-white",
      tile.type === 'goldmine' && "bg-yellow-400 text-yellow-900",
      tile.type === 'wizard' && "bg-indigo-400 text-white",
      className
    )}>
      <div className="leading-tight">
        {tile.name}
      </div>
      {tile.value !== 0 && (
        <div className="text-xs font-bold">
          {tile.value > 0 ? '+' : ''}{tile.value}
        </div>
      )}
    </div>
  );
};

export default TilePreview;