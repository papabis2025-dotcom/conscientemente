import React, { useMemo, useState } from 'react';
import { useAgendaTarget } from '../../hooks/useAgendaTarget';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SubjectsView from './pages/SubjectsView';
import QuestionsView from './pages/QuestionsView';

// Code-splitting das visualizações pesadas para carregamento sob demanda
const StudyPlan = React.lazy(() => import('./pages/StudyPlan'));
const SimuladosView = React.lazy(() => import('./pages/SimuladosView'));
const ConcursosView = React.lazy(() => import('./pages/ConcursosView'));
const CalendarView = React.lazy(() => import('./pages/CalendarView'));
const SettingsView = React.lazy(() => import('./pages/SettingsView'));
const LogView = React.lazy(() => import('./pages/LogView'));
const StatisticsView = React.lazy(() => import('./pages/StatisticsView'));
const LoginView = React.lazy(() => import('./pages/LoginView'));
const CronogramaView = React.lazy(() => import('./pages/CronogramaView'));
const QuestionsNotebooksView = React.lazy(() => import('./pages/QuestionsNotebooksView'));
const AtividadesView = React.lazy(() => import('./pages/AtividadesView'));
const FlashcardsView = React.lazy(() => import('./pages/FlashcardsView').then(m => ({ default: m.FlashcardsView })));

import { Concurso, ActivityType, StudySession, Topic } from './types';
import { useAppData } from './hooks/useAppData';
import { useTimer } from './hooks/useTimer';
import { getCourseWeights } from './utils/phaseWeights';
import { Clock, Save, X, Plus } from 'lucide-react';

