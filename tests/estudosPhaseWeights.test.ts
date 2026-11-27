import assert from 'node:assert/strict';
import test from 'node:test';
import type { PhaseWeighting, Subject } from '../src/modules/estudos/types.ts';
import { calculatePhaseWeights, getRankedSubjectWeight, getSubjectWeight } from '../src/modules/estudos/utils/phaseWeights.ts';

const configuration: PhaseWeighting = {
  mode: 'phases',
  phases: {
    objective: { share: 50, basis: 'questions' },
    written: { share: 30, basis: 'points' },
    oral: { share: 20, basis: 'points' },
  },
};
const subject = (id: string, fields: Partial<Subject>): Subject => ({ id, name: id, color: '#000000', topics: [], ...fields });
const disciplines = [
  subject('constitucional', { questionsGoal: 20, weight: 7, examPhases: { objective: {}, written: { points: 2 }, oral: { points: 1 } } }),
  subject('objetiva', { questionsGoal: 20, examPhases: { objective: {} } }),
  subject('pratica', { examPhases: { written: { points: 8 }, oral: { points: 4 } } }),
  subject('historico', { weight: 9, examPhases: {} }),
];

test('normaliza cada fase separadamente e combina questões e pontos sem alterar o peso manual', () => {
  const { errors, weights } = calculatePhaseWeights(configuration, disciplines);
  assert.deepEqual(errors, []);
  assert.deepEqual([...weights.values()].map(w => w.percentage), [35, 25, 40, 0]);
  assert.deepEqual(weights.get('constitucional')?.contributions, { objective: 25, written: 6, oral: 4 });
  assert.equal(getSubjectWeight(disciplines[0], weights), 1.05);
  assert.equal(getSubjectWeight(disciplines[3], weights), 0);
  assert.equal(getSubjectWeight(disciplines[0]), 7);
});

test('rejeita fases incompletas, sem participantes e percentuais que não somam 100%', () => {
  const invalid: PhaseWeighting = { ...configuration, phases: { ...configuration.phases, oral: { share: 19, basis: 'points' } } };
  const subjects = [subject('incompleta', { questionsGoal: 3.5, examPhases: { objective: {}, written: {} } })];
  const result = calculatePhaseWeights(invalid, subjects);
  assert.equal(result.weights.size, 0);
  assert.equal(result.errors.length, 4);
  assert.match(result.errors.join(' '), /100%.*questões previstas.*pontos.*Oral/);
});

test('aceita fase com 0% e divide igualmente as fases configuradas por participação', () => {
  const objectiveOnly: PhaseWeighting = {
    mode: 'phases', phases: {
      objective: { share: 100, basis: 'equal' }, written: { share: 0, basis: 'points' }, oral: { share: 0, basis: 'points' },
    },
  };
  const { weights, errors } = calculatePhaseWeights(objectiveOnly, disciplines);
  assert.deepEqual(errors, []);
  assert.deepEqual([...weights.values()].map(w => w.percentage), [50, 50, 0, 0]);
});

test('mudar para manual mantém o peso original e os assuntos não reduzem o peso calculado por fase', () => {
  const manual = calculatePhaseWeights({ ...configuration, mode: 'manual' }, disciplines);
  assert.deepEqual(manual.errors, []);
  assert.equal(manual.weights.size, 0);
  const withTopic = { ...disciplines[0], topics: [{ id: 'topic', title: 'Assunto', isCompleted: false, priority: 'Alta' as const, weight: 25 }] };
  assert.equal(getRankedSubjectWeight(withTopic, getSubjectWeight(withTopic), false), 1.75);
  assert.equal(getRankedSubjectWeight(withTopic, 1.05, true), 1.05);
});

test('configuração e participação sobrevivem a uma exportação e restauração JSON', () => {
  const restored = JSON.parse(JSON.stringify({ phase_weighting: configuration, subjects: disciplines }));
  assert.deepEqual(calculatePhaseWeights(restored.phase_weighting, restored.subjects), calculatePhaseWeights(configuration, disciplines));
  assert.match(calculatePhaseWeights(configuration, [disciplines[0], ...disciplines]).errors[0], /duplicados/);
});
