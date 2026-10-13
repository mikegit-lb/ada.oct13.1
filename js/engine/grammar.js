export function beFor(person) {
  if (person === 'I') return 'am';
  return person === 'sg' ? 'is' : 'are';
}

export function toIng(verb) {
  if (verb.endsWith('e') && !verb.endsWith('ee') && !verb.endsWith('ie')) return verb.slice(0, -1) + 'ing';
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(verb)) return verb + verb.slice(-1) + 'ing';
  return verb + 'ing';
}

// Two unique, plausible misspellings of the correct -ing form.
export function ingDistractors(verb) {
  const right = toIng(verb);
  const candidates = [verb + 'ing', right.slice(0, -1), verb.replace(/e$/, '') + 'in',
    right.replace(/(.)ing$/, '$1$1ing'), right.slice(0, -3) + 'eng'];
  const out = [];
  for (const c of candidates) if (c !== right && !out.includes(c)) out.push(c);
  return out.slice(0, 2);
}
