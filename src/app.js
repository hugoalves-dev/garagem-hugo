const STORE_KEY = 'fox-em-dia-v1';
const DB_NAME = 'fox-em-dia-local';
const DB_STORE = 'photos';
const today = new Date().toISOString().slice(0, 10);
const statusLabels = { pendente: 'Pendente', aprovado: 'Aprovado', reprovado: 'Reprovado', inconclusivo: 'Inconclusivo', agendado: 'Agendado' };
const iconByType = { 'Motor e versão': '⚙', 'ABS e freios': '◉', 'Airbag': '◇', 'Injeção / EPC': '⚡', 'Correia dentada': '⟳', 'Carroceria / ferrugem': '▧', 'Chassi e identificação': '▤', 'Câmbio e embreagem': '⇄', 'Suspensão e direção': '⌁', 'Arrefecimento': '♨', 'Ar-condicionado': '❄', 'Limpadores e esguicho': '⌁', 'Rádio e acessórios': '♫', 'Alarme / elétrica': '⌑', 'OBD2 / scanner': '⌕', 'Documentação': '▣', 'Pneus e rodas': '◉', 'Iluminação': '☼', 'Sintoma geral': '!', 'Abastecimento': '⛽', 'Serviço': '✓' };
const systemGroups = ['Motor e versão', 'ABS e freios', 'Airbag', 'Injeção / EPC', 'Correia dentada', 'Carroceria / ferrugem', 'Chassi e identificação', 'Câmbio e embreagem', 'Suspensão e direção', 'Arrefecimento', 'Ar-condicionado', 'Limpadores e esguicho', 'Rádio e acessórios', 'Alarme / elétrica', 'OBD2 / scanner', 'Documentação', 'Pneus e rodas', 'Iluminação', 'Sintoma geral'];
const homeTests = [
  { system: 'Carroceria / ferrugem', title: 'Observar a ferrugem', detail: 'Com o carro parado e sem se abaixar sob ele, fotografe o ponto visível, de preferência com uma referência de tamanho. Anote se a área parece superficial ou se há perfuração.', caution: 'Não raspe nem aplique produto antes da avaliação; ferrugem estrutural precisa de funileiro.' },
  { system: 'Iluminação', title: 'Conferir luzes externas', detail: 'Com ajuda de outra pessoa, confira faróis, lanternas, freio, ré e setas. Registre qual lâmpada não acende e em que posição do comando.', caution: 'Não toque em lâmpadas quentes nem faça ponte em fusíveis.' },
  { system: 'Limpadores e esguicho', title: 'Testar limpadores e esguicho', detail: 'Com o carro parado, teste cada velocidade e observe ruído, curso e retorno. Teste o esguicho sem insistir se não sair líquido.', caution: 'Não acione repetidamente se o reservatório estiver vazio ou a bomba fizer ruído anormal.' },
  { system: 'Ar-condicionado', title: 'Observar o ar-condicionado', detail: 'Com o motor ligado em local ventilado, teste ventilação, velocidades e mudança de temperatura. Anote tempo até resfriar e ruídos.', caution: 'Não abra tubulações nem complete gás por conta própria.' },
  { system: 'Arrefecimento', title: 'Olhar o reservatório a frio', detail: 'Com o motor completamente frio, confira visualmente o nível no reservatório e procure manchas no chão. Fotografe se houver alteração.', caution: 'Nunca abra a tampa com o motor quente. Nível baixo ou vazamento pede avaliação.' },
  { system: 'Pneus e rodas', title: 'Inspecionar pneus', detail: 'Olhe desgaste, cortes, bolhas e data DOT. Confira pressão a frio conforme etiqueta/manual, sem adivinhar o valor.', caution: 'Bolha, lona aparente ou perda rápida de pressão: não rode até avaliar.' },
  { system: 'Documentação', title: 'Conferir documentos e identificadores', detail: 'Compare CRLV-e, manual e número do chassi conforme os locais indicados no manual. Não publique foto sem ocultar dados pessoais.', caution: 'Divergência de identificação deve ser verificada por autoridade competente; não tente remarcar.' }
];
const proTests = [
  { system: 'ABS e freios', title: 'Freios e ABS', detail: 'Oficina deve confirmar se o veículo possui ABS pela configuração/diagnóstico, ler falhas sem apagá-las e avaliar sensores, módulos, fluido, discos e pastilhas.', caution: 'Não faça frenagem de emergência em via pública para testar ABS. Pedal baixo, ruído forte ou luz de freio acesa: interrompa o uso.' },
  { system: 'Airbag', title: 'Airbag / SRS', detail: 'Autoelétrica com scanner compatível deve confirmar equipamentos e ler o módulo SRS. Solicite evidência do diagnóstico e não aceite apenas apagar a luz.', caution: 'Não medir conectores, remover bancos ou desmontar volante/airbag em casa.' },
  { system: 'Injeção / EPC', title: 'Injeção eletrônica / EPC', detail: 'Confirmar a configuração do motor pela identificação do veículo e usar scanner para ler códigos e dados. Registrar os códigos antes de qualquer limpeza.', caution: 'EPC é um aviso de falha do gerenciamento eletrônico; não conclua causa só pela luz.' },
  { system: 'Motor e versão', title: 'Motor e configuração', detail: 'Confirmar ano, versão, código do motor e itens originais pelo CRLV, etiquetas e catálogo técnico. Turbo, ABS e airbag ficam como “a confirmar” até evidência.', caution: 'Não inferir turbo por emblema ou aparência; peça confirmação por código do motor.' },
  { system: 'Correia dentada', title: 'Correia dentada e sincronismo', detail: 'Mecânico deve conferir aplicação, tensão e histórico comprovado; registre nota/ordem de serviço e confirme o próximo intervalo no manual do motor.', caution: 'Não estime o próximo intervalo sem identificar a versão e o código do motor.' },
  { system: 'Câmbio e embreagem', title: 'Câmbio, embreagem e vazamentos', detail: 'Mecânico avalia engates, ruídos, patinação, coifas e vazamentos com inspeção segura. Registre em quais condições o sintoma aparece.', caution: 'Não faça teste de embreagem forçando o carro ou segurando em rampa.' },
  { system: 'Suspensão e direção', title: 'Suspensão, direção e rolamentos', detail: 'Solicite inspeção em elevador de buchas, terminais, amortecedores, molas, rolamentos, alinhamento e ruídos relatados.', caution: 'Não entre sob veículo apoiado apenas por macaco.' },
  { system: 'Carroceria / ferrugem', title: 'Ferrugem estrutural', detail: 'Funileiro ou vistoriador deve verificar assoalho, longarinas, pontos de apoio e extensão da corrosão; comparar com fotos e laudo.', caution: 'Não faça reparo cosmético antes de documentar e entender se é estrutural.' },
  { system: 'Chassi e identificação', title: 'Chassi, etiquetas e sinais de reparo', detail: 'Vistoriador habilitado compara gravações, etiquetas, vidros e documentos, observando solda, abrasão ou divergências.', caution: 'Qualquer suspeita deve seguir canais oficiais; não lixe, pinte ou altere a região.' },
  { system: 'Arrefecimento', title: 'Sistema de arrefecimento', detail: 'Mecânico pode fazer teste de pressão a frio, conferir válvula, ventoinha, mangueiras, radiador, bomba e concentração do fluido.', caution: 'Nunca abrir o sistema quente ou misturar aditivos sem especificação.' },
  { system: 'Alarme / elétrica', title: 'Alarme e acessórios elétricos', detail: 'Autoelétrica deve identificar marca/modelo, sensores, alimentação e instalação; revisar acessórios sem cortar chicote. Registre quando o sintoma ocorre.', caution: 'Não desconecte fios aleatórios: pode causar curto, falha de imobilizador ou dano ao módulo.' },
  { system: 'OBD2 / scanner', title: 'Leitura OBD2', detail: 'Scanner pode ler códigos atuais e históricos, monitores e módulos disponíveis. Anote ferramenta, códigos e freeze-frame antes de apagar qualquer coisa.', caution: 'Leitor OBD2 não confirma sozinho a saúde mecânica nem todos os airbags/ABS.' }
];

