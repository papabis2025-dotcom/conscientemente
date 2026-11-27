import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmConcursoDeletion, createSaveQueue, isPendingGeneratedStudy } from '../src/modules/estudos/utils/persistence.ts';
import type { ScheduledStudy } from '../src/modules/estudos/types.ts';

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
