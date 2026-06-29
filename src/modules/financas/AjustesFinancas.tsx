import React, { useState } from 'react';
import { FinCategoria } from './App';
import { Plus, Trash2 } from 'lucide-react';

interface AjustesFinancasProps {
  inCategories: FinCategoria[];
  setInCategories: React.Dispatch<React.SetStateAction<FinCategoria[]>>;
  outCategories: FinCategoria[];
  setOutCategories: React.Dispatch<React.SetStateAction<FinCategoria[]>>;
  paymentMethods: FinCategoria[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<FinCategoria[]>>;
}

const AjustesList: React.FC<{
  title: string;
  items: FinCategoria[];
  setItems: React.Dispatch<React.SetStateAction<FinCategoria[]>>;
}> = ({ title, items, setItems }) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newItem: FinCategoria = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      color: newColor
    };
    setItems(prev => [...prev, newItem]);
    setNewName('');
  };

  const handleRemove = (id: string) => {
    if (confirm('Remover esta categoria/forma de pagamento?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleColorChange = (id: string, color: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, color } : item));
  };

  const handleNameChange = (id: string, name: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, name } : item));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100 mb-4">{title}</h3>
      
      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <input 
              type="color" 
              value={item.color} 
              onChange={e => handleColorChange(item.id, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <input 
              type="text" 
              value={item.name} 
              onChange={e => handleNameChange(item.id, e.target.value)}
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button onClick={() => handleRemove(item.id)} className="text-zinc-400 hover:text-rose-500 transition-colors p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <input 
          type="color" 
          value={newColor} 
          onChange={e => setNewColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
        />
        <input 
          type="text" 
          placeholder="Novo item..." 
          value={newName} 
          onChange={e => setNewName(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-400 dark:text-white"
        />
        <button type="submit" disabled={!newName.trim()} className="bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 text-white rounded-xl p-2 transition-colors disabled:opacity-50">
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
};

const AjustesFinancas: React.FC<AjustesFinancasProps> = ({ inCategories, setInCategories, outCategories, setOutCategories, paymentMethods, setPaymentMethods }) => {
  return (
    <div className="max-w-[1000px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AjustesList title="Categorias de Entrada" items={inCategories} setItems={setInCategories} />
        <AjustesList title="Categorias de Saída" items={outCategories} setItems={setOutCategories} />
        <AjustesList title="Formas de Pagamento" items={paymentMethods} setItems={setPaymentMethods} />
      </div>
    </div>
  );
};

export default AjustesFinancas;
