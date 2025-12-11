import React, { useState, useEffect, useRef } from 'react';
import { 
  GameState, 
  Player, 
  BOARD_SIZE, 
  P1_STORE, 
  P2_STORE,
  isP1House,
  isP2House
} from './types';
import { 
  createInitialBoard,
  checkGameOver, 
  collectRemainingSeeds, 
  getOppositeIndex,
  calculateLandingSpot 
} from './utils/gameLogic';
import { Pit } from './components/Pit';

// Types for Scene Management
type GameScene = 'MENU' | 'PLAYING';

// Interface for Time Logging
interface TurnLog {
  player: Player;
  duration: number; // in seconds
  timestamp: string;
}

const App: React.FC = () => {
  const [scene, setScene] = useState<GameScene>('MENU');
  
  // Game State
  const [board, setBoard] = useState<number[]>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(Player.P1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hand, setHand] = useState(0);
  const [message, setMessage] = useState("Giliran Pemain 1 (Bawah)");
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showMathTips, setShowMathTips] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5); // Turn timer state
  
  // Time Logging State
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [elapsedGameTime, setElapsedGameTime] = useState(0); // in seconds
  const [turnStartTime, setTurnStartTime] = useState<number | null>(null);
  const [turnLogs, setTurnLogs] = useState<TurnLog[]>([]);

  // Speed of animation in ms
  const DELAY = 250; 
  const turnProcessRef = useRef<boolean>(false);

  // Helper: Sleep
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Determine Rotation classes
  const isP2Turn = currentPlayer === Player.P2;
  const boardRotationClass = isP2Turn ? 'rotate-180' : 'rotate-0';
  const contentRotationClass = isP2Turn ? 'rotate-180' : 'rotate-0';

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Effect for Turn Limit (5s) AND Total Game Time
  useEffect(() => {
    if (scene !== 'PLAYING' || gameOver) return;

    // 1. Total Game Timer Interval
    const gameTimerId = setInterval(() => {
       setElapsedGameTime(prev => prev + 1);
    }, 1000);

    // 2. Turn Countdown Logic
    if (isAnimating) {
      clearInterval(gameTimerId); // Pause total timer visually if desired, but let's keep it running or pause? 
      // Usually game time includes animation. Let's keep it running.
      return () => clearInterval(gameTimerId);
    }

    if (timeLeft <= 0) {
      // Logic Time's Up / Waktu Habis
      // Log the timeout
      const duration = 5.0;
      setTurnLogs(prev => [...prev, {
        player: currentPlayer,
        duration: duration,
        timestamp: new Date().toLocaleTimeString()
      }]);

      const nextPlayer = currentPlayer === Player.P1 ? Player.P2 : Player.P1;
      setCurrentPlayer(nextPlayer);
      setMessage(`⏳ Waktu habis! Giliran ${nextPlayer === Player.P1 ? "Pemain 1" : "Pemain 2"}`);
      setTimeLeft(5); // Reset timer
      setTurnStartTime(Date.now()); // Reset think timer
      return () => clearInterval(gameTimerId);
    }

    const turnTimerId = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(turnTimerId);
      clearInterval(gameTimerId);
    };
  }, [timeLeft, scene, gameOver, isAnimating, currentPlayer]);

  const startGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer(Player.P1);
    setIsAnimating(false);
    setHand(0);
    setMessage("Giliran Pemain 1 (Bawah)");
    setLastActiveIndex(null);
    setGameOver(false);
    turnProcessRef.current = false;
    setTimeLeft(5);
    
    // Reset Time Logs
    setGameStartTime(Date.now());
    setTurnStartTime(Date.now());
    setElapsedGameTime(0);
    setTurnLogs([]);
    
    setScene('PLAYING');
  };

  const toMenu = () => {
    setScene('MENU');
  };

  // The Core Game Loop
  const handleTurn = async (startIndex: number) => {
    if (isAnimating || gameOver) return;
    
    // Validate move
    if (currentPlayer === Player.P1 && !isP1House(startIndex)) return;
    if (currentPlayer === Player.P2 && !isP2House(startIndex)) return;
    if (board[startIndex] === 0) return;

    // --- LOGGING START ---
    if (turnStartTime) {
      const now = Date.now();
      const durationMs = now - turnStartTime;
      const durationSec = durationMs / 1000;
      
      setTurnLogs(prev => [...prev, {
        player: currentPlayer,
        duration: parseFloat(durationSec.toFixed(2)),
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
    // --- LOGGING END ---

    setIsAnimating(true);
    turnProcessRef.current = true;
    
    let currentBoard = [...board];
    let seedsInHand = currentBoard[startIndex];
    
    // Pick up seeds
    currentBoard[startIndex] = 0;
    setBoard([...currentBoard]);
    setHand(seedsInHand);
    setLastActiveIndex(startIndex);
    
    setMessage(currentPlayer === Player.P1 ? "Pemain 1 menyebar biji..." : "Pemain 2 menyebar biji...");

    await sleep(DELAY);

    await sowSeeds(startIndex, seedsInHand, currentBoard);
  };

  const sowSeeds = async (startIndex: number, initialSeeds: number, boardState: number[]) => {
    let currentBoard = [...boardState];
    let seedsInHand = initialSeeds;
    let currentIndex = startIndex;

    // Sowing Loop
    while (seedsInHand > 0) {
      currentIndex = (currentIndex + 1) % BOARD_SIZE;

      // Skip opponent's store
      if (currentPlayer === Player.P1 && currentIndex === P2_STORE) continue;
      if (currentPlayer === Player.P2 && currentIndex === P1_STORE) continue;

      currentBoard[currentIndex]++;
      seedsInHand--;
      
      setBoard([...currentBoard]);
      setHand(seedsInHand);
      setLastActiveIndex(currentIndex);
      await sleep(DELAY);
    }

    // Check Landing
    const landIndex = currentIndex;
    const isOwnStore = (currentPlayer === Player.P1 && landIndex === P1_STORE) || 
                       (currentPlayer === Player.P2 && landIndex === P2_STORE);

    // CASE 1: Own Store -> Extra Turn
    if (isOwnStore) {
       if (checkGameOver(currentBoard)) {
        finishGame(currentBoard);
        return;
      }
      setMessage(`Masuk lumbung! ${currentPlayer === Player.P1 ? "Pemain 1" : "Pemain 2"} jalan lagi.`);
      setIsAnimating(false);
      turnProcessRef.current = false;
      setTimeLeft(5); // Reset timer for bonus turn
      setTurnStartTime(Date.now()); // Restart think timer for bonus turn
      return;
    }

    // CASE 2: Non-empty Pit -> Continue
    if (currentBoard[landIndex] > 1) {
       const pickedUp = currentBoard[landIndex];
       currentBoard[landIndex] = 0;
       
       setMessage("Ambil dan jalan lagi...");
       setBoard([...currentBoard]);
       setHand(pickedUp);
       await sleep(DELAY);
       
       await sowSeeds(landIndex, pickedUp, currentBoard);
       return;
    }

    // CASE 3: Empty Pit
    const isMySide = (currentPlayer === Player.P1 && isP1House(landIndex)) ||
                     (currentPlayer === Player.P2 && isP2House(landIndex));
    
    if (isMySide && currentBoard[landIndex] === 1) {
       const oppositeIndex = getOppositeIndex(landIndex);
       if (currentBoard[oppositeIndex] > 0) {
         setMessage("TEMBAK! Strategi hebat!");
         await sleep(DELAY + 200);
         const captured = currentBoard[oppositeIndex];
         const mySeed = currentBoard[landIndex];
         const storeIndex = currentPlayer === Player.P1 ? P1_STORE : P2_STORE;
         
         currentBoard[oppositeIndex] = 0;
         currentBoard[landIndex] = 0;
         currentBoard[storeIndex] += (captured + mySeed);
         setBoard([...currentBoard]);
         setLastActiveIndex(storeIndex);
         await sleep(DELAY);
       }
    }

    endTurn(currentBoard);
  };

  const endTurn = (finalBoard: number[]) => {
    if (checkGameOver(finalBoard)) {
      finishGame(finalBoard);
      return;
    }
    const nextPlayer = currentPlayer === Player.P1 ? Player.P2 : Player.P1;
    setCurrentPlayer(nextPlayer);
    setMessage(`Giliran ${nextPlayer === Player.P1 ? "Pemain 1" : "Pemain 2"}`);
    setIsAnimating(false);
    turnProcessRef.current = false;
    setTimeLeft(5); // Reset timer for new player
    setTurnStartTime(Date.now()); // Start thinking time for next player
  };

  const finishGame = (finalBoard: number[]) => {
    const finalState = collectRemainingSeeds(finalBoard);
    setBoard(finalState);
    setGameOver(true);
    setIsAnimating(false);
    turnProcessRef.current = false;
    
    const p1Score = finalState[P1_STORE];
    const p2Score = finalState[P2_STORE];
    
    if (p1Score > p2Score) setMessage("Selesai! Pemain 1 Menang!");
    else if (p2Score > p1Score) setMessage("Selesai! Pemain 2 Menang!");
    else setMessage("Selesai! Seri!");
  };

  // Logic: Prediction
  const getPredictedLanding = (idx: number) => {
    if (gameOver || isAnimating || !showMathTips) return null;
    if (board[idx] === 0) return null;
    if (currentPlayer === Player.P1 && !isP1House(idx)) return null;
    if (currentPlayer === Player.P2 && !isP2House(idx)) return null;
    return calculateLandingSpot(idx, board[idx]);
  };
  const predictedIndex = hoveredIndex !== null ? getPredictedLanding(hoveredIndex) : null;

  // Logic: Statistics Calculation
  const getStats = () => {
    const p1Turns = turnLogs.filter(l => l.player === Player.P1);
    const p2Turns = turnLogs.filter(l => l.player === Player.P2);
    
    const p1Avg = p1Turns.length > 0 
      ? (p1Turns.reduce((a, b) => a + b.duration, 0) / p1Turns.length).toFixed(2) 
      : "0";
    const p2Avg = p2Turns.length > 0 
      ? (p2Turns.reduce((a, b) => a + b.duration, 0) / p2Turns.length).toFixed(2) 
      : "0";
      
    return { p1Turns, p2Turns, p1Avg, p2Avg };
  };

  // --- RENDERERS ---

  if (scene === 'MENU') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-white">
        <div className="animate-float mb-8 text-center">
          <h1 className="text-6xl font-bold text-amber-100 drop-shadow-lg mb-2">CONGKLAK</h1>
          <p className="text-xl text-amber-200">Edisi Matematika Kelas 7</p>
        </div>

        <div className="bg-black/30 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-2xl w-full max-w-md space-y-4">
          <button 
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white rounded-xl text-xl font-bold shadow-lg transform hover:scale-105 transition-all"
          >
            Mulai Permainan
          </button>
          
          <div className="bg-white/10 rounded-xl p-4">
            <h3 className="font-bold text-amber-300 mb-2">Cara Bermain:</h3>
            <ul className="text-sm space-y-2 text-gray-200">
              <li>1. Pilih lubang kecil di sisimu untuk memindahkan biji.</li>
              <li>2. Kamu hanya punya waktu <span className="text-red-400 font-bold">5 detik</span> untuk melangkah!</li>
              <li>3. Jika biji terakhir jatuh di lumbungmu, kamu jalan lagi.</li>
              <li>4. Gunakan <span className="text-green-400 font-bold">Prediksi Matematika</span> untuk melihat posisi jatuh biji terakhir!</li>
            </ul>
          </div>

          <div className="text-center text-xs text-white/40 mt-4">
            Dibuat untuk melatih strategi & aritmatika
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {/* Header Bar */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6 px-4 gap-4">
         <div className="flex gap-2 items-center">
           <button 
             onClick={toMenu}
             className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition font-medium whitespace-nowrap"
           >
             ← Menu
           </button>
           <button 
             onClick={startGame}
             className="px-4 py-2 bg-amber-600/80 hover:bg-amber-700 text-white rounded-lg backdrop-blur-sm transition font-medium whitespace-nowrap"
             title="Mulai Ulang Permainan"
           >
             ↻ Ulangi
           </button>
           {/* Total Elapsed Time Display */}
           <div className="ml-2 px-3 py-1 bg-black/40 rounded-lg text-white font-mono text-sm border border-white/10">
             ⏱ {formatTime(elapsedGameTime)}
           </div>
         </div>
         
         <div className="flex-1 flex justify-center items-center gap-4">
           {/* Timer Badge */}
           {!gameOver && (
             <div className={`
               flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-lg font-bold text-lg transition-all
               ${timeLeft <= 2 ? 'bg-red-500 border-white text-white animate-pulse scale-110' : 'bg-white border-amber-500 text-amber-800'}
             `}>
               {timeLeft}
             </div>
           )}

           <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg flex-1 text-center max-w-md">
             <span className="text-amber-200 font-bold tracking-wide text-sm md:text-base">{message}</span>
           </div>
         </div>

         <div className="flex items-center gap-2">
            <label className="text-white text-xs md:text-sm cursor-pointer select-none flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full hover:bg-black/30 transition">
              <input 
                type="checkbox" 
                checked={showMathTips}
                onChange={(e) => setShowMathTips(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="hidden md:inline">Bantuan Math</span>
              <span className="md:hidden">?</span>
            </label>
         </div>
      </div>

      {/* Score HUD */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-8 mb-4">
        {/* P2 Score (Top) */}
        <div className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${currentPlayer === Player.P2 ? 'bg-amber-600/90 border-amber-300 shadow-amber-500/50 shadow-lg scale-105' : 'bg-white/10 border-white/10 text-white/70'}`}>
          <div className="text-sm font-bold uppercase tracking-wider text-white">Lawan (P2)</div>
          <div className="text-3xl font-mono text-white">{board[P2_STORE]}</div>
        </div>
        
        {/* P1 Score (Bottom) */}
        <div className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${currentPlayer === Player.P1 ? 'bg-amber-600/90 border-amber-300 shadow-amber-500/50 shadow-lg scale-105' : 'bg-white/10 border-white/10 text-white/70'}`}>
          <div className="text-sm font-bold uppercase tracking-wider text-white">Kamu (P1)</div>
          <div className="text-3xl font-mono text-white">{board[P1_STORE]}</div>
        </div>
      </div>

      {/* Main Board - The "GUI" Centerpiece */}
      {/* Applied rotation class based on current player */}
      <div className={`board-shape p-8 md:p-12 w-full max-w-6xl relative transition-transform duration-1000 ease-in-out ${boardRotationClass}`}>
        
        {/* Hand Indicator */}
        {hand > 0 && (
          <div 
            className="fixed z-50 pointer-events-none transition-all duration-100 ease-linear"
            style={{ 
              top: '50%', 
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Counter-rotate the hand content so numbers stay upright */}
            <div className={`bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-xl ring-4 ring-white animate-bounce transition-transform duration-1000 ${contentRotationClass}`}>
              {hand}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-6">
          {/* P2 Store - We wrap in a div to apply counter-rotation to content */}
          <div className={`transition-transform duration-1000 ${contentRotationClass}`}>
            <Pit 
              index={P2_STORE} 
              count={board[P2_STORE]} 
              isStore 
              isTopPlayer 
              highlight={lastActiveIndex === P2_STORE}
            />
          </div>

          <div className="flex flex-col gap-10 flex-1">
            {/* P2 Row */}
            <div className="flex justify-between px-2 gap-2">
               {[14, 13, 12, 11, 10, 9, 8].map(idx => (
                 <div 
                    key={idx} 
                    onMouseEnter={() => setHoveredIndex(idx)} 
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`transition-transform duration-1000 ${contentRotationClass}`}
                 >
                  <Pit 
                    index={idx}
                    count={board[idx]}
                    isTopPlayer
                    disabled={currentPlayer !== Player.P2 || isAnimating || gameOver}
                    onClick={() => handleTurn(idx)}
                    highlight={lastActiveIndex === idx}
                    prediction={predictedIndex === idx}
                  />
                 </div>
               ))}
            </div>

            {/* P1 Row */}
            <div className="flex justify-between px-2 gap-2">
               {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                 <div 
                    key={idx} 
                    onMouseEnter={() => setHoveredIndex(idx)} 
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`transition-transform duration-1000 ${contentRotationClass}`}
                 >
                  <Pit 
                    index={idx}
                    count={board[idx]}
                    disabled={currentPlayer !== Player.P1 || isAnimating || gameOver}
                    onClick={() => handleTurn(idx)}
                    highlight={lastActiveIndex === idx}
                    prediction={predictedIndex === idx}
                  />
                 </div>
               ))}
            </div>
          </div>

          {/* P1 Store */}
          <div className={`transition-transform duration-1000 ${contentRotationClass}`}>
            <Pit 
              index={P1_STORE} 
              count={board[P1_STORE]} 
              isStore 
              highlight={lastActiveIndex === P1_STORE}
            />
          </div>
        </div>
      </div>

      {/* Game Over Modal with Stats */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full transform animate-float my-8">
              <h2 className="text-3xl font-bold text-center text-amber-800 mb-6">Laporan Permainan</h2>
              
              {/* Winner Announcement */}
              <div className="text-center mb-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-lg font-semibold text-gray-600 mb-2">Pemenang:</div>
                <div className="text-4xl font-bold text-amber-600">
                  {board[P1_STORE] > board[P2_STORE] ? "Pemain 1" : board[P2_STORE] > board[P1_STORE] ? "Pemain 2" : "Seri"}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                   Skor: {board[P1_STORE]} - {board[P2_STORE]}
                </div>
              </div>

              {/* Stats Table */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-bold text-blue-800 mb-2">⏱ Waktu</h3>
                  <div className="space-y-1 text-sm text-blue-900">
                    <div className="flex justify-between">
                      <span>Total Durasi:</span>
                      <span className="font-mono font-bold">{formatTime(elapsedGameTime)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-bold text-green-800 mb-2">🧠 Rata-rata Berpikir</h3>
                  <div className="space-y-1 text-sm text-green-900">
                    <div className="flex justify-between">
                      <span>Pemain 1:</span>
                      <span className="font-mono font-bold">{stats.p1Avg} detik</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pemain 2:</span>
                      <span className="font-mono font-bold">{stats.p2Avg} detik</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log History (Scrollable) */}
              <div className="bg-gray-100 rounded-xl p-4 mb-6">
                 <h3 className="font-bold text-gray-700 mb-2 text-sm">Riwayat Langkah (5 Terakhir)</h3>
                 <div className="overflow-y-auto max-h-32 text-xs space-y-1 font-mono">
                    {turnLogs.slice(-5).reverse().map((log, i) => (
                       <div key={i} className={`flex justify-between p-2 rounded ${log.player === Player.P1 ? 'bg-white' : 'bg-gray-200'}`}>
                          <span>{log.player === Player.P1 ? 'P1' : 'P2'}</span>
                          <span>{log.duration} detik</span>
                       </div>
                    ))}
                    {turnLogs.length > 5 && <div className="text-center text-gray-400 italic pt-2">... {turnLogs.length - 5} langkah sebelumnya</div>}
                 </div>
              </div>

              <div className="flex gap-4">
                <button onClick={toMenu} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition">Menu Utama</button>
                <button onClick={startGame} className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition">Main Lagi</button>
              </div>
           </div>
        </div>
      )}
      
      {/* Footer tips */}
      {!gameOver && showMathTips && (
        <div className="mt-8 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full text-amber-900 shadow-lg text-sm font-medium border border-amber-200">
          💡 Tips: Arahkan kursor ke lubang untuk melihat prediksi jatuhnya biji terakhir (Konsep Modulo)
        </div>
      )}

    </div>
  );
};

export default App;