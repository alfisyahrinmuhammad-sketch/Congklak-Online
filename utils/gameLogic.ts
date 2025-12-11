import { BOARD_SIZE, P1_STORE, P2_STORE, isP1House, isP2House, INITIAL_SEEDS, Player } from '../types';

export const createInitialBoard = (): number[] => {
  const board = new Array(BOARD_SIZE).fill(INITIAL_SEEDS);
  board[P1_STORE] = 0;
  board[P2_STORE] = 0;
  return board;
};

// Calculate where a move would end (simple prediction without chaining)
// Returns the index where the last seed lands
export const calculateLandingSpot = (startIndex: number, seedCount: number): number => {
  let current = startIndex;
  let remaining = seedCount;
  
  // Simulation loop
  while (remaining > 0) {
    current = (current + 1) % BOARD_SIZE;
    
    // Skip opponent's store
    // If we are simulating for P1, skip P2_STORE
    // This function assumes P1 logic for simplicity in the UI hover hint for P1
    if (startIndex <= 6 && current === P2_STORE) continue;
    if (startIndex >= 8 && startIndex <= 14 && current === P1_STORE) continue;

    remaining--;
  }
  return current;
};

export const checkGameOver = (pits: number[]): boolean => {
  const p1Empty = pits.slice(0, 7).every(p => p === 0);
  const p2Empty = pits.slice(8, 15).every(p => p === 0);
  return p1Empty || p2Empty;
};

export const collectRemainingSeeds = (pits: number[]): number[] => {
  const newPits = [...pits];
  let p1Sum = 0;
  let p2Sum = 0;

  for (let i = 0; i < 7; i++) {
    p1Sum += newPits[i];
    newPits[i] = 0;
  }
  for (let i = 8; i < 15; i++) {
    p2Sum += newPits[i];
    newPits[i] = 0;
  }

  newPits[P1_STORE] += p1Sum;
  newPits[P2_STORE] += p2Sum;
  return newPits;
};

export const getOppositeIndex = (index: number): number => {
  // Map 0->14, 1->13, etc.
  return 14 - index;
};