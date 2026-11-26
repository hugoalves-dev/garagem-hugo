import test from 'node:test';
import assert from 'node:assert/strict';
import { components, byId, byMesh } from '../src/vehicle/catalog.js';
import { componentStatus, componentHistory, activeRecords } from '../src/vehicle/status.js';

test('catálogo tem IDs estáveis e mapeamento único de malhas', () => {
  assert.equal(byId.size, components.length);
  assert.ok(components.length >= 85);
  assert.ok(byId.has('exterior.tire.rear_left'));
  for (const c of components) for (const mesh of c.meshes) assert.equal(byMesh.get(mesh), c);
});
test('estado desconhecido, aprovação, falha, reparo e prazos', () => {
  const now = '2026-11-26';
  assert.equal(componentStatus([], [], now), 'unknown');
  const problem = { id: 'failure', status: 'reprovado', kind: 'sintoma', date: '2026-11-25' };
  assert.equal(componentStatus([problem, { status: 'agendado', kind: 'reparo' }], [], now), 'problem');
  const repair = { status: 'aprovado', kind: 'servico', date: now };
  assert.equal(componentStatus([repair, problem], [], now), 'problem');
  assert.equal(componentStatus([{ ...repair, resolvesRecordId: 'failure' }, problem], [], now), 'unknown');
  assert.equal(componentStatus([{ ...repair, kind: 'inspecao' }], [], now), 'approved');
  assert.equal(componentStatus([], [{ date: '2026-11-25' }], now), 'pending');
});
test('backup JSON conserva vínculos e registros antigos sem inferir associações', () => {
  const id = 'exterior.tire.rear_left';
  const state = { records: [{ title: 'Pneus' }, { componentId: id, photoId: 'foto' }], reminders: [{ componentId: id }], refuels: [] };
  const restored = JSON.parse(JSON.stringify({ app: 'Fox em Dia', version: 1, state })).state;
  assert.deepEqual(componentHistory(restored, id), { records: [state.records[1]], reminders: state.reminders });
});

test('planos independentes permanecem após uma inspeção aprovada', () => {
  const now = '2026-11-26';
  const approved = { status: 'aprovado', kind: 'inspecao', date: now };
  const plan = { status: 'agendado', kind: 'substituicao', date: '2026-11-20', deadline: '2026-12-03' };
  assert.equal(componentStatus([approved, plan], [], now), 'scheduled');
  assert.equal(componentStatus([approved, plan], [], '2026-12-03'), 'pending');
  assert.equal(componentStatus([{ ...plan, kind: 'melhoria' }], [], now), 'upgrade');
});

test('geometria cobre todos os componentes e as dobradiças carregam os anexos', async () => {
  const { makeFox } = await import('../src/vehicle/model.js');
  const { parts, hinges } = makeFox();
  for (const part of parts.values()) {
    const { component, group, meshes } = part;
    assert.equal(byMesh.get(group.name), component);
    assert.ok(meshes.length);
    assert.ok(meshes.every(mesh => mesh.userData.componentId === component.id));
  }
  for (const position of ['front_left', 'front_right', 'rear_left', 'rear_right']) {
    const door = hinges.get('exterior.door.' + position);
    const window = hinges.get('exterior.window.' + position);
    assert.deepEqual(door.point, window.point);
    assert.equal(door.angle, window.angle);
  }
  assert.equal(hinges.get('exterior.hood').angle, hinges.get('exterior.washer_nozzles').angle);
  assert.deepEqual(hinges.get('exterior.trunk').point, hinges.get('exterior.window.rear').point);
});

test('resolução explícita preserva problemas independentes, escopo e histórico', () => {
  const a = { id: 'a', system: 'Arrefecimento', componentId: 'cooling.expansion_tank', status: 'reprovado', date: '2026-11-24' };
  const b = { ...a, id: 'b' };
  const repair = { ...a, id: 'repair', date: '2026-11-26', kind: 'inspecao', status: 'aprovado', resolvesRecordId: 'a' };
  assert.deepEqual(activeRecords([a,b,repair]), [b,repair]);
  assert.deepEqual(activeRecords([a,b,{ ...repair, componentId: 'cooling.radiator' }]).slice(0,2), [a,b]);
  assert.deepEqual(activeRecords([a,b,{ ...repair, date: '2026-11-23' }]).slice(0,2), [a,b]);
  assert.deepEqual(activeRecords([a,b]), [a,b]);
  assert.equal(componentStatus([a,b,repair], [], '2026-11-26'), 'problem');
});

test('carroceria de duas portas usa portas dianteiras mais longas e vidros traseiros fixos', async () => {
  const { makeFox } = await import('../src/vehicle/model.js');
  const two = makeFox(2);
  const four = makeFox(4);
  for (const side of ['left', 'right']) {
    const rearDoor = 'exterior.door.rear_' + side;
    const rearGlass = 'exterior.window.rear_' + side;
    assert.equal(two.parts.has(rearDoor), false);
    assert.equal(two.hinges.has(rearDoor), false);
    assert.ok(four.hinges.has(rearDoor));
    assert.ok(two.parts.has(rearGlass));
    assert.equal(two.hinges.has(rearGlass), false);
    const frontDoor = 'exterior.door.front_' + side;
    assert.ok(two.parts.get(frontDoor).center.z < four.parts.get(frontDoor).center.z);
  }
});
