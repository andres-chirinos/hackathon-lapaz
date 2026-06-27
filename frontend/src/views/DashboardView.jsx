import { useEffect, useState } from 'react';
import { fetchDashboardData } from '../api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
);

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

      {aiResult && (
        <div style={{ marginTop: '2rem' }}>
          {/* Instrucciones de Renderizado de la IA */}
          <div className="card" style={{ borderLeft: '4px solid var(--brand-blue)', marginBottom: '2rem' }}>
            <div className="card-header">Conclusión e Indicaciones de la IA <i className="fa-solid fa-robot" style={{ color: 'var(--brand-blue)' }} /></div>
            <div style={{ padding: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <p><strong>Resumen Ejecutivo:</strong> {aiResult.resumen}</p>
              {aiResult.column_mapping?.render_instructions && (
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  <strong><i className="fa-solid fa-lightbulb" style={{ color: '#EAB308' }} /> Indicaciones de Renderizado:</strong> {aiResult.column_mapping.render_instructions}
                </p>
              )}
              {aiResult.column_mapping?.types && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(aiResult.column_mapping.types).map(([col, type]) => (
                    <span key={col} style={{ background: 'var(--bg-base)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                      <strong>{col}:</strong> {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gráficos Dinámicos */}
          {aiResult.dashboard?.length > 0 && aiResult.data?.length > 0 && (
            <div className="dashboard-grid">
              {aiResult.dashboard.map((chart, idx) => {
                // Preparar datos para Chart.js
                if (chart.tipo === 'map') return null; // Mapas se ven en MapView
                
                const isLine = chart.tipo === 'line' || chart.tipo === 'area';
                const ChartComponent = isLine ? Line : (chart.tipo === 'scatter' ? Scatter : Bar);
                
                const labels = aiResult.data.map(d => d[chart.x]);
                const dataPoints = aiResult.data.map(d => d[chart.y]);

                const chartData = {
                  labels,
                  datasets: [
                    {
                      label: chart.y,
                      data: dataPoints,
                      backgroundColor: 'rgba(0, 229, 255, 0.5)',
                      borderColor: 'var(--brand-cyan)',
                      borderWidth: 2,
                      fill: chart.tipo === 'area',
                      tension: 0.4
                    }
                  ]
                };

                const options = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: true, text: chart.titulo, color: 'var(--text-primary)' }
                  },
                  scales: {
                    x: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } },
                    y: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } }
                  }
                };

                return (
                  <article className="card" key={idx} style={{ height: 400 }}>
                    <div className="card-header">{chart.titulo}</div>
                    <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                      <ChartComponent data={chartData} options={options} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
