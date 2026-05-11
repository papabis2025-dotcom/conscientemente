
export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  password?: string;
  avatar: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  updated_at?: string;
}

export interface Concurso {
  id: string;
  name: string;
  banca: string;
  startDate: string; // ISO date string
  targetDate?: string; // ISO date string
  subjects: Subject[];
  categoryId?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  questionsGoal?: number;  // Previsto no Edital
  weight?: number;          // Peso Total
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: 'Baixa' | 'Média' | 'Alta';
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId?: string;
  durationInMinutes: number;
  date: string;
  questionsDone?: number;
  questionsCorrect?: number;
  isSimulado?: boolean;
  activityType?: ActivityType;
}

export interface SimuladoSubjectResult {
  subjectId: string;
  done: number;
  correct: number;
}

export interface Simulado {
  id: string;
  name: string;
  date: string;
  totalQuestions: number;
  results: SimuladoSubjectResult[];
}

export type ActivityType = 'Questões' | 'Leitura' | 'Aula' | 'Simulado';

export interface ScheduledStudy {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  topicId?: string;
  activityType?: ActivityType;
  notes?: string;
  durationInMinutes?: number;
  questionsDone?: number;
  questionsCorrect?: number;
  status?: 'planejado' | 'realizado';
}

export interface DailyGoal {
  date: string; // YYYY-MM-DD
  questionsTarget: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface UserProgress {
  weeklyGoalMinutes: number;
  currentStreak: number;
}
