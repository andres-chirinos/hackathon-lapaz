"""
knowledge_loader.py — Vector-based knowledge store using ChromaDB.

Indexes all OKF markdown documents (global + per-dataset) into a ChromaDB
collection. Provides semantic search so the AI agent retrieves only the
most relevant context instead of the entire corpus.
"""
import os
import glob
import hashlib
import chromadb


def _split_document(path: str) -> list[dict]:
    """
    Read a markdown file and split it into meaningful chunks.
    Each top-level section (# heading) becomes a separate chunk,
    preserving the frontmatter as metadata for all chunks from that file.
    """
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return []

    rel_path = os.path.relpath(path)
    chunks = []

    # Extract frontmatter
    frontmatter = ""
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1].strip()
            body = parts[2].strip()

    # Split body by top-level headings
    sections = []
    current_heading = f"[{rel_path}]"
    current_lines = []

    for line in body.split('\n'):
        if line.startswith('# ') or line.startswith('## '):
            if current_lines:
                sections.append((current_heading, '\n'.join(current_lines).strip()))
            current_heading = line.strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_heading, '\n'.join(current_lines).strip()))

    # If no sections found, use the whole document as one chunk
    if not sections:
        sections = [(f"[{rel_path}]", body)]

    for heading, section_text in sections:
        if not section_text.strip():
            continue

        doc_text = f"Archivo: {rel_path}\nFrontmatter: {frontmatter}\n\n{section_text}" if frontmatter else f"Archivo: {rel_path}\n\n{section_text}"
        doc_id = hashlib.md5(f"{rel_path}:{heading}".encode()).hexdigest()

        chunks.append({
            "id": doc_id,
            "text": doc_text,
            "metadata": {
                "source": rel_path,
                "heading": heading,
            }
        })

    return chunks


def build_vector_store():
    """
    Build a ChromaDB collection from all OKF markdown files.
    Scans:
      - knowledge/**/*.md  (global guidelines, indexes)
      - data/**/knowledge/*.md  (per-dataset context)

    Returns the ChromaDB collection ready for semantic queries.
    """
    client = chromadb.Client()

    # Delete existing collection if it exists (for hot-reload)
    try:
        client.delete_collection("knowledge")
    except Exception:
        pass

    collection = client.create_collection(
        name="knowledge",
        metadata={"hnsw:space": "cosine"}
    )

    # Gather all markdown files
    md_paths = []
    if os.path.exists("knowledge"):
        md_paths += sorted(glob.glob("knowledge/**/*.md", recursive=True))
    if os.path.exists("data"):
        md_paths += sorted(glob.glob("data/**/knowledge/*.md", recursive=True))

    # Filter out SPEC.md (reference only)
    md_paths = [p for p in md_paths if os.path.basename(p) != "SPEC.md"]

    all_chunks = []
    for path in md_paths:
        all_chunks.extend(_split_document(path))

    if all_chunks:
        collection.add(
            ids=[c["id"] for c in all_chunks],
            documents=[c["text"] for c in all_chunks],
            metadatas=[c["metadata"] for c in all_chunks],
        )

    return collection, len(all_chunks)


def search_knowledge(collection, query: str, n_results: int = 5) -> str:
    """
    Semantic search over the knowledge base.
    Returns the top-N most relevant document chunks as a formatted string.
    """
    if collection.count() == 0:
        return "No hay documentos en la base de conocimiento."

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count())
    )

    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    output_parts = []
    for doc, meta in zip(docs, metadatas):
        source = meta.get("source", "desconocido")
        output_parts.append(f"--- Fuente: {source} ---\n{doc}")

    return "\n\n".join(output_parts)
