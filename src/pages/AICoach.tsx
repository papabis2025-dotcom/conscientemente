
import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Subject } from '../types';

interface AICoachProps {
  onImportPlan: (aiSubjects: any[]) => void;
}

const AICoach: React.FC<AICoachProps> = ({ onImportPlan }) => {
  const [examName, setExamName] = useState('');
  const [topicToExplain, setTopicToExplain] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPlan, setSuggestedPlan] = useState<any[]>([]);

  const handleGeneratePlan = async () => {
    if (!examName) return;
    setIsLoading(true);
    const plan = await geminiService.generateStudyPlan(examName);
    setSuggestedPlan(plan);
    setIsLoading(false);
  };

  const handleExplain = async () => {
    if (!topicToExplain) return;
    setIsLoading(true);
    const text = await geminiService.explainTopic(topicToExplain, "Geral");
    setExplanation(text);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Seu Mentor de IA Pessoal 🤖</h2>
        <p className="text-slate-500 dark:text-slate-400">Crie planos de estudo personalizados ou tire dúvidas complexas em segundos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Planejador de Edital */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📅</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gerador de Ciclo</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Diga o nome do concurso e a IA criará uma estrutura de disciplinas.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: Receita Federal, TJ-SP, INSS..."
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
            <button
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Gerando...' : 'Criar Plano'}
            </button>
          </div>

          {suggestedPlan.length > 0 && (
            <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-300">Sugestão de Estudo:</h4>
              {suggestedPlan.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">{item.subjectName}</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 mt-2 list-disc list-inside space-y-1">
                    {item.topics.map((t: string, i: number) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              ))}
              <button
                onClick={() => {
                  const mapped = suggestedPlan.map((s, i) => ({
                    id: `ai-${crypto.randomUUID()}`,
                    name: s.subjectName,
                    color: 'bg-blue-500',
                    topics: s.topics.map((t: string, j: number) => ({
                      id: `ai-t-${crypto.randomUUID()}`,
                      title: t,
                      isCompleted: false,
                      priority: 'Alta'
                    }))
                  }));
                  onImportPlan(mapped);
                  setSuggestedPlan([]);
                  setExamName('');
                  alert('Disciplinas importadas com sucesso!');
                }}
                className="w-full py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                Importar estas disciplinas
              </button>
            </div>
          )}
        </div>

        {/* Explicador de Tópicos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💡</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Dúvida Rápida</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Peça uma explicação simplificada de qualquer assunto acadêmico.</p>
          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="Ex: Me explique o princípio da insignificância no Direito Penal..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
              value={topicToExplain}
              onChange={(e) => setTopicToExplain(e.target.value)}
            />
            <button
              onClick={handleExplain}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
            >
              {isLoading ? 'Explicando...' : 'Pedir Explicação'}
            </button>
          </div>

          {explanation && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl animate-in fade-in overflow-y-auto max-h-64">
              <div className="prose prose-sm prose-purple dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                  {explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICoach;