function initialState() {
  const titles = {
    'Motor e versão': 'Confirmar versão, ano e código do motor', 'ABS e freios': 'Inspecionar freios e confirmar ABS',
    Airbag: 'Confirmar equipamentos e estado do airbag / SRS', 'Injeção / EPC': 'Conferir luzes do painel e códigos de injeção',
    'Correia dentada': 'Verificar histórico e intervalo da correia dentada', 'Carroceria / ferrugem': 'Inspecionar carroceria e pontos de ferrugem',
    'Chassi e identificação': 'Conferir chassi e identificadores', 'Câmbio e embreagem': 'Avaliar câmbio e embreagem',
    'Suspensão e direção': 'Inspecionar suspensão e direção', Arrefecimento: 'Conferir arrefecimento e vazamentos',
    'Ar-condicionado': 'Verificar ar-condicionado e ventilação', 'Limpadores e esguicho': 'Testar limpadores e esguichos',
    'Rádio e acessórios': 'Conferir rádio e acessórios elétricos', 'Alarme / elétrica': 'Verificar alarme e instalação elétrica',
    'OBD2 / scanner': 'Registrar leitura OBD2 / scanner', Documentação: 'Organizar documentação e histórico',
    'Pneus e rodas': 'Inspecionar pneus e rodas', Iluminação: 'Conferir iluminação e luzes do painel',
    'Sintoma geral': 'Registrar sintomas observados'
  };
  const records = systemGroups.map(system => makeRecord(system, titles[system] || system, 'pendente', {
    observation: 'Aguardando confirmação. Nenhum resultado foi presumido.',
    nextStep: system === 'ABS e freios' || system === 'Airbag' || system === 'Injeção / EPC' || system === 'Motor e versão'
      ? 'Confirmar a configuração do veículo e registrar evidência adequada antes de concluir.'
      : 'Registrar uma checagem segura ou solicitar avaliação profissional, conforme o guia.',
    risk: system === 'ABS e freios' || system === 'Airbag' ? 'alto' : 'baixo',
    source: 'A confirmar'
  }));
  return { odometer: '', fuel: 'Etanol', records, refuels: [], reminders: [] };
}
function uid() { return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function makeRecord(system, title, status, extra) { return Object.assign({ id: uid(), system, title, status, kind: 'inspecao', date: today, observation: '', result: '', risk: 'baixo', cost: '', responsible: 'Proprietário', deadline: '', repair: false, rollback: '', nextStep: '', location: '', source: '', photoId: '' }, extra || {}); }
function safeParse(value) { try { return JSON.parse(value); } catch (_) { return null; } }
let state = safeParse(localStorage.getItem(STORE_KEY)) || initialState();
let toastTimer;
let remoteReady = false;
let localRevision = 0;
let remoteQueue = Promise.resolve();
const $ = (selector, root) => (root || document).querySelector(selector);
const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  localRevision++;
  renderAll();
  if (remoteReady) queueRemoteSave();
}
function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(date) { if (!date) return 'Sem prazo'; const d = new Date(date + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtNumber(n) { return Number(n || 0).toLocaleString('pt-BR'); }
function badge(status) { return '<span class="status-badge ' + escapeHtml(status) + '"><i class="dot ' + (status === 'aprovado' ? 'approved' : status === 'reprovado' ? 'failed' : status === 'inconclusivo' ? 'unclear' : 'pending') + '"></i>' + escapeHtml(statusLabels[status] || status) + '</span>'; }
function riskLabel(risk) { return ({ baixo: 'Baixo risco', médio: 'Risco moderado', alto: 'Risco alto' })[risk] || 'Risco não definido'; }
function openDb() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, 1); req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
async function savePhoto(id, blob) { if (!blob) return; const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(blob, id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
async function getPhoto(id) {
  if (!id) return null;
  const db = await openDb();
  const local = await new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readonly'); const req = tx.objectStore(DB_STORE).get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
  if (local) return local;
  const response = await fetch('/api/photos/' + encodeURIComponent(id), { cache: 'no-store' });
  if (!response.ok) return null;
  const blob = await response.blob();
  await savePhoto(id, blob);
  return blob;
}
async function deletePhoto(id) {
  if (!id) return;
  try { const db = await openDb(); await new Promise(resolve => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).delete(id); tx.oncomplete = resolve; tx.onerror = resolve; }); } catch (_) {}
  if (remoteReady) fetch('/api/photos/' + encodeURIComponent(id), { method: 'DELETE' }).catch(() => {});
}
function queueRemoteSave() {
  const snapshot = JSON.stringify(state);
  remoteQueue = remoteQueue.catch(() => {}).then(async () => {
    const response = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: snapshot });
    if (!response.ok) throw new Error('state save failed');
  }).catch(() => showToast('Não consegui sincronizar. Seus dados continuam salvos neste navegador.'));
}
async function initializeRemote() {
  const startRevision = localRevision;
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('state load failed');
    const remote = await response.json();
    if (remote.state && localRevision === startRevision) {
      state = remote.state;
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      renderAll();
    } else {
      const body = JSON.stringify(state);
      const saved = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      if (!saved.ok) throw new Error('initial state save failed');
    }
    remoteReady = true;
    showToast('Sincronização segura ativada.');
  } catch (_) {
    showToast('Sem conexão com a garagem na nuvem. O navegador mantém uma cópia local.');
  }
}
async function compressPhoto(file) {
  if (!('createImageBitmap' in window)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    return await new Promise(resolve => canvas.toBlob(blob => resolve(blob || file), 'image/webp', .82));
  } catch (_) { return file; }
}
async function uploadPhoto(id, blob) {
  const response = await fetch('/api/photos/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
  if (!response.ok) throw new Error('photo upload failed');
}
function showToast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400); }
function displayView(view) { $$('.page').forEach(p => p.classList.toggle('active', p.id === 'view-' + view)); $$('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view)); const button = $('.nav-item[data-view="' + view + '"]'); $('#breadcrumb-current').textContent = button ? button.textContent.trim().replace(/\s+\d+$/, '') : 'Visão geral'; $('#sidebar').classList.remove('open'); window.scrollTo({ top: 0, behavior: 'smooth' }); if (view === 'registros') renderRecords(); if (view === 'linha-do-tempo') renderTimeline(); }
function statusCounts() { return state.records.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}); }
function getAttentionCount() { return state.records.filter(r => r.status === 'reprovado' || (r.deadline && r.deadline < today && r.status !== 'aprovado')).length; }
function getAverage() { const full = state.refuels.filter(r => r.full).sort((a, b) => Number(a.odometer) - Number(b.odometer)); if (full.length < 2) return null; const first = full[0], last = full[full.length - 1]; const distance = Number(last.odometer) - Number(first.odometer); const liters = state.refuels.filter(r => Number(r.odometer) > Number(first.odometer) && Number(r.odometer) <= Number(last.odometer)).reduce((sum, r) => sum + Number(r.liters || 0), 0); if (distance <= 0 || liters <= 0) return null; return { value: distance / liters, distance, liters, count: full.length }; }
function renderDashboard() {
  const counts = statusCounts(); const average = getAverage();
  const odometer = state.odometer === '' || state.odometer == null ? '—' : fmtNumber(state.odometer);
  $('#odo-value').textContent = odometer; $('#metric-odo').innerHTML = odometer + ' <small>km</small>';
  $('#metric-consumption').innerHTML = average ? average.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' <small>km/L</small>' : '— <small>km/L</small>';
  $('#consumption-note').textContent = average ? 'Etanol · ' + fmtNumber(average.distance) + ' km em ' + average.count + ' tanques cheios' : 'Precisa de dois tanques cheios registrados';
  $('#metric-approved').innerHTML = (counts.aprovado || 0) + ' <small>aprovadas</small>';
  $('#metric-pending').textContent = (counts.pendente || 0) + (counts.inconclusivo || 0) + (counts.agendado || 0);
  $('#metric-attention').innerHTML = getAttentionCount() + ' <small>itens</small>';
  $('#nav-record-count').textContent = state.records.length;
  const entries = [['Aprovado', counts.aprovado || 0, 'approved'], ['Reprovado', counts.reprovado || 0, 'failed'], ['Inconclusivo', counts.inconclusivo || 0, 'unclear'], ['Pendente', (counts.pendente || 0) + (counts.agendado || 0), 'pending']];
  $('#comparison').innerHTML = entries.map(e => '<div class="compare-cell ' + e[2] + '"><span>' + e[0] + '</span><strong>' + e[1] + '</strong></div>').join('');
  const priorities = state.records.filter(r => r.status === 'reprovado' || r.status === 'inconclusivo').sort((a, b) => (a.risk === 'alto' ? -1 : 0) - (b.risk === 'alto' ? -1 : 0)).slice(0, 3);
  $('#next-steps').innerHTML = priorities.length ? priorities.map(r => '<div class="step-row"><span class="step-mark">!</span><div class="step-copy"><strong>' + escapeHtml(r.title) + '</strong><small>' + escapeHtml(r.nextStep || 'Defina o próximo passo') + '</small></div><button class="text-button" data-open-record="' + r.id + '">Abrir</button></div>').join('') : '<div class="empty-note">Sem itens críticos. Registre o próximo achado por aqui.</div>';
  const reminders = state.reminders.slice(0, 4);
  $('#reminder-list').innerHTML = reminders.length ? reminders.map(r => '<div class="reminder-item"><span class="reminder-icon">◷</span><div class="reminder-copy"><strong>' + escapeHtml(r.title) + '</strong><small>' + (r.date ? fmtDate(r.date) : r.odometer ? fmtNumber(r.odometer) + ' km' : 'Prazo a definir') + ' · ' + escapeHtml(r.responsible || 'Responsável a definir') + '</small></div><button class="remove-reminder" data-delete-reminder="' + r.id + '" aria-label="Remover lembrete">×</button></div>').join('') : '<div class="empty-note">Nenhum lembrete cadastrado.</div>';
  const recent = [...state.records].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
  $('#recent-list').innerHTML = recent.length ? recent.map(r => '<div class="recent-row"><span class="recent-symbol">' + (iconByType[r.system] || '▤') + '</span><div><strong>' + escapeHtml(r.title) + '</strong><small>' + fmtDate(r.date) + ' · ' + escapeHtml(r.location || 'local não definido') + '</small></div>' + badge(r.status) + '</div>').join('') : '<div class="empty-note">Ainda não há registros.</div>';
  $('#quick-list').innerHTML = homeTests.slice(0, 4).map(t => '<div class="quick-item"><i>✓</i><span>' + escapeHtml(t.title) + '</span></div>').join('');
}
function fillSystemFilter() { const sel = $('#filter-system'); if (!sel) return; const current = sel.value; sel.innerHTML = '<option value="">Todos os sistemas</option>' + systemGroups.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join(''); sel.value = current; }
function renderRecords() {
  fillSystemFilter(); const term = ($('#record-search').value || '').toLowerCase(); const system = $('#filter-system').value; const status = $('#filter-status').value; const location = $('#filter-location').value;
  const items = [...state.records].filter(r => (!system || r.system === system) && (!status || r.status === status) && (!location || (location === 'Outro' ? !['Lins', 'Bauru'].includes(r.location) : r.location === location)) && (!term || [r.title, r.system, r.observation, r.nextStep, r.result].join(' ').toLowerCase().includes(term))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $('#record-summary').textContent = items.length + ' de ' + state.records.length + ' registros · Aprovado, reprovado e inconclusivo contam apenas quando há evidência registrada.';
  $('#record-grid').innerHTML = items.length ? items.map(r => '<article class="record-card"><div class="record-card-top"><span class="record-icon">' + (iconByType[r.system] || '▤') + '</span><div class="record-title"><strong>' + escapeHtml(r.title) + '</strong><small>' + escapeHtml(r.system) + ' · ' + fmtDate(r.date) + '</small></div>' + badge(r.status) + '</div><p class="record-description">' + escapeHtml(r.observation || r.nextStep || 'Sem observação.') + '</p><div class="record-meta"><span>⌖ ' + escapeHtml(r.location || 'Local não definido') + '</span><span>⚑ ' + riskLabel(r.risk) + '</span><span>♙ ' + escapeHtml(r.responsible || 'Sem responsável') + '</span>' + (r.cost ? '<span>R$ ' + escapeHtml(r.cost) + '</span>' : '') + (r.photoId ? '<span>▧ Foto</span>' : '') + '</div><div class="record-actions"><button data-open-record="' + r.id + '">Detalhes</button><button data-edit-record="' + r.id + '">Editar</button><button class="danger" data-delete-record="' + r.id + '">Excluir</button></div></article>').join('') : '<div class="empty-state no-results"><strong>Nenhum registro encontrado</strong>Ajuste os filtros ou crie um novo registro.</div>';
}
function renderGuides() {
  $('#home-tests').innerHTML = homeTests.map((t, i) => guideCard(t, i, false)).join('');
  $('#pro-tests').innerHTML = proTests.map((t, i) => guideCard(t, i, true)).join('');
}
function guideCard(t, i, professional) { return '<article class="guide-card"><div class="guide-head"><span class="record-icon">' + (iconByType[t.system] || (professional ? '⚒' : '✓')) + '</span><div><strong>' + escapeHtml(t.title) + '</strong><small>' + escapeHtml(t.system) + ' · ' + (professional ? 'Profissional' : 'Em casa') + '</small></div></div><p>' + escapeHtml(t.detail) + '</p><p class="guide-caution">' + escapeHtml(t.caution) + '</p><button class="text-button" data-guide-record="' + (professional ? 'pro' : 'home') + ':' + i + '">Registrar observação ↗</button></article>'; }
function renderFuel() {
  const avg = getAverage(); const fullCount = state.refuels.filter(r => r.full).length;
  $('#fuel-stats').innerHTML = '<div class="fuel-stat"><span>MÉDIA NO INTERVALO</span><strong>' + (avg ? avg.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' <small>km/L</small>' : '— <small>km/L</small>') + '</strong></div><div class="fuel-stat"><span>ABASTECIMENTOS</span><strong>' + state.refuels.length + '</strong></div><div class="fuel-stat"><span>TANQUES CHEIOS</span><strong>' + fullCount + '</strong></div>';
  if (!state.refuels.length) { $('#fuel-list').innerHTML = '<div class="empty-state"><strong>Nenhum abastecimento registrado</strong>Registre odômetro, litros e se completou o tanque. A média não será estimada.</div>'; return; }
  const sorted = [...state.refuels].sort((a, b) => Number(b.odometer) - Number(a.odometer));
  $('#fuel-list').innerHTML = '<div class="fuel-row fuel-head"><span>DATA</span><span>ODÔMETRO</span><span>LITROS</span><span class="fuel-price">VALOR</span><span></span></div>' + sorted.map(r => '<div class="fuel-row"><span><strong>' + fmtDate(r.date) + '</strong>' + (r.full ? '<br><small>Tanque cheio</small>' : '') + '</span><span>' + fmtNumber(r.odometer) + ' km</span><span>' + Number(r.liters).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L</span><span class="fuel-price">' + (r.amount ? 'R$ ' + Number(r.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—') + '</span><button data-delete-fuel="' + r.id + '" aria-label="Excluir abastecimento">×</button></div>').join('');
}
function renderTimeline() {
  const filter = $('#timeline-filter').value; const entries = [];
  state.records.forEach(r => { if (!filter || (filter === 'servico' ? r.kind === 'servico' : filter === 'inspecao' ? r.kind !== 'servico' : false)) entries.push({ date: r.date, type: r.kind === 'servico' ? 'servico' : 'inspecao', title: r.title, sub: r.system + ' · ' + (r.location || 'local não definido'), body: r.observation || r.nextStep, status: r.status }); });
  state.refuels.forEach(r => { if (!filter || filter === 'abastecimento') entries.push({ date: r.date, type: 'abastecimento', title: 'Abastecimento de etanol', sub: fmtNumber(r.odometer) + ' km · ' + Number(r.liters).toLocaleString('pt-BR') + ' L', body: r.note, status: 'aprovado' }); });
  state.reminders.forEach(r => { if (!filter || filter === 'lembrete') entries.push({ date: r.date || today, type: 'lembrete', title: r.title, sub: 'Lembrete · ' + (r.responsible || 'Responsável a definir'), body: r.note || r.odometer ? (r.note || 'Meta: ' + fmtNumber(r.odometer) + ' km') : 'Prazo a definir', status: 'agendado' }); });
  entries.sort((a, b) => String(b.date).localeCompare(String(a.date))); $('#timeline-count').textContent = entries.length + ' eventos';
  let html = '', lastDate = ''; entries.forEach(e => { if (e.date !== lastDate) { lastDate = e.date; html += '<div class="timeline-date">' + fmtDate(e.date) + '</div>'; } html += '<article class="timeline-entry"><div class="timeline-entry-head"><span class="record-icon">' + (iconByType[e.type === 'abastecimento' ? 'Abastecimento' : e.type === 'servico' ? 'Serviço' : 'Sintoma geral']) + '</span><strong>' + escapeHtml(e.title) + '</strong>' + badge(e.status) + '</div><small>' + escapeHtml(e.sub) + '</small>' + (e.body ? '<p>' + escapeHtml(e.body) + '</p>' : '') + '</article>'; });
  $('#timeline').innerHTML = html || '<div class="empty-state"><strong>Sem eventos para esse filtro</strong>Seus próximos registros aparecerão aqui.</div>';
}
function renderAll() { renderDashboard(); renderRecords(); renderGuides(); renderFuel(); renderTimeline(); }

