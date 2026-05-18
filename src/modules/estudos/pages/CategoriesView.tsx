
import React, { useState } from 'react';
import { Category } from '../types';
import { COLORS } from '../constants';

interface CategoriesViewProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ categories, onUpdateCategories }) => {
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: newCatName,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
  };

  const deleteCategory = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria? Concursos associados ficarão sem categoria.')) {
      onUpdateCategories(categories.filter(c => c.id !== id));
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateCategories(categories.map(c => c.id === editingId ? { ...c, name: editName } : c));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Categorias de Concursos</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Organize seus planos de estudo por áreas.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-xl">
        <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-4">Nova Categoria</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome da categoria..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
          />
          <button
            onClick={addCategory}
            className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-colors"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              {editingId === cat.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-blue-300 dark:border-zinc-700 rounded bg-transparent text-zinc-800 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-emerald-500 font-bold">✓</button>
                  <button onClick={() => setEditingId(null)} className="text-rose-500 font-bold">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                  <h4 className="font-bold text-zinc-800 dark:text-white">{cat.name}</h4>
                </div>
              )}

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(cat)} className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300">
                  ✏️
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="text-zinc-400 hover:text-rose-500">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
            <p className="text-zinc-400 dark:text-zinc-500">Nenhuma categoria criada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesView;
