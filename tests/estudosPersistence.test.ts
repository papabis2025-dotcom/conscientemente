import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmConcursoDeletion, createSaveQueue, isMissingOptionalScheduleColumn, isPendingGeneratedStudy, isScheduledStudyVisible } from '../src/modules/estudos/utils/persistence.ts';
import type { ScheduledStudy } from '../src/modules/estudos/types.ts';
import { parseNotesGroup } from '../src/modules/estudos/utils/studyNotes.ts';

test('gravações rápidas chegam à nuvem na mesma ordem das alterações', async () => {
  const queue = createSaveQueue();
  const events: string[] = [];
  let releaseFirst!: () => void;
  const slowNetwork = new Promise<void>(resolve => { releaseFirst = resolve; });
  const first = queue(async () => {
    events.push('primeira iniciada');
    await slowNetwork;
    events.push('primeira gravada');
  });
  const second = queue(async () => { events.push('segunda gravada'); });

  await Promise.resolve();
  assert.deepEqual(events, ['primeira iniciada']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['primeira iniciada', 'primeira gravada', 'segunda gravada']);
});

test('uma falha chega ao chamador e libera a próxima gravação da fila', async () => {
  const queue = createSaveQueue();
  const first = queue(async () => { throw new Error('Rede indisponível'); });
  const second = queue(async () => 'salvo');
  await assert.rejects(first, /Rede indisponível/);
  assert.equal(await second, 'salvo');
});

test('regenerar remove apenas atividades pendentes geradas para o edital selecionado', () => {
  const generated: ScheduledStudy = {
    id: 'generated', date: '2026-11-27', subjectId: 'disciplina', concursoId: 'edital',
    generatedByCronograma: true, status: 'planejado'
  };
  const isReplaced = (updates: Partial<ScheduledStudy>) => isPendingGeneratedStudy({ ...generated, ...updates }, 'edital', new Set(['disciplina']));
  assert.equal(isReplaced({}), true);
  assert.equal(isReplaced({ concursoId: undefined }), true);
  assert.equal(isReplaced({ concursoId: 'outro edital' }), false);
  assert.equal(isReplaced({ generatedByCronograma: undefined }), false);
  assert.equal(isReplaced({ generatedByCronograma: false }), false);
  assert.equal(isReplaced({ status: 'realizado' }), false);
  assert.equal(isReplaced({ activityType: 'Revisão' }), false);
});

test('exclusão confirmada pelo banco dispensa consulta adicional', async () => {
  await confirmConcursoDeletion([{ id: 'edital' }], async () => {
    assert.fail('a exclusão já retornou o registro removido');
  });
});

test('delete sem efeito falha se o edital ainda estiver no banco', async () => {
  await assert.rejects(confirmConcursoDeletion([], async () => ({ id: 'edital' })), /não permitiu excluir/);
});

test('repetir a exclusão depois que o edital já saiu do banco é seguro', async () => {
  await confirmConcursoDeletion([], async () => null);
});

test('reconhece respostas do Postgres e do PostgREST para colunas opcionais ausentes', () => {
  assert.equal(isMissingOptionalScheduleColumn({ code: '42703' }), true);
  assert.equal(isMissingOptionalScheduleColumn({ code: 'PGRST204' }), true);
  assert.equal(isMissingOptionalScheduleColumn({ message: 'column scheduled_studies.status does not exist' }), true);
  assert.equal(isMissingOptionalScheduleColumn({ message: "Could not find the 'questions_link' column in the schema cache" }), true);
  assert.equal(isMissingOptionalScheduleColumn({ code: '42501', message: 'permission denied' }), false);
});

test('a agenda e o cronograma aplicam a mesma visibilidade às atividades por edital', () => {
  const study: ScheduledStudy = {
    id: 'atividade', date: '2026-11-28', subjectId: 'disciplina', concursoId: 'edital',
    generatedByCronograma: true, status: 'planejado'
  };
  const deleted = new Set([study.id]);
  assert.equal(isScheduledStudyVisible(study, new Set(), () => true), true);
  assert.equal(isScheduledStudyVisible(study, new Set(), () => false), false);
  assert.equal(isScheduledStudyVisible(study, deleted, () => true), false);
  assert.equal(isScheduledStudyVisible({ ...study, status: 'realizado' }, deleted, () => false), true);
  assert.equal(isScheduledStudyVisible({ ...study, activityType: 'Revisão' }, deleted, () => false), true);
  assert.equal(isScheduledStudyVisible({ ...study, generatedByCronograma: false }, new Set(), () => false), true);
});

test('o agrupamento de atividades sobrevive aos metadados gravados no Supabase', () => {
  assert.deepEqual(parseNotesGroup('[gen:crono] [cid:edital] [groupId:lote] #ESTUDO - Atividade'), {
    groupId: 'lote', tag: '#ESTUDO', cleanNotes: 'Atividade'
  });
  assert.deepEqual(parseNotesGroup('[groupId:antigo] Atividade'), {
    groupId: 'antigo', tag: null, cleanNotes: 'Atividade'
  });
});
