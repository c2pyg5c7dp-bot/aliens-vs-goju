// Immediate test - runs before anything else
console.log('🟢 BODY SCRIPT RUNNING');
console.log('📍 Location:', window.location.href);
console.log('🪟 Window parent:', window.parent !== window ? 'FRAMED' : 'NOT FRAMED');
console.log('🎨 Setting background color...');
document.body.style.background = '#1a1a2e'; // Ensure we see something
console.log('✅ Body background set');

// Helper to get init debug section from main debug panel
function getInitDebugSection() {
  return document.getElementById('initDebugSection');
}

window.debugLog = function(msg) {
  console.log(msg);
  const debugSection = getInitDebugSection();
  if (debugSection) {
    const line = document.createElement('div');
    line.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
    debugSection.appendChild(line);
  }
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
