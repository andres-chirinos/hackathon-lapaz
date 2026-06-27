import { useEffect, useState } from 'react';
import { fetchCatalogo, executeSql } from '../api';

export default function CatalogoView({ onApplyCustomData }) {
  const [catalogo, setCatalogo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Custom SQL State
  const [customSql, setCustomSql] = useState('');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState(null);
  
  // Mapping State
  const [mapping, setMapping] = useState({ lat: '', lon: '', label: '', category: '' });

  useEffect(() => {
    fetchCatalogo()
      .then(data => setCatalogo(data.catalogo))
      .catch(e => console.error("Error loading catalog:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleRunCustomSql = async () => {
    if (!customSql.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const data = await executeSql(customSql);
      setSqlResult(data);
      if (data.columns.length > 0) {
        setMapping({
          lat: data.columns.find(c => c.toLowerCase().includes('lat')) || '',
          lon: data.columns.find(c => c.toLowerCase().includes('lon') || c.toLowerCase().includes('lng')) || '',
          label: data.columns.find(c => c.toLowerCase().includes('nom') || c.toLowerCase().includes('tit')) || data.columns[0] || '',
          category: data.columns.find(c => c.toLowerCase().includes('tipo') || c.toLowerCase().includes('cat')) || ''
        });
      }
    } catch (e) {
      setSqlError(e.message);
    } finally {
      setSqlLoading(false);
    }
  };

  const handleApplyToMap = () => {
    if (!sqlResult || !sqlResult.rows.length) return;
    
    // Convert to AI Result format
    const customData = {
      data: sqlResult.rows,
      column_mapping: mapping,
      resumen: "Capa personalizada creada desde el catálogo.",
      sql: customSql
    };
    onApplyCustomData(customData);
  };

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
        Explora todas las capas de datos indexadas en el DataLake (DuckDB) disponibles para consultas por la IA, o crea tus propias vistas personalizadas.
      </p>

      {/* Custom SQL Builder */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--brand-cyan)' }}>
        <div className="card-header" style={{ fontSize: '1.1rem', color: 'var(--brand-blue)' }}>
          <span><i className="fa-solid fa-code" /> Creador de Vistas Personalizadas (SQL)</span>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <textarea 
            rows={4} 
            value={customSql} 
            onChange={e => setCustomSql(e.target.value)}
            placeholder="SELECT latitud, longitud, nombre, 'personalizado' as tipo FROM sismology_sismology LIMIT 10"
            style={{ width: '100%', background: '#1a1a2e', color: '#00ff00', fontFamily: 'monospace', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={handleRunCustomSql} disabled={sqlLoading} style={{ background: 'var(--brand-blue)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
               {sqlLoading ? 'Ejecutando...' : 'Ejecutar SQL'}
            </button>
          </div>

          {sqlError && (
             <div style={{ color: 'var(--alert-critical)', background: 'rgba(239,68,68,0.1)', padding: '0.8rem', borderRadius: 4, marginTop: '1rem', fontFamily: 'monospace' }}>
               {sqlError}
             </div>
          )}

          {sqlResult && (
             <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Mapeo Semántico de Columnas (Para Visualización)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Columna Latitud</label>
                     <select value={mapping.lat} onChange={e => setMapping({...mapping, lat: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <option value="">Seleccionar...</option>
                        {sqlResult.columns.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Columna Longitud</label>
                     <select value={mapping.lon} onChange={e => setMapping({...mapping, lon: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <option value="">Seleccionar...</option>
                        {sqlResult.columns.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Etiqueta/Título</label>
                     <select value={mapping.label} onChange={e => setMapping({...mapping, label: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <option value="">Seleccionar...</option>
                        {sqlResult.columns.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Tipo/Categoría</label>
                     <select value={mapping.category} onChange={e => setMapping({...mapping, category: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <option value="">Seleccionar...</option>
                        {sqlResult.columns.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                <button onClick={handleApplyToMap} style={{ background: 'var(--brand-cyan)', color: 'black', padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1rem' }}>
                  <i className="fa-solid fa-map" /> Aplicar Configuración
                </button>

                <div style={{ overflowX: 'auto', maxHeight: 250, border: '1px solid var(--border-color)', borderRadius: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-base)', position: 'sticky', top: 0 }}>
                      <tr>
                        {sqlResult.columns.map(c => <th key={c} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row, i) => (
                        <tr key={i}>
                          {sqlResult.columns.map(c => <td key={c} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>{String(row[c] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
        </div>
      </div>

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
