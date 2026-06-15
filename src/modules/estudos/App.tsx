import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SubjectsView from './pages/SubjectsView';
import StudyPlan from './pages/StudyPlan';
import SimuladosView from './pages/SimuladosView';
import ConcursosView from './pages/ConcursosView';
import CalendarView from './pages/CalendarView';
import QuestionsView from './pages/QuestionsView';
import SettingsView from './pages/SettingsView';
import LogView from './pages/LogView';
import StatisticsView from './pages/StatisticsView';
import LoginView from './pages/LoginView';
import { Concurso, ActivityType, StudySession, Topic } from './types';
import { useAppData } from './hooks/useAppData';
import { useTimer } from './hooks/useTimer';
import { Clock, Save, X } from 'lucide-react';

interface AppProps {
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

const App: React.FC<AppProps> = ({ theme: extTheme, toggleTheme: extToggleTheme }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_estudos') !== 'false';
  });

  React.useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_estudos', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const {
    currentUser, setCurrentUser, users, setUsers,
    concursos, setConcursos, selectedConcursoId, setSelectedConcursoId,
    sessions, setSessions, simulados, setSimulados,
    scheduledStudies, setScheduledStudies, deleteScheduledStudy, dailyGoals, setDailyGoals,
    logs, setLogs, theme, toggleTheme,
    lastSaved, isSaving, saveError,
    filteredSubjects,
    allSubjects,
    activeConcurso,
    handleLogout: logout, addSession, addSessionsBatch, addSimulado, updateSimulado,
    deleteSimulado, deleteSession, clearLogs, deleteLog, updateProfile,
    globalDailyGoal, studyTasks, setStudyTasks, toggleScheduledStudyStatus, updateScheduledStudy,
    resetStudyHubDataOnly, syncPlannedReviews
  } = useAppData(extTheme, extToggleTheme);

  const {
    timeLeft, isActive, isAlarmPlaying,
    startTimer, pauseTimer, resumeTimer, resetTimer, stopAlarm
  } = useTimer();

  const [showAddModal, setShowAddModal] = useState(false);

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
    topicIds: [] as string[],
    activityTypes: ['Questões'] as string[],
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSaveActivity = async () => {
    if (!activityFormData.subjectId) return;

    const selectedTypes = activityFormData.activityTypes;
    const hasQuestions = selectedTypes.includes('Questões') || selectedTypes.includes('Flashcards') || selectedTypes.includes('Revisão');
    const qDone = hasQuestions ? (parseInt(activityFormData.questionsDone) || undefined) : undefined;
    const qCorrect = hasQuestions ? (parseInt(activityFormData.questionsCorrect) || undefined) : undefined;

    const selectedTopicIds = activityFormData.topicIds;
    const durationVal = parseInt(activityFormData.duration) || 0;

    try {
      if (selectedTopicIds.length <= 1) {
        await addSession({
          id: crypto.randomUUID(),
          subjectId: activityFormData.subjectId,
          topicId: selectedTopicIds[0] || undefined,
          durationInMinutes: durationVal,
          date: new Date(`${activityFormData.date}T12:00:00`).toISOString(),
          questionsDone: qDone,
          questionsCorrect: qCorrect,
          activityType: selectedTypes.join(', ')
        });
      } else {
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
            subjectId: activityFormData.subjectId,
            topicId: selectedTopicIds[i],
            durationInMinutes: itemDuration,
            date: new Date(`${activityFormData.date}T12:00:00`).toISOString(),
            questionsDone: itemDone,
            questionsCorrect: itemCorrect,
            activityType: selectedTypes.join(', ')
          });
        }

        await addSessionsBatch(sessionsList);
      }

      setShowAddModal(false);
      setActivityFormData({
        subjectId: '',
        topicIds: [],
        activityTypes: ['Questões'],
        duration: '',
        questionsDone: '',
        questionsCorrect: '',
        date: new Date().toISOString().split('T')[0]
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
        return <Dashboard subjects={filteredSubjects} sessions={sessions} simulados={simulados} activeConcurso={activeConcurso} selectedConcursoId={selectedConcursoId} onSelectConcursoId={setSelectedConcursoId} concursos={concursos} theme={theme} onToggleReorderMode={setIsReorderMode} onAddSession={addSession} globalDailyGoal={globalDailyGoal} studyTasks={studyTasks} onUpdateTasks={setStudyTasks} scheduledStudies={scheduledStudies} timeLeft={timeLeft} isActive={isActive} isAlarmPlaying={isAlarmPlaying} onStartTimer={startTimer} onPauseTimer={pauseTimer} onResumeTimer={resumeTimer} onResetTimer={resetTimer} onStopAlarm={stopAlarm} />;
      case 'concursos':
        return <ConcursosView concursos={concursos} onUpdateConcursos={setConcursos} onSelectConcurso={(c) => { setSelectedConcursoId(c.id); setActiveTab('dashboard'); }} />;
      case 'subjects':
        return <SubjectsView subjects={activeConcurso?.subjects || []} sessions={sessions} onUpdateSubjects={(subs) => setConcursos(concursos.map(c => c.id === selectedConcursoId ? { ...c, subjects: subs } : c))} selectedConcursoId={selectedConcursoId} onSelectConcursoId={setSelectedConcursoId} concursos={concursos} scheduledStudies={scheduledStudies} />;
      case 'questions':
        return <QuestionsView subjects={filteredSubjects} sessions={sessions} dailyGoals={dailyGoals} onUpdateDailyGoals={setDailyGoals} onAddSession={addSession} onDeleteSession={deleteSession} />;
      case 'simulados':
        return <SimuladosView subjects={filteredSubjects} simulados={simulados} onAddSimulado={addSimulado} onDeleteSimulado={deleteSimulado} onUpdateSimulado={updateSimulado} />;
      case 'calendar':
        return <CalendarView
          subjects={filteredSubjects}
          allSubjects={allSubjects}
          scheduledStudies={scheduledStudies}
          onUpdateSchedule={setScheduledStudies}
          onDelete={deleteScheduledStudy}
          onAddSession={addSession}
          onAddSessionsBatch={addSessionsBatch}
          onToggleStatus={toggleScheduledStudyStatus}
          onUpdateScheduledStudy={updateScheduledStudy}
          simulados={simulados}
          onSyncReviews={syncPlannedReviews}
        />;
      case 'study_plan':
        return <StudyPlan
          subjects={filteredSubjects}
          sessions={sessions}
          studyTasks={studyTasks}
          onUpdateTasks={setStudyTasks}
        />;
      case 'statistics':
        return <StatisticsView subjects={filteredSubjects} sessions={sessions} />;
      case 'settings':
        return <SettingsView currentUserEmail={currentUser?.email || ''} />;
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
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        studyTasks={studyTasks}
        sessions={sessions}
        onOpenAddModal={() => setShowAddModal(true)}
      />
      <main className="flex-1 overflow-y-auto p-3 relative">
        <div className="max-w-[1440px] mx-auto">{renderContent()}</div>
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
                    {['Leitura', 'Questões', 'Flashcards', 'Aula', 'Simulado', 'Revisão'].map(type => {
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

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Disciplina</label>
                  <select value={activityFormData.subjectId} onChange={(e) => setActivityFormData({ ...activityFormData, subjectId: e.target.value, topicIds: [] })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500">
                    <option value="">Selecione a matéria...</option>
                    {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {activityFormData.subjectId && (
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
                      <input type="number" placeholder="0" value={activityFormData.questionsCorrect} onChange={(e) => setActivityFormData({ ...activityFormData, questionsCorrect: e.target.value })} className="w-full p-3 bg-white dark:bg-zinc-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                    </div>
                  </div>
                )}

              <button
                onClick={handleSaveActivity}
                disabled={!activityFormData.subjectId}
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
