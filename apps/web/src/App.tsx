import { useState, useEffect } from 'react'
import { PDSAWizard } from './components/PDSAWizard'
import { PDSABoard } from './components/PDSABoard'
import { NewProjectDialog } from './components/NewProjectDialog'
import { EditProjectDialog } from './components/EditProjectDialog'
import { Activity, LayoutDashboard, PlusCircle, FolderKanban, Loader2, PencilLine, Trash2, MoreVertical, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from './lib/utils'

interface Project {
  id: number
  name: string
  description?: string
  cycle_count: number
}

function App() {
  const [view, setView] = useState<'wizard' | 'board'>('board')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [showProjectMenu, setShowProjectMenu] = useState(false)

  const fetchProjects = () => {
    setLoadingProjects(true)
    fetch('http://localhost:8001/api/v1/projects/')
      .then(res => res.json())
      .then(data => {
        setProjects(data)
        // Auto-select first project if none selected
        if (!selectedProject && data.length > 0) {
          setSelectedProject(data[0])
        }
        setLoadingProjects(false)
      })
      .catch(err => {
        console.error("Erro ao buscar projetos:", err)
        setLoadingProjects(false)
      })
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleUpdateProject = async (id: number, name: string, description: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      if (!response.ok) throw new Error('Falha ao atualizar projeto')
      const project = await response.json()
      setSelectedProject(project)
      setEditingProject(null)
      fetchProjects()
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar projeto.')
    }
  }

  const handleDeleteProject = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/projects/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Falha ao excluir projeto')
      setDeletingProject(null)
      setShowProjectMenu(false)
      // Se o projeto excluído era o selecionado, seleciona outro
      if (selectedProject?.id === id) {
        setSelectedProject(null)
      }
      fetchProjects()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir projeto.')
    }
  }

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      if (!response.ok) throw new Error('Falha ao criar projeto')
      const project = await response.json()
      setSelectedProject(project)
      setShowNewProject(false)
      fetchProjects()
    } catch (err) {
      console.error(err)
      alert('Erro ao criar projeto.')
    }
  }

  const handleNewCycle = () => {
    if (!selectedProject) {
      alert('Selecione ou crie um projeto primeiro.')
      return
    }
    setView('wizard')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center mx-auto px-4">
          <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer" onClick={() => setView('board')}>
            <Activity className="w-8 h-8" />
            <span>PDSA-Flow AI</span>
          </div>

          {/* Project Selector */}
          <div className="ml-8 flex items-center gap-1">
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
            <select
              className="text-sm font-medium bg-transparent border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const id = parseInt(e.target.value)
                if (id) {
                  const project = projects.find(p => p.id === id)
                  setSelectedProject(project || null)
                }
              }}
            >
              {loadingProjects ? (
                <option>Carregando...</option>
              ) : projects.length === 0 ? (
                <option value="">Nenhum projeto</option>
              ) : (
                projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.cycle_count})
                  </option>
                ))
              )}
            </select>
            <button
              onClick={() => setShowNewProject(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-primary transition-colors"
              title="Novo Projeto"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
            
            {/* Project Actions Menu */}
            {selectedProject && (
              <div className="relative">
                <button
                  onClick={() => setShowProjectMenu(!showProjectMenu)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-primary transition-colors"
                  title="Ações do Projeto"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showProjectMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                      <button
                        onClick={() => { setEditingProject(selectedProject); setShowProjectMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <PencilLine className="w-4 h-4" /> Renomear
                      </button>
                      <button
                        onClick={() => { setDeletingProject(selectedProject); setShowProjectMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" /> Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <nav className="ml-auto flex items-center gap-6 text-sm font-medium">
            <button 
              onClick={() => setView('board')}
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-primary",
                view === 'board' ? "text-primary underline underline-offset-4" : ""
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Quadro
            </button>
            <button 
              onClick={handleNewCycle}
              disabled={!selectedProject}
              className={cn(
                "flex items-center gap-2 transition-colors",
                view === 'wizard' ? "text-primary underline underline-offset-4" : "",
                !selectedProject ? "opacity-50 cursor-not-allowed" : "hover:text-primary"
              )}
            >
              <PlusCircle className="w-4 h-4" /> Novo Ciclo
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        {!selectedProject && projects.length === 0 && !loadingProjects ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <FolderKanban className="w-16 h-16 text-muted-foreground/40" />
            <h2 className="text-xl font-bold text-slate-700">Nenhum projeto ainda</h2>
            <p className="text-sm text-muted-foreground">Crie um projeto para começar seus ciclos PDSA</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm"
            >
              <PlusCircle className="w-4 h-4 inline mr-1" /> Criar Projeto
            </button>
          </div>
        ) : view === 'wizard' && selectedProject ? (
          <PDSAWizard projectId={selectedProject.id} onComplete={() => setView('board')} />
        ) : (
          <PDSABoard 
            projectId={selectedProject?.id} 
            onCreateNew={handleNewCycle}
            onProjectChange={fetchProjects}
          />
        )}
      </main>

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onConfirm={handleCreateProject}
      />

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onConfirm={handleUpdateProject}
      />

      {/* Delete Project Confirmation */}
      <div className={cn("fixed inset-0 z-50 flex items-center justify-center", deletingProject ? "" : "hidden")}>
        <div className="fixed inset-0 bg-black/40" onClick={() => setDeletingProject(null)} />
        <div className="relative z-50 bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Excluir projeto?</h3>
              <p className="text-xs text-red-500 mt-1">
                Todos os ciclos PDSA deste projeto serão excluídos permanentemente.
              </p>
            </div>
          </div>
          {deletingProject && (
            <p className="text-sm text-slate-600">
              <strong>{deletingProject.name}</strong> — {deletingProject.cycle_count} ciclo(s)
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeletingProject(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={() => deletingProject && handleDeleteProject(deletingProject.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Excluir Definitivamente
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 md:px-8 md:py-0 border-t bg-white">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Desenvolvido para melhoria contínua com rigor estatístico.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
