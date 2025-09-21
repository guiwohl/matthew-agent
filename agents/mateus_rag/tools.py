# agent/tools.py
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import psycopg
from openai import OpenAI

load_dotenv()

DB_URL = os.getenv("DB_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL")

_client = OpenAI(api_key=OPENAI_API_KEY)



def _embed_query(q: str) -> List[float]:
    #Pega a fala do usuario, e transforma ela em embedding com os 1500 (e la vai bolada) de parametros para fazer a query no db depois
    resp = _client.embeddings.create(model=EMBED_MODEL, input=[q])
    return resp.data[0].embedding #lista dos parametros (1534)

def _fmt_vector(vec: List[float]) -> str:
    # Aqui ele transforma a lista de parametros em uma string com os parametros separados por virgulas
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"

def search_mateus(question: str, k: int = 5) -> Dict[str, Any]:
    """
    Retorna os k versículos mais próximos à pergunta.
    Saída: {"hits":[{"chapter":..., "verse":..., "text":"...", "score":0..1}], "note":"..."}
    """
    if not question or not question.strip():
        return {"hits": [], "note": "Pergunta vazia."}

    # Aqui ele pega a fala do usuario, transforma em embedding e depois transforma em uma string com os parametros separados por virgulas
    q_vec = _fmt_vector(_embed_query(question))

    rows: List[Dict[str, Any]] = []
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # cosine distance: menor = mais similar; score = 1 - distância (fica 0..1)
            # Aqui ele faz a query no db com o embedding da fala do usuario
            cur.execute(
                """
                SELECT chapter, verse, text,
                       (1 - (embedding <=> %s::vector)) AS score
                FROM verses
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
                """,
                (q_vec, q_vec, k)
            )
            # Aqui ele pega os resultados da query e transforma em uma lista de dicts
            for chapter, verse, text, score in cur.fetchall():
                rows.append({
                    "chapter": int(chapter),
                    "verse": int(verse),
                    "text": text,
                    "score": float(score),
                    "ref": f"Mateus {int(chapter)}:{int(verse)}"1
                })

    # Aqui ele retorna a lista de dicts com os resultados da query
    return {"hits": rows, "note": f"{len(rows)} resultados"}

TOOL_SYSTEM_HINT = (
    # Sugestão ao modelo (Gemini) de COMO usar o retorno da tool:
    "Use os hits retornados como única base factual. Ao responder, cite sempre no formato 'Mateus C:V'. "
    "Se não houver confiança suficiente, peça reformulação. Seja conciso, respeitoso e literal com o texto."
)