interface AppProps {
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

const App: React.FC<AppProps> = ({ theme: extTheme, toggleTheme: extToggleTheme }) => {
  const initialAgendaTarget = useAgendaTarget('estudos');
  const [agendaTarget, setAgendaTarget] = useState(initialAgendaTarget);
  const appliedAgendaConcurso = React.useRef(false);
  const [activeTab, setActiveTabState] = useState(agendaTarget?.studyTab || 'dashboard');
  const [selectedFlashcardSubjectId, setSelectedFlashcardSubjectId] = useState<string | undefined>(undefined);

  const setActiveTab = (tab: string) => {
    setAgendaTarget(null);
    setActiveTabState(tab);
    localStorage.setItem('cp_active_tab_estudos', tab);
    window.dispatchEvent(new Event('local-settings-changed'));
  };
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('global_sidebar_collapsed') === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_estudos', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  React.useEffect(() => {
    const handleSidebarSync = () => {
      setIsSidebarCollapsed(localStorage.getItem('global_sidebar_collapsed') === 'true');
    };
    window.addEventListener('global-sidebar-state-changed', handleSidebarSync);
    return () => window.removeEventListener('global-sidebar-state-changed', handleSidebarSync);
  }, []);

  const {
    currentUser, setCurrentUser, users, setUsers,
    concursos, setConcursos, selectedConcursoId, setSelectedConcursoId,
    sessions, setSessions, allSessions, simulados, setSimulados,
    scheduledStudies, setScheduledStudies, allScheduledStudies, deleteScheduledStudy, dailyGoals, setDailyGoals,
    logs, setLogs, theme, toggleTheme,
    lastSaved, isSaving, saveError,
    filteredSubjects,
    allSubjects,
    activeConcurso,
    handleLogout: logout, addSession, addSessionsBatch, addSimulado, updateSimulado,
    deleteSimulado, deleteSession, clearLogs, deleteLog, updateProfile,
    globalDailyGoal, setGlobalDailyGoal, studyTasks, setStudyTasks, toggleScheduledStudyStatus, updateScheduledStudy, saveCalendarActivity,
    resetStudyHubDataOnly, syncPlannedReviews,
    addScheduledStudiesBatch, deleteScheduledStudiesBatch, resetConcursoSchedule
  } = useAppData(extTheme, extToggleTheme);
  const phaseWeights = useMemo(() => getCourseWeights(
    selectedConcursoId === 'all' ? concursos : activeConcurso ? [activeConcurso] : []
  ), [concursos, selectedConcursoId, activeConcurso]);

  const {
    timeLeft, isActive, isAlarmPlaying,
    startTimer, pauseTimer, resumeTimer, resetTimer, stopAlarm
  } = useTimer();

  const [showAddModal, setShowAddModal] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(() => {
    return (localStorage.getItem('cn_global_alignment') as any) || 'center';
  });

  React.useEffect(() => {
    const handleSync = () => {
      setAlignment((localStorage.getItem('cn_global_alignment') as any) || 'center');
    };
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('local-settings-changed', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('local-settings-changed', handleSync);
    };
  }, []);

  React.useEffect(() => {
    const concursoId = agendaTarget?.concursoId;
    if (appliedAgendaConcurso.current || !concursoId || !concursos.some(concurso => concurso.id === concursoId)) return;
    appliedAgendaConcurso.current = true;
    if (selectedConcursoId !== concursoId) setSelectedConcursoId(concursoId);
  }, [agendaTarget, concursos, selectedConcursoId, setSelectedConcursoId]);

  React.useEffect(() => {
    if (sessionStorage.getItem('openAddStudyModal') === 'true') {
      sessionStorage.removeItem('openAddStudyModal');
      setShowAddModal(true);
    }
    const targetTab = sessionStorage.getItem('estudosActiveTab');
    if (targetTab) {
      sessionStorage.removeItem('estudosActiveTab');
      setActiveTab(targetTab);
    }
  }, []);


  const [activityFormData, setActivityFormData] = useState({
    subjectId: '',
    subjectIds: [] as string[],
    topicIds: [] as string[],
    activityTypes: ['Questões'] as string[],
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    date: new Date().toISOString().split('T')[0],
    questionsLinks: [''] as string[]
  });

  const handleSaveActivity = async () => {
    const isAulao = activityFormData.activityTypes.includes('Aulão de Revisão');
    const selectedSubjects = isAulao ? activityFormData.subjectIds : (activityFormData.subjectId ? [activityFormData.subjectId] : []);
    if (selectedSubjects.length === 0) return;

    const selectedTypes = activityFormData.activityTypes;
    const hasQuestions = selectedTypes.includes('Questões') || selectedTypes.includes('Flashcards') || selectedTypes.includes('Revisão');
    const qDone = hasQuestions ? (parseInt(activityFormData.questionsDone) || undefined) : undefined;
    const qCorrectRaw = hasQuestions ? (parseInt(activityFormData.questionsCorrect) || undefined) : undefined;
    // Acertos não podem superar o total de questões feitas
    const qCorrect = (qCorrectRaw !== undefined && qDone !== undefined)
      ? Math.min(qCorrectRaw, qDone)
      : qCorrectRaw;

    const selectedTopicIds = isAulao ? [] : activityFormData.topicIds;
    const durationVal = parseInt(activityFormData.duration) || 0;

    const filteredLinks = activityFormData.questionsLinks ? activityFormData.questionsLinks.filter(Boolean) : [];
    const questionsLinkPayload = filteredLinks.length > 0 ? JSON.stringify(filteredLinks) : undefined;

    try {
      if (selectedSubjects.length > 1) {
        // Multi-subject Aulão: split duration/questions across subjects
        const count = selectedSubjects.length;
        const baseDuration = Math.floor(durationVal / count);
        const remDuration = durationVal % count;

        const itemDones: (number | undefined)[] = [];
        if (qDone !== undefined) {
          const baseDone = Math.floor(qDone / count);
          const remDone = qDone % count;
          for (let i = 0; i < count; i++) {
            itemDones.push(baseDone + (i < remDone ? 1 : 0));
          }
        } else {
          for (let i = 0; i < count; i++) {
            itemDones.push(undefined);
          }
        }

        const itemCorrects: (number | undefined)[] = [];
        if (qCorrect !== undefined && qDone !== undefined) {
          const correctList = new Array(count).fill(0);
          let remainingCorrect = qCorrect;
          let added = true;
          while (remainingCorrect > 0 && added) {
            added = false;
            for (let i = 0; i < count; i++) {
              if (remainingCorrect > 0 && correctList[i] < (itemDones[i] || 0)) {
                correctList[i] += 1;
                remainingCorrect -= 1;
                added = true;
              }
            }
          }
          for (let i = 0; i < count; i++) {
            itemCorrects.push(correctList[i]);
          }
        } else {
          for (let i = 0; i < count; i++) {
            itemCorrects.push(qCorrect !== undefined ? Math.floor(qCorrect / count) : undefined);
          }
        }

        const sessionsList: StudySession[] = [];

        for (let i = 0; i < count; i++) {
          const itemDuration = i === 0 ? baseDuration + remDuration : baseDuration;
          const itemDone = itemDones[i];
          const itemCorrect = itemCorrects[i];

          sessionsList.push({
            id: crypto.randomUUID(),
            subjectId: selectedSubjects[i],
            durationInMinutes: itemDuration,
            date: new Date(`${activityFormData.date}T12:00:00`).toISOString(),
            questionsDone: itemDone,
            questionsCorrect: itemCorrect,
            activityType: selectedTypes.join(', '),
            questionsLink: questionsLinkPayload
          });
        }
        await addSessionsBatch(sessionsList);
      } else {
        // Single subject (either single-subject Aulão or regular activity)
        const subId = selectedSubjects[0];
        if (selectedTopicIds.length <= 1) {
          await addSession({
            id: crypto.randomUUID(),
            subjectId: subId,
            topicId: selectedTopicIds[0] || undefined,
            durationInMinutes: durationVal,
            date: new Date(`${activityFormData.date}T12:00:00`).toISOString(),
            questionsDone: qDone,
            questionsCorrect: qCorrect,
            activityType: selectedTypes.join(', '),
            questionsLink: questionsLinkPayload
          });
        } else {
          // Split across multiple topics
          const count = selectedTopicIds.length;
          const baseDuration = Math.floor(durationVal / count);
          const remDuration = durationVal % count;

          const baseDone = qDone !== undefined ? Math.floor(qDone / count) : undefined;
          const remDone = qDone !== undefined ? qDone % count : 0;

          const baseCorrect = qCorrect !== undefined ? Math.floor(qCorrect / count) : undefined;
          const remCorrect = qCorrect !== undefined ? qCorrect % count : 0;

          const sessionsList: StudySession[] = [];

          for (let i = 0; i < count; i++) {
            const itemDuration = i === 0 ? baseDuration + remDuration : baseDuration;
            const itemDone = qDone !== undefined ? (i === 0 ? baseDone! + remDone : baseDone) : undefined;
            const itemCorrect = qCorrect !== undefined ? (i === 0 ? baseCorrect! + remCorrect : baseCorrect) : undefined;

            sessionsList.push({
              id: crypto.randomUUID(),
              subjectId: subId,
              topicId: selectedTopicIds[i],
              durationInMinutes: itemDuration,
              date: new Date(`${activityFormData.date}T12:00:00`).toISOString(),
              questionsDone: itemDone,
              questionsCorrect: itemCorrect,
              activityType: selectedTypes.join(', '),
              questionsLink: questionsLinkPayload
            });
          }
          await addSessionsBatch(sessionsList);
        }
      }

      setShowAddModal(false);
      setActivityFormData({
        subjectId: '',
        subjectIds: [],
        topicIds: [],
        activityTypes: ['Questões'],
        duration: '',
        questionsDone: '',
        questionsCorrect: '',
        date: new Date().toISOString().split('T')[0],
        questionsLinks: ['']
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    resetTimer();
    window.location.hash = '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard subjects={filteredSubjects} sessions={sessions} simulados={simulados} activeConcurso={activeConcurso} selectedConcursoId={selectedConcursoId} concursos={concursos} theme={theme} onToggleReorderMode={setIsReorderMode} onAddSession={addSession} globalDailyGoal={globalDailyGoal} studyTasks={studyTasks} onUpdateTasks={setStudyTasks} scheduledStudies={scheduledStudies} timeLeft={timeLeft} isActive={isActive} isAlarmPlaying={isAlarmPlaying} onStartTimer={startTimer} onPauseTimer={pauseTimer} onResumeTimer={resumeTimer} onResetTimer={resetTimer} onStopAlarm={stopAlarm} onNavigateTab={setActiveTab} />;
      case 'concursos':
        return <ConcursosView concursos={concursos} targetConcursoId={agendaTarget?.studyTab === 'concursos' ? agendaTarget.id : undefined} onUpdateConcursos={setConcursos} onSelectConcurso={(c) => { setSelectedConcursoId(c.id); setActiveTab('dashboard'); }} scheduledStudies={allScheduledStudies || scheduledStudies} sessions={allSessions || sessions} />;
      case 'subjects':
        return <SubjectsView phaseWeights={phaseWeights} subjects={selectedConcursoId === 'all' ? filteredSubjects : (activeConcurso?.subjects || [])} sessions={sessions} onUpdateSubjects={(subs) => { void setConcursos(concursos.map(c => c.id === selectedConcursoId ? { ...c, subjects: subs } : c)).catch(() => {}); }} selectedConcursoId={selectedConcursoId} concursos={concursos} scheduledStudies={scheduledStudies} onToggleScheduledStudyStatus={toggleScheduledStudyStatus} onNavigateToFlashcards={(subId) => { setSelectedFlashcardSubjectId(subId); setActiveTab('flashcards'); }} />;
      case 'questions':
        return <QuestionsView subjects={filteredSubjects} sessions={sessions} dailyGoals={dailyGoals} onUpdateDailyGoals={setDailyGoals} onAddSession={addSession} onDeleteSession={deleteSession} />;
      case 'simulados':
        return <SimuladosView subjects={filteredSubjects} simulados={simulados} sessions={sessions} onAddSimulado={addSimulado} onDeleteSimulado={deleteSimulado} onUpdateSimulado={updateSimulado} />;
      case 'cronograma':
        return <CronogramaView
          subjects={filteredSubjects}
          sessions={sessions}
          simulados={simulados}
          concursos={concursos}
          selectedConcursoId={selectedConcursoId}
          scheduledStudies={allScheduledStudies || scheduledStudies}
          onAddScheduledStudiesBatch={addScheduledStudiesBatch}
          onDeleteScheduledStudiesBatch={deleteScheduledStudiesBatch}
          onToggleScheduledStudyStatus={toggleScheduledStudyStatus}
          onUpdateScheduledStudy={updateScheduledStudy}
        />;
      case 'flashcards':
        return <FlashcardsView
          subjects={filteredSubjects}
          allSubjects={allSubjects}
          activeConcurso={activeConcurso}
          selectedConcursoId={selectedConcursoId}
          theme={theme}
          initialSubjectId={selectedFlashcardSubjectId}
        />;
      case 'calendar':
        return <CalendarView
          agendaTarget={agendaTarget?.studyTab === 'calendar' ? agendaTarget : null}
          subjects={filteredSubjects}
          allSubjects={allSubjects}
          scheduledStudies={allScheduledStudies || scheduledStudies}
          sessions={allSessions || sessions}
          concursos={concursos}
          selectedConcursoId={selectedConcursoId}
          onSaveActivity={saveCalendarActivity}
          onDelete={deleteScheduledStudy}
          onToggleStatus={toggleScheduledStudyStatus}
          onUpdateScheduledStudy={updateScheduledStudy}
          simulados={simulados}
          onSyncReviews={syncPlannedReviews}
        />;
      case 'questions_links':
        return <QuestionsNotebooksView
          sessions={sessions}
          activeConcurso={activeConcurso || null}
          allSubjects={allSubjects}
          setSessions={setSessions}
          onSyncReviews={syncPlannedReviews}
        />;
      case 'atividades':
        return <AtividadesView
          subjects={filteredSubjects}
          sessions={sessions}
          scheduledStudies={scheduledStudies}
        />;
      case 'study_plan':
        return <StudyPlan
          agendaDate={agendaTarget?.studyTab === 'study_plan' ? agendaTarget.date : undefined}
          phaseWeights={phaseWeights}
          subjects={filteredSubjects}
          sessions={sessions}
          studyTasks={studyTasks}
          onUpdateTasks={setStudyTasks}
        />;
      case 'statistics':
        return <StatisticsView phaseWeights={phaseWeights} subjects={filteredSubjects} sessions={sessions} simulados={simulados} concursos={concursos} selectedConcursoId={selectedConcursoId} />;
      case 'settings':
        return <SettingsView
          currentUserEmail={currentUser?.email || ''}
          globalDailyGoal={globalDailyGoal}
          setGlobalDailyGoal={setGlobalDailyGoal}
          resetAllData={resetStudyHubDataOnly}
        />;
      default: return null;
    }
  };

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} onCreateFirstUser={(name, pass) => {
      const newUser = { id: crypto.randomUUID(), name, password: pass, avatar: 'student' };
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      setCurrentUser(newUser);
    }} />;
  }

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme}
        timeLeft={timeLeft} isActive={isActive} isAlarmPlaying={isAlarmPlaying}
        onStartTimer={startTimer} onPauseTimer={pauseTimer} onResumeTimer={resumeTimer} onResetTimer={resetTimer} onStopAlarm={stopAlarm}
        subjects={filteredSubjects}
        onAddSession={addSession} currentUser={currentUser} onLogout={handleLogout} onUpdateUser={updateProfile}
        isReorderMode={isReorderMode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          const next = !isSidebarCollapsed;
          setIsSidebarCollapsed(next);
          localStorage.setItem('global_sidebar_collapsed', String(next));
          localStorage.setItem('isSidebarCollapsed_estudos', String(next));
          window.dispatchEvent(new Event('global-sidebar-state-changed'));
        }}
        studyTasks={studyTasks}
        sessions={sessions}
        onOpenAddModal={() => setShowAddModal(true)}
        concursos={concursos}
        selectedConcursoId={selectedConcursoId}
        onSelectConcursoId={setSelectedConcursoId}
        activeConcurso={activeConcurso}
      />
      <main className="flex-1 overflow-y-auto p-3 relative">
        <div className={`max-w-[1440px] w-full transition-all duration-300 ${
          alignment === 'left' ? 'ml-0 mr-auto' :
          alignment === 'right' ? 'ml-auto mr-0' :
          'mx-auto'
        }`}>
          <div role="status" className="text-xs text-zinc-600 dark:text-zinc-300">
            {isSaving && <p className="mb-2">Sincronizando com a nuvem…</p>}
          </div>
          {saveError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{saveError}</p>}
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-[350px]">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            {renderContent()}
          </React.Suspense>
        </div>
      </main>


      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold uppercase tracking-tight mb-6 dark:text-white flex items-center gap-2">Nova Atividade <Clock size={20} className="text-zinc-900 dark:text-zinc-300" /></h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-2 block">Tipo de Atividade (Selecione uma ou mais)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Leitura', 'Questões', 'Flashcards', 'Aula', 'Simulado', 'Revisão', 'Aulão de Revisão'].map(type => {
                      const isSelected = activityFormData.activityTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const current = activityFormData.activityTypes;
                            const next = current.includes(type)
                              ? current.filter(t => t !== type)
                              : [...current, type];
                            if (next.length > 0) {
                              setActivityFormData({ ...activityFormData, activityTypes: next });
                            }
                          }}
                          className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase transition-all border ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm scale-95'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-55 dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Data</label>
                  <input type="date" value={activityFormData.date} onChange={(e) => setActivityFormData({ ...activityFormData, date: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500" />
                </div>

                {activityFormData.activityTypes.includes('Aulão de Revisão') ? (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Disciplinas (Selecione uma ou mais)</label>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800 custom-scrollbar">
                      {filteredSubjects.map(s => {
                        const isChecked = (activityFormData.subjectIds || []).includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2.5 text-xs font-bold dark:text-white cursor-pointer select-none hover:opacity-85 py-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const current = activityFormData.subjectIds || [];
                                const next = isChecked
                                  ? current.filter(id => id !== s.id)
                                  : [...current, s.id];
                                setActivityFormData({ ...activityFormData, subjectIds: next });
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                            />
                            <span>{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Disciplina</label>
                    <select value={activityFormData.subjectId} onChange={(e) => setActivityFormData({ ...activityFormData, subjectId: e.target.value, subjectIds: e.target.value ? [e.target.value] : [], topicIds: [] })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500">
                      <option value="">Selecione a matéria...</option>
                      {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {!activityFormData.activityTypes.includes('Aulão de Revisão') && activityFormData.subjectId && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block font-mono">Assunto / Tópico (Selecione vários)</label>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500 custom-scrollbar">
                      <label className="flex items-center gap-2.5 text-xs font-bold dark:text-white cursor-pointer select-none hover:opacity-85 py-0.5">
                        <input
                          type="checkbox"
                          checked={activityFormData.topicIds.length === 0}
                          onChange={() => setActivityFormData({ ...activityFormData, topicIds: [] })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                        />
                        <span className="text-zinc-500 dark:text-zinc-400">Geral / Outros</span>
                      </label>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1 w-full" />
                      {(filteredSubjects.find(s => s.id === activityFormData.subjectId)?.topics || []).map((t: Topic) => {
                        const isChecked = activityFormData.topicIds.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-2.5 text-xs font-bold dark:text-white cursor-pointer select-none hover:opacity-85 py-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const current = activityFormData.topicIds;
                                const next = isChecked 
                                  ? current.filter(id => id !== t.id) 
                                  : [...current, t.id];
                                setActivityFormData({ ...activityFormData, topicIds: next });
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                            />
                            <span>{t.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Tempo Dedicado (min)</label>
                  <input type="number" placeholder="Ex: 45" value={activityFormData.duration} onChange={(e) => setActivityFormData({ ...activityFormData, duration: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500" />
                </div>

                {(activityFormData.activityTypes.includes('Questões') || activityFormData.activityTypes.includes('Flashcards') || activityFormData.activityTypes.includes('Revisão')) && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Resolvidas</label>
                      <input type="number" placeholder="0" value={activityFormData.questionsDone} onChange={(e) => setActivityFormData({ ...activityFormData, questionsDone: e.target.value })} className="w-full p-3 bg-white dark:bg-zinc-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Acertos</label>
                      <input
                        type="number"
                        placeholder="0"
                        min={0}
                        max={parseInt(activityFormData.questionsDone) || undefined}
                        value={activityFormData.questionsCorrect}
                        onChange={(e) => {
                          const done = parseInt(activityFormData.questionsDone) || undefined;
                          const val = parseInt(e.target.value);
                          const clamped = (done !== undefined && !isNaN(val)) ? String(Math.min(val, done)) : e.target.value;
                          setActivityFormData({ ...activityFormData, questionsCorrect: clamped });
                        }}
                        className="w-full p-3 bg-white dark:bg-zinc-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm"
                      />
                    </div>
                  </div>
                )}



              <button
                onClick={handleSaveActivity}
                disabled={activityFormData.activityTypes.includes('Aulão de Revisão') ? (activityFormData.subjectIds || []).length === 0 : !activityFormData.subjectId}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
