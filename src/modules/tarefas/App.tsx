import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, ListTodo, Archive, LayoutTemplate, Plus, Calendar as CalendarIcon, Clock, Tag, ArrowDownAZ, CalendarDays, Trash2, Check, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';

import { tarefasApi, Task } from './api';

const TarefasApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ativas' | 'arquivo'>('ativas');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_tarefas') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_tarefas', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Tarefa');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'none' | 'days' | 'monthly'>('none');
  const [newTaskRecurrenceValue, setNewTaskRecurrenceValue] = useState<number>(1);

  const [sortBy, setSortBy] = useState<'data' | 'alfabetica' | 'prioridade'>('prioridade');

  useEffect(() => {
    if (sessionStorage.getItem('openAddTaskModal') === 'true') {
      sessionStorage.removeItem('openAddTaskModal');
      setActiveTab('ativas');
      setTimeout(() => {
        const textareaEl = document.querySelector('textarea[placeholder="Ex: Ler livro, Comprar leite..."]');
        if (textareaEl) {
          (textareaEl as HTMLTextAreaElement).focus();
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await tarefasApi.list();
        setTasks(data);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
      dueDate: newTaskDate,
      dueTime: newTaskTime,
      category: newTaskCategory || 'Tarefa',
      createdAt: Date.now(),
      recurrenceType: newTaskRecurrence,
      recurrenceValue: newTaskRecurrenceValue
    };

    tarefasApi.create(newTask).catch(err => console.error('Error creating task:', err));
    setTasks(prev => [...prev, newTask]);
    setNewTaskText('');
    setNewTaskDate('');
    setNewTaskTime('');
    setNewTaskCategory('Tarefa');
    setNewTaskRecurrence('none');
    setNewTaskRecurrenceValue(1);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      
      const updatedTasks = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      
      if (!task.completed && task.recurrenceType && task.recurrenceType !== 'none' && task.dueDate) {
        let nextDate = new Date(`${task.dueDate}T12:00:00`);
        if (task.recurrenceType === 'days') {
          nextDate.setDate(nextDate.getDate() + (task.recurrenceValue || 1));
        } else if (task.recurrenceType === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        
        const nextDateStr = nextDate.toISOString().split('T')[0];
        const hasNext = prev.some(t => t.text === task.text && t.dueDate === nextDateStr && !t.completed);
        
        if (!hasNext) {
          const newRecurringTask: Task = {
            ...task,
            id: crypto.randomUUID(),
            completed: false,
            dueDate: nextDateStr,
            createdAt: Date.now()
          };
          updatedTasks.push(newRecurringTask);
          tarefasApi.create(newRecurringTask).catch(err => console.error('Error creating recurring task:', err));
        }
      }

      tarefasApi.update(id, { completed: !task.completed }).catch(err => console.error('Error updating task:', err));
      return updatedTasks;
    });
  };

  const deleteTask = (id: string) => {
    if(confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      tarefasApi.delete(id).catch(err => console.error('Error deleting task:', err));
    }
  };

  const filteredTasks = tasks.filter(t => activeTab === 'ativas' ? !t.completed : t.completed);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'alfabetica') {
      return a.text.localeCompare(b.text);
    } else if (sortBy === 'prioridade') {
      const priorityMap: Record<string, number> = { 'Urgente': 1, 'Importante': 2, 'Tarefa': 3 };
      const pA = priorityMap[a.category] || 4;
      const pB = priorityMap[b.category] || 4;
      if (pA !== pB) return pA - pB;
      // se mesma prioridade, desempata pela data
      return b.createdAt - a.createdAt;
    } else {
      if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt; // Newer first if no date
      if (!a.dueDate) return 1; // Tasks with no date go to the bottom
      if (!b.dueDate) return -1;
      
      const dateA = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
      const dateB = new Date(`${b.dueDate}T${b.dueTime || '23:59'}`).getTime();
      return dateA - dateB;
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(`${task.dueDate}T12:00:00`);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const noDateTasks: Task[] = [];

    sortedTasks.forEach(task => {
      if (!task.dueDate) {
        noDateTasks.push(task);
        return;
      }

      const parts = task.dueDate.split('-');
      const y = parts[0];
      const m = parts[1];
      const key = `${y}-${m}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    const sortedMonthKeys = Object.keys(groups).sort();

    return {
      months: sortedMonthKeys.map(key => {
        const [year, month] = key.split('-');
        const monthName = MONTH_NAMES[parseInt(month) - 1];
        return {
          key,
          title: `${monthName} de ${year}`,
          tasks: groups[key]
        };
      }),
      noDate: noDateTasks
    };
  }, [sortedTasks]);

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'Urgente': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10';
      case 'Importante': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10';
      case 'Tarefa': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10';
      default: return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
    }
  };

  const renderTaskItem = (task: Task) => (
    <li 
      key={task.id} 
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${task.completed ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/50 opacity-70' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
    >
      {/* Checkbox customizado */}
      <button 
        onClick={() => toggleTask(task.id)}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-transparent hover:border-rose-400'}`}
      >
        <Check size={14} strokeWidth={3} className={task.completed ? 'opacity-100' : 'opacity-0'} />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate transition-all ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-200'}`}>
          {task.text}
        </p>
        
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.category && (
            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getCategoryColor(task.category)}`}>
              {task.category}
            </span>
          )}
          {(task.dueDate || task.dueTime) && (
            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
              task.completed 
                ? 'text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50' 
                : isOverdue(task)
                  ? 'text-red-650 dark:text-red-400 bg-red-100 dark:bg-red-500/10 font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
            }`}>
              <CalendarIcon size={10} />
              {task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
              {task.dueDate && task.dueTime && ' • '}
              {task.dueTime}
              {!task.completed && isOverdue(task) && ' (Atrasada)'}
            </span>
          )}
          {task.recurrenceType && task.recurrenceType !== 'none' && (
            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${task.completed ? 'text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50' : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10'}`}>
              <Repeat size={10} />
              {task.recurrenceType === 'days' ? `A cada ${task.recurrenceValue} dias` : 'Mensalmente'}
            </span>
          )}
        </div>
      </div>

      <button 
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-all"
        title="Excluir tarefa"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-rose-200 dark:selection:bg-rose-900/50">
      
      {/* Sidebar Lateral */}
      <aside className={`relative ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className={`flex items-center gap-3 text-rose-500 mb-8 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <CheckSquare size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Tarefas
              </span>
            )}
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('ativas')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'ativas' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Ativas' : ''}
            >
              <div className="flex items-center gap-3">
                <ListTodo size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Ativas</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'ativas' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                  {tasks.filter(t => !t.completed).length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('arquivo')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'arquivo' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Arquivo' : ''}
            >
              <div className="flex items-center gap-3">
                <Archive size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Arquivo</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'arquivo' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                  {tasks.filter(t => t.completed).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-5 mt-auto">
          <button 
            onClick={() => window.location.hash = ''} 
            className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'p-3' : 'gap-2 py-3 px-4'} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider`}
            title="Voltar ao Hub"
          >
            <LayoutTemplate size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>
      </aside>

      {/* Área Principal (Sem rolagem global de tela) */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col bg-transparent">
        <div className="flex-1 flex gap-6 h-full overflow-hidden max-w-6xl mx-auto w-full">
          
          {/* Caixa de Criação de Tarefas (Só ativa se ativo tab de 'ativas') */}
          {activeTab === 'ativas' ? (
            <div className="w-[360px] flex-shrink-0 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-5 shadow-xl shadow-zinc-200/5 dark:shadow-black/20 justify-between h-[480px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                    <CheckSquare size={18} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Nova Tarefa</h3>
                </div>

                <form onSubmit={handleAddTask} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">O que precisa ser feito?</label>
                    <textarea 
                      placeholder="Ex: Ler livro, Comprar leite..." 
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      className="w-full text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none h-20"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data Limite</label>
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rose-500">
                        <div className="pl-2.5 text-zinc-400"><CalendarIcon size={13} /></div>
                        <input 
                          type="date" 
                          value={newTaskDate}
                          onChange={(e) => setNewTaskDate(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs p-2 text-zinc-700 dark:text-zinc-300 cursor-pointer w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Hora</label>
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rose-500">
                        <div className="pl-2.5 text-zinc-400"><Clock size={13} /></div>
                        <input 
                          type="time" 
                          value={newTaskTime}
                          onChange={(e) => setNewTaskTime(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs p-2 text-zinc-700 dark:text-zinc-300 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Prioridade</label>
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rose-500">
                      <div className="pl-2.5 text-zinc-400"><Tag size={13} /></div>
                      <select 
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs p-2 transition-all text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer w-full"
                      >
                        <option value="Tarefa">Tarefa (Normal)</option>
                        <option value="Importante">Importante</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Repetição</label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rose-500">
                        <div className="pl-2.5 text-zinc-400"><Repeat size={13} /></div>
                        <select 
                          value={newTaskRecurrence}
                          onChange={(e) => setNewTaskRecurrence(e.target.value as any)}
                          className="bg-transparent border-none outline-none text-xs p-2 transition-all text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer w-full"
                        >
                          <option value="none">S/ Repetição</option>
                          <option value="days">A cada dias</option>
                          <option value="monthly">Mensalmente</option>
                        </select>
                      </div>
                      {newTaskRecurrence === 'days' && (
                        <input 
                          type="number" 
                          min="1"
                          value={newTaskRecurrenceValue}
                          onChange={(e) => setNewTaskRecurrenceValue(parseInt(e.target.value) || 1)}
                          className="w-16 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-center text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                          title="Dias"
                        />
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!newTaskText.trim()}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wider active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-3 shadow-md shadow-rose-500/10"
                  >
                    <Plus size={16} strokeWidth={3} /> Criar Tarefa
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="w-[360px] flex-shrink-0 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-5 shadow-xl shadow-zinc-200/5 dark:shadow-black/20 justify-between h-[260px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <Archive size={18} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Arquivo</h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Aqui ficam guardadas as tarefas concluídas. Se quiser liberar espaço permanentemente, você pode limpar o arquivo abaixo.
                </p>
              </div>
              
              {tasks.some(t => t.completed) && (
                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todo o arquivo?')) {
                      setTasks(prev => prev.filter(t => !t.completed));
                      tarefasApi.clearCompleted().catch(err => console.error('Error clearing tasks:', err));
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs uppercase tracking-wider font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-colors border border-rose-500"
                >
                  <Trash2 size={16} /> Limpar Arquivo
                </button>
              )}
            </div>
          )}

          {/* Coluna Direita: Lista Inteligente */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/5 dark:shadow-black/20 overflow-hidden h-full">
            
            {/* Header da Lista */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0">
              <h2 className="font-black uppercase tracking-widest text-zinc-400 text-xs">
                {activeTab === 'ativas' ? 'Lista Inteligente' : 'Tarefas Concluídas'}
              </h2>
              
              <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
                <button 
                  onClick={() => setSortBy('prioridade')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-colors ${sortBy === 'prioridade' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <Tag size={12} /> Prioridade
                </button>
                <button 
                  onClick={() => setSortBy('data')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-colors ${sortBy === 'data' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <CalendarDays size={12} /> Data
                </button>
                <button 
                  onClick={() => setSortBy('alfabetica')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-colors ${sortBy === 'alfabetica' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <ArrowDownAZ size={12} /> A-Z
                </button>
              </div>
            </div>

            {/* Lista com Scroll Interno para evitar rolagem da página */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-55">
                  <CheckSquare size={44} className="mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                  <p className="text-sm font-semibold">{activeTab === 'ativas' ? 'Nenhuma tarefa pendente.' : 'O arquivo está vazio.'}</p>
                  {activeTab === 'ativas' && <p className="text-xs text-zinc-400 mt-1">Sua mente está livre!</p>}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Grupos de Meses */}
                  {groupedTasks.months.map(group => (
                    <div key={group.key} className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-500 dark:text-rose-450">
                        <CalendarIcon size={13} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider">{group.title} ({group.tasks.length})</h4>
                      </div>
                      <ul className="space-y-2">
                        {group.tasks.map(renderTaskItem)}
                      </ul>
                    </div>
                  ))}

                  {/* Grupo: Sem Data */}
                  {groupedTasks.noDate.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                        <ListTodo size={13} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider">Sem Data Limite ({groupedTasks.noDate.length})</h4>
                      </div>
                      <ul className="space-y-2">
                        {groupedTasks.noDate.map(renderTaskItem)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default TarefasApp;
