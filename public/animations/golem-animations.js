// Golem enemy animation loader for directional sprites
// Supports 8-directional walking animation

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

  // Golem animation state manager
  class GolemAnimationController {
    constructor(basePath = 'animations/golem'){
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
            this.sprites[key] = { frames, frameW, frameH, loaded: true };
            console.log(`Golem animation loaded: ${key} (${frameCount} frames)`);
            if(this.loadedCount === this.totalToLoad){
              this.enabled = true;
              console.log('All Golem animations loaded successfully');
            }
          }
        };
        
        img.onerror = () => {
          console.warn(`Failed to load Golem frame: ${path}`);
          loadedFrames++;
          this.loadedCount++;
        };
        
        img.src = path;
        frames.push(img);
      }
    }

    // Create animation instance for a Golem enemy
    createInstance(animType = 'walking-8-frames'){
      return {
        animType,
        direction: 'south',
        frameIndex: 0,
        frameTime: 0,
        frameRate: 12 // FPS
      };
    }

    // Update animation state
    update(instance, dt, vx, vy){
      if(!this.enabled) return;
      
      // Update direction based on velocity
      const newDir = getDirection8(vx, vy);
      if(newDir !== instance.direction){
        instance.direction = newDir;
        instance.frameIndex = 0; // reset frame on direction change
      }
      
      // Advance frame
      instance.frameTime += dt;
      const frameDelay = 1.0 / instance.frameRate;
      if(instance.frameTime >= frameDelay){
        instance.frameTime = 0;
        const key = `${instance.animType}_${instance.direction}`;
        const sprite = this.sprites[key];
        if(sprite && sprite.loaded){
          instance.frameIndex = (instance.frameIndex + 1) % sprite.frames.length;
        }
      }
    }

    // Draw the animation
    draw(ctx, instance, x, y, scale = 1.0){
      if(!this.enabled) return false;
      
      const key = `${instance.animType}_${instance.direction}`;
      const sprite = this.sprites[key];
      if(!sprite || !sprite.loaded || sprite.frames.length === 0) return false;
      
      const frame = sprite.frames[instance.frameIndex];
      if(!frame || !frame.complete) return false;
      
      const w = sprite.frameW * scale;
      const h = sprite.frameH * scale;
      
      ctx.drawImage(frame, x - w/2, y - h/2, w, h);
      return true;
    }
  }

  // Initialize and load Golem animations
  const golemAnimController = new GolemAnimationController();
  
  // Load 8-directional walking animation (8 frames per direction)
  const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  directions.forEach(dir => {
    golemAnimController.loadFrameSequence('walking-8-frames', dir, 8, 32, 32);
  });
  
  // Load 8-directional high-kick animation (7 frames per direction)
  directions.forEach(dir => {
    golemAnimController.loadFrameSequence('high-kick', dir, 7, 32, 32);
  });

  // Expose to global scope
  window.golemAnimController = golemAnimController;
  console.log('Golem animation controller initialized');
})();
