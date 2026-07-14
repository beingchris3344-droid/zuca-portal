import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import BASE_URL from "../../api";

// ==================== COMPLETE CHESS ENGINE ====================

class ChessEngine {
  constructor() {
    this.board = this.createInitialBoard();
    this.turn = "white";
    this.moveHistory = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.gameOver = false;
    this.gameResult = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.positionHistory = [];
    this.castlingRights = {
      whiteKing: true,
      whiteQueen: true,
      blackKing: true,
      blackQueen: true
    };
    this.enPassantTarget = null;
    this.kingPosition = { white: { r: 7, c: 4 }, black: { r: 0, c: 4 } };
  }

  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    board[0] = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
    board[1] = ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"];
    board[6] = ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"];
    board[7] = ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"];
    return board;
  }

  getPieceColor(piece) {
    if (!piece) return null;
    return ["♙", "♖", "♘", "♗", "♕", "♔"].includes(piece) ? "white" : "black";
  }

  getPieceValue(piece) {
    const values = { 
      "♟": 1, "♙": 1, "♞": 3, "♘": 3, "♝": 3, "♗": 3, 
      "♜": 5, "♖": 5, "♛": 9, "♕": 9, "♚": 100, "♔": 100 
    };
    return values[piece] || 0;
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece || this.getPieceColor(piece) !== this.turn) return false;
    
    const target = this.board[toRow][toCol];
    if (target && this.getPieceColor(target) === this.turn) return false;

    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    const ar = Math.abs(dr);
    const ac = Math.abs(dc);
    const pieceLower = piece.toLowerCase();

    // Pawn moves
    if (pieceLower === "♟") {
      const direction = this.turn === "white" ? -1 : 1;
      const startRow = this.turn === "white" ? 6 : 1;
      
      // Forward move
      if (dc === 0 && !target) {
        if (dr === direction) return true;
        if (dr === 2 * direction && fromRow === startRow && !this.board[fromRow + direction][fromCol]) return true;
        return false;
      }
      
      // Capture
      if (ac === 1 && dr === direction) {
        if (target) return true;
        // En passant
        if (this.enPassantTarget && this.enPassantTarget.row === toRow && this.enPassantTarget.col === toCol) {
          return true;
        }
        return false;
      }
      return false;
    }

    // Knight
    if (pieceLower === "♞") {
      return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    }

    // Bishop
    if (pieceLower === "♝") {
      if (ar !== ac) return false;
      return !this.isBlocked(fromRow, fromCol, toRow, toCol);
    }

    // Rook
    if (pieceLower === "♜") {
      if (fromRow !== toRow && fromCol !== toCol) return false;
      return !this.isBlocked(fromRow, fromCol, toRow, toCol);
    }

    // Queen
    if (pieceLower === "♛") {
      if (fromRow !== toRow && fromCol !== toCol && ar !== ac) return false;
      return !this.isBlocked(fromRow, fromCol, toRow, toCol);
    }

    // King
    if (pieceLower === "♚") {
      if (ar <= 1 && ac <= 1) return true;
      
      // Castling
      if (ar === 0 && ac === 2 && !this.isInCheck(this.turn)) {
        const row = this.turn === "white" ? 7 : 0;
        if (fromRow !== row || fromCol !== 4) return false;
        
        // Kingside castling
        if (toCol === 6) {
          const key = this.turn === "white" ? "whiteKing" : "blackKing";
          if (!this.castlingRights[key]) return false;
          if (this.board[row][5] || this.board[row][6]) return false;
          if (this.isSquareAttacked(row, 5, this.turn) || this.isSquareAttacked(row, 6, this.turn)) return false;
          return true;
        }
        
        // Queenside castling
        if (toCol === 2) {
          const key = this.turn === "white" ? "whiteQueen" : "blackQueen";
          if (!this.castlingRights[key]) return false;
          if (this.board[row][3] || this.board[row][2] || this.board[row][1]) return false;
          if (this.isSquareAttacked(row, 3, this.turn) || this.isSquareAttacked(row, 2, this.turn)) return false;
          return true;
        }
      }
      return false;
    }

    return false;
  }

  isBlocked(fromRow, fromCol, toRow, toCol) {
    const dr = fromRow < toRow ? 1 : fromRow > toRow ? -1 : 0;
    const dc = fromCol < toCol ? 1 : fromCol > toCol ? -1 : 0;
    let r = fromRow + dr;
    let c = fromCol + dc;
    
    while (r !== toRow || c !== toCol) {
      if (this.board[r][c]) return true;
      r += dr;
      c += dc;
    }
    return false;
  }

  isSquareAttacked(row, col, color) {
    const enemy = color === "white" ? "black" : "white";
    
    // Check enemy pawn attacks
    const pawnDir = enemy === "white" ? -1 : 1;
    for (const dc of [-1, 1]) {
      const pr = row + pawnDir;
      const pc = col + dc;
      if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
        const piece = this.board[pr][pc];
        if (piece && this.getPieceColor(piece) === enemy && piece.toLowerCase() === "♟") return true;
      }
    }

    // Check knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const piece = this.board[nr][nc];
        if (piece && this.getPieceColor(piece) === enemy && piece.toLowerCase() === "♞") return true;
      }
    }

    // Check rook and queen attacks (horizontal/vertical)
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = this.board[r][c];
        if (piece) {
          if (this.getPieceColor(piece) === enemy) {
            const lower = piece.toLowerCase();
            if (lower === "♜" || lower === "♛") return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Check bishop and queen attacks (diagonal)
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = this.board[r][c];
        if (piece) {
          if (this.getPieceColor(piece) === enemy) {
            const lower = piece.toLowerCase();
            if (lower === "♝" || lower === "♛") return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Check king attacks
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const piece = this.board[nr][nc];
        if (piece && this.getPieceColor(piece) === enemy && piece.toLowerCase() === "♚") return true;
      }
    }

    return false;
  }

  isInCheck(color) {
    const king = this.kingPosition[color];
    if (!king) return false;
    return this.isSquareAttacked(king.r, king.c, color);
  }

  getAllLegalMoves(color) {
    const moves = [];
    const turnToCheck = color || this.turn;
    
    for (let fr = 0; fr < 8; fr++) {
      for (let fc = 0; fc < 8; fc++) {
        const piece = this.board[fr][fc];
        if (piece && this.getPieceColor(piece) === turnToCheck) {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (this.isValidMove(fr, fc, tr, tc)) {
                // Simulate the move to check if it leaves king in check
                const captured = this.board[tr][tc];
                const movedPiece = this.board[fr][fc];
                const oldKingPos = { ...this.kingPosition[turnToCheck] };
                
                // Make temporary move
                this.board[tr][tc] = movedPiece;
                this.board[fr][fc] = null;
                
                // Update king position if moving king
                if (movedPiece.toLowerCase() === "♚") {
                  this.kingPosition[turnToCheck] = { r: tr, c: tc };
                }
                
                const inCheck = this.isInCheck(turnToCheck);
                
                // Undo temporary move
                this.board[fr][fc] = movedPiece;
                this.board[tr][tc] = captured;
                this.kingPosition[turnToCheck] = oldKingPos;
                
                if (!inCheck) {
                  moves.push({ fromRow: fr, fromCol: fc, toRow: tr, toCol: tc });
                }
              }
            }
          }
        }
      }
    }
    return moves;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    const isCapture = !!captured;
    const isPawn = piece.toLowerCase() === "♟";
    
    // Save position for repetition detection
    const positionKey = this.getPositionKey();
    this.positionHistory.push(positionKey);
    
    // Handle en passant capture
    let enPassantCaptured = null;
    if (isPawn && this.enPassantTarget && this.enPassantTarget.row === toRow && this.enPassantTarget.col === toCol) {
      enPassantCaptured = this.board[fromRow][toCol];
      this.board[fromRow][toCol] = null;
    }
    
    // Move the piece
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    
    // Update king position
    if (piece.toLowerCase() === "♚") {
      this.kingPosition[this.turn] = { r: toRow, c: toCol };
      
      // Update castling rights
      if (this.turn === "white") {
        this.castlingRights.whiteKing = false;
        this.castlingRights.whiteQueen = false;
      } else {
        this.castlingRights.blackKing = false;
        this.castlingRights.blackQueen = false;
      }
      
      // Handle castling
      if (fromCol === 4 && (toCol === 6 || toCol === 2)) {
        // Kingside
        if (toCol === 6) {
          this.board[fromRow][5] = this.board[fromRow][7];
          this.board[fromRow][7] = null;
        }
        // Queenside
        if (toCol === 2) {
          this.board[fromRow][3] = this.board[fromRow][0];
          this.board[fromRow][0] = null;
        }
      }
    }
    
    // Update castling rights for rook moves
    if (fromRow === 7 && fromCol === 0) this.castlingRights.whiteQueen = false;
    if (fromRow === 7 && fromCol === 7) this.castlingRights.whiteKing = false;
    if (fromRow === 0 && fromCol === 0) this.castlingRights.blackQueen = false;
    if (fromRow === 0 && fromCol === 7) this.castlingRights.blackKing = false;
    if (toRow === 7 && toCol === 0) this.castlingRights.whiteQueen = false;
    if (toRow === 7 && toCol === 7) this.castlingRights.whiteKing = false;
    if (toRow === 0 && toCol === 0) this.castlingRights.blackQueen = false;
    if (toRow === 0 && toCol === 7) this.castlingRights.blackKing = false;
    
    // Update en passant target
    this.enPassantTarget = null;
    if (isPawn && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = {
        row: (fromRow + toRow) / 2,
        col: fromCol
      };
    }
    
    // Track captured pieces
    const actualCaptured = captured || enPassantCaptured;
    if (actualCaptured) {
      if (this.turn === "white") {
        this.capturedWhite.push(actualCaptured);
      } else {
        this.capturedBlack.push(actualCaptured);
      }
    }
    
    // Update half-move clock
    if (isPawn || isCapture || enPassantCaptured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
    
    // Update full move number
    if (this.turn === "black") {
      this.fullMoveNumber++;
    }
    
    // Pawn promotion detection
    let promotion = null;
    if (isPawn && (toRow === 0 || toRow === 7)) {
      promotion = this.turn === "white" ? "♕" : "♛";
    }
    
    // Switch turn
    this.turn = this.turn === "white" ? "black" : "white";
    
    // Check game state
    this.updateGameState();
    
    return { 
      captured: actualCaptured, 
      promotion,
      isCheck: this.isInCheck(this.turn),
      isCheckmate: this.gameOver && this.gameResult === "checkmate",
      isStalemate: this.gameOver && this.gameResult === "stalemate"
    };
  }

  updateGameState() {
    const moves = this.getAllLegalMoves(this.turn);
    
    if (moves.length === 0) {
      this.gameOver = true;
      if (this.isInCheck(this.turn)) {
        this.gameResult = "checkmate";
      } else {
        this.gameResult = "stalemate";
      }
      return;
    }
    
    // Check for insufficient material
    if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = "draw";
      return;
    }
    
    // Check for 50-move rule
    if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.gameResult = "draw";
      return;
    }
    
    // Check for threefold repetition
    if (this.isThreefoldRepetition()) {
      this.gameOver = true;
      this.gameResult = "draw";
      return;
    }
  }

  isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.toLowerCase() !== "♚") {
          pieces.push(piece);
        }
      }
    }
    
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && pieces[0].toLowerCase() === "♝") return true;
    if (pieces.length === 1 && pieces[0].toLowerCase() === "♞") return true;
    return false;
  }

  isThreefoldRepetition() {
    const currentKey = this.getPositionKey();
    let count = 0;
    for (const key of this.positionHistory) {
      if (key === currentKey) count++;
      if (count >= 3) return true;
    }
    return false;
  }

  getPositionKey() {
    let key = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        key += this.board[r][c] || " ";
      }
    }
    key += this.turn;
    key += JSON.stringify(this.castlingRights);
    key += JSON.stringify(this.enPassantTarget);
    return key;
  }

  getBoard() {
    return this.board.map(row => [...row]);
  }

  getGameState() {
    return {
      board: this.getBoard(),
      turn: this.turn,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
      capturedWhite: [...this.capturedWhite],
      capturedBlack: [...this.capturedBlack],
      castlingRights: { ...this.castlingRights },
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      kingPosition: {
        white: { ...this.kingPosition.white },
        black: { ...this.kingPosition.black }
      }
    };
  }

  loadState(state) {
    this.board = state.board.map(row => [...row]);
    this.turn = state.turn;
    this.gameOver = state.gameOver;
    this.gameResult = state.gameResult;
    this.capturedWhite = [...state.capturedWhite];
    this.capturedBlack = [...state.capturedBlack];
    this.castlingRights = { ...state.castlingRights };
    this.enPassantTarget = state.enPassantTarget ? { ...state.enPassantTarget } : null;
    this.halfMoveClock = state.halfMoveClock;
    this.fullMoveNumber = state.fullMoveNumber;
    this.kingPosition = {
      white: { ...state.kingPosition.white },
      black: { ...state.kingPosition.black }
    };
  }

  clone() {
    const clone = new ChessEngine();
    clone.loadState(this.getGameState());
    return clone;
  }
}

