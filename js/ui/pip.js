export function createPip(bubble) {
  return {
    say(text, mood = 'cheer') {
      bubble.textContent = text;
      bubble.dataset.mood = mood;
    },
  };
}

export function speak(text) {
  try {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* speech unavailable */ }
}
