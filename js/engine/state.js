const KEY = 'secretMap.v1';

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function createState(storage = defaultStorage()) {
  const s = { stars: 0, hearts: 3, stageIndex: 0, completed: [], muted: false };

  const save = () => {
    try { storage?.setItem(KEY, JSON.stringify({ stars: s.stars, hearts: s.hearts, stageIndex: s.stageIndex, completed: s.completed, muted: s.muted })); } catch { /* storage unavailable */ }
  };
  const isInt = (n) => Number.isInteger(n) && n >= 0;
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const ok = d && isInt(d.stars) && isInt(d.hearts) && d.hearts <= 3 && isInt(d.stageIndex) && d.stageIndex <= 3
        && Array.isArray(d.completed) && d.completed.every((n) => isInt(n) && n <= 3);
      if (ok) Object.assign(s, { stars: d.stars, hearts: d.hearts, stageIndex: d.stageIndex, completed: d.completed, muted: d.muted === true });
    }
  } catch { /* corrupt or blocked: stay fresh */ }

  s.addStars = (n = 1) => { s.stars += n; save(); };
  s.loseHeart = () => { s.hearts = Math.max(0, s.hearts - 1); save(); };
  s.refillHearts = () => { s.hearts = 3; save(); };
  s.completeStage = (i) => { if (!s.completed.includes(i)) s.completed = [...s.completed, i].sort(); save(); };
  s.setStage = (i) => { s.stageIndex = i; save(); };
  s.setMuted = (m) => { s.muted = !!m; save(); };
  s.reset = () => { Object.assign(s, { stars: 0, hearts: 3, stageIndex: 0, completed: [], muted: s.muted }); save(); };
  return s;
}
