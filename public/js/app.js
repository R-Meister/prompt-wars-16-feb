/**
 * Atlas: Echoes of Earth — Main Application
 * Core game logic, UI interactions, SVG atlas, and state management.
 * @module app
 */

(() => {
    'use strict';

    // ─── State ─────────────────────────────
    /** @type {{ cityChain: Array, usedCities: string[], previousCity: string|null, currentScenario: Object|null, isLoading: boolean }} */
    const state = {
        cityChain: [],
        usedCities: [],
        previousCity: null,
        currentScenario: null,
        isLoading: false,
    };

    // ─── DOM Elements ──────────────────────
    const $ = (id) => document.getElementById(id);
    const els = {
        loadingScreen: $('loading-screen'),
        app: $('app'),
        cityInput: $('city-input'),
        btnSubmit: $('btn-submit'),
        inputHint: $('input-hint'),
        autocompleteList: $('autocomplete-list'),
        scenarioArea: $('scenario-area'),
        scenarioCityName: $('scenario-city-name'),
        scenarioCountry: $('scenario-country'),
        scenarioText: $('scenario-text'),
        choiceA: $('choice-a'),
        choiceB: $('choice-b'),
        choiceAText: $('choice-a-text'),
        choiceBText: $('choice-b-text'),
        echoResult: $('echo-result'),
        emotionBars: $('emotion-bars'),
        echoMessage: $('echo-message'),
        btnContinue: $('btn-continue'),
        cityChain: $('city-chain'),
        cityCount: $('city-count'),
        inputArea: $('input-area'),
        btnWorldMap: $('btn-world-map'),
        btnNewGame: $('btn-new-game'),
        worldMapModal: $('world-map-modal'),
        btnCloseModal: $('btn-close-modal'),
        toastContainer: $('toast-container'),
        svgAtlas: $('svg-atlas'),
        atlasMarkers: $('atlas-markers'),
        atlasActive: $('atlas-active'),
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

    // ─── SVG Atlas Helpers ─────────────────
    /**
     * Convert lat/lng to SVG viewBox coordinates (equirectangular projection).
     * @param {number} lat - Latitude (-90 to 90)
     * @param {number} lng - Longitude (-180 to 180)
     * @returns {{ x: number, y: number }}
     */
    function latLngToSvg(lat, lng) {
        const x = ((lng + 180) / 360) * 1000;
        const y = ((90 - lat) / 180) * 500;
        return { x, y };
    }

    /**
     * Add a glowing marker for a city on the SVG atlas.
     * @param {Object} city - City data with lat, lng, name
     * @param {string} emotion - Dominant emotion for color
     */
    function addAtlasMarker(city, emotion) {
        if (!els.atlasMarkers) return;
        const { x, y } = latLngToSvg(city.lat, city.lng);
        const color = EMOTION_RGB[emotion] || EMOTION_RGB.neutral;
        const rgb = `rgb(${color.r},${color.g},${color.b})`;
        const rgbA = `rgba(${color.r},${color.g},${color.b},0.3)`;

        // Glow circle
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', x);
        glow.setAttribute('cy', y);
        glow.setAttribute('r', '12');
        glow.setAttribute('fill', rgbA);
        glow.classList.add('marker-glow');

        // Core dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', '4');
        dot.setAttribute('fill', rgb);
        dot.classList.add('marker-dot');

        // Label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y - 16);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', 'rgba(241,245,249,0.7)');
        label.setAttribute('font-size', '9');
        label.setAttribute('font-family', 'Inter, sans-serif');
        label.textContent = city.name;

        els.atlasMarkers.appendChild(glow);
        els.atlasMarkers.appendChild(dot);
        els.atlasMarkers.appendChild(label);
    }

    /**
     * Show an animated pulse on the active city.
     * @param {number} lat
     * @param {number} lng
     */
    function setActiveCity(lat, lng) {
        if (!els.atlasActive) return;
        const { x, y } = latLngToSvg(lat, lng);
        els.atlasActive.innerHTML = `
            <circle cx="${x}" cy="${y}" r="6" fill="none" stroke="var(--accent)" stroke-width="2" class="pulse-ring"/>
            <circle cx="${x}" cy="${y}" r="6" fill="none" stroke="var(--accent)" stroke-width="2" class="pulse-ring" style="animation-delay:.5s"/>
        `;
    }

    /** Clear all atlas markers. */
    function clearAtlasMarkers() {
        if (els.atlasMarkers) els.atlasMarkers.innerHTML = '';
        if (els.atlasActive) els.atlasActive.innerHTML = '';
    }

    // ─── Initialize ────────────────────────
    /** Boot the application after DOM ready. */
    function init() {
        setupEventListeners();

        // Simulate loading then reveal app
        setTimeout(() => {
            els.loadingScreen.classList.add('fade-out');
            els.app.classList.remove('hidden');
            setTimeout(() => els.loadingScreen.remove(), 800);
            els.cityInput.focus();
        }, 2200);
    }

    // ─── Event Listeners ──────────────────
    /** Wire up all UI event handlers. */
    function setupEventListeners() {
        // Submit city
        els.btnSubmit.addEventListener('click', handleSubmit);
        els.cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') hideAutocomplete();
            if (e.key === 'ArrowDown') navigateAutocomplete(1);
            if (e.key === 'ArrowUp') navigateAutocomplete(-1);
        });

        // Autocomplete with debounce
        let debounceTimer;
        els.cityInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchAutocomplete(els.cityInput.value), 200);
        });

        // Choices
        els.choiceA.addEventListener('click', () => handleChoice('A'));
        els.choiceB.addEventListener('click', () => handleChoice('B'));

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

    // ─── Submit City ───────────────────────
    /**
     * Handle city submission: validate, generate scenario, update atlas.
     * @returns {Promise<void>}
     */
    async function handleSubmit() {
        const cityName = els.cityInput.value.trim();
        if (!cityName || state.isLoading) return;

        setLoading(true);
        hideAutocomplete();
        clearHint();

        try {
            // 1. Validate
            const validation = await api('/api/validate-city', {
                city: cityName,
                previousCity: state.previousCity,
                usedCities: state.usedCities,
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
            els.cityInput.classList.add('success');
            showHint(`✓ ${validation.city.name}, ${validation.city.country}`, 'success');

            // 3. Generate scenario
            const scenario = await api('/api/generate-scenario', {
                city: validation.city.name,
                country: validation.city.country,
                lat: validation.city.lat,
                lng: validation.city.lng,
            });

            // 4. Update state
            state.currentScenario = { ...scenario, cityData: validation.city };
            state.usedCities.push(validation.city.name.toLowerCase());
            state.cityChain.push({
                name: validation.city.name,
                emotion: scenario.existingProfile?.dominantEmotion || 'neutral',
            });

            // 5. Update UI
            updateCityChain();

            // 6. Mark on SVG atlas
            setActiveCity(validation.city.lat, validation.city.lng);

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
     * Display the AI-generated scenario with choice buttons.
     * @param {Object} scenario
     */
    function showScenario(scenario) {
        els.inputArea.classList.add('hidden');
        els.echoResult.classList.add('hidden');
        els.scenarioArea.classList.remove('hidden');

        els.scenarioCityName.textContent = scenario.city;
        els.scenarioCountry.textContent = scenario.country;

        // Typewriter effect
        typewriter(els.scenarioText, scenario.scenario, 30);

        els.choiceAText.textContent = scenario.choices[0].text;
        els.choiceBText.textContent = scenario.choices[1].text;

        // Reset choice buttons
        els.choiceA.classList.remove('selected');
        els.choiceB.classList.remove('selected');
        els.choiceA.disabled = false;
        els.choiceB.disabled = false;
    }

    // ─── Handle Choice ─────────────────────
    /**
     * Submit the player's choice and display the emotional echo.
     * @param {'A'|'B'} choiceId
     * @returns {Promise<void>}
     */
    async function handleChoice(choiceId) {
        if (state.isLoading || !state.currentScenario) return;

        const idx = choiceId === 'A' ? 0 : 1;
        const choice = state.currentScenario.choices[idx];
        const cityData = state.currentScenario.cityData;

        // Visual feedback
        const btn = choiceId === 'A' ? els.choiceA : els.choiceB;
        const other = choiceId === 'A' ? els.choiceB : els.choiceA;
        btn.classList.add('selected');
        other.disabled = true;
        btn.disabled = true;

        setLoading(true);

        try {
            // Submit choice to backend
            const result = await api('/api/submit-choice', {
                city: cityData.name,
                country: cityData.country,
                lat: cityData.lat,
                lng: cityData.lng,
                choiceId,
                emotions: choice.emotions,
            });

            state.previousCity = cityData.name;

            // Add marker to SVG atlas
            addAtlasMarker(cityData, result.profile?.dominantEmotion || 'neutral');

            // Update chain emotion
            const lastChain = state.cityChain[state.cityChain.length - 1];
            if (lastChain) lastChain.emotion = result.profile?.dominantEmotion || 'neutral';
            updateCityChain();

            // Show echo
            showEcho(result.profile, choice.emotions, cityData.name);

        } catch (err) {
            showToast('Failed to save your echo. Try again.', 'error');
        }

        setLoading(false);
    }

    // ─── Show Echo Result ──────────────────
    /**
     * Render the emotional echo result with animated bars.
     * @param {Object} profile - City emotion profile
     * @param {Object} choiceEmotions - Emotions from chosen option
     * @param {string} cityName
     */
    function showEcho(profile, choiceEmotions, cityName) {
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
            warmth: `${cityName} glows a little warmer now.`,
            loneliness: `A quiet echo lingers over ${cityName}.`,
            tension: `The air in ${cityName} tightens slightly.`,
            nostalgia: `${cityName} remembers something from long ago.`,
            belonging: `${cityName} feels a little more like home.`,
            neutral: `You've left your mark on ${cityName}.`,
        };

        els.echoMessage.textContent = `${messages[dominant]} (${visitCount} ${visitCount === 1 ? 'visit' : 'visits'} total)`;
        els.cityCount.textContent = state.cityChain.length;
    }

    // ─── Continue Journey ──────────────────
    /** Reset UI for the next city entry. */
    function handleContinue() {
        els.echoResult.classList.add('hidden');
        els.inputArea.classList.remove('hidden');
        els.cityInput.value = '';
        els.cityInput.classList.remove('success', 'error');
        clearHint();

        // Show required letter hint
        if (state.previousCity) {
            const lastLetter = getLastLetter(state.previousCity);
            showHint(`Next city must start with "${lastLetter.toUpperCase()}"`, 'info');
        }

        els.cityInput.focus();
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
            const res = await fetch(`/api/search-cities?q=${encodeURIComponent(query)}`);
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
            `<li role="option" data-index="${i}" data-name="${c.name}">${c.name} <span class="ac-country">${c.country}</span></li>`
        ).join('');

        els.autocompleteList.classList.add('visible');

        els.autocompleteList.querySelectorAll('li').forEach((li) => {
            li.addEventListener('click', () => {
                els.cityInput.value = li.dataset.name;
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
        els.cityInput.value = items[acIndex].dataset.name;
    }

    // ─── World Map ─────────────────────────
    /** Open the world map modal and load city data as SVG markers. */
    async function openWorldMap() {
        els.worldMapModal.classList.remove('hidden');

        const mapView = document.getElementById('world-map-view');

        try {
            const res = await fetch('/api/world-map');
            const data = await res.json();

            if (data.cities?.length) {
                // Build SVG for modal
                let svgContent = `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;background:#0c1425;">
                    <g stroke="rgba(100,116,139,0.08)" stroke-width="0.5">
                        <line x1="0" y1="250" x2="1000" y2="250"/>
                        <line x1="500" y1="0" x2="500" y2="500"/>
                    </g>`;

                data.cities.forEach((city) => {
                    const { x, y } = latLngToSvg(city.lat, city.lng);
                    const emotion = city.dominantEmotion || 'neutral';
                    const color = EMOTION_RGB[emotion] || EMOTION_RGB.neutral;
                    const rgb = `rgb(${color.r},${color.g},${color.b})`;
                    const rgbA = `rgba(${color.r},${color.g},${color.b},0.25)`;
                    const scale = Math.min(4 + city.visitCount * 0.5, 14);

                    svgContent += `<circle cx="${x}" cy="${y}" r="${scale + 6}" fill="${rgbA}"/>`;
                    svgContent += `<circle cx="${x}" cy="${y}" r="${scale}" fill="${rgb}" opacity="0.7"/>`;
                    svgContent += `<text x="${x}" y="${y - scale - 4}" text-anchor="middle" fill="rgba(241,245,249,0.6)" font-size="8" font-family="Inter,sans-serif">${city.name}</text>`;
                });

                svgContent += '</svg>';
                mapView.innerHTML = svgContent;
            } else {
                mapView.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;">No cities explored yet</div>';
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
        state.cityChain = [];
        state.usedCities = [];
        state.previousCity = null;
        state.currentScenario = null;

        els.scenarioArea.classList.add('hidden');
        els.echoResult.classList.add('hidden');
        els.inputArea.classList.remove('hidden');
        els.cityInput.value = '';
        els.cityInput.classList.remove('success', 'error');
        clearHint();

        els.cityChain.innerHTML = '<div class="chain-placeholder">Enter your first city to begin...</div>';
        els.cityCount.textContent = '0';

        clearAtlasMarkers();

        showToast('New journey started!', 'info');
        els.cityInput.focus();
    }

    // ─── City Chain UI ─────────────────────
    /** Update the visual city chain with emotion colors. */
    function updateCityChain() {
        if (!state.cityChain.length) return;

        const emotionColors = {
            warmth: 'hsl(35,90%,55%)',
            loneliness: 'hsl(220,70%,55%)',
            tension: 'hsl(0,75%,55%)',
            nostalgia: 'hsl(280,60%,55%)',
            belonging: 'hsl(145,65%,45%)',
            neutral: 'hsl(220,15%,55%)',
        };

        els.cityChain.innerHTML = state.cityChain.map((c, i) => {
            const color = emotionColors[c.emotion] || emotionColors.neutral;
            const arrow = i < state.cityChain.length - 1 ? '<span class="chain-arrow">→</span>' : '';
            return `<div class="chain-city" role="listitem"><span class="chain-dot" style="background:${color}"></span>${c.name}</div>${arrow}`;
        }).join('');

        // Scroll to end
        els.cityChain.scrollLeft = els.cityChain.scrollWidth;
        els.cityCount.textContent = state.cityChain.length;
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
     * Get the last alphabetic letter from a city name.
     * @param {string} str
     * @returns {string}
     */
    function getLastLetter(str) {
        for (let i = str.length - 1; i >= 0; i--) {
            if (/[a-z]/i.test(str[i])) return str[i].toLowerCase();
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
        els.cityInput.classList.add('error');
        els.cityInput.style.animation = 'none';
        requestAnimationFrame(() => {
            els.cityInput.style.animation = 'shake 0.4s ease';
        });
        setTimeout(() => els.cityInput.classList.remove('error'), 2000);
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
