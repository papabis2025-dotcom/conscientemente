import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/audio';
import { Play, Square, Layers } from 'lucide-react';

interface ShowroomStep {
  id: string;
  route: string;
  tab?: string;
  selector: string;
  fallbackX: number; // percentage of screen width (e.g. 50 = 50vw)
  fallbackY: number; // percentage of screen height (e.g. 50 = 50vh)
  captionTitle: string;
  captionText: string;
  duration: number; // ms
  action: 'hover' | 'click' | 'none';
}

const SHOWROOM_STEPS: ShowroomStep[] = [
  {
    id: 'welcome',
    route: 'hub',
    selector: 'body',
    fallbackX: 50,
    fallbackY: 50,
    captionTitle: 'Apresentação Automatizada',
    captionText: 'Prepare sua gravação de tela! O Showroom irá simular o uso do app em alta velocidade e com atalhos de produtividade.',
    duration: 3500,
    action: 'none'
  },
  {
    id: 'hover_estudos',
    route: 'hub',
    selector: '[data-showroom="card-estudos"]',
    fallbackX: 20,
    fallbackY: 45,
    captionTitle: 'Central de Estudos',
    captionText: 'Módulo Estudos: Gerencie cronogramas, disciplinas, simulados e revisões em um painel unificado.',
    duration: 2500,
    action: 'hover'
  },
  {
    id: 'click_estudos',
    route: 'hub',
    selector: '[data-showroom="card-estudos"]',
    fallbackX: 20,
    fallbackY: 45,
    captionTitle: 'Acessando Estudos',
    captionText: 'Navegação em alta velocidade entre os módulos do aplicativo.',
    duration: 1500,
    action: 'click'
  },
  {
    id: 'estudos_dashboard',
    route: 'estudos',
    tab: 'dashboard',
    selector: '[data-showroom="estudos-sidebar-dashboard"]',
    fallbackX: 10,
    fallbackY: 20,
    captionTitle: 'Dashboard de Estudos',
    captionText: 'Acompanhe seu tempo de estudo diário, progresso do edital e métricas de desempenho em tempo real.',
    duration: 3500,
    action: 'hover'
  },
  {
    id: 'estudos_planner',
    route: 'estudos',
    tab: 'calendar',
    selector: '[data-showroom="estudos-sidebar-calendar"]',
    fallbackX: 10,
    fallbackY: 30,
    captionTitle: 'Planner & Calendário',
    captionText: 'Agende e visualize suas sessões de estudos programadas e datas de revisões espaçadas de forma visual.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'estudos_planner_list',
    route: 'estudos',
    tab: 'calendar',
    selector: '[data-showroom="planner-list-view-btn"]',
    fallbackX: 45,
    fallbackY: 15,
    captionTitle: 'Nova Visualização em Lista',
    captionText: 'Visualize suas atividades organizadas e agrupadas por Dia, Semana, Mês ou Ano com filtros avançados.',
    duration: 3500,
    action: 'click'
  },
  {
    id: 'estudos_subjects',
    route: 'estudos',
    tab: 'subjects',
    selector: '[data-showroom="estudos-sidebar-subjects"]',
    fallbackX: 10,
    fallbackY: 40,
    captionTitle: 'Disciplinas & Assuntos',
    captionText: 'Edital verticalizado com numeração editável de assuntos para definir sua própria ordem de estudos.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'financas_dashboard',
    route: 'financas',
    tab: 'dashboard',
    selector: '[data-showroom="card-financas"]',
    fallbackX: 50,
    fallbackY: 45,
    captionTitle: 'Gestão Financeira',
    captionText: 'Módulo Finanças: Lançamento rápido de despesas e receitas com categorizações inteligentes.',
    duration: 3500,
    action: 'click'
  },
  {
    id: 'financas_anual',
    route: 'financas',
    tab: 'anual',
    selector: '[data-showroom="financas-sidebar-anual"]',
    fallbackX: 10,
    fallbackY: 30,
    captionTitle: 'Planejamento Anual',
    captionText: 'Monitore suas economias e receitas anuais consolidadas para bater metas a longo prazo.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'saude_dashboard',
    route: 'saude',
    tab: 'dashboard',
    selector: '[data-showroom="card-saude"]',
    fallbackX: 80,
    fallbackY: 45,
    captionTitle: 'Saúde & Bem-Estar',
    captionText: 'Módulo Saúde: Acompanhamento de treinos diários, peso corporal e planner de atividades físicas.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'tarefas_dashboard',
    route: 'tarefas',
    tab: 'ativas',
    selector: '[data-showroom="card-tarefas"]',
    fallbackX: 20,
    fallbackY: 75,
    captionTitle: 'Gestão de Tarefas',
    captionText: 'Módulo Tarefas: Lista inteligente de pendências (To-Do List) com calendário integrado e lembretes.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'habitos_dashboard',
    route: 'habitos',
    tab: 'painel',
    selector: '[data-showroom="card-habitos"]',
    fallbackX: 50,
    fallbackY: 75,
    captionTitle: 'Hábitos & Consistência',
    captionText: 'Módulo Hábitos: Registre sua consistência diária e visualize seu progresso em um mapa de hábitos dinâmico.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'anotacoes_dashboard',
    route: 'anotacoes',
    tab: 'Anotações',
    selector: '[data-showroom="card-anotacoes"]',
    fallbackX: 80,
    fallbackY: 75,
    captionTitle: 'Anotações & Leitura',
    captionText: 'Módulo Anotações: Diário de leitura para controle de livros e bloco de notas flexível.',
    duration: 3000,
    action: 'click'
  },
  {
    id: 'conclusion',
    route: 'hub',
    selector: 'body',
    fallbackX: 50,
    fallbackY: 50,
    captionTitle: 'Showroom Concluído',
    captionText: 'Todas as funcionalidades apresentadas. Conscientemente: produtividade extrema integrada em um só lugar.',
    duration: 4000,
    action: 'none'
  }
];

