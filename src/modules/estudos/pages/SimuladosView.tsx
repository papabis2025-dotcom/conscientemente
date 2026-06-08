import React, { useState } from 'react';
import { Subject, Simulado, SimuladoSubjectResult } from '../types';
import { Edit2, Trash2, Clock, TrendingDown, Sparkles, UploadCloud, Loader2, AlertCircle, Trash, X } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface SimuladosViewProps {
  subjects: Subject[];
  simulados: Simulado[];
  onAddSimulado: (sim: Simulado) => void;
  onDeleteSimulado: (id: string) => void;
  onUpdateSimulado: (id: string, sim: Simulado) => void;
}

const SimuladosView: React.FC<SimuladosViewProps> = ({ subjects, simulados, onAddSimulado, onDeleteSimulado, onUpdateSimulado }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [results, setResults] = useState<SimuladoSubjectResult[]>([]);

  // Current subject being added to the list
  const [currentSubjectId, setCurrentSubjectId] = useState('');
  const [currentDone, setCurrentDone] = useState('');
  const [currentCorrect, setCurrentCorrect] = useState('');

  // AI & Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // API Key modal states
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  // Staging area for results extracted by AI, to review/map before saving
  const [extractedData, setExtractedData] = useState<{
    name: string;
    date: string;
    duration: string;
    results: Array<{
      subjectNameDetected: string;
      subjectId: string; // empty if unmatched
      done: number;
      correct: number;
    }>;
  } | null>(null);

  const addResultRow = () => {
    if (!currentSubjectId || !currentDone || !currentCorrect) return;
    const newRes: SimuladoSubjectResult = {
      subjectId: currentSubjectId,
      done: parseInt(currentDone),
      correct: parseInt(currentCorrect)
    };
    setResults([...results, newRes]);
    setCurrentSubjectId(''); setCurrentDone(''); setCurrentCorrect('');
  };

  const removeResultRow = (idx: number) => {
    setResults(results.filter((_, i) => i !== idx));
  };

  const handlePrepopulateWithMySubjects = () => {
    if (subjects.length === 0) {
      alert("Nenhuma disciplina cadastrada na guia de disciplinas.");
      return;
    }
    const newResults: SimuladoSubjectResult[] = subjects.map(s => ({
      subjectId: s.id,
      done: 0,
      correct: 0
    }));
    setResults(newResults);
  };

  const handleSave = () => {
    if (!name || results.length === 0) {
      alert("Dê um nome ao simulado e adicione pelo menos um resultado de matéria.");
      return;
    }

    const totalQuestions = results.reduce((acc, r) => acc + r.done, 0);
    const durationVal = parseInt(duration) || 0;

    if (editingId) {
      const updatedSim: Simulado = {
        id: editingId,
        name,
        date,
        totalQuestions,
        results,
        durationInMinutes: durationVal
      };
      onUpdateSimulado(editingId, updatedSim);
    } else {
      const newSim: Simulado = {
        id: crypto.randomUUID(),
        name,
        date,
        totalQuestions,
        results,
        durationInMinutes: durationVal
      };
      onAddSimulado(newSim);
    }

    handleCancel();
  };

  const handleEditClick = (sim: Simulado) => {
    setEditingId(sim.id);
    setName(sim.name);
    setDate(sim.date);
    setResults(sim.results || []);
    setDuration(sim.durationInMinutes?.toString() || '');
    setIsAdding(true);
  };

  const handleCancel = () => {
    setName('');
    setResults([]);
    setDuration('');
    setEditingId(null);
    setIsAdding(false);
    setExtractedData(null);
    setIsUploading(false);
  };

  // AI Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processImageFile(e.target.files[0]);
    }
  };

  const handleCancelUpload = () => {
    setIsUploading(false);
    setDragActive(false);
  };

  const handleSaveApiKeyFromModal = () => {
    if (!tempApiKey.trim()) return;
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    setShowKeyModal(false);
    alert('Chave de API salva com sucesso! Você pode realizar o upload agora.');
  };

  const processImageFile = async (file: File) => {
    const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GOOGLE_GENAI_KEY || '';
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    setIsLoadingAI(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Url = e.target?.result as string;
        if (!base64Url) {
          alert('Erro ao carregar a imagem.');
          setIsLoadingAI(false);
          return;
        }

        const commaIdx = base64Url.indexOf(',');
        const mimeType = base64Url.substring(base64Url.indexOf(':') + 1, base64Url.indexOf(';'));
        const base64Data = base64Url.substring(commaIdx + 1);

        const subjectsList = subjects.map(s => ({ id: s.id, name: s.name }));
        const response = await geminiService.parseSimuladoImage(base64Data, mimeType, subjectsList);

        if (response && response.results && response.results.length > 0) {
          setExtractedData({
            name: response.name || `Simulado via Print ${new Date().toLocaleDateString('pt-BR')}`,
            date: response.date || new Date().toISOString().split('T')[0],
            duration: '',
            results: response.results.map((res: any) => ({
              subjectNameDetected: res.subjectNameDetected,
              subjectId: res.subjectId || '',
              done: res.done || 0,
              correct: res.correct || 0
            }))
          });
          setIsUploading(false);
        } else {
          alert('Não foi possível identificar dados na imagem. Verifique a imagem, certifique-se de que a sua chave Gemini está salva e correta em configurações, e tente novamente.');
        }
        setIsLoadingAI(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao processar a imagem.');
      setIsLoadingAI(false);
    }
  };

  const handleConfirmExtracted = () => {
    if (!extractedData) return;
    
    // Check if any row has no selected subject
    const unmapped = extractedData.results.some(r => !r.subjectId);
    if (unmapped) {
      alert('Por favor, associe todas as disciplinas extraídas a uma matéria existente antes de salvar, ou remova-as.');
      return;
    }

    const totalQuestions = extractedData.results.reduce((acc, r) => acc + r.done, 0);
    const durationVal = parseInt(extractedData.duration) || 0;

    const mappedResults: SimuladoSubjectResult[] = extractedData.results.map(r => ({
      subjectId: r.subjectId,
      done: r.done,
      correct: r.correct
    }));

    const newSim: Simulado = {
      id: crypto.randomUUID(),
      name: extractedData.name,
      date: extractedData.date,
      totalQuestions,
      results: mappedResults,
      durationInMinutes: durationVal
    };

    onAddSimulado(newSim);
    setExtractedData(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.4), transparent);
          animation: scan 3s linear infinite;
        }
      `}</style>

      {/* Loading Overlay */}
      {isLoadingAI && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300 select-none">
          <div className="relative w-80 p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center text-center overflow-hidden">
            <div className="animate-scan" />
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-6 text-emerald-500 animate-bounce">
              <Sparkles size={28} className="animate-pulse" />
            </div>
            <h4 className="text-md font-black text-zinc-800 dark:text-white uppercase tracking-tight mb-2">Processando Boletim...</h4>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium leading-relaxed mb-4">
              A inteligência artificial está extraindo os acertos e mapeando as disciplinas.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <Loader2 size={12} className="animate-spin text-emerald-500" /> Por favor, aguarde
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-8 relative animate-in zoom-in-95">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4 text-amber-500">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-zinc-800 dark:text-white mb-2 uppercase tracking-tight">Chave da API Necessária</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium">
              Para extrair dados da imagem usando inteligência artificial, você precisa configurar uma Chave de API do Gemini. Ela é pessoal e 100% gratuita para uso individual.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Chave de API do Gemini</label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Cole sua chave AIzaSy..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-850 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">
                Você pode obter uma chave de forma simples e rápida no{" "}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline font-bold"
                >
                  Google AI Studio
                </a>.
              </p>
              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-zinc-450 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKeyFromModal}
                  disabled={!tempApiKey.trim()}
                  className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-emerald-600 disabled:opacity-50 transition-all"
                >
                  Salvar Chave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => handleCancelUpload()}
              className="absolute top-6 right-6 text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-2 uppercase tracking-tight flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500 animate-pulse" /> Importar via Imagem (IA)
            </h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
              Arraste e solte ou faça upload de um print/foto da tela do simulado que mostre as disciplinas e a quantidade de acertos. O Gemini irá preencher os dados para você revisar.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('image-upload-input')?.click()}
              className={`w-full min-h-[220px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 scale-[1.02]'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-400 transition-transform">
                <UploadCloud size={28} />
              </div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {dragActive ? 'Solte a imagem aqui!' : 'Arraste e solte a imagem ou clique para selecionar'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Suporta PNG, JPG, JPEG, WebP</p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleCancelUpload()}
                className="px-6 py-3 text-zinc-450 font-bold uppercase text-xs hover:text-zinc-650"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">
            Simulados Completos
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Avalie seu desempenho global em condições de prova.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { handleCancel(); setIsUploading(true); }}
            className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-white dark:text-zinc-200 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-700 shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <Sparkles size={14} className="text-amber-500 animate-pulse" /> Importar por Imagem (IA)
          </button>
          <button
            onClick={() => { handleCancel(); setIsAdding(true); }}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            + Novo Simulado
          </button>
        </div>
      </header>

      {/* Review Extracted Data Panel */}
      {extractedData && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in slide-in-from-top-4 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-500 animate-pulse" /> Revisar Importação por IA
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 font-medium">Verifique os resultados extraídos e mapeie-os para as suas matérias.</p>
            </div>
            <button
              onClick={() => setExtractedData(null)}
              className="text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-850 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Simulado</label>
              <input
                type="text"
                value={extractedData.name}
                onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data</label>
              <input
                type="date"
                value={extractedData.date}
                onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Tempo de Realização (minutos)</label>
              <input
                type="number"
                value={extractedData.duration}
                onChange={(e) => setExtractedData({ ...extractedData, duration: e.target.value })}
                placeholder="Ex: 180"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 mb-8">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Mapeamento de Disciplinas</h4>
            <div className="space-y-3">
              {extractedData.results.map((res, i) => {
                const subColor = subjects.find(s => s.id === res.subjectId)?.color;
                return (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Detectado na Imagem</span>
                      <p className="text-xs font-black dark:text-white">{res.subjectNameDetected}</p>
                    </div>

                    <div className="flex-1 min-w-[200px] flex items-center gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Mapear para a Matéria</span>
                        <div className="flex items-center gap-2">
                          {res.subjectId && <div className={`w-2 h-6 rounded-full ${subColor || 'bg-zinc-500'}`} />}
                          <select
                            value={res.subjectId}
                            onChange={(e) => {
                              const newRes = [...extractedData.results];
                              newRes[i].subjectId = e.target.value;
                              setExtractedData({ ...extractedData, results: newRes });
                            }}
                            className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs dark:text-white font-bold"
                          >
                            <option value="">Selecione a matéria correspondente...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto md:justify-end">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-mono">Questões</span>
                        <input
                          type="number"
                          value={res.done}
                          onChange={(e) => {
                            const newRes = [...extractedData.results];
                            newRes[i].done = parseInt(e.target.value) || 0;
                            setExtractedData({ ...extractedData, results: newRes });
                          }}
                          className="w-20 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs text-center dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-mono">Acertos</span>
                        <input
                          type="number"
                          value={res.correct}
                          onChange={(e) => {
                            const newRes = [...extractedData.results];
                            newRes[i].correct = parseInt(e.target.value) || 0;
                            setExtractedData({ ...extractedData, results: newRes });
                          }}
                          className="w-20 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs text-center dark:text-white font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newRes = extractedData.results.filter((_, idx) => idx !== i);
                          setExtractedData({ ...extractedData, results: newRes });
                        }}
                        className="text-rose-500 hover:text-rose-600 p-2 mt-4 md:mt-0 transition-colors"
                        title="Remover linha"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {extractedData.results.length === 0 && (
                <p className="text-center py-6 text-xs text-zinc-400 font-bold uppercase tracking-wider">Nenhuma linha extraída restante.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setExtractedData(null)}
              className="px-6 py-3 text-zinc-400 font-bold uppercase text-xs hover:text-zinc-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmExtracted}
              className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
            >
              Confirmar e Salvar Simulado
            </button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-6 uppercase tracking-tight">
            {editingId ? 'Editar Simulado' : 'Registro de Simulado'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Simulado</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Simulado Ciclo 1" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Tempo de Realização (minutos)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 180" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 mb-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Detalhamento por Disciplina</h4>
              <button 
                type="button"
                onClick={handlePrepopulateWithMySubjects}
                className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-all rounded-xl"
              >
                Preencher com minhas matérias
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={currentSubjectId}
                onChange={(e) => setCurrentSubjectId(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
              >
                <option value="">Matéria...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" value={currentDone} onChange={(e) => setCurrentDone(e.target.value)} placeholder="Total" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white" />
              <input type="number" value={currentCorrect} onChange={(e) => setCurrentCorrect(e.target.value)} placeholder="Acertos" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white" />
              <button type="button" onClick={addResultRow} className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase hover:bg-zinc-800 dark:hover:bg-zinc-600">Add</button>
            </div>

            <div className="space-y-2">
              {results.map((res, i) => {
                const sub = subjects.find(s => s.id === res.subjectId);
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-8 rounded-full shrink-0 ${sub?.color || 'bg-zinc-500'}`} />
                      <span className="text-xs font-black dark:text-white truncate">{sub?.name || 'Matéria desconhecida'}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Questões</span>
                        <input
                          type="number"
                          value={res.done === 0 ? '' : res.done}
                          onChange={(e) => {
                            const newResults = [...results];
                            newResults[i].done = parseInt(e.target.value) || 0;
                            setResults(newResults);
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-805 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs text-center dark:text-white font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Acertos</span>
                        <input
                          type="number"
                          value={res.correct === 0 ? '' : res.correct}
                          onChange={(e) => {
                            const newResults = [...results];
                            newResults[i].correct = parseInt(e.target.value) || 0;
                            setResults(newResults);
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-805 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs text-center dark:text-white font-mono"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeResultRow(i)} 
                        className="text-rose-500 hover:text-rose-600 p-1 font-bold text-xs"
                        title="Remover matéria"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleCancel} className="px-6 py-3 text-zinc-400 font-bold uppercase text-xs">Cancelar</button>
            <button type="button" onClick={handleSave} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all">
              {editingId ? 'Salvar Alterações' : 'Salvar Simulado'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(simulados || []).map(sim => {
          const totalDone = (sim.results || []).reduce((acc, r) => acc + (r.done || 0), 0);
          const totalCorrect = (sim.results || []).reduce((acc, r) => acc + (r.correct || 0), 0);
          const accuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

          return (
            <div key={sim.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-black text-zinc-800 dark:text-white leading-tight">{sim.name}</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{new Date(sim.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleEditClick(sim)} className="text-zinc-450 hover:text-blue-500 transition-colors p-1" title="Editar Simulado">
                    <Edit2 size={14} />
                  </button>
                  <button type="button" onClick={() => confirm('Excluir simulado?') && onDeleteSimulado(sim.id)} className="text-zinc-350 hover:text-rose-500 transition-colors p-1" title="Excluir Simulado">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-emerald-500">{accuracy}%</p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Aproveitamento Total</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{totalCorrect}/{totalDone}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 flex items-center justify-end gap-1 font-mono">
                    <Clock size={10} /> {sim.durationInMinutes ? `${sim.durationInMinutes} min` : '—'}
                  </p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Acertos/Questões</p>
                </div>
              </div>

              <div className="space-y-1 mt-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {(sim.results || []).map((res, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{subjects.find(s => s.id === res.subjectId)?.name}</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{res.done > 0 ? Math.round((res.correct / res.done) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {(simulados || []).length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center justify-center gap-3">
            <TrendingDown size={36} className="text-zinc-400" />
            <p className="font-black uppercase tracking-widest text-xs">Ainda não há simulados registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimuladosView;
