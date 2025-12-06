// Example sprite registration: creates a tiny SVG spritesheet (4 frames) and registers it
(function(){
  const frameW = 32, frameH = 32, frames = 4;
  // build an SVG spritesheet with 4 colored squares horizontally
  const cols = frames; const width = frameW * cols; const height = frameH;
  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>`;
  const colors = ['#ff9e4a','#ffd86b','#7ef0a6','#7fe8ff'];
  for(let i=0;i<frames;i++){
    const x = i * frameW;
    svg += `<rect x='${x}' y='0' width='${frameW}' height='${frameH}' fill='${colors[i%colors.length]}' />`;
    svg += `<text x='${x+frameW/2}' y='${frameH/2+6}' font-size='12' text-anchor='middle' fill='#000'>${i+1}</text>`;
  }
  svg += '</svg>';
  const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  const register = function(){
    if(window && window.registerSprite){
      window.registerSprite('spark', dataUrl, frameW, frameH, frames);
    } else {
      window._pendingSprites = window._pendingSprites || {};
      window._pendingSprites['spark'] = { imageUrl: dataUrl, frameW, frameH, frames };
    }
  };

  // also register a factory that emits a small burst of sprites
  function sparkFactory(loader, x, y){
    const s = loader.sprites['spark'];
    if(!s) return null;
    const inst = {
      sprite: s,
      x: x || 200, y: y || 200, z: 60,
      cur: 0, timer: 0, frameDuration: 0.06, playing: true,
      lifespan: 0.5, elapsed: 0,
      update(dt){ this.elapsed += dt; this.timer += dt; if(this.timer >= this.frameDuration){ this.timer -= this.frameDuration; this.cur++; if(this.cur >= this.sprite.frames) this.cur = 0; } if(this.elapsed >= this.lifespan) this.playing = false; },
      draw(ctx){ const fw = this.sprite.frameW, fh = this.sprite.frameH; const cols = Math.max(1, Math.floor(this.sprite.image.width / fw) || this.sprite.frames); const sx = (this.cur % cols) * fw; const sy = Math.floor(this.cur / cols) * fh; ctx.save(); ctx.translate(this.x, this.y); ctx.drawImage(this.sprite.image, sx, sy, fw, fh, -fw/2, -fh/2, fw, fh); ctx.restore(); }
    };
    return inst;
  }

  if(window && window.registerAnimationFactory){
    window.registerAnimationFactory('sparkBurst', sparkFactory);
    register();
  } else {
    // queue up pending factory too
    window._pendingFloatingTextFactory = window._pendingFloatingTextFactory || null; // keep existing
    window._pendingSprites = window._pendingSprites || {};
    window._pendingSprites['spark'] = { imageUrl: dataUrl, frameW, frameH, frames };
    window._pendingSparkFactory = sparkFactory;
  }
})();
