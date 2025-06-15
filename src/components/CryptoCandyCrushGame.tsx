import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserMinutes } from '../../lib/supabase/updateUserMinutes';
import { useLanguage } from '../context/LanguageContext';

interface CryptoCandyCrushGameProps {
  onClose: () => void;
  onMinutesEarned?: (minutes: number) => void;
}

type CryptoType = 'bitcoin' | 'ethereum' | 'tether' | 'bnb' | 'cardano' | 'ton' | 'solana' | 'dogecoin' | 'lyra';
type GameBoard = (CryptoType | null)[][];

interface CryptoLogo {
  id: CryptoType;
  name: string;
  imagePath: string;
  effectClass: string;
  isSpecial?: boolean;
}

const BOARD_SIZE = 8;

const CRYPTO_LOGOS: CryptoLogo[] = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    imagePath: '/icons/bitcoin-btc-logo.png',
    effectClass: 'btc-glow'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    imagePath: '/icons/ethereum-eth-logo.png',
    effectClass: 'eth-rotate'
  },
  {
    id: 'tether',
    name: 'Tether',
    imagePath: '/icons/tether-usdt-logo.png',
    effectClass: 'usdt-pulse'
  },
  {
    id: 'bnb',
    name: 'BNB',
    imagePath: '/icons/bnb-bnb-logo.png',
    effectClass: 'bnb-shake'
  },
  {
    id: 'cardano',
    name: 'Cardano',
    imagePath: '/icons/cardano-ada-logo.png',
    effectClass: 'ada-lines'
  },
  {
    id: 'ton',
    name: 'TON',
    imagePath: '/icons/toncoin-ton-logo.png',
    effectClass: 'ton-diamond'
  },
  {
    id: 'solana',
    name: 'Solana',
    imagePath: '/icons/solana-sol-logo.png',
    effectClass: 'sol-dynamic'
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    imagePath: '/icons/dogecoin-doge-logo.png',
    effectClass: 'doge-bounce'
  },
  {
    id: 'lyra',
    name: 'LYRA COIN',
    imagePath: '/publiclogo.png',
    effectClass: 'lyra-special',
    isSpecial: true
  }
];

// Regular crypto types (excluding LYRA)
const REGULAR_CRYPTO_TYPES = CRYPTO_LOGOS.filter(logo => !logo.isSpecial).map(logo => logo.id);

