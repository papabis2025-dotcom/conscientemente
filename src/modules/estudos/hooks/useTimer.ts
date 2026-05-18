import { useState, useRef, useEffect } from 'react';

// Simple Bell Sound (Short)
const ALARM_SOUND = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

export const useTimer = () => {
    // Lazy initialization from localStorage to match persisted state immediately
    const [timeLeft, setTimeLeft] = useState(() => {
        const savedTime = localStorage.getItem('cp_timer_left');
        const savedIsActive = localStorage.getItem('cp_timer_is_active') === 'true';
        const savedTimestamp = localStorage.getItem('cp_timer_timestamp');

        if (savedTime) {
            let initialTime = parseInt(savedTime, 10);
            if (savedIsActive && savedTimestamp) {
                const now = Date.now();
                const lastTime = parseInt(savedTimestamp, 10);
                const elapsedSeconds = Math.floor((now - lastTime) / 1000);
                initialTime = Math.max(0, initialTime - elapsedSeconds);
            }
            return initialTime;
        }
        return 0;
    });

    const [isActive, setIsActive] = useState(() => {
        const savedIsActive = localStorage.getItem('cp_timer_is_active') === 'true';
        // Need access to the calculated time to decide if it should remain active
        // But hooks run in order. We can re-calculate or verify in an effect.
        // For simplicity, let's start with what we saved, but effect will correct it if time is 0.
        // Or better: Re-run calculation here (cheap) to ensure consistency.
        const savedTime = localStorage.getItem('cp_timer_left');
        const savedTimestamp = localStorage.getItem('cp_timer_timestamp');
        if (savedTime && savedIsActive && savedTimestamp) {
            let initialTime = parseInt(savedTime, 10);
            const now = Date.now();
            const lastTime = parseInt(savedTimestamp, 10);
            const elapsedSeconds = Math.floor((now - lastTime) / 1000);
            initialTime = Math.max(0, initialTime - elapsedSeconds);
            return initialTime > 0;
        }
        return false;
    });

    const [duration, setDuration] = useState(0); // in seconds
    const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const beepCountRef = useRef(0);

    useEffect(() => {
        audioRef.current = new Audio(ALARM_SOUND);
        audioRef.current.volume = 0.5;

        const handleEnded = () => {
            if (beepCountRef.current < 2) {
                beepCountRef.current += 1;
                setTimeout(() => {
                    audioRef.current?.play().catch(e => console.error("Replay failed", e));
                }, 300); // 300ms pause between beeps
            }
        };

        audioRef.current.addEventListener('ended', handleEnded);

        return () => {
            audioRef.current?.removeEventListener('ended', handleEnded);
        };
    }, []);

    // Save state on change
    useEffect(() => {
        localStorage.setItem('cp_timer_left', timeLeft.toString());
        localStorage.setItem('cp_timer_is_active', isActive.toString());
        localStorage.setItem('cp_timer_timestamp', Date.now().toString());
    }, [timeLeft, isActive]);

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
        beepCountRef.current = 0;
        audioRef.current?.play().catch(e => console.error("Audio play failed", e));
    };

    const stopAlarm = () => {
        setIsAlarmPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            beepCountRef.current = 3; // Prevent further loops if stopped mid-sequence
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
        setTimeLeft(0);
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
