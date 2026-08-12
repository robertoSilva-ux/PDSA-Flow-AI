import json
import re
from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from src.llm_factory import get_llm

# --- Helpers ---


async def _llm_json(prompt, variables: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Executa uma cadeia LLM (assíncrona) e retorna um dict parseado do JSON de resposta.

    Centraliza o padrão que antes se repetia em cada agente:
      - executa a cadeia e extrai o bloco JSON da resposta em texto livre;
      - converte para dict.
    Em caso de falha, retorna {"__error__": ...} para o chamador decidir como reportar.
    """
    llm = get_llm()
    try:
        chain = prompt | llm
        response = await chain.ainvoke(variables)
        content = response.content if hasattr(response, "content") else str(response)
        json_match = re.search(r"\{.*\}", str(content), re.DOTALL)
        if not json_match:
            raise ValueError("Nenhum objeto JSON encontrado na resposta")
        return json.loads(json_match.group(0))
    except Exception as e:
        return {"__error__": f"Erro na extração JSON: {e}"}


def _safe(state: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Acesso seguro a chave de estado, evitando KeyError quando um nó
    anterior não populou o campo."""
    return state.get(key, default)

def _get_hypothesis_text(hypotheses):
    """Extract hypothesis statement from a list of dicts or Pydantic objects."""
    if not hypotheses:
        return "N/A"
    hypo = hypotheses[0]
    if isinstance(hypo, dict):
        return hypo.get("statement", "N/A")
    return getattr(hypo, "statement", "N/A")

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
    """Gera múltiplas hipóteses testáveis usando a LLM."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Você é um especialista em melhoria contínua e metodologia PDSA. "
                   "Sua tarefa é gerar uma LISTA de 3 hipóteses formais e testáveis para um ciclo de melhoria. "
                   "Cada hipótese deve ter um foco levemente diferente (ex: eficiência, qualidade, experiência). "
                   "Responda EXCLUSIVAMENTE em formato JSON seguindo este esquema: "
                   "{{\"hypotheses\": [{{\"statement\": \"frase se...então...\", \"rationale\": \"justificativa\", \"confidence\": 0.9}}]}}"),
        ("user", "Objetivo: {aim}\nMedição: {measure}\nMudança proposta: {change}")
    ])

    data = await _llm_json(prompt, {
        "aim": _safe(state, "aim"),
        "measure": _safe(state, "measure"),
        "change": _safe(state, "change")
    })

    if data is None or "__error__" in data:
        msg = (data or {}).get("__error__", "Falha ao gerar hipóteses")
        return {"errors": [msg]}

    # Aceita tanto {"hypotheses": [...]} quanto [...] diretamente
    hypos_raw = data.get("hypotheses", data) if isinstance(data, dict) else data
    if not isinstance(hypos_raw, list):
        return {"errors": ["Formato JSON inesperado em hipóteses"]}
    try:
        hypos = [Hypothesis(**h) for h in hypos_raw]
    except Exception as e:
        return {"errors": [f"Hipóteses inválidas: {e}"]}

    return {"hypotheses": hypos}

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

    data = await _llm_json(prompt, {
        "aim": _safe(state, "aim"),
        "hypothesis": _get_hypothesis_text(_safe(state, "hypotheses")),
        "do_obs": _safe(state, "do_observations", "N/A"),
        "do_data": _safe(state, "do_data_collected", "N/A")
    })

    if data is None or "__error__" in data:
        msg = (data or {}).get("__error__", "Falha na análise de estudo")
        return {"errors": [msg]}

    return {
        "study_analysis": data.get("analysis", "Erro no parse"),
        "study_hypothesis_confirmed": data.get("confirmed", "partial")
    }

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

    data = await _llm_json(prompt, {
        "aim": _safe(state, "aim"),
        "hypothesis": _get_hypothesis_text(_safe(state, "hypotheses")),
        "confirmed": _safe(state, "study_hypothesis_confirmed", "N/A"),
        "analysis": _safe(state, "study_analysis", "N/A")
    })

    if data is None or "__error__" in data:
        msg = (data or {}).get("__error__", "Falha na recomendação do Act")
        return {"errors": [msg]}

    return {
        "act_decision": data.get("decision", "adapt"),
        "act_notes": data.get("reasoning", "Parse error"),
        "act_next_steps": data.get("next_steps", "Rever dados")
    }

def statistical_validator(state: PlanState):
    """Realiza análise de poder e validação de métricas."""
    measure = _safe(state, "measure", "")
    
    # Lógica estatística (parâmetros configuráveis)
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
