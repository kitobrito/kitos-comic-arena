document.addEventListener('DOMContentLoaded', async () => {
    const usernamesMatch = (left, right) =>
        typeof left === 'string' &&
        typeof right === 'string' &&
        left.trim().toLowerCase() === right.trim().toLowerCase();

    const pagePath = window.location.pathname.toLowerCase();
    const pageName = pagePath.split('/').pop() || 'index.html';
    const isSelectionPage = pageName === 'selection.html' || pageName === 'selection';
    const isIngamePage = pageName === 'ingame.html' || pageName === 'ingame';
    const UI_SETTINGS_STORAGE_KEY = 'comicUiSettings';
    const defaultUiSettings = {
        targetFade: true,
        skillCastAnimations: true,
        queuedTargetMarkers: true,
        lowHpPulse: true,
        battleIntro: true,
        customCursor: true,
        clickSounds: true,
        shiftStatusReveal: true,
    };
    const readUiSettings = () => {
        try {
            const raw = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
            if (!raw) return { ...defaultUiSettings };
            const parsed = JSON.parse(raw);
            return Object.keys(defaultUiSettings).reduce((next, key) => {
                next[key] =
                    typeof parsed?.[key] === 'boolean'
                        ? parsed[key]
                        : defaultUiSettings[key];
                return next;
            }, {});
        } catch (error) {
            return { ...defaultUiSettings };
        }
    };
    let uiSettings = readUiSettings();
    const persistUiSettings = () => {
        try {
            localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings));
        } catch (error) {
            // Ignore storage failures.
        }
    };
    const setupSelectionFullscreenToggle = () => {
        const fullscreenToggleButton = document.querySelector('.selection-fullscreen-toggle');
        if (!fullscreenToggleButton) return;

        const getFullscreenElement = () =>
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement ||
            null;

        const syncFullscreenButton = () => {
            const active = Boolean(getFullscreenElement());
            fullscreenToggleButton.classList.toggle('active', active);
            fullscreenToggleButton.setAttribute('aria-pressed', active ? 'true' : 'false');
            fullscreenToggleButton.textContent = active ? 'Exit Full' : 'Full';
        };

        const requestSelectionFullscreen = async () => {
            const target = document.querySelector('.background') || document.documentElement;
            const request =
                target.requestFullscreen ||
                target.webkitRequestFullscreen ||
                target.msRequestFullscreen;
            if (!request) return;
            await request.call(target);
        };

        const exitSelectionFullscreen = async () => {
            const exit =
                document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.msExitFullscreen;
            if (!exit) return;
            await exit.call(document);
        };

        fullscreenToggleButton.addEventListener('click', async () => {
            try {
                if (getFullscreenElement()) {
                    await exitSelectionFullscreen();
                } else {
                    await requestSelectionFullscreen();
                }
            } catch (error) {
                console.warn('Unable to toggle fullscreen.', error);
            } finally {
                syncFullscreenButton();
            }
        });
        document.addEventListener('fullscreenchange', syncFullscreenButton);
        document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
        document.addEventListener('MSFullscreenChange', syncFullscreenButton);
        syncFullscreenButton();
    };
    const applyUiSettings = () => {
        document.body.classList.toggle('ui-disable-target-fade', !uiSettings.targetFade);
        document.body.classList.toggle('ui-disable-skill-cast-animations', !uiSettings.skillCastAnimations);
        document.body.classList.toggle('ui-disable-queued-target-markers', !uiSettings.queuedTargetMarkers);
        document.body.classList.toggle('ui-disable-low-hp-pulse', !uiSettings.lowHpPulse);
        document.body.classList.toggle('ui-disable-custom-cursor', !uiSettings.customCursor);
        if (isIngamePage || isSelectionPage) {
            document.body.classList.toggle('custom-game-cursor', Boolean(uiSettings.customCursor));
        }
        document.querySelectorAll('[data-ui-setting]').forEach((input) => {
            const key = input.getAttribute('data-ui-setting');
            if (!Object.prototype.hasOwnProperty.call(uiSettings, key)) return;
            input.checked = Boolean(uiSettings[key]);
        });
    };
    const setupUiOptionsPanels = () => {
        const toggles = Array.from(document.querySelectorAll('.ui-options-toggle'));
        const panels = Array.from(document.querySelectorAll('.ui-options-panel'));
        if (!toggles.length && !panels.length) return;
        const setOpen = (panel, toggle, open) => {
            if (!panel) return;
            panel.hidden = !open;
            panel.classList.toggle('open', open);
            if (toggle) {
                toggle.classList.toggle('active', open);
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
        };
        toggles.forEach((toggle) => {
            const panelId = toggle.getAttribute('aria-controls');
            const panel = panelId ? document.getElementById(panelId) : null;
            toggle.addEventListener('click', () => {
                const willOpen = !panel || panel.hidden;
                panels.forEach((entry) => {
                    const owner = toggles.find((candidate) => candidate.getAttribute('aria-controls') === entry.id);
                    setOpen(entry, owner, false);
                });
                setOpen(panel, toggle, willOpen);
            });
        });
        document.querySelectorAll('[data-ui-setting]').forEach((input) => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-ui-setting');
                if (!Object.prototype.hasOwnProperty.call(uiSettings, key)) return;
                uiSettings = {
                    ...uiSettings,
                    [key]: Boolean(input.checked),
                };
                persistUiSettings();
                applyUiSettings();
            });
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.ui-options-panel, .ui-options-toggle')) return;
            panels.forEach((entry) => {
                const owner = toggles.find((candidate) => candidate.getAttribute('aria-controls') === entry.id);
                setOpen(entry, owner, false);
            });
        });
        applyUiSettings();
    };
    applyUiSettings();
    setupSelectionFullscreenToggle();

    const shouldUseCustomCursor = (isIngamePage || isSelectionPage) && uiSettings.customCursor;
    const shouldUseGameClickSound = isIngamePage || isSelectionPage;
    if (shouldUseCustomCursor) {
        document.body.classList.add('custom-game-cursor');
        const setPressedCursor = () => document.body.classList.add('cursor-clicking');
        const clearPressedCursor = () => document.body.classList.remove('cursor-clicking');
        document.addEventListener('mousedown', setPressedCursor);
        document.addEventListener('mouseup', clearPressedCursor);
        document.addEventListener('mouseleave', clearPressedCursor);
        window.addEventListener('blur', clearPressedCursor);
    }
    const SOUND_SETTINGS_STORAGE_KEY = 'comicSoundSettings';
    const soundVolumeInput =
        document.querySelector('.sound-volume') || document.querySelector('.ingame-sound-volume');
    
    const soundManager = (() => {
        const defaultSettings = {
            volume: 0.7,
            musicMuted: false,
            effectsMuted: false,
            skillEffectsMuted: false,
        };
        const clampVolume = (value) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return defaultSettings.volume;
            return Math.min(1, Math.max(0, numeric));
        };
        const readSettings = () => {
            try {
                const raw = localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
                if (!raw) return { ...defaultSettings };
                const parsed = JSON.parse(raw);
                return {
                    volume: clampVolume(parsed?.volume),
                    musicMuted: Boolean(parsed?.musicMuted),
                    effectsMuted: Boolean(parsed?.effectsMuted),
                    skillEffectsMuted: Boolean(parsed?.skillEffectsMuted),
                };
            } catch (error) {
                return { ...defaultSettings };
            }
        };
        let settings = readSettings();
        let currentMusic = null;
        let musicTracks = [];
        let currentTrackIndex = -1;
        let synthContext = null;
        let noiseBuffer = null;
        const ambientIntervals = new Map();

        const getSynthContext = () => {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor || settings.effectsMuted || settings.volume <= 0) return null;
            synthContext = synthContext || new AudioContextCtor();
            if (synthContext.state === 'suspended') {
                synthContext.resume().catch(() => {});
            }
            return synthContext;
        };

        const getNoiseBuffer = (context) => {
            if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
            const length = Math.max(1, Math.floor(context.sampleRate * 2));
            const buffer = context.createBuffer(1, length, context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let index = 0; index < length; index += 1) {
                data[index] = Math.random() * 2 - 1;
            }
            noiseBuffer = buffer;
            return buffer;
        };

        const makeGain = (context, now, amount = 0.18, attack = 0.01, releaseAt = 0.18) => {
            const gain = context.createGain();
            const level = clampVolume(settings.volume) * amount;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), now + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseAt);
            gain.connect(context.destination);
            return gain;
        };

        const playTone = ({ frequency = 440, endFrequency = null, duration = 0.25, type = 'sine', amount = 0.14, delay = 0 }) => {
            const context = getSynthContext();
            if (!context) return;
            const now = context.currentTime + delay;
            const oscillator = context.createOscillator();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            if (endFrequency) {
                oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
            }
            oscillator.connect(makeGain(context, now, amount, 0.012, duration));
            oscillator.start(now);
            oscillator.stop(now + duration + 0.04);
        };

        const playNoise = ({ duration = 0.3, amount = 0.12, delay = 0, filterType = 'bandpass', frequency = 900, q = 1.2 }) => {
            const context = getSynthContext();
            if (!context) return;
            const now = context.currentTime + delay;
            const source = context.createBufferSource();
            const filter = context.createBiquadFilter();
            source.buffer = getNoiseBuffer(context);
            filter.type = filterType;
            filter.frequency.setValueAtTime(frequency, now);
            filter.Q.setValueAtTime(q, now);
            source.connect(filter);
            filter.connect(makeGain(context, now, amount, 0.008, duration));
            source.start(now);
            source.stop(now + duration + 0.05);
        };

        const playGeneratedEffect = (name) => {
            if (!name || settings.effectsMuted || settings.volume <= 0) return;
            try {
                switch (name) {
                    case 'rain':
                        playNoise({ duration: 0.8, amount: 0.045, filterType: 'highpass', frequency: 1200, q: 0.7 });
                        break;
                    case 'hail':
                        playNoise({ duration: 0.16, amount: 0.09, filterType: 'bandpass', frequency: 2400, q: 3.2 });
                        playTone({ frequency: 980, endFrequency: 560, duration: 0.09, type: 'triangle', amount: 0.045, delay: 0.04 });
                        break;
                    case 'lightning':
                        playNoise({ duration: 0.12, amount: 0.28, filterType: 'highpass', frequency: 3200, q: 0.8 });
                        playTone({ frequency: 80, endFrequency: 42, duration: 0.75, type: 'sawtooth', amount: 0.09, delay: 0.1 });
                        playNoise({ duration: 0.7, amount: 0.12, delay: 0.1, filterType: 'lowpass', frequency: 360, q: 0.8 });
                        break;
                    case 'laser-red':
                        playTone({ frequency: 190, endFrequency: 520, duration: 0.42, type: 'sawtooth', amount: 0.095 });
                        playTone({ frequency: 760, endFrequency: 1120, duration: 0.34, type: 'square', amount: 0.045 });
                        playNoise({ duration: 0.32, amount: 0.06, filterType: 'bandpass', frequency: 1800, q: 4 });
                        break;
                    case 'laser-yellow':
                        playTone({ frequency: 240, endFrequency: 780, duration: 0.42, type: 'sawtooth', amount: 0.09 });
                        playTone({ frequency: 1040, endFrequency: 1460, duration: 0.3, type: 'square', amount: 0.045 });
                        playNoise({ duration: 0.3, amount: 0.055, filterType: 'bandpass', frequency: 2400, q: 4.4 });
                        break;
                    case 'laser-empowered':
                        playTone({ frequency: 120, endFrequency: 620, duration: 0.62, type: 'sawtooth', amount: 0.13 });
                        playTone({ frequency: 880, endFrequency: 1700, duration: 0.46, type: 'square', amount: 0.07 });
                        playNoise({ duration: 0.5, amount: 0.09, filterType: 'bandpass', frequency: 2100, q: 5 });
                        break;
                    case 'frost-breath':
                        playNoise({ duration: 0.72, amount: 0.13, filterType: 'highpass', frequency: 900, q: 0.8 });
                        playTone({ frequency: 620, endFrequency: 220, duration: 0.58, type: 'sine', amount: 0.055 });
                        playNoise({ duration: 0.18, amount: 0.06, delay: 0.28, filterType: 'highpass', frequency: 3600, q: 2.6 });
                        break;
                    case 'solar-flare':
                        playTone({ frequency: 96, endFrequency: 42, duration: 0.95, type: 'sawtooth', amount: 0.16 });
                        playTone({ frequency: 620, endFrequency: 1220, duration: 0.42, type: 'triangle', amount: 0.075 });
                        playNoise({ duration: 0.82, amount: 0.17, delay: 0.08, filterType: 'lowpass', frequency: 780, q: 0.9 });
                        break;
                    case 'wind':
                        playNoise({ duration: 0.85, amount: 0.13, filterType: 'bandpass', frequency: 520, q: 1.1 });
                        playTone({ frequency: 210, endFrequency: 410, duration: 0.55, type: 'sine', amount: 0.045 });
                        break;
                    case 'ice':
                        playTone({ frequency: 1300, endFrequency: 2200, duration: 0.12, type: 'triangle', amount: 0.09 });
                        playTone({ frequency: 740, endFrequency: 520, duration: 0.28, type: 'sine', amount: 0.06, delay: 0.08 });
                        playNoise({ duration: 0.18, amount: 0.055, delay: 0.03, filterType: 'highpass', frequency: 4200, q: 2.4 });
                        break;
                    case 'portal':
                        playTone({ frequency: 210, endFrequency: 760, duration: 0.18, type: 'sine', amount: 0.08 });
                        playTone({ frequency: 980, endFrequency: 280, duration: 0.34, type: 'triangle', amount: 0.07, delay: 0.08 });
                        playNoise({ duration: 0.28, amount: 0.045, delay: 0.04, filterType: 'bandpass', frequency: 720, q: 2.6 });
                        break;
                    case 'web':
                        playNoise({ duration: 0.16, amount: 0.12, filterType: 'highpass', frequency: 2500, q: 1.2 });
                        playTone({ frequency: 920, endFrequency: 150, duration: 0.16, type: 'triangle', amount: 0.08 });
                        break;
                    case 'target-lock':
                        playTone({ frequency: 880, duration: 0.08, type: 'square', amount: 0.06 });
                        playTone({ frequency: 1320, duration: 0.08, type: 'square', amount: 0.055, delay: 0.12 });
                        break;
                    case 'speed-steal-alarm':
                        playTone({ frequency: 980, duration: 0.09, type: 'square', amount: 0.075 });
                        playTone({ frequency: 980, duration: 0.09, type: 'square', amount: 0.075, delay: 0.22 });
                        playTone({ frequency: 1240, duration: 0.12, type: 'square', amount: 0.085, delay: 0.44 });
                        break;
                    case 'cloak':
                        playNoise({ duration: 0.42, amount: 0.055, filterType: 'bandpass', frequency: 1900, q: 4 });
                        playTone({ frequency: 560, endFrequency: 960, duration: 0.32, type: 'sine', amount: 0.045 });
                        break;
                    case 'ricochet':
                        playTone({ frequency: 1180, endFrequency: 430, duration: 0.2, type: 'triangle', amount: 0.09 });
                        playNoise({ duration: 0.1, amount: 0.075, filterType: 'highpass', frequency: 3600, q: 2 });
                        break;
                    case 'shield':
                        playNoise({ duration: 0.32, amount: 0.08, filterType: 'bandpass', frequency: 620, q: 0.9 });
                        playTone({ frequency: 360, endFrequency: 1150, duration: 0.32, type: 'triangle', amount: 0.055 });
                        playTone({ frequency: 740, endFrequency: 420, duration: 0.14, type: 'square', amount: 0.06, delay: 0.35 });
                        break;
                    case 'bomb-arm':
                        playTone({ frequency: 165, endFrequency: 92, duration: 0.2, type: 'sawtooth', amount: 0.07 });
                        playNoise({ duration: 0.28, amount: 0.055, delay: 0.05, filterType: 'highpass', frequency: 1800, q: 1.7 });
                        break;
                    case 'bomb':
                        playNoise({ duration: 0.5, amount: 0.2, filterType: 'lowpass', frequency: 520, q: 1.1 });
                        playTone({ frequency: 92, endFrequency: 38, duration: 0.55, type: 'sawtooth', amount: 0.13 });
                        break;
                    case 'tidal-wave':
                        playNoise({ duration: 1.25, amount: 0.2, filterType: 'lowpass', frequency: 420, q: 0.7 });
                        playNoise({ duration: 0.8, amount: 0.11, delay: 0.22, filterType: 'bandpass', frequency: 880, q: 1.1 });
                        playTone({ frequency: 72, endFrequency: 38, duration: 1.1, type: 'sawtooth', amount: 0.1 });
                        break;
                    case 'sniper-shot':
                        playNoise({ duration: 0.08, amount: 0.27, filterType: 'highpass', frequency: 2500, q: 1.3 });
                        playTone({ frequency: 115, endFrequency: 52, duration: 0.72, type: 'sawtooth', amount: 0.15, delay: 0.03 });
                        playNoise({ duration: 0.55, amount: 0.09, delay: 0.1, filterType: 'lowpass', frequency: 410, q: 0.8 });
                        break;
                    case 'quick-shot':
                        playNoise({ duration: 0.055, amount: 0.16, filterType: 'highpass', frequency: 3000, q: 1.4 });
                        playTone({ frequency: 190, endFrequency: 78, duration: 0.22, type: 'square', amount: 0.08 });
                        break;
                    case 'revolver':
                        playNoise({ duration: 0.06, amount: 0.13, filterType: 'bandpass', frequency: 1900, q: 1.7 });
                        playTone({ frequency: 155, endFrequency: 82, duration: 0.28, type: 'triangle', amount: 0.075 });
                        break;
                    case 'shotgun':
                        playNoise({ duration: 0.09, amount: 0.31, filterType: 'lowpass', frequency: 980, q: 1.1 });
                        playTone({ frequency: 92, endFrequency: 45, duration: 0.42, type: 'sawtooth', amount: 0.16 });
                        playNoise({ duration: 0.12, amount: 0.08, delay: 0.34, filterType: 'highpass', frequency: 2600, q: 2.8 });
                        playTone({ frequency: 520, endFrequency: 250, duration: 0.1, type: 'square', amount: 0.055, delay: 0.38 });
                        playNoise({ duration: 0.08, amount: 0.06, delay: 0.52, filterType: 'bandpass', frequency: 1500, q: 3.4 });
                        break;
                    case 'death':
                        playNoise({ duration: 0.22, amount: 0.2, filterType: 'bandpass', frequency: 1200, q: 1.5 });
                        playTone({ frequency: 260, endFrequency: 44, duration: 0.85, type: 'sawtooth', amount: 0.14, delay: 0.05 });
                        playNoise({ duration: 0.75, amount: 0.11, delay: 0.26, filterType: 'lowpass', frequency: 440, q: 0.9 });
                        break;
                    case 'damage':
                        playNoise({ duration: 0.12, amount: 0.11, filterType: 'bandpass', frequency: 700, q: 1.4 });
                        playTone({ frequency: 180, endFrequency: 90, duration: 0.13, type: 'triangle', amount: 0.055 });
                        break;
                    case 'heal':
                        playTone({ frequency: 520, endFrequency: 940, duration: 0.22, type: 'sine', amount: 0.06 });
                        playTone({ frequency: 780, endFrequency: 1240, duration: 0.24, type: 'sine', amount: 0.045, delay: 0.09 });
                        break;
                    case 'shield-hit':
                        playTone({ frequency: 240, endFrequency: 520, duration: 0.16, type: 'square', amount: 0.07 });
                        playNoise({ duration: 0.16, amount: 0.07, filterType: 'bandpass', frequency: 1200, q: 2.2 });
                        break;
                    case 'evade':
                        playTone({ frequency: 620, endFrequency: 180, duration: 0.16, type: 'triangle', amount: 0.11 });
                        break;
                    case 'status-harmful':
                        playTone({ frequency: 360, endFrequency: 140, duration: 0.22, type: 'sawtooth', amount: 0.055 });
                        break;
                    case 'status-helpful':
                        playTone({ frequency: 420, endFrequency: 760, duration: 0.22, type: 'sine', amount: 0.055 });
                        break;
                    default:
                        playTone({ frequency: 460, duration: 0.12, type: 'triangle', amount: 0.04 });
                        break;
                }
            } catch (error) {
                // Generated effects are decorative; visuals should continue if audio is blocked.
            }
        };

        const startAmbient = (name) => {
            if (!name || ambientIntervals.has(name)) return;
            const intervalMs = name === 'rain' ? 950 : 620;
            const run = () => playGeneratedEffect(name);
            ambientIntervals.set(name, window.setInterval(run, intervalMs));
            run();
        };

        const stopAmbient = (name) => {
            const interval = ambientIntervals.get(name);
            if (!interval) return;
            window.clearInterval(interval);
            ambientIntervals.delete(name);
        };

        const syncAmbientEffects = (activeNames = []) => {
            if (settings.effectsMuted || settings.volume <= 0) {
                Array.from(ambientIntervals.keys()).forEach(stopAmbient);
                return;
            }
            const activeSet = new Set(activeNames.filter(Boolean));
            Array.from(ambientIntervals.keys()).forEach((name) => {
                if (!activeSet.has(name)) stopAmbient(name);
            });
            activeSet.forEach(startAmbient);
        };

        const syncUi = () => {
            if (soundVolumeInput) {
                soundVolumeInput.value = String(Math.round(settings.volume * 100));
            }
            const allMuteButtons = document.querySelectorAll('.music-mute-button, .mute-button, .ingame-mute-button');
            allMuteButtons.forEach(btn => {
                if (settings.musicMuted) {
                    btn.classList.add('muted');
                    btn.setAttribute('aria-label', 'Unmute music');
                } else {
                    btn.classList.remove('muted');
                    btn.setAttribute('aria-label', 'Mute music');
                }
            });
            const allEffectsMuteButtons = document.querySelectorAll('.effects-mute-button, .ingame-effects-mute-button');
            allEffectsMuteButtons.forEach(btn => {
                if (settings.effectsMuted) {
                    btn.classList.add('muted');
                    btn.setAttribute('aria-label', 'Unmute game sounds');
                } else {
                    btn.classList.remove('muted');
                    btn.setAttribute('aria-label', 'Mute game sounds');
                }
            });
            const allSkillEffectsButtons = document.querySelectorAll('.skill-effects-toggle, .ingame-skill-effects-toggle');
            allSkillEffectsButtons.forEach(btn => {
                if (settings.skillEffectsMuted) {
                    btn.classList.add('muted');
                    btn.setAttribute('aria-label', 'Turn on skill effects');
                    btn.setAttribute('title', 'Turn on skill effects');
                } else {
                    btn.classList.remove('muted');
                    btn.setAttribute('aria-label', 'Turn off skill effects');
                    btn.setAttribute('title', 'Turn off skill effects');
                }
            });
            document.body.classList.toggle('skill-effects-muted', Boolean(settings.skillEffectsMuted));
        };
        const persist = () => {
            try {
                localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            } catch (error) {
                // Ignore storage failures.
            }
        };

        const updateMusicVolume = () => {
            if (currentMusic) {
                currentMusic.volume = settings.musicMuted ? 0 : settings.volume;
            }
        };

        const playNextTrack = () => {
            if (musicTracks.length === 0) return;
            
            if (musicTracks.length === 1) {
                currentTrackIndex = 0;
            } else {
                if (currentTrackIndex === -1) {
                    currentTrackIndex = Math.floor(Math.random() * musicTracks.length);
                } else {
                    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
                }
            }

            if (currentMusic) {
                currentMusic.pause();
                currentMusic.onended = null;
            }

            currentMusic = new Audio(musicTracks[currentTrackIndex]);
            currentMusic.volume = settings.musicMuted ? 0 : settings.volume;
            
            if (musicTracks.length === 1) {
                currentMusic.loop = true;
            } else {
                currentMusic.onended = playNextTrack;
            }

            const playback = currentMusic.play();
            if (playback && typeof playback.catch === 'function') {
                playback.catch(() => {
                    const resumeOnInteraction = () => {
                        currentMusic.play().catch(() => {});
                        document.removeEventListener('click', resumeOnInteraction);
                    };
                    document.addEventListener('click', resumeOnInteraction);
                });
            }
        };

        syncUi();
        
        const onVolumeInput = (event) => {
            settings = {
                ...settings,
                volume: clampVolume((event.target?.value || 0) / 100),
            };
            updateMusicVolume();
            persist();
            syncUi();
        };

        if (soundVolumeInput) {
            soundVolumeInput.addEventListener('input', onVolumeInput);
        }

        const onMusicMuteClick = () => {
            settings.musicMuted = !settings.musicMuted;
            updateMusicVolume();
            persist();
            syncUi();
        };

        const onEffectsMuteClick = () => {
            settings.effectsMuted = !settings.effectsMuted;
            if (settings.effectsMuted) {
                syncAmbientEffects([]);
            }
            persist();
            syncUi();
        }

        const onSkillEffectsToggleClick = () => {
            settings.skillEffectsMuted = !settings.skillEffectsMuted;
            persist();
            syncUi();
        };

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!target) return;
            if (
                target.classList.contains('music-mute-button') ||
                target.classList.contains('mute-button') ||
                target.classList.contains('ingame-mute-button')
            ) {
                onMusicMuteClick();
                return;
            }
            if (
                target.classList.contains('effects-mute-button') ||
                target.classList.contains('ingame-effects-mute-button')
            ) {
                onEffectsMuteClick();
                return;
            }
            if (
                target.classList.contains('skill-effects-toggle') ||
                target.classList.contains('ingame-skill-effects-toggle')
            ) {
                onSkillEffectsToggleClick();
            }
        });

        return {
            play(audio) {
                if (!audio || settings.volume <= 0 || settings.effectsMuted) return;
                try {
                    audio.volume = clampVolume(settings.volume);
                    audio.currentTime = 0;
                    const playback = audio.play();
                    if (playback && typeof playback.catch === 'function') {
                        playback.catch(() => {});
                    }
                } catch (error) {
                    // Ignore playback errors from the browser.
                }
            },
            startMusic(tracks) {
                musicTracks = Array.isArray(tracks) ? tracks : [tracks];
                currentTrackIndex = -1;
                playNextTrack();
            },
            stopMusic() {
                if (currentMusic) {
                    currentMusic.pause();
                    currentMusic = null;
                }
            },
            playGeneratedEffect,
            syncAmbientEffects,
            areSkillEffectsMuted() {
                return Boolean(settings.skillEffectsMuted);
            }
        };
    })();

    if (isSelectionPage) {
        soundManager.startMusic(['assets/audio/track1.mp3']);
    } else if (isIngamePage) {
        soundManager.startMusic(['assets/audio/track2.mp3', 'assets/audio/track3.mp3']);
    }
    if (shouldUseGameClickSound) {
        const clickSound = new Audio('assets/audio/sounds/click.mp3');
        document.addEventListener('click', (event) => {
            if (
                event.target instanceof Element &&
                event.target.closest('.sound-controller, .ingame-sound-controller, .ui-options-panel')
            ) {
                return;
            }
            if (!uiSettings.clickSounds) return;
            soundManager.play(clickSound);
        });
    }
    setupUiOptionsPanels();

    const API_BASE_URL =
        window.NARUTO_API_BASE_URL ||
        `${window.location.protocol}//${window.location.hostname}${
            window.location.port ? `:${window.location.port}` : ''
        }`;
    const loginForm = document.querySelector('.login-form');
    const loginButton = document.querySelector('.ok-button');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatus = document.querySelector('.login-status');

    const setLoginStatus = (message, variant = 'info') => {
        if (!loginStatus) return;
        loginStatus.textContent = message;
        loginStatus.dataset.variant = variant;
    };

    const submitLogin = async (event) => {
        event.preventDefault();
        if (!usernameInput || !passwordInput || !loginButton) return;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            setLoginStatus('Enter a username and password.', 'error');
            return;
        }

        loginButton.disabled = true;
        setLoginStatus('Signing in...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                const message = data?.error || 'Invalid username or password.';
                throw new Error(message);
            }

            setLoginStatus('Login successful. Redirecting...', 'success');
            localStorage.setItem('comicUser', JSON.stringify({
                username: data.user?.username,
                avatarUrl: data.user?.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: data.user?.profile?.clan?.abbreviation || '',
                ladder: data.user?.profile?.ladder || null,
                backgrounds: data.user?.profile?.backgrounds || {
                    selectionUrl: '',
                    ingameUrl: '',
                },
                missions: data.user?.profile?.missions || {
                    progress: {},
                    unlockedCharacterIds: [],
                },
                matchmaking: data.user?.profile?.matchmaking || {
                    battleBotEnabled: true,
                },
            }));
            window.location.href = 'selection.html';
        } catch (error) {
            console.error('Login failed:', error);
            setLoginStatus(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            loginButton.disabled = false;
        }
    };

    if (loginForm && loginButton) {
        loginButton.addEventListener('click', submitLogin);
        loginForm.addEventListener('submit', submitLogin);
    }

    const defaultProfileAvatar = 'https://i.postimg.cc/3JqVcPXm/default.png';

    const textFromHtml = (value = '') => {
        const text = typeof value === 'string' ? value : '';
        if (!text) return '';
        const scratch = document.createElement('div');
        scratch.innerHTML = text.replace(/<br\s*\/?>/gi, '\n');
        return scratch.textContent || scratch.innerText || '';
    };

    const getCharacterDescriptionText = (character) => {
        if (!character) return '';
        return (
            character.description ||
            character.characterdescription ||
            character.characterdeescription ||
            textFromHtml(character.descriptionHtml || '') ||
            ''
        );
    };

    const getSkillDescriptionText = (skill) => {
        if (!skill) return '';
        return (
            skill.description ||
            skill.skilldescription ||
            textFromHtml(skill.descriptionHtml || '') ||
            ''
        );
    };

    const slotList = document.querySelector('.slot-list');
    const rosterFilterTabs = Array.from(document.querySelectorAll('.roster-filter-tab'));
    const rosterFilterSelect = document.getElementById('roster-filter-select');
    const rosterFilterStatus = document.getElementById('roster-filter-status');
    const nameEl = document.getElementById('character-name');
    const roleEl = document.getElementById('character-role');
    const portraitEl = document.getElementById('character-portrait');
    const skillNameEl = document.getElementById('skill-name');
    const skillDescEl = document.getElementById('skill-description');
    const energyBarEl = document.getElementById('energy-bar');
    const classesEl = document.getElementById('skill-classes');
    const cooldownEl = document.getElementById('skill-cooldown');
    const cooldownWrapper = cooldownEl ? cooldownEl.parentElement : null;
    const skillViewer = document.querySelector('.skillviewer');
    const skillScroll = document.querySelector('.skillscroll');
    const skillImagesContainer = document.querySelector('.skill-images');
    let skillImages = Array.from(document.querySelectorAll('.skill-image'));
    const selectedSlots = Array.from(document.querySelectorAll('.selected-character-slot'));
    const nextPageButton = document.querySelector('.nextpage');
    const lastPageButton = document.querySelector('.lastpage');
    const rosterSlotElements = [];
    const selectedAssignments = selectedSlots.map(() => null);
    const teamStorageKey = 'comicSelectedTeam';
    const defaultLadderRankHat = 'assets/images/hats/academy.png';
    let profileCache = null;
    let missionLockedCharacterIds = new Set();
    let selectionClickTimer = null;
    let activeSelectionPointerDrag = null;
    let suppressSelectionClickUntil = 0;

    document.addEventListener(
        'click',
        (event) => {
            if (Date.now() <= suppressSelectionClickUntil) {
                event.preventDefault();
                event.stopPropagation();
            }
        },
        true
    );

    const normalizeLadderPresentation = (ladder = null) => {
        const source = ladder && typeof ladder === 'object' ? ladder : {};
        return {
            rank:
                typeof source.rank === 'string' && source.rank.trim()
                    ? source.rank.trim()
                    : 'Academy Student',
            level: Number.isFinite(Number(source.level)) ? Math.max(1, Number(source.level)) : 1,
            experiencePoints: Number.isFinite(Number(source.experiencePoints))
                ? Math.max(0, Number(source.experiencePoints))
                : 0,
            ladderRank: Number.isFinite(Number(source.ladderRank))
                ? Math.max(1, Number(source.ladderRank))
                : null,
            wins: Number.isFinite(Number(source.wins)) ? Math.max(0, Number(source.wins)) : 0,
            losses: Number.isFinite(Number(source.losses)) ? Math.max(0, Number(source.losses)) : 0,
            streak: Number.isFinite(Number(source.streak)) ? Number(source.streak) : 0,
            rankHatUrl:
                typeof source.rankHatUrl === 'string' && source.rankHatUrl.trim()
                    ? source.rankHatUrl.trim()
                    : defaultLadderRankHat,
        };
    };

    const normalizeMatchmakingPresentation = (matchmaking = null) => {
        const source = matchmaking && typeof matchmaking === 'object' ? matchmaking : {};
        return {
            battleBotEnabled:
                typeof source.battleBotEnabled === 'boolean' ? source.battleBotEnabled : true,
        };
    };

    const isGameBotUsername = (username) =>
        typeof username === 'string' && username.trim().toLowerCase().indexOf('__game_bot__:') === 0;

    const formatSignedNumber = (value) => {
        const amount = Number(value) || 0;
        return `${amount >= 0 ? '+' : ''}${amount}`;
    };

    const getVisibleSkillClasses = (classes = []) =>
        (Array.isArray(classes) ? classes : []).filter((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            return !!normalized;
        });

    const shouldUseWideRankHatOffset = (rankHatUrl = '') => {
        const normalized = typeof rankHatUrl === 'string' ? rankHatUrl.trim().toLowerCase() : '';
        return (
            normalized.endsWith('/anbu.png') ||
            normalized.endsWith('assets/images/hats/anbu.png') ||
            normalized.endsWith('/jinch.png') ||
            normalized.endsWith('assets/images/hats/jinch.png') ||
            normalized.endsWith('/kage.png') ||
            normalized.endsWith('assets/images/hats/kage.png') ||
            normalized.endsWith('/hokage.png') ||
            normalized.endsWith('assets/images/hats/hokage.png')
        );
    };

    const applyRankHatPresentation = (elements, ladder) => {
        const hatUrl = ladder?.rankHatUrl || defaultLadderRankHat;
        const useWideOffset = shouldUseWideRankHatOffset(hatUrl);
        elements.forEach((element) => {
            if (!element) return;
            element.src = hatUrl;
            element.alt = `${ladder?.rank || 'Academy Student'} rank hat`;
            element.classList.toggle('rank-hat-offset-left', useWideOffset);
        });
    };

    const readCachedUser = () => {
        const cachedUser = localStorage.getItem('comicUser');
        if (!cachedUser) return null;
        try {
            return JSON.parse(cachedUser);
        } catch (error) {
            console.warn('Unable to load stored user profile.', error);
            return null;
        }
    };

    const writeCachedUser = (user) => {
        if (!user?.username) return;
        localStorage.setItem(
            'comicUser',
            JSON.stringify({
                username: user.username,
                role: typeof user.role === 'string' ? user.role : 'player',
                avatarUrl: user.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: user.profile?.clan?.abbreviation || '',
                ladder: normalizeLadderPresentation(user.profile?.ladder),
                missions: user.profile?.missions || {
                    progress: {},
                    unlockedCharacterIds: [],
                },
                matchmaking: normalizeMatchmakingPresentation(user.profile?.matchmaking),
            })
        );
    };

    const isCurrentUserAdmin = () => {
        const profileRole =
            typeof profileCache?.role === 'string' ? profileCache.role.trim().toLowerCase() : '';
        if (profileRole === 'admin') {
            return true;
        }
        const cachedUser = readCachedUser();
        return typeof cachedUser?.role === 'string' && cachedUser.role.trim().toLowerCase() === 'admin';
    };

    const getUnlockedCharacterIdSet = () => {
        const unlockedIds = new Set();
        const cachedMissions = profileCache?.profile?.missions;
        const cachedStorageUser = readCachedUser();
        const sourceIds = Array.isArray(cachedMissions?.unlockedCharacterIds)
            ? cachedMissions.unlockedCharacterIds
            : Array.isArray(cachedStorageUser?.missions?.unlockedCharacterIds)
                ? cachedStorageUser.missions.unlockedCharacterIds
                : [];
        sourceIds.forEach((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            if (normalized) {
                unlockedIds.add(normalized);
            }
        });
        return unlockedIds;
    };

    const loadMissionLockedCharacterIds = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/missions`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Unable to load missions.');
            }
            const data = await response.json();
            const lockedIds = new Set();
            (Array.isArray(data?.missions) ? data.missions : []).forEach((mission) => {
                const rewardCharacterId =
                    typeof mission?.reward_character === 'string'
                        ? mission.reward_character.trim().toLowerCase()
                        : '';
                if (rewardCharacterId) {
                    lockedIds.add(rewardCharacterId);
                }
            });
            missionLockedCharacterIds = lockedIds;
        } catch (error) {
            console.warn('Failed to load mission lock data.', error);
            missionLockedCharacterIds = new Set();
        }
    };

    const loadCharacterPlayRates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/characters/play-rates`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Unable to load play rates.');
            }
            const data = await response.json();
            const nextRates = new Map();
            (Array.isArray(data?.playRates) ? data.playRates : []).forEach((entry) => {
                const characterId =
                    typeof entry?.characterId === 'string' ? entry.characterId.trim().toLowerCase() : '';
                if (!characterId) return;
                nextRates.set(characterId, {
                    pickCount: Math.max(0, Number(entry?.pickCount) || 0),
                    playRatePercent: Math.max(0, Number(entry?.playRatePercent) || 0),
                });
            });
            characterPlayRates = nextRates;
        } catch (error) {
            console.warn('Failed to load character play rates.', error);
            characterPlayRates = new Map();
        }
    };

    const isCharacterLocked = (character) => {
        if (isCurrentUserAdmin()) {
            return false;
        }
        const characterId = typeof character?.characterId === 'string'
            ? character.characterId.trim().toLowerCase()
            : '';
        if (!characterId) {
            return false;
        }
        if (!missionLockedCharacterIds.has(characterId)) {
            return false;
        }
        return !getUnlockedCharacterIdSet().has(characterId);
    };

    const applyPlayerIdentity = (options = {}) => {
        const name = options.name || null;
        const avatarUrl = options.avatarUrl || defaultProfileAvatar;
        const clanAbbreviation = options.clanAbbreviation || 'None';
        const ladder = normalizeLadderPresentation(options.ladder);
        const nameElements = Array.from(
            document.querySelectorAll('.player-nameselection, .player-left .player-name')
        );
        const avatarElements = Array.from(
            document.querySelectorAll('.player-avatar, .player-avatar-left')
        );
        const statElements = Array.from(document.querySelectorAll('.player-infoselection .player-stat'));
        const playerStatusEl = document.querySelector('.player-left .player-status');
        const playerHatEls = Array.from(document.querySelectorAll('.player-characters .rank-hat'));
        nameElements.forEach((element) => {
            if (element && name) {
                element.textContent = name;
            }
        });
        avatarElements.forEach((element) => {
            if (element) {
                element.src = avatarUrl;
            }
        });
        statElements.forEach((element) => {
            if (!element) {
                return;
            }
            const currentText =
                typeof element.textContent === 'string' ? element.textContent.trim().toUpperCase() : '';
            if (currentText.startsWith('ALLIANCE:')) {
                element.textContent = `Alliance: ${clanAbbreviation}`;
                return;
            }
            if (currentText.startsWith('LEVEL:')) {
                element.textContent = `LEVEL: ${ladder.level} (${ladder.experiencePoints.toLocaleString()} XP)`;
                return;
            }
            if (currentText.startsWith('LADDERRANK:')) {
                element.textContent = `LADDERRANK: ${ladder.ladderRank ? `#${ladder.ladderRank}` : 'Unranked'}`;
                return;
            }
            if (currentText.startsWith('RATIO:')) {
                element.textContent = `RATIO: ${ladder.wins} - ${ladder.losses} ( ${formatSignedNumber(ladder.streak)} )`;
                return;
            }
            element.textContent = ladder.rank;
        });
        if (playerStatusEl) {
            playerStatusEl.textContent = ladder.rank;
        }
        applyRankHatPresentation(playerHatEls, ladder);
    };

    const applyOpponentIdentity = (options = {}) => {
        const avatarUrl = options.avatarUrl || defaultProfileAvatar;
        const name = options.name || null;
        const ladder = normalizeLadderPresentation(options.ladder);
        const opponentAvatar = document.querySelector('.player-avatar-right');
        const opponentNameEl = document.querySelector('.player-right .player-name');
        const opponentStatusEl = document.querySelector('.player-right .player-status');
        const opponentHatEls = Array.from(document.querySelectorAll('.enemy-characters .rank-hat'));
        if (opponentAvatar) {
            opponentAvatar.src = avatarUrl;
        }
        if (opponentNameEl && name) {
            opponentNameEl.textContent = name;
        }
        if (opponentStatusEl) {
            opponentStatusEl.textContent = ladder.rank;
        }
        applyRankHatPresentation(opponentHatEls, ladder);
    };

    const applyCustomBackgrounds = (user) => {
        const selectionBackground = document.querySelector('.background');
        const ingameBackground = document.querySelector('.backgroundingame');
        const selectionUrl = user?.profile?.backgrounds?.selectionUrl || '';
        const ingameUrl = user?.profile?.backgrounds?.ingameUrl || '';
        if (selectionBackground) {
            selectionBackground.style.backgroundImage = selectionUrl
                ? `url("${selectionUrl}")`
                : '';
        }
        if (ingameBackground) {
            ingameBackground.style.backgroundImage = ingameUrl
                ? `url("${ingameUrl}")`
                : '';
        }
    };

    const getCurrentActivityPageLabel = () => {
        const pageMap = {
            'index.html': 'Comic Arena > Home',
            'profile.html': 'Comic Arena > Profile',
            'clanprofile.html': 'Comic Arena > Clan Profile',
            'selection.html': 'Comic Arena > Selection',
            'ingame.html': 'Comic Arena > In Game',
        };
        return pageMap[pageName] || `Comic Arena > ${pageName.replace(/\.html$/i, '').replace(/[-_]+/g, ' ')}`;
    };

    const reportCurrentActivity = async () => {
        if (!profileCache?.username) return;
        const currentPage = getCurrentActivityPageLabel();
        try {
            await fetch(`${API_BASE_URL}/api/activity`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPage,
                }),
            });
            if (!profileCache.profile) {
                profileCache.profile = {};
            }
            if (!profileCache.profile.activity) {
                profileCache.profile.activity = {};
            }
            profileCache.profile.activity.currentPage = currentPage;
            profileCache.profile.activity.lastOnlineAt = new Date().toISOString();
        } catch (error) {
            return;
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/me`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            if (data?.user?.username) {
                profileCache = data.user;
                writeCachedUser(data.user);
                reportCurrentActivity();
                return data.user;
            }
        } catch (error) {
            return null;
        }
        return null;
    };

    const getBattleBotPreference = () => {
        const cachedUser = readCachedUser();
        return normalizeMatchmakingPresentation(
            profileCache?.profile?.matchmaking || cachedUser?.matchmaking
        ).battleBotEnabled;
    };

    const hydratePlayerIdentity = async () => {
        const cachedUser = readCachedUser();
        if (cachedUser?.username) {
            applyPlayerIdentity({
                name: cachedUser.username,
                avatarUrl: cachedUser.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: cachedUser.clanAbbreviation || 'None',
                ladder: cachedUser.ladder,
            });
        } else {
            applyPlayerIdentity({
                avatarUrl: defaultProfileAvatar,
                clanAbbreviation: 'None',
                ladder: null,
            });
        }

        const apiUser = await fetchProfile();
        if (apiUser?.username) {
            applyPlayerIdentity({
                name: apiUser.username,
                avatarUrl: apiUser.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: apiUser.profile?.clan?.abbreviation || 'None',
                ladder: apiUser.profile?.ladder || null,
            });
            applyCustomBackgrounds(apiUser);
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reportCurrentActivity();
        }
    });

    window.addEventListener('focus', () => {
        reportCurrentActivity();
    });

    const fetchPublicProfile = async (username) => {
        if (!username) return null;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${encodeURIComponent(username)}/profile`,
                {
                    credentials: 'include',
                }
            );
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data?.user?.username ? data.user : null;
        } catch (error) {
            return null;
        }
    };

    const hydrateOpponentIdentity = async (username) => {
        if (!username) {
            applyOpponentIdentity({
                avatarUrl: defaultProfileAvatar,
                ladder: null,
            });
            return;
        }
        if (isGameBotUsername(username)) {
            applyOpponentIdentity({
                name: 'Game Bot',
                avatarUrl: defaultProfileAvatar,
                ladder: null,
            });
            return;
        }
        const user = await fetchPublicProfile(username);
        applyOpponentIdentity({
            name: user?.username || username,
            avatarUrl: user?.profile?.avatarUrl || defaultProfileAvatar,
            ladder: user?.profile?.ladder || null,
        });
    };

    const pageSearchParams = new URLSearchParams(window.location.search);
    const matchIdFromUrl = pageSearchParams.get('matchId');
    const selectionMissionIdFromUrl = pageSearchParams.get('missionId');

    if (!slotList) {
        const rosterData = typeof characters !== 'undefined' ? characters : window.characters;
        let matchSocket = null;
        let matchSocketReconnectTimer = null;
        let matchSocketReconnectDelay = 1000;
        let matchSocketManuallyClosed = false;
        let pendingSocketMatchState = null;
        let pendingSocketMatchStateFrame = null;
        let currentPlayerUsername = null;
        let currentTurnUsername = null;
        let currentOpponentUsername = null;
        let currentOpponentDisplayName = null;
        let currentMatchMode = 'quick';
        const matchChatEl = document.querySelector('.match-chat');
        const matchChatToggle = document.querySelector('.match-chat-toggle');
        const matchChatUnreadEl = document.querySelector('.match-chat-unread');
        const matchChatMessagesEl = document.querySelector('.match-chat-messages');
        const matchChatForm = document.querySelector('.match-chat-form');
        const matchChatInput = document.querySelector('.match-chat-input');
        const matchChatStatusEl = document.querySelector('.match-chat-status');
        const matchChatMuteButton = document.querySelector('.match-chat-mute');
        const matchChatEmojiButtons = Array.from(document.querySelectorAll('.match-chat-emoji'));
        const ingameMissionsEl = document.querySelector('.ingame-missions');
        const ingameMissionsToggle = document.querySelector('.ingame-missions-toggle');
        const ingameMissionsListEl = document.querySelector('.ingame-missions-list');
        const ingameMissionsStatusEl = document.querySelector('.ingame-missions-status');
        let matchChatUnreadCount = 0;
        let matchChatOpponentMuted = localStorage.getItem('comicMatchChatOpponentMuted') === 'true';
        let currentPlayerTeam = [];
        let profileIngameBackgroundUrl = '';
        const startFirstSound = new Audio('assets/audio/sounds/start-first.mp3');
        const secondPlayerStartSound = new Audio('assets/audio/sounds/yahoe.mp3');
        const nextRoundSound = new Audio('assets/audio/sounds/next-round.mp3');
        const startRoundSound = new Audio('assets/audio/sounds/start-round.mp3');
        const lostSound = new Audio('assets/audio/sounds/lost.mp3');
        const winSound = new Audio('assets/audio/sounds/win.mp3');
        const applySkillSound = new Audio('assets/audio/sounds/apply-skill.mp3');
        const deathSound = new Audio('assets/audio/sounds/death-sound.mp3');
        const neganAlreadyFuckedSound = new Audio('assets/audio/takingitlikeachamp.mp3');
        const neganYouGotNoGutsSound = new Audio('assets/audio/youdidhaveguts.wav');
        const neganDeathSound = new Audio('assets/audio/youbetterbejoking.wav');
        const predatorCloakSound = new Audio('assets/audio/predatorcloak.mp3');
        const xenoSound = new Audio('assets/audio/xeno.mp3');
        let hasPlayedMatchEntrySound = false;
        let hasInitializedTurnState = false;
        const playerSkillImages = Array.from(
            document.querySelectorAll('.player-characters .skillscrollingame .skillimage')
        );
        const playerSkillScrolls = Array.from(
            document.querySelectorAll('.player-characters .skillscrollingame')
        );
        let playerCards = [];
        let enemyCards = [];
        let activeTargetOptions = null;
        const chakraDisplay = document.querySelector('.chakra-display');
        const exchangeLabel = document.querySelector('.exchange-label');
        const exchangeModalEl = document.querySelector('.exchange_chakra');
        const exchangeChoiceButtons = Array.from(
            exchangeModalEl?.querySelectorAll('.exchange_chakra_choice') || []
        );
        const exchangeOkButton = exchangeModalEl?.querySelector('.ok-buttonexchange');
        const exchangeCancelButton = exchangeModalEl?.querySelector('.cancel-buttonexchange');
        const exchangeChooseCountEl = exchangeModalEl?.querySelector('.chakrachoosered');
        const readyTextEl = document.querySelector('.ready-text');
        const readySectionEl = document.querySelector('.ready-section');
        const battleIntroOverlayEl = document.querySelector('.battle-intro-overlay');
        const battleIntroTopTeamEl = document.querySelector('.battle-intro-team-top');
        const battleIntroBottomTeamEl = document.querySelector('.battle-intro-team-bottom');
        const battleIntroTopNameEl = document.querySelector('.battle-intro-name-top');
        const battleIntroBottomNameEl = document.querySelector('.battle-intro-name-bottom');
        const battleIntroTopAvatarEl = document.querySelector('.battle-intro-avatar-top');
        const battleIntroBottomAvatarEl = document.querySelector('.battle-intro-avatar-bottom');
        const battleIntroTopRecordEl = document.querySelector('.battle-intro-record-top');
        const battleIntroBottomRecordEl = document.querySelector('.battle-intro-record-bottom');
        const battleIntroTopStreakEl = document.querySelector('.battle-intro-streak-top');
        const battleIntroBottomStreakEl = document.querySelector('.battle-intro-streak-bottom');
        const BATTLE_INTRO_DURATION_MS = 3000;
        let hasPlayedBattleIntro = false;
        const endTurnModalEl = document.querySelector('.ChakraChooseEndTurn');
        const skillOrderEl = endTurnModalEl?.querySelector('.skillorder');
        const endTurnOkButton = document.querySelector('.ok-buttonendturn');
        const endTurnCancelButton = document.querySelector('.cancel-buttonendturn');
        const surrenderConfirmEl = document.querySelector('.surrender-confirm');
        const surrenderConfirmOkButton = document.querySelector('.surrender-confirm-ok');
        const surrenderConfirmCancelButton = document.querySelector('.surrender-confirm-cancel');
        const battleEndOverlayEl = document.querySelector('.battle-end-overlay');
        const battleEndPortraitEl = battleEndOverlayEl?.querySelector('.battle-end-portrait');
        const battleEndTitleEl = battleEndOverlayEl?.querySelector('.battle-end-title');
        const battleEndMessageEl = battleEndOverlayEl?.querySelector('.battle-end-message');
        const battleEndContinueButton = battleEndOverlayEl?.querySelector('.battle-end-continue');
        const classChoicePopupEl = document.querySelector('.class-choice-popup');
        const classChoicePopupTitleEl = classChoicePopupEl?.querySelector('.class-choice-popup-title');
        const classChoicePopupOptionsEl = classChoicePopupEl?.querySelector('.class-choice-popup-options');
        const classChoicePopupCancelButton = classChoicePopupEl?.querySelector('.class-choice-popup-cancel');
        const fullscreenToggleButton = document.querySelector('.ingame-fullscreen-toggle');
        const statusRevealToggleButton = document.querySelector('.ingame-status-reveal-toggle');
        const endTurnChooseCountEl = endTurnModalEl?.querySelector('.chakrachoosered');
        const timerBar = document.querySelector('.timer-bar');
        const timerCountdown = document.querySelector('.timer-countdown');
        const TURN_DURATION_MS = 60_000;
        const TIMER_MAX_WIDTH = 191;
        const EXCHANGE_CHAKRA_COST = 4;
        const READY_TEXT_PLAYER = 'PRESS WHEN READY';
        const READY_TEXT_OPPONENT = "OPPONENT'S TURN...";
        let lastTurnOwner = null;
        let turnExpiresAtMs = null;
        let currentTurnDurationMs = TURN_DURATION_MS;
        let turnTimerInterval = null;
        let autoEndRequested = false;
        let isEndingTurn = false;
        let pendingTurnState = null;
        let playerPoolState = {
            taijutsu: 0,
            ninjutsu: 0,
            bloodline: 0,
            genjutsu: 0,
        };
        let randomChakraRequestQueue = Promise.resolve();
        let randomChakraMutationVersion = 0;
        let activeCastingSkill = null;
        const classChoiceBySkillKey = new Map();
        let pendingQueuePayload = null;
        let pendingTurnStartChoicePayload = null;
        const playerSkillMetaByKey = new Map();
        const visibleStatusIconKeysByUnit = new Map();
        const statusRenderSignatureByUnit = new Map();
        const statusTooltipHtmlCache = new Map();
        const cooldownValueBySkillKey = new Map();
        let activeTurnStartChoiceKey = '';
        let activeChoicePopupMode = '';
        let queuedSkillKeySet = new Set();
        const optimisticQueuedByActorSlot = new Map();
        const optimisticCancelledActorSlots = new Set();
        const inFlightSkillRequestByActorSlot = new Set();
        const targetOptionsCache = new Map();
        let draggingQueueActorSlot = null;
        let latestBoardState = null;
        let globalStatusTooltipEl = null;
        let statusRevealHeld = false;
        let statusRevealPinned = false;
        let battleEndShown = false;
        let lastSpeedStealPressureTurnKey = '';
        let selectedExchangeType = 'taijutsu';
        let isPlayingResolutionSequence = false;
        let deferredResolutionMatchState = null;
        let lastTargetHighlightSignature = '';
        const preloadedIngameImageUrls = new Set();
        const perfEntries = [];
        let ingamePerfDebug =
            new URLSearchParams(window.location.search).get('perf') === '1' ||
            localStorage.getItem('comicArenaPerfDebug') === 'true';
        const measureIngamePerf = (name, fn) => {
            if (!ingamePerfDebug || typeof performance === 'undefined') return fn();
            const startedAt = performance.now();
            const result = fn();
            const duration = performance.now() - startedAt;
            const entry = { name, duration, at: Date.now() };
            perfEntries.push(entry);
            if (perfEntries.length > 200) perfEntries.shift();
            if (duration >= 8) {
                console.debug(`[comic-arena perf] ${name}: ${duration.toFixed(1)}ms`);
            }
            return result;
        };
        window.comicArenaPerf = {
            enable() {
                ingamePerfDebug = true;
                localStorage.setItem('comicArenaPerfDebug', 'true');
            },
            disable() {
                ingamePerfDebug = false;
                localStorage.removeItem('comicArenaPerfDebug');
            },
            clear() {
                perfEntries.length = 0;
            },
            summary() {
                return perfEntries.reduce((acc, entry) => {
                    const bucket = acc[entry.name] || { count: 0, total: 0, max: 0 };
                    bucket.count += 1;
                    bucket.total += entry.duration;
                    bucket.max = Math.max(bucket.max, entry.duration);
                    acc[entry.name] = bucket;
                    return acc;
                }, {});
            },
            entries: perfEntries,
        };
        const playIngameSound = (audio) => {
            soundManager.play(audio);
        };
        const playGeneratedIngameSound = (name) => {
            soundManager.playGeneratedEffect(name);
        };

        const getFullscreenElement = () =>
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement ||
            null;

        const syncFullscreenButton = () => {
            if (!fullscreenToggleButton) return;
            const active = Boolean(getFullscreenElement());
            fullscreenToggleButton.classList.toggle('active', active);
            fullscreenToggleButton.setAttribute('aria-pressed', active ? 'true' : 'false');
            fullscreenToggleButton.textContent = active ? 'Exit Full' : 'Full';
        };

        const requestGameFullscreen = async () => {
            const target = document.querySelector('.backgroundingame') || document.documentElement;
            const request =
                target.requestFullscreen ||
                target.webkitRequestFullscreen ||
                target.msRequestFullscreen;
            if (!request) return;
            await request.call(target);
        };

        const exitGameFullscreen = async () => {
            const exit =
                document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.msExitFullscreen;
            if (!exit) return;
            await exit.call(document);
        };

        if (fullscreenToggleButton) {
            fullscreenToggleButton.addEventListener('click', async () => {
                try {
                    if (getFullscreenElement()) {
                        await exitGameFullscreen();
                    } else {
                        await requestGameFullscreen();
                    }
                } catch (error) {
                    console.warn('Unable to toggle fullscreen.', error);
                } finally {
                    syncFullscreenButton();
                }
            });
            document.addEventListener('fullscreenchange', syncFullscreenButton);
            document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
            document.addEventListener('MSFullscreenChange', syncFullscreenButton);
            syncFullscreenButton();
        }
        const chakraCountEls = chakraDisplay
            ? {
                  taijutsu: chakraDisplay.querySelector('[data-chakra="taijutsu"] .chakra-count'),
                  ninjutsu: chakraDisplay.querySelector('[data-chakra="ninjutsu"] .chakra-count'),
                  bloodline: chakraDisplay.querySelector('[data-chakra="bloodline"] .chakra-count'),
                  genjutsu: chakraDisplay.querySelector('[data-chakra="genjutsu"] .chakra-count'),
                  total: chakraDisplay.querySelector('[data-chakra-total] .chakra-count'),
              }
            : {};
        const chakraLabelToTypeMap = {
            taijutsu: 'taijutsu',
            green: 'taijutsu',
            bloodline: 'bloodline',
            red: 'bloodline',
            ninjutsu: 'ninjutsu',
            blue: 'ninjutsu',
            genjutsu: 'genjutsu',
            white: 'genjutsu',
        };
        const resolveChakraType = (value) => {
            const normalized =
                typeof value === 'string' ? value.trim().toLowerCase() : '';
            return chakraLabelToTypeMap[normalized] || null;
        };
        const getRowChakraType = (row) => {
            if (!(row instanceof Element)) return null;
            return (
                resolveChakraType(row.getAttribute('data-chakra-type')) ||
                resolveChakraType(row.querySelector('.chakra-name')?.textContent)
            );
        };
        const buildAmountElementMap = (columnSelector) => {
            if (!endTurnModalEl) return {};
            const rows = Array.from(endTurnModalEl.querySelectorAll(`${columnSelector} .chakra-row`));
            const result = {};
            rows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (name && amountEl) {
                    result[name] = amountEl;
                }
            });
            return result;
        };
        const endTurnLeftAmountEls = buildAmountElementMap('.chakra-column');
        const endTurnRightAmountEls = buildAmountElementMap('.chakra-columnright');
        const endTurnLeftRowEls = (() => {
            if (!endTurnModalEl) return {};
            const rows = Array.from(endTurnModalEl.querySelectorAll('.chakra-column .chakra-row'));
            const result = {};
            rows.forEach((row) => {
                const name = getRowChakraType(row);
                if (name) {
                    result[name] = row;
                }
            });
            return result;
        })();
        const skillInfo = {
            imgEl: document.querySelector('.skillviewimage'),
            nameEl: document.querySelector('.ingameskillname'),
            roleEl: document.querySelector('.ingamecharacterrole'),
            energyEl: document.querySelector('.energytext'),
            classesEl: document.querySelector('.ingameclasses'),
            cooldownEl: document.querySelector('.ingamecooldown'),
            classPickerWrapEl: document.querySelector('.ingameclasspicker'),
            classPickerEl: document.querySelector('.ingame-class-picker-field'),
            descEl: document.querySelector('.ingameskilldescription'),
            browserIconsEl: document.querySelector('.skill-browser-icons'),
        };
        const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];
        const emptyPool = () => ({
            taijutsu: 0,
            ninjutsu: 0,
            bloodline: 0,
            genjutsu: 0,
        });
        let exchangeSpendAssignments = emptyPool();
        const normalizePool = (pool = {}) => ({
            taijutsu: Number(pool.taijutsu) || 0,
            ninjutsu: Number(pool.ninjutsu) || 0,
            bloodline: Number(pool.bloodline) || 0,
            genjutsu: Number(pool.genjutsu) || 0,
        });
        const totalPool = (pool = {}) =>
            chakraTypes.reduce((sum, type) => sum + (Number(pool[type]) || 0), 0);
        const normalizePendingTurn = (pending = null) => ({
            queuedByActorSlot:
                pending && typeof pending.queuedByActorSlot === 'object' ? pending.queuedByActorSlot : {},
            queueOrder: Array.isArray(pending?.queueOrder)
                ? pending.queueOrder
                      .map((slot) => Number.parseInt(slot, 10))
                      .filter((slot) => Number.isInteger(slot) && slot >= 0)
                : [],
            unresolvedRandom: Number.isInteger(pending?.unresolvedRandom) ? pending.unresolvedRandom : 0,
            randomAssignments: {
                ...emptyPool(),
                ...(pending && typeof pending.randomAssignments === 'object'
                    ? pending.randomAssignments
                    : {}),
            },
            turnStartChoice:
                pending && pending.turnStartChoice && typeof pending.turnStartChoice === 'object'
                    ? {
                          actorSlot: Number.isInteger(pending.turnStartChoice.actorSlot)
                              ? pending.turnStartChoice.actorSlot
                              : null,
                          sourceSkillId:
                              typeof pending.turnStartChoice.sourceSkillId === 'string'
                                  ? pending.turnStartChoice.sourceSkillId
                                  : null,
                          sourceUsername:
                              typeof pending.turnStartChoice.sourceUsername === 'string'
                                  ? pending.turnStartChoice.sourceUsername
                                  : null,
                          sourceSlot: Number.isInteger(pending.turnStartChoice.sourceSlot)
                              ? pending.turnStartChoice.sourceSlot
                              : null,
                          sourceStatusId:
                              typeof pending.turnStartChoice.sourceStatusId === 'string'
                                  ? pending.turnStartChoice.sourceStatusId
                                  : null,
                          promptText:
                              typeof pending.turnStartChoice.promptText === 'string'
                                  ? pending.turnStartChoice.promptText
                                  : '',
                          options: Array.isArray(pending.turnStartChoice.options)
                              ? pending.turnStartChoice.options
                                    .map((option) => {
                                        if (!option || typeof option !== 'object') return null;
                                        const key =
                                            typeof option.key === 'string'
                                                ? option.key.trim().toLowerCase()
                                                : '';
                                        const label =
                                            typeof option.label === 'string' ? option.label.trim() : '';
                                        if (!key || !label) return null;
                                        return {
                                            key,
                                            label,
                                            targetStrategy:
                                                typeof option.targetStrategy === 'string'
                                                    ? option.targetStrategy.trim().toLowerCase()
                                                    : '',
                                            effect:
                                                option.effect && typeof option.effect === 'object'
                                                    ? { ...option.effect }
                                                    : null,
                                        };
                                    })
                                    .filter(Boolean)
                              : [],
                          maxUses: Number.isInteger(pending.turnStartChoice.maxUses)
                              ? pending.turnStartChoice.maxUses
                              : 0,
                          usesUsed: Number.isInteger(pending.turnStartChoice.usesUsed)
                              ? pending.turnStartChoice.usesUsed
                              : 0,
                      }
                    : null,
        });
        const normalizeClassChoice = (value) =>
            typeof value === 'string' ? value.trim().toLowerCase() : '';
        const formatClassChoiceLabel = (value) => {
            const normalized = normalizeClassChoice(value);
            if (!normalized) return '';
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        };
        const getClassChoiceOptions = (skill) =>
            Array.isArray(skill?.classChoiceOptions)
                ? skill.classChoiceOptions
                      .map((entry) => normalizeClassChoice(entry))
                      .filter(Boolean)
                : [];
        const getClassChoiceKey = (actorSlot, skillIdx) => {
            if (!Number.isInteger(actorSlot) || actorSlot < 0) return '';
            if (!Number.isInteger(skillIdx) || skillIdx < 0) return '';
            return `${actorSlot}:${skillIdx}`;
        };
        const getCurrentClassChoiceForCastingSkill = () => {
            if (!activeCastingSkill) return null;
            const options = Array.isArray(activeCastingSkill.classChoiceOptions)
                ? activeCastingSkill.classChoiceOptions
                : [];
            if (!options.length) return null;
            const pickerValue = normalizeClassChoice(skillInfo.classPickerEl?.value || '');
            if (pickerValue && options.includes(pickerValue)) {
                return pickerValue;
            }
            const key = getClassChoiceKey(activeCastingSkill.actorSlot, activeCastingSkill.skillIdx);
            const stored = normalizeClassChoice(classChoiceBySkillKey.get(key));
            if (stored && options.includes(stored)) {
                return stored;
            }
            return options[0];
        };

        const getActorUnitForSlot = (username, actorSlot) => {
            if (!username || !Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const units = latestBoardState?.[username];
            if (!Array.isArray(units)) return null;
            return units[actorSlot] || null;
        };

        const isUnitBanished = (unit) => {
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            return statuses.some((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                return remaining > 0 && Boolean(status?.metadata?.banished);
            });
        };

        const isUnitDeadLike = (unit) => {
            const hp = Number(unit?.hp);
            return unit?.alive === false || isUnitBanished(unit) || (Number.isFinite(hp) && hp <= 0);
        };

        await hydratePlayerIdentity();
        profileIngameBackgroundUrl = document.querySelector('.backgroundingame')?.style.backgroundImage || '';

        const getSkillReplacementMapFromUnit = (unit) => {
            const map = {};
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            statuses.forEach((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return;
                const byRemaining = status?.metadata?.skillReplacementsByRemainingTurns;
                const replacementsFromRemaining =
                    byRemaining && typeof byRemaining === 'object'
                        ? byRemaining[String(remaining)] || byRemaining[remaining]
                        : null;
                const replacements =
                    replacementsFromRemaining && typeof replacementsFromRemaining === 'object'
                        ? replacementsFromRemaining
                        : status?.metadata?.skillReplacements;
                if (!replacements || typeof replacements !== 'object') return;
                const requiredSourceSkillId =
                    typeof status?.metadata?.skillReplacementsRequireSourceSkillId === 'string'
                        ? status.metadata.skillReplacementsRequireSourceSkillId
                        : '';
                if (requiredSourceSkillId && status?.sourceSkillId !== requiredSourceSkillId) return;
                Object.entries(replacements).forEach(([fromId, toId]) => {
                    if (!fromId || !toId) return;
                    map[fromId] = toId;
                });
            });
            return map;
        };

        const getEffectiveCharacterOverrideIdFromUnit = (unit) => {
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            const overrideStatus = statuses.find(
                (status) =>
                    (Number(status?.remainingTurns) || 0) > 0 &&
                    typeof status?.metadata?.effectiveCharacterId === 'string' &&
                    status.metadata.effectiveCharacterId.trim()
            );
            return overrideStatus?.metadata?.effectiveCharacterId?.trim() || '';
        };

        const getEffectiveCharacterForUnit = (unit) => {
            const rosterIndex = Number.isInteger(unit?.rosterIndex) ? unit.rosterIndex : null;
            const baseCharacter = Number.isInteger(rosterIndex) ? rosterData?.[rosterIndex] : null;
            const overrideId = getEffectiveCharacterOverrideIdFromUnit(unit);
            if (!overrideId || !Array.isArray(rosterData)) return baseCharacter;
            return (
                rosterData.find(
                    (character) =>
                        character?.id === overrideId ||
                        character?.characterId === overrideId
                ) || baseCharacter
            );
        };

        const getEffectiveSkillForActorSlot = (actorSlot, baseSkillIdx) => {
            const meta = playerSkillMetaByKey.get(`${actorSlot}:${baseSkillIdx}`);
            const unit = getActorUnitForSlot(currentPlayerUsername, actorSlot);
            const character = getEffectiveCharacterForUnit(unit);
            const baseSkill =
                (Array.isArray(character?.skills) ? character.skills[baseSkillIdx] : null) ||
                meta?.baseSkill ||
                meta?.skill ||
                null;
            if (!baseSkill) return null;
            const replacementMap = getSkillReplacementMapFromUnit(unit);
            let resolvedSkill = baseSkill;
            const visited = new Set();
            while (resolvedSkill?.id && replacementMap[resolvedSkill.id] && !visited.has(resolvedSkill.id)) {
                visited.add(resolvedSkill.id);
                const replacementId = replacementMap[resolvedSkill.id];
                const replacementSkill = (Array.isArray(character?.skills) ? character.skills : []).find(
                    (skill) => skill?.id === replacementId
                );
                if (!replacementSkill) break;
                resolvedSkill = replacementSkill;
            }
            return resolvedSkill || baseSkill;
        };
        const getEnergyCost = (energy = []) => {
            const specific = emptyPool();
            let random = 0;
            (Array.isArray(energy) ? energy : []).forEach((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                if (normalized === 'random') {
                    random += 1;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(specific, normalized)) {
                    specific[normalized] += 1;
                }
            });
            return { specific, random };
        };

        const getActorCostReductions = (actorSlot) => {
            if (!Number.isInteger(actorSlot) || actorSlot < 0) {
                return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0, random: 0 };
            }
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.reduce(
                (totals, status) => {
                    const metadata = status?.metadata || {};
                    return {
                        taijutsu: totals.taijutsu + (Number(metadata.taijutsuCostReduction) || 0),
                        ninjutsu: totals.ninjutsu + (Number(metadata.ninjutsuCostReduction) || 0),
                        bloodline: totals.bloodline + (Number(metadata.bloodlineCostReduction) || 0),
                        genjutsu: totals.genjutsu + (Number(metadata.genjutsuCostReduction) || 0),
                        taijutsuIncrease:
                            totals.taijutsuIncrease + (Number(metadata.taijutsuCostIncrease) || 0),
                        ninjutsuIncrease:
                            totals.ninjutsuIncrease + (Number(metadata.ninjutsuCostIncrease) || 0),
                        bloodlineIncrease:
                            totals.bloodlineIncrease + (Number(metadata.bloodlineCostIncrease) || 0),
                        genjutsuIncrease:
                            totals.genjutsuIncrease + (Number(metadata.genjutsuCostIncrease) || 0),
                        random: totals.random + (Number(metadata.randomCostReduction) || 0),
                        randomIncrease: totals.randomIncrease + (Number(metadata.randomCostIncrease) || 0),
                        nonMentalRandomIncrease:
                            totals.nonMentalRandomIncrease +
                            (Number(metadata.nonMentalRandomCostIncrease) || 0),
                    };
                },
                {
                    taijutsu: 0,
                    ninjutsu: 0,
                    bloodline: 0,
                    genjutsu: 0,
                    taijutsuIncrease: 0,
                    ninjutsuIncrease: 0,
                    bloodlineIncrease: 0,
                    genjutsuIncrease: 0,
                    random: 0,
                    randomIncrease: 0,
                    nonMentalRandomIncrease: 0,
                }
            );
        };

        const normalizeSkillCostOverride = (override = {}) => {
            const result = [];
            const addEnergy = (type, amount) => {
                const count = Math.max(0, Number(amount) || 0);
                for (let i = 0; i < count; i += 1) {
                    result.push(type);
                }
            };
            if (Array.isArray(override?.energy)) {
                override.energy.forEach((entry) => {
                    const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                    if (normalized) result.push(normalized);
                });
            }
            addEnergy('random', override?.requiredRandom);
            addEnergy('random', override?.random);
            ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'].forEach((type) => {
                addEnergy(type, override?.[type]);
                addEnergy(type, override?.reservedSpecific?.[type]);
            });
            return result;
        };

        const getSkillCostOverrideForSkill = (actorSlot, skill = null) => {
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            if (!skillId || !Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            for (const status of statuses) {
                if ((Number(status?.remainingTurns) || 0) <= 0) continue;
                const overrides = status?.metadata?.skillCostOverridesBySkillId;
                if (!overrides || typeof overrides !== 'object') continue;
                const overrideByRemaining = status?.metadata?.skillCostOverridesByRemainingTurns;
                const remaining = Number(status?.remainingTurns) || 0;
                const override =
                    (overrideByRemaining && typeof overrideByRemaining === 'object'
                        ? overrideByRemaining[String(remaining)] || overrideByRemaining[remaining]
                        : null) || overrides[skillId];
                if (!override || typeof override !== 'object') continue;
                return normalizeSkillCostOverride(override);
            }
            return null;
        };

        const doesSkillOverrideToAllRandom = (actorSlot, skill = null) => {
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            if (!skillId || !Number.isInteger(actorSlot) || actorSlot < 0) return false;
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            for (const status of statuses) {
                if ((Number(status?.remainingTurns) || 0) <= 0) continue;
                const metadata = status?.metadata || {};
                if (!metadata.overrideAllSkillsToAllRandom) continue;
                const restrictedSkillIds = Array.isArray(metadata.overrideAllSkillsToAllRandomSkillIdsAny)
                    ? metadata.overrideAllSkillsToAllRandomSkillIdsAny
                          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                          .filter(Boolean)
                    : [];
                if (restrictedSkillIds.length > 0 && !restrictedSkillIds.includes(skillId)) {
                    continue;
                }
                return true;
            }
            return false;
        };

        const getEffectiveEnergyList = (energy = [], actorSlot = null, skill = null) => {
            const normalizedEnergy = (Array.isArray(energy) ? energy : []).filter((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                return normalized && normalized !== 'none' && normalized !== 'non';
            });
            if (!Number.isInteger(actorSlot) || actorSlot < 0) {
                return normalizedEnergy;
            }
            const overrideEnergy = getSkillCostOverrideForSkill(actorSlot, skill);
            if (overrideEnergy) {
                return overrideEnergy;
            }
            if (doesSkillOverrideToAllRandom(actorSlot, skill)) {
                return normalizedEnergy.map(() => 'random');
            }
            const reductions = getActorCostReductions(actorSlot);
            let remainingRandomReduction = Math.max(0, reductions.random);
            let remainingSpecificReductions = {
                taijutsu: Math.max(0, reductions.taijutsu),
                ninjutsu: Math.max(0, reductions.ninjutsu),
                bloodline: Math.max(0, reductions.bloodline),
                genjutsu: Math.max(0, reductions.genjutsu),
            };
            const specificIncreases = {
                taijutsu: Math.max(0, reductions.taijutsuIncrease),
                ninjutsu: Math.max(0, reductions.ninjutsuIncrease),
                bloodline: Math.max(0, reductions.bloodlineIncrease),
                genjutsu: Math.max(0, reductions.genjutsuIncrease),
            };
            const skillClasses = Array.isArray(skill?.classes)
                ? skill.classes
                    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                    .filter(Boolean)
                : [];
            const skillIsMental = skillClasses.includes('mental');
            const randomIncrease =
                Math.max(0, reductions.randomIncrease) +
                (skillIsMental ? 0 : Math.max(0, reductions.nonMentalRandomIncrease));
            const reduced = [];
            normalizedEnergy.forEach((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                if (normalized === 'random' && remainingRandomReduction > 0) {
                    remainingRandomReduction -= 1;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(remainingSpecificReductions, normalized) &&
                    remainingSpecificReductions[normalized] > 0) {
                    remainingSpecificReductions[normalized] -= 1;
                    return;
                }
                reduced.push(entry);
            });
            Object.entries(specificIncreases).forEach(([type, amount]) => {
                for (let i = 0; i < amount; i += 1) {
                    reduced.push(type.charAt(0).toUpperCase() + type.slice(1));
                }
            });
            for (let i = 0; i < randomIncrease; i += 1) {
                reduced.push('Random');
            }
            return reduced;
        };

        const setSkillInteractivity = (isPlayersTurn) => {
            playerSkillScrolls.forEach((scrollEl) => {
                scrollEl.classList.toggle('not-turn', !isPlayersTurn);
            });
            if (chakraDisplay) {
                chakraDisplay.style.visibility = isPlayersTurn ? 'visible' : 'hidden';
            }
            if (exchangeLabel) {
                exchangeLabel.style.visibility = isPlayersTurn ? 'visible' : 'hidden';
            }
            if (!isPlayersTurn) {
                closeExchangeModal();
            }
            if (readyTextEl) {
                readyTextEl.textContent = isPlayersTurn ? READY_TEXT_PLAYER : READY_TEXT_OPPONENT;
            }
        };

        const canAffordSkill = (energy = [], pool = {}, actorSlot = null, skill = null) => {
            const normalizedPool = normalizePool(pool);
            const effectiveEnergy = getEffectiveEnergyList(energy, actorSlot, skill);
            const { specific, random } = getEnergyCost(effectiveEnergy);
            for (const type of chakraTypes) {
                if (normalizedPool[type] < specific[type]) {
                    return false;
                }
            }
            const leftover = {
                taijutsu: normalizedPool.taijutsu - specific.taijutsu,
                ninjutsu: normalizedPool.ninjutsu - specific.ninjutsu,
                bloodline: normalizedPool.bloodline - specific.bloodline,
                genjutsu: normalizedPool.genjutsu - specific.genjutsu,
            };
            return totalPool(leftover) >= random;
        };

        const getPendingReservationState = (excludedActorSlot = null) => {
            const pending = normalizePendingTurn(pendingTurnState);
            const remainingPool = normalizePool(playerPoolState);
            const randomAssignments = normalizePool(pending.randomAssignments);
            let totalQueuedRandom = 0;
            let excludedQueuedRandom = 0;

            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const queuedActorSlot = Number.parseInt(queued?.actorSlot, 10);
                const queuedRequiredRandom = Math.max(0, Number(queued?.requiredRandom) || 0);
                totalQueuedRandom += queuedRequiredRandom;
                if (Number.isInteger(excludedActorSlot) && queuedActorSlot === excludedActorSlot) {
                    excludedQueuedRandom += queuedRequiredRandom;
                    return;
                }
                const reservedSpecific =
                    queued?.reservedSpecific && typeof queued.reservedSpecific === 'object'
                        ? queued.reservedSpecific
                        : {};
                chakraTypes.forEach((type) => {
                    remainingPool[type] = Math.max(
                        0,
                        (Number(remainingPool[type]) || 0) - (Number(reservedSpecific[type]) || 0)
                    );
                });
            });

            chakraTypes.forEach((type) => {
                remainingPool[type] = Math.max(
                    0,
                    (Number(remainingPool[type]) || 0) - (Number(randomAssignments[type]) || 0)
                );
            });

            const assignedRandomTotal = totalPool(randomAssignments);
            const queuedRandomExcludingActor = Math.max(0, totalQueuedRandom - excludedQueuedRandom);
            const reservedRandomTotal = Math.max(0, queuedRandomExcludingActor - assignedRandomTotal);

            return {
                remainingPool,
                reservedRandomTotal,
            };
        };

        const canAffordSkillWithPendingReservations = (energy = [], actorSlot = null, skill = null) => {
            const { remainingPool, reservedRandomTotal } = getPendingReservationState(actorSlot);
            const effectiveEnergy = getEffectiveEnergyList(energy, actorSlot, skill);
            const { specific, random } = getEnergyCost(effectiveEnergy);
            for (const type of chakraTypes) {
                if ((Number(remainingPool[type]) || 0) < specific[type]) {
                    return false;
                }
            }
            const leftover = {
                taijutsu: (Number(remainingPool.taijutsu) || 0) - specific.taijutsu,
                ninjutsu: (Number(remainingPool.ninjutsu) || 0) - specific.ninjutsu,
                bloodline: (Number(remainingPool.bloodline) || 0) - specific.bloodline,
                genjutsu: (Number(remainingPool.genjutsu) || 0) - specific.genjutsu,
            };
            return totalPool(leftover) >= reservedRandomTotal + random;
        };

        const getPendingTurnWithOptimisticQueues = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const queuedByActorSlot = { ...(pending.queuedByActorSlot || {}) };
            const queueOrder = Array.isArray(pending.queueOrder) ? [...pending.queueOrder] : [];
            optimisticCancelledActorSlots.forEach((slot) => {
                delete queuedByActorSlot[String(slot)];
            });
            optimisticQueuedByActorSlot.forEach((queued, slot) => {
                const key = String(slot);
                if (queuedByActorSlot[key]) return;
                queuedByActorSlot[key] = queued;
                if (!queueOrder.some((entry) => Number(entry) === Number(slot))) {
                    queueOrder.push(slot);
                }
            });
            return {
                ...pending,
                queuedByActorSlot,
                queueOrder,
            };
        };

        const clearSkillInteractionCache = () => {
            targetOptionsCache.clear();
        };

        const getQueuedSkillForActorSlot = (actorSlot) => {
            const pending = getPendingTurnWithOptimisticQueues();
            return pending.queuedByActorSlot?.[String(actorSlot)] || null;
        };

        const updateEndTurnButtons = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const hasUnresolvedRandom = pending.unresolvedRandom > 0;
            if (endTurnCancelButton) {
                endTurnCancelButton.style.opacity = '1';
            }
            if (endTurnOkButton) {
                endTurnOkButton.disabled = hasUnresolvedRandom;
                endTurnOkButton.style.opacity = hasUnresolvedRandom ? '0.4' : '1';
            }
        };

        const skillIsEnemyTargeting = (skill) => {
            const target = String(skill?.target || '').trim().toLowerCase();
            return (
                target === 'single-enemy' ||
                target === 'other-enemies' ||
                target === 'all-enemy' ||
                target === 'single-character'
            );
        };

        const isHarmfulEffect = (effect) => {
            const type = effect?.type;
            if (type === 'damage' || type === 'health_steal_damage') return true;
            if (type === 'execute_below_hp') return true;
            if (type === 'destroy_destructible_defense') return true;
            if (type === 'modify_cooldowns') {
                const amount = Number(effect?.amount) || 0;
                return amount > 0 || Boolean(effect?.metadata?.harmful);
            }
            if (type === 'apply_status') {
                const metadata = effect?.metadata || {};
                return Boolean(
                    metadata.harmful ||
                        metadata.cannotUseSkills ||
                        metadata.cannotUseHelpfulSkills ||
                        metadata.cannotUseHarmfulSkills ||
                        metadata.cannotUseNonMentalSkills ||
                        metadata.useChosenSkillClassForCannotUseSkillClasses ||
                        (Array.isArray(metadata.cannotUseSkillClasses) && metadata.cannotUseSkillClasses.length > 0) ||
                        metadata.cannotReduceDamage ||
                        metadata.cannotBecomeInvulnerable ||
                        metadata.taunt
                );
            }
            return false;
        };

        const skillHasHarmfulEffects = (skill) => {
            const effects = Array.isArray(skill?.effects) ? skill.effects : [];
            if (effects.some((effect) => isHarmfulEffect(effect))) return true;
            return skillIsEnemyTargeting(skill);
        };

        const isActorEnemyTargetingStunned = (actorUnit) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.some(
                (status) =>
                    status?.metadata?.cannotUseHarmfulSkills &&
                    !status?.metadata?.silenceNonDamageEffects
            );
        };

        const actorHasBlindForSkill = (actorUnit, skill) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const harmful = skillHasHarmfulEffects(skill);
            return statuses.some((status) => {
                const metadata = status?.metadata || {};
                return Boolean(metadata.fullBlind) || (harmful && Boolean(metadata.harmfulBlind)) || (!harmful && Boolean(metadata.helpfulBlind));
            });
        };

        const getActorBlindModeForSkill = (actorUnit, skill) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const harmful = skillHasHarmfulEffects(skill);
            if (statuses.some((status) => Boolean(status?.metadata?.fullBlind)) && harmful) return 'any';
            if (statuses.some((status) => Boolean(status?.metadata?.harmfulBlind)) && harmful) return 'enemy';
            if (statuses.some((status) => Boolean(status?.metadata?.helpfulBlind)) && !harmful) return 'ally';
            return '';
        };

        const isSkillBlockedByClassLock = (actorUnit, skill) => {
            const skillClasses = Array.isArray(skill?.classes)
                ? skill.classes
                    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                    .filter(Boolean)
                : [];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const isMental = skillClasses.includes('mental');
            if (statuses.some((status) => status?.metadata?.cannotUseNonMentalSkills) && !isMental) {
                return true;
            }
            if (!skillClasses.length) return false;
            const blockedClasses = new Set(
                statuses.flatMap((status) => {
                    const blocked = status?.metadata?.cannotUseSkillClasses;
                    if (!Array.isArray(blocked)) return [];
                    return blocked
                        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                        .filter(Boolean);
                })
            );
            if (!blockedClasses.size) return false;
            return skillClasses.some((entry) => blockedClasses.has(entry));
        };

        const isSkillBlockedByIndexLock = (actorUnit, skillIdx) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.some((status) => {
                const blocked = status?.metadata?.cannotUseSkillIndices;
                if (!Array.isArray(blocked)) return false;
                return blocked.some((entry) => Number.parseInt(entry, 10) === Number.parseInt(skillIdx, 10));
            });
        };

        const getSkillUsageState = (actorUnit, skill) => {
            const maxUses = Math.max(0, Number(skill?.maxUses) || 0);
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            const skillUses =
                actorUnit?.state?.skillUses && typeof actorUnit.state.skillUses === 'object'
                    ? actorUnit.state.skillUses
                    : {};
            const uses = skillId ? Math.max(0, Number(skillUses[skillId]) || 0) : 0;
            const isLimited = maxUses > 0;
            const isMaxed = isLimited && uses >= maxUses;
            return {
                isLimited,
                uses,
                maxUses,
                isMaxed,
                tooltipText: isLimited ? `Rex has used this skill ${uses} time${uses === 1 ? '' : 's'}.` : '',
            };
        };

        const isSkillBlockedByActorCondition = (actorUnit, skill) => {
            const usageState = getSkillUsageState(actorUnit, skill);
            if (usageState.isMaxed) return true;
            const condition = skill?.actorCondition;
            if (!condition || typeof condition !== 'object') return false;
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const hasStatusId = (statusId) =>
                statuses.some(
                    (status) =>
                        status?.id === statusId && Math.max(0, Number(status?.remainingTurns) || 0) > 0
                );
            if (condition?.statusId && !hasStatusId(condition.statusId)) return true;
            if (
                Array.isArray(condition?.statusIdsAny) &&
                condition.statusIdsAny.length > 0 &&
                !condition.statusIdsAny.some((statusId) => hasStatusId(statusId))
            ) {
                return true;
            }
            if (condition?.missingStatusId && hasStatusId(condition.missingStatusId)) return true;
            const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
            const hpAtMost = Number(condition?.sourceCurrentHpAtMost);
            if (Number.isFinite(hpAtMost) && currentHp > hpAtMost) return true;
            const hpAtLeast = Number(condition?.sourceCurrentHpAtLeast);
            if (Number.isFinite(hpAtLeast) && currentHp < hpAtLeast) return true;
            return false;
        };

        const updateSkillAffordability = () => {
            const isPlayersTurn =
                currentPlayerUsername && currentTurnUsername && usernamesMatch(currentPlayerUsername, currentTurnUsername);
            const playerUnits = currentPlayerUsername && latestBoardState
                ? latestBoardState[currentPlayerUsername]
                : null;
            const getCooldownRemainingForMeta = (meta, actorUnit) => {
                const cooldowns = actorUnit?.state?.cooldowns || {};
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const skillId = effectiveSkill?.id;
                if (!skillId) return 0;
                return Math.max(0, Number(cooldowns[skillId]) || 0);
            };
            const isActorStunned = (actorUnit) => {
                const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
                return statuses.some((status) => status?.metadata?.cannotUseSkills);
            };
            playerSkillMetaByKey.forEach((meta, key) => {
                const imgEl = meta?.imgEl;
                if (!imgEl) return;
                const actorUnit = Array.isArray(playerUnits) ? playerUnits[meta.actorSlot] : null;
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const usageState = getSkillUsageState(actorUnit, effectiveSkill);
                imgEl.title = usageState.tooltipText || '';
                const actorDead = isUnitDeadLike(actorUnit);
                if (actorDead) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const cooldownRemaining = getCooldownRemainingForMeta(meta, actorUnit);
                if (cooldownRemaining > 0 || isActorStunned(actorUnit)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (usageState.isMaxed) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isActorEnemyTargetingStunned(actorUnit) && skillIsEnemyTargeting(effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByClassLock(actorUnit, effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByIndexLock(actorUnit, meta.skillIdx)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByActorCondition(actorUnit, effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (!isPlayersTurn) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const queued = getQueuedSkillForActorSlot(meta.actorSlot);
                if (queued && queued.skillIndex === meta.skillIdx) {
                    imgEl.style.opacity = '1';
                    return;
                }
                imgEl.style.opacity = canAffordSkillWithPendingReservations(
                    effectiveSkill?.energy,
                    meta.actorSlot,
                    effectiveSkill
                )
                    ? '1'
                    : '0.4';
            });
        };

        const getPrimaryEnergyClass = (skill = null) => {
            const first = Array.isArray(skill?.energy) ? skill.energy[0] : '';
            const normalized = typeof first === 'string' ? first.trim().toLowerCase() : '';
            return ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu', 'random'].includes(normalized)
                ? normalized
                : 'random';
        };

        const pulseSkillCast = (imgEl, skill = null) => {
            if (!uiSettings.skillCastAnimations) return;
            if (!imgEl) return;
            const energyClass = getPrimaryEnergyClass(skill);
            imgEl.classList.remove(
                'skill-cast-pulse',
                'skill-cast-taijutsu',
                'skill-cast-ninjutsu',
                'skill-cast-bloodline',
                'skill-cast-genjutsu',
                'skill-cast-random'
            );
            void imgEl.offsetWidth;
            imgEl.classList.add('skill-cast-pulse', `skill-cast-${energyClass}`);
            window.setTimeout(() => {
                imgEl.classList.remove('skill-cast-pulse', `skill-cast-${energyClass}`);
            }, 620);
        };

        const triggerBlockedSkillFeedback = (imgEl) => {
            if (!imgEl) return;
            imgEl.classList.remove('skill-blocked-shake');
            void imgEl.offsetWidth;
            imgEl.classList.add('skill-blocked-shake');
            window.setTimeout(() => imgEl.classList.remove('skill-blocked-shake'), 520);
        };

        const getCooldownBadgeForImage = (imgEl) => {
            if (!imgEl) return null;
            const container = imgEl.closest('.skillscrollingame');
            if (!container) return null;
            const actorSlot = imgEl.dataset.actorSlot;
            const skillIdx = imgEl.dataset.skillIdx;
            const selector =
                `.skill-cooldown-badge[data-actor-slot="${actorSlot}"][data-skill-idx="${skillIdx}"]`;
            const existing = container.querySelector(selector);
            if (existing) return existing;
            const badge = document.createElement('div');
            badge.className = 'skill-cooldown-badge';
            badge.dataset.actorSlot = actorSlot || '';
            badge.dataset.skillIdx = skillIdx || '';
            container.appendChild(badge);
            return badge;
        };

        const renderSkillCooldownBadges = (data, options = {}) => {
            const board = data?.board && typeof data.board === 'object' ? data.board : null;
            const playerUnits = currentPlayerUsername && board ? board[currentPlayerUsername] : null;
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                const badge = getCooldownBadgeForImage(meta.imgEl);
                if (!badge) return;
                const actorUnit = Array.isArray(playerUnits) ? playerUnits[meta.actorSlot] : null;
                const cooldowns = actorUnit?.state?.cooldowns || {};
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const skillId = effectiveSkill?.id || '';
                const cooldownRemaining = skillId ? Math.max(0, Number(cooldowns[skillId]) || 0) : 0;
                const cooldownKey = `${meta.actorSlot}:${meta.skillIdx}`;
                const previousCooldown = cooldownValueBySkillKey.get(cooldownKey);
                if (cooldownRemaining > 0) {
                    badge.textContent = String(cooldownRemaining);
                    badge.style.display = 'flex';
                    if (
                        options.animateTicks &&
                        previousCooldown !== undefined &&
                        previousCooldown !== cooldownRemaining
                    ) {
                        badge.classList.remove('cooldown-tick-pop');
                        void badge.offsetWidth;
                        badge.classList.add('cooldown-tick-pop');
                    }
                } else {
                    badge.textContent = '';
                    badge.style.display = 'none';
                }
                cooldownValueBySkillKey.set(cooldownKey, cooldownRemaining);
                const rect = meta.imgEl.getBoundingClientRect();
                const parentRect = meta.imgEl.parentElement.getBoundingClientRect();
                badge.style.left = `${rect.left - parentRect.left}px`;
                badge.style.top = `${rect.top - parentRect.top}px`;
                badge.style.width = `${rect.width}px`;
                badge.style.height = `${rect.height}px`;
            });
        };

        const applyQueuedSkillVisuals = () => {
            const pending = getPendingTurnWithOptimisticQueues();
            const nextQueuedKeys = new Set();
            const queuedActorSlots = new Set();
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                meta.imgEl.classList.remove('queued-skill-locked');
            });
            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const key = `${queued.actorSlot}:${queued.skillIndex}`;
                nextQueuedKeys.add(key);
                queuedActorSlots.add(String(queued.actorSlot));
                const meta = playerSkillMetaByKey.get(key);
                if (!meta?.imgEl) return;
                meta.imgEl.classList.add('selected-target');
                if (!queuedSkillKeySet.has(key) || !meta.imgEl.style.transform) {
                    pulseSkillCast(meta.imgEl, meta.skill || meta.baseSkill);
                    animateSkillToQueue(meta.imgEl);
                }
            });
            queuedSkillKeySet.forEach((key) => {
                if (nextQueuedKeys.has(key)) return;
                const meta = playerSkillMetaByKey.get(key);
                if (!meta?.imgEl) return;
                meta.imgEl.classList.remove('selected-target');
                meta.imgEl.style.transform = '';
            });
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                const key = `${meta.actorSlot}:${meta.skillIdx}`;
                if (queuedActorSlots.has(String(meta.actorSlot)) && !nextQueuedKeys.has(key)) {
                    meta.imgEl.classList.add('queued-skill-locked');
                }
            });
            const newlyQueuedKeys = new Set(
                [...nextQueuedKeys].filter((key) => !queuedSkillKeySet.has(key))
            );
            queuedSkillKeySet = nextQueuedKeys;
            renderSkillOrderQueue(newlyQueuedKeys);
            updateSkillAffordability();
            renderQueuedTargetTooltips();
            renderDynamicSkillIcons();
        };

        const getOrderedQueuedEntries = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const bySlot = pending.queuedByActorSlot || {};
            const ordered = [];
            const used = new Set();
            pending.queueOrder.forEach((slot) => {
                const key = String(slot);
                const queued = bySlot[key];
                if (!queued) return;
                ordered.push(queued);
                used.add(key);
            });
            Object.entries(bySlot).forEach(([slotKey, queued]) => {
                if (used.has(slotKey)) return;
                ordered.push(queued);
            });
            return ordered;
        };

        const cloneQueuedEntryForAnimation = (queued) =>
            queued && typeof queued === 'object'
                ? {
                      actorSlot: Number.parseInt(queued.actorSlot, 10),
                      skillIndex: Number.parseInt(queued.skillIndex, 10),
                      targetSelection:
                          queued.targetSelection === undefined
                              ? []
                              : JSON.parse(JSON.stringify(queued.targetSelection)),
                  }
                : null;

        const getQueuedResolutionAnimationEntries = () =>
            getOrderedQueuedEntries()
                .map(cloneQueuedEntryForAnimation)
                .filter(
                    (entry) =>
                        entry &&
                        Number.isInteger(entry.actorSlot) &&
                        Number.isInteger(entry.skillIndex)
                );

        const waitForMs = (durationMs) =>
            new Promise((resolve) => window.setTimeout(resolve, durationMs));

        const playQueuedResolutionSequence = async (entries = []) => {
            const sequence = Array.isArray(entries) ? entries : [];
            if (!sequence.length) return;
            isPlayingResolutionSequence = true;
            deferredResolutionMatchState = null;
            for (const entry of sequence) {
                animateSkillCastTrail({
                    actorSlot: entry.actorSlot,
                    skillIdx: entry.skillIndex,
                    selection: entry.targetSelection,
                });
                await waitForMs(980);
            }
            await waitForMs(260);
            isPlayingResolutionSequence = false;
        };

        const applyMatchStateAfterResolutionSequence = async (data, entries = []) => {
            await playQueuedResolutionSequence(entries);
            const deferred = deferredResolutionMatchState;
            deferredResolutionMatchState = null;
            applyMatchState(deferred || data, { allowDuringResolutionSequence: true });
        };

        const reorderQueuedSkills = async (actorSlots = []) => {
            if (!matchIdFromUrl) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/reorder`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ actorSlots }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to reorder queued skills.');
                }
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
            } catch (error) {
                console.warn('Failed to reorder queued skills.', error);
            }
        };

        const renderSkillOrderQueue = (newlyQueuedKeys = new Set()) => {
            if (!skillOrderEl) return;
            const queuedEntries = getOrderedQueuedEntries();
            skillOrderEl.innerHTML = '';
            queuedEntries.forEach((queued) => {
                const actorSlot = Number.parseInt(queued.actorSlot, 10);
                const skillIdx = Number.parseInt(queued.skillIndex, 10);
                const meta = playerSkillMetaByKey.get(`${actorSlot}:${skillIdx}`);
                const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx) || meta?.skill;
                const preview = document.createElement('img');
                preview.className = 'skillpreview';
                preview.alt = effectiveSkill?.name || `Queued Skill ${skillIdx + 1}`;
                preview.src = effectiveSkill?.skillimage || '';
                preview.draggable = true;
                preview.dataset.actorSlot = String(actorSlot);
                preview.dataset.skillIndex = String(skillIdx);
                if (newlyQueuedKeys.has(`${actorSlot}:${skillIdx}`)) {
                    preview.classList.add('skillpreview-added');
                    window.setTimeout(() => preview.classList.remove('skillpreview-added'), 700);
                }
                preview.addEventListener('dragstart', () => {
                    draggingQueueActorSlot = actorSlot;
                    preview.classList.add('dragging');
                });
                preview.addEventListener('dragend', () => {
                    draggingQueueActorSlot = null;
                    preview.classList.remove('dragging');
                });
                preview.addEventListener('dragover', (event) => {
                    event.preventDefault();
                });
                preview.addEventListener('drop', (event) => {
                    event.preventDefault();
                    if (!Number.isInteger(draggingQueueActorSlot)) return;
                    const targetSlot = Number.parseInt(preview.dataset.actorSlot, 10);
                    if (!Number.isInteger(targetSlot) || targetSlot === draggingQueueActorSlot) return;
                    const currentOrder = getOrderedQueuedEntries().map((entry) =>
                        Number.parseInt(entry.actorSlot, 10)
                    );
                    const fromIdx = currentOrder.indexOf(draggingQueueActorSlot);
                    const toIdx = currentOrder.indexOf(targetSlot);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const nextOrder = currentOrder.slice();
                    const [moved] = nextOrder.splice(fromIdx, 1);
                    nextOrder.splice(toIdx, 0, moved);
                    reorderQueuedSkills(nextOrder).catch((error) =>
                        console.warn('Queued reorder failed.', error)
                    );
                });
                skillOrderEl.appendChild(preview);
            });
        };

        const clearTargetHighlights = () => {
            lastTargetHighlightSignature = '';
            document.querySelectorAll('.target-overlay, .target-lock-marker, .blind-potential-skill-icon').forEach((el) => el.remove());
            [...playerCards, ...enemyCards].forEach((card) => {
                card?.classList.remove('targetable', 'target-invalid', 'blind-random-target');
            });
        };

        const getCardByUsernameSlot = (username, slot) => {
            if (!Number.isInteger(slot) || slot < 0) return null;
            if (username === currentPlayerUsername) return playerCards[slot] || null;
            if (username === currentOpponentUsername) return enemyCards[slot] || null;
            return null;
        };

        const getTargetForCardFromOptions = (card, options = activeTargetOptions) => {
            if (!card || !options || !Array.isArray(options.targets)) return null;
            const slot = Number.parseInt(card.dataset.slot, 10);
            if (!Number.isInteger(slot)) return null;
            const username = card.dataset.username || '';
            const exactTarget = options.targets.find(
                (target) => target?.username === username && Number.parseInt(target?.slot, 10) === slot
            );
            if (exactTarget) return exactTarget;
            const expectedUsername = playerCards.includes(card)
                ? currentPlayerUsername
                : enemyCards.includes(card)
                    ? currentOpponentUsername
                    : '';
            return (
                options.targets.find(
                    (target) =>
                        Number.parseInt(target?.slot, 10) === slot &&
                        (!expectedUsername || target?.username === expectedUsername)
                ) ||
                null
            );
        };

        const renderTargetHighlights = (options) => {
            const targetsSignature = Array.isArray(options?.targets)
                ? JSON.stringify({
                    actorSlot: activeCastingSkill?.actorSlot ?? null,
                    skillIdx: activeCastingSkill?.skillIdx ?? null,
                    blind: activeCastingSkill
                        ? getActorBlindModeForSkill(
                            latestBoardState?.[currentPlayerUsername]?.[activeCastingSkill.actorSlot],
                            activeCastingSkill.skill
                        )
                        : '',
                    targets: options.targets.map((target) => ({
                        username: target?.username || '',
                        slot: Number.parseInt(target?.slot, 10),
                        valid: target?.valid !== false,
                        reason: target?.reason || '',
                    })),
                })
                : '';
            if (targetsSignature && targetsSignature === lastTargetHighlightSignature) return;
            lastTargetHighlightSignature = targetsSignature;
            clearTargetHighlights();
            lastTargetHighlightSignature = targetsSignature;
            if (!options || !Array.isArray(options.targets)) return;
            const actorUnit = activeCastingSkill
                ? latestBoardState?.[currentPlayerUsername]?.[activeCastingSkill.actorSlot]
                : null;
            const blindMode = activeCastingSkill
                ? getActorBlindModeForSkill(actorUnit, activeCastingSkill.skill)
                : '';
            const blindedCast = Boolean(blindMode);
            const getAliveBlindPotentialTargets = () => {
                if (!blindedCast) return [];
                const playerUnits = Array.isArray(latestBoardState?.[currentPlayerUsername])
                    ? latestBoardState[currentPlayerUsername]
                    : [];
                const opponentUnits = Array.isArray(latestBoardState?.[currentOpponentUsername])
                    ? latestBoardState[currentOpponentUsername]
                    : [];
                const makeEntries = (units, username) =>
                    units
                        .map((unit, slot) => ({ unit, slot, username }))
                        .filter((entry) => entry.unit && !isUnitDeadLike(entry.unit));
                if (blindMode === 'any') {
                    return [
                        ...makeEntries(playerUnits, currentPlayerUsername || ''),
                        ...makeEntries(opponentUnits, currentOpponentUsername || ''),
                    ];
                }
                if (blindMode === 'ally') {
                    return makeEntries(playerUnits, currentPlayerUsername || '');
                }
                return makeEntries(opponentUnits, currentOpponentUsername || '');
            };
            const addBlindPotentialMarker = (card) => {
                if (!card || card.querySelector('.target-lock-marker.blind-random-target')) return;
                const face = card.querySelector('.character-face');
                if (!face) return;
                const overlay = document.createElement('div');
                overlay.className = 'target-overlay blind-random-target';
                face.parentElement?.appendChild(overlay);
                const lock = document.createElement('div');
                lock.className = 'target-lock-marker blind-random-target';
                face.parentElement?.appendChild(lock);
            };
            const addBlindPotentialSkillIcon = (card) => {
                if (!card || card.querySelector('.blind-potential-skill-icon')) return;
                const tooltipWrap = card.querySelector('.skilltooltips');
                const tooltipImgTemplate =
                    tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                    tooltipWrap?.querySelector('.skilltooltipimage');
                if (!tooltipWrap || !tooltipImgTemplate) return;
                tooltipWrap.style.visibility = 'visible';
                tooltipWrap.classList.add('has-status');
                const iconEl = tooltipImgTemplate.cloneNode(true);
                iconEl.classList.remove('status-icon-template', 'dynamic-status-icon');
                iconEl.classList.add('blind-potential-skill-icon');
                iconEl.style.display = 'block';
                iconEl.src = activeCastingSkill?.skill?.skillimage || activeCastingSkill?.skillEl?.src || iconEl.src;
                iconEl.title = `Possible random target: ${activeCastingSkill?.skill?.name || 'Selected skill'}`;
                tooltipWrap.appendChild(iconEl);
            };
            [...playerCards, ...enemyCards].forEach((card) => {
                if (!card) return;
                if (getTargetForCardFromOptions(card, options)) {
                    card.classList.add('targetable');
                    if (blindedCast) {
                        card.classList.add('blind-random-target');
                    }
                    card.classList.remove('target-invalid');
                } else {
                    card.classList.add('target-invalid');
                    card.classList.remove('targetable');
                }
            });
            options.targets.forEach((target) => {
                const slot = Number.parseInt(target.slot, 10);
                const card = getCardByUsernameSlot(target.username, slot);
                if (!card) return;
                const face = card.querySelector('.character-face');
                if (!face) return;
                const overlay = document.createElement('div');
                overlay.className = 'target-overlay';
                face.parentElement?.appendChild(overlay);
                const lock = document.createElement('div');
                lock.className = `target-lock-marker${blindedCast ? ' blind-random-target' : ''}`;
                face.parentElement?.appendChild(lock);
            });
            if (blindedCast) {
                getAliveBlindPotentialTargets().forEach((target) => {
                    const card = getCardByUsernameSlot(target.username, target.slot);
                    if (!card) return;
                    card.classList.add('blind-random-target');
                    card.classList.remove('target-invalid');
                    addBlindPotentialMarker(card);
                    addBlindPotentialSkillIcon(card);
                });
            }
        };

        const animateSkillToQueue = (skillEl) => {
            if (!uiSettings.skillCastAnimations) return;
            const skillScroll = skillEl?.closest('.skillscrollingame');
            if (!skillScroll) return;
            const queueEl = skillScroll.querySelector('.skillqueue');
            if (!queueEl) return;
            // Reset before measuring
            skillEl.style.transform = '';
            const skillRect = skillEl.getBoundingClientRect();
            const queueRect = queueEl.getBoundingClientRect();
            const dx = queueRect.left - skillRect.left;
            const dy = queueRect.top - skillRect.top;
            skillEl.classList.remove('skill-queue-trail');
            void skillEl.offsetWidth;
            skillEl.classList.add('skill-queue-trail');
            skillEl.style.transform = `translate(${dx}px, ${dy}px)`;
            window.setTimeout(() => skillEl.classList.remove('skill-queue-trail'), 760);
        };

        const normalizeTargetSelectionList = (selection) => {
            if (Array.isArray(selection)) return selection;
            if (selection && typeof selection === 'object') return [selection];
            return [];
        };

        const CAPTAIN_AMERICA_SHIELD_PROJECTILE_SRC = 'assets/images/captainamericashield.png';

        const skillHasCustomCastFx = (skill) => {
            const skillId = skill?.id || '';
            if (!skillId) return false;
            return [
                'superman-laser-eyes',
                'superman-laser-eyes-empowered',
                'homelander-laser-death-beam',
                'homelander-laser-death-beam-empowered',
                'billy-butcher-yellow-death-lasers',
                'superman-frost-breath',
                'superman-frost-breath-empowered',
                'superman-solar-flare',
                'andrea-snipe',
                'andrea-quick-shot',
                'rick-grimes-357-revolver',
                'seraphina-vale-pump-shotgun',
                'rick-grimes-throat-slit',
                'negan-you-re-already-fucked',
                'negan-you-got-no-guts',
                'aquaman-tidal-wave',
                'space-marine-smartgunner-smartgun-lock-on',
                'predator-stalker-bleeder-spear',
                'carnage-blood-slash',
                'carnage-wide-area-cutting',
                'carnage-brain-devour',
                'the-flash-barry-allen-lightning-rush',
                'the-flash-barry-allen-infinite-mass-punch',
                'the-flash-barry-allen-infinite-mass-punch-speed-up',
                'the-flash-barry-allen-speed-steal',
                'the-flash-barry-allen-flashpoint-surge',
                'scorpion-scorpion-sting',
                'scorpion-tail-laser',
                'venom-ravenous-bite',
                'venom-ravenous-bite-empowered',
                'venom-pulling-tendrils',
                'venom-venom-web-wrap',
                'negan-the-iron',
            ].includes(skillId) || skillId.startsWith('storm-lightning-strike') || skillId.startsWith('storm-wind-funnel');
        };

        const animateSkillCastTrail = ({ actorSlot, skillIdx, selection }) => {
            const actorCard = Number.isInteger(actorSlot) ? playerCards[actorSlot] : null;
            const meta = playerSkillMetaByKey.get(`${actorSlot}:${skillIdx}`);
            const skillEl = meta?.imgEl || null;
            if (!actorCard || !skillEl) return;
            const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx) || meta?.skill || meta?.baseSkill;
            const face = actorCard.querySelector('.character-face');
            if (face) {
                face.classList.remove('skill-caster-surge');
                void face.offsetWidth;
                face.classList.add('skill-caster-surge');
                window.setTimeout(() => face.classList.remove('skill-caster-surge'), 1050);
            }
            const sourceRect = skillEl.getBoundingClientRect();
            const actorRect = (face || actorCard).getBoundingClientRect();
            const isCaptainShieldThrow = effectiveSkill?.id === 'captain-america-shield-throw';
            const isCaptainShieldBash = effectiveSkill?.id === 'captain-america-shield-bash';
            const isCaptainShieldProjectile = isCaptainShieldThrow || isCaptainShieldBash;
            const initialSourceX = isCaptainShieldProjectile
                ? actorRect.left + actorRect.width / 2
                : sourceRect.left + sourceRect.width / 2;
            const initialSourceY = isCaptainShieldProjectile
                ? actorRect.top + actorRect.height / 2
                : sourceRect.top + sourceRect.height / 2;
            const targets = normalizeTargetSelectionList(selection)
                .map((target) => {
                    const targetSlot = Number.parseInt(target?.slot, 10);
                    const targetCard = getCardByUsernameSlot(target?.username || '', targetSlot);
                    const targetFace = targetCard?.querySelector('.character-face') || targetCard;
                    const targetRect = targetFace?.getBoundingClientRect?.();
                    if (!targetRect) return null;
                    return {
                        x: targetRect.left + targetRect.width / 2,
                        y: targetRect.top + targetRect.height / 2,
                    };
                })
                .filter(Boolean);
            if (!skillHasCustomCastFx(effectiveSkill) || isCaptainShieldProjectile) {
                targets.forEach((targetPoint, index) => {
                    const sourceX = isCaptainShieldThrow && index > 0 ? targets[index - 1].x : initialSourceX;
                    const sourceY = isCaptainShieldThrow && index > 0 ? targets[index - 1].y : initialSourceY;
                    const projectileHalfSize = isCaptainShieldProjectile ? 24 : 17;
                    const projectile = document.createElement('img');
                    projectile.className = 'skill-cast-projectile';
                    projectile.src = isCaptainShieldProjectile
                        ? CAPTAIN_AMERICA_SHIELD_PROJECTILE_SRC
                        : meta?.skill?.skillimage || skillEl.src || '';
                    projectile.alt = '';
                    projectile.style.left = `${sourceX - projectileHalfSize}px`;
                    projectile.style.top = `${sourceY - projectileHalfSize}px`;
                    projectile.style.setProperty('--cast-dx', `${targetPoint.x - sourceX}px`);
                    projectile.style.setProperty('--cast-dy', `${targetPoint.y - sourceY}px`);
                    const animationDelay = isCaptainShieldThrow ? index * 520 : Math.min(index, 3) * (isCaptainShieldBash ? 80 : 120);
                    projectile.style.animationDelay = `${animationDelay}ms`;
                    if (isCaptainShieldThrow) {
                        projectile.classList.add('captain-shield-throw-projectile');
                    } else if (isCaptainShieldBash) {
                        projectile.classList.add('captain-shield-bash-projectile');
                    }
                    document.body.appendChild(projectile);
                    window.setTimeout(
                        () => projectile.remove(),
                        (isCaptainShieldThrow ? 2300 : isCaptainShieldBash ? 980 : 1450) + animationDelay
                    );
                });
            }
            const skillId = effectiveSkill?.id || '';
            if (skillId === 'captain-america-shield-throw') {
                playGeneratedIngameSound('shield');
            } else if (skillId === 'predator-stalker-yautja-shuriken') {
                playGeneratedIngameSound('ricochet');
            } else if (skillId.includes('bomb')) {
                playGeneratedIngameSound('bomb-arm');
            } else if (
                skillId === 'xenomorph-drone-inner-jaw-strike' ||
                skillId === 'xenomorph-drone-xeno-stealth'
            ) {
                playIngameSound(xenoSound);
            } else if (skillId.startsWith('spider-man-web')) {
                playGeneratedIngameSound('web');
            } else if (skillId.startsWith('angstrom-levy')) {
                playGeneratedIngameSound('portal');
            } else if (skillId.startsWith('andrea') && skillId !== 'andrea-snipe' && skillId !== 'andrea-quick-shot') {
                playGeneratedIngameSound('target-lock');
            } else if (skillId.startsWith('the-flash-barry-allen')) {
                playGeneratedIngameSound('lightning');
            } else if (skillId.includes('cloak') && skillId !== 'predator-stalker-cloaking-tech') {
                playGeneratedIngameSound('cloak');
            }
            if (skillId.startsWith('the-flash-barry-allen')) {
                showTemporaryCardFx(
                    actorCard,
                    'flash-red-speed-aura',
                    '<span></span><span></span><span></span>',
                    1200
                );
            }
            showDirectionalSkillFx({ actorCard, actorSlot, skill: effectiveSkill, selection });
            showStormSkillPortraitFx(effectiveSkill, selection);
        };

        const showTemporaryCardFx = (card, className, html = '', duration = 1600) => {
            if (!card || !className) return;
            const primaryClassName = String(className).trim().split(/\s+/)[0];
            const existing = primaryClassName ? card.querySelector(`.${primaryClassName}`) : null;
            if (existing) existing.remove();
            const effect = document.createElement('div');
            effect.className = className;
            effect.innerHTML = html;
            card.appendChild(effect);
            window.setTimeout(() => effect.remove(), duration);
        };

        const showCombatBeam = ({ sourceCard, targetCard, color = 'red', empowered = false, frost = false }) => {
            const sourceFace = sourceCard?.querySelector?.('.character-face') || sourceCard;
            const targetFace = targetCard?.querySelector?.('.character-face') || targetCard;
            const sourceRect = sourceFace?.getBoundingClientRect?.();
            const targetRect = targetFace?.getBoundingClientRect?.();
            if (!sourceRect || !targetRect) return;
            const sourceX = sourceRect.left + sourceRect.width * 0.52;
            const sourceY = sourceRect.top + sourceRect.height * 0.38;
            const targetX = targetRect.left + targetRect.width * 0.5;
            const targetY = targetRect.top + targetRect.height * 0.48;
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const length = Math.max(24, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const beam = document.createElement('div');
            beam.className = [
                'combat-energy-beam',
                frost ? 'frost' : color === 'yellow' ? 'yellow' : 'red',
                empowered ? 'empowered' : '',
            ].filter(Boolean).join(' ');
            beam.style.left = `${sourceX}px`;
            beam.style.top = `${sourceY}px`;
            beam.style.width = `${length}px`;
            beam.style.transform = `rotate(${angle}deg)`;
            if (frost) {
                beam.innerHTML = '<span></span><span></span><span></span><span></span>';
            }
            document.body.appendChild(beam);
            window.setTimeout(() => beam.remove(), frost ? 1150 : empowered ? 1050 : 820);
        };

        const getTargetCardsFromSelection = (selection) =>
            normalizeTargetSelectionList(selection)
                .map((target) => {
                    const targetSlot = Number.parseInt(target?.slot, 10);
                    return getCardByUsernameSlot(target?.username || '', targetSlot);
                })
                .filter(Boolean);

        const showSolarFlareFx = (sourceCard) => {
            const sourceFace = sourceCard?.querySelector?.('.character-face') || sourceCard;
            const rect = sourceFace?.getBoundingClientRect?.();
            if (!rect) return;
            const flare = document.createElement('div');
            flare.className = 'superman-solar-flare-screen-fx';
            flare.style.left = `${rect.left + rect.width / 2}px`;
            flare.style.top = `${rect.top + rect.height / 2}px`;
            flare.innerHTML = '<span></span><span></span><span></span><span></span>';
            document.body.appendChild(flare);
            playGeneratedIngameSound('solar-flare');
            window.setTimeout(() => flare.remove(), 1800);
        };

        const showBulletImpactFx = (targetCard, variant = 'small') => {
            if (!targetCard) return;
            showTemporaryCardFx(
                targetCard,
                `bullet-hole-impact-fx ${variant}`,
                '<span class="bullet-hole-core"></span><span class="bullet-hole-crack"></span>',
                variant === 'sniper' ? 2300 : 1700
            );
        };

        const buildSeraphinaBuckshotHtml = () =>
            Array.from({ length: 9 }, (_, index) => `<span class="seraphina-buckshot-pellet pellet-${index + 1}"></span>`).join('');

        const showAndreaSnipeFx = (targetCards = []) => {
            const targetCard = targetCards[0];
            if (!targetCard) return;
            const face = targetCard.querySelector('.character-face') || targetCard;
            const rect = face.getBoundingClientRect();
            const scope = document.createElement('div');
            scope.className = 'andrea-sniper-board-fx';
            scope.style.setProperty('--scope-x', `${rect.left + rect.width / 2}px`);
            scope.style.setProperty('--scope-y', `${rect.top + rect.height / 2}px`);
            scope.innerHTML = '<span class="sniper-scope-ring"></span><span class="sniper-scope-line sniper-scope-line-h"></span><span class="sniper-scope-line sniper-scope-line-v"></span>';
            document.body.appendChild(scope);
            window.setTimeout(() => {
                playGeneratedIngameSound('sniper-shot');
                showBulletImpactFx(targetCard, 'sniper');
            }, 620);
            window.setTimeout(() => scope.remove(), 1700);
        };

        const showNeganLucilleFx = (targetCards = []) => {
            targetCards.forEach((targetCard, index) => {
                if (!targetCard) return;
                showTemporaryCardFx(
                    targetCard,
                    'negan-lucille-swing-fx',
                    '<span class="negan-lucille-bat"><i></i><b></b></span><span class="negan-lucille-impact"></span>',
                    1850 + index * 90
                );
            });
            playIngameSound(neganAlreadyFuckedSound);
        };

        const showKnifeWoundFx = (targetCards = [], variant = 'throat') => {
            const isGutSlice = variant === 'gut';
            targetCards.forEach((targetCard, index) => {
                if (!targetCard) return;
                showTemporaryCardFx(
                    targetCard,
                    `knife-wound-fx ${isGutSlice ? 'gut-slice' : 'throat-slit'}`,
                    '<span class="knife-blade"></span><span class="knife-cut"></span><span class="knife-blood blood-a"></span><span class="knife-blood blood-b"></span><span class="knife-blood blood-c"></span>',
                    (isGutSlice ? 1650 : 1500) + index * 80
                );
            });
            if (isGutSlice) {
                playIngameSound(neganYouGotNoGutsSound);
            } else {
                playGeneratedIngameSound('damage');
            }
        };

        const getCardCenterPoint = (card, xRatio = 0.5, yRatio = 0.5) => {
            const face = card?.querySelector?.('.character-face') || card;
            const rect = face?.getBoundingClientRect?.();
            if (!rect) return null;
            return {
                x: rect.left + rect.width * xRatio,
                y: rect.top + rect.height * yRatio,
                rect,
            };
        };

        const showSmartgunLockOnFx = (targetCards = []) => {
            targetCards.forEach((targetCard) => {
                if (!targetCard) return;
                showTemporaryCardFx(
                    targetCard,
                    'smartgun-lock-cast-fx',
                    '<span class="smartgun-lock-ring"></span><span class="smartgun-lock-corner a"></span><span class="smartgun-lock-corner b"></span><span class="smartgun-lock-corner c"></span><span class="smartgun-lock-corner d"></span><span class="smartgun-lock-dot"></span>',
                    1550
                );
            });
            playGeneratedIngameSound('target-lock');
        };

        const showPredatorBleederSpearCastFx = ({ actorCard, targetCards = [] }) => {
            const source = getCardCenterPoint(actorCard);
            if (!source) return;
            targetCards.forEach((targetCard, index) => {
                const target = getCardCenterPoint(targetCard, 0.32, 0.45);
                if (!target) return;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const spear = document.createElement('div');
                spear.className = 'predator-bleeder-spear-projectile';
                spear.style.left = `${source.x}px`;
                spear.style.top = `${source.y}px`;
                spear.style.setProperty('--spear-dx', `${dx}px`);
                spear.style.setProperty('--spear-dy', `${dy}px`);
                spear.style.animationDelay = `${index * 90}ms`;
                spear.innerHTML = '<span class="spear-shaft"></span><span class="spear-tip"></span>';
                document.body.appendChild(spear);
                window.setTimeout(() => spear.remove(), 920 + index * 90);
            });
            playGeneratedIngameSound('damage');
        };

        const showCarnageBloodSlashFx = ({ actorCard, targetCards = [] }) => {
            targetCards.forEach((targetCard) => {
                showCarnageTendrilConnection(actorCard, targetCard, 'slash', 1450);
                showTemporaryCardFx(
                    targetCard,
                    'carnage-blood-slash-impact-fx',
                    '<span class="carnage-slash-tendril"></span><span class="carnage-slash-cut"></span><span class="carnage-blood-splash a"></span><span class="carnage-blood-splash b"></span><span class="carnage-blood-splash c"></span>',
                    1700
                );
            });
            playGeneratedIngameSound('damage');
        };

        const showCarnageWideAreaCuttingFx = ({ actorCard, targetCards = [] }) => {
            targetCards.forEach((targetCard, index) => {
                window.setTimeout(() => {
                    showCarnageTendrilConnection(actorCard, targetCard, 'wide', 1700);
                    showTemporaryCardFx(
                        targetCard,
                        'carnage-wide-cut-impact-fx',
                        '<span class="carnage-wide-cut a"></span><span class="carnage-wide-cut b"></span><span class="carnage-wide-cut c"></span><span class="carnage-blood-splash a"></span><span class="carnage-blood-splash b"></span>',
                        1900
                    );
                }, index * 120);
            });
            playGeneratedIngameSound('damage');
        };

        const showCarnageBrainDevourFx = ({ actorCard, targetCards = [] }) => {
            const targetCard = targetCards[0];
            if (!targetCard) return;
            showCarnageTendrilConnection(actorCard, targetCard, 'devour', 2500);
            showTemporaryCardFx(
                targetCard,
                'carnage-brain-devour-impact-fx',
                '<span class="carnage-devour-mouth"></span><span class="carnage-devour-pulse a"></span><span class="carnage-devour-pulse b"></span><span class="carnage-devour-drip a"></span><span class="carnage-devour-drip b"></span>',
                2600
            );
            playGeneratedIngameSound('damage');
        };

        const showCarnageTendrilConnection = (sourceCard, targetCard, variant = 'slash', duration = 1600) => {
            const source = getCardCenterPoint(sourceCard, 0.5, 0.48);
            const target = getCardCenterPoint(targetCard, 0.5, 0.46);
            if (!source || !target) return;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const length = Math.max(32, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const tendril = document.createElement('div');
            tendril.className = `carnage-blood-tendril ${variant}`;
            tendril.style.left = `${source.x}px`;
            tendril.style.top = `${source.y}px`;
            tendril.style.width = `${length}px`;
            tendril.style.transform = `rotate(${angle}deg)`;
            tendril.innerHTML = '<span class="tendril-core"></span><span class="tendril-vein one"></span><span class="tendril-vein two"></span><span class="tendril-drip one"></span><span class="tendril-drip two"></span>';
            document.body.appendChild(tendril);
            window.setTimeout(() => tendril.remove(), duration);
        };

        const showFlashLightningRushFx = (targetCards = []) => {
            targetCards.forEach((targetCard) => {
                showTemporaryCardFx(
                    targetCard,
                    'flash-lightning-rush-hit-fx',
                    '<span class="flash-fist hit-one"></span><span class="flash-fist hit-two"></span><span class="flash-fist hit-three"></span><span class="flash-fist hit-four"></span><span class="flash-red-bolt a"></span><span class="flash-red-bolt b"></span>',
                    1500
                );
            });
            playGeneratedIngameSound('lightning');
        };

        const showFlashInfiniteMassPunchFx = ({ actorCard, targetCards = [] }) => {
            const targetCard = targetCards[0];
            const source = getCardCenterPoint(actorCard);
            const target = getCardCenterPoint(targetCard);
            if (!source || !target) return;
            const run = document.createElement('div');
            run.className = 'flash-infinite-run-screen-fx';
            run.innerHTML = '<span class="flash-runner"></span><span class="flash-run-trail a"></span><span class="flash-run-trail b"></span><span class="flash-run-trail c"></span>';
            document.body.appendChild(run);
            window.setTimeout(() => {
                showTemporaryCardFx(
                    targetCard,
                    'flash-infinite-punch-impact-fx',
                    '<span class="flash-impact-fist"></span><span class="flash-impact-ring"></span><span class="flash-red-bolt a"></span><span class="flash-red-bolt b"></span><span class="flash-red-bolt c"></span>',
                    1700
                );
            }, 760);
            window.setTimeout(() => run.remove(), 1700);
            playGeneratedIngameSound('lightning');
        };

        const showFlashSpeedStealCastFx = ({ actorCard }) => {
            showTemporaryCardFx(
                actorCard,
                'flash-speed-steal-cast-fx',
                '<span></span><span></span><span></span>',
                1450
            );
            showFlashSpeedStealPressureOverlay(1800, true);
        };

        const showFlashSpeedStealPressureOverlay = (duration = 1700, castOnly = false) => {
            const existing = document.querySelector('.flash-speed-steal-pressure-fx');
            existing?.remove();
            const overlay = document.createElement('div');
            overlay.className = 'flash-speed-steal-pressure-fx';
            if (castOnly) overlay.classList.add('cast-only');
            overlay.innerHTML = '<span class="speed-steal-warning">-20 SEC</span><span class="speed-steal-subtext">MOVE NOW</span>';
            document.body.appendChild(overlay);
            playGeneratedIngameSound('speed-steal-alarm');
            window.setTimeout(() => overlay.remove(), duration);
        };

        const normalizeScorpionVenom = (value = '') => {
            const normalized = String(value || '').trim().toLowerCase();
            if (normalized.includes('neuro')) return 'neurotoxin';
            if (normalized.includes('acid')) return 'acid';
            if (normalized.includes('paralytic')) return 'paralytic';
            return 'acid';
        };

        const getScorpionVenomForActorSlot = (actorSlot) => {
            const unit = Number.isInteger(actorSlot) && currentPlayerUsername
                ? latestBoardState?.[currentPlayerUsername]?.[actorSlot]
                : null;
            const venomStatus = getActiveStatuses(unit).find((status) => status?.id === 'scorpion_passive_scorpion_venom');
            return normalizeScorpionVenom(venomStatus?.metadata?.currentVenom);
        };

        const showScorpionTailStingFx = ({ actorCard, actorSlot, targetCards = [] }) => {
            const venom = getScorpionVenomForActorSlot(actorSlot);
            targetCards.forEach((targetCard) => {
                showTemporaryCardFx(
                    targetCard,
                    `scorpion-tail-sting-fx venom-${venom}`,
                    '<span class="scorpion-tail-arc"></span><span class="scorpion-stinger"></span><span class="scorpion-venom-splash a"></span><span class="scorpion-venom-splash b"></span><span class="scorpion-venom-splash c"></span>',
                    1700
                );
            });
            showTemporaryCardFx(actorCard, `scorpion-tail-ready-fx venom-${venom}`, '<span></span>', 1050);
            playGeneratedIngameSound('damage');
        };

        const showScorpionTailLaserFx = ({ actorCard, actorSlot, targetCards = [] }) => {
            const venom = getScorpionVenomForActorSlot(actorSlot);
            const source = getCardCenterPoint(actorCard, 0.56, 0.32);
            if (!source) return;
            targetCards.forEach((targetCard) => {
                const target = getCardCenterPoint(targetCard, 0.5, 0.45);
                if (!target) return;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const length = Math.max(28, Math.sqrt(dx * dx + dy * dy));
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                const beam = document.createElement('div');
                beam.className = `scorpion-tail-laser-beam venom-${venom}`;
                beam.style.left = `${source.x}px`;
                beam.style.top = `${source.y}px`;
                beam.style.width = `${length}px`;
                beam.style.transform = `rotate(${angle}deg)`;
                beam.innerHTML = '<span></span><span></span>';
                document.body.appendChild(beam);
                showTemporaryCardFx(
                    targetCard,
                    `scorpion-tail-laser-impact-fx venom-${venom}`,
                    '<span></span><span></span><span></span>',
                    1350
                );
                window.setTimeout(() => beam.remove(), 1150);
            });
            playGeneratedIngameSound('laser-red');
        };

        const showVenomBiteFx = (targetCards = []) => {
            targetCards.forEach((targetCard) => {
                showTemporaryCardFx(
                    targetCard,
                    'venom-bite-crunch-fx',
                    '<span class="venom-teeth upper-left"></span><span class="venom-teeth upper-right"></span><span class="venom-teeth lower-left"></span><span class="venom-teeth lower-right"></span><span class="venom-bite-goo a"></span><span class="venom-bite-goo b"></span>',
                    1500
                );
            });
            playGeneratedIngameSound('damage');
        };

        const showVenomTendrilConnection = (sourceCard, targetCard, variant = 'pull', duration = 1600) => {
            const source = getCardCenterPoint(sourceCard, 0.5, 0.48);
            const target = getCardCenterPoint(targetCard, 0.5, 0.48);
            if (!source || !target) return;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const length = Math.max(34, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const tendril = document.createElement('div');
            tendril.className = `venom-symbiote-tendril ${variant}`;
            tendril.style.left = `${source.x}px`;
            tendril.style.top = `${source.y}px`;
            tendril.style.width = `${length}px`;
            tendril.style.transform = `rotate(${angle}deg)`;
            tendril.innerHTML = '<span class="venom-tendril-core"></span><span class="venom-tendril-vein a"></span><span class="venom-tendril-vein b"></span><span class="venom-tendril-drip a"></span><span class="venom-tendril-drip b"></span>';
            document.body.appendChild(tendril);
            window.setTimeout(() => tendril.remove(), duration);
        };

        const showVenomPullingTendrilsFx = ({ actorCard, targetCards = [] }) => {
            targetCards.forEach((targetCard, index) => {
                window.setTimeout(() => {
                    showVenomTendrilConnection(actorCard, targetCard, 'pull', 1750);
                    showTemporaryCardFx(
                        targetCard,
                        'venom-tendril-latch-fx',
                        '<span class="venom-latch-ring"></span><span class="venom-latch-hook a"></span><span class="venom-latch-hook b"></span><span class="venom-latch-goo a"></span><span class="venom-latch-goo b"></span>',
                        1800
                    );
                }, index * 90);
            });
            playGeneratedIngameSound('web');
        };

        const showVenomWebWrapFx = ({ actorCard, targetCards = [] }) => {
            targetCards.forEach((targetCard) => {
                showVenomTendrilConnection(actorCard, targetCard, 'web', 1450);
                showTemporaryCardFx(
                    targetCard,
                    'venom-web-cocoon-fx',
                    '<span class="venom-web-strand a"></span><span class="venom-web-strand b"></span><span class="venom-web-strand c"></span><span class="venom-web-strand d"></span><span class="venom-web-goo a"></span><span class="venom-web-goo b"></span>',
                    2100
                );
            });
            playGeneratedIngameSound('web');
        };

        const showNeganTheIronCastFx = (targetCards = []) => {
            targetCards.forEach((targetCard) => {
                showTemporaryCardFx(
                    targetCard,
                    'negan-iron-slam-fx',
                    '<img src="https://i.imgur.com/jHlzlE9.png" alt=""><span class="negan-iron-slam-glow"></span><span class="negan-iron-slam-smoke a"></span><span class="negan-iron-slam-smoke b"></span>',
                    1900
                );
            });
            playGeneratedIngameSound('damage');
        };

        const showParasiteTendrilConnection = (sourceCard, targetCard, variant = 'drain', duration = 1250) => {
            const source = getCardCenterPoint(sourceCard, 0.5, 0.48);
            const target = getCardCenterPoint(targetCard, 0.5, 0.48);
            if (!source || !target) return;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const length = Math.max(34, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const tendril = document.createElement('div');
            tendril.className = `parasite-drain-tendril ${variant}`;
            tendril.style.left = `${source.x}px`;
            tendril.style.top = `${source.y}px`;
            tendril.style.width = `${length}px`;
            tendril.style.transform = `rotate(${angle}deg)`;
            tendril.innerHTML = '<span class="parasite-tendril-core"></span><span class="parasite-tendril-pulse"></span>';
            document.body.appendChild(tendril);
            window.setTimeout(() => tendril.remove(), duration);
        };

        const showParasiteLifeLeechFx = ({ actorCard, selection, targetCards = [] }) => {
            actorCard?.classList.remove('parasite-toxic-flash');
            if (actorCard) {
                void actorCard.offsetWidth;
                actorCard.classList.add('parasite-toxic-flash');
                window.setTimeout(() => actorCard.classList.remove('parasite-toxic-flash'), 760);
            }
            targetCards.forEach((targetCard) => {
                const isEnemyTarget = targetCard.closest('.enemy-characters');
                if (isEnemyTarget) {
                    showParasiteTendrilConnection(actorCard, targetCard, 'drain', 1350);
                    showTemporaryCardFx(
                        targetCard,
                        'parasite-life-leech-enemy-fx',
                        '<span class="parasite-darken"></span><span class="parasite-return-orb"></span>',
                        1500
                    );
                } else {
                    showTemporaryCardFx(
                        targetCard,
                        'parasite-life-leech-ally-fx',
                        '<span class="parasite-biomass-wrap"></span><span class="parasite-green-pulse"></span><span class="parasite-dd-pop">+15 DD</span>',
                        1500
                    );
                }
            });
            playGeneratedIngameSound('status-helpful');
        };

        const showParasiteMetabolicCollapseFx = (targetCards = []) => {
            const flash = document.createElement('div');
            flash.className = 'parasite-metabolic-screen-flash';
            document.body.appendChild(flash);
            window.setTimeout(() => flash.remove(), 780);
            targetCards.forEach((targetCard) => {
                showTemporaryCardFx(
                    targetCard,
                    'parasite-metabolic-collapse-fx',
                    '<span class="parasite-corruption-symbol a"></span><span class="parasite-corruption-symbol b"></span><span class="parasite-corruption-symbol c"></span><span class="parasite-crack-overlay"></span><span class="parasite-debuff-stamp chain"></span><span class="parasite-debuff-stamp cross"></span><span class="parasite-debuff-stamp shield"></span>',
                    1900
                );
            });
            playGeneratedIngameSound('damage');
        };

        const showParasiteEnergyTransferFx = ({ actorCard, targetCards = [] }) => {
            actorCard?.classList.add('parasite-toxic-flash');
            window.setTimeout(() => actorCard?.classList.remove('parasite-toxic-flash'), 780);
            targetCards.forEach((targetCard) => {
                showParasiteTendrilConnection(actorCard, targetCard, 'transfer', 1350);
                showTemporaryCardFx(
                    targetCard,
                    'parasite-energy-transfer-fx',
                    '<span class="parasite-shield-shimmer"></span><span class="parasite-complete-icon one"></span><span class="parasite-complete-icon two"></span><span class="parasite-complete-icon three"></span>',
                    1800
                );
            });
            playGeneratedIngameSound('status-helpful');
        };

        const showParasiteHostMutationFx = (actorCard) => {
            if (!actorCard) return;
            showTemporaryCardFx(
                actorCard,
                'parasite-host-mutation-cast-fx',
                '<span class="parasite-mutation-burst"></span><span class="parasite-mutation-jaw"></span><span class="parasite-mutation-eyes"></span>',
                1700
            );
            playGeneratedIngameSound('status-helpful');
        };

        const showParasitePredatoryOverloadFx = () => {
            const existing = document.querySelector('.parasite-overload-screen-fx');
            existing?.remove();
            const overlay = document.createElement('div');
            overlay.className = 'parasite-overload-screen-fx';
            overlay.innerHTML = '<span class="parasite-overload-wave"></span><span class="parasite-overload-text">PREDATORY OVERLOAD</span>';
            document.body.appendChild(overlay);
            window.setTimeout(() => overlay.remove(), 2300);
            playGeneratedIngameSound('status-harmful');
        };

        const showAquamanTidalWaveFx = () => {
            const existing = document.querySelector('.aquaman-tidal-wave-screen-fx');
            if (existing) existing.remove();
            const wave = document.createElement('div');
            wave.className = 'aquaman-tidal-wave-screen-fx';
            wave.innerHTML =
                '<span class="aquaman-tidal-wave-crest"></span>' +
                '<span class="aquaman-tidal-wave-surge"></span>' +
                '<span class="aquaman-tidal-wave-foam one"></span>' +
                '<span class="aquaman-tidal-wave-foam two"></span>' +
                '<span class="aquaman-tidal-wave-spray"></span>';
            document.body.appendChild(wave);
            playGeneratedIngameSound('tidal-wave');
            window.setTimeout(() => wave.remove(), 2600);
        };

        const showDirectionalSkillFx = ({ actorCard, actorSlot, skill, selection }) => {
            const skillId = skill?.id || '';
            const isRedLaser = [
                'superman-laser-eyes',
                'superman-laser-eyes-empowered',
                'homelander-laser-death-beam',
                'homelander-laser-death-beam-empowered',
            ].includes(skillId);
            const isYellowLaser = skillId === 'billy-butcher-yellow-death-lasers';
            const isFrostBreath = skillId === 'superman-frost-breath' || skillId === 'superman-frost-breath-empowered';
            const isSolarFlare = skillId === 'superman-solar-flare';
            const isAndreaSnipe = skillId === 'andrea-snipe';
            const isAndreaQuickShot = skillId === 'andrea-quick-shot';
            const isRickRevolver = skillId === 'rick-grimes-357-revolver';
            const isSeraphinaShotgun = skillId === 'seraphina-vale-pump-shotgun';
            const isRickThroatSlit = skillId === 'rick-grimes-throat-slit';
            const isNeganAlreadyFucked = skillId === 'negan-you-re-already-fucked';
            const isNeganYouGotNoGuts = skillId === 'negan-you-got-no-guts';
            const isAquamanTidalWave = skillId === 'aquaman-tidal-wave';
            const isSmartgunLockOn = skillId === 'space-marine-smartgunner-smartgun-lock-on';
            const isPredatorBleederSpear = skillId === 'predator-stalker-bleeder-spear';
            const isCarnageBloodSlash = skillId === 'carnage-blood-slash';
            const isCarnageWideAreaCutting = skillId === 'carnage-wide-area-cutting';
            const isCarnageBrainDevour = skillId === 'carnage-brain-devour';
            const isFlashLightningRush = skillId === 'the-flash-barry-allen-lightning-rush';
            const isFlashInfiniteMassPunch =
                skillId === 'the-flash-barry-allen-infinite-mass-punch' ||
                skillId === 'the-flash-barry-allen-infinite-mass-punch-speed-up';
            const isFlashSpeedSteal =
                skillId === 'the-flash-barry-allen-speed-steal' ||
                skillId === 'the-flash-barry-allen-flashpoint-surge';
            const isScorpionSting = skillId === 'scorpion-scorpion-sting';
            const isScorpionTailLaser = skillId === 'scorpion-tail-laser';
            const isVenomBite = skillId === 'venom-ravenous-bite' || skillId === 'venom-ravenous-bite-empowered';
            const isVenomPullingTendrils = skillId === 'venom-pulling-tendrils';
            const isVenomWebWrap = skillId === 'venom-venom-web-wrap';
            const isNeganTheIron = skillId === 'negan-the-iron';
            const isParasiteLifeLeech = skillId === 'parasite-life-leech';
            const isParasiteMetabolicCollapse = skillId === 'parasite-metabolic-collapse';
            const isParasiteEnergyTransfer = skillId === 'parasite-energy-transfer';
            const isParasiteHostMutation = skillId === 'parasite-host-mutation';
            const isParasitePredatoryOverload = skillId === 'parasite-predatory-overload';
            const isGenericLaser = !isRedLaser && !isYellowLaser && skillId.includes('laser');
            if (
                !isRedLaser &&
                !isYellowLaser &&
                !isFrostBreath &&
                !isSolarFlare &&
                !isAndreaSnipe &&
                !isAndreaQuickShot &&
                !isRickRevolver &&
                !isSeraphinaShotgun &&
                !isRickThroatSlit &&
                !isNeganAlreadyFucked &&
                !isNeganYouGotNoGuts &&
                !isAquamanTidalWave &&
                !isSmartgunLockOn &&
                !isPredatorBleederSpear &&
                !isCarnageBloodSlash &&
                !isCarnageWideAreaCutting &&
                !isCarnageBrainDevour &&
                !isFlashLightningRush &&
                !isFlashInfiniteMassPunch &&
                !isFlashSpeedSteal &&
                !isScorpionSting &&
                !isScorpionTailLaser &&
                !isVenomBite &&
                !isVenomPullingTendrils &&
                !isVenomWebWrap &&
                !isNeganTheIron &&
                !isParasiteLifeLeech &&
                !isParasiteMetabolicCollapse &&
                !isParasiteEnergyTransfer &&
                !isParasiteHostMutation &&
                !isParasitePredatoryOverload &&
                !isGenericLaser
            ) {
                return;
            }
            const targetCards = getTargetCardsFromSelection(selection);
            if (isParasiteLifeLeech) {
                showParasiteLifeLeechFx({ actorCard, selection, targetCards });
                return;
            }
            if (isParasiteMetabolicCollapse) {
                showParasiteMetabolicCollapseFx(targetCards);
                return;
            }
            if (isParasiteEnergyTransfer) {
                showParasiteEnergyTransferFx({ actorCard, targetCards });
                return;
            }
            if (isParasiteHostMutation) {
                showParasiteHostMutationFx(actorCard);
                return;
            }
            if (isParasitePredatoryOverload) {
                showParasitePredatoryOverloadFx();
                return;
            }
            if (isVenomBite) {
                showVenomBiteFx(targetCards);
                return;
            }
            if (isVenomPullingTendrils) {
                showVenomPullingTendrilsFx({ actorCard, targetCards });
                return;
            }
            if (isVenomWebWrap) {
                showVenomWebWrapFx({ actorCard, targetCards });
                return;
            }
            if (isNeganTheIron) {
                showNeganTheIronCastFx(targetCards);
                return;
            }
            if (isAquamanTidalWave) {
                showAquamanTidalWaveFx();
                return;
            }
            if (isFlashSpeedSteal) {
                showFlashSpeedStealCastFx({ actorCard });
                return;
            }
            if (isSolarFlare) {
                showSolarFlareFx(actorCard);
                return;
            }
            if (isSmartgunLockOn) {
                showSmartgunLockOnFx(targetCards);
                return;
            }
            if (isPredatorBleederSpear) {
                showPredatorBleederSpearCastFx({ actorCard, targetCards });
                return;
            }
            if (isCarnageBloodSlash) {
                showCarnageBloodSlashFx({ actorCard, targetCards });
                return;
            }
            if (isCarnageWideAreaCutting) {
                showCarnageWideAreaCuttingFx({ actorCard, targetCards });
                return;
            }
            if (isCarnageBrainDevour) {
                showCarnageBrainDevourFx({ actorCard, targetCards });
                return;
            }
            if (isFlashLightningRush) {
                showFlashLightningRushFx(targetCards);
                return;
            }
            if (isFlashInfiniteMassPunch) {
                showFlashInfiniteMassPunchFx({ actorCard, targetCards });
                return;
            }
            if (isScorpionSting) {
                showScorpionTailStingFx({ actorCard, actorSlot, targetCards });
                return;
            }
            if (isScorpionTailLaser) {
                showScorpionTailLaserFx({ actorCard, actorSlot, targetCards });
                return;
            }
            if (isAndreaSnipe) {
                showAndreaSnipeFx(targetCards);
                return;
            }
            if (isAndreaQuickShot) {
                playGeneratedIngameSound('quick-shot');
                targetCards.forEach((targetCard) => showBulletImpactFx(targetCard, 'quick'));
                return;
            }
            if (isRickRevolver) {
                playGeneratedIngameSound('revolver');
                targetCards.forEach((targetCard) => showBulletImpactFx(targetCard, 'revolver'));
                return;
            }
            if (isSeraphinaShotgun) {
                playGeneratedIngameSound('shotgun');
                targetCards.forEach((targetCard) => {
                    showTemporaryCardFx(targetCard, 'seraphina-buckshot-impact-fx burst', buildSeraphinaBuckshotHtml(), 2100);
                });
                return;
            }
            if (isRickThroatSlit) {
                showKnifeWoundFx(targetCards, 'throat');
                return;
            }
            if (isNeganAlreadyFucked) {
                showNeganLucilleFx(targetCards);
                return;
            }
            if (isNeganYouGotNoGuts) {
                showKnifeWoundFx(targetCards, 'gut');
                return;
            }
            if (isGenericLaser) {
                playGeneratedIngameSound('laser-red');
                return;
            }
            const empowered = skillId.endsWith('-empowered');
            targetCards.forEach((targetCard) => {
                if (isFrostBreath) {
                    showCombatBeam({ sourceCard: actorCard, targetCard, frost: true, empowered });
                    showTemporaryCardFx(
                        targetCard,
                        `superman-frost-impact-fx${empowered ? ' empowered' : ''}`,
                        '<span></span><span></span><span></span>',
                        empowered ? 2200 : 1700
                    );
                    playGeneratedIngameSound('frost-breath');
                    return;
                }
                showCombatBeam({
                    sourceCard: actorCard,
                    targetCard,
                    color: isYellowLaser ? 'yellow' : 'red',
                    empowered,
                });
                playGeneratedIngameSound(empowered ? 'laser-empowered' : isYellowLaser ? 'laser-yellow' : 'laser-red');
            });
        };

        const showStormSkillPortraitFx = (skill, selection) => {
            const skillId = skill?.id || '';
            if (!skillId.startsWith('storm-lightning-strike') && !skillId.startsWith('storm-wind-funnel')) return;
            if (skillId === 'storm-lightning-strike-rainstorm') {
                playGeneratedIngameSound('lightning');
                const enemyUnits = Array.isArray(latestBoardState?.[currentOpponentUsername])
                    ? latestBoardState[currentOpponentUsername]
                    : [];
                enemyUnits.forEach((unit, slot) => {
                    if (!unit || isUnitDeadLike(unit)) return;
                    const targetCard = getCardByUsernameSlot(currentOpponentUsername || '', slot);
                    if (!targetCard) return;
                    showTemporaryCardFx(
                        targetCard,
                        'storm-lightning-fx',
                        '<span class="storm-lightning-cloud"></span><span class="storm-lightning-bolt"></span>',
                        1900
                    );
                });
                return;
            }
            normalizeTargetSelectionList(selection).forEach((target) => {
                const targetSlot = Number.parseInt(target?.slot, 10);
                const targetCard = getCardByUsernameSlot(target?.username || '', targetSlot);
                if (!targetCard) return;
                if (skillId.startsWith('storm-lightning-strike')) {
                    playGeneratedIngameSound('lightning');
                    showTemporaryCardFx(
                        targetCard,
                        'storm-lightning-fx',
                        '<span class="storm-lightning-cloud"></span><span class="storm-lightning-bolt"></span>',
                        1900
                    );
                } else if (skillId.startsWith('storm-wind-funnel')) {
                    playGeneratedIngameSound('wind');
                    showTemporaryCardFx(
                        targetCard,
                        'storm-wind-fx',
                        '<span></span><span></span><span></span>',
                        1900
                    );
                }
            });
        };

        const animateTurnStartSweep = (turnOwner) => {
            const container =
                turnOwner && turnOwner === currentPlayerUsername
                    ? document.querySelector('.player-characters')
                    : turnOwner && turnOwner === currentOpponentUsername
                    ? document.querySelector('.enemy-characters')
                    : null;
            if (!container) return;
            container.classList.remove('turn-start-sweep');
            void container.offsetWidth;
            container.classList.add('turn-start-sweep');
            window.setTimeout(() => container.classList.remove('turn-start-sweep'), 780);
        };

        const updateTimerBar = () => {
            if (!timerBar) return;
            if (!turnExpiresAtMs) {
                timerBar.style.width = `${TIMER_MAX_WIDTH}px`;
                if (timerCountdown) {
                    timerCountdown.textContent = String(Math.ceil((currentTurnDurationMs || TURN_DURATION_MS) / 1000));
                }
                return;
            }
            const remaining = Math.max(0, turnExpiresAtMs - Date.now());
            const ratio = remaining / Math.max(1, currentTurnDurationMs || TURN_DURATION_MS);
            const widthPx = Math.max(0, Math.round(TIMER_MAX_WIDTH * ratio));
            timerBar.style.width = `${widthPx}px`;
            if (timerCountdown) {
                timerCountdown.textContent = String(Math.ceil(remaining / 1000));
            }
            if (
                remaining <= 0 &&
                currentPlayerUsername &&
                usernamesMatch(currentTurnUsername, currentPlayerUsername) &&
                normalizePendingTurn(pendingTurnState).unresolvedRandom === 0 &&
                !normalizePendingTurn(pendingTurnState).turnStartChoice &&
                !autoEndRequested
            ) {
                autoEndRequested = true;
                endTurnDueToTimeout();
            }
        };

        const startTimerLoop = () => {
            if (turnTimerInterval) return;
            turnTimerInterval = setInterval(updateTimerBar, 200);
        };

        const endTurnDueToTimeout = async () => {
            if (!matchIdFromUrl) return;
            const resolutionAnimationEntries = getQueuedResolutionAnimationEntries();
            try {
                const response = await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/end`, {
                    method: 'POST',
                    credentials: 'include',
                });
                const data = await response.json().catch(() => null);
                if (response.ok && data?.ok) {
                    await applyMatchStateAfterResolutionSequence(data, resolutionAnimationEntries);
                }
            } catch (error) {
                console.warn('Failed to auto-end turn on timeout.', error);
            }
        };

        const syncTurnState = (turnOwner, turnExpiresAt, turnDurationMs) => {
            const parsedExpiry = turnExpiresAt ? new Date(turnExpiresAt).getTime() : null;
            const turnChanged = turnOwner && turnOwner !== lastTurnOwner;
            const resolvedDurationMs = Math.max(1000, Number(turnDurationMs) || TURN_DURATION_MS);
            if (turnChanged) {
                lastTurnOwner = turnOwner;
                autoEndRequested = false;
            }
            currentTurnDurationMs = resolvedDurationMs;
            if (parsedExpiry) {
                turnExpiresAtMs = parsedExpiry;
            } else if (turnChanged) {
                turnExpiresAtMs = Date.now() + currentTurnDurationMs;
            }
            currentTurnUsername = turnOwner || null;
            const isPlayersTurn = currentPlayerUsername && currentTurnUsername
                ? usernamesMatch(currentPlayerUsername, currentTurnUsername)
                : false;
            if (turnChanged && hasInitializedTurnState && isPlayersTurn) {
                playIngameSound(startRoundSound);
            }
            if (turnChanged && hasInitializedTurnState) {
                animateTurnStartSweep(turnOwner);
            }
            const pressureTurnKey = `${turnOwner || ''}:${turnExpiresAt || ''}:${resolvedDurationMs}`;
            if (
                turnChanged &&
                hasInitializedTurnState &&
                isPlayersTurn &&
                resolvedDurationMs < TURN_DURATION_MS &&
                lastSpeedStealPressureTurnKey !== pressureTurnKey
            ) {
                lastSpeedStealPressureTurnKey = pressureTurnKey;
                showFlashSpeedStealPressureOverlay(2300);
            }
            if (turnOwner && !hasInitializedTurnState) {
                hasInitializedTurnState = true;
            }
            if (!currentPlayerUsername || !currentTurnUsername) {
                setSkillInteractivity(true);
                startTimerLoop();
                updateTimerBar();
                clearTargetHighlights();
                updateSkillAffordability();
                return;
            }
            const turnStartChoice = normalizePendingTurn(pendingTurnState).turnStartChoice;
            const hasTurnStartChoice = Boolean(
                turnStartChoice &&
                    Array.isArray(turnStartChoice.options) &&
                    turnStartChoice.options.length > 0
            );
            setSkillInteractivity(isPlayersTurn);
            startTimerLoop();
            updateTimerBar();
            if (isPlayersTurn && hasTurnStartChoice) {
                setSkillInteractivity(false);
                const popupKey = `${turnStartChoice.sourceStatusId || ''}:${turnStartChoice.usesUsed || 0}`;
                if (activeTurnStartChoiceKey !== popupKey) {
                    activeTurnStartChoiceKey = popupKey;
                    openTurnStartChoicePopup({
                        promptText: turnStartChoice.promptText || "Choose Doctor's Bag effect.",
                        options: turnStartChoice.options || [],
                    });
                }
            } else {
                if (activeChoicePopupMode === 'turn-start') {
                    closeClassChoicePopup();
                }
            }
            if (!isPlayersTurn) {
                const skillImgs = Array.from(
                    document.querySelectorAll('.player-characters .skillscrollingame .skillimage')
                );
                skillImgs.forEach((img) => {
                    img.classList.remove('selected-target');
                    img.style.transform = '';
                });
                queuedSkillKeySet.clear();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
                closeEndTurnModal();
                if (activeChoicePopupMode === 'turn-start') {
                    closeClassChoicePopup();
                }
            }
            updateSkillAffordability();
        };

        try {
            const cachedUser = JSON.parse(localStorage.getItem('comicUser') || '{}');
            if (cachedUser?.username) {
                currentPlayerUsername = cachedUser.username;
            }
        } catch (error) {
            console.warn('Unable to parse cached user for ingame turn state.', error);
        }

        const renderChakra = (pool = {}) => {
            if (!chakraDisplay) return;
            const normalizedPool = normalizePool(pool);
            playerPoolState = normalizedPool;
            Object.entries(chakraCountEls || {}).forEach(([type, el]) => {
                if (!el) return;
                if (type === 'total') {
                    const totalAmount =
                        normalizedPool.taijutsu +
                        normalizedPool.ninjutsu +
                        normalizedPool.bloodline +
                        normalizedPool.genjutsu;
                    el.textContent = `x ${totalAmount}`;
                } else {
                    const amount = normalizedPool[type] || 0;
                    el.textContent = `x ${amount}`;
                }
            });
            updateSkillAffordability();
            if (exchangeModalEl && exchangeModalEl.style.visibility === 'visible') {
                renderExchangeModal(normalizedPool);
            }
        };

        const renderEndTurnModal = (pool = {}, pending = null) => {
            const normalizedPool = normalizePool(pool);
            const normalizedPending = normalizePendingTurn(pending);
            Object.entries(normalizedPool).forEach(([type, amount]) => {
                const leftEl = endTurnLeftAmountEls[type];
                if (leftEl) {
                    leftEl.textContent = String(amount);
                }
            });
            Object.entries(normalizedPending.randomAssignments).forEach(([type, amount]) => {
                const rightEl = endTurnRightAmountEls[type];
                if (rightEl) {
                    rightEl.textContent = String(amount);
                }
            });
            if (endTurnChooseCountEl) {
                endTurnChooseCountEl.textContent = String(normalizedPending.unresolvedRandom || 0);
            }
            updateEndTurnButtons();
        };

        const openEndTurnModal = () => {
            if (!endTurnModalEl || !matchIdFromUrl) return;
            // Show immediately from the last known client state; refresh in the background below.
            endTurnModalEl.style.visibility = 'visible';
            renderEndTurnModal(playerPoolState, pendingTurnState);
            const requestMutationVersion = randomChakraMutationVersion;
            fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}`, {
                credentials: 'include',
            })
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error('Unable to load match state.');
                    }
                    const data = await res.json();
                    if (!data?.ok) {
                        throw new Error('Unable to load match state.');
                    }
                    if (data.player?.username) {
                        currentPlayerUsername = data.player.username;
                    }
                    if (requestMutationVersion !== randomChakraMutationVersion) {
                        return;
                    }
                    const playerPool = data.chakraPools?.[currentPlayerUsername] || {};
                    pendingTurnState = normalizePendingTurn(data.pendingTurn);
                    if (endTurnModalEl?.style.visibility === 'visible') {
                        renderEndTurnModal(playerPool, pendingTurnState);
                    }
                })
                .catch((error) => {
                    console.warn('Unable to load end turn chakra preview.', error);
                });
        };

        const closeEndTurnModal = () => {
            if (!endTurnModalEl) return;
            endTurnModalEl.style.visibility = 'hidden';
        };

        const getExchangeTypeFromButton = (button) => {
            return (
                resolveChakraType(button?.getAttribute('data-chakra-type')) ||
                resolveChakraType(button?.getAttribute('aria-label'))
            );
        };

        const updateExchangeChoiceUi = () => {
            exchangeChoiceButtons.forEach((button) => {
                const type = getExchangeTypeFromButton(button);
                button.classList.toggle('selected', type === selectedExchangeType);
            });
        };

        const getExchangeAssignedTotal = () =>
            chakraTypes.reduce(
                (sum, type) => sum + Math.max(0, Number(exchangeSpendAssignments?.[type]) || 0),
                0
            );

        const adjustExchangeSpend = (chakraType, delta) => {
            if (!chakraTypes.includes(chakraType)) return;
            const current = Math.max(0, Number(exchangeSpendAssignments[chakraType]) || 0);
            const assignedTotal = getExchangeAssignedTotal();
            if (delta > 0) {
                if (assignedTotal >= EXCHANGE_CHAKRA_COST) return;
                const availableFromPool = Math.max(0, Number(playerPoolState[chakraType]) || 0);
                if (current >= availableFromPool) return;
                exchangeSpendAssignments[chakraType] = current + 1;
                return;
            }
            if (delta < 0 && current > 0) {
                exchangeSpendAssignments[chakraType] = current - 1;
            }
        };

        const renderExchangeModal = (pool = {}) => {
            if (!exchangeModalEl) return;
            const normalizedPool = normalizePool(pool);
            const columns = Array.from(exchangeModalEl.querySelectorAll('.exchange_chakra_column'));
            const leftRows = Array.from(columns[0]?.querySelectorAll('.exchange_chakra_row') || []);
            const rightRows = Array.from(columns[1]?.querySelectorAll('.exchange_chakra_row') || []);
            leftRows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (!name || !amountEl) return;
                const assigned = Math.max(0, Number(exchangeSpendAssignments[name]) || 0);
                amountEl.textContent = String(Math.max(0, (normalizedPool[name] || 0) - assigned));
            });
            rightRows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (!name || !amountEl) return;
                amountEl.textContent = String(Math.max(0, Number(exchangeSpendAssignments[name]) || 0));
            });
            if (exchangeChooseCountEl) {
                const remaining = Math.max(0, EXCHANGE_CHAKRA_COST - getExchangeAssignedTotal());
                exchangeChooseCountEl.textContent = String(remaining);
            }
            if (exchangeOkButton) {
                const ready = getExchangeAssignedTotal() === EXCHANGE_CHAKRA_COST;
                exchangeOkButton.disabled = !ready;
                exchangeOkButton.style.opacity = ready ? '1' : '0.45';
            }
            updateExchangeChoiceUi();
        };

        const openExchangeModal = () => {
            if (!exchangeModalEl || battleEndShown) return;
            if (!currentPlayerUsername || !currentTurnUsername) return;
            if (!usernamesMatch(currentPlayerUsername, currentTurnUsername)) return;
            closeEndTurnModal();
            exchangeSpendAssignments = emptyPool();
            renderExchangeModal(playerPoolState);
            exchangeModalEl.style.visibility = 'visible';
        };

        const closeExchangeModal = () => {
            if (!exchangeModalEl) return;
            exchangeSpendAssignments = emptyPool();
            renderExchangeModal(playerPoolState);
            exchangeModalEl.style.visibility = 'hidden';
        };

        const openSurrenderConfirm = () => {
            if (!surrenderConfirmEl) return;
            surrenderConfirmEl.style.visibility = 'visible';
        };

        const closeSurrenderConfirm = () => {
            if (!surrenderConfirmEl) return;
            surrenderConfirmEl.style.visibility = 'hidden';
        };

        const stopMatchRealtime = () => {
            clearMatchSocketReconnect();
            closeMatchSocket();
            if (turnTimerInterval) {
                clearInterval(turnTimerInterval);
                turnTimerInterval = null;
            }
        };

        const getAliveCountFromUnits = (units) => {
            if (!Array.isArray(units)) return 0;
            return units.reduce((sum, unit) => {
                const isDead = isUnitDeadLike(unit);
                return sum + (isDead ? 0 : 1);
            }, 0);
        };

        const showBattleEndOverlay = ({ didWin, opponentUsername, expDelta = null, clanExpDelta = null }) => {
            if (!battleEndOverlayEl || battleEndShown) return;
            const opponent = (opponentUsername || currentOpponentUsername || 'UNKNOWN').trim();
            const isLadderMatch = currentMatchMode === 'ladder';
            const normalizedExpDelta = Number.isFinite(Number(expDelta)) ? Number(expDelta) : 0;
            const expMagnitude = Math.abs(normalizedExpDelta).toLocaleString();
            const normalizedClanExpDelta = Math.max(0, Number(clanExpDelta) || 0);
            const clanExpLine =
                normalizedClanExpDelta > 0
                    ? `<br>YOUR CLAN GAINED ${normalizedClanExpDelta.toLocaleString()} EXP`
                    : '';
            if (battleEndPortraitEl) {
                battleEndPortraitEl.src = didWin ? 'assets/images/win.png' : 'assets/images/lose.png';
                battleEndPortraitEl.alt = didWin ? 'Victory portrait' : 'Defeated portrait';
            }
            if (battleEndTitleEl) {
                battleEndTitleEl.textContent = didWin ? 'WINNER' : 'LOSER';
            }
            if (battleEndMessageEl) {
                battleEndMessageEl.innerHTML = didWin
                    ? isLadderMatch
                        ? `YOU WON A LADDER BATTLE AGAINST ${opponent}.<br>YOU GAINED ${expMagnitude} EXP${clanExpLine}`
                        : currentMatchMode === 'private'
                            ? `YOU WIN!<br>YOU WON A PRIVATE GAME AGAINST ${opponent}`
                        : `CONGRATULATIONS!<br>YOU HAVE WON A QUICK BATTLE AGAINST ${opponent}.`
                    : isLadderMatch
                        ? `YOU LOST A LADDER BATTLE AGAINST ${opponent}.<br>YOU LOST ${expMagnitude} EXP`
                        : currentMatchMode === 'private'
                            ? `TOO BAD!<br>YOU LOST A PRIVATE GAME AGAINST ${opponent}`
                        : `TOO BAD!<br>YOU HAVE LOST A QUICK BATTLE AGAINST ${opponent}.`;
            }
            battleEndOverlayEl.classList.add('visible');
            battleEndShown = true;
            playIngameSound(didWin ? winSound : lostSound);
            soundManager.syncAmbientEffects([]);
            stopMatchRealtime();
            closeEndTurnModal();
            closeExchangeModal();
            closeSurrenderConfirm();
            clearTargetHighlights();
            activeTargetOptions = null;
            activeCastingSkill = null;
        };

        const MAX_HP = 100;
        const HEALTH_BAR_MAX_WIDTH = 75;
        const roundCombatDisplayAmountUp = (amount) => {
            const numericAmount = Number(amount) || 0;
            if (numericAmount > 0) return Math.ceil(numericAmount);
            if (numericAmount < 0) return -Math.ceil(Math.abs(numericAmount));
            return 0;
        };

        const showFloatingCombatText = (card, text, variant = '') => {
            if (!card || !text) return;
            const popup = document.createElement('div');
            popup.className = ['hp-delta-popup', variant].filter(Boolean).join(' ');
            if (card.closest('.enemy-characters')) {
                popup.classList.add('enemy-side');
            }
            popup.textContent = text;
            card.appendChild(popup);
            window.setTimeout(() => popup.remove(), 1600);
        };

        const showFloatingHpDelta = (card, delta) => {
            if (!card || !delta) return;
            const isDamage = delta < 0;
            const variant =
                isDamage && /status effect/i.test(card.dataset.lastDamageDebug || '')
                    ? 'damage affliction'
                    : isDamage
                    ? 'damage'
                    : 'heal';
            const displayDelta = roundCombatDisplayAmountUp(delta);
            showFloatingCombatText(card, `${isDamage ? '' : '+'}${displayDelta}`, variant);
            playGeneratedIngameSound(isDamage ? 'damage' : 'heal');
        };

        const animateUnitImpact = (card, delta) => {
            if (!card || !delta) return;
            const face = card.querySelector('.character-face');
            if (!face) return;
            const isDamage = delta < 0;
            const isAffliction = isDamage && /status effect/i.test(card.dataset.lastDamageDebug || '');
            const className = isDamage ? 'damage-impact' : 'heal-impact';
            face.classList.remove('damage-impact', 'heal-impact');
            void face.offsetWidth;
            face.classList.add(className);
            window.setTimeout(() => face.classList.remove(className), 650);

            const burst = document.createElement('div');
            burst.className = [
                'combat-impact-burst',
                isDamage ? 'damage' : 'heal',
                isAffliction ? 'affliction' : '',
            ].filter(Boolean).join(' ');
            card.appendChild(burst);
            window.setTimeout(() => burst.remove(), 1050);
        };

        const animateDefenseImpact = (card, delta) => {
            if (!card || !delta) return;
            const burst = document.createElement('div');
            burst.className = `combat-impact-burst shield ${delta < 0 ? 'break' : 'gain'}`;
            card.appendChild(burst);
            window.setTimeout(() => burst.remove(), 1100);
            playGeneratedIngameSound('shield-hit');
        };

        const escapeCssUrl = (value = '') => String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'");

        const showCharacterDeathAnimation = (card) => {
            if (!card) return;
            const face = card.querySelector('.character-face');
            const portraitSrc = face?.dataset?.aliveSrc || face?.src || '';
            if (!portraitSrc) return;
            card.querySelectorAll('.character-death-shatter').forEach((node) => node.remove());
            const safeSrc = escapeCssUrl(portraitSrc);
            const overlay = document.createElement('div');
            overlay.className = 'character-death-shatter';
            const label = card.closest('.enemy-characters') ? 'KILL' : 'DEFEATED';
            overlay.innerHTML =
                `<div class="death-slice death-slice-left" style="background-image:url('${safeSrc}')"></div>` +
                `<div class="death-slice death-slice-right" style="background-image:url('${safeSrc}')"></div>` +
                `<div class="death-shards">` +
                    Array.from({ length: 9 }, (_, index) =>
                        `<span style="background-image:url('${safeSrc}');--piece:${index};"></span>`
                    ).join('') +
                `</div>` +
                `<div class="death-kill-label">${label}</div>`;
            card.appendChild(overlay);
            playGeneratedIngameSound('death');
            window.setTimeout(() => overlay.remove(), 2500);
        };

        const getActiveStatuses = (unit) => {
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            return statuses.filter((status) => (Number(status?.remainingTurns) || 0) > 0);
        };

        const getDestructibleDefenseValue = (unit) =>
            getActiveStatuses(unit).reduce((sum, status) => {
                const points = Number(status?.metadata?.destructibleDefensePoints);
                return Number.isFinite(points) && points > 0 ? sum + points : sum;
            }, 0);

        const getEvadeChanceValue = (unit) => {
            const total = getActiveStatuses(unit).reduce((sum, status) => {
                const chance = Number(status?.metadata?.evadeChancePercent);
                return Number.isFinite(chance) && chance > 0 ? sum + chance : sum;
            }, 0);
            return Math.max(0, Math.min(100, Math.round(total)));
        };

        const ensureEvadePercentBadge = (card) => {
            if (!card) return null;
            let badge = card.querySelector('.evade-percent-badge');
            if (badge) return badge;
            badge = document.createElement('div');
            badge.className = 'evade-percent-badge';
            card.appendChild(badge);
            return badge;
        };

        const renderEvadePercentBadge = (card, unit) => {
            if (!card) return;
            const badge = ensureEvadePercentBadge(card);
            if (!badge) return;
            const dead = isUnitDeadLike(unit);
            const evadeChance = dead ? 0 : getEvadeChanceValue(unit);
            card.classList.toggle('has-evade-percent', evadeChance > 0);
            badge.textContent = `${evadeChance}%`;
            badge.title = `${evadeChance}% evasion`;
        };

        const findEvadeNotificationStatus = (unit) =>
            getActiveStatuses(unit).find((status) => status?.id === 'skill_evaded_notification') || null;

        const getEvadeNotificationKey = (unit) => {
            const status = findEvadeNotificationStatus(unit);
            if (!status) return '';
            return [
                status?.sourceUsername || '',
                status?.sourceSlot ?? '',
                status?.sourceSkillId || '',
                status?.metadata?.evadedSkillName || '',
            ].join(':');
        };

        const showEvadePopup = (card) => {
            if (!card) return;
            const popup = document.createElement('div');
            popup.className = 'hp-delta-popup evade';
            if (card.closest('.enemy-characters')) {
                popup.classList.add('enemy-side');
            }
            popup.textContent = 'EVADED';
            card.appendChild(popup);
            window.setTimeout(() => popup.remove(), 900);
        };

        const playEvadeCue = () => {
            playGeneratedIngameSound('evade');
        };

        const showCombatEventLog = (message) => {
            if (!message) return;
            const host = document.querySelector('.backgroundingame') || document.body;
            const existing = host.querySelector('.combat-event-log');
            if (existing) {
                existing.remove();
            }
            const log = document.createElement('div');
            log.className = 'combat-event-log';
            log.textContent = message;
            host.appendChild(log);
            window.setTimeout(() => log.remove(), 2200);
        };

        const showEvadeFeedback = (card, unit) => {
            if (!card || !unit) return;
            const status = findEvadeNotificationStatus(unit);
            const face = card.querySelector('.character-face');
            showEvadePopup(card);
            if (face) {
                face.classList.remove('evade-dodge');
                void face.offsetWidth;
                face.classList.add('evade-dodge');
                window.setTimeout(() => face.classList.remove('evade-dodge'), 1000);
            }
            const slash = document.createElement('div');
            slash.className = 'evade-slash-overlay';
            card.appendChild(slash);
            window.setTimeout(() => slash.remove(), 1000);

            const evader = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
            const evaderName = evader?.name || 'Character';
            const skillName = status?.metadata?.evadedSkillName || 'a skill';
            const sourceName = status?.metadata?.evadedSourceName || 'Enemy';
            showCombatEventLog(`${evaderName} evaded ${sourceName}'s ${skillName}`);
            playEvadeCue();
        };

        const getHulkRageValue = (unit) => {
            const statuses = getActiveStatuses(unit);
            const rageStatus = statuses.find(
                (status) => status?.id === 'hulk_anger_management'
            );
            return Math.max(0, Math.min(100, Number(rageStatus?.metadata?.hulkRage) || 0));
        };

        const ensureRageMeter = (card) => {
            if (!card) return null;
            let container = card.querySelector('.rage-bar-container');
            if (container) return container;
            const healthContainer = card.querySelector('.health-bar-container');
            if (!healthContainer) return null;
            container = document.createElement('div');
            container.className = 'rage-bar-container';
            const bar = document.createElement('div');
            bar.className = 'rage-bar';
            const text = document.createElement('span');
            text.className = 'rage-text';
            text.textContent = '0/100';
            container.appendChild(bar);
            container.appendChild(text);
            healthContainer.parentNode?.insertBefore(container, healthContainer);
            return container;
        };

        const renderHulkRageMeter = (card, unit) => {
            if (!card) return;
            const character = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
            const isHulk = character?.characterId === 'the-hulk' || character?.id === 'the-hulk';
            const container = ensureRageMeter(card);
            card.classList.toggle('has-rage-meter', Boolean(isHulk && container));
            if (!container) return;
            const bar = container.querySelector('.rage-bar');
            const text = container.querySelector('.rage-text');
            const rage = isHulk ? getHulkRageValue(unit) : 0;
            if (bar) {
                bar.style.width = `${Math.round((HEALTH_BAR_MAX_WIDTH * rage) / 100)}px`;
            }
            if (text) {
                text.textContent = `${rage}/100`;
            }
        };

        const getRickRevolverBullets = (unit) => {
            const statuses = getActiveStatuses(unit);
            const bulletStatus = statuses.find(
                (status) => status?.id === 'rick_grimes_revolver_bullets'
            );
            const statusBullets = Number(bulletStatus?.metadata?.bulletsRemaining);
            if (Number.isFinite(statusBullets)) {
                return Math.max(0, Math.min(6, statusBullets));
            }
            const skillUses = unit?.state?.skillUses && typeof unit.state.skillUses === 'object'
                ? unit.state.skillUses
                : {};
            const revolverUses = Math.max(0, Number(skillUses['rick-grimes-357-revolver']) || 0);
            return Math.max(0, Math.min(6, 6 - revolverUses));
        };

        const ensureRickRevolverCylinder = (card) => {
            if (!card) return null;
            let cylinder = card.querySelector('.revolver-cylinder');
            if (cylinder) return cylinder;
            cylinder = document.createElement('div');
            cylinder.className = 'revolver-cylinder';
            for (let index = 0; index < 6; index += 1) {
                const bullet = document.createElement('span');
                bullet.className = 'revolver-bullet';
                cylinder.appendChild(bullet);
            }
            card.appendChild(cylinder);
            return cylinder;
        };

        const renderRickRevolverCylinder = (card, unit) => {
            if (!card) return;
            const character = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
            const isRick = character?.characterId === 'rick-grimes' || character?.id === 'rick-grimes';
            const cylinder = ensureRickRevolverCylinder(card);
            const dead = isUnitDeadLike(unit);
            card.classList.toggle('has-revolver-cylinder', Boolean(isRick && !dead && cylinder));
            if (!cylinder) return;
            const bulletsRemaining = isRick ? getRickRevolverBullets(unit) : 0;
            const shotsFired = 6 - bulletsRemaining;
            cylinder.style.transform = `rotate(${shotsFired * 60}deg)`;
            Array.from(cylinder.querySelectorAll('.revolver-bullet')).forEach((bullet, index) => {
                bullet.classList.toggle('empty', index < shotsFired);
            });
            cylinder.title = `${bulletsRemaining}/6 bullets`;
        };

        const ensureCharacterFxElement = (card, className, html = '') => {
            if (!card || !className) return null;
            let element = card.querySelector(`.${className}`);
            if (!element) {
                element = document.createElement('div');
                element.className = className;
                element.innerHTML = html;
                card.appendChild(element);
            }
            return element;
        };

        const removeCharacterFxElement = (card, className) => {
            card?.querySelectorAll?.(`.${className}`).forEach((node) => node.remove());
        };

        const getAquamanSeaSharkStacks = (unit) =>
            getActiveStatuses(unit).reduce((sum, status) => {
                if (status?.id !== 'aquaman_sea_sharks') return sum;
                const damage = Number(status?.metadata?.turnEndDamage);
                if (Number.isFinite(damage) && damage > 0) {
                    return sum + Math.max(1, Math.round(damage / 4));
                }
                return sum + 1;
            }, 0);

        const getPredatorBleederSpearStacks = (unit) =>
            getActiveStatuses(unit).reduce((sum, status) => {
                if (status?.id !== 'predator_stalker_bleeder_spear_dot') return sum;
                const damage = Number(status?.metadata?.turnEndDamage);
                if (Number.isFinite(damage) && damage > 0) {
                    return sum + Math.max(1, Math.round(damage / 10));
                }
                return sum + 1;
            }, 0);

        const renderAquamanSeaSharkFx = (card, stackCount = 0, newStacks = 0) => {
            if (!card) return;
            const count = Math.max(0, Math.min(9, Number(stackCount) || 0));
            let ring = card.querySelector('.aquaman-sea-shark-ring');
            if (count <= 0) {
                ring?.remove();
                card.querySelectorAll('.aquaman-sea-shark-projectile, .aquaman-sea-shark-splash').forEach((node) => node.remove());
                card.classList.remove('has-aquaman-sea-sharks');
                return;
            }
            card.classList.add('has-aquaman-sea-sharks');
            if (!ring) {
                ring = document.createElement('div');
                ring.className = 'aquaman-sea-shark-ring';
                card.appendChild(ring);
            }
            ring.innerHTML = '';
            for (let index = 0; index < count; index += 1) {
                const fin = document.createElement('span');
                fin.className = 'aquaman-sea-shark-fin';
                fin.style.setProperty('--fin-index', String(index));
                fin.style.setProperty('--fin-count', String(count));
                fin.style.setProperty('--fin-angle', `${(360 / Math.max(1, count)) * index}deg`);
                ring.appendChild(fin);
            }
            const animateCount = Math.max(0, Math.min(3, Number(newStacks) || 0));
            for (let index = 0; index < animateCount; index += 1) {
                const shark = document.createElement('img');
                shark.className = 'aquaman-sea-shark-projectile';
                shark.src = 'assets/images/seashark.png';
                shark.alt = '';
                shark.style.animationDelay = `${index * 120}ms`;
                card.appendChild(shark);
                window.setTimeout(() => {
                    const splash = document.createElement('div');
                    splash.className = 'aquaman-sea-shark-splash';
                    splash.innerHTML = '<span></span><span></span><span></span>';
                    card.appendChild(splash);
                    window.setTimeout(() => splash.remove(), 900);
                }, 620 + index * 120);
                window.setTimeout(() => shark.remove(), 980 + index * 120);
            }
        };

        const syncCharacterSpecificFx = (card, unit) => {
            if (!card) return;
            const fxClasses = [
                'batman-smoke-fx',
                'batman-emp-fx',
                'rage-infected-fx',
                'mysterio-illusion-fx',
                'joker-remote-bomb-fx',
                'captain-shield-fx',
                'predator-cloak-fx',
                'spider-web-fx',
                'andrea-lock-fx',
                'smartgun-lock-fx',
                'predator-bleeder-spear-fx',
                'flash-phase-shift-fx',
                'scorpion-venom-neurotoxin-fx',
                'scorpion-venom-acid-fx',
                'scorpion-venom-paralytic-fx',
                'scorpion-poison-neurotoxin-fx',
                'scorpion-poison-acid-fx',
                'scorpion-poison-paralytic-fx',
                'angstrom-banish-fx',
                'storm-ice-fx',
                'hulk-rage-high-fx',
                'hulk-rage-max-fx',
                'xenomorph-facehugger-fx',
                'venom-ally-symbiosis-fx',
                'negan-the-iron-fx',
                'negan-the-iron-scar-fx',
                'parasite-host-mutation-fx',
                'parasite-overload-ally-fx',
                'parasite-overload-enemy-fx',
                'parasite-negative-absorption-fx',
                'parasite-positive-absorption-fx',
                'seraphina-med-station-fx',
                'seraphina-buckshot-fx',
                'seraphina-flare-fx',
                'taunted-fx',
            ];
            const activeFxStatuses = getActiveStatuses(unit);
            const isBanishedForFx = activeFxStatuses.some((status) => Boolean(status?.metadata?.banished));
            const hpForFx = Number(unit?.hp);
            const isDeadForFx =
                !unit ||
                unit?.alive === false ||
                (Number.isFinite(hpForFx) && hpForFx <= 0 && !isBanishedForFx);
            if (isDeadForFx) {
                fxClasses.forEach((className) => card.classList.remove(className));
                ['joker-detonator-light', 'space-marine-channel-bar', 'rex-charge-counter', 'aquaman-sea-shark-ring', 'predator-bleeder-spears', 'xenomorph-facehugger-overlay', 'venom-ally-symbiosis-marker', 'negan-iron-overlay', 'negan-iron-scar-overlay', 'parasite-host-mutation-marker', 'parasite-overload-marker', 'parasite-absorption-marker', 'seraphina-med-plus-overlay', 'seraphina-buckshot-pattern', 'seraphina-road-flare', 'taunt-callout', 'flash-phase-speed-lines', 'scorpion-venom-drop', 'scorpion-poison-drops'].forEach((className) =>
                    removeCharacterFxElement(card, className)
                );
                return;
            }
            const character = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
            const characterId = character?.characterId || character?.id || '';
            const statuses = activeFxStatuses;
            const hasStatus = (predicate) => statuses.some(predicate);
            const idStarts = (prefix) => (status) => typeof status?.id === 'string' && status.id.startsWith(prefix);
            const sourceStarts = (prefix) => (status) => typeof status?.sourceSkillId === 'string' && status.sourceSkillId.startsWith(prefix);

            const isTaunted = hasStatus((status) => Boolean(status?.metadata?.taunt));
            card.classList.toggle('taunted-fx', isTaunted);
            if (isTaunted) {
                ensureCharacterFxElement(card, 'taunt-callout', '<span>TAUNTED</span>');
            } else {
                removeCharacterFxElement(card, 'taunt-callout');
            }

            const isBatmanSmoke = hasStatus((status) => status?.id === 'batman_smoke_bomb_blind');
            const isBatmanEmp = hasStatus((status) => typeof status?.id === 'string' && status.id.startsWith('batman_pocket_emp'));
            card.classList.toggle('batman-smoke-fx', isBatmanSmoke);
            card.classList.toggle('batman-emp-fx', isBatmanEmp);

            const isSpiderWebbed = hasStatus((status) =>
                typeof status?.id === 'string' &&
                status.id.startsWith('spider_man_web_') &&
                (
                    status.id.includes('_stun') ||
                    status.id.includes('_wrap') ||
                    Boolean(status?.metadata?.cannotUseSkills) ||
                    Boolean(status?.metadata?.cannotUseHarmfulSkills) ||
                    Boolean(status?.metadata?.skillCostOverridesBySkillId)
                )
            );
            card.classList.toggle('spider-web-fx', isSpiderWebbed);

            const isAndreaLocked = hasStatus((status) => status?.id === 'andrea_locked_on_mark');
            card.classList.toggle('andrea-lock-fx', isAndreaLocked);

            const isSmartgunLocked = hasStatus((status) => status?.id === 'sergeant_william_hillford_smartgun_lock_on_mark');
            card.classList.toggle('smartgun-lock-fx', isSmartgunLocked);

            const bleederSpearStacks = getPredatorBleederSpearStacks(unit);
            card.classList.toggle('predator-bleeder-spear-fx', bleederSpearStacks > 0);
            if (bleederSpearStacks > 0) {
                const spearEl = ensureCharacterFxElement(card, 'predator-bleeder-spears', '');
                if (spearEl && spearEl.dataset.stackCount !== String(bleederSpearStacks)) {
                    spearEl.dataset.stackCount = String(bleederSpearStacks);
                    spearEl.innerHTML = Array.from(
                        { length: Math.min(6, bleederSpearStacks) },
                        (_, index) => `<span class="bleeder-spear spear-${index + 1}"><i></i><b></b></span>`
                    ).join('');
                }
            } else {
                removeCharacterFxElement(card, 'predator-bleeder-spears');
            }

            const isAngstromBanished = hasStatus((status) =>
                Boolean(status?.metadata?.banished) &&
                (status?.id === 'angstrom_levy_dimension_abandon_banish' ||
                    typeof status?.sourceSkillId === 'string' && status.sourceSkillId.startsWith('angstrom-levy'))
            );
            card.classList.toggle('angstrom-banish-fx', isAngstromBanished);

            const isStormIceCountered = hasStatus((status) => status?.id === 'storm_ice_barrier_countered');
            card.classList.toggle('storm-ice-fx', isStormIceCountered);

            const isFacehuggerImplanted = hasStatus((status) => status?.id === 'xenomorph_facehugger_implanted');
            card.classList.toggle('xenomorph-facehugger-fx', isFacehuggerImplanted);
            if (isFacehuggerImplanted) {
                ensureCharacterFxElement(
                    card,
                    'xenomorph-facehugger-overlay',
                    '<img src="assets/images/facehuggerface.png" alt="">'
                );
            } else {
                removeCharacterFxElement(card, 'xenomorph-facehugger-overlay');
            }

            const isVenomAllySymbiosis = hasStatus((status) =>
                status?.id === 'venom_ally_symbiosis_transfer' ||
                status?.metadata?.specialStatusVisual === 'venom-ally-symbiosis'
            );
            card.classList.toggle('venom-ally-symbiosis-fx', isVenomAllySymbiosis);
            if (isVenomAllySymbiosis) {
                ensureCharacterFxElement(
                    card,
                    'venom-ally-symbiosis-marker',
                    '<img src="https://i.imgur.com/ESFy9nw.png" alt="">'
                );
            } else {
                removeCharacterFxElement(card, 'venom-ally-symbiosis-marker');
            }

            const isNeganIron = hasStatus((status) =>
                status?.id === 'negan_the_iron_lock' ||
                status?.metadata?.specialStatusVisual === 'negan-the-iron'
            );
            const isNeganIronScar = hasStatus((status) =>
                status?.id === 'negan_the_iron_burn_scar' ||
                status?.metadata?.specialStatusVisual === 'negan-the-iron-scar'
            );
            card.classList.toggle('negan-the-iron-fx', isNeganIron);
            card.classList.toggle('negan-the-iron-scar-fx', isNeganIronScar);
            if (isNeganIron) {
                ensureCharacterFxElement(
                    card,
                    'negan-iron-overlay',
                    '<img src="https://i.imgur.com/jHlzlE9.png" alt=""><span class="negan-iron-glow"></span><span class="negan-iron-steam a"></span><span class="negan-iron-steam b"></span><span class="negan-iron-smoke a"></span><span class="negan-iron-smoke b"></span><span class="negan-iron-scorch"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'negan-iron-overlay');
            }
            if (isNeganIronScar) {
                ensureCharacterFxElement(
                    card,
                    'negan-iron-scar-overlay',
                    '<span class="negan-scar-burn a"></span><span class="negan-scar-burn b"></span><span class="negan-scar-tear a"></span><span class="negan-scar-tear b"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'negan-iron-scar-overlay');
            }

            const isParasiteHostMutation = hasStatus((status) =>
                status?.id === 'parasite_host_mutation_active' ||
                status?.metadata?.specialStatusVisual === 'parasite-host-mutation'
            );
            const isParasiteOverloadAlly = hasStatus((status) =>
                status?.id === 'parasite_predatory_overload_ally' ||
                status?.metadata?.specialStatusVisual === 'parasite-overload-ally'
            );
            const isParasiteOverloadEnemy = hasStatus((status) =>
                status?.id === 'parasite_predatory_overload_enemy' ||
                status?.metadata?.specialStatusVisual === 'parasite-overload-enemy'
            );
            const isParasiteNegativeAbsorption = hasStatus((status) =>
                typeof status?.id === 'string' && status.id.startsWith('parasite_negative_absorption')
            );
            const isParasitePositiveAbsorption = hasStatus((status) =>
                typeof status?.id === 'string' && status.id.startsWith('parasite_positive_absorption')
            );
            card.classList.toggle('parasite-host-mutation-fx', isParasiteHostMutation);
            card.classList.toggle('parasite-overload-ally-fx', isParasiteOverloadAlly);
            card.classList.toggle('parasite-overload-enemy-fx', isParasiteOverloadEnemy);
            card.classList.toggle('parasite-negative-absorption-fx', isParasiteNegativeAbsorption);
            card.classList.toggle('parasite-positive-absorption-fx', isParasitePositiveAbsorption);
            if (isParasiteHostMutation) {
                ensureCharacterFxElement(
                    card,
                    'parasite-host-mutation-marker',
                    '<span class="parasite-mutated-border"></span><span class="parasite-mutated-eye a"></span><span class="parasite-mutated-eye b"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'parasite-host-mutation-marker');
            }
            if (isParasiteOverloadAlly || isParasiteOverloadEnemy) {
                ensureCharacterFxElement(
                    card,
                    'parasite-overload-marker',
                    '<span></span><span></span>'
                );
            } else {
                removeCharacterFxElement(card, 'parasite-overload-marker');
            }
            if (isParasiteNegativeAbsorption || isParasitePositiveAbsorption) {
                ensureCharacterFxElement(
                    card,
                    'parasite-absorption-marker',
                    `<span class="${isParasiteNegativeAbsorption ? 'negative' : 'positive'}"></span>`
                );
            } else {
                removeCharacterFxElement(card, 'parasite-absorption-marker');
            }

            const isSeraphinaMedStation = hasStatus((status) =>
                status?.id === 'seraphina_vale_emergency_medical_station' ||
                status?.id === 'seraphina_vale_battlefield_triage_healing_boost'
            );
            card.classList.toggle('seraphina-med-station-fx', isSeraphinaMedStation);
            if (isSeraphinaMedStation) {
                ensureCharacterFxElement(
                    card,
                    'seraphina-med-plus-overlay',
                    '<span>+</span><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span>'
                );
            } else {
                removeCharacterFxElement(card, 'seraphina-med-plus-overlay');
            }

            const isSeraphinaBuckshot = hasStatus((status) => status?.id === 'seraphina_vale_pump_shotgun_buckshot');
            card.classList.toggle('seraphina-buckshot-fx', isSeraphinaBuckshot);
            if (isSeraphinaBuckshot) {
                ensureCharacterFxElement(card, 'seraphina-buckshot-pattern', buildSeraphinaBuckshotHtml());
            } else {
                removeCharacterFxElement(card, 'seraphina-buckshot-pattern');
            }

            const isSeraphinaFlared = hasStatus((status) => status?.id === 'seraphina_vale_marking_flares_mark');
            card.classList.toggle('seraphina-flare-fx', isSeraphinaFlared);
            if (isSeraphinaFlared) {
                ensureCharacterFxElement(
                    card,
                    'seraphina-road-flare',
                    '<span class="flare-stick"></span><span class="flare-flame"></span><span class="flare-smoke one"></span><span class="flare-smoke two"></span><span class="flare-glow"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'seraphina-road-flare');
            }

            const isRageMarked = hasStatus(idStarts('rage_infected_'));
            card.classList.toggle('rage-infected-fx', isRageMarked);

            const isMysterioAffected = hasStatus(idStarts('mysterio_'));
            card.classList.toggle('mysterio-illusion-fx', isMysterioAffected);

            const isJokerBomb = hasStatus((status) => status?.id === 'the_joker_remote_bomb_mark');
            card.classList.toggle('joker-remote-bomb-fx', isJokerBomb);
            if (isJokerBomb) {
                ensureCharacterFxElement(card, 'joker-detonator-light', '<span></span>');
            } else {
                removeCharacterFxElement(card, 'joker-detonator-light');
            }

            const isCaptainRicochet = hasStatus((status) =>
                typeof status?.id === 'string' && status.id.startsWith('captain_america_vibranium_ricochet')
            );
            card.classList.toggle('captain-shield-fx', isCaptainRicochet);

            const isPredatorCloaked =
                characterId === 'predator-stalker' &&
                hasStatus((status) => status?.id === 'predator_stalker_cloaking_tech_active');
            card.classList.toggle('predator-cloak-fx', isPredatorCloaked);

            const isFlashPhaseShift =
                characterId === 'the-flash-barry-allen' &&
                hasStatus((status) => status?.id === 'the_flash_barry_allen_phase_shift');
            card.classList.toggle('flash-phase-shift-fx', isFlashPhaseShift);
            if (isFlashPhaseShift) {
                ensureCharacterFxElement(
                    card,
                    'flash-phase-speed-lines',
                    '<span class="phase-line a"></span><span class="phase-line b"></span><span class="phase-line c"></span><span class="phase-afterimage"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'flash-phase-speed-lines');
            }

            const scorpionVenomStatus = statuses.find((status) => status?.id === 'scorpion_passive_scorpion_venom');
            const scorpionVenom = normalizeScorpionVenom(scorpionVenomStatus?.metadata?.currentVenom);
            const hasScorpionVenom = characterId === 'scorpion' && Boolean(scorpionVenomStatus);
            card.classList.toggle('scorpion-venom-neurotoxin-fx', hasScorpionVenom && scorpionVenom === 'neurotoxin');
            card.classList.toggle('scorpion-venom-acid-fx', hasScorpionVenom && scorpionVenom === 'acid');
            card.classList.toggle('scorpion-venom-paralytic-fx', hasScorpionVenom && scorpionVenom === 'paralytic');
            if (hasScorpionVenom) {
                ensureCharacterFxElement(
                    card,
                    'scorpion-venom-drop',
                    '<span class="scorpion-drop-main"></span><span class="scorpion-drop-drip a"></span><span class="scorpion-drop-drip b"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'scorpion-venom-drop');
            }

            const getScorpionVenomFromStatusSource = (status) => {
                const sourceUnit =
                    status?.sourceUsername && Number.isInteger(status?.sourceSlot)
                        ? latestBoardState?.[status.sourceUsername]?.[status.sourceSlot]
                        : null;
                const sourceVenomStatus = getActiveStatuses(sourceUnit).find(
                    (entry) => entry?.id === 'scorpion_passive_scorpion_venom'
                );
                return sourceVenomStatus ? normalizeScorpionVenom(sourceVenomStatus?.metadata?.currentVenom) : '';
            };
            const activeScorpionPoisonStatus = statuses.find((status) =>
                typeof status?.id === 'string' &&
                (
                    status.id.startsWith('scorpion_scorpion_sting_') ||
                    status.id.startsWith('scorpion_tail_laser_')
                )
            );
            const sourceVenom = getScorpionVenomFromStatusSource(activeScorpionPoisonStatus);
            const targetVenom = sourceVenom || (statuses.some((status) =>
                status?.id === 'scorpion_scorpion_sting_neurotoxin' ||
                status?.id === 'scorpion_tail_laser_neurotoxin'
            )
                ? 'neurotoxin'
                : statuses.some((status) =>
                      status?.id === 'scorpion_scorpion_sting_acid_primary' ||
                      status?.id === 'scorpion_scorpion_sting_acid_secondary' ||
                      status?.id === 'scorpion_tail_laser_acid_burn'
                  )
                ? 'acid'
                : statuses.some((status) =>
                      status?.id === 'scorpion_scorpion_sting_paralytic_primary' ||
                      status?.id === 'scorpion_scorpion_sting_paralytic_secondary' ||
                      status?.id === 'scorpion_tail_laser_paralytic'
                  )
                ? 'paralytic'
                : '');
            card.classList.toggle('scorpion-poison-neurotoxin-fx', targetVenom === 'neurotoxin');
            card.classList.toggle('scorpion-poison-acid-fx', targetVenom === 'acid');
            card.classList.toggle('scorpion-poison-paralytic-fx', targetVenom === 'paralytic');
            if (targetVenom) {
                ensureCharacterFxElement(
                    card,
                    'scorpion-poison-drops',
                    '<span class="scorpion-drop-main"></span><span class="scorpion-drop-drip a"></span><span class="scorpion-drop-drip b"></span><span class="scorpion-drop-drip c"></span>'
                );
            } else {
                removeCharacterFxElement(card, 'scorpion-poison-drops');
            }

            const isSpaceMarine = characterId === 'space-marine-infantry';
            const channelStatus = statuses.find((status) => {
                const ongoingClass =
                    typeof status?.metadata?.ongoingClass === 'string'
                        ? status.metadata.ongoingClass.trim().toLowerCase()
                        : '';
                return ongoingClass === 'channeled' && (
                    sourceStarts('space-marine-infantry')(status) ||
                    typeof status?.id === 'string' && status.id.startsWith('space_marine_infantry_')
                );
            });
            if (isSpaceMarine && channelStatus) {
                const channelEl = ensureCharacterFxElement(
                    card,
                    'space-marine-channel-bar',
                    '<span class="space-marine-channel-fill"></span><span class="space-marine-channel-label"></span>'
                );
                const remaining = Math.max(0, Number(channelStatus.remainingTurns) || 0);
                const fill = channelEl?.querySelector('.space-marine-channel-fill');
                const label = channelEl?.querySelector('.space-marine-channel-label');
                if (fill) fill.style.width = `${Math.max(16, Math.min(100, remaining * 34))}%`;
                if (label) label.textContent = 'CHANNEL';
            } else {
                removeCharacterFxElement(card, 'space-marine-channel-bar');
            }

            const rexStatuses = statuses.filter((status) =>
                typeof status?.id === 'string' && status.id.startsWith('rex_splode_')
            );
            if (characterId === 'rex-splode' || rexStatuses.length > 0) {
                const rexEl = ensureCharacterFxElement(card, 'rex-charge-counter', '<span></span>');
                const count = rexStatuses.length;
                const span = rexEl?.querySelector('span');
                if (span) span.textContent = count > 0 ? String(count) : '';
                rexEl?.classList.toggle('empty', count <= 0);
            } else {
                removeCharacterFxElement(card, 'rex-charge-counter');
            }

            const isHulk = characterId === 'the-hulk';
            const rage = isHulk ? getHulkRageValue(unit) : 0;
            card.classList.toggle('hulk-rage-high-fx', isHulk && rage >= 70);
            card.classList.toggle('hulk-rage-max-fx', isHulk && rage >= 100);
            renderAquamanSeaSharkFx(card, getAquamanSeaSharkStacks(unit), 0);
        };

        const renderUnitHealth = (card, unit) => {
            if (!card) return;
            const healthBar = card.querySelector('.health-bar');
            const healthText = card.querySelector('.health-text');
            if (!healthBar || !healthText) return;
            renderHulkRageMeter(card, unit);
            renderRickRevolverCylinder(card, unit);
            renderEvadePercentBadge(card, unit);
            syncCharacterSpecificFx(card, unit);
            const rawHp = isUnitBanished(unit) ? 0 : Number(unit?.hp);
            const hp = Math.max(0, Math.min(MAX_HP, Number.isFinite(rawHp) ? Math.ceil(rawHp) : MAX_HP));
            const ratio = hp / MAX_HP;
            const width = Math.max(0, Math.round(HEALTH_BAR_MAX_WIDTH * ratio));
            healthBar.style.width = `${width}px`;
            healthBar.classList.remove('hp-mid', 'hp-low');
            if (hp <= 30) {
                healthBar.classList.add('hp-low');
            } else if (hp <= 60) {
                healthBar.classList.add('hp-mid');
            }
            healthText.textContent = `${hp}/${MAX_HP}`;
            const face = card.querySelector('.character-face');
            const dead = isUnitDeadLike(unit) || hp <= 0;
            card.classList.toggle('low-hp-danger', !dead && hp > 0 && hp <= 25);
            card.classList.toggle('character-defeated', dead);
            card.dataset.lastDamageDebug = unit?.state?.lastDamageDebugText || '';
            if (face) {
                const aliveSrc = face.dataset.aliveSrc || face.src;
                if (!face.dataset.aliveSrc) {
                    face.dataset.aliveSrc = aliveSrc;
                }
                if (dead) {
                    face.src = 'assets/images/deadcharacter.png';
                    return;
                }
                const statuses = getActiveStatuses(unit);
                const faceOverride = statuses
                    .find(
                        (status) =>
                            typeof status?.metadata?.facePictureOverride === 'string' &&
                            status.metadata.facePictureOverride.trim()
                    )
                    ?.metadata?.facePictureOverride;
                face.src = faceOverride || face.dataset.aliveSrc;
            }
        };

        const renderBoardHealth = (data) => {
            if (!data || typeof data !== 'object') return;
            const board = data.board && typeof data.board === 'object' ? data.board : null;
            if (!board) return;
            const previousBoard = latestBoardState;
            const unitDiedBetweenStates = (previousUnit, nextUnit) => {
                const prevHp = Number(previousUnit?.hp);
                const nextHp = Number(nextUnit?.hp);
                const wasAlive =
                    previousUnit &&
                    previousUnit.alive !== false &&
                    (!Number.isFinite(prevHp) || prevHp > 0);
                const isDead =
                    nextUnit &&
                    (nextUnit.alive === false || (Number.isFinite(nextHp) && nextHp <= 0));
                return Boolean(wasAlive && isDead);
            };
            const isNeganUnit = (unit) => {
                const character = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
                return character?.id === 'negan' || character?.characterId === 'negan';
            };
            const detectAnyDeath = () => {
                if (!previousBoard || typeof previousBoard !== 'object') return false;
                return Object.keys(board).some((username) => {
                    const nextUnits = Array.isArray(board[username]) ? board[username] : [];
                    const prevUnits = Array.isArray(previousBoard[username]) ? previousBoard[username] : [];
                    return nextUnits.some((nextUnit, slot) =>
                        unitDiedBetweenStates(prevUnits[slot], nextUnit)
                    );
                });
            };
            const detectNeganDeath = () => {
                if (!previousBoard || typeof previousBoard !== 'object') return false;
                return Object.keys(board).some((username) => {
                    const nextUnits = Array.isArray(board[username]) ? board[username] : [];
                    const prevUnits = Array.isArray(previousBoard[username]) ? previousBoard[username] : [];
                    return nextUnits.some((nextUnit, slot) =>
                        isNeganUnit(nextUnit) && unitDiedBetweenStates(prevUnits[slot], nextUnit)
                    );
                });
            };
            latestBoardState = board;
            if (detectAnyDeath()) {
                playIngameSound(deathSound);
            }
            if (detectNeganDeath()) {
                playIngameSound(neganDeathSound);
            }
            const playerUnits = currentPlayerUsername ? board[currentPlayerUsername] : null;
            const opponentUsername = data.opponent?.username || currentOpponentUsername;
            const opponentUnits = opponentUsername ? board[opponentUsername] : null;
            const showHpAnimations = Boolean(previousBoard && typeof previousBoard === 'object');
            const getHpDelta = (username, slot, nextUnit) => {
                if (!showHpAnimations || !username || !Number.isInteger(slot)) return 0;
                const previousUnit = Array.isArray(previousBoard[username]) ? previousBoard[username][slot] : null;
                if (!previousUnit) return 0;
                const previousHp = Math.max(0, Number(previousUnit?.hp) || 0);
                const nextHp = Math.max(0, Number(nextUnit?.hp) || 0);
                return roundCombatDisplayAmountUp(nextHp - previousHp);
            };
            const getDefenseDelta = (username, slot, nextUnit) => {
                if (!showHpAnimations || !username || !Number.isInteger(slot)) return 0;
                const previousUnit = Array.isArray(previousBoard[username]) ? previousBoard[username][slot] : null;
                if (!previousUnit) return 0;
                return getDestructibleDefenseValue(nextUnit) - getDestructibleDefenseValue(previousUnit);
            };
            const gainedEvadeNotification = (username, slot, nextUnit) => {
                if (!showHpAnimations || !username || !Number.isInteger(slot) || !nextUnit) return false;
                const previousUnit = Array.isArray(previousBoard[username]) ? previousBoard[username][slot] : null;
                const nextKey = getEvadeNotificationKey(nextUnit);
                if (!nextKey) return false;
                const previousKey = getEvadeNotificationKey(previousUnit);
                return nextKey !== previousKey;
            };
            const getSeaSharkStackDelta = (username, slot, nextUnit) => {
                if (!showHpAnimations || !username || !Number.isInteger(slot) || !nextUnit) return 0;
                const previousUnit = Array.isArray(previousBoard[username]) ? previousBoard[username][slot] : null;
                return getAquamanSeaSharkStacks(nextUnit) - getAquamanSeaSharkStacks(previousUnit);
            };
            const hasActiveStatusId = (unit, statusId) =>
                getActiveStatuses(unit).some((status) => status?.id === statusId);
            const didNeganIronRipAway = (username, slot, nextUnit) => {
                if (!showHpAnimations || !username || !Number.isInteger(slot) || !nextUnit) return false;
                const previousUnit = Array.isArray(previousBoard[username]) ? previousBoard[username][slot] : null;
                return (
                    hasActiveStatusId(previousUnit, 'negan_the_iron_lock') &&
                    !hasActiveStatusId(nextUnit, 'negan_the_iron_lock')
                );
            };

            if (Array.isArray(playerCards) && Array.isArray(playerUnits)) {
                playerCards.forEach((card, slot) => {
                    const delta = getHpDelta(currentPlayerUsername, slot, playerUnits[slot]);
                    const defenseDelta = getDefenseDelta(currentPlayerUsername, slot, playerUnits[slot]);
                    const died = unitDiedBetweenStates(previousBoard?.[currentPlayerUsername]?.[slot], playerUnits[slot]);
                    const evaded = gainedEvadeNotification(currentPlayerUsername, slot, playerUnits[slot]);
                    const seaSharkDelta = getSeaSharkStackDelta(currentPlayerUsername, slot, playerUnits[slot]);
                    const ironRippedAway = didNeganIronRipAway(currentPlayerUsername, slot, playerUnits[slot]);
                    renderUnitHealth(card, playerUnits[slot]);
                    if (ironRippedAway) {
                        showTemporaryCardFx(
                            card,
                            'negan-iron-rip-away-fx',
                            '<img src="https://i.imgur.com/jHlzlE9.png" alt=""><span class="negan-iron-rip-burn a"></span><span class="negan-iron-rip-burn b"></span><span class="negan-iron-rip-smoke"></span>',
                            1700
                        );
                    }
                    if (seaSharkDelta > 0) {
                        renderAquamanSeaSharkFx(card, getAquamanSeaSharkStacks(playerUnits[slot]), seaSharkDelta);
                    }
                    if (died) {
                        showCharacterDeathAnimation(card);
                        card.classList.remove('death-crack');
                        void card.offsetWidth;
                        card.classList.add('death-crack');
                    }
                    if (delta) {
                        showFloatingHpDelta(card, delta);
                        animateUnitImpact(card, delta);
                    }
                    if (defenseDelta) {
                        showFloatingCombatText(
                            card,
                            `${defenseDelta > 0 ? '+' : ''}${defenseDelta} DEF`,
                            `shield ${defenseDelta < 0 ? 'break' : 'gain'}`
                        );
                        animateDefenseImpact(card, defenseDelta);
                    }
                    if (evaded) {
                        showEvadeFeedback(card, playerUnits[slot]);
                    }
                });
            }
            if (Array.isArray(enemyCards) && Array.isArray(opponentUnits)) {
                enemyCards.forEach((card, slot) => {
                    const delta = getHpDelta(opponentUsername, slot, opponentUnits[slot]);
                    const defenseDelta = getDefenseDelta(opponentUsername, slot, opponentUnits[slot]);
                    const died = unitDiedBetweenStates(previousBoard?.[opponentUsername]?.[slot], opponentUnits[slot]);
                    const evaded = gainedEvadeNotification(opponentUsername, slot, opponentUnits[slot]);
                    const seaSharkDelta = getSeaSharkStackDelta(opponentUsername, slot, opponentUnits[slot]);
                    const ironRippedAway = didNeganIronRipAway(opponentUsername, slot, opponentUnits[slot]);
                    renderUnitHealth(card, opponentUnits[slot]);
                    if (ironRippedAway) {
                        showTemporaryCardFx(
                            card,
                            'negan-iron-rip-away-fx',
                            '<img src="https://i.imgur.com/jHlzlE9.png" alt=""><span class="negan-iron-rip-burn a"></span><span class="negan-iron-rip-burn b"></span><span class="negan-iron-rip-smoke"></span>',
                            1700
                        );
                    }
                    if (seaSharkDelta > 0) {
                        renderAquamanSeaSharkFx(card, getAquamanSeaSharkStacks(opponentUnits[slot]), seaSharkDelta);
                    }
                    if (died) {
                        showCharacterDeathAnimation(card);
                        card.classList.remove('death-crack');
                        void card.offsetWidth;
                        card.classList.add('death-crack');
                    }
                    if (delta) {
                        showFloatingHpDelta(card, delta);
                        animateUnitImpact(card, delta);
                    }
                    if (defenseDelta) {
                        showFloatingCombatText(
                            card,
                            `${defenseDelta > 0 ? '+' : ''}${defenseDelta} DEF`,
                            `shield ${defenseDelta < 0 ? 'break' : 'gain'}`
                        );
                        animateDefenseImpact(card, defenseDelta);
                    }
                    if (evaded) {
                        showEvadeFeedback(card, opponentUnits[slot]);
                    }
                });
            }
        };

        const findSkillById = (skillId) => {
            if (!skillId || !Array.isArray(rosterData)) return null;
            for (const character of rosterData) {
                const skills = Array.isArray(character?.skills) ? character.skills : [];
                const match = skills.find((skill) => skill?.id === skillId);
                if (match) return match;
            }
            return null;
        };

        const findTooltipTextByStatusId = (statusId) => {
            if (!statusId || !Array.isArray(rosterData)) return null;
            for (const character of rosterData) {
                const skills = Array.isArray(character?.skills) ? character.skills : [];
                for (const skill of skills) {
                    const effects = Array.isArray(skill?.effects) ? skill.effects : [];
                    const effect = effects.find(
                        (entry) => entry?.type === 'apply_status' && entry?.statusId === statusId
                    );
                    const text = effect?.metadata?.tooltipText || getSkillDescriptionText(skill);
                    if (typeof text === 'string' && text.trim()) {
                        return text.trim();
                    }
                }
            }
            return null;
        };

        const lanternVisualBySourceSkillId = {
            'green-lantern-hal-jordan-passive-green-lantern-ring': 'green',
            'sinestro-passive-yellow-lantern-ring': 'yellow',
            'atrocitus-passive-red-lantern-ring': 'red',
            'saint-walker-passive-blue-lantern-ring': 'blue',
            'indigo-1-passive-indigo-lantern-ring': 'indigo',
            'john-stewart-passive-ultraviolet-lantern-ring': 'ultraviolet',
            'sorrow-passive-grey-lantern-ring': 'grey-smoke',
        };

        const lanternVisualByStatusId = {
            green_lantern_hal_jordan_passive_green_lantern_ring: 'green',
            green_lantern_hal_jordan_green_lantern_ring_damage_bonus: 'green',
            sinestro_yellow_lantern_ring_passive: 'yellow',
            sinestro_yellow_lantern_ring_fear: 'yellow',
            atrocitus_red_lantern_ring_passive: 'red',
            atrocitus_rage_stacks: 'red',
            saint_walker_blue_lantern_ring_passive: 'blue',
            saint_walker_blue_lantern_ring_defense: 'blue',
            indigo_1_indigo_lantern_ring_passive: 'indigo',
            john_stewart_ultraviolet_lantern_ring_passive: 'ultraviolet',
            john_stewart_emotional_possession: 'ultraviolet',
            sorrow_grey_lantern_ring_passive: 'grey-smoke',
            sorrow_stack: 'grey-smoke',
        };

        const lanternVisualClass = (visual) =>
            `lantern-${String(visual || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const getLanternPassiveVisual = (status) =>
            status?.metadata?.lanternPassiveVisual ||
            lanternVisualBySourceSkillId[status?.sourceSkillId] ||
            lanternVisualByStatusId[status?.id] ||
            '';

        const getLanternEffectVisual = (status) => {
            if (!status) return '';
            if (status?.metadata?.lanternEffectVisual) return status.metadata.lanternEffectVisual;
            if (typeof status?.id === 'string' && status.id.startsWith('sorrow_')) return 'grey-smoke';
            return (
                lanternVisualBySourceSkillId[status?.sourceSkillId] ||
                lanternVisualByStatusId[status?.id] ||
                ''
            );
        };

        const syncLanternPassiveAura = (card, statuses = []) => {
            if (!card) return;
            Array.from(card.classList)
                .filter((className) => className === 'has-lantern-aura' || className.startsWith('lantern-aura-'))
                .forEach((className) => card.classList.remove(className));
            const passiveStatus = statuses.find((status) => {
                if ((Number(status?.remainingTurns) || 0) <= 0) return false;
                if (status?.metadata?.lanternPassiveVisual) return true;
                return Boolean(lanternVisualByStatusId[status?.id] && /passive/i.test(status?.id || ''));
            });
            const visual = getLanternPassiveVisual(passiveStatus);
            if (!visual) return;
            card.classList.add('has-lantern-aura', `lantern-aura-${lanternVisualClass(visual)}`);
        };

        const showLanternTriggerBurst = (card, visual = '') => {
            if (!card || !visual) return;
            const burst = document.createElement('div');
            burst.className = `lantern-trigger-burst ${lanternVisualClass(visual)}`;
            if (visual === 'grey-smoke') {
                burst.innerHTML =
                    '<span></span><span></span><span></span><span></span>';
            } else {
                burst.innerHTML = '<span class="lantern-ring-burst-core"></span>';
            }
            card.appendChild(burst);
            window.setTimeout(() => burst.remove(), visual === 'grey-smoke' ? 1100 : 850);
        };

        const showLanternEnergyLink = ({ sourceUsername, sourceSlot, targetCard, visual = '' }) => {
            if (!targetCard || !visual || !sourceUsername || !Number.isInteger(sourceSlot)) return;
            const sourceCard = getCardByUsernameSlot(sourceUsername, sourceSlot);
            if (!sourceCard || sourceCard === targetCard) return;
            const sourceRect = sourceCard.getBoundingClientRect();
            const targetRect = targetCard.getBoundingClientRect();
            const startX = sourceRect.left + sourceRect.width / 2;
            const startY = sourceRect.top + sourceRect.height / 2;
            const endX = targetRect.left + targetRect.width / 2;
            const endY = targetRect.top + targetRect.height / 2;
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.max(12, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const link = document.createElement('div');
            link.className = `lantern-energy-link ${lanternVisualClass(visual)}`;
            link.style.left = `${startX}px`;
            link.style.top = `${startY}px`;
            link.style.width = `${length}px`;
            link.style.setProperty('--angle', `${angle}deg`);
            link.style.transform = `rotate(${angle}deg)`;
            document.body.appendChild(link);
            window.setTimeout(() => link.remove(), visual === 'grey-smoke' ? 1000 : 760);
        };

        const isGreenGoblinBombStatus = (status) => {
            if (!status || typeof status !== 'object') return false;
            if (status?.metadata?.specialStatusVisual === 'green-goblin-bomb') return true;
            return [
                'the_green_goblin_pumpkin_bomb',
                'the_green_goblin_carpet_bomb',
                'the_green_goblin_mad_bomber_bomb',
            ].includes(status?.id);
        };

        const syncGreenGoblinBombMarker = (card, bombActive, animateLob = false) => {
            if (!card) return;
            let marker = card.querySelector('.goblin-bomb-marker');
            const bombCount = typeof bombActive === 'number' ? Math.max(0, bombActive) : (bombActive ? 1 : 0);
            if (bombCount <= 0) {
                if (marker) marker.remove();
                card.querySelectorAll('.goblin-bomb-lob').forEach((node) => node.remove());
                card.classList.remove('has-goblin-bomb');
                return;
            }
            card.classList.add('has-goblin-bomb');
            if (!marker) {
                marker = document.createElement('div');
                marker.className = 'goblin-bomb-marker';
                marker.setAttribute('aria-label', 'Green Goblin bomb active');
                marker.innerHTML =
                    '<span class="goblin-bomb-core"></span>' +
                    '<span class="goblin-bomb-fuse"></span>' +
                    '<span class="goblin-bomb-spark"></span>' +
                    '<span class="goblin-bomb-count"></span>' +
                    '<span class="goblin-bomb-label">BOMB</span>';
                card.appendChild(marker);
            }
            marker.dataset.bombCount = String(bombCount);
            marker.classList.toggle('stacked', bombCount > 1);
            const countEl = marker.querySelector('.goblin-bomb-count');
            if (countEl) {
                countEl.textContent = bombCount > 1 ? `x${bombCount}` : '';
            }
            if (animateLob) {
                marker.classList.remove('fresh');
                void marker.offsetWidth;
                marker.classList.add('fresh');
                playGeneratedIngameSound('bomb-arm');
                const lob = document.createElement('div');
                lob.className = 'goblin-bomb-lob';
                lob.innerHTML =
                    '<span class="goblin-bomb-core"></span>' +
                    '<span class="goblin-bomb-fuse"></span>' +
                    '<span class="goblin-bomb-spark"></span>';
                card.appendChild(lob);
                window.setTimeout(() => lob.remove(), 900);
                window.setTimeout(() => marker.classList.remove('fresh'), 780);
            }
        };

        const showStatusApplyBurst = (card, group, statusSkill) => {
            if (!card || !group) return;
            const statuses = Array.isArray(group.statuses) ? group.statuses : [];
            const isBomb = statuses.some(isGreenGoblinBombStatus);
            const hasSpiderWeb = statuses.some((status) => typeof status?.id === 'string' && status.id.startsWith('spider_man_web_'));
            const hasAngstromPortal = statuses.some((status) =>
                Boolean(status?.metadata?.banished) ||
                (typeof status?.sourceSkillId === 'string' && status.sourceSkillId.startsWith('angstrom-levy'))
            );
            const hasAndreaLock = statuses.some((status) => status?.id === 'andrea_locked_on_mark');
            const hasPredatorCloak = statuses.some((status) => status?.id === 'predator_stalker_cloaking_tech_active');
            const hasStormIce = statuses.some((status) => status?.id === 'storm_ice_barrier_countered');
            const isPassive =
                /passive/i.test(statusSkill?.name || '') ||
                /passive/i.test(group?.sourceSkillId || '');
            const harmful = statuses.some((status) => Boolean(status?.metadata?.harmful));
            const helpful = statuses.some(
                (status) =>
                    !Boolean(status?.metadata?.harmful) &&
                    (Boolean(status?.metadata?.destructibleDefensePoints) ||
                        Boolean(status?.metadata?.invulnerable) ||
                        Boolean(status?.metadata?.healReceivedMultiplier) ||
                        Boolean(status?.metadata?.unpierceableDamageReductionPercent) ||
                        Boolean(status?.metadata?.unpierceableDamageReductionFlat))
            );
            const burst = document.createElement('div');
            burst.className = [
                'status-apply-burst',
                isBomb ? 'bomb' : isPassive ? 'passive' : harmful ? 'harmful' : helpful ? 'helpful' : 'neutral',
            ].join(' ');
            if (card.closest('.enemy-characters')) {
                burst.classList.add('enemy-side');
            }
            burst.textContent = isBomb ? 'BOMB ACTIVE' : isPassive ? 'PASSIVE' : harmful ? 'DEBUFF' : helpful ? 'BUFF' : 'STATUS';
            card.appendChild(burst);
            window.setTimeout(() => burst.remove(), 1500);
            if (isBomb) {
                playGeneratedIngameSound('bomb-arm');
            } else if (hasSpiderWeb) {
                playGeneratedIngameSound('web');
            } else if (hasAngstromPortal) {
                playGeneratedIngameSound('portal');
            } else if (hasAndreaLock) {
                playGeneratedIngameSound('target-lock');
            } else if (hasPredatorCloak) {
                playIngameSound(predatorCloakSound);
            } else if (hasStormIce) {
                playGeneratedIngameSound('ice');
            } else if (harmful) {
                playGeneratedIngameSound('status-harmful');
            } else if (helpful || isPassive) {
                playGeneratedIngameSound('status-helpful');
            }
        };

        const escapeHtml = (value) =>
            String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');

        const stableSerializeForRender = (value) => {
            if (Array.isArray(value)) {
                return value.map(stableSerializeForRender);
            }
            if (value && typeof value === 'object') {
                return Object.keys(value)
                    .sort()
                    .reduce((acc, key) => {
                        const item = value[key];
                        if (typeof item !== 'function') {
                            acc[key] = stableSerializeForRender(item);
                        }
                        return acc;
                    }, {});
            }
            return value;
        };

        const getStatusRenderSignature = ({
            unit,
            statuses,
            unitUsername,
            unitSlot,
            isEnemySide,
            revealActive,
            dead,
        }) =>
            JSON.stringify({
                username: unitUsername || '',
                slot: Number.isInteger(unitSlot) ? unitSlot : null,
                enemy: Boolean(isEnemySide),
                owner: currentPlayerUsername || '',
                dead: Boolean(dead),
                reveal: Boolean(revealActive),
                character: unit?.character?.id || unit?.character?.name || '',
                statuses: (Array.isArray(statuses) ? statuses : []).map((status, index) => ({
                    index,
                    id: status?.id || '',
                    remainingTurns: Number(status?.remainingTurns) || 0,
                    sourceSkillId: status?.sourceSkillId || '',
                    sourceUsername: status?.sourceUsername || '',
                    sourceSlot: status?.sourceSlot ?? null,
                    metadata: stableSerializeForRender(status?.metadata || {}),
                })),
            });

        const preloadIngameImage = (url) => {
            if (typeof url !== 'string') return;
            const trimmed = url.trim();
            if (!trimmed || preloadedIngameImageUrls.has(trimmed)) return;
            preloadedIngameImageUrls.add(trimmed);
            const img = new Image();
            img.decoding = 'async';
            img.src = trimmed;
        };

        const preloadMatchVisualImages = (data) => {
            if (!data || typeof data !== 'object') return;
            const board = data.board && typeof data.board === 'object' ? data.board : null;
            if (!board) return;
            Object.values(board).forEach((units) => {
                if (!Array.isArray(units)) return;
                units.forEach((unit) => {
                    if (!unit || typeof unit !== 'object') return;
                    preloadIngameImage(unit.character?.image || unit.character?.profileImage || '');
                    const skills = Array.isArray(unit.character?.skills) ? unit.character.skills : [];
                    skills.forEach((skill) => preloadIngameImage(skill?.skillimage || ''));
                    const statuses = Array.isArray(unit.state?.statuses) ? unit.state.statuses : [];
                    statuses.forEach((status) => {
                        preloadIngameImage(status?.metadata?.statusIconUrl || '');
                        const sourceSkill = findSkillById(status?.sourceSkillId);
                        preloadIngameImage(sourceSkill?.skillimage || '');
                    });
                });
            });
        };

        const getStatusTooltipCacheKey = (group, statusSkill) =>
            JSON.stringify({
                sourceSkillId: group?.sourceSkillId || '',
                skillName: statusSkill?.name || '',
                statuses: (Array.isArray(group?.statuses) ? group.statuses : []).map((status) => ({
                    id: status?.id || '',
                    remainingTurns: Number(status?.remainingTurns) || 0,
                    metadata: stableSerializeForRender(status?.metadata || {}),
                })),
            });

        const getCachedStatusTooltipHtml = (group, statusSkill, buildTooltipHtml) => {
            const key = getStatusTooltipCacheKey(group, statusSkill);
            const cached = statusTooltipHtmlCache.get(key);
            if (cached) return cached;
            const html = buildTooltipHtml(group, statusSkill);
            statusTooltipHtmlCache.set(key, html);
            if (statusTooltipHtmlCache.size > 180) {
                const firstKey = statusTooltipHtmlCache.keys().next().value;
                statusTooltipHtmlCache.delete(firstKey);
            }
            return html;
        };

        const ensureGlobalStatusTooltip = () => {
            if (globalStatusTooltipEl) return globalStatusTooltipEl;
            const tooltip = document.createElement('div');
            tooltip.className = 'global-status-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
            globalStatusTooltipEl = tooltip;
            return tooltip;
        };

        const clearStatusRevealPanels = () => {
            if (!document.body.classList.contains('status-reveal-active')) return;
            document.querySelectorAll('.status-reveal-panel').forEach((node) => node.remove());
            document.body.classList.remove('status-reveal-active');
        };

        const syncStatusRevealButton = () => {
            if (!statusRevealToggleButton) return;
            const active = statusRevealHeld || statusRevealPinned;
            statusRevealToggleButton.classList.toggle('active', active);
            statusRevealToggleButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        };

        const hideStatusReveal = ({ clearPinned = false, clearHeld = false } = {}) => {
            if (clearPinned) statusRevealPinned = false;
            if (clearHeld) statusRevealHeld = false;
            if (!statusRevealHeld && !statusRevealPinned) {
                clearStatusRevealPanels();
            }
            syncStatusRevealButton();
        };

        const getTemplateMetadataValue = (metadata = {}, key = '') => {
            if (!metadata || typeof metadata !== 'object' || !key) return undefined;
            if (metadata[key] !== undefined && metadata[key] !== null) {
                return metadata[key];
            }
            const normalizedKey = String(key).toLowerCase();
            const matchedEntry = Object.entries(metadata).find(([entryKey, entryValue]) => {
                if (entryValue === undefined || entryValue === null) return false;
                return String(entryKey).toLowerCase() === normalizedKey;
            });
            return matchedEntry ? matchedEntry[1] : undefined;
        };

        const renderTooltipTemplate = (template, metadata = {}, overrides = {}) => {
            if (typeof template !== 'string' || !template) return template;
            return template.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/g, (_, braceKey, bracketKey) => {
                const key = braceKey || bracketKey || '';
                if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                    return String(overrides[key]);
                }
                const value = getTemplateMetadataValue(metadata, key);
                if (value === undefined || value === null) {
                    return braceKey ? `{${key}}` : `[${key}]`;
                }
                if (typeof value === 'number') {
                    return Number.isFinite(value) ? String(value) : '0';
                }
                return String(value);
            });
        };

        const positionGlobalStatusTooltip = (
            event,
            anchorEl = null,
            preferRightFromAnchor = false,
            preferLeftOfCursor = false
        ) => {
            const tooltip = ensureGlobalStatusTooltip();
            const offset = 12;
            const rect = tooltip.getBoundingClientRect();
            let left;
            let top;
            if (preferLeftOfCursor) {
                left = event.clientX - rect.width - offset;
                top = event.clientY + offset;
                if (left < 8) {
                    left = Math.min(window.innerWidth - rect.width - 8, event.clientX + offset);
                }
            } else if (anchorEl && preferRightFromAnchor) {
                const anchorRect = anchorEl.getBoundingClientRect();
                left = anchorRect.right + 8;
                top = anchorRect.top + 4;
                if (left + rect.width > window.innerWidth - 8) {
                    left = window.innerWidth - rect.width - 8;
                }
                if (left < 8) {
                    left = 8;
                }
            } else {
                left = event.clientX + offset;
                top = event.clientY + offset;
                if (left + rect.width > window.innerWidth - 8) {
                    left = Math.max(8, event.clientX - rect.width - offset);
                }
            }
            if (top + rect.height > window.innerHeight - 8) {
                const fallbackTop = anchorEl
                    ? anchorEl.getBoundingClientRect().bottom - rect.height - 4
                    : event.clientY - rect.height - offset;
                top = Math.max(8, fallbackTop);
            }
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        };

        const renderStatusTooltipForCard = (
            card,
            unit,
            unitUsername = '',
            unitSlot = null,
            options = {}
        ) => {
            if (!card) return;
            const tooltipWrap = card.querySelector('.skilltooltips');
            const tooltipImgTemplate =
                tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                tooltipWrap?.querySelector('.skilltooltipimage');
            if (!tooltipWrap || !tooltipImgTemplate) return;
            const tentenWeaponStatusIconById = {
                tenten_weapon_last_shuriken: 'https://i.imgur.com/ZcuORyu.png',
                tenten_weapon_last_kunai: 'https://i.imgur.com/aibtrUO.png',
                tenten_weapon_last_sword: 'https://i.imgur.com/RchMcXa.png',
                tenten_weapon_last_hooked_sword: 'https://i.imgur.com/6j0UNBG.png',
                tenten_weapon_last_scythe: 'https://i.imgur.com/NXDITvE.png',
                tenten_weapon_last_mace: 'https://i.imgur.com/iRZ8SMk.png',
            };
            const rexAmmoStatusIconById = {
                rex_splode_explosive_baton_usage: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_baton_usage_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_usage: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_usage_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_ammo_swap_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_pocket_change_swap_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_baton_spent: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_spent: 'https://i.imgur.com/rSLzlpG.png',
            };
            const resolveStatusIconSrc = (group, statusSkill) => {
                const statusesInGroup = Array.isArray(group?.statuses) ? group.statuses : [];
                for (const status of statusesInGroup) {
                    if (typeof status?.metadata?.statusIconUrl === 'string' && status.metadata.statusIconUrl) {
                        return status.metadata.statusIconUrl;
                    }
                    const mapped = tentenWeaponStatusIconById[status?.id];
                    if (mapped) return mapped;
                    const rexMapped = rexAmmoStatusIconById[status?.id];
                    if (rexMapped) return rexMapped;
                }
                return statusSkill?.skillimage || '';
            };
            if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                tooltipImgTemplate.classList.add('status-icon-template');
            }
            const dead = isUnitDeadLike(unit);
            const isEnemySide = Boolean(tooltipWrap.closest('.enemy-characters'));
            const statuses = Array.isArray(unit?.state?.statuses)
                ? unit.state.statuses.filter(
                    (status) =>
                        (Number(status?.remainingTurns) || 0) > 0 &&
                        !Boolean(status?.metadata?.hideTooltip) &&
                        !(isEnemySide && Boolean(status?.metadata?.hideTooltipFromEnemy)) &&
                        !(
                            currentPlayerUsername === unitUsername &&
                            (Boolean(status?.metadata?.hideTooltipFromOwner) ||
                                Boolean(status?.metadata?.hideTooltipFromUnitOwner))
                        )
                )
                : [];
            const unitStatusIconKey =
                unitUsername && Number.isInteger(unitSlot) ? `${unitUsername}:${unitSlot}` : '';
            const revealActive = statusRevealHeld || statusRevealPinned;
            const renderSignature = getStatusRenderSignature({
                unit,
                statuses,
                unitUsername,
                unitSlot,
                isEnemySide,
                revealActive,
                dead,
            });
            if (!options.forceRender && !options.animateNewIcons && unitStatusIconKey) {
                const previousSignature = statusRenderSignatureByUnit.get(unitStatusIconKey);
                if (previousSignature === renderSignature) return;
            }
            if (unitStatusIconKey) {
                statusRenderSignatureByUnit.set(unitStatusIconKey, renderSignature);
            }
            if (dead) {
                syncLanternPassiveAura(card, []);
                syncGreenGoblinBombMarker(card, false);
                tooltipWrap
                    .querySelectorAll('.skilltooltipimage.dynamic-status-icon')
                    .forEach((node) => node.remove());
                tooltipWrap.style.visibility = 'hidden';
                tooltipWrap.classList.remove('has-status');
                tooltipImgTemplate.removeAttribute('title');
                tooltipImgTemplate.style.display = 'none';
                if (globalStatusTooltipEl) {
                    globalStatusTooltipEl.style.display = 'none';
                    globalStatusTooltipEl.innerHTML = '';
                }
                return;
            }
            const previousStatusIconKeys = unitStatusIconKey
                ? visibleStatusIconKeysByUnit.get(unitStatusIconKey) || new Set()
                : new Set();
            tooltipWrap
                .querySelectorAll('.skilltooltipimage.dynamic-status-icon')
                .forEach((node) => node.remove());
            if (!statuses.length) {
                syncLanternPassiveAura(card, []);
                syncGreenGoblinBombMarker(card, false);
                tooltipWrap.style.visibility = 'hidden';
                tooltipImgTemplate.removeAttribute('title');
                tooltipWrap.classList.remove('has-status');
                tooltipImgTemplate.style.display = 'none';
                if (unitStatusIconKey) {
                    visibleStatusIconKeysByUnit.set(unitStatusIconKey, new Set());
                }
                return;
            }
            tooltipWrap.style.visibility = 'visible';
            tooltipWrap.classList.add('has-status');
            syncLanternPassiveAura(card, statuses);
            const groupedStatuses = [];
            const groupByKey = new Map();
            statuses.forEach((status, index) => {
                const key = status?.sourceSkillId ? `skill:${status.sourceSkillId}` : `status:${status?.id}:${index}`;
                if (!groupByKey.has(key)) {
                    const group = {
                        key,
                        sourceSkillId: status?.sourceSkillId || null,
                        statuses: [],
                    };
                    groupByKey.set(key, group);
                    groupedStatuses.push(group);
                }
                groupByKey.get(key).statuses.push(status);
            });
            const currentStatusIconKeys = new Set(groupedStatuses.map((group) => group.key));
            if (unitStatusIconKey) {
                visibleStatusIconKeysByUnit.set(unitStatusIconKey, currentStatusIconKeys);
            }
            const greenGoblinBombCount = statuses.filter(isGreenGoblinBombStatus).length;
            const hasGreenGoblinBomb = greenGoblinBombCount > 0;
            const hasNewGreenGoblinBomb = groupedStatuses.some(
                (group) =>
                    (Array.isArray(group?.statuses) ? group.statuses : []).some(isGreenGoblinBombStatus) &&
                    !previousStatusIconKeys.has(group.key)
            );
            syncGreenGoblinBombMarker(
                card,
                greenGoblinBombCount,
                (options.animateNewIcons || previousStatusIconKeys.size > 0) && hasNewGreenGoblinBomb
            );

            const buildStatusTooltipHtml = (group, statusSkill) => {
                const groupStatuses = Array.isArray(group?.statuses) ? group.statuses : [];
                const skillName =
                    groupStatuses[0]?.metadata?.sourceSkillName ||
                    statusSkill?.name ||
                    'Status';
                const groupedDamageDebuffTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.DamageDebuff) || 0);
                }, 0);
                const groupedNonAfflictionDebuffTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.NonAfflictionDamageDebuff) || 0);
                }, 0);
                const groupedTurnEndDamageTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.turnEndDamage) || 0);
                }, 0);
                const formatTurnsLabel = (remainingTurns) => {
                    const remaining = Math.max(0, Number(remainingTurns) || 0);
                    if (remaining >= 99) return 'Infinite';
                    return `${remaining} TURN${remaining === 1 ? '' : 'S'} LEFT`;
                };
                const textRows = [];
                groupStatuses.forEach((status) => {
                    const statusMetadata = status?.metadata || {};
                    let text =
                        statusMetadata?.tooltipText ||
                        findTooltipTextByStatusId(status?.id) ||
                        status?.id ||
                        'Status effect';
                    const tooltipTemplate =
                        typeof statusMetadata?.tooltipTextTemplate === 'string'
                            ? statusMetadata.tooltipTextTemplate
                            : '';
                    const pendingRestoreTooltipTemplate =
                        typeof statusMetadata?.destructibleDefenseRestore?.pendingTooltipTextTemplate === 'string'
                            ? statusMetadata.destructibleDefenseRestore.pendingTooltipTextTemplate
                            : '';
                    const restoreTurnsLeft = Math.max(
                        0,
                        Number(statusMetadata?._destructibleDefenseRestoreTurnsLeft) || 0
                    );
                    const runtimeTooltipTemplate =
                        restoreTurnsLeft > 0 && pendingRestoreTooltipTemplate
                            ? pendingRestoreTooltipTemplate
                            : tooltipTemplate;
                    if (runtimeTooltipTemplate) {
                        const stackKey =
                            typeof statusMetadata?.stackMetadataKey === 'string'
                                ? statusMetadata.stackMetadataKey
                                : '';
                        text = renderTooltipTemplate(runtimeTooltipTemplate, statusMetadata, {
                            ...(stackKey
                                ? { stacks: Math.max(0, Number(statusMetadata?.[stackKey]) || 0) }
                                : {}),
                            restoreTurnsLeft,
                            ...(groupedTurnEndDamageTotal > 0 ? { turnEndDamage: groupedTurnEndDamageTotal } : {}),
                            ...(groupedNonAfflictionDebuffTotal > 0
                                ? { NonAfflictionDamageDebuff: groupedNonAfflictionDebuffTotal }
                                : {}),
                            ...(groupedDamageDebuffTotal > 0 ? { DamageDebuff: groupedDamageDebuffTotal } : {}),
                        });
                    }
                    const hasCustomTooltipText = Boolean(statusMetadata?.tooltipText || runtimeTooltipTemplate);
                    if (groupedNonAfflictionDebuffTotal > 0 && !hasCustomTooltipText) {
                        const ownDebuff = Math.max(
                            0,
                            Number(status?.metadata?.NonAfflictionDamageDebuff) || 0
                        );
                        if (ownDebuff > 0) {
                            text = `This character deals ${groupedNonAfflictionDebuffTotal} less non-affliction damage.`;
                        }
                    }
                    if (groupedDamageDebuffTotal > 0 && !hasCustomTooltipText) {
                        const ownDebuff = Math.max(0, Number(status?.metadata?.DamageDebuff) || 0);
                        if (ownDebuff > 0) {
                            text = `This character deals ${groupedDamageDebuffTotal} less damage.`;
                        }
                    }
                    const skillDamageBonuses =
                        status?.metadata?.skillDamageBonuses &&
                        typeof status.metadata.skillDamageBonuses === 'object'
                            ? status.metadata.skillDamageBonuses
                            : null;
                    if (skillDamageBonuses && !hasCustomTooltipText) {
                        const bonusLines = Object.entries(skillDamageBonuses)
                            .map(([skillId, value]) => {
                                const bonus = Number(value) || 0;
                                if (!skillId || bonus <= 0) return null;
                                const bonusSkill = findSkillById(skillId);
                                const bonusSkillName = bonusSkill?.name || 'This skill';
                                return `${bonusSkillName} deals ${bonus} additional permanent damage.`;
                            })
                            .filter(Boolean);
                        if (bonusLines.length > 0) {
                            text = bonusLines.join(' ');
                        }
                    }
                    const byRemaining = status?.metadata?.skillReplacementsByRemainingTurns;
                    if (byRemaining && typeof byRemaining === 'object') {
                        const remaining = Math.max(0, Number(status?.remainingTurns) || 0);
                        const replacements =
                            byRemaining[String(remaining)] || byRemaining[remaining] || null;
                        if (replacements && typeof replacements === 'object') {
                            const firstReplacementId = Object.values(replacements).find((id) => Boolean(id));
                            const replacementSkill = findSkillById(firstReplacementId);
                            const replacementName = replacementSkill?.name || null;
                            if (replacementName) {
                                if (text.includes('replaced by: .')) {
                                    text = text.replace('replaced by: .', `replaced by: ${replacementName}.`);
                                } else if (text.includes('replaced by:')) {
                                    text = `${text} ${replacementName}`;
                                }
                            }
                        }
                    }
                    const remaining = Math.max(0, Number(status?.remainingTurns) || 0);
                    const key = `${text}::${remaining}`;
                    if (textRows.some((row) => row.key === key)) return;
                    textRows.push({
                        key,
                        text,
                        remaining,
                    });
                });
                const textLinesHtml = textRows
                    .map((row, idx) => {
                        const line =
                            `<div class="status-tooltip-desc-line">- ${escapeHtml(row.text)}</div>`;
                        const turns =
                            `<div class="status-tooltip-turns">${escapeHtml(formatTurnsLabel(row.remaining))}</div>`;
                        const divider =
                            idx < textRows.length - 1
                                ? `<div class="status-tooltip-line-divider"></div>`
                                : '';
                        return `${line}${turns}${divider}`;
                    })
                    .join('');
                return (
                    `<div class="status-tooltip-item">` +
                        `<div class="status-tooltip-title">${escapeHtml(skillName)}</div>` +
                        `<div class="status-tooltip-desc">${textLinesHtml}</div>` +
                    `</div>`
                );
            };

            groupedStatuses.forEach((group, index) => {
                const statusSkill = findSkillById(group?.sourceSkillId);
                const tooltipHtml = getCachedStatusTooltipHtml(group, statusSkill, buildStatusTooltipHtml);
                group.tooltipHtml = tooltipHtml;
                const iconEl =
                    index === 0 ? tooltipImgTemplate : tooltipImgTemplate.cloneNode(true);
                if (index > 0) {
                    iconEl.classList.remove('status-icon-template');
                    iconEl.classList.add('dynamic-status-icon');
                } else {
                    iconEl.classList.remove('dynamic-status-icon');
                }
                iconEl.style.display = 'block';
                iconEl.removeAttribute('title');
                const iconSrc = resolveStatusIconSrc(group, statusSkill);
                if (iconSrc) {
                    iconEl.src = iconSrc;
                }
                const isNewStatusIcon = !previousStatusIconKeys.has(group.key);
                const isPassiveStatus =
                    /passive/i.test(statusSkill?.name || '') ||
                    /passive/i.test(group?.sourceSkillId || '');
                if ((options.animateNewIcons || previousStatusIconKeys.size > 0) && isNewStatusIcon) {
                    iconEl.classList.remove('status-icon-turn-pop');
                    void iconEl.offsetWidth;
                    iconEl.classList.add('status-icon-turn-pop');
                    showStatusApplyBurst(card, group, statusSkill);
                    const lanternVisual = group.statuses.map(getLanternEffectVisual).find(Boolean);
                    if (lanternVisual) {
                        showLanternTriggerBurst(card, lanternVisual);
                        const sourceStatus = group.statuses.find((status) => {
                            const parsedSlot = Number.parseInt(status?.sourceSlot, 10);
                            return status?.sourceUsername && Number.isInteger(parsedSlot) && parsedSlot >= 0;
                        });
                        if (sourceStatus) {
                            showLanternEnergyLink({
                                sourceUsername: sourceStatus.sourceUsername,
                                sourceSlot: Number.parseInt(sourceStatus.sourceSlot, 10),
                                targetCard: card,
                                visual: lanternVisual,
                            });
                        }
                    }
                    window.setTimeout(() => {
                        iconEl.classList.remove('status-icon-turn-pop');
                    }, 650);
                }
                if (isNewStatusIcon && isPassiveStatus && previousStatusIconKeys.size > 0) {
                    iconEl.classList.remove('passive-trigger-flash');
                    void iconEl.offsetWidth;
                    iconEl.classList.add('passive-trigger-flash');
                    window.setTimeout(() => {
                        iconEl.classList.remove('passive-trigger-flash');
                    }, 760);
                }
                iconEl.onmouseenter = (event) => {
                    const tooltip = ensureGlobalStatusTooltip();
                    tooltip.innerHTML = tooltipHtml;
                    tooltip.style.display = 'block';
                    const anchor = iconEl;
                    positionGlobalStatusTooltip(event, anchor, false, isEnemySide);
                };
                iconEl.onmousemove = (event) => {
                    if (!globalStatusTooltipEl || globalStatusTooltipEl.style.display === 'none') return;
                    const anchor = iconEl;
                    positionGlobalStatusTooltip(event, anchor, false, isEnemySide);
                };
                iconEl.onmouseleave = () => {
                    if (!globalStatusTooltipEl) return;
                    globalStatusTooltipEl.style.display = 'none';
                    globalStatusTooltipEl.innerHTML = '';
                };
                if (index > 0) {
                    tooltipWrap.appendChild(iconEl);
                }
            });
            if (statusRevealHeld || statusRevealPinned) {
                const panel = document.createElement('div');
                panel.className = 'status-reveal-panel';
                panel.innerHTML = groupedStatuses.map((group) => group.tooltipHtml || '').join('');
                tooltipWrap.appendChild(panel);
            }
        };

        const renderBoardStatuses = (data, options = {}) => {
            const revealActive = statusRevealHeld || statusRevealPinned;
            if (!revealActive || options.forceRender) {
                clearStatusRevealPanels();
            }
            if (!data || typeof data !== 'object') return;
            const board = data.board && typeof data.board === 'object' ? data.board : null;
            if (!board) return;
            const playerUnits = currentPlayerUsername ? board[currentPlayerUsername] : null;
            const opponentUsername = data.opponent?.username || currentOpponentUsername;
            const opponentUnits = opponentUsername ? board[opponentUsername] : null;
            if (Array.isArray(playerCards) && Array.isArray(playerUnits)) {
                playerCards.forEach((card, slot) =>
                    renderStatusTooltipForCard(card, playerUnits[slot], currentPlayerUsername || '', slot, options)
                );
            }
            if (Array.isArray(enemyCards) && Array.isArray(opponentUnits)) {
                enemyCards.forEach((card, slot) =>
                    renderStatusTooltipForCard(card, opponentUnits[slot], opponentUsername || '', slot, options)
                );
            }
            if (statusRevealHeld || statusRevealPinned) {
                document.body.classList.add('status-reveal-active');
            }
            syncStatusRevealButton();
            syncStormWeather(board);
        };

        const refreshStatusRevealPanels = () => {
            if (!latestBoardState) {
                clearStatusRevealPanels();
                syncStatusRevealButton();
                return;
            }
            renderBoardStatuses(
                { board: latestBoardState, opponent: { username: currentOpponentUsername } },
                { forceRender: true }
            );
        };

        if (statusRevealToggleButton) {
            statusRevealToggleButton.addEventListener('click', () => {
                statusRevealPinned = !statusRevealPinned;
                refreshStatusRevealPanels();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Shift' || event.repeat || !uiSettings.shiftStatusReveal) return;
            const target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) {
                return;
            }
            statusRevealHeld = true;
            refreshStatusRevealPanels();
        });

        document.addEventListener('keyup', (event) => {
            if (event.key !== 'Shift') return;
            hideStatusReveal({ clearHeld: true });
        });

        window.addEventListener('blur', () => {
            hideStatusReveal({ clearHeld: true });
        });

        const parseUnitKey = (value = '') => {
            if (typeof value !== 'string' || !value.includes(':')) return null;
            const [username, slotRaw] = value.split(':');
            const slot = Number.parseInt(slotRaw, 10);
            if (!username || !Number.isInteger(slot) || slot < 0) return null;
            return { username, slot };
        };

        const getAliveBoardEntries = (board, username) => {
            const units = Array.isArray(board?.[username]) ? board[username] : [];
            return units
                .map((unit, slot) => ({ unit, slot, username }))
                .filter((entry) => entry.unit && !isUnitDeadLike(entry.unit));
        };

        const getPredictedRicochetTargets = (board, previousKey = '') => {
            const previous = parseUnitKey(previousKey);
            if (!previous) return [];
            let pool = getAliveBoardEntries(board, previous.username);
            if (!pool.length) return [];
            if (pool.length > 1) {
                const changedPool = pool.filter((entry) => entry.slot !== previous.slot);
                if (changedPool.length > 0) {
                    pool = changedPool;
                }
            }
            const distanceEntries = pool
                .map((entry) => ({
                    ...entry,
                    distance: Math.abs(entry.slot - previous.slot),
                }))
                .filter((entry) => Number.isFinite(entry.distance));
            if (!distanceEntries.length) return [];
            const nearestDistance = Math.min(...distanceEntries.map((entry) => entry.distance));
            return distanceEntries.filter((entry) => entry.distance === nearestDistance);
        };

        const appendPredatorRicochetMarker = ({ card, iconSrc = '', possible = false }) => {
            if (!card) return;
            const face = card.querySelector('.character-face');
            if (face?.parentElement && !card.querySelector('.predator-ricochet-portrait-marker')) {
                const marker = document.createElement('div');
                marker.className = 'predator-ricochet-portrait-marker';
                marker.title = possible
                    ? 'Possible next Yautja Shuriken ricochet target'
                    : 'Next Yautja Shuriken ricochet target';
                marker.innerHTML = iconSrc ? `<img src="${iconSrc}" alt="">` : '<span></span>';
                face.parentElement.appendChild(marker);
            }
            const tooltipWrap = card.querySelector('.skilltooltips');
            const tooltipImgTemplate =
                tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                tooltipWrap?.querySelector('.skilltooltipimage');
            if (!tooltipWrap || !tooltipImgTemplate) return;
            if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                tooltipImgTemplate.classList.add('status-icon-template');
            }
            tooltipWrap.style.visibility = 'visible';
            tooltipWrap.classList.add('has-status');
            const iconEl = tooltipImgTemplate.cloneNode(true);
            iconEl.classList.remove('status-icon-template', 'dynamic-status-icon');
            iconEl.classList.add('dynamic-ricochet-target-icon');
            iconEl.style.display = 'block';
            if (iconSrc) {
                iconEl.src = iconSrc;
            }
            iconEl.title = possible
                ? 'Possible next Yautja Shuriken ricochet target'
                : 'Next Yautja Shuriken ricochet target';
            tooltipWrap.appendChild(iconEl);
        };

        const renderPredatorRicochetPreviews = (board, pendingTurn = null) => {
            const allCards = [...(Array.isArray(playerCards) ? playerCards : []), ...(Array.isArray(enemyCards) ? enemyCards : [])];
            allCards.forEach((card) => {
                card?.querySelectorAll?.('.skilltooltipimage.dynamic-ricochet-target-icon').forEach((node) => node.remove());
                card?.querySelectorAll?.('.predator-ricochet-portrait-marker').forEach((node) => node.remove());
            });
            const shurikenSkill = findSkillById('predator-stalker-yautja-shuriken');
            const iconSrc = shurikenSkill?.skillimage || '';
            const previewEntries = [];
            const pushTargetsFromPreviousKey = (previousKey = '') => {
                const targets = getPredictedRicochetTargets(board, previousKey);
                targets.forEach((entry) => {
                    previewEntries.push({
                        ...entry,
                        possible: targets.length > 1,
                    });
                });
            };
            Object.values(board || {}).forEach((units) => {
                if (!Array.isArray(units)) return;
                units.forEach((unit) => {
                    const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
                    statuses.forEach((status) => {
                        const remaining = Number(status?.remainingTurns) || 0;
                        if (remaining <= 0) return;
                        if (
                            status?.id !== 'predator_stalker_yautja_shuriken_bounce_one' &&
                            status?.id !== 'predator_stalker_yautja_shuriken_bounce_two'
                        ) {
                            return;
                        }
                        const previousKey =
                            typeof status?.metadata?._lastRandomStatusEnemyKey === 'string'
                                ? status.metadata._lastRandomStatusEnemyKey
                                : '';
                        pushTargetsFromPreviousKey(previousKey);
                    });
                });
            });
            const pending = normalizePendingTurn(pendingTurn || pendingTurnState);
            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const actorSlot = Number.parseInt(queued?.actorSlot, 10);
                const skillIdx = Number.parseInt(queued?.skillIndex, 10);
                const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
                const actorCharacter = Number.isInteger(actorUnit?.rosterIndex) ? rosterData?.[actorUnit.rosterIndex] : null;
                const actorCharacterId = actorCharacter?.characterId || actorCharacter?.id || '';
                const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx);
                if (actorCharacterId !== 'predator-stalker' || effectiveSkill?.id !== 'predator-stalker-yautja-shuriken') return;
                const selection = Array.isArray(queued?.targetSelection)
                    ? queued.targetSelection
                    : queued?.targetSelection
                        ? [queued.targetSelection]
                        : [];
                const firstTarget = selection.find((target) => target?.username && Number.isInteger(Number.parseInt(target?.slot, 10)));
                if (!firstTarget) return;
                pushTargetsFromPreviousKey(`${firstTarget.username}:${Number.parseInt(firstTarget.slot, 10)}`);
            });
            previewEntries.forEach((entry) => {
                const card = getCardByUsernameSlot(entry.username, entry.slot);
                appendPredatorRicochetMarker({ card, iconSrc, possible: entry.possible });
            });
        };

        const unitHasActiveStatus = (unit, predicate) => {
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            return statuses.some((status) => (Number(status?.remainingTurns) || 0) > 0 && predicate(status));
        };

        const teamHasStormRain = (units = []) =>
            (Array.isArray(units) ? units : []).some((unit) => {
                const character = Number.isInteger(unit?.rosterIndex) ? rosterData?.[unit.rosterIndex] : null;
                const characterId = character?.characterId || character?.id || '';
                return (
                    characterId === 'storm' &&
                    unitHasActiveStatus(unit, (status) => status?.id === 'storm_rainstorm_active')
                );
            });

        const teamHasStormHail = (units = []) =>
            (Array.isArray(units) ? units : []).some((unit) =>
                unitHasActiveStatus(unit, (status) => status?.id === 'storm_hailstorm_damage')
            );

        const syncStormWeather = (board) => {
            const playerUnits = currentPlayerUsername ? board?.[currentPlayerUsername] : null;
            const opponentUnits = currentOpponentUsername ? board?.[currentOpponentUsername] : null;
            const playerContainer = document.querySelector('.player-characters');
            const enemyContainer = document.querySelector('.enemy-characters');
            const playerRain = teamHasStormRain(playerUnits);
            const enemyRain = teamHasStormRain(opponentUnits);
            const playerHail = teamHasStormHail(playerUnits);
            const enemyHail = teamHasStormHail(opponentUnits);
            playerContainer?.classList.toggle('storm-rain-weather', playerRain);
            enemyContainer?.classList.toggle('storm-rain-weather', enemyRain);
            playerContainer?.classList.toggle('storm-hail-weather', playerHail);
            enemyContainer?.classList.toggle('storm-hail-weather', enemyHail);
            soundManager.syncAmbientEffects([
                playerRain || enemyRain ? 'rain' : '',
                playerHail || enemyHail ? 'hail' : '',
            ]);
        };

        const applyMatchState = (data, options = {}) => {
            if (!data || typeof data !== 'object') return;
            if (battleEndShown) return;
            if (isPlayingResolutionSequence && !options.allowDuringResolutionSequence) {
                deferredResolutionMatchState = data;
                return;
            }
            if (data.player?.username) {
                currentPlayerUsername = data.player.username;
            }
            if (Array.isArray(data.player?.team)) {
                currentPlayerTeam = data.player.team
                    .map((slot) => Number.parseInt(slot, 10))
                    .filter((slot) => Number.isInteger(slot) && slot >= 0);
            }
            const backgroundEl = document.querySelector('.backgroundingame');
            if (backgroundEl) {
                const overrideUrl =
                    typeof data.backgroundOverride === 'string' ? data.backgroundOverride.trim() : '';
                backgroundEl.style.backgroundImage = overrideUrl
                    ? `url("${overrideUrl}")`
                    : profileIngameBackgroundUrl;
            }
            if (typeof data.mode === 'string' && data.mode.trim()) {
                currentMatchMode = data.mode.trim().toLowerCase();
            }
            if (data.opponent?.username) {
                const nextOpponentUsername = data.opponent.username;
                const nextOpponentDisplayName =
                    data.opponent.displayName ||
                    (isGameBotUsername(nextOpponentUsername) ? 'Game Bot' : nextOpponentUsername);
                const opponentChanged = nextOpponentUsername !== currentOpponentUsername;
                currentOpponentUsername = nextOpponentUsername;
                currentOpponentDisplayName = nextOpponentDisplayName;
                if (opponentChanged) {
                    if (data.opponent.isBot) {
                        applyOpponentIdentity({
                            name: nextOpponentDisplayName,
                            avatarUrl: defaultProfileAvatar,
                            ladder: null,
                        });
                    } else {
                        hydrateOpponentIdentity(nextOpponentUsername).catch(() => {});
                    }
                }
            }
            const pool = data.chakraPools?.[currentPlayerUsername] || playerPoolState || emptyPool();
            const shouldAnimateNewTurnStatusIcons = Boolean(
                data.currentTurn &&
                data.currentTurn !== lastTurnOwner &&
                hasInitializedTurnState
            );
            measureIngamePerf('preload:match-visuals', () => preloadMatchVisualImages(data));
            measureIngamePerf('render:chakra', () => renderChakra(pool));
            measureIngamePerf('render:health', () => renderBoardHealth(data));
            measureIngamePerf('render:statuses', () =>
                renderBoardStatuses(data, { animateNewIcons: shouldAnimateNewTurnStatusIcons })
            );
            measureIngamePerf('render:cooldowns', () =>
                renderSkillCooldownBadges(data, { animateTicks: shouldAnimateNewTurnStatusIcons })
            );
            pendingTurnState = normalizePendingTurn(data.pendingTurn);
            optimisticQueuedByActorSlot.clear();
            optimisticCancelledActorSlots.clear();
            clearSkillInteractionCache();
            measureIngamePerf('render:queued-skills', () => applyQueuedSkillVisuals());
            if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                measureIngamePerf('render:end-turn-modal', () => renderEndTurnModal(pool, pendingTurnState));
            }
            if (data.board && typeof data.board === 'object') {
                measureIngamePerf('render:predator-ricochet', () =>
                    renderPredatorRicochetPreviews(data.board, pendingTurnState)
                );
            }
            if (data.status === 'ended') {
                const didWin = Boolean(data.winner && usernamesMatch(data.winner, currentPlayerUsername));
                const opponentFromResult = didWin ? data.surrenderedBy : data.winner;
                showBattleEndOverlay({
                    didWin,
                    opponentUsername:
                        (data.opponent?.isBot ? data.opponent.displayName : null) ||
                        (opponentFromResult && isGameBotUsername(opponentFromResult) ? 'Game Bot' : opponentFromResult) ||
                        data.opponent?.displayName ||
                        data.opponent?.username ||
                        currentOpponentDisplayName ||
                        currentOpponentUsername,
                    expDelta: data.ladderResult?.expDelta,
                    clanExpDelta: data.ladderResult?.clanExpDelta,
                });
                return;
            }
            const playerAlive = getAliveCountFromUnits(data.board?.[currentPlayerUsername] || []);
            const opponentAlive = getAliveCountFromUnits(data.board?.[currentOpponentUsername] || []);
            if (
                currentPlayerUsername &&
                currentOpponentUsername &&
                (playerAlive <= 0 || opponentAlive <= 0)
            ) {
                if (currentMatchMode === 'ladder') {
                    return;
                }
                showBattleEndOverlay({
                    didWin: playerAlive > opponentAlive,
                    opponentUsername: currentOpponentDisplayName || currentOpponentUsername,
                });
                return;
            }
            syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
        };

        setSkillInteractivity(true);
        renderChakra();

        const energyClassMap = {
            ninjutsu: 'blue',
            bloodline: 'red',
            taijutsu: 'green',
            genjutsu: 'white',
            random: 'black',
        };

        const renderQueuedTargetTooltips = () => {
            const allCards = [...(Array.isArray(playerCards) ? playerCards : []), ...(Array.isArray(enemyCards) ? enemyCards : [])];
            allCards.forEach((card) => {
                const wrap = card?.querySelector('.skilltooltips');
                if (!wrap) return;
                wrap.querySelectorAll('.skilltooltipimage.dynamic-queued-target-icon').forEach((node) => node.remove());
            });

            const pending = normalizePendingTurn(pendingTurnState);
            const queuedByTargetKey = new Map();
            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const actorSlot = Number.parseInt(queued?.actorSlot, 10);
                const skillIdx = Number.parseInt(queued?.skillIndex, 10);
                const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx);
                const iconSrc = effectiveSkill?.skillimage || '';
                const selection = Array.isArray(queued?.targetSelection)
                    ? queued.targetSelection
                    : queued?.targetSelection
                        ? [queued.targetSelection]
                        : [];
                selection.forEach((target) => {
                    const username = target?.username;
                    const slot = Number.parseInt(target?.slot, 10);
                    if (!username || !Number.isInteger(slot) || slot < 0) return;
                    const unit = latestBoardState?.[username]?.[slot];
                    if (unit && isUnitDeadLike(unit)) return;
                    const card = getCardByUsernameSlot(username, slot) || (
                        username === currentPlayerUsername
                            ? (Array.isArray(playerCards) ? playerCards[slot] : null)
                            : (Array.isArray(enemyCards) ? enemyCards[slot] : null)
                    );
                    if (!card) return;
                    const key = `${username}:${slot}`;
                    if (!queuedByTargetKey.has(key)) {
                        queuedByTargetKey.set(key, {
                            card,
                            entries: [],
                        });
                    }
                    queuedByTargetKey.get(key).entries.push({
                        iconSrc,
                        skillName: effectiveSkill?.name || 'Queued Skill',
                    });
                });
            });

            queuedByTargetKey.forEach(({ card, entries }) => {
                const tooltipWrap = card?.querySelector('.skilltooltips');
                const tooltipImgTemplate =
                    tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                    tooltipWrap?.querySelector('.skilltooltipimage');
                if (!tooltipWrap || !tooltipImgTemplate) return;
                if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                    tooltipImgTemplate.classList.add('status-icon-template');
                }
                tooltipWrap.style.visibility = 'visible';
                entries.forEach((entry) => {
                    const iconEl = tooltipImgTemplate.cloneNode(true);
                    iconEl.classList.remove('status-icon-template', 'dynamic-status-icon');
                    iconEl.classList.add('dynamic-queued-target-icon');
                    iconEl.style.display = 'block';
                    if (entry.iconSrc) {
                        iconEl.src = entry.iconSrc;
                    }
                    iconEl.title = `Targeted by: ${entry.skillName}`;
                    tooltipWrap.appendChild(iconEl);
                });
            });
        };

        const renderSkillInfo = (character, skill, actorSlot = null, skillIdx = null) => {
            if (!skill || !character) return;
            const actorUnit =
                actorSlot !== null && currentPlayerUsername && latestBoardState?.[currentPlayerUsername]
                    ? latestBoardState[currentPlayerUsername][actorSlot]
                    : null;
            const usageState = getSkillUsageState(actorUnit, skill);
            if (skillInfo.imgEl) {
                skillInfo.imgEl.src = skill.skillimage || '';
                skillInfo.imgEl.alt = skill.name || 'Skill';
            }
            if (skillInfo.nameEl) {
                skillInfo.nameEl.textContent = skill.name || 'Skill';
            }
            if (skillInfo.roleEl) {
                skillInfo.roleEl.textContent = '';
                skillInfo.roleEl.style.display = 'none';
            }
            if (skillInfo.descEl) {
                skillInfo.descEl.textContent = getSkillDescriptionText(skill);
            }
            if (skillInfo.cooldownEl) {
                skillInfo.cooldownEl.textContent = `Cooldown: ${skill.cooldown ?? '-'}`;
            }
            if (skillInfo.classesEl) {
                const classes = getVisibleSkillClasses(skill.classes).join(', ');
                skillInfo.classesEl.textContent = `Classes: ${classes}`;
            }
            if (skillInfo.classPickerWrapEl && skillInfo.classPickerEl) {
                const options = getClassChoiceOptions(skill);
                const picker = skillInfo.classPickerEl;
                const key = getClassChoiceKey(actorSlot, skillIdx);
                if (!options.length || !key) {
                    skillInfo.classPickerWrapEl.style.display = 'none';
                    picker.innerHTML = '';
                } else {
                    const queuedForActor = getQueuedSkillForActorSlot(actorSlot);
                    const queuedChoice =
                        queuedForActor && Number.parseInt(queuedForActor.skillIndex, 10) === skillIdx
                            ? normalizeClassChoice(queuedForActor.classChoice)
                            : '';
                    const storedChoice = normalizeClassChoice(classChoiceBySkillKey.get(key));
                    const selectedChoice = [queuedChoice, storedChoice, options[0]].find(
                        (entry) => entry && options.includes(entry)
                    );
                    classChoiceBySkillKey.set(key, selectedChoice);
                    skillInfo.classPickerWrapEl.style.display = 'flex';
                    picker.innerHTML = '';
                    options.forEach((optionValue) => {
                        const optionEl = document.createElement('option');
                        optionEl.value = optionValue;
                        optionEl.textContent = formatClassChoiceLabel(optionValue);
                        picker.appendChild(optionEl);
                    });
                    picker.value = selectedChoice;
                    picker.onchange = () => {
                        const next = normalizeClassChoice(picker.value);
                        if (!next || !options.includes(next)) return;
                        classChoiceBySkillKey.set(key, next);
                        if (
                            activeCastingSkill &&
                            activeCastingSkill.actorSlot === actorSlot &&
                            activeCastingSkill.skillIdx === skillIdx
                        ) {
                            activeCastingSkill.classChoice = next;
                        }
                    };
                }
            }
            if (skillInfo.energyEl) {
                skillInfo.energyEl.innerHTML = '';
                const label = document.createElement('span');
                label.textContent = 'Energy:';
                skillInfo.energyEl.appendChild(label);
                const effectiveEnergy = getEffectiveEnergyList(skill.energy || [], actorSlot, skill);
                if (!effectiveEnergy.length) {
                    const noneText = document.createElement('span');
                    noneText.className = 'energy-none';
                    noneText.textContent = ' none';
                    skillInfo.energyEl.appendChild(noneText);
                    return;
                }
                effectiveEnergy.forEach((type) => {
                    const box = document.createElement('span');
                    const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
                    const cls = energyClassMap[normalized];
                    box.className = ['chakra-box', cls].filter(Boolean).join(' ');
                    if (!cls) {
                        box.style.backgroundColor = '#000';
                    }
                    skillInfo.energyEl.appendChild(box);
                });
            }
        };

        const getCharacterRoleText = (character) => {
            const role =
                character?.role ||
                character?.characterRole ||
                character?.metadata?.role ||
                character?.details?.role ||
                '';
            return typeof role === 'string' && role.trim() ? role.trim() : 'None';
        };

        const renderCharacterInfo = (character, actorSlot = null) => {
            if (!character) return;
            const roleText = getCharacterRoleText(character);
            if (skillInfo.imgEl) {
                skillInfo.imgEl.src = character.facePicture || character.url || '';
                skillInfo.imgEl.alt = character.name || 'Character';
            }
            if (skillInfo.nameEl) {
                skillInfo.nameEl.textContent = character.name || 'Character';
            }
            if (skillInfo.roleEl) {
                skillInfo.roleEl.textContent = `Role: ${roleText}`;
                skillInfo.roleEl.style.display = '';
            }
            if (skillInfo.descEl) {
                skillInfo.descEl.textContent = `Role: ${roleText}\n\n${getCharacterDescriptionText(character)}`;
            }
            if (skillInfo.cooldownEl) {
                skillInfo.cooldownEl.textContent = '';
            }
            if (skillInfo.classesEl) {
                skillInfo.classesEl.textContent = `Character | Role: ${roleText}`;
            }
            if (skillInfo.classPickerWrapEl && skillInfo.classPickerEl) {
                skillInfo.classPickerWrapEl.style.display = 'none';
                skillInfo.classPickerEl.innerHTML = '';
            }
            if (skillInfo.energyEl) {
                skillInfo.energyEl.innerHTML = '';
                const label = document.createElement('span');
                label.textContent = 'Skills:';
                skillInfo.energyEl.appendChild(label);
            }
            renderSkillBrowserForCharacter(character, actorSlot, null);
        };

        const renderSkillBrowserForCharacter = (character, actorSlot = null, selectedSkillIdx = null) => {
            if (!skillInfo.browserIconsEl) return;
            skillInfo.browserIconsEl.innerHTML = '';
            const skills = Array.isArray(character?.skills) ? character.skills.slice(0, 6) : [];
            skills.forEach((skill, index) => {
                if (!skill || skill.hiddenFromSelectionViewer) return;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'skill-browser-icon';
                button.dataset.skillIdx = String(index);
                if (selectedSkillIdx !== null && Number(index) === Number(selectedSkillIdx)) {
                    button.classList.add('active');
                }
                const img = document.createElement('img');
                img.src = skill.skillimage || '';
                img.alt = skill.name || `Skill ${index + 1}`;
                button.appendChild(img);
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    renderSkillInfo(character, skill, actorSlot, index);
                    renderSkillBrowserForCharacter(character, actorSlot, index);
                });
                skillInfo.browserIconsEl.appendChild(button);
            });
        };

        const updateSkillBrowserActiveIcon = (selectedSkillIdx = null) => {
            if (!skillInfo.browserIconsEl) return;
            Array.from(skillInfo.browserIconsEl.querySelectorAll('.skill-browser-icon')).forEach((button, index) => {
                const buttonSkillIdx = Number.parseInt(button.dataset.skillIdx, 10);
                button.classList.toggle(
                    'active',
                    selectedSkillIdx !== null &&
                        (Number.isInteger(buttonSkillIdx)
                            ? buttonSkillIdx === Number(selectedSkillIdx)
                            : Number(index) === Number(selectedSkillIdx))
                );
            });
        };

        const renderDynamicSkillIcons = () => {
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.baseSkill;
                if (!effectiveSkill) return;
                const actorUnit = latestBoardState?.[currentPlayerUsername]?.[meta.actorSlot];
                const usageState = getSkillUsageState(actorUnit, effectiveSkill);
                meta.skill = effectiveSkill;
                meta.imgEl.src = effectiveSkill.skillimage || '';
                meta.imgEl.alt = effectiveSkill.name || `Skill ${meta.skillIdx + 1}`;
                meta.imgEl.title = usageState.tooltipText || '';
            });
        };

        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const getIntroCharacter = (rosterIndex) => {
            const index = Number.parseInt(rosterIndex, 10);
            return Number.isInteger(index) ? rosterData?.[index] || null : null;
        };

        const renderBattleIntroTeam = (container, team = [], side = 'top') => {
            if (!container) return;
            container.innerHTML = '';
            (Array.isArray(team) ? team : []).slice(0, 3).forEach((rosterIndex, index) => {
                const character = getIntroCharacter(rosterIndex);
                if (!character) return;
                const item = document.createElement('div');
                item.className = 'battle-intro-character';
                item.style.animationDelay = `${side === 'top' ? 220 + index * 190 : 680 + index * 190}ms`;

                const image = document.createElement('img');
                image.src = character.facePicture || character.url || '';
                image.alt = character.name || `Character ${index + 1}`;
                item.appendChild(image);

                const label = document.createElement('span');
                label.textContent = character.name || `Character ${index + 1}`;
                item.appendChild(label);

                container.appendChild(item);
            });
        };

        const getCurrentPlayerAvatarUrl = () => {
            const cachedUser = readCachedUser();
            return profileCache?.profile?.avatarUrl || cachedUser?.avatarUrl || defaultProfileAvatar;
        };

        const getOpponentIntroAvatarUrl = async (opponent = {}) => {
            if (!opponent?.username || opponent?.isBot || isGameBotUsername(opponent.username)) {
                return defaultProfileAvatar;
            }
            const profile = await fetchPublicProfile(opponent.username);
            return profile?.profile?.avatarUrl || defaultProfileAvatar;
        };

        const setBattleIntroLadderStats = ({ recordEl, streakEl, ladder }) => {
            const normalized = normalizeLadderPresentation(ladder);
            if (recordEl) {
                recordEl.textContent = `${normalized.wins} - ${normalized.losses}`;
            }
            if (streakEl) {
                streakEl.textContent = formatSignedNumber(normalized.streak);
                streakEl.classList.toggle('positive', normalized.streak > 0);
                streakEl.classList.toggle('negative', normalized.streak < 0);
                streakEl.classList.toggle('neutral', normalized.streak === 0);
            }
        };

        const getCurrentPlayerIntroLadder = () => {
            const cachedUser = readCachedUser();
            return profileCache?.profile?.ladder || cachedUser?.ladder || null;
        };

        const hydrateOpponentIntroStats = async (opponent = {}) => {
            if (opponent?.isBot || isGameBotUsername(opponent?.username)) {
                setBattleIntroLadderStats({
                    recordEl: battleIntroTopRecordEl,
                    streakEl: battleIntroTopStreakEl,
                    ladder: null,
                });
                return;
            }
            const profile = await fetchPublicProfile(opponent?.username);
            setBattleIntroLadderStats({
                recordEl: battleIntroTopRecordEl,
                streakEl: battleIntroTopStreakEl,
                ladder: profile?.profile?.ladder || null,
            });
        };

        const playBattleIntro = async (data) => {
            if (hasPlayedBattleIntro || !battleIntroOverlayEl) return;
            hasPlayedBattleIntro = true;
            if (!uiSettings.battleIntro) {
                battleIntroOverlayEl.classList.remove('visible');
                battleIntroOverlayEl.setAttribute('aria-hidden', 'true');
                return;
            }
            const playerName = data?.player?.username || readCachedUser()?.username || 'Player';
            const opponentName =
                data?.opponent?.displayName ||
                (isGameBotUsername(data?.opponent?.username) ? 'Game Bot' : data?.opponent?.username) ||
                'Opponent';

            if (battleIntroTopNameEl) battleIntroTopNameEl.textContent = opponentName;
            if (battleIntroBottomNameEl) battleIntroBottomNameEl.textContent = playerName;
            if (battleIntroBottomAvatarEl) battleIntroBottomAvatarEl.src = getCurrentPlayerAvatarUrl();
            if (battleIntroTopAvatarEl) battleIntroTopAvatarEl.src = defaultProfileAvatar;
            setBattleIntroLadderStats({
                recordEl: battleIntroBottomRecordEl,
                streakEl: battleIntroBottomStreakEl,
                ladder: getCurrentPlayerIntroLadder(),
            });
            setBattleIntroLadderStats({
                recordEl: battleIntroTopRecordEl,
                streakEl: battleIntroTopStreakEl,
                ladder: null,
            });
            renderBattleIntroTeam(battleIntroTopTeamEl, data?.opponent?.team || [], 'top');
            renderBattleIntroTeam(battleIntroBottomTeamEl, data?.player?.team || [], 'bottom');

            getOpponentIntroAvatarUrl(data?.opponent || {})
                .then((avatarUrl) => {
                    if (battleIntroTopAvatarEl && avatarUrl) battleIntroTopAvatarEl.src = avatarUrl;
                })
                .catch(() => {});
            hydrateOpponentIntroStats(data?.opponent || {}).catch(() => {});

            battleIntroOverlayEl.setAttribute('aria-hidden', 'false');
            battleIntroOverlayEl.classList.remove('visible');
            void battleIntroOverlayEl.offsetWidth;
            battleIntroOverlayEl.classList.add('visible');
            await wait(BATTLE_INTRO_DURATION_MS);
            battleIntroOverlayEl.classList.remove('visible');
            battleIntroOverlayEl.setAttribute('aria-hidden', 'true');
        };

        const applyIncomingMatchState = (data, { playEntrySound = false } = {}) => {
            if (!data || typeof data !== 'object') return;
            if (data.player?.username) {
                currentPlayerUsername = data.player.username;
            }
            if (
                playEntrySound &&
                !hasPlayedMatchEntrySound &&
                data.player?.username &&
                data.currentTurn
            ) {
                playIngameSound(
                    usernamesMatch(data.player.username, data.currentTurn) ? startFirstSound : secondPlayerStartSound
                );
                hasPlayedMatchEntrySound = true;
            }
            applyMatchState(data);
            renderDynamicSkillIcons();
        };

        const scheduleIncomingMatchState = (data) => {
            if (!data || typeof data !== 'object') return;
            pendingSocketMatchState = data;
            if (pendingSocketMatchStateFrame !== null) return;
            pendingSocketMatchStateFrame = window.requestAnimationFrame(() => {
                const nextState = pendingSocketMatchState;
                pendingSocketMatchState = null;
                pendingSocketMatchStateFrame = null;
                applyIncomingMatchState(nextState);
            });
        };

        const clearMatchSocketReconnect = () => {
            if (matchSocketReconnectTimer) {
                clearTimeout(matchSocketReconnectTimer);
                matchSocketReconnectTimer = null;
            }
        };

        const setMatchChatStatus = (message = '') => {
            if (!matchChatStatusEl) return;
            matchChatStatusEl.textContent = message;
        };

        const syncMatchChatUnread = () => {
            if (matchChatUnreadEl) {
                matchChatUnreadEl.textContent = String(Math.min(99, matchChatUnreadCount));
            }
            if (matchChatEl) {
                matchChatEl.classList.toggle('has-unread', matchChatUnreadCount > 0);
            }
        };

        const formatMatchChatTime = (value) => {
            const date = value ? new Date(value) : new Date();
            if (Number.isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        };

        const syncMatchChatMute = () => {
            if (!matchChatMuteButton) return;
            matchChatMuteButton.classList.toggle('muted', matchChatOpponentMuted);
            matchChatMuteButton.setAttribute('aria-pressed', matchChatOpponentMuted ? 'true' : 'false');
            matchChatMuteButton.textContent = matchChatOpponentMuted ? 'Unmute' : 'Mute';
        };

        const appendMatchChatMessage = (payload = {}) => {
            if (!matchChatMessagesEl) return;
            const text = typeof payload.text === 'string' ? payload.text.trim() : '';
            if (!text) return;
            const isOwnMessage =
                currentPlayerUsername && usernamesMatch(payload.username || '', currentPlayerUsername);
            if (!isOwnMessage && matchChatOpponentMuted) {
                return;
            }
            const messageEl = document.createElement('div');
            messageEl.className = 'match-chat-message';
            if (isOwnMessage) {
                messageEl.classList.add('own');
            }
            const metaEl = document.createElement('div');
            metaEl.className = 'match-chat-message-meta';
            const nameEl = document.createElement('span');
            nameEl.className = 'match-chat-message-name';
            nameEl.textContent = payload.displayName || payload.username || 'Player';
            const timeEl = document.createElement('time');
            timeEl.className = 'match-chat-message-time';
            timeEl.dateTime = payload.sentAt || '';
            timeEl.textContent = formatMatchChatTime(payload.sentAt);
            const textEl = document.createElement('span');
            textEl.className = 'match-chat-message-text';
            textEl.textContent = text;
            metaEl.appendChild(nameEl);
            metaEl.appendChild(timeEl);
            messageEl.appendChild(metaEl);
            messageEl.appendChild(textEl);
            matchChatMessagesEl.appendChild(messageEl);
            while (matchChatMessagesEl.children.length > 80) {
                matchChatMessagesEl.removeChild(matchChatMessagesEl.firstElementChild);
            }
            matchChatMessagesEl.scrollTop = matchChatMessagesEl.scrollHeight;
            if (matchChatEl?.classList.contains('collapsed')) {
                matchChatUnreadCount += 1;
                syncMatchChatUnread();
            }
        };

        const sendMatchChatMessage = (text) => {
            const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
            if (!normalized) return;
            if (!matchSocket || matchSocket.readyState !== WebSocket.OPEN) {
                setMatchChatStatus('Chat is reconnecting.');
                return;
            }
            matchSocket.send(
                JSON.stringify({
                    type: 'chat_message',
                    payload: { text: normalized },
                })
            );
            setMatchChatStatus('');
            if (matchChatInput) {
                matchChatInput.value = '';
            }
        };

        const setIngameMissionsStatus = (message = '') => {
            if (!ingameMissionsStatusEl) return;
            ingameMissionsStatusEl.textContent = message;
        };

        const getMissionGoalProgressText = (mission, progress = {}) => {
            if (progress?.completedAt) return 'Complete';
            const goalLines = formatMissionGoalLines(mission, progress);
            if (goalLines.length) {
                return goalLines.join(' | ');
            }
            const specialPve = mission?.special_pve || mission?.specialPve || {};
            if (specialPve.enabled) {
                return 'Defeat the mission fight to unlock.';
            }
            return 'No tracked progress yet.';
        };

        const renderIngameMissions = (payload = {}) => {
            if (!ingameMissionsListEl) return;
            const missions = Array.isArray(payload.missions) ? payload.missions : [];
            const progressByMissionId = payload.missionProgressByMissionId || {};
            const unlockedIds = new Set(
                (Array.isArray(payload.unlockedCharacterIds) ? payload.unlockedCharacterIds : [])
                    .map((entry) => String(entry || '').trim().toLowerCase())
                    .filter(Boolean)
            );
            ingameMissionsListEl.innerHTML = '';
            if (!missions.length) {
                const empty = document.createElement('div');
                empty.className = 'ingame-mission-card';
                empty.textContent = 'No missions available.';
                ingameMissionsListEl.appendChild(empty);
                return;
            }
            missions.forEach((mission) => {
                const progress = progressByMissionId?.[mission.missionId] || {};
                const rewardCharacterId = String(mission.reward_character || '').trim().toLowerCase();
                const isUnlocked = rewardCharacterId && unlockedIds.has(rewardCharacterId);
                const card = document.createElement('article');
                card.className = 'ingame-mission-card';

                const head = document.createElement('div');
                head.className = 'ingame-mission-head';
                const image = document.createElement('img');
                image.className = 'ingame-mission-image';
                image.src = mission.image || mission.portrait || 'assets/images/default-avatar.png';
                image.alt = mission.imageAlt || mission.title || 'Mission';
                const titleWrap = document.createElement('div');
                const title = document.createElement('h3');
                title.className = 'ingame-mission-title';
                title.textContent = mission.title || 'Mission';
                const reward = document.createElement('p');
                reward.className = 'ingame-mission-reward';
                reward.textContent =
                    mission.reward ||
                    (mission.reward_character_name ? `Unlock ${mission.reward_character_name}.` : 'Mission reward');
                titleWrap.appendChild(title);
                titleWrap.appendChild(reward);
                head.appendChild(image);
                head.appendChild(titleWrap);
                card.appendChild(head);

                const progressText = document.createElement('p');
                progressText.className = 'ingame-mission-progress';
                progressText.textContent = isUnlocked ? 'Unlocked' : getMissionGoalProgressText(mission, progress);
                card.appendChild(progressText);

                const specialPve = mission.special_pve || mission.specialPve || {};
                if (specialPve.enabled && !isUnlocked && !progress?.completedAt) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'ingame-mission-action';
                    button.textContent = specialPve.buttonLabel || 'Start Fight';
                    button.addEventListener('click', () => {
                        startMissionPveFight(mission.missionId, button);
                    });
                    card.appendChild(button);
                }
                ingameMissionsListEl.appendChild(card);
            });
        };

        const loadIngameMissions = async () => {
            if (!ingameMissionsListEl) return;
            setIngameMissionsStatus('Loading missions...');
            try {
                const response = await fetch(`${API_BASE_URL}/api/missions`, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || 'Unable to load missions.');
                }
                renderIngameMissions(payload);
                setIngameMissionsStatus('');
            } catch (error) {
                setIngameMissionsStatus(error.message || 'Unable to load missions.');
            }
        };

        const startMissionPveFight = async (missionId, button = null) => {
            if (!missionId) return;
            if (!Array.isArray(currentPlayerTeam) || currentPlayerTeam.length !== 3) {
                setIngameMissionsStatus('Your current team is not ready yet.');
                return;
            }
            if (button) button.disabled = true;
            setIngameMissionsStatus('Starting mission fight...');
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/missions/${encodeURIComponent(missionId)}/pve/start`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ team: currentPlayerTeam }),
                    }
                );
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || 'Unable to start mission fight.');
                }
                if (payload.matchId) {
                    window.location.href = `ingame.html?matchId=${encodeURIComponent(payload.matchId)}`;
                    return;
                }
                throw new Error('Mission fight did not return a match.');
            } catch (error) {
                if (button) button.disabled = false;
                setIngameMissionsStatus(error.message || 'Unable to start mission fight.');
            }
        };

        syncMatchChatMute();

        const connectMatchSocket = () => {
            if (!matchIdFromUrl || battleEndShown || typeof WebSocket === 'undefined') return;
            if (
                matchSocket &&
                (matchSocket.readyState === WebSocket.OPEN ||
                    matchSocket.readyState === WebSocket.CONNECTING)
            ) {
                return;
            }
            clearMatchSocketReconnect();
            matchSocketManuallyClosed = false;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socketUrl = `${protocol}//${window.location.host}/ws?matchId=${encodeURIComponent(matchIdFromUrl)}`;
            const socket = new WebSocket(socketUrl);
            matchSocket = socket;
            socket.addEventListener('open', () => {
                matchSocketReconnectDelay = 1000;
            });
            socket.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message?.type === 'match_state' && message.payload) {
                        scheduleIncomingMatchState(message.payload);
                    } else if (message?.type === 'chat_message' && message.payload) {
                        appendMatchChatMessage(message.payload);
                    } else if (message?.type === 'chat_error') {
                        setMatchChatStatus(message?.payload?.error || 'Unable to send message.');
                    }
                } catch (error) {
                    console.warn('Failed to process match socket message.', error);
                }
            });
            socket.addEventListener('close', () => {
                if (matchSocket === socket) {
                    matchSocket = null;
                }
                if (matchSocketManuallyClosed || battleEndShown || !matchIdFromUrl) {
                    return;
                }
                clearMatchSocketReconnect();
                matchSocketReconnectTimer = setTimeout(() => {
                    matchSocketReconnectTimer = null;
                    connectMatchSocket();
                }, matchSocketReconnectDelay);
                matchSocketReconnectDelay = Math.min(matchSocketReconnectDelay * 2, 10000);
            });
            socket.addEventListener('error', () => {
                try {
                    socket.close();
                } catch (error) {
                    // Ignore socket close failures.
                }
            });
        };

        const closeMatchSocket = () => {
            matchSocketManuallyClosed = true;
            clearMatchSocketReconnect();
            if (!matchSocket) return;
            try {
                matchSocket.close();
            } catch (error) {
                // Ignore socket close failures.
            }
            matchSocket = null;
        };

        if (matchChatToggle && matchChatEl) {
            matchChatToggle.addEventListener('click', () => {
                const willOpen = matchChatEl.classList.contains('collapsed');
                matchChatEl.classList.toggle('collapsed', !willOpen);
                matchChatToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                if (willOpen) {
                    matchChatUnreadCount = 0;
                    syncMatchChatUnread();
                    window.setTimeout(() => matchChatInput?.focus(), 0);
                    if (matchChatMessagesEl) {
                        matchChatMessagesEl.scrollTop = matchChatMessagesEl.scrollHeight;
                    }
                }
            });
        }

        if (matchChatForm) {
            matchChatForm.addEventListener('submit', (event) => {
                event.preventDefault();
                sendMatchChatMessage(matchChatInput?.value || '');
            });
        };

        if (ingameMissionsToggle && ingameMissionsEl) {
            ingameMissionsToggle.addEventListener('click', () => {
                const willOpen = ingameMissionsEl.classList.contains('collapsed');
                ingameMissionsEl.classList.toggle('collapsed', !willOpen);
                ingameMissionsToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                if (willOpen) {
                    loadIngameMissions();
                }
            });
        }

        if (matchChatMuteButton) {
            matchChatMuteButton.addEventListener('click', () => {
                matchChatOpponentMuted = !matchChatOpponentMuted;
                localStorage.setItem('comicMatchChatOpponentMuted', matchChatOpponentMuted ? 'true' : 'false');
                syncMatchChatMute();
                setMatchChatStatus(matchChatOpponentMuted ? 'Opponent muted.' : 'Opponent unmuted.');
            });
        }

        matchChatEmojiButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const emoji = button.dataset.chatEmoji || button.textContent || '';
                if (!emoji) return;
                sendMatchChatMessage(emoji);
            });
        });

        window.addEventListener('beforeunload', closeMatchSocket);

        const fetchTargetOptions = async (actorSlot, skillIdx, skill = null) => {
            if (!matchIdFromUrl) return;
            const cacheKey = `${currentTurnUsername || ''}:${actorSlot}:${skillIdx}`;
            const cachedOptions = targetOptionsCache.get(cacheKey);
            const applyTargetOptions = (data) => {
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                measureIngamePerf('target:queued-skills', () => applyQueuedSkillVisuals());
                activeTargetOptions = data;
                const skillEl = playerSkillMetaByKey.get(`${actorSlot}:${skillIdx}`)?.imgEl || null;
                const classChoiceOptions = getClassChoiceOptions(skill);
                const key = getClassChoiceKey(actorSlot, skillIdx);
                const classChoice = normalizeClassChoice(classChoiceBySkillKey.get(key));
                activeCastingSkill = {
                    actorSlot,
                    skillIdx,
                    skill,
                    skillEl,
                    classChoiceOptions,
                    classChoice:
                        classChoiceOptions.length > 0 && classChoiceOptions.includes(classChoice)
                            ? classChoice
                            : classChoiceOptions[0] || null,
                };
                measureIngamePerf('target:highlights', () => renderTargetHighlights(data));
            };
            if (cachedOptions) {
                applyTargetOptions(cachedOptions);
                return;
            }
            clearTargetHighlights();
            activeTargetOptions = null;
            activeCastingSkill = null;
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/targets`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ actorSlot, skillIndex: skillIdx }),
                    }
                );
                let data = null;
                try {
                    data = await res.json();
                } catch (parseError) {
                    data = null;
                }
                if (!res.ok) {
                    throw new Error(data?.error || 'Unable to fetch targets.');
                }
                if (!data?.ok) {
                    throw new Error(data?.error || 'Unable to fetch targets.');
                }
                targetOptionsCache.set(cacheKey, data);
                applyTargetOptions(data);
            } catch (error) {
                console.warn('Target fetch failed.', error);
                if (skillInfo.descEl) {
                    const baseDescription = getSkillDescriptionText(skill) || skillInfo.descEl.textContent || '';
                    skillInfo.descEl.textContent = `${baseDescription}\n\nTargeting failed: ${error?.message || 'Unable to fetch targets.'}`;
                }
                activeTargetOptions = null;
                activeCastingSkill = null;
            }
        };

        const getValidTargetKeySet = () => {
            if (!activeTargetOptions || !Array.isArray(activeTargetOptions.targets)) return new Set();
            return new Set(activeTargetOptions.targets.map((t) => `${t.username}:${t.slot}`));
        };

        const closeClassChoicePopup = () => {
            pendingQueuePayload = null;
            pendingTurnStartChoicePayload = null;
            activeTurnStartChoiceKey = '';
            activeChoicePopupMode = '';
            if (!classChoicePopupEl) return;
            classChoicePopupEl.classList.remove('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'true');
            if (classChoicePopupOptionsEl) {
                classChoicePopupOptionsEl.innerHTML = '';
            }
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = 'Choose Class';
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = '';
            }
        };

        const queueSelectedSkill = ({ actorSlot, skillIdx, selection, classChoice = null }) => {
            if (!matchIdFromUrl) return Promise.resolve();
            if (inFlightSkillRequestByActorSlot.has(actorSlot)) return Promise.resolve();
            clearSkillInteractionCache();
            inFlightSkillRequestByActorSlot.add(actorSlot);
            optimisticCancelledActorSlots.delete(actorSlot);
            optimisticQueuedByActorSlot.set(actorSlot, {
                actorSlot,
                skillIndex: skillIdx,
                targetSelection: selection,
                ...(classChoice ? { classChoice } : {}),
            });
            applyQueuedSkillVisuals();
            return fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    actorSlot,
                    skillIndex: skillIdx,
                    targetSelection: selection,
                    ...(classChoice ? { classChoice } : {}),
                }),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok || !data?.ok) {
                        throw new Error(data?.error || 'Unable to queue skill.');
                    }
                    playIngameSound(applySkillSound);
                    optimisticQueuedByActorSlot.delete(actorSlot);
                    renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                    pendingTurnState = normalizePendingTurn(data.pendingTurn);
                    applyQueuedSkillVisuals();
                    syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                })
                .catch((error) => {
                    optimisticQueuedByActorSlot.delete(actorSlot);
                    applyQueuedSkillVisuals();
                    console.warn('Failed to queue skill.', error);
                })
                .finally(() => {
                    inFlightSkillRequestByActorSlot.delete(actorSlot);
                    closeClassChoicePopup();
                    clearTargetHighlights();
                    activeTargetOptions = null;
                    activeCastingSkill = null;
                });
        };

        const openClassChoicePopup = ({ actorSlot, skillIdx, selection, options = [] }) => {
            if (!classChoicePopupEl || !classChoicePopupOptionsEl || !options.length) return;
            activeChoicePopupMode = 'skill-class';
            pendingQueuePayload = { actorSlot, skillIdx, selection };
            pendingTurnStartChoicePayload = null;
            classChoicePopupOptionsEl.innerHTML = '';
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = 'Choose Class';
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = '';
            }
            options.forEach((optionValue) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = formatClassChoiceLabel(optionValue);
                button.addEventListener('click', () => {
                    const key = getClassChoiceKey(actorSlot, skillIdx);
                    if (key) classChoiceBySkillKey.set(key, optionValue);
                    queueSelectedSkill({
                        actorSlot,
                        skillIdx,
                        selection,
                        classChoice: optionValue,
                    });
                });
                classChoicePopupOptionsEl.appendChild(button);
            });
            classChoicePopupEl.classList.add('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'false');
        };

        const getTurnStartChoiceTargets = (option = {}) => {
            const strategy =
                typeof option?.targetStrategy === 'string' ? option.targetStrategy.trim().toLowerCase() : '';
            const playerUnits = Array.isArray(latestBoardState?.[currentPlayerUsername])
                ? latestBoardState[currentPlayerUsername]
                : [];
            const enemyUnits = Array.isArray(latestBoardState?.[currentOpponentUsername])
                ? latestBoardState[currentOpponentUsername]
                : [];
            const mapUnits = (units, username, aliveMode = 'alive') =>
                units
                    .map((unit, slot) => ({ unit, slot, username }))
                    .filter((entry) => {
                        if (!entry.unit) return false;
                        const isDead = isUnitDeadLike(entry.unit);
                        if (aliveMode === 'dead') return isDead;
                        return !isDead;
                    })
                    .map((entry) => ({
                        username: entry.username,
                        slot: entry.slot,
                        rosterIndex: entry.unit?.rosterIndex,
                        alive: !isUnitDeadLike(entry.unit),
                    }));

            if (strategy === 'dead-ally-first' || strategy === 'dead-ally-lowest-slot') {
                return mapUnits(playerUnits, currentPlayerUsername, 'dead');
            }
            if (strategy === 'alive-enemy-first' || strategy === 'single-enemy' || strategy === 'enemy') {
                return mapUnits(enemyUnits, currentOpponentUsername, 'alive');
            }
            return mapUnits(playerUnits, currentPlayerUsername, 'alive');
        };

        const hideTurnStartChoicePopupForTargeting = () => {
            if (!classChoicePopupEl) return;
            classChoicePopupEl.classList.remove('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'true');
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = '';
            }
        };

        const beginTurnStartChoiceTargeting = (optionValue = {}) => {
            const choiceKey = optionValue.key || '';
            if (!choiceKey) return;
            const targets = getTurnStartChoiceTargets(optionValue);
            if (!targets.length) {
                resolveTurnStartChoice(choiceKey);
                return;
            }
            pendingTurnStartChoicePayload = {
                ...(pendingTurnStartChoicePayload || {}),
                choiceKey,
                option: optionValue,
            };
            activeChoicePopupMode = 'turn-start-target';
            activeTargetOptions = {
                targetType: optionValue.targetStrategy || 'single-character',
                mode: 'single',
                targets,
            };
            activeCastingSkill = {
                turnStartChoice: true,
                choiceKey,
                classChoiceOptions: [],
            };
            hideTurnStartChoicePopupForTargeting();
            measureIngamePerf('target:turn-start-highlights', () => renderTargetHighlights(activeTargetOptions));
        };

        const resolveTurnStartChoice = async (choiceKey, targetSelection = null) => {
            if (!matchIdFromUrl || !choiceKey || !pendingTurnStartChoicePayload) return;
            const selectedTarget =
                targetSelection && typeof targetSelection === 'object' && !Array.isArray(targetSelection)
                    ? targetSelection
                    : null;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/start-choice`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            choiceKey,
                            targetUsername: selectedTarget?.username || undefined,
                            targetSlot: Number.isInteger(selectedTarget?.slot)
                                ? selectedTarget.slot
                                : Number.parseInt(selectedTarget?.slot, 10),
                        }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to resolve choice.');
                }
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyMatchState({
                    ok: true,
                    player: data.player || { username: currentPlayerUsername },
                    opponent: data.opponent || { username: currentOpponentUsername },
                    board: data.board || latestBoardState,
                    currentTurn: data.currentTurn,
                    turnExpiresAt: data.turnExpiresAt,
                    turnDurationMs: data.turnDurationMs,
                    pendingTurn: data.pendingTurn,
                    chakraPools: data.chakraPools || { [currentPlayerUsername]: playerPoolState },
                    status: data.status || 'active',
                });
                playIngameSound(applySkillSound);
            } catch (error) {
                console.warn('Failed to resolve turn start choice.', error);
            } finally {
                activeChoicePopupMode = null;
                activeTurnStartChoiceKey = '';
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            }
        };

        const openTurnStartChoicePopup = ({ promptText = '', options = [] }) => {
            if (!classChoicePopupEl || !classChoicePopupOptionsEl || !options.length) return;
            activeChoicePopupMode = 'turn-start';
            pendingTurnStartChoicePayload = { promptText, options };
            pendingQueuePayload = null;
            classChoicePopupOptionsEl.innerHTML = '';
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = promptText || "Doctor's Bag";
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = 'none';
            }
            options.forEach((optionValue) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = optionValue.label || formatClassChoiceLabel(optionValue.key);
                button.addEventListener('click', () => {
                    activeTurnStartChoiceKey = optionValue.key || '';
                    beginTurnStartChoiceTargeting(optionValue);
                });
                classChoicePopupOptionsEl.appendChild(button);
            });
            classChoicePopupEl.classList.add('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'false');
        };

        const queueTargetFromCard = (card, event) => {
            if (!card || !activeTargetOptions || !activeCastingSkill || !matchIdFromUrl) return false;
            event.preventDefault();
            event.stopPropagation();
            const target = getTargetForCardFromOptions(card);
            if (!target) return true;
            const selection =
                activeTargetOptions.mode === 'all'
                    ? activeTargetOptions.targets.map((t) => ({ username: t.username, slot: t.slot }))
                    : { username: target.username, slot: Number.parseInt(target.slot, 10) };
            if (activeCastingSkill?.turnStartChoice) {
                resolveTurnStartChoice(activeCastingSkill.choiceKey || '', selection);
                return true;
            }
            const classChoiceOptions = Array.isArray(activeCastingSkill.classChoiceOptions)
                ? activeCastingSkill.classChoiceOptions
                : [];
            if (classChoiceOptions.length > 0) {
                clearTargetHighlights();
                openClassChoicePopup({
                    actorSlot: activeCastingSkill.actorSlot,
                    skillIdx: activeCastingSkill.skillIdx,
                    selection,
                    options: classChoiceOptions,
                });
                return true;
            }
            queueSelectedSkill({
                actorSlot: activeCastingSkill.actorSlot,
                skillIdx: activeCastingSkill.skillIdx,
                selection,
            });
            return true;
        };

        const handleCardTargetClick = (event) => {
            if (event?.button !== undefined && event.button !== 0) return;
            const card = event.currentTarget;
            if (queueTargetFromCard(card, event)) return;
            const clickedSkillImage = Array.from(card?.querySelectorAll?.('.skillimage') || []).find((imgEl) => {
                const rect = imgEl?.getBoundingClientRect?.();
                return (
                    rect &&
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom
                );
            });
            if (clickedSkillImage && typeof clickedSkillImage._skillClickHandler === 'function') {
                event.preventDefault();
                event.stopPropagation();
                clickedSkillImage._skillClickHandler(event);
                return;
            }
            const face = card?.querySelector?.('.character-face');
            const faceRect = face?.getBoundingClientRect?.();
            const clickedFace =
                faceRect &&
                event.clientX >= faceRect.left &&
                event.clientX <= faceRect.right &&
                event.clientY >= faceRect.top &&
                event.clientY <= faceRect.bottom;
            if (clickedFace && typeof card?._showCharacterInfoFromPortrait === 'function') {
                event.preventDefault();
                event.stopPropagation();
                card._showCharacterInfoFromPortrait();
            }
        };

        if (classChoicePopupCancelButton) {
            classChoicePopupCancelButton.addEventListener('click', () => {
                if (activeChoicePopupMode === 'turn-start') return;
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            });
        }
        if (classChoicePopupEl) {
            classChoicePopupEl.addEventListener('click', (event) => {
                if (event.target !== classChoicePopupEl) return;
                if (activeChoicePopupMode === 'turn-start') return;
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            });
        }

        const clearActiveSkillTargeting = () => {
            if (!activeTargetOptions && !activeCastingSkill) return;
            if (activeChoicePopupMode === 'turn-start-target') return;
            clearTargetHighlights();
            activeTargetOptions = null;
            activeCastingSkill = null;
        };

        document.addEventListener('pointerdown', (event) => {
            if (!activeTargetOptions && !activeCastingSkill) return;
            if (event?.button !== undefined && event.button !== 0) return;
            const target = event.target;
            if (!target?.closest) return;
            const shouldKeepTargeting = target.closest(
                [
                    '.character-card',
                    '.skillimage',
                    '.skill-browser-icon',
                    '.skillinformation',
                    '.ChakraChooseEndTurn',
                    '.exchange_chakra',
                    '.class-choice-popup',
                    '.surrender-confirm',
                    '.surrenderbutton',
                    '.ingame-sound-controller',
                ].join(',')
            );
            if (shouldKeepTargeting) return;
            if (activeChoicePopupMode === 'turn-start-target') return;
            clearActiveSkillTargeting();
        });

        const attachCardTargetHandlers = (cards, username) => {
            cards.forEach((card, slot) => {
                if (!card) return;
                card.dataset.username = username;
                card.dataset.slot = slot;
                card.removeEventListener('pointerdown', handleCardTargetClick);
                card.addEventListener('pointerdown', handleCardTargetClick);
            });
        };

        const loadMatchForIngame = async () => {
            const matchId = matchIdFromUrl;
            if (!matchId || !Array.isArray(rosterData)) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchId)}`, {
                    credentials: 'include',
                });
                const data = await response.json();
                if (!data?.ok) return;

                const playerCardsLocal = Array.from(document.querySelectorAll('.player-characters .character-card'));
                const enemyCardsLocal = Array.from(document.querySelectorAll('.enemy-characters .character-card'));
                playerCardsLocal.forEach((card) => card && card.classList.remove('targetable'));
                if (!playerCardsLocal.length || !enemyCardsLocal.length) return;
                const team = data.player?.team || [];
                const enemyTeam = data.opponent?.team || [];
                if (!Array.isArray(team) || team.length !== playerCardsLocal.length) return;
                if (!Array.isArray(enemyTeam) || enemyTeam.length !== enemyCardsLocal.length) return;
                playerSkillMetaByKey.clear();

                const playerNameEl = document.querySelector('.player-name.red');
                if (playerNameEl && data.player?.username) {
                    playerNameEl.textContent = data.player.username;
                }
                const enemyNameEl = document.querySelector('.player-right .player-name.red');
                if (enemyNameEl && data.opponent?.username) {
                    const nextOpponentUsername = data.opponent.username;
                    const nextOpponentDisplayName = data.opponent.displayName || (isGameBotUsername(nextOpponentUsername) ? 'Game Bot' : nextOpponentUsername);
                    enemyNameEl.textContent = nextOpponentDisplayName;
                    const opponentChanged = nextOpponentUsername !== currentOpponentUsername;
                    currentOpponentUsername = nextOpponentUsername;
                    currentOpponentDisplayName = nextOpponentDisplayName;
                    if (opponentChanged) {
                        if (data.opponent.isBot) {
                            applyOpponentIdentity({
                                name: nextOpponentDisplayName,
                                avatarUrl: defaultProfileAvatar,
                                ladder: null,
                            });
                        } else {
                            hydrateOpponentIdentity(nextOpponentUsername).catch(() => {});
                        }
                    }
                }

                const populateCard = (card, rosterIndex, isPlayer, slotIndex) => {
                    const character = rosterData[rosterIndex];
                    if (!character) return;
                    const showCharacterSkills = () => {
                        const username = isPlayer ? currentPlayerUsername : currentOpponentUsername;
                        const unit = latestBoardState?.[username]?.[slotIndex];
                        const effectiveCharacter = getEffectiveCharacterForUnit(unit) || character;
                        renderCharacterInfo(effectiveCharacter, isPlayer ? slotIndex : null);
                    };
                    card._showCharacterInfoFromPortrait = showCharacterSkills;
                    const face = card.querySelector('.character-face');
                    if (face) {
                        face.src = character.facePicture || '';
                        face.alt = character.name || 'Character';
                        face.dataset.aliveSrc = face.src;
                        face.style.cursor = 'pointer';
                        const existingFaceClickHandler = face._characterSkillBrowserClickHandler;
                        if (typeof existingFaceClickHandler === 'function') {
                            face.removeEventListener('pointerdown', existingFaceClickHandler);
                        }
                        face._characterSkillBrowserClickHandler = (event) => {
                            if (event?.button !== undefined && event.button !== 0) return;
                            if (queueTargetFromCard(card, event)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            showCharacterSkills();
                        };
                        face.addEventListener('pointerdown', face._characterSkillBrowserClickHandler);
                    }
                    const tooltipWrap = card.querySelector('.skilltooltips');
                    const tooltipImg = card.querySelector('.skilltooltips .skilltooltipimage');
                    if (tooltipWrap && tooltipImg) {
                        tooltipWrap.style.visibility = 'hidden';
                        tooltipImg.title = '';
                    }
                    const skillImgs = Array.from(card.querySelectorAll('.skillscrollingame .skillimage'));
                    if (Array.isArray(character.skills)) {
                        skillImgs.forEach((imgEl, skillIdx) => {
                    const skill = character.skills[skillIdx];
                    if (!skill) return;
                    imgEl.src = skill.skillimage || '';
                    imgEl.alt = skill.name || `Skill ${skillIdx + 1}`;
                            imgEl.dataset.actorSlot = String(slotIndex);
                            imgEl.dataset.skillIdx = String(skillIdx);
                            if (isPlayer) {
                                const key = `${slotIndex}:${skillIdx}`;
                                playerSkillMetaByKey.set(key, {
                                    actorSlot: slotIndex,
                                    skillIdx,
                                    skill,
                                    baseSkill: skill,
                                    imgEl,
                                });
                                imgEl.style.cursor = 'pointer';
                                const existingSkillClickHandler = imgEl._skillClickHandler;
                                if (typeof existingSkillClickHandler === 'function') {
                                    imgEl.removeEventListener('pointerdown', existingSkillClickHandler);
                                }
                                const onSkillClick = (event) => {
                                    if (event?.button !== undefined && event.button !== 0) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const effectiveSkill =
                                        getEffectiveSkillForActorSlot(slotIndex, skillIdx) || skill;
                                    measureIngamePerf('click:skill-info', () =>
                                        renderSkillInfo(character, effectiveSkill, slotIndex, skillIdx)
                                    );
                                    measureIngamePerf('click:active-skill-icon', () =>
                                        updateSkillBrowserActiveIcon(skillIdx)
                                    );
                                    if (!currentPlayerUsername || !usernamesMatch(currentPlayerUsername, currentTurnUsername)) {
                                        triggerBlockedSkillFeedback(imgEl);
                                        return;
                                    }
                                    if (normalizePendingTurn(pendingTurnState).turnStartChoice) {
                                        triggerBlockedSkillFeedback(imgEl);
                                        return;
                                    }
                                    const queued = getQueuedSkillForActorSlot(slotIndex);
                                    if (queued && queued.skillIndex === skillIdx) {
                                        if (inFlightSkillRequestByActorSlot.has(slotIndex)) return;
                                        clearSkillInteractionCache();
                                        clearTargetHighlights();
                                        activeTargetOptions = null;
                                        activeCastingSkill = null;
                                        inFlightSkillRequestByActorSlot.add(slotIndex);
                                        optimisticQueuedByActorSlot.delete(slotIndex);
                                        optimisticCancelledActorSlots.add(slotIndex);
                                        applyQueuedSkillVisuals();
                                        fetch(
                                            `${API_BASE_URL}/api/match/${encodeURIComponent(
                                                matchIdFromUrl
                                            )}/skill/cancel`,
                                            {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ actorSlot: slotIndex }),
                                            }
                                        )
                                            .then(async (response) => {
                                                const data = await response.json();
                                                if (!response.ok || !data?.ok) {
                                                    throw new Error(data?.error || 'Unable to cancel skill.');
                                                }
                                                optimisticCancelledActorSlots.delete(slotIndex);
                                                renderChakra(
                                                    data.chakraPools?.[currentPlayerUsername] || emptyPool()
                                                );
                                                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                                                applyQueuedSkillVisuals();
                                                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                                            })
                                            .catch((error) => {
                                                optimisticCancelledActorSlots.delete(slotIndex);
                                                applyQueuedSkillVisuals();
                                                console.warn('Failed to cancel skill.', error);
                                            })
                                            .finally(() => {
                                                inFlightSkillRequestByActorSlot.delete(slotIndex);
                                            });
                                        return;
                                    }
                                    if (queued) {
                                        triggerBlockedSkillFeedback(imgEl);
                                        return;
                                    }
                                    pulseSkillCast(imgEl, effectiveSkill);
                                    fetchTargetOptions(slotIndex, skillIdx, effectiveSkill).catch(() => {
                                        triggerBlockedSkillFeedback(imgEl);
                                        clearTargetHighlights();
                                    });
                                };
                                imgEl._skillClickHandler = onSkillClick;
                                imgEl.addEventListener('pointerdown', onSkillClick);
                            }
                        });
                    }
                };

                playerCardsLocal.forEach((card, idx) => populateCard(card, team[idx], true, idx));
                enemyCardsLocal.forEach((card, idx) => populateCard(card, enemyTeam[idx], false, idx));
                enemyCards = enemyCardsLocal;
                playerCards = playerCardsLocal;
                attachCardTargetHandlers(enemyCards, currentOpponentUsername || '');
                attachCardTargetHandlers(playerCards, data.player?.username || '');

                if (Array.isArray(team) && team.length > 0) {
                    const firstChar = rosterData[team[0]];
                    const firstSkill = firstChar?.skills?.[0];
                    if (firstSkill) {
                        renderSkillInfo(firstChar, firstSkill, 0, 0);
                        renderSkillBrowserForCharacter(firstChar, 0, 0);
                    }
                }

                if (data.player?.username) {
                    currentPlayerUsername = data.player.username;
                }
                applyIncomingMatchState(data, { playEntrySound: true });
                connectMatchSocket();
                await playBattleIntro(data);
            } catch (error) {
                console.warn('Failed to load match data.', error);
            }
        };

        loadMatchForIngame().finally(() => {
            document.body.classList.remove('app-loading', 'app-loading-ingame');
        });

        const surrenderButton = document.querySelector('.surrenderbutton');
        const handleReadySectionClick = async () => {
            if (!currentPlayerUsername || !currentTurnUsername) return;
            if (!usernamesMatch(currentPlayerUsername, currentTurnUsername)) return;
            if (normalizePendingTurn(pendingTurnState).turnStartChoice) return;
            await openEndTurnModal();
        };

        const handleEndTurnConfirm = async () => {
            if (isEndingTurn || !matchIdFromUrl) return;
            const pending = normalizePendingTurn(pendingTurnState);
            if (pending.unresolvedRandom > 0) {
                updateEndTurnButtons();
                return;
            }
            isEndingTurn = true;
            if (endTurnOkButton) {
                endTurnOkButton.disabled = true;
            }
            const resolutionAnimationEntries = getQueuedResolutionAnimationEntries();
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/end`,
                    {
                        method: 'POST',
                        credentials: 'include',
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    const detailSuffix = data?.details ? ` Details: ${data.details}` : '';
                    throw new Error((data?.error || 'Failed to end turn.') + detailSuffix);
                }
                playIngameSound(nextRoundSound);
                await applyMatchStateAfterResolutionSequence(data, resolutionAnimationEntries);
                closeEndTurnModal();
            } catch (error) {
                console.warn('Failed to end turn.', error);
            } finally {
                isEndingTurn = false;
                updateEndTurnButtons();
            }
        };

        const handleEndTurnCancel = () => {
            closeEndTurnModal();
        };

        const clonePoolState = (pool = emptyPool()) => ({
            taijutsu: Math.max(0, Number(pool?.taijutsu) || 0),
            ninjutsu: Math.max(0, Number(pool?.ninjutsu) || 0),
            bloodline: Math.max(0, Number(pool?.bloodline) || 0),
            genjutsu: Math.max(0, Number(pool?.genjutsu) || 0),
        });

        const clonePendingTurnState = (pending = normalizePendingTurn()) => ({
            queuedByActorSlot: JSON.parse(JSON.stringify(pending?.queuedByActorSlot || {})),
            queueOrder: Array.isArray(pending?.queueOrder) ? [...pending.queueOrder] : [],
            unresolvedRandom: Math.max(0, Number(pending?.unresolvedRandom) || 0),
            randomAssignments: clonePoolState(pending?.randomAssignments || emptyPool()),
            turnStartChoice:
                pending?.turnStartChoice && typeof pending.turnStartChoice === 'object'
                    ? JSON.parse(JSON.stringify(pending.turnStartChoice))
                    : null,
        });

        const applyRandomChakraAdjustmentLocally = (chakraType, delta) => {
            const normalizedType = typeof chakraType === 'string' ? chakraType.trim().toLowerCase() : '';
            if (!chakraTypes.includes(normalizedType)) return false;
            const nextPool = clonePoolState(playerPoolState);
            const nextPending = clonePendingTurnState(pendingTurnState);
            if (delta === 1) {
                if (nextPending.unresolvedRandom <= 0) return false;
                if ((nextPool[normalizedType] || 0) <= 0) return false;
                nextPool[normalizedType] -= 1;
                nextPending.randomAssignments[normalizedType] = (nextPending.randomAssignments[normalizedType] || 0) + 1;
                nextPending.unresolvedRandom -= 1;
            } else if (delta === -1) {
                if ((nextPending.randomAssignments[normalizedType] || 0) <= 0) return false;
                nextPool[normalizedType] += 1;
                nextPending.randomAssignments[normalizedType] -= 1;
                nextPending.unresolvedRandom += 1;
            } else {
                return false;
            }
            renderChakra(nextPool);
            pendingTurnState = nextPending;
            applyQueuedSkillVisuals();
            if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                renderEndTurnModal(nextPool, nextPending);
            }
            return true;
        };

        const adjustRandomChakra = async (chakraType, delta) => {
            if (!matchIdFromUrl) return;
            const previousPoolState = clonePoolState(playerPoolState);
            const previousPendingState = clonePendingTurnState(pendingTurnState);
            const appliedLocally = applyRandomChakraAdjustmentLocally(chakraType, delta);
            if (!appliedLocally) return;
            const requestMutationVersion = ++randomChakraMutationVersion;
            randomChakraRequestQueue = randomChakraRequestQueue
                .catch(() => {})
                .then(async () => {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/random/adjust`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ chakraType, delta }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to adjust random chakra.');
                }
                if (requestMutationVersion !== randomChakraMutationVersion) {
                    syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                    return;
                }
                renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                    renderEndTurnModal(playerPoolState, pendingTurnState);
                }
            });
            try {
                await randomChakraRequestQueue;
            } catch (error) {
                if (requestMutationVersion !== randomChakraMutationVersion) {
                    console.warn('Failed to adjust random chakra.', error);
                    return;
                }
                renderChakra(previousPoolState);
                pendingTurnState = previousPendingState;
                applyQueuedSkillVisuals();
                if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                    renderEndTurnModal(previousPoolState, previousPendingState);
                }
                console.warn('Failed to adjust random chakra.', error);
            }
        };

        const handleExchangeConfirm = async () => {
            if (!matchIdFromUrl || battleEndShown) return;
            if (!currentPlayerUsername || !usernamesMatch(currentPlayerUsername, currentTurnUsername)) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/chakra/exchange`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            chakraType: selectedExchangeType,
                            spendAssignments: exchangeSpendAssignments,
                        }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to exchange chakra.');
                }
                renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                exchangeSpendAssignments = emptyPool();
                closeExchangeModal();
            } catch (error) {
                console.warn('Failed to exchange chakra.', error);
            }
        };

        if (readySectionEl) {
            readySectionEl.addEventListener('click', () => {
                handleReadySectionClick().catch((error) =>
                    console.warn('Failed to open end turn dialog.', error)
                );
            });
        }
        if (endTurnOkButton) {
            endTurnOkButton.addEventListener('click', () => {
                handleEndTurnConfirm().catch((error) => console.warn('Turn end confirm failed.', error));
            });
        }
        if (endTurnCancelButton) {
            endTurnCancelButton.addEventListener('click', handleEndTurnCancel);
        }
        if (exchangeLabel) {
            exchangeLabel.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openExchangeModal();
            });
        }
        exchangeChoiceButtons.forEach((button) => {
            const type = getExchangeTypeFromButton(button);
            if (!type) return;
            button.addEventListener('click', () => {
                selectedExchangeType = type;
                renderExchangeModal(playerPoolState);
            });
        });
        if (exchangeModalEl) {
            const columns = Array.from(exchangeModalEl.querySelectorAll('.exchange_chakra_column'));
            const leftRows = Array.from(columns[0]?.querySelectorAll('.exchange_chakra_row') || []);
            leftRows.forEach((row) => {
                const name = getRowChakraType(row);
                const symbols = Array.from(row.querySelectorAll('.exchange_symbol'));
                if (!name || symbols.length < 2 || !chakraTypes.includes(name)) return;
                const minusEl = symbols[0];
                const plusEl = symbols[1];
                minusEl.style.cursor = 'pointer';
                plusEl.style.cursor = 'pointer';
                minusEl.addEventListener('click', () => {
                    adjustExchangeSpend(name, -1);
                    renderExchangeModal(playerPoolState);
                });
                plusEl.addEventListener('click', () => {
                    adjustExchangeSpend(name, 1);
                    renderExchangeModal(playerPoolState);
                });
            });
        }
        if (exchangeOkButton) {
            exchangeOkButton.addEventListener('click', () => {
                handleExchangeConfirm().catch((error) =>
                    console.warn('Exchange confirm failed.', error)
                );
            });
        }
        if (exchangeCancelButton) {
            exchangeCancelButton.addEventListener('click', closeExchangeModal);
        }
        chakraTypes.forEach((type) => {
            const row = endTurnLeftRowEls[type];
            if (!row) return;
            const plusButton = row.querySelector('.plus-button');
            const minusButton = row.querySelector('.minus-button');
            if (plusButton) {
                plusButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    adjustRandomChakra(type, 1).catch((error) =>
                        console.warn('Random chakra + failed.', error)
                    );
                });
            }
            if (minusButton) {
                minusButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    adjustRandomChakra(type, -1).catch((error) =>
                        console.warn('Random chakra - failed.', error)
                    );
                });
            }
        });

        let surrenderInFlight = false;
        const handleSurrender = async () => {
            if (!matchIdFromUrl) return;
            if (surrenderInFlight || battleEndShown) return;
            surrenderInFlight = true;
            if (surrenderConfirmOkButton) {
                surrenderConfirmOkButton.disabled = true;
            }
            if (surrenderButton) {
                surrenderButton.style.pointerEvents = 'none';
                surrenderButton.style.opacity = '0.65';
            }
            showBattleEndOverlay({
                didWin: false,
                opponentUsername: currentOpponentDisplayName || currentOpponentUsername,
            });
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/surrender`,
                    {
                        method: 'POST',
                        credentials: 'include',
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Failed to surrender.');
                }
            } catch (error) {
                console.warn('Failed to surrender.', error);
                window.location.href = 'selection.html';
            }
        };

        if (battleEndOverlayEl) {
            battleEndOverlayEl.classList.remove('visible');
        }
        if (exchangeModalEl) {
            exchangeModalEl.style.visibility = 'hidden';
            renderExchangeModal(playerPoolState);
        }
        if (battleEndContinueButton) {
            battleEndContinueButton.addEventListener('click', () => {
                window.location.href = 'selection.html';
            });
        }

        if (surrenderButton) {
            surrenderButton.addEventListener('click', openSurrenderConfirm);
        }
        if (surrenderConfirmOkButton) {
            surrenderConfirmOkButton.addEventListener('click', () => {
                handleSurrender().catch((error) => console.warn('Surrender failed.', error));
            });
        }
        if (surrenderConfirmCancelButton) {
            surrenderConfirmCancelButton.addEventListener('click', closeSurrenderConfirm);
        }

        return;
    }

    await hydratePlayerIdentity();

    const logoutButton = document.querySelector('.logout-button');
    const quickButton = document.querySelector('.quick-button');
    const ladderButton = document.querySelector('.ladder-button');
    const privateButton = document.querySelector('.private-button');
    const searchingBackdrop = document.querySelector('.searching-backdrop');
    const searchingOverlay = document.querySelector('.searchingscroll');
    const searchingMessage = document.querySelector('.searching');
    const searchingSpinner = document.querySelector('.sharingan');
    const cancelSearchingButton = document.querySelector('.cancel-button');
    const battleBotWheelButton = document.getElementById('battle-bot-wheel-button');
    const battleBotWheelStatus = document.getElementById('battle-bot-wheel-status');
    const battleBotChoicePopup = document.getElementById('battle-bot-choice-popup');
    const battleBotChoiceCloseButton = document.getElementById('battle-bot-choice-close');
    const battleBotChoiceButtons = Array.from(
        document.querySelectorAll('[data-battle-bot-choice]')
    );
    const draftModeButton = document.getElementById('draft-mode-button');
    const draftBackdrop = document.querySelector('.draft-backdrop');
    const draftOpponentEl = document.querySelector('.draft-opponent');
    const draftTimerEl = document.querySelector('.draft-timer');
    const draftInstructionEl = document.querySelector('.draft-instruction');
    const draftSelectedRow = document.querySelector('.draft-selected-row');
    const draftGrid = document.querySelector('.draft-grid');
    const draftSubmitButton = document.querySelector('.draft-submit');
    const draftCancelButton = document.querySelector('.draft-cancel');
    const draftStatusEl = document.querySelector('.draft-status');
    const selectionMissionsEl = document.querySelector('.selection-missions');
    const selectionMissionsToggle = document.querySelector('.selection-missions-toggle');
    const selectionMissionsListEl = document.querySelector('.selection-missions-list');
    const selectionMissionsStatusEl = document.querySelector('.selection-missions-status');
    const privateMatchBackdrop = document.querySelector('.private-match-backdrop');
    const privateMatchInput = document.querySelector('.private-match-input');
    const privateMatchError = document.querySelector('.private-match-error');
    const privateMatchOkButton = document.querySelector('.private-match-ok');
    const privateMatchCancelButton = document.querySelector('.private-match-cancel');
    const defaultCancelButtonLabel = cancelSearchingButton ? cancelSearchingButton.textContent : '';
    let activeSearchTargetUsername = '';
    const foundMatchSound = new Audio('assets/audio/sounds/found-match.mp3');
    const skillViewerOpenSound = new Audio('assets/audio/sounds/scroll_open.mp3');
    const skillViewerCloseSound = new Audio('assets/audio/sounds/scroll_close.mp3');
    let matchmakingPoll = null;
    let isSearching = false;
    let pendingMatchRedirect = null;
    let draftModeEnabled = localStorage.getItem('comicDraftModeEnabled') === 'true';
    let activeDraft = null;
    let activeDraftSelection = [];
    let activeDraftSelectionPhase = '';
    let activeDraftPoll = null;
    let activeDraftTimer = null;

    const setSelectionMissionsStatus = (message = '') => {
        if (!selectionMissionsStatusEl) return;
        selectionMissionsStatusEl.textContent = message;
    };

    const formatMissionGoalLines = (mission, progress = {}) => {
        const goals = Array.isArray(mission?.goals) ? mission.goals : [];
        const progressByIndex = progress?.goalProgressByIndex || progress?.goalProgress || {};
        return goals
            .map((goal, index) => {
                const goalType = String(goal?.type || '').trim().toLowerCase();
                const count = Number(progressByIndex?.[index]?.count) || 0;
                if (typeof goal === 'string') {
                    return goal.trim();
                }
                if (goalType === 'text') {
                    return String(goal?.text || goal?.value || goal?.label || '').trim();
                }
                if (goalType === 'reach_rank') {
                    const target = Math.max(0, Number(goal.rank) || 0);
                    return target ? `Reach level ${target}: ${Math.min(count, target)}/${target}` : '';
                }
                if (goalType === 'win_matches') {
                    const target = Math.max(0, Number(goal.wins) || 0);
                    const characterName = goal.character_name || goal.character_id || 'required character';
                    return target
                        ? `Win ${target} with ${characterName}: ${Math.min(count, target)}/${target}`
                        : '';
                }
                if (goalType === 'win_streak') {
                    const target = Math.max(0, Number(goal.wins) || 0);
                    const characterName = goal.character_name || goal.character_id || 'required character';
                    return target
                        ? `Win ${target} in a row with ${characterName}: ${Math.min(count, target)}/${target}`
                        : '';
                }
                if (goalType === 'win_matches_same_team') {
                    const target = Math.max(0, Number(goal.wins) || 0);
                    const characterNames = Array.isArray(goal.character_names) && goal.character_names.length
                        ? goal.character_names
                        : Array.isArray(goal.character_ids)
                            ? goal.character_ids
                            : [];
                    return target
                        ? `Win ${target} with ${characterNames.join(' and ') || 'the required team'}: ${Math.min(count, target)}/${target}`
                        : '';
                }
                return '';
            })
            .filter(Boolean);
    };

    const getSelectionMissionProgressText = (mission, progress = {}) => {
        if (progress?.completedAt) return 'Complete';
        const goalLines = formatMissionGoalLines(mission, progress);
        if (goalLines.length) {
            return goalLines.join(' | ');
        }
        const specialPve = mission?.special_pve || mission?.specialPve || {};
        if (specialPve.enabled) {
            const botName = specialPve.botName || 'Mission Bot';
            const botCharacterName =
                mission?.reward_character_name ||
                specialPve.botTeamCharacterName ||
                specialPve.botTeamCharacterId ||
                'mission enemy';
            return `Defeat ${botName} using ${botCharacterName}. Requires level ${mission.level_requirement || 1}.`;
        }
        return 'No tracked progress yet.';
    };

    const startSelectionMissionPveFight = async (missionId, button = null) => {
        if (!missionId) return;
        const team = getTeamIndices();
        if (!Array.isArray(team) || team.length !== 3) {
            setSelectionMissionsStatus('Select a full team first.');
            return;
        }
        if (button) button.disabled = true;
        setSelectionMissionsStatus('Starting mission fight...');
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/missions/${encodeURIComponent(missionId)}/pve/start`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ team }),
                }
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to start mission fight.');
            }
            if (payload.matchId) {
                window.location.href = `ingame.html?matchId=${encodeURIComponent(payload.matchId)}`;
                return;
            }
            throw new Error('Mission fight did not return a match.');
        } catch (error) {
            if (button) button.disabled = false;
            setSelectionMissionsStatus(error.message || 'Unable to start mission fight.');
        }
    };

    const renderSelectionMissions = (payload = {}) => {
        if (!selectionMissionsListEl) return;
        const missions = Array.isArray(payload.missions) ? payload.missions : [];
        const progressByMissionId = payload.missionProgressByMissionId || {};
        const unlockedIds = new Set(
            (Array.isArray(payload.unlockedCharacterIds) ? payload.unlockedCharacterIds : [])
                .map((entry) => String(entry || '').trim().toLowerCase())
                .filter(Boolean)
        );
        selectionMissionsListEl.innerHTML = '';
        if (!missions.length) {
            const empty = document.createElement('div');
            empty.className = 'selection-mission-card';
            empty.textContent = 'No missions available.';
            selectionMissionsListEl.appendChild(empty);
            return;
        }
        missions.forEach((mission) => {
            const progress = progressByMissionId?.[mission.missionId] || {};
            const rewardCharacterId = String(mission.reward_character || '').trim().toLowerCase();
            const isUnlocked = rewardCharacterId && unlockedIds.has(rewardCharacterId);
            const card = document.createElement('article');
            card.className = 'selection-mission-card';
            card.dataset.selectionMission = mission.missionId || '';

            const head = document.createElement('div');
            head.className = 'selection-mission-head';
            const image = document.createElement('img');
            image.className = 'selection-mission-image';
            image.src = mission.image || mission.portrait || 'assets/images/default-avatar.png';
            image.alt = mission.imageAlt || mission.title || 'Mission';
            const titleWrap = document.createElement('div');
            const title = document.createElement('h3');
            title.className = 'selection-mission-title';
            title.textContent = mission.title || 'Mission';
            const reward = document.createElement('p');
            reward.className = 'selection-mission-reward';
            reward.textContent =
                mission.reward ||
                (mission.reward_character_name ? `Unlock ${mission.reward_character_name}.` : 'Mission reward');
            titleWrap.appendChild(title);
            titleWrap.appendChild(reward);
            head.appendChild(image);
            head.appendChild(titleWrap);
            card.appendChild(head);

            const progressText = document.createElement('p');
            progressText.className = 'selection-mission-progress';
            progressText.textContent = isUnlocked
                ? 'Unlocked. PvE fights can be replayed.'
                : getSelectionMissionProgressText(mission, progress);
            card.appendChild(progressText);

            const specialPve = mission.special_pve || mission.specialPve || {};
            if (specialPve.enabled) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'selection-mission-action';
                button.textContent = isUnlocked ? 'Replay Fight' : specialPve.buttonLabel || 'Start Fight';
                button.addEventListener('click', () => {
                    startSelectionMissionPveFight(mission.missionId, button);
                });
                card.appendChild(button);
            }
            selectionMissionsListEl.appendChild(card);
        });
        if (selectionMissionIdFromUrl) {
            const targetCard = Array.from(
                selectionMissionsListEl.querySelectorAll('.selection-mission-card')
            ).find((card) => card.dataset.selectionMission === selectionMissionIdFromUrl);
            if (targetCard) {
                targetCard.scrollIntoView({ block: 'nearest' });
            }
        }
    };

    const loadSelectionMissions = async () => {
        if (!selectionMissionsListEl) return;
        setSelectionMissionsStatus('Loading missions...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/missions`, {
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to load missions.');
            }
            renderSelectionMissions(payload);
            setSelectionMissionsStatus('');
        } catch (error) {
            setSelectionMissionsStatus(error.message || 'Unable to load missions.');
        }
    };

    const setBattleBotWheelStatus = (message = '', variant = 'info') => {
        if (!battleBotWheelStatus) return;
        battleBotWheelStatus.textContent = message;
        battleBotWheelStatus.dataset.variant = variant;
    };

    const syncBattleBotWheel = () => {
        const enabled = getBattleBotPreference();
        if (battleBotWheelButton) {
            battleBotWheelButton.classList.toggle('enabled', enabled);
            battleBotWheelButton.classList.toggle('disabled', !enabled);
            battleBotWheelButton.setAttribute('aria-expanded', 'false');
        }
    };

    const syncDraftModeButton = () => {
        if (!draftModeButton) return;
        draftModeButton.classList.toggle('enabled', draftModeEnabled);
        draftModeButton.classList.toggle('disabled', !draftModeEnabled);
        draftModeButton.setAttribute('aria-pressed', draftModeEnabled ? 'true' : 'false');
    };

    const setBattleBotChoicePopupVisible = (visible) => {
        if (!battleBotChoicePopup) return;
        battleBotChoicePopup.classList.toggle('visible', visible);
        battleBotChoicePopup.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (battleBotWheelButton) {
            battleBotWheelButton.setAttribute('aria-expanded', visible ? 'true' : 'false');
        }
    };

    const saveBattleBotPreference = async (enabled) => {
        const response = await fetch(`${API_BASE_URL}/api/profile/matchmaking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                battleBotEnabled: Boolean(enabled),
            }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok || !data?.user) {
            throw new Error(data?.error || 'Unable to update battle bot preference.');
        }
        profileCache = data.user;
        writeCachedUser(data.user);
        syncBattleBotWheel();
    };
    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Logout request failed; proceeding to clear session locally.', error);
        } finally {
            localStorage.removeItem('comicUser');
            window.location.href = 'selection-login.html';
        }
    };

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    syncBattleBotWheel();
    syncDraftModeButton();

    if (draftModeButton) {
        draftModeButton.addEventListener('click', () => {
            draftModeEnabled = !draftModeEnabled;
            localStorage.setItem('comicDraftModeEnabled', draftModeEnabled ? 'true' : 'false');
            syncDraftModeButton();
        });
    }

    if (battleBotWheelButton) {
        battleBotWheelButton.addEventListener('click', () => {
            setBattleBotChoicePopupVisible(true);
        });
    }

    if (selectionMissionsToggle && selectionMissionsEl) {
        selectionMissionsToggle.addEventListener('click', () => {
            const willOpen = selectionMissionsEl.classList.contains('collapsed');
            selectionMissionsEl.classList.toggle('collapsed', !willOpen);
            selectionMissionsToggle.classList.toggle('active', willOpen);
            selectionMissionsToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            if (willOpen) {
                loadSelectionMissions();
            }
        });
        if (pageSearchParams.get('missions') === 'open' || selectionMissionIdFromUrl) {
            selectionMissionsEl.classList.remove('collapsed');
            selectionMissionsToggle.classList.add('active');
            selectionMissionsToggle.setAttribute('aria-expanded', 'true');
            loadSelectionMissions();
        }
    }

    if (battleBotChoiceCloseButton) {
        battleBotChoiceCloseButton.addEventListener('click', () => {
            setBattleBotChoicePopupVisible(false);
        });
    }

    if (battleBotChoicePopup) {
        battleBotChoicePopup.addEventListener('click', (event) => {
            if (event.target !== battleBotChoicePopup) return;
            setBattleBotChoicePopupVisible(false);
        });
    }

    battleBotChoiceButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const enabled = button.dataset.battleBotChoice === 'enabled';
            try {
                await saveBattleBotPreference(enabled);
            } catch (error) {
                console.warn('Failed to update battle bot preference.', error);
                setBattleBotWheelStatus('Unable to update Game Bot setting.', 'error');
            } finally {
                setBattleBotChoicePopupVisible(false);
            }
        });
    });

    const clearPendingMatchRedirect = () => {
        if (!pendingMatchRedirect) return;
        window.clearTimeout(pendingMatchRedirect);
        pendingMatchRedirect = null;
    };

    const playOneShotSound = (audio) => {
        soundManager.play(audio);
    };

    const setSearchingState = (state = 'searching', mode = 'quick') => {
        if (!searchingMessage) return;
        if (state === 'found') {
            searchingMessage.textContent = 'Opponent found!';
            if (searchingSpinner) {
                searchingSpinner.src = 'assets/images/found.png';
                searchingSpinner.style.visibility = 'visible';
                searchingSpinner.style.animation = 'none';
            }
            if (cancelSearchingButton) {
                cancelSearchingButton.textContent = '';
                cancelSearchingButton.disabled = true;
                cancelSearchingButton.style.top = '';
                cancelSearchingButton.style.left = '';
                cancelSearchingButton.style.marginTop = '50px';
                cancelSearchingButton.style.marginLeft = '125px';
                cancelSearchingButton.style.width = '200px';
                cancelSearchingButton.style.textAlign = 'center';
                cancelSearchingButton.style.backgroundColor = 'transparent';
                cancelSearchingButton.style.border = 'none';
                cancelSearchingButton.style.pointerEvents = 'none';
            }
            playOneShotSound(foundMatchSound);
            return;
        }
        searchingMessage.textContent =
            mode === 'private' && activeSearchTargetUsername
                ? `Searching for ${activeSearchTargetUsername}`
                : 'Searching for an opponent';
        if (searchingSpinner) {
            searchingSpinner.src = 'assets/images/sharingan.png';
            searchingSpinner.style.visibility = 'visible';
            searchingSpinner.style.animation = '';
        }
        if (cancelSearchingButton) {
            cancelSearchingButton.textContent = defaultCancelButtonLabel || 'Cancel';
            cancelSearchingButton.disabled = false;
            cancelSearchingButton.style.top = '';
            cancelSearchingButton.style.left = '';
            cancelSearchingButton.style.marginTop = '';
            cancelSearchingButton.style.marginLeft = '';
            cancelSearchingButton.style.width = '';
            cancelSearchingButton.style.textAlign = '';
            cancelSearchingButton.style.backgroundColor = '';
            cancelSearchingButton.style.border = '';
            cancelSearchingButton.style.pointerEvents = '';
        }
    };

    const openSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        searchingBackdrop.classList.remove('hidden');
        searchingBackdrop.classList.add('visible');
    };

    const closeSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        clearPendingMatchRedirect();
        setSearchingState('searching');
        searchingBackdrop.classList.add('hidden');
        searchingBackdrop.classList.remove('visible');
    };

    closeSearching();

    const openPrivateMatchDialog = () => {
        if (!privateMatchBackdrop) return;
        if (privateMatchError) {
            privateMatchError.textContent = '';
        }
        if (privateMatchInput) {
            privateMatchInput.value = '';
        }
        privateMatchBackdrop.classList.remove('hidden');
        privateMatchBackdrop.classList.add('visible');
        if (privateMatchInput) {
            window.setTimeout(() => privateMatchInput.focus(), 0);
        }
    };

    const closePrivateMatchDialog = () => {
        if (!privateMatchBackdrop) return;
        privateMatchBackdrop.classList.add('hidden');
        privateMatchBackdrop.classList.remove('visible');
        if (privateMatchError) {
            privateMatchError.textContent = '';
        }
    };

    const scheduleMatchRedirect = (matchId, matchStartsAt) => {
        if (!matchId) return;
        clearPendingMatchRedirect();
        const startAtMs = matchStartsAt ? new Date(matchStartsAt).getTime() : Date.now();
        const delayMs = Math.max(0, startAtMs - Date.now());
        pendingMatchRedirect = window.setTimeout(() => {
            pendingMatchRedirect = null;
            closeSearching();
            redirectToMatch(matchId);
        }, delayMs);
    };

    const handleMatchFound = (data = {}) => {
        if (data?.draft && data.draftId) {
            isSearching = false;
            if (matchmakingPoll) {
                clearInterval(matchmakingPoll);
                matchmakingPoll = null;
            }
            closeSearching();
            startDraftSession(data);
            return true;
        }
        if (!data?.matchFound || !data?.matchId) return false;
        const startAtMs = data.matchStartsAt ? new Date(data.matchStartsAt).getTime() : Date.now();
        const shouldHold = !data.matchReady && startAtMs > Date.now();
        if (!shouldHold) {
            closeSearching();
            redirectToMatch(data.matchId);
            return true;
        }
        openSearching();
        setSearchingState('found');
        isSearching = false;
        if (matchmakingPoll) {
            clearInterval(matchmakingPoll);
            matchmakingPoll = null;
        }
        scheduleMatchRedirect(data.matchId, data.matchStartsAt);
        return true;
    };

    const resumeMatchIfActive = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (data?.draft && data.draftId) {
                handleMatchFound(data);
                return;
            }
            if (data?.matchFound && data.matchId) {
                handleMatchFound(data);
            }
        } catch (error) {
            console.warn('Failed to resume active match.', error);
        }
    };

    const redirectToMatch = (matchId) => {
        window.location.href = `ingame.html?matchId=${encodeURIComponent(matchId)}`;
    };

    const startPollingMatch = () => {
        if (matchmakingPoll) return;
        matchmakingPoll = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                    credentials: 'include',
                });
                const data = await response.json();
                if (data?.draft && data.draftId) {
                    handleMatchFound(data);
                    return;
                }
                if (data?.matchFound && data.matchId) {
                    handleMatchFound(data);
                }
            } catch (error) {
                console.warn('Match status check failed:', error);
            }
        }, 2000);
    };

    const joinMatchmaking = async (mode = 'quick', options = {}) => {
        if (isSearching) return;
        isSearching = true;
        activeSearchTargetUsername = mode === 'private' ? (options.targetUsername || '').trim() : '';
        setSearchingState('searching', mode);
        openSearching();
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    team: getTeamIndices(),
                    mode,
                    targetUsername: options.targetUsername || '',
                    draftMode: draftModeEnabled,
                }),
            });
            const data = await response.json();
            if (!response.ok || !data?.ok) {
                throw new Error(data?.error || 'Could not start matchmaking. Please try again.');
            }
            if (data?.matchFound && data.matchId) {
                handleMatchFound(data);
                return;
            }
            startPollingMatch();
        } catch (error) {
            console.error('Failed to join matchmaking:', error);
            isSearching = false;
            activeSearchTargetUsername = '';
            closeSearching();
            alert(error?.message || 'Could not start matchmaking. Please try again.');
        }
    };

    const cancelMatchmaking = async () => {
        isSearching = false;
        activeSearchTargetUsername = '';
        if (matchmakingPoll) {
            clearInterval(matchmakingPoll);
            matchmakingPoll = null;
        }
        closeSearching();
        try {
            await fetch(`${API_BASE_URL}/api/match/cancel`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Failed to cancel matchmaking:', error);
        }
    };

    if (quickButton) {
        quickButton.addEventListener('click', (event) => {
            event.preventDefault();
            persistTeamSelection();
            joinMatchmaking('quick');
        });
    }

    if (ladderButton) {
        ladderButton.addEventListener('click', (event) => {
            event.preventDefault();
            persistTeamSelection();
            joinMatchmaking('ladder');
        });
    }

    if (privateButton) {
        privateButton.addEventListener('click', (event) => {
            event.preventDefault();
            openPrivateMatchDialog();
        });
    }

    if (privateMatchCancelButton) {
        privateMatchCancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            closePrivateMatchDialog();
        });
    }

    if (privateMatchOkButton) {
        privateMatchOkButton.addEventListener('click', (event) => {
            event.preventDefault();
            const targetUsername = privateMatchInput ? privateMatchInput.value.trim() : '';
            if (!targetUsername) {
                if (privateMatchError) {
                    privateMatchError.textContent = 'Enter a username.';
                }
                if (privateMatchInput) {
                    privateMatchInput.focus();
                }
                return;
            }
            closePrivateMatchDialog();
            persistTeamSelection();
            joinMatchmaking('private', { targetUsername });
        });
    }

    if (privateMatchInput) {
        privateMatchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (privateMatchOkButton) {
                    privateMatchOkButton.click();
                }
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closePrivateMatchDialog();
            }
        });
    }

    if (cancelSearchingButton) {
        cancelSearchingButton.addEventListener('click', (event) => {
            event.preventDefault();
            cancelMatchmaking();
        });
    }

    const playSkillViewerSound = (audio) => {
        soundManager.play(audio);
    };

    const openSkillViewer = () => {
        if (!skillViewer || !skillViewer.classList.contains('collapsed')) return;
        skillViewer.classList.remove('collapsed');
        playSkillViewerSound(skillViewerOpenSound);
    };

    const closeSkillViewer = () => {
        if (!skillViewer || skillViewer.classList.contains('collapsed')) return;
        skillViewer.classList.add('collapsed');
        playSkillViewerSound(skillViewerCloseSound);
    };

    if (skillViewer) {
        closeSkillViewer();
    }

    if (skillScroll && skillViewer) {
        skillScroll.addEventListener('click', () => {
            if (skillViewer.classList.contains('collapsed')) {
                openSkillViewer();
                return;
            }
            closeSkillViewer();
        });
    }

    let roster = [];
    if (typeof characters !== 'undefined' && Array.isArray(characters)) {
        roster = characters;
    } else if (Array.isArray(window.characters)) {
        roster = window.characters;
    }

    const clearDraftIntervals = () => {
        if (activeDraftPoll) {
            clearInterval(activeDraftPoll);
            activeDraftPoll = null;
        }
        if (activeDraftTimer) {
            clearInterval(activeDraftTimer);
            activeDraftTimer = null;
        }
    };

    const setDraftStatus = (message = '', variant = 'info') => {
        if (!draftStatusEl) return;
        draftStatusEl.textContent = message;
        draftStatusEl.dataset.variant = variant;
    };

    const getDraftPhaseLimit = (draft = activeDraft) =>
        draft?.phase === 'ban' ? Number(draft?.banCount) || 5 : Number(draft?.teamSize) || 3;

    const updateDraftTimer = () => {
        if (!draftTimerEl || !activeDraft?.phaseEndsAt) return;
        const remaining = Math.max(0, Math.ceil((new Date(activeDraft.phaseEndsAt).getTime() - Date.now()) / 1000));
        draftTimerEl.textContent = String(remaining);
    };

    const renderDraftSelectionRow = () => {
        if (!draftSelectedRow) return;
        draftSelectedRow.innerHTML = '';
        activeDraftSelection.forEach((rosterIndex) => {
            const character = roster[rosterIndex];
            const chip = document.createElement('div');
            chip.className = 'draft-selected-chip';
            const image = document.createElement('img');
            image.src = character?.facePicture || '';
            image.alt = character?.name || 'Character';
            const label = document.createElement('span');
            label.textContent = character?.name || `Character ${rosterIndex + 1}`;
            chip.appendChild(image);
            chip.appendChild(label);
            draftSelectedRow.appendChild(chip);
        });
    };

    const renderDraftGrid = () => {
        if (!draftGrid || !activeDraft) return;
        const phase = activeDraft.phase;
        const bannedSet = new Set(Array.isArray(activeDraft.revealedBans) ? activeDraft.revealedBans : []);
        draftGrid.innerHTML = '';
        roster.forEach((character, rosterIndex) => {
            if (!character) return;
            const locked = isCharacterLocked(character);
            const banned = bannedSet.has(rosterIndex);
            const selected = activeDraftSelection.includes(rosterIndex);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'draft-character';
            button.classList.toggle('selected', selected);
            button.classList.toggle('banned', banned);
            button.classList.toggle('locked', locked);
            button.disabled = locked || (phase === 'pick' && banned) || activeDraft.myBanSubmitted && phase === 'ban' || activeDraft.myTeamSubmitted && phase === 'pick';
            const image = document.createElement('img');
            image.src = character.facePicture || '';
            image.alt = character.name || `Character ${rosterIndex + 1}`;
            const label = document.createElement('span');
            label.textContent = character.name || `Character ${rosterIndex + 1}`;
            button.appendChild(image);
            button.appendChild(label);
            button.addEventListener('click', () => {
                const existingIndex = activeDraftSelection.indexOf(rosterIndex);
                if (existingIndex >= 0) {
                    activeDraftSelection.splice(existingIndex, 1);
                } else if (activeDraftSelection.length < getDraftPhaseLimit()) {
                    activeDraftSelection.push(rosterIndex);
                }
                renderDraftSelectionRow();
                renderDraftGrid();
            });
            draftGrid.appendChild(button);
        });
        if (draftSubmitButton) {
            const submitted = phase === 'ban' ? activeDraft.myBanSubmitted : activeDraft.myTeamSubmitted;
            draftSubmitButton.disabled = submitted || activeDraftSelection.length !== getDraftPhaseLimit();
            draftSubmitButton.textContent = submitted ? 'Locked' : 'Lock In';
        }
    };

    const renderDraft = () => {
        if (!activeDraft) return;
        if (draftBackdrop) {
            draftBackdrop.classList.remove('hidden');
            draftBackdrop.classList.add('visible');
        }
        if (draftOpponentEl) {
            draftOpponentEl.textContent = activeDraft.opponent || 'Opponent';
        }
        if (draftInstructionEl) {
            if (activeDraft.phase === 'ban') {
                draftInstructionEl.textContent = `Ban ${getDraftPhaseLimit(activeDraft)} characters. Your bans stay hidden until the timer ends or both players lock.`;
            } else if (activeDraft.phase === 'pick') {
                draftInstructionEl.textContent = `Pick ${getDraftPhaseLimit(activeDraft)} available characters. Banned characters are disabled.`;
            } else if (activeDraft.phase === 'completed') {
                draftInstructionEl.textContent = 'Draft complete. Starting match.';
            } else {
                draftInstructionEl.textContent = activeDraft.failureReason || 'Draft failed.';
            }
        }
        const phaseChanged = activeDraftSelectionPhase !== activeDraft.phase;
        activeDraftSelectionPhase = activeDraft.phase || '';
        if (activeDraft.phase === 'ban') {
            if (phaseChanged || activeDraft.myBanSubmitted) {
                activeDraftSelection = Array.isArray(activeDraft.myBans) ? activeDraft.myBans.slice() : [];
            }
            setDraftStatus(activeDraft.myBanSubmitted ? 'Bans locked. Waiting for the opponent or timer.' : '');
        } else if (activeDraft.phase === 'pick') {
            if (phaseChanged || activeDraft.myTeamSubmitted) {
                activeDraftSelection = Array.isArray(activeDraft.myTeam) ? activeDraft.myTeam.slice() : [];
            }
            const bans = Array.isArray(activeDraft.revealedBans) ? activeDraft.revealedBans.length : 0;
            setDraftStatus(activeDraft.myTeamSubmitted ? 'Team locked. Waiting for the opponent or timer.' : `${bans} total bans revealed.`);
        }
        renderDraftSelectionRow();
        renderDraftGrid();
        updateDraftTimer();
    };

    const closeDraft = () => {
        clearDraftIntervals();
        activeDraft = null;
        activeDraftSelection = [];
        activeDraftSelectionPhase = '';
        if (draftBackdrop) {
            draftBackdrop.classList.add('hidden');
            draftBackdrop.classList.remove('visible');
        }
    };

    const applyDraftUpdate = (data = {}) => {
        if (!data?.draft) return false;
        activeDraft = data;
        if (data.phase === 'completed' && data.matchId) {
            closeDraft();
            handleMatchFound({ matchFound: true, matchId: data.matchId, matchStartsAt: data.matchStartsAt });
            return true;
        }
        if (data.phase === 'failed') {
            setDraftStatus(data.failureReason || 'Draft failed.', 'error');
            if (data.requeued) {
                closeDraft();
                isSearching = true;
                setSearchingState('searching', data.mode || 'quick');
                openSearching();
                startPollingMatch();
                return true;
            }
            closeDraft();
            alert(data.failureReason || 'Draft failed.');
            return true;
        }
        renderDraft();
        return true;
    };

    const pollDraft = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (data?.draft) {
                applyDraftUpdate(data);
                return;
            }
            if (data?.matchFound && data.matchId) {
                closeDraft();
                handleMatchFound(data);
            }
        } catch (error) {
            console.warn('Draft status check failed:', error);
        }
    };

    const startDraftSession = (data = {}) => {
        const sameDraftPhase =
            activeDraft?.draftId === data?.draftId &&
            activeDraft?.phase === data?.phase &&
            activeDraftSelectionPhase === data?.phase;
        activeDraft = data;
        if (!sameDraftPhase) {
            activeDraftSelection = data.phase === 'ban'
                ? (Array.isArray(data.myBans) ? data.myBans.slice() : [])
                : (Array.isArray(data.myTeam) ? data.myTeam.slice() : []);
        }
        activeDraftSelectionPhase = data.phase || '';
        clearDraftIntervals();
        renderDraft();
        activeDraftPoll = setInterval(pollDraft, 1500);
        activeDraftTimer = setInterval(updateDraftTimer, 250);
    };

    const submitDraftSelection = async () => {
        if (!activeDraft?.draftId) return;
        const phase = activeDraft.phase;
        const endpoint = phase === 'ban' ? 'bans' : 'team';
        const payloadKey = phase === 'ban' ? 'bans' : 'team';
        if (activeDraftSelection.length !== getDraftPhaseLimit()) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/draft/${encodeURIComponent(activeDraft.draftId)}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ [payloadKey]: activeDraftSelection }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Unable to lock draft selection.');
            }
            applyDraftUpdate(data);
        } catch (error) {
            setDraftStatus(error?.message || 'Unable to lock draft selection.', 'error');
        }
    };

    if (draftSubmitButton) {
        draftSubmitButton.addEventListener('click', (event) => {
            event.preventDefault();
            submitDraftSelection();
        });
    }

    if (draftCancelButton) {
        draftCancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            cancelMatchmaking();
            closeDraft();
        });
    }

    const preferredCharacterDisplayOrder = [
        'iron-man',
        'spider-man',
        'captain-america',
        'storm',
        'venom',
        'parasite',
        'carnage',
        'doctor-octopus',
        'the-green-goblin',
        'sandman',
        'mysterio',
        'scorpion',
        'the-hulk',
        'superman',
        'batman',
        'aquaman',
        'the-flash-barry-allen',
        'wonder-woman',
        'green-lantern-hal-jordan',
        'sinestro',
        'atrocitus',
        'saint-walker',
        'indigo-1',
        'john-stewart',
        'sorrow',
        'the-joker',
        'invincible',
        'atom-eve',
        'rex-splode',
        'omni-man',
        'angstrom-levy',
        'billy-butcher',
        'homelander',
        'rick-grimes',
        'hershel-greene',
        'andrea',
        'negan',
        'walker',
        'rage-infected',
        'space-marine-infantry',
        'lieutenant-seraphina-vale',
        'predator-stalker',
        'xenomorph-drone',
        'predalien',
    ];
    const getCharacterDisplayId = (character) => character?.characterId || character?.id || '';
    const getBaseRosterDisplayIndices = () => {
        const used = new Set();
        const ordered = preferredCharacterDisplayOrder
            .map((id) => roster.findIndex((character) => getCharacterDisplayId(character) === id))
            .filter((index) => {
                if (!Number.isInteger(index) || index < 0 || used.has(index)) return false;
                used.add(index);
                return true;
            });
        roster.forEach((character, index) => {
            if (!used.has(index)) ordered.push(index);
        });
        return ordered;
    };

    const CHARACTERS_PER_PAGE = 21;
    let rosterDisplayIndices = getBaseRosterDisplayIndices();
    let totalPages = Math.max(1, Math.ceil(Math.max(rosterDisplayIndices.length, CHARACTERS_PER_PAGE) / CHARACTERS_PER_PAGE));
    let currentRosterPage = 0;
    let currentCharacterIndex = null;
    let activeRosterFilterMode = 'role';
    let activeRosterFilterValue = 'all';
    let characterPlayRates = new Map();
    slotList.innerHTML = '';

    const renderEnergy = (energyList = []) => {
        if (!energyBarEl) return;
        const label = energyBarEl.querySelector('.energy-label');
        energyBarEl.innerHTML = '';
        if (label) {
            energyBarEl.appendChild(label);
        } else {
            const newLabel = document.createElement('span');
            newLabel.className = 'energy-label';
            newLabel.textContent = 'ENERGY:';
            energyBarEl.appendChild(newLabel);
        }
        const energyClassMap = {
            ninjutsu: 'energy-ninjutsu',
            bloodline: 'energy-bloodline',
            random: 'energy-random',
            genjutsu: 'energy-genjutsu',
            taijutsu: 'energy-taijutsu',
        };
        const normalizedList = (Array.isArray(energyList) ? energyList : [])
            .filter((type) => {
                const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
                return normalized && normalized !== 'none' && normalized !== 'non';
            });
        if (!normalizedList.length) {
            const noneText = document.createElement('span');
            noneText.className = 'energy-none';
            noneText.textContent = 'none';
            energyBarEl.appendChild(noneText);
            return;
        }
        normalizedList.forEach((type) => {
            const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
            const pip = document.createElement('span');
            const colorClass = energyClassMap[normalized];
            pip.className = ['energy-pip', 'filled', colorClass].filter(Boolean).join(' ');
            pip.title = type;
            energyBarEl.appendChild(pip);
        });
    };

    const renderClasses = (classes = []) => {
        if (!classesEl) return;
        classesEl.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'classes-label';
        label.textContent = 'CLASSES:';
        classesEl.appendChild(label);
        getVisibleSkillClasses(classes).forEach((cls) => {
            const span = document.createElement('span');
            span.className = 'class-type';
            span.textContent = cls;
            classesEl.appendChild(span);
        });
    };

    const setActiveSkillImage = (activeIndex) => {
        skillImages.forEach((img, idx) => {
            img.classList.toggle('active', idx === activeIndex);
        });
    };

    const ensureSkillImageSlots = (count) => {
        if (!skillImagesContainer) return;
        const required = Math.max(0, Number(count) || 0);
        const current = Array.from(skillImagesContainer.querySelectorAll('.skill-image'));
        if (current.length < required) {
            for (let i = current.length; i < required; i += 1) {
                const img = document.createElement('img');
                img.className = 'skill-image';
                img.dataset.skillIndex = String(i);
                img.alt = `Skill ${i + 1}`;
                img.src = '';
                skillImagesContainer.appendChild(img);
            }
        } else if (current.length > required) {
            current.slice(required).forEach((img) => img.remove());
        }
        skillImages = Array.from(skillImagesContainer.querySelectorAll('.skill-image'));
    };

    const renderSkill = (skill, activeIndex = 0) => {
        if (!skill) return;
        if (skillNameEl) {
            skillNameEl.textContent = skill.name || 'Skill name';
            skillNameEl.style.visibility = 'visible';
        }
        if (skillDescEl) {
            skillDescEl.textContent = getSkillDescriptionText(skill);
        }
        if (energyBarEl) {
            energyBarEl.style.display = 'flex';
        }
        if (classesEl) {
            classesEl.style.display = 'flex';
        }
        renderEnergy(skill.energy);
        renderClasses(skill.classes);
        if (cooldownEl) {
            cooldownEl.textContent = skill.cooldown ?? '-';
        }
        if (cooldownWrapper) {
            cooldownWrapper.style.display = 'flex';
        }
        setActiveSkillImage(activeIndex);
    };

    const getSelectionCharacterRole = (character) => {
        const role =
            character?.role ||
            character?.characterRole ||
            character?.metadata?.role ||
            character?.details?.role ||
            '';
        return typeof role === 'string' && role.trim() ? role.trim() : 'None';
    };

    const labelFromKey = (value = '') =>
        String(value || '')
            .split('-')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    const energyFilterLabels = {
        taijutsu: 'Green',
        bloodline: 'Red',
        ninjutsu: 'Blue',
        genjutsu: 'White',
        random: 'Random',
        none: 'No Cost',
    };

    const labelEnergyFilterKey = (value = '') => energyFilterLabels[value] || labelFromKey(value);

    const labelEnergyFilterSignature = (signature = '') =>
        signature === 'none' ? 'No Cost' : signature.split('+').map(labelEnergyFilterKey).join(' + ');

    const getSelectionRoleCategory = (character) => {
        const category = typeof character?.roleCategory === 'string' ? character.roleCategory.trim().toLowerCase() : '';
        if (category) return category;
        const role = getSelectionCharacterRole(character).toLowerCase();
        if (role.includes('tank') || role.includes('juggernaut')) return 'tank';
        if (role.includes('support') || role.includes('heal') || role.includes('shield')) return 'support';
        if (role.includes('assassin') || role.includes('execution')) return 'assassin';
        if (role.includes('bruiser') || role.includes('brawler') || role.includes('beserker') || role.includes('berserker')) return 'bruiser';
        if (role.includes('hybrid')) return 'hybrid';
        if (role.includes('disrupt') || role.includes('control') || role.includes('trickster') || role.includes('remover')) return 'strategic';
        if (role.includes('specialist') || role.includes('punisher')) return 'specialist';
        if (role.includes('dps') || role.includes('damage') || role.includes('carry') || role.includes('mage')) return 'damage';
        return 'specialist';
    };

    const getCharacterEnergySignatures = (character) => {
        const signatures = new Set();
        (Array.isArray(character?.skills) ? character.skills : []).forEach((skill) => {
            if (!skill || skill.hiddenFromSelectionViewer) return;
            const types = Array.from(
                new Set(
                    (Array.isArray(skill.energy) ? skill.energy : [])
                        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                        .filter((entry) => entry && entry !== 'none' && entry !== 'non')
                )
            ).sort();
            signatures.add(types.length ? types.join('+') : 'none');
        });
        return signatures;
    };

    const getCharacterPlayRate = (character) => {
        const characterId = getCharacterDisplayId(character).trim().toLowerCase();
        return characterPlayRates.get(characterId) || { pickCount: 0, playRatePercent: 0 };
    };

    const getCharacterPlayRateBucket = (character) => {
        const rate = getCharacterPlayRate(character);
        if (!rate.pickCount) return 'unused';
        if (rate.playRatePercent >= 5) return 'high';
        if (rate.playRatePercent >= 2) return 'medium';
        return 'low';
    };

    const renderCharacterOverview = (character) => {
        if (skillNameEl) {
            skillNameEl.textContent = '';
            skillNameEl.style.visibility = 'hidden';
        }
        if (skillDescEl) {
            skillDescEl.textContent = getCharacterDescriptionText(character);
        }
        if (energyBarEl) {
            energyBarEl.style.display = 'none';
        }
        if (classesEl) {
            classesEl.style.display = 'none';
        }
        renderEnergy([]);
        renderClasses([]);
        if (cooldownEl) {
            cooldownEl.textContent = '-';
        }
        if (cooldownWrapper) {
            cooldownWrapper.style.display = 'none';
        }
        setActiveSkillImage(-1);
    };

    const handleSkillSelect = (skillIndex) => {
        if (currentCharacterIndex === null) return;
        const character = roster[currentCharacterIndex];
        if (!character || !Array.isArray(character.skills)) return;
        const visibleSkills = character.skills.filter(
            (skill) => skill && !Boolean(skill.hiddenFromSelectionViewer)
        );
        const skill = visibleSkills[skillIndex];
        if (!skill) return;
        renderSkill(skill, skillIndex);
    };

    const renderCharacter = (character, index) => {
        if (!character) return;
        currentCharacterIndex = index;
        if (nameEl) {
            nameEl.textContent = character.name || 'Unknown shinobi';
        }
        if (roleEl) {
            roleEl.textContent = `Role: ${getSelectionCharacterRole(character)}`;
            roleEl.style.visibility = 'visible';
        }
        if (portraitEl) {
            portraitEl.src = character.facePicture || '';
            portraitEl.alt = character.name ? `${character.name} portrait` : 'Character portrait';
        }
        renderCharacterOverview(character);
        if (Array.isArray(character.skills)) {
            const visibleSkills = character.skills.filter(
                (skill) => skill && !Boolean(skill.hiddenFromSelectionViewer)
            );
            ensureSkillImageSlots(visibleSkills.length);
            if (skillImagesContainer) {
                skillImagesContainer.scrollLeft = 0;
            }
            visibleSkills.forEach((skill, skillIdx) => {
                const targetImg = skillImages[skillIdx];
                if (!targetImg) return;
                if (skill) {
                    targetImg.src = skill.skillimage || '';
                    targetImg.alt = skill.name || `Skill ${skillIdx + 1}`;
                    targetImg.style.visibility = 'visible';
                    targetImg.onclick = () => handleSkillSelect(skillIdx);
                } else {
                    targetImg.src = '';
                    targetImg.alt = `Skill ${skillIdx + 1}`;
                    targetImg.style.visibility = 'hidden';
                    targetImg.onclick = null;
                }
            });
        }
    };

    const handleCharacterSelect = (index, { openViewer = true } = {}) => {
        const character = roster[index];
        if (!character) return;
        if (openViewer) {
            openSkillViewer();
        }
        renderCharacter(character, index);
    };

    const setDragPayload = (dataTransfer, payload) => {
        const serialized = JSON.stringify(payload);
        dataTransfer.setData('application/json', serialized);
        dataTransfer.setData('text/plain', serialized);
        dataTransfer.effectAllowed = 'copyMove';
        dataTransfer.dropEffect = 'move';
    };

    const parseDragPayload = (event) => {
        const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    };

    const handleSlotDragStart = (event, rosterIndex) => {
        const rosterSlot = rosterSlotElements[rosterIndex];
        if (rosterSlot && rosterSlot.classList.contains('slot-empty')) return;
        const character = roster[rosterIndex];
        if (isCharacterLocked(character)) return;
        if (!character || !event.dataTransfer) return;
        setDragPayload(event.dataTransfer, { type: 'roster', rosterIndex });
        const img = event.target.closest('.slot-image');
        if (img) {
            const rect = img.getBoundingClientRect();
            event.dataTransfer.setDragImage(img, rect.width / 2, rect.height / 2);
        }
    };

    const startableButtons = [quickButton, ladderButton, privateButton];

    const updateGameButtons = () => {
        const filled = selectedAssignments.filter(Boolean).length;
        const enabled = filled >= 3;
        startableButtons.forEach((btn) => {
            if (!btn) return;
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
        });
    };

    const getTeamIndices = () =>
        selectedAssignments.map((assignment) => assignment?.characterIndex).filter((idx) => Number.isInteger(idx));

    const persistTeamSelection = async () => {
        const indices = selectedAssignments.map((assignment) => assignment?.characterIndex);
        if (!indices.every((idx) => Number.isInteger(idx))) {
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/team/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ team: indices }),
            });
        } catch (error) {
            console.warn('Failed to save team selection.', error);
        }
    };

    const handleSlotDragEnd = () => {};

    const clearRosterSlot = (index) => {
        const slot = rosterSlotElements[index];
        if (!slot) return;
        slot.innerHTML = '';
        slot.classList.add('slot-empty');
        slot.draggable = false;
    };

    const buildRosterSlot = (index) => {
        const slot = rosterSlotElements[index];
        const character = roster[index];
        if (!slot) return;
        slot.innerHTML = '';
        const locked = isCharacterLocked(character);
        const isSelected = selectedAssignments.some((assignment) => assignment?.rosterIndex === index);
        if (!character || isSelected) {
            slot.classList.add('slot-empty');
            slot.classList.remove('slot-locked');
            slot.draggable = false;
            return;
        }
        slot.classList.remove('slot-empty');
        slot.classList.toggle('slot-locked', locked);
        slot.draggable = false;
        const image = document.createElement('img');
        image.className = 'slot-image';
        if (locked) {
            image.classList.add('slot-locked');
        }
        image.src = character.facePicture;
        image.alt = character.name || `Character ${index + 1}`;
        image.draggable = false;
        image.title = locked ? `${character.name || 'Character'} is locked.` : character.name || `Character ${index + 1}`;
        slot.appendChild(image);
        if (!locked) {
            image.addEventListener('dragstart', (event) => handleSlotDragStart(event, index));
            image.addEventListener('pointerdown', (event) =>
                startSelectionPointerDrag(event, { type: 'roster', rosterIndex: index }, image)
            );
        }
        image.addEventListener('dragend', handleSlotDragEnd);
    };

    const fillRosterSlot = (index) => {
        buildRosterSlot(index);
    };

    const setSelectedSlot = (slotIndex, assignment) => {
        const slotElement = selectedSlots[slotIndex];
        if (!slotElement) return;
        if (assignment && isCharacterLocked(roster[assignment.characterIndex])) {
            return;
        }
        selectedAssignments[slotIndex] = assignment;
        slotElement.innerHTML = '';
        slotElement.classList.remove('drag-over');
        if (!assignment) {
            slotElement.textContent = String(slotIndex + 1);
            return;
        }
        const character = roster[assignment.characterIndex];
        const img = document.createElement('img');
        img.src = character?.facePicture || '';
        img.alt = character?.name || 'Selected character';
        img.className = 'selected-slot-image';
        img.draggable = false;
        const dragStart = (event) => {
            setDragPayload(event.dataTransfer, { type: 'selected', selectedIndex: slotIndex });
        };
        img.addEventListener('dragstart', dragStart);
        img.addEventListener('pointerdown', (event) =>
            startSelectionPointerDrag(event, { type: 'selected', selectedIndex: slotIndex }, img)
        );
        slotElement.appendChild(img);
        handleCharacterSelect(assignment.characterIndex, { openViewer: false });
        updateGameButtons();
        persistTeamSelection();
    };

    const moveDragPayloadToSelectedSlot = (payload, targetSlotIndex) => {
        let incoming = null;
        if (payload.type === 'selected' && payload.selectedIndex === targetSlotIndex) {
            return false;
        }

        if (payload.type === 'roster' && Number.isInteger(payload.rosterIndex) && roster[payload.rosterIndex]) {
            incoming = { characterIndex: payload.rosterIndex, rosterIndex: payload.rosterIndex };
            clearRosterSlot(payload.rosterIndex);
        } else if (
            payload.type === 'selected' &&
            Number.isInteger(payload.selectedIndex) &&
            selectedAssignments[payload.selectedIndex]
        ) {
            incoming = selectedAssignments[payload.selectedIndex];
            setSelectedSlot(payload.selectedIndex, null);
        }

        if (!incoming) return false;

        const displaced = selectedAssignments[targetSlotIndex];
        setSelectedSlot(targetSlotIndex, incoming);

        if (displaced && Number.isInteger(displaced.rosterIndex)) {
            fillRosterSlot(displaced.rosterIndex);
        }
        updateGameButtons();
        persistTeamSelection();
        return true;
    };

    const handleSelectedSlotDrop = (event, targetSlotIndex) => {
        event.preventDefault();
        const slotElement = selectedSlots[targetSlotIndex];
        if (!slotElement) return;
        slotElement.classList.remove('drag-over');
        const payload = parseDragPayload(event);
        if (!payload) return;
        moveDragPayloadToSelectedSlot(payload, targetSlotIndex);
    };

    const handleSelectedSlotDragOver = (event, slotElement) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (slotElement) {
            slotElement.classList.add('drag-over');
        }
    };

    const handleSelectedSlotDragLeave = (event, slotElement) => {
        event.preventDefault();
        if (slotElement) {
            slotElement.classList.remove('drag-over');
        }
    };

    const handleSelectedSlotDoubleClick = (slotIndex) => {
        const assignment = selectedAssignments[slotIndex];
        if (!assignment) return;
        setSelectedSlot(slotIndex, null);
        if (Number.isInteger(assignment.rosterIndex)) {
            fillRosterSlot(assignment.rosterIndex);
        }
        updateGameButtons();
        persistTeamSelection();
    };

    const handleSelectedSlotClick = (slotIndex) => {
        const assignment = selectedAssignments[slotIndex];
        if (!assignment) return;
        handleCharacterSelect(assignment.characterIndex, { openViewer: true });
    };

    const queueSelectionPreview = (callback) => {
        if (selectionClickTimer) {
            clearTimeout(selectionClickTimer);
        }
        selectionClickTimer = window.setTimeout(() => {
            selectionClickTimer = null;
            callback();
        }, 225);
    };

    const cancelSelectionPreview = () => {
        if (!selectionClickTimer) return;
        clearTimeout(selectionClickTimer);
        selectionClickTimer = null;
    };

    const addRosterCharacterToSelection = (rosterIndex) => {
        if (!Number.isInteger(rosterIndex) || !roster[rosterIndex]) return;
        if (isCharacterLocked(roster[rosterIndex])) return;
        const existingSlotIndex = selectedAssignments.findIndex(
            (assignment) => assignment?.characterIndex === rosterIndex
        );
        if (existingSlotIndex >= 0) return;
        const emptySlotIndex = selectedAssignments.findIndex((assignment) => !assignment);
        if (emptySlotIndex < 0) return;
        clearRosterSlot(rosterIndex);
        setSelectedSlot(emptySlotIndex, { characterIndex: rosterIndex, rosterIndex });
        updateGameButtons();
        persistTeamSelection();
    };

    const handleRosterDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleRosterDrop = (event, rosterIndex) => {
        event.preventDefault();
        const payload = parseDragPayload(event);
        if (!payload) return;
        if (
            payload.type === 'selected' &&
            Number.isInteger(payload.selectedIndex) &&
            selectedAssignments[payload.selectedIndex]
        ) {
            const assignment = selectedAssignments[payload.selectedIndex];
            setSelectedSlot(payload.selectedIndex, null);
            fillRosterSlot(assignment.rosterIndex);
        }
    };

    const returnSelectedPayloadToRoster = (payload) => {
        if (
            payload?.type !== 'selected' ||
            !Number.isInteger(payload.selectedIndex) ||
            !selectedAssignments[payload.selectedIndex]
        ) {
            return false;
        }
        const assignment = selectedAssignments[payload.selectedIndex];
        setSelectedSlot(payload.selectedIndex, null);
        if (Number.isInteger(assignment.rosterIndex)) {
            fillRosterSlot(assignment.rosterIndex);
        }
        updateGameButtons();
        persistTeamSelection();
        return true;
    };

    const finishSelectionPointerDrop = (payload, clientX, clientY) => {
        const target = document.elementFromPoint(clientX, clientY);
        const selectedSlot = target?.closest?.('.selected-character-slot');
        const selectedSlotIndex = selectedSlot ? selectedSlots.indexOf(selectedSlot) : -1;
        if (selectedSlotIndex >= 0) {
            return moveDragPayloadToSelectedSlot(payload, selectedSlotIndex);
        }
        const rosterSlot = target?.closest?.('.slot-item');
        if (rosterSlot) {
            return returnSelectedPayloadToRoster(payload);
        }
        return false;
    };

    const updateSelectionDragImagePosition = (dragState, clientX, clientY) => {
        if (!dragState?.dragImage) return;
        dragState.dragImage.style.left = `${clientX - dragState.offsetX}px`;
        dragState.dragImage.style.top = `${clientY - dragState.offsetY}px`;
    };

    const activateSelectionPointerDrag = (dragState, event) => {
        if (dragState.active) return;
        dragState.active = true;
        const dragImage = dragState.sourceElement.cloneNode(true);
        dragImage.classList.remove('drag-hidden');
        dragImage.classList.add('selection-drag-image');
        dragImage.style.width = `${dragState.rect.width}px`;
        dragImage.style.height = `${dragState.rect.height}px`;
        document.body.appendChild(dragImage);
        dragState.dragImage = dragImage;
        dragState.sourceElement.classList.add('drag-hidden');
        updateSelectionDragImagePosition(dragState, event.clientX, event.clientY);
    };

    const cleanupSelectionPointerDrag = (dragState, restoreSource) => {
        if (dragState.dragImage?.parentNode) {
            dragState.dragImage.parentNode.removeChild(dragState.dragImage);
        }
        if (restoreSource) {
            dragState.sourceElement.classList.remove('drag-hidden');
        }
        try {
            dragState.sourceElement.releasePointerCapture?.(dragState.pointerId);
        } catch (error) {
            // The source may already have been removed after a successful drop.
        }
        activeSelectionPointerDrag = null;
    };

    const startSelectionPointerDrag = (event, payload, sourceElement) => {
        if (!sourceElement || !payload || event.button !== 0 || activeSelectionPointerDrag) return;
        event.preventDefault();
        cancelSelectionPreview();
        const rect = sourceElement.getBoundingClientRect();
        const dragState = {
            active: false,
            dragImage: null,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            payload,
            pointerId: event.pointerId,
            rect,
            sourceElement,
            startX: event.clientX,
            startY: event.clientY,
        };
        activeSelectionPointerDrag = dragState;
        sourceElement.setPointerCapture?.(event.pointerId);

        const handlePointerMove = (moveEvent) => {
            if (moveEvent.pointerId !== dragState.pointerId) return;
            const distance = Math.hypot(moveEvent.clientX - dragState.startX, moveEvent.clientY - dragState.startY);
            if (!dragState.active && distance >= 4) {
                activateSelectionPointerDrag(dragState, moveEvent);
            }
            if (dragState.active) {
                moveEvent.preventDefault();
                updateSelectionDragImagePosition(dragState, moveEvent.clientX, moveEvent.clientY);
            }
        };

        const handlePointerUp = (upEvent) => {
            if (upEvent.pointerId !== dragState.pointerId) return;
            sourceElement.removeEventListener('pointermove', handlePointerMove);
            sourceElement.removeEventListener('pointerup', handlePointerUp);
            sourceElement.removeEventListener('pointercancel', handlePointerCancel);
            if (!dragState.active) {
                activeSelectionPointerDrag = null;
                try {
                    sourceElement.releasePointerCapture?.(dragState.pointerId);
                } catch (error) {
                    // Ignore capture cleanup races.
                }
                return;
            }
            upEvent.preventDefault();
            suppressSelectionClickUntil = Date.now() + 350;
            const dropped = finishSelectionPointerDrop(dragState.payload, upEvent.clientX, upEvent.clientY);
            cleanupSelectionPointerDrag(dragState, !dropped);
        };

        const handlePointerCancel = (cancelEvent) => {
            if (cancelEvent.pointerId !== dragState.pointerId) return;
            sourceElement.removeEventListener('pointermove', handlePointerMove);
            sourceElement.removeEventListener('pointerup', handlePointerUp);
            sourceElement.removeEventListener('pointercancel', handlePointerCancel);
            cleanupSelectionPointerDrag(dragState, true);
        };

        sourceElement.addEventListener('pointermove', handlePointerMove);
        sourceElement.addEventListener('pointerup', handlePointerUp);
        sourceElement.addEventListener('pointercancel', handlePointerCancel);
    };

    const rosterFilterOptions = {
        role: [
            ['all', 'All Roles'],
            ['tank', 'Tank'],
            ['damage', 'Damage'],
            ['support', 'Support'],
            ['strategic', 'Strategic'],
            ['hybrid', 'Hybrid'],
            ['assassin', 'Assassin'],
            ['bruiser', 'Bruiser'],
            ['specialist', 'Specialist'],
        ],
        unlock: [
            ['all', 'All Unlocks'],
            ['starter', 'Starters'],
            ['mission', 'Mission Characters'],
            ['unlocked-mission', 'Unlocked Missions'],
            ['locked-mission', 'Locked Missions'],
        ],
        universe: [
            ['all', 'All Universes'],
            ['marvel', 'Marvel'],
            ['dc', 'DC'],
            ['image', 'Image'],
            ['other', 'Other'],
        ],
        'play-rate': [
            ['all', 'All Rates'],
            ['high', 'High Play Rate'],
            ['medium', 'Medium Play Rate'],
            ['low', 'Low Play Rate'],
            ['unused', 'Unused'],
        ],
    };

    const buildEnergyFilterOptions = () => {
        const signatures = new Set();
        roster.forEach((character) => {
            getCharacterEnergySignatures(character).forEach((signature) => signatures.add(signature));
        });
        return [
            ['all', 'All Energy'],
            ...Array.from(signatures)
                .sort((left, right) => left.localeCompare(right))
                .map((signature) => [signature, labelEnergyFilterSignature(signature)]),
        ];
    };

    const getRosterFilterOptions = () =>
        activeRosterFilterMode === 'energy'
            ? buildEnergyFilterOptions()
            : rosterFilterOptions[activeRosterFilterMode] || rosterFilterOptions.role;

    const doesCharacterMatchRosterFilter = (character) => {
        if (activeRosterFilterValue === 'all') return true;
        const characterId = getCharacterDisplayId(character).trim().toLowerCase();
        if (activeRosterFilterMode === 'role') {
            return getSelectionRoleCategory(character) === activeRosterFilterValue;
        }
        if (activeRosterFilterMode === 'energy') {
            return getCharacterEnergySignatures(character).has(activeRosterFilterValue);
        }
        if (activeRosterFilterMode === 'unlock') {
            const isMissionCharacter = missionLockedCharacterIds.has(characterId);
            const isUnlocked = !isCharacterLocked(character);
            if (activeRosterFilterValue === 'starter') return !isMissionCharacter;
            if (activeRosterFilterValue === 'mission') return isMissionCharacter;
            if (activeRosterFilterValue === 'unlocked-mission') return isMissionCharacter && isUnlocked;
            if (activeRosterFilterValue === 'locked-mission') return isMissionCharacter && !isUnlocked;
        }
        if (activeRosterFilterMode === 'universe') {
            const universe = typeof character?.universe === 'string' ? character.universe.trim().toLowerCase() : 'other';
            return universe === activeRosterFilterValue;
        }
        if (activeRosterFilterMode === 'play-rate') {
            return getCharacterPlayRateBucket(character) === activeRosterFilterValue;
        }
        return true;
    };

    const rebuildRosterDisplayIndices = () => {
        const base = getBaseRosterDisplayIndices();
        let next = base.filter((index) => doesCharacterMatchRosterFilter(roster[index]));
        if (activeRosterFilterMode === 'play-rate') {
            next = next.slice().sort((leftIndex, rightIndex) => {
                const leftRate = getCharacterPlayRate(roster[leftIndex]);
                const rightRate = getCharacterPlayRate(roster[rightIndex]);
                if (rightRate.pickCount !== leftRate.pickCount) return rightRate.pickCount - leftRate.pickCount;
                return String(roster[leftIndex]?.name || '').localeCompare(String(roster[rightIndex]?.name || ''));
            });
        }
        rosterDisplayIndices = next;
        totalPages = Math.max(
            1,
            Math.ceil(Math.max(rosterDisplayIndices.length, CHARACTERS_PER_PAGE) / CHARACTERS_PER_PAGE)
        );
        currentRosterPage = Math.min(currentRosterPage, totalPages - 1);
        if (rosterFilterStatus) {
            rosterFilterStatus.textContent = `${rosterDisplayIndices.length} character${rosterDisplayIndices.length === 1 ? '' : 's'}`;
        }
    };

    const syncRosterFilterSelect = () => {
        if (!rosterFilterSelect) return;
        const options = getRosterFilterOptions();
        if (!options.some(([value]) => value === activeRosterFilterValue)) {
            activeRosterFilterValue = 'all';
        }
        rosterFilterSelect.innerHTML = '';
        options.forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = value === activeRosterFilterValue;
            rosterFilterSelect.appendChild(option);
        });
    };

    const applyRosterFilter = () => {
        syncRosterFilterSelect();
        currentRosterPage = 0;
        rebuildRosterDisplayIndices();
        renderRosterPage();
    };

    const updateRosterPageButtons = () => {
        if (lastPageButton) {
            const canGoBack = currentRosterPage > 0;
            lastPageButton.style.opacity = canGoBack ? '1' : '0.45';
            lastPageButton.style.pointerEvents = canGoBack ? 'auto' : 'none';
        }
        if (nextPageButton) {
            const canGoNext = currentRosterPage < totalPages - 1;
            nextPageButton.style.opacity = canGoNext ? '1' : '0.45';
            nextPageButton.style.pointerEvents = canGoNext ? 'auto' : 'none';
        }
    };

    const renderRosterPage = () => {
        slotList.innerHTML = '';
        rosterSlotElements.length = 0;
        const pageStart = currentRosterPage * CHARACTERS_PER_PAGE;
        const pageEnd = pageStart + CHARACTERS_PER_PAGE;

        for (let displayIndex = pageStart; displayIndex < pageEnd; displayIndex += 1) {
            const rosterIndex = rosterDisplayIndices[displayIndex];
            const listItem = document.createElement('li');
            listItem.className = 'slot-item';
            listItem.dataset.index = Number.isInteger(rosterIndex) ? rosterIndex : '';
            listItem.addEventListener('dragover', handleRosterDragOver);
            listItem.addEventListener('drop', (event) => {
                if (Number.isInteger(rosterIndex)) handleRosterDrop(event, rosterIndex);
            });

            const handleClick = () => {
                if (listItem.classList.contains('slot-empty')) return;
                queueSelectionPreview(() => {
                    if (listItem.classList.contains('slot-empty')) return;
                    if (Number.isInteger(rosterIndex)) handleCharacterSelect(rosterIndex);
                });
            };

            const handleDoubleClick = () => {
                cancelSelectionPreview();
                if (listItem.classList.contains('slot-empty')) return;
                if (Number.isInteger(rosterIndex)) addRosterCharacterToSelection(rosterIndex);
            };

            listItem.addEventListener('click', handleClick);
            listItem.addEventListener('dblclick', handleDoubleClick);
            listItem.addEventListener('dragstart', (event) => {
                if (Number.isInteger(rosterIndex)) handleSlotDragStart(event, rosterIndex);
            });
            listItem.addEventListener('dragend', handleSlotDragEnd);

            slotList.appendChild(listItem);
            if (Number.isInteger(rosterIndex)) {
                rosterSlotElements[rosterIndex] = listItem;
                buildRosterSlot(rosterIndex);
            } else {
                listItem.classList.add('slot-empty');
                listItem.draggable = false;
            }
        }

        updateRosterPageButtons();
    };

    selectedSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('click', () => {
            queueSelectionPreview(() => handleSelectedSlotClick(slotIndex));
        });
        slot.addEventListener('dragover', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragenter', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragleave', (event) => handleSelectedSlotDragLeave(event, slot));
        slot.addEventListener('drop', (event) => handleSelectedSlotDrop(event, slotIndex));
        slot.addEventListener('dblclick', () => {
            cancelSelectionPreview();
            handleSelectedSlotDoubleClick(slotIndex);
        });
    });

    const applySavedTeam = () => {
        const saved = profileCache?.savedTeamIndices;
        if (!Array.isArray(saved) || saved.length !== selectedSlots.length) {
            updateGameButtons();
            renderRosterPage();
            return;
        }
        const used = new Set();
        saved.forEach((rosterIdx, slotIdx) => {
            if (!Number.isInteger(rosterIdx) || rosterIdx < 0 || rosterIdx >= roster.length) return;
            if (isCharacterLocked(roster[rosterIdx])) return;
            if (used.has(rosterIdx)) return;
            const assignment = { characterIndex: rosterIdx, rosterIndex: rosterIdx };
            clearRosterSlot(rosterIdx);
            setSelectedSlot(slotIdx, assignment);
            used.add(rosterIdx);
        });
        updateGameButtons();
        renderRosterPage();
    };

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            if (currentRosterPage >= totalPages - 1) return;
            currentRosterPage += 1;
            renderRosterPage();
        });
    }

    if (lastPageButton) {
        lastPageButton.addEventListener('click', () => {
            if (currentRosterPage <= 0) return;
            currentRosterPage -= 1;
            renderRosterPage();
        });
    }

    rosterFilterTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.rosterFilterMode || 'role';
            activeRosterFilterMode = mode;
            activeRosterFilterValue = 'all';
            rosterFilterTabs.forEach((entry) => entry.classList.toggle('active', entry === tab));
            applyRosterFilter();
        });
    });

    if (rosterFilterSelect) {
        rosterFilterSelect.addEventListener('change', () => {
            activeRosterFilterValue = rosterFilterSelect.value || 'all';
            applyRosterFilter();
        });
    }

    await loadMissionLockedCharacterIds();
    await loadCharacterPlayRates();
    rebuildRosterDisplayIndices();
    syncRosterFilterSelect();
    renderRosterPage();
    updateGameButtons();
    persistTeamSelection();
    applySavedTeam();
    resumeMatchIfActive();
    
    document.body.classList.remove('app-loading', 'app-loading-selection');
});
