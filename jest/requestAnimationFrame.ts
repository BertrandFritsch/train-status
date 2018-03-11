// Temporarily needed for React
const raf = (global as any).requestAnimationFrame = (cb: () => void) =>
  setTimeout(cb, 0);

// needed for Popper
window.cancelAnimationFrame = (handle) => clearTimeout(handle);

export default raf;
