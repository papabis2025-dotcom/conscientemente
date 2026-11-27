import type { ExamPhase, PhaseBasis, PhaseParticipation, PhaseWeighting, Subject } from '../types';
import { calculatePhaseWeights, DEFAULT_PHASE_WEIGHTING, EXAM_PHASES, PHASE_LABELS } from '../utils/phaseWeights';

interface Props {
  value?: PhaseWeighting;
  subjects: Subject[];
  disabled: boolean;
  onChange: (value: PhaseWeighting) => void;
  onSubjectChange: (id: string, phases: PhaseParticipation) => void;
  onQuestionsChange: (id: string, questions: number | undefined) => void;
}

const inputClass = 'rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';
const percent = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

export default function PhaseWeightsEditor({ value, subjects, disabled, onChange, onSubjectChange, onQuestionsChange }: Props) {
  const weighting = value ?? DEFAULT_PHASE_WEIGHTING;
  const phaseMode = weighting.mode === 'phases';
  const { weights, errors } = calculatePhaseWeights(weighting, subjects);

  const updatePhase = (phase: ExamPhase, patch: Partial<PhaseWeighting['phases'][ExamPhase]>) => {
    onChange({ ...weighting, phases: { ...weighting.phases, [phase]: { ...weighting.phases[phase], ...patch } } });
  };

  const toggleParticipation = (subject: Subject, phase: ExamPhase, checked: boolean) => {
    const phases = { ...subject.examPhases };
    if (checked) phases[phase] = {};
    else delete phases[phase];
    onSubjectChange(subject.id, phases);
  };

  return (
    <details className="mb-5 rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
      <summary className="cursor-pointer font-bold">Fases e pesos <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">{phaseMode ? 'Calculado por fases' : 'Peso manual'}</span></summary>
      <fieldset disabled={disabled} className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={phaseMode} onChange={e => onChange({ ...weighting, mode: e.target.checked ? 'phases' : 'manual' })} />
          Calcular por fases
        </label>
        {phaseMode && (
          <>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">Distribua 100% da importância entre as fases e marque onde cada disciplina é cobrada. O peso manual fica guardado para quando você mudar de modo.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {EXAM_PHASES.map(phase => (
                <div key={phase} className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-sm font-bold">{PHASE_LABELS[phase]}</p>
                  <label className="flex flex-col gap-1 text-xs">Importância (%)
                    <input className={inputClass} type="number" step="any" min="0" max="100" value={weighting.phases[phase].share} onChange={e => updatePhase(phase, { share: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">Distribuição na fase
                    <select className={inputClass} value={weighting.phases[phase].basis} onChange={e => updatePhase(phase, { basis: e.target.value as PhaseBasis })}>
                      <option value="equal">Igual entre disciplinas</option>
                      {phase === 'objective' && <option value="questions">Questões previstas</option>}
                      <option value="points">Pontos ou pesos relativos</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
            {weighting.phases.objective.basis === 'questions' && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Use questões previstas quando elas tiverem o mesmo valor. Se valerem pontos diferentes, escolha pontos ou pesos relativos.</p>
            )}
            {subjects.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th scope="col" className="p-2">Disciplina</th>{EXAM_PHASES.map(phase => <th scope="col" key={phase} className="p-2">{PHASE_LABELS[phase]}</th>)}<th scope="col" className="p-2 text-right">Peso previsto</th></tr></thead>
                  <tbody>
                    {subjects.map(subject => (
                      <tr key={subject.id} className="border-t border-zinc-200 dark:border-zinc-800">
                        <th scope="row" className="p-2 text-left font-medium">{subject.name}</th>
                        {EXAM_PHASES.map(phase => {
                          const participation = subject.examPhases?.[phase];
                          const contribution = weights.get(subject.id)?.contributions[phase];
                          const label = `${subject.name} · ${PHASE_LABELS[phase]}`;
                          return (
                            <td key={phase} className="space-y-1 p-2">
                              <input type="checkbox" aria-label={`Participa de ${label}`} checked={!!participation} onChange={e => toggleParticipation(subject, phase, e.target.checked)} />
                              {participation && weighting.phases[phase].basis === 'points' && (
                                <input className={`${inputClass} block w-20`} type="number" step="any" min="0" placeholder="Pontos" aria-label={`Pontos de ${label}`} value={participation.points ?? ''} onChange={e => onSubjectChange(subject.id, { ...subject.examPhases, [phase]: { points: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                              )}
                              {participation && weighting.phases[phase].basis === 'questions' && (
                                <input className={`${inputClass} block w-20`} type="number" min="1" step="1" placeholder="Questões" aria-label={`Questões previstas de ${subject.name}`} value={subject.questionsGoal ?? ''} onChange={e => onQuestionsChange(subject.id, e.target.value === '' ? undefined : Number(e.target.value))} />
                              )}
                              {!!participation && contribution !== undefined && <span className="block text-xs text-zinc-600 dark:text-zinc-300">{percent(contribution)}</span>}
                            </td>
                          );
                        })}
                        <td className="p-2 text-right tabular-nums">{weights.has(subject.id) ? percent(weights.get(subject.id)!.percentage) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {errors.length > 0 && <ul className="list-disc space-y-1 pl-5 text-xs text-rose-700 dark:text-rose-300">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
            {errors.length === 0 && <p className="text-xs text-zinc-600 dark:text-zinc-300">Disciplinas com peso zero ficam fora de novos estudos automáticos. O histórico e os agendamentos existentes são preservados ao salvar.</p>}
          </>
        )}
      </fieldset>
    </details>
  );
}
