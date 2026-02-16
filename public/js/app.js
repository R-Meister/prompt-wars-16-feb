/**
 * Atlas: Echoes of Earth — Main Application
 * Core game logic, UI interactions, Leaflet map, and state management.
 * @module app
 */

(() => {
    'use strict';

    // ─── State ─────────────────────────────
    /** @type {{ countryChain: Array, usedCountries: string[], previousCountry: string|null, currentScenario: Object|null, isLoading: boolean, map: Object|null, markers: Array }} */
    const state = {
        countryChain: [],
        usedCountries: [],
        previousCountry: null,
        currentScenario: null,
        isLoading: false,
        map: null,
        markers: [],
        activeMarker: null,
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

    /** @type {Object<string, {r:number, g:number, b:number}>} */
    const EMOTION_RGB = {
        warmth: { r: 245, g: 158, b: 11 },
        loneliness: { r: 59, g: 130, b: 246 },
        tension: { r: 239, g: 68, b: 68 },
        nostalgia: { r: 168, g: 85, b: 247 },
        belonging: { r: 34, g: 197, b: 94 },
        neutral: { r: 148, g: 163, b: 184 },
    };

    // ─── Initialize ────────────────────────
    /** Boot the application after DOM ready. */
    function init() {
        initMap();
        setupEventListeners();

        // Simulate loading then reveal app
        setTimeout(() => {
            els.loadingScreen.classList.add('fade-out');
            els.app.classList.remove('hidden');
            setTimeout(() => els.loadingScreen.remove(), 800);
            els.countryInput.focus();
        }, 2200);
    }

    // ─── Leaflet Map ───────────────────────
    /** Initialize Leaflet map with CartoDB Dark Matter tiles. */
    function initMap() {
        if (!els.leafletMap) return;

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
    }

    /**
     * Add a glowing marker for a country on the Leaflet map.
     * @param {Object} country - Country data with lat, lng, name
     * @param {string} emotion - Dominant emotion for color
     */
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

    /**
     * Show an animated pulse on the active country.
     * @param {number} lat
     * @param {number} lng
     * @param {string} countryName
     */
    function setActiveCountry(lat, lng, countryName) {
        if (!state.map) return;

        // Remove previous active marker
        if (state.activeMarker) {
            state.map.removeLayer(state.activeMarker);
        }

        // Create active marker with larger pulse
        const activeIcon = L.divIcon({
            className: 'custom-marker active',
            html: `
                <div class="marker-container active">
                    <div class="marker-pulse active"></div>
                    <div class="marker-core active"></div>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
        });

        state.activeMarker = L.marker([lat, lng], { icon: activeIcon, zIndexOffset: 1000 })
            .addTo(state.map);

        // Fly to location with smooth animation
        state.map.flyTo([lat, lng], 5, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    }

    /** Clear all map markers. */
    function clearMapMarkers() {
        if (state.activeMarker) {
            state.map.removeLayer(state.activeMarker);
            state.activeMarker = null;
        }
        state.markers.forEach(marker => state.map.removeLayer(marker));
        state.markers = [];
        
        // Reset map view
        state.map.flyTo([20, 0], 2, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    }

    // ─── Event Listeners ──────────────────
    /** Wire up all UI event handlers. */
    function setupEventListeners() {
        // Submit country
        els.btnSubmit.addEventListener('click', handleSubmit);
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

        // Continue
        els.btnContinue.addEventListener('click', handleContinue);

        // World Map
        els.btnWorldMap.addEventListener('click', openWorldMap);
        els.btnCloseModal.addEventListener('click', closeWorldMap);
        els.worldMapModal.addEventListener('click', (e) => {
            if (e.target === els.worldMapModal) closeWorldMap();
        });

        // New Game
        els.btnNewGame.addEventListener('click', resetGame);

        // Close autocomplete on outside click
        document.addEventListener('click', (e) => {
            if (!els.inputArea.contains(e.target)) hideAutocomplete();
        });

        // Keyboard escape for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !els.worldMapModal.classList.contains('hidden')) {
                closeWorldMap();
            }
        });
    }

    // ─── Submit Country ─────────────────────
    /**
     * Handle country submission: validate, generate scenario, update map.
     * @returns {Promise<void>}
     */
    async function handleSubmit() {
        const countryName = els.countryInput.value.trim();
        if (!countryName || state.isLoading) return;

        setLoading(true);
        hideAutocomplete();
        clearHint();

        try {
            // 1. Validate
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

            // 2. Show success briefly
            els.countryInput.classList.add('success');
            showHint(`✓ ${validation.country.name}`, 'success');

            // 3. Generate scenario
            const scenario = await api('/api/generate-scenario', {
                country: validation.country.name,
                capital: validation.country.capital,
                lat: validation.country.lat,
                lng: validation.country.lng,
                continent: validation.country.continent,
                region: validation.country.region,
            });

            // 4. Update state
            state.currentScenario = { ...scenario, countryData: validation.country };
            state.usedCountries.push(validation.country.name.toLowerCase());
            state.countryChain.push({
                name: validation.country.name,
                emotion: scenario.existingProfile?.dominantEmotion || 'neutral',
            });

            // 5. Update UI
            updateCountryChain();

            // 6. Mark on map
            setActiveCountry(validation.country.lat, validation.country.lng, validation.country.name);

            // 7. Show scenario
            showScenario(scenario);

        } catch (err) {
            showHint('Something went wrong. Please try again.', 'error');
            showToast('Connection error. Check your internet.', 'error');
        }

        setLoading(false);
    }

    // ─── Show Scenario ─────────────────────
    /**
     * Display the AI-generated scenario with dynamically generated choice buttons.
     * @param {Object} scenario
     */
    function showScenario(scenario) {
        els.inputArea.classList.add('hidden');
        els.echoResult.classList.add('hidden');
        els.scenarioArea.classList.remove('hidden');

        els.scenarioCountryName.textContent = scenario.country;
        els.scenarioCapital.textContent = scenario.capital;

        // Typewriter effect
        typewriter(els.scenarioText, scenario.scenario, 30);

        // Dynamically generate choice buttons based on number of choices
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

    // ─── Handle Choice ─────────────────────
    /**
     * Submit the player's choice and display the emotional echo.
     * @param {string} choiceId
     * @returns {Promise<void>}
     */
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
            // Submit choice to backend
            const result = await api('/api/submit-choice', {
                country: countryData.name,
                capital: countryData.capital,
                lat: countryData.lat,
                lng: countryData.lng,
                choiceId,
                emotions: choice.emotions,
            });

            state.previousCountry = countryData.name;

            // Add marker to map
            addMapMarker(countryData, result.profile?.dominantEmotion || 'neutral');

            // Update chain emotion
            const lastChain = state.countryChain[state.countryChain.length - 1];
            if (lastChain) lastChain.emotion = result.profile?.dominantEmotion || 'neutral';
            updateCountryChain();

            // Show echo
            showEcho(result.profile, choice.emotions, countryData.name);

        } catch (err) {
            showToast('Failed to save your echo. Try again.', 'error');
        }

        setLoading(false);
    }

    // ─── Show Echo Result ──────────────────
    /**
     * Render the emotional echo result with animated bars.
     * @param {Object} profile - Country emotion profile
     * @param {Object} choiceEmotions - Emotions from chosen option
     * @param {string} countryName
     */
    function showEcho(profile, choiceEmotions, countryName) {
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

        // Animate bars after render
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

        els.echoMessage.textContent = `${messages[dominant]} (${visitCount} ${visitCount === 1 ? 'visit' : 'visits'} total)`;
        els.countryCount.textContent = state.countryChain.length;
    }

    // ─── Continue Journey ──────────────────
    /** Reset UI for the next country entry. */
    function handleContinue() {
        els.echoResult.classList.add('hidden');
        els.inputArea.classList.remove('hidden');
        els.countryInput.value = '';
        els.countryInput.classList.remove('success', 'error');
        clearHint();

        // Show required letter hint
        if (state.previousCountry) {
            const lastLetter = getLastLetter(state.previousCountry);
            showHint(`Next country must start with "${lastLetter.toUpperCase()}"`, 'info');
        }

        els.countryInput.focus();
    }

    // ─── Autocomplete ──────────────────────
    let acIndex = -1;

    /**
     * Fetch autocomplete suggestions from the API.
     * @param {string} query
     */
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

    /**
     * Render autocomplete dropdown.
     * @param {Array} results
     */
    function showAutocomplete(results) {
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

    /** Hide autocomplete dropdown. */
    function hideAutocomplete() {
        els.autocompleteList.classList.remove('visible');
        acIndex = -1;
    }

    /**
     * Navigate autocomplete with arrow keys.
     * @param {number} dir - +1 or -1
     */
    function navigateAutocomplete(dir) {
        const items = els.autocompleteList.querySelectorAll('li');
        if (!items.length) return;

        items.forEach((li) => li.classList.remove('active'));
        acIndex = (acIndex + dir + items.length) % items.length;
        items[acIndex].classList.add('active');
        els.countryInput.value = items[acIndex].dataset.name;
    }

    // ─── World Map ─────────────────────────
    /** Open the world map modal and load country data as markers. */
    async function openWorldMap() {
        els.worldMapModal.classList.remove('hidden');

        const mapView = document.getElementById('world-map-view');

        try {
            const res = await fetch('/api/world-map');
            const data = await res.json();

            if (data.countries?.length) {
                // Build Leaflet map for modal
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

    /** Close the world map modal. */
    function closeWorldMap() {
        els.worldMapModal.classList.add('hidden');
    }

    // ─── Reset Game ────────────────────────
    /** Reset all game state and UI to the initial state. */
    function resetGame() {
        state.countryChain = [];
        state.usedCountries = [];
        state.previousCountry = null;
        state.currentScenario = null;

        els.scenarioArea.classList.add('hidden');
        els.echoResult.classList.add('hidden');
        els.inputArea.classList.remove('hidden');
        els.countryInput.value = '';
        els.countryInput.classList.remove('success', 'error');
        clearHint();

        els.countryChain.innerHTML = '<div class="chain-placeholder">Enter your first country to begin...</div>';
        els.countryCount.textContent = '0';

        clearMapMarkers();

        showToast('New journey started!', 'info');
        els.countryInput.focus();
    }

    // ─── Country Chain UI ─────────────────────
    /** Update the visual country chain with emotion colors. */
    function updateCountryChain() {
        if (!state.countryChain.length) return;

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

        // Scroll to end
        els.countryChain.scrollLeft = els.countryChain.scrollWidth;
        els.countryCount.textContent = state.countryChain.length;
    }

    // ─── Utilities ─────────────────────────
    /**
     * Make a POST API request.
     * @param {string} url - Endpoint URL
     * @param {Object} body - Request body
     * @returns {Promise<Object>}
     */
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

    /**
     * Typewriter effect for text display.
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to type
     * @param {number} [speed=30] - Milliseconds between characters
     */
    function typewriter(element, text, speed = 30) {
        element.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            element.textContent += text[i];
            i++;
            if (i >= text.length) clearInterval(timer);
        }, speed);
    }

    /**
     * Get the last alphabetic letter from a country name.
     * @param {string} str
     * @returns {string}
     */
    function getLastLetter(str) {
        for (let i = str.length - 1; i >= 0; i--) {
            if (/[a-z]/i.test(str[i])) {
                return str[i].toLowerCase();
            }
        }
        return str[str.length - 1].toLowerCase();
    }

    /**
     * Toggle loading state on submit button.
     * @param {boolean} loading
     */
    function setLoading(loading) {
        state.isLoading = loading;
        els.btnSubmit.disabled = loading;
        if (loading) {
            els.btnSubmit.innerHTML = '<div class="spinner"></div>';
        } else {
            els.btnSubmit.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>';
        }
    }

    /**
     * Display a hint below the input field.
     * @param {string} message
     * @param {'error'|'success'|'info'} [type='']
     */
    function showHint(message, type = '') {
        els.inputHint.textContent = message;
        els.inputHint.className = `input-hint ${type}`;
    }

    /** Clear the input hint. */
    function clearHint() {
        els.inputHint.textContent = '';
        els.inputHint.className = 'input-hint';
    }

    /** Shake input on validation error. */
    function shakeInput() {
        els.countryInput.classList.add('error');
        els.countryInput.style.animation = 'none';
        requestAnimationFrame(() => {
            els.countryInput.style.animation = 'shake 0.4s ease';
        });
        setTimeout(() => els.countryInput.classList.remove('error'), 2000);
    }

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'info'|'error'|'success'} [type='info']
     */
    function showToast(message, type = 'info') {
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
    document.addEventListener('DOMContentLoaded', init);
})();
