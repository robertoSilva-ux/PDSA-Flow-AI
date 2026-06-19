import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, CheckCircle2, Target, BarChart3, Lightbulb, Sparkles, Loader2, AlertCircle, PencilLine, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

const steps = [
  {
    id: 1,
    title: 'Objetivo (Aim)',
    question: '1. O que estamos tentando realizar?',
    description: 'Defina um objetivo claro, mensurável e com prazo determinado.',
    icon: Target,
    placeholder: 'Ex: Reduzir o tempo de espera na recepção em 20% até o final do mês.'
  },
  {
    id: 2,
    title: 'Medição (Measure)',
    question: '2. Como saberemos se a mudança é melhoria?',
    description: 'Quais dados ou indicadores vamos acompanhar para validar o sucesso?',
    icon: BarChart3,
    placeholder: 'Ex: Tempo médio de espera registrado no sistema de senhas.'
  },
  {
    id: 3,
    title: 'Ideia de Mudança (Change)',
    question: '3. Que mudanças podemos fazer que resultarão melhoria?',
    description: 'Liste as intervenções ou processos que serão testados.',
    icon: Lightbulb,
    placeholder: 'Ex: Implementar um sistema de triagem rápida pré-cadastro.'
  }
]

interface Hypothesis {
  statement: string;
  rationale: string;
  confidence: number;
}

interface AIResult {
  hypotheses: Hypothesis[];
  suggested_metrics: string[];
  power_analysis: string;
}

interface PDSAWizardProps {
  projectId: number;
  onComplete?: () => void;
}

