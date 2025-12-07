// Safety timeout - hide loading screen after 10 seconds no matter what
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen && loadingScreen.style.display !== 'none') {
    console.warn('Force-hiding loading screen after timeout');
    loadingScreen.style.display = 'none';
  }
}, 10000);
