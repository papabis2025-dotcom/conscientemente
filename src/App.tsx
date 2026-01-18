import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SubjectsView from './pages/SubjectsView';
import AICoach from './pages/AICoach';
import ConcursosView from './pages/ConcursosView';
import CalendarView from './pages/CalendarView';
import QuestionsView from './pages/QuestionsView';
import SimuladosView from './pages/SimuladosView';
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
    lastSaved, isSaving, saveError, filteredSubjects, activeConcurso,
    handleLogout: logout, addSession, addSimulado,
    deleteSimulado, deleteSession, clearLogs, deleteLog, updateProfile
  } = useAppData();

  const {
    timerSeconds, isTimerActive, timerSubjectId,
    setTimerSubjectId, setTimerSeconds, setIsTimerActive,
    resetTimer, toggleTimer
  } = useTimer();

  const handleLogout = () => {
    logout();
    setIsTimerActive(false);
    setTimerSeconds(0);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard subjects={filteredSubjects} sessions={sessions} simulados={simulados} activeConcurso={activeConcurso} selectedConcursoId={selectedConcursoId} onSelectConcursoId={setSelectedConcursoId} concursos={concursos} theme={theme} onToggleReorderMode={setIsReorderMode} onAddSession={addSession} />;
      case 'concursos':
        return <ConcursosView concursos={concursos} onUpdateConcursos={setConcursos} onSelectConcurso={(c) => { setSelectedConcursoId(c.id); setActiveTab('dashboard'); }} />;
      case 'subjects':
        return <SubjectsView subjects={activeConcurso?.subjects || []} sessions={sessions} onUpdateSubjects={(subs) => setConcursos(concursos.map(c => c.id === selectedConcursoId ? { ...c, subjects: subs } : c))} />;
      case 'questions':
        return <QuestionsView subjects={filteredSubjects} sessions={sessions} dailyGoals={dailyGoals} onUpdateDailyGoals={setDailyGoals} onAddSession={addSession} onDeleteSession={deleteSession} />;
      case 'simulados':
        return <SimuladosView subjects={filteredSubjects} simulados={simulados} onAddSimulado={addSimulado} onDeleteSimulado={deleteSimulado} />;
      case 'calendar':
        return <CalendarView subjects={filteredSubjects} scheduledStudies={scheduledStudies} onUpdateSchedule={setScheduledStudies} onDelete={deleteScheduledStudy} onAddSession={addSession} />;
      case 'ai-coach':
        return <AICoach onImportPlan={(aiSubs) => {
          const newConc: Concurso = { id: crypto.randomUUID(), name: "Plano IA", banca: "Sugerida", startDate: new Date().toISOString(), subjects: aiSubs };
          setConcursos([...concursos, newConc]);
          setSelectedConcursoId(newConc.id);
          setActiveTab('subjects');
        }} />;
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
        timerSeconds={timerSeconds} isTimerActive={isTimerActive} timerSubjectId={timerSubjectId} subjects={filteredSubjects}
        onToggleTimer={toggleTimer} onSetTimerSubject={setTimerSubjectId} onResetTimer={resetTimer}
        onAddSession={addSession} currentUser={currentUser} onLogout={handleLogout} onUpdateUser={updateProfile}
        isReorderMode={isReorderMode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
