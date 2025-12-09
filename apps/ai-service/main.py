from fastapi import FastAPI, HTTPException
from app.schemas import CEFRRequest, CEFREvaluation, CEFRBand
from app.llm_client import chat_completion_test  # <--- dùng mock thay vì chat_completion
from app.prompts import build_cefr_prompt
import json

app = FastAPI(title="Linguapanda AI Service")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ai/placement/cefr", response_model=CEFREvaluation)
async def cefr_evaluation(req: CEFRRequest):
    try:
        # build prompt (sau này dùng cho model thật)
        system_msg, user_msg = build_cefr_prompt(req)

        # gọi hàm mock, không cần messages nhưng mình truyền vào cho đúng form
        raw = await chat_completion_test(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ]
        )

        data = json.loads(raw)

        bands = [CEFRBand(**b) for b in data.get("bands", [])]

        result = CEFREvaluation(
            overall_level=data["overall_level"],
            summary=data["summary"],
            strengths=data.get("strengths", []),
            weaknesses=data.get("weaknesses", []),
            bands=bands,
        )
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON (mock)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
