// NetworkManager.js - Handles P2P multiplayer using PeerJS
console.log('🌐 NetworkManager.js loading...');

class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.connections = []; // Array of connections for host
    this.isHost = false;
    this.roomCode = null;
    this.players = new Map(); // peerId -> {name, character, score, position, health}
    this.localPlayerId = null;
    this.maxPlayers = 4;
    
    // Callbacks
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStateUpdate = null;
    this.onStartGame = null;
  }

  // Initialize PeerJS connection
  init() {
    return new Promise((resolve, reject) => {
      try {
        // Create peer with a random ID
        this.peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log('✅ PeerJS connected! ID:', id);
          this.localPlayerId = id;
          resolve(id);
        });

        this.peer.on('error', (err) => {
          console.error('❌ PeerJS error:', err);
          reject(err);
        });

        // Handle incoming connections (for both host and clients)
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

  // Create a new room (host)
  createRoom() {
    if (!this.peer) {
      console.error('❌ Peer not initialized!');
      return null;
    }

    this.isHost = true;
    this.roomCode = this.generateRoomCode();
    
    console.log('🎮 Room created! Code:', this.roomCode);
    console.log('🔑 Host Peer ID:', this.localPlayerId);
    
    // Store room code -> peer ID mapping in localStorage for matchmaking
    const rooms = JSON.parse(localStorage.getItem('activeRooms') || '{}');
    rooms[this.roomCode] = {
      hostId: this.localPlayerId,
      createdAt: Date.now(),
      playerCount: 1
    };
    localStorage.setItem('activeRooms', JSON.stringify(rooms));
    
    return this.roomCode;
  }

  // Join an existing room (client)
  async joinRoom(roomCode) {
    if (!this.peer) {
      console.error('❌ Peer not initialized!');
      return false;
    }

    this.roomCode = roomCode.toUpperCase();
    
    // Get host peer ID from localStorage
    const rooms = JSON.parse(localStorage.getItem('activeRooms') || '{}');
    const roomInfo = rooms[this.roomCode];
    
    if (!roomInfo) {
      console.error('❌ Room not found:', this.roomCode);
      return false;
    }

    const hostId = roomInfo.hostId;
    console.log('🔗 Joining room:', this.roomCode, '| Host ID:', hostId);

    try {
      // Connect to host
      const conn = this.peer.connect(hostId, { reliable: true });
      
      return new Promise((resolve, reject) => {
        conn.on('open', () => {
          console.log('✅ Connected to host!');
          this.conn = conn;
          this.isHost = false;
          
          // Send join request
          this.sendToHost({
            type: 'join',
            playerId: this.localPlayerId,
            name: 'Player' + Math.floor(Math.random() * 1000)
          });
          
          this.handleConnection(conn);
          resolve(true);
        });

        conn.on('error', (err) => {
          console.error('❌ Connection error:', err);
          reject(err);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.conn) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      return false;
    }
  }

  // Handle incoming connections
  handleConnection(conn) {
    console.log('🔌 Setting up connection with:', conn.peer);

    conn.on('data', (data) => {
      this.handleMessage(data, conn);
    });

    conn.on('close', () => {
      console.log('❌ Connection closed:', conn.peer);
      this.handlePlayerDisconnect(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('❌ Connection error:', err);
    });

    // If host, add to connections list
    if (this.isHost) {
      this.connections.push(conn);
      console.log('👥 Total connections:', this.connections.length);
    }
  }

  // Handle incoming messages
  handleMessage(data, conn) {
    console.log('📨 Received:', data.type, 'from', conn.peer);

    switch (data.type) {
      case 'join':
        if (this.isHost) {
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

          console.log('✅ Player joined:', data.name);

          // Send current room state to new player
          conn.send({
            type: 'roomState',
            players: Array.from(this.players.entries()),
            roomCode: this.roomCode
          });
          
          // Send current game state if game is in progress (late join)
          if (this.onRequestGameState) {
            const gameState = this.onRequestGameState();
            if (gameState && gameState.inProgress) {
              console.log('📤 Sending game state to late joiner:', data.name);
              conn.send({
                type: 'gameStateSnapshot',
                gameState: gameState
              });
            }
          }

          // Notify all other players
          this.broadcast({
            type: 'playerJoined',
            playerId: data.playerId,
            name: data.name
          }, conn);

          if (this.onPlayerJoined) {
            this.onPlayerJoined(data.playerId, data.name);
          }
        }
        break;

      case 'roomState':
        // Client receives initial room state
        console.log('📊 Room state received:', data.players.length, 'players');
        data.players.forEach(([id, player]) => {
          this.players.set(id, player);
        });
        if (this.onPlayerJoined) {
          data.players.forEach(([id, player]) => {
            this.onPlayerJoined(id, player.name);
          });
        }
        break;

      case 'playerJoined':
        console.log('👋 New player joined:', data.name);
        this.players.set(data.playerId, {
          name: data.name,
          character: null,
          score: 0
        });
        if (this.onPlayerJoined) {
          this.onPlayerJoined(data.playerId, data.name);
        }
        break;

      case 'playerLeft':
        console.log('👋 Player left:', data.playerId);
        this.players.delete(data.playerId);
        if (this.onPlayerLeft) {
          this.onPlayerLeft(data.playerId);
        }
        break;

      case 'characterSelect':
        console.log('🎭 Player selected character:', data.character);
        const player = this.players.get(data.playerId);
        if (player) {
          player.character = data.character;
        }
        // Broadcast to others if host
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'startGame':
        console.log('🎮 Game starting!');
        if (this.onStartGame) {
          this.onStartGame(data.players);
        }
        break;

      case 'gameState':
        // Sync game state (position, health, score, etc.)
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(data);
        }
        // If host, relay to all other clients
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'playerUpdate':
        // Update specific player data
        const p = this.players.get(data.playerId);
        if (p) {
          Object.assign(p, data.updates);
        }
        // Broadcast if host
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'spawnEnemy':
        // Host spawned an enemy - clients create it locally
        if (this.onSpawnEnemy) {
          this.onSpawnEnemy(data.enemy);
        }
        break;

      case 'spawnWave':
        // Host starting a new wave
        if (this.onSpawnWave) {
          this.onSpawnWave(data.waveNum, data.enemies);
        }
        break;

      case 'spawnPowerup':
        // Host spawned a powerup
        if (this.onSpawnPowerup) {
          this.onSpawnPowerup(data.powerup);
        }
        break;

      case 'collectPowerup':
        // Someone collected a powerup
        if (this.onCollectPowerup) {
          this.onCollectPowerup(data.powerupId, data.playerId);
        }
        break;

      case 'spawnProjectile':
        // Player fired a projectile
        if (this.onSpawnProjectile) {
          this.onSpawnProjectile(data.projectile);
        }
        // Broadcast if host
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'enemyDamage':
        // Enemy took damage
        if (this.onEnemyDamage) {
          this.onEnemyDamage(data.enemyId, data.damage, data.playerId);
        }
        // Broadcast if host
        if (this.isHost) {
          this.broadcast(data, conn);
        }
        break;

      case 'enemyKilled':
        // Enemy was killed
        if (this.onEnemyKilled) {
          this.onEnemyKilled(data.enemyId, data.playerId);
        }
        break;

      case 'gameStateSnapshot':
        // Received full game state (late join)
        console.log('📥 Received game state snapshot for late join');
        if (this.onGameStateSnapshot) {
          this.onGameStateSnapshot(data.gameState);
        }
        break;
    }
  }

  // Handle player disconnect
  handlePlayerDisconnect(peerId) {
    this.players.delete(peerId);
    
    if (this.isHost) {
      // Remove from connections
      this.connections = this.connections.filter(c => c.peer !== peerId);
      
      // Notify other players
      this.broadcast({
        type: 'playerLeft',
        playerId: peerId
      });
    }

    if (this.onPlayerLeft) {
      this.onPlayerLeft(peerId);
    }
  }

  // Send message to host (client only)
  sendToHost(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  // Broadcast to all connected peers (host only)
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

  // Send character selection
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

  // Start the game (host only)
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

    const message = {
      type: 'startGame',
      players: playersArray
    };

    this.broadcast(message);
    
    if (this.onStartGame) {
      this.onStartGame(playersArray);
    }
  }

  // Send game state updates
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

  // Update player stats
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

  // Broadcast wave spawn (host only)
  broadcastWaveSpawn(waveNum, enemies) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    const message = {
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
    };

    this.broadcast(message);
  }

  // Broadcast powerup spawn (host only)
  broadcastPowerupSpawn(powerup) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    const message = {
      type: 'spawnPowerup',
      powerup: {
        id: powerup.id || Math.random().toString(36),
        x: powerup.x,
        y: powerup.y,
        type: powerup.type,
        life: powerup.life
      }
    };

    this.broadcast(message);
  }

  // Broadcast powerup collection
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

  // Broadcast projectile spawn
  broadcastProjectileSpawn(projectile) {
    if (!this.peer || !this.peer.open) return;
    
    const message = {
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
    };

    if (this.isHost) {
      this.broadcast(message);
    } else {
      this.sendToHost(message);
    }
  }

  // Broadcast enemy damage (for kill stealing prevention)
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

  // Broadcast enemy killed (host only)
  broadcastEnemyKilled(enemyId, killerId) {
    if (!this.isHost || !this.peer || !this.peer.open) return;

    const message = {
      type: 'enemyKilled',
      enemyId: enemyId,
      playerId: killerId
    };

    this.broadcast(message);
  }


  // Generate random 4-character room code
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Removed O, 0, 1, I for clarity
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get all players in room
  getPlayers() {
    return Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      ...p,
      isLocal: id === this.localPlayerId
    }));
  }

  // Disconnect and cleanup
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
        const rooms = JSON.parse(localStorage.getItem('activeRooms') || '{}');
        delete rooms[this.roomCode];
        localStorage.setItem('activeRooms', JSON.stringify(rooms));
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

// Create global instance
window.networkManager = new NetworkManager();
console.log('✅ NetworkManager loaded!');
