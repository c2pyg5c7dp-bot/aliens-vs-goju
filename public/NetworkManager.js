/**
 * NetworkManager.js - P2P Multiplayer Manager using PeerJS
 * Handles room creation, joining, and all network communication for co-op gameplay
 */

console.log('🌐 NetworkManager.js loading...');

class NetworkManager {
  constructor() {
    // Core networking
    this.peer = null;
    this.conn = null;
    this.connections = [];
    this.localPlayerId = null;
    
    // Room state
    this.isHost = false;
    this.roomCode = null;
    this.roomMetadata = null;
    this.maxPlayers = 4;
    
    // Player tracking
    this.players = new Map();
    
    // Event callbacks
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStateUpdate = null;
    this.onStartGame = null;
    this.onSpawnWave = null;
    this.onSpawnPowerup = null;
    this.onCollectPowerup = null;
    this.onSpawnProjectile = null;
    this.onEnemyDamage = null;
    this.onEnemyKilled = null;
    this.onRequestGameState = null;
    this.onGameStateSnapshot = null;
  }

  /**
   * Initialize PeerJS connection
   * @returns {Promise<string>} Resolves with peer ID
   */
  init() {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') {
        const error = new Error('PeerJS library not loaded. Please refresh the page.');
        console.error('❌', error.message);
        reject(error);
        return;
      }