function showModal(title, eyebrow, html, actions) { $('#modal-title').textContent = title; $('#modal-eyebrow').textContent = eyebrow; $('#modal-content').innerHTML = html; $('#modal-actions').innerHTML = actions; $('#modal-backdrop').hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() { $('#modal-backdrop').hidden = true; $('#modal-content').innerHTML = ''; document.body.style.overflow = ''; }
const cancelButton = '<button class="button secondary" data-action="close-modal">Cancelar</button>';
const saveButton = '<button class="button primary" id="save-form">Salvar registro</button>';
function recordForm(record, suggested) {
  const r = record || makeRecord(suggested && suggested.system || systemGroups[0], suggested && suggested.title || '', 'pendente', {});
  const systems = systemGroups.map(s => '<option ' + (r.system === s ? 'selected' : '') + '>' + escapeHtml(s) + '</option>').join('');
  const statuses = Object.entries(statusLabels).map(([k, v]) => '<option value="' + k + '" ' + (r.status === k ? 'selected' : '') + '>' + v + '</option>').join('');
  const html = '<form id="record-form"><input type="hidden" name="id" value="' + escapeHtml(r.id) + '"><input type="hidden" name="existingPhoto" value="' + escapeHtml(r.photoId || '') + '"><div class="form-grid">' +
    field('Sistema', '<select name="system" required>' + systems + '</select>') + field('Item / título', '<input name="title" required maxlength="120" value="' + escapeHtml(r.title) + '" placeholder="Ex.: luz EPC acesa">') +
    field('Tipo de registro', '<select name="kind"><option value="inspecao" ' + (r.kind === 'inspecao' ? 'selected' : '') + '>Inspeção</option><option value="sintoma" ' + (r.kind === 'sintoma' ? 'selected' : '') + '>Sintoma</option><option value="servico" ' + (r.kind === 'servico' ? 'selected' : '') + '>Serviço realizado</option></select>') + field('Resultado', '<select name="status">' + statuses + '</select>') +
    field('Data', '<input name="date" type="date" value="' + escapeHtml(r.date || today) + '">') + field('Odômetro no registro (km)', '<input name="odometer" type="number" min="0" step="1" value="' + escapeHtml(r.odometer || '') + '" placeholder="Leitura do painel">') +
    field('Risco', '<select name="risk"><option value="baixo" ' + (r.risk === 'baixo' ? 'selected' : '') + '>Baixo</option><option value="médio" ' + (r.risk === 'médio' ? 'selected' : '') + '>Moderado</option><option value="alto" ' + (r.risk === 'alto' ? 'selected' : '') + '>Alto</option></select>') + field('Local', '<select name="location"><option value="" ' + (!r.location ? 'selected' : '') + '>Não definido</option><option ' + (r.location === 'Lins' ? 'selected' : '') + '>Lins</option><option ' + (r.location === 'Bauru' ? 'selected' : '') + '>Bauru</option><option ' + (r.location === 'Outro' ? 'selected' : '') + '>Outro</option></select>') +
    field('Responsável', '<input name="responsible" value="' + escapeHtml(r.responsible || '') + '" placeholder="Proprietário, mecânico…">') + field('Prazo / próxima revisão', '<input name="deadline" type="date" value="' + escapeHtml(r.deadline || '') + '">') + field('Custo estimado (R$)', '<input name="cost" type="number" min="0" step="0.01" value="' + escapeHtml(r.cost || '') + '" placeholder="Opcional">') + field('Origem da informação', '<input name="source" value="' + escapeHtml(r.source || '') + '" placeholder="Relato, nota fiscal, laudo…">') +
    field('Observação / sintomas', '<textarea name="observation" placeholder="Condição, quando ocorre, evidência…">' + escapeHtml(r.observation || '') + '</textarea>', true) + field('Resultado detalhado', '<textarea name="result" placeholder="O que foi observado ou medido?">' + escapeHtml(r.result || '') + '</textarea>', true) +
    field('Precisa de reparo?', '<label class="check-field"><input type="checkbox" name="repair" ' + (r.repair ? 'checked' : '') + '> Sim, precisa de reparo ou diagnóstico</label>') + field('Foto (opcional)', '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><span class="form-help">A foto fica no armazenamento privado da garagem. Evite enviar documentos com dados pessoais.</span>' + (r.photoId ? '<span class="form-help">Este registro já tem uma foto salva.</span>' : '')) +
    field('Rollback ou alternativa segura', '<textarea name="rollback" placeholder="Como retornar ao estado anterior ou manter o carro seguro enquanto aguarda?">' + escapeHtml(r.rollback || '') + '</textarea>', true) + field('Próximo passo', '<textarea name="nextStep" placeholder="Ação concreta, responsável e evidência esperada">' + escapeHtml(r.nextStep || '') + '</textarea>', true) +
    '</div></form>';
  showModal(record ? 'Editar registro' : 'Novo registro', 'INSPEÇÃO · SINTOMA · SERVIÇO', html, cancelButton + '<button class="button primary" id="save-form">Salvar registro</button>');
  $('#save-form').addEventListener('click', saveRecordForm);
}
function field(label, control, full) { return '<div class="form-field ' + (full ? 'full-width' : '') + '"><label>' + label + '</label>' + control + '</div>'; }
async function saveRecordForm() {
  const form = $('#record-form'); if (!form.reportValidity()) return; const data = new FormData(form); const id = data.get('id'); const existing = state.records.find(r => r.id === id); const photoFile = data.get('photo'); let photoId = data.get('existingPhoto') || '';
  try {
    if (photoFile && photoFile.size) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) return showToast('Use uma foto JPEG, PNG ou WebP.');
      if (photoFile.size > 8 * 1024 * 1024) return showToast('A imagem original precisa ter até 8 MB.');
      const image = await compressPhoto(photoFile);
      if (image.size > 5 * 1024 * 1024) return showToast('A foto comprimida precisa ter até 5 MB.');
      photoId = uid(); await savePhoto(photoId, image); if (remoteReady) await uploadPhoto(photoId, image);
    }
  } catch (_) { showToast('Não consegui enviar a foto. O registro ficou aberto para você tentar de novo.'); return; }
  const r = { id, system: data.get('system'), title: data.get('title').trim(), kind: data.get('kind'), status: data.get('status'), date: data.get('date') || today, odometer: data.get('odometer') || '', observation: data.get('observation').trim(), result: data.get('result').trim(), risk: data.get('risk'), location: data.get('location'), responsible: data.get('responsible').trim(), deadline: data.get('deadline'), cost: data.get('cost'), source: data.get('source').trim(), repair: data.get('repair') === 'on', rollback: data.get('rollback').trim(), nextStep: data.get('nextStep').trim(), photoId };
  if (existing && existing.photoId && existing.photoId !== photoId) deletePhoto(existing.photoId);
  if (existing) state.records = state.records.map(x => x.id === id ? r : x); else state.records.unshift(r); if (r.odometer && Number(r.odometer) > Number(state.odometer || 0)) state.odometer = Number(r.odometer); save(); closeModal(); showToast(remoteReady ? 'Registro salvo na garagem.' : 'Registro salvo neste navegador.');
}
function openRecordDetail(id) {
  const r = state.records.find(x => x.id === id); if (!r) return; const html = '<div class="form-grid">' + field('Sistema / resultado', '<div>' + escapeHtml(r.system) + '<br>' + badge(r.status) + '</div>') + field('Data / local', '<div>' + fmtDate(r.date) + '<br>' + escapeHtml(r.location || 'Local não definido') + '</div>') + field('Observação', '<div>' + escapeHtml(r.observation || '—') + '</div>', true) + field('Resultado detalhado', '<div>' + escapeHtml(r.result || '—') + '</div>', true) + field('Risco / responsável', '<div>' + riskLabel(r.risk) + ' · ' + escapeHtml(r.responsible || 'Não definido') + '</div>') + field('Custo estimado / prazo', '<div>' + (r.cost ? 'R$ ' + escapeHtml(r.cost) : 'Sem estimativa') + ' · ' + fmtDate(r.deadline) + '</div>') + field('Precisa de reparo?', '<div>' + (r.repair ? 'Sim' : 'Não informado') + '</div>') + field('Rollback / alternativa segura', '<div>' + escapeHtml(r.rollback || '—') + '</div>', true) + field('Próximo passo', '<div>' + escapeHtml(r.nextStep || '—') + '</div>', true) + '</div>' + (r.photoId ? '<div id="photo-detail" class="photo-preview" style="margin-top:14px">Carregando foto…</div>' : '');
  showModal(r.title, 'DETALHE DO REGISTRO', html, '<button class="button secondary" data-action="close-modal">Fechar</button><button class="button primary" data-edit-record="' + id + '">Editar</button>');
  if (r.photoId) getPhoto(r.photoId).then(blob => { const box = $('#photo-detail'); if (!box || !blob) return; const url = URL.createObjectURL(blob); box.innerHTML = '<img src="' + url + '" alt="Foto do registro"><span>Foto salva localmente</span>'; box.querySelector('img').onload = () => URL.revokeObjectURL(url); }).catch(() => {});
}
function newFuelForm() {
  const html = '<form id="fuel-form"><div class="form-grid">' + field('Data', '<input name="date" type="date" required value="' + today + '">') + field('Odômetro (km)', '<input name="odometer" type="number" min="0" step="1" required value="' + (state.odometer || '') + '">') + field('Litros de etanol', '<input name="liters" type="number" min="0.01" step="0.01" required placeholder="Ex.: 32,5">') + field('Valor total (R$)', '<input name="amount" type="number" min="0" step="0.01" placeholder="Opcional">') + field('Tanque', '<label class="check-field"><input type="checkbox" name="full"> Tanque completado até o primeiro desarme</label>') + field('Observação', '<textarea name="note" placeholder="Posto, condição de uso ou comprovante…"></textarea>') + '</div><p class="form-help">A média só considera o intervalo entre dois registros marcados como tanque cheio. Leituras parciais continuam no histórico, sem inventar consumo.</p></form>';
  showModal('Registrar abastecimento', 'ETANOL · CONSUMO', html, cancelButton + '<button class="button primary" id="save-fuel">Salvar abastecimento</button>');
  $('#save-fuel').addEventListener('click', () => { const form = $('#fuel-form'); if (!form.reportValidity()) return; const d = new FormData(form); const item = { id: uid(), date: d.get('date'), odometer: Number(d.get('odometer')), liters: Number(d.get('liters')), amount: Number(d.get('amount') || 0), full: d.get('full') === 'on', note: d.get('note').trim() }; state.refuels.push(item); state.odometer = Math.max(Number(state.odometer), item.odometer); save(); closeModal(); showToast('Abastecimento registrado.'); });
}
function newReminderForm() {
  const html = '<form id="reminder-form"><div class="form-grid">' + field('Serviço / lembrete', '<input name="title" required maxlength="100" placeholder="Ex.: revisar freios">') + field('Responsável', '<input name="responsible" placeholder="Proprietário, mecânico…">') + field('Data alvo', '<input name="date" type="date">') + field('Odômetro alvo (km)', '<input name="odometer" type="number" min="0" placeholder="Opcional">') + field('Observação / critério', '<textarea name="note" placeholder="Use o manual ou laudo como referência; não invente intervalo."></textarea>', true) + '</div></form>';
  showModal('Novo lembrete', 'PLANEJAMENTO PREVENTIVO', html, cancelButton + '<button class="button primary" id="save-reminder">Salvar lembrete</button>');
  $('#save-reminder').addEventListener('click', () => { const form = $('#reminder-form'); if (!form.reportValidity()) return; const d = new FormData(form); state.reminders.push({ id: uid(), title: d.get('title').trim(), responsible: d.get('responsible').trim(), date: d.get('date'), odometer: d.get('odometer'), note: d.get('note').trim() }); save(); closeModal(); showToast('Lembrete adicionado.'); });
}
function editOdometer() { const html = '<form id="odo-form"><div class="form-field"><label>Odômetro atual (km)</label><input name="odometer" type="number" min="0" step="1" required value="' + (state.odometer || '') + '"><span class="form-help">Atualize com a leitura do painel. O histórico dos abastecimentos permanece inalterado.</span></div></form>'; showModal('Atualizar odômetro', 'DADOS DO VEÍCULO', html, cancelButton + '<button class="button primary" id="save-odo">Salvar</button>'); $('#save-odo').addEventListener('click', () => { const form = $('#odo-form'); if (!form.reportValidity()) return; state.odometer = Number(new FormData(form).get('odometer')); save(); closeModal(); showToast('Odômetro atualizado.'); }); }
async function blobAsDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
async function exportBackup() {
  const copy = JSON.parse(JSON.stringify(state));
  for (const record of copy.records) { if (!record.photoId) continue; const blob = await getPhoto(record.photoId); if (blob) record.photoData = await blobAsDataUrl(blob); }
  const payload = { app: 'Fox em Dia', version: 1, exportedAt: new Date().toISOString(), state: copy };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'fox-em-dia-backup-' + today + '.json'; a.click(); URL.revokeObjectURL(url); showToast('Backup exportado, incluindo fotos disponíveis.');
}
function importBackup(file) {
  if (!file) return;
  const reader = new FileReader(); reader.onload = async () => {
    const parsed = safeParse(reader.result);
    if (!parsed || parsed.app !== 'Fox em Dia' || !parsed.state || !Array.isArray(parsed.state.records)) return showToast('Arquivo de backup inválido.');
    if (!confirm('Importar este backup vai substituir os registros da garagem atual. Continuar?')) return;
    const imported = parsed.state;
    for (const record of imported.records) {
      if (record.photoData) {
        try { const blob = await (await fetch(record.photoData)).blob(); await savePhoto(record.photoId || (record.photoId = uid()), blob); if (remoteReady) await uploadPhoto(record.photoId, blob); }
        catch (_) { record.photoId = ''; }
        delete record.photoData;
      } else if (record.photoId) record.photoId = '';
    }
    state = imported; save(); showToast(remoteReady ? 'Backup importado e sincronizado.' : 'Backup importado; sincronização será feita ao conectar.');
  };
  reader.readAsText(file);
}
function deleteRecord(id) { const r = state.records.find(x => x.id === id); if (!r || !confirm('Excluir o registro “' + r.title + '”?')) return; if (r.photoId) deletePhoto(r.photoId); state.records = state.records.filter(x => x.id !== id); save(); showToast('Registro excluído.'); }
function bindEvents() {
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]'); if (nav) return displayView(nav.dataset.view);
    const link = e.target.closest('[data-view-link]'); if (link) return displayView(link.dataset.viewLink);
    const action = e.target.closest('[data-action]'); if (action) { const name = action.dataset.action; if (name === 'new-record') return recordForm(null); if (name === 'new-fuel') return newFuelForm(); if (name === 'new-reminder') return newReminderForm(); if (name === 'edit-odometer') return editOdometer(); if (name === 'close-modal') return closeModal(); if (name === 'backup') return exportBackup(); if (name === 'restore') return $('#restore-file').click(); }
    const edit = e.target.closest('[data-edit-record]'); if (edit) { const r = state.records.find(x => x.id === edit.dataset.editRecord); closeModal(); return recordForm(r); }
    const detail = e.target.closest('[data-open-record]'); if (detail) return openRecordDetail(detail.dataset.openRecord);
    const del = e.target.closest('[data-delete-record]'); if (del) return deleteRecord(del.dataset.deleteRecord);
    const delRem = e.target.closest('[data-delete-reminder]'); if (delRem) { state.reminders = state.reminders.filter(r => r.id !== delRem.dataset.deleteReminder); save(); return showToast('Lembrete removido.'); }
    const delFuel = e.target.closest('[data-delete-fuel]'); if (delFuel) { if (confirm('Excluir este abastecimento?')) { state.refuels = state.refuels.filter(r => r.id !== delFuel.dataset.deleteFuel); save(); } return; }
    const guide = e.target.closest('[data-guide-record]'); if (guide) { const [type, idx] = guide.dataset.guideRecord.split(':'); const t = (type === 'pro' ? proTests : homeTests)[Number(idx)]; return recordForm(null, { system: t.system, title: t.title }); }
  });
  $('#record-search').addEventListener('input', renderRecords); ['filter-system', 'filter-status', 'filter-location'].forEach(id => $('#' + id).addEventListener('change', renderRecords)); $('#timeline-filter').addEventListener('change', renderTimeline); $('#restore-file').addEventListener('change', e => { importBackup(e.target.files[0]); e.target.value = ''; }); $('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#modal-backdrop').addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal-backdrop').hidden) closeModal(); });
}
bindEvents(); renderAll(); initializeRemote();
