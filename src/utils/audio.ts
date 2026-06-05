// Web Audio API Sound Synthesizer for sophisticated micro-interactions

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Sophisticated sfx player
export const playSound = {
  click: () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Fine-tuned frequencies for a sutil premium click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime); // very quiet and sutil
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },
  
  success: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Crystall tone: play a C-chord arpeggio
      const playTone = (freq: number, start: number, duration: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle'; // softer than saw/square
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      // Play C5 -> E5 -> G5 arpeggio
      playTone(523.25, now, 0.4, 0.03);       // C5
      playTone(659.25, now + 0.06, 0.4, 0.025); // E5
      playTone(783.99, now + 0.12, 0.5, 0.02);  // G5
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }
};
