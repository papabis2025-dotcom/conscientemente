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
import LoginView from './pages/LoginView';
import { Concurso } from './types.ts';
import { useAppData } from './hooks/useAppData';
import { useTimer } from './hooks/useTimer';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    handleLogout: logout, addSession, addSimulado,
    deleteSimulado, deleteSession, clearLogs, deleteLog, updateProfile,
    globalDailyGoal, studyTasks, setStudyTasks
  } = useAppData();

  const {
    timeLeft, isActive, isAlarmPlaying,
    startTimer, pauseTimer, resumeTimer, resetTimer, stopAlarm
  } = useTimer();

  const handleLogout = () => {
    logout();
    resetTimer();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard subjects={filteredSubjects} sessions={sessions} simulados={simulados} activeConcurso={activeConcurso} selectedConcursoId={selectedConcursoId} onSelectConcursoId={setSelectedConcursoId} concursos={concursos} theme={theme} onToggleReorderMode={setIsReorderMode} onAddSession={addSession} globalDailyGoal={globalDailyGoal} studyTasks={studyTasks} timeLeft={timeLeft} isActive={isActive} isAlarmPlaying={isAlarmPlaying} onStartTimer={startTimer} onPauseTimer={pauseTimer} onResumeTimer={resumeTimer} onResetTimer={resetTimer} onStopAlarm={stopAlarm} />;
      case 'concursos':
        return <ConcursosView concursos={concursos} onUpdateConcursos={setConcursos} onSelectConcurso={(c) => { setSelectedConcursoId(c.id); setActiveTab('dashboard'); }} />;
      case 'subjects':
        return <SubjectsView subjects={activeConcurso?.subjects || []} sessions={sessions} onUpdateSubjects={(subs) => setConcursos(concursos.map(c => c.id === selectedConcursoId ? { ...c, subjects: subs } : c))} />;
      case 'questions':
        return <QuestionsView subjects={filteredSubjects} sessions={sessions} dailyGoals={dailyGoals} onUpdateDailyGoals={setDailyGoals} onAddSession={addSession} onDeleteSession={deleteSession} />;
      case 'simulados':
        return <SimuladosView subjects={filteredSubjects} simulados={simulados} onAddSimulado={addSimulado} onDeleteSimulado={deleteSimulado} />;
      case 'calendar':
        return <CalendarView
          subjects={filteredSubjects}
          allSubjects={allSubjects}
          scheduledStudies={scheduledStudies}
          onUpdateSchedule={setScheduledStudies}
          onDelete={deleteScheduledStudy}
          onAddSession={addSession}
        />;
      case 'study_plan':
        return <StudyPlan
          subjects={filteredSubjects}
          sessions={sessions}
          studyTasks={studyTasks}
          onUpdateTasks={setStudyTasks}
        />;
      case 'settings':
        return <SettingsView currentUserEmail={currentUser?.email || ''} />;
      case 'logs': return <LogView logs={logs} onClearLogs={clearLogs} onDeleteLog={deleteLog} />;
      default: return null;
    }
  };

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} onCreateFirstUser={(name, pass) => {
      const newUser = { id: crypto.randomUUID(), name, password: pass, avatar: '🎓' };
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      setCurrentUser(newUser);
    }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden font-sans">
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
      />
      <main className="flex-1 overflow-y-auto p-4 relative">
        <div className="max-w-[1440px] mx-auto pb-10">{renderContent()}</div>
      </main>
      <footer className={`fixed bottom-0 right-0 h-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-[9px] font-medium z-40 transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${saveError ? 'bg-red-500' : isSaving ? 'bg-blue-400 animate-ping' : 'bg-emerald-500'}`}></div>
          <span className={`${saveError ? 'text-red-500 font-bold' : 'opacity-70 dark:text-slate-400'}`}>
            {saveError ? saveError : (isSaving ? 'Salvando...' : `Sincronizado: ${lastSaved}`)}
          </span>
        </div>
        <div className="uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
          Gabaritando Questões - {activeConcurso ? activeConcurso.name : 'Visão Global'}
        </div>
      </footer>
    </div>
  );
};

export default App;
