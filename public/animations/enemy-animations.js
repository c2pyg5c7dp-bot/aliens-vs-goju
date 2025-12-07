// Enemy animation loader for directional sprites
// Supports 8-directional scary-walk animation

(function(){
  'use strict';
  
  // Safety check - don't load if critical dependencies missing
  if(typeof window === 'undefined') return;
  
  // Helper to calculate 8-direction based on velocity
  function getDirection8(vx, vy){
    if(vx === 0 && vy === 0) return 'south'; // default idle direction
    const angle = Math.atan2(vy, vx);
    const deg = angle * 180 / Math.PI;
    // normalize to 0-360
    const normalized = (deg + 360) % 360;
    
    // 8 directions: east, north-east, north, north-west, west, south-west, south, south-east
    if(normalized >= 337.5 || normalized < 22.5) return 'east';
    if(normalized >= 22.5 && normalized < 67.5) return 'south-east';
    if(normalized >= 67.5 && normalized < 112.5) return 'south';
    if(normalized >= 112.5 && normalized < 157.5) return 'south-west';
    if(normalized >= 157.5 && normalized < 202.5) return 'west';
    if(normalized >= 202.5 && normalized < 247.5) return 'north-west';
    if(normalized >= 247.5 && normalized < 292.5) return 'north';
    return 'north-east';
  }

  // Enemy animation state manager
  class EnemyAnimationController {
    constructor(basePath = '/animations/enemies'){
      this.basePath = basePath;
      this.sprites = {}; // animType_direction -> { frames: [Image], frameW, frameH, loaded }
      this.enabled = false; // disabled until sprites load
      this.loadedCount = 0;
      this.totalToLoad = 0;
    }

    // Load individual frame images for an animation
    loadFrameSequence(animType, direction, frameCount, frameW, frameH){
      const key = `${animType}_${direction}`;
      const frames = [];
      let loadedFrames = 0;
      
      this.totalToLoad += frameCount;
      
      for(let i = 0; i < frameCount; i++){
        const frameNum = String(i).padStart(3, '0');
        const path = `${this.basePath}/animations/${animType}/${direction}/frame_${frameNum}.png`;
        const img = new Image();
        
        img.onload = () => {
          loadedFrames++;
          this.loadedCount++;
          if(loadedFrames === frameCount){
            this.sprites[key].loaded = true;
            console.info(`Loaded ${key}: ${frameCount} frames`);
          }
          // Enable when everything is loaded
          if(this.loadedCount === this.totalToLoad){
            this.enabled = true;
            console.info('All enemy animations loaded');
          }
        };
        
        img.onerror = () => {
          console.warn(`Failed to load frame: ${path}`);
        };
        
        img.src = path;
        frames.push(img);
      }
      
      this.sprites[key] = { frames, frameW, frameH, loaded: false };
    }

    // Preload all enemy animations
    loadAll(){
      try{
        const directions = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];
        
        // Scary-walk animations (8 frames per direction)
        for(const dir of directions){
          this.loadFrameSequence('scary-walk', dir, 8, 32, 32); // adjust frameW/frameH based on actual size
        }

        console.info('Loading enemy animations...');
      }catch(e){
        console.warn('Enemy animation load failed:', e);
      }
    }

    // Create animation state for a single enemy instance
    createInstance(){
      return {
        currentDirection: 'south',
        frameIndex: 0,
        frameTimer: 0,
        frameDuration: 0.1 // seconds per frame
      };
    }

    // Update animation state for an enemy instance
    update(instance, dt, vx, vy){
      if(!this.enabled || !instance) return;
      
      try{
        // Determine direction
        const dir = getDirection8(vx, vy);
        instance.currentDirection = dir;

        // Advance frame timer
        instance.frameTimer += dt;
        if(instance.frameTimer >= instance.frameDuration){
          instance.frameTimer -= instance.frameDuration;
          const key = `scary-walk_${instance.currentDirection}`;
          const sprite = this.sprites[key];
          if(sprite && sprite.frames){
            instance.frameIndex = (instance.frameIndex + 1) % sprite.frames.length;
          }
        }
      }catch(e){
        console.warn('Enemy animation update error:', e);
      }
    }

    // Draw the current animation frame at enemy position
    draw(ctx, instance, x, y, scale = 1){
      if(!this.enabled || !instance) return false;
      
      try{
        const key = `scary-walk_${instance.currentDirection}`;
        const sprite = this.sprites[key];
        
        if(!sprite || !sprite.loaded || !sprite.frames || !sprite.frames[instance.frameIndex]) return false;
        
        const img = sprite.frames[instance.frameIndex];
        if(!img.complete) return false;

        const fw = sprite.frameW;
        const fh = sprite.frameH;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -fw/2, -fh/2, fw, fh);
        ctx.restore();
        return true;
      }catch(e){
        console.warn('Enemy animation draw error:', e);
        return false;
      }
    }
  }

  // Create global instance
  window.enemyAnimController = new EnemyAnimationController();

  console.info('Enemy animation controller ready');
})();