// ==================== AI ENGINE ====================

class ChessAI {
  static evaluateBoard(engine, color) {
    let score = 0;
    const board = engine.getBoard();
    
    // Material evaluation
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const value = engine.getPieceValue(piece);
          const pieceColor = engine.getPieceColor(piece);
          const multiplier = pieceColor === color ? 1 : -1;
          
          // Position bonuses
          let positionBonus = 0;
          const row = pieceColor === "white" ? 7 - r : r;
          const col = pieceColor === "white" ? c : 7 - c;
          
          // Center control
          const centerDist = Math.abs(3.5 - c) + Math.abs(3.5 - r);
          positionBonus += (7 - centerDist) * 2;
          
          // Pawn advancement bonus
          if (piece.toLowerCase() === "♟") {
            positionBonus += row * 10;
          }
          
          score += (value * 10 + positionBonus) * multiplier;
        }
      }
    }
    
    // Mobility evaluation
    const moves = engine.getAllLegalMoves(color);
    const enemyMoves = engine.getAllLegalMoves(color === "white" ? "black" : "white");
    score += moves.length * 2;
    score -= enemyMoves.length * 2;
    
    // King safety
    const kingPos = engine.kingPosition[color];
    if (kingPos) {
      const kingRow = color === "white" ? 7 - kingPos.r : kingPos.r;
      if (kingRow <= 1) score += 5; // Encourage castling
    }
    
    return score;
  }

  static minimax(engine, depth, alpha, beta, isMaximizing, color, maxDepth = 3) {
    if (depth === 0 || engine.gameOver) {
      return { score: this.evaluateBoard(engine, color) };
    }
    
    const currentColor = isMaximizing ? color : (color === "white" ? "black" : "white");
    const moves = engine.getAllLegalMoves(currentColor);
    
    if (moves.length === 0) {
      return { score: this.evaluateBoard(engine, color) };
    }
    
    // Sort moves by potential capture value for better pruning
    moves.sort((a, b) => {
      const aCapture = engine.getPieceValue(engine.board[a.toRow][a.toCol]);
      const bCapture = engine.getPieceValue(engine.board[b.toRow][b.toCol]);
      return bCapture - aCapture;
    });
    
    let bestMove = moves[0];
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const clone = engine.clone();
        clone.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const result = this.minimax(clone, depth - 1, alpha, beta, false, color, maxDepth);
        
        if (result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const clone = engine.clone();
        clone.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const result = this.minimax(clone, depth - 1, alpha, beta, true, color, maxDepth);
        
        if (result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }

  static getBestMove(engine, difficulty) {
    const color = "black";
    const moves = engine.getAllLegalMoves(color);
    
    if (moves.length === 0) return null;
    
    const depth = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    
    // Add some randomness for easier difficulties
    if (difficulty === "easy" && Math.random() < 0.4) {
      const captureMoves = moves.filter(m => engine.board[m.toRow][m.toCol]);
      if (captureMoves.length > 0 && Math.random() < 0.6) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }
    
    const result = this.minimax(engine, depth, -Infinity, Infinity, true, color, depth);
    return result.move || moves[0];
  }
}

// ==================== COMPONENT ====================

export default function Chess() {
  const navigate = useNavigate();
  const [engine, setEngine] = useState(new ChessEngine());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [message, setMessage] = useState("Choose a mode to start");
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [myColor, setMyColor] = useState("white");
  const myColorRef = useRef("white");
  const [gameId, setGameId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promotionDialog, setPromotionDialog] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isOnlineTurn, setIsOnlineTurn] = useState(false);
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const engineRef = useRef(null);

  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update UI state from engine
  useEffect(() => {
    const state = engine.getGameState();
    setGameState(state);
    setGameOver(state.gameOver);
    
    if (state.gameOver) {
      let resultMsg = "";
      switch (state.gameResult) {
        case "checkmate":
          const winner = state.turn === "white" ? "Black" : "White";
          resultMsg = `🏆 Checkmate! ${winner} wins!`;
          break;
        case "stalemate":
          resultMsg = "🤝 Stalemate! It's a draw!";
          break;
        case "draw":
          resultMsg = "🤝 Draw!";
          break;
        default:
          resultMsg = "Game Over!";
      }
      setMessage(resultMsg);
    } else if (state.isInCheck) {
      setMessage(`⚠️ Check! ${state.turn === "white" ? "White" : "Black"} is in check`);
    } else {
      setMessage(`${state.turn === "white" ? "White" : "Black"}'s turn`);
    }
  }, [engine]);

  // Socket setup
  useEffect(() => {
    if (token && user?.id) {
      const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });
      socket.emit("join", user.id);
      socketRef.current = socket;

      socket.on("chess_start", (data) => {
        const newEngine = new ChessEngine();
        if (data.color === "black") {
          newEngine.turn = "white"; // White always starts
        }
        setEngine(newEngine);
        setGameId(data.gameId);
        setMode("online");
        setGameStarted(true);
        setMyColor(data.color);
        myColorRef.current = data.color;
        setOpponent({ id: data.opponentId, name: data.opponent });
        setGameOver(false);
        setMoveHistory([]);
        setMessage(data.color === "white" ? "Your turn — White" : `${data.opponent}'s turn — White`);
        setIsOnlineTurn(data.color === "white");
      });

      socket.on("chess_opponent_move", (data) => {
        const newEngine = new ChessEngine();
        newEngine.loadState(data.gameState);
        setEngine(newEngine);
        setIsOnlineTurn(myColorRef.current === newEngine.turn);
        
        if (newEngine.gameOver) {
          let resultMsg = "";
          switch (newEngine.gameResult) {
            case "checkmate":
              resultMsg = `🏆 ${data.winner || "Opponent"} wins! Checkmate!`;
              break;
            case "stalemate":
              resultMsg = "🤝 Stalemate! It's a draw!";
              break;
            case "draw":
              resultMsg = "🤝 Draw!";
              break;
            default:
              resultMsg = "Game Over!";
          }
          setMessage(resultMsg);
        } else if (newEngine.isInCheck) {
          setMessage(`⚠️ Check! ${newEngine.turn === "white" ? "White" : "Black"} is in check`);
        } else {
          setMessage(`${newEngine.turn === "white" ? "White" : "Black"}'s turn`);
        }
      });

      socket.on("chess_game_over", (data) => {
        setGameOver(true);
        setMessage(`🏆 ${data.winner} wins! ${data.reason || ''}`);
      });

      socket.on("chess_rematch_requested", (data) => {
        if (window.confirm(`${data.fromName} wants a rematch! Accept?`)) {
          const newColor = myColorRef.current === "white" ? "black" : "white";
          const newEngine = new ChessEngine();
          if (newColor === "black") {
            newEngine.turn = "white";
          }
          setEngine(newEngine);
          setGameOver(false);
          setMyColor(newColor);
          myColorRef.current = newColor;
          setIsOnlineTurn(newColor === "white");
          socket.emit("chess_rematch_accept", { 
            gameId, 
            player1Id: newColor === "white" ? user.id : opponent.id, 
            player2Id: newColor === "white" ? opponent.id : user.id,
            player1Name: newColor === "white" ? user.fullName : opponent.name,
            player2Name: newColor === "white" ? opponent.name : user.fullName 
          });
        }
      });

      return () => { socket.disconnect(); };
    }
  }, [token, user?.id]);

  // Handle chess invite
  useEffect(() => {
    const inviteData = sessionStorage.getItem("chess_invite");
    if (inviteData && socketRef.current && user?.id) {
      try {
        const data = JSON.parse(inviteData);
        sessionStorage.removeItem("chess_invite");
        const gid = Date.now().toString();
        const newEngine = new ChessEngine();
        newEngine.turn = "white";
        setEngine(newEngine);
        setGameId(gid);
        setMode("online");
        setGameStarted(true);
        setMyColor("black");
        myColorRef.current = "black";
        setOpponent({ id: data.fromUserId, name: data.fromName });
        setMessage(`${data.fromName}'s turn — White`);
        setIsOnlineTurn(false);
        setGameOver(false);
        setMoveHistory([]);
        socketRef.current.emit("chess_accept", { 
          gameId: gid, 
          player1Id: data.fromUserId, 
          player2Id: user.id, 
          player1Name: data.fromName, 
          player2Name: user.fullName 
        });
      } catch (e) { 
        console.error("Failed to process invite:", e); 
      }
    }
  }, [socketRef.current, user?.id]);

  // AI move logic
  useEffect(() => {
    if (mode === "ai" && gameStarted && !gameOver && engine.turn === "black" && !aiThinking) {
      const timer = setTimeout(() => {
        setAiThinking(true);
        const move = ChessAI.getBestMove(engine, difficulty);
        if (move) {
          const result = engine.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
          setEngine(new ChessEngine().loadState(engine.getGameState()));
          setAiThinking(false);
        } else {
          setAiThinking(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [engine.turn, mode, gameStarted, gameOver, aiThinking]);

  const handleSquareClick = (row, col) => {
    if (gameOver || aiThinking || !gameStarted) return;
    
    if (mode === "online") {
      if (!isOnlineTurn) {
        setMessage("⏳ Waiting for opponent's move...");
        return;
      }
      if (engine.turn !== myColorRef.current) {
        setMessage("⏳ Waiting for opponent's move...");
        return;
      }
    }
    
    if (mode === "ai" && engine.turn !== "white") return;
    if (mode === "online" && engine.turn !== myColorRef.current) return;

    const piece = engine.board[row][col];
    
    if (!selected) {
      // Select a piece
      if (piece && engine.getPieceColor(piece) === engine.turn) {
        setSelected({ row, col });
        const moves = engine.getAllLegalMoves(engine.turn)
          .filter(m => m.fromRow === row && m.fromCol === col);
        setValidMoves(moves);
      }
    } else {
      // Try to make a move
      const isValid = validMoves.some(m => m.toRow === row && m.toCol === col);
      
      if (isValid) {
        // Check for pawn promotion
        const piece = engine.board[selected.row][selected.col];
        const isPawn = piece.toLowerCase() === "♟";
        const promotionRow = engine.turn === "white" ? 0 : 7;
        
        if (isPawn && row === promotionRow) {
          // Show promotion dialog
          setPromotionDialog({
            fromRow: selected.row,
            fromCol: selected.col,
            toRow: row,
            toCol: col
          });
          setSelected(null);
          setValidMoves([]);
          return;
        }
        
        makeMove(selected.row, selected.col, row, col);
      } else {
        // Select new piece if clicked on own piece
        if (piece && engine.getPieceColor(piece) === engine.turn) {
          setSelected({ row, col });
          const moves = engine.getAllLegalMoves(engine.turn)
            .filter(m => m.fromRow === row && m.fromCol === col);
          setValidMoves(moves);
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      }
    }
  };

  const makeMove = (fromRow, fromCol, toRow, toCol, promotionPiece = null) => {
    const result = engine.makeMove(fromRow, fromCol, toRow, toCol);
    
    // Handle pawn promotion
    if (result.promotion && promotionPiece) {
      engine.board[toRow][toCol] = promotionPiece;
    } else if (result.promotion) {
      engine.board[toRow][toCol] = engine.turn === "white" ? "♕" : "♛";
    }
    
    // Update move history
    const move = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: engine.board[toRow][toCol],
      captured: result.captured,
      promotion: result.promotion,
      isCheck: result.isCheck,
      isCheckmate: result.isCheckmate
    };
    setMoveHistory([...moveHistory, move]);
    
    // Create new engine instance for immutability
    const newEngine = new ChessEngine();
    newEngine.loadState(engine.getGameState());
    setEngine(newEngine);
    setSelected(null);
    setValidMoves([]);
    setPromotionDialog(null);
    
    // Online mode - send move
    if (mode === "online") {
      setIsOnlineTurn(false);
      socketRef.current?.emit("chess_move", {
        gameId,
        opponentId: opponent.id,
        gameState: engine.getGameState(),
        move: { fromRow, fromCol, toRow, toCol },
        captured: result.captured
      });
      
      // Check if game is over
      if (engine.gameOver) {
        let winner = "Unknown";
        if (engine.gameResult === "checkmate") {
          winner = engine.turn === "white" ? "Black" : "White";
          socketRef.current?.emit("chess_game_over", { 
            gameId, 
            opponentId: opponent.id, 
            winner: winner === "White" ? user.fullName : opponent.name,
            reason: "Checkmate" 
          });
        } else if (engine.gameResult === "stalemate" || engine.gameResult === "draw") {
          socketRef.current?.emit("chess_game_over", { 
            gameId, 
            opponentId: opponent.id, 
            winner: "Draw",
            reason: engine.gameResult 
          });
        }
      }
    }
  };

  const handlePromotion = (piece) => {
    if (promotionDialog) {
      makeMove(
        promotionDialog.fromRow,
        promotionDialog.fromCol,
        promotionDialog.toRow,
        promotionDialog.toCol,
        piece
      );
    }
  };

  const startAI = (level) => {
    const newEngine = new ChessEngine();
    setEngine(newEngine);
    setMode("ai");
    setDifficulty(level);
    setGameStarted(true);
    setSelected(null);
    setValidMoves([]);
    setGameOver(false);
    setMoveHistory([]);
    setMessage("Your turn — White");
  };

  const showOnline = () => {
    const s = socketRef.current;
    if (!s) {
      alert("Not connected to server.");
      return;
    }
    setShowOnlineList(true);
    setOnlinePlayers([]);
    s.emit("chess_get_online");
    s.off("chess_online_list");
    s.on("chess_online_list", (list) => {
      if (Array.isArray(list)) {
        setOnlinePlayers(list.filter(p => p.userId !== user.id));
      } else {
        setOnlinePlayers([]);
      }
    });
  };

  const challengePlayer = (playerId) => {
    const s = socketRef.current;
    if (!s) {
      alert("Not connected.");
      return;
    }
    s.emit("chess_invite", { 
      toUserId: playerId, 
      fromUserId: user.id, 
      fromName: user.fullName 
    });
    setShowOnlineList(false);
    setMessage("⚔️ Challenge sent! Waiting for response...");
  };

  const forfeit = () => {
    if (window.confirm("Are you sure you want to forfeit the game?")) {
      socketRef.current?.emit("chess_forfeit", { 
        gameId, 
        opponentId: opponent.id, 
        winnerName: opponent.name 
      });
      setGameOver(true);
      setMessage(`🏳️ ${opponent.name} wins by forfeit!`);
    }
  };

  const rematch = () => {
    socketRef.current?.emit("chess_rematch", { 
      gameId, 
      opponentId: opponent.id, 
      fromName: user.fullName 
    });
  };

  const reset = () => {
    setMode(null);
    setGameStarted(false);
    setDifficulty(null);
    setEngine(new ChessEngine());
    setSelected(null);
    setValidMoves([]);
    setGameOver(false);
    setMoveHistory([]);
    setMessage("Choose a mode to start");
    setOpponent(null);
    setPromotionDialog(null);
    setIsOnlineTurn(false);
  };

  const isMobile = windowWidth <= 768;
  const sq = isMobile ? Math.min(windowWidth - 32, 400) / 8 : 56;

  // Promotion Dialog
  if (promotionDialog) {
    const isWhite = engine.turn === "white";
    const pieces = isWhite ? ["♕", "♖", "♗", "♘"] : ["♛", "♜", "♝", "♞"];
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={s.promotionOverlay}
        onClick={() => setPromotionDialog(null)}
      >
        <div style={s.promotionDialog} onClick={e => e.stopPropagation()}>
          <h3 style={s.promotionTitle}>Choose Promotion</h3>
          <div style={s.promotionOptions}>
            {pieces.map(piece => (
              <motion.div
                key={piece}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={s.promotionOption}
                onClick={() => handlePromotion(piece)}
              >
                <span style={{ fontSize: 48 }}>{piece}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Start screen
  if (!gameStarted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.container}>
        <div style={s.headerRow}>
          <button onClick={() => navigate('/games')} style={s.pillBtn}>← Games</button>
          <div>
            <h1 style={s.title}>♟️ Chess</h1>
            <p style={s.sub}>Choose a mode</p>
          </div>
        </div>
        <div style={s.modeContainer}>
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }} 
            onClick={() => setMode("ai")} 
            style={{ ...s.modeCard, borderColor: "#8b5cf6" }}
          >
            <span style={s.modeIcon}>🤖</span>
            <div>
              <h3 style={s.modeTitle}>Play vs AI</h3>
              <p style={s.modeDesc}>Challenge the computer</p>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }} 
            onClick={showOnline} 
            style={{ ...s.modeCard, borderColor: "#3b82f6" }}
          >
            <span style={s.modeIcon}>🌐</span>
            <div>
              <h3 style={s.modeTitle}>Play Online</h3>
              <p style={s.modeDesc}>Challenge a ZUCA member</p>
            </div>
          </motion.div>
        </div>

        {mode === "ai" && (
          <div style={s.diffContainer}>
            <h2 style={s.diffTitle}>Choose Difficulty</h2>
            {[
              { level: "easy", color: "#10b981", icon: "🟢", name: "Easy", desc: "Random moves" },
              { level: "medium", color: "#f59e0b", icon: "🟡", name: "Medium", desc: "Strategic captures" },
              { level: "hard", color: "#ef4444", icon: "🔴", name: "Hard", desc: "Advanced tactics" }
            ].map(d => (
              <motion.div
                key={d.level}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startAI(d.level)}
                style={{ ...s.diffCard, borderColor: d.color }}
              >
                <span style={s.diffIcon}>{d.icon}</span>
                <div>
                  <h3 style={s.diffName}>{d.name}</h3>
                  <p style={s.diffDesc}>{d.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showOnlineList && (
          <div style={s.modalOverlay} onClick={() => setShowOnlineList(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h3 style={s.modalTitle}>Online Players</h3>
              {onlinePlayers.length === 0 ? (
                <p style={s.modalEmpty}>No players online</p>
              ) : (
                onlinePlayers.map(p => (
                  <div key={p.userId} style={s.playerRow} onClick={() => challengePlayer(p.userId)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {p.profileImage ? (
                        <img src={p.profileImage} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
                          {p.fullName?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{p.fullName || "Unknown"}</div>
                        {p.membership && (
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.membership}</div>
                        )}
                      </div>
                    </div>
                    <span style={s.challengeBtn}>⚔️ Challenge</span>
                  </div>
                ))
              )}
              <button onClick={() => setShowOnlineList(false)} style={s.closeBtn}>Close</button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Game screen
  const state = engine.getGameState();
  const board = state.board;
  const isMyTurn = mode === "ai" ? engine.turn === "white" : (mode === "online" && engine.turn === myColorRef.current && isOnlineTurn);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.container}>
      <div style={s.headerRow}>
        <button onClick={reset} style={s.pillBtn}>← Back</button>
        <div>
          <h1 style={s.title}>♟️ Chess</h1>
          <p style={s.sub}>
            {mode === "ai" ? `vs AI (${difficulty})` : opponent ? `vs ${opponent.name}` : 'Online'}
            {mode === "online" && (
              <span style={{ marginLeft: "8px", fontSize: "11px", color: myColorRef.current === "white" ? "#2563eb" : "#dc2626" }}>
                ({myColorRef.current === "white" ? "⚪ White" : "⚫ Black"})
              </span>
            )}
          </p>
        </div>
      </div>

      <div style={{ 
        ...s.statusBar, 
        background: gameOver ? "#fef2f2" : 
          (engine.isInCheck() ? "#fef3c7" : 
          aiThinking ? "#eff6ff" : "#f0fdf4"),
        borderColor: gameOver ? "#ef4444" : 
          (engine.isInCheck() ? "#f59e0b" : 
          aiThinking ? "#3b82f6" : "#10b981")
      }}>
        <span style={s.statusText}>
          {aiThinking && "⏳ "}
          {gameOver && "🏁 "}
          {engine.isInCheck() && "⚠️ "}
          {message}
          {!gameOver && !aiThinking && mode === "online" && !isMyTurn && " ⏳ Waiting..."}
        </span>
      </div>

      <div style={s.capRow}>
        <span style={s.capLabel}>Captured by opponent:</span>
        <span style={s.capPieces}>{state.capturedWhite.join(" ")}</span>
      </div>
      <div style={s.capRow}>
        <span style={s.capLabel}>Captured by you:</span>
        <span style={s.capPieces}>{state.capturedBlack.join(" ")}</span>
      </div>

      <div style={{ ...s.boardOuter, width: sq * 8 + 6 }}>
        <div style={s.boardInner}>
          {board.map((row, ri) => (
            <div key={ri} style={s.boardRow}>
              {row.map((piece, ci) => {
                const isBlack = (ri + ci) % 2 === 1;
                const isSelected = selected?.row === ri && selected?.col === ci;
                const isValid = validMoves.some(m => m.toRow === ri && m.toCol === ci);
                const canClick = !gameOver && !aiThinking && 
                  ((mode === "ai" && engine.turn === "white") || 
                   (mode === "online" && isMyTurn));
                
                return (
                  <div
                    key={ci}
                    onClick={() => handleSquareClick(ri, ci)}
                    style={{
                      ...s.square,
                      width: sq,
                      height: sq,
                      background: isSelected ? "#fbbf24" : 
                        isValid ? (piece ? "#fecaca" : "#bbf7d0") : 
                        isBlack ? "#94a3b8" : "#f1f5f9",
                      cursor: canClick && ((piece && engine.getPieceColor(piece) === engine.turn) || isValid) ? "pointer" : "default",
                      opacity: (!canClick && piece && engine.getPieceColor(piece) === engine.turn) ? 1 : 
                        (piece && engine.getPieceColor(piece) === engine.turn) ? 1 : 0.8
                    }}
                  >
                    {ci === 0 && <span style={s.coord}>{8 - ri}</span>}
                    {ri === 7 && (
                      <span style={{ ...s.coord, bottom: 1, right: 2, left: "auto" }}>
                        {String.fromCharCode(97 + ci)}
                      </span>
                    )}
                    <span style={{ ...s.piece, fontSize: Math.max(sq * 0.6, 18) }}>
                      {piece}
                    </span>
                    {isValid && !piece && (
                      <div style={{
                        position: "absolute",
                        width: sq * 0.25,
                        height: sq * 0.25,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.2)",
                        pointerEvents: "none"
                      }} />
                    )}
                    {isValid && piece && (
                      <div style={{
                        position: "absolute",
                        width: sq * 0.9,
                        height: sq * 0.9,
                        borderRadius: "50%",
                        border: "3px solid rgba(0,0,0,0.2)",
                        pointerEvents: "none"
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={s.controls}>
        {mode === "online" && !gameOver && (
          <button onClick={forfeit} style={{ ...s.ctrlBtn, background: "#ef4444" }}>
            🏳️ Forfeit
          </button>
        )}
        {mode === "online" && gameOver && (
          <button onClick={rematch} style={{ ...s.ctrlBtn, background: "#3b82f6" }}>
            🔄 Rematch
          </button>
        )}
        <button onClick={reset} style={{ ...s.ctrlBtn, background: "#64748b" }}>
          ↩ Leave
        </button>
      </div>

      {/* Move history */}
      {moveHistory.length > 0 && (
        <div style={s.moveHistory}>
          <div style={s.moveHistoryTitle}>Move History</div>
          <div style={s.moveHistoryList}>
            {moveHistory.map((move, index) => (
              <span key={index} style={s.moveHistoryItem}>
                {index + 1}. {String.fromCharCode(97 + move.from.col)}{8 - move.from.row}
                {move.captured ? "×" : "-"}
                {String.fromCharCode(97 + move.to.col)}{8 - move.to.row}
                {move.isCheckmate && "#"}
                {move.isCheck && "+"}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==================== STYLES ====================

const s = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "16px",
    fontFamily: "'Inter',-apple-system,sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    width: "100%",
    maxWidth: "600px",
    flexWrap: "wrap"
  },
  pillBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 14px",
    background: "white",
    border: "2px solid #e2e8f0",
    borderRadius: "50px",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  title: {
    fontSize: "clamp(18px,5vw,24px)",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0
  },
  sub: {
    fontSize: "12px",
    color: "#64748b",
    margin: "2px 0 0"
  },
  statusBar: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "2px solid",
    marginBottom: "10px",
    width: "100%",
    maxWidth: "500px",
    display: "flex",
    justifyContent: "center"
  },
  statusText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center"
  },
  capRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px",
    fontSize: "12px",
    width: "100%",
    maxWidth: "500px"
  },
  capLabel: {
    color: "#64748b",
    fontWeight: "500",
    minWidth: "120px"
  },
  capPieces: {
    fontSize: "16px"
  },
  boardOuter: {
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    border: "2px solid #475569",
    maxWidth: "95vw"
  },
  boardInner: {
    display: "flex",
    flexDirection: "column"
  },
  boardRow: {
    display: "flex"
  },
  square: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "background 0.15s",
    userSelect: "none"
  },
  coord: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: "8px",
    fontWeight: "600",
    color: "#475569",
    opacity: 0.5,
    pointerEvents: "none"
  },
  piece: {
    cursor: "pointer",
    userSelect: "none",
    lineHeight: 1,
    zIndex: 1
  },
  controls: {
    marginTop: "14px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center"
  },
  ctrlBtn: {
    padding: "10px 18px",
    color: "white",
    border: "none",
    borderRadius: "25px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer"
  },
  modeContainer: {
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
    marginTop: "20px"
  },
  modeCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    background: "white",
    borderRadius: "14px",
    border: "2px solid",
    marginBottom: "10px",
    cursor: "pointer",
    textAlign: "left"
  },
  modeIcon: {
    fontSize: "30px"
  },
  modeTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 3px"
  },
  modeDesc: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0
  },
  diffContainer: {
    textAlign: "center",
    maxWidth: "380px",
    width: "100%",
    marginTop: "20px"
  },
  diffTitle: {
    fontSize: "clamp(18px,4vw,22px)",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "20px"
  },
  diffCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    background: "white",
    borderRadius: "14px",
    border: "2px solid",
    marginBottom: "10px",
    cursor: "pointer",
    textAlign: "left"
  },
  diffIcon: {
    fontSize: "30px"
  },
  diffName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 3px"
  },
  diffDesc: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px"
  },
  modal: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    maxWidth: "350px",
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto"
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "16px",
    textAlign: "center"
  },
  modalEmpty: {
    textAlign: "center",
    color: "#64748b",
    padding: "20px"
  },
  playerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    cursor: "pointer",
    borderRadius: "8px"
  },
  challengeBtn: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: "12px"
  },
  closeBtn: {
    marginTop: "12px",
    width: "100%",
    padding: "10px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px"
  },
  promotionOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000
  },
  promotionDialog: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "400px",
    width: "90%"
  },
  promotionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: "20px"
  },
  promotionOptions: {
    display: "flex",
    justifyContent: "space-around",
    gap: "10px"
  },
  promotionOption: {
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  moveHistory: {
    marginTop: "16px",
    padding: "12px",
    background: "white",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "120px",
    overflowY: "auto",
    border: "1px solid #e2e8f0"
  },
  moveHistoryTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "8px"
  },
  moveHistoryList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px"
  },
  moveHistoryItem: {
    fontSize: "12px",
    color: "#1e293b",
    background: "#f8fafc",
    padding: "2px 8px",
    borderRadius: "4px"
  }
};