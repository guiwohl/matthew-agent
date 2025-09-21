# Faz a ingestão dos dados do Mateus. 
# O arquivo deve estar em data/mateus.md. 

import os
import re
from pathlib import Path
from dotenv import load_dotenv

import psycopg
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DB_DSN = os.getenv("DATABASE_URL", "postgresql://mateus:mateus@localhost:5432/mateus_rag")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")  # 1536 dims por padrão

assert OPENAI_API_KEY, "Defina OPENAI_API_KEY no .env"

client = OpenAI(api_key=OPENAI_API_KEY)

MATEUS_MD = Path(__file__).resolve().parents[1] / "data" / "mateus.md"

CAP_RE = re.compile(r"^##\s*Cap[ií]tulo\s+(\d+)\s*$", re.IGNORECASE)
VER_RE = re.compile(r"^\[(\d+)\]\s*(.+)$")

def parse_mateus_markdown(md_path: Path):
    """
    Retorna lista de dicts: {chapter, verse, text}
    Espera formato:
      ## Capitulo N
      [1] texto...
      [2] texto...
    """
    items = []
    chapter = None
    for line in md_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        m_cap = CAP_RE.match(line)
        if m_cap:
            chapter = int(m_cap.group(1))
            continue
        m_ver = VER_RE.match(line)
        if m_ver and chapter is not None:
            verse = int(m_ver.group(1))
            text = m_ver.group(2).strip()
            items.append({"chapter": chapter, "verse": verse, "text": text})
    return items

def embed_texts(texts):
    """
    Gera embeddings em lote (respeitando limites simples).
    """
    # API aceita lista; retornamos lista de vetores (cada um com 1536 floats)
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [data.embedding for data in resp.data]

def main():
    data = parse_mateus_markdown(MATEUS_MD)
    if not data:
        raise SystemExit("Nenhum versículo detectado. Verifique o formato de data/mateus.md.")

    # Gera embeddings em lotes de, p.ex., 128 (simples e seguro)
    BATCH = 128
    with psycopg.connect(DB_DSN) as conn:
        conn.execute("SET hnsw.ef_search = 100")  # opcional: melhora recall em HNSW nas consultas
        with conn.cursor() as cur:
            # Garante schema criado
            schema_sql = (Path(__file__).resolve().parents[1] / "db" / "schema.sql").read_text(encoding="utf-8")
            cur.execute(schema_sql)
            conn.commit()

            # Limpa dados (se quiser reindexar do zero)
            cur.execute("DELETE FROM verses")
            conn.commit()

            for i in range(0, len(data), BATCH):
                chunk = data[i:i+BATCH]
                texts = [it["text"] for it in chunk]
                embs = embed_texts(texts)

                # Prepara INSERT
                rows = []
                for it, emb in zip(chunk, embs):
                    # pgvector aceita string estilo "[1,2,3]" -> vamos formatar
                    emb_str = "[" + ",".join(f"{x:.8f}" for x in emb) + "]"
                    rows.append((it["chapter"], it["verse"], it["text"], emb_str))

                cur.executemany(
                    """
                    INSERT INTO verses (chapter, verse, text, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    ON CONFLICT (chapter, verse) DO UPDATE SET
                      text = EXCLUDED.text,
                      embedding = EXCLUDED.embedding
                    """,
                    rows
                )
                conn.commit()
                print(f"Inseridos {i + len(rows)} / {len(data)}")

    print("Ingestão concluída.")

if __name__ == "__main__":
    main()
