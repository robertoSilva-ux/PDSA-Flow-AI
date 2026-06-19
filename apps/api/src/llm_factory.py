"""Factory para criar instâncias de LLM conforme o provedor configurado.

Provedores suportados:
- ollama  → modelo local (padrão)
- google  → Gemini via API
- deepseek → DeepSeek via API (compatível com OpenAI)
"""

import os
from dotenv import load_dotenv

load_dotenv()


def get_llm(temperature: float = 0.0):
    """Retorna uma instância de chat model conforme LLM_PROVIDER no .env."""
    provider = os.getenv("LLM_PROVIDER", "ollama").strip().lower()

    if provider == "google":
        return _build_google(temperature)

    elif provider == "deepseek":
        return _build_deepseek(temperature)

    # fallback: ollama (local)
    return _build_ollama(temperature)


def _build_ollama(temperature: float):
    from langchain_ollama import ChatOllama

    model = os.getenv("OLLAMA_MODEL", "llama3.1:latest")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    return ChatOllama(
        model=model,
        base_url=base_url,
        temperature=temperature,
    )


def _build_google(temperature: float):
    from langchain_google_genai import ChatGoogleGenerativeAI

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY não definida no .env. "
            "Obtenha uma chave em https://aistudio.google.com/apikey"
        )

    model = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")

    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        temperature=temperature,
    )


def _build_deepseek(temperature: float):
    from langchain_openai import ChatOpenAI

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError(
            "DEEPSEEK_API_KEY não definida no .env. "
            "Obtenha uma chave em https://platform.deepseek.com"
        )

    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url="https://api.deepseek.com",
        temperature=temperature,
    )
