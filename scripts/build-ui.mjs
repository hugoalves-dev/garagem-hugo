import { readFile, writeFile } from 'node:fs/promises';

const [html, css, js] = await Promise.all([
  readFile('src/index.html', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('src/app.js', 'utf8')
]);

const moduleSource = [
  'export const html = ' + JSON.stringify(html) + ';',
  'export const css = ' + JSON.stringify(css) + ';',
  'export const app = ' + JSON.stringify(js) + ';',
  ''
].join('\n');

await writeFile('worker/ui.js', moduleSource);
console.log('UI empacotada em worker/ui.js');
