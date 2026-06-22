if (typeof WINDOW_DEFAULT_POS === "undefined") {
    window.WINDOW_DEFAULT_POS = {
        ship: {
            top: 80,
            left: 70
        },
        user: {
            top: 200,
            left: 70
        },
        group: {
            top: 80,
            left: 280
        },
        log: {
            top: 360,
            left: 70
        },
        chat: {
            top: 540,
            left: 70
        },
        booster: {
            top: 10,
            left: 10
        }
    };
}

function initGlobalButtonStyles() {
    return;
}

function initGlobalTextFieldStyles() {
    const textBg = UI_SPRITES.chatBg || UI_SPRITES.windowBg;
    const textDisabled = UI_SPRITES.windowSide || textBg;
    const inputBg = UI_SPRITES.chatInputBg || textBg;
    const inputDisabled = UI_SPRITES.windowSide || inputBg;
    const cssUrl = p => p ? `url('${p}')` : "none";
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n         \n        .flTextAreaSkin {\n            background-image: ${cssUrl(textBg)};\n            background-repeat: repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .flTextAreaSkin.disabled,\n        .flTextAreaSkin:disabled,\n        textarea.flTextAreaSkin:disabled {\n            background-image: ${cssUrl(textDisabled)};\n        }\n\n         \n        textarea.doTextArea,\n        .doTextArea {\n            background-image: ${cssUrl(textBg)};\n            background-repeat: repeat;\n            background-size: auto;\n            color: #dddddd;\n            border: none;\n            padding: 4px;\n            font-size: 11px;\n            font-family: Tahoma, Arial, sans-serif;\n        }\n\n        textarea.doTextArea:disabled,\n        .doTextArea.disabled {\n            background-image: ${cssUrl(textDisabled)};\n            color: #777777;\n        }\n\n        \n\n\n\n         \n        .flTextInputSkin {\n            background-image: ${cssUrl(inputBg)};\n            background-repeat: repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .flTextInputSkin.disabled,\n        .flTextInputSkin:disabled,\n        input.flTextInputSkin:disabled {\n            background-image: ${cssUrl(inputDisabled)};\n        }\n\n         \n        input.doTextInput,\n        .doTextInput {\n            background-image: ${cssUrl(inputBg)};\n            background-repeat: repeat;\n            background-size: 100% 100%;\n            border: none;\n            padding: 2px 5px;\n            font-size: 11px;\n            font-family: Tahoma, Arial, sans-serif;\n            color: #ffffff;\n        }\n\n        input.doTextInput:disabled,\n        .doTextInput.disabled {\n            background-image: ${cssUrl(inputDisabled)};\n            color: #888888;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalComboBoxStyles() {
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n         \n        .flComboBoxSkin {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .doComboBox {\n            position: relative;\n            display: inline-block;\n            width: 180px;\n            height: 22px;\n            font-size: 11px;\n            font-family: Tahoma, Arial, sans-serif;\n            color: #dddddd;\n            cursor: pointer;\n            user-select: none;\n        }\n\n         \n        .doComboBoxSelected {\n            height: 22px;\n            line-height: 22px;\n            padding: 0 24px 0 6px;\n            background-image: none;\n            background-repeat: repeat-x;\n            background-size: 100% 100%;\n            box-sizing: border-box;\n            overflow: hidden;\n            white-space: nowrap;\n            text-overflow: ellipsis;\n        }\n\n         \n        .doComboBoxArrow {\n            position: absolute;\n            top: 0;\n            right: 0;\n            width: 22px;\n            height: 22px;\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .doComboBox.open .doComboBoxSelected {\n            background-image: none;\n        }\n\n        .doComboBox.open .doComboBoxArrow {\n            background-image: none;\n        }\n\n         \n        .doComboBox:hover .doComboBoxSelected:not(.disabled) {\n            background-image: none;\n        }\n\n        .doComboBox:hover .doComboBoxArrow:not(.disabled) {\n            background-image: none;\n        }\n\n         \n        .doComboBox.disabled .doComboBoxSelected,\n        .doComboBox.disabled .doComboBoxArrow {\n            background-image: none;\n            color: #777777;\n            cursor: default;\n        }\n\n         \n        .doComboBoxList {\n            position: absolute;\n            left: 0;\n            top: 22px;\n            width: 100%;\n            max-height: 160px;\n            overflow-y: auto;\n            background: #000910;\n            border: 0;\n            z-index: 1500;\n            display: none;\n            box-sizing: border-box;\n        }\n\n        .doComboBox.open .doComboBoxList {\n            display: block;\n        }\n\n        .doComboBoxList ul {\n            list-style: none;\n            margin: 0;\n            padding: 0;\n        }\n\n        .doComboBoxList li {\n            padding: 3px 6px;\n            cursor: pointer;\n            color: #bbbbbb;\n            background-image: none;\n            background-repeat: repeat-x;\n            background-size: 100% 100%;\n            white-space: nowrap;\n        }\n\n        .doComboBoxList li:hover {\n            color: #00aaff;\n            background-image: none;\n        }\n\n        .doComboBoxList li.disabled {\n            color: #666666;\n            cursor: default;\n            background-image: none;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalSliderStyles() {
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n         \n        .flSliderSkin {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .doSlider {\n            position: relative;\n            height: 22px;\n            padding: 3px 4px;\n            box-sizing: border-box;\n        }\n\n         \n        .doSliderTrack {\n            position: relative;\n            height: 16px;\n            background-image: none;\n            background-repeat: repeat-x;\n            background-size: auto 16px;\n            border-radius: 3px;\n        }\n\n         \n        .doSliderTrack.disabled,\n        .doSlider.disabled .doSliderTrack {\n            background-image: none;\n        }\n\n         \n        .doSliderThumb {\n            position: absolute;\n            top: -4px;\n            width: 24px;\n            height: 24px;\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: contain;\n            cursor: pointer;\n        }\n\n         \n        .doSliderThumb.over {\n            background-image: none;\n        }\n\n         \n        .doSliderThumb.down {\n            background-image: none;\n        }\n\n         \n        .doSliderThumb.disabled,\n        .doSlider.disabled .doSliderThumb {\n            background-image: none;\n            cursor: default;\n        }\n\n         \n        .doSliderTicks {\n            position: absolute;\n            left: 0;\n            right: 0;\n            top: 50%;\n            height: 4px;\n            transform: translateY(-50%);\n            pointer-events: none;\n        }\n\n        .doSliderTick {\n            position: absolute;\n            width: 2px;\n            height: 4px;\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalListStyles() {
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n         \n        .flCellRendererWrapper {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n         \n        .flListWrapper {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalMiscComponentStyles() {
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n        \n\n\n\n\n\n\n        .doFocusRectTarget {\n            position: relative;\n            outline: none;\n        }\n\n        .doFocusRectTarget:focus::after {\n            content: "";\n            position: absolute;\n            left: -2px;\n            top: -2px;\n            right: -2px;\n            bottom: -2px;\n            pointer-events: none;\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        \n\n\n\n        \n\n\n\n\n\n        .doScrollThumbIcon {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-position: center center;\n            background-size: 100% 100%;\n        }\n\n        \n\n\n\n        \n\n\n\n        .flComponentShim {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalSpriteDebugStyles() {
    const style = document.createElement("style");
    style.innerHTML = `\n        \n\n\n\n        .doSprite4 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite7 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite12 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite15 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite44 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite46 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite49 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite50 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite52 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite54 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite56 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite58 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite60 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite62 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite64 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite66 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite68 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite70 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n\n        .doSprite140 {\n            background-image: none;\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n        }\n    `;
    document.head.appendChild(style);
}

function initGlobalScrollbarStyles() {
    return;
}

let settingsWindowInitialized = false;

let settingsWindowVisible = false;

const CUSTOM_AUDIO_SETTINGS_STORAGE_KEY = typeof window !== "undefined" && window.__ANDRO_CUSTOM_AUDIO_SETTINGS_STORAGE_KEY ? String(window.__ANDRO_CUSTOM_AUDIO_SETTINGS_STORAGE_KEY) : "andromeda_custom_audio_settings_v1";
const DEFAULT_CUSTOM_AUDIO_VOLUME = 100;

function sanitizeSettingsVolumeValue(value, fallback = DEFAULT_CUSTOM_AUDIO_VOLUME) {
    const base = Number.isFinite(fallback) ? fallback : DEFAULT_CUSTOM_AUDIO_VOLUME;
    const numeric = typeof value === "number" ? value : parseFloat(value);
    if (!Number.isFinite(numeric)) return Math.max(0, Math.min(100, Math.round(base)));
    return Math.max(0, Math.min(100, Math.round(numeric)));
}

function getCustomAudioVolumeState() {
    try {
        if (window.AudioManager && typeof window.AudioManager.getCustomVolumeSettings === "function") {
            const fromAudioManager = window.AudioManager.getCustomVolumeSettings();
            return {
                MUSIC_VOLUME: sanitizeSettingsVolumeValue(fromAudioManager && fromAudioManager.musicVolumePercent, DEFAULT_CUSTOM_AUDIO_VOLUME),
                SFX_VOLUME: sanitizeSettingsVolumeValue(fromAudioManager && fromAudioManager.sfxVolumePercent, DEFAULT_CUSTOM_AUDIO_VOLUME)
            };
        }
    } catch (_) {}
    try {
        const raw = localStorage.getItem(CUSTOM_AUDIO_SETTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                MUSIC_VOLUME: sanitizeSettingsVolumeValue(parsed && parsed.musicVolumePercent, DEFAULT_CUSTOM_AUDIO_VOLUME),
                SFX_VOLUME: sanitizeSettingsVolumeValue(parsed && parsed.sfxVolumePercent, DEFAULT_CUSTOM_AUDIO_VOLUME)
            };
        }
    } catch (_) {}
    return {
        MUSIC_VOLUME: DEFAULT_CUSTOM_AUDIO_VOLUME,
        SFX_VOLUME: DEFAULT_CUSTOM_AUDIO_VOLUME
    };
}

const SETTINGS_DEFAULTS = {
    SHOW_BACKGROUND: true,
    SHOW_CARGO_BOXES: true,
    SHOW_DRONES: true,
    SHOW_RESOURCES: true,
    SHOW_BONUS_BOXES: true,
    SHOW_PLAYER_NAMES: true,
    PLAY_MUSIC: true,
    PLAY_SFX: true,
    AUTO_REFINEMENT: false,
    DOUBLECLICK_ATTACK: false,
    MUSIC_VOLUME: DEFAULT_CUSTOM_AUDIO_VOLUME,
    SFX_VOLUME: DEFAULT_CUSTOM_AUDIO_VOLUME
};

let appliedSettings = {
    ...SETTINGS_DEFAULTS,
    ...getCustomAudioVolumeState()
};

function getCurrentSettingsSnapshot() {
    const customAudioVolumeState = getCustomAudioVolumeState();
    return {
        SHOW_BACKGROUND: typeof backgroundLayersEnabled === "boolean" ? backgroundLayersEnabled : SETTINGS_DEFAULTS.SHOW_BACKGROUND,
        SHOW_CARGO_BOXES: !!(VISIBILITY_SETTINGS.freeCargo && VISIBILITY_SETTINGS.notFreeCargo),
        SHOW_DRONES: typeof setting_show_drones !== "undefined" ? !!setting_show_drones : SETTINGS_DEFAULTS.SHOW_DRONES,
        SHOW_RESOURCES: typeof VISIBILITY_SETTINGS.ore !== "undefined" ? !!VISIBILITY_SETTINGS.ore : SETTINGS_DEFAULTS.SHOW_RESOURCES,
        SHOW_BONUS_BOXES: typeof VISIBILITY_SETTINGS.bonusBoxes !== "undefined" ? !!VISIBILITY_SETTINGS.bonusBoxes : SETTINGS_DEFAULTS.SHOW_BONUS_BOXES,
        SHOW_PLAYER_NAMES: typeof setting_show_player_names !== "undefined" ? !!setting_show_player_names : SETTINGS_DEFAULTS.SHOW_PLAYER_NAMES,
        PLAY_MUSIC: typeof setting_play_music !== "undefined" ? !!setting_play_music : SETTINGS_DEFAULTS.PLAY_MUSIC,
        AUTO_REFINEMENT: typeof setting_auto_refinement !== "undefined" ? !!setting_auto_refinement : SETTINGS_DEFAULTS.AUTO_REFINEMENT,
        PLAY_SFX: typeof setting_play_sfx !== "undefined" ? !!setting_play_sfx : SETTINGS_DEFAULTS.PLAY_SFX,
        DOUBLECLICK_ATTACK: typeof setting_doubleclick_attack !== "undefined" ? !!setting_doubleclick_attack : SETTINGS_DEFAULTS.DOUBLECLICK_ATTACK,
        MUSIC_VOLUME: sanitizeSettingsVolumeValue(customAudioVolumeState.MUSIC_VOLUME, SETTINGS_DEFAULTS.MUSIC_VOLUME),
        SFX_VOLUME: sanitizeSettingsVolumeValue(customAudioVolumeState.SFX_VOLUME, SETTINGS_DEFAULTS.SFX_VOLUME)
    };
}

function syncSettingsWindowUiIfMounted() {
    try {
        const win = document.getElementById("settingsWindow");
        if (win) {
            applySettingsToUi(win, appliedSettings);
        }
    } catch (_) {}
}

function getSettingsVolumeControlBindings(win) {
    if (!win) return [];
    return [
        {
            checkbox: win.querySelector('input[data-setting-key="PLAY_MUSIC"]'),
            slider: win.querySelector('input[data-setting-slider="MUSIC_VOLUME"]'),
            valueLabel: win.querySelector('[data-volume-value="MUSIC_VOLUME"]'),
            block: win.querySelector('[data-volume-block="MUSIC_VOLUME"]')
        },
        {
            checkbox: win.querySelector('input[data-setting-key="PLAY_SFX"]'),
            slider: win.querySelector('input[data-setting-slider="SFX_VOLUME"]'),
            valueLabel: win.querySelector('[data-volume-value="SFX_VOLUME"]'),
            block: win.querySelector('[data-volume-block="SFX_VOLUME"]')
        }
    ];
}

function syncSettingsVolumeUi(win) {
    getSettingsVolumeControlBindings(win).forEach(binding => {
        if (!binding || !binding.slider) return;
        const currentValue = sanitizeSettingsVolumeValue(binding.slider.value, DEFAULT_CUSTOM_AUDIO_VOLUME);
        binding.slider.value = String(currentValue);
        if (binding.valueLabel) {
            binding.valueLabel.textContent = `${currentValue}%`;
        }
        const enabled = binding.checkbox ? !!binding.checkbox.checked : true;
        binding.slider.disabled = !enabled;
        if (binding.block) {
            binding.block.classList.toggle("disabled", !enabled);
        }
    });
}

function applySettingsState(newState, options = {}) {
    const opts = options && typeof options === "object" ? options : {};
    appliedSettings = {
        ...appliedSettings,
        ...newState
    };
    appliedSettings.MUSIC_VOLUME = sanitizeSettingsVolumeValue(appliedSettings.MUSIC_VOLUME, SETTINGS_DEFAULTS.MUSIC_VOLUME);
    appliedSettings.SFX_VOLUME = sanitizeSettingsVolumeValue(appliedSettings.SFX_VOLUME, SETTINGS_DEFAULTS.SFX_VOLUME);
    backgroundLayersEnabled = !!appliedSettings.SHOW_BACKGROUND;
    const freeCargoVisible = typeof opts.freeCargo === "boolean" ? opts.freeCargo : !!appliedSettings.SHOW_CARGO_BOXES;
    const notFreeCargoVisible = typeof opts.notFreeCargo === "boolean" ? opts.notFreeCargo : !!appliedSettings.SHOW_CARGO_BOXES;
    VISIBILITY_SETTINGS.freeCargo = freeCargoVisible;
    VISIBILITY_SETTINGS.notFreeCargo = notFreeCargoVisible;
    VISIBILITY_SETTINGS.ore = !!appliedSettings.SHOW_RESOURCES;
    VISIBILITY_SETTINGS.bonusBoxes = !!appliedSettings.SHOW_BONUS_BOXES;
    setting_show_drones = !!appliedSettings.SHOW_DRONES;
    setting_show_player_names = !!appliedSettings.SHOW_PLAYER_NAMES;
    setting_play_music = !!appliedSettings.PLAY_MUSIC;
    setting_auto_refinement = !!appliedSettings.AUTO_REFINEMENT;
    setting_play_sfx = !!appliedSettings.PLAY_SFX;
    setting_doubleclick_attack = !!appliedSettings.DOUBLECLICK_ATTACK;
    try {
        if (window.AudioManager && typeof window.AudioManager.setCustomVolumeSettings === "function") {
            window.AudioManager.setCustomVolumeSettings({
                musicVolumePercent: appliedSettings.MUSIC_VOLUME,
                sfxVolumePercent: appliedSettings.SFX_VOLUME
            }, {
                persist: !opts.skipLocalPersist
            });
        } else if (!opts.skipLocalPersist) {
            localStorage.setItem(CUSTOM_AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
                musicVolumePercent: appliedSettings.MUSIC_VOLUME,
                sfxVolumePercent: appliedSettings.SFX_VOLUME
            }));
        }
    } catch (_) {}
    try {
        if (window.AudioManager && typeof window.AudioManager.onSettingsChanged === "function") {
            window.AudioManager.onSettingsChanged();
        }
    } catch (_) {}
    if (!opts.skipNetwork && typeof sendSetting === "function") {
        sendSetting("SHOW_DRONES", appliedSettings.SHOW_DRONES ? 1 : 0);
        sendSetting("DISPLAY_PLAYER_NAMES", appliedSettings.SHOW_PLAYER_NAMES ? 1 : 0);
        sendSetting("PLAY_MUSIC", appliedSettings.PLAY_MUSIC ? 1 : 0);
        sendSetting("PLAY_SFX", appliedSettings.PLAY_SFX ? 1 : 0);
        sendSetting("AUTO_REFINEMENT", appliedSettings.AUTO_REFINEMENT ? 1 : 0);
        sendSetting("DOUBLECLICK_ATTACK", appliedSettings.DOUBLECLICK_ATTACK ? 1 : 0);
        sendSetting("DISPLAY_WINDOW_BACKGROUND", appliedSettings.SHOW_BACKGROUND ? 1 : 0);
    }
    if (!opts.skipUiSync) {
        syncSettingsWindowUiIfMounted();
    }
}

window.__applySettingsStateFromServer = function(newState, options = {}) {
    applySettingsState(newState, {
        ...options,
        skipNetwork: true,
        skipLocalPersist: true
    });
};

function buildFlashSettingsChunkFromState(state) {
    const base = Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK) ? window.__ANDRO_FLASH_SETTINGS_CHUNK.slice() : [ "0", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "0", "0", "1", "1", "1", "1" ];
    while (base.length < 25) {
        base.push("1");
    }
    const setBool = (index, value) => {
        base[index] = value ? "1" : "0";
    };
    setBool(4, !!state.SHOW_PLAYER_NAMES);
    setBool(7, !!state.SHOW_RESOURCES);
    setBool(8, !!state.SHOW_BONUS_BOXES);
    setBool(11, !!state.PLAY_SFX);
    setBool(12, !!state.PLAY_MUSIC);
    setBool(21, !!state.SHOW_CARGO_BOXES);
    setBool(22, !!state.SHOW_CARGO_BOXES);
    window.__ANDRO_FLASH_SETTINGS_CHUNK = base.slice();
    return base;
}

function sendFlashSettingsChunkFromState(state) {
    if (typeof sendRaw !== "function") return false;
    try {
        const chunk = buildFlashSettingsChunkFromState(state);
        sendRaw(`A|SET|${chunk.join("|")}`);
        return true;
    } catch (e) {
        console.warn("[SETTINGS] Failed to send flash SET chunk:", e);
    }
    return false;
}

window.sendFlashSettingsChunkFromState = sendFlashSettingsChunkFromState;

function applySettingsToUi(win, state) {
    const checkboxes = win.querySelectorAll("input[data-setting-key]");
    checkboxes.forEach(cb => {
        const key = cb.getAttribute("data-setting-key");
        cb.checked = !!state[key];
    });
    const sliders = win.querySelectorAll("input[data-setting-slider]");
    sliders.forEach(slider => {
        const key = slider.getAttribute("data-setting-slider");
        const fallback = key === "MUSIC_VOLUME" ? SETTINGS_DEFAULTS.MUSIC_VOLUME : SETTINGS_DEFAULTS.SFX_VOLUME;
        slider.value = String(sanitizeSettingsVolumeValue(state[key], fallback));
    });
    syncSettingsVolumeUi(win);
}

function initSettingsWindow() {
    if (settingsWindowInitialized) return;
    settingsWindowInitialized = true;
    const style = document.createElement("style");
    style.innerHTML = `
        #content_settings #settingsWindow {
            position: relative;
            width: 100%;
            height: 100%;
            background: transparent;
            border: 0;
            box-shadow: none;
            color: #b6d8ff;
            font-family: Tahoma, Arial, sans-serif;
            font-size: 11px;
            display: block;
        }

        #content_settings #settingsWindow .settingsTabs { display: flex; height: 24px; border-bottom: 1px solid #1d2a36; }
        #content_settings #settingsWindow .settingsTabBtn { flex: 1; background: url('graphics/ui/window1/images/w1_bg_tile.png') repeat; color: #cde8ff; border: 1px solid #24374b; border-bottom: none; cursor: pointer; font-family: Tahoma, Arial, sans-serif; font-size: 11px; }
        #content_settings #settingsWindow .settingsTabBtn:hover { border-color: #8da8c2; }
        #content_settings #settingsWindow .settingsTabBtn:active { transform: translateY(1px); }
        #content_settings #settingsWindow .settingsTabBtn.active { color: #fff; border-color: #8da8c2; }

        #content_settings #settingsWindow .settingsBody { position: absolute; top: 24px; bottom: 36px; left: 0; right: 0; padding: 6px 10px; overflow: hidden; }
        #content_settings #settingsWindow .settingsTabPage { display: none; height: 100%; overflow-y: auto; }
        #content_settings #settingsWindow .settingsTabPage.active { display: block; }

        #content_settings #settingsWindow .settingsRow { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
        #content_settings #settingsWindow .settingsRow span { color: #d1ecff; }

        #content_settings #settingsWindow .settingsVolumeBlock {
            margin: 10px 0 0 20px;
            padding: 6px 8px;
            border: 1px solid rgba(57, 84, 110, 0.7);
            background: rgba(5, 11, 20, 0.55);
        }
        #content_settings #settingsWindow .settingsVolumeBlock.disabled {
            opacity: 0.55;
        }
        #content_settings #settingsWindow .settingsVolumeHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 6px;
            color: #d1ecff;
        }
        #content_settings #settingsWindow .settingsVolumeLabel {
            color: #d1ecff;
        }
        #content_settings #settingsWindow .settingsVolumeValue {
            min-width: 42px;
            text-align: right;
            color: #ffffff;
        }
        #content_settings #settingsWindow .settingsVolumeRangeRow {
            display: grid;
            grid-template-columns: 30px 1fr 36px;
            align-items: center;
            gap: 8px;
        }
        #content_settings #settingsWindow .settingsVolumeEdge {
            color: #9bbbd8;
            font-size: 10px;
            text-align: center;
        }
        #content_settings #settingsWindow .settingsVolumeSlider {
            width: 100%;
            height: 16px;
            margin: 0;
            accent-color: #7aa6d8;
            cursor: pointer;
            background: transparent;
        }
        #content_settings #settingsWindow .settingsVolumeSlider:disabled {
            cursor: default;
            opacity: 0.75;
        }

        #content_settings #settingsWindow .settingsFooter { position: absolute; bottom: 6px; left: 0; right: 0; display: flex; justify-content: flex-end; gap: 6px; padding: 0 10px; }
        #content_settings #settingsWindow .settingsFooter .doButton { min-width: 70px; height: 24px; }
    `;
    document.head.appendChild(style);
    const contentHost = document.getElementById("content_settings");
    if (!contentHost) {
        settingsWindowInitialized = false;
        return;
    }
    const win = document.createElement("div");
    win.id = "settingsWindow";
    win.innerHTML = `
        <div class="settingsTabs">
            <button class="settingsTabBtn active" data-tab="interface">Interface</button>
            <button class="settingsTabBtn" data-tab="sound">Sound</button>
        </div>
        <div class="settingsBody">
            <div class="settingsTabPage active" data-tab="interface">
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_BACKGROUND"><span>Show background</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_CARGO_BOXES"><span>Show cargo boxes</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_DRONES"><span>Show drones</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_RESOURCES"><span>Show resources</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_BONUS_BOXES"><span>Show bonus boxes</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="SHOW_PLAYER_NAMES"><span>Show player names</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="AUTO_REFINEMENT"><span>Auto refining</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="DOUBLECLICK_ATTACK"><span>Double-click attack</span></label>
            </div>
            <div class="settingsTabPage" data-tab="sound">
                <label class="settingsRow"><input type="checkbox" data-setting-key="PLAY_MUSIC"><span>Play music</span></label>
                <div class="settingsVolumeBlock" data-volume-block="MUSIC_VOLUME">
                    <div class="settingsVolumeHeader">
                        <span class="settingsVolumeLabel">Music volume</span>
                        <span class="settingsVolumeValue" data-volume-value="MUSIC_VOLUME">100%</span>
                    </div>
                    <div class="settingsVolumeRangeRow">
                        <span class="settingsVolumeEdge">0%</span>
                        <input class="settingsVolumeSlider" type="range" min="0" max="100" step="1" value="100" data-setting-slider="MUSIC_VOLUME">
                        <span class="settingsVolumeEdge">100%</span>
                    </div>
                </div>
                <label class="settingsRow"><input type="checkbox" data-setting-key="PLAY_SFX"><span>Play sound effects</span></label>
                <div class="settingsVolumeBlock" data-volume-block="SFX_VOLUME">
                    <div class="settingsVolumeHeader">
                        <span class="settingsVolumeLabel">Sound effects volume</span>
                        <span class="settingsVolumeValue" data-volume-value="SFX_VOLUME">100%</span>
                    </div>
                    <div class="settingsVolumeRangeRow">
                        <span class="settingsVolumeEdge">0%</span>
                        <input class="settingsVolumeSlider" type="range" min="0" max="100" step="1" value="100" data-setting-slider="SFX_VOLUME">
                        <span class="settingsVolumeEdge">100%</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="settingsFooter">
            <button class="doButton" id="settingsBtnSave">Save</button>
            <button class="doButton" id="settingsBtnCancel">Cancel</button>
            <button class="doButton" id="settingsBtnReset">Reset</button>
        </div>
    `;
    contentHost.innerHTML = "";
    contentHost.appendChild(win);
    const tabButtons = Array.from(win.querySelectorAll(".settingsTabBtn"));
    const tabPages = Array.from(win.querySelectorAll(".settingsTabPage"));
    const saveBtn = document.getElementById("settingsBtnSave");
    const cancelBtn = document.getElementById("settingsBtnCancel");
    const resetBtn = document.getElementById("settingsBtnReset");
    const setActiveTab = tab => {
        tabButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
        tabPages.forEach(page => page.classList.toggle("active", page.dataset.tab === tab));
    };
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });
    const getUiState = () => {
        const state = {
            ...SETTINGS_DEFAULTS
        };
        win.querySelectorAll("input[data-setting-key]").forEach(cb => {
            state[cb.getAttribute("data-setting-key")] = cb.checked;
        });
        win.querySelectorAll("input[data-setting-slider]").forEach(slider => {
            const key = slider.getAttribute("data-setting-slider");
            const fallback = key === "MUSIC_VOLUME" ? SETTINGS_DEFAULTS.MUSIC_VOLUME : SETTINGS_DEFAULTS.SFX_VOLUME;
            state[key] = sanitizeSettingsVolumeValue(slider.value, fallback);
        });
        return state;
    };
    const closeWindow = () => {
        settingsWindowVisible = false;
        if (typeof toggleWindow === "function") {
            toggleWindow("settings", false);
        } else {
            if (typeof windowStates !== "undefined") {
                windowStates.settings = false;
            }
            if (typeof refreshWindowsVisibility === "function") {
                refreshWindowsVisibility();
            }
        }
    };
    win.querySelectorAll('input[data-setting-key="PLAY_MUSIC"], input[data-setting-key="PLAY_SFX"]').forEach(cb => {
        cb.addEventListener("change", () => syncSettingsVolumeUi(win));
    });
    win.querySelectorAll("input[data-setting-slider]").forEach(slider => {
        const refreshSliderUi = () => syncSettingsVolumeUi(win);
        slider.addEventListener("input", refreshSliderUi);
        slider.addEventListener("change", refreshSliderUi);
    });
    cancelBtn.addEventListener("click", () => {
        applySettingsToUi(win, appliedSettings);
        closeWindow();
    });
    saveBtn.addEventListener("click", () => {
        const nextState = getUiState();
        applySettingsState(nextState);
        if (typeof window.sendFlashSettingsChunkFromState === "function") {
            window.sendFlashSettingsChunkFromState(nextState);
        }
        closeWindow();
    });
    resetBtn.addEventListener("click", () => {
        applySettingsState(SETTINGS_DEFAULTS);
        if (typeof window.sendFlashSettingsChunkFromState === "function") {
            window.sendFlashSettingsChunkFromState(appliedSettings);
        }
        if (typeof window.resetAndromedaWindowPositions === "function") {
            window.resetAndromedaWindowPositions({ syncServer: true });
        }
        applySettingsToUi(win, appliedSettings);
    });
    applySettingsToUi(win, appliedSettings);
}

function toggleSettingsWindow() {
    if (!settingsWindowInitialized) {
        appliedSettings = getCurrentSettingsSnapshot();
        initSettingsWindow();
    }
    const w = document.getElementById("settingsWindow");
    if (!w) return;
    const currentlyOpen = typeof windowStates !== "undefined" ? !!windowStates.settings : !!settingsWindowVisible;
    if (currentlyOpen) {
        settingsWindowVisible = false;
        if (typeof toggleWindow === "function") {
            toggleWindow("settings", false);
        } else {
            if (typeof windowStates !== "undefined") {
                windowStates.settings = false;
            }
            if (typeof refreshWindowsVisibility === "function") {
                refreshWindowsVisibility();
            }
        }
        return;
    }
    appliedSettings = getCurrentSettingsSnapshot();
    applySettingsToUi(w, appliedSettings);
    settingsWindowVisible = true;
    if (typeof toggleWindow === "function") {
        toggleWindow("settings", true);
    } else {
        if (typeof windowStates !== "undefined") {
            windowStates.settings = true;
        }
        if (typeof refreshWindowsVisibility === "function") {
            refreshWindowsVisibility();
        }
    }
    if (typeof bringWindowToFront === "function") {
        const winShell = document.getElementById("win_settings");
        bringWindowToFront(winShell || "settings");
    }
}

window.toggleSettingsWindow = toggleSettingsWindow;

function initSpaceballHUD() {}

function initGameLogWindow() {
    const tryInit = () => {
        const winEl = document.getElementById("win_log");
        const contentEl = document.getElementById("content_log");
        if (!winEl || !contentEl) return false;
        if (contentEl.dataset.logInit === "1") return true;
        contentEl.dataset.logInit = "1";
        contentEl.innerHTML = `\n            <div id="logContent" class="logContent"></div>\n        `;
        return true;
    };
    if (!tryInit()) {
        const interval = setInterval(() => {
            if (tryInit()) clearInterval(interval);
        }, 200);
    }
}

const GAME_LOG_DOM_LINE_LIMIT = 200;

function trimGameLogDomContainer(container, limit = GAME_LOG_DOM_LINE_LIMIT) {
    if (!container || !container.children) return;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : GAME_LOG_DOM_LINE_LIMIT;
    while (container.children.length > safeLimit) {
        container.removeChild(container.firstChild);
    }
}

function addLogEntry(text) {
    const container = document.getElementById("logContent");
    const telemetry = window.__flashParityTelemetry = window.__flashParityTelemetry || {};
    telemetry.logOpcodeCount = telemetry.logOpcodeCount || 0;
    telemetry.logLines = telemetry.logLines || 0;
    telemetry.lastLogLine = "";
    telemetry.logLines += 1;
    telemetry.lastLogLine = String(text || "");
    if (!container) return;
    const now = new Date;
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const div = document.createElement("div");
    div.className = "logEntry";
    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.textContent = `[${timeStr}]`;
    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.textContent = String(text == null ? "" : text);
    div.appendChild(timeSpan);
    div.appendChild(document.createTextNode(" "));
    div.appendChild(textSpan);
    container.appendChild(div);
    trimGameLogDomContainer(container);
    container.scrollTop = container.scrollHeight;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[FLASH_PARITY] log-render", {
            lines: telemetry.logLines,
            gameOpcodeCount: telemetry.logOpcodeCount,
            lastGameOpcode: telemetry.lastGameOpcode || null,
            hasContainer: true
        });
    }
}

function updateSpaceballHUD(mmo, eic, vru, speed, owner) {
    if (typeof updateSpaceballScoreboard === "function") {
        updateSpaceballScoreboard(mmo, eic, vru, speed, owner);
    }
}

function getHudLogicalSizeForMenuAction() {
    const width = typeof clientResolution === "object" && clientResolution && Number(clientResolution.width) > 0 ? Number(clientResolution.width) : (typeof LOGICAL_WIDTH === "number" ? LOGICAL_WIDTH : 1920);
    const height = typeof clientResolution === "object" && clientResolution && Number(clientResolution.height) > 0 ? Number(clientResolution.height) : (typeof LOGICAL_HEIGHT === "number" ? LOGICAL_HEIGHT : 1080);
    return { width, height };
}

function getActionDrawerRenderedSize(drawer) {
    if (!drawer) return { width: 0, height: 0 };
    const style = typeof getComputedStyle === "function" ? getComputedStyle(drawer) : null;
    const width = drawer.offsetWidth || drawer.scrollWidth || (style ? parseFloat(style.width) : 0) || 0;
    const height = drawer.offsetHeight || drawer.scrollHeight || (style ? parseFloat(style.height) : 0) || 0;
    return { width, height };
}

function getActionDrawerDefaultPosition(drawer) {
    const screen = getHudLogicalSizeForMenuAction();
    const size = getActionDrawerRenderedSize(drawer);
    const x = Math.max(0, Math.round((screen.width - size.width) / 2));
    const y = Math.max(0, Math.min(450, screen.height - Math.max(20, size.height)));
    return { x, y };
}

function isActionDrawerPositionValid(drawer, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const screen = getHudLogicalSizeForMenuAction();
    const size = getActionDrawerRenderedSize(drawer);
    const width = Math.max(1, size.width);
    const height = Math.max(20, size.height);
    return x >= 0 && y >= 0 && x + width <= screen.width && y + height <= screen.height;
}

function applyActionDrawerPosition(drawer, position) {
    drawer.style.left = position.x + "px";
    drawer.style.top = position.y + "px";
    drawer.style.transform = "none";
}

function resolveActionDrawerPosition(drawer, position, lastValidPosition = null) {
    const requested = {
        x: Number(position ? position.x : NaN),
        y: Number(position ? position.y : NaN)
    };
    if (isActionDrawerPositionValid(drawer, requested.x, requested.y)) {
        return { x: requested.x, y: requested.y };
    }
    if (lastValidPosition) {
        const lastValid = {
            x: Number(lastValidPosition ? lastValidPosition.x : NaN),
            y: Number(lastValidPosition ? lastValidPosition.y : NaN)
        };
        if (isActionDrawerPositionValid(drawer, lastValid.x, lastValid.y)) {
            return lastValid;
        }
    }
    return getActionDrawerDefaultPosition(drawer);
}

window.checkActionDrawerPosition = function(drawer, lastValidPosition = null) {
    if (!drawer) return true;
    const current = window.getHudElementPos ? window.getHudElementPos(drawer) : {
        x: drawer.offsetLeft,
        y: drawer.offsetTop
    };
    const resolved = resolveActionDrawerPosition(drawer, current, lastValidPosition);
    const valid = isActionDrawerPositionValid(drawer, Number(current.x), Number(current.y));
    if (!valid) {
        applyActionDrawerPosition(drawer, resolved);
    }
    return valid;
};

function saveInterfaceLayout() {
    const drawer = document.getElementById("actionDrawerContainer");
    let drawerMode = 0;
    if (drawer) {
        if (drawer.classList.contains("grid")) drawerMode = 1; else if (drawer.classList.contains("vertical")) drawerMode = 2;
    }
    const drawerPos = drawer ? window.getHudElementPos ? window.getHudElementPos(drawer) : {
        x: drawer.offsetLeft,
        y: drawer.offsetTop
    } : null;
    const layoutData = {
        qb: {
            x: quickbarPosition.x,
            y: quickbarPosition.y,
            mode: quickbarLayoutMode,
            locked: quickbarLocked,
            minimized: quickbarMinimized
        },
        mm: {
            open: !!windowStates.map,
            scale: minimapScaleFactor
        },
        ad: {
            x: drawerPos ? drawerPos.x : (typeof LOGICAL_WIDTH === "number" ? LOGICAL_WIDTH : 1920) / 2 - 300,
            y: drawerPos ? drawerPos.y : 450,
            mode: drawerMode,
            cat: actionDrawerCategory
        }
    };
    localStorage.setItem("andromeda_layout_v1", JSON.stringify(layoutData));
}

function loadInterfaceLayout() {
    const raw = localStorage.getItem("andromeda_layout_v1");
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        if (data.qb) {
            quickbarPosition.x = data.qb.x;
            quickbarPosition.y = data.qb.y;
            quickbarLayoutMode = data.qb.mode || 0;
            quickbarVertical = quickbarLayoutMode === 1;
            quickbarLocked = data.qb.locked;
            quickbarMinimized = !!data.qb.minimized;
            quickbarInitialized = true;
        }
        if (data.mm) {
            if (typeof data.mm.open === "boolean") {
                windowStates.map = data.mm.open;
                window.showMinimap = data.mm.open;
            }
            if (data.mm.scale) {
                setMinimapScale(data.mm.scale, {
                    forceSend: false
                });
            }
        }
        const drawer = document.getElementById("actionDrawerContainer");
        if (data.ad && drawer) {
            const position = resolveActionDrawerPosition(drawer, {
                x: data.ad.x,
                y: data.ad.y
            });
            applyActionDrawerPosition(drawer, position);
            if (data.ad.cat) {
                actionDrawerCategory = typeof normalizeActionDrawerCategory === "function" ? normalizeActionDrawerCategory(data.ad.cat) : data.ad.cat;
            }
            if (typeof flashActionMenuPoolScrollIndex !== "undefined") {
                flashActionMenuPoolScrollIndex = 0;
            }
            if (typeof flashBuildActionDrawerTabs === "function") {
                flashBuildActionDrawerTabs();
            }
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
        }
    } catch (e) {
        console.error("Layout loading error:", e);
    }
    if (typeof window.flashLoadWindowPersistenceFromLocalStorage === "function") {
        window.flashLoadWindowPersistenceFromLocalStorage();
    }
}

let groupWindowEl = null;

let groupContentRootEl = null;

let groupListEl = null;

let groupInvitesEl = null;

let groupInviteControlsEl = null;

let groupSessionControlsEl = null;

let groupBlockInvitesBtnEl = null;

let groupLastStateSignature = null;

let selectedGroupMemberId = null;

let groupPromoteBtnEl = null;

let groupKickBtnEl = null;

let groupLeaveBtnEl = null;

let groupActionMode = null;

let groupFollowBtnEl = null;

let groupPingBtnEl = null;

let groupInvitationBehaviorBtnEl = null;

let groupStylesInjected = false;


const groupRowCache = new Map;

const groupMapLabels = {
    1: "1-1",
    2: "1-2",
    3: "1-3",
    4: "1-4",
    5: "2-1",
    6: "2-2",
    7: "2-3",
    8: "2-4",
    9: "3-1",
    10: "3-2",
    11: "3-3",
    12: "3-4",
    13: "4-1",
    14: "4-2",
    15: "4-3",
    16: "4-4",
    17: "1-5",
    18: "1-6",
    19: "1-7",
    20: "1-8",
    21: "2-5",
    22: "2-6",
    23: "2-7",
    24: "2-8",
    25: "3-5",
    26: "3-6",
    27: "3-7",
    28: "3-8",
    29: "4-5",
    42: "???",
    50: "GG",
    51: "GG α",
    52: "GG β",
    53: "GG ɣ",
    54: "GG NC",
    55: "GG δ",
    56: "GG Orb",
    57: "GG Y4",
    61: "MMO Invasion",
    62: "EIC Invasion",
    63: "VRU Invasion",
    64: "MMO Invasion",
    65: "EIC Invasion",
    66: "VRU Invasion",
    67: "MMO Invasion",
    68: "EIC Invasion",
    69: "VRU Invasion",
    80: "Surv",
    81: "Inva",
    82: "TDM II",
    91: "5-1",
    92: "5-2",
    93: "5-3",
    101: "JP Final",
    102: "JP 1",
    103: "JP 2",
    104: "JP 3",
    105: "JP 4",
    106: "JP 5",
    107: "JP 6",
    108: "JP 7",
    109: "JP 8",
    110: "JP 9",
    111: "JP 10",
    112: "JP 11",
    113: "JP 12",
    114: "JP 13",
    115: "JP 14",
    116: "JP 15",
    117: "JP 16",
    118: "JP 17",
    119: "JP 18",
    120: "JP 19",
    121: "JP 20",
    122: "JP 21",
    123: "JP 22",
    124: "JP 23",
    125: "JP 24",
    126: "JP 25",
    200: "LoW",
    255: "0-1",
    915: "MilkyWay BETA",
    916: "PVP"
};

function normalizeGroupMapId(mapId) {
    const value = parseInt(mapId, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function getCurrentGroupHeroMapId() {
    const activeMapId = normalizeGroupMapId(typeof currentMapId !== "undefined" ? currentMapId : null);
    if (activeMapId !== null) return activeMapId;
    return normalizeGroupMapId(typeof cfg !== "undefined" && cfg ? cfg.mapID : null);
}

function getFlashGroupMapLabel(mapId) {
    const id = normalizeGroupMapId(mapId);
    if (id === null) return "";
    if (Object.prototype.hasOwnProperty.call(groupMapLabels, id)) return groupMapLabels[id];
    return String(id);
}

function isGroupMemberOnCurrentMap(member) {
    if (!member) return false;
    const memberMapId = normalizeGroupMapId(member.mapId);
    const activeMapId = getCurrentGroupHeroMapId();
    return memberMapId !== null && activeMapId !== null && memberMapId === activeMapId;
}

function ensureGroupWindowStyles() {
    if (groupStylesInjected) return;
    groupStylesInjected = true;
    const style = document.createElement("style");
    style.id = "flash-group-window-style";
    const emptyBarCss = typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/ui/images/empty_bar.png.png") : 'url("graphics/ui/ui/images/empty_bar.png.png")';
    const hpBarCss = typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/ui/images/hp_bar.png.png") : 'url("graphics/ui/ui/images/hp_bar.png.png")';
    const shieldBarCss = typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/ui/images/shield_bar.png.png") : 'url("graphics/ui/ui/images/shield_bar.png.png")';
    style.textContent = `\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent {\n                padding: 0;\n                overflow: hidden;\n                box-sizing: border-box;\n                display: flex;\n                flex-direction: column;\n                align-items: flex-start;\n                gap: 0;\n            }\n            .gameWindow.flashWindow[data-window-key="group"].groupNoGroup .gwContent { padding: 4px 6px 6px 4px; }\n            .gameWindow.flashWindow[data-window-key="group"].groupInGroup .gwContent { padding: 0 6px 4px 4px; }\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupInviteControls,\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupSessionControls,\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupList,\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupInvites {\n                flex: 0 0 auto !important;\n                position: relative;\n                z-index: 1;\n            }\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupInviteControls {\n                width: 186px !important;\n                height: 28px !important;\n                min-height: 28px !important;\n            }\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupSessionControls {\n                width: 186px !important;\n                height: 27px !important;\n                min-height: 27px !important;\n            }\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupList,\n            .gameWindow.flashWindow[data-window-key="group"] .gwContent > .groupInvites {\n                width: 186px !important;\n                height: auto !important;\n            }\n            .groupControls { position: relative; width: 186px; margin: 0; padding: 0; }\n            .groupInviteControls { height: 28px; }\n            .groupInviteControls #groupInputName {\n                position: absolute;\n                left: 0;\n                top: 4px;\n                width: 128px;\n                height: 18px;\n                padding: 0;\n                box-sizing: border-box;\n                border: 1px solid #888888;\n                background: transparent;\n                color: #888888;\n                font-family: sans-serif;\n                font-size: 12px;\n                line-height: 18px;\n            }\n            .groupInviteControls .groupIconBtn { position: absolute; top: 0; }\n            .groupInviteControls .groupIconBtn.groupInviteBtn { left: 132px; }\n            .groupInviteControls .groupIconBtn.groupBlockInvitesBtn { left: 161px; }\n            .groupIconBtn {\n                width: 25px;\n                height: 27px;\n                border: 0;\n                padding: 0;\n                background-color: transparent;\n                background-repeat: no-repeat;\n                background-position: 0 0;\n                background-size: 25px 27px;\n                cursor: pointer;\n                appearance: none;\n                -webkit-appearance: none;\n            }\n            .groupIconBtn:disabled { opacity: 1; cursor: default; }\n            .groupSessionControls { display: flex; align-items: flex-start; gap: 5px; width: 186px; height: 27px; margin: 0; padding: 0; }\n            .groupList { display: block; width: 186px; margin: 0; padding: 0; overflow: hidden; }\n            .groupRow { position: relative; width: 186px; height: 48px; margin: 0; padding: 0; overflow: hidden; }\n            .groupName { position: absolute; left: 24px; top: 0; width: 160px; height: 20px; color: #ffffff; font-family: sans-serif; font-size: 14px; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: clip; z-index: 1; }\n            .groupMap { position: absolute; left: 0; top: 4px; width: 24px; height: 16px; color: #999999; font-family: sans-serif; font-size: 10px; line-height: 16px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: clip; z-index: 1; }
            .groupRow.groupRemote .groupName { color: #999999; }
            .groupRow.groupRemote .groupShipIcon { opacity: 0.55; }
            .groupRow.groupRemote .groupTargetIcon { opacity: 0.55; }\n            .groupBarsWrap { position: absolute; left: 4px; top: 22px; width: 82px; height: 18px; z-index: 1; }\n            .groupBarsWrap .groupShipIcon { position: absolute; left: 0; top: 0; }\n            .groupBarsCol { position: absolute; left: 20px; top: 2px; width: 62px; height: 15px; }\n            .groupBar { position: absolute; left: 0; width: 62px; height: 7px; overflow: hidden; background: ${emptyBarCss} no-repeat 0 0 / 62px 7px; }\n            .groupBar.hp { top: 0; }\n            .groupBar.sh { top: 8px; }\n            .groupBar::after { content: ""; position: absolute; left: 0; top: 0; width: var(--fillpx, 0px); height: 7px; background-repeat: no-repeat; background-size: 62px 7px; }\n            .groupBar.hp::after { background-image: ${hpBarCss}; }\n            .groupBar.sh::after { background-image: ${shieldBarCss}; }\n            .groupTargetIcon { position: absolute; left: 92px; top: 22px; width: 18px; height: 18px; background-repeat: no-repeat; background-position: center; background-size: contain; z-index: 1; }\n            .groupTargetShipIcon { position: absolute; left: 0; top: 0; width: 18px; height: 18px; background-repeat: no-repeat; background-position: center; background-size: contain; pointer-events: none; }\n            .groupLeadIcon { position: absolute; left: 114px; top: 24px; width: 23px; height: 15px; background-repeat: no-repeat; background-position: center; background-size: contain; z-index: 1; }\n            .groupRow::before { content: ""; position: absolute; left: 0; top: 0; width: 186px; height: 40px; background: rgba(255, 215, 0, 0.5333333333); opacity: 0; transition: opacity 0.5s linear; pointer-events: none; z-index: 0; }\n            .gameWindow.flashWindow[data-window-key="group"].pingMode .groupRow:hover::before,\n            .gameWindow.flashWindow[data-window-key="group"].followMode .groupRow:hover::before,\n            .gameWindow.flashWindow[data-window-key="group"].promoteMode .groupRow:hover::before,\n            .gameWindow.flashWindow[data-window-key="group"].kickMode .groupRow:hover::before { opacity: 1; }\n            .gameWindow.flashWindow[data-window-key="group"].pingMode .groupRow,\n            .gameWindow.flashWindow[data-window-key="group"].followMode .groupRow,\n            .gameWindow.flashWindow[data-window-key="group"].promoteMode .groupRow,\n            .gameWindow.flashWindow[data-window-key="group"].kickMode .groupRow { cursor: pointer; }\n            .groupInvites { display: block; overflow: hidden; width: 186px; margin: 0; padding: 0; z-index: 1; }\n            .gameWindow.flashWindow[data-window-key="group"].groupNoGroup .groupInvites:not(.hidden) { margin-top: 4px; }\n            .groupInviteRow { position: relative; height: 28px; width: 186px; padding: 0; }\n            .groupInviteName { position: absolute; left: 24px; top: 6px; width: 104px; height: 20px; overflow: hidden; white-space: nowrap; text-overflow: clip; color: #ffffff; font-family: sans-serif; font-size: 14px; line-height: 20px; }\n            .groupInviteBtns { position: absolute; left: 132px; top: 0; display: flex; align-items: flex-start; gap: 4px; }\n            .groupShipIcon { width: 18px; height: 18px; background-repeat: no-repeat; background-position: center; background-size: contain; }\n            .groupInviteRow .groupShipIcon { position: absolute; left: 0; top: 8px; }\n            .hidden { display: none !important; }\n        `;
    document.head.appendChild(style);
}

function getFlashGroupLocaleText(key) {
    if (!key || typeof __flashLocaleGetText !== "function") return "";
    return String(__flashLocaleGetText(key) || "");
}

function formatFlashGroupInteger(value) {
    if (typeof __fmtInt === "function") return __fmtInt(value);
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n)) : "0";
}

function replaceFlashGroupPlaceholders(text, replacements) {
    let resolved = String(text || "");
    Object.keys(replacements || {}).forEach(key => {
        resolved = resolved.replace(new RegExp(key, "g"), String(replacements[key]));
    });
    return resolved;
}

function bindGroupTooltip(element, resolver) {
    if (!element) return;
    element.__groupTooltipResolver = typeof resolver === "function" ? resolver : () => String(resolver || "");
    if (element.__groupTooltipBound) return;
    element.__groupTooltipBound = true;
    const resolveText = () => {
        try {
            return String(element.__groupTooltipResolver ? element.__groupTooltipResolver() || "" : "");
        } catch (_) {
            return "";
        }
    };
    const show = event => {
        const text = resolveText();
        if (!text || typeof __showFlashInfoTooltip !== "function") return;
        __showFlashInfoTooltip(text, event.clientX, event.clientY);
    };
    const hide = () => {
        if (typeof __hideFlashInfoTooltip === "function") __hideFlashInfoTooltip();
    };
    element.addEventListener("mouseenter", show);
    element.addEventListener("mousemove", show);
    element.addEventListener("mouseleave", hide);
    element.addEventListener("blur", hide);
    element.addEventListener("mousedown", hide);
}

function syncGroupWindowSectionOrder(inGroup) {
    if (!groupContentRootEl) return;
    const orderedSections = (inGroup ? [ groupListEl, groupInvitesEl, groupInviteControlsEl, groupSessionControlsEl ] : [ groupInviteControlsEl, groupInvitesEl, groupListEl, groupSessionControlsEl ]).filter(section => section && section.parentElement === groupContentRootEl);
    if (!orderedSections.length) return;
    const currentChildren = Array.from(groupContentRootEl.children).filter(section => orderedSections.includes(section));
    const alreadyOrdered = currentChildren.length === orderedSections.length && currentChildren.every((section, index) => section === orderedSections[index]);
    if (alreadyOrdered) return;
    const activeEl = document.activeElement;
    const shouldRestoreFocus = !!(activeEl && groupContentRootEl.contains(activeEl) && typeof activeEl.focus === "function");
    const selectionStart = shouldRestoreFocus && typeof activeEl.selectionStart === "number" ? activeEl.selectionStart : null;
    const selectionEnd = shouldRestoreFocus && typeof activeEl.selectionEnd === "number" ? activeEl.selectionEnd : null;
    orderedSections.forEach(section => {
        groupContentRootEl.appendChild(section);
    });
    if (shouldRestoreFocus) {
        try {
            activeEl.focus({
                preventScroll: true
            });
        } catch (_) {
            try {
                activeEl.focus();
            } catch (_) {}
        }
        if (selectionStart !== null && selectionEnd !== null && typeof activeEl.setSelectionRange === "function") {
            try {
                activeEl.setSelectionRange(selectionStart, selectionEnd);
            } catch (_) {}
        }
    }
}

function syncGroupSessionButtonOrder() {
    if (!groupSessionControlsEl) return;
    const orderedButtons = (isHeroGroupLeader() ? [ groupFollowBtnEl, groupPingBtnEl, groupKickBtnEl, groupLeaveBtnEl, groupPromoteBtnEl, groupInvitationBehaviorBtnEl ] : [ groupPingBtnEl, groupLeaveBtnEl, groupFollowBtnEl, groupKickBtnEl, groupPromoteBtnEl, groupInvitationBehaviorBtnEl ]).filter(button => button && button.parentElement === groupSessionControlsEl);
    if (!orderedButtons.length) return;
    const currentButtons = Array.from(groupSessionControlsEl.children).filter(button => orderedButtons.includes(button));
    const alreadyOrdered = currentButtons.length === orderedButtons.length && currentButtons.every((button, index) => button === orderedButtons[index]);
    if (alreadyOrdered) return;
    orderedButtons.forEach(button => {
        groupSessionControlsEl.appendChild(button);
    });
}

function isHeroGroupLeader() {
    const myId = parseInt(heroId, 10);
    return !isNaN(myId) && groupLeaderId === myId;
}

function updateGroupBlockInvitesButton() {
    if (!groupBlockInvitesBtnEl) return;
    const blocked = !!groupInvitesBlocked;
    const std = blocked ? "graphics/ui/ui/images/133_btn_blockinv_std.png.png" : "graphics/ui/ui/images/136_btn_allowinv_std.png.png";
    const mo = blocked ? "graphics/ui/ui/images/134_btn_blockinv_mo.png.png" : "graphics/ui/ui/images/137_btn_allowinv_mo.png.png";
    const da = blocked ? "graphics/ui/ui/images/135_btn_blockinv_da.png.png" : "graphics/ui/ui/images/138_btn_allowinv_da.png.png";
    wireAssetStateButton(groupBlockInvitesBtnEl, {
        normal: std,
        hover: mo,
        pressed: mo,
        disabled: da
    });
    bindGroupTooltip(groupBlockInvitesBtnEl, () => getFlashGroupLocaleText(blocked ? "label_grp_allow_invitations" : "label_grp_block_invitations"));
}

function updateGroupInvitationBehaviorButton() {
    if (!groupInvitationBehaviorBtnEl) return;
    const freeForAll = parseInt(groupInvitationBehavior, 10) === 1;
    const std = freeForAll ? "graphics/ui/ui/images/124_btn_inv_group_std.png.png" : "graphics/ui/ui/images/127_btn_inv_boss_std.png.png";
    const mo = freeForAll ? "graphics/ui/ui/images/125_btn_inv_group_mo.png.png" : "graphics/ui/ui/images/128_btn_inv_boss_mo.png.png";
    const da = freeForAll ? "graphics/ui/ui/images/126_btn_inv_group_da.png.png" : "graphics/ui/ui/images/129_btn_inv_boss_da.png.png";
    wireAssetStateButton(groupInvitationBehaviorBtnEl, {
        normal: std,
        hover: mo,
        pressed: mo,
        disabled: da
    });
    bindGroupTooltip(groupInvitationBehaviorBtnEl, () => {
        const base = getFlashGroupLocaleText("label_grp_change_invitation_behavior");
        const detail = getFlashGroupLocaleText(freeForAll ? "label_grp_invitation_behavior_free_for_all" : "label_grp_invitation_behavior_boss_only");
        if (base && detail) return `${base}\n${detail}`;
        return base || detail || "";
    });
}

function sendGroupFollow(targetId) {
    const myId = parseInt(heroId, 10);
    if (!targetId || targetId === myId) return;
    sendRaw(`ps|flw|${targetId}`);
}

function sendGroupChangeLeader(targetId) {
    const myId = parseInt(heroId, 10);
    if (!targetId || targetId === myId) return;
    sendRaw(`ps|lc|${targetId}`);
}

function sendGroupKick(targetId) {
    const myId = parseInt(heroId, 10);
    if (!targetId || targetId === myId) return;
    sendRaw(`ps|kick|${targetId}`);
}

function sendGroupPingUser(targetId) {
    if (!targetId) return;
    sendRaw(`ps|png|usr|${targetId}`);
}

function updateGroupModeButtonVisuals() {
    const setAlpha = (btn, active) => {
        if (!btn) return;
        btn.style.opacity = active ? "1" : "0.5";
    };
    setAlpha(groupPingBtnEl, groupActionMode === "ping");
    setAlpha(groupFollowBtnEl, groupActionMode === "follow");
    setAlpha(groupPromoteBtnEl, groupActionMode === "promote");
    setAlpha(groupKickBtnEl, groupActionMode === "kick");
}

function updateGroupLeaderButtons() {
    if (!groupPromoteBtnEl || !groupKickBtnEl || !groupInvitationBehaviorBtnEl) return;
    const leader = isHeroGroupLeader();
    groupPromoteBtnEl.classList.toggle("hidden", !leader);
    groupKickBtnEl.classList.toggle("hidden", !leader);
    groupInvitationBehaviorBtnEl.classList.toggle("hidden", !leader);
    groupPromoteBtnEl.disabled = false;
    groupKickBtnEl.disabled = false;
    groupInvitationBehaviorBtnEl.disabled = false;
    updateGroupInvitationBehaviorButton();
    syncGroupSessionButtonOrder();
    if (!leader && (groupActionMode === "promote" || groupActionMode === "kick")) {
        clearGroupActionMode();
    }
}

function setGroupActionMode(mode) {
    groupActionMode = mode;
    try {
        groupPingMode = mode === "ping";
    } catch (_) {}
    if (groupWindowEl) {
        groupWindowEl.classList.toggle("pingMode", mode === "ping");
        groupWindowEl.classList.toggle("followMode", mode === "follow");
        groupWindowEl.classList.toggle("promoteMode", mode === "promote");
        groupWindowEl.classList.toggle("kickMode", mode === "kick");
    }
    if (groupPingBtnEl) groupPingBtnEl.classList.toggle("active", mode === "ping");
    if (groupFollowBtnEl) groupFollowBtnEl.classList.toggle("active", mode === "follow");
    if (groupPromoteBtnEl) groupPromoteBtnEl.classList.toggle("active", mode === "promote");
    if (groupKickBtnEl) groupKickBtnEl.classList.toggle("active", mode === "kick");
    updateGroupModeButtonVisuals();
}

function clearGroupActionMode() {
    setGroupActionMode(null);
}

if (typeof window !== "undefined") {
    window.__flashGroupSetActionMode = setGroupActionMode;
    window.__flashGroupClearActionMode = clearGroupActionMode;
}

function updateGroupWindowNoGroupDimension(inGroup) {
    if (!groupWindowEl) return;
    syncGroupWindowSectionOrder(inGroup);
    const inviteRows = Object.keys(groupIncomingInvites).length + Object.keys(groupOutgoingInvites).length;
    const inviteControlsVisible = !!(groupInviteControlsEl && !groupInviteControlsEl.classList.contains("hidden"));
    const sessionControlsVisible = !!(groupSessionControlsEl && !groupSessionControlsEl.classList.contains("hidden"));
    let flashWindowHeight = 0;
    if (inGroup) {
        const memberRows = Object.keys(groupMembers).length;
        const memberSectionHeight = memberRows * 48;
        const inviteSectionHeight = inviteRows * 28;
        const inviteControlsHeight = inviteControlsVisible ? 28 : 0;
        const sessionControlsHeight = sessionControlsVisible ? 27 : 0;
        const bodyHeight = memberSectionHeight + inviteSectionHeight + inviteControlsHeight + sessionControlsHeight + 4;
        flashWindowHeight = bodyHeight + 24;
    } else {
        const topInset = inviteControlsVisible ? 4 : 0;
        const topStripHeight = inviteControlsVisible ? 28 : 0;
        const inviteSectionHeight = inviteRows > 0 ? 4 + inviteRows * 28 : 0;
        const bottomInset = 6;
        const bodyHeight = topInset + topStripHeight + inviteSectionHeight + bottomInset;
        flashWindowHeight = bodyHeight + 24;
    }
    groupWindowEl.style.width = "196px";
    groupWindowEl.style.height = `${flashWindowHeight}px`;
    groupWindowEl.dataset.baseW = "196";
    groupWindowEl.dataset.baseH = String(flashWindowHeight);
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}

function renderGroupList() {
    if (!groupListEl) return;
    updateGroupBlockInvitesButton();
    const memberIds = Object.keys(groupMembers);
    const inGroup = !!groupInGroupServerState && memberIds.length > 0;
    const hasServerState = !!window.__flashGroupServerStateSeen;
    if (window.FLASH_PARITY_DEBUG && typeof window.flashParityDebugLog === "function") {
        const signature = `${hasServerState ? 1 : 0}|${inGroup ? 1 : 0}|${memberIds.length}|${groupLeaderId == null ? "null" : groupLeaderId}`;
        if (signature !== groupLastStateSignature) {
            groupLastStateSignature = signature;
            window.flashParityDebugLog("group-state", {
                hasServerState: hasServerState,
                inGroup: inGroup,
                memberCount: memberIds.length,
                leaderId: groupLeaderId
            });
        }
    }
    if (!isHeroGroupLeader()) selectedGroupMemberId = null;
    if (selectedGroupMemberId !== null && !groupMembers[selectedGroupMemberId]) selectedGroupMemberId = null;
    updateGroupLeaderButtons();
    const toggleSection = (el, hidden) => {
        if (!el) return;
        el.classList.toggle("hidden", hidden);
    };
    const effectiveMemberCount = inGroup ? memberIds.length + 1 : 0;
    const inviteSlotCount = Object.keys(groupIncomingInvites).length + Object.keys(groupOutgoingInvites).length + effectiveMemberCount;
    const canInvite = inviteSlotCount < 5 && (!inGroup || isHeroGroupLeader() || parseInt(groupInvitationBehavior, 10) === 1);
    toggleSection(groupSessionControlsEl, !inGroup);
    toggleSection(groupListEl, !inGroup);
    toggleSection(groupInviteControlsEl, !canInvite);
    if (groupBlockInvitesBtnEl) {
        groupBlockInvitesBtnEl.classList.toggle("hidden", inGroup);
    }
    if (groupWindowEl) groupWindowEl.classList.toggle("groupNoGroup", !inGroup);
    if (groupWindowEl) groupWindowEl.classList.toggle("groupInGroup", inGroup);
    syncGroupWindowSectionOrder(inGroup);
    renderGroupInvitations();
    updateGroupWindowNoGroupDimension(inGroup);
    if (!inGroup) {
        groupListEl.innerHTML = "";
        groupRowCache.clear();
        return;
    }
    Array.from(groupRowCache.keys()).forEach(id => {
        if (!groupMembers[id]) {
            const row = groupRowCache.get(id);
            if (row && row.parentElement) row.parentElement.removeChild(row);
            groupRowCache.delete(id);
        }
    });
    const sortedIds = memberIds.map(id => ({
        id: id,
        order: groupMembers[id].order || 999
    })).sort((a, b) => a.order - b.order).map(entry => entry.id);
    sortedIds.forEach(id => {
        const m = groupMembers[id];
        let row = groupRowCache.get(id);
        if (!row) {
            row = document.createElement("div");
            row.className = "groupRow";
            row.dataset.memberId = id;
            row.addEventListener("click", () => {
                if (!groupActionMode) return;
                const myId = parseInt(heroId, 10);
                const mid = parseInt(row.dataset.memberId, 10);
                const mem = groupMembers[mid];
                if (!mem) return;
                if (!isNaN(myId) && mid === myId) return;
                if (groupActionMode === "ping") {
                    sendGroupPingUser(mid);
                } else if (groupActionMode === "follow") {
                    sendGroupFollow(mid);
                } else if (groupActionMode === "promote") {
                    if (!isHeroGroupLeader()) {
                        clearGroupActionMode();
                        return;
                    }
                    sendGroupChangeLeader(mid);
                } else if (groupActionMode === "kick") {
                    if (!isHeroGroupLeader()) {
                        clearGroupActionMode();
                        return;
                    }
                    sendGroupKick(mid);
                }
                clearGroupActionMode();
                forceGroupUiUpdate();
            });
            const name = document.createElement("div");
            name.className = "groupName";
            const mapTag = document.createElement("div");
            mapTag.className = "groupMap";
            const hp = document.createElement("div");
            hp.className = "groupBar hp";
            const sh = document.createElement("div");
            sh.className = "groupBar sh";
            const barsWrap = document.createElement("div");
            barsWrap.className = "groupBarsWrap";
            const shipIcon = document.createElement("div");
            shipIcon.className = "groupShipIcon";
            const targetIcon = document.createElement("div");
            targetIcon.className = "groupTargetIcon";
            const targetShipIcon = document.createElement("div");
            targetShipIcon.className = "groupTargetShipIcon hidden";
            targetIcon.appendChild(targetShipIcon);
            const leadIcon = document.createElement("div");
            leadIcon.className = "groupLeadIcon hidden";
            const base = window.cfg && typeof cfg.basePath === "string" ? cfg.basePath : "";
            const barsCol = document.createElement("div");
            barsCol.className = "groupBarsCol";
            barsCol.appendChild(hp);
            barsCol.appendChild(sh);
            barsWrap.appendChild(shipIcon);
            barsWrap.appendChild(barsCol);
            bindGroupTooltip(hp, () => row._hpTooltipText || "");
            bindGroupTooltip(sh, () => row._shieldTooltipText || "");
            row._refs = {
                name: name,
                mapTag: mapTag,
                hp: hp,
                sh: sh,
                shipIcon: shipIcon,
                targetIcon: targetIcon,
                targetShipIcon: targetShipIcon,
                leadIcon: leadIcon,
                base: base
            };
            row.appendChild(name);
            row.appendChild(mapTag);
            row.appendChild(barsWrap);
            row.appendChild(targetIcon);
            row.appendChild(leadIcon);
            groupRowCache.set(id, row);
        }
        const {name: name, mapTag: mapTag, hp: hp, sh: sh, shipIcon: shipIcon, targetIcon: targetIcon, targetShipIcon: targetShipIcon, leadIcon: leadIcon, base: base} = row._refs;
        const isLeader = groupLeaderId === m.id;
        const isRemoteMap = !isGroupMemberOnCurrentMap(m) || !!m.isOffline;
        const mapLabel = getFlashGroupMapLabel(m.mapId);
        name.textContent = `${m.name || ""}`;
        row.classList.toggle("groupRemote", isRemoteMap);
        if (isRemoteMap && mapLabel) {
            mapTag.textContent = mapLabel;
            mapTag.classList.remove("hidden");
        } else {
            mapTag.textContent = "";
            mapTag.classList.add("hidden");
        }
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(shipIcon, getGroupShipIconPath(m.shipType)); else shipIcon.style.backgroundImage = `url("${getGroupShipIconPath(m.shipType)}")`;
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(targetIcon, `${base}graphics/ui/ui/images/iconShipNull.png`); else targetIcon.style.backgroundImage = `url("${base}graphics/ui/ui/images/iconShipNull.png")`;
        const targetShipType = resolveGroupTargetShipType(m);
        if (targetShipIcon) {
            if (Number.isFinite(targetShipType)) {
                targetShipIcon.classList.remove("hidden");
                if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(targetShipIcon, getGroupShipIconPath(targetShipType)); else targetShipIcon.style.backgroundImage = `url("${getGroupShipIconPath(targetShipType)}")`;
            } else {
                targetShipIcon.classList.add("hidden");
                targetShipIcon.style.backgroundImage = "none";
            }
        }
        leadIcon.classList.toggle("hidden", !isLeader);
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(leadIcon, `${base}graphics/ui/ui/images/boss_icon.png.png`); else leadIcon.style.backgroundImage = `url("${base}graphics/ui/ui/images/boss_icon.png.png")`;
        const hpRatio = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
        hp.style.setProperty("--fillpx", `${Math.round(62 * hpRatio)}px`);
        row._hpTooltipText = `${getFlashGroupLocaleText("label_grp_hitpoints")}\n${formatFlashGroupInteger(m.hp)}|${formatFlashGroupInteger(m.maxHp)}`;
        const shRatio = m.maxShield > 0 ? Math.max(0, Math.min(1, m.shield / m.maxShield)) : 0;
        sh.style.setProperty("--fillpx", `${Math.round(62 * shRatio)}px`);
        row._shieldTooltipText = `${getFlashGroupLocaleText("label_grp_shield")}\n${formatFlashGroupInteger(m.shield)}|${formatFlashGroupInteger(m.maxShield)}`;
        if (row.parentElement !== groupListEl) {
            groupListEl.appendChild(row);
        }
    });
}

let groupShipIconClassMap = null;

const groupShipIconAssetIds = new Set([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 98, 99, 100, 101, 103, 111 ]);
const groupVengeanceIconShipTypes = new Set([ 8, 17, 18, 116, 129 ]);

function getGroupShipIconClassMap() {
    if (groupShipIconClassMap) return groupShipIconClassMap;
    groupShipIconClassMap = {};
    const xmlDoc = window._gameXmlDoc || null;
    if (!xmlDoc || !xmlDoc.querySelectorAll) return groupShipIconClassMap;
    try {
        xmlDoc.querySelectorAll("ships > ship").forEach(shipNode => {
            const type = parseInt(shipNode.getAttribute("type") || "", 10);
            const iconClassID = parseInt(shipNode.getAttribute("iconClassID") || "", 10);
            if (Number.isFinite(type) && Number.isFinite(iconClassID)) {
                groupShipIconClassMap[type] = iconClassID;
            }
        });
    } catch (e) {}
    return groupShipIconClassMap;
}

function resolveGroupShipIconAssetId(shipType) {
    const numericShipType = parseInt(shipType, 10);
    if (!Number.isFinite(numericShipType) || numericShipType <= 0) {
        return 0;
    }
    if (groupVengeanceIconShipTypes.has(numericShipType)) {
        return 8;
    }
    const iconClassMap = getGroupShipIconClassMap();
    const iconClassID = Number.isFinite(iconClassMap[numericShipType]) ? iconClassMap[numericShipType] : null;
    if (Number.isFinite(iconClassID) && groupShipIconAssetIds.has(iconClassID)) {
        return iconClassID;
    }
    if (groupShipIconAssetIds.has(numericShipType)) {
        return numericShipType;
    }
    if (Number.isFinite(iconClassID) && iconClassID >= 0) {
        return iconClassID;
    }
    return 0;
}

function getGroupShipIconPath(shipType) {
    const base = window.cfg && typeof cfg.basePath === "string" ? cfg.basePath : "";
    const assetId = resolveGroupShipIconAssetId(shipType);
    return `${base}graphics/ui/ui/images/iconShip${assetId}.png`;
}

function resolveGroupTargetShipType(member) {
    if (!member) return null;
    const targetId = parseInt(member.targetId, 10);
    if (!Number.isFinite(targetId) || targetId <= 0) return null;
    if (typeof heroId !== "undefined" && targetId === parseInt(heroId, 10)) {
        return typeof heroShipId !== "undefined" && Number.isFinite(heroShipId) ? heroShipId : 0;
    }
    try {
        const targetEntity = typeof entities !== "undefined" && entities ? entities[targetId] : null;
        if (targetEntity) {
            if (Number.isFinite(targetEntity.shipId)) return targetEntity.shipId;
            if (Number.isFinite(targetEntity.type)) return targetEntity.type;
            return 0;
        }
    } catch (_) {}
    return 0;
}

function renderGroupInvitations() {
    if (!groupInvitesEl) return;
    const incomingIds = Object.keys(groupIncomingInvites).map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    const outgoingIds = Object.keys(groupOutgoingInvites).map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    const hasInvites = incomingIds.length > 0 || outgoingIds.length > 0;
    const inGroupNow = !!groupInGroupServerState && Object.keys(groupMembers).length > 0;
    groupInvitesEl.classList.toggle("hidden", !hasInvites);
    if (!hasInvites) {
        groupInvitesEl.innerHTML = "";
        updateGroupWindowNoGroupDimension(inGroupNow);
        return;
    }
    groupInvitesEl.innerHTML = "";
    outgoingIds.forEach(cid => {
        const inv = groupOutgoingInvites[cid];
        if (!inv) return;
        const row = document.createElement("div");
        row.className = "groupInviteRow";
        bindGroupTooltip(row, () => replaceFlashGroupPlaceholders(getFlashGroupLocaleText("label_grp_inv_for"), {
            "%name%": inv.name || ""
        }));
        const shipIcon = document.createElement("div");
        shipIcon.className = "groupShipIcon";
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(shipIcon, getGroupShipIconPath(inv.shipType)); else shipIcon.style.backgroundImage = `url("${getGroupShipIconPath(inv.shipType)}")`;
        const name = document.createElement("div");
        name.className = "groupInviteName";
        name.textContent = inv.name || "";
        const btns = document.createElement("div");
        btns.className = "groupInviteBtns";
        const revokeBtn = makeGroupIconButton("106_btn_revokeinv_std.png.png", "107_btn_revokeinv_mo.png.png");
        bindGroupTooltip(revokeBtn, () => getFlashGroupLocaleText("label_grp_invitation_revoke"));
        revokeBtn.addEventListener("click", () => {
            sendRaw(`ps|inv|rji|${cid}`);
            revokeBtn.disabled = true;
        });
        btns.appendChild(revokeBtn);
        row.appendChild(shipIcon);
        row.appendChild(name);
        row.appendChild(btns);
        groupInvitesEl.appendChild(row);
    });
    incomingIds.forEach(iid => {
        const inv = groupIncomingInvites[iid];
        if (!inv) return;
        const row = document.createElement("div");
        row.className = "groupInviteRow";
        bindGroupTooltip(row, () => replaceFlashGroupPlaceholders(getFlashGroupLocaleText("label_grp_inv_from"), {
            "%name%": inv.name || ""
        }));
        const shipIcon = document.createElement("div");
        shipIcon.className = "groupShipIcon";
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(shipIcon, getGroupShipIconPath(inv.shipType)); else shipIcon.style.backgroundImage = `url("${getGroupShipIconPath(inv.shipType)}")`;
        const name = document.createElement("div");
        name.className = "groupInviteName";
        name.textContent = inv.name || "";
        const btns = document.createElement("div");
        btns.className = "groupInviteBtns";
        const acceptBtn = makeGroupIconButton("139_btn_acceptinv_std.png.png", "140_btn_acceptinv_mo.png.png");
        bindGroupTooltip(acceptBtn, () => getFlashGroupLocaleText("label_grp_invitation_accept"));
        const rejectBtn = makeGroupIconButton("109_btn_rejectinv_std.png.png", "110_btn_rejectinv_mo.png.png");
        bindGroupTooltip(rejectBtn, () => getFlashGroupLocaleText("label_grp_invitation_reject"));
        acceptBtn.addEventListener("click", () => {
            sendRaw(`ps|inv|ack|${iid}`);
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
        });
        rejectBtn.addEventListener("click", () => {
            sendRaw(`ps|inv|rjc|${iid}`);
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
        });
        btns.appendChild(acceptBtn);
        btns.appendChild(rejectBtn);
        row.appendChild(shipIcon);
        row.appendChild(name);
        row.appendChild(btns);
        groupInvitesEl.appendChild(row);
    });
    updateGroupWindowNoGroupDimension(inGroupNow);
}

function forceGroupUiUpdate() {
    renderGroupList();
    renderGroupInvitations();
}

function wireAssetStateButton(button, statePaths) {
    if (!button) return;
    const state = {
        over: false,
        down: false
    };
    const setState = () => {
        if (button.disabled && statePaths.disabled) {
            if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(button, statePaths.disabled); else button.style.backgroundImage = `url("${statePaths.disabled}")`;
            return;
        }
        if (state.down && statePaths.pressed) {
            if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(button, statePaths.pressed); else button.style.backgroundImage = `url("${statePaths.pressed}")`;
            return;
        }
        if (state.over && statePaths.hover) {
            if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(button, statePaths.hover); else button.style.backgroundImage = `url("${statePaths.hover}")`;
            return;
        }
        if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(button, statePaths.normal); else button.style.backgroundImage = `url("${statePaths.normal}")`;
    };
    button.addEventListener("mouseenter", () => {
        state.over = true;
        setState();
    });
    button.addEventListener("mouseleave", () => {
        state.over = false;
        state.down = false;
        setState();
    });
    button.addEventListener("mousedown", ev => {
        if (button.disabled) return;
        ev.preventDefault();
        state.down = true;
        setState();
    });
    button.addEventListener("mouseup", () => {
        state.down = false;
        setState();
    });
    button.addEventListener("focus", () => {
        state.over = true;
        setState();
    });
    button.addEventListener("blur", () => {
        state.over = false;
        state.down = false;
        setState();
    });
    const observer = new MutationObserver(setState);
    observer.observe(button, {
        attributes: true,
        attributeFilter: [ "disabled" ]
    });
    setState();
}

function resolveGroupDisabledAssetFile(stdFile) {
    const explicitMap = {
        "103_btn_sendinv_std.png.png": "105_btn_sendinv_da.png.png",
        "106_btn_revokeinv_std.png.png": "108_btn_revokeinv_da.png.png",
        "109_btn_rejectinv_std.png.png": "111_btn_rejectinv_da.png.png",
        "112_btn_promote_std.png.png": "114_btn_promote_da.png.png",
        "115_btn_ping_std.png.png": "117_btn_ping_da.png.png",
        "118_btn_leave_std.png.png": "120_btn_leave_da.png.png",
        "121_btn_kick_std.png.png": "123_btn_kick_da.png.png",
        "124_btn_inv_group_std.png.png": "126_btn_inv_group_da.png.png",
        "127_btn_inv_boss_std.png.png": "129_btn_inv_boss_da.png.png",
        "130_btn_follow_std.png.png": "132_btn_follow_da.png.png",
        "133_btn_blockinv_std.png.png": "135_btn_blockinv_da.png.png",
        "136_btn_allowinv_std.png.png": "138_btn_allowinv_da.png.png",
        "139_btn_acceptinv_std.png.png": "141_btn_acceptinv_da.png.png"
    };
    if (explicitMap[stdFile]) return explicitMap[stdFile];
    return stdFile.replace("_std", "_da");
}

function makeGroupIconButton(stdFile, hoverFile, title) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "groupIconBtn";
    b.title = "";
    const base = window.cfg && typeof cfg.basePath === "string" ? cfg.basePath : "";
    const normal = `${base}graphics/ui/ui/images/${stdFile}`;
    const hover = `${base}graphics/ui/ui/images/${hoverFile}`;
    const disabledFile = resolveGroupDisabledAssetFile(stdFile);
    const disabled = `${base}graphics/ui/ui/images/${disabledFile}`;
    b.dataset.std = normal;
    b.dataset.hov = hover;
    b.dataset.dis = disabled;
    wireAssetStateButton(b, {
        normal: normal,
        hover: hover,
        pressed: hover,
        disabled: disabled
    });
    return b;
}

function initGroupWindow() {
    if (groupWindowEl) return;
    const existingWin = document.getElementById("win_group");
    const groupContentEl = document.getElementById("content_group");
    if (!existingWin || !groupContentEl) {
        setTimeout(initGroupWindow, 200);
        return;
    }
    ensureGroupWindowStyles();
    if (typeof __loadFlashLocaleMapOnce === "function") {
        try {
            __loadFlashLocaleMapOnce();
        } catch (_) {}
    }
    groupWindowEl = existingWin;
    groupContentRootEl = groupContentEl;
    groupWindowEl.classList.add("groupNoGroup");
    groupWindowEl.classList.remove("groupInGroup");
    groupContentEl.innerHTML = "";
    groupContentEl.style.display = "flex";
    groupContentEl.style.flexDirection = "column";
    groupContentEl.style.alignItems = "flex-start";
    groupContentEl.style.gap = "0";
    const controls = document.createElement("div");
    controls.className = "groupControls groupInviteControls";
    const input = document.createElement("input");
    input.id = "groupInputName";
    input.className = "groupInput doTextInput";
    input.addEventListener("keydown", e => {
        e.stopPropagation();
        e.stopImmediatePropagation();
    });
    input.addEventListener("keyup", e => {
        e.stopPropagation();
        e.stopImmediatePropagation();
    });
    controls.appendChild(input);
    const inviteBtn = makeGroupIconButton("103_btn_sendinv_std.png.png", "104_btn_sendinv_mo.png.png");
    inviteBtn.classList.add("groupInviteBtn");
    bindGroupTooltip(inviteBtn, () => getFlashGroupLocaleText("label_invite"));
    inviteBtn.addEventListener("click", () => {
        const name = input.value.trim();
        if (!name) return;
        sendRaw(`ps|inv|name|${name}`);
        input.value = "";
    });
    controls.appendChild(inviteBtn);
    const blockBtn = document.createElement("button");
    blockBtn.type = "button";
    blockBtn.className = "groupIconBtn groupBlockInvitesBtn";
    blockBtn.addEventListener("click", () => {
        sendRaw("ps|blk");
    });
    controls.appendChild(blockBtn);
    groupBlockInvitesBtnEl = blockBtn;
    updateGroupBlockInvitesButton();
    groupInviteControlsEl = controls;
    const actions = document.createElement("div");
    actions.className = "groupControls groupSessionControls hidden";
    const pingBtn = makeGroupIconButton("115_btn_ping_std.png.png", "116_btn_ping_mo.png.png");
    bindGroupTooltip(pingBtn, () => getFlashGroupLocaleText("label_grp_context_item_ping"));
    groupPingBtnEl = pingBtn;
    pingBtn.addEventListener("click", () => {
        if (groupActionMode === "ping") {
            clearGroupActionMode();
            return;
        }
        setGroupActionMode("ping");
    });
    actions.appendChild(pingBtn);
    const leaveBtn = makeGroupIconButton("118_btn_leave_std.png.png", "119_btn_leave_mo.png.png");
    bindGroupTooltip(leaveBtn, () => getFlashGroupLocaleText("label_grp_leave_group_leaver"));
    groupLeaveBtnEl = leaveBtn;
    leaveBtn.addEventListener("click", () => {
        sendRaw("ps|lv");
    });
    actions.appendChild(leaveBtn);
    const followBtn = makeGroupIconButton("130_btn_follow_std.png.png", "131_btn_follow_mo.png.png");
    bindGroupTooltip(followBtn, () => getFlashGroupLocaleText("label_grp_context_item_follow"));
    groupFollowBtnEl = followBtn;
    followBtn.addEventListener("click", () => {
        if (groupActionMode === "follow") {
            clearGroupActionMode();
            return;
        }
        setGroupActionMode("follow");
    });
    actions.appendChild(followBtn);
    const kickBtn = makeGroupIconButton("121_btn_kick_std.png.png", "122_btn_kick_mo.png.png");
    bindGroupTooltip(kickBtn, () => getFlashGroupLocaleText("label_grp_kick_member"));
    kickBtn.classList.add("hidden");
    kickBtn.disabled = false;
    kickBtn.addEventListener("click", () => {
        if (!isHeroGroupLeader()) return;
        if (groupActionMode === "kick") {
            clearGroupActionMode();
            return;
        }
        setGroupActionMode("kick");
    });
    actions.appendChild(kickBtn);
    groupKickBtnEl = kickBtn;
    const promoteBtn = makeGroupIconButton("112_btn_promote_std.png.png", "113_btn_promote_mo.png.png");
    bindGroupTooltip(promoteBtn, () => getFlashGroupLocaleText("label_grp_leader_change"));
    promoteBtn.classList.add("hidden");
    promoteBtn.disabled = false;
    promoteBtn.addEventListener("click", () => {
        if (!isHeroGroupLeader()) return;
        if (groupActionMode === "promote") {
            clearGroupActionMode();
            return;
        }
        setGroupActionMode("promote");
    });
    actions.appendChild(promoteBtn);
    groupPromoteBtnEl = promoteBtn;
    const invitationBehaviorBtn = document.createElement("button");
    invitationBehaviorBtn.type = "button";
    invitationBehaviorBtn.className = "groupIconBtn hidden";
    invitationBehaviorBtn.addEventListener("click", () => {
        if (!isHeroGroupLeader()) return;
        const nextBehavior = parseInt(groupInvitationBehavior, 10) === 1 ? 0 : 1;
        sendRaw(`ps|s|i|${nextBehavior}`);
    });
    actions.appendChild(invitationBehaviorBtn);
    groupInvitationBehaviorBtnEl = invitationBehaviorBtn;
    updateGroupInvitationBehaviorButton();
    groupSessionControlsEl = actions;
    groupListEl = document.createElement("div");
    groupListEl.className = "groupList hidden";
    groupInvitesEl = document.createElement("div");
    groupInvitesEl.className = "groupInvites hidden";
    groupContentEl.appendChild(controls);
    groupContentEl.appendChild(groupInvitesEl);
    groupContentEl.appendChild(groupListEl);
    groupContentEl.appendChild(actions);
    syncGroupSessionButtonOrder();
    updateGroupLeaderButtons();
    updateGroupModeButtonVisuals();
    syncGroupWindowSectionOrder(false);
    renderGroupList();
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}

window.addEventListener("load", initGroupWindow);

let lastTime = performance.now();

let shieldAnimTime = 0;
