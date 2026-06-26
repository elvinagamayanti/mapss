import React, { useEffect, useRef, useState } from 'react';
import GlassPanel from './GlassPanel';
import { Camera, X, RefreshCw, Upload, ArrowLeft, AlertTriangle, Check, Image as ImageIcon } from 'lucide-react';

export default function WatermarkCamera({ 
  isOpen, 
  onClose, 
  userLocation, 
  currentSls,
  showToast
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  
  const [mode, setMode] = useState('capture');
  const [category, setCategory] = useState('Dokumentasi');
  const [description, setDescription] = useState(''); // ← field deskripsi
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // ── Reset semua state form saat modal dibuka ulang ──
  // Ini adalah fix utama: setiap kali isOpen berubah jadi true,
  // description (dan state lainnya) direset dari awal.
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setDescription('');
      setCategory('Dokumentasi');
      setError(null);
      setUploadSuccess(false);
    }
  }, [isOpen]);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen || capturedImage || mode !== 'capture') {
      stopCamera();
      return;
    }

    let activeStream = null;
    setCameraLoading(true);
    setError(null);

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraLoading(false);
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Gagal mengakses kamera. Silakan pilih tab "Unggah File" di atas jika kamera bermasalah.');
        setCameraLoading(false);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode, capturedImage, mode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleToggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Draw Watermark helper
  const drawWatermark = (ctx, width, height) => {
    const padding = Math.max(width, height) * 0.02;
    const boxWidth = width * 0.55 > 420 ? width * 0.55 : width - padding * 2;
    const boxHeight = height * 0.24 > 170 ? height * 0.24 : 170;
    
    const boxX = padding;
    const boxY = height - boxHeight - padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
    ctx.fill();

    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, 8, boxHeight, [16, 0, 0, 16]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    
    const titleSize = Math.max(14, Math.floor(width * 0.018));
    const textSize = Math.max(12, Math.floor(width * 0.014));
    const codeSize = Math.max(11, Math.floor(width * 0.012));

    let currentY = boxY + 16;
    const textIndent = boxX + 24;

    ctx.font = `bold ${titleSize}px Outfit, Arial`;
    ctx.fillStyle = '#ff8c3a';
    ctx.fillText('Kegiatan Pencacahan Sensus Ekonomi', textIndent, currentY);
    currentY += titleSize + 10;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${textSize}px Outfit, Arial`;
    const slsName = currentSls ? currentSls.properties.nmsls : 'Luar Batas SLS';
    ctx.fillText(`SLS: ${slsName}`, textIndent, currentY);
    currentY += textSize + 6;

    ctx.font = `${codeSize}px Courier New, monospace`;
    ctx.fillStyle = '#cccccc';
    const slsId = currentSls ? currentSls.properties.idsubsls : '-';
    ctx.fillText(`ID SUBSLS: ${slsId}`, textIndent, currentY);
    currentY += codeSize + 8;

    ctx.font = `${textSize}px Outfit, Arial`;
    ctx.fillStyle = '#ffffff';
    const lat = userLocation ? userLocation.latitude.toFixed(6) : '-';
    const lng = userLocation ? userLocation.longitude.toFixed(6) : '-';
    const acc = userLocation ? userLocation.accuracy.toFixed(1) : '-';
    ctx.fillText(`KOORDINAT: ${lat}, ${lng} (±${acc}m)`, textIndent, currentY);
    currentY += textSize + 6;

    ctx.font = `${codeSize}px Outfit, Arial`;
    ctx.fillStyle = '#a8a8a8';
    const timestamp = new Date().toLocaleString('id-ID', { timeZoneName: 'short' });
    ctx.fillText(`WAKTU: ${timestamp}`, textIndent, currentY);
  };

  // Capture Live stream
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let width = video.videoWidth;
    let height = video.videoHeight;

    const maxDim = 1600;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);
    drawWatermark(ctx, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Handle uploaded file watermark drawing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxMB = 2;
    const maxSizeBytes = maxMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast(`Ukuran file foto terlalu besar! Maksimal ukuran file adalah ${maxMB} MB.`, 'warning');
      return;
    }

    setCameraLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        drawWatermark(ctx, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setCapturedImage(dataUrl);
        setCameraLoading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Submit to PHP server
  const handleServerUpload = async () => {
    if (!capturedImage) return;

    setUploading(true);
    try {
      const apiBaseUrl = localStorage.getItem('maps_api_url') || 'api';
      const uploadEndpoint = `${apiBaseUrl}/upload.php`;

      const payload = {
        image: capturedImage,
        idsubsls: currentSls ? currentSls.properties.idsubsls : '00',
        nmsls: currentSls ? currentSls.properties.nmsls : 'Luar Batas SLS',
        latitude: userLocation ? userLocation.latitude : 0,
        longitude: userLocation ? userLocation.longitude : 0,
        accuracy: userLocation ? userLocation.accuracy : 0,
        category: category,
        description: description  // ← kirim deskripsi ke server
      };

      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUploadSuccess(true);
        setTimeout(() => {
          // ── Reset semua state form setelah upload sukses ──
          setUploadSuccess(false);
          setCapturedImage(null);
          setDescription('');        // ← reset deskripsi
          setCategory('Dokumentasi'); // ← reset kategori ke default
          onClose();
        }, 1500);
      } else {
        showToast('Gagal mengunggah: ' + (data.message || 'Error tidak dikenal'), 'error');
      }
    } catch (err) {
      console.error('Network upload error:', err);
      showToast('Koneksi ke PHP server gagal. Pastikan alamat MAMP server lokal diatur dengan benar.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Ambil ulang foto — reset capturedImage DAN deskripsi
  const handleRetake = () => {
    setCapturedImage(null);
    setDescription('');  // ← reset deskripsi saat ambil ulang
    setError(null);
    setCameraLoading(false);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-overlay" style={styles.overlay}>
      <GlassPanel className="camera-container" style={styles.container}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.tabHeader}>
            <h3 style={styles.title}>Dokumentasi Lapangan (Maks. 2 MB)</h3>
            
            {!capturedImage && (
              <div style={styles.tabs}>
                <button 
                  onClick={() => setMode('capture')} 
                  style={{ ...styles.tab, ...(mode === 'capture' ? styles.activeTab : {}) }}
                >
                  <Camera size={14} style={{ marginRight: 6 }} /> Kamera
                </button>
                <button 
                  onClick={() => setMode('upload')} 
                  style={{ ...styles.tab, ...(mode === 'upload' ? styles.activeTab : {}) }}
                >
                  <Upload size={14} style={{ marginRight: 6 }} /> Unggah File
                </button>
              </div>
            )}
          </div>
          
          <button onClick={onClose} style={styles.closeBtn} disabled={uploading}>
            <X size={20} />
          </button>
        </div>

        {/* Media Frame */}
        <div style={styles.cameraFrame}>
          {capturedImage ? (
            <div style={styles.previewContainer}>
              {uploadSuccess && (
                <div style={styles.successOverlay}>
                  <Check size={48} color="#ffffff" style={styles.successCheck} />
                  <span style={styles.successLabel}>Foto Berhasil Diunggah!</span>
                </div>
              )}
              <img src={capturedImage} alt="Watermark Preview" style={styles.previewImage} />
            </div>
          ) : mode === 'upload' ? (
            <div style={styles.uploadBoxContainer}>
              <GlassPanel style={styles.uploadPlaceholder} onClick={triggerFileSelect}>
                <ImageIcon size={48} color="hsl(var(--color-primary))" style={{ marginBottom: 12 }} />
                <span style={styles.uploadPlaceholderText}>Pilih Foto dari Perangkat Anda</span>
                <span style={styles.uploadPlaceholderSubText}>Maksimal ukuran file: 2 MB. Watermark informasi lokasi ditambahkan otomatis.</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </GlassPanel>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <AlertTriangle size={40} color="#ff3b30" style={{ marginBottom: 12 }} />
              <p style={styles.errorText}>{error}</p>
              <button onClick={() => setMode('upload')} className="btn-primary" style={{ marginTop: 16 }}>
                <Upload size={16} style={{ marginRight: 6 }} /> Unggah File Saja
              </button>
            </div>
          ) : (
            <div style={styles.videoContainer}>
              {cameraLoading && (
                <div style={styles.spinnerOverlay}>
                  <RefreshCw className="pulse-location" size={24} color="hsl(var(--color-primary))" />
                  <span style={styles.spinnerLabel}>Menghubungkan Kamera...</span>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={styles.video} 
              />
              <div style={styles.liveOverlay}>
                <div style={styles.liveOverlayTag}>Pencacahan Sensus Ekonomi</div>
                <div style={styles.liveWatermark}>
                  <div style={styles.liveWatermarkHeader}>KEGIATAN PENCACAHAN SENSUS EKONOMI</div>
                  <div style={styles.liveWatermarkTitle}>
                    SLS: {currentSls ? currentSls.properties.nmsls : 'Luar Batas Wilayah'}
                  </div>
                  <div style={styles.liveWatermarkCoords}>
                    {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'Mencari sinyal GPS...'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls & Category + Description */}
        <div style={styles.footer}>
          {capturedImage ? (
            <div style={styles.capturedForm}>

              {/* Pilih Kategori */}
              <div style={styles.categorySelectGroup}>
                <label style={styles.categoryLabel}>Klasifikasikan Foto Sebagai:</label>
                <div className="camera-category-group" style={styles.categoryRadioGroup}>
                  {['Dokumentasi', 'Kendala', 'Lainnya'].map(cat => (
                    <label 
                      key={cat} 
                      style={{
                        ...styles.categoryRadioButton,
                        ...(category === cat ? styles.categoryRadioActive : {})
                      }}
                    >
                      <input 
                        type="radio" 
                        name="photo_category" 
                        value={cat} 
                        checked={category === cat}
                        onChange={() => setCategory(cat)}
                        style={{ display: 'none' }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Deskripsi Foto ── */}
              <div style={styles.descriptionGroup}>
                <label style={styles.categoryLabel}>
                  Deskripsi Foto
                  <span style={styles.descriptionOptional}> (opsional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    category === 'Dokumentasi'
                      ? 'Contoh: Dokumentasi kegiatan pendataan RT 01 bersama kepala lingkungan...'
                      : category === 'Kendala'
                      ? 'Contoh: Jalan menuju lokasi tidak dapat dilalui karena banjir...'
                      : 'Tambahkan keterangan foto di sini...'
                  }
                  maxLength={500}
                  rows={3}
                  style={styles.descriptionTextarea}
                  disabled={uploading}
                />
                <span style={styles.descriptionCount}>{description.length}/500</span>
              </div>

              {/* Tombol Aksi */}
              <div style={styles.formActions}>
                <button onClick={handleRetake} className="btn-secondary" style={styles.actionBtn} disabled={uploading}>
                  <ArrowLeft size={16} /> Ambil Ulang
                </button>
                <button onClick={handleServerUpload} className="btn-primary" style={styles.actionBtn} disabled={uploading}>
                  {uploading ? (
                    <><RefreshCw size={16} className="pulse-location" /> Mengunggah...</>
                  ) : (
                    <><Upload size={16} /> Unggah Ke Server</>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div style={styles.liveControls}>
              {mode === 'capture' && !error && !cameraLoading && (
                <>
                  <button onClick={handleToggleCamera} className="btn-secondary" style={styles.iconBtn}>
                    <RefreshCw size={18} />
                  </button>
                  <button onClick={handleCapture} style={styles.captureBtn}>
                    <div style={styles.captureBtnInner} />
                  </button>
                  <div style={{ width: 42 }} />
                </>
              )}
              {mode === 'upload' && (
                <button onClick={triggerFileSelect} className="btn-primary" style={styles.selectFileBtn}>
                  Pilih Gambar
                </button>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(15px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
    padding: '20px',
  },
  container: {
    width: '100%',
    maxWidth: '760px',
    height: '82vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0',
    border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
  },
  tabHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'hsl(var(--color-dark))',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '6px',
  },
  tab: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(0,0,0,0.04)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'hsl(var(--color-gray-text))',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 102, 0, 0.1)',
    border: '1px solid hsl(var(--color-primary))',
    color: 'hsl(var(--color-primary))',
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
  },
  cameraFrame: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0c0c0f',
    overflow: 'hidden',
    minHeight: 0,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  spinnerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: '12px',
  },
  spinnerLabel: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  liveOverlay: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    right: '16px',
    pointerEvents: 'none',
    zIndex: 5,
  },
  liveOverlayTag: {
    backgroundColor: 'rgba(255, 102, 0, 0.9)',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 600,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    display: 'inline-block',
    marginBottom: '6px',
  },
  liveWatermark: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderLeft: '4px solid #ff6600',
    padding: '12px 16px',
    borderRadius: '0 8px 8px 0',
    color: '#ffffff',
    backdropFilter: 'blur(5px)',
    maxWidth: '380px',
  },
  liveWatermarkHeader: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#ff8c3a',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  liveWatermarkTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '2px',
  },
  liveWatermarkCoords: {
    fontSize: '11px',
    color: '#cccccc',
    fontFamily: 'monospace',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#0c0c0f',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  successOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(52, 199, 89, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    gap: '12px',
  },
  successCheck: {
    animation: 'spin 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
  },
  successLabel: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
  },
  uploadBoxContainer: {
    padding: '40px',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    width: '100%',
    maxWidth: '460px',
    height: '240px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px dashed rgba(255, 102, 0, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    padding: '24px',
  },
  uploadPlaceholderText: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'hsl(var(--color-dark))',
    marginBottom: '4px',
  },
  uploadPlaceholderSubText: {
    fontSize: '12px',
    color: 'hsl(var(--color-gray-text))',
    maxWidth: '300px',
  },
  errorContainer: {
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: '#ffffff',
  },
  errorText: {
    fontSize: '14px',
    color: '#ff453a',
    fontWeight: 500,
    maxWidth: '340px',
    lineHeight: '1.4',
  },
  footer: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  liveControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '240px',
  },
  capturedForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '440px',
  },
  categorySelectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  categoryLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'hsl(var(--color-dark))',
    paddingLeft: '4px',
  },
  categoryRadioGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
  },
  categoryRadioButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.06)',
    background: 'rgba(0,0,0,0.02)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  categoryRadioActive: {
    background: 'rgba(255, 102, 0, 0.08)',
    border: '1px solid hsl(var(--color-primary))',
    color: 'hsl(var(--color-primary))',
  },
  // ── Styles deskripsi ──
  descriptionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  descriptionOptional: {
    fontSize: '11px',
    fontWeight: 400,
    color: 'hsl(var(--color-gray-text))',
  },
  descriptionTextarea: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontSize: '13px',
    color: 'hsl(var(--color-dark))',
    resize: 'none',
    minHeight: '68px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  descriptionCount: {
    fontSize: '11px',
    color: 'hsl(var(--color-gray-text))',
    textAlign: 'right',
    marginTop: '-2px',
    paddingRight: '2px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    fontSize: '13px',
    padding: '11px',
  },
  iconBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    backgroundColor: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  captureBtn: {
    width: '66px',
    height: '66px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '4px solid hsl(var(--color-primary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)',
  },
  captureBtnInner: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: 'hsl(var(--color-primary))',
  },
  selectFileBtn: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
  }
};