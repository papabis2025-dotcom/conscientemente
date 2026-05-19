import React, { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, Archive, LayoutTemplate, Plus, Calendar as CalendarIcon, Clock, Tag, ArrowDownAZ, CalendarDays, Trash2, Check, Repeat } from 'lucide-react';

import { tarefasApi, Task } from './api';

const TarefasApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ativas' | 'arquivo'>('ativas');
  
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

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'Urgente': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10';
      case 'Importante': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10';
      case 'Tarefa': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10';
      default: return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
    }
  };

  return (
    <div className="flex h-screen bg-[#fdfdfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-rose-200 dark:selection:bg-rose-900/50">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 text-rose-500 mb-8">
            <CheckSquare size={28} className="drop-shadow-sm" />
            <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">Tarefas</span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('ativas')} 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-semibold ${activeTab === 'ativas' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
            >
              <div className="flex items-center gap-3"><ListTodo size={20} /> Ativas</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'ativas' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                {tasks.filter(t => !t.completed).length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('arquivo')} 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-semibold ${activeTab === 'arquivo' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
            >
              <div className="flex items-center gap-3"><Archive size={20} /> Arquivo</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'arquivo' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                {tasks.filter(t => t.completed).length}
              </span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <button onClick={() => window.location.hash = ''} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider">
            <LayoutTemplate size={18} /> Voltar ao Hub
          </button>
        </div>
      </aside>

      {/* Área Principal (Estilo Bloco de Notas) */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto min-h-full bg-white dark:bg-[#121214] shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border-x border-zinc-200 dark:border-zinc-800/50">
          
          {/* Cabeçalho de Criação (Só aparece em Ativas) */}
          {activeTab === 'ativas' && (
            <div className="bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-6 sticky top-0 z-10">
              <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="O que precisa ser feito?" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-0 p-0 text-zinc-800 dark:text-zinc-100"
                  autoFocus
                />
                
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-500 transition-shadow">
                    <div className="pl-3 text-zinc-400"><CalendarIcon size={16} /></div>
                    <input 
                      type="date" 
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm p-2 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-500 transition-shadow">
                    <div className="pl-3 text-zinc-400"><Clock size={16} /></div>
                    <input 
                      type="time" 
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm p-2 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-500 transition-shadow">
                    <div className="pl-3 text-zinc-400"><Tag size={16} /></div>
                    <select 
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm p-2 transition-all text-zinc-600 dark:text-zinc-300 font-medium cursor-pointer"
                    >
                      <option value="Tarefa">Tarefa</option>
                      <option value="Importante">Importante</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-500 transition-shadow">
                      <div className="pl-3 text-zinc-400"><Repeat size={16} /></div>
                      <select 
                        value={newTaskRecurrence}
                        onChange={(e) => setNewTaskRecurrence(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-sm p-2 transition-all text-zinc-600 dark:text-zinc-300 font-medium cursor-pointer"
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
                        className="w-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm text-center text-zinc-600 dark:text-zinc-300 focus:ring-2 focus:ring-rose-500 outline-none"
                        title="Dias"
                      />
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={!newTaskText.trim()}
                    className="ml-auto bg-rose-500 hover:bg-rose-600 text-white p-2.5 rounded-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-[#121214]">
            <div className="flex items-center gap-4">
              <h2 className="font-bold uppercase tracking-widest text-zinc-400 text-sm">
                {activeTab === 'ativas' ? 'Pendentes' : 'Concluídas'}
              </h2>
              {activeTab === 'arquivo' && tasks.some(t => t.completed) && (
                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todo o arquivo?')) {
                      setTasks(prev => prev.filter(t => !t.completed));
                      tarefasApi.clearCompleted().catch(err => console.error('Error clearing tasks:', err));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors border border-rose-500"
                >
                  <Trash2 size={14} /> Limpar Arquivo
                </button>
              )}
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
              <button 
                onClick={() => setSortBy('prioridade')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortBy === 'prioridade' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <Tag size={14} /> Por Prioridade
              </button>
              <button 
                onClick={() => setSortBy('data')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortBy === 'data' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <CalendarDays size={14} /> Por Data
              </button>
              <button 
                onClick={() => setSortBy('alfabetica')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortBy === 'alfabetica' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <ArrowDownAZ size={14} /> Alfabética
              </button>
            </div>
          </div>

          {/* Lista de Tarefas */}
          <div className="p-6">
            {sortedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <CheckSquare size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                <p className="text-lg font-medium">{activeTab === 'ativas' ? 'Nenhuma tarefa pendente.' : 'O arquivo está vazio.'}</p>
                {activeTab === 'ativas' && <p className="text-sm mt-1">Sua mente está livre!</p>}
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedTasks.map(task => (
                  <li 
                    key={task.id} 
                    className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${task.completed ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/50 opacity-70' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
                  >
                    {/* Checkbox customizado */}
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-transparent hover:border-rose-400'}`}
                    >
                      <Check size={16} strokeWidth={3} className={task.completed ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-semibold truncate transition-all ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {task.text}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {task.category && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                        )}
                        {(task.dueDate || task.dueTime) && (
                          <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ${task.completed ? 'text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50' : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'}`}>
                            <CalendarIcon size={12} />
                            {task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
                            {task.dueDate && task.dueTime && ' • '}
                            {task.dueTime}
                          </span>
                        )}
                        {task.recurrenceType && task.recurrenceType !== 'none' && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${task.completed ? 'text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50' : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10'}`}>
                            <Repeat size={12} />
                            {task.recurrenceType === 'days' ? `A cada ${task.recurrenceValue} dias` : 'Mensalmente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-all"
                      title="Excluir tarefa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default TarefasApp;
