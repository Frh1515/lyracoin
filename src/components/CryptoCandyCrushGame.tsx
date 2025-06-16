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
  isSpecial?: boolean;
}

const BOARD_SIZE = 8;

const CRYPTO_LOGOS: CryptoLogo[] = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    imagePath: '/icons/bitcoin-btc-logo.png'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    imagePath: '/icons/ethereum-eth-logo.png'
  },
  {
    id: 'tether',
    name: 'Tether',
    imagePath: '/icons/tether-usdt-logo.png'
  },
  {
    id: 'bnb',
    name: 'BNB',
    imagePath: '/icons/bnb-bnb-logo.png'
  },
  {
    id: 'cardano',
    name: 'Cardano',
    imagePath: '/icons/cardano-ada-logo.png'
  },
  {
    id: 'ton',
    name: 'TON',
    imagePath: '/icons/toncoin-ton-logo.png'
  },
  {
    id: 'solana',
    name: 'Solana',
    imagePath: '/icons/solana-sol-logo.png'
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    imagePath: '/icons/dogecoin-doge-logo.png'
  },
  {
    id: 'lyra',
    name: 'LYRA COIN',
    imagePath: '/publiclogo.png',
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
  const [lyraUsed, setLyraUsed] = useState(false);
  
  // Touch handling states
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchCurrentCell, setTouchCurrentCell] = useState<{ row: number; col: number } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  
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

  // Initialize board with random crypto logos and place LYRA COIN at start
  const initializeBoard = useCallback(() => {
    const newBoard: GameBoard = [];
    
    // First, fill the board with regular crypto types
    for (let row = 0; row < BOARD_SIZE; row++) {
      newBoard[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const randomCrypto = REGULAR_CRYPTO_TYPES[Math.floor(Math.random() * REGULAR_CRYPTO_TYPES.length)];
        newBoard[row][col] = randomCrypto;
      }
    }
    
    // Remove any initial matches to ensure a stable board
    let hasMatches = true;
    while (hasMatches) {
      const matches = findMatches(newBoard);
      if (matches.length === 0) {
        hasMatches = false;
      } else {
        // Replace matched cells with new random crypto types
        matches.forEach(match => {
          newBoard[match.row][match.col] = REGULAR_CRYPTO_TYPES[Math.floor(Math.random() * REGULAR_CRYPTO_TYPES.length)];
        });
      }
    }
    
    // Now place one LYRA COIN at a random position
    const randomRow = Math.floor(Math.random() * BOARD_SIZE);
    const randomCol = Math.floor(Math.random() * BOARD_SIZE);
    newBoard[randomRow][randomCol] = 'lyra';
    
    // Check if placing LYRA creates immediate matches, if so, move it
    let attempts = 0;
    while (attempts < 10) {
      const matches = findMatches(newBoard);
      const lyraMatches = matches.filter(match => newBoard[match.row][match.col] === 'lyra');
      
      if (lyraMatches.length === 0) {
        break; // LYRA is in a safe position
      }
      
      // Move LYRA to a different position
      newBoard[randomRow][randomCol] = REGULAR_CRYPTO_TYPES[Math.floor(Math.random() * REGULAR_CRYPTO_TYPES.length)];
      const newRow = Math.floor(Math.random() * BOARD_SIZE);
      const newCol = Math.floor(Math.random() * BOARD_SIZE);
      newBoard[newRow][newCol] = 'lyra';
      attempts++;
    }
    
    return newBoard;
  }, []);

  // Clear all matching crypto types when LYRA is swapped
  const clearAllMatchingCrypto = (gameBoard: GameBoard, cryptoTypeToClear: CryptoType): number => {
    let clearedCount = 0;
    const affectedCells = new Set<string>();
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (gameBoard[row][col] === cryptoTypeToClear) {
          gameBoard[row][col] = null;
          affectedCells.add(`${row}-${col}`);
          clearedCount++;
        }
      }
    }
    
    // Add visual effect for cleared cells
    setSpecialEffectCells(prev => new Set([...prev, ...affectedCells]));
    
    // Clear special effect cells after animation
    setTimeout(() => {
      setSpecialEffectCells(new Set());
    }, 1000);
    
    return clearedCount * 10; // 10 minutes per cleared crypto (reduced from 100)
  };

  // Create LYRA special square after 4+ matches
  const createLyraSpecial = (gameBoard: GameBoard, matchCount: number) => {
    if (matchCount >= 4 && !lyraUsed) {
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

    // Calculate minutes based on match sizes (reduced to one-tenth)
    let minutesEarned = 0;
    matchGroups.forEach(group => {
      if (group.length === 3) minutesEarned += 5; // Reduced from 50 to 5
      else if (group.length === 4) minutesEarned += 10; // Reduced from 100 to 10
      else if (group.length >= 5) minutesEarned += 15; // Reduced from 150 to 15
      
      // Create LYRA special for 4+ matches (only if LYRA hasn't been used)
      if (group.length >= 4 && !lyraUsed) {
        createLyraSpecial(gameBoard, group.length);
      }
    });

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
    setLyraUsed(false); // Reset LYRA usage when reshuffling
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

  // Unified swap function for both mouse and touch
  const performSwap = (sourceRow: number, sourceCol: number, targetRow: number, targetCol: number) => {
    // Check if target is adjacent to source
    const isAdjacent = 
      (Math.abs(targetRow - sourceRow) === 1 && targetCol === sourceCol) ||
      (Math.abs(targetCol - sourceCol) === 1 && targetRow === sourceRow);

    if (isAdjacent && (sourceRow !== targetRow || sourceCol !== targetCol)) {
      // Store original crypto types before swap
      const sourceCrypto = board[sourceRow][sourceCol];
      const targetCrypto = board[targetRow][targetCol];
      
      // Check if LYRA COIN is involved in the swap
      const isLyraSwap = sourceCrypto === 'lyra' || targetCrypto === 'lyra';
      
      if (isLyraSwap && !lyraUsed) {
        // LYRA COIN special interaction - clear all matching crypto
        const lyraEffectTargetCrypto = sourceCrypto === 'lyra' ? targetCrypto : sourceCrypto;
        
        if (lyraEffectTargetCrypto && lyraEffectTargetCrypto !== 'lyra') {
          playBoomSound();
          setIsProcessing(true);
          setLyraUsed(true); // Mark LYRA as used
          
          // Create a copy of the board for the special effect
          const newBoard = board.map(r => [...r]);
          
          // Remove LYRA from the board (single use)
          if (sourceCrypto === 'lyra') {
            newBoard[sourceRow][sourceCol] = null;
          } else {
            newBoard[targetRow][targetCol] = null;
          }
          
          // Clear all instances of the target crypto type
          const lyraBonus = clearAllMatchingCrypto(newBoard, lyraEffectTargetCrypto);
          
          toast.success(
            language === 'ar'
              ? `💥 LYRA COIN مسح جميع ${lyraEffectTargetCrypto}! +${lyraBonus} دقيقة!`
              : `💥 LYRA COIN cleared all ${lyraEffectTargetCrypto}! +${lyraBonus} minutes!`,
            { 
              duration: 3000,
              style: {
                background: '#FFD700',
                color: '#000',
                fontWeight: 'bold'
              }
            }
          );
          
          // Update total minutes
          setTotalMinutes(prev => prev + lyraBonus);
          
          // Show animation
          setShowMinutesAnimation(true);
          setTimeout(() => setShowMinutesAnimation(false), 1000);
          
          // Wait for special effect animation, then fill empty spaces
          setTimeout(() => {
            fillEmptySpaces(newBoard);
            setBoard(newBoard);
            
            // Check for possible moves after the effect
            setTimeout(() => {
              if (!hasPossibleMoves(newBoard)) {
                shuffleBoard();
              }
              setIsProcessing(false);
            }, 500);
          }, 1000);
          
        } else {
          playBuzzSound();
          toast.error(
            language === 'ar' ? 'لا يمكن تبديل LYRA مع LYRA!' : 'Cannot swap LYRA with LYRA!',
            { duration: 1000 }
          );
        }
      } else if (isLyraSwap && lyraUsed) {
        // LYRA has already been used
        playBuzzSound();
        toast.error(
          language === 'ar' ? 'تم استخدام LYRA COIN بالفعل!' : 'LYRA COIN already used!',
          { duration: 1000 }
        );
      } else {
        // Normal swap logic
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
      }
    } else {
      playBuzzSound();
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (!gameStarted || isProcessing) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedItem({ row, col });
    setTouchCurrentCell({ row, col });
    setIsTouchDragging(false);
    playSwooshSound();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedItem || !gameStarted || isProcessing) return;
    
    e.preventDefault();
    setIsTouchDragging(true);
    
    const touch = e.touches[0];
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementUnderTouch) {
      const row = elementUnderTouch.getAttribute('data-row');
      const col = elementUnderTouch.getAttribute('data-col');
      
      if (row !== null && col !== null) {
        const newRow = parseInt(row);
        const newCol = parseInt(col);
        
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
          setTouchCurrentCell({ row: newRow, col: newCol });
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedItem || !gameStarted || isProcessing) return;
    
    e.preventDefault();
    
    if (isTouchDragging && touchCurrentCell && draggedItem) {
      const { row: sourceRow, col: sourceCol } = draggedItem;
      const { row: targetRow, col: targetCol } = touchCurrentCell;
      
      if (sourceRow !== targetRow || sourceCol !== targetCol) {
        performSwap(sourceRow, sourceCol, targetRow, targetCol);
      }
    }
    
    // Reset touch states
    setDraggedItem(null);
    setTouchStartPos(null);
    setTouchCurrentCell(null);
    setIsTouchDragging(false);
  };

  // Drag and drop handlers (for desktop)
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
    performSwap(sourceRow, sourceCol, targetRow, targetCol);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Process matches and cascading effects
  const processMatches = async (gameBoard: GameBoard) => {
    let totalMinutesEarned = 0;
    let currentBoard = gameBoard.map(r => [...r]);
    
    // Continue with normal match processing
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
    setLyraUsed(false); // Reset LYRA usage
    
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-3 w-full h-full max-w-lg max-h-screen relative shadow-glow overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`text-white font-bold text-lg ${showMinutesAnimation ? 'scale-110 text-neonGreen' : ''} transition-all duration-300`}>
            {language === 'ar' ? 'الدقائق:' : 'Minutes:'} {totalMinutes}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white/60 hover:text-white transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LYRA Status Indicator */}
        {gameStarted && (
          <div className="mb-3 text-center">
            <div className={`inline-block px-3 py-1 rounded-lg font-semibold text-xs ${
              lyraUsed 
                ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                : 'bg-yellow-400/20 border border-yellow-400/30 text-yellow-400'
            }`}>
              {language === 'ar' 
                ? (lyraUsed ? '❌ تم استخدام LYRA' : '⭐ LYRA متاح')
                : (lyraUsed ? '❌ LYRA Used' : '⭐ LYRA Available')
              }
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="mb-4 flex justify-center">
          <div className="grid grid-cols-8 gap-0.5 bg-black/30 p-1 rounded-lg border border-neonGreen/30">
            {board.map((row, rowIndex) =>
              row.map((crypto, colIndex) => {
                const cryptoLogo = getCryptoLogo(crypto);
                const cellKey = `${rowIndex}-${colIndex}`;
                const isMatching = matchingCells.has(cellKey);
                const isDragging = draggedItem?.row === rowIndex && draggedItem?.col === colIndex;
                const isDropTarget = touchCurrentCell?.row === rowIndex && touchCurrentCell?.col === colIndex && isTouchDragging;
                const isLyra = crypto === 'lyra';
                const isLyraDisabled = isLyra && lyraUsed;
                
                return (
                  <div
                    key={cellKey}
                    data-row={rowIndex}
                    data-col={colIndex}
                    className={`
                      w-8 h-8 rounded border cursor-pointer transition-all duration-200 relative
                      ${crypto ? 'bg-white/10' : 'bg-gray-800'}
                      ${isDragging ? 'scale-110 z-10 filter brightness-120 border-neonGreen' : 'border-gray-600 hover:border-white/50'}
                      ${isDropTarget ? 'border-neonGreen bg-neonGreen/10' : ''}
                      ${gameStarted && !isProcessing && !isLyraDisabled ? 'hover:scale-105' : ''}
                      ${isLyraDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    draggable={gameStarted && !isProcessing && crypto !== null && !isLyraDisabled}
                    onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {cryptoLogo && (
                      <img
                        src={cryptoLogo.imagePath}
                        alt={cryptoLogo.name}
                        className={`
                          w-full h-full object-contain p-0.5 rounded
                          ${isMatching ? 'filter brightness-150' : ''}
                          ${isLyraDisabled ? 'grayscale opacity-50' : ''}
                        `}
                        draggable={false}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="space-y-2">
          {!gameStarted ? (
            <button
              onClick={handleStartGame}
              className="w-full bg-neonGreen text-black font-bold py-2 rounded-lg hover:brightness-110 transition duration-300 shadow-glow text-sm"
            >
              {language === 'ar' ? 'ابدأ اللعبة' : 'Start Game'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleEndGame}
                disabled={isProcessing}
                className="w-full bg-neonGreen text-black font-bold py-2 rounded-lg hover:brightness-110 transition duration-300 shadow-glow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (language === 'ar' ? 'إنهاء اللعبة' : 'End Game')
                }
              </button>
              
              <button
                onClick={shuffleBoard}
                disabled={isProcessing}
                className="w-full bg-transparent border border-white/30 text-white/70 py-1.5 rounded-lg hover:bg-white/5 transition duration-300 flex items-center justify-center gap-2 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                {language === 'ar' ? 'إعادة خلط' : 'Reshuffle'}
              </button>
            </div>
          )}
        </div>

        {/* Game Instructions */}
        <div className="mt-3 text-center text-white/60 text-xs space-y-1">
          <p>
            {language === 'ar' 
              ? 'اسحب وأفلت لتجميع 3+ من نفس العملة!'
              : 'Drag & drop to match 3+ same cryptos!'
            }
          </p>
          <p className="text-yellow-400 font-semibold">
            {language === 'ar' 
              ? '🌟 LYRA: استخدام واحد! اسحبه لأي عملة لمسح الكل!'
              : '🌟 LYRA: Single use! Drag to any crypto to clear all!'
            }
          </p>
          <p className="text-neonGreen">
            {language === 'ar' 
              ? 'اجمع 4+ لإنتاج LYRA جديد'
              : 'Match 4+ to generate new LYRA'
            }
          </p>
          <p className="text-white/50 text-xs">
            {language === 'ar' 
              ? 'المكافآت: 3 عملات = 5 دقائق، 4 عملات = 10 دقائق، 5+ عملات = 15 دقيقة'
              : 'Rewards: 3 match = 5 min, 4 match = 10 min, 5+ match = 15 min'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default CryptoCandyCrushGame;