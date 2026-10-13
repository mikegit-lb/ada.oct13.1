import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beFor, toIng } from '../js/engine/grammar.js';

const TYPE_NAMES = {
  multipleChoice: 'Multiple Choice (tap the answer)',
  dragFill: 'Drag and Drop (fill the blanks)',
  sort: 'Sort (NOW or LATER bins)',
  buildSentence: 'Build the Sentence (tap the word tiles)',
  pathQuiz: 'Which Way Do You Go? (choose the path, then build the sentence)',
};

// Every returned line is a heading, a bullet, or blank, so the file never contains a paragraph.
const bullet = (text, depth = 0) => String(text).split('\n').map((t) => `${'  '.repeat(depth)}- ${t}`);

function activityLines(s) {
  const out = [];
  out.push(...bullet(`Interaction type: ${TYPE_NAMES[s.type]}`));
  if (s.prompt) out.push(...bullet(`Prompt: ${s.prompt}`));
  if (s.image) out.push(...bullet(`Picture: ${s.alt}`));
  if (s.type === 'multipleChoice') {
    out.push(...bullet('Options:'));
    for (const o of s.options) out.push(...bullet(o.label + (o.id === s.answer ? ' (correct)' : ''), 1));
  }
  if (s.type === 'dragFill') {
    out.push(...bullet('Sentence:'));
    s.template.split('\n').forEach((l, i) => out.push(...bullet(l.replace(/\{(\d+)\}/g, (_, n) => `[${s.answers[n]}]`), 1)));
    out.push(...bullet(`Chips: ${s.chips.join(', ')}`));
    out.push(...bullet(`Pictures: ${s.alts.join('; ')}`));
  }
  if (s.type === 'sort') {
    out.push(...bullet(`Bins: ${s.bins.map((b) => `${b.id} (${b.tr})`).join(', ')}`));
    out.push(...bullet('Cards:'));
    for (const c of s.cards) out.push(...bullet(`${c.text} -> ${c.bin}`, 1));
  }
  if (s.type === 'buildSentence') {
    out.push(...bullet(`Tiles: ${s.tiles.join(' | ')}`));
    out.push(...bullet(`Answer: ${s.accept.join(' / ')}`));
  }
  if (s.type === 'pathQuiz') {
    out.push(...bullet('Gates:'));
    for (const g of s.scenarios) {
      out.push(...bullet(`Gate ${g.id}: ${g.clue}`, 1));
      out.push(...bullet(`Path: ${g.path}`, 2));
      out.push(...bullet(`Sentence: ${g.subject} ${beFor(g.person)} ${toIng(g.verb)} ${g.ending}`, 2));
    }
  }
  out.push(...bullet('Pip hints:'));
  s.hints.forEach((h, i) => out.push(...bullet(`Hint ${i + 1}: ${h}`, 1)));
  return out;
}

function slideLines(s) {
  const out = [];
  if (s.kind === 'story') {
    out.push(...bullet('Interaction type: Story (tap Next)'));
    out.push(...bullet(`Picture: ${s.alt}`));
    out.push(...bullet('Pip says:'));
    for (const l of s.lines) out.push(...bullet(l, 1));
  } else if (s.kind === 'teach') {
    out.push(...bullet('Interaction type: Teach card (read and tap Next)'));
    if (s.badge) out.push(...bullet(`Label: ${s.badge.en} = ${s.badge.tr}`));
    if (s.image) out.push(...bullet(`Picture: ${s.alt}`));
    if (s.formula) out.push(...bullet(`Formula: ${s.formula}`));
    out.push(...bullet('Screen text:'));
    for (const b of s.bullets) out.push(...bullet(b, 1));
    if (s.compare) {
      out.push(...bullet('Compare:'));
      out.push(...bullet(`NOW (Şimdi): ${s.compare.now}`, 1), ...bullet(`LATER (Sonra): ${s.compare.later}`, 1));
    }
    if (s.turkish) {
      out.push(...bullet('Türkçe İpucu:'));
      for (const t of s.turkish.split('\n')) out.push(...bullet(t, 1));
    }
  } else out.push(...activityLines(s));
  return out;
}

export function renderLessonMd(content) {
  const out = [`# ${content.title}`, '', ...bullet(`Mascot: ${content.mascot.name} the fox`), ''];
  for (const st of content.stages) {
    out.push(`## ${st.title}`, '', ...bullet(`Goal: ${st.goal}`));
    const types = [...new Set(st.slides.map((s) => (s.kind === 'activity' ? TYPE_NAMES[s.type] : s.kind === 'story' ? 'Story' : 'Teach card')))];
    out.push(...bullet('Interaction types:'));
    for (const t of types) out.push(...bullet(t, 1));
    out.push(...bullet(`Reward: map piece ${st.mapPiece}`), '');
    st.slides.forEach((s, i) => {
      const label = s.kind === 'activity' ? TYPE_NAMES[s.type].split(' (')[0] : s.kind === 'story' ? 'Story' : `Teach: ${s.title}`;
      out.push(`### Screen ${i + 1}: ${label}`, '', ...slideLines(s), '');
    });
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const content = JSON.parse(fs.readFileSync(path.join(root, 'data/content.json'), 'utf8'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/lesson-script.md'), renderLessonMd(content));
  console.log('wrote docs/lesson-script.md');
}
