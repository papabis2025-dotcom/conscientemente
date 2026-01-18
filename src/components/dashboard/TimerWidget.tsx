import React, { useState } from 'react';
import { Play, Pause, RotateCcw, BellOff, Rocket, Minus, Plus } from 'lucide-react';

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
            <div className="h-full flex flex-col items-center justify-center animate-pulse text-rose-500">
                <BellOff size={48} className="mb-4" />
                <h3 className="text-2xl font-bold uppercase mb-4">Tempo Esgotado!</h3>
                <button
                    onClick={onStopAlarm}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-wide shadow-xl shadow-rose-500/30 transition-all hover:scale-105 flex items-center gap-2"
                >
                    <BellOff size={20} /> Parar Alarme
                </button>
            </div>
        );
    }

    if (isActive || timeLeft > 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="text-7xl md:text-8xl font-bold font-mono tabular-nums text-slate-800 dark:text-white mb-6 tracking-tight">
                    {formatTime(timeLeft)}
                </div>
                <div className="flex gap-4 w-full max-w-xs">
                    <button
                        onClick={() => isActive ? onPauseTimer() : onResumeTimer()}
                        className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-wide text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30'}`}
                    >
                        {isActive ? <><Pause size={18} /> Pausar</> : <><Play size={18} /> Retomar</>}
                    </button>
                    <button
                        onClick={onResetTimer}
                        className="px-6 py-4 rounded-2xl font-bold uppercase tracking-wide text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} /> Reset
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 mb-6">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wide">Definir Tempo (minutos)</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setInputMinutes(m => Math.max(1, m - 5))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 font-bold text-xl flex items-center justify-center"><Minus size={20} /></button>
                    <input
                        type="number"
                        value={inputMinutes}
                        onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                        className="w-32 text-center text-6xl font-bold bg-transparent outline-none text-slate-800 dark:text-white"
                    />
                    <button onClick={() => setInputMinutes(m => m + 5)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 font-bold text-xl flex items-center justify-center"><Plus size={20} /></button>
                </div>
            </div>
            <button
                onClick={() => onStartTimer(inputMinutes)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-wide shadow-xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center gap-2"
            >
                <Rocket size={20} /> Iniciar Foco
            </button>
        </div>
    );
};

export default TimerWidget;
