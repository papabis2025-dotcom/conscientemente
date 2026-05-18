import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_GENAI_KEY || ''; // Use Vite env var
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
  }
};
