import { activeRecords, componentHistory, statuses } from './status.js';
import { byId, modes } from './catalog.js';

export const actions = {
  tarefa: ['Nova tarefa', 'pendente'],
  sintoma: ['Registrar problema', 'reprovado'],
  inspecao: ['Registrar inspeção', 'pendente'],
  reparo: ['Planejar reparo', 'agendado'],
  substituicao: ['Planejar substituição', 'agendado'],
  melhoria: ['Planejar melhoria', 'agendado'],
  servico: ['Registrar manutenção realizada', 'aprovado'],
  reminder: ['Adicionar lembrete'],
  photo: ['Adicionar foto']
};

export function renderPanel(panel, component, state, status, api) {
  const { escape: e, formatDate, guide } = api;
  if (!component) {
    panel.innerHTML = '<h2>Detalhes da peça</h2><p>Selecione uma peça no catálogo ou no modelo para ver sua condição e seus registros.</p>';
    return;
  }
  const { records, reminders } = componentHistory(state, component.id);
  const current = activeRecords(records);
  const parent = byId.get(component.parent);
  const guides = guide(component.system);
  const badge = status => '<span class="vehicle-status"><i data-condition="' + status + '"></i>' + statuses[status][0] + '</span>';
  const row = r => '<li><button class="text-button" data-open-record="' + e(r.id) + '">' +
    e(r.title) + (r.photoId ? ' · Foto' : '') + '</button><small>' + formatDate(r.date) +
    (r.deadline ? ' · Prazo ' + formatDate(r.deadline) : '') +
    (r.cost ? ' · ' + Number(r.cost).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : '') + '</small></li>';
  const list = (title, items) => '<details open><summary>' + title + ' (' + items.length + ')</summary>' +
    (items.length ? '<ul>' + items.map(row).join('') + '</ul>' : '<p>Nenhum registro.</p>') + '</details>';
  panel.innerHTML = '<div class="vehicle-detail-head"><div><small>' + e(parent?.name || modes[component.mode]) + ' · ' + e(component.system) +
    '</small><h2>' + e(component.name) + '</h2></div><button type="button" class="button secondary" data-vehicle-dismiss aria-label="Fechar detalhes">×</button></div>' +
    badge(status) + (component.optional ? '<p class="vehicle-note">Presença a confirmar no veículo. Representação ilustrativa.</p>' : '') +
    '<div class="vehicle-actions">' + Object.entries(actions).map(([kind,[label]]) =>
      '<button type="button" class="button secondary" data-vehicle-action="' + kind + '">' + label + '</button>').join('') +
    '<button type="button" class="button secondary" data-vehicle-action="history">Consultar histórico</button></div>' +
    list('Problemas ativos', current.filter(r => r.status === 'reprovado')) +
    list('Tarefas pendentes', current.filter(r => ['pendente','inconclusivo'].includes(r.status))) +
    list('Manutenção planejada', current.filter(r => r.status === 'agendado')) +
    '<details open><summary>Lembretes (' + reminders.length + ')</summary>' + (reminders.length ? '<ul>' + reminders.map(r =>
      '<li>' + e(r.title) + '<small>' + [r.date && formatDate(r.date), r.odometer && e(r.odometer) + ' km', e(r.note)].filter(Boolean).join(' · ') +
      '</small></li>').join('') + '</ul>' : '<p>Nenhum lembrete.</p>') + '</details>' +
    list('Inspeções', records.filter(r => r.kind === 'inspecao')) +
    list('Serviços realizados', records.filter(r => r.kind === 'servico')) +
    list('Fotos associadas', records.filter(r => r.photoId)) +
    '<details id="vehicle-history"><summary>Histórico completo (' + records.length + ')</summary>' +
    (records.length ? '<ul>' + records.map(row).join('') + '</ul>' : '<p>Nenhum registro para esta peça.</p>') + '</details>' +
    '<details><summary>Orientação de inspeção</summary>' +
    (guides.length ? guides.map(g => '<p><strong>' + e(g.title) + '</strong><br>' + e(g.detail) + '<br>' + e(g.caution) + '</p>').join('') :
      '<p>Documente a condição visível com o carro parado e compare com o manual ou com a avaliação da oficina antes de desmontar a peça.</p>') + '</details>';
}
