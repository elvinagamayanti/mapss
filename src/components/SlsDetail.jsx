import React from 'react';
import GlassPanel from './GlassPanel';
import { MapPin, Info, Compass, CheckCircle2, ChevronRight, X, FileEdit } from 'lucide-react';

export default function SlsDetail({ feature, isUserLocation, onClose, onReportChange, progressInfo = null }) {
  if (!feature) return null;

  const props = feature.properties || {};

  // Formatter for area
  const formatArea = (val) => {
    if (!val) return '-';
    // Convert to hectares if it's in km² (assuming "luas" might be in km²)
    const hectares = (parseFloat(val) * 100).toFixed(2);
    return `${parseFloat(val).toFixed(4)} km² (~${hectares} Ha)`;
  };

  return (
    <GlassPanel className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <div style={{
            ...styles.iconBg,
            backgroundColor: isUserLocation ? 'rgba(255, 102, 0, 0.12)' : 'rgba(0, 100, 255, 0.08)'
          }}>
            {isUserLocation ? (
              <Compass className="pulse-location" size={20} color="hsl(var(--color-primary))" />
            ) : (
              <Info size={20} color="#0064ff" />
            )}
          </div>
          <div>
            <h3 style={styles.title}>{props.nmsls || 'Detail SLS'}</h3>
            <span style={{
              ...styles.badge,
              backgroundColor: isUserLocation ? 'rgba(255, 102, 0, 0.12)' : 'rgba(0,0,0,0.05)',
              color: isUserLocation ? 'hsl(var(--color-primary))' : 'hsl(var(--color-gray-text))'
            }}>
              {isUserLocation ? 'Lokasi Anda' : 'SLS Dipilih'}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={styles.closeBtn}>
          <X size={16} />
        </button>
      </div>

      <div style={styles.body}>
        {/* Progress info block (injected from parent) */}
        {progressInfo && (() => {
          const total = parseInt(progressInfo.totalRegion || 0, 10);
          const open = parseInt(progressInfo.OPEN || 0, 10);
          const draft = parseInt(progressInfo.DRAFT || 0, 10);
          const completed = total - open - draft;
          const pct = total > 0 ? (completed / total) * 100 : 0;
          const isDone = total > 0 && completed === total;

          return (
            <>
              <div style={styles.sectionTitle}>
                <MapPin size={12} style={{ marginRight: 4, color: isDone ? '#34c759' : 'hsl(var(--color-primary))' }} /> 
                Progres Pencacahan ({pct.toFixed(0)}%)
              </div>

              <div style={styles.progressContainer}>
                <div style={styles.progressRow}>
                  <span style={styles.progressLabel}>Status</span>
                  <span style={{ 
                    ...styles.progressStatusValue,
                    color: isDone ? '#2e7d32' : (completed > 0 ? '#e65100' : 'hsl(var(--color-gray-text))')
                  }}>
                    {isDone ? 'Selesai' : (completed > 0 ? 'Sedang Dicacah' : 'Belum Mulai')}
                  </span>
                </div>

                <div style={styles.detailProgressBarBg}>
                  <div style={{ 
                    ...styles.detailProgressBarFill, 
                    width: `${pct}%`,
                    backgroundColor: isDone ? '#34c759' : '#ff9800'
                  }} />
                </div>

                <div style={styles.statsMiniGrid}>
                  <div style={styles.statMiniCell}>
                    <span style={styles.statMiniNum}>{total}</span>
                    <span style={styles.statMiniLabel}>Target</span>
                  </div>
                  <div style={styles.statMiniCell}>
                    <span style={{ ...styles.statMiniNum, color: '#2e7d32' }}>{completed}</span>
                    <span style={styles.statMiniLabel}>Sudah</span>
                  </div>
                  <div style={styles.statMiniCell}>
                    <span style={{ ...styles.statMiniNum, color: '#e65100' }}>{open + draft}</span>
                    <span style={styles.statMiniLabel}>Sisa</span>
                  </div>
                </div>

                {/* Sub-status breakdown details */}
                <div style={styles.breakdownWrapper}>
                  <div style={styles.breakdownHeader}>Rincian Status Kuesioner:</div>
                  <div style={styles.breakdownGrid}>
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownLabel}>Draft</span>
                      <span style={styles.breakdownValue}>{progressInfo.DRAFT || 0}</span>
                    </div>
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownLabel}>Dikirim</span>
                      <span style={styles.breakdownValue}>{progressInfo['SUBMITTED BY Pencacah'] || 0}</span>
                    </div>
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownLabel}>Disetujui PML</span>
                      <span style={{ ...styles.breakdownValue, color: '#2e7d32', fontWeight: 'bold' }}>{progressInfo['APPROVED BY Pengawas'] || 0}</span>
                    </div>
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownLabel}>Ditolak PML</span>
                      <span style={{ ...styles.breakdownValue, color: '#d32f2f' }}>{progressInfo['REJECTED BY Pengawas'] || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Petugas Lapangan Info */}
                <div style={styles.breakdownWrapper}>
                  <div style={styles.breakdownHeader}>Petugas Lapangan:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', marginTop: '2px' }}>
                    <div>
                      <span style={{ color: 'hsl(var(--color-gray-text))' }}>Pencacah: </span>
                      <strong style={{ color: 'hsl(var(--color-dark))' }}>{progressInfo.real_name || progressInfo.username || '-'}</strong>
                    </div>
                    {progressInfo.pml_name && (
                      <div>
                        <span style={{ color: 'hsl(var(--color-gray-text))' }}>PML (Pengawas): </span>
                        <strong style={{ color: 'hsl(var(--color-dark))' }}>{progressInfo.pml_name}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ ...styles.divider }} />
            </>
          );
        })()}

        <div style={styles.sectionTitle}>
          <Info size={12} style={{ marginRight: 4 }} /> Identitas SLS / Sub SLS
        </div>

        <div style={styles.grid}>
          <div style={styles.gridItem}>
            <span style={styles.label}>ID SLS</span>
            <span style={styles.code}>{props.idsls || '-'}</span>
          </div>
          <div style={styles.gridItem}>
            <span style={styles.label}>ID Sub SLS</span>
            <span style={styles.code}>{props.idsubsls || '-'}</span>
          </div>
          <div style={styles.gridItem}>
            <span style={styles.label}>Kode Sub SLS</span>
            <span style={styles.value}>{props.kdsubsls || '-'}</span>
          </div>
          <div style={styles.gridItem}>
            <span style={styles.label}>Periode Data</span>
            <span style={styles.value}>{props.periode || '-'}</span>
          </div>
          <div style={{ ...styles.gridItem, gridColumn: 'span 2' }}>
            <span style={styles.label}>Estimasi Luas</span>
            <span style={styles.value}>{formatArea(props.luas)}</span>
          </div>
        </div>

        {onReportChange && (
          <>
            <div style={styles.divider} />
            <button
              type="button"
              onClick={() => onReportChange(feature)}
              className="btn-primary"
              style={styles.changeBtn}
            >
              <FileEdit size={14} style={{ marginRight: 6 }} /> Laporkan Perubahan SLS
            </button>
          </>
        )}
      </div>
    </GlassPanel>
  );
}

