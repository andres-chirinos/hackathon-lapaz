import { useEffect, useState } from 'react';
import { fetchCatalogo } from '../api';

export default function CatalogoView() {
  const [catalogo, setCatalogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogo()
      .then(data => setCatalogo(data.catalogo))
      .catch(e => console.error("Error loading catalog:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--brand-blue)' }} />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: 'var(--brand-blue)', marginBottom: '1rem' }}>
        <i className="fa-solid fa-database" /> Catálogo de Datos Activos
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Explora todas las capas de datos indexadas en el DataLake (DuckDB) disponibles para consultas por la IA.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {(!catalogo || catalogo.length === 0) && (
          <p>No hay datos disponibles en el catálogo.</p>
        )}
        {catalogo?.map(ds => (
          <div className="card" key={ds.table_name} style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ fontSize: '1.1rem', color: 'var(--brand-blue)' }}>
              <span><i className="fa-solid fa-table" /> Dataset: {ds.table_name.replace(/_/g, ' ').toUpperCase()}</span>
              <span style={{ background: 'var(--brand-cyan)', color: '#000', padding: '0.2rem 0.8rem', borderRadius: 12, fontSize: '0.8rem' }}>
                {ds.total_rows} Registros Totales
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr>
                    {ds.columns.map(c => (
                      <th key={c} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ds.samples.map((row, i) => (
                    <tr key={i}>
                      {ds.columns.map(c => (
                        <td key={c} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
