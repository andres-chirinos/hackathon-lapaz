export default function AlertModal({ open, onClose, alertInfo, onViewMap }) {
  if (!open || !alertInfo) return null;

  return (
    <div style={{
      display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', zIndex: 2000, justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        background: 'var(--bg-surface)', padding: '2rem', borderRadius: 12,
        maxWidth: 600, width: '90%', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{
          color: 'var(--alert-critical)', display: 'flex', alignItems: 'center', gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem'
        }}>
          <i className="fa-solid fa-triangle-exclamation" /> Detalles de Alerta
        </h2>
        <div style={{ margin: '1.5rem 0', color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto' }}>
          {alertInfo.alerts?.map((a, i) => (
            <div key={i} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--alert-critical)', marginBottom: '0.5rem' }}>🔥 {a.tipo}</h3>
              <p>{a.descripcion}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button onClick={onClose} style={{
            background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
            padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
          }}>Cerrar</button>
          <button onClick={onViewMap} style={{
            background: 'var(--brand-cyan)', color: '#000', padding: '0.5rem 1rem',
            borderRadius: 8, cursor: 'pointer', border: 'none', fontWeight: 'bold'
          }}>Ver en Mapa</button>
        </div>
      </div>
    </div>
  );
}
