// Mouse + keyboard input: translates raw events into game actions.
// The canvas is drawn at a fixed 1280x800 logical size and scaled by CSS,
// so clicks are mapped back into logical coordinates here.

export const LOGICAL_W = 1280;
export const LOGICAL_H = 800;

export function bindInput(canvas, handlers) {
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * LOGICAL_W;
    const y = ((ev.clientY - rect.top) / rect.height) * LOGICAL_H;
    handlers.click(x, y);
  });
  window.addEventListener('keydown', (ev) => {
    const key = ev.key.toLowerCase();
    if (key === ' ' || key === 'enter' || key === 'b' || key === 't' || key === 'm' || key === 'escape') {
      ev.preventDefault();
      handlers.key(key === ' ' ? 'space' : key);
    }
  });
  canvas.addEventListener('mousemove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * LOGICAL_W;
    const y = ((ev.clientY - rect.top) / rect.height) * LOGICAL_H;
    if (handlers.hover) handlers.hover(x, y);
  });
}
