import React, { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserMinutes } from '../../lib/supabase/updateUserMinutes';
import { useLanguage } from '../context/LanguageContext';

interface CandyCrushGameProps {
  onClose: () => void;
  onMinutesEarned?: (minutes: number) => void;
}

type CandyType = 'red' | 'yellow' | 'green' | 'blue' | 'purple';
type GameBoard = (CandyType | null)[][];

const BOARD_SIZE = 8;
const CANDY_TYPES: CandyType[] = ['red', 'yellow', 'green', 'blue', 'purple'];

const CANDY_COLORS = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500'
};

const CandyCrushGame: React.FC<CandyCrushGameProps> = ({ onClose, onMinutesEarned }) => {
  const [board, setBoard] = useState<GameBoard>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMinutesAnimation, setShowMinutesAnimation] = useState(false);
  const { language } = useLanguage();

  // Initialize board with random candies
  const initializeBoard = useCallback(() => {
    const newBoard: GameBoard = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      newBoard[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        newBoard[row][col] = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
      }
    }
    
    // Remove initial matches to ensure a playable board
    removeMatches(newBoard);
    fillEmptySpaces(newBoard);
    
    return newBoard;
  }, []);

  // Check for matches (3 or more in a row/column)
  const findMatches = (gameBoard: GameBoard): { row: number; col: number }[] => {
    const matches: { row: number; col: number }[] = [];

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      let count = 1;
      let currentCandy = gameBoard[row][0];
      
      for (let col = 1; col < BOARD_SIZE; col++) {
        if (gameBoard[row][col] === currentCandy && currentCandy !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = col - count; i < col; i++) {
              matches.push({ row, col: i });
            }
          }
          count = 1;
          currentCandy = gameBoard[row][col];
        }
      }
      
      if (count >= 3) {
        for (let i = BOARD_SIZE - count; i < BOARD_SIZE; i++) {
          matches.push({ row, col: i });
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      let count = 1;
      let currentCandy = gameBoard[0][col];
      
      for (let row = 1; row < BOARD_SIZE; row++) {
        if (gameBoard[row][col] === currentCandy && currentCandy !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = row - count; i < row; i++) {
              matches.push({ row: i, col });
            }
          }
          count = 1;
          currentCandy = gameBoard[row][col];
        }
      }
      
      if (count >= 3) {
        for (let i = BOARD_SIZE - count; i < BOARD_SIZE; i++) {
          matches.push({ row: i, col });
        }
      }
    }

    return matches;
  };

  // Remove matches and calculate minutes earned
  const removeMatches = (gameBoard: GameBoard): number => {
    const matches = findMatches(gameBoard);
    
    if (matches.length === 0) return 0;

    // Group matches by connected components to calculate minutes properly
    const matchGroups: { row: number; col: number }[][] = [];
    const visited = new Set<string>();

    matches.forEach(match => {
      const key = `${match.row}-${match.col}`;
      if (!visited.has(key)) {
        const group: { row: number; col: number }[] = [];
        const queue = [match];
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          const currentKey = `${current.row}-${current.col}`;
          
          if (visited.has(currentKey)) continue;
          visited.add(currentKey);
          group.push(current);
          
          // Find adjacent matches
          matches.forEach(m => {
            const mKey = `${m.row}-${m.col}`;
            if (!visited.has(mKey)) {
              const isAdjacent = 
                (Math.abs(m.row - current.row) === 1 && m.col === current.col) ||
                (Math.abs(m.col - current.col) === 1 && m.row === current.row);
              
              if (isAdjacent) {
                queue.push(m);
              }
            }
          });
        }
        
        if (group.length >= 3) {
          matchGroups.push(group);
        }
      }
    });

    // Calculate minutes based on match sizes
    let minutesEarned = 0;
    matchGroups.forEach(group => {
      if (group.length === 3) minutesEarned += 1;
      else if (group.length === 4) minutesEarned += 2;
      else if (group.length >= 5) minutesEarned += 3;
    });

    // Remove matched candies
    matches.forEach(match => {
      gameBoard[match.row][match.col] = null;
    });

    return minutesEarned;
  };

  // Fill empty spaces with new candies
  const fillEmptySpaces = (gameBoard: GameBoard) => {
    // Drop existing candies down
    for (let col = 0; col < BOARD_SIZE; col++) {
      let writeIndex = BOARD_SIZE - 1;
      
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (gameBoard[row][col] !== null) {
          gameBoard[writeIndex][col] = gameBoard[row][col];
          if (writeIndex !== row) {
            gameBoard[row][col] = null;
          }
          writeIndex--;
        }
      }
      
      // Fill empty spaces with new candies
      for (let row = writeIndex; row >= 0; row--) {
        gameBoard[row][col] = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
      }
    }
  };

  // Check if there are possible moves
  const hasPossibleMoves = (gameBoard: GameBoard): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Try swapping with right neighbor
        if (col < BOARD_SIZE - 1) {
          const newBoard = gameBoard.map(r => [...r]);
          [newBoard[row][col], newBoard[row][col + 1]] = [newBoard[row][col + 1], newBoard[row][col]];
          if (findMatches(newBoard).length > 0) return true;
        }
        
        // Try swapping with bottom neighbor
        if (row < BOARD_SIZE - 1) {
          const newBoard = gameBoard.map(r => [...r]);
          [newBoard[row][col], newBoard[row + 1][col]] = [newBoard[row + 1][col], newBoard[row][col]];
          if (findMatches(newBoard).length > 0) return true;
        }
      }
    }
    return false;
  };

  // Shuffle board when no moves available
  const shuffleBoard = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    toast.success(
      language === 'ar' 
        ? 'لا توجد حركات متاحة، إعادة خلط اللوحة!' 
        : 'No moves available, reshuffling!',
      { 
        icon: '🔄',
        style: {
          background: '#FF6347',
          color: '#fff'
        }
      }
    );
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (!gameStarted || isProcessing) return;

    if (!selectedCell) {
      setSelectedCell({ row, col });
    } else {
      const { row: selectedRow, col: selectedCol } = selectedCell;
      
      // Check if clicked cell is adjacent to selected cell
      const isAdjacent = 
        (Math.abs(row - selectedRow) === 1 && col === selectedCol) ||
        (Math.abs(col - selectedCol) === 1 && row === selectedRow);

      if (isAdjacent) {
        // Perform swap
        const newBoard = board.map(r => [...r]);
        [newBoard[row][col], newBoard[selectedRow][selectedCol]] = 
        [newBoard[selectedRow][selectedCol], newBoard[row][col]];

        // Check if swap creates matches
        const matchesFound = findMatches(newBoard).length > 0;
        
        if (matchesFound) {
          setIsProcessing(true);
          processMatches(newBoard);
        } else {
          // Invalid move, revert
          toast.error(
            language === 'ar' ? 'حركة غير صالحة!' : 'Invalid move!',
            { duration: 1000 }
          );
        }
      }
      
      setSelectedCell(null);
    }
  };

  // Process matches and cascading effects
  const processMatches = async (gameBoard: GameBoard) => {
    let totalMinutesEarned = 0;
    let currentBoard = gameBoard.map(r => [...r]);
    
    while (true) {
      const minutesFromMatches = removeMatches(currentBoard);
      if (minutesFromMatches === 0) break;
      
      totalMinutesEarned += minutesFromMatches;
      fillEmptySpaces(currentBoard);
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 300));
      setBoard(currentBoard.map(r => [...r]));
    }

    if (totalMinutesEarned > 0) {
      setTotalMinutes(prev => prev + totalMinutesEarned);
      
      // Show animation
      setShowMinutesAnimation(true);
      setTimeout(() => setShowMinutesAnimation(false), 1000);
      
      toast.success(
        language === 'ar' 
          ? `+${totalMinutesEarned} دقيقة!` 
          : `+${totalMinutesEarned} minutes!`,
        { 
          icon: '⭐',
          style: {
            background: '#00FFAA',
            color: '#000',
            fontWeight: 'bold'
          }
        }
      );
    }

    // Check for possible moves
    if (!hasPossibleMoves(currentBoard)) {
      setTimeout(shuffleBoard, 1000);
    }

    setIsProcessing(false);
  };

  // Start game
  const handleStartGame = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setGameStarted(true);
    setTotalMinutes(0);
    setSelectedCell(null);
    
    toast.success(
      language === 'ar' ? 'بدأت اللعبة! اجمع 3 أو أكثر من نفس اللون' : 'Game started! Match 3 or more of the same color',
      { duration: 3000 }
    );
  };

  // End game and save minutes
  const handleEndGame = async () => {
    if (totalMinutes === 0) {
      toast.info(
        language === 'ar' ? 'لم تكسب أي دقائق بعد!' : 'No minutes earned yet!'
      );
      onClose();
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await updateUserMinutes(totalMinutes);
      
      if (result.success) {
        // Update the homepage minutes display
        if (onMinutesEarned) {
          onMinutesEarned(totalMinutes);
        }
        
        toast.success(
          language === 'ar' 
            ? `🎉 تم حفظ ${totalMinutes} دقيقة بنجاح!` 
            : `🎉 ${totalMinutes} minutes saved successfully!`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Show transition effect
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error(
        language === 'ar' ? 'خطأ، حاول مرة أخرى' : 'Error, try again',
        {
          style: {
            background: '#FF6347',
            color: '#fff'
          }
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize board on component mount
  useEffect(() => {
    const initialBoard = initializeBoard();
    setBoard(initialBoard);
  }, [initializeBoard]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreenCustom border-2 border-neonGreenCustom rounded-xl p-6 w-full max-w-md relative shadow-glowCustom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className={`text-white font-bold text-2xl ${showMinutesAnimation ? 'scale-110 text-neonGreenCustom' : ''} transition-all duration-300`}>
            {language === 'ar' ? 'إجمالي الدقائق:' : 'Total Minutes:'} {totalMinutes}
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Game Board */}
        <div className="mb-6">
          <div className="grid grid-cols-8 gap-1 bg-black/30 p-2 rounded-lg border border-neonGreenCustom/30">
            {board.map((row, rowIndex) =>
              row.map((candy, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-8 h-8 rounded border-2 cursor-pointer transition-all duration-200
                    ${candy ? CANDY_COLORS[candy] : 'bg-gray-800'}
                    ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex 
                      ? 'border-white scale-110' 
                      : 'border-gray-600 hover:border-white/50'
                    }
                    ${gameStarted && !isProcessing ? 'hover:scale-105' : ''}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                />
              ))
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="space-y-3">
          {!gameStarted ? (
            <button
              onClick={handleStartGame}
              className="w-full bg-neonGreenCustom text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glowCustom text-lg"
            >
              {language === 'ar' ? 'ابدأ اللعبة' : 'Start Game'}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleEndGame}
                disabled={isProcessing}
                className="w-full bg-neonGreenCustom text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glowCustom text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (language === 'ar' ? 'إنهاء اللعبة' : 'End Game')
                }
              </button>
              
              <button
                onClick={shuffleBoard}
                disabled={isProcessing}
                className="w-full bg-transparent border border-white/30 text-white/70 py-2 rounded-lg hover:bg-white/5 transition duration-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {language === 'ar' ? 'إعادة خلط' : 'Reshuffle'}
              </button>
            </div>
          )}
        </div>

        {/* Game Instructions */}
        <div className="mt-4 text-center text-white/60 text-sm">
          {language === 'ar' 
            ? 'اجمع 3 أو أكثر من نفس اللون للحصول على الدقائق!'
            : 'Match 3 or more of the same color to earn minutes!'
          }
        </div>
      </div>
    </div>
  );
};

export default CandyCrushGame;