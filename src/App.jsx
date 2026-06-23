import React, { useState, useEffect, useMemo } from 'react';
import MapContainer from './components/MapContainer';
import SearchFilter from './components/SearchFilter';
import SlsDetail from './components/SlsDetail';
import SettingsModal from './components/SettingsModal';
import GlassPanel from './components/GlassPanel';
import { findSLSForLocation } from './utils/geoUtils';
import { 
  Settings, 
  Compass, 
  MapPin, 
  Layers, 
  ChevronRight, 
  Info, 
  AlertTriangle,
  Locate,
  CheckCircle,
  HelpCircle,
  Camera,
  Database,
  RefreshCw,
  X
} from 'lucide-react';
import WatermarkCamera from './components/WatermarkCamera';
import SlsChangeForm from './components/SlsChangeForm';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [geojson, setGeojson] = useState(null);
  const [loadingGeojson, setLoadingGeojson] = useState(true);
  const [geojsonError, setGeojsonError] = useState(null);

  // Progress states
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Toasts state (supports multiple concurrent notifications)
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, isLeaving: false }]);
    
    // Start leaving animation after 3500ms
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t))
      );
      
      // Remove from list completely after 3800ms
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  };

  const dismissToast = (id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  };

  // Map settings
  const [theme, setTheme] = useState(() => localStorage.getItem('maps_theme') || 'light');
  const [showSettings, setShowSettings] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activePanelSls, setActivePanelSls] = useState(null);

  // Geolocation states
  const [userLocation, setUserLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, tracking, error, denied
  const [gpsError, setGpsError] = useState(null);
  const [centerOnUserTrigger, setCenterOnUserTrigger] = useState(0);

  // SLS Selection
  const [selectedSls, setSelectedSls] = useState(null);
  const [userSls, setUserSls] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ search: '', kec: '', desa: '' });

  // Fetch GeoJSON
  useEffect(() => {
    fetch('peta_subsls_202527310.geojson')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Gagal memuat file GeoJSON');
        }
        return res.json();
      })
      .then((data) => {
        setGeojson(data);
        setLoadingGeojson(false);
      })
      .catch((err) => {
        console.error(err);
        setGeojsonError(err.message);
        setLoadingGeojson(false);
      });
  }, []);

  // Fetch Progress Data
  const fetchProgress = () => {
    setLoadingProgress(true);
    setProgressError(null);
    fetch('https://barru.stat7300.net/dashse/api/dashboard.php')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Gagal memuat data progres');
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.status === 'success' && data.sls) {
          const lookup = {};
          let totalTarget = 0;
          let totalOpen = 0;

          // Create lookup for petugas/officers
          const petugasLookup = {};
          if (data.petugas) {
            data.petugas.forEach((p) => {
              if (p.username) {
                petugasLookup[p.username.toLowerCase().trim()] = p;
              }
            });
          }

          let totalDraft = 0;
          data.sls.forEach((item) => {
            if (item.regionCode) {
              const codeStr = item.regionCode.toString().trim();
              const userEmail = item.username ? item.username.toLowerCase().trim() : '';
              const petugasInfo = petugasLookup[userEmail] || {};

              lookup[codeStr] = {
                ...item,
                real_name: petugasInfo.real_name || item.real_name || '',
                pml_name: petugasInfo.pml_name || item.pml_name || ''
              };

              totalTarget += parseInt(item.totalRegion || 0, 10);
              totalOpen += parseInt(item.OPEN || 0, 10);
              totalDraft += parseInt(item.DRAFT || 0, 10);
            }
          });

          setProgressData(lookup);
          setProgressSummary({
            total: totalTarget,
            open: totalOpen,
            draft: totalDraft,
            completed: totalTarget - totalOpen - totalDraft,
            percent: totalTarget > 0 ? ((totalTarget - totalOpen - totalDraft) / totalTarget) * 100 : 0
          });
        } else {
          throw new Error('Format data progres tidak valid');
        }
        setLoadingProgress(false);
      })
      .catch((err) => {
        console.error('Progress API error:', err);
        setProgressError(err.message || 'Gagal mengambil data progres');
        setLoadingProgress(false);
      });
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Browser Anda tidak mendukung Geolocation');
      return;
    }

    setGpsStatus('tracking');
    let useHighAccuracy = true;
    let watchId;

    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setUserLocation({ latitude, longitude, accuracy });
          setGpsError(null);
        },
        (err) => {
          console.warn(`GPS tracking error (highAccuracy=${useHighAccuracy}):`, err);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('denied');
            setGpsError('Izin akses GPS ditolak');
          } else {
            // Fallback: If high accuracy fails with Code 2 (Unavailable) or Code 3 (Timeout), try standard accuracy
            if (useHighAccuracy && (err.code === 2 || err.code === 3)) {
              console.log('Falling back to standard accuracy geolocation...');
              useHighAccuracy = false;
              navigator.geolocation.clearWatch(watchId);
              startTracking();
            } else {
              setGpsStatus('error');
              setGpsError(err.message || 'Gagal mendeteksi lokasi');
            }
          }
        },
        { 
          enableHighAccuracy: useHighAccuracy, 
          timeout: useHighAccuracy ? 10000 : 20000, 
          maximumAge: useHighAccuracy ? 0 : 30000 
        }
      );
    };

    startTracking();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Calculate which SLS the user is inside when position or geojson changes
  useEffect(() => {
    if (!userLocation || !geojson) {
      setUserSls(null);
      return;
    }

    const matchedSls = findSLSForLocation(
      userLocation.latitude,
      userLocation.longitude,
      geojson
    );
    setUserSls(matchedSls);

    // Auto-select user SLS if no SLS is selected yet
    if (matchedSls && !selectedSls) {
      setSelectedSls(matchedSls);
    }
  }, [userLocation, geojson]);

  // Compute filtered SLS list
  const filteredSlsIds = useMemo(() => {
    if (!geojson || !geojson.features) return null;

    const ids = new Set();
    const { search, kec, desa } = filters;

    geojson.features.forEach((feature) => {
      const props = feature.properties || {};
      
      // Match text (SLS name or IDs)
      const nmsls = (props.nmsls || '').toLowerCase();
      const idsls = (props.idsls || '').toLowerCase();
      const idsubsls = (props.idsubsls || '').toLowerCase();
      const matchText = !search || nmsls.includes(search) || idsls.includes(search) || idsubsls.includes(search);

      // Match Kecamatan
      const nmkec = (props.nmkec || '').toUpperCase();
      const matchKec = !kec || nmkec === kec;

      // Match Desa
      const nmdesa = (props.nmdesa || '').toUpperCase();
      const matchDesa = !desa || nmdesa === desa;

      if (matchText && matchKec && matchDesa) {
        ids.add(props.idsubsls);
      }
    });

    return ids;
  }, [geojson, filters]);

  // Filtered SLS list array for sidebar view
  const filteredSlsFeatures = useMemo(() => {
    if (!geojson || !filteredSlsIds) return [];
    return geojson.features.filter(f => filteredSlsIds.has(f.properties.idsubsls));
  }, [geojson, filteredSlsIds]);

  const handleSaveSettings = (newTheme) => {
    setTheme(newTheme);
    setShowSettings(false);
  };

  const handleCenterOnUser = () => {
    if (userLocation) {
      setCenterOnUserTrigger(prev => prev + 1);
    } else {
      showToast('Mencari sinyal GPS lokasi Anda...', 'info');
    }
  };

  const handleSelectSls = (sls) => {
    setSelectedSls(sls);
  };

  return (
    <div style={styles.appContainer}>
      {/* MAP */}
      <div style={styles.mapContainer}>
        <MapContainer
          theme={theme}
          geojson={geojson}
          userLocation={userLocation}
          selectedSls={selectedSls}
          onSelectSls={handleSelectSls}
          filteredSlsIds={filteredSlsIds}
          centerOnUserTrigger={centerOnUserTrigger}
          progressData={progressData}
        />
      </div>

      {/* FLOATING SIDEBAR TOGGLE (When Collapsed) */}
      {isSidebarCollapsed && (
        <button 
          onClick={() => setIsSidebarCollapsed(false)} 
          className="btn-primary animate-fade-in" 
          style={styles.floatingToggleBtn}
        >
          <Layers size={16} style={{ marginRight: 6 }} /> Tampilkan Panel
        </button>
      )}

      {/* SIDEBAR OVERLAY */}
      {!isSidebarCollapsed && (
        <div className="sidebar-overlay" style={styles.sidebarOverlay}>
        {/* Top Header Card */}
        <GlassPanel style={styles.headerCard}>
          <div style={styles.headerInfo}>
            <div style={styles.logoBg}>
              <Layers size={20} color="white" />
            </div>
            <div>
              <h1 style={styles.appTitle}>Peta SE Barru</h1>
              <p style={styles.appSubtitle}>Kabupaten Barru, Sulawesi Selatan</p>
            </div>
            
            <div style={styles.headerBtnGroup}>
              <button 
                onClick={() => setShowAdmin(true)} 
                style={styles.adminBtn}
                title="Rekapitulasi Data Admin"
              >
                <Database size={16} />
              </button>
              <button 
                onClick={() => setShowSettings(true)} 
                style={styles.settingsBtn}
                title="Pengaturan"
              >
                <Settings size={16} />
              </button>
              <button 
                onClick={() => setIsSidebarCollapsed(true)} 
                style={styles.settingsBtn}
                title="Sembunyikan Panel"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* Search & Filter Card */}
        {geojson && (
          <SearchFilter 
            geojson={geojson} 
            onFilterChange={setFilters} 
          />
        )}

        {/* Progress Summary & Legend Card */}
        <GlassPanel style={styles.progressCard}>
          <div style={styles.progressHeader}>
            <div style={styles.progressTitleGroup}>
              <RefreshCw 
                size={14} 
                className={loadingProgress ? 'pulse-location' : ''} 
                onClick={fetchProgress}
                style={{ cursor: 'pointer', color: 'hsl(var(--color-primary))' }}
              />
              <span style={styles.progressCardTitle}>Progres Pencacahan</span>
            </div>
            {progressSummary && (
              <span style={styles.progressPercentText}>
                {progressSummary.percent.toFixed(1)}%
              </span>
            )}
          </div>

          {loadingProgress && !progressData && (
            <div style={styles.progressLoading}>Memuat data progres...</div>
          )}

          {progressError && (
            <div style={styles.progressError}>
              <AlertTriangle size={12} color="#ff3b30" />
              <span>Gagal memuat: {progressError}</span>
            </div>
          )}

          {progressSummary && (
            <div style={styles.progressStatsBody}>
              {/* Progress Bar */}
              <div style={styles.progressBarWrapper}>
                <div 
                  style={{ 
                    ...styles.progressBar, 
                    width: `${progressSummary.percent}%` 
                  }} 
                />
              </div>
              
              {/* Stats Counters */}
              <div style={styles.progressDetailsGrid}>
                <div style={styles.progressDetailItem}>
                  <span style={styles.progressDetailLabel}>Target</span>
                  <span style={styles.progressDetailVal}>{progressSummary.total}</span>
                </div>
                <div style={styles.progressDetailItem}>
                  <span style={styles.progressDetailLabel}>Sudah</span>
                  <span style={{ ...styles.progressDetailVal, color: '#2e7d32' }}>{progressSummary.completed}</span>
                </div>
                <div style={styles.progressDetailItem}>
                  <span style={styles.progressDetailLabel}>Sisa (O/D)</span>
                  <span style={{ ...styles.progressDetailVal, color: '#e65100' }} title={`Belum Mulai: ${progressSummary.open}, Draft: ${progressSummary.draft}`}>
                    {progressSummary.open + progressSummary.draft}
                  </span>
                </div>
              </div>

              <div style={styles.divider} />

              {/* Color Legends */}
              <div style={styles.legendContainer}>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: '#34c759', border: '1px solid #2e7d32' }} />
                  <span style={styles.legendText}>Selesai</span>
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: '#ff9800', border: '1px solid #f57c00' }} />
                  <span style={styles.legendText}>Dicacah</span>
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: '#cfd8dc', border: '1px solid #90a4ae' }} />
                  <span style={styles.legendText}>Belum Mulai</span>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>

        {/* GPS Location Tracker Card */}
        <GlassPanel style={styles.gpsCard}>
          <div style={styles.gpsHeader}>
            <div style={styles.gpsStatusWrapper}>
              <Compass 
                size={16} 
                color={gpsStatus === 'tracking' ? 'hsl(var(--color-primary))' : '#ff3b30'} 
                className={gpsStatus === 'tracking' ? 'pulse-location' : ''} 
              />
              <span style={styles.gpsStatusText}>
                {gpsStatus === 'tracking' && 'GPS Aktif'}
                {gpsStatus === 'denied' && 'GPS Ditolak'}
                {gpsStatus === 'error' && 'Error GPS'}
                {gpsStatus === 'idle' && 'GPS Menunggu'}
              </span>
            </div>
            {userLocation && (
              <button onClick={handleCenterOnUser} className="btn-secondary" style={styles.locateBtn}>
                <Locate size={14} /> Pusatkan
              </button>
            )}
          </div>

          {userLocation ? (
            <div style={styles.gpsDetails}>
              <div style={styles.gpsCoordinates}>
                <span>Lat: {userLocation.latitude.toFixed(6)}</span>
                <span>Lng: {userLocation.longitude.toFixed(6)}</span>
                <span>Akurasi: ±{userLocation.accuracy.toFixed(1)}m</span>
              </div>

              <button 
                onClick={() => setShowCamera(true)}
                className="btn-primary"
                style={styles.cameraTriggerBtn}
              >
                <Camera size={14} style={{ marginRight: 6 }} /> Ambil Foto Lokasi
              </button>
              
              <div style={styles.gpsLocationAlert}>
                {userSls ? (
                  <div style={styles.inSlsContainer}>
                    <CheckCircle size={14} color="#34c759" style={{ marginRight: 6 }} />
                    <span style={styles.inSlsText}>
                      Anda berada di: <strong>{userSls.properties.nmsls}</strong>
                    </span>
                  </div>
                ) : (
                  <div style={styles.outSlsContainer}>
                    <AlertTriangle size={14} color="hsl(var(--color-primary))" style={{ marginRight: 6 }} />
                    <span style={styles.outSlsText}>
                      Koordinat Anda berada di luar batas wilayah SLS yang terdaftar.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.gpsWarning}>
              {gpsError ? (
                <p style={styles.gpsErrorText}>{gpsError}</p>
              ) : (
                <p style={styles.gpsLoadingText}>Mencari lokasi Anda...</p>
              )}
            </div>
          )}
        </GlassPanel>

        {/* Selected SLS Details Card */}
        {selectedSls && (
          <SlsDetail
            feature={selectedSls}
            isUserLocation={userSls && selectedSls && userSls.properties.idsubsls === selectedSls.properties.idsubsls}
            onClose={() => setSelectedSls(null)}
            onReportChange={(feat) => {
              setActivePanelSls(feat);
              setShowChangeForm(true);
            }}
            progressInfo={progressData?.[selectedSls?.properties?.idsubsls]}
          />
        )}

        {/* SLS Change Form Card */}
        {showChangeForm && activePanelSls && (
          <SlsChangeForm
            feature={activePanelSls}
            userLocation={userLocation}
            progressData={progressData}
            onClose={() => {
              setShowChangeForm(false);
              setActivePanelSls(null);
            }}
            showToast={showToast}
          />
        )}

        {/* Show quick trigger to inspect user location SLS */}
        {userSls && (!selectedSls || selectedSls.properties.idsubsls !== userSls.properties.idsubsls) && (
          <button 
            onClick={() => setSelectedSls(userSls)} 
            className="btn-primary animate-fade-in" 
            style={styles.quickUserSlsBtn}
          >
            <Compass size={16} /> Lihat SLS Posisi Anda
          </button>
        )}

        {/* GeoJSON Load Loading & Errors */}
        {loadingGeojson && (
          <GlassPanel style={styles.statusCard}>
            <div style={styles.statusInner}>
              <div className="pulse-location" style={styles.pulseDot} />
              <span>Memuat data batas wilayah SLS ({((3.1 * 1024 * 1024) / 1024 / 1024).toFixed(1)} MB)...</span>
            </div>
          </GlassPanel>
        )}

        {geojsonError && (
          <GlassPanel style={styles.errorCard}>
            <AlertTriangle size={20} color="#ff3b30" />
            <span style={styles.errorText}>Gagal memuat batas peta: {geojsonError}</span>
          </GlassPanel>
        )}
      </div>
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />

      {/* GPS WATERMARK CAMERA */}
      <WatermarkCamera
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        userLocation={userLocation}
        currentSls={userSls}
        showToast={showToast}
      />

      {/* ADMIN RECAP DASHBOARD */}
      <AdminDashboard
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        geojson={geojson}
        showToast={showToast}
      />

      {/* GORGEOUS GLASSMORPHISM TOASTS */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type} ${t.isLeaving ? 'toast-leave' : 'toast-enter'}`}
          >
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error' && <AlertTriangle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            {t.type === 'warning' && <AlertTriangle size={18} />}
            <span className="toast-message">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="toast-close-btn"
              title="Tutup"
            >
              <X size={14} />
            </button>
            <div className="toast-progress">
              <div className="toast-progress-bar" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    width: '380px',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingRight: '4px', // scrollbar spacing
  },
  headerCard: {
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
  },
  logoBg: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #ff6600 0%, #ff822e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(255, 102, 0, 0.2)',
  },
  appTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
    lineHeight: '1.2',
  },
  appSubtitle: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
  },
  settingsBtn: {
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'hsl(var(--color-dark))',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#ffffff',
      color: 'hsl(var(--color-primary))',
    }
  },
  adminBtn: {
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'hsl(var(--color-dark))',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#ffffff',
      color: 'hsl(var(--color-primary))',
    }
  },
  headerBtnGroup: {
    marginLeft: 'auto',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  gpsCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  gpsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsStatusWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  gpsStatusText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  locateBtn: {
    padding: '6px 10px',
    fontSize: '11px',
    borderRadius: '8px',
  },
  gpsDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  gpsCoordinates: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: 'hsl(var(--color-gray-text))',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: '6px 8px',
    borderRadius: '6px',
  },
  gpsLocationAlert: {
    fontSize: '12px',
    lineHeight: '1.4',
  },
  inSlsContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(52, 199, 89, 0.08)',
    border: '1px solid rgba(52, 199, 89, 0.15)',
    padding: '8px 10px',
    borderRadius: '8px',
    color: '#1d8935',
  },
  inSlsText: {
    flex: 1,
  },
  outSlsContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 102, 0, 0.06)',
    border: '1px solid rgba(255, 102, 0, 0.12)',
    padding: '8px 10px',
    borderRadius: '8px',
    color: 'hsl(var(--color-primary-hover))',
  },
  outSlsText: {
    flex: 1,
  },
  gpsWarning: {
    padding: '8px 0',
    textAlign: 'center',
  },
  gpsLoadingText: {
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
    fontStyle: 'italic',
  },
  gpsErrorText: {
    fontSize: '12px',
    color: '#ff3b30',
    fontWeight: 500,
  },
  statusCard: {
    padding: '12px 16px',
    border: '1px solid rgba(255,255,255,0.4)',
  },
  statusInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: 'hsl(var(--color-dark))',
    fontWeight: 500,
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'hsl(var(--color-primary))',
  },
  errorCard: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  errorText: {
    fontSize: '12px',
    color: '#ff3b30',
    fontWeight: 500,
  },
  quickUserSlsBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px',
    fontSize: '13px',
    borderRadius: '12px',
  },
  cameraTriggerBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '10px',
    fontSize: '13px',
    borderRadius: '10px',
    marginTop: '4px',
  },
  progressCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  progressCardTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'hsl(var(--color-dark))',
    textTransform: 'uppercase',
  },
  progressPercentText: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'hsl(var(--color-primary))',
  },
  progressLoading: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  progressError: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#ff3b30',
    background: 'rgba(255, 59, 48, 0.05)',
    padding: '6px 10px',
    borderRadius: '8px',
  },
  progressStatsBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressBarWrapper: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'hsl(var(--color-primary))',
    borderRadius: '3px',
    transition: 'width 0.4s ease-out',
  },
  progressDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    textAlign: 'center',
  },
  progressDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  progressDetailLabel: {
    fontSize: '10px',
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
  },
  progressDetailVal: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  legendContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '4px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendText: {
    fontSize: '10px',
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
  },
  divider: {
    height: '1px',
    background: 'rgba(0,0,0,0.06)',
    margin: '4px 0',
  },
  floatingToggleBtn: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(255, 102, 0, 0.3)',
  }
};
