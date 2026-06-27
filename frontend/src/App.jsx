import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ChatSidebar from './components/ChatSidebar';
import SqlPanel from './components/SqlPanel';
import AlertBanner from './components/AlertBanner';
import AlertModal from './components/AlertModal';
import Ticker from './components/Ticker';
import DashboardView from './views/DashboardView';
import MapView from './views/MapView';
import CatalogoView from './views/CatalogoView';

function getDefaultDates() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return {
    startDate: lastWeek.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [dates, setDates] = useState(getDefaultDates);
  const [location, setLocation] = useState({ lat: -16.5, lon: -68.1193, name: '' });
  const [sqlOpen, setSqlOpen] = useState(false);
  const [lastSql, setLastSql] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [municipioGeojson, setMunicipioGeojson] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  const handleAiResult = useCallback((result) => {
    setAiResult(result);
    if (result?.sql) setLastSql(result.sql);
  }, []);

  const handleApplyCustomData = useCallback((customData) => {
    setAiResult(customData);
    if (customData?.sql) setLastSql(customData.sql);
    setView('map');
  }, []);

  return (
    <>
      <Header
        view={view}
        setView={setView}
        dates={dates}
        setDates={setDates}
        location={location}
        setLocation={setLocation}
        theme={theme}
        toggleTheme={toggleTheme}
        setMunicipioGeojson={setMunicipioGeojson}
        setAlertInfo={setAlertInfo}
      />

      <div id="app-layout" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 72px - 40px)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <AlertBanner alertInfo={alertInfo} onViewDetails={() => setModalOpen(true)} />

          <main id="main-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
            {view === 'dashboard' && (
              <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <DashboardView dates={dates} aiResult={aiResult} />
              </div>
            )}
            {view === 'map' && (
              <MapView
                dates={dates}
                location={location}
                setLocation={setLocation}
                aiResult={aiResult}
                municipioGeojson={municipioGeojson}
              />
            )}
            {view === 'catalogo' && (
              <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <CatalogoView onApplyCustomData={handleApplyCustomData} />
              </div>
            )}
          </main>

          {sqlOpen && (
            <SqlPanel
              initialSql={lastSql}
              onClose={() => setSqlOpen(false)}
            />
          )}
        </div>

        <ChatSidebar
          location={location}
          onResult={handleAiResult}
          onOpenSql={() => setSqlOpen(true)}
        />
      </div>

      <Ticker />

      <AlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alertInfo={alertInfo}
        onViewMap={() => { setView('map'); setModalOpen(false); }}
      />
    </>
  );
}
