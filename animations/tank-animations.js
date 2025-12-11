// Tank animation loader for directional sprites (brown-tinted Player sprites)
// Supports 8-directional running and fireball animations

(function() {
  'use strict';
  
  // Safety check - don't load if critical dependencies missing
  if(typeof window === 'undefined') return;
  
  // Helper to calculate 8-direction based on velocity
  function getDirection8(vx, vy){
    if(vx === 0 && vy === 0) return null; // idle
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

  // Tank animation state manager
  class TankAnimationController {
    constructor(basePath = './animations/tank'){
      this.basePath = basePath;
      this.sprites = {}; // spriteKey -> { frames: [Image], frameW, frameH, loaded }
      this.currentAnim = null;
      this.currentDirection = 'south';
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.frameDuration = 0.1; // seconds per frame
      this.animType = 'idle'; // idle, running, fireball
      this.enabled = false; // disabled until sprites load
      this.loadedCount = 0;
      this.totalToLoad = 0;
    }

    // Load individual frame images for an animation
    loadFrameSequence(animType, direction, frameCount, frameW, frameH){
      const key = `${animType}_${direction}`;
      const frames = [];
      let loadedFrames = 0;
      
      // Create sprite entry FIRST so callbacks can access it
      this.sprites[key] = { frames, frameW, frameH, loaded: false };
      
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
            console.info('All tank animations loaded');
          }
        };
        
        img.onerror = () => {
          console.warn(`Failed to load frame: ${path}`);
        };
        
        img.src = path;
        frames.push(img);
      }
      
      // Update frames array
      this.sprites[key].frames = frames;
    }

    // Preload all tank animations
    loadAll(){
      try{
        const directions = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];
        
        // Running animations (8 frames per direction)
        for(const dir of directions){
          this.loadFrameSequence('running-8-frames', dir, 8, 64, 64);
        }

        // Fireball animations (6 frames, missing 'east')
        const fireballDirs = ['north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];
        for(const dir of fireballDirs){
          this.loadFrameSequence('fireball', dir, 6, 64, 64);
        }

        console.info('Loading tank animations...');
      }catch(e){
        console.warn('Tank animation load failed:', e);
      }
    }

    // Update animation state based on player movement
    update(dt, vx, vy, isFiring){
      if(!this.enabled) return;
      
      try{
        // Determine animation type
        if(isFiring){
          this.animType = 'fireball';
        } else if(vx !== 0 || vy !== 0){
          this.animType = 'running-8-frames';
        } else {
          this.animType = 'idle';
        }

        // Determine direction
        const dir = getDirection8(vx, vy);
        if(dir) this.currentDirection = dir;

        // Advance frame timer
        this.frameTimer += dt;
        if(this.frameTimer >= this.frameDuration){
          this.frameTimer -= this.frameDuration;
          const key = `${this.animType}_${this.currentDirection}`;
          const sprite = this.sprites[key];
          if(sprite && sprite.frames){
            this.frameIndex = (this.frameIndex + 1) % sprite.frames.length;
          }
        }
      }catch(e){
        console.warn('Animation update error:', e);
      }
    }

    // Draw the current animation frame at player position
    draw(ctx, x, y, scale = 1){
      if(!this.enabled) return false;
      
      try{
        const key = this.animType === 'idle' ? `running-8-frames_${this.currentDirection}` : `${this.animType}_${this.currentDirection}`;
        const sprite = this.sprites[key];
        
        if(!sprite || !sprite.loaded || !sprite.frames || !sprite.frames[this.frameIndex]) return false;
        
        const img = sprite.frames[this.frameIndex];
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
        console.warn('Animation draw error:', e);
        return false;
      }
    }
  }

  // Create global instance
  window.tankAnimController = new TankAnimationController();
  console.log('✅ Tank animation controller created');

  // Auto-load animations
  window.tankAnimController.loadAll();
  console.info('Tank animations loading...');
})();
