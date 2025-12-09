import os

class Settings:
    llm_api_base: str = os.getenv("LLM_API_BASE", "http://localhost:8000/v1")
    llm_api_key: str = os.getenv("LLM_API_KEY", "EMPTY")
    llm_model: str = os.getenv("LLM_MODEL", "meta-llama/Meta-Llama-3-8B-Instruct")

settings = Settings()
