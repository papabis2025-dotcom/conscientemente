import { supabase } from './supabase';

export interface StudyPlanSubject {
  subjectName: string;
  topics: string[];
}

export interface SimuladoSubject {
  id: string;
  name: string;
}

export interface ParsedSimuladoResult {
  subjectId: string | null;
  subjectNameDetected: string;
  done: number;
  correct: number;
}

export interface ParsedSimulado {
  name: string | null;
  date: string | null;
  results: ParsedSimuladoResult[];
}

type GeminiAction =
  | 'generateStudyPlan'
  | 'parseEditalPdf'
  | 'explainTopic'
  | 'parseSimuladoImage';

interface GeminiFunctionResponse<T> {
  result?: T;
  error?: string;
}

const invokeGemini = async <T>(action: GeminiAction, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<GeminiFunctionResponse<T>>('gemini', {
    body: { action, payload }
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível acessar o serviço de IA.');
  }

  if (!data || data.error || data.result === undefined) {
    throw new Error(data?.error || 'O serviço de IA retornou uma resposta inválida.');
  }

  return data.result;
};

export const geminiService = {
  async generateStudyPlan(examName: string): Promise<StudyPlanSubject[]> {
    try {
      return await invokeGemini<StudyPlanSubject[]>('generateStudyPlan', { examName });
    } catch (error) {
      console.error('Falha ao gerar plano de estudos', error);
      return [];
    }
  },

  async parseEditalPdf(base64Data: string): Promise<StudyPlanSubject[]> {
    try {
      return await invokeGemini<StudyPlanSubject[]>('parseEditalPdf', { base64Data });
    } catch (error) {
      console.error('Erro ao processar PDF', error);
      return [];
    }
  },

  async explainTopic(topic: string, subject: string): Promise<string> {
    try {
      return await invokeGemini<string>('explainTopic', { topic, subject });
    } catch (error) {
      console.error('Erro ao explicar tópico', error);
      return 'Erro ao conectar com o mentor de IA.';
    }
  },

  async parseSimuladoImage(
    base64Data: string,
    mimeType: string,
    subjectsList: SimuladoSubject[]
  ): Promise<ParsedSimulado> {
    try {
      return await invokeGemini<ParsedSimulado>('parseSimuladoImage', {
        base64Data,
        mimeType,
        subjectsList
      });
    } catch (error) {
      console.error('Erro ao analisar imagem de simulado', error);
      return { name: null, date: null, results: [] };
    }
  }
};
