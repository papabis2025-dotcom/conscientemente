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