const styles = {
  container: {
    padding: '20px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  iconBg: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
    lineHeight: '1.2',
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '6px',
    marginTop: '4px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--color-gray-text))',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'hsl(var(--color-gray-text))',
    marginBottom: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 14px',
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
  },
  value: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'hsl(var(--color-dark))',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
    background: 'rgba(0,0,0,0.04)',
    padding: '2px 6px',
    borderRadius: '4px',
    alignSelf: 'flex-start',
  },
  divider: {
    height: '1px',
    background: 'rgba(0,0,0,0.06)',
    margin: '4px 0',
  },
  changeBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '10px',
    fontSize: '13px',
    borderRadius: '10px',
    marginTop: '4px',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
  },
  progressStatusValue: {
    fontSize: '12px',
    fontWeight: 600,
  },
  detailProgressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '2px',
    marginBottom: '4px',
  },
  detailProgressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease-out',
  },
  statsMiniGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '6px',
    textAlign: 'center',
    marginTop: '2px',
  },
  statMiniCell: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '6px',
    padding: '4px 0',
  },
  statMiniNum: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  statMiniLabel: {
    fontSize: '9px',
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
  },
  breakdownWrapper: {
    marginTop: '6px',
    borderTop: '1px solid rgba(0,0,0,0.04)',
    paddingTop: '6px',
  },
  breakdownHeader: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'hsl(var(--color-gray-text))',
    marginBottom: '4px',
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px 8px',
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '10px',
  },
  breakdownLabel: {
    color: 'hsl(var(--color-gray-text))',
  },
  breakdownValue: {
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  }
};