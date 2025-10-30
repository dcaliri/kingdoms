import { GameState, Player, Castle, Tile, PlayerColor } from '@/types/game';

export const BOARD_ROWS = 5;
export const BOARD_COLS = 6;

export const createInitialTiles = (): Tile[] => {
  const tiles: Tile[] = [];
  
  // Resource tiles (12 tiles)
  // 2 tiles with value 1
  tiles.push(
    { id: 'resource-1-1', type: 'resource', value: 1, imagePath: '/tiles/1.png' },
    { id: 'resource-1-2', type: 'resource', value: 1, imagePath: '/tiles/1-2.png' }
  );
  // 2 tiles with value 2
  tiles.push(
    { id: 'resource-2-1', type: 'resource', value: 2, imagePath: '/tiles/2.png' },
    { id: 'resource-2-2', type: 'resource', value: 2, imagePath: '/tiles/2-2.png' }
  );
  // 2 tiles with value 3
  tiles.push(
    { id: 'resource-3-1', type: 'resource', value: 3, imagePath: '/tiles/3.png' },
    { id: 'resource-3-2', type: 'resource', value: 3, imagePath: '/tiles/3-2.png' }
  );
  // 2 tiles with value 4
  tiles.push(
    { id: 'resource-4-1', type: 'resource', value: 4, imagePath: '/tiles/4.png' },
    { id: 'resource-4-2', type: 'resource', value: 4, imagePath: '/tiles/4-2.png' }
  );
  // 2 tiles with value 5
  tiles.push(
    { id: 'resource-5-1', type: 'resource', value: 5, imagePath: '/tiles/5.png' },
    { id: 'resource-5-2', type: 'resource', value: 5, imagePath: '/tiles/5-2.png' }
  );
  // 2 tiles with value 6
  tiles.push(
    { id: 'resource-6-1', type: 'resource', value: 6, imagePath: '/tiles/6.png' },
    { id: 'resource-6-2', type: 'resource', value: 6, imagePath: '/tiles/6-2.png' }
  );
  
  // Hazard tiles (6 tiles)
  tiles.push(
    { id: 'hazard--1', type: 'hazard', value: -1, imagePath: '/tiles/h1.png' },
    { id: 'hazard--2', type: 'hazard', value: -2, imagePath: '/tiles/h2.png' },
    { id: 'hazard--3', type: 'hazard', value: -3, imagePath: '/tiles/h3.png' },
    { id: 'hazard--4', type: 'hazard', value: -4, imagePath: '/tiles/h4.png' },
    { id: 'hazard--5', type: 'hazard', value: -5, imagePath: '/tiles/h5.png' },
    { id: 'hazard--6', type: 'hazard', value: -6, imagePath: '/tiles/h6.png' }
  );
  
  // Special tiles
  tiles.push(
    { id: 'mountain-1', type: 'mountain', value: 0, imagePath: '/tiles/mountain.png' },
    { id: 'mountain-2', type: 'mountain', value: 0, imagePath: '/tiles/mountain.png' },
    { id: 'dragon', type: 'dragon', value: 0, imagePath: '/tiles/dragon.png' },
    { id: 'goldmine', type: 'goldmine', value: 0, imagePath: '/tiles/goldmine.png' },
    { id: 'wizard', type: 'wizard', value: 0, imagePath: '/tiles/wizard.png' }
  );
  
  return tiles;
};

