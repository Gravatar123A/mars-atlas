import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('index.html', 'dist/index.html');
cpSync('src', 'dist/src', { recursive: true });
cpSync('public', 'dist/public', { recursive: true });
for (const section of ['app', 'guide', 'resources']) cpSync(section, `dist/${section}`, { recursive: true });
console.log('Built static app in dist/');
