import React, { useState, useEffect } from 'react';
import GlassPanel from './GlassPanel';
import { Search, MapPin, SlidersHorizontal, RotateCcw } from 'lucide-react';

export default function SearchFilter({ geojson, onFilterChange }) {
  const [searchText, setSearchText] = useState('');
  const [selectedKec, setSelectedKec] = useState('');
  const [selectedDesa, setSelectedDesa] = useState('');
  const [kecOptions, setKecOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  // Extract Kecamatan & Desa lists from GeoJSON
  useEffect(() => {
    if (!geojson || !geojson.features) return;

    const kecs = new Set();
    geojson.features.forEach(f => {
      if (f.properties.nmkec) {
        kecs.add(f.properties.nmkec.trim().toUpperCase());
      }
    });

    setKecOptions(Array.from(kecs).sort());
  }, [geojson]);

  // Extract Desa based on selected Kecamatan
  useEffect(() => {
    if (!geojson || !geojson.features) return;

    const desas = new Set();
    geojson.features.forEach(f => {
      const matchKec = !selectedKec || (f.properties.nmkec && f.properties.nmkec.trim().toUpperCase() === selectedKec);
      if (matchKec && f.properties.nmdesa) {
        desas.add(f.properties.nmdesa.trim().toUpperCase());
      }
    });

    setDesaOptions(Array.from(desas).sort());
    // Reset selected Desa if it's no longer valid in the new Kecamatan list
    if (selectedDesa && !desas.has(selectedDesa)) {
      setSelectedDesa('');
    }
  }, [geojson, selectedKec]);

  // Notify parent of filter updates
  useEffect(() => {
    onFilterChange({
      search: searchText.trim().toLowerCase(),
      kec: selectedKec,
      desa: selectedDesa
    });
  }, [searchText, selectedKec, selectedDesa]);

  const handleReset = () => {
    setSearchText('');
    setSelectedKec('');
    setSelectedDesa('');
  };

  return (
    <GlassPanel style={styles.container}>
      <div style={styles.searchWrapper}>
        <Search size={18} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Cari nama SLS / ID SLS..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="input-glass"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Kecamatan</label>
          <select
            value={selectedKec}
            onChange={(e) => setSelectedKec(e.target.value)}
            style={styles.select}
          >
            <option value="">Semua Kecamatan</option>
            {kecOptions.map(kec => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Desa / Kelurahan</label>
          <select
            value={selectedDesa}
            onChange={(e) => setSelectedDesa(e.target.value)}
            style={styles.select}
            disabled={desaOptions.length === 0}
          >
            <option value="">Semua Desa</option>
            {desaOptions.map(desa => (
              <option key={desa} value={desa}>{desa}</option>
            ))}
          </select>
        </div>

        {(searchText || selectedKec || selectedDesa) && (
          <button 
            onClick={handleReset} 
            className="btn-secondary" 
            style={styles.resetBtn}
            title="Reset filter"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
    </GlassPanel>
  );
}

const styles = {
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    color: 'hsl(var(--color-gray-text))',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '42px',
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterGroup: {
    flex: 1,
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'hsl(var(--color-gray-text))',
    paddingLeft: '4px',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.5)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    color: 'hsl(var(--color-dark))',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23666666\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '28px',
  },
  resetBtn: {
    padding: '10px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '38px',
  }
};
