import { isReviewTask, type ScheduledStudy } from '../types.ts';

export function isMissingOptionalScheduleColumn(error: any) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || error.details || '').toLowerCase();
  return code === '42703' || code === 'PGRST204' ||
    (message.includes('column') && (
      message.includes('questions_link') || message.includes('status') || message.includes('schema cache')
    ));
}

export function isPendingGeneratedStudy(study: ScheduledStudy, concursoId: string, subjectIds: ReadonlySet<string>) {
  return study.generatedByCronograma === true && study.status !== 'realizado' && !isReviewTask(study) &&
    (study.concursoId ? study.concursoId === concursoId : subjectIds.has(study.subjectId));
}

export function isScheduledStudyVisible(
  study: ScheduledStudy,
  deletedIds: ReadonlySet<string>,
  isScheduleEnabled: (concursoId: string) => boolean
) {
  if (study.status === 'realizado' || isReviewTask(study)) return true;
  if (deletedIds.has(study.id)) return false;
  return !study.generatedByCronograma || !study.concursoId || isScheduleEnabled(study.concursoId);
}

export function isAutomaticReview(study: ScheduledStudy) {
  const type = study.activityType?.toLowerCase() || '';
  return !type.includes('aulão de revisão') && /revis[ãa]o/.test(type) &&
    Boolean(study.id.split('-')[3]?.startsWith('400') || study.notes?.includes('[groupId:rev_'));
}

interface AgendaStudyOptions {
  localStudies: readonly ScheduledStudy[];
  sessionIds: ReadonlySet<string>;
  deletedIds: ReadonlySet<string>;
  getConcursoId: (subjectId: string) => string | undefined;
  isScheduleEnabled: (concursoId: string) => boolean;
  areReviewsEnabled: (concursoId: string) => boolean;
}

export function getAgendaScheduledStudies(scheduled: readonly ScheduledStudy[], options: AgendaStudyOptions) {
  const localById = new Map(options.localStudies.map(study => [study.id, study]));
  const visibleStudies: ScheduledStudy[] = [];
  for (const study of scheduled) {
    if (options.deletedIds.has(study.id)) continue;
    const local = localById.get(study.id);
    const concursoId = study.concursoId || local?.concursoId || options.getConcursoId(study.subjectId);
    const status = options.sessionIds.has(study.id) || study.status === 'realizado' || local?.status === 'realizado'
      ? 'realizado'
      : 'planejado';
    if (status === 'realizado' && study.activityType === 'Simulado') continue;
    if (status === 'planejado' && concursoId && isAutomaticReview(study) && !options.areReviewsEnabled(concursoId)) continue;
    const resolved: ScheduledStudy = {
      ...study,
      status,
      concursoId,
      generatedByCronograma: study.generatedByCronograma ?? local?.generatedByCronograma
    };
    if (isScheduledStudyVisible(resolved, options.deletedIds, options.isScheduleEnabled)) visibleStudies.push(resolved);
  }
  return visibleStudies;
}

export function createSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(save: () => Promise<T>): Promise<T> => {
    const result = tail.then(save);
    tail = result.catch(() => undefined);
    return result;
  };
}

export async function confirmConcursoDeletion(
  deletedRows: readonly { id: string }[] | null,
  findRemaining: () => Promise<{ id: string } | null>
) {
  if (deletedRows?.length) return;
  if (await findRemaining()) throw new Error('O Supabase não permitiu excluir este edital.');
}
