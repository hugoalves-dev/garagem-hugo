import { components, byId, modes, isRearDoor, isUnconfirmed } from './catalog.js';
import { statusMap, statuses } from './status.js';
import { renderPanel } from './panel.js';
export { actions } from './panel.js';

const doors = components.filter(c => c.id.startsWith('exterior.door.'));
const openings = {
  'exterior.hood': ['Capô','exterior.washer_nozzles'],
  'exterior.trunk': ['Porta-malas','exterior.window.rear','exterior.wiper.rear'],
  ...Object.fromEntries(doors.map(c => [c.id, [c.name,c.id.replace('.door.', '.window.'), ...(c.id.includes('front') ? ['exterior.mirror.' + c.id.split('_').at(-1)] : [])]]))
};

export function mountVehicle(root, api) {
  const e = api.escape;
  const selectOptions = Object.entries(modes).map(([key,label]) => '<option value="' + key + '">' + label + '</option>').join('');
  const statusOptions = Object.entries(statuses).map(([key,[label]]) => '<option value="' + key + '">' + label + '</option>').join('');
  root.innerHTML = '<div class="page-heading"><div><div class="eyebrow">VOLKSWAGEN FOX · 2005/2006</div><h1>Veículo 3D</h1>' +
    '<p class="subheading">Fox brasileiro de primeira geração · 1.6 · Etanol</p></div></div>' +
    '<div class="vehicle-layout"><details class="vehicle-catalog" open><summary>Catálogo de peças</summary>' +
    '<div class="vehicle-catalog-tools"><label>Buscar peça<input id="vehicle-search" type="search" placeholder="Ex.: pneu traseiro esquerdo"></label>' +
    '<label>Condição<select id="vehicle-filter"><option value="">Todas as condições</option>' + statusOptions + '</select></label></div>' +
    '<div id="vehicle-list"></div></details><div class="vehicle-workspace">' +
    '<div class="vehicle-toolbar"><label>Modo de inspeção<select id="vehicle-mode">' + selectOptions + '</select></label>' +
    '<label>Carroceria<select id="vehicle-doors" aria-label="Carroceria"><option value="">A confirmar · prévia de 4 portas</option>' +
    '<option value="2">2 portas laterais</option><option value="4">4 portas laterais</option></select></label>' +
    '<button type="button" class="button secondary" data-tool="reset" disabled>Centralizar</button>' +
    '<button type="button" class="button secondary" data-tool="fullscreen" disabled>Tela cheia</button></div>' +
    '<div class="vehicle-stage"><div id="vehicle-message" role="status">Carregando modelo 3D…</div>' +
    '<output id="vehicle-label" hidden></output><div id="vehicle-hover" aria-hidden="true"></div></div>' +
    '<div id="vehicle-controls" hidden><details open><summary>Visualização</summary><div class="vehicle-toggles">' +
    [['overlay','Condição'],['labels','Rótulos'],['xray','Raio X'],['exploded','Vista explodida'],['bodyHidden','Ocultar carroceria'],
      ['isolate','Isolar peça'],['optional','Equipamentos a confirmar']].map(([id,label]) =>
      '<label><input type="checkbox" data-toggle="' + id + '">' + label + '</label>').join('') +
    '</div></details><details><summary>Capô, portas e porta-malas</summary><div class="vehicle-toggles">' +
    Object.entries(openings).map(([id,[label]]) => '<label><input type="checkbox" data-opening="' + id + '">' + e(label) + '</label>').join('') +
    '</div></details><details><summary>Grupos visíveis</summary><div class="vehicle-toggles">' +
    Object.entries(modes).slice(1).map(([id,label]) => '<label><input type="checkbox" checked data-group="' + id + '">' + label + '</label>').join('') +
    '</div></details></div><div class="vehicle-legend" aria-label="Legenda de condição">' + Object.entries(statuses).map(([status,[label]]) =>
    '<span class="vehicle-status"><i data-condition="' + status + '"></i>' + label + '</span>').join('') +
    '</div><p class="vehicle-note">Modelo ilustrativo. As posições, os detalhes mecânicos e a configuração das portas podem variar.</p></div>' +
    '<aside id="vehicle-panel" class="vehicle-panel" aria-label="Detalhes da peça"></aside></div>';
  const get = selector => root.querySelector(selector);
  const catalog = get('.vehicle-catalog'), list = get('#vehicle-list'), panel = get('#vehicle-panel');
  const stage = get('.vehicle-stage'), message = get('#vehicle-message'), label = get('#vehicle-label');
  const mobile = matchMedia('(max-width: 760px)');
  if (mobile.matches) catalog.open = false;
  let scene, loading, visible = true;
  const options = { mode:'overview', selected:null, filter:'', status:new Map(), open:new Set(), hidden:new Set() };
  const normal = s => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

  function renderList() {
    const query = normal(get('#vehicle-search').value.trim());
    const matching = components.filter(c => {
      if (options.sideDoors === 2 && isRearDoor(c.id)) return false;
      const haystack = normal(c.name + ' ' + c.system + ' ' + c.id);
      return query.split(/\s+/).every(term => haystack.includes(term)) &&
        (!options.filter || (options.status.get(c.id) || 'unknown') === options.filter);
    });
    const button = c => {
      const condition = options.status.get(c.id) || 'unknown';
      const [status] = statuses[condition];
      const optional = isUnconfirmed(c, api.state().sideDoors);
      return '<button type="button" data-select="' + c.id + '" aria-pressed="' + (c.id === options.selected) +
        '"><i data-condition="' + condition + '" title="' + status + '"></i>' + e(c.name) + (optional ? '<span class="vehicle-optional" title="Presença a confirmar">?</span>' : '') +
        '<span class="vehicle-sr"> · ' + (optional ? 'Presença a confirmar · ' : '') + status + '</span></button>';
    };
    list.innerHTML = Object.entries(modes).slice(1).map(([key,name]) => {
      const entries = matching.filter(c => c.mode === key);
      if (!entries.length) return '';
      const groups = [...new Set(entries.map(c => c.system))];
      return '<details data-category="' + key + '"><summary>' + name + ' · ' + entries.length + '</summary>' +
        groups.map(system => '<div class="vehicle-list-group"><strong>' + e(system) + '</strong>' +
          entries.filter(c => c.system === system).map(button).join('') + '</div>').join('') + '</details>';
    }).join('') || '<p>Nenhuma peça encontrada.</p>';
  }
  function refresh() {
    const state = api.state();
    const sideDoors = state.sideDoors === 2 ? 2 : 4;
    const rebuild = scene && options.sideDoors !== sideDoors;
    options.sideDoors = sideDoors;
    get('#vehicle-doors').value = [2, 4].includes(state.sideDoors) ? String(state.sideDoors) : '';
    for (const input of root.querySelectorAll('[data-opening]')) {
      const unavailable = sideDoors === 2 && isRearDoor(input.dataset.opening);
      input.closest('label').hidden = unavailable;
      if (unavailable) setOpening(input.dataset.opening, false);
    }
    if (sideDoors === 2 && isRearDoor(options.selected)) {
      options.isolate = false;
      get('[data-toggle="isolate"]').checked = false;
    }
    if (rebuild) {
      scene.dispose();
      scene = null;
      loading = null;
      message.textContent = 'Carregando modelo 3D…';
      message.hidden = false;
      start();
    }
    options.status = statusMap(state, api.today());
    const open = new Set([...list.querySelectorAll('details[open]')].map(el => el.dataset.category));
    const focusedId = document.activeElement?.dataset.select;
    renderList();
    for (const category of list.querySelectorAll('details')) {
      category.open = open.has(category.dataset.category) || Boolean(get('#vehicle-search').value) ||
        Boolean(options.filter) || category.dataset.category === byId.get(options.selected)?.mode ||
        category.dataset.category === (options.mode === 'overview' ? 'exterior' : options.mode);
    }
    if (focusedId) list.querySelector('[data-select="' + focusedId + '"]')?.focus({ preventScroll:true });
    panel.classList.toggle('has-selection', Boolean(options.selected));
    renderPanel(panel, byId.get(options.selected), state, options.status.get(options.selected) || 'unknown', api);
    scene?.update({ ...options });
  }
  function setOpening(id, value) {
    get('[data-opening="' + id + '"]').checked = value;
    for (const part of [id,...openings[id].slice(1)]) options.open[value ? 'add' : 'delete'](part);
  }
  function setMode(mode) {
    options.mode = mode;
    get('#vehicle-mode').value = mode;
    if (mode === 'engine') setOpening('exterior.hood', true);
  }
  function select(id, fromScene = false) {
    const c = byId.get(id);
    if (!c) return;
    options.selected = id;
    options.hidden.delete(c.mode);
    const groupToggle = get('[data-group="' + c.mode + '"]');
    groupToggle.checked = true;
    if (options.filter && (options.status.get(id) || 'unknown') !== options.filter) {
      options.filter = ''; get('#vehicle-filter').value = '';
    }
    if (!fromScene && (!c.modes.includes(options.mode) || (options.mode === 'overview' && c.mode !== 'exterior'))) {
      setMode(c.mode);
    }
    refresh();
    scene?.focus(id);
    if (mobile.matches) {
      catalog.open = false;
      (stage.classList.contains('vehicle-fallback') ? catalog : stage).scrollIntoView({ block:'start' });
      panel.scrollTop = 0;
      panel.querySelector('[data-vehicle-dismiss]')?.focus({ preventScroll:true });
    }
  }
  function fallback(error) {
    message.hidden = false;
    message.textContent = error;
    stage.classList.add('vehicle-fallback');
    get('#vehicle-controls').hidden = true;
    for (const b of root.querySelectorAll('[data-tool]')) b.disabled = true;
    catalog.open = true;
  }
  function ready() {
    message.hidden = true; stage.classList.remove('vehicle-fallback');
    get('#vehicle-controls').hidden = false;
    get('[data-tool="reset"]').disabled = false;
    get('[data-tool="fullscreen"]').disabled = !stage.requestFullscreen || !document.fullscreenEnabled;
  }
  function start() {
    if (loading) return;
    loading = import('./scene.js').then(({ createScene }) => {
      scene = createScene(stage, {
        sideDoors: options.sideDoors,
        onPick: id => select(id,true),
        onHover: id => { get('#vehicle-hover').textContent = byId.get(id)?.name || ''; },
        onFailure: () => fallback('A conexão com o WebGL foi interrompida. Continue pelo catálogo.'),
        onRestore: ready,
        onLabel: (text,x,y,show) => {
          label.hidden = !show;
          label.textContent = text; label.style.left = x + '%'; label.style.top = y + '%';
        }
      });
      ready(); scene.setActive(visible); refresh();
      if (options.selected) scene.focus(options.selected);
    }).catch(() => fallback('O modelo 3D está indisponível neste navegador. Você pode inspecionar peças e gerenciar registros pelo catálogo.'));
  }
  root.addEventListener('input', event => { if (event.target.id === 'vehicle-search') refresh(); });
  root.addEventListener('change', event => {
    const { id, value, checked, dataset } = event.target;
    if (id === 'vehicle-doors') return api.setSideDoors(value ? Number(value) : null);
    if (!['vehicle-mode', 'vehicle-filter'].includes(id) && !dataset.toggle && !dataset.group && !dataset.opening) return;
    if (id === 'vehicle-mode') {
      setMode(value); options.selected = null; options.isolate = false;
      get('[data-toggle="isolate"]').checked = false;
    }
    if (id === 'vehicle-filter') options.filter = value;
    if (dataset.toggle) {
      if (dataset.toggle === 'isolate' && (!options.selected || (options.sideDoors === 2 && isRearDoor(options.selected)))) { event.target.checked = false; api.toast('Selecione uma peça para isolá-la.'); return; }
      options[dataset.toggle] = checked;
    }
    if (dataset.group) options.hidden[checked ? 'delete' : 'add'](dataset.group);
    if (dataset.opening) setOpening(dataset.opening, checked);
    refresh();
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const { select: id, vehicleAction: action, tool } = button.dataset;
    if (id) select(id);
    if (button.hasAttribute('data-vehicle-dismiss')) {
      const previous = options.selected;
      options.selected = null; options.isolate = false; get('[data-toggle="isolate"]').checked = false; refresh();
      catalog.open = true;
      list.querySelector('[data-select="' + previous + '"]')?.focus({ preventScroll:true });
    }
    if (tool === 'reset') scene?.reset(false);
    if (tool === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => api.toast('Não foi possível sair da tela cheia.'));
      else stage.requestFullscreen().catch(() => api.toast('Tela cheia indisponível.'));
    }
    if (action === 'history') {
      const history = get('#vehicle-history'); history.open = true; history.scrollIntoView({ block:'nearest' });
    } else if (action) api.action(action, byId.get(options.selected));
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) scene?.dispose(); });
  refresh(); start();
  return { refresh, select, setActive(value) { visible = value; scene?.setActive(value); } };
}
