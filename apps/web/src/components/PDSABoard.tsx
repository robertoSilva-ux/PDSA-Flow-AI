import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Target, BarChart3, Lightbulb, ClipboardList, Play, Search, Zap, Plus, PencilLine, CheckCircle2, Loader2, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, HelpCircle, ArrowBigUp, RefreshCw, Trash2, StepForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface PDSACycle {
  id: number;
  aim: string;
  measure: string;
  change_idea: string;
  selected_hypothesis: string;
  selected_rationale: string;
  user_observations: string;
  do_observations?: string;
  do_data_collected?: string;
  study_analysis?: string;
  study_hypothesis_confirmed?: string;
  act_decision?: string;
  act_notes?: string;
  act_next_steps?: string;
  status: string;
  created_at: string;
}

interface PDSABoardProps {
    projectId?: number;
    onCreateNew?: () => void;
    onProjectChange?: () => void;
}

export const PDSABoard: React.FC<PDSABoardProps> = ({ projectId, onCreateNew, onProjectChange }) => {
  const [cycles, setCycles] = useState<PDSACycle[]>([])
  const [loading, setLoading] = useState(true)
  
  // Execution (DO) State
  const [editingCycle, setEditingCycle] = useState<PDSACycle | null>(null)
  const [doObservations, setDoObservations] = useState('')
  const [doData, setDoData] = useState('')
  const [isSavingDo, setIsSavingDo] = useState(false)

  // Study State
  const [studyingCycle, setStudyingCycle] = useState<PDSACycle | null>(null)
  const [studyAnalysis, setStudyAnalysis] = useState('')
  const [hypothesisConfirmed, setHypothesisConfirmed] = useState('')
  const [isAnalyzingStudy, setIsAnalyzingStudy] = useState(false)
  const [isSavingStudy, setIsSavingStudy] = useState(false)

  // Act State
  const [actingCycle, setActingCycle] = useState<PDSACycle | null>(null)
  const [actDecision, setActDecision] = useState('')
  const [actNotes, setActNotes] = useState('')
  const [actNextSteps, setActNextSteps] = useState('')
  const [isRecommendingAct, setIsRecommendingAct] = useState(false)
  const [isSavingAct, setIsSavingAct] = useState(false)

  // Estado de Exclusão
  const [deletingCycleId, setDeletingCycleId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Estado de Reset de Etapa
  const [isResetting, setIsResetting] = useState(false)

  const fetchCycles = useCallback(() => {
    setLoading(true)
    const url = projectId
      ? `http://localhost:8001/api/v1/plan/list?project_id=${projectId}`
      : 'http://localhost:8001/api/v1/plan/list'
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setCycles(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Erro ao buscar ciclos:", err)
        setLoading(false)
      })
  }, [projectId])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  // --- DO Handlers ---
  const handleOpenDo = (cycle: PDSACycle) => {
      setEditingCycle(cycle)
      setDoObservations(cycle.do_observations || '')
      setDoData(cycle.do_data_collected || '')
  }

  const handleSaveDo = async () => {
      if (!editingCycle) return
      setIsSavingDo(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${editingCycle.id}/do`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  do_observations: doObservations,
                  do_data_collected: doData
              })
          })
          if (!response.ok) throw new Error("Falha ao salvar execução")
          setEditingCycle(null)
          fetchCycles()
      } catch (err) {
          console.error(err)
          alert("Erro ao salvar execução.")
      } finally {
          setIsSavingDo(false)
      }
  }

  // --- STUDY Handlers ---
  const handleOpenStudy = (cycle: PDSACycle) => {
      setStudyingCycle(cycle)
      setStudyAnalysis(cycle.study_analysis || '')
      setHypothesisConfirmed(cycle.study_hypothesis_confirmed || 'partial')
  }

  const handleAIStudyAnalysis = async () => {
      if (!studyingCycle) return
      setIsAnalyzingStudy(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${studyingCycle.id}/study/analyze`, {
              method: 'POST'
          })
          if (!response.ok) throw new Error("Falha na análise da IA")
          const data = await response.json()
          setStudyAnalysis(data.analysis)
          setHypothesisConfirmed(data.confirmed)
      } catch (err) {
          console.error(err)
          alert("Erro na análise da IA para o estudo.")
      } finally {
          setIsAnalyzingStudy(false)
      }
  }

  const handleSaveStudy = async () => {
      if (!studyingCycle) return
      setIsSavingStudy(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${studyingCycle.id}/study`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  study_analysis: studyAnalysis,
                  study_hypothesis_confirmed: hypothesisConfirmed
              })
          })
          if (!response.ok) throw new Error("Falha ao salvar estudo")
          setStudyingCycle(null)
          fetchCycles()
      } catch (err) {
          console.error(err)
          alert("Erro ao salvar o estudo.")
      } finally {
          setIsSavingStudy(false)
      }
  }

  // --- ACT Handlers ---
  const handleOpenAct = (cycle: PDSACycle) => {
      setActingCycle(cycle)
      setActDecision(cycle.act_decision || 'adapt')
      setActNotes(cycle.act_notes || '')
      setActNextSteps(cycle.act_next_steps || '')
  }

  const handleAIActRecommend = async () => {
      if (!actingCycle) return
      setIsRecommendingAct(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${actingCycle.id}/act/recommend`, {
              method: 'POST'
          })
          if (!response.ok) throw new Error("Falha na recomendação da IA")
          const data = await response.json()
          setActDecision(data.decision)
          setActNotes(data.reasoning)
          setActNextSteps(data.next_steps)
      } catch (err) {
          console.error(err)
          alert("Erro na recomendação da IA para a decisão.")
      } finally {
          setIsRecommendingAct(false)
      }
  }

  const handleSaveAct = async () => {
      if (!actingCycle) return
      setIsSavingAct(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${actingCycle.id}/act`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  act_decision: actDecision,
                  act_notes: actNotes,
                  act_next_steps: actNextSteps
              })
          })
          if (!response.ok) throw new Error("Falha ao salvar decisão")
          setActingCycle(null)
          fetchCycles()
      } catch (err) {
          console.error(err)
          alert("Erro ao salvar a decisão.")
      } finally {
          setIsSavingAct(false)
      }
  }

  // --- Handlers de EXCLUSÃO ---
  const handleDeleteCycle = async () => {
      if (!deletingCycleId) return
      setIsDeleting(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${deletingCycleId}`, {
              method: 'DELETE'
          })
          if (!response.ok) {
              const data = await response.json()
              throw new Error(data.detail || "Falha ao excluir ciclo")
          }
          setDeletingCycleId(null)
          fetchCycles()
      } catch (err: any) {
          console.error(err)
          alert(err.message || "Erro ao excluir ciclo.")
      } finally {
          setIsDeleting(false)
      }
  }

  const handleResetPhase = async (cycleId: number, phase: 'do' | 'study') => {
      if (!window.confirm(`Deseja realmente excluir os dados da etapa ${phase.toUpperCase()}?`)) return
      setIsResetting(true)
      try {
          const response = await fetch(`http://localhost:8001/api/v1/plan/${cycleId}/reset/${phase}`, {
              method: 'POST'
          })
          if (!response.ok) throw new Error("Falha ao resetar etapa")
          fetchCycles()
      } catch (err) {
          console.error(err)
          alert("Erro ao excluir etapa.")
      } finally {
          setIsResetting(false)
      }
  }

  if (loading && cycles.length === 0) return <div className="p-8 text-center">Carregando quadro...</div>

  const mainCycle = cycles[0]
  if (!mainCycle && !loading) return <div className="p-8 text-center">Nenhum ciclo encontrado. Comece criando um novo!</div>

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header with action */}
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quadro de Melhoria</h1>
            <p className="text-muted-foreground">Histórico de ciclos e aprendizados acumulados.</p>
        </div>
        <Button onClick={onCreateNew} className="gap-2 h-11 px-6">
            <Plus className="w-5 h-5" /> Novo Ciclo
        </Button>
      </div>

      {/* 1. Model for Improvement Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
              <Target className="w-4 h-4" /> Objetivo (Aim)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700">{mainCycle?.aim}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-blue-500 uppercase tracking-widest">
              <BarChart3 className="w-4 h-4" /> Medição (Measure)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700">{mainCycle?.measure}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-amber-500 uppercase tracking-widest">
              <Lightbulb className="w-4 h-4" /> Mudança (Change)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700">{mainCycle?.change_idea}</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. PDSA Cycles Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 border-r border-slate-200 w-48 text-left font-bold text-xs uppercase text-slate-500 tracking-wider">Fases do PDSA</th>
              {cycles.slice().reverse().map((cycle, index) => (
                <th key={cycle.id} className="p-4 border-r border-slate-200 min-w-[320px] text-center font-bold text-primary group/header relative">
                  <div className="flex flex-col items-center">
                    <span>Ciclo {index + 1}</span>
                    <div className="text-[10px] font-normal text-slate-400 mt-1 uppercase tracking-tighter">
                        Iniciado em {new Date(cycle.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {cycle.status !== 'act' && (
                    <button 
                        onClick={() => setDeletingCycleId(cycle.id)}
                        className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover/header:opacity-100"
                        title="Excluir Ciclo"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* PLAN ROW */}
            <tr className="border-b border-slate-100">
              <td className="p-6 border-r border-slate-200 bg-slate-50/50">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <ClipboardList className="w-4 h-4" /> PLAN
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Hipótese e Refinamento</span>
                </div>
              </td>
              {cycles.slice().reverse().map((cycle) => (
                <td key={cycle.id} className="p-6 border-r border-slate-100 align-top">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800 leading-snug italic">"{cycle.selected_hypothesis}"</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {cycle.user_observations || cycle.selected_rationale}
                        </p>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* DO ROW */}
            <tr className="border-b border-slate-100 group">
              <td className="p-6 border-r border-slate-200 bg-slate-50/50">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                        <Play className="w-4 h-4" /> DO
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Execução e Coleta</span>
                </div>
              </td>
              {cycles.slice().reverse().map((cycle) => (
                <td key={cycle.id} className="p-6 border-r border-slate-100 align-top relative">
                  {cycle.status === 'plan' ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-3">
                          <div className="text-[11px] text-slate-400 italic">Aguardando execução...</div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 border-dashed border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                            onClick={() => handleOpenDo(cycle)}
                          >
                              <PencilLine className="w-3.5 h-3.5" /> Registrar Execução
                          </Button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-[10px] font-bold text-green-700 uppercase">Executado</span>
                            </div>
                            {cycle.status !== 'act' && (
                                <button 
                                    onClick={() => handleResetPhase(cycle.id, 'do')}
                                    className="p-1 text-slate-300 hover:text-red-500 rounded"
                                    title="Excluir dados desta etapa"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] text-slate-700 font-medium leading-relaxed line-clamp-3">
                                <span className="text-slate-400 block mb-1">OBSERVAÇÕES:</span>
                                {cycle.do_observations}
                            </p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] h-7 px-2 text-slate-400 hover:text-primary"
                            onClick={() => handleOpenDo(cycle)}
                        >
                            Editar
                        </Button>
                      </div>
                  )}
                </td>
              ))}
            </tr>

            {/* STUDY ROW */}
            <tr className="border-b border-slate-100">
              <td className="p-6 border-r border-slate-200 bg-slate-50/50">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                        <Search className="w-4 h-4" /> STUDY
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Análise de Dados</span>
                </div>
              </td>
              {cycles.slice().reverse().map((cycle) => (
                <td key={cycle.id} className="p-6 border-r border-slate-100 align-top">
                   {cycle.status === 'plan' ? (
                       <div className="flex items-center justify-center h-full min-h-[100px] opacity-30">
                           <p className="text-[11px] text-slate-400 italic">Bloqueado</p>
                       </div>
                   ) : cycle.status === 'do' ? (
                       <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-3">
                            <div className="text-[11px] text-slate-400 italic text-center">Dados coletados.<br/>Inicie o estudo.</div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                onClick={() => handleOpenStudy(cycle)}
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Estudar Resultados
                            </Button>
                        </div>
                   ) : (
                       <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        cycle.study_hypothesis_confirmed === 'yes' ? "bg-green-500" :
                                        cycle.study_hypothesis_confirmed === 'no' ? "bg-red-500" : "bg-amber-500"
                                    )} />
                                    <span className="text-[10px] font-bold text-blue-700 uppercase">Analisado</span>
                                </div>
                                {cycle.status !== 'act' && (
                                    <button 
                                        onClick={() => handleResetPhase(cycle.id, 'study')}
                                        className="p-1 text-slate-300 hover:text-red-500 rounded"
                                        title="Excluir dados desta etapa"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium leading-relaxed line-clamp-4">
                                {cycle.study_analysis}
                            </p>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] h-7 px-2 text-slate-400 hover:text-primary"
                                onClick={() => handleOpenStudy(cycle)}
                            >
                                Detalhes
                            </Button>
                       </div>
                   )}
                </td>
              ))}
            </tr>

            {/* ACT ROW */}
            <tr>
              <td className="p-6 border-r border-slate-200 bg-slate-50/50">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                        <Zap className="w-4 h-4" /> ACT
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Decisões e Ajustes</span>
                </div>
              </td>
              {cycles.slice().reverse().map((cycle) => (
                <td key={cycle.id} className="p-6 border-r border-slate-100 align-top relative">
                   {cycle.status !== 'study' && cycle.status !== 'act' ? (
                        <div className="flex items-center justify-center h-full min-h-[100px] opacity-30">
                            <p className="text-[11px] text-slate-400 italic">Aguardando Estudo</p>
                        </div>
                   ) : cycle.status === 'study' ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-3">
                            <div className="text-[11px] text-slate-400 italic">Pendente...</div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 border-dashed border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                                onClick={() => handleOpenAct(cycle)}
                            >
                                Tomar Decisão
                            </Button>
                        </div>
                   ) : (
                       <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {cycle.act_decision === 'adopt' ? <ArrowBigUp className="w-4 h-4 text-green-600" /> : 
                                 cycle.act_decision === 'adapt' ? <RefreshCw className="w-4 h-4 text-blue-600" /> : 
                                 <Trash2 className="w-4 h-4 text-red-600" />}
                                <span className={cn(
                                    "text-[10px] font-bold uppercase",
                                    cycle.act_decision === 'adopt' ? "text-green-700" :
                                    cycle.act_decision === 'adapt' ? "text-blue-700" : "text-red-700"
                                )}>
                                    {cycle.act_decision === 'adopt' ? 'Adotado' : cycle.act_decision === 'adapt' ? 'Adaptado' : 'Abandonado'}
                                </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <p className="text-[10px] text-slate-600 italic leading-tight">
                                    {cycle.act_notes}
                                </p>
                            </div>
                            {cycle.act_next_steps && (
                                <p className="text-[10px] text-slate-800 font-medium">
                                    <span className="text-primary mr-1">PRÓXIMO:</span> {cycle.act_next_steps}
                                </p>
                            )}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] h-7 px-2 text-slate-400 hover:text-primary"
                                onClick={() => handleOpenAct(cycle)}
                            >
                                Editar
                            </Button>
                       </div>
                   )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Learnings & Conclusion Footer */}
      <Card className="bg-slate-900 text-slate-100 border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Insights e Aprendizado Contínuo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-4">
          <p className="leading-relaxed">
            O quadro acima consolida o histórico de experimentos. No PDSA-Flow AI, cada <strong>ACT</strong> bem documentado 
            alimenta o grafo de conhecimento, ajudando o próximo <strong>PLAN</strong> a ser mais inteligente e assertivo.
          </p>
        </CardContent>
      </Card>

      {/* DO EXECUTION DIALOG */}
      <Dialog 
        isOpen={!!editingCycle} 
        onClose={() => setEditingCycle(null)}
        title="Execução do Ciclo (DO)"
      >
          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <PencilLine className="w-4 h-4 text-green-600" /> O que aconteceu durante o teste?
                  </label>
                  <Textarea 
                    placeholder="Descreva as observações, problemas encontrados ou surpresas durante a implementação..."
                    className="min-h-[120px]"
                    value={doObservations}
                    onChange={(e) => setDoObservations(e.target.value)}
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" /> Dados Coletados (Draft)
                  </label>
                  <Textarea 
                    placeholder="Quais dados foram obtidos? (Ex: Atendi 10 pacientes, 2 reclamaram da demora)"
                    className="min-h-[80px] bg-slate-50"
                    value={doData}
                    onChange={(e) => setDoData(e.target.value)}
                  />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setEditingCycle(null)}>Cancelar</Button>
                  <Button 
                    onClick={handleSaveDo} 
                    disabled={isSavingDo || !doObservations}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                      {isSavingDo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Finalizar Etapa Do
                  </Button>
              </div>
          </div>
      </Dialog>

      {/* STUDY ANALYSIS DIALOG */}
      <Dialog
        isOpen={!!studyingCycle}
        onClose={() => setStudyingCycle(null)}
        title="Análise de Aprendizado (STUDY)"
      >
          <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Contexto da Execução</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Observações</span>
                          <p className="text-xs text-slate-700 line-clamp-3">{studyingCycle?.do_observations}</p>
                      </div>
                      <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Dados</span>
                          <p className="text-xs text-slate-700 line-clamp-3">{studyingCycle?.do_data_collected}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600" /> Análise dos Resultados
                    </label>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5"
                        onClick={handleAIStudyAnalysis}
                        disabled={isAnalyzingStudy}
                    >
                        {isAnalyzingStudy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Sugerir com IA
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Compare os resultados com a hipótese original. O que aprendemos?"
                    className="min-h-[140px]"
                    value={studyAnalysis}
                    onChange={(e) => setStudyAnalysis(e.target.value)}
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400" /> A hipótese foi confirmada?
                  </label>
                  <div className="flex gap-2">
                      {[
                          { val: 'yes', label: 'Sim', icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50' },
                          { val: 'partial', label: 'Parcialmente', icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                          { val: 'no', label: 'Não', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50' },
                      ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setHypothesisConfirmed(opt.val)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-medium text-sm",
                                hypothesisConfirmed === opt.val 
                                    ? `border-${opt.color.split('-')[1]}-500 ${opt.bg} ${opt.color}` 
                                    : "border-slate-100 bg-slate-50 text-slate-400 grayscale hover:grayscale-0"
                            )}
                          >
                              <opt.icon className="w-4 h-4" />
                              {opt.label}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setStudyingCycle(null)}>Cancelar</Button>
                  <Button 
                    onClick={handleSaveStudy} 
                    disabled={isSavingStudy || !studyAnalysis}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                      {isSavingStudy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Finalizar Estudo
                  </Button>
              </div>
          </div>
      </Dialog>

      {/* ACT DECISION DIALOG */}
      <Dialog
        isOpen={!!actingCycle}
        onClose={() => setActingCycle(null)}
        title="Tomada de Decisão (ACT)"
      >
          <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
                  <h4 className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2">
                      <Search className="w-3 h-3" /> Resultado do Estudo
                  </h4>
                  <p className="text-xs text-blue-900 italic leading-relaxed">
                      {actingCycle?.study_analysis}
                  </p>
              </div>

              <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" /> Qual o próximo passo?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                      {[
                          { val: 'adopt', label: 'Adotar', icon: ArrowBigUp, desc: 'Padronizar a mudança', color: 'text-green-600', border: 'border-green-500', bg: 'bg-green-50' },
                          { val: 'adapt', label: 'Adaptar', icon: RefreshCw, desc: 'Ajustar e testar novo ciclo', color: 'text-blue-600', border: 'border-blue-500', bg: 'bg-blue-50' },
                          { val: 'abandon', label: 'Abandonar', icon: Trash2, desc: 'Descartar ideia', color: 'text-red-600', border: 'border-red-500', bg: 'bg-red-50' },
                      ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setActDecision(opt.val)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                                actDecision === opt.val 
                                    ? `${opt.border} ${opt.bg} ${opt.color} shadow-sm` 
                                    : "border-slate-100 bg-slate-50 text-slate-400 grayscale hover:grayscale-0"
                            )}
                          >
                              <opt.icon className="w-6 h-6 mb-1" />
                              <span className="font-bold text-sm">{opt.label}</span>
                              <span className="text-[10px] leading-tight opacity-80">{opt.desc}</span>
                          </button>
                      ))}
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <PencilLine className="w-4 h-4 text-slate-500" /> Justificativa e Notas
                    </label>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5"
                        onClick={handleAIActRecommend}
                        disabled={isRecommendingAct}
                    >
                        {isRecommendingAct ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Recomendar com IA
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Por que esta decisão foi tomada?"
                    className="min-h-[80px]"
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <StepForward className="w-4 h-4 text-primary" /> Próximas Ações
                  </label>
                  <Textarea 
                    placeholder="O que será feito imediatamente após esta decisão?"
                    className="min-h-[80px] bg-slate-50 border-dashed"
                    value={actNextSteps}
                    onChange={(e) => setActNextSteps(e.target.value)}
                  />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setActingCycle(null)}>Cancelar</Button>
                  <Button 
                    onClick={handleSaveAct} 
                    disabled={isSavingAct || !actNotes}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                      {isSavingAct ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Concluir Ciclo
                  </Button>
              </div>
          </div>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog
        isOpen={!!deletingCycleId}
        onClose={() => setDeletingCycleId(null)}
        title="Confirmar Exclusão"
      >
          <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="text-sm font-medium">
                      Tem certeza que deseja excluir este ciclo? Esta ação não pode ser desfeita.
                  </p>
              </div>
              <p className="text-xs text-slate-500 italic">
                  Nota: Apenas ciclos que ainda não foram concluídos (fase ACT) podem ser excluídos.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setDeletingCycleId(null)} disabled={isDeleting}>
                      Cancelar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleDeleteCycle} 
                    disabled={isDeleting}
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Excluir Definitivamente
                  </Button>
              </div>
          </div>
      </Dialog>
    </div>
  )
}
