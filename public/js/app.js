/**
 * Atlas: Echoes of Earth — Main Application with Sprite Character
 * Core game logic, UI interactions, Leaflet map, sprite animation, and state management.
 * @module app
 */

(() => {
    'use strict';

    // ─── State ─────────────────────────────
    const state = {
        countryChain: [],
        usedCountries: [],
        previousCountry: null,
        currentScenario: null,
        isLoading: false,
        map: null,
        markers: [],
        activeMarker: null,
        sprite: null,
        journeyPath: null,
        isWalking: false,
    };

    // ─── DOM Elements ──────────────────────
    const $ = (id) => document.getElementById(id);
    const els = {
        loadingScreen: $('loading-screen'),
        app: $('app'),
        countryInput: $('country-input'),
        btnSubmit: $('btn-submit'),
        inputHint: $('input-hint'),
        autocompleteList: $('autocomplete-list'),
        scenarioArea: $('scenario-area'),
        scenarioCountryName: $('scenario-country-name'),
        scenarioCapital: $('scenario-capital'),
        scenarioText: $('scenario-text'),
        choiceButtons: $('choice-buttons'),
        echoResult: $('echo-result'),
        emotionBars: $('emotion-bars'),
        echoMessage: $('echo-message'),
        btnContinue: $('btn-continue'),
        countryChain: $('country-chain'),
        countryCount: $('country-count'),
        inputArea: $('input-area'),
        btnWorldMap: $('btn-world-map'),
        btnNewGame: $('btn-new-game'),
        worldMapModal: $('world-map-modal'),
        btnCloseModal: $('btn-close-modal'),
        toastContainer: $('toast-container'),
        leafletMap: $('leaflet-map'),
    };

    // ─── Emotion metadata ─────────────────
    const EMOTIONS = {
        warmth: { color: 'hsl(35,90%,55%)', icon: '☀️', label: 'Warmth' },
        loneliness: { color: 'hsl(220,70%,55%)', icon: '🌙', label: 'Loneliness' },
        tension: { color: 'hsl(0,75%,55%)', icon: '⚡', label: 'Tension' },
        nostalgia: { color: 'hsl(280,60%,55%)', icon: '🌸', label: 'Nostalgia' },
        belonging: { color: 'hsl(145,65%,45%)', icon: '🏡', label: 'Belonging' },
    };

    const EMOTION_RGB = {
        warmth: { r: 245, g: 158, b: 11 },
        loneliness: { r: 59, g: 130, b: 246 },
        tension: { r: 239, g: 68, b: 68 },
        nostalgia: { r: 168, g: 85, b: 247 },
        belonging: { r: 34, g: 197, b: 94 },
        neutral: { r: 148, g: 163, b: 184 },
    };

    // ─── Initialize ────────────────────────
    function init() {
        console.log('[Atlas] Initializing...');
        
        try {
            initMap();
            setupEventListeners();
            console.log('[Atlas] Initialization complete');
        } catch (error) {
            console.error('[Atlas] Initialization error:', error);
            showToast('Failed to initialize. Please refresh.', 'error');
        }

        // Simulate loading then reveal app
        setTimeout(() => {
            els.loadingScreen.classList.add('fade-out');
            els.app.classList.remove('hidden');
            setTimeout(() => els.loadingScreen.remove(), 800);
            if (els.countryInput) els.countryInput.focus();
        }, 1500);
    }

    // ─── Leaflet Map ───────────────────────
    function initMap() {
        if (!els.leafletMap) {
            console.error('[Atlas] Map container not found');
            return;
        }

        if (typeof L === 'undefined') {
            console.error('[Atlas] Leaflet not loaded');
            showToast('Map library failed to load. Check internet connection.', 'error');
            return;
        }

        try {
            // Initialize map centered on world view
            state.map = L.map('leaflet-map', {
                center: [20, 0],
                zoom: 2,
                minZoom: 2,
                maxZoom: 10,
                zoomControl: false,
                attributionControl: false,
                worldCopyJump: true,
            });

            // Add CartoDB Dark Matter tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(state.map);

            // Add zoom control to bottom right
            L.control.zoom({
                position: 'bottomright'
            }).addTo(state.map);

            // Add sprite character
            createSprite();

            console.log('[Atlas] Map initialized successfully');
        } catch (error) {
            console.error('[Atlas] Map initialization error:', error);
            showToast('Failed to load map', 'error');
        }
    }

    // ─── Sprite Character ──────────────────
    function createSprite() {
        if (!state.map) return;

        const spriteIcon = L.divIcon({
            className: 'sprite-character',
            html: `
                <div class="sprite-container">
                    <svg viewBox="0 0 40 60" class="sprite-svg">
                        <!-- Walking person SVG -->
                        <g class="sprite-body">
                            <!-- Head -->
                            <circle cx="20" cy="10" r="8" fill="#fbbf24" />
                            <!-- Body -->
                            <line x1="20" y1="18" x2="20" y2="35" stroke="#60a5fa" stroke-width="6" stroke-linecap="round" />
                            <!-- Arms -->
                            <line class="sprite-arm-left" x1="20" y1="22" x2="8" y2="30" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
                            <line class="sprite-arm-right" x1="20" y1="22" x2="32" y2="30" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
                            <!-- Legs -->
                            <line class="sprite-leg-left" x1="20" y1="35" x2="12" y2="52" stroke="#374151" stroke-width="5" stroke-linecap="round" />
                            <line class="sprite-leg-right" x1="20" y1="35" x2="28" y2="52" stroke="#374151" stroke-width="5" stroke-linecap="round" />
                            <!-- Backpack -->
                            <rect x="24" y="20" width="10" height="14" rx="2" fill="#ef4444" />
                        </g>
                    </svg>
                    <div class="sprite-shadow"></div>
                </div>
            `,
            iconSize: [40, 60],
            iconAnchor: [20, 55],
        });

        // Start sprite at a default position (will be hidden until first country)
        state.sprite = L.marker([0, 0], { 
            icon: spriteIcon, 
            zIndexOffset: 2000 
        });
        
        // Don't add to map yet - wait for first country
    }

    // ─── Animate Sprite Walking ────────────
    function animateSpriteToCountry(fromLat, fromLng, toLat, toLng, countryName) {
        if (!state.map || !state.sprite) return;

        state.isWalking = true;
        
        // Add sprite to map if not already
        if (!state.map.hasLayer(state.sprite)) {
            state.sprite.setLatLng([fromLat, fromLng]);
            state.sprite.addTo(state.map);
        }

        // Draw path line
        if (state.journeyPath) {
            state.map.removeLayer(state.journeyPath);
        }

        const latlngs = [
            [fromLat, fromLng],
            [toLat, toLng]
        ];

        state.journeyPath = L.polyline(latlngs, {
            color: '#60a5fa',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10',
            className: 'journey-path'
        }).addTo(state.map);

        // Animate the path drawing
        const pathElement = state.journeyPath._path;
        if (pathElement) {
            const length = pathElement.getTotalLength ? pathElement.getTotalLength() : 1000;
            pathElement.style.strokeDasharray = length;
            pathElement.style.strokeDashoffset = length;
            pathElement.style.animation = 'draw-path 2s ease forwards';
        }

        // Animate sprite movement
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentLat = fromLat + (toLat - fromLat) * easeProgress;
            const currentLng = fromLng + (toLng - fromLng) * easeProgress;
            
            state.sprite.setLatLng([currentLat, currentLng]);
            
            // Add walking animation class
            const spriteContainer = document.querySelector('.sprite-container');
            if (spriteContainer) {
                spriteContainer.classList.add('walking');
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Arrived
                state.isWalking = false;
                if (spriteContainer) {
                    spriteContainer.classList.remove('walking');
                }
                
                // Show arrival popup
                state.sprite.bindPopup(`<b>Arrived in ${countryName}!</b>`, {
                    closeButton: false,
                    className: 'arrival-popup'
                }).openPopup();
                
                setTimeout(() => {
                    state.sprite.closePopup();
                }, 2000);
            }
        }
        
        requestAnimationFrame(animate);
        
        // Pan map to follow sprite
        state.map.flyTo([toLat, toLng], 5, {
            duration: 2.5,
            easeLinearity: 0.25
        });
    }

    // ─── Add Country Marker ────────────────
    function addMapMarker(country, emotion) {
        if (!state.map) return;
        
        const color = EMOTION_RGB[emotion] || EMOTION_RGB.neutral;
        const rgb = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create custom icon with pulse effect
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-container">
                    <div class="marker-pulse" style="background: ${rgb};"></div>
                    <div class="marker-core" style="background: ${rgb};"></div>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        const marker = L.marker([country.lat, country.lng], { icon: customIcon })
            .addTo(state.map);
        
        // Add popup with country name
        marker.bindPopup(`<b>${country.name}</b><br>${country.capital}`, {
            closeButton: false,
            className: 'custom-popup'
        });

        state.markers.push(marker);
        return marker;
    }

    // ─── Event Listeners ──────────────────
    function setupEventListeners() {
        if (els.btnSubmit) {
            els.btnSubmit.addEventListener('click', handleSubmit);
        }
        
        if (els.countryInput) {
            els.countryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') hideAutocomplete();
                if (e.key === 'ArrowDown') navigateAutocomplete(1);
                if (e.key === 'ArrowUp') navigateAutocomplete(-1);
            });

            // Autocomplete with debounce
            let debounceTimer;
            els.countryInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchAutocomplete(els.countryInput.value), 200);
            });
        }

        if (els.btnContinue) {
            els.btnContinue.addEventListener('click', handleContinue);
        }

        if (els.btnWorldMap) {
            els.btnWorldMap.addEventListener('click', openWorldMap);
        }
        
        if (els.btnCloseModal) {
            els.btnCloseModal.addEventListener('click', closeWorldMap);
        }
        
        if (els.worldMapModal) {
            els.worldMapModal.addEventListener('click', (e) => {
                if (e.target === els.worldMapModal) closeWorldMap();
            });
        }

        if (els.btnNewGame) {
            els.btnNewGame.addEventListener('click', resetGame);
        }

        // Close autocomplete on outside click
        document.addEventListener('click', (e) => {
            if (els.inputArea && !els.inputArea.contains(e.target)) hideAutocomplete();
        });

        // Keyboard escape for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.worldMapModal && !els.worldMapModal.classList.contains('hidden')) {
                closeWorldMap();
            }
        });
    }

    // ─── Submit Country ─────────────────────
    async function handleSubmit() {
        if (!els.countryInput) return;
        
        const countryName = els.countryInput.value.trim();
        if (!countryName || state.isLoading) return;

        setLoading(true);
        hideAutocomplete();
        clearHint();

        try {
            // Validate
            const validation = await api('/api/validate-country', {
                country: countryName,
                previousCountry: state.previousCountry,
                usedCountries: state.usedCountries,
            });

            if (!validation.valid) {
                showHint(validation.error, 'error');
                shakeInput();
                if (validation.hints?.length) {
                    showHint(`${validation.error} Try: ${validation.hints.slice(0, 3).join(', ')}`, 'error');
                }
                setLoading(false);
                return;
            }

            // Show success
            els.countryInput.classList.add('success');
            showHint(`✓ ${validation.country.name}`, 'success');

            // Generate scenario
            const scenario = await api('/api/generate-scenario', {
                country: validation.country.name,
                capital: validation.country.capital,
                lat: validation.country.lat,
                lng: validation.country.lng,
                continent: validation.country.continent,
                region: validation.country.region,
            });

            // Update state
            state.currentScenario = { ...scenario, countryData: validation.country };
            state.usedCountries.push(validation.country.name.toLowerCase());
            state.countryChain.push({
                name: validation.country.name,
                emotion: scenario.existingProfile?.dominantEmotion || 'neutral',
            });

            // Animate sprite from previous country (or start position)
            const prevCountry = state.countryChain.length > 1 ? state.countryChain[state.countryChain.length - 2] : null;
            const fromLat = prevCountry ? prevCountry.lat || 0 : validation.country.lat;
            const fromLng = prevCountry ? prevCountry.lng || 0 : validation.country.lng - 10;
            
            animateSpriteToCountry(
                fromLat, 
                fromLng, 
                validation.country.lat, 
                validation.country.lng,
                validation.country.name
            );

            // Update UI
            updateCountryChain();

            // Show scenario after a delay (let animation start)
            setTimeout(() => {
                showScenario(scenario);
            }, 1000);

        } catch (err) {
            console.error('[Atlas] Submit error:', err);
            showHint('Something went wrong. Please try again.', 'error');
            showToast('Connection error. Check your internet.', 'error');
        }

        setLoading(false);
    }

    // ─── Show Scenario ─────────────────────
    function showScenario(scenario) {
        if (!els.scenarioArea || !els.scenarioText) return;
        
        els.inputArea.classList.add('hidden');
        els.echoResult.classList.add('hidden');
        els.scenarioArea.classList.remove('hidden');

        if (els.scenarioCountryName) els.scenarioCountryName.textContent = scenario.country;
        if (els.scenarioCapital) els.scenarioCapital.textContent = scenario.capital;

        // Typewriter effect
        typewriter(els.scenarioText, scenario.scenario, 30);

        // Dynamically generate choice buttons
        if (els.choiceButtons) {
            els.choiceButtons.innerHTML = '';
            scenario.choices.forEach((choice) => {
                const btn = document.createElement('button');
                btn.className = `choice-btn choice-${choice.id.toLowerCase()}`;
                btn.setAttribute('data-choice', choice.id);
                btn.innerHTML = `
                    <span class="choice-label">${choice.id}</span>
                    <span class="choice-text">${choice.text}</span>
                `;
                btn.addEventListener('click', () => handleChoice(choice.id));
                els.choiceButtons.appendChild(btn);
            });
        }
    }

    // ─── Handle Choice ─────────────────────
    async function handleChoice(choiceId) {
        if (state.isLoading || !state.currentScenario) return;

        const choice = state.currentScenario.choices.find(c => c.id === choiceId);
        const countryData = state.currentScenario.countryData;

        if (!choice) return;

        // Visual feedback
        const buttons = els.choiceButtons.querySelectorAll('.choice-btn');
        buttons.forEach(btn => {
            if (btn.dataset.choice === choiceId) {
                btn.classList.add('selected');
            } else {
                btn.disabled = true;
            }
            btn.classList.add('disabled');
        });

        setLoading(true);

        try {
            const result = await api('/api/submit-choice', {
                country: countryData.name,
                capital: countryData.capital,
                lat: countryData.lat,
                lng: countryData.lng,
                choiceId,
                emotions: choice.emotions,
            });

            state.previousCountry = countryData.name;

            // Store lat/lng in chain for next animation
            const lastChain = state.countryChain[state.countryChain.length - 1];
            if (lastChain) {
                lastChain.lat = countryData.lat;
                lastChain.lng = countryData.lng;
                lastChain.emotion = result.profile?.dominantEmotion || 'neutral';
            }
            
            updateCountryChain();
            showEcho(result.profile, choice.emotions, countryData.name);

        } catch (err) {
            showToast('Failed to save your echo. Try again.', 'error');
        }

        setLoading(false);
    }

    // ─── Show Echo Result ──────────────────
    function showEcho(profile, choiceEmotions, countryName) {
        if (!els.echoResult || !els.emotionBars) return;
        
        els.scenarioArea.classList.add('hidden');
        els.echoResult.classList.remove('hidden');

        // Build emotion bars
        const barsHTML = Object.entries(choiceEmotions).map(([emotion, value]) => {
            const meta = EMOTIONS[emotion] || { color: '#94a3b8', label: emotion };
            const pct = Math.round(value * 100);
            return `
                <div class="emotion-bar-row">
                    <span class="emotion-bar-label">${meta.icon} ${meta.label}</span>
                    <div class="emotion-bar-track">
                        <div class="emotion-bar-fill" style="background:${meta.color};" data-width="${pct}%"></div>
                    </div>
                    <span class="emotion-bar-value">${pct}%</span>
                </div>
            `;
        }).join('');

        els.emotionBars.innerHTML = barsHTML;

        // Animate bars
        requestAnimationFrame(() => {
            setTimeout(() => {
                els.emotionBars.querySelectorAll('.emotion-bar-fill').forEach((bar) => {
                    bar.style.width = bar.dataset.width;
                });
            }, 100);
        });

        // Echo message
        const dominant = profile?.dominantEmotion || 'neutral';
        const visitCount = profile?.visitCount || 1;
        const messages = {
            warmth: `${countryName} glows a little warmer now.`,
            loneliness: `A quiet echo lingers over ${countryName}.`,
            tension: `The air in ${countryName} tightens slightly.`,
            nostalgia: `${countryName} remembers something from long ago.`,
            belonging: `${countryName} feels a little more like home.`,
            neutral: `You've left your mark on ${countryName}.`,
        };

        if (els.echoMessage) {
            els.echoMessage.textContent = `${messages[dominant]} (${visitCount} ${visitCount === 1 ? 'visit' : 'visits'} total)`;
        }
        if (els.countryCount) {
            els.countryCount.textContent = state.countryChain.length;
        }
    }

    // ─── Continue Journey ──────────────────
    function handleContinue() {
        if (!els.countryInput) return;
        
        els.echoResult.classList.add('hidden');
        els.inputArea.classList.remove('hidden');
        els.countryInput.value = '';
        els.countryInput.classList.remove('success', 'error');
        clearHint();

        if (state.previousCountry) {
            const lastLetter = getLastLetter(state.previousCountry);
            showHint(`Next country must start with "${lastLetter.toUpperCase()}"`, 'info');
        }

        els.countryInput.focus();
    }

    // ─── Autocomplete ──────────────────────
    let acIndex = -1;

    async function fetchAutocomplete(query) {
        if (!query || query.length < 2) {
            hideAutocomplete();
            return;
        }

        try {
            const res = await fetch(`/api/search-countries?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.results?.length) {
                showAutocomplete(data.results);
            } else {
                hideAutocomplete();
            }
        } catch {
            hideAutocomplete();
        }
    }

    function showAutocomplete(results) {
        if (!els.autocompleteList) return;
        
        acIndex = -1;
        els.autocompleteList.innerHTML = results.map((c, i) =>
            `<li role="option" data-index="${i}" data-name="${c.name}">${c.name} <span class="ac-capital">${c.capital}</span></li>`
        ).join('');

        els.autocompleteList.classList.add('visible');

        els.autocompleteList.querySelectorAll('li').forEach((li) => {
            li.addEventListener('click', () => {
                els.countryInput.value = li.dataset.name;
                hideAutocomplete();
                handleSubmit();
            });
        });
    }

    function hideAutocomplete() {
        if (els.autocompleteList) {
            els.autocompleteList.classList.remove('visible');
        }
        acIndex = -1;
    }

    function navigateAutocomplete(dir) {
        if (!els.autocompleteList) return;
        
        const items = els.autocompleteList.querySelectorAll('li');
        if (!items.length) return;

        items.forEach((li) => li.classList.remove('active'));
        acIndex = (acIndex + dir + items.length) % items.length;
        items[acIndex].classList.add('active');
        els.countryInput.value = items[acIndex].dataset.name;
    }

    // ─── World Map ─────────────────────────
    async function openWorldMap() {
        if (els.worldMapModal) {
            els.worldMapModal.classList.remove('hidden');
        }

        const mapView = document.getElementById('world-map-view');
        if (!mapView) return;

        try {
            const res = await fetch('/api/world-map');
            const data = await res.json();

            if (data.countries?.length) {
                mapView.innerHTML = '<div id="modal-map" style="width:100%;height:100%;"></div>';
                
                const modalMap = L.map('modal-map', {
                    center: [20, 0],
                    zoom: 2,
                    minZoom: 2,
                    zoomControl: true,
                    attributionControl: true,
                });

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 10
                }).addTo(modalMap);

                data.countries.forEach((country) => {
                    const emotion = country.dominantEmotion || 'neutral';
                    const color = EMOTION_RGB[emotion] || EMOTION_RGB.neutral;
                    const rgb = `rgb(${color.r},${color.g},${color.b})`;
                    const scale = Math.min(8 + country.visitCount * 1, 20);

                    const icon = L.divIcon({
                        className: 'modal-marker',
                        html: `<div style="width:${scale}px;height:${scale}px;background:${rgb};border-radius:50%;opacity:0.8;"></div>`,
                        iconSize: [scale, scale],
                        iconAnchor: [scale/2, scale/2],
                    });

                    L.marker([country.lat, country.lng], { icon })
                        .addTo(modalMap)
                        .bindPopup(`<b>${country.name}</b><br>Visits: ${country.visitCount}`);
                });
            } else {
                mapView.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;">No countries explored yet</div>';
            }
        } catch {
            showToast('Could not load world map data.', 'error');
        }
    }

    function closeWorldMap() {
        if (els.worldMapModal) {
            els.worldMapModal.classList.add('hidden');
        }
    }

    // ─── Reset Game ────────────────────────
    function resetGame() {
        state.countryChain = [];
        state.usedCountries = [];
        state.previousCountry = null;
        state.currentScenario = null;

        if (els.scenarioArea) els.scenarioArea.classList.add('hidden');
        if (els.echoResult) els.echoResult.classList.add('hidden');
        if (els.inputArea) els.inputArea.classList.remove('hidden');
        if (els.countryInput) {
            els.countryInput.value = '';
            els.countryInput.classList.remove('success', 'error');
        }
        clearHint();

        if (els.countryChain) {
            els.countryChain.innerHTML = '<div class="chain-placeholder">Enter your first country to begin...</div>';
        }
        if (els.countryCount) {
            els.countryCount.textContent = '0';
        }

        // Clear map markers but keep sprite
        state.markers.forEach(marker => {
            if (state.map) state.map.removeLayer(marker);
        });
        state.markers = [];

        if (state.journeyPath && state.map) {
            state.map.removeLayer(state.journeyPath);
            state.journeyPath = null;
        }

        // Reset map view
        if (state.map) {
            state.map.flyTo([20, 0], 2, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }

        showToast('New journey started!', 'info');
        if (els.countryInput) els.countryInput.focus();
    }

    // ─── Country Chain UI ─────────────────────
    function updateCountryChain() {
        if (!state.countryChain.length || !els.countryChain) return;

        const emotionColors = {
            warmth: 'hsl(35,90%,55%)',
            loneliness: 'hsl(220,70%,55%)',
            tension: 'hsl(0,75%,55%)',
            nostalgia: 'hsl(280,60%,55%)',
            belonging: 'hsl(145,65%,45%)',
            neutral: 'hsl(220,15%,55%)',
        };

        els.countryChain.innerHTML = state.countryChain.map((c, i) => {
            const color = emotionColors[c.emotion] || emotionColors.neutral;
            const arrow = i < state.countryChain.length - 1 ? '<span class="chain-arrow">→</span>' : '';
            return `<div class="chain-country" role="listitem"><span class="chain-dot" style="background:${color}"></span>${c.name}</div>${arrow}`;
        }).join('');

        els.countryChain.scrollLeft = els.countryChain.scrollWidth;
        if (els.countryCount) {
            els.countryCount.textContent = state.countryChain.length;
        }
    }

    // ─── Utilities ─────────────────────────
    async function api(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    function typewriter(element, text, speed = 30) {
        if (!element) return;
        element.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text[i];
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    function getLastLetter(str) {
        for (let i = str.length - 1; i >= 0; i--) {
            if (/[a-z]/i.test(str[i])) {
                return str[i].toLowerCase();
            }
        }
        return str[str.length - 1].toLowerCase();
    }

    function setLoading(loading) {
        state.isLoading = loading;
        if (els.btnSubmit) {
            els.btnSubmit.disabled = loading;
            els.btnSubmit.innerHTML = loading 
                ? '<div class="spinner"></div>' 
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>';
        }
    }

    function showHint(message, type = '') {
        if (els.inputHint) {
            els.inputHint.textContent = message;
            els.inputHint.className = `input-hint ${type}`;
        }
    }

    function clearHint() {
        if (els.inputHint) {
            els.inputHint.textContent = '';
            els.inputHint.className = 'input-hint';
        }
    }

    function shakeInput() {
        if (!els.countryInput) return;
        els.countryInput.classList.add('error');
        els.countryInput.style.animation = 'none';
        requestAnimationFrame(() => {
            els.countryInput.style.animation = 'shake 0.4s ease';
        });
        setTimeout(() => els.countryInput.classList.remove('error'), 2000);
    }

    function showToast(message, type = 'info') {
        if (!els.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ─── Boot ──────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