export const createInitialCastles = (color: PlayerColor, playerCount: number): Castle[] => {
  const castles: Castle[] = [];
  
  // Rank 1 castles based on player count
  const rank1Count = playerCount === 2 ? 4 : playerCount === 3 ? 3 : 2;
  for (let i = 0; i < rank1Count; i++) {
    castles.push({
      id: `${color}-rank1-${i}`,
      rank: 1,
      color
    });
  }
  
  // Rank 2, 3, 4 castles (always all of them)
  for (let i = 0; i < 3; i++) {
    castles.push({
      id: `${color}-rank2-${i}`,
      rank: 2,
      color
    });
  }
  
  for (let i = 0; i < 2; i++) {
    castles.push({
      id: `${color}-rank3-${i}`,
      rank: 3,
      color
    });
  }
  
  castles.push({
    id: `${color}-rank4-0`,
    rank: 4,
    color
  });
  
  return castles;
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const isValidPosition = (row: number, col: number, board: (Castle | Tile | null)[][]): boolean => {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS && board[row][col] === null;
};

export const canPlayerAct = (player: Player, gameState: GameState): boolean => {
  // Can place castle if has castles and empty spaces exist
  const hasAvailableCastles = player.castles.some(castle => !castle.position);
  const hasEmptySpaces = gameState.board.some(row => row.some(cell => cell === null));
  
  if (hasAvailableCastles && hasEmptySpaces) return true;
  
  // Can draw tile if tiles available and empty spaces exist
  if (gameState.tileSupply.length > 0 && hasEmptySpaces) return true;
  
  // Can place starting tile if has one and empty spaces exist
  if (player.startingTile && hasEmptySpaces) return true;
  
  return false;
};

export const calculateScore = (gameState: GameState): { [playerId: string]: number } => {
  console.log('=== CALCULATING SCORES ===');
  console.log('Board state:', gameState.board);
  console.log('Players:', gameState.players.map(p => ({ name: p.name, id: p.id, color: p.color })));
  
  const scores: { [playerId: string]: number } = {};
  
  // Create color to player ID mapping
  const colorToPlayerId: { [color: string]: string } = {};
  gameState.players.forEach(player => {
    scores[player.id] = 0;
    colorToPlayerId[player.color] = player.id;
    console.log(`Initialized ${player.name} (${player.id}, ${player.color}) score to 0`);
  });
  
  console.log('Color to Player ID mapping:', colorToPlayerId);
  
  // Score each row
  console.log('=== SCORING ROWS ===');
  for (let row = 0; row < BOARD_ROWS; row++) {
    console.log(`Scoring row ${row}:`, gameState.board[row]);
    const rowScores = calculateRowScore(gameState.board, row, colorToPlayerId);
    console.log(`Row ${row} scores:`, rowScores);
    Object.entries(rowScores).forEach(([playerId, score]) => {
      scores[playerId] += score;
      const player = gameState.players.find(p => p.id === playerId);
      console.log(`Added ${score} to ${player?.name || playerId}, new total: ${scores[playerId]}`);
    });
  }
  
  // Score each column
  console.log('=== SCORING COLUMNS ===');
  for (let col = 0; col < BOARD_COLS; col++) {
    const colCells = gameState.board.map(row => row[col]);
    console.log(`Scoring column ${col}:`, colCells);
    const colScores = calculateColumnScore(gameState.board, col, colorToPlayerId);
    console.log(`Column ${col} scores:`, colScores);
    Object.entries(colScores).forEach(([playerId, score]) => {
      scores[playerId] += score;
      const player = gameState.players.find(p => p.id === playerId);
      console.log(`Added ${score} to ${player?.name || playerId}, new total: ${scores[playerId]}`);
    });
  }
  
  console.log('=== FINAL SCORES ===');
  Object.entries(scores).forEach(([playerId, score]) => {
    const player = gameState.players.find(p => p.id === playerId);
    console.log(`${player?.name || playerId}: ${score} points`);
  });
  
  return scores;
};

const calculateRowScore = (board: (Castle | Tile | null)[][], row: number, colorToPlayerId: { [color: string]: string }): { [playerId: string]: number } => {
  const scores: { [playerId: string]: number } = {};
  const rowCells = board[row];
  
  console.log(`  Calculating row ${row} score for cells:`, rowCells);
  
  // Find mountains to split the row
  const mountainIndices = rowCells
    .map((cell, index) => cell && 'type' in cell && cell.type === 'mountain' ? index : -1)
    .filter(index => index !== -1);
  
  console.log(`  Mountains in row ${row} at indices:`, mountainIndices);
  
  if (mountainIndices.length === 0) {
    // Score entire row
    const segmentScores = calculateSegmentScore(rowCells, board, row, 'row', colorToPlayerId);
    console.log(`  Row ${row} segment scores:`, segmentScores);
    return segmentScores;
  } else {
    // Score segments separated by mountains
    const segments: { cells: (Castle | Tile | null)[], startIndex: number }[] = [];
    let start = 0;
    
    mountainIndices.forEach(mountainIndex => {
      if (start < mountainIndex) {
        segments.push({
          cells: rowCells.slice(start, mountainIndex),
          startIndex: start
        });
      }
      start = mountainIndex + 1;
    });
    
    if (start < rowCells.length) {
      segments.push({
        cells: rowCells.slice(start),
        startIndex: start
      });
    }
    
    console.log(`  Row ${row} segments:`, segments);
    
    segments.forEach((segment, segIndex) => {
      const segmentScores = calculateSegmentScore(segment.cells, board, row, 'row', colorToPlayerId, segment.startIndex);
      console.log(`  Row ${row} segment ${segIndex} scores:`, segmentScores);
      Object.entries(segmentScores).forEach(([playerId, score]) => {
        scores[playerId] = (scores[playerId] || 0) + score;
      });
    });
    
    return scores;
  }
};

const calculateColumnScore = (board: (Castle | Tile | null)[][], col: number, colorToPlayerId: { [color: string]: string }): { [playerId: string]: number } => {
  const scores: { [playerId: string]: number } = {};
  const colCells = board.map(row => row[col]);
  
  console.log(`  Calculating column ${col} score for cells:`, colCells);
  
  // Find mountains to split the column
  const mountainIndices = colCells
    .map((cell, index) => cell && 'type' in cell && cell.type === 'mountain' ? index : -1)
    .filter(index => index !== -1);
  
  console.log(`  Mountains in column ${col} at indices:`, mountainIndices);
  
  if (mountainIndices.length === 0) {
    // Score entire column
    const segmentScores = calculateSegmentScore(colCells, board, col, 'column', colorToPlayerId);
    console.log(`  Column ${col} segment scores:`, segmentScores);
    return segmentScores;
  } else {
    // Score segments separated by mountains
    const segments: { cells: (Castle | Tile | null)[], startIndex: number }[] = [];
    let start = 0;
    
    mountainIndices.forEach(mountainIndex => {
      if (start < mountainIndex) {
        segments.push({
          cells: colCells.slice(start, mountainIndex),
          startIndex: start
        });
      }
      start = mountainIndex + 1;
    });
    
    if (start < colCells.length) {
      segments.push({
        cells: colCells.slice(start),
        startIndex: start
      });
    }
    
    console.log(`  Column ${col} segments:`, segments);
    
    segments.forEach((segment, segIndex) => {
      const segmentScores = calculateSegmentScore(segment.cells, board, col, 'column', colorToPlayerId, segment.startIndex);
      console.log(`  Column ${col} segment ${segIndex} scores:`, segmentScores);
      Object.entries(segmentScores).forEach(([playerId, score]) => {
        scores[playerId] = (scores[playerId] || 0) + score;
      });
    });
    
    return scores;
  }
};

const calculateSegmentScore = (
  segment: (Castle | Tile | null)[], 
  board: (Castle | Tile | null)[][], 
  lineIndex: number, 
  lineType: 'row' | 'column',
  colorToPlayerId: { [color: string]: string },
  segmentStartIndex: number = 0
): { [playerId: string]: number } => {
  const scores: { [playerId: string]: number } = {};
  
  console.log(`    Calculating segment score for ${lineType} ${lineIndex}:`, segment);
  
  // Check for dragon - cancels all resource tiles
  const hasDragon = segment.some(cell => cell && 'type' in cell && cell.type === 'dragon');
  console.log(`    Has dragon: ${hasDragon}`);
  
  // Check for gold mine - doubles all tile values
  const hasGoldMine = segment.some(cell => cell && 'type' in cell && cell.type === 'goldmine');
  console.log(`    Has gold mine: ${hasGoldMine}`);
  
  // Calculate base value from tiles
  let baseValue = 0;
  segment.forEach((cell, index) => {
    if (cell && 'type' in cell) {
      const tile = cell as Tile;
      if (tile.type === 'resource' && !hasDragon) {
        baseValue += tile.value;
        console.log(`    Added resource tile (value +${tile.value}), base value now: ${baseValue}`);
      } else if (tile.type === 'hazard') {
        baseValue += tile.value; // hazard values are negative
        console.log(`    Added hazard tile (value ${tile.value}), base value now: ${baseValue}`);
      } else if (tile.type === 'resource' && hasDragon) {
        console.log(`    Resource tile (value +${tile.value}) cancelled by dragon`);
      }
    }
  });
  
  // Apply gold mine doubling
  if (hasGoldMine) {
    baseValue *= 2;
    console.log(`    Gold mine doubled base value to: ${baseValue}`);
  }
  
  console.log(`    Final base value for segment: ${baseValue}`);
  
  // Calculate castle ranks for each player
  const playerCastleRanks: { [playerId: string]: number } = {};
  
  segment.forEach((cell, segmentIndex) => {
    if (cell && 'rank' in cell) {
      const castle = cell as Castle;
      let effectiveRank = castle.rank;
      
      // Check for wizard bonus (orthogonally adjacent)
      const actualIndex = segmentStartIndex + segmentIndex;
      const row = lineType === 'row' ? lineIndex : actualIndex;
      const col = lineType === 'row' ? actualIndex : lineIndex;
      
      console.log(`    Checking wizard bonus for castle at (${row}, ${col})`);
      if (isAdjacentToWizard(board, row, col)) {
        effectiveRank += 1;
        console.log(`    Castle at (${row}, ${col}) gets wizard bonus, rank ${castle.rank} -> ${effectiveRank}`);
      }
      
      // Convert color to player ID
      const playerId = colorToPlayerId[castle.color];
      if (playerId) {
        playerCastleRanks[playerId] = (playerCastleRanks[playerId] || 0) + effectiveRank;
        console.log(`    Added castle rank ${effectiveRank} for player ${playerId} (color: ${castle.color}), total rank: ${playerCastleRanks[playerId]}`);
      } else {
        console.error(`    Could not find player ID for castle color: ${castle.color}`);
      }
    }
  });
  
  // Calculate final scores
  Object.entries(playerCastleRanks).forEach(([playerId, totalRank]) => {
    const finalScore = baseValue * totalRank;
    scores[playerId] = finalScore;
    console.log(`    Player ${playerId}: ${baseValue} × ${totalRank} = ${finalScore} points`);
  });
  
  return scores;
};

const isAdjacentToWizard = (board: (Castle | Tile | null)[][], row: number, col: number): boolean => {
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
  ];
  
  console.log(`      Checking wizard adjacency for position (${row}, ${col})`);
  
  const isAdjacent = directions.some(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    
    if (newRow >= 0 && newRow < BOARD_ROWS && newCol >= 0 && newCol < BOARD_COLS) {
      const cell = board[newRow][newCol];
      const hasWizard = cell && 'type' in cell && (cell as Tile).type === 'wizard';
      if (hasWizard) {
        console.log(`      Found wizard at adjacent position (${newRow}, ${newCol})`);
      }
      return hasWizard;
    }
    
    return false;
  });
  
  console.log(`      Wizard adjacent: ${isAdjacent}`);
  return isAdjacent;
};