const CryptoCandyCrushGame: React.FC<CryptoCandyCrushGameProps> = ({ onClose, onMinutesEarned }) => {
  const [board, setBoard] = useState<GameBoard>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMinutesAnimation, setShowMinutesAnimation] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ row: number; col: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchingCells, setMatchingCells] = useState<Set<string>>(new Set());
  const [specialEffectCells, setSpecialEffectCells] = useState<Set<string>>(new Set());
  const { language } = useLanguage();

  // Sound refs
  const swooshSoundRef = useRef<HTMLAudioElement | null>(null);
  const chimeSoundRef = useRef<HTMLAudioElement | null>(null);
  const celebratorySoundRef = useRef<HTMLAudioElement | null>(null);
  const buzzSoundRef = useRef<HTMLAudioElement | null>(null);
  const boomSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sound effects
  useEffect(() => {
    if (typeof Audio !== 'undefined') {
      swooshSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      chimeSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      celebratorySoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      buzzSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      boomSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    }
  }, []);

  // Sound playing functions
  const playSound = (soundRef: React.RefObject<HTMLAudioElement>) => {
    if (soundEnabled && soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
    }
  };

  const playSwooshSound = () => playSound(swooshSoundRef);
  const playChimeSound = () => playSound(chimeSoundRef);
  const playCelebratorySound = () => playSound(celebratorySoundRef);
  const playBuzzSound = () => playSound(buzzSoundRef);
  const playBoomSound = () => playSound(boomSoundRef);

  // Initialize board with random crypto logos
  const initializeBoard = useCallback(() => {
    const newBoard: GameBoard = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      newBoard[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Only use regular crypto types for initial board
        const randomCrypto = REGULAR_CRYPTO_TYPES[Math.floor(Math.random() * REGULAR_CRYPTO_TYPES.length)];
        newBoard[row][col] = randomCrypto;
      }
    }
    
    // Remove initial matches to ensure a playable board
    removeMatches(newBoard);
    fillEmptySpaces(newBoard);
    
    return newBoard;
  }, []);

  // Create LYRA special square after 4+ matches
  const createLyraSpecial = (gameBoard: GameBoard, matchCount: number) => {
    if (matchCount >= 4) {
      // Find a random position to place LYRA special
      const emptyCells: { row: number; col: number }[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (gameBoard[row][col] === null) {
            emptyCells.push({ row, col });
          }
        }
      }
      
      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        gameBoard[randomCell.row][randomCell.col] = 'lyra';
        
        toast.success(
          language === 'ar' 
            ? '🌟 ظهر مربع LYRA COIN الخاص!' 
            : '🌟 LYRA COIN special square appeared!',
          { 
            duration: 2000,
            style: {
              background: '#FFD700',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      }
    }
  };

  // Handle LYRA special effects
  const handleLyraSpecialEffects = (gameBoard: GameBoard, matches: { row: number; col: number }[]): number => {
    let bonusMinutes = 0;
    const lyraMatches = matches.filter(match => gameBoard[match.row][match.col] === 'lyra');
    
    if (lyraMatches.length === 0) return bonusMinutes;

    // Group LYRA matches by direction
    const horizontalLyraMatches: { row: number; col: number }[] = [];
    const verticalLyraMatches: { row: number; col: number }[] = [];
    
    lyraMatches.forEach(match => {
      // Check if this LYRA is part of a horizontal match
      let horizontalCount = 1;
      for (let col = match.col - 1; col >= 0 && gameBoard[match.row][col] === 'lyra'; col--) {
        horizontalCount++;
      }
      for (let col = match.col + 1; col < BOARD_SIZE && gameBoard[match.row][col] === 'lyra'; col++) {
        horizontalCount++;
      }
      
      // Check if this LYRA is part of a vertical match
      let verticalCount = 1;
      for (let row = match.row - 1; row >= 0 && gameBoard[row][match.col] === 'lyra'; row--) {
        verticalCount++;
      }
      for (let row = match.row + 1; row < BOARD_SIZE && gameBoard[row][match.col] === 'lyra'; row++) {
        verticalCount++;
      }
      
      if (horizontalCount >= 3) {
        horizontalLyraMatches.push(match);
      }
      if (verticalCount >= 3) {
        verticalLyraMatches.push(match);
      }
    });

    // Handle horizontal LYRA matches - clear entire row
    horizontalLyraMatches.forEach(match => {
      playBoomSound();
      const affectedCells = new Set<string>();
      
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (gameBoard[match.row][col] !== null) {
          gameBoard[match.row][col] = null;
          affectedCells.add(`${match.row}-${col}`);
        }
      }
      
      setSpecialEffectCells(prev => new Set([...prev, ...affectedCells]));
      bonusMinutes += 200; // 200 minutes for row clearance
      
      toast.success(
        language === 'ar' 
          ? '💥 LYRA COIN مسح الصف بالكامل! +200 دقيقة!' 
          : '💥 LYRA COIN cleared entire row! +200 minutes!',
        { 
          duration: 3000,
          style: {
            background: '#FF6B35',
            color: '#fff',
            fontWeight: 'bold'
          }
        }
      );
    });

    // Handle vertical LYRA matches - 3x3 explosion
    verticalLyraMatches.forEach(match => {
      playBoomSound();
      const affectedCells = new Set<string>();
      
      // Clear 3x3 area around the match
      for (let row = Math.max(0, match.row - 1); row <= Math.min(BOARD_SIZE - 1, match.row + 1); row++) {
        for (let col = Math.max(0, match.col - 1); col <= Math.min(BOARD_SIZE - 1, match.col + 1); col++) {
          if (gameBoard[row][col] !== null) {
            gameBoard[row][col] = null;
            affectedCells.add(`${row}-${col}`);
          }
        }
      }
      
      setSpecialEffectCells(prev => new Set([...prev, ...affectedCells]));
      bonusMinutes += 300; // 300 minutes for 3x3 explosion
      
      toast.success(
        language === 'ar' 
          ? '💥 LYRA COIN انفجار 3x3! +300 دقيقة!' 
          : '💥 LYRA COIN 3x3 explosion! +300 minutes!',
        { 
          duration: 3000,
          style: {
            background: '#8A2BE2',
            color: '#fff',
            fontWeight: 'bold'
          }
        }
      );
    });

    // Clear special effect cells after animation
    setTimeout(() => {
      setSpecialEffectCells(new Set());
    }, 1000);

    return bonusMinutes;
  };

  // Check for matches (3 or more in a row/column)
  const findMatches = (gameBoard: GameBoard): { row: number; col: number }[] => {
    const matches: { row: number; col: number }[] = [];

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      let count = 1;
      let currentCrypto = gameBoard[row][0];
      
      for (let col = 1; col < BOARD_SIZE; col++) {
        if (gameBoard[row][col] === currentCrypto && currentCrypto !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = col - count; i < col; i++) {
              matches.push({ row, col: i });
            }
          }
          count = 1;
          currentCrypto = gameBoard[row][col];
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
      let currentCrypto = gameBoard[0][col];
      
      for (let row = 1; row < BOARD_SIZE; row++) {
        if (gameBoard[row][col] === currentCrypto && currentCrypto !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = row - count; i < row; i++) {
              matches.push({ row: i, col });
            }
          }
          count = 1;
          currentCrypto = gameBoard[row][col];
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

    // Handle LYRA special effects first
    const lyraBonus = handleLyraSpecialEffects(gameBoard, matches);

    // Set matching cells for animation
    const matchSet = new Set(matches.map(m => `${m.row}-${m.col}`));
    setMatchingCells(matchSet);

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
      if (group.length === 3) minutesEarned += 50; // Increased base points
      else if (group.length === 4) minutesEarned += 100;
      else if (group.length >= 5) minutesEarned += 150;
      
      // Create LYRA special for 4+ matches
      if (group.length >= 4) {
        createLyraSpecial(gameBoard, group.length);
      }
    });

    // Add LYRA bonus
    minutesEarned += lyraBonus;

    // Remove matched crypto logos after a delay for animation
    setTimeout(() => {
      matches.forEach(match => {
        if (gameBoard[match.row] && gameBoard[match.row][match.col] !== null) {
          gameBoard[match.row][match.col] = null;
        }
      });
      setMatchingCells(new Set());
    }, 500);

    return minutesEarned;
  };

  // Fill empty spaces with new crypto logos
  const fillEmptySpaces = (gameBoard: GameBoard) => {
    // Drop existing crypto logos down
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
      
      // Fill empty spaces with new crypto logos (only regular types)
      for (let row = writeIndex; row >= 0; row--) {
        const randomCrypto = REGULAR_CRYPTO_TYPES[Math.floor(Math.random() * REGULAR_CRYPTO_TYPES.length)];
        gameBoard[row][col] = randomCrypto;
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    if (!gameStarted || isProcessing) return;
    
    setDraggedItem({ row, col });
    playSwooshSound();
    
    // Add visual feedback
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${row}-${col}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    
    if (!draggedItem || !gameStarted || isProcessing) return;

    const { row: sourceRow, col: sourceCol } = draggedItem;
    
    // Check if target is adjacent to source
    const isAdjacent = 
      (Math.abs(targetRow - sourceRow) === 1 && targetCol === sourceCol) ||
      (Math.abs(targetCol - sourceCol) === 1 && targetRow === sourceRow);

    if (isAdjacent && (sourceRow !== targetRow || sourceCol !== targetCol)) {
      // Perform swap
      const newBoard = board.map(r => [...r]);
      [newBoard[targetRow][targetCol], newBoard[sourceRow][sourceCol]] = 
      [newBoard[sourceRow][sourceCol], newBoard[targetRow][targetCol]];

      // Check if swap creates matches
      const matchesFound = findMatches(newBoard).length > 0;
      
      if (matchesFound) {
        playChimeSound();
        setIsProcessing(true);
        processMatches(newBoard);
      } else {
        playBuzzSound();
        toast.error(
          language === 'ar' ? 'حركة غير صالحة!' : 'Invalid move!',
          { duration: 1000 }
        );
      }
    } else {
      playBuzzSound();
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Process matches and cascading effects
  const processMatches = async (gameBoard: GameBoard) => {
    let totalMinutesEarned = 0;
    let currentBoard = gameBoard.map(r => [...r]);
    
    while (true) {
      const minutesFromMatches = removeMatches(currentBoard);
      if (minutesFromMatches === 0) break;
      
      totalMinutesEarned += minutesFromMatches;
      
      // Play celebratory sound for matches
      playCelebratorySound();
      
      // Wait for match animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      fillEmptySpaces(currentBoard);
      setBoard(currentBoard.map(r => [...r]));
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 300));
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
    setDraggedItem(null);
    
    toast.success(
      language === 'ar' ? 'بدأت اللعبة! اسحب وأفلت لتجميع 3 أو أكثر من نفس العملة' : 'Game started! Drag and drop to match 3 or more of the same crypto!',
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

  // Get crypto logo info
  const getCryptoLogo = (cryptoType: CryptoType | null) => {
    if (!cryptoType) return null;
    return CRYPTO_LOGOS.find(logo => logo.id === cryptoType);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-glow blockchain-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className={`text-white font-bold text-2xl ${showMinutesAnimation ? 'scale-110 text-neonGreen score-animation' : ''} transition-all duration-300`}>
            {language === 'ar' ? 'إجمالي الدقائق:' : 'Total Minutes:'} {totalMinutes}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white/60 hover:text-white transition"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Game Board */}
        <div className="mb-6">
          <div className="grid grid-cols-8 gap-1 bg-black/30 p-2 rounded-lg border border-neonGreen/30">
            {board.map((row, rowIndex) =>
              row.map((crypto, colIndex) => {
                const cryptoLogo = getCryptoLogo(crypto);
                const cellKey = `${rowIndex}-${colIndex}`;
                const isMatching = matchingCells.has(cellKey);
                const isSpecialEffect = specialEffectCells.has(cellKey);
                const isDragging = draggedItem?.row === rowIndex && draggedItem?.col === colIndex;
                const isLyra = crypto === 'lyra';
                
                return (
                  <div
                    key={cellKey}
                    className={`
                      w-8 h-8 rounded border-2 cursor-pointer transition-all duration-200 relative
                      ${crypto ? 'bg-white/10' : 'bg-gray-800'}
                      ${isDragging ? 'border-white scale-110 z-10' : 'border-gray-600 hover:border-white/50'}
                      ${isLyra ? 'border-yellow-400 bg-yellow-400/20' : ''}
                      ${gameStarted && !isProcessing ? 'hover:scale-105' : ''}
                      ${isMatching ? 'match-explosion' : ''}
                      ${isSpecialEffect ? 'lyra-explosion' : ''}
                    `}
                    draggable={gameStarted && !isProcessing && crypto !== null}
                    onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onDragEnd={handleDragEnd}
                  >
                    {cryptoLogo && (
                      <img
                        src={cryptoLogo.imagePath}
                        alt={cryptoLogo.name}
                        className={`
                          w-full h-full object-contain p-0.5 rounded
                          ${cryptoLogo.effectClass}
                          ${isDragging ? 'dragging-effect' : ''}
                          ${isMatching ? 'matching-effect' : ''}
                          ${isLyra ? 'lyra-glow' : ''}
                        `}
                        draggable={false}
                      />
                    )}
                    {isLyra && (
                      <div className="absolute inset-0 rounded border-2 border-yellow-400 animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="space-y-3">
          {!gameStarted ? (
            <button
              onClick={handleStartGame}
              className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glow text-lg"
            >
              {language === 'ar' ? 'ابدأ اللعبة' : 'Start Game'}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleEndGame}
                disabled={isProcessing}
                className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glow text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-4 text-center text-white/60 text-sm space-y-2">
          <p>
            {language === 'ar' 
              ? 'اسحب وأفلت لتجميع 3 أو أكثر من نفس العملة الرقمية!'
              : 'Drag and drop to match 3 or more of the same cryptocurrency!'
            }
          </p>
          <p className="text-yellow-400 font-semibold">
            {language === 'ar' 
              ? '🌟 LYRA COIN: أفقي = مسح الصف، عمودي = انفجار 3x3'
              : '🌟 LYRA COIN: Horizontal = Row Clear, Vertical = 3x3 Explosion'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default CryptoCandyCrushGame;