      try {
        this.peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.localPlayerId = id;
          console.log('✅ PeerJS connected! ID:', id);
          resolve(id);
        });

        this.peer.on('error', (err) => {
          console.error('❌ PeerJS error:', err);
          reject(err);
        });

        this.peer.on('connection', (conn) => {
          console.log('📞 Incoming connection from:', conn.peer);
          this.handleConnection(conn);
        });
      } catch (error) {
        console.error('❌ Failed to initialize PeerJS:', error);
        reject(error);
      }
    });
  }

  /**
   * Create a new multiplayer room (host)
   * @returns {string|null} Room code or null if failed
   */
  createRoom() {
    if (!this.peer) {
      console.error('❌ Peer not initialized!');
      return null;
    }

    this.isHost = true;
    this.roomCode = this.generateRoomCode();
    
    // Store room mapping locally
    const myRooms = JSON.parse(localStorage.getItem('myRooms') || '{}');
    myRooms[this.roomCode] = {
      hostId: this.localPlayerId,
      createdAt: Date.now()
    };
    localStorage.setItem('myRooms', JSON.stringify(myRooms));
    
    this.roomMetadata = {
      roomCode: this.roomCode,
      isHost: true,
      hostPeerId: this.localPlayerId
    };
    
    console.log('🎮 Room created! Code:', this.roomCode, '| Peer ID:', this.localPlayerId);
    return this.roomCode;
  }

  /**
   * Join an existing room (client)
   * @param {string} roomCode - The room code to join
   * @returns {Promise<boolean>} Success status
   */
  async joinRoom(roomCode) {
    if (!this.peer) {
      console.error('❌ Peer not initialized!');
      return false;
    }

    this.roomCode = roomCode.toUpperCase();
    
    // Check for room in local storage (same browser testing)
    const myRooms = JSON.parse(localStorage.getItem('myRooms') || '{}');
    let hostId = myRooms[this.roomCode]?.hostId;
    
    // Check shared room codes (cross-device)
    if (!hostId) {
      const sharedRooms = JSON.parse(localStorage.getItem('sharedRoomCodes') || '{}');
      hostId = sharedRooms[this.roomCode];
    }
    
    if (!hostId) {
      console.error('❌ Room not found:', this.roomCode);
      return false;
    }

    console.log('🔗 Joining room:', this.roomCode, '| Host ID:', hostId);

    try {
      const conn = this.peer.connect(hostId, { reliable: true });
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!this.conn) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        conn.on('open', () => {
          clearTimeout(timeout);
          this.conn = conn;
          this.isHost = false;
          
          this.sendToHost({
            type: 'join',
            playerId: this.localPlayerId,
            name: 'Player' + Math.floor(Math.random() * 1000)
          });
          
          this.handleConnection(conn);
          console.log('✅ Connected to host!');
          resolve(true);
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          console.error('❌ Connection error:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      return false;
    }
  }

  /**
   * Handle incoming peer connection
   * @param {DataConnection} conn - PeerJS connection object
   */
  handleConnection(conn) {
    console.log('🔌 Setting up connection with:', conn.peer);

    conn.on('data', (data) => this.handleMessage(data, conn));
    conn.on('close', () => this.handlePlayerDisconnect(conn.peer));
    conn.on('error', (err) => console.error('❌ Connection error:', err));

    if (this.isHost) {
      this.connections.push(conn);
      console.log('👥 Total connections:', this.connections.length);
    }
  }

  /**
   * Handle player disconnect
   * @param {string} peerId - Disconnected peer ID
   */
  handlePlayerDisconnect(peerId) {
    console.log('❌ Player disconnected:', peerId);
    this.players.delete(peerId);

    if (this.isHost) {
      // Remove from connections
      this.connections = this.connections.filter(c => c.peer !== peerId);
      
      // Notify remaining players
      this.broadcast({
        type: 'playerLeft',
        playerId: peerId
      });
    }

    if (this.onPlayerLeft) {
      this.onPlayerLeft(peerId);
    }
  }

  /**
   * Handle incoming network messages
   * @param {Object} data - Message data
   * @param {DataConnection} conn - Source connection
   */
  handleMessage(data, conn) {
    if (!data || !data.type) return;
    
    console.log('📨 Received:', data.type, 'from', conn.peer);

    switch (data.type) {
      case 'join':
        this.handleJoinRequest(data, conn);
        break;

      case 'roomState':
        this.handleRoomState(data);
        break;

      case 'playerJoined':
        this.handlePlayerJoined(data);
        break;

      case 'playerLeft':
        this.handlePlayerLeft(data);
        break;

      case 'characterSelect':
        this.handleCharacterSelect(data, conn);
        break;

      case 'startGame':
        this.handleStartGame(data);
        break;

      case 'gameState':
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(data);
        }
        break;

      case 'spawnWave':
        if (this.onSpawnWave) {
          this.onSpawnWave(data.waveNum, data.enemies);
        }
        break;

      case 'spawnPowerup':
        if (this.onSpawnPowerup) {
          this.onSpawnPowerup(data.powerup);
        }
        break;

      case 'collectPowerup':
        if (this.onCollectPowerup) {
          this.onCollectPowerup(data.powerupId, data.playerId);
        }
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'spawnProjectile':
        if (this.onSpawnProjectile) {
          this.onSpawnProjectile(data.projectile);
        }
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'enemyDamage':
        if (this.onEnemyDamage) {
          this.onEnemyDamage(data.enemyId, data.damage, data.playerId);
        }
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'enemyKilled':
        if (this.onEnemyKilled) {
          this.onEnemyKilled(data.enemyId, data.playerId);
        }
        break;

      case 'gameStateSnapshot':
        if (this.onGameStateSnapshot) {
          this.onGameStateSnapshot(data.gameState);
        }
        break;

      default:
        console.warn('⚠️ Unknown message type:', data.type);
    }
  }

  /**
   * Handle join request (host only)
   */
  handleJoinRequest(data, conn) {
    if (!this.isHost) return;

    // Check if room is full
    if (this.connections.length >= this.maxPlayers) {
      conn.send({ type: 'error', message: 'Room is full' });
      conn.close();
      return;
    }

    // Add player
    this.players.set(data.playerId, {
      name: data.name,
      character: null,
      score: 0,
      position: { x: 0, y: 0 },
      health: 0
    });

    // Send current room state to new player
    conn.send({
      type: 'roomState',
      players: Array.from(this.players.entries()),
      roomCode: this.roomCode
    });
    
    // Send game state for late joiners
    if (this.onRequestGameState) {
      const gameState = this.onRequestGameState();
      if (gameState) {
        conn.send({
          type: 'gameStateSnapshot',
          gameState: gameState
        });
      }
    }

    // Notify other players
    this.broadcast({
      type: 'playerJoined',
      playerId: data.playerId,
      name: data.name
    }, conn);

    if (this.onPlayerJoined) {
      this.onPlayerJoined(data.playerId, data.name);
    }
    
    console.log('✅ Player joined:', data.name);
  }

  /**
   * Handle room state update
   */
  handleRoomState(data) {
    data.players.forEach(([id, player]) => {
      this.players.set(id, player);
      if (this.onPlayerJoined) {
        this.onPlayerJoined(id, player.name);
      }
    });
    console.log('📊 Room state loaded:', data.players.length, 'players');
  }

  /**
   * Handle player joined notification
   */
  handlePlayerJoined(data) {
    this.players.set(data.playerId, {
      name: data.name,
      character: null,
      score: 0
    });
    if (this.onPlayerJoined) {
      this.onPlayerJoined(data.playerId, data.name);
    }
    console.log('👋 Player joined:', data.name);
  }

  /**
   * Handle player left notification
   */
  handlePlayerLeft(data) {
    this.players.delete(data.playerId);
    if (this.onPlayerLeft) {
      this.onPlayerLeft(data.playerId);
    }
    console.log('👋 Player left:', data.playerId);
  }

  /**
   * Handle character selection
   */
  handleCharacterSelect(data, conn) {
    const player = this.players.get(data.playerId);
    if (player) {
      player.character = data.character;
    }
    if (this.isHost) {
      this.broadcast(data, conn);
    }
    console.log('🎭 Character selected:', data.character);
  }

  /**
   * Handle game start
   */
  handleStartGame(data) {
    if (this.onStartGame) {
      this.onStartGame(data.players);
    }
    console.log('🎮 Game starting with', data.players.length, 'players');
  }

  /**
   * Send message to host (client only)
   * @param {Object} data - Message data
   */
  sendToHost(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  /**
   * Broadcast to all connected peers (host only)
   * @param {Object} data - Message data
   * @param {DataConnection} excludeConn - Connection to exclude
   */
  broadcast(data, excludeConn = null) {
    if (!this.isHost) return;
    
    this.connections.forEach(conn => {
      if (conn !== excludeConn && conn.open) {
        try {
          conn.send(data);
        } catch (err) {
          console.error('❌ Failed to send to', conn.peer, err);
        }
      }
    });
  }

  /**
   * Send character selection
   * @param {string} character - Selected character
   */
  selectCharacter(character) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
      type: 'characterSelect',
      playerId: this.localPlayerId,
      character: character
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  /**
   * Start the game (host only)
   */
  startGame() {
    if (!this.isHost) {
      console.warn('⚠️ Only host can start game');
      return;
    }
    
    if (!this.peer || !this.peer.open) {
      console.error('❌ Peer not connected');
      return;
    }

    const playersArray = Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      character: p.character
    }));

    this.broadcast({
      type: 'startGame',
      players: playersArray
    });
    
    if (this.onStartGame) {
      this.onStartGame(playersArray);
    }
  }

  /**
   * Send game state updates
   * @param {Object} playerData - Player state data
   */
  sendGameState(playerData) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
      type: 'gameState',
      playerId: this.localPlayerId,
      position: playerData.position,
      velocity: playerData.velocity,
      health: playerData.health,
      score: playerData.score,
      timestamp: Date.now()
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  /**
   * Update player stats
   * @param {Object} updates - Player updates
   */
  updatePlayer(updates) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
      type: 'playerUpdate',
      playerId: this.localPlayerId,
      updates: updates
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  /**
   * Broadcast wave spawn (host only)
   * @param {number} waveNum - Wave number
   * @param {Array} enemies - Enemy data array
   */
  broadcastWaveSpawn(waveNum, enemies) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    this.broadcast({
      type: 'spawnWave',
      waveNum: waveNum,
      enemies: enemies.map(e => ({
        id: e.id || Math.random().toString(36),
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        isGolem: e.isGolem,
        isRedAlien: e.isRedAlien,
        speed: e.speed,
        radius: e.radius
      }))
    });
  }

  /**
   * Broadcast powerup spawn (host only)
   * @param {Object} powerup - Powerup data
   */
  broadcastPowerupSpawn(powerup) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    this.broadcast({
      type: 'spawnPowerup',
      powerup: {
        id: powerup.id || Math.random().toString(36),
        x: powerup.x,
        y: powerup.y,
        type: powerup.type,
        life: powerup.life
      }
    });
  }

  /**
   * Broadcast powerup collection
   * @param {string} powerupId - Powerup ID
   * @param {string} playerId - Player ID
   */
  broadcastPowerupCollect(powerupId, playerId) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
      type: 'collectPowerup',
      powerupId: powerupId,
      playerId: playerId
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  /**
   * Broadcast projectile spawn
   * @param {Object} projectile - Projectile data
   */
  broadcastProjectileSpawn(projectile) {
    if (!this.peer || !this.peer.open) return;
    
    this.broadcast({
      type: 'spawnProjectile',
      projectile: {
        id: projectile.id || Math.random().toString(36),
        x: projectile.x,
        y: projectile.y,
        vx: projectile.vx,
        vy: projectile.vy,
        type: projectile.type,
        damage: projectile.damage,
        playerId: this.localPlayerId
      }
    });
  }

  /**
   * Broadcast enemy damage
   * @param {string} enemyId - Enemy ID
   * @param {number} damage - Damage amount
   */
  broadcastEnemyDamage(enemyId, damage) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
      type: 'enemyDamage',
      enemyId: enemyId,
      damage: damage,
      playerId: this.localPlayerId
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  /**
   * Broadcast enemy killed (host only)
   * @param {string} enemyId - Enemy ID
   * @param {string} killerId - Killer player ID
   */
  broadcastEnemyKilled(enemyId, killerId) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    this.broadcast({
      type: 'enemyKilled',
      enemyId: enemyId,
      playerId: killerId
    });
  }

  /**
   * Generate random 4-character room code
   * @returns {string} Room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get all players in room
   * @returns {Array} Players array
   */
  getPlayers() {
    return Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      ...p,
      isLocal: id === this.localPlayerId
    }));
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('🔌 Disconnecting...');
    
    // Close all connections
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn.open) conn.close();
      });
      this.connections = [];
      
      // Remove room from localStorage
      if (this.roomCode) {
        const myRooms = JSON.parse(localStorage.getItem('myRooms') || '{}');
        delete myRooms[this.roomCode];
        localStorage.setItem('myRooms', JSON.stringify(myRooms));
      }
    } else if (this.conn) {
      this.conn.close();
    }

    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
    }

    // Reset state
    this.players.clear();
    this.roomCode = null;
    this.isHost = false;
  }
}

// Wait for PeerJS to be loaded before creating instance
if (typeof Peer === 'undefined') {
  console.warn('⚠️ PeerJS not yet loaded, waiting...');
  window.addEventListener('load', () => {
    if (typeof Peer !== 'undefined') {
      window.networkManager = new NetworkManager();
      console.log('✅ NetworkManager loaded!');
    } else {
      console.error('❌ PeerJS failed to load!');
    }
  });
} else {
  // Create global instance
  window.networkManager = new NetworkManager();
  console.log('✅ NetworkManager loaded!');
}
