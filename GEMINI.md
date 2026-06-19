# 🔄 PDSA-Flow AI - Contexto do Projeto

Este repositório contém o framework **PDSA-Flow AI**, um sistema híbrido humano-IA para orquestração de ciclos de melhoria contínua (Plan-Do-Study-Act) com rigor estatístico e aprendizado via agentes inteligentes.

## 🎯 Visão Geral
O projeto resolve a falta de geração de hipóteses em ferramentas tradicionais e a tendência de alucinação causal em IAs generativas comuns, mantendo o humano no controle de todas as decisões finais.

- **Status:** 🚀 MVP Funcional v1.1.
- **Domínio Piloto:** Clínicas médicas e pequenos negócios de serviço.
- **Princípios:** Human-in-the-loop, Rigor estatístico, Orquestração via Agentes.

## 🏗️ Arquitetura & Stack (Implementado)
O projeto é um monorepo estruturado para escalabilidade e separação de preocupações.

- **Web (Frontend):** React + TS + Tailwind v4 (`apps/web`). Interface baseada em Wizard e Dashboard de Quadro PDSA.
- **API (Backend):** FastAPI + Python 3.12 (`apps/api`).
- **IA Core:** LangGraph para fluxos de agentes (`apps/api/src/agents`).
- **LLM:** Ollama (Local) rodando `llama3.1:latest`.
- **Dados:** PostgreSQL (Transacional) via Docker.
- **Estatística:** Scipy e Statsmodels integrados aos agentes.

## 🛠️ Comandos de Desenvolvimento
Utilize o `Makefile` na raiz para orquestrar o ambiente:

```bash
make infra-up    # Sobe o banco de dados Postgres
make run-api     # Inicia o backend na porta 8001
make run-web     # Inicia o frontend na porta 5173
make infra-down  # Para os serviços Docker
```

## ⚖️ Guardrails & Convenções
1. **Aprovação Humana:** Nenhuma ação do ciclo PDSA é persistida sem revisão e confirmação manual do usuário.
2. **Localização:** Toda a interface do usuário (labels, erros, sugestões) deve ser em **Português (PT-BR)**.
3. **Persistência Async:** O backend utiliza SQLAlchemy 2.0 com `asyncpg` para operações não-bloqueantes.
4. **Agentes Especializados:**
   - `plan_agent`: Gera hipóteses e valida poder amostral.
   - `study_agent`: Analisa dados da execução vs. plano original.
   - `act_agent`: Recomenda decisões estratégicas (Adotar, Adaptar, Abandonar).

## 📂 Estrutura de Documentação
- `readme.md`: Guia de execução e visão técnica.
- `docs/projeto.md`: Roadmap e visão de negócio.
- `apps/api/GEMINI.md`: Instruções técnicas específicas para o backend.

## 🚦 Próximos Passos
1. Implementação do motor de SPC (Statistical Process Control) para análise gráfica no Study.
2. Integração com Neo4j para construção do Grafo de Conhecimento Causal.
3. Exportação de relatórios do Quadro em PDF/CSV.
