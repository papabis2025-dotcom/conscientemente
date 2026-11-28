import { useEffect, useState } from 'react';

type AgendaModule = 'estudos' | 'tarefas' | 'saude' | 'financas' | 'anotacoes';

export interface AgendaTarget {
  date: string;
  id?: string;
  concursoId?: string;
  studyTab?: 'calendar' | 'concursos';
}

export function openAgendaTarget(module: AgendaModule, target: AgendaTarget) {
  sessionStorage.setItem(`agenda-target:${module}`, JSON.stringify(target));
  window.location.hash = module;
}

export function useAgendaTarget(module: AgendaModule) {
  const key = `agenda-target:${module}`;
  const [target] = useState<AgendaTarget | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    sessionStorage.removeItem(key);
  }, [key]);
  return target;
}
