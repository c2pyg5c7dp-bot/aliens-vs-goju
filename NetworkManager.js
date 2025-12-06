// NetworkManager.js - Discord Activities multiplayer networking
// Handles player synchronization, input transmission, and state management

class NetworkManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.discordSdk = null;
    this.currentUser = null;
    this.participants = new Map();
    this.isHost = false;
    this.messageHandlers = new Map();
    this.updateInterval = null;
    this.tickRate = 20; // Updates per second (50ms)
    this.inputBuffer = [];
  }

  // Initialize Discord SDK and connect
  async initialize(clientId) {
    try {
      // Note: You'll need to install @discord/embedded-app-sdk
      // npm install @discord/embedded-app-sdk
      
      // Dynamically import Discord SDK (or use script tag in HTML)
      // const { DiscordSDK } = await import('@discord/embedded-app-sdk');
      
      // For now, this is a placeholder - you'll replace with actual Discord SDK
      console.log('Initializing Discord Activities...');
      console.warn('Discord SDK not loaded - add @discord/embedded-app-sdk to your project');
      
      // Mock initialization for development
      if (typeof DiscordSDK === 'undefined') {
        console.warn('Running in single-player mode (Discord SDK not available)');
        this.mockInitialize();
        return;
      }

      // Real Discord initialization
      this.discordSdk = new DiscordSDK(clientId);
      await this.discordSdk.ready();

      // Authenticate user
      const { user } = await this.discordSdk.commands.authenticate({
        scope: ['identify', 'guilds']
      });
      this.currentUser = user;

      // Add local player to game
      this.gameState.addPlayer(user.id, 'player', true);

      // Subscribe to participant updates
      this.discordSdk.subscribe(
        'ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE',
        this.handleParticipantsUpdate.bind(this)
      );

      // Set up message handlers
      this.setupMessageHandlers();

      // Determine if we're host (first participant)
      await this.determineHost();

      // Start network update loop
      this.startNetworkLoop();

      console.log('Discord Activities initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Discord Activities:', error);
      return false;
    }
  }

  // Mock initialization for testing without Discord
  mockInitialize() {
    this.currentUser = { id: 'local-player', username: 'Player 1' };
    this.gameState.addPlayer('local-player', 'player', true);
    this.isHost = true;
    console.log('Mock multiplayer initialized (single player)');
  }

  // Determine if this client should be the host
  async determineHost() {
    if (!this.discordSdk) {
      this.isHost = true;
      return;
    }

    // Get all participants
    const instanceId = await this.discordSdk.instanceId;
    const participants = await this.discordSdk.commands.getInstanceConnectedParticipants();

    // Host is the participant with the lowest ID (alphabetically)
    const sortedIds = participants.participants
      .map(p => p.id)
      .sort();
    
    this.isHost = sortedIds[0] === this.currentUser.id;
    console.log(`I am ${this.isHost ? 'HOST' : 'CLIENT'}`);
  }

  // Handle participants joining/leaving
  handleParticipantsUpdate(event) {
    console.log('Participants updated:', event);

    // Track participants
    const currentParticipantIds = new Set();
    
    event.participants.forEach(participant => {
      currentParticipantIds.add(participant.id);
      
      // Add new players
      if (!this.participants.has(participant.id)) {
        this.participants.set(participant.id, participant);
        
        // Add to game if not local player
        if (participant.id !== this.currentUser.id) {
          this.gameState.addPlayer(participant.id, 'player', false);
          console.log(`Player joined: ${participant.username || participant.id}`);
        }
      }
    });

    // Remove disconnected players
    for (const [id, participant] of this.participants) {
      if (!currentParticipantIds.has(id)) {
        this.gameState.removePlayer(id);
        this.participants.delete(id);
        console.log(`Player left: ${participant.username || id}`);
      }
    }

    // Re-determine host if needed
    if (this.isHost && !currentParticipantIds.has(this.currentUser.id)) {
      this.determineHost();
    }
  }

  // Set up message routing
  setupMessageHandlers() {
    this.messageHandlers.set('INPUT', this.handleInputMessage.bind(this));
    this.messageHandlers.set('STATE_UPDATE', this.handleStateUpdate.bind(this));
    this.messageHandlers.set('SPAWN_ENEMY', this.handleSpawnEnemy.bind(this));
    this.messageHandlers.set('PLAYER_HIT', this.handlePlayerHit.bind(this));

    if (this.discordSdk) {
      // Subscribe to messages
      this.discordSdk.subscribe('MESSAGE_CREATE', (message) => {
        this.handleMessage(message);
      });
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    try {
      const data = typeof message.content === 'string' 
        ? JSON.parse(message.content) 
        : message.content;
      
      const handler = this.messageHandlers.get(data.type);
      if (handler) {
        handler(data, message.author);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  // Send input to host
  sendInput(input) {
    if (this.isHost) return; // Host doesn't send inputs to itself

    const message = {
      type: 'INPUT',
      playerId: this.currentUser.id,
      input: input,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  // Handle input from clients (host only)
  handleInputMessage(data, author) {
    if (!this.isHost) return;

    // Store input in buffer to apply on next tick
    this.inputBuffer.push({
      playerId: data.playerId,
      input: data.input,
      timestamp: data.timestamp
    });
  }

  // Broadcast state update (host only)
  broadcastState() {
    if (!this.isHost) return;

    const state = this.gameState.serialize();
    const message = {
      type: 'STATE_UPDATE',
      state: state,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  // Handle state update from host (clients only)
  handleStateUpdate(data, author) {
    if (this.isHost) return; // Host doesn't receive its own state

    // Apply state from host
    this.gameState.deserialize(data.state);
  }

  // Broadcast enemy spawn (host only)
  broadcastEnemySpawn(enemy) {
    if (!this.isHost) return;

    const message = {
      type: 'SPAWN_ENEMY',
      enemy: {
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        isGolem: enemy.isGolem,
        isRedAlien: enemy.isRedAlien
      },
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  // Handle enemy spawn message
  handleSpawnEnemy(data, author) {
    // Clients apply spawns from host
    if (!this.isHost) {
      // Create enemy from data
      // You'll need to adapt this to your Enemy class
      console.log('Spawning enemy from network:', data.enemy);
    }
  }

  // Send generic message
  sendMessage(data) {
    if (!this.discordSdk) {
      // Mock - just log in development
      console.log('Would send message:', data);
      return;
    }

    try {
      this.discordSdk.commands.sendMessage({
        content: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  // Start network update loop
  startNetworkLoop() {
    const updateInterval = 1000 / this.tickRate;
    
    this.updateInterval = setInterval(() => {
      if (this.isHost) {
        // Process buffered inputs
        this.processInputBuffer();
        
        // Broadcast state to clients
        this.broadcastState();
      }
    }, updateInterval);
  }

  // Process accumulated inputs (host only)
  processInputBuffer() {
    // Apply all inputs from buffer
    for (const inputData of this.inputBuffer) {
      const player = this.gameState.players.get(inputData.playerId);
      if (player) {
        // Input will be applied in game update
        // Store in temporary input map
        if (!this.gameState.remoteInputs) {
          this.gameState.remoteInputs = new Map();
        }
        this.gameState.remoteInputs.set(inputData.playerId, inputData.input);
      }
    }
    
    // Clear buffer
    this.inputBuffer = [];
  }

  // Stop network updates
  stopNetworkLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Cleanup
  destroy() {
    this.stopNetworkLoop();
    
    if (this.discordSdk) {
      // Unsubscribe from events
      this.discordSdk.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE');
      this.discordSdk.unsubscribe('MESSAGE_CREATE');
    }
  }
}

// Export
window.NetworkManager = NetworkManager;
