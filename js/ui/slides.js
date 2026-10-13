import { el, img } from './dom.js';
import { mountActivity } from '../activities/index.js';

const lines = (text) => text.split('\n').map((t) => el('p', { text: t }));

export function renderSlide(root, slide, ctx) {
  root.replaceChildren();
  if (slide.kind === 'story') return renderStory(root, slide, ctx);
  if (slide.kind === 'teach') return renderTeach(root, slide);
  return mountActivity(root, slide, ctx);
}

function renderStory(root, slide, ctx) {
  root.append(el('section', { class: 'card story' },
    img(slide.image, slide.alt, 'scene'),
    el('ul', { class: 'story-lines' }, slide.lines.map((t) => el('li', { text: t })))));
  ctx.pip.say(slide.lines[0], 'cheer');
  ctx.speakLines?.(slide.lines);
}

function renderTeach(root, slide) {
  const card = el('section', { class: 'card teach' });
  if (slide.badge) card.append(el('p', { class: `badge badge-${slide.badge.en}`, text: `${slide.badge.en} = ${slide.badge.tr}` }));
  card.append(el('h2', { text: slide.title }));
  if (slide.image) card.append(img(slide.image, slide.alt || '', 'scene'));
  if (slide.formula) card.append(el('p', { class: 'formula', text: slide.formula }));
  card.append(el('ul', {}, slide.bullets.map((t) => el('li', { text: t }))));
  if (slide.compare) {
    card.append(el('div', { class: 'compare' },
      el('div', { class: 'cmp cmp-now' }, el('strong', { text: 'NOW · Şimdi' }), el('p', { text: slide.compare.now })),
      el('div', { class: 'cmp cmp-later' }, el('strong', { text: 'LATER · Sonra' }), el('p', { text: slide.compare.later }))));
  }
  if (slide.turkish) card.append(el('aside', { class: 'tr-tip' }, el('strong', { text: 'Türkçe İpucu' }), lines(slide.turkish)));
  root.append(card);
}
