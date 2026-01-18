import React, { useState } from 'react';

interface TimerWidgetProps {
    timeLeft: number;
    isActive: boolean;
    isAlarmPlaying: boolean;
    onStartTimer: (minutes: number) => void;
    onPauseTimer: () => void;
    onResumeTimer: () => void;
    onResetTimer: () => void;
    onStopAlarm: () => void;
}

const TimerWidget: React.FC<TimerWidgetProps> = ({
    timeLeft, isActive, isAlarmPlaying,
    onStartTimer, onPauseTimer, onResumeTimer, onResetTimer, onStopAlarm
}) => {
    const [inputMinutes, setInputMinutes] = useState(30);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isAlarmPlaying) {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-pulse">
                <span className="text-6xl mb-4">🔔</span>
                <h3 className="text-2xl font-black text-rose-500 uppercase mb-4">Tempo Esgotado!</h3>
                <button
                    onClick={onStopAlarm}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-500/30 transition-all hover:scale-105"
                >
                    Parar Alarme
                </button>
            </div>
        );
    }

    if (isActive || timeLeft > 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="text-7xl md:text-8xl font-black font-mono tabular-nums text-slate-800 dark:text-white mb-6 tracking-tighter">
                    {formatTime(timeLeft)}
                </div>
                <div className="flex gap-4 w-full max-w-xs">
                    <button
                        onClick={() => isActive ? onPauseTimer() : onResumeTimer()}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg ${isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30'}`}
                    >
                        {isActive ? 'Pausar' : 'Retomar'}
                    </button>
                    <button
                        onClick={onResetTimer}
                        className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    >
                        Reset
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 mb-6">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Definir Tempo (minutos)</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setInputMinutes(m => Math.max(1, m - 5))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 font-black text-xl">-</button>
                    <input
                        type="number"
                        value={inputMinutes}
                        onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                        className="w-32 text-center text-6xl font-black bg-transparent outline-none text-slate-800 dark:text-white"
                    />
                    <button onClick={() => setInputMinutes(m => m + 5)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 font-black text-xl">+</button>
                </div>
            </div>
            <button
                onClick={() => onStartTimer(inputMinutes)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
            >
                Iniciar Foco 🚀
            </button>
        </div>
    );
};

export default TimerWidget;
