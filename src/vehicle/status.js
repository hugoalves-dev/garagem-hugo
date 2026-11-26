export const statuses = {
  unknown: ['Condição desconhecida', '#929da9'],
  approved: ['Inspeção aprovada', '#49d498'],
  pending: ['Inspeção ou manutenção pendente', '#f5ce63'],
  scheduled: ['Reparo ou manutenção agendada', '#f79b52'],
  problem: ['Problema ativo', '#fa7779'],
  upgrade: ['Melhoria planejada', '#69b4fc']
};

export function componentHistory(state, id) {
  return {
    records: state.records.filter(r => r.componentId === id),
    reminders: state.reminders.filter(r => r.componentId === id)
  };
}

export function activeRecords(records) {
  // The current form inserts new records at the front. Stable sorting preserves that order on a tie.
  const ordered = [...records].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const resolution = ordered.findIndex(r => r.status === 'aprovado' && ['inspecao', 'servico'].includes(r.kind));
  return resolution < 0 ? ordered : ordered.filter((record, index) =>
    index <= resolution || (record.kind !== 'inspecao' && ['pendente', 'agendado', 'inconclusivo'].includes(record.status)));
}

export function componentStatus(records, reminders, today, odometer) {
  const active = activeRecords(records);
  if (active.some(r => r.status === 'reprovado')) return 'problem';
  if (active.some(r => r.status !== 'aprovado' && r.deadline && r.deadline <= today) ||
      reminders.some(r => (r.date && r.date <= today) || (r.odometer && odometer !== '' && odometer != null && Number(r.odometer) <= Number(odometer)))) return 'pending';
  if (active.some(r => r.status === 'agendado' && r.kind !== 'melhoria') ||
      reminders.some(r => r.date || r.odometer)) return 'scheduled';
  if (active.some(r => r.status !== 'aprovado' && r.kind !== 'melhoria') || reminders.length) return 'pending';
  if (active.some(r => r.status !== 'aprovado' && r.kind === 'melhoria')) return 'upgrade';
  if (active.some(r => r.kind === 'inspecao' && r.status === 'aprovado')) return 'approved';
  return 'unknown';
}

export function statusMap(state, today) {
  return new Map([...new Set([...state.records, ...state.reminders].map(r => r.componentId).filter(Boolean))].map(id => {
    const { records, reminders } = componentHistory(state, id);
    return [id, componentStatus(records, reminders, today, state.odometer)];
  }));
}
