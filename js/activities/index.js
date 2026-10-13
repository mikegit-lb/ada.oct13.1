import { mountMultipleChoice } from './multipleChoice.js';
import { mountDragFill } from './dragFill.js';

import { mountSort } from './sort.js';
import { mountBuildSentence } from './buildSentence.js';

const registry = {
  sort: mountSort,
  buildSentence: mountBuildSentence,
  multipleChoice: mountMultipleChoice,
  dragFill: mountDragFill,
};

export function mountActivity(root, slide, ctx) {
  const mount = registry[slide.type];
  if (!mount) throw new Error(`Unknown activity type: ${slide.type}`);
  return mount(root, slide, ctx);
}

export function registerActivity(type, fn) { registry[type] = fn; }
