'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StudioProject } from '../types/furniture';
import {
  getSavedProjects,
  saveProject,
  deleteProject,
  exportProjectAsJson,
  importProjectFromJson,
} from '../lib/project-storage';
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  Calendar,
  Layers,
  Box,
  Check,
  X,
  Search,
  FileJson,
  Sparkles,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: StudioProject;
  onLoadProject: (project: StudioProject) => void;
  onNewProject: (name: string, width: number, depth: number) => void;
}

export default function ProjectManagerModal({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
  onNewProject,
}: ProjectManagerModalProps) {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'import'>('list');
  const [newProjectName, setNewProjectName] = useState('Novo Projeto Studio');
  const [newWidth, setNewWidth] = useState(5.0);
  const [newDepth, setNewDepth] = useState(4.0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjects(getSavedProjects());
      setImportError(null);
      setImportSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o projeto "${name}"?`)) {
      deleteProject(id);
      setProjects(getSavedProjects());
    }
  };

  const handleDuplicate = (project: StudioProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const dupe: StudioProject = {
      ...project,
      id: `proj_${Date.now()}`,
      name: `${project.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProject(dupe);
    setProjects(getSavedProjects());
  };

  const handleExport = (project: StudioProject, e: React.MouseEvent) => {
    e.stopPropagation();
    exportProjectAsJson(project);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    onNewProject(newProjectName || 'Ambiente Sem Nome', newWidth, newDepth);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const imported = await importProjectFromJson(file);
      saveProject(imported);
      setProjects(getSavedProjects());
      setImportSuccess(true);
      setTimeout(() => {
        onLoadProject(imported);
        onClose();
      }, 700);
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar arquivo JSON.');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0f172a]/95 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <FolderOpen className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-headline tracking-wide uppercase text-white">
                Gerenciador de Projetos 3D
              </h2>
              <p className="text-[11px] text-white/50">
                Abra, crie, duplique ou faça backup de suas simulações
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-white/10 bg-white/[0.01]">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Layers className="size-3.5" /> Meus Projetos ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Plus className="size-3.5" /> Novo Projeto
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'import'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Upload className="size-3.5" /> Importar / Backup JSON
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative my-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-white/40" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary w-48"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: LIST PROJECTS */}
          {activeTab === 'list' && (
            <div>
              {filteredProjects.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <FolderOpen className="size-6 text-white/30" />
                  </div>
                  <h3 className="text-sm font-semibold text-white/80">Nenhum projeto encontrado</h3>
                  <p className="text-xs text-white/50 max-w-sm">
                    {searchTerm
                      ? `Nenhum resultado corresponde a "${searchTerm}".`
                      : 'Você ainda não salvou nenhum projeto. Salve a simulação atual ou crie um novo projeto.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all shadow-lg flex items-center gap-2"
                  >
                    <Plus className="size-3.5" /> Criar Primeiro Projeto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredProjects.map((proj) => {
                    const isCurrent = proj.id === currentProject.id;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          onLoadProject(proj);
                          onClose();
                        }}
                        className={`group relative rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isCurrent
                            ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/40'
                            : 'bg-white/[0.02] border-white/10 hover:border-primary/40 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="size-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/40 transition-colors flex-shrink-0">
                              <Box className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                                  {proj.name}
                                </h3>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono border border-primary/30">
                                    Ativo
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5 font-mono">
                                <Calendar className="size-2.5" /> {formatDate(proj.updatedAt || proj.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={(e) => handleExport(proj, e)}
                              className="size-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                              title="Baixar JSON"
                            >
                              <Download className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(proj, e)}
                              className="size-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                              title="Duplicar Projeto"
                            >
                              <Copy className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(proj.id, proj.name, e)}
                              className="size-7 rounded-md flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Excluir Projeto"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Project Specs summary */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono text-white/50">
                          <div>
                            Sala: <span className="text-white/80">{proj.room.width.toFixed(1)}m × {proj.room.depth.toFixed(1)}m</span>
                          </div>
                          <div className="text-right">
                            Móveis: <span className="text-primary font-bold">{proj.furniture.length} itens</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW PROJECT */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateNew} className="max-w-md mx-auto space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">Nome do Projeto / Simulação</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Cozinha Integrada Casa João"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Largura Inicial (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="20"
                    value={newWidth}
                    onChange={(e) => setNewWidth(parseFloat(e.target.value) || 2)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Profundidade Inicial (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="20"
                    value={newDepth}
                    onChange={(e) => setNewDepth(parseFloat(e.target.value) || 2)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="size-3.5" /> Criar e Abrir no Studio 3D
              </button>
            </form>
          )}

          {/* TAB 3: IMPORT / BACKUP JSON */}
          {activeTab === 'import' && (
            <div className="max-w-lg mx-auto space-y-6 py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-primary/60 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-white/[0.02] flex flex-col items-center gap-3 group"
              >
                <div className="size-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center border border-primary/30 transition-colors">
                  <FileJson className="size-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Clique para selecionar arquivo .json</h4>
                  <p className="text-[11px] text-white/50 mt-1">
                    Restaura ambientes, móveis, posições, dimensões e texturas PBR completas
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs text-center flex items-center justify-center gap-2">
                  <Check className="size-4" /> Projeto importado com sucesso! Abrindo...
                </div>
              )}

              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Exportar Projeto Ativo</h4>
                  <p className="text-[10px] text-white/40">Baixe o arquivo JSON do projeto atual para seu computador</p>
                </div>
                <button
                  onClick={() => exportProjectAsJson(currentProject)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all flex items-center gap-2 border border-white/10"
                >
                  <Download className="size-3.5" /> Baixar .JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