export const ShowroomWidget: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Fake cursor state
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [cursorClicked, setCursorClicked] = useState(false);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Track page elements to position fake cursor
  useEffect(() => {
    if (!isActive || countdown !== null) return;

    const step = SHOWROOM_STEPS[currentStepIdx];
    
    // Function to calculate target coordinates
    const updateCursorPosition = () => {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCursorPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      } else {
        // Fallback coordinates based on viewport percentage
        setCursorPos({
          x: (window.innerWidth * step.fallbackX) / 100,
          y: (window.innerHeight * step.fallbackY) / 100
        });
      }
    };

    // Initial position for step
    updateCursorPosition();

    // Re-check position if screen size changes
    window.addEventListener('resize', updateCursorPosition);
    return () => window.removeEventListener('resize', updateCursorPosition);
  }, [isActive, currentStepIdx, countdown]);

  const startShowroom = () => {
    try {
      playSound.click();
    } catch (e) {}
    
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          // Start the tour
          setIsActive(true);
          setCurrentStepIdx(0);
          runStep(0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopShowroom = () => {
    setIsActive(false);
    setCountdown(null);
    setCurrentStepIdx(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    window.location.hash = 'hub';
  };

  const runStep = (stepIdx: number) => {
    if (stepIdx >= SHOWROOM_STEPS.length) {
      stopShowroom();
      return;
    }

    setCurrentStepIdx(stepIdx);
    const step = SHOWROOM_STEPS[stepIdx];

    // 1. Perform navigation
    if (window.location.hash.replace('#', '') !== step.route) {
      window.location.hash = step.route;
    }

    // Dispatch custom event for sub-tab routing after a slight delay to allow the parent view to render
    setTimeout(() => {
      if (step.tab) {
        window.dispatchEvent(
          new CustomEvent('showroom-set-route', {
            detail: { route: step.route, tab: step.tab }
          })
        );
      }
    }, 150);

    // 2. Schedule fake click near the end of this step duration
    const clickDelay = step.duration - 600;
    setTimeout(() => {
      if (!isActive) return;

      if (step.action === 'click') {
        setCursorClicked(true);
        // Add click visual ripple
        setClickRipple({ x: cursorPos.x, y: cursorPos.y });
        setTimeout(() => setClickRipple(null), 500);

        try {
          playSound.click();
        } catch (e) {}

        // If it's a hub module click, simulate normal route update
        if (step.route === 'hub' && step.selector.includes('card-')) {
          const modName = step.selector.split('card-')[1].replace('"]', '');
          window.location.hash = modName;
        }
        
        setTimeout(() => setCursorClicked(false), 200);
      }
    }, Math.max(100, clickDelay));

    // 3. Queue the next step
    timerRef.current = setTimeout(() => {
      runStep(stepIdx + 1);
    }, step.duration);
  };

  const currentStep = SHOWROOM_STEPS[currentStepIdx];
  const progressPercent = ((currentStepIdx + 1) / SHOWROOM_STEPS.length) * 100;

  return (
    <>
      {/* Floating trigger button - only visible if tour is inactive */}
      {!isActive && countdown === null && (
        <button
          onClick={startShowroom}
          className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-semibold px-4 py-3 rounded-2xl shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20 group"
          title="Iniciar Apresentação Automatizada"
        >
          <Play size={18} className="fill-white animate-pulse" />
          <span className="text-sm tracking-wide">Apresentar App</span>
          <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded text-white/90 group-hover:bg-white/30">
            Showroom
          </span>
        </button>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white select-none text-center">
          <div className="p-8 max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-400 font-sans">Preparando Showroom...</h2>
            <p className="text-zinc-400 text-sm font-sans">
              Inicie seu gravador de tela agora! O tour automático percorrerá todo o aplicativo em modo de alta produtividade.
            </p>
            <div className="flex items-center justify-center">
              <span className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500 animate-ping font-sans">
                {countdown}
              </span>
            </div>
            <button
              onClick={stopShowroom}
              className="px-4 py-2 bg-zinc-800 text-xs font-semibold rounded-lg text-zinc-300 hover:bg-zinc-700 transition font-sans"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Showroom running overlay HUD */}
      {isActive && (
        <div className="pointer-events-none select-none">
          {/* Glassmorphic Caption Card */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[99999] pointer-events-auto flex items-start gap-4 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20 mt-1 shrink-0">
              <Layers size={20} />
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white tracking-wide font-sans">
                  {currentStep.captionTitle}
                </h3>
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-mono">
                  Etapa {currentStepIdx + 1}/{SHOWROOM_STEPS.length}
                </span>
              </div>
              
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {currentStep.captionText}
              </p>

              {/* Progress bar */}
              <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stop control button */}
            <button
              onClick={stopShowroom}
              className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
              title="Encerrar Showroom"
            >
              <Square size={16} />
            </button>
          </div>

          {/* Fake Mouse Pointer */}
          <div
            className="fixed top-0 left-0 pointer-events-none z-[100000] drop-shadow-lg"
            style={{
              transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
              transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          >
            {/* Pulsing glow when hovering */}
            <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full border bg-violet-500/10 border-violet-500/30 animate-pulse transition-opacity duration-300 ${cursorClicked ? 'opacity-0' : 'opacity-100'}`} />
            
            {/* Clicking effect */}
            <div className={`absolute -top-6 -left-6 w-14 h-14 rounded-full border border-violet-400 bg-violet-400/20 transition-all duration-300 ${cursorClicked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

            {/* Mouse Pointer SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={`transform origin-top-left transition-transform duration-200 ${cursorClicked ? 'scale-90' : 'scale-100'}`}
            >
              <path
                d="M4.5 3V17.5L9.3 12.7L15 21L18.5 18.5L13 10.5L18.5 10.5L4.5 3Z"
                fill="black"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Click Visual Ripple */}
          {clickRipple && (
            <div
              className="fixed w-16 h-16 rounded-full border border-indigo-400 bg-indigo-500/20 pointer-events-none z-[99999] -translate-x-1/2 -translate-y-1/2 animate-ping"
              style={{ top: clickRipple.y, left: clickRipple.x }}
            />
          )}
        </div>
      )}
    </>
  );
};

export default ShowroomWidget;
