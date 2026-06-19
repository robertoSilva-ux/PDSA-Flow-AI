from typing import Annotated, List, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:latest")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# --- Helpers ---

def _get_hypothesis_text(hypotheses):
    """Extract hypothesis statement from a list of dicts or Pydantic objects."""
    if not hypotheses:
        return "N/A"
    hypo = hypotheses[0]
    if isinstance(hypo, dict):
        return hypo.get("statement", "N/A")
    return getattr(hypo, "statement", "N/A")

llm = ChatOllama(
    model=OLLAMA_MODEL,
    base_url=OLLAMA_BASE_URL,
    temperature=0
)

# --- Schema ---

class Hypothesis(BaseModel):
    statement: str = Field(description="A declaração 'Se... então...' da hipótese.")
    rationale: str = Field(description="A lógica subjacente ou padrão para esta hipótese.")
    confidence: float = Field(description="Nível de confiança (0-1).")

class PlanState(TypedDict):
    aim: str
    measure: str
    change: str
    hypotheses: List[Hypothesis]
    suggested_metrics: List[str]
    power_analysis: Optional[str]
    # Study phase additions
    do_observations: Optional[str]
    do_data_collected: Optional[str]
    study_analysis: Optional[str]
    study_hypothesis_confirmed: Optional[str]
    # Act phase additions
    act_decision: Optional[str]
    act_notes: Optional[str]
    act_next_steps: Optional[str]
    errors: List[str]

# --- Nodes ---

async def hypothesis_generator(state: PlanState):
    """Gera múltiplas hipóteses testáveis usando a LLM via Ollama."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Você é um especialista em melhoria contínua e metodologia PDSA. "
                   "Sua tarefa é gerar uma LISTA de 3 hipóteses formais e testáveis para um ciclo de melhoria. "
                   "Cada hipótese deve ter um foco levemente diferente (ex: eficiência, qualidade, experiência). "
                   "Responda EXCLUSIVAMENTE em formato JSON seguindo este esquema: "
                   "{{\"hypotheses\": [{{\"statement\": \"frase se...então...\", \"rationale\": \"justificativa\", \"confidence\": 0.9}}]}}"),
        ("user", "Objetivo: {aim}\nMedição: {measure}\nMudança proposta: {change}")
    ])
    
    # Schema para múltiplas hipóteses
    class HypothesisList(BaseModel):
        hypotheses: List[Hypothesis]

    try:
        # Tenta extração estruturada
        chain = prompt | llm.with_structured_output(HypothesisList)
        result = await chain.ainvoke({
            "aim": state["aim"],
            "measure": state["measure"],
            "change": state["change"]
        })
        return {"hypotheses": result.hypotheses}
    except Exception as e:
        # Fallback manual para lista
        try:
            raw_chain = prompt | llm
            response = await raw_chain.ainvoke({
                "aim": state["aim"],
                "measure": state["measure"],
                "change": state["change"]
            })
            import json
            import re
            
            content = response.content
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
                
            data = json.loads(content)
            # Aceita tanto {"hypotheses": [...]} quanto [...] diretamente
            if isinstance(data, dict) and "hypotheses" in data:
                hypos = [Hypothesis(**h) for h in data["hypotheses"]]
            elif isinstance(data, list):
                hypos = [Hypothesis(**h) for h in data]
            else:
                raise ValueError("Formato JSON inesperado")
                
            return {"hypotheses": hypos}
        except Exception as inner_e:
            return {"errors": [f"Erro na extração estruturada: {str(e)}", f"Erro no fallback: {str(inner_e)}"]}

async def study_analyst(state: PlanState):
    """Analisa os resultados da execução frente à hipótese original."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Você é um analista de dados especialista em melhoria contínua (PDSA). "
                   "Sua tarefa é comparar o que foi PLANEJADO (Objetivo e Hipótese) com o que foi EXECUTADO (Observações e Dados). "
                   "Determine se a hipótese foi confirmada e gere uma análise concisa sobre os aprendizados. "
                   "Responda EXCLUSIVAMENTE em formato JSON seguindo este esquema: "
                   "{{\"analysis\": \"texto da análise\", \"confirmed\": \"yes|no|partial\"}}"),
        ("user", "Objetivo: {aim}\nHipótese: {hypothesis}\nObservações da Execução: {do_obs}\nDados Coletados: {do_data}")
    ])
    
    class StudyResult(BaseModel):
        analysis: str
        confirmed: str

    try:
        chain = prompt | llm.with_structured_output(StudyResult)
        
        # Pega a hipótese
        hypo_text = _get_hypothesis_text(state.get("hypotheses"))
        
        result = await chain.ainvoke({
            "aim": state["aim"],
            "hypothesis": hypo_text,
            "do_obs": state.get("do_observations", "N/A"),
            "do_data": state.get("do_data_collected", "N/A")
        })
        return {
            "study_analysis": result.analysis,
            "study_hypothesis_confirmed": result.confirmed
        }
    except Exception as e:
        # Fallback manual para Study
        try:
            raw_chain = prompt | llm
            response = await raw_chain.ainvoke({
                "aim": state["aim"],
                "hypothesis": _get_hypothesis_text(state.get("hypotheses")),
                "do_obs": state.get("do_observations", "N/A"),
                "do_data": state.get("do_data_collected", "N/A")
            })
            import json
            import re
            content = response.content
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            data = json.loads(content)
            return {
                "study_analysis": data.get("analysis", "Erro no parse"),
                "study_hypothesis_confirmed": data.get("confirmed", "partial")
            }
        except Exception as inner_e:
            return {"errors": [f"Erro na análise de estudo: {str(e)}", f"Erro no fallback do estudo: {str(inner_e)}"]}

