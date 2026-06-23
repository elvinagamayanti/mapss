import React, { useState } from 'react';
import GlassPanel from './GlassPanel';
import { AlertTriangle, Send, Check, X, FileEdit } from 'lucide-react';

const CHANGE_TYPES = [
  'Perubahan Batas SLS',
  'Pemekaran SLS',
  'Penggabungan SLS',
  'Pergantian Tipe'
];

export default function SlsChangeForm({ 
  feature, 
  userLocation, 
  progressData,  
  onClose,
  onSuccess,
  showToast
}) {
  const [changeType, setChangeType] = useState('Perubahan Batas SLS');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!feature) return null;
  const props = feature.properties || {};

  const idsubsls = props.idsubsls || '';
  const slsProgress = (progressData && idsubsls) ? progressData[idsubsls] : null;
  const pplName = slsProgress ? (slsProgress.real_name || slsProgress.username || '') : '';
  const pmlName = slsProgress ? (slsProgress.pml_name || '') : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!changeType) return;

    setSubmitting(true);
    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const endpoint = `${apiBaseUrl}/save_change.php`;

      const payload = {
        idsubsls: props.idsubsls || '00',
        nmsls: props.nmsls || 'Luar Batas SLS',
        ppl_name: pplName,
        pml_name: pmlName,
        latitude: userLocation ? userLocation.latitude : 0,
        longitude: userLocation ? userLocation.longitude : 0,
        change_type: changeType,
        notes: notes.trim()
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setNotes('');
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        showToast('Gagal merekam: ' + (data.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error('Submit change error:', err);
      showToast('Koneksi ke PHP server gagal. Pastikan alamat server lokal MAMP diatur dengan benar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <FileEdit size={18} color="hsl(var(--color-primary))" />
          <h3 style={styles.title}>Lapor Perubahan SLS</h3>
        </div>
        <button onClick={onClose} style={styles.closeBtn} disabled={submitting}>
          <X size={16} />
        </button>
      </div>

      <div style={styles.slsBrief}>
        <span style={styles.briefLabel}>SLS Terpilih:</span>
        <span style={styles.briefName}>{props.nmsls}</span>
        <span style={styles.briefId}>({props.idsubsls})</span>
      </div>

      <div style={styles.petugasBox}>
        <User size={12} color="hsl(var(--color-primary))" style={{ marginRight: 6, flexShrink: 0 }} />
        <div style={styles.petugasRows}>
          <div style={styles.petugasRow}>
            <span style={styles.petugasLabel}>PPL (Pencacah):</span>
            <span style={styles.petugasValue}>{pplName || <em style={{ color: '#aaa' }}>—</em>}</span>
          </div>
          <div style={styles.petugasRow}>
            <span style={styles.petugasLabel}>PML (Pengawas):</span>
            <span style={styles.petugasValue}>{pmlName || <em style={{ color: '#aaa' }}>—</em>}</span>
          </div>
        </div>
      </div>

      {success ? (
        <div style={styles.successBox}>
          <Check size={36} color="#34c759" style={styles.successIcon} />
          <span style={styles.successText}>Laporan Perubahan Berhasil Dikirim!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tipe Perubahan SLS</label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              style={styles.select}
              required
            >
              {CHANGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Catatan & Deskripsi Perubahan</label>
            <textarea
              className="input-glass"
              rows={4}
              placeholder="Jelaskan detail perubahan batas/pemekaran/penggabungan SLS..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.locationTag}>
            <AlertTriangle size={12} color="hsl(var(--color-primary))" style={{ marginRight: 6 }} />
            <span>
              Koordinat Geotag: {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'GPS tidak aktif'}
            </span>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="btn-secondary" style={styles.btn} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" style={styles.btn} disabled={submitting}>
              {submitting ? (
                'Mengirim...'
              ) : (
                <>
                  <Send size={14} style={{ marginRight: 6 }} /> Kirim Laporan
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </GlassPanel>
  );
}

const styles = {
  container: {
    padding: '20px',
    width: '100%',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--color-gray-text))',
    padding: '4px',
  },
  slsBrief: {
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 102, 0, 0.05)',
    border: '1px solid rgba(255, 102, 0, 0.12)',
    fontSize: '13px',
    color: 'hsl(var(--color-dark))',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center',
  },
  briefLabel: {
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
  },
  briefName: {
    fontWeight: 600,
  },
  briefId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
  },
  petugasBox: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    border: '1px solid rgba(52, 199, 89, 0.15)',
    fontSize: '12px',
  },
  petugasRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  petugasRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  petugasLabel: {
    color: 'hsl(var(--color-gray-text))',
    fontWeight: 500,
    minWidth: '110px',
  },
  petugasValue: {
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(var(--color-gray-text))',
    textTransform: 'uppercase',
    paddingLeft: '2px',
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
  },
  textarea: {
    resize: 'none',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  locationTag: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '2px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '6px',
  },
  btn: {
    padding: '9px 16px',
    fontSize: '13px',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 10px',
    textAlign: 'center',
    gap: '12px',
  },
  successIcon: {
    animation: 'spin 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
  },
  successText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2b8a3e',
  }
};
