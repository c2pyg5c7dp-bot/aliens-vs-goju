// Example animations to be loaded by AnimationLoader
// This file registers a factory named 'floatingText' that creates a simple
// floating text instance which fades and moves upward.

(function(){
  function floatingTextFactory(loader, text, x, y, opts){
    const color = (opts && opts.color) || '#fff';
    const life = (opts && opts.life) || 2.2;
    const inst = {
      x: x || 200,
      y: y || 200,
      z: (opts && opts.z) || 100,
      timer: 0,
      playing: true,
      update(dt){
        this.timer += dt;
        this.y -= dt * 18; // float upward
        if(this.timer >= life) this.playing = false;
      },
      draw(ctx){
        ctx.save();
        const a = Math.max(0, 1 - (this.timer / life));
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, this.x, this.y);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };
    return inst;
  }

  if(window && window.registerAnimationFactory){
    window.registerAnimationFactory('floatingText', floatingTextFactory);
  } else {
    // If loader isn't ready yet, expose globally for loader to pick up
    window._pendingFloatingTextFactory = floatingTextFactory;
  }
})();
