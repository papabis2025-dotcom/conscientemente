import React, { useState } from 'react';
import { FlashcardSettings } from '../../types/flashcards';
import { showToast } from '../../../../components/Toast';

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

  // Espaçamentos diretos por classificação (apenas dias ou minutos, sem multiplicadores)
  const [againVal, setAgainVal] = useState(settings.again_spacing?.value ?? (settings.again_interval_minutes || 10));
  const [againUnit, setAgainUnit] = useState<'minutes' | 'days'>(settings.again_spacing?.unit ?? 'minutes');

  const [hardVal, setHardVal] = useState(settings.hard_spacing?.value ?? 1);
  const [hardUnit, setHardUnit] = useState<'minutes' | 'days'>(settings.hard_spacing?.unit ?? 'days');

  const [goodVal, setGoodVal] = useState(settings.good_spacing?.value ?? 3);
  const [goodUnit, setGoodUnit] = useState<'minutes' | 'days'>(settings.good_spacing?.unit ?? 'days');

  const [easyVal, setEasyVal] = useState(settings.easy_spacing?.value ?? 7);
  const [easyUnit, setEasyUnit] = useState<'minutes' | 'days'>(settings.easy_spacing?.unit ?? 'days');

  const [maximumIntervalDays, setMaximumIntervalDays] = useState(settings.maximum_interval_days || 36500);

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
        again_spacing: { value: Math.max(1, Number(againVal) || 1), unit: againUnit },
        hard_spacing: { value: Math.max(1, Number(hardVal) || 1), unit: hardUnit },
        good_spacing: { value: Math.max(1, Number(goodVal) || 1), unit: goodUnit },
        easy_spacing: { value: Math.max(1, Number(easyVal) || 1), unit: easyUnit },
        maximum_interval_days: Number(maximumIntervalDays) || 36500,
      });
      setSavedSuccess(true);
      showToast('Preferências de espaçamento salvas e sincronizadas na nuvem!', 'success');
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (e) {
      console.error('Erro ao salvar preferências de flashcards:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Opções de Repetição e Espaçamento
            </h3>
            <p className="text-xs text-zinc-400">Configure o intervalo exato de cada classificação (dias ou minutos)</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SEÇÃO 1: ESPAÇAMENTO DE CADA CLASSIFICAÇÃO */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Espaçamento por Classificação (Dias ou Minutos)
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Defina o tempo direto para cada resposta, sem multiplicadores.</p>
            </div>

            {/* 1. ERREI (AGAIN) */}
            <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  1. Errei / Novamente
                </label>
                <span className="text-xs font-mono font-bold text-rose-500">
                  {againVal} {againUnit === 'minutes' ? 'min' : againVal === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={againUnit === 'minutes' ? 1440 : 365}
                  value={againVal}
                  onChange={e => setAgainVal(Number(e.target.value))}
                  className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAgainUnit('minutes')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      againUnit === 'minutes'
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Minutos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgainUnit('days')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      againUnit === 'days'
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Dias
                  </button>
                </div>
              </div>
            </div>

            {/* 2. DIFÍCIL (HARD) */}
            <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  2. Difícil
                </label>
                <span className="text-xs font-mono font-bold text-amber-500">
                  {hardVal} {hardUnit === 'minutes' ? 'min' : hardVal === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={hardUnit === 'minutes' ? 1440 : 365}
                  value={hardVal}
                  onChange={e => setHardVal(Number(e.target.value))}
                  className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHardUnit('minutes')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      hardUnit === 'minutes'
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Minutos
                  </button>
                  <button
                    type="button"
                    onClick={() => setHardUnit('days')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      hardUnit === 'days'
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Dias
                  </button>
                </div>
              </div>
            </div>

            {/* 3. BOM (GOOD) */}
            <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  3. Bom
                </label>
                <span className="text-xs font-mono font-bold text-indigo-500">
                  {goodVal} {goodUnit === 'minutes' ? 'min' : goodVal === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={goodUnit === 'minutes' ? 1440 : 365}
                  value={goodVal}
                  onChange={e => setGoodVal(Number(e.target.value))}
                  className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGoodUnit('minutes')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      goodUnit === 'minutes'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Minutos
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoodUnit('days')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      goodUnit === 'days'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Dias
                  </button>
                </div>
              </div>
            </div>

            {/* 4. FÁCIL (EASY) */}
            <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  4. Fácil
                </label>
                <span className="text-xs font-mono font-bold text-emerald-500">
                  {easyVal} {easyUnit === 'minutes' ? 'min' : easyVal === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={easyUnit === 'minutes' ? 1440 : 365}
                  value={easyVal}
                  onChange={e => setEasyVal(Number(e.target.value))}
                  className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEasyUnit('minutes')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      easyUnit === 'minutes'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Minutos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEasyUnit('days')}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      easyUnit === 'days'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Dias
                  </button>
                </div>
              </div>
            </div>

            {/* INTERVALO MÁXIMO */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Intervalo Máximo Permitido
                </label>
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">{maximumIntervalDays} dias</span>
              </div>
              <input
                type="number"
                min={30}
                max={36500}
                value={maximumIntervalDays}
                onChange={e => setMaximumIntervalDays(Number(e.target.value))}
                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-zinc-400 mt-0.5">Teto máximo em dias para qualquer cartão (ex: 365 dias = 1 ano; 36500 = ilimitado).</p>
            </div>
          </div>

          {/* LIMITES DIÁRIOS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                Novos Cartões / Dia
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={newCardsPerDay}
                onChange={e => setNewCardsPerDay(Number(e.target.value))}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                Máximo Revisões / Dia
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                value={maxReviewsPerDay}
                onChange={e => setMaxReviewsPerDay(Number(e.target.value))}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none"
              />
            </div>
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
              max={97}
              value={requestRetention}
              onChange={e => setRequestRetention(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
              <span>75% (Menos revisões)</span>
              <span>90% (Padrão recomendado)</span>
              <span>97% (Máxima retenção)</span>
            </div>
          </div>

          {/* TOGGLES */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Mostrar previsão de intervalo nos botões (1, 2, 3, 4)
              </span>
              <input
                type="checkbox"
                checked={showNextReviewTime}
                onChange={e => setShowNextReviewTime(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Ativar atalhos rápidos de teclado (Espaço e 1, 2, 3, 4)
              </span>
              <input
                type="checkbox"
                checked={enableKeyboardShortcuts}
                onChange={e => setEnableKeyboardShortcuts(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold uppercase text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Preferências'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
