// Red Alien enemy animation loader for directional sprites
// Supports 8-directional walking and throwing animations

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

  // Red Alien animation state manager
  class RedAlienAnimationController {
    constructor(basePath = 'animations/redalien'){
      this.basePath = basePath;
      this.sprites = {}; // animType_direction -> { frames: [Image], frameW, frameH, loaded }
      this.enabled = false; // disabled until sprites load
      this.loadedCount = 0;
      this.totalToLoad = 0;
    }

    // Calculate 8-direction based on velocity
    getDirection8(vx, vy){
      return getDirection8(vx, vy);
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
          }
          if(this.loadedCount === this.totalToLoad){
            this.enabled = true;
            console.log('Red Alien animations fully loaded');
          }
        };
        
        img.onerror = () => {
          console.warn('Failed to load red alien frame:', path);
          this.loadedCount++;
        };
        
        img.src = path;
        frames.push(img);
      }
    }

    // Initialize all animations
    init(){
      const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
      const frameW = 48;
      const frameH = 48;
      
      // Load scary-walk animation (8 frames per direction)
      directions.forEach(dir => {
        this.loadFrameSequence('scary-walk', dir, 8, frameW, frameH);
      });
      
      // Load throw-object animation (7 frames per direction)
      directions.forEach(dir => {
        this.loadFrameSequence('throw-object', dir, 7, frameW, frameH);
      });
    }

    // Create an animation instance
    createInstance(){
      return {
        animType: 'scary-walk', // current animation type
        direction: 'south',
        frameIndex: 0,
        frameTime: 0,
        frameDuration: 0.1 // seconds per frame
      };
    }

    // Update animation instance based on velocity
    update(instance, dt, vx, vy){
      if(!this.enabled) return;
      
      // Update direction based on velocity (only if not zero or if no direction set)
      if(vx !== 0 || vy !== 0){
        instance.direction = getDirection8(vx, vy);
      }
      
      // Update frame timing
      instance.frameTime += dt;
      
      const key = `${instance.animType}_${instance.direction}`;
      const sprite = this.sprites[key];
      
      if(sprite && sprite.loaded){
        if(instance.frameTime >= instance.frameDuration){
          instance.frameTime -= instance.frameDuration;
          instance.frameIndex = (instance.frameIndex + 1) % sprite.frames.length;
        }
      }
    }

    // Draw the animation instance at given position
    draw(ctx, instance, x, y, scale = 1.0){
      if(!this.enabled) return false;
      
      const key = `${instance.animType}_${instance.direction}`;
      const sprite = this.sprites[key];
      
      if(!sprite || !sprite.loaded) return false;
      
      const frame = sprite.frames[instance.frameIndex];
      if(!frame || !frame.complete) return false;
      
      const drawW = sprite.frameW * scale;
      const drawH = sprite.frameH * scale;
      
      ctx.drawImage(frame, x - drawW/2, y - drawH/2, drawW, drawH);
      return true;
    }
  }

  // Create global controller
  const controller = new RedAlienAnimationController();
  controller.init();
  
  // Export to window
  window.redAlienAnimController = controller;
  
  console.log('Red Alien animation controller initialized');
})();
