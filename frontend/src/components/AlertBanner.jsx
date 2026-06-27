export default function AlertBanner({ alertInfo, onViewDetails }) {
  if (!alertInfo) return null;

  return (
    <div className="alert-banner">
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.5rem', color: 'var(--alert-critical)' }} />
      <div>
        <strong>Alerta en su Zona</strong><br />
        <span>{alertInfo.text || 'Ubicación detectada'}</span>
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--alert-critical)', fontWeight: 500, marginLeft: '1rem' }}>
        {alertInfo.alerts?.length > 0 && `${alertInfo.alerts.length} alerta(s) detectada(s)`}
        {alertInfo.alerts?.length === 0 && <span style={{ color: 'var(--text-primary)', fontWeight: 'normal' }}>No hay alertas meteorológicas activas.</span>}
      </div>
      {alertInfo.alerts?.length > 0 && (
        <button onClick={onViewDetails} style={{
          background: 'var(--alert-critical)', color: 'white', borderRadius: 4,
          padding: '0.2rem 1rem', border: 'none', fontWeight: 'bold', marginLeft: 'auto', cursor: 'pointer'
        }}>
          Ver Detalles
        </button>
      )}
    </div>
  );
}
