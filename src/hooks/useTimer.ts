import { useState, useRef, useEffect } from 'react';

// Simple Bell Sound (Short)
const ALARM_SOUND = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

export const useTimer = () => {
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(0); // in seconds
    const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(ALARM_SOUND);
        audioRef.current.volume = 0.5;
    }, []);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        playAlarm();
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isActive, timeLeft]);

    const playAlarm = () => {
        setIsAlarmPlaying(true);
        audioRef.current?.play().catch(e => console.error("Audio play failed", e));
    };

    const stopAlarm = () => {
        setIsAlarmPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const startTimer = (minutes: number) => {
        const seconds = minutes * 60;
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(true);
        stopAlarm();
    };

    const pauseTimer = () => setIsActive(false);
    const resumeTimer = () => setIsActive(true);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
        stopAlarm();
    };

    return {
        timeLeft,
        isActive,
        isAlarmPlaying,
        duration,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        stopAlarm
    };
};
