import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, RefreshCw, AlertTriangle } from 'lucide-react';

// Tile Providers for Leaflet corresponding to styling themes
const TILE_PROVIDERS = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  silver: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  retro: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

// Zoom level minimum untuk label SLS tampil
const LABEL_MIN_ZOOM = 14;

export default function MapContainer({
  theme = 'light',
  geojson,
  userLocation,
  selectedSls,
  onSelectSls,
  filteredSlsIds,
  centerOnUserTrigger,
  progressData = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);

  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);

  // Ref untuk nyimpan filteredSlsIds terbaru — supaya closure zoomend
  // selalu baca nilai yang current, bukan snapshot saat geojson pertama render
  const filteredSlsIdsRef = useRef(filteredSlsIds);
  useEffect(() => {
    filteredSlsIdsRef.current = filteredSlsIds;
  }, [filteredSlsIds]);

  const [loading, setLoading] = useState(true);

  // Helper to determine feature styles
  const getStyleForFeature = (feature, isSelected, isVisible, progressData) => {
    const idsubsls = feature.properties.idsubsls;

    // Default styling (when progress data is not loaded yet)
    let fillColor = '#ff9800';
    let strokeColor = '#ff6600';
    let fillOpacity = isVisible ? (isSelected ? 0.55 : 0.18) : 0;
    let weight = isSelected ? 3 : 1.5;

    // Apply progress colors if progressData is available
    if (progressData) {
      const progressInfo = progressData[idsubsls];
      if (progressInfo) {
        const total = parseInt(progressInfo.totalRegion || 0, 10);
        const open = parseInt(progressInfo.OPEN || 0, 10);
        const draft = parseInt(progressInfo.DRAFT || 0, 10);
        const completed = total - open - draft;
        const pct = total > 0 ? completed / total : 0;

        if (total === 0) {
          fillColor = '#b0bec5';
          strokeColor = '#78909c';
        } else if (pct === 0) {
          fillColor = '#cfd8dc';
          strokeColor = '#90a4ae';
        } else if (pct < 1) {
          fillColor = '#ff9800';
          strokeColor = '#f57c00';
          fillOpacity = isVisible ? (isSelected ? 0.6 : 0.3) : 0;
        } else {
          fillColor = '#34c759';
          strokeColor = '#2e7d32';
          fillOpacity = isVisible ? (isSelected ? 0.65 : 0.35) : 0;
        }
      } else {
        // Not found in progress API list, treat as 0%/no target
        fillColor = '#cfd8dc';
        strokeColor = '#90a4ae';
      }
    }

    return {
      fillColor,
      fillOpacity,
      color: strokeColor,
      weight,
      opacity: isVisible ? 0.8 : 0,
    };
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center to Barru Regency, Indonesia
    const defaultCenter = [-4.42, 119.70];
    const defaultZoom = 12;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
    });

    // Add zoom control at bottom-right for clean Apple-like UI
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;
    setLoading(false);

    // Initial tile layer addition
    const provider = TILE_PROVIDERS[theme] || TILE_PROVIDERS.light;
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Map Tile Layer based on theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);

    const provider = TILE_PROVIDERS[theme] || TILE_PROVIDERS.light;
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [theme]);

  // Render/Update GeoJSON layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojson) return;

    // Clear existing geojson layer if any
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    try {
      // Style helper function
      const getFeatureStyle = (feature) => {
        const isSelected = selectedSls && selectedSls.properties && selectedSls.properties.idsubsls === feature.properties.idsubsls;
        const isVisible = !filteredSlsIds || filteredSlsIds.has(feature.properties.idsubsls);
        return getStyleForFeature(feature, isSelected, isVisible, progressData);
      };

      // Create new Leaflet GeoJSON layer
      const geojsonLayer = L.geoJSON(geojson, {
        style: getFeatureStyle,
        onEachFeature: (feature, layer) => {
          // Bind click interaction
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectSls(feature);
          });

          // Bind hover interaction
          layer.on('mouseover', () => {
            const idsubsls = feature.properties.idsubsls;
            const isVisible = !filteredSlsIds || filteredSlsIds.has(idsubsls);
            if (!isVisible) return;

            layer.setStyle({
              fillColor: '#ff6600',
              fillOpacity: 0.35,
              weight: 2.5
            });
          });

          layer.on('mouseout', () => {
            const idsubsls = feature.properties.idsubsls;
            // Only reset if it is not selected
            const isSelected = selectedSls && selectedSls.properties && selectedSls.properties.idsubsls === idsubsls;
            if (!isSelected) {
              geojsonLayer.resetStyle(layer);
            }
          });

          // ── LABEL NAMA SLS ──────────────────────────────────────────
          // Bind tooltip ke SEMUA SLS — visibilitas dikontrol dinamis
          // via useEffect filteredSlsIds di bawah
          const nmsls = feature.properties.nmsls || '';
          if (nmsls) {
            layer.bindTooltip(nmsls, {
              permanent: true,
              direction: 'center',
              className: 'sls-label',
              opacity: 1,
            });
          }
          // ────────────────────────────────────────────────────────────
        }
      }).addTo(map);

      geojsonLayerRef.current = geojsonLayer;

      // ── KONTROL VISIBILITAS LABEL BERDASARKAN ZOOM ──────────────────
      const updateLabelVisibility = () => {
        const zoom = map.getZoom();
        // Baca dari ref, bukan closure — agar selalu dapat filteredSlsIds terbaru
        const currentFilter = filteredSlsIdsRef.current;

        geojsonLayer.eachLayer((layer) => {
          const tooltip = layer.getTooltip();
          if (!tooltip) return;
          const tooltipEl = tooltip.getElement();
          if (!tooltipEl) return;

          const idsubsls = layer.feature?.properties?.idsubsls;
          const isInFilter = !currentFilter || currentFilter.has(idsubsls);

          // Label tampil hanya jika: zoom cukup DAN SLS masuk filter aktif
          tooltipEl.style.display = (zoom >= LABEL_MIN_ZOOM && isInFilter) ? '' : 'none';
        });
      };

      // Pasang event listener zoom
      map.on('zoomend', updateLabelVisibility);

      // Cek visibilitas saat pertama kali layer dimuat
      // Sedikit delay untuk memastikan tooltip sudah di-render ke DOM
      setTimeout(updateLabelVisibility, 100);
      // ────────────────────────────────────────────────────────────────

      // Fit map bounds to the geojson layer
      const bounds = geojsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }

    } catch (e) {
      console.error('Error loading GeoJSON in Leaflet:', e);
    }
  }, [geojson, mapInstanceRef.current]);

  // Update styles when selections, filters, or progress changes
  useEffect(() => {
    if (!geojsonLayerRef.current) return;

    geojsonLayerRef.current.eachLayer((layer) => {
      const feature = layer.feature;
      const idsubsls = feature.properties.idsubsls;
      const isSelected = selectedSls && selectedSls.properties && selectedSls.properties.idsubsls === idsubsls;
      const isVisible = !filteredSlsIds || filteredSlsIds.has(idsubsls);

      const style = getStyleForFeature(feature, isSelected, isVisible, progressData);
      layer.setStyle(style);

      // Update interactive options dynamically
      if (layer.getElement()) {
        if (isVisible) {
          layer.getElement().style.pointerEvents = 'auto';
        } else {
          layer.getElement().style.pointerEvents = 'none';
        }
      }
    });
  }, [selectedSls, filteredSlsIds, progressData]);

  // ── SYNC VISIBILITAS LABEL SAAT FILTER BERUBAH ──────────────────────
  // useEffect terpisah agar label langsung update ketika search/filter aktif
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonLayerRef.current) return;

    const zoom = map.getZoom();

    geojsonLayerRef.current.eachLayer((layer) => {
      const tooltip = layer.getTooltip();
      if (!tooltip) return;
      const tooltipEl = tooltip.getElement();
      if (!tooltipEl) return;

      const idsubsls = layer.feature?.properties?.idsubsls;
      const isInFilter = !filteredSlsIds || filteredSlsIds.has(idsubsls);

      tooltipEl.style.display = (zoom >= LABEL_MIN_ZOOM && isInFilter) ? '' : 'none';
    });
  }, [filteredSlsIds]);
  // ────────────────────────────────────────────────────────────────────

  // Track User Location with marker & accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const position = [userLocation.latitude, userLocation.longitude];

      // Update or create accuracy circle
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(position, {
          radius: userLocation.accuracy || 15,
          fillColor: '#007aff',
          fillOpacity: 0.12,
          color: '#007aff',
          weight: 1,
          opacity: 0.3,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(position);
        userAccuracyCircleRef.current.setRadius(userLocation.accuracy || 15);
      }

      // Update or create user circle marker (vector)
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker(position, {
          radius: 7,
          fillColor: '#007aff',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 2.5,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(position);
      }

    } else {
      // Cleanup user locations if not available
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        map.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
    }
  }, [userLocation]);

  // Center on user action
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation || centerOnUserTrigger === 0) return;

    map.setView([userLocation.latitude, userLocation.longitude], 16, {
      animate: true,
      duration: 1
    });
  }, [centerOnUserTrigger]);

  return (
    <div style={styles.mapWrapper}>
      {loading && (
        <div style={styles.loadingOverlay}>
          <RefreshCw className="pulse-location" size={24} color="hsl(var(--color-primary))" style={styles.spinner} />
          <span style={styles.loadingText}>Memuat Peta...</span>
        </div>
      )}
      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}

const styles = {
  mapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    gap: '12px',
  },
  spinner: {
    animation: 'spin 2s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'hsl(var(--color-dark))',
  }
};