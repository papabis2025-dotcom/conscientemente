import type { Concurso, ExamPhase, PhaseWeighting, Subject } from '../types.ts';

export const EXAM_PHASES = ['objective', 'written', 'oral'] as const;
export const PHASE_LABELS: Record<ExamPhase, string> = {
  objective: 'Objetiva', written: 'Dissertativa', oral: 'Oral'
};

export const DEFAULT_PHASE_WEIGHTING: PhaseWeighting = {
  mode: 'manual',
  phases: {
    objective: { share: 50, basis: 'equal' },
    written: { share: 30, basis: 'equal' },
    oral: { share: 20, basis: 'equal' },
  },
};

export interface CalculatedWeight {
  percentage: number;
  relativeWeight: number;
  contributions: Record<ExamPhase, number>;
}

export function calculatePhaseWeights(weighting: PhaseWeighting | undefined, subjects: Subject[]) {
  const weights = new Map<string, CalculatedWeight>();
  const errors: string[] = [];
  if (!weighting) return { weights, errors };

  const phases = weighting.phases;
  if ((weighting.mode !== 'phases' && weighting.mode !== 'manual') || EXAM_PHASES.some(phase => {
    const rule = phases?.[phase];
    return !rule || !Number.isFinite(rule.share) || rule.share < 0 || rule.share > 100 ||
      !(rule.basis === 'equal' || rule.basis === 'points' || (phase === 'objective' && rule.basis === 'questions'));
  })) {
    return { weights, errors: ['Confira os percentuais e os critérios de cada fase.'] };
  }
  if (weighting.mode === 'manual') return { weights, errors };

  const sharesTotal = EXAM_PHASES.reduce((total, phase) => total + phases[phase].share, 0);
  if (Math.abs(sharesTotal - 100) > 0.000001) errors.push('Os percentuais das fases precisam somar 100%.');
  if (new Set(subjects.map(subject => subject.id)).size !== subjects.length) {
    errors.push('Há disciplinas com identificadores duplicados.');
  }

  for (const subject of subjects) {
    weights.set(subject.id, { percentage: 0, relativeWeight: 0, contributions: { objective: 0, written: 0, oral: 0 } });
  }

  for (const phase of EXAM_PHASES) {
    const { share, basis } = phases[phase];
    if (share === 0) continue;
    const participants = subjects.filter(subject => {
      const entry = subject.examPhases?.[phase];
      return entry && typeof entry === 'object' && !Array.isArray(entry);
    });
    if (!participants.length) {
      errors.push(`Marque pelo menos uma disciplina na fase ${PHASE_LABELS[phase]}.`);
      continue;
    }
    const units = participants.map(subject => {
      if (basis === 'points') return subject.examPhases?.[phase]?.points ?? 0;
      if (basis === 'questions') return subject.questionsGoal ?? 0;
      return 1;
    });
    const total = units.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || units.some(value => !Number.isFinite(value) || value <= 0 || (basis === 'questions' && !Number.isInteger(value)))) {
      errors.push(`Preencha ${basis === 'questions' ? 'as questões previstas' : 'os pontos'} de todas as disciplinas da fase ${PHASE_LABELS[phase]}.`);
      continue;
    }
    participants.forEach((subject, index) => {
      const weight = weights.get(subject.id)!;
      const contribution = share * (units[index] / total);
      weight.contributions[phase] = contribution;
      weight.percentage += contribution;
    });
  }

  if (errors.length) return { weights: new Map<string, CalculatedWeight>(), errors };
  const participantCount = [...weights.values()].filter(weight => weight.percentage > 0).length;
  for (const weight of weights.values()) weight.relativeWeight = weight.percentage * participantCount / 100;
  return { weights, errors };
}

export function getSubjectWeight(subject: Subject, calculated?: ReadonlyMap<string, CalculatedWeight>) {
  const manual = subject.weight;
  return calculated?.get(subject.id)?.relativeWeight ??
    (manual !== undefined && Number.isFinite(manual) && manual > 0 ? manual : 1);
}

export function getRankedSubjectWeight(subject: Subject, baseWeight: number, calculated: boolean) {
  if (calculated) return baseWeight;
  const topicWeightsSum = (subject.topics || []).reduce((sum, topic) => sum + (topic.weight || 0), 0);
  return topicWeightsSum > 0 ? Number((baseWeight * topicWeightsSum / 100).toFixed(2)) : baseWeight;
}

export function getCourseWeights(courses: Concurso[]) {
  const weights = new Map<string, CalculatedWeight>();
  for (const course of courses) {
    const result = calculatePhaseWeights(course.phaseWeighting, course.subjects || []);
    for (const [id, weight] of result.weights) {
      weights.set(id, weight);
    }
  }
  return weights;
}