export const PDSAWizard: React.FC<PDSAWizardProps> = ({ projectId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    aim: '',
    measure: '',
    change: ''
  })

  // Estado para a etapa de refinamento
  const [selectedHypothesisIndex, setSelectedHypothesisIndex] = useState<number | null>(null)
  const [refinedStatement, setRefinedStatement] = useState('')
  const [observations, setObservations] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const fields = ['aim', 'measure', 'change']
    setFormData({
      ...formData,
      [fields[currentStep]]: e.target.value
    })
  }

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8001/api/v1/plan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Falha na análise da IA')
      
      const data = await response.json()
      
      // Verifica se a IA retornou hipóteses válidas
      if (!data.hypotheses || data.hypotheses.length === 0) {
        const errorMsg = data.errors?.join('; ') || 'A IA não conseguiu gerar hipóteses. Verifique se o modelo Ollama está rodando.'
        throw new Error(errorMsg)
      }
      
      setAiResult(data)
      setCurrentStep(3) // Move para a etapa de revisão
      // Reseta a seleção quando novos dados chegam
      setSelectedHypothesisIndex(null)
      setRefinedStatement('')
      setObservations('')
    } catch (err) {
      setError('Erro ao conectar com o agente de IA. Verifique se o backend e o Ollama estão rodando.')
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const finishCycle = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const selectedHypo = aiResult?.hypotheses[selectedHypothesisIndex!]
      const payload = {
        aim: formData.aim,
        measure: formData.measure,
        change_idea: formData.change,
        project_id: projectId,
        available_hypotheses: aiResult?.hypotheses,
        suggested_metrics: aiResult?.suggested_metrics,
        power_analysis: aiResult?.power_analysis,
        selected_hypothesis: refinedStatement,
        selected_rationale: selectedHypo?.rationale,
        user_observations: observations
      }

      const response = await fetch('http://localhost:8001/api/v1/plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Falha ao salvar o ciclo PDSA')
      
      setSaveSuccess(true)
    } catch (err) {
      setError('Erro ao salvar o plano no banco de dados.')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 2) {
      startAnalysis()
    } else if (currentStep === 3) {
      if (selectedHypothesisIndex !== null) {
          setCurrentStep(4) // Move to refinement step
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const selectHypothesis = (index: number) => {
      setSelectedHypothesisIndex(index)
      setRefinedStatement(aiResult?.hypotheses[index].statement || '')
  }

  const isReviewStep = currentStep === 3
  const isRefineStep = currentStep === 4
  
  const currentStepData = steps[currentStep] || 
    (isReviewStep ? { title: 'Seleção IA', question: 'Escolha uma Hipótese', icon: Sparkles, description: 'A IA gerou opções baseadas no seu contexto. Selecione a mais adequada.' } :
    { title: 'Refinamento', question: 'Ajuste sua Hipótese', icon: PencilLine, description: 'Personalize a declaração e adicione observações para este ciclo.' })

  const Icon = currentStepData.icon

  const totalSteps = 5
  const progress = saveSuccess ? 100 : ((currentStep + 1) / totalSteps) * 100

  if (saveSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-6"
        >
            <div className="flex justify-center">
                <div className="bg-primary/20 p-6 rounded-full">
                    <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>
            </div>
            <h2 className="text-3xl font-bold">Plano Registrado!</h2>
            <p className="text-muted-foreground">
                Seu ciclo PDSA foi salvo com sucesso e está pronto para a etapa de <strong>Execução (Do)</strong>.
            </p>
            <div className="flex flex-col gap-3">
                <Button className="w-full h-12" onClick={() => onComplete ? onComplete() : window.location.reload()}>
                    Ver Quadro
                </Button>
                <Button variant="outline" className="w-full h-12" onClick={() => window.location.reload()}>
                    Novo Ciclo
                </Button>
            </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Passo {currentStep + 1} de {totalSteps}</span>
            <span>{Math.round(progress)}% Completo</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className={cn("w-6 h-6 text-primary", isAnalyzing && "animate-pulse")} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                {currentStepData.title}
              </span>
            </div>
            <CardTitle className="text-2xl font-bold leading-tight">
              {currentStepData.question}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {currentStepData.description}
            </p>
          </CardHeader>
          
          <CardContent className="min-h-[350px]">
            <AnimatePresence mode="wait">
              {currentStep < 3 ? (
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Textarea 
                    className="min-h-[200px] text-lg p-4 resize-none focus:ring-primary"
                    placeholder={currentStepData.placeholder}
                    value={Object.values(formData)[currentStep]}
                    onChange={handleInputChange}
                    autoFocus
                  />
                </motion.div>
              ) : isReviewStep ? (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {aiResult && aiResult.hypotheses.map((h, i) => (
                    <div 
                      key={i} 
                      onClick={() => selectHypothesis(i)}
                      className={cn(
                        "cursor-pointer border-2 p-4 rounded-lg transition-all hover:shadow-md relative",
                        selectedHypothesisIndex === i 
                          ? "border-primary bg-primary/5 shadow-inner" 
                          : "border-transparent bg-muted/20 grayscale-[0.5] hover:grayscale-0"
                      )}
                    >
                      {selectedHypothesisIndex === i && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                          </div>
                      )}
                      <p className="font-semibold text-base leading-snug">"{h.statement}"</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.rationale}</p>
                      <div className="flex items-center gap-2 pt-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded">IA Confiança: {Math.round(h.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                  
                  {aiResult && (
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-dashed">
                        <div className="space-y-1">
                          <h4 className="font-bold text-[10px] text-primary uppercase tracking-tighter flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> Métricas sugeridas
                          </h4>
                          <p className="text-xs text-muted-foreground">{aiResult.suggested_metrics.join(', ')}</p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-[10px] text-primary uppercase tracking-tighter flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Rigor
                          </h4>
                          <p className="text-[10px] text-muted-foreground leading-tight">{aiResult.power_analysis}</p>
                        </div>
                      </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                    key="refine"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-primary flex items-center gap-2">
                            <PencilLine className="w-4 h-4" /> DECLARAÇÃO DA HIPÓTESE
                        </label>
                        <Textarea 
                            className="min-h-[100px] text-lg font-semibold italic border-primary/30"
                            value={refinedStatement}
                            onChange={(e) => setRefinedStatement(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-primary flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> OBSERVAÇÕES & REFINAMENTO
                        </label>
                        <Textarea 
                            className="min-h-[120px] text-sm"
                            placeholder="Adicione restrições, contexto local ou ajustes que o grupo discutiu..."
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            O refinamento humano é essencial para adaptar a sugestão da IA à realidade da operação.
                        </p>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between border-t p-6 bg-muted/30">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || isAnalyzing || isSaving}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </Button>

            <Button
              onClick={isRefineStep ? finishCycle : nextStep}
              disabled={
                  isAnalyzing || isSaving ||
                  (!isReviewStep && !isRefineStep && !Object.values(formData)[currentStep]) ||
                  (isReviewStep && selectedHypothesisIndex === null)
              }
              className="gap-2 min-w-[140px]"
            >
              {isAnalyzing ? (
                <>Analisando... <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : isSaving ? (
                <>Salvando... <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : isRefineStep ? (
                <>Finalizar Plano <CheckCircle2 className="w-4 h-4" /></>
              ) : isReviewStep ? (
                <>Refinar Escolha <ArrowRight className="w-4 h-4" /></>
              ) : currentStep === 2 ? (
                <>Gerar Opções <Sparkles className="w-4 h-4" /></>
              ) : (
                <>Próximo <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Info Box */}
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 text-sm text-primary/80 flex gap-3">
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          <p>
            {isReviewStep 
              ? "Escolha a hipótese que faz mais sentido para o seu contexto atual. Você poderá editá-la no próximo passo." 
              : isRefineStep
              ? "Este é o momento de aplicar o julgamento humano. Ajuste a hipótese e documente observações críticas."
              : "Estes são os três pilares do Modelo de Melhoria. Uma resposta clara aqui garante que seu ciclo PDSA seja focado e eficaz."}
          </p>
        </div>
      </div>
    </div>
  )
}
