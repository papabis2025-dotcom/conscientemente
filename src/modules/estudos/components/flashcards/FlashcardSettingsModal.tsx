import React, { useState } from 'react';
import { FlashcardSettings } from '../../types/flashcards';
import { Settings, X, Save, Sliders, Check } from 'lucide-react';

interface FlashcardSettingsModalProps {
  settings: FlashcardSettings;
  onSave: (newSettings: Partial<FlashcardSettings>) => Promise<void>;
  onClose: () => void;
}

export const FlashcardSettingsModal: React.FC<FlashcardSettingsModalProps> = ({
  settings,
  onSave,
  onClose
}) => {
  const [newCardsPerDay, setNewCardsPerDay] = useState(settings.new_cards_per_day);
  const [maxReviewsPerDay, setMaxReviewsPerDay] = useState(settings.max_reviews_per_day);
  const [requestRetention, setRequestRetention] = useState(Math.round(settings.request_retention * 100));
  const [showNextReviewTime, setShowNextReviewTime] = useState(settings.show_next_review_time);
  const [enableKeyboardShortcuts, setEnableKeyboardShortcuts] = useState(settings.enable_keyboard_shortcuts);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        new_cards_per_day: Number(newCardsPerDay) || 20,
        max_reviews_per_day: Number(maxReviewsPerDay) || 200,
        request_retention: Math.min(0.97, Math.max(0.75, requestRetention / 100)),
        show_next_review_time: showNextReviewTime,
        enable_keyboard_shortcuts: enableKeyboardShortcuts,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (e) {
      console.error('Erro ao salvar preferências de flashcards:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Configurações do Algoritmo
              </h3>
              <p className="text-xs text-zinc-400">Parâmetros de repetição FSRS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NOVOS CARTÕES POR DIA */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Novos Cartões por Dia
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={newCardsPerDay}
              onChange={e => setNewCardsPerDay(Number(e.target.value))}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Limite máximo de cartões inéditos introduzidos na fila diária.</p>
          </div>

          {/* MÁXIMO DE REVISÕES POR DIA */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Máximo de Revisões por Dia
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={maxReviewsPerDay}
              onChange={e => setMaxReviewsPerDay(Number(e.target.value))}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Evita sobrecarga diária mantendo a constância.</p>
          </div>

          {/* RETENÇÃO DESEJADA (FSRS) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Retenção Desejada (FSRS)
              </label>
              <span className="text-xs font-mono font-bold text-indigo-500">{requestRetention}%</span>
            </div>
            <input
              type="range"
              min={75}
              max={95}
              value={requestRetention}
              onChange={e => setRequestRetention(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
              <span>75% (Menos revisões)</span>
              <span>90% (Recomendado)</span>
              <span>95% (Alta precisão)</span>
            </div>
          </div>

          {/* TOGGLES */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Mostrar intervalo nos botões (1, 2, 3, 4)
              </span>
              <input
                type="checkbox"
                checked={showNextReviewTime}
                onChange={e => setShowNextReviewTime(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Ativar atalhos rápidos de teclado
              </span>
              <input
                type="checkbox"
                checked={enableKeyboardShortcuts}
                onChange={e => setEnableKeyboardShortcuts(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? <Check size={16} /> : <Save size={16} />}
              {savedSuccess ? 'Salvo!' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
