import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const from = path.join(root, 'node_modules', 'lucide-static', 'icons');
const to = path.join(root, 'public', 'icons');
const icons = [
  'arrow-right', 'arrow-up-right', 'bookmark', 'check', 'chevron-down', 'clock',
  'compass', 'crosshair', 'download', 'external-link', 'focus', 'info',
  'layers-3', 'map', 'map-pinned', 'maximize', 'minus', 'mountain', 'orbit',
  'plus', 'rotate-ccw', 'route', 'ruler', 'scan', 'search', 'trending-up', 'x',
];

mkdirSync(to, { recursive: true });
for (const name of icons) copyFileSync(path.join(from, `${name}.svg`), path.join(to, `${name}.svg`));
copyFileSync(path.join(root, 'node_modules', 'lucide-static', 'LICENSE'), path.join(to, 'LICENSE'));
console.log(`Copied ${icons.length} Lucide icons to public/icons/`);
