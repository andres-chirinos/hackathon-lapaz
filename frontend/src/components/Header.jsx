import { useState, useEffect, useRef, useCallback } from "react";

export default function Header({
  view,
  setView,
  dates,
  setDates,
  location,
  setLocation,
  theme,
  toggleTheme,
  setMunicipioGeojson,
  setAlertInfo,
}) {
  const [muniSearch, setMuniSearch] = useState("");
  const [muniOpen, setMuniOpen] = useState(false);
  const [allMunicipios, setAllMunicipios] = useState([]);
  const [filteredMunicipios, setFilteredMunicipios] = useState([]);
  const [muniPage, setMuniPage] = useState(1);
  const dropdownRef = useRef(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetch("/data/frontlines/municipios.geojson")
      .then((r) => r.json())
      .then((data) => {
        const sorted = data.features.sort((a, b) =>
          a.properties.nombre.localeCompare(b.properties.nombre),
        );
        setAllMunicipios(sorted);
        setFilteredMunicipios(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setMuniOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setMuniSearch(term);
    setFilteredMunicipios(
      allMunicipios.filter((f) =>
        f.properties.nombre.toLowerCase().includes(term.toLowerCase()),
      ),
    );
    setMuniPage(1);
    setMuniOpen(true);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMunicipios.length / ITEMS_PER_PAGE),
  );
  const pageItems = filteredMunicipios.slice(
    (muniPage - 1) * ITEMS_PER_PAGE,
    muniPage * ITEMS_PER_PAGE,
  );

  const handleSelectMuni = useCallback(
    (f) => {
      setMuniSearch(f.properties.nombre);
      setMuniOpen(false);
      setMunicipioGeojson(f);

      // Compute center from geometry bounding box
      const coords =
        f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates.flat(2)
          : f.geometry.coordinates.flat(1);
      const lats = coords.map((c) => c[1]);
      const lons = coords.map((c) => c[0]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      setLocation({
        lat: centerLat,
        lon: centerLon,
        name: f.properties.nombre,
      });
    },
    [setLocation, setMunicipioGeojson],
  );

  const navItems = [
    { id: "dashboard", label: "Principal" },
    { id: "map", label: "Mapa Interactivo" },
    { id: "catalogo", label: "Catálogo" },
  ];

  return (
    <header>
      <div className="header-left">
        <a className="logo" onClick={() => setView("dashboard")}>
          <img src="logo.png" alt="Kuntur" />
          KUNTUR
        </a>
        <nav className="main-nav">
          {navItems.map((n) => (
            <a
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => setView(n.id)}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="header-right">
        {/* Municipio Search */}
        <div className="header-select" ref={dropdownRef}>
          <i
            className="fa-solid fa-location-dot"
            style={{ color: "var(--alert-critical)" }}
          />
          <input
            type="text"
            value={muniSearch}
            onChange={handleSearch}
            onFocus={() => setMuniOpen(true)}
            placeholder="La Paz, Bolivia"
            autoComplete="off"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontWeight: 600,
              outline: "none",
              width: 140,
            }}
          />
          <i
            className="fa-solid fa-chevron-down"
            style={{ fontSize: "0.7rem" }}
          />
          {muniOpen && (
            <div className="dropdown-list">
              <ul>
                {pageItems.length === 0 && (
                  <li
                    style={{
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No se encontraron resultados
                  </li>
                )}
                {pageItems.map((f, i) => (
                  <li key={i} onClick={() => handleSelectMuni(f)}>
                    {f.properties.nombre}
                  </li>
                ))}
              </ul>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-base)",
                  fontSize: "0.9rem",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMuniPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={muniPage === 1}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--brand-blue)",
                    fontWeight: "bold",
                  }}
                >
                  &lt; Ant
                </button>
                <span style={{ color: "var(--text-secondary)" }}>
                  {muniPage} / {totalPages}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMuniPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={muniPage === totalPages}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--brand-blue)",
                    fontWeight: "bold",
                  }}
                >
                  Sig &gt;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div
          className="header-select"
          style={{ borderRadius: 8, gap: "0.5rem" }}
        >
          <i
            className="fa-solid fa-calendar"
            style={{ color: "var(--brand-blue)" }}
          />
          <input
            type="date"
            value={dates.startDate}
            onChange={(e) =>
              setDates((d) => ({ ...d, startDate: e.target.value }))
            }
            title="Fecha Desde"
            style={{
              padding: "0.2rem 0.5rem",
              border: "none",
              outline: "none",
              background: "transparent",
              width: 130,
              fontSize: "0.85rem",
              color: "var(--text-primary)",
            }}
          />
          <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            -
          </span>
          <input
            type="date"
            value={dates.endDate}
            onChange={(e) =>
              setDates((d) => ({ ...d, endDate: e.target.value }))
            }
            title="Fecha Hasta"
            style={{
              padding: "0.2rem 0.5rem",
              border: "none",
              outline: "none",
              background: "transparent",
              width: 130,
              fontSize: "0.85rem",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="controls">
          <button
            className="theme-toggle"
            title="Cambiar Tema"
            onClick={toggleTheme}
          >
            <i
              className={`fa-solid ${theme === "light" ? "fa-moon" : "fa-sun"}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
