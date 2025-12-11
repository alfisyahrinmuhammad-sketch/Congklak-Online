export enum Player {
  P1 = 'P1', // Bottom Player (You)
  P2 = 'P2', // Top Player (Opponent)
}

export interface GameState {
  pits: number[]; // 0-6 (P1), 7 (P1 Store), 8-14 (P2), 15 (P2 Store)
  currentPlayer: Player;
  isGameOver: boolean;
  message: string;
  lastSeedIndex: number | null;
  isAnimating: boolean;
  hand: number; // Seeds currently in hand during animation
}

// Indices
export const P1_STORE = 7;
export const P2_STORE = 15;
export const BOARD_SIZE = 16;
export const INITIAL_SEEDS = 7;

// P1 owns indices 0-6
// P2 owns indices 8-14
export const isP1House = (index: number) => index >= 0 && index <= 6;
export const isP2House = (index: number) => index >= 8 && index <= 14;