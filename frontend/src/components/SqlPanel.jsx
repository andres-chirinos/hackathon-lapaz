import { useState, useEffect } from 'react';
import { executeSql } from '../api';

export default function SqlPanel({ initialSql, onClose }) {
  const [sql, setSql] = useState(initialSql || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialSql) setSql(initialSql);
  }, [initialSql]);

  const handleRun = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await executeSql(sql);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sql-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-base)' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-terminal" /> Terminal SQL (DuckDB)
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <textarea
          rows={4}
          value={sql}
          onChange={e => setSql(e.target.value)}
          placeholder="Escribe tu consulta SQL aquí..."
          style={{
            width: '100%', background: '#1a1a2e', color: '#00ff00', fontFamily: 'monospace',
            border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.8rem', resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={handleRun} disabled={loading} style={{
            backgroundColor: 'var(--brand-blue)', color: 'white', border: 'none',
            padding: '0.5rem 1.5rem', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Ejecutando...</> : <><i className="fa-solid fa-play" /> Ejecutar SQL</>}
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--alert-critical)', background: 'rgba(239,68,68,0.1)', padding: '0.8rem', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--brand-cyan)' }}>
              Resultado ({result.total_rows} filas):
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
              <table className="sql-result-table">
                <thead>
                  <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>{result.columns.map(c => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
