import React, { useState, useEffect, useMemo } from 'react';
import GlassPanel from './GlassPanel';
import { 
  X, 
  RefreshCw, 
  Image as ImageIcon, 
  FileText, 
  MapPin, 
  Calendar, 
  AlertTriangle,
  Camera,
  CheckCircle,
  Database,
  Download,
  Eye,
  Lock,
  Unlock,
  ChevronRight,
  User,
  StickyNote
} from 'lucide-react';

// Hook: deteksi lebar layar
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function AdminDashboard({ isOpen, onClose, geojson, showToast }) {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' or 'changes'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // for zoom modal

  // Admin edit/delete states
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editingChange, setEditingChange] = useState(null);
  const [editPhotoCategory, setEditPhotoCategory] = useState('');
  const [editPhotoDescription, setEditPhotoDescription] = useState(''); // ← BARU
  const [editChangeType, setEditChangeType] = useState('');
  const [editChangeNotes, setEditChangeNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Photo filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [desaFilter, setDesaFilter] = useState('All');

  // Detail modal for change items (mobile)
  const [selectedChange, setSelectedChange] = useState(null);

  // Responsive flag
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 640;

  // Map photo ID SLS to Village names (desa) using geojson properties
  const resolvedPhotos = useMemo(() => {
    if (!data?.photos) return [];
    
    const slsToDesa = {};
    if (geojson && geojson.features) {
      geojson.features.forEach(f => {
        if (f.properties && f.properties.idsubsls) {
          slsToDesa[f.properties.idsubsls] = f.properties.nmdesa || '';
        }
      });
    }
    
    return data.photos.map(p => ({
      ...p,
      nmdesa: slsToDesa[p.idsubsls] || 'Luar Wilayah'
    }));
  }, [data?.photos, geojson]);

  // Extract unique desas from photos for select filter
  const uniqueDesas = useMemo(() => {
    const desas = new Set();
    resolvedPhotos.forEach(p => {
      if (p.nmdesa && p.nmdesa !== 'Luar Wilayah') desas.add(p.nmdesa);
    });
    return Array.from(desas).sort();
  }, [resolvedPhotos]);

  // Apply filters
  const filteredPhotos = useMemo(() => {
    return resolvedPhotos.filter(p => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchDesa = desaFilter === 'All' || p.nmdesa === desaFilter;
      return matchCat && matchDesa;
    });
  }, [resolvedPhotos, categoryFilter, desaFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/get_data.php`;

      const res = await fetch(endpoint);
      const resJson = await res.json();

      if (res.ok && resJson.status === 'success') {
        setData(resJson.data);
      } else {
        setError(resJson.message || 'Gagal membaca data dari server PHP');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke database. Harap periksa apakah MAMP/MySQL berjalan dan API Base URL sudah benar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Handle photo deletion
  const handleDeletePhoto = async (photoId) => {
    if (!isAdminAuthenticated || !adminPassword) {
      showToast('Mode Admin belum diaktifkan!', 'error');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini secara permanen dari server?')) return;
    
    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/delete_photo.php`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, password: adminPassword })
      });
      const resJson = await res.json();

      if (res.ok && resJson.status === 'success') {
        showToast('Foto berhasil dihapus!', 'success');
        fetchData();
      } else {
        showToast('Gagal menghapus: ' + (resJson.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi gagal atau terjadi error.', 'error');
    }
  };

  // Handle photo save edit — sekarang menyertakan description
  const handleSavePhotoEdit = async () => {
    if (!editingPhoto || !editPhotoCategory) return;

    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/edit_photo.php`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingPhoto.id, 
          category: editPhotoCategory,
          description: editPhotoDescription, // ← BARU
          password: adminPassword
        })
      });
      const resJson = await res.json();

      if (res.ok && resJson.status === 'success') {
        showToast('Data foto berhasil diperbarui!', 'success');
        setEditingPhoto(null);
        fetchData();
      } else {
        showToast('Gagal menyimpan: ' + (resJson.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi gagal atau terjadi error.', 'error');
    }
  };

  // Handle change report deletion
  const handleDeleteChange = async (changeId) => {
    if (!isAdminAuthenticated || !adminPassword) {
      showToast('Mode Admin belum diaktifkan!', 'error');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus laporan perubahan ini?')) return;

    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/delete_change.php`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: changeId, password: adminPassword })
      });
      const resJson = await res.json();

      if (res.ok && resJson.status === 'success') {
        showToast('Laporan berhasil dihapus!', 'success');
        fetchData();
      } else {
        showToast('Gagal menghapus: ' + (resJson.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi gagal atau terjadi error.', 'error');
    }
  };

  // Handle change report save edit
  const handleSaveChangeEdit = async () => {
    if (!editingChange || !editChangeType) return;

    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/edit_change.php`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingChange.id, 
          change_type: editChangeType,
          notes: editChangeNotes,
          password: adminPassword
        })
      });
      const resJson = await res.json();

      if (res.ok && resJson.status === 'success') {
        showToast('Laporan berhasil diperbarui!', 'success');
        setEditingChange(null);
        fetchData();
      } else {
        showToast('Gagal menyimpan: ' + (resJson.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi gagal atau terjadi error.', 'error');
    }
  };

  const handleAuthSubmit = () => {
    if (authPassword === 'iyatawwa10') {
      setIsAdminAuthenticated(true);
      setAdminPassword('iyatawwa10');
      setShowAuthModal(false);
      setAuthPassword('');
      setAuthError('');
      showToast('Mode Admin aktif! Akses edit & hapus dibuka.', 'success');
    } else {
      setAuthError('Password salah! Coba lagi.');
    }
  };

  if (!isOpen) return null;

  const summary = data?.summary || {
    total_photos: 0,
    total_dokumentasi: 0,
    total_kendala: 0,
    total_lainnya: 0,
    total_changes: 0
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getApiUrl = (relativePath) => {
    const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
    const cleanPath = relativePath.startsWith('api/') ?
      relativePath.replace('api/', '') : relativePath;
    return `${apiBaseUrl}/${cleanPath}`;
  };

  return (
    <div className="admin-fullscreen-overlay" style={styles.fullscreenOverlay}>
      <GlassPanel className="admin-dashboard-container" style={styles.dashboardContainer}>
        {/* Header */}
        <div className="admin-header" style={styles.header}>
          <div style={styles.titleGroup}>
            <Database size={24} color="hsl(var(--color-primary))" />
            <div>
              <h2 style={styles.title}>Rekapitulasi Data Lapangan</h2>
              <p style={styles.subtitle}>Portal Monitor Survei Sensus Ekonomi</p>
            </div>
          </div>

          <div style={styles.headerActions}>
            {isAdminAuthenticated ? (
              <button 
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  setAdminPassword('');
                  showToast('Keluar dari Mode Admin.', 'info');
                }} 
                className="btn-primary" 
                style={{ ...styles.headerBtn, backgroundColor: '#34c759', color: '#fff', boxShadow: 'none' }}
              >
                <Unlock size={14} style={{ marginRight: 6 }} /> {!isMobile && 'Keluar Admin'}
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="btn-secondary" 
                style={styles.headerBtn}
              >
                <Lock size={14} style={{ marginRight: 6 }} /> {!isMobile && 'Mode Admin'}
              </button>
            )}
            
            <button onClick={fetchData} className="btn-secondary" style={styles.headerBtn} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'pulse-location' : ''} /> {!isMobile && ' Segarkan'}
            </button>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={24} />
            </button>
          </div>
        </div>

        {error && (
          <GlassPanel style={styles.errorBanner}>
            <AlertTriangle size={20} color="#ff3b30" />
            <span>{error}</span>
          </GlassPanel>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div style={styles.loadingArea}>
            <RefreshCw size={36} color="hsl(var(--color-primary))" className="pulse-location" style={styles.spinner} />
            <span style={styles.loadingLabel}>Membaca data dari MAMP server...</span>
          </div>
        ) : (
          <div className="admin-content" style={styles.dashboardContent}>
            {/* Stats Cards Row */}
            <div className="admin-stats-row" style={styles.statsRow}>
              <GlassPanel className="admin-stats-card" style={styles.statsCard}>
                <span className="admin-stats-label" style={styles.statsLabel}>Total Foto</span>
                <span className="admin-stats-value" style={styles.statsValue}>{summary.total_photos}</span>
                <Camera size={20} color="hsl(var(--color-primary))" className="admin-stats-icon" style={styles.statsIcon} />
              </GlassPanel>

              <GlassPanel className="admin-stats-card" style={{ ...styles.statsCard, borderLeft: '4px solid #34c759' }}>
                <span className="admin-stats-label" style={styles.statsLabel}>Dokumentasi</span>
                <span className="admin-stats-value" style={{ ...styles.statsValue, color: '#2b8a3e' }}>{summary.total_dokumentasi}</span>
                <CheckCircle size={20} color="#34c759" className="admin-stats-icon" style={styles.statsIcon} />
              </GlassPanel>

              <GlassPanel className="admin-stats-card" style={{ ...styles.statsCard, borderLeft: '4px solid #ff3b30' }}>
                <span className="admin-stats-label" style={styles.statsLabel}>Kendala Lapangan</span>
                <span className="admin-stats-value" style={{ ...styles.statsValue, color: '#d32f2f' }}>{summary.total_kendala}</span>
                <AlertTriangle size={20} color="#ff3b30" className="admin-stats-icon" style={styles.statsIcon} />
              </GlassPanel>

              <GlassPanel className="admin-stats-card" style={{ ...styles.statsCard, borderLeft: '4px solid #ff9500' }}>
                <span className="admin-stats-label" style={styles.statsLabel}>Laporan Perubahan</span>
                <span className="admin-stats-value" style={{ ...styles.statsValue, color: '#e65100' }}>{summary.total_changes}</span>
                <FileText size={20} color="#ff9500" className="admin-stats-icon" style={styles.statsIcon} />
              </GlassPanel>
            </div>

            {/* Tabs Selector */}
            <div style={styles.tabsRow}>
              <button 
                onClick={() => setActiveTab('photos')} 
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'photos' ? styles.activeTabBtn : {})
                }}
              >
                <ImageIcon size={16} style={{ marginRight: 8 }} /> Galeri Foto Survei ({data?.photos?.length || 0})
              </button>
              <button 
                onClick={() => setActiveTab('changes')} 
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'changes' ? styles.activeTabBtn : {})
                }}
              >
                <FileText size={16} style={{ marginRight: 8 }} /> Laporan Perubahan SLS ({data?.changes?.length || 0})
              </button>
            </div>

            {/* Tab Panel Content */}
            <div style={styles.panelContent}>
              {activeTab === 'photos' ? (
                /* PHOTOS LIST VIEW */
                resolvedPhotos && resolvedPhotos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Filter Bar */}
                    <div style={styles.filterBar}>
                      <div style={styles.filterGroup}>
                        <span style={styles.filterLabel}>Tag Kategori:</span>
                        <select 
                          value={categoryFilter} 
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          style={styles.filterSelect}
                        >
                          <option value="All">Semua Kategori</option>
                          <option value="Dokumentasi">Dokumentasi</option>
                          <option value="Kendala">Kendala</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div style={styles.filterGroup}>
                        <span style={styles.filterLabel}>Desa:</span>
                        <select 
                          value={desaFilter} 
                          onChange={(e) => setDesaFilter(e.target.value)}
                          style={styles.filterSelect}
                        >
                          <option value="All">Semua Desa</option>
                          {uniqueDesas.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={styles.photoGrid}>
                      {filteredPhotos.map((photo) => (
                        <GlassPanel key={photo.id} style={{
                          ...styles.photoCard,
                          // Tinggi dinamis karena ada deskripsi
                          height: photo.description ? 'auto' : '290px',
                          minHeight: '290px',
                        }}>
                          <div style={styles.photoThumbContainer} onClick={() => setSelectedPhoto(photo)}>
                            <img 
                              src={getApiUrl(photo.photo_path)} 
                              alt={photo.nmsls} 
                              style={styles.photoThumb} 
                            />
                            <div style={styles.photoOverlay}>
                              <Eye size={18} color="#fff" />
                            </div>
                          </div>
                          <div style={styles.photoInfo}>
                            <div>
                              <div style={styles.photoHeader}>
                                <span style={{
                                  ...styles.categoryBadge,
                                  ...(photo.category === 'Kendala' ? styles.badgeRed : 
                                      photo.category === 'Dokumentasi' ? styles.badgeGreen : styles.badgeGray)
                                }}>
                                  {photo.category}
                                </span>
                                <span style={styles.photoDate}>{formatDate(photo.created_at)}</span>
                              </div>
                              <h4 style={styles.photoTitle}>{photo.nmsls}</h4>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                <span>Desa: <strong>{photo.nmdesa}</strong></span>
                                <span style={styles.photoCode}>{photo.idsubsls.substring(10, 14)}</span>
                              </div>

                              {/* ── BARU: Deskripsi Foto ── */}
                              {photo.description ? (
                                <div style={styles.photoDescriptionBox}>
                                  <StickyNote size={11} style={{ marginRight: 5, flexShrink: 0, marginTop: 1 }} />
                                  <p style={styles.photoDescription}>{photo.description}</p>
                                </div>
                              ) : null}
                            </div>

                            {/* Admin Edit/Delete Actions */}
                            {isAdminAuthenticated && (
                              <div style={styles.photoAdminActions}>
                                <button 
                                  onClick={() => {
                                    setEditingPhoto(photo);
                                    setEditPhotoCategory(photo.category);
                                    setEditPhotoDescription(photo.description || ''); // ← BARU
                                  }}
                                  style={styles.photoAdminBtn}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  style={{ ...styles.photoAdminBtn, color: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.08)' }}
                                >
                                  Hapus
                                </button>
                              </div>
                            )}

                            <div style={styles.photoFooter}>
                              <div style={styles.photoCoords}>
                                <MapPin size={12} style={{ marginRight: 4 }} />
                                <span>{photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}</span>
                              </div>
                              <a 
                                href={getApiUrl(photo.photo_path)} 
                                download 
                                target="_blank" 
                                rel="noreferrer"
                                style={styles.downloadLink}
                                title="Unduh file foto"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>
                        </GlassPanel>
                      ))}
                    </div>
                    {filteredPhotos.length === 0 && (
                      <div style={styles.emptyState}>Tidak ada foto yang cocok dengan filter terpilih.</div>
                    )}
                  </div>
                ) : (
                  <div style={styles.emptyState}>Belum ada berkas foto dokumentasi yang diunggah ke server.</div>
                )
              ) : (
                /* SLS CHANGES TABLE VIEW */
                data?.changes && data.changes.length > 0 ? (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>SLS / Sub-SLS</th>
                          <th style={styles.th}>Tipe Perubahan</th>
                          {!isMobile && <th style={styles.th}>Catatan / Deskripsi</th>}
                          {!isMobile && <th style={styles.th}>PPL (Pencacah)</th>}
                          {!isMobile && <th style={styles.th}>PML (Pengawas)</th>}
                          {!isMobile && <th style={styles.th}>Geotag Lokasi</th>}
                          <th style={styles.th}>Tanggal Lapor</th>
                          {isAdminAuthenticated && <th style={styles.th}>Aksi Admin</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {data.changes.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              ...styles.tr,
                              ...(isMobile ? { cursor: 'pointer' } : {})
                            }}
                            onClick={isMobile ? () => setSelectedChange(item) : undefined}
                          >
                            <td style={styles.td}>
                              <div style={styles.slsCell}>
                                <span style={styles.slsCellName}>{item.nmsls}</span>
                                <span style={styles.slsCellCode}>{item.idsubsls}</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.typeBadge,
                                ...(item.change_type === 'Pemekaran SLS' ? styles.badgeRed :
                                    item.change_type === 'Penggabungan SLS' ? styles.badgeBlue :
                                    item.change_type === 'Pergantian Tingkatan SLS' ? styles.badgeGreen : styles.badgeOrange)
                              }}>
                                {item.change_type}
                              </span>
                            </td>
                            {!isMobile && <td style={{ ...styles.td, ...styles.tdNotes }}>{item.notes}</td>}
                            {!isMobile && (
                              <td style={styles.td}>
                                <span style={styles.petugasCellName}>{item.ppl_name || <span style={styles.petugasEmpty}>—</span>}</span>
                              </td>
                            )}
                            {!isMobile && (
                              <td style={styles.td}>
                                <span style={styles.petugasCellName}>{item.pml_name || <span style={styles.petugasEmpty}>—</span>}</span>
                              </td>
                            )}
                            {!isMobile && (
                              <td style={styles.td}>
                                <div style={styles.coordLink}>
                                  <MapPin size={12} style={{ marginRight: 4, color: 'hsl(var(--color-primary))' }} />
                                  <span>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>
                                </div>
                              </td>
                            )}
                            <td style={styles.td}>
                              {isMobile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <div style={styles.dateCell}>
                                    <Calendar size={12} style={{ marginRight: 4, color: '#888' }} />
                                    <span>{formatDate(item.created_at)}</span>
                                  </div>
                                  <ChevronRight size={14} color="hsl(var(--color-gray-text))" style={{ flexShrink: 0 }} />
                                </div>
                              ) : (
                                <div style={styles.dateCell}>
                                  <Calendar size={12} style={{ marginRight: 4, color: '#888' }} />
                                  <span>{formatDate(item.created_at)}</span>
                                </div>
                              )}
                            </td>
                            {isAdminAuthenticated && (
                              <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingChange(item);
                                      setEditChangeType(item.change_type);
                                      setEditChangeNotes(item.notes || '');
                                    }}
                                    style={styles.tableAdminBtn}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteChange(item.id);
                                    }}
                                    style={{ ...styles.tableAdminBtn, color: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.08)' }}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={styles.emptyState}>Belum ada laporan perubahan SLS yang dikirim oleh surveyor.</div>
                )
              )}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* CUTE ADMIN AUTH MODAL */}
      {showAuthModal && (
        <div style={styles.editDialogOverlay}>
          <GlassPanel style={styles.authDialogContainer} className="animate-fade-in">
            <div style={styles.authHeader}>
              <span style={{ fontSize: '24px', marginRight: '6px' }}>🔑</span>
              <h3 style={styles.editDialogTitle}>Akses Mode Admin</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'hsl(var(--color-gray-text))', marginTop: '-8px' }}>
              Masukkan password untuk mengaktifkan fitur edit dan hapus.
            </p>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Password Admin</label>
              <input 
                type="password" 
                value={authPassword} 
                onChange={(e) => {
                  setAuthPassword(e.target.value);
                  setAuthError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAuthSubmit();
                }}
                placeholder="••••••••"
                style={styles.selectInput}
                autoFocus
              />
              {authError && (
                <span style={{ color: '#ff3b30', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
                  ❌ {authError}
                </span>
              )}
            </div>
            
            <div style={styles.dialogActions}>
              <button 
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthPassword('');
                  setAuthError('');
                }} 
                className="btn-secondary" 
                style={styles.dialogBtn}
              >
                Batal
              </button>
              <button onClick={handleAuthSubmit} className="btn-primary" style={styles.dialogBtn}>
                Masuk
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* EDIT PHOTO MODAL — sekarang ada field deskripsi */}
      {editingPhoto && (
        <div style={styles.editDialogOverlay}>
          <GlassPanel style={styles.editDialogContainer}>
            <h3 style={styles.editDialogTitle}>Edit Data Foto</h3>
            <p style={styles.editDialogSub}>{editingPhoto.nmsls}</p>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Kategori</label>
              <select 
                value={editPhotoCategory} 
                onChange={(e) => setEditPhotoCategory(e.target.value)}
                style={styles.selectInput}
              >
                <option value="Dokumentasi">Dokumentasi</option>
                <option value="Kendala">Kendala</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* ── BARU: Field Deskripsi di Modal Edit ── */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Deskripsi Foto</label>
              <textarea
                value={editPhotoDescription}
                onChange={(e) => setEditPhotoDescription(e.target.value)}
                placeholder={
                  editPhotoCategory === 'Dokumentasi' ? 'Contoh: Dokumentasi kegiatan pendataan RT 01...' :
                  editPhotoCategory === 'Kendala'     ? 'Contoh: Jalan menuju lokasi tidak dapat dilalui...' :
                                                       'Tambahkan keterangan foto di sini...'
                }
                maxLength={500}
                rows={3}
                style={styles.editDescriptionTextarea}
              />
              <span style={styles.editDescriptionCount}>{editPhotoDescription.length}/500</span>
            </div>
            
            <div style={styles.dialogActions}>
              <button onClick={() => setEditingPhoto(null)} className="btn-secondary" style={styles.dialogBtn}>
                Batal
              </button>
              <button onClick={handleSavePhotoEdit} className="btn-primary" style={styles.dialogBtn}>
                Simpan
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* EDIT CHANGE REPORT MODAL */}
      {editingChange && (
        <div style={styles.editDialogOverlay}>
          <GlassPanel style={styles.editDialogContainer}>
            <h3 style={styles.editDialogTitle}>Edit Laporan Perubahan</h3>
            <p style={styles.editDialogSub}>{editingChange.nmsls}</p>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Tipe Perubahan</label>
              <select 
                value={editChangeType} 
                onChange={(e) => setEditChangeType(e.target.value)}
                style={styles.selectInput}
              >
                <option value="Perubahan Batas SLS">Perubahan Batas SLS</option>
                <option value="Pemekaran SLS">Pemekaran SLS</option>
                <option value="Penggabungan SLS">Penggabungan SLS</option>
                <option value="Pergantian Tingkatan SLS">Pergantian Tingkatan SLS</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Catatan / Deskripsi</label>
              <textarea
                value={editChangeNotes}
                onChange={(e) => setEditChangeNotes(e.target.value)}
                placeholder="Tambahkan catatan perubahan..."
                rows={3}
                style={styles.textareaInput}
              />
            </div>
            
            <div style={styles.dialogActions}>
              <button onClick={() => setEditingChange(null)} className="btn-secondary" style={styles.dialogBtn}>
                Batal
              </button>
              <button onClick={handleSaveChangeEdit} className="btn-primary" style={styles.dialogBtn}>
                Simpan
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* MOBILE: Change Detail Modal */}
      {selectedChange && (
        <div style={styles.editDialogOverlay} onClick={() => setSelectedChange(null)}>
          <GlassPanel style={styles.changeDetailContainer} onClick={(e) => e.stopPropagation()} className="animate-fade-in">
            <div style={styles.changeDetailHeader}>
              <span style={{
                ...styles.typeBadge,
                ...(selectedChange.change_type === 'Pemekaran SLS' ? styles.badgeRed :
                    selectedChange.change_type === 'Penggabungan SLS' ? styles.badgeBlue :
                    selectedChange.change_type === 'Pergantian Tingkatan SLS' ? styles.badgeGreen : styles.badgeOrange)
              }}>
                {selectedChange.change_type}
              </span>
              <button onClick={() => setSelectedChange(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.changeDetailSection}>
              <span style={styles.changeDetailSectionLabel}>SLS / Sub-SLS</span>
              <span style={styles.slsCellName}>{selectedChange.nmsls}</span>
              <span style={styles.slsCellCode}>{selectedChange.idsubsls}</span>
            </div>

            {selectedChange.notes ? (
              <div style={styles.changeDetailSection}>
                <span style={styles.changeDetailSectionLabel}>Catatan / Deskripsi</span>
                <p style={styles.changeDetailNotes}>{selectedChange.notes}</p>
              </div>
            ) : null}

            {/* Petugas */}
            <div style={styles.changeDetailRow}>
              <div style={{ ...styles.changeDetailSection, flex: 1 }}>
                <span style={styles.changeDetailSectionLabel}>PPL (Pencacah)</span>
                <span style={styles.petugasCellName}>{selectedChange.ppl_name || <span style={styles.petugasEmpty}>—</span>}</span>
              </div>
              <div style={{ ...styles.changeDetailSection, flex: 1 }}>
                <span style={styles.changeDetailSectionLabel}>PML (Pengawas)</span>
                <span style={styles.petugasCellName}>{selectedChange.pml_name || <span style={styles.petugasEmpty}>—</span>}</span>
              </div>
            </div>

            {/* Koordinat */}
            <div style={styles.changeDetailSection}>
              <span style={styles.changeDetailSectionLabel}>Geotag Lokasi</span>
              <div style={styles.coordLink}>
                <MapPin size={13} style={{ marginRight: 5, color: 'hsl(var(--color-primary))', flexShrink: 0 }} />
                <span>{selectedChange.latitude.toFixed(6)}, {selectedChange.longitude.toFixed(6)}</span>
              </div>
            </div>

            {/* Tanggal */}
            <div style={styles.changeDetailSection}>
              <span style={styles.changeDetailSectionLabel}>Tanggal Lapor</span>
              <div style={styles.dateCell}>
                <Calendar size={13} style={{ marginRight: 5, color: '#888' }} />
                <span>{formatDate(selectedChange.created_at)}</span>
              </div>
            </div>

            {/* Admin actions */}
            {isAdminAuthenticated && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    setSelectedChange(null);
                    setEditingChange(selectedChange);
                    setEditChangeType(selectedChange.change_type);
                    setEditChangeNotes(selectedChange.notes || '');
                  }}
                  style={{ ...styles.tableAdminBtn, flex: 1, padding: '10px', fontSize: '13px', textAlign: 'center' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedChange(null);
                    handleDeleteChange(selectedChange.id);
                  }}
                  style={{ ...styles.tableAdminBtn, flex: 1, padding: '10px', fontSize: '13px', textAlign: 'center', color: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.08)' }}
                >
                  Hapus
                </button>
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* FULL PHOTO ZOOM OVERLAY MODAL */}
      {selectedPhoto && (
        <div style={styles.zoomOverlay} onClick={() => setSelectedPhoto(null)}>
          <div style={styles.zoomContainer} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} style={styles.zoomCloseBtn}>
              <X size={20} />
            </button>
            <img 
              src={getApiUrl(selectedPhoto.photo_path)} 
              alt="Zoomed" 
              style={styles.zoomImage} 
            />
            <div style={styles.zoomFooter}>
              <h4 style={styles.zoomTitle}>{selectedPhoto.nmsls}</h4>
              {/* ── BARU: Tampilkan deskripsi juga di zoom modal ── */}
              {selectedPhoto.description && (
                <p style={{ ...styles.zoomText, fontSize: '13px', color: '#dddddd', marginTop: '6px', marginBottom: '4px', fontStyle: 'italic' }}>
                  "{selectedPhoto.description}"
                </p>
              )}
              <p style={styles.zoomText}>
                Kategori: <strong>{selectedPhoto.category}</strong> | Geotag: {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)} | Waktu: {formatDate(selectedPhoto.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2500,
    padding: '24px',
  },
  dashboardContainer: {
    width: '100%',
    maxWidth: '1200px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    padding: '0px',
    borderRadius: '24px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 28px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'hsl(var(--color-dark))',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '10px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--color-gray-text))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    margin: '12px 28px 0 28px',
    padding: '12px 18px',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ff3b30',
    fontSize: '13px',
    fontWeight: 500,
  },
  loadingArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  spinner: {
    animation: 'spin 2s linear infinite',
  },
  loadingLabel: {
    fontSize: '14px',
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
  },
  dashboardContent: {
    flex: 1,
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'hidden',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statsCard: {
    padding: '16px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    border: '1px solid rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  statsLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
  },
  statsValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'hsl(var(--color-dark))',
    lineHeight: '1',
    marginTop: '4px',
  },
  statsIcon: {
    position: 'absolute',
    right: '16px',
    bottom: '16px',
    opacity: 0.8,
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    gap: '24px',
  },
  tabBtn: {
    padding: '10px 4px',
    fontSize: '14px',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'hsl(var(--color-gray-text))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  activeTabBtn: {
    color: 'hsl(var(--color-primary))',
    borderBottomColor: 'hsl(var(--color-primary))',
  },
  panelContent: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '16px',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '18px',
  },
  photoCard: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '0px',
    border: '1px solid rgba(255,255,255,0.5)',
  },
  photoThumbContainer: {
    width: '100%',
    height: '150px',
    position: 'relative',
    backgroundColor: '#000000',
    cursor: 'pointer',
    overflow: 'hidden',
    flexShrink: 0,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  photoInfo: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
  },
  photoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  categoryBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  photoDate: {
    fontSize: '11px',
    color: '#888',
  },
  photoTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoCode: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#777',
    marginTop: '2px',
  },
  // ── BARU: Style deskripsi foto di card ──
  photoDescriptionBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0px',
    marginTop: '7px',
    padding: '7px 9px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '7px',
    border: '1px solid rgba(0,0,0,0.05)',
    color: 'hsl(var(--color-gray-text))',
  },
  photoDescription: {
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
    margin: 0,
    lineHeight: '1.45',
    fontStyle: 'italic',
    wordBreak: 'break-word',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  photoFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    borderTop: '1px solid rgba(0,0,0,0.04)',
    paddingTop: '8px',
  },
  photoCoords: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
  },
  downloadLink: {
    color: 'hsl(var(--color-primary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 102, 0, 0.08)',
    transition: 'background 0.2s',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.4)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  th: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    color: 'hsl(var(--color-dark))',
    fontWeight: 600,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  tr: {
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  tdNotes: {
    maxWidth: '300px',
    whiteSpace: 'normal',
    lineHeight: '1.4',
    color: 'hsl(var(--color-gray-text))',
  },
  slsCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  slsCellName: {
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  slsCellCode: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#888',
    marginTop: '2px',
  },
  coordLink: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: 'hsl(var(--color-dark))',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
  },
  petugasCellName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'hsl(var(--color-dark))',
  },
  petugasEmpty: {
    color: '#bbb',
    fontStyle: 'italic',
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '8px',
    display: 'inline-block',
    textAlign: 'center',
  },
  // Color Badges
  badgeRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    color: '#ff3b30',
  },
  badgeGreen: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    color: '#34c759',
  },
  badgeBlue: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    color: '#007aff',
  },
  badgeOrange: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    color: '#ff9500',
  },
  badgeGray: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    color: '#8e8e93',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'hsl(var(--color-gray-text))',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  // Zoom overlay styles
  zoomOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 3500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomContainer: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '85%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  zoomImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: '-40px',
    right: '0px',
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
  },
  zoomFooter: {
    marginTop: '16px',
    color: '#ffffff',
    textAlign: 'center',
  },
  zoomTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  zoomText: {
    fontSize: '12px',
    color: '#aaaaaa',
  },
  photoAdminActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
    borderTop: '1px solid rgba(0,0,0,0.04)',
    paddingTop: '6px',
  },
  photoAdminBtn: {
    flex: 1,
    padding: '6px 8px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(0,100,255,0.08)',
    color: '#0064ff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  tableAdminBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(0,100,255,0.08)',
    color: '#0064ff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  editDialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4000,
    padding: '20px',
  },
  editDialogContainer: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  editDialogTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'hsl(var(--color-dark))',
  },
  editDialogSub: {
    fontSize: '13px',
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
    marginTop: '-8px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
  },
  selectInput: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  textareaInput: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
  },
  // ── BARU: Style textarea deskripsi di modal edit foto ──
  editDescriptionTextarea: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
    minHeight: '72px',
    lineHeight: '1.5',
    boxSizing: 'border-box',
    width: '100%',
  },
  editDescriptionCount: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    textAlign: 'right',
    display: 'block',
    marginTop: '-2px',
  },
  dialogActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  dialogBtn: {
    flex: 1,
    justifyContent: 'center',
    padding: '10px',
    fontSize: '13px',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.04)',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(var(--color-gray-text))',
  },
  filterSelect: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    minWidth: '140px',
  },
  authDialogContainer: {
    width: '100%',
    maxWidth: '380px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  authHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  // Change detail modal styles
  changeDetailContainer: {
    width: '100%',
    maxWidth: '420px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  changeDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  changeDetailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  changeDetailRow: {
    display: 'flex',
    gap: '10px',
  },
  changeDetailSectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  changeDetailNotes: {
    fontSize: '13px',
    color: 'hsl(var(--color-dark))',
    lineHeight: '1.5',
    margin: 0,
  },
};