async def act_advisor(state: PlanState):
    """Sugere a decisão final (Adotar, Adaptar ou Abandonar) baseada no estudo."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Você é um consultor estratégico de melhoria contínua. "
                   "Sua tarefa é analisar os resultados do estudo PDSA e recomendar a melhor decisão: "
                   "1. adopt: Se a mudança foi um sucesso claro e deve ser padronizada. "
                   "2. adapt: Se houve progresso mas ajustes são necessários para um novo ciclo. "
                   "3. abandon: Se a mudança não funcionou ou causou danos. "
                   "Responda EXCLUSIVAMENTE em formato JSON seguindo este esquema: "
                   "{{\"decision\": \"adopt|adapt|abandon\", \"reasoning\": \"justificativa curta\", \"next_steps\": \"sugestão para o próximo ciclo\"}}"),
        ("user", "Objetivo: {aim}\nHipótese: {hypothesis}\nConfirmada: {confirmed}\nAnálise: {analysis}")
    ])
    
    class ActResult(BaseModel):
        decision: str
        reasoning: str
        next_steps: str

    try:
        chain = prompt | llm.with_structured_output(ActResult)
        hypo_text = _get_hypothesis_text(state.get("hypotheses"))
        
        result = await chain.ainvoke({
            "aim": state["aim"],
            "hypothesis": hypo_text,
            "confirmed": state.get("study_hypothesis_confirmed", "N/A"),
            "analysis": state.get("study_analysis", "N/A")
        })
        return {
            "act_decision": result.decision,
            "act_notes": result.reasoning,
            "act_next_steps": result.next_steps
        }
    except Exception as e:
        # Fallback manual para Act
        try:
            raw_chain = prompt | llm
            response = await raw_chain.ainvoke({
                "aim": state["aim"],
                "hypothesis": _get_hypothesis_text(state.get("hypotheses")),
                "confirmed": state.get("study_hypothesis_confirmed", "N/A"),
                "analysis": state.get("study_analysis", "N/A")
            })
            import json
            import re
            content = response.content
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            data = json.loads(content)
            return {
                "act_decision": data.get("decision", "adapt"),
                "act_notes": data.get("reasoning", "Parse error"),
                "act_next_steps": data.get("next_steps", "Rever dados")
            }
        except Exception as inner_e:
            return {"errors": [f"Erro na recomendação do Act: {str(e)}", f"Erro no fallback do Act: {str(inner_e)}"]}

def statistical_validator(state: PlanState):
    """Realiza análise de poder e validação de métricas."""
    measure = state["measure"]
    
    # Lógica estatística (pode ser expandida no futuro)
    power_info = f"Para validar '{measure}', recomenda-se uma amostra mínima de 30 observações (Alpha=0.05, Power=0.8)."
    
    return {"power_analysis": power_info, "suggested_metrics": [measure, "Taxa de erro de processo"]}

# --- Graph ---

workflow = StateGraph(PlanState)

workflow.add_node("generator", hypothesis_generator)
workflow.add_node("validator", statistical_validator)

workflow.add_edge(START, "generator")
workflow.add_edge("generator", "validator")
workflow.add_edge("validator", END)

plan_agent = workflow.compile()

# --- Study Agent Graph ---
study_workflow = StateGraph(PlanState)
study_workflow.add_node("analyst", study_analyst)
study_workflow.add_edge(START, "analyst")
study_workflow.add_edge("analyst", END)

study_agent = study_workflow.compile()

# --- Act Agent Graph ---
act_workflow = StateGraph(PlanState)
act_workflow.add_node("advisor", act_advisor)
act_workflow.add_edge(START, "advisor")
act_workflow.add_edge("advisor", END)

act_agent = act_workflow.compile()
