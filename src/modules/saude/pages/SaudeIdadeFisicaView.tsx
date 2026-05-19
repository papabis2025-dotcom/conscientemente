import React, { useState } from 'react';
import { HeartPulse, Check, RefreshCw, Trophy, ShieldAlert, Sparkles, Brain, Flame, Bed, Activity } from 'lucide-react';

export const SaudeIdadeFisicaView: React.FC = () => {
  const [chronologicalAge, setChronologicalAge] = useState<number>(30);
  const [gender, setGender] = useState<'masculino' | 'feminino'>('masculino');
  const [restingHeartRate, setRestingHeartRate] = useState<number>(70);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [dietQuality, setDietQuality] = useState<number>(3);
  const [plankTime, setPlankTime] = useState<number>(60);
  
  const [isCalculated, setIsCalculated] = useState(false);
  const [physicalAge, setPhysicalAge] = useState<number>(30);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    let ageAdjustment = 0;

    // 1. Resting Heart Rate (Frequência Cardíaca de Repouso)
    if (restingHeartRate <= 50) {
      ageAdjustment -= 3;
    } else if (restingHeartRate <= 60) {
      ageAdjustment -= 1.5;
    } else if (restingHeartRate <= 70) {
      ageAdjustment += 0;
    } else if (restingHeartRate <= 80) {
      ageAdjustment += 1.5;
    } else {
      ageAdjustment += 3.5;
    }

    // 2. Frequência de Treinos
    if (workoutsPerWeek === 0) {
      ageAdjustment += 3;
    } else if (workoutsPerWeek <= 2) {
      ageAdjustment += 0.5;
    } else if (workoutsPerWeek <= 4) {
      ageAdjustment -= 2;
    } else {
      ageAdjustment -= 3.5;
    }

    // 3. Horas de Sono
    if (sleepHours >= 7 && sleepHours <= 8) {
      ageAdjustment -= 1;
    } else if (sleepHours === 6 || sleepHours === 9) {
      ageAdjustment += 0.5;
    } else {
      ageAdjustment += 2;
    }

    // 4. Qualidade da Alimentação
    if (dietQuality === 5) {
      ageAdjustment -= 1.5;
    } else if (dietQuality === 4) {
      ageAdjustment -= 0.5;
    } else if (dietQuality === 3) {
      ageAdjustment += 0;
    } else if (dietQuality === 2) {
      ageAdjustment += 1;
    } else {
      ageAdjustment += 2.5;
    }

    // 5. Teste de Força (Prancha)
    if (plankTime >= 120) {
      ageAdjustment -= 2;
    } else if (plankTime >= 60) {
      ageAdjustment -= 1;
    } else if (plankTime >= 30) {
      ageAdjustment += 0;
    } else {
      ageAdjustment += 1.5;
    }

    // Calcular idade física final (mínimo de 18 anos)
    const calculatedAge = Math.max(18, Math.round(chronologicalAge + ageAdjustment));
    setPhysicalAge(calculatedAge);
    setIsCalculated(true);
  };

  const handleReset = () => {
    setIsCalculated(false);
  };

  const ageDiff = chronologicalAge - physicalAge;
  const isYounger = ageDiff > 0;
  const isOlder = ageDiff < 0;

  // Dicas de Saúde customizadas baseadas nos inputs do usuário
  const getTips = () => {
    const tips: { icon: React.ReactNode; text: string; category: string }[] = [];

    if (restingHeartRate > 70) {
      tips.push({
        icon: <Flame className="text-rose-500" size={16} />,
        category: 'Cardio',
        text: 'Aumente o foco em treinos cardiovasculares (corrida, pedalada ou natação) para melhorar a eficiência cardíaca e baixar seus batimentos de repouso.'
      });
    }
    if (workoutsPerWeek < 3) {
      tips.push({
        icon: <Activity className="text-cyan-500" size={16} />,
        category: 'Consistência',
        text: 'Tente se exercitar pelo menos 3 vezes na semana. A consistência é o principal pilar para rejuvenescer seu metabolismo.'
      });
    }
    if (plankTime < 60) {
      tips.push({
        icon: <Trophy className="text-amber-500" size={16} />,
        category: 'Força Core',
        text: 'Fortaleça sua musculatura estabilizadora (core) com treinos de prancha abdominal de 2 a 3 vezes na semana para melhorar a postura e resistência física.'
      });
    }
    if (sleepHours < 7) {
      tips.push({
        icon: <Bed className="text-indigo-500" size={16} />,
        category: 'Sono/Recuperação',
        text: 'Priorize dormir de 7 a 8 horas por noite. A regeneração muscular e regulação hormonal ocorrem principalmente durante o sono profundo.'
      });
    }
    if (dietQuality < 4) {
      tips.push({
        icon: <Brain className="text-emerald-500" size={16} />,
        category: 'Nutrição',
        text: 'Aumente a ingestão de alimentos naturais e diminua ultraprocessados. Uma alimentação rica em micronutrientes combate o estresse oxidativo e o envelhecimento celular.'
      });
    }

    // Se tudo estiver ótimo, dar parabéns e dicas avançadas
    if (tips.length === 0) {
      tips.push({
        icon: <Sparkles className="text-violet-500" size={16} />,
        category: 'Excelente!',
        text: 'Seus hábitos de saúde e nível físico estão excelentes! Continue assim e experimente adicionar treinos de alta intensidade (HIIT) para otimizar ainda mais o VO2 máximo.'
      });
    }

    return tips;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6 shrink-0">
        <h2 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
          <HeartPulse className="text-cyan-500" size={20} />
          Calculadora de Idade Física
        </h2>
        <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1 font-medium">Descubra se seu corpo funciona de forma mais jovem ou mais velha que sua idade cronológica real.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {!isCalculated ? (
          <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
            
            {/* Esquerda: Inputs Básicos */}
            <div className="space-y-6">
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Dados Básicos</h3>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Idade Cronológica</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{chronologicalAge} anos</span>
                  </div>
                  <input 
                    type="range" 
                    min="18" 
                    max="90" 
                    value={chronologicalAge}
                    onChange={(e) => setChronologicalAge(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">Sexo Biológico</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('masculino')}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${gender === 'masculino' ? 'bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-500/10' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400'}`}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('feminino')}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${gender === 'feminino' ? 'bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-500/10' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400'}`}
                    >
                      Feminino
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Cardiovascular & Treino</h3>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Batimentos Cardíacos de Repouso (FCR)</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{restingHeartRate} bpm</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="100" 
                    value={restingHeartRate}
                    onChange={(e) => setRestingHeartRate(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mt-1">
                    <span>Atleta (&lt;50)</span>
                    <span>Normal (60-80)</span>
                    <span>Elevado (&gt;80)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Frequência de Treinos Semanais</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{workoutsPerWeek} {workoutsPerWeek === 1 ? 'dia' : 'dias'}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="7" 
                    value={workoutsPerWeek}
                    onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Direita: Hábitos & Teste de Força */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Estilo de Vida & Força</h3>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Horas de Sono por Noite</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{sleepHours} horas</span>
                  </div>
                  <input 
                    type="range" 
                    min="4" 
                    max="10" 
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Qualidade da Alimentação</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">Nível {dietQuality}/5</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={dietQuality}
                    onChange={(e) => setDietQuality(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mt-1">
                    <span>Pouco Saudável</span>
                    <span>Equilibrada</span>
                    <span>Excelente</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Teste da Prancha Isométrica</label>
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{plankTime} segundos</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="180" 
                    step="5"
                    value={plankTime}
                    onChange={(e) => setPlankTime(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mt-1">
                    <span>Iniciante (&lt;30s)</span>
                    <span>Moderado (60s)</span>
                    <span>Avançado (&gt;120s)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all transform active:scale-[0.98]"
              >
                Calcular Idade Física
              </button>
            </div>
          </form>
        ) : (
          /* RESULTADOS SCREEN */
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              
              {/* Circular Gauge */}
              <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950/60 rounded-3xl border border-zinc-150 dark:border-zinc-800/80">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  {/* Background progress ring */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      className="stroke-zinc-200 dark:stroke-zinc-850" 
                      strokeWidth="10" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      className="stroke-cyan-500" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * Math.min(100, Math.max(0, 100 - (physicalAge / chronologicalAge) * 30))) / 100}
                    />
                  </svg>
                  
                  {/* Center Text */}
                  <div className="text-center">
                    <span className="text-5xl font-black text-zinc-900 dark:text-white leading-none">{physicalAge}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block mt-1">Anos</span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Sua Idade Cronológica: {chronologicalAge} anos</p>
                </div>
              </div>

              {/* Message Details */}
              <div className="md:col-span-3 space-y-4">
                <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  isYounger 
                    ? 'bg-emerald-50/55 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-900/30' 
                    : isOlder
                      ? 'bg-rose-50/55 dark:bg-rose-950/10 border-rose-250 dark:border-rose-900/30'
                      : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
                }`}>
                  <span className="text-2xl mt-0.5">
                    {isYounger ? '🎉' : isOlder ? '⚠️' : '🤝'}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
                      {isYounger 
                        ? 'Seu corpo está rejuvenescido!' 
                        : isOlder 
                          ? 'Seu corpo precisa de mais atenção.' 
                          : 'Seu corpo está em equilíbrio perfeito!'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed font-semibold">
                      {isYounger && `Sua idade física é de ${physicalAge} anos. Isso significa que seu condicionamento e hábitos saudáveis deixam seu organismo ${ageDiff} ${ageDiff === 1 ? 'ano' : 'anos'} mais jovem que a sua idade cronológica real!`}
                      {isOlder && `Sua idade física é de ${physicalAge} anos. Seu organismo está operando ${Math.abs(ageDiff)} ${Math.abs(ageDiff) === 1 ? 'ano' : 'anos'} acima de sua idade real. Focar em melhorias cardiovasculares e de estilo de vida trará enormes benefícios.`}
                      {!isYounger && !isOlder && `Sua idade física é igual à sua idade cronológica. Você está em harmonia com seu tempo biológico, continue mantendo sua rotina ativa!`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleReset} 
                    className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} /> Refazer Teste
                  </button>
                </div>
              </div>

            </div>

            {/* Recommendations / Tips Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Recomendações Personalizadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getTips().map((tip, idx) => (
                  <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800 flex gap-3 items-start hover:shadow-sm transition-all duration-200">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                      {tip.icon}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">{tip.category}</span>
                      <p className="text-xs text-zinc-650 dark:text-zinc-400 mt-1 font-semibold leading-relaxed">{tip.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
