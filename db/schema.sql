-- db/schema.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela simples: apenas Mateus (capítulo, versículo, texto, embedding)
CREATE TABLE IF NOT EXISTS verses (
  id        bigserial PRIMARY KEY,
  chapter   int NOT NULL,
  verse     int NOT NULL,
  text      text NOT NULL,
  embedding vector(1536) NOT NULL,  -- 1536 = dimensão padrão do text-embedding-3-small
  UNIQUE (chapter, verse)
);

-- Índice HNSW para cosine distance (mais rápido que exato, ótimo trade-off)
CREATE INDEX IF NOT EXISTS verses_embedding_hnsw_cos
  ON verses
  USING hnsw (embedding vector_cosine_ops);
