// Global error handler
window.addEventListener('error', (e) => {
  console.error('🔴 Global error:', e.error || e.message);
  console.error('Error details:', { 
    message: e.message, 
    filename: e.filename, 
    lineno: e.lineno, 
    colno: e.colno,
    error: e.error 
  });
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('🔴 Unhandled promise rejection:', e.reason);
});
