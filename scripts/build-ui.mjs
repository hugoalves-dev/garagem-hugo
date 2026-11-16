import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const [html, cssSource, jsSource] = await Promise.all([
  readFile('src/index.html', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('src/app.js', 'utf8')
]);
const [{ code: css }, { code: js }] = await Promise.all([
  transform(cssSource, { loader: 'css', minify: true }),
  transform(jsSource, { loader: 'js', target: 'es2022', minify: true })
]);

const moduleSource = [
  'export const html = ' + JSON.stringify(html) + ';',
  'export const css = ' + JSON.stringify(css) + ';',
  'export const app = ' + JSON.stringify(js) + ';',
  ''
].join('\n');

await writeFile('worker/ui.js', moduleSource);
console.log('UI empacotada em worker/ui.js');
