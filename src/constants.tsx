
import { Category, Concurso } from './types';

export const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-orange-500'
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Geral', color: 'bg-zinc-500' }
];

export const INITIAL_CONCURSOS: Concurso[] = [
  {
    id: 'sample-1',
    name: 'Concurso Exemplo',
    banca: 'Banca Exemplo',
    startDate: new Date().toISOString(),
    subjects: [
      {
        id: 'sub-1',
        name: 'PortuguÃªs',
        color: 'bg-blue-500',
        topics: [
          { id: 't-1', title: 'Ortografia', isCompleted: false, priority: 'Alta' },
          { id: 't-2', title: 'Sintaxe', isCompleted: false, priority: 'MÃ©dia' }
        ]
      },
      {
        id: 'sub-2',
        name: 'MatemÃ¡tica',
        color: 'bg-emerald-500',
        topics: [
          { id: 't-3', title: 'Regra de TrÃªs', isCompleted: false, priority: 'Alta' }
        ]
      }
    ]
  }
];
