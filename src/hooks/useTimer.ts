import { useState, useRef, useEffect } from 'react';

export const useTimer = () => {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerSubjectId, setTimerSubjectId] = useState('');
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isTimerActive) {
            timerRef.current = window.setInterval(() => setTimerSeconds(s => s + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerActive]);

    const resetTimer = () => setTimerSeconds(0);
    const toggleTimer = () => setIsTimerActive(!isTimerActive);

    return {
        timerSeconds,
        isTimerActive,
        timerSubjectId,
        setTimerSubjectId,
        setTimerSeconds,
        setIsTimerActive,
        resetTimer,
        toggleTimer
    };
};
