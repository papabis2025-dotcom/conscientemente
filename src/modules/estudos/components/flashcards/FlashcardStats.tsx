import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface FlashcardStatsProps {
  statsSummary: {
    reviewedToday: number;
    streak: number;
    retentionRate: number;
    totalCards: number;
    newCount: number;
    learningCount: number;
    reviewCount: number;
    suspendedCount: number;
  };
  forecast: { date: string; count: number }[];
  heatmapData: Record<string, number>;
}

export const FlashcardStats: React.FC<FlashcardStatsProps> = ({
  statsSummary,
  forecast,
  heatmapData
}) => {
  // Dados do gráfico de pizza de distribuição
  const distributionData = [
    { name: 'Novos', value: statsSummary.newCount, color: '#3b82f6' },
    { name: 'Aprendendo', value: statsSummary.learningCount, color: '#f59e0b' },
    { name: 'Revisão', value: statsSummary.reviewCount, color: '#10b981' },
    { name: 'Suspensos', value: statsSummary.suspendedCount, color: '#71717a' },
  ].filter(d => d.value > 0);

  // Formatar forecast para os próximos 14 dias
  const formattedForecast = useMemo(() => {
    return forecast.slice(0, 14).map(item => {
      const parts = item.date.split('-');
      const dayMonth = `${parts[2]}/${parts[1]}`;
      return {
        dia: dayMonth,
        cartoes: item.count
      };
    });
  }, [forecast]);

  // Preparar os últimos 90 dias para o Heatmap compacto
  const heatmapDays = useMemo(() => {
    const days: { dateStr: string; displayDate: string; count: number }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = heatmapData[dateStr] || 0;
      days.push({
        dateStr,
        displayDate: d.toLocaleDateString('pt-BR'),
        count
      });
    }
    return days;
  }, [heatmapData]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/80';
    if (count <= 5) return 'bg-indigo-200 dark:bg-indigo-950/80';
    if (count <= 15) return 'bg-indigo-400 dark:bg-indigo-700';
    if (count <= 30) return 'bg-indigo-500 dark:bg-indigo-600';
    return 'bg-indigo-600 dark:bg-indigo-400';
  };

  return (
    <div className="space-y-6">
      {/* 4 CARDS DE MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* CARD 1 - STREAK */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider mb-1">
            Sequência
          </span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
            {statsSummary.streak} {statsSummary.streak === 1 ? 'dia' : 'dias'}
          </div>
          <span className="text-[10px] text-zinc-400">Dias seguidos de estudo</span>
        </div>

        {/* CARD 2 - RETENÇÃO */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-500 block tracking-wider mb-1">
            Taxa de Retenção
          </span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
            {statsSummary.retentionRate}%
          </div>
          <span className="text-[10px] text-zinc-400">Precisão média (30 dias)</span>
        </div>

        {/* CARD 3 - REVISADOS HOJE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black uppercase text-indigo-500 block tracking-wider mb-1">
            Revisados Hoje
          </span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
            {statsSummary.reviewedToday}
          </div>
          <span className="text-[10px] text-zinc-400">Cartões praticados</span>
        </div>

        {/* CARD 4 - TOTAL NO BANCO */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black uppercase text-blue-500 block tracking-wider mb-1">
            Total de Cartões
          </span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
            {statsSummary.totalCards}
          </div>
          <span className="text-[10px] text-zinc-400">Na sua coleção</span>
        </div>
      </div>

      {/* HEATMAP DE ATIVIDADE (ÚLTIMOS 90 DIAS) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">
            Histórico de Revisões
          </h3>
          <p className="text-xs text-zinc-400">Intensidade diária de repetição espaçada</p>
        </div>

        {/* GRADE DO HEATMAP */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl">
            {heatmapDays.map(d => (
              <div
                key={d.dateStr}
                className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 cursor-pointer ${getHeatmapColor(d.count)}`}
                title={`${d.displayDate}: ${d.count} revisões`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end text-[10px] font-bold text-zinc-400">
          <span>Menos</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200 dark:bg-indigo-950" />
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400 dark:bg-indigo-700" />
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-500" />
          <span>Mais</span>
        </div>
      </div>

      {/* GRÁFICOS: FORECAST (CARGA FUTURA) E DISTRIBUIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 1 - PREVISÃO DE CARGA (FORECAST 14 DIAS) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Previsão de Revisões (Próximos 14 Dias)
            </h3>
            <p className="text-xs text-zinc-400">Quantidade de cartões previstos para vencer</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="dia" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="cartoes" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2 - DISTRIBUIÇÃO DOS CARTÕES */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-1">
              Distribuição da Memória
            </h3>
            <p className="text-xs text-zinc-400">Status dos cartões no algoritmo FSRS</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                >
                  {distributionData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-blue-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Novos: {statsSummary.newCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Aprendendo: {statsSummary.learningCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Revisão: {statsSummary.reviewCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>Suspensos: {statsSummary.suspendedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
