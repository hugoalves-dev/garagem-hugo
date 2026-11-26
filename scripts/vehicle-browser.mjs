import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const { port } = reservation.address();
await new Promise((resolve) => reservation.close(resolve));
const baseURL = 'http://127.0.0.1:' + port;
const persistTo = await mkdtemp(join(tmpdir(), 'garagem-hugo-test-'));
const worker = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--ip',
    '127.0.0.1',
    '--port',
    String(port),
    '--persist-to',
    persistTo,
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
const workerExit = once(worker, 'exit');
let workerLogs = '';
for (const stream of [worker.stdout, worker.stderr])
  stream.on('data', (chunk) => {
    workerLogs += chunk;
  });
const screenshotDir = process.env.GARAGE_SCREENSHOT_DIR;
async function screenshot(page, name) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  await page.locator('#toast.show').waitFor({ state: 'hidden' });
  await page.screenshot({ path: join(screenshotDir, name) });
}
const executablePath = process.env.CHROMIUM_PATH;
try {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(baseURL).catch(() => null);
    if (response?.ok) break;
    if (attempt >= 60 || worker.exitCode !== null) throw new Error('Wrangler local indisponível.\n' + workerLogs);
    await delay(250);
  }
  await run();
} finally {
  worker.kill('SIGTERM');
  await workerExit;
  await rm(persistTo, { recursive: true, force: true });
}

