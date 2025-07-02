import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserMinutes } from '../../lib/supabase/updateUserMinutes';
import { useLanguage } from '../context/LanguageContext';

interface CryptoCandyCrushGameProps {
  onClose: () => void;
  onMinutesEarned?: (minutes: number) => void;
  gameSessionsRemaining?: number;
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
const GAME_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

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

const CryptoCandyCrushGame: React.FC<CryptoCandyCrushGameProps> = ({ 
  onClose, 
  onMinutesEarned,
  gameSessionsRemaining = 3
}) => {
  const [board, setBoard] = useState<GameBoard>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMinutesAnimation, setShowMinutesAnimation] = useState(false);
  const [firstClickedItem, setFirstClickedItem] = useState<{ row: number; col: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchingCells, setMatchingCells] = useState<Set<string>>(new Set());
  const [specialEffectCells, setSpecialEffectCells] = useState<Set<string>>(new Set());
  const [lyraUsedInSession, setLyraUsedInSession] = useState(false); // تتبع استخدام LYRA في الجلسة الحالية
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [gameEnded, setGameEnded] = useState(false);
  const [isFunSession, setIsFunSession] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9)); // معرف فريد للجلسة
  
  const { language } = useLanguage();

  // Sound refs
  const swooshSoundRef = useRef<HTMLAudioElement | null>(null);
  const chimeSoundRef = useRef<HTMLAudioElement | null>(null);
  const celebratorySoundRef = useRef<HTMLAudioElement | null>(null);
  const buzzSoundRef = useRef<HTMLAudioElement | null>(null);
  const boomSoundRef = useRef<HTMLAudioElement | null>(null);

  // Game timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (gameStarted && !gameEnded && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setGameEnded(true);
            handleEndGame();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameStarted, gameEnded, timeRemaining]);

  // Format time display
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
    
    // Now place one LYRA COIN at a random position (only if not used in this session)
    if (!lyraUsedInSession) {
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
    }
    
    return newBoard;
  }, [lyraUsedInSession]);

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
    
    return clearedCount * 10; // 10 minutes per cleared crypto
  };

  // Create LYRA special square after 4+ matches (only if not used in session)
  const createLyraSpecial = (gameBoard: GameBoard, matchCount: number) => {
    if (matchCount >= 4 && !lyraUsedInSession) {
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

    // Calculate minutes based on match sizes
    let minutesEarned = 0;
    matchGroups.forEach(group => {
      if (group.length === 3) minutesEarned += 5;
      else if (group.length === 4) minutesEarned += 10;
      else if (group.length >= 5) minutesEarned += 15;
      
      // Create LYRA special for 4+ matches (only if LYRA hasn't been used in this session)
      if (group.length >= 4 && !lyraUsedInSession) {
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
      
      // Fill empty spaces with new crypto logos (only regular types, no LYRA)
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

  // Shuffle board when no moves available (preserve LYRA usage state)
  const shuffleBoard = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    // لا نعيد تعيين lyraUsedInSession هنا - يبقى كما هو في الجلسة
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

  // Check if two cells are adjacent (horizontally or vertically)
  const isAdjacent = (row1: number, col1: number, row2: number, col2: number): boolean => {
    const rowDiff = Math.abs(row2 - row1);
    const colDiff = Math.abs(col2 - col1);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  // Handle cell click for the new clicking system
  const handleClick = (row: number, col: number) => {
    if (gameEnded || isProcessing) return;

    if (!firstClickedItem) {
      // First click - select the cell
      setFirstClickedItem({ row, col });
      playSwooshSound();
    } else {
      // Second click - attempt to swap
      const { row: firstRow, col: firstCol } = firstClickedItem;
      
      if (firstRow === row && firstCol === col) {
        // Clicked the same cell - deselect
        setFirstClickedItem(null);
        return;
      }

      if (isAdjacent(firstRow, firstCol, row, col)) {
        // Valid adjacent swap
        performSwap(firstRow, firstCol, row, col);
      } else {
        // Not adjacent - show error and reset selection
        playBuzzSound();
        toast.error(
          language === 'ar' ? 'يجب أن تكون الخلايا متجاورة!' : 'Cells must be adjacent!',
          { duration: 1000 }
        );
      }
      
      setFirstClickedItem(null);
    }
  };

  // Unified swap function for clicking system
  const performSwap = (sourceRow: number, sourceCol: number, targetRow: number, targetCol: number) => {
    if (gameEnded) return;

    // Store original crypto types before swap
    const sourceCrypto = board[sourceRow][sourceCol];
    const targetCrypto = board[targetRow][targetCol];
    
    // Check if LYRA COIN is involved in the swap
    const isLyraSwap = sourceCrypto === 'lyra' || targetCrypto === 'lyra';
    
    if (isLyraSwap && !lyraUsedInSession) {
      // LYRA COIN special interaction - clear all matching crypto
      const lyraEffectTargetCrypto = sourceCrypto === 'lyra' ? targetCrypto : sourceCrypto;
      
      if (lyraEffectTargetCrypto && lyraEffectTargetCrypto !== 'lyra') {
        playBoomSound();
        setIsProcessing(true);
        setLyraUsedInSession(true); // Mark LYRA as used in this session
        
        // Create a copy of the board for the special effect
        const newBoard = board.map(r => [...r]);
        
        // Remove LYRA from the board (single use per session)
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
    } else if (isLyraSwap && lyraUsedInSession) {
      // LYRA has already been used in this session
      playBuzzSound();
      toast.error(
        language === 'ar' ? 'تم استخدام LYRA COIN في هذه الجلسة!' : 'LYRA COIN already used in this session!',
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
    setGameEnded(false);
    setTotalMinutes(0);
    setFirstClickedItem(null);
    setLyraUsedInSession(false); // إعادة تعيين حالة LYRA للجلسة الجديدة
    setTimeRemaining(GAME_DURATION);
    
    // Check if this is a fun session (no sessions remaining)
    const isFun = gameSessionsRemaining <= 0;
    setIsFunSession(isFun);
    
    if (isFun) {
      toast.info(
        language === 'ar' 
          ? 'هذه جلسة للمتعة فقط ولا تحتسب في تقدمك' 
          : 'This session is for fun only and does not count toward your progress',
        { duration: 4000 }
      );
    } else {
      toast.success(
        language === 'ar' ? 'بدأت اللعبة! لديك دقيقتان للعب' : 'Game started! You have 2 minutes to play',
        { duration: 3000 }
      );
    }
  };

  // End game and save minutes
  const handleEndGame = async () => {
    if (gameEnded) return;
    
    setGameEnded(true);
    
    // If it's a fun session or no minutes earned, just close
    if (isFunSession || totalMinutes === 0) {
      if (isFunSession) {
        toast.info(
          language === 'ar' 
            ? 'انتهت جلسة المتعة! شكراً لك على اللعب' 
            : 'Fun session ended! Thanks for playing'
        );
      } else {
        toast.info(
          language === 'ar' ? 'لم تكسب أي دقائق!' : 'No minutes earned!'
        );
      }
      setTimeout(() => onClose(), 2000);
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
        }, 2000);
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
      setTimeout(() => onClose(), 2000);
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
            {gameStarted && !gameEnded && (
              <div className={`text-white font-bold text-sm ${timeRemaining <= 30000 ? 'text-red-400 animate-pulse' : ''}`}>
                ⏰ {formatTime(timeRemaining)}
              </div>
            )}
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

        {/* Fun Session Indicator */}
        {gameStarted && !gameEnded && isFunSession && (
          <div className="mb-3 text-center">
            <div className="inline-block px-3 py-1 rounded-lg font-semibold text-xs bg-purple-500/20 border border-purple-500/30 text-purple-400">
              {language === 'ar' 
                ? '🎮 جلسة للمتعة فقط - لا تحتسب في التقدم'
                : '🎮 Fun Session Only - No Progress Counted'
              }
            </div>
          </div>
        )}

        {/* LYRA Status Indicator */}
        {gameStarted && !gameEnded && (
          <div className="mb-3 text-center">
            <div className={`inline-block px-3 py-1 rounded-lg font-semibold text-xs ${
              lyraUsedInSession 
                ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                : 'bg-yellow-400/20 border border-yellow-400/30 text-yellow-400'
            }`}>
              {language === 'ar' 
                ? (lyraUsedInSession ? '❌ تم استخدام LYRA في هذه الجلسة' : '⭐ LYRA متاح')
                : (lyraUsedInSession ? '❌ LYRA Used This Session' : '⭐ LYRA Available')
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
                const isSelected = firstClickedItem?.row === rowIndex && firstClickedItem?.col === colIndex;
                const isLyra = crypto === 'lyra';
                const isLyraDisabled = isLyra && lyraUsedInSession;
                
                return (
                  <div
                    key={cellKey}
                    className={`
                      w-8 h-8 rounded border cursor-pointer transition-all duration-200 relative
                      ${crypto ? 'bg-white/10' : 'bg-gray-800'}
                      ${isSelected ? 'scale-110 z-10 filter brightness-120 border-neonGreen bg-neonGreen/20' : 'border-gray-600 hover:border-white/50'}
                      ${gameStarted && !isProcessing && !isLyraDisabled && !gameEnded ? 'hover:scale-105' : ''}
                      ${isLyraDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${gameEnded ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => handleClick(rowIndex, colIndex)}
                  >
                    {cryptoLogo && (
                      <img
                        src={cryptoLogo.imagePath}
                        alt={cryptoLogo.name}
                        className={`
                          w-full h-full object-contain p-0.5 rounded
                          ${isMatching ? 'filter brightness-150' : ''}
                          ${isLyraDisabled ? 'grayscale opacity-50' : ''}
                          ${gameEnded ? 'grayscale' : ''}
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
              {language === 'ar' ? 'ابدأ اللعبة (دقيقتان)' : 'Start Game (2 minutes)'}
            </button>
          ) : gameEnded ? (
            <div className="text-center">
              <div className="text-white font-bold mb-2">
                {language === 'ar' ? '⏰ انتهت اللعبة!' : '⏰ Game Over!'}
              </div>
              <div className="text-neonGreen font-bold text-lg">
                {language === 'ar' ? `إجمالي الدقائق: ${totalMinutes}` : `Total Minutes: ${totalMinutes}`}
              </div>
              {isFunSession && (
                <div className="text-purple-400 text-sm mt-2">
                  {language === 'ar' ? 'جلسة للمتعة - لم يتم حفظ الدقائق' : 'Fun session - minutes not saved'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleEndGame}
                disabled={isProcessing}
                className="w-full bg-red-500 text-white font-bold py-2 rounded-lg hover:brightness-110 transition duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (language === 'ar' ? 'إنهاء اللعبة مبكراً' : 'End Game Early')
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
              ? 'انقر على خليتين متجاورتين لتبديلهما وتجميع 3+ من نفس العملة!'
              : 'Click two adjacent cells to swap and match 3+ same cryptos!'
            }
          </p>
          <p className="text-yellow-400 font-semibold">
            {language === 'ar' 
              ? '🌟 LYRA: استخدام واحد لكل جلسة! انقر عليه ثم على أي عملة لمسح الكل!'
              : '🌟 LYRA: Single use per session! Click it then any crypto to clear all!'
            }
          </p>
          <p className="text-neonGreen">
            {language === 'ar' 
              ? 'اجمع 4+ لإنتاج LYRA جديد (إذا لم يتم استخدامه)'
              : 'Match 4+ to generate new LYRA (if not used)'
            }
          </p>
          <p className="text-white/50 text-xs">
            {language === 'ar' 
              ? 'المكافآت: 3 عملات = 5 دقائق، 4 عملات = 10 دقائق، 5+ عملات = 15 دقيقة'
              : 'Rewards: 3 match = 5 min, 4 match = 10 min, 5+ match = 15 min'
            }
          </p>
          <p className="text-red-400 font-semibold">
            {language === 'ar' 
              ? '⏰ مدة الجلسة: دقيقتان فقط!'
              : '⏰ Session Duration: 2 minutes only!'
            }
          </p>
          {isFunSession && (
            <p className="text-purple-400 font-semibold">
              {language === 'ar' 
                ? '🎮 جلسة للمتعة - لا تحتسب في التقدم!'
                : '🎮 Fun session - does not count toward progress!'
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoCandyCrushGame;