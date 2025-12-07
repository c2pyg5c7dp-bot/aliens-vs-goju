// Immediate test - runs before anything else
console.log('🟢 BODY SCRIPT RUNNING');
console.log('📍 Location:', window.location.href);
console.log('🪟 Window parent:', window.parent !== window ? 'FRAMED' : 'NOT FRAMED');
console.log('🎨 Setting background color...');
document.body.style.background = '#1a1a2e'; // Ensure we see something
console.log('✅ Body background set');

// Create visible debug display
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-display';
debugDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 12px; z-index: 99999; max-width: 90%; max-height: 50%; overflow-y: auto; border: 2px solid #0f0;';
document.body.appendChild(debugDiv);

window.debugLog = function(msg) {
  console.log(msg);
  const line = document.createElement('div');
  line.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
  debugDiv.appendChild(line);
  debugDiv.scrollTop = debugDiv.scrollHeight;
};

window.debugLog('🟢 Debug display active');
window.debugLog('📍 URL: ' + window.location.href);
window.debugLog('🪟 Framed: ' + (window.parent !== window ? 'YES' : 'NO'));

// Test if we can access the loading screen
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  window.debugLog('🔍 Loading screen: ' + (loadingScreen ? 'FOUND' : 'NOT FOUND'));
  if (loadingScreen) {
    window.debugLog('📏 Display: ' + loadingScreen.style.display);
  }
}, 100);
