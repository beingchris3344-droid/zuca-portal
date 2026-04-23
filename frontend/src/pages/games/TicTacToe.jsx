import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import io from "socket.io-client";
import BASE_URL from "../../api";

function TicTacToe() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameMode, setGameMode] = useState(null);
  const [userChoice, setUserChoice] = useState(null);
  const [scores, setScores] = useState({ user: 0, zuca: 0, ties: 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  
  // Multiplayer states
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [invites, setInvites] = useState([]);
  const [multiplayerGame, setMultiplayerGame] = useState({
    isActive: false,
    gameId: null,
    opponent: null,
    playerSymbol: null,
    isMyTurn: false
  });
  
  const socketRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const multiplayerGameRef = useRef({
    isActive: false,
    gameId: null,
    opponent: null,
    playerSymbol: null,
    isMyTurn: false
  });

  const boardRef = useRef(Array(9).fill(null));

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Initialize
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
    
    socketRef.current = io(BASE_URL);
    socketRef.current.emit("join", userData.id);
    
    socketRef.current.on("game_invite_received", handleInviteReceived);
    socketRef.current.on("game_start", handleGameStart);
    socketRef.current.on("opponent_move", handleOpponentMove);
    socketRef.current.on("game_finished", handleGameFinished);
    socketRef.current.on("game_invite_declined", handleInviteDeclined);
    socketRef.current.on("game_reset_opponent", handleGameResetOpponent);
    
    fetchAllUsers();
    fetchInvites();
    
    return () => {
      socketRef.current.disconnect();
    };
  }, [token, navigate]);

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/games/users`, { headers });
      setAllUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/games/invites`, { headers });
      setInvites(response.data);
    } catch (err) {
      console.error("Error fetching invites:", err);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter(u => 
        u.fullName.toLowerCase().includes(term) ||
        (u.membership_number && u.membership_number.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every(s => s !== null)) return { winner: 'tie', line: [] };
    return null;
  };

  const minimax = (newBoard, depth, isMaximizing, aiSymbol, playerSymbol) => {
    const result = calculateWinner(newBoard);
    if (result) {
      if (result.winner === aiSymbol) return 10 - depth;
      if (result.winner === playerSymbol) return -10 + depth;
      if (result.winner === 'tie') return 0;
    }
    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = aiSymbol;
          let score = minimax(newBoard, depth + 1, false, aiSymbol, playerSymbol);
          newBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = playerSymbol;
          let score = minimax(newBoard, depth + 1, true, aiSymbol, playerSymbol);
          newBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (currentBoard, aiSymbol, playerSymbol) => {
    let bestScore = -Infinity;
    let bestMove = null;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = aiSymbol;
        let score = minimax(currentBoard, 0, false, aiSymbol, playerSymbol);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  const getAIMove = (currentBoard, aiSymbol, playerSymbol) => {
    const emptySquares = currentBoard.map((sq, idx) => sq === null ? idx : null).filter(v => v !== null);
    if (difficulty === 'easy') {
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    } else if (difficulty === 'medium') {
      if (Math.random() < 0.7) {
        return getBestMove([...currentBoard], aiSymbol, playerSymbol);
      } else {
        return emptySquares[Math.floor(Math.random() * emptySquares.length)];
      }
    } else {
      return getBestMove([...currentBoard], aiSymbol, playerSymbol);
    }
  };

  const handleClick = (index) => {
    if (multiplayerGame.isActive) {
      makeMultiplayerMove(index);
      return;
    }
    if (winner || board[index] || !gameStarted) return;
    if (gameMode === 'ai' && currentTurn !== 'user') return;

    const newBoard = [...board];
    const userSymbol = userChoice === 'X' ? 'X' : 'O';
    newBoard[index] = userSymbol;
    setBoard(newBoard);
    setCurrentTurn('zuca');

    const result = calculateWinner(newBoard);
    if (result) {
      if (result.winner === 'tie') {
        setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
        setWinner('tie');
      } else if (result.winner === userSymbol) {
        setScores(prev => ({ ...prev, user: prev.user + 1 }));
        setWinner('user');
      } else {
        setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
        setWinner('zuca');
      }
      setGameStarted(false);
    }
  };

  const aiMove = () => {
    if (winner || !gameStarted || gameMode !== 'ai' || currentTurn !== 'zuca') return;
    const emptySquares = board.map((sq, idx) => sq === null ? idx : null).filter(v => v !== null);
    if (emptySquares.length === 0) return;
    
    const zucaSymbol = userChoice === 'X' ? 'O' : 'X';
    const playerSymbol = userChoice === 'X' ? 'X' : 'O';
    const aiMoveIndex = getAIMove([...board], zucaSymbol, playerSymbol);
    
    setTimeout(() => {
      const newBoard = [...board];
      newBoard[aiMoveIndex] = zucaSymbol;
      setBoard(newBoard);
      setCurrentTurn('user');
      const result = calculateWinner(newBoard);
      if (result) {
        if (result.winner === 'tie') {
          setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
          setWinner('tie');
        } else if (result.winner === zucaSymbol) {
          setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
          setWinner('zuca');
        } else {
          setScores(prev => ({ ...prev, user: prev.user + 1 }));
          setWinner('user');
        }
        setGameStarted(false);
      }
    }, 400);
  };

  useEffect(() => {
    if (gameMode === 'ai' && gameStarted && currentTurn === 'zuca' && !winner && !multiplayerGame.isActive) {
      aiMove();
    }
  }, [currentTurn, gameStarted, winner, gameMode]);

  // ==================== MULTIPLAYER FUNCTIONS ====================
  
  const handleInviteReceived = (data) => {
    setPendingInvite(data);
    fetchInvites();
    setNotification({
      title: "🎮 Game Invite!",
      message: `${data.fromUser.fullName} wants to play Tic Tac Toe with you!`,
      type: "invite"
    });
  };

const handleGameStart = (data) => {
  if (multiplayerGame.isActive && multiplayerGame.gameId === data.gameId) return;
  
  if (socketRef.current) {
    socketRef.current.emit("join_game_room", data.gameId);
  }
  
  // ✅ This should now receive the real name from backend
  const opponentName = data.opponent?.fullName || "Opponent";
  
  const gameData = {
    isActive: true,
    gameId: data.gameId,
    opponent: {
      id: data.opponent?.id,
      fullName: opponentName
    },
    playerSymbol: data.playerSymbol,
    isMyTurn: data.firstTurn
  };
  
  const emptyBoard = Array(9).fill(null);
  boardRef.current = emptyBoard;
  setBoard(emptyBoard);
  setMultiplayerGame(gameData);
  multiplayerGameRef.current = gameData;
  setWinner(null);
  setGameStarted(true);
  setGameMode(null);
  
  setNotification({
    title: "🎮 Game Started!",
    message: `You are playing against ${opponentName} as ${data.playerSymbol}. ${data.firstTurn ? "You go first!" : `${opponentName} goes first.`}`,
    type: "success"
  });
  setTimeout(() => setNotification(null), 3000);
};

  const handleOpponentMove = (data) => {
    if (multiplayerGameRef.current.gameId !== data.gameId) return;
    if (!multiplayerGameRef.current.isActive) return;
    
    const newBoard = [...boardRef.current];
    newBoard[data.index] = data.symbol;
    const result = calculateWinner(newBoard);
    
    if (result) {
      boardRef.current = newBoard;
      setBoard(newBoard);
      if (result.winner === 'tie') {
        setWinner('tie');
      } else if (result.winner === data.symbol) {
        setWinner('opponent');
      }
      setGameStarted(false);
      setMultiplayerGame(prev => ({ ...prev, isActive: false }));
      multiplayerGameRef.current.isActive = false;
      return;
    }
    
    boardRef.current = newBoard;
    setBoard(newBoard);
    setMultiplayerGame(prev => ({ ...prev, isMyTurn: true }));
    multiplayerGameRef.current.isMyTurn = true;
  };

  const handleGameFinished = (data) => {
    if (!winner) {
      if (data.winner === user?.id) setWinner('user');
      else if (data.winner === "tie") setWinner('tie');
      else setWinner('opponent');
      setGameStarted(false);
      setMultiplayerGame(prev => ({ ...prev, isActive: false }));
      multiplayerGameRef.current.isActive = false;
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGameResetOpponent = (data) => {
    const emptyBoard = Array(9).fill(null);
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setWinner(null);
    setGameStarted(true);
    setMultiplayerGame(prev => ({ ...prev, isActive: true, isMyTurn: false }));
    multiplayerGameRef.current.isActive = true;
    multiplayerGameRef.current.isMyTurn = false;
  };

  const handleInviteDeclined = (data) => {
    setNotification({ title: "Invite Declined", message: data.message, type: "error" });
    setTimeout(() => setNotification(null), 3000);
  };

  const sendGameInvite = (opponentId, opponentName) => {
    socketRef.current.emit("send_game_invite", {
      fromUserId: user.id,
      toUserId: opponentId,
      fromUserName: user.fullName,
      gameType: "tictactoe"
    });
    setNotification({ title: "Invite Sent!", message: `Game invite sent to ${opponentName}`, type: "success" });
    setShowInviteModal(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const acceptInvite = () => {
    if (!pendingInvite) return;
    socketRef.current.emit("accept_game_invite", {
      inviteId: pendingInvite.id,
      fromUserId: pendingInvite.fromUser.id,
      toUserId: user.id,
      gameType: "tictactoe"
    });
    setPendingInvite(null);
    setNotification(null);
    fetchInvites();
  };

  const declineInvite = () => {
    if (!pendingInvite) return;
    socketRef.current.emit("decline_game_invite", {
      inviteId: pendingInvite.id,
      fromUserId: pendingInvite.fromUser.id
    });
    setPendingInvite(null);
    setNotification(null);
    fetchInvites();
  };

  const acceptInviteById = (inviteId, fromUserId) => {
    socketRef.current.emit("accept_game_invite", {
      inviteId: inviteId,
      fromUserId: fromUserId,
      toUserId: user.id,
      gameType: "tictactoe"
    });
    fetchInvites();
  };

  const declineInviteById = (inviteId, fromUserId) => {
    socketRef.current.emit("decline_game_invite", {
      inviteId: inviteId,
      fromUserId: fromUserId
    });
    fetchInvites();
  };

  const makeMultiplayerMove = (index) => {
    if (!multiplayerGameRef.current.isActive) return;
    if (!multiplayerGameRef.current.isMyTurn) return;
    if (boardRef.current[index]) return;
    if (winner) return;

    const newBoard = [...boardRef.current];
    const currentSymbol = multiplayerGameRef.current.playerSymbol;
    newBoard[index] = currentSymbol;
    
    const result = calculateWinner(newBoard);
    
    if (result) {
      boardRef.current = newBoard;
      setBoard(newBoard);
      if (result.winner === 'tie') {
        setWinner('tie');
      } else if (result.winner === currentSymbol) {
        setWinner('user');
      } else {
        setWinner('opponent');
      }
      setGameStarted(false);
      setMultiplayerGame(prev => ({ ...prev, isActive: false }));
      multiplayerGameRef.current.isActive = false;
      socketRef.current.emit("game_over", { 
        gameId: multiplayerGameRef.current.gameId, 
        winner: result.winner === 'tie' ? "tie" : user.id 
      });
      return;
    }
    
    boardRef.current = newBoard;
    setBoard(newBoard);
    setMultiplayerGame(prev => ({ ...prev, isMyTurn: false }));
    multiplayerGameRef.current.isMyTurn = false;
    
    socketRef.current.emit("game_move", {
      gameId: multiplayerGameRef.current.gameId,
      index: index,
      symbol: currentSymbol,
      nextTurn: multiplayerGameRef.current.opponent.id,
      board: newBoard
    });
  };

  const resetMultiplayerGame = () => {
    const emptyBoard = Array(9).fill(null);
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setWinner(null);
    setGameStarted(true);
    setMultiplayerGame(prev => ({ ...prev, isActive: true, isMyTurn: prev.playerSymbol === 'X' }));
    multiplayerGameRef.current.isActive = true;
    multiplayerGameRef.current.isMyTurn = multiplayerGameRef.current.playerSymbol === 'X';
    socketRef.current.emit("game_reset", {
      gameId: multiplayerGameRef.current.gameId,
      opponentId: multiplayerGameRef.current.opponent.id
    });
  };

  // ==================== GAME INITIALIZATION ====================
  
  const startGame = (choice) => {
    setUserChoice(choice);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn(choice === 'X' ? 'user' : 'zuca');
  };

  const startWithDifficulty = (level) => {
    setDifficulty(level);
    setGameMode('ai');
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn(userChoice === 'X' ? 'user' : 'zuca');
  };

  const changeMode = () => {
    setGameMode(null);
    setGameStarted(false);
    setUserChoice(null);
    setWinner(null);
    setBoard(Array(9).fill(null));
    setDifficulty(null);
    setMultiplayerGame({ isActive: false, gameId: null, opponent: null, playerSymbol: null, isMyTurn: false });
    multiplayerGameRef.current = { isActive: false, gameId: null, opponent: null, playerSymbol: null, isMyTurn: false };
  };

  // ==================== RENDER SCREENS ====================
  
  if (!gameMode && !multiplayerGame.isActive) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={() => setShowInviteModal(true)} style={styles.multiplayerBtn}>👥 Play Online</button>
        </div>
        <h1 style={styles.title}>🎮 Tic Tac Toe</h1>
        
        {invites.length > 0 && (
          <div style={styles.pendingInvitesContainer}>
            <h3 style={styles.pendingInvitesTitle}>📨 Pending Game Invites ({invites.length})</h3>
            {invites.map(invite => (
              <div key={invite.id} style={styles.pendingInviteCard}>
                <div style={styles.pendingInviteInfo}>
                  <span style={styles.pendingInviteName}>{invite.fromUser.fullName}</span>
                  <span style={styles.pendingInviteTime}>{new Date(invite.createdAt).toLocaleTimeString()}</span>
                </div>
                <div style={styles.pendingInviteButtons}>
                  <button style={styles.acceptInviteBtnSmall} onClick={() => acceptInviteById(invite.id, invite.fromUser.id)}>Accept</button>
                  <button style={styles.declineInviteBtnSmall} onClick={() => declineInviteById(invite.id, invite.fromUser.id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={styles.modeContainer}>
          <button style={styles.modeBtn} onClick={() => setGameMode('twoPlayer')}>👥 Two Players (Local)</button>
        </div>
        <div style={styles.difficultyContainer}>
          <h3 style={styles.difficultyTitle}>Select Difficulty vs ZUCA AI</h3>
          <div style={styles.difficultyButtons}>
            <button style={{...styles.difficultyBtn, background: '#10b981'}} onClick={() => startWithDifficulty('easy')}>🟢 Easy</button>
            <button style={{...styles.difficultyBtn, background: '#f59e0b'}} onClick={() => startWithDifficulty('medium')}>🟡 Medium</button>
            <button style={{...styles.difficultyBtn, background: '#ef4444'}} onClick={() => startWithDifficulty('hard')}>🔴 Hard (Unbeatable)</button>
          </div>
        </div>
        
        <AnimatePresence>
          {showInviteModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>👥 Invite a Friend</h3>
                <div style={styles.searchContainer}>
                  <input type="text" placeholder="🔍 Search by name or membership number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.onlineList}>
                  {filteredUsers.length === 0 ? <p style={styles.noOnline}>No users found</p> : filteredUsers.map(u => (
                    <div key={u.id} style={styles.userItem} onClick={() => sendGameInvite(u.id, u.fullName)}>
                      <div style={styles.userAvatar}>
                        {u.profileImage ? <img src={u.profileImage} alt={u.fullName} style={styles.avatarImage} /> : u.fullName?.charAt(0).toUpperCase()}
                        <span style={{...styles.onlineDot, background: u.isOnline ? '#10b981' : '#94a3b8'}}></span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.userName}>{u.fullName}</span>
                        <span style={styles.userMembership}>{u.membership_number || 'No membership'}</span>
                      </div>
                      <button style={styles.inviteUserBtn}>Invite →</button>
                    </div>
                  ))}
                </div>
                <button style={styles.closeModalBtn} onClick={() => setShowInviteModal(false)}>Close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (pendingInvite) {
    return (
      <div style={styles.container}>
        <div style={styles.invitePopup}>
          <h3>🎮 Game Invite!</h3>
          <p>{pendingInvite.fromUser.fullName} wants to play Tic Tac Toe!</p>
          <div style={styles.invitePopupButtons}>
            <button style={styles.acceptInviteBtn} onClick={acceptInvite}>Accept</button>
            <button style={styles.declineInviteBtn} onClick={declineInvite}>Decline</button>
          </div>
        </div>
      </div>
    );
  }

  if (multiplayerGame.isActive) {
    const isMyTurn = multiplayerGame.isMyTurn;
    const playerSymbol = multiplayerGame.playerSymbol;
    const opponentSymbol = playerSymbol === 'X' ? 'O' : 'X';
    
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.changeModeBtn}>Exit Game</button>
        </div>
<h1 style={styles.title}>🎮 Tic Tac Toe (Online vs {multiplayerGame.opponent?.fullName?.split(' ')[0]})</h1>        
        <div style={styles.playersInfo}>
          <div style={{ ...styles.playerCard, ...(isMyTurn && !winner && styles.activeTurn) }}>
            <div style={styles.playerSymbol}>{playerSymbol}</div>
            <div style={styles.playerName}>You</div>
            {isMyTurn && !winner && <div style={styles.turnIndicator}>⬅️ Your Turn</div>}
          </div>
          <div style={styles.vsDivider}>VS</div>
          <div style={{ ...styles.playerCard, ...(!isMyTurn && !winner && styles.activeTurn) }}>
  <div style={styles.playerSymbol}>{opponentSymbol}</div>
  <div style={styles.playerName}>{multiplayerGame.opponent?.fullName?.split(' ')[0] || 'Opponent'}</div>
  {!isMyTurn && !winner && <div style={styles.turnIndicator}>🤔 Their Turn</div>}
</div>
        </div>
        
        <div style={styles.board}>
          {board.map((cell, index) => (
            <motion.button
              key={index}
              style={styles.cell}
              onClick={() => makeMultiplayerMove(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!!winner || !isMyTurn || cell !== null}
            >
              {cell && <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}>{cell}</motion.span>}
            </motion.button>
          ))}
        </div>
        
       {winner && (
  <div style={styles.winnerMessage}>
    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
      {winner === 'tie' ? "🤝 It's a Tie! 🤝" : 
       winner === 'user' ? `🎉 You Win! 🎉` : 
       `🏆 ${multiplayerGame.opponent?.fullName?.split(' ')[0] || 'Opponent'} Wins! 🏆`}
    </div>
    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
      <button style={styles.playAgainBtn} onClick={resetMultiplayerGame}>Play Again</button>
      <button style={styles.exitGameBtn} onClick={changeMode}>Exit Game</button>
    </div>
  </div>
)}
        
        {!winner && (
  <div style={styles.statusMessage}>
    {isMyTurn ? "👆 Your turn - Tap a square" : `⏳ Waiting for ${multiplayerGame.opponent?.fullName?.split(' ')[0] || 'opponent'}...`}
  </div>
)}
      </div>
    );
  }

  if (!userChoice && gameMode === 'ai') {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
        </div>
        <h1 style={styles.title}>🎮 Tic Tac Toe (vs {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'} AI)</h1>
        <div style={styles.choiceContainer}>
          <h2 style={styles.choiceTitle}>Choose your symbol</h2>
          <div style={styles.choiceButtons}>
            <button style={styles.choiceBtn} onClick={() => startGame('X')}><span style={styles.choiceSymbol}>X</span><span style={styles.choiceLabel}>Play as X (Go First)</span></button>
            <button style={styles.choiceBtn} onClick={() => startGame('O')}><span style={styles.choiceSymbol}>O</span><span style={styles.choiceLabel}>Play as O (Go Second)</span></button>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'twoPlayer') {
    const isXTurn = currentTurn === 'user';
    
    const handleTwoPlayerClick = (index) => {
      if (winner || board[index]) return;
      const newBoard = [...board];
      newBoard[index] = isXTurn ? 'X' : 'O';
      setBoard(newBoard);
      setCurrentTurn(isXTurn ? 'zuca' : 'user');
      const result = calculateWinner(newBoard);
      if (result) {
        if (result.winner === 'tie') {
          setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
          setWinner('tie');
        } else if (result.winner === 'X') {
          setScores(prev => ({ ...prev, user: prev.user + 1 }));
          setWinner('X');
        } else {
          setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
          setWinner('O');
        }
        setGameStarted(false);
      }
    };
    
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
        </div>
        <h1 style={styles.title}>🎮 Tic Tac Toe (2 Players)</h1>
        <div style={styles.playersInfo}>
          <div style={{ ...styles.playerCard, ...(isXTurn && !winner && styles.activeTurn) }}>
            <div style={styles.playerSymbol}>X</div>
            <div style={styles.playerName}>Player 1</div>
            <div style={styles.playerScore}>{scores.user}</div>
            {isXTurn && !winner && <div style={styles.turnIndicator}>⬅️ Turn</div>}
          </div>
          <div style={styles.vsDivider}>VS</div>
          <div style={{ ...styles.playerCard, ...(!isXTurn && !winner && styles.activeTurn) }}>
            <div style={styles.playerSymbol}>O</div>
            <div style={styles.playerName}>Player 2</div>
            <div style={styles.playerScore}>{scores.zuca}</div>
            {!isXTurn && !winner && <div style={styles.turnIndicator}>⬅️ Turn</div>}
          </div>
        </div>
        <div style={styles.tiesScore}>Ties: {scores.ties}</div>
        <div style={styles.board}>
          {board.map((cell, index) => (
            <motion.button key={index} style={styles.cell} onClick={() => handleTwoPlayerClick(index)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!!winner}>
              {cell && <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}>{cell}</motion.span>}
            </motion.button>
          ))}
        </div>
        {winner && <div style={styles.winnerMessage}>{winner === 'tie' ? "It's a Tie! 🤝" : `Player ${winner} Wins! 🎉`}<button style={styles.playAgainBtn} onClick={resetGame}>Play Again</button></div>}
        {!winner && <div style={styles.statusMessage}>{isXTurn ? "Player X's turn" : "Player O's turn"}</div>}
        {!winner && <button style={styles.resetBtn} onClick={resetGame}>Reset Game</button>}
      </div>
    );
  }

  const userSymbol = userChoice === 'X' ? 'X' : 'O';
  const zucaSymbol = userChoice === 'X' ? 'O' : 'X';
  const isUserTurn = currentTurn === 'user';

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
        <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
      </div>
      <h1 style={styles.title}>🎮 Tic Tac Toe (vs {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'} AI)</h1>
      <div style={styles.playersInfo}>
        <div style={{ ...styles.playerCard, ...(currentTurn === 'user' && !winner && styles.activeTurn) }}>
          <div style={styles.playerSymbol}>{userSymbol}</div>
          <div style={styles.playerName}>{user?.fullName?.split(' ')[0] || 'You'}</div>
          <div style={styles.playerScore}>{scores.user}</div>
          {currentTurn === 'user' && !winner && <div style={styles.turnIndicator}>⬅️ Your Turn</div>}
        </div>
        <div style={styles.vsDivider}>VS</div>
        <div style={{ ...styles.playerCard, ...(currentTurn === 'zuca' && !winner && styles.activeTurn) }}>
          <div style={styles.playerSymbol}>{zucaSymbol}</div>
          <div style={styles.playerName}>ZUCA AI ({difficulty})</div>
          <div style={styles.playerScore}>{scores.zuca}</div>
          {currentTurn === 'zuca' && !winner && <div style={styles.turnIndicator}>🤖 Thinking...</div>}
        </div>
      </div>
      <div style={styles.tiesScore}>Ties: {scores.ties}</div>
      <div style={styles.board}>
        {board.map((cell, index) => (
          <motion.button key={index} style={styles.cell} onClick={() => handleClick(index)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!!winner || !gameStarted || currentTurn !== 'user'}>
            {cell && <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}>{cell}</motion.span>}
          </motion.button>
        ))}
      </div>
      {winner && (
        <div style={styles.winnerMessage}>
          {winner === 'tie' ? "It's a Tie! 🤝" : winner === 'user' ? `🎉 ${user?.fullName?.split(' ')[0] || 'You'} Wins! 🎉` : "🤖 ZUCA AI Wins! 🤖"}
          <button style={styles.playAgainBtn} onClick={resetGame}>Play Again</button>
        </div>
      )}
      {!winner && gameStarted && <div style={styles.statusMessage}>{isUserTurn ? `👆 Your turn (${userSymbol}) - Tap a square` : `🤖 ZUCA AI (${zucaSymbol}) is thinking...`}</div>}
      {!winner && gameStarted && <button style={styles.resetBtn} onClick={resetGame}>Reset Game</button>}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 220px)",
    height: "calc(100vh - 220px)",
    background: "linear-gradient(135deg, #8fa31ead 0%, #15121896 100%)",
    padding: "12px",
    marginBottom: "40px",
    marginTop: "60px",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
    position: "relative",
  },
  topBar: {
    position: "fixed",
    top: "70px",
    left: "0",
    right: "0",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "rgba(255,255,255,0.95)",
    zIndex: 100,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  backBtn: { padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  changeModeBtn: { padding: "8px 16px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  multiplayerBtn: { padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  title: { fontSize: "20px", fontWeight: "700", color: "white", marginBottom: "10px", marginTop: "60px", textAlign: "center" },
  pendingInvitesContainer: { width: "90%", maxWidth: "350px", background: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "10px", marginBottom: "15px" },
  pendingInvitesTitle: { fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1e293b", textAlign: "center" },
  pendingInviteCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "#f8fafc", borderRadius: "8px", marginBottom: "6px" },
  pendingInviteInfo: { display: "flex", flexDirection: "column" },
  pendingInviteName: { fontSize: "12px", fontWeight: "600", color: "#1e293b" },
  pendingInviteTime: { fontSize: "10px", color: "#64748b" },
  pendingInviteButtons: { display: "flex", gap: "5px" },
  acceptInviteBtnSmall: { padding: "4px 10px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" },
  declineInviteBtnSmall: { padding: "4px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" },
  modeContainer: { display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap", justifyContent: "center" },
  modeBtn: { padding: "12px 24px", fontSize: "16px", background: "white", color: "#667eea", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" },
  difficultyContainer: { marginTop: "30px", textAlign: "center" },
  difficultyTitle: { color: "white", fontSize: "16px", marginBottom: "15px" },
  difficultyButtons: { display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" },
  difficultyBtn: { padding: "10px 20px", fontSize: "14px", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" },
  choiceContainer: { background: "white", borderRadius: "20px", padding: "20px", textAlign: "center", marginTop: "20px" },
  choiceTitle: { fontSize: "18px", color: "#1e293b", marginBottom: "15px" },
  choiceButtons: { display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" },
  choiceBtn: { padding: "15px 25px", background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "16px", cursor: "pointer", transition: "all 0.2s" },
  choiceSymbol: { fontSize: "40px", fontWeight: "bold", display: "block", marginBottom: "8px" },
  choiceLabel: { fontSize: "12px", color: "#64748b" },
  playersInfo: { display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px", flexWrap: "wrap", justifyContent: "center" },
  playerCard: { background: "white", borderRadius: "16px", padding: "8px 16px", textAlign: "center", minWidth: "110px", transition: "all 0.3s" },
  activeTurn: { boxShadow: "0 0 0 3px #f59e0b, 0 4px 15px rgba(0,0,0,0.2)", transform: "scale(1.02)" },
  playerSymbol: { fontSize: "24px", fontWeight: "bold", marginBottom: "4px" },
  playerName: { fontSize: "12px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" },
  playerScore: { fontSize: "18px", fontWeight: "bold", color: "#3b82f6" },
  vsDivider: { fontSize: "14px", fontWeight: "bold", color: "white", background: "rgba(255,255,255,0.3)", padding: "5px 8px", borderRadius: "50%" },
  tiesScore: { background: "rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: "20px", color: "white", fontSize: "11px", marginBottom: "10px" },
  turnIndicator: { fontSize: "9px", color: "#f59e0b", marginTop: "4px", fontWeight: "500" },
  board: { display: "grid", gridTemplateColumns: "repeat(3, 75px)", gap: "6px", backgroundColor: "transparent", marginBottom: "10px" },
  cell: { width: "75px", height: "75px", backgroundColor: "white", border: "none", borderRadius: "14px", fontSize: "38px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  winnerMessage: { marginTop: "15px", padding: "15px 25px", backgroundColor: "#10b981", color: "white", borderRadius: "16px", textAlign: "center" },
  playAgainBtn: { marginLeft: "10px", padding: "5px 12px", backgroundColor: "white", color: "#10b981", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },
  exitGameBtn: { marginLeft: "10px", padding: "5px 12px", backgroundColor: "white", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },
  statusMessage: { marginTop: "10px", fontSize: "12px", color: "white", textAlign: "center", background: "rgba(0,0,0,0.3)", padding: "6px 12px", borderRadius: "30px" },
  resetBtn: { marginTop: "10px", padding: "6px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", borderRadius: "20px", padding: "20px", width: "90%", maxWidth: "350px", maxHeight: "80vh", overflow: "auto" },
  modalTitle: { fontSize: "18px", fontWeight: "600", marginBottom: "15px", textAlign: "center" },
  searchContainer: { marginBottom: "15px" },
  searchInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none" },
  onlineList: { maxHeight: "300px", overflowY: "auto" },
  userItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px", borderBottom: "1px solid #e2e8f0", cursor: "pointer" },
  userAvatar: { width: "40px", height: "40px", borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "600", position: "relative" },
  userInfo: { flex: 1, display: "flex", flexDirection: "column" },
  userName: { fontSize: "14px", fontWeight: "500" },
  userMembership: { fontSize: "11px", color: "#64748b" },
  statusBadge: { padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "500", marginRight: "8px" },
  onlineDot: { position: "absolute", bottom: "0", right: "0", width: "12px", height: "12px", borderRadius: "50%", border: "2px solid white" },
  avatarImage: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  inviteUserBtn: { padding: "6px 12px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  noOnline: { textAlign: "center", color: "#64748b", padding: "20px" },
  closeModalBtn: { width: "100%", padding: "10px", marginTop: "15px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  invitePopup: { background: "white", borderRadius: "20px", padding: "30px", textAlign: "center", maxWidth: "300px", margin: "auto" },
  invitePopupButtons: { display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" },
  acceptInviteBtn: { padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  declineInviteBtn: { padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
};

export default TicTacToe;