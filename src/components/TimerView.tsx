
import React, { useState, useEffect } from 'react';

const TimerView: React.FC = () => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'study' | 'break'>('study');

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setSeconds(mode === 'study' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Foco Total</h2>
        <p className="text-zinc-500 dark:text-zinc-400">A técnica Pomodoro ajuda na concentração.</p>
      </div>

      <div className="flex gap-4 p-1 bg-zinc-200 dark:bg-zinc-800 rounded-2xl transition-colors">
        <button 
          onClick={() => { setMode('study'); setSeconds(25*60); setIsActive(false); }}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'study' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
        >
          Estudo (25m)
        </button>
        <button 
          onClick={() => { setMode('break'); setSeconds(5*60); setIsActive(false); }}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'break' ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
        >
          Pausa (5m)
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="w-80 h-80 rounded-full border-8 border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
          <span className="text-7xl font-mono font-bold text-zinc-800 dark:text-white tabular-nums">{formatTime(seconds)}</span>
        </div>
        <svg className="absolute w-80 h-80 -rotate-90">
          <circle cx="160" cy="160" r="152" fill="transparent" stroke={mode === 'study' ? '#2563eb' : '#10b981'} strokeWidth="8" strokeDasharray={2 * Math.PI * 152} strokeDashoffset={2 * Math.PI * 152 * (1 - seconds / (mode === 'study' ? 25*60 : 5*60))} className="transition-all duration-1000 ease-linear" />
        </svg>
      </div>

      <div className="flex gap-4">
        <button onClick={resetTimer} className="px-8 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">Resetar</button>
        <button onClick={toggleTimer} className={`px-12 py-3 font-bold rounded-2xl text-white shadow-lg transition-all transform active:scale-95 ${isActive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600'}`}>
          {isActive ? 'Pausar' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
};

export default TimerView;
