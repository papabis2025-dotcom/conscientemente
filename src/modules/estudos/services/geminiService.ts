import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GOOGLE_GENAI_KEY || ''; // Use local storage or Vite env var
  if (!apiKey) {
    console.warn("Google GenAI API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const geminiService = {
  async generateStudyPlan(examName: string) {
    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", // Updated to stable model if available, or keep preview
        contents: `Gere um cronograma de estudos estratégico para o concurso "${examName}". Liste as 5 principais disciplinas e 3 tópicos essenciais para cada uma, focando no que mais cai. Retorne estritamente um array JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjectName: { type: Type.STRING },
                topics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["subjectName", "topics"]
            }
          }
        }
      });

      const text = response.text || '[]';
      return JSON.parse(cleanJsonResponse(text));
    } catch (e) {
      console.error("Failed to generate study plan", e);
      return [];
    }
  },

  async parseEditalPdf(base64Data: string) {
    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf"
              }
            },
            {
              text: "Analise este edital e extraia as disciplinas e tópicos. Retorne um array JSON estruturado."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjectName: { type: Type.STRING },
                topics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["subjectName", "topics"]
            }
          }
        }
      });

      const text = response.text || '[]';
      return JSON.parse(cleanJsonResponse(text));
    } catch (e) {
      console.error("Erro ao processar PDF", e);
      return [];
    }
  },

  async explainTopic(topic: string, subject: string) {
    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Explique de forma didática e focada em concursos o tema "${topic}" da disciplina "${subject}". Use bullet points para os conceitos chave e dê um exemplo prático.`,
        config: {
          // thinkingConfig: { thinkingBudget: 0 } // Thinking config is experimental
        }
      });
      return response.text || 'Não foi possível gerar a explicação no momento.';
    } catch (e) {
      console.error("Erro ao explicar tópico", e);
      return "Erro ao conectar com o mentor de IA.";
    }
  },

  async parseSimuladoImage(base64Data: string, mimeType: string, subjectsList: Array<{ id: string; name: string }>) {
    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Analise esta imagem de um simulado ou boletim de desempenho. Ela contém disciplinas (matérias) e a quantidade de questões feitas (total/done) e acertos (corretas/correct).
Extraia os dados de cada disciplina. Você deve tentar mapear o nome da disciplina detectada para uma das seguintes disciplinas existentes no sistema:
${JSON.stringify(subjectsList)}

Retorne um objeto JSON contendo as informações extraídas. Se uma disciplina da imagem não puder ser mapeada diretamente a nenhuma disciplina existente, tente associar à mais semelhante ou retorne null no subjectId.
Se houver uma coluna de acertos (corretas) e questões feitas (total/done), retorne-as.
Se as questões feitas não estiverem explícitas, mas o total de questões da matéria for conhecido ou dedutível, use-o.
Se houver uma nota ou percentual, use-o para calcular/estimar se necessário.

A resposta deve ser ESTRITAMENTE um objeto JSON com o seguinte formato:
{
  "name": "Nome sugerido para o simulado (ou null)",
  "date": "Data identificada no formato YYYY-MM-DD (ou null)",
  "results": [
    {
      "subjectId": "ID da disciplina existente que mais se aproxima (se mapeado, ou null)",
      "subjectNameDetected": "Nome da disciplina como aparece na imagem",
      "done": número de questões resolvidas (total),
      "correct": número de acertos (questões corretas)
    }
  ]
}
`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, nullable: true },
              date: { type: Type.STRING, nullable: true },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subjectId: { type: Type.STRING, nullable: true },
                    subjectNameDetected: { type: Type.STRING },
                    done: { type: Type.INTEGER },
                    correct: { type: Type.INTEGER }
                  },
                  required: ["subjectNameDetected", "done", "correct"]
                }
              }
            },
            required: ["results"]
          }
        }
      });

      const text = response.text || '{"results":[]}';
      return JSON.parse(cleanJsonResponse(text));
    } catch (e) {
      console.error("Erro ao analisar imagem de simulado", e);
      return { results: [] };
    }
  }
};
