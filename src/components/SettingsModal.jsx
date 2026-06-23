import React, { useState, useEffect } from 'react';
import GlassPanel from './GlassPanel';
import { X, Map, Settings, Check, Globe } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [theme, setTheme] = useState('light');
  const [apiUrl, setApiUrl] = useState('api');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('maps_theme') || 'light';
    setTheme(savedTheme);
    const savedApiUrl = localStorage.getItem('maps_api_url') || 'api';
    setApiUrl(savedApiUrl);
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('maps_theme', theme);
    localStorage.setItem('maps_api_url', apiUrl.trim());
    onSave(theme, apiUrl.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <GlassPanel className="animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Settings size={20} color="hsl(var(--color-primary))" />
            <h2 style={styles.title}>Pengaturan Peta & Server</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Theme Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Map size={14} style={{ marginRight: 6 }} />
              Gaya Peta Base
            </label>
            <div style={styles.radioGroup}>
              <label style={{
                ...styles.radioButton,
                ...(theme === 'light' ? styles.radioButtonActive : {})
              }}>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                  style={styles.radioInput}
                />
                Standar (OSM)
              </label>
              <label style={{
                ...styles.radioButton,
                ...(theme === 'silver' ? styles.radioButtonActive : {})
              }}>
                <input
                  type="radio"
                  name="theme"
                  value="silver"
                  checked={theme === 'silver'}
                  onChange={() => setTheme('silver')}
                  style={styles.radioInput}
                />
                Minimalis (Silver)
              </label>
              <label style={{
                ...styles.radioButton,
                ...(theme === 'retro' ? styles.radioButtonActive : {})
              }}>
                <input
                  type="radio"
                  name="theme"
                  value="retro"
                  checked={theme === 'retro'}
                  onChange={() => setTheme('retro')}
                  style={styles.radioInput}
                />
                Retro (Voyager)
              </label>
            </div>
            <p style={styles.helpText}>
              Peta disediakan gratis & open-source oleh OpenStreetMap dan CARTO.
            </p>
          </div>

          {/* API URL Config */}
          {/* <div style={styles.formGroup}>
            <label style={styles.label}>
              <Globe size={14} style={{ marginRight: 6 }} />
              Base URL API PHP
            </label>
            <input
              type="text"
              className="input-glass"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="Contoh: http://localhost:8888/maps_se/api atau /api"
              style={styles.input}
            />
            <p style={styles.helpText}>
              Masukkan alamat MAMP/XAMPP server lokal Anda (atau gunakan <code>/api</code> jika mem-proxy melalui Vite).
            </p>
          </div> */}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="btn-secondary" style={styles.btn}>
              Batal
            </button>
            <button type="submit" className="btn-primary" style={styles.btn} disabled={saved}>
              {saved ? (
                <>
                  <Check size={16} /> Tersimpan
                </>
              ) : (
                'Simpan'
              )}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    width: '95%',
    maxWidth: '440px',
    padding: '24px',
    position: 'relative',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--color-gray-text))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '50%',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'hsl(var(--color-dark))',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
  },
  helpText: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    lineHeight: '1.4',
    marginTop: '4px',
  },
  radioGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
  },
  radioButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  radioButtonActive: {
    background: 'rgba(255, 102, 0, 0.08)',
    border: '1px solid hsl(var(--color-primary))',
    color: 'hsl(var(--color-primary))',
  },
  radioInput: {
    display: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  btn: {
    fontSize: '13px',
    padding: '8px 16px',
  }
};
