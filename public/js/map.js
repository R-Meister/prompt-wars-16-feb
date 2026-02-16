/**
 * Google Maps Integration
 * Emotional heatmap, city markers, and world map visualization
 */

const AtlasMap = (() => {
    let map = null;
    let worldMap = null;
    let markers = [];
    let infoWindow = null;
    const EMOTION_COLORS = {
        warmth: { r: 245, g: 158, b: 11 },
        loneliness: { r: 59, g: 130, b: 246 },
        tension: { r: 239, g: 68, b: 68 },
        nostalgia: { r: 168, g: 85, b: 247 },
        belonging: { r: 34, g: 197, b: 94 },
        neutral: { r: 148, g: 163, b: 184 }
    };

    const DARK_MAP_STYLE = [
        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1425' }] },
        { featureType: 'road', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
        { featureType: 'administrative.province', stylers: [{ visibility: 'off' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] }
    ];

    /**
     * Initialize the main game map
     */
    function initGameMap(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !window.google?.maps) return null;

        map = new google.maps.Map(container, {
            center: { lat: 20, lng: 0 },
            zoom: 2.5,
            styles: DARK_MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.LEFT_CENTER },
            gestureHandling: 'greedy',
            backgroundColor: '#0a0e1a'
        });

        infoWindow = new google.maps.InfoWindow();
        return map;
    }

    /**
     * Initialize the world map modal view
     */
    function initWorldMap(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !window.google?.maps) return null;

        worldMap = new google.maps.Map(container, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            styles: DARK_MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: true,
            backgroundColor: '#0a0e1a'
        });

        return worldMap;
    }

    /**
     * Add a visited city marker to the game map
     */
    function addCityMarker(city, dominantEmotion = 'neutral') {
        if (!map || !window.google?.maps) return;

        const color = EMOTION_COLORS[dominantEmotion] || EMOTION_COLORS.neutral;

        const marker = new google.maps.Marker({
            position: { lat: city.lat, lng: city.lng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: `rgb(${color.r},${color.g},${color.b})`,
                fillOpacity: 0.8,
                strokeColor: `rgba(${color.r},${color.g},${color.b},0.4)`,
                strokeWeight: 6
            },
            title: city.name,
            animation: google.maps.Animation.DROP
        });

        marker.addListener('click', () => {
            infoWindow.setContent(`
        <div style="background:#1e293b;color:#f1f5f9;padding:8px 12px;border-radius:8px;font-family:Inter,sans-serif;font-size:13px;">
          <strong>${city.name}</strong><br>
          <span style="color:#94a3b8;font-size:11px;">${city.country} · ${dominantEmotion}</span>
        </div>
      `);
            infoWindow.open(map, marker);
        });

        markers.push(marker);
        return marker;
    }

    /**
     * Pan and zoom to a specific city
     */
    function panToCity(lat, lng) {
        if (!map) return;
        map.panTo({ lat, lng });
        map.setZoom(6);
    }

    /**
     * Load emotional data onto the world map modal
     */
    function loadWorldMapData(cities) {
        if (!worldMap || !window.google?.maps) return;

        cities.forEach(city => {
            const emotion = city.dominantEmotion || 'neutral';
            const color = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
            const scale = Math.min(6 + city.visitCount * 0.5, 20);

            const marker = new google.maps.Marker({
                position: { lat: city.lat, lng: city.lng },
                map: worldMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: scale,
                    fillColor: `rgb(${color.r},${color.g},${color.b})`,
                    fillOpacity: 0.55,
                    strokeColor: `rgba(${color.r},${color.g},${color.b},0.3)`,
                    strokeWeight: 3
                },
                title: `${city.name} — ${emotion}`
            });

            marker.addListener('click', () => {
                const emotionBars = Object.entries(city.emotions || {})
                    .map(([k, v]) => `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            <span style="width:60px;font-size:10px;color:#94a3b8;text-transform:capitalize;">${k}</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
              <div style="width:${(v * 100).toFixed(0)}%;height:100%;background:rgb(${(EMOTION_COLORS[k] || EMOTION_COLORS.neutral).r},${(EMOTION_COLORS[k] || EMOTION_COLORS.neutral).g},${(EMOTION_COLORS[k] || EMOTION_COLORS.neutral).b});border-radius:2px;"></div>
            </div>
          </div>`).join('');

                infoWindow.setContent(`
          <div style="background:#1e293b;color:#f1f5f9;padding:10px 14px;border-radius:10px;font-family:Inter,sans-serif;min-width:180px;">
            <strong style="font-size:14px;">${city.name}</strong>
            <div style="font-size:11px;color:#94a3b8;margin:2px 0 8px;">${city.country} · ${city.visitCount} visits</div>
            ${emotionBars}
          </div>
        `);
                infoWindow.open(worldMap, marker);
            });
        });
    }

    /**
     * Clear all markers
     */
    function clearMarkers() {
        markers.forEach(m => m.setMap(null));
        markers = [];
    }

    return {
        initGameMap,
        initWorldMap,
        addCityMarker,
        panToCity,
        loadWorldMapData,
        clearMarkers,
        EMOTION_COLORS
    };
})();
