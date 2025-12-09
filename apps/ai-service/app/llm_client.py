import httpx
from .config import settings

async def chat_completion(messages, temperature=0.3, max_tokens=1024):
    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(base_url=settings.llm_api_base, timeout=120) as client:
        r = await client.post("/chat/completions", json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]

async def chat_completion_test(messages, temperature=0.3, max_tokens=1024):
    """
    """
    return """
    {
      "overall_level": "B1",
      "summary": "Can handle everyday English with some difficulty.",
      "strengths": ["Good basic vocabulary", "Understands simple text"],
      "weaknesses": ["Grammar accuracy", "Limited complex structures"],
      "bands": [
        {"skill":"reading","level":"B1","comment":"Understands short texts"},
        {"skill":"writing","level":"A2","comment":"Simple sentences with errors"}
      ]
    }
    """