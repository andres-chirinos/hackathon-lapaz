export default function Ticker() {
  return (
    <div className="ticker-wrap">
      <div className="ticker-label">Alertas en Tiempo Real</div>
      <div className="ticker">
        <div className="ticker-item"><i className="fa-solid fa-fire" style={{ color: 'var(--alert-warning)' }} /> NUEVO FOCO DE CALOR: Detectado en Mallasa.</div>
        <div className="ticker-item"><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--alert-critical)' }} /> SISMO: Magnitud 3.5 en Pucarani.</div>
        <div className="ticker-item"><i className="fa-solid fa-traffic-light" style={{ color: 'var(--alert-toxic)' }} /> BLOQUEO REPORTADO: Puente Trillizos.</div>
        <div className="ticker-item"><i className="fa-solid fa-wind" style={{ color: 'var(--alert-stable)' }} /> CALIDAD DEL AIRE: Moderada en la ciudad.</div>
      </div>
    </div>
  );
}
