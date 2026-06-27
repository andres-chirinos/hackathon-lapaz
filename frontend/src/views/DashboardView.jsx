import { useEffect, useState } from 'react';
import { fetchDashboardData } from '../api';

export default function DashboardView({ dates, aiResult }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardData(dates.startDate, dates.endDate)
      .then(setData)
      .catch(e => console.error("Error loading dashboard:", e));
  }, [dates]);

  const gaugeOffset = data ? 125.6 - (125.6 * Math.min((data.aqi || 0) / 300, 1)) : 125.6;

  return (
    <>
      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            Calidad del Aire (AQI)
            <i className="fa-solid fa-wind" style={{ color: 'var(--alert-toxic)', fontSize: '1.5rem' }} />
          </div>
          <div className="gauge-container">
            <svg className="gauge-svg" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="aqi-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="50%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#9333EA" />
                </linearGradient>
              </defs>
              <path className="gauge-bg" d="M 10 40 A 30 30 0 0 1 90 40" />
              <path className="gauge-val" d="M 10 40 A 30 30 0 0 1 90 40" style={{ strokeDashoffset: gaugeOffset }} />
            </svg>
            <div className="gauge-text">{data?.aqi ?? '--'}</div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            Último Sismo
            <i className="fa-solid fa-house-crack" style={{ color: 'var(--brand-cyan)', fontSize: '1.5rem' }} />
          </div>
          <div className="card-value">
            {data?.seismic_mag ?? '--'}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}> Mag</span>
          </div>
          <svg className="sparkline" viewBox="0 0 100 30">
            <path d="M0,25 L10,25 L15,10 L20,30 L25,5 L30,25 L100,25" stroke="var(--brand-cyan)" />
          </svg>
        </article>

        <article className="card">
          <div className="card-header">
            Puntos de Bloqueo Activos
            <i className="fa-solid fa-road-barrier" style={{ color: 'var(--alert-critical)', fontSize: '1.5rem' }} />
          </div>
          <div className="card-value">{data?.blockades ?? '--'}</div>
          {data?.blockades > 0 && (
            <ul className="blockade-list">
              <li><i className="fa-solid fa-traffic-light" style={{ color: 'var(--alert-critical)' }} /> {data.blockades} puntos críticos detectados</li>
            </ul>
          )}
        </article>
      </section>

      {aiResult?.resumen && (
        <div style={{ marginTop: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--brand-blue)' }}>
            <div className="card-header">Conclusión de la IA <i className="fa-solid fa-robot" style={{ color: 'var(--brand-blue)' }} /></div>
            <div style={{ padding: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>{aiResult.resumen}</div>
          </div>
        </div>
      )}
    </>
  );
}