async function run() {
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1536, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const nav = async (page) => {
    await page.goto('/');
    if (await page.locator('#menu-toggle').isVisible()) await page.locator('#menu-toggle').click();
    await page.getByRole('button', { name: 'Veículo 3D' }).click();
  };
  const find = async (page, query, id) => {
    const search = page.getByRole('searchbox', { name: 'Buscar peça' });
    if (!(await search.isVisible())) await page.locator('.vehicle-catalog > summary').click();
    await search.fill(query);
    await page.locator('[data-select="' + id + '"]').click();
  };
  try {
    await nav(page);
    await page.getByRole('button', { name: 'Centralizar' }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-tool="reset"]').disabled);
    await screenshot(page, 'fox-desktop.png');
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.49, box.y + box.height * 0.49);
    await page.mouse.click(box.x + box.width * 0.49, box.y + box.height * 0.49);
    await page.waitForSelector('.vehicle-panel.has-selection');
    for (const mode of ['interior', 'underside', 'electrical', 'chassis', 'exterior', 'engine']) {
      await page.getByLabel('Modo de inspeção').selectOption(mode);
      assert.ok(await canvas.isVisible());
    }
    await page.getByText('Capô, portas e porta-malas', { exact: true }).click();
    const hood = page.locator('[data-opening="exterior.hood"]');
    assert.equal(await hood.isChecked(), true);
    await hood.uncheck();
    await hood.check();
    await page.getByLabel('Raio X', { exact: true }).check();
    await page.getByLabel('Raio X', { exact: true }).uncheck();
    await find(page, 'reservatorio de expansao', 'cooling.expansion_tank');
    await page.getByRole('button', { name: 'Registrar problema', exact: true }).click();
    assert.equal(await page.locator('#record-form [name=system]').inputValue(), 'Arrefecimento');
    assert.equal(await page.getByLabel('Peça', { exact: true }).inputValue(), 'cooling.expansion_tank');
    const title = 'Vazamento no reservatório ' + Date.now();
    await page.locator('[name=title]').fill(title);
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await page.getByText('Problema ativo', { exact: true }).last().waitFor();
    await page.getByRole('button', { name: 'Adicionar lembrete' }).click();
    assert.equal(await page.getByLabel('Peça', { exact: true }).inputValue(), 'cooling.expansion_tank');
    await page.locator('#reminder-form [name=date]').fill('2027-01-15');
    await page.getByRole('button', { name: 'Salvar lembrete' }).click();
    await page.waitForFunction(async (title) => {
      const { state } = await fetch('/api/state').then((r) => r.json());
      return (
        state.records.some((r) => r.title === title && r.componentId === 'cooling.expansion_tank') &&
        state.reminders.some((r) => r.componentId === 'cooling.expansion_tank')
      );
    }, title);
    await page.getByLabel('Condição', { exact: true }).check();
    await page.getByLabel('Rótulos', { exact: true }).check();
    assert.equal(
      await page
        .locator('#vehicle-panel i[data-condition=problem]')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(250, 119, 121)',
    );
    await screenshot(page, 'fox-engine.png');
    await page.getByRole('button', { name: 'Adicionar foto' }).click();
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLZkAAAAASUVORK5CYII=',
      'base64',
    );
    await page.locator('[name=photo]').setInputFiles({ name: 'teste.png', mimeType: 'image/png', buffer: pixel });
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await page.locator('#modal-backdrop').waitFor({ state: 'hidden' });
    await page.waitForFunction(async () =>
      (await fetch('/api/state').then((r) => r.json())).state.records.some((r) => r.photoId),
    );
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar backup' }).click();
    const file = await download;
    const backup = JSON.parse(await readFile(await file.path(), 'utf8'));
    assert.ok(backup.state.records.some((r) => r.title === title && r.componentId === 'cooling.expansion_tank'));
    assert.ok(backup.state.reminders.some((r) => r.componentId === 'cooling.expansion_tank'));
    assert.ok(backup.state.records.some((r) => r.photoData && r.componentId === 'cooling.expansion_tank'));
    await page.getByRole('button', { name: /Inspeções/ }).click();
    await page.locator('#filter-component').selectOption('cooling.expansion_tank');
    await page
      .locator('article.record-card', { hasText: title })
      .getByRole('button', { name: /Ver no 3D/ })
      .click();
    await page.locator('#vehicle-panel h2').getByText('Reservatório de expansão').waitFor();
    const fresh = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobile = await fresh.newPage();
    await nav(mobile);
    await find(mobile, 'reservatorio de expansao', 'cooling.expansion_tank');
    await mobile.locator('#vehicle-panel').getByRole('button', { name: title, exact: true }).waitFor();
    await screenshot(mobile, 'fox-mobile.png');
    const panel = page.locator('#vehicle-panel');
    await panel.getByRole('button', { name: 'Registrar problema', exact: true }).click();
    const otherProblem = 'Trinca na tampa';
    await page.locator('[name=title]').fill(otherProblem);
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await panel.getByText('Problemas ativos (2)', { exact: true }).waitFor();
    assert.match(await page.locator('#metric-attention').textContent(), /^2 /);

    const resolveProblem = async (name) => {
      await panel.getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: 'Registrar resolução' }).click();
      assert.ok(await page.getByLabel('Problema resolvido').inputValue());
      await page.getByRole('button', { name: 'Salvar registro' }).click();
    };
    await resolveProblem(title);
    await panel.getByText('Problemas ativos (1)', { exact: true }).waitFor();
    assert.match(await page.locator('#metric-attention').textContent(), /^1 /);
    assert.ok(await panel.locator('i[data-condition=problem]').isVisible());
    assert.ok((await page.locator('#next-steps').textContent()).includes(otherProblem));
    assert.ok(!(await page.locator('#next-steps').textContent()).includes(title));
    await resolveProblem(otherProblem);
    await panel.getByText('Problemas ativos (0)', { exact: true }).waitFor();
    assert.match(await page.locator('#metric-attention').textContent(), /^0 /);
    assert.equal(await panel.locator('i[data-condition=problem]').count(), 0);
    await page.waitForFunction(async () =>
      (await fetch('/api/state').then(r => r.json())).state.records.filter(r => r.resolvesRecordId).length === 2,
    );

    await page.getByLabel('Carroceria', { exact: true }).selectOption('2');
    await page.getByRole('searchbox', { name: 'Buscar peça' }).fill('porta traseira esquerda');
    await page.getByText('Nenhuma peça encontrada.').waitFor();
    assert.equal(await page.locator('[data-opening="exterior.door.rear_left"]').isVisible(), false);
    await page.waitForFunction(async () => (await fetch('/api/state').then(r => r.json())).state.sideDoors === 2);
    await nav(mobile);
    await mobile.waitForFunction(() => document.querySelector('#vehicle-doors')?.value === '2');
    assert.equal(await mobile.getByLabel('Carroceria', { exact: true }).inputValue(), '2');
    await page.getByLabel('Carroceria', { exact: true }).selectOption('4');
    await page.locator('[data-select="exterior.door.rear_left"]').waitFor();
    const restore = async (payload) => {
      page.once('dialog', (dialog) => dialog.accept());
      const synced = page.waitForResponse(
        (r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.ok() &&
          r.request().postDataJSON().records.map(record => record.id).join(',') ===
            payload.state.records.map(record => record.id).join(','),
      );
      await page
        .locator('#restore-file')
        .setInputFiles({
          name: 'backup.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(payload)),
        });
      await synced;
    };
    await restore(backup);
    const photo = backup.state.records.find((r) => r.photoData);
    assert.equal((await page.request.get('/api/photos/' + photo.photoId)).ok(), true);
    const legacy = {
      app: 'Fox em Dia',
      version: 1,
      state: {
        records: [
          { id: 'antigo', title: 'Pneus em geral', system: 'Pneus e rodas', kind: 'inspecao', status: 'pendente' },
        ],
        refuels: [],
        reminders: [],
      },
    };
    await restore(legacy);
    const { state } = await page.request.get('/api/state').then((r) => r.json());
    assert.deepEqual(state.records, legacy.state.records);
    assert.deepEqual(errors, []);
    console.log(
      'Chromium desktop/mobile: seleção 3D, registros, lembretes, filtro, backup, sincronização SQLite local e acesso por registro passaram.',
    );
  } finally {
    await browser.close();
  }
  const fallback = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-webgl'] });
  try {
    const p = await fallback.newPage({ baseURL });
    await nav(p);
    await p.getByText('O modelo 3D está indisponível', { exact: false }).waitFor();
    await find(p, 'pneu traseiro esquerdo', 'exterior.tire.rear_left');
    await p.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
    assert.equal(await p.getByLabel('Peça', { exact: true }).inputValue(), 'exterior.tire.rear_left');
    await p.getByRole('button', { name: 'Salvar registro' }).click();
    await p
      .locator('#vehicle-panel')
      .getByRole('button', { name: /Nova tarefa · Pneu/ })
      .waitFor();
    console.log('Chromium sem WebGL: seleção, formulário e gravação de tarefa passaram.');
  } finally {
    await fallback.close();
  }
}
