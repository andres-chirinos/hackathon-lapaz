import { useState } from 'react';
import { chatWithAgent } from '../api';

export default function ChatSidebar({ location, onResult, onOpenSql }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await chatWithAgent(query, location.lat, location.lon);
      setResult(res);
      onResult(res);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.data?.length) return;
    const keys = Object.keys(result.data[0]);
    const csv = "data:text/csv;charset=utf-8," + keys.join(",") + "\n"
      + result.data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", "kuntur_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <aside className="chat-sidebar">
      <div className="card-header" style={{ fontSize: '1.1rem' }}>
        Asistente IA
        <i className="fa-solid fa-robot" style={{ color: 'var(--brand-blue)', fontSize: '1.5rem' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
        <textarea
          rows={4}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ej: ¿Cuál es la tendencia del ICA por estación en los últimos meses?"
          style={{
            width: '100%', padding: '0.8rem', borderRadius: 8,
            border: '1px solid var(--border-color)', background: 'var(--bg-base)',
            color: 'var(--text-primary)', fontFamily: '"Inter", sans-serif', resize: 'vertical'
          }}
        />
        <button onClick={handleSubmit} disabled={loading} style={{
          backgroundColor: 'var(--brand-blue)', color: 'white', border: 'none',
          padding: '0.8rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
          opacity: loading ? 0.7 : 1
        }}>
          {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Analizando...</> : <><i className="fa-solid fa-paper-plane" /> Analizar</>}
        </button>
        <button onClick={onOpenSql} style={{
          width: '100%', backgroundColor: 'transparent', color: 'var(--brand-blue)',
          border: '1px solid var(--brand-blue)', padding: '0.8rem', borderRadius: 8,
          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          <i className="fa-solid fa-code" /> Abrir Terminal SQL
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Analizando datos...</p>
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--brand-blue)', fontSize: '1rem' }}>Resultados</h3>

          <div style={{
            backgroundColor: 'rgba(0, 86, 179, 0.1)', padding: '1rem',
            borderLeft: '4px solid var(--brand-blue)', borderRadius: 4, marginBottom: '1rem',
            fontWeight: 600, fontSize: '0.9rem'
          }}>
            {result.resumen || "Análisis completado."}
          </div>

          {result.data?.length > 0 && (
            <button onClick={handleDownload} style={{
              width: '100%', backgroundColor: 'var(--alert-stable)', color: 'white',
              border: 'none', padding: '0.5rem', borderRadius: 4, fontWeight: 600,
              cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'
            }}>
              <i className="fa-solid fa-download" /> Descargar Datos
            </button>
          )}

          {result.explicacion && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Explicación Técnica:</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{result.explicacion}</p>
            </div>
          )}

          {result.sql && (
            <div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Consulta SQL Generada:</h4>
              <pre style={{
                backgroundColor: 'var(--bg-base)', padding: '0.8rem', borderRadius: 8,
                overflowX: 'auto', fontFamily: 'monospace', border: '1px solid var(--border-color)', fontSize: '0.75rem'
              }}>
                <code>{result.sql}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
