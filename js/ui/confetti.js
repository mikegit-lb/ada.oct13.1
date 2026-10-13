const COLORS = ['#ff922b', '#ffd43b', '#51cf66', '#4dabf7', '#ff6b6b'];

export function confetti(root) {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch { /* assume motion ok */ }
  const box = document.createElement('div');
  box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
    p.style.setProperty('--d', `${(Math.random() * 0.4).toFixed(2)}s`);
    p.style.background = COLORS[i % COLORS.length];
    box.append(p);
  }
  root.append(box);
  setTimeout(() => box.remove(), 1600);
}
