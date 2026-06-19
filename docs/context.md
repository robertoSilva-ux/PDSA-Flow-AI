# 🧭 Contexto do Projeto - PDSA-Flow AI

**Elevator Pitch:** Co-piloto estatístico para ciclos de melhoria. IA sugere, humano decide, grafo aprende.

**Regras de Ouro:**
1. Nunca sugerir causalidade sem validação estatística (DoWhy/EconML).
2. Sempre exigir aprovação humana para ações críticas (Act).
3. Priorizar adaptabilidade de perguntas por domínio (saúde vs. manufatura).

**Exemplo de Caso de Uso (Médico):**
- Problema: Poucos pacientes.
- Hipótese IA: "Aumentar propaganda digital" (viabilidade: alta).
- Ciclo 1: Campanha → Fila cresceu → Gargalo na secretaria.
- Ciclo 2 (derivado): App de agendamento → Atrasos no atendimento.
- Ciclo 3 (derivado): Triagem com enfermeira → Meta de 30min atingida.
- Padrão aprendido: "Marketing sem ajuste de capacidade gera gargalo".

**Stack Decisões Chave:**
- LangGraph para orquestração stateful.
- Neo4j para dependências entre ciclos.
- Python backend para ecossistema stats.

**Status Atual:** Pré-projeto aprovado. Próximo: PoC do agente Plan.