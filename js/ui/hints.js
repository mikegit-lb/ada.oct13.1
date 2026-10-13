import { nextHint } from '../engine/check.js';

// Counts misses for one activity and shows the matching progressive hint through Pip.
export function createHints(hints, pip) {
  let attempts = 0;
  return {
    miss() {
      attempts += 1;
      const h = nextHint(attempts, hints);
      pip.say(h ? `Almost! Try again. ${h}` : 'Almost! Try again.', 'hint');
      return attempts;
    },
    get attempts() { return attempts; },
  };
}
