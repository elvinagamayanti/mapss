import React, { useState } from 'react';
import GlassPanel from './GlassPanel';
import { AlertTriangle, Check, X, FileEdit, User, Eye } from 'lucide-react';
import PslsPreviewModal from './PslsPreviewModal';

const CHANGE_TYPES = [
  { value: 'Pemekaran SLS',           code: '1', label: '1 - Pemekaran SLS' },
  { value: 'Penggabungan SLS',        code: '2', label: '2 - Penggabungan SLS' },
  { value: 'Perubahan Tingkatan SLS', code: '4', label: '4 - Perubahan Tingkatan SLS' },
];

export default function SlsChangeForm({
  feature,
  userLocation,
  progressData,
  onClose,
  onSuccess,
  showToast,
}) {
  const [changeType,        setChangeType]        = useState('Pemekaran SLS');
  const [adaPerubahanBatas, setAdaPerubahanBatas] = useState('');
  const [adaPerubahanNama,  setAdaPerubahanNama]  = useState('');
  const [nmslsBaru,         setNmslsBaru]         = useState('');
  const [ketuaSls,          setKetuaSls]          = useState('');
  const [notes,             setNotes]             = useState('');
  const [submitting,        setSubmitting]        = useState(false);
  const [success,           setSuccess]           = useState(false);
  const [showPreview,       setShowPreview]       = useState(false);

  if (!feature) return null;
  const props = feature.properties || {};

  const idsubsls    = props.idsubsls || '';
  const slsProgress = (progressData && idsubsls) ? progressData[idsubsls] : null;
  const pplName     = slsProgress ? (slsProgress.real_name || slsProgress.username || '') : '';
  const pmlName     = slsProgress ? (slsProgress.pml_name || '') : '';

  const changeTypeParsed = CHANGE_TYPES.find(t => t.value === changeType) || CHANGE_TYPES[0];

  const previewData = {
    props,
    changeType,
    changeTypeParsed,
    adaPerubahanBatas,
    adaPerubahanNama,
    nmslsBaru,
    ketuaSls,
    pplName,
    pmlName,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!changeType || !ketuaSls.trim() || !adaPerubahanBatas || !adaPerubahanNama) {
      showToast('Harap isi semua field wajib.', 'error');
      return;
    }
    if (adaPerubahanNama === 'ya' && !nmslsBaru.trim()) {
      showToast('Harap isi nama SLS lengkap setelah perubahan.', 'error');
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const apiBaseUrl   = localStorage.getItem('maps_api_url') || 'api';
      const nmslsSetelah = adaPerubahanNama === 'ya' ? nmslsBaru : (props.nmsls || '');
      const payload = {
        idsubsls:            props.idsubsls || '00',
        nmsls:               props.nmsls    || 'Luar Batas SLS',
        latitude:            userLocation ? userLocation.latitude  : 0,
        longitude:           userLocation ? userLocation.longitude : 0,
        change_type:         changeType,
        ada_perubahan_batas: adaPerubahanBatas,
        ada_perubahan_nama:  adaPerubahanNama,
        nmsls_baru:          nmslsSetelah,
        ketua_sls:           ketuaSls.trim(),
        notes:               notes.trim(),
        ppl_name:            pplName,
        pml_name:            pmlName,
      };

      const res  = await fetch(`${apiBaseUrl}/save_change.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setNotes('');
          if (onSuccess) onSuccess();
          onClose();
        }, 1400);
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
    <>
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
            <Check size={36} color="#34c759" />
            <span style={styles.successText}>Laporan Perubahan Berhasil Dikirim!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipe Perubahan SLS *</label>
              <select value={changeType} onChange={(e) => setChangeType(e.target.value)} style={styles.select} required>
                {CHANGE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Apakah terdapat perubahan batas? *</label>
              <div style={styles.radioRow}>
                {['ya', 'tidak'].map((opt) => (
                  <label key={opt} style={{ ...styles.radioOption, ...(adaPerubahanBatas === opt ? styles.radioOptionActive : {}) }}>
                    <input type="radio" name="perubahan_batas" value={opt} checked={adaPerubahanBatas === opt} onChange={() => setAdaPerubahanBatas(opt)} style={styles.radioInput} />
                    {opt === 'ya' ? 'Ya' : 'Tidak'}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Apakah terdapat perubahan nama SLS? *</label>
              <div style={styles.radioRow}>
                {['ya', 'tidak'].map((opt) => (
                  <label key={opt} style={{ ...styles.radioOption, ...(adaPerubahanNama === opt ? styles.radioOptionActive : {}) }}>
                    <input type="radio" name="perubahan_nama" value={opt} checked={adaPerubahanNama === opt}
                      onChange={() => { setAdaPerubahanNama(opt); if (opt === 'tidak') setNmslsBaru(''); }}
                      style={styles.radioInput} />
                    {opt === 'ya' ? 'Ya' : 'Tidak'}
                  </label>
                ))}
              </div>
            </div>

            {adaPerubahanNama === 'ya' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Nama SLS Lengkap Setelah Perubahan *</label>
                <input type="text" className="input-glass" placeholder="Contoh: RT 002 DUSUN DACCIPONG"
                  value={nmslsBaru} onChange={(e) => setNmslsBaru(e.target.value)} style={styles.input} required />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Nama Ketua SLS (Terkecil) *</label>
              <input type="text" className="input-glass" placeholder="Masukkan nama ketua SLS..."
                value={ketuaSls} onChange={(e) => setKetuaSls(e.target.value)} style={styles.input} required />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Catatan & Deskripsi (Opsional)</label>
              <textarea className="input-glass" rows={3} placeholder="Jelaskan detail perubahan jika diperlukan..."
                value={notes} onChange={(e) => setNotes(e.target.value)} style={styles.textarea} />
            </div>

            <div style={styles.locationTag}>
              <AlertTriangle size={12} color="hsl(var(--color-primary))" style={{ marginRight: 6 }} />
              <span>Koordinat Geotag: {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'GPS tidak aktif'}</span>
            </div>

            <div style={styles.actions}>
              <button type="button" onClick={onClose} className="btn-secondary" style={styles.btn} disabled={submitting}>Batal</button>
              <button type="submit" className="btn-primary" style={styles.btn} disabled={submitting}>
                {submitting ? 'Mengirim...' : <><Eye size={14} style={{ marginRight: 6 }} /> Preview & Kirim</>}
              </button>
            </div>
          </form>
        )}
      </GlassPanel>

      {showPreview && (
        <PslsPreviewModal
          data={previewData}
          onClose={() => setShowPreview(false)}
          onConfirm={() => { setShowPreview(false); handleConfirmSubmit(); }}
        />
      )}
    </>
  );
}

const styles = {
  container:   { padding: '20px', width: '100%', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '14px' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
  title:       { fontSize: '15px', fontWeight: 600, color: 'hsl(var(--color-dark))' },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-gray-text))', padding: '4px' },
  slsBrief:    { padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.12)', fontSize: '13px', color: 'hsl(var(--color-dark))', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' },
  briefLabel:  { color: 'hsl(var(--color-gray-text))', fontWeight: 500 },
  briefName:   { fontWeight: 600 },
  briefId:     { fontFamily: 'monospace', fontSize: '12px', color: 'hsl(var(--color-gray-text))' },
  petugasBox:  { display: 'flex', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(52,199,89,0.05)', border: '1px solid rgba(52,199,89,0.15)', fontSize: '12px' },
  petugasRows: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  petugasRow:  { display: 'flex', gap: '6px', alignItems: 'center' },
  petugasLabel:{ color: 'hsl(var(--color-gray-text))', fontWeight: 500, minWidth: '110px' },
  petugasValue:{ fontWeight: 600, color: 'hsl(var(--color-dark))' },
  form:        { display: 'flex', flexDirection: 'column', gap: '12px' },
  formGroup:   { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:       { fontSize: '12px', fontWeight: 600, color: 'hsl(var(--color-gray-text))', textTransform: 'uppercase', paddingLeft: '2px' },
  select:      { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'hsl(var(--color-dark))', outline: 'none', cursor: 'pointer' },
  input:       { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'hsl(var(--color-dark))', outline: 'none' },
  textarea:    { resize: 'none', fontSize: '13px', lineHeight: '1.4' },
  radioRow:    { display: 'flex', gap: '10px' },
  radioOption: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'hsl(var(--color-dark))', userSelect: 'none' },
  radioOptionActive: { background: 'rgba(255,102,0,0.08)', border: '1px solid hsl(var(--color-primary))', color: 'hsl(var(--color-primary))', fontWeight: 600 },
  radioInput:  { display: 'none' },
  locationTag: { fontSize: '11px', color: 'hsl(var(--color-gray-text))', display: 'flex', alignItems: 'center', paddingLeft: '2px' },
  actions:     { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' },
  btn:         { padding: '9px 16px', fontSize: '13px' },
  successBox:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', textAlign: 'center', gap: '12px' },
  successText: { fontSize: '14px', fontWeight: 600, color: '#2b8a3e' },
};