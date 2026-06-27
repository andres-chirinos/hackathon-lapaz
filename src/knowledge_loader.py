"""
knowledge_loader.py — Aggregates OKF knowledge from two levels:
  1. Global: knowledge/*.md  (analytical guidelines, index, etc.)
  2. Per-dataset: data/<dataset>/knowledge/*.md  (context.md per table)

Produces a single context string for the AI agent.
"""
import os
import glob


def _read_md(path: str) -> str:
    """Read a markdown file and return its content with a header."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f"--- Concepto: {os.path.relpath(path)} ---\n{f.read()}"
    except Exception:
        return ""


def load_global_knowledge(knowledge_dir: str = "knowledge") -> str:
    """Load all OKF markdown files from the global knowledge directory."""
    if not os.path.exists(knowledge_dir):
        return ""
    docs = []
    for md in sorted(glob.glob(os.path.join(knowledge_dir, "**", "*.md"), recursive=True)):
        # Skip the OKF spec itself — it's reference, not context
        if os.path.basename(md) == "SPEC.md":
            continue
        content = _read_md(md)
        if content:
            docs.append(content)
    return "\n\n".join(docs)


def load_dataset_knowledge(data_dir: str = "data") -> str:
    """Load OKF markdown files from each data/<dataset>/knowledge/ folder."""
    if not os.path.exists(data_dir):
        return ""
    docs = []
    for md in sorted(glob.glob(os.path.join(data_dir, "**", "knowledge", "*.md"), recursive=True)):
        content = _read_md(md)
        if content:
            docs.append(content)
    return "\n\n".join(docs)


def load_all_knowledge() -> str:
    """Aggregate global + per-dataset knowledge into a single context string."""
    global_ctx = load_global_knowledge()
    dataset_ctx = load_dataset_knowledge()
    parts = [p for p in [global_ctx, dataset_ctx] if p]
    return "\n\n".join(parts)
