import { isReviewTask, type ScheduledStudy } from '../types.ts';

export function isPendingGeneratedStudy(study: ScheduledStudy, concursoId: string, subjectIds: ReadonlySet<string>) {
  return study.generatedByCronograma === true && study.status !== 'realizado' && !isReviewTask(study) &&
    (study.concursoId ? study.concursoId === concursoId : subjectIds.has(study.subjectId));
}

export function createSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(save: () => Promise<T>): Promise<T> => {
    const result = tail.then(save);
    tail = result.catch(() => undefined);
    return result;
  };
}
