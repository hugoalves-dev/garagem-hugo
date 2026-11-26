import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';

const [html, cssSource] = await Promise.all([
  readFile('src/index.html', 'utf8'),
  readFile('src/styles.css', 'utf8')
]);
const { code: css } = await transform(cssSource, { loader: 'css', minify: true });
await rm('dist/static', { recursive: true, force: true });
await mkdir('dist/static', { recursive: true });
const { metafile } = await build({
  entryPoints: { app: 'src/app.js' }, outdir: 'dist/static/assets',
  bundle: true, splitting: true, format: 'esm', target: 'es2022', minify: true,
  entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]', metafile: true
});
const entry = Object.entries(metafile.outputs).find(([, details]) => details.entryPoint === 'src/app.js')[0];
const document = html.replace('./app.js', '/' + entry.replace('dist/static/', ''));
await writeFile('worker/ui.js', 'export const html = ' + JSON.stringify(document) + ';\nexport const css = ' + JSON.stringify(css) + ';\n');
await writeFile('dist/static/_headers', '/assets/*\n  Cache-Control: private, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n');
for (const [path, details] of Object.entries(metafile.outputs)) console.log(path, details.bytes + ' bytes');
