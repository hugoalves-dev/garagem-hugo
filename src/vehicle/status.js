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

export function canResolveProblem(resolution, problem) {
  return Boolean(problem?.id && problem.id !== resolution.id && problem.status === 'reprovado' &&
    resolution.status === 'aprovado' && ['inspecao', 'servico'].includes(resolution.kind) &&
    resolution.system === problem.system && (resolution.componentId || '') === (problem.componentId || '') &&
    (resolution.date || '') >= (problem.date || ''));
}

export function problemResolutions(records) {
  const byId = new Map(records.map(record => [record.id, record]));
  const resolved = new Map();
  for (const record of records) {
    if (record.resolvesRecordId && canResolveProblem(record, byId.get(record.resolvesRecordId))) {
      resolved.set(record.resolvesRecordId, record);
    }
  }
  return resolved;
}

export function activeRecords(records) {
  const resolved = problemResolutions(records);
  return records.filter(record => !resolved.has(record.id));
}

export function recordNeedsAttention(record, today) {
  return record.status === 'reprovado' ||
    Boolean(record.status !== 'aprovado' && record.deadline && record.deadline <= today);
}

export function componentStatus(records, reminders, today, odometer) {
  const active = activeRecords(records);
  if (active.some(r => r.status === 'reprovado')) return 'problem';
  if (active.some(r => recordNeedsAttention(r, today)) ||
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
