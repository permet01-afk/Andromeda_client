



if (typeof WINDOW_DEFAULT_POS === 'undefined') {
    window.WINDOW_DEFAULT_POS = {
        ship: { top: 80, left: 70 },
        user: { top: 200, left: 70 },
        group: { top: 80, left: 280 },
        log: { top: 360, left: 70 },
        chat: { top: 540, left: 70 },
        quest: { top: 140, left: 520 },
        booster: { top: 10, left: 10 }
    };
}

function initGlobalButtonStyles() {
    // On remplace complètement les skins "image" par un style CSS simple (sans aucune image)
    const styleId = "style-do-buttons";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = styleId;

    style.innerHTML = `
        .doButton,
        .doClassicButton {
            background-image: none !important;
            background: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(120,170,220,0.7) !important;
            border-radius: 4px;

            color: #ffffff;
            cursor: pointer;
            padding: 3px 8px;
            min-width: 90px;
            height: 22px;

            font-family: Arial, sans-serif;
            font-size: 11px;

            box-shadow: none !important;
            outline: none !important;

            -webkit-appearance: none;
            appearance: none;
        }

        .doButton:hover,
        .doClassicButton:hover {
            background: rgba(20,40,60,0.45) !important;
        }

        .doButton:active,
        .doClassicButton:active {
            background: rgba(10,20,30,0.55) !important;
        }

        .doButton:disabled,
        .doClassicButton:disabled,
        .doButton.disabled,
        .doClassicButton.disabled {
            opacity: 0.6;
            cursor: default;
        }

        /* Supprime le “focus” interne (souvent source de petits points/artefacts, surtout Firefox) */
        .doButton:focus,
        .doClassicButton:focus,
        .doButton:focus-visible,
        .doClassicButton:focus-visible {
            outline: none !important;
        }

        .doButton::-moz-focus-inner,
        .doClassicButton::-moz-focus-inner {
            border: 0;
            padding: 0;
        }
    `;

    document.head.appendChild(style);
}


function initGlobalTextFieldStyles() {
    const textBg = UI_SPRITES.chatBg || UI_SPRITES.windowBg;
    const textDisabled = UI_SPRITES.windowSide || textBg;
    const inputBg = UI_SPRITES.chatInputBg || textBg;
    const inputDisabled = UI_SPRITES.windowSide || inputBg;

    // Si le chemin est vide/null -> aucune image
    const cssUrl = (p) => (p ? `url('${p}')` : "none");

    const style = document.createElement('style');
    style.innerHTML = `
        /* ================================
           TextArea générique (fl.controls.TextArea)
           ================================ */

        /* Fond "normal" basé sur le wrapper TextArea de Flash */
        .flTextAreaSkin {
            background-image: ${cssUrl(textBg)};
            background-repeat: repeat;
            background-size: 100% 100%;
        }

        /* Etat désactivé = TextArea_disabledSkin */
        .flTextAreaSkin.disabled,
        .flTextAreaSkin:disabled,
        textarea.flTextAreaSkin:disabled {
            background-image: ${cssUrl(textDisabled)};
        }

        /* Variante plus simple pour nos futures fenêtres : .doTextArea */
        textarea.doTextArea,
        .doTextArea {
            background-image: ${cssUrl(textBg)};
            background-repeat: repeat;
            background-size: auto;
            color: #dddddd;
            border: none;
            padding: 4px;
            font-size: 11px;
            font-family: Arial, sans-serif;
        }

        textarea.doTextArea:disabled,
        .doTextArea.disabled {
            background-image: ${cssUrl(textDisabled)};
            color: #777777;
        }

        /* ================================
           TextInput générique (fl.controls.TextInput)
           ================================ */

        /* Fond "normal" basé sur le wrapper TextInput de Flash */
        .flTextInputSkin {
            background-image: ${cssUrl(inputBg)};
            background-repeat: repeat;
            background-size: 100% 100%;
        }

        /* Etat désactivé = TextInput_disabledSkin */
        .flTextInputSkin.disabled,
        .flTextInputSkin:disabled,
        input.flTextInputSkin:disabled {
            background-image: ${cssUrl(inputDisabled)};
        }

        /* Variante simple pour nos inputs : .doTextInput */
        input.doTextInput,
        .doTextInput {
            background-image: ${cssUrl(inputBg)};
            background-repeat: repeat;
            background-size: 100% 100%;
            border: none;
            padding: 2px 5px;
            font-size: 11px;
            font-family: Arial, sans-serif;
            color: #ffffff;
        }

        input.doTextInput:disabled,
        .doTextInput.disabled {
            background-image: ${cssUrl(inputDisabled)};
            color: #888888;
        }
    `;
    document.head.appendChild(style);
}


function initGlobalComboBoxStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* ================================
           ComboBox style DarkOrbit
           ================================ */

        /* Wrapper générique basé sur fl.controls.ComboBox */
        .flComboBoxSkin {
            background-image: url('assets/spirites/DefineSprite_142_fl.controls.ComboBox_fl.controls.ComboBox/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* Conteneur principal */
        .doComboBox {
            position: relative;
            display: inline-block;
            width: 180px;
            height: 22px;
            font-size: 11px;
            font-family: Arial, sans-serif;
            color: #dddddd;
            cursor: pointer;
            user-select: none;
        }

        /* Zone affichant la valeur sélectionnée */
        .doComboBoxSelected {
            height: 22px;
            line-height: 22px;
            padding: 0 24px 0 6px;
            background-image: url('assets/spirites/DefineSprite_114_ComboBox_upSkin_ComboBox_upSkin/1.png');
            background-repeat: repeat-x;
            background-size: 100% 100%;
            box-sizing: border-box;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        /* Flèche à droite */
        .doComboBoxArrow {
            position: absolute;
            top: 0;
            right: 0;
            width: 22px;
            height: 22px;
            background-image: url('assets/spirites/DefineSprite_114_ComboBox_upSkin_ComboBox_upSkin/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* Etat "ouvert" : on utilise le downSkin */
        .doComboBox.open .doComboBoxSelected {
            background-image: url('assets/spirites/DefineSprite_120_ComboBox_downSkin_ComboBox_downSkin/1.png');
        }

        .doComboBox.open .doComboBoxArrow {
            background-image: url('assets/spirites/DefineSprite_120_ComboBox_downSkin_ComboBox_downSkin/1.png');
        }

        /* Etat survolé : overSkin */
        .doComboBox:hover .doComboBoxSelected:not(.disabled) {
            background-image: url('assets/spirites/DefineSprite_118_ComboBox_overSkin_ComboBox_overSkin/1.png');
        }

        .doComboBox:hover .doComboBoxArrow:not(.disabled) {
            background-image: url('assets/spirites/DefineSprite_118_ComboBox_overSkin_ComboBox_overSkin/1.png');
        }

        /* Etat désactivé : disabledSkin */
        .doComboBox.disabled .doComboBoxSelected,
        .doComboBox.disabled .doComboBoxArrow {
            background-image: url('assets/spirites/DefineSprite_116_ComboBox_disabledSkin_ComboBox_disabledSkin/1.png');
            color: #777777;
            cursor: default;
        }

        /* Liste déroulante */
        .doComboBoxList {
            position: absolute;
            left: 0;
            top: 22px;
            width: 100%;
            max-height: 160px;
            overflow-y: auto;
            background: #000910;
            border: 1px solid #3a5b7c;
            z-index: 1500;
            display: none;
            box-sizing: border-box;
        }

        .doComboBox.open .doComboBoxList {
            display: block;
        }

        .doComboBoxList ul {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .doComboBoxList li {
            padding: 3px 6px;
            cursor: pointer;
            color: #bbbbbb;
            background-image: url('assets/spirites/DefineSprite_124_CellRenderer_upSkin_CellRenderer_upSkin/1.png');
            background-repeat: repeat-x;
            background-size: 100% 100%;
            white-space: nowrap;
        }

        .doComboBoxList li:hover {
            color: #00aaff;
            background-image: url('assets/spirites/DefineSprite_130_CellRenderer_overSkin_CellRenderer_overSkin/1.png');
        }

        .doComboBoxList li.disabled {
            color: #666666;
            cursor: default;
            background-image: url('assets/spirites/DefineSprite_126_CellRenderer_disabledSkin_CellRenderer_disabledSkin/1.png');
        }
    `;
    document.head.appendChild(style);
}
function initGlobalSliderStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* ================================
           Slider style DarkOrbit
           ================================ */

        /* Wrapper générique basé sur fl.controls.Slider */
        .flSliderSkin {
            background-image: url('assets/spirites/DefineSprite_93_fl.controls.Slider_fl.controls.Slider/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* Conteneur principal du slider DO */
        .doSlider {
            position: relative;
            height: 22px;
            padding: 3px 4px;
            box-sizing: border-box;
        }

        /* Track normal */
        .doSliderTrack {
            position: relative;
            height: 16px;
            background-image: url('assets/spirites/DefineSprite_88_SliderTrack_skin_SliderTrack_skin/1.png');
            background-repeat: repeat-x;
            background-size: auto 16px;
            border-radius: 3px;
        }

        /* Track désactivé */
        .doSliderTrack.disabled,
        .doSlider.disabled .doSliderTrack {
            background-image: url('assets/spirites/DefineSprite_92_SliderTrack_disabledSkin_SliderTrack_disabledSkin/1.png');
        }

        /* Thumb normal */
        .doSliderThumb {
            position: absolute;
            top: -4px;
            width: 24px;
            height: 24px;
            background-image: url('assets/spirites/DefineSprite_80_SliderThumb_upSkin_SliderThumb_upSkin/1.png');
            background-repeat: no-repeat;
            background-size: contain;
            cursor: pointer;
        }

        /* Thumb survolé */
        .doSliderThumb.over {
            background-image: url('assets/spirites/DefineSprite_82_SliderThumb_overSkin_SliderThumb_overSkin/1.png');
        }

        /* Thumb cliqué (down) */
        .doSliderThumb.down {
            background-image: url('assets/spirites/DefineSprite_84_SliderThumb_downSkin_SliderThumb_downSkin/1.png');
        }

        /* Thumb désactivé */
        .doSliderThumb.disabled,
        .doSlider.disabled .doSliderThumb {
            background-image: url('assets/spirites/DefineSprite_86_SliderThumb_disabledSkin_SliderThumb_disabledSkin/1.png');
            cursor: default;
        }

        /* Ticks (graduations) optionnels */
        .doSliderTicks {
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 4px;
            transform: translateY(-50%);
            pointer-events: none;
        }

        .doSliderTick {
            position: absolute;
            width: 2px;
            height: 4px;
            background-image: url('assets/spirites/DefineSprite_90_SliderTick_skin_SliderTick_skin/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }
    `;
    document.head.appendChild(style);
}

function initGlobalListStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* ================================
           List / CellRenderer wrappers
           ================================ */

        /* Wrapper basé sur fl.controls.listClasses.CellRenderer */
        .flCellRendererWrapper {
            background-image: url('assets/spirites/DefineSprite_139_fl.controls.listClasses.CellRenderer_fl.controls.listClasses.CellRenderer/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* Wrapper basé sur fl.controls.List */
        .flListWrapper {
            background-image: url('assets/spirites/DefineSprite_141_fl.controls.List_fl.controls.List/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }
    `;
    document.head.appendChild(style);
}

function initGlobalMiscComponentStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* =====================================
           focusRectSkin (focus clavier à la Flash)
           ===================================== */

        /* 
           Classe à poser sur des éléments focusables
           (boutons, items de liste...) pour avoir
           un focus visuel comme dans Flash.
           Exemple d'usage plus tard :
           <button class="doButton doFocusRectTarget">...</button>
        */
        .doFocusRectTarget {
            position: relative;
            outline: none;
        }

        .doFocusRectTarget:focus::after {
            content: "";
            position: absolute;
            left: -2px;
            top: -2px;
            right: -2px;
            bottom: -2px;
            pointer-events: none;
            background-image: url('assets/spirites/DefineSprite_78_focusRectSkin_focusRectSkin/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* =====================================
           ScrollBar_thumbIcon (icône sur le thumb)
           ===================================== */

        /*
           Classe utilitaire si on veut ajouter l'icône
           de thumb par-dessus une scrollbar custom.
           Pour l'instant on ne l'applique pas encore,
           mais le sprite est relié.
        */
        .doScrollThumbIcon {
            background-image: url('assets/spirites/DefineSprite_37_ScrollBar_thumbIcon_ScrollBar_thumbIcon/1.png');
            background-repeat: no-repeat;
            background-position: center center;
            background-size: 100% 100%;
        }

        /* =====================================
           ComponentShim (wrapper interne Flash)
           ===================================== */

        /*
           Wrapper générique pour simuler le shim
           fl.core.ComponentShim si besoin.
        */
        .flComponentShim {
            background-image: url('assets/spirites/DefineSprite_5_fl.core.ComponentShim_fl.core.ComponentShim/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }
    `;
    document.head.appendChild(style);
}
function initGlobalSpriteDebugStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* =====================================
           Sprites génériques DO (debug / réserve)
           ===================================== */

        .doSprite4 {
            background-image: url('assets/spirites/DefineSprite_4/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite7 {
            background-image: url('assets/spirites/DefineSprite_7/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite12 {
            background-image: url('assets/spirites/DefineSprite_12/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite15 {
            background-image: url('assets/spirites/DefineSprite_15/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite44 {
            background-image: url('assets/spirites/DefineSprite_44/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite46 {
            background-image: url('assets/spirites/DefineSprite_46/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite49 {
            background-image: url('assets/spirites/DefineSprite_49/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite50 {
            background-image: url('assets/spirites/DefineSprite_50/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite52 {
            background-image: url('assets/spirites/DefineSprite_52/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite54 {
            background-image: url('assets/spirites/DefineSprite_54/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite56 {
            background-image: url('assets/spirites/DefineSprite_56/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite58 {
            background-image: url('assets/spirites/DefineSprite_58/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite60 {
            background-image: url('assets/spirites/DefineSprite_60/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite62 {
            background-image: url('assets/spirites/DefineSprite_62/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite64 {
            background-image: url('assets/spirites/DefineSprite_64/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite66 {
            background-image: url('assets/spirites/DefineSprite_66/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite68 {
            background-image: url('assets/spirites/DefineSprite_68/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite70 {
            background-image: url('assets/spirites/DefineSprite_70/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doSprite140 {
            background-image: url('assets/spirites/DefineSprite_140/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }
    `;
    document.head.appendChild(style);
}






function initGlobalScrollbarStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* ==========================================
           SCROLLBARS STYLE DARKORBIT
           Appliqué au chat, au log et à toute zone
           ayant la classe .doScrollArea ou .doScrollPane
           ========================================== */

        /* Cible de base : chat, log, et zones marquées .doScrollArea */
        #chatContent,
        #logContent,
        .doScrollArea {
            scrollbar-width: thin;                /* Firefox */
            scrollbar-color: #4a6b8c transparent; /* Firefox : thumb + track */
        }

        /* Largeur + fond (track) - WebKit (Chrome, Edge, etc.) */
        #chatContent::-webkit-scrollbar,
        #logContent::-webkit-scrollbar,
        .doScrollArea::-webkit-scrollbar {
            width: 14px;
            background-image: url('assets/spirites/DefineSprite_10_ScrollTrack_skin_ScrollTrack_skin/1.png');
            background-repeat: repeat-y;
            background-size: 100% 16px;
        }

        /* Curseur (thumb) normal */
        #chatContent::-webkit-scrollbar-thumb,
        #logContent::-webkit-scrollbar-thumb,
        .doScrollArea::-webkit-scrollbar-thumb {
            background-image: url('assets/spirites/DefineSprite_30_ScrollThumb_upSkin_ScrollThumb_upSkin/1.png');
            background-repeat: no-repeat;
            background-size: 100% 16px;
            border-radius: 4px;
        }

        /* Thumb survolé (over) */
        #chatContent::-webkit-scrollbar-thumb:hover,
        #logContent::-webkit-scrollbar-thumb:hover,
        .doScrollArea::-webkit-scrollbar-thumb:hover {
            background-image: url('assets/spirites/DefineSprite_24_ScrollThumb_overSkin_ScrollThumb_overSkin/1.png');
        }

        /* Thumb cliqué (down) */
        #chatContent::-webkit-scrollbar-thumb:active,
        #logContent::-webkit-scrollbar-thumb:active,
        .doScrollArea::-webkit-scrollbar-thumb:active {
            background-image: url('assets/spirites/DefineSprite_20_ScrollThumb_downSkin_ScrollThumb_downSkin/1.png');
        }

        /* ==============================
           Flèches haut / bas (ScrollArrow*)
           ============================== */

        /* Boutons de scroll verticaux : hauteur et base */
        #chatContent::-webkit-scrollbar-button:vertical,
        #logContent::-webkit-scrollbar-button:vertical,
        .doScrollArea::-webkit-scrollbar-button:vertical {
            height: 14px;
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        /* Flèche HAUT : état normal (upSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:decrement,
        #logContent::-webkit-scrollbar-button:vertical:decrement,
        .doScrollArea::-webkit-scrollbar-button:vertical:decrement {
            background-image: url('assets/spirites/DefineSprite_28_ScrollArrowUp_upSkin_ScrollArrowUp_upSkin/1.png');
        }

        /* Flèche HAUT survolée (overSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:decrement:hover,
        #logContent::-webkit-scrollbar-button:vertical:decrement:hover,
        .doScrollArea::-webkit-scrollbar-button:vertical:decrement:hover {
            background-image: url('assets/spirites/DefineSprite_26_ScrollArrowUp_overSkin_ScrollArrowUp_overSkin/1.png');
        }

        /* Flèche HAUT cliquée (downSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:decrement:active,
        #logContent::-webkit-scrollbar-button:vertical:decrement:active,
        .doScrollArea::-webkit-scrollbar-button:vertical:decrement:active {
            background-image: url('assets/spirites/DefineSprite_16_ScrollArrowUp_downSkin_ScrollArrowUp_downSkin/1.png');
        }

        /* Flèche BAS : état normal (upSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:increment,
        #logContent::-webkit-scrollbar-button:vertical:increment,
        .doScrollArea::-webkit-scrollbar-button:vertical:increment {
            background-image: url('assets/spirites/DefineSprite_31_ScrollArrowDown_upSkin_ScrollArrowDown_upSkin/1.png');
        }

        /* Flèche BAS survolée (overSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:increment:hover,
        #logContent::-webkit-scrollbar-button:vertical:increment:hover,
        .doScrollArea::-webkit-scrollbar-button:vertical:increment:hover {
            background-image: url('assets/spirites/DefineSprite_22_ScrollArrowDown_overSkin_ScrollArrowDown_overSkin/1.png');
        }

        /* Flèche BAS cliquée (downSkin) */
        #chatContent::-webkit-scrollbar-button:vertical:increment:active,
        #logContent::-webkit-scrollbar-button:vertical:increment:active,
        .doScrollArea::-webkit-scrollbar-button:vertical:increment:active {
            background-image: url('assets/spirites/DefineSprite_18_ScrollArrowDown_downSkin_ScrollArrowDown_downSkin/1.png');
        }

        /* Etats "désactivés" des flèches (quand la zone a la classe .scrollDisabled) */
        .scrollDisabled::-webkit-scrollbar-button:vertical:decrement,
        .scrollDisabled::-webkit-scrollbar-button:vertical:decrement:hover,
        .scrollDisabled::-webkit-scrollbar-button:vertical:decrement:active {
            background-image: url('assets/spirites/DefineSprite_35_ScrollArrowUp_disabledSkin_ScrollArrowUp_disabledSkin/1.png');
        }

        .scrollDisabled::-webkit-scrollbar-button:vertical:increment,
        .scrollDisabled::-webkit-scrollbar-button:vertical:increment:hover,
        .scrollDisabled::-webkit-scrollbar-button:vertical:increment:active {
            background-image: url('assets/spirites/DefineSprite_33_ScrollArrowDown_disabledSkin_ScrollArrowDown_disabledSkin/1.png');
        }

        /* ==============================
           Wrappers ScrollPane / ScrollBar
           ============================== */

        /* Style générique d'une "ScrollPane" à la Flash */
        .doScrollPane {
            background-image: url('assets/spirites/DefineSprite_39_fl.containers.ScrollPane_fl.containers.ScrollPane/1.png');
            background-repeat: repeat;
            background-size: 100% 100%;
        }

        .doScrollPane.disabled {
            background-image: url('assets/spirites/DefineSprite_6_ScrollPane_disabledSkin_ScrollPane_disabledSkin/1.png');
        }

        /* Style générique pour une barre de scroll indépendante (si besoin plus tard) */
        .doScrollBar {
            background-image: url('assets/spirites/DefineSprite_38_fl.controls.ScrollBar_fl.controls.ScrollBar/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .doUIScrollBar {
            background-image: url('assets/spirites/DefineSprite_71_fl.controls.UIScrollBar_fl.controls.UIScrollBar/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }
    `;
    document.head.appendChild(style);
}





    // ========================================================
    // INTERFACE LABO / VENTE MINERAIS
    // ========================================================
    let labWindowVisible = false; // État de la fenêtre
    let labMode = 'cargo';      // 'cargo' ou 'refine'
    let lastLabCargoSig = "";
    let lastLabPriceSig = "";

    const LAB_PRODUCTS = [
        {
            id: 11,
            code: "prometid",
            name: "Prometid",
            inputs: { prometium: 20, endurium: 10 },
            outputUnit: 1
        },
        {
            id: 12,
            code: "duranium",
            name: "Duranium",
            inputs: { terbium: 20, endurium: 10 },
            outputUnit: 1
        },
        {
            id: 13,
            code: "promerium",
            name: "Promerium",
            inputs: { prometid: 10, duranium: 10, xenomit: 1 },
            outputUnit: 1
        }
    ];

    function initLabWindow() {
    const style = document.createElement('style');
    style.innerHTML = `
        #labWindow {
            position: absolute; top: 150px; left: 50%; transform: translateX(-50%);
            width: 450px; height: 350px;

            /* ancien fond + skin ScrollPane du main.swf */
            background: rgba(0, 10, 20, 0.95);
            background-image: url('assets/spirites/log/ScrollPane_upSkin.png');
            background-repeat: repeat;
            background-size: auto;

            border: 2px solid #4a6b8c;
            color: #ccc; font-family: Consolas, monospace; font-size: 12px;
            padding: 10px; z-index: 1000; display: none;
        }

        .labHeader {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #4a6b8c;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }

        .labTitle { color: #00aaff; font-weight: bold; font-size: 14px; }
        .labClose { color: #ff4444; cursor: pointer; font-weight: bold; }

        .labContent {
            display: flex;
            height: 80%;
        }

        /* Colonne menu à gauche */
                .labMenu {
            width: 120px;
            border-right: 1px solid #2a4b6c;
            padding-right: 10px;
        }

        .labMenu div {
            padding: 5px;
            cursor: pointer;
            color: #888;
            background-image: url('assets/spirites/DefineSprite_124_CellRenderer_upSkin_CellRenderer_upSkin/1.png');
            background-repeat: repeat-x;
            background-size: 100% 100%;
            margin-bottom: 4px;
        }

        .labMenu div:hover {
            background-image: url('assets/spirites/DefineSprite_130_CellRenderer_overSkin_CellRenderer_overSkin/1.png');
        }

        .labMenu div:active {
            background-image: url('assets/spirites/DefineSprite_128_CellRenderer_downSkin_CellRenderer_downSkin/1.png');
        }

        .labMenu div.active {
            color: #00aaff;
            font-weight: bold;
            background-image: url('assets/spirites/DefineSprite_138_CellRenderer_selectedUpSkin_CellRenderer_selectedUpSkin/1.png');
        }

        .labMenu div.active:hover {
            background-image: url('assets/spirites/DefineSprite_136_CellRenderer_selectedOverSkin_CellRenderer_selectedOverSkin/1.png');
        }
		
		        .labMenu div.active:active {
            background-image: url('assets/spirites/DefineSprite_134_CellRenderer_selectedDownSkin_CellRenderer_selectedDownSkin/1.png');
        }


        .labMenu div.disabled {
            cursor: default;
            color: #666;
            background-image: url('assets/spirites/DefineSprite_126_CellRenderer_disabledSkin_CellRenderer_disabledSkin/1.png');
        }

        .labMenu div.disabled.active {
            background-image: url('assets/spirites/DefineSprite_132_CellRenderer_selectedDisabledSkin_CellRenderer_selectedDisabledSkin/1.png');
        }


        /* Vue principale à droite : fond List_skin comme le journal */
        .labView {
            flex: 1;
            padding-left: 10px;
            background-image: url('assets/spirites/log/List_skin.png');
            background-repeat: repeat;
            background-size: auto;
            overflow-y: auto;
        }

        .oreItem {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
        }

        .oreCount { color: #fff; }
        .oreName  { color: #00ff00; }

        /* Boutons d'action du labo : skin de bouton DO */
        .btnAction {
            margin-top: 10px;
            padding: 5px 10px;
            border: none;
            cursor: pointer;
            color: white;

            background-image: url('assets/spirites/DefineSprite_109_Button_selectedUpSkin_Button_selectedUpSkin/1.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        .btnAction:hover {
            background-image: url('assets/spirites/DefineSprite_107_Button_selectedOverSkin_Button_selectedOverSkin/1.png');
        }

        .btnAction:active {
            background-image: url('assets/spirites/DefineSprite_105_Button_selectedDownSkin_Button_selectedDownSkin/1.png');
        }

        .btnAction:disabled {
            background-image: url('assets/spirites/DefineSprite_103_Button_selectedDisabledSkin_Button_selectedDisabledSkin/1.png');
            cursor: default;
            opacity: 0.7;
        }
    `;
    document.head.appendChild(style);

    const labDiv = document.createElement('div');
    labDiv.id = 'labWindow';
    labDiv.innerHTML = `
        <div class="labHeader">
            <span class="labTitle">Laboratoire & Stock de Minerais</span>
            <span class="labClose" id="labCloseBtn">X</span>
        </div>
        <div class="labContent">
            <div class="labMenu">
                <div id="menuCargo" class="active" data-mode="cargo">Stock & Vente</div>
                <div id="menuRefine" data-mode="refine">Raffinage (Production)</div>
            </div>
            <div class="labView" id="labViewContent">
            </div>
        </div>
    `;
    document.body.appendChild(labDiv);

    // --- Logique d'affichage ---
    const closeBtn = document.getElementById('labCloseBtn');
    closeBtn.addEventListener('click', toggleLabWindow);
    document.getElementById('menuCargo').addEventListener('click', () => setLabMode('cargo'));
    document.getElementById('menuRefine').addEventListener('click', () => setLabMode('refine'));

    // Empêcher les clics de jeu derrière la fenêtre
    labDiv.addEventListener('mousedown', (e) => e.stopPropagation());
}


    // Fonction pour afficher/masquer la fenêtre
    function toggleLabWindow() {
        const win = document.getElementById('labWindow');
        labWindowVisible = !labWindowVisible;
        win.style.display = labWindowVisible ? 'flex' : 'none';
        if (labWindowVisible) {
            setLabMode(labMode); // Mettre à jour le contenu au moment de l'ouverture
        }
    }

    // Fonction pour changer l'onglet et le contenu
    function setLabMode(mode) {
        labMode = mode;
        const view = document.getElementById('labViewContent');
        const menuItems = document.querySelectorAll('.labMenu div');
        menuItems.forEach(item => {
            if (item.getAttribute('data-mode') === mode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        view.innerHTML = ''; // Nettoyer
        if (mode === 'cargo') {
            displayCargoView(view);
        } else if (mode === 'refine') {
            displayRefineView(view);
        }
    }
	// Affiche le stock actuel et l'option de vente
    function displayCargoView(container) {
        const cargo = window.oreCargo || {};
        const prices = window.orePrices || {};

        let html = `<h3>Stock actuel :</h3>`;

        const oreKeys = Object.keys(cargo);
        if (oreKeys.length === 0) {
            html += `<p style="color:#888;">Aucun minerai reçu du serveur pour l'instant.</p>`;
        }

        for (const key of oreKeys) {
            const count = cargo[key];
            const price = prices[key] || 0;
            const value = count * price;
            const isSellable = count > 0 && price > 0;
            const sellLabel = isSellable ? `Vendre (Valeur: ${value.toLocaleString()} Cr.)` : "Pas de valeur";
            const disabledAttr = isSellable ? "" : "disabled";

            html += `
                <div class="oreItem">
                    <span class="oreName">${key.toUpperCase()} :</span>
                    <span class="oreCount">${count.toLocaleString()}</span>
                    <button class="btnAction btnSellOre" data-ore="${key}" data-amount="all" ${disabledAttr}>${sellLabel}</button>
                </div>
            `;
        }

        container.innerHTML = html;

        // --- Logique d'envoi VENDRE ---
        container.querySelectorAll('.btnSellOre').forEach(button => {
            button.addEventListener('click', (e) => {
                const oreType = e.currentTarget.getAttribute('data-ore');
                const amount = cargo[oreType]; // Vendre tout le stock pour cet ore
                if (amount > 0) {
                    sendSellOre(oreType, amount);
                }
            });
        });
    }

    // Affiche l'interface de production (raffinage)
    function displayRefineView(container) {
        const cargo = window.oreCargo || {};

        const productCards = LAB_PRODUCTS.map(prod => {
            const canBuildOnce = hasEnoughFor(prod, 1, cargo);
            const maxAmount = computeMaxCraft(prod, cargo);
            const buttonDisabled = maxAmount <= 0 ? "disabled" : "";
            const inputs = Object.entries(prod.inputs)
                .map(([ore, count]) => `${count} ${ore.toUpperCase()}`)
                .join(' + ');

            return `
                <div class="oreItem">
                    <div class="oreName">${prod.name}</div>
                    <div class="oreCount">Recette : ${inputs}</div>
                    <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
                        <input type="number" class="refineAmount" data-prod="${prod.id}" value="${canBuildOnce ? Math.min(100, maxAmount) : 0}" min="1" max="${Math.max(1, maxAmount)}" style="width:80px;">
                        <button class="btnAction doButton btnProduce" data-prod="${prod.id}" ${buttonDisabled}>Produire</button>
                        <span style="color:${canBuildOnce ? '#0f0' : '#f66'}">${maxAmount > 0 ? `Max ${maxAmount}` : 'Ressources insuffisantes'}</span>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `
            <h3>Production (Raffinage) :</h3>
            ${productCards}
        `;

        container.querySelectorAll('.btnProduce').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prodId = parseInt(e.currentTarget.getAttribute('data-prod'), 10);
                const input = container.querySelector(`input.refineAmount[data-prod="${prodId}"]`);
                const amount = parseInt(input.value, 10);
                const product = LAB_PRODUCTS.find(p => p.id === prodId);
                if (!product || isNaN(amount) || amount <= 0) return;

                if (!hasEnoughFor(product, amount, cargo)) {
                    addInfoMessage("Ressources insuffisantes pour produire.");
                    return;
                }
                sendProduce(prodId, amount);
            });
        });
    }

    function hasEnoughFor(product, amount, cargo) {
        if (!product || amount <= 0) return false;
        for (const [ore, count] of Object.entries(product.inputs)) {
            if ((cargo[ore] || 0) < count * amount) {
                return false;
            }
        }
        return true;
    }

    function computeMaxCraft(product, cargo) {
        let max = Infinity;
        for (const [ore, count] of Object.entries(product.inputs)) {
            const available = cargo[ore] || 0;
            max = Math.min(max, Math.floor(available / count));
        }
        if (!isFinite(max)) return 0;
        return Math.max(0, max);
    }

    // Rafraîchit la fenêtre labo quand des données cargo/prix changent
    function refreshLabWindowIfNeeded() {
        if (!labWindowVisible) return;
        const cargoSig = JSON.stringify(window.oreCargo || {});
        const priceSig = JSON.stringify(window.orePrices || {});
        if (cargoSig !== lastLabCargoSig || priceSig !== lastLabPriceSig) {
            lastLabCargoSig = cargoSig;
            lastLabPriceSig = priceSig;
            setLabMode(labMode);
        }
    }

    setInterval(refreshLabWindowIfNeeded, 1000);
	
// -------------------------------------------------
// FENETRE HTML "PARAMETRES / OPTIONS" (version Flash)
// -------------------------------------------------
let settingsWindowInitialized = false;
let settingsWindowVisible = false;

const SETTINGS_DEFAULTS = {
    SHOW_BACKGROUND: true,
    SHOW_CARGO_BOXES: true,
    SHOW_DRONES: true,
    SHOW_RESOURCES: true,
    SHOW_BONUS_BOXES: true,
    SHOW_PLAYER_NAMES: true,
    PLAY_MUSIC: true,
    PLAY_SFX: true
};

let appliedSettings = { ...SETTINGS_DEFAULTS };

function getCurrentSettingsSnapshot() {
    return {
        SHOW_BACKGROUND: typeof backgroundLayersEnabled === 'boolean' ? backgroundLayersEnabled : SETTINGS_DEFAULTS.SHOW_BACKGROUND,
        SHOW_CARGO_BOXES: !!(VISIBILITY_SETTINGS.freeCargo && VISIBILITY_SETTINGS.notFreeCargo),
        SHOW_DRONES: typeof setting_show_drones !== 'undefined' ? !!setting_show_drones : SETTINGS_DEFAULTS.SHOW_DRONES,
        SHOW_RESOURCES: typeof VISIBILITY_SETTINGS.ore !== 'undefined' ? !!VISIBILITY_SETTINGS.ore : SETTINGS_DEFAULTS.SHOW_RESOURCES,
        SHOW_BONUS_BOXES: typeof VISIBILITY_SETTINGS.bonusBoxes !== 'undefined' ? !!VISIBILITY_SETTINGS.bonusBoxes : SETTINGS_DEFAULTS.SHOW_BONUS_BOXES,
        SHOW_PLAYER_NAMES: typeof setting_show_player_names !== 'undefined' ? !!setting_show_player_names : SETTINGS_DEFAULTS.SHOW_PLAYER_NAMES,
        PLAY_MUSIC: typeof setting_play_music !== 'undefined' ? !!setting_play_music : SETTINGS_DEFAULTS.PLAY_MUSIC,
        PLAY_SFX: typeof setting_play_sfx !== 'undefined' ? !!setting_play_sfx : SETTINGS_DEFAULTS.PLAY_SFX
    };
}

function applySettingsState(newState) {
    appliedSettings = { ...appliedSettings, ...newState };

    backgroundLayersEnabled = !!appliedSettings.SHOW_BACKGROUND;

    VISIBILITY_SETTINGS.freeCargo = !!appliedSettings.SHOW_CARGO_BOXES;
    VISIBILITY_SETTINGS.notFreeCargo = !!appliedSettings.SHOW_CARGO_BOXES;
    VISIBILITY_SETTINGS.ore = !!appliedSettings.SHOW_RESOURCES;
    VISIBILITY_SETTINGS.bonusBoxes = !!appliedSettings.SHOW_BONUS_BOXES;

    setting_show_drones = !!appliedSettings.SHOW_DRONES;
    setting_show_player_names = !!appliedSettings.SHOW_PLAYER_NAMES;
    setting_play_music = !!appliedSettings.PLAY_MUSIC;
    setting_play_sfx = !!appliedSettings.PLAY_SFX;

    if (typeof sendSetting === 'function') {
        sendSetting('SHOW_DRONES', appliedSettings.SHOW_DRONES ? 1 : 0);
        sendSetting('DISPLAY_FREE_CARGO_BOXES', appliedSettings.SHOW_CARGO_BOXES ? 1 : 0);
        sendSetting('DISPLAY_NOT_FREE_CARGO_BOXES', appliedSettings.SHOW_CARGO_BOXES ? 1 : 0);
        sendSetting('DISPLAY_ORE', appliedSettings.SHOW_RESOURCES ? 1 : 0);
        sendSetting('DISPLAY_BONUS_BOXES', appliedSettings.SHOW_BONUS_BOXES ? 1 : 0);
        sendSetting('DISPLAY_PLAYER_NAMES', appliedSettings.SHOW_PLAYER_NAMES ? 1 : 0);
        sendSetting('PLAY_MUSIC', appliedSettings.PLAY_MUSIC ? 1 : 0);
        sendSetting('PLAY_SFX', appliedSettings.PLAY_SFX ? 1 : 0);
        sendSetting('DISPLAY_WINDOW_BACKGROUND', appliedSettings.SHOW_BACKGROUND ? 1 : 0);
    }
}

function applySettingsToUi(win, state) {
    const checkboxes = win.querySelectorAll('input[data-setting-key]');
    checkboxes.forEach(cb => {
        const key = cb.getAttribute('data-setting-key');
        cb.checked = !!state[key];
    });
}

function initSettingsWindow() {
    if (settingsWindowInitialized) return;
    settingsWindowInitialized = true;

    const style = document.createElement('style');
    style.innerHTML = `
        #settingsWindow {
            position: absolute;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            width: 420px;
            height: 300px;
            background: #0c131c;
            border: 1px solid #3a5168;
            box-shadow: 0 0 10px rgba(0,0,0,0.8);
            color: #b6d8ff;
            font-family: Arial, sans-serif;
            font-size: 11px;
            z-index: 1500;
            display: none;
        }

        #settingsWindow .settingsHeader {
            height: 26px;
            background: linear-gradient(#0f1822, #0a1018);
            display: flex;
            align-items: center;
            padding: 0 6px;
            border-bottom: 1px solid #1d2a36;
            user-select: none;
        }

        #settingsWindow .settingsHeader .windowHeaderIcon {
            width: 20px;
            height: 20px;
            margin-right: 6px;
			cursor: pointer;
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            background-image: url('graphics/ui/window1/images/8_settings_icon.png.png');
        }

        #settingsWindow .settingsTitle { font-weight: bold; font-size: 12px; color: #d1ecff; }

        

        #settingsWindow .settingsTabs { display: flex; height: 28px; border-bottom: 1px solid #1d2a36; }
        #settingsWindow .settingsTabBtn { flex: 1; background: #132032; color: #cde8ff; border: 1px solid #24374b; border-bottom: none; cursor: pointer; }
        #settingsWindow .settingsTabBtn.active { background: #1e3045; color: #fff; }

        #settingsWindow .settingsBody { position: absolute; top: 55px; bottom: 42px; left: 0; right: 0; padding: 6px 10px; }
        #settingsWindow .settingsTabPage { display: none; height: 100%; }
        #settingsWindow .settingsTabPage.active { display: block; }

        #settingsWindow .settingsRow { display: flex; align-items: center; gap: 6px; margin: 6px 0; }
        #settingsWindow .settingsRow span { color: #d1ecff; }

        #settingsWindow .settingsFooter { position: absolute; bottom: 6px; left: 0; right: 0; display: flex; justify-content: flex-end; gap: 6px; padding: 0 10px; }
        #settingsWindow .settingsFooter .doButton { min-width: 70px; height: 24px; }
    `;
    document.head.appendChild(style);

    const win = document.createElement('div');
    win.id = 'settingsWindow';
    win.innerHTML = `
        <div class="settingsHeader">
            <div class="windowHeaderIcon"></div>
            <div class="settingsTitle">Settings</div>
            
        </div>
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
            </div>
            <div class="settingsTabPage" data-tab="sound">
                <label class="settingsRow"><input type="checkbox" data-setting-key="PLAY_MUSIC"><span>Play music</span></label>
                <label class="settingsRow"><input type="checkbox" data-setting-key="PLAY_SFX"><span>Play sound effects</span></label>
            </div>
        </div>
        <div class="settingsFooter">
            <button class="doButton" id="settingsBtnSave">Save</button>
            <button class="doButton" id="settingsBtnCancel">Cancel</button>
            <button class="doButton" id="settingsBtnReset">Reset</button>
        </div>
    `;
    document.body.appendChild(win);

    const tabButtons = Array.from(win.querySelectorAll('.settingsTabBtn'));
    const tabPages = Array.from(win.querySelectorAll('.settingsTabPage'));
    
    const saveBtn = document.getElementById('settingsBtnSave');
    const cancelBtn = document.getElementById('settingsBtnCancel');
    const resetBtn = document.getElementById('settingsBtnReset');

    const setActiveTab = (tab) => {
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        tabPages.forEach(page => page.classList.toggle('active', page.dataset.tab === tab));
    };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    const getUiState = () => {
        const state = { ...SETTINGS_DEFAULTS };
        win.querySelectorAll('input[data-setting-key]').forEach(cb => {
            state[cb.getAttribute('data-setting-key')] = cb.checked;
        });
        return state;
    };

    const closeWindow = () => {
        settingsWindowVisible = false;
        win.style.display = 'none';
    };

const headerIcon = win.querySelector('.settingsHeader .windowHeaderIcon');
if (headerIcon) {
    headerIcon.addEventListener('click', closeWindow);
}
    
    cancelBtn.addEventListener('click', () => {
        applySettingsToUi(win, appliedSettings);
        closeWindow();
    });
    saveBtn.addEventListener('click', () => {
        applySettingsState(getUiState());
        closeWindow();
    });
    resetBtn.addEventListener('click', () => {
        applySettingsState(SETTINGS_DEFAULTS);
        applySettingsToUi(win, appliedSettings);
    });

    applySettingsToUi(win, appliedSettings);

    if (typeof makeElementDraggable === 'function') {
        const header = win.querySelector('.settingsHeader');
        makeElementDraggable(win, header);
    }
}

function toggleSettingsWindow() {
    if (!settingsWindowInitialized) {
        appliedSettings = getCurrentSettingsSnapshot();
        initSettingsWindow();
    }

    const w = document.getElementById('settingsWindow');
    if (!w) return;

    if (settingsWindowVisible) {
        settingsWindowVisible = false;
        w.style.display = 'none';
        return;
    }

    appliedSettings = getCurrentSettingsSnapshot();
    applySettingsToUi(w, appliedSettings);
    settingsWindowVisible = true;
    w.style.display = 'block';
}

window.toggleSettingsWindow = toggleSettingsWindow;
// -------------------------------------------------
    // FENETRE HTML "MISSIONS / QUETES"
    // -------------------------------------------------
    let questWindowInitialized = false;
let lastQuestSignature = "";

function initQuestWindow() {
    if (questWindowInitialized) return;
    questWindowInitialized = true;

    const style = document.createElement("style");
    const questTop  = (WINDOW_DEFAULT_POS.quest && WINDOW_DEFAULT_POS.quest.top)  || 120;
    const questLeft = (WINDOW_DEFAULT_POS.quest && WINDOW_DEFAULT_POS.quest.left) || 0;
	const questIconPath = (window.UI_SPRITES && UI_SPRITES.mainMenuIconQuest)
    ? UI_SPRITES.mainMenuIconQuest
    : "graphics/ui/window1/images/10_quest_icon.png.png";


    style.innerHTML = `
        #questWindow {
            position: absolute;
            top: ${questTop}px;
            left: ${questLeft}px;
            width: 500px;
            height: 380px;
            padding: 8px;
            background: #0b1118;
            border: 1px solid #202a33;
            box-shadow: 0 0 8px rgba(0,0,0,0.7);
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #e0efff;
            display: none;
            z-index: 1200;
        }

        .questHeader {
            height: 24px;
            background: #151515;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 4px;
            font-size: 12px;
        }

        .questHeaderLeft {
            display: flex;
            align-items: center;
        }

        /* Icône en haut à gauche (même icône que le bouton Missions) */
#questWindow .windowHeaderIcon {
    width: 22px;
    height: 22px;
    margin-right: 6px;
    background-size: 90% 90%;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 4px;
    box-shadow: 0 0 4px #000;
    cursor: pointer;
    flex-shrink: 0;
    background-image: url("${questIconPath}");
}
#questWindow .windowHeaderIcon:hover {
    box-shadow: 0 0 6px #0ff;
}


        .questTitleBar {
            font-weight: bold;
        }

        .questClose {
            cursor: pointer;
            padding: 0 4px;
        }

        .questBody {
            display: flex;
            margin-top: 6px;
            height: calc(100% - 28px);
        }

        .questListPane {
            width: 180px;
            border-right: 1px solid #333;
            padding-right: 6px;
            overflow-y: auto;
        }

        #questList {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        #questList li {
            padding: 3px 4px;
            cursor: pointer;
            border-bottom: 1px solid #222;
        }

        #questList li:hover {
            background: rgba(255,255,255,0.08);
        }

        #questList li.activeQuest {
            background-image: url("assets/spirites/DefineSprite_131_CellRenderer_selectedOverSkin_CellRenderer_selectedOverSkin/1.png");
            background-size: 100% 100%;
        }

        #questList li.disabledQuest {
            color: #777;
        }

        #questList li.disabledQuest.activeQuest {
            background-image: url("assets/spirites/DefineSprite_132_CellRenderer_selectedDisabledSkin_CellRenderer_selectedDisabledSkin/1.png");
            background-size: 100% 100%;
        }

        .questDetailPane {
            flex: 1;
            padding-left: 8px;
            overflow-y: auto;
        }

        #questDetailTitle {
            color: #00ffcc;
            font-weight: bold;
            margin-bottom: 4px;
        }

        #questDetailCategory {
            color: #999;
            margin-bottom: 8px;
        }

        #questObjectives {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        #questObjectives li {
            margin-bottom: 3px;
        }

        .questObjectiveDone {
            color: #55ff55;
        }

        .questObjectiveRunning {
            color: #ffff55;
        }

        .questObjectiveHidden {
            color: #555;
        }

        .questButtons {
            margin-top: 10px;
        }

        .questButtons button {
            margin-right: 6px;
            padding: 4px 8px;
            background: #4a6b8c;
            color: white;
            border: none;
            cursor: pointer;
        }

        .questButtons button:hover {
            background: #5a7b9c;
        }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.id = "questWindow";
    div.innerHTML = `
        <div class="questHeader" id="questWindowHeader">
    <div class="questHeaderLeft">
        <div class="windowHeaderIcon" id="header_icon_quest"></div>
        <span class="questTitleBar">Missions / Quêtes</span>
    </div>
</div>

        <div class="questBody">
            <div class="questListPane">
                <ul id="questList"></ul>
            </div>
            <div class="questDetailPane">
                <div id="questDetailTitle">Aucune quête sélectionnée</div>
                <div id="questDetailCategory"></div>
                <ul id="questObjectives"></ul>
                <div class="questButtons">
                    <button id="questBtnAccept" class="doButton">Accepter / Continuer</button>
                    <button id="questBtnCancel" class="doButton">Annuler</button>
                    <button id="questBtnTurnIn" class="doButton">Valider (si terminée)</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    // Fermeture via l’icône en haut à gauche (comme les autres fenêtres)
const questHeaderIcon = document.getElementById("header_icon_quest");
if (questHeaderIcon) {
    // Empêche le drag quand on clique sur l'icône
    questHeaderIcon.addEventListener("mousedown", (e) => e.stopPropagation());
    questHeaderIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof toggleWindow === "function") {
            toggleWindow("quest", false);
        } else {
            div.style.display = "none";
        }
    });
}


    // Drag de la fenêtre par la barre du haut
    const questHeader = document.getElementById("questWindowHeader");
    if (questHeader && typeof makeElementDraggable === "function") {
        makeElementDraggable(div, questHeader);
    }

    const btnAccept = document.getElementById("questBtnAccept");
    const btnCancel = document.getElementById("questBtnCancel");
    const btnTurnIn = document.getElementById("questBtnTurnIn");

    btnAccept.addEventListener("click", () => {
        if (privilegedQuestId != null) {
            sendQuestAccept(privilegedQuestId);
        }
    });

    btnCancel.addEventListener("click", () => {
        if (privilegedQuestId != null) {
            sendQuestCancel(privilegedQuestId);
        }
    });

    btnTurnIn.addEventListener("click", () => {
        if (privilegedQuestId != null) {
            sendQuestTurnIn(privilegedQuestId);
        }
    });

    // Clic sur une ligne de la liste des quêtes
    div.addEventListener("click", (ev) => {
        const li = ev.target.closest("li[data-quest-id]");
        if (!li) return;
        const id = parseInt(li.getAttribute("data-quest-id"), 10);
        if (!isNaN(id)) {
            privilegeQuestById(id);
        }
    });

    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}



    function toggleQuestWindow() {
        const w = document.getElementById('questWindow');
        if (!w) return;
        if (w.style.display === 'none' || !w.style.display) {
            w.style.display = 'block';
            renderQuestWindow();
        } else {
            w.style.display = 'none';
        }
    }

    function renderQuestWindow() {
        const w = document.getElementById('questWindow');
        if (!w || w.style.display === 'none') return;

        const listUl = document.getElementById('questList');
        const detailTitle = document.getElementById('questDetailTitle');
        const detailCat = document.getElementById('questDetailCategory');
        const objectivesUl = document.getElementById('questObjectives');
        const btnAccept = document.getElementById('questBtnAccept');
        const btnCancel = document.getElementById('questBtnCancel');
        const btnTurnIn = document.getElementById('questBtnTurnIn');

        if (!listUl || !detailTitle || !objectivesUl) return;

        listUl.innerHTML = "";
        objectivesUl.innerHTML = "";

        const ids = Object.keys(quests).map(x => parseInt(x, 10)).sort((a, b) => a - b);

        if (ids.length === 0) {
            detailTitle.textContent = "Aucune quête disponible";
            detailCat.textContent = "Acceptez des missions pour commencer";
            if (btnAccept) btnAccept.disabled = true;
            if (btnCancel) btnCancel.disabled = true;
            if (btnTurnIn) btnTurnIn.disabled = true;
            return;
        }

        if (privilegedQuestId == null || !quests[privilegedQuestId]) {
            privilegedQuestId = ids[0];
        }

        for (const id of ids) {
            const q = quests[id];
            const li = document.createElement('li');
            li.setAttribute('data-quest-id', id.toString());
            li.textContent = q.title || ("Quête " + id);

            if (id === privilegedQuestId) {
                li.classList.add('activeQuest');
            }
            listUl.appendChild(li);
        }

        const activeQuest = quests[privilegedQuestId];
        if (!activeQuest) {
            detailTitle.textContent = "Aucune quête sélectionnée";
            detailCat.textContent = "";
            return;
        }

        detailTitle.textContent = activeQuest.title || ("Quête " + activeQuest.id);
        detailCat.textContent = "Catégorie : " + (activeQuest.category || "std");

        const questState = getQuestState(activeQuest);
        if (btnAccept) {
            btnAccept.textContent = questState.hasRunning ? "Continuer" : "Accepter";
            btnAccept.disabled = questState.hasRunning;
        }
        if (btnCancel) {
            btnCancel.disabled = !questState.hasRunning;
        }
        if (btnTurnIn) {
            btnTurnIn.disabled = !questState.readyToTurnIn;
        }

        const condIds = Object.keys(activeQuest.flatConditions).map(x => parseInt(x, 10)).sort((a, b) => a - b);

        for (const condId of condIds) {
            const c = activeQuest.flatConditions[condId];
            const li = document.createElement('li');

            let cssClass = "";
            if (c.visibility === 0) {
                cssClass = "questObjectiveHidden";
            } else if (isConditionCompleted(c)) {
                cssClass = "questObjectiveDone";
            } else if (c.runstate) {
                cssClass = "questObjectiveRunning";
            }

            if (cssClass) li.classList.add(cssClass);

            const progress = (c.target > 0) ? `${c.current}/${c.target}` : `${c.current}`;
            const description = c.description || c.modifier || `type=${c.typeKey}`;

            li.textContent = c.visibility === 0
                ? "???"
                : `[#${c.id}] ${description}${progress ? " — " + progress : ""}`;

            objectivesUl.appendChild(li);
        }
    }

    function computeQuestSignature() {
        const ids = Object.keys(quests)
            .map((x) => parseInt(x, 10))
            .sort((a, b) => a - b);
        const payload = ids.map((id) => {
            const q = quests[id];
            if (!q) return null;
            const conds = Object.values(q.flatConditions || {})
                .map((c) => `${c.id}:${c.current}/${c.target}:${c.visibility}:${c.runstate}`)
                .join('|');
            return `${id}:${q.title || ''}:${q.category || ''}:${conds}`;
        });
        return JSON.stringify(payload);
    }

    setInterval(() => {
        const signature = computeQuestSignature();
        if (signature !== lastQuestSignature) {
            lastQuestSignature = signature;
            renderQuestWindow();
        }
    }, 500);


    // ========================================================
    // INTERFACE SPACEBALL (Scoreboard) - Avec bouton Fermer
    // ========================================================
    function initSpaceballHUD() {
        const style = document.createElement('style');
        style.innerHTML = `
            #sbWindow {
                position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
                width: 300px; height: auto;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #444;
                color: white; font-family: Consolas, monospace; font-size: 14px;
                display: none; 
                flex-direction: column; z-index: 900;
                padding: 5px;
            }
            .sbHeader { display: flex; justify-content: space-between; border-bottom: 1px solid #555; margin-bottom: 5px; padding-bottom: 2px; }
            .sbTitle { color: #ffff00; font-weight: bold; }
            .sbClose { cursor: pointer; color: #ff4444; font-weight: bold; padding: 0 5px; }
            .sbClose:hover { color: #ff0000; background: rgba(255,255,255,0.1); }
            
            .sbRow { display: flex; justify-content: space-between; margin: 2px 0; }
            .sbMmo { color: #ff9933; }
            .sbEic { color: #00aaff; }
            .sbVru { color: #00ff00; }
            .sbInfo { font-size: 11px; color: #ccc; text-align: center; margin-top: 4px;}
        `;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.id = 'sbWindow';
        div.innerHTML = `
            <div class="sbHeader">
                <span class="sbTitle">SPACEBALL</span>
                <span class="sbClose" id="sbCloseBtn">[x]</span>
            </div>
            <div class="sbRow"><span class="sbMmo">MMO</span> <span id="sbScore1">0</span></div>
            <div class="sbRow"><span class="sbEic">EIC</span> <span id="sbScore2">0</span></div>
            <div class="sbRow"><span class="sbVru">VRU</span> <span id="sbScore3">0</span></div>
            <div class="sbInfo" id="sbStatus">En attente...</div>
        `;
        document.body.appendChild(div);

        // Gestion du clic sur la croix
        document.getElementById('sbCloseBtn').addEventListener('click', () => {
            div.style.display = 'none';
        });
    }
	// ========================================================
    // INTERFACE JOURNAL DE BORD (LOG UTILISATEUR)
    // ========================================================
function initGameLogWindow() {
    if (document.getElementById('gameLogWindow')) return;

    const pos = (window.WINDOW_DEFAULT_POS && WINDOW_DEFAULT_POS.log)
        ? WINDOW_DEFAULT_POS.log
        : { top: 360, left: 70 };

    const styleId = "gameLogWindowStyle";
    if (!document.getElementById(styleId)) {
        const bgImg = (window.UI_SPRITES && (UI_SPRITES.windowBg || UI_SPRITES.chatBg)) ? (UI_SPRITES.windowBg || UI_SPRITES.chatBg) : "";
        const headerImg = (window.UI_SPRITES && UI_SPRITES.windowHeader) ? UI_SPRITES.windowHeader : "";
        const sideImg = (window.UI_SPRITES && UI_SPRITES.windowSide) ? UI_SPRITES.windowSide : "";
        const iconImg = (window.UI_SPRITES && UI_SPRITES.mainMenuIconLog) ? UI_SPRITES.mainMenuIconLog : "graphics/ui/window1/images/16_log_icon.png.png";

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            #gameLogWindow {
                position: absolute;
                top: ${pos.top}px;
                left: ${pos.left}px;
                width: 285px;
                height: 160px;

                /* ✅ Même fond que les autres fenêtres */
                background: transparent;
                ${bgImg ? `background-image: url('${bgImg}');` : "background: rgba(0,0,0,0.75);"}
                background-repeat: no-repeat;
                background-size: 100% 100%;

                border: 1px solid #4a6b8c;
                ${sideImg ? `border-image: url('${sideImg}') 4 fill stretch;` : ""}
                box-shadow: 0 0 8px #000;

                display: flex;
                flex-direction: column;
                z-index: 1150;
                pointer-events: auto;
                font-family: Arial, sans-serif;
                font-size: 11px;
            }

            #gameLogWindow .logHeader {
                height: 24px;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0 6px;

                /* ✅ Même header skin */
                background: transparent;
                ${headerImg ? `background-image: url('${headerImg}');` : "background: rgba(0,0,0,0.85);"}
                background-repeat: no-repeat;
                background-size: 100% 100%;

                border-bottom: 1px solid #4a6b8c;
                cursor: move;
                user-select: none;
            }
			            /* Icône du coin (pas grisée au repos, glow au survol) */
            #gameLogWindow #header_icon_log{
                opacity: 1 !important;
                filter: brightness(1.25) contrast(1.05) saturate(1.2) !important;
            }
            #gameLogWindow #header_icon_log:hover{
                filter: brightness(1.4) contrast(1.1) saturate(1.4) drop-shadow(0 0 5px #0ff) !important;
            }


            /* ✅ Titre bleu comme PILOT SHEET */
            #gameLogWindow .logTitle {
                color: #00aaff;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 0 #000;
            }

            #gameLogWindow .logHeader .logIcon {
                width: 16px;
                height: 16px;
                background-image: url('${iconImg}');
                background-repeat: no-repeat;
                background-size: 16px 16px;
                cursor: pointer;
                filter: drop-shadow(0 0 0px #00aaff);
            }

            /* ✅ “illumination” au hover */
            #gameLogWindow .logHeader .logIcon:hover {
                filter: drop-shadow(0 0 6px #00aaff);
            }

            #gameLogWindow #logContent {
                flex: 1;
                overflow-y: auto;
                padding: 6px;

                /* ✅ Laisse voir le windowBg (pas de gris par-dessus) */
                background: transparent;

                color: #cfefff;
                text-shadow: 1px 1px 0 #000;
            }

            #gameLogWindow #logContent::-webkit-scrollbar { width: 4px; }
            #gameLogWindow #logContent::-webkit-scrollbar-thumb { background: #00aaff; }

            #gameLogWindow .logEntry { margin-bottom: 2px; }
            #gameLogWindow .logEntry .time { color: #666; margin-right: 4px; font-size: 10px; }
            #gameLogWindow .logEntry .text { color: #bde5ff; }
        `;
        document.head.appendChild(style);
    }

    const logDiv = document.createElement("div");
    logDiv.id = "gameLogWindow";
    logDiv.innerHTML = `
        <div class="logHeader" id="logHeaderBar">
            <div class="logIcon" id="header_icon_log"></div>
            <span class="logTitle">Log</span>
        </div>
        <div id="logContent">
            <div class="logEntry"><span class="text">Système prêt.</span></div>
        </div>
    `;
    document.body.appendChild(logDiv);

    // Fermer via l’icône (comme tu veux)
    const headerIcon = document.getElementById("header_icon_log");
    if (headerIcon) headerIcon.addEventListener("click", () => toggleWindow("log", false));

    // Drag (si ta fonction existe déjà)
    const header = document.getElementById("logHeaderBar");
    if (header && typeof makeElementDraggable === "function") {
        makeElementDraggable(logDiv, header);
    }
}





 
    // Fonction interne pour ajouter une ligne au journal
    function addLogEntry(text) {
        const container = document.getElementById('logContent');
        if (!container) return;

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

        const div = document.createElement('div');
        div.className = 'logEntry';
        div.innerHTML = `<span class="time">[${timeStr}]</span> <span class="text">${text}</span>`;
        
        container.appendChild(div);
        
        // --- CORRECTION : AUTO-SCROLL ---
        // On force la barre de défilement tout en bas
        container.scrollTop = container.scrollHeight;
    }
    
    function updateSpaceballHUD(mmo, eic, vru, speed, owner) {
        const win = document.getElementById('sbWindow');
        if(!win) return;
        
        // Si on reçoit des données, on affiche la fenêtre
        win.style.display = 'flex';
        
        if (mmo !== null) document.getElementById('sbScore1').innerText = mmo;
        if (eic !== null) document.getElementById('sbScore2').innerText = eic;
        if (vru !== null) document.getElementById('sbScore3').innerText = vru;
        
        if (owner !== null || speed !== null) {
            const lbl = document.getElementById('sbStatus');
            if (owner === 0) lbl.innerText = "Balle neutre";
            else if (owner === 1) lbl.innerText = "MMO a la balle !";
            else if (owner === 2) lbl.innerText = "EIC a la balle !";
            else if (owner === 3) lbl.innerText = "VRU a la balle !";
        }
    }
    
	
	// --- SAUVEGARDE DE L'INTERFACE ---
    function saveInterfaceLayout() {
        const drawer = document.getElementById("actionDrawerContainer");
        let drawerMode = 0; // 0=Hori, 1=Grid, 2=Vert
        if (drawer) {
            if (drawer.classList.contains("grid")) drawerMode = 1;
            else if (drawer.classList.contains("vertical")) drawerMode = 2;
        }

        const layoutData = {
            // Quickbar (Canvas)
            qb: {
                x: quickbarPosition.x,
                y: quickbarPosition.y,
                mode: quickbarLayoutMode, // 0,1,2,3
                locked: quickbarLocked,
                minimized: quickbarMinimized
            },
            // Minimap (Canvas)
            mm: {
                x: minimapPosition ? minimapPosition.x : null,
                y: minimapPosition ? minimapPosition.y : null,
                open: !!windowStates.map,
                scale: minimapScaleFactor
            },
            // Action Drawer (HTML)
            ad: {
                x: drawer ? drawer.offsetLeft : (window.innerWidth/2 - 300),
                y: drawer ? drawer.offsetTop : 450,
                mode: drawerMode,
                cat: actionDrawerCategory
            }
        };
        localStorage.setItem("andromeda_layout_v1", JSON.stringify(layoutData));
    }

    // --- CHARGEMENT DE L'INTERFACE ---
    function loadInterfaceLayout() {
        const raw = localStorage.getItem("andromeda_layout_v1");
        if (!raw) return; // Pas de sauvegarde, on garde les défauts

        try {
            const data = JSON.parse(raw);

            // 1. Appliquer Quickbar
            if (data.qb) {
                quickbarPosition.x = data.qb.x;
                quickbarPosition.y = data.qb.y;
                quickbarLayoutMode = data.qb.mode || 0;
                quickbarVertical = (quickbarLayoutMode === 1); // Important pour drawQuickbar
                quickbarLocked = data.qb.locked;
                quickbarMinimized = !!data.qb.minimized;
                quickbarInitialized = true; // Empêche le centrage auto au démarrage
            }

            if (data.mm) {
                if (data.mm.x != null && data.mm.y != null) {
                    minimapPosition = { x: data.mm.x, y: data.mm.y };
                }
                if (typeof data.mm.open === 'boolean') {
                    windowStates.map = data.mm.open;
                    window.showMinimap = data.mm.open;
                }
                if (data.mm.scale) {
                    setMinimapScale(data.mm.scale, { forceSend: false });
                }
            }

            // 2. Appliquer Action Drawer
            const drawer = document.getElementById("actionDrawerContainer");
            if (data.ad && drawer) {
                drawer.style.left = data.ad.x + "px";
                drawer.style.top  = data.ad.y + "px";
                drawer.style.transform = "none"; // Enlève le centrage CSS
                
                // Appliquer le mode (Horizontal/Grid/Vertical)
                drawer.classList.remove("grid", "vertical");
                if (data.ad.mode === 1) {
                    drawer.classList.add("grid");
                    drawer.style.width = "250px";
                } else if (data.ad.mode === 2) {
                    drawer.classList.add("vertical");
                    drawer.style.width = "auto";
                } else {
                    drawer.style.width = "600px";
                }

                // Catégorie active
                if (data.ad.cat) {
                    actionDrawerCategory = data.ad.cat;
                    // Mise à jour visuelle des onglets
                    const tabs = document.querySelectorAll('.adTab');
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        if(t.dataset.cat === actionDrawerCategory) t.classList.add('active');
                    });
                    renderActionDrawerItems();
                }
            }

        } catch (e) {
            console.error("Erreur chargement layout:", e);
        }
    }


    // -------------------------------------------------
    // 10.5 FENETRE GROUPE (LOGIQUE ISSUE DU CLIENT FLASH)
    // -------------------------------------------------

    let groupWindowEl = null;
    let groupListEl = null;
    let groupInvitesEl = null; 
    let groupInviteControlsEl = null;
    let groupSessionControlsEl = null;
	let groupBlockInvitesBtnEl = null;
	let groupBlockInvitesImgEl = null;
	let groupBlockInvitesHover = false;
	let selectedGroupMemberId = null;
let groupPromoteBtnEl = null;
let groupKickBtnEl = null;
let groupActionMode = null; // 'follow' | 'promote' | 'kick' | null
let groupFollowBtnEl = null;


    let lastGroupSignature = "";
    const groupRowCache = new Map();

    function isHeroGroupLeader() {
        const myId = parseInt(heroId, 10);
        return !isNaN(myId) && groupLeaderId === myId;
    }
	
	function updateGroupBlockInvitesButton() {
    if (!groupBlockInvitesBtnEl || !groupBlockInvitesImgEl) return;

    const blocked = !!groupInvitesBlocked;

    // Si blocked = true -> on affiche le bouton "Allow invites"
    const std = blocked
        ? 'graphics/ui/ui/images/136_btn_allowinv_std.png.png'
        : 'graphics/ui/ui/images/133_btn_blockinv_std.png.png';

    const mo = blocked
        ? 'graphics/ui/ui/images/137_btn_allowinv_mo.png.png'
        : 'graphics/ui/ui/images/134_btn_blockinv_mo.png.png';

    const tip = blocked ? 'Allow invites' : 'Block invites';

    groupBlockInvitesBtnEl.title = tip;
    groupBlockInvitesImgEl.alt = tip;
    groupBlockInvitesImgEl.src = groupBlockInvitesHover ? mo : std;
}


    function createGroupActionButton(label, onClick) {
        const btn = document.createElement('button');
        btn.className = 'groupButton groupActionButton';
        btn.textContent = label;
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            onClick();
        });
        return btn;
    }

    function sendGroupFollow(targetId, targetName) {
    const myId = parseInt(heroId, 10);
    if (!targetId || targetId === myId) return;

    const mem = (typeof groupMembers !== "undefined") ? groupMembers[targetId] : null;

    // Si on a les coords du membre, on fait un move normal (pas de ps|flw => pas de TP)
    if (mem && typeof mem.posX === "number" && typeof mem.posY === "number") {
        // Si tu veux éviter de suivre quelqu’un sur une autre map
        if (typeof currentMapId !== "undefined" && mem.mapId && mem.mapId !== currentMapId) {
            addInfoMessage(`${mem.name || targetName} est sur une autre carte.`);
            return;
        }

        // Optionnel : si accessible, on synchronise la destination côté client (comme un clic map)
        try {
            moveTargetX = mem.posX;
            moveTargetY = mem.posY;
            isChasingTarget = false;
			moveTargetFromMinimap = false;
        } catch (e) {}

        if (typeof sendMoveToServer === "function") {
            sendMoveToServer(mem.posX, mem.posY);
            addInfoMessage(`Suivi de ${mem.name || targetName || "ce membre"}…`);
            return;
        }
    }

    // Fallback si jamais pas de coords (normalement tu ne devrais pas passer ici)
    sendRaw(`ps|flw|${targetId}`);
    if (targetName) addInfoMessage(`Suivi de ${targetName} demandé.`);
}


    function sendGroupChangeLeader(targetId, targetName) {
        const myId = parseInt(heroId, 10);
        if (!targetId || targetId === myId) return;
        sendRaw(`ps|lc|${targetId}`);
        if (targetName) {
            addInfoMessage(`${targetName} sera nommé chef du groupe.`);
        }
    }

    function sendGroupKick(targetId, targetName) {
        const myId = parseInt(heroId, 10);
        if (!targetId || targetId === myId) return;
        sendRaw(`ps|kick|${targetId}`);
        if (targetName) {
            addInfoMessage(`Demande d'exclure ${targetName} envoyée.`);
        }
    }

    function sendGroupPingUser(targetId, targetName) {
        if (!targetId) return;
        sendRaw(`ps|png|usr|${targetId}`);
        if (targetName) {
            addInfoMessage(`Ping vers ${targetName} envoyé.`);
        }
    }
	function updateGroupLeaderButtons() {
    if (!groupPromoteBtnEl || !groupKickBtnEl) return;

    const leader = isHeroGroupLeader();

    // visibles seulement si je suis chef
    groupPromoteBtnEl.classList.toggle('hidden', !leader);
    groupKickBtnEl.classList.toggle('hidden', !leader);

    // plus de sélection nécessaire (Flash-like)
    groupPromoteBtnEl.disabled = false;
    groupKickBtnEl.disabled = false;

    // si je ne suis plus chef, on coupe promote/kick
    if (!leader && (groupActionMode === 'promote' || groupActionMode === 'kick')) {
        clearGroupActionMode();
    }
}

function setGroupActionMode(mode) {
    groupActionMode = mode;

    // visuel + état
    if (groupWindowEl) {
    groupWindowEl.classList.toggle('followMode', mode === 'follow');
    groupWindowEl.classList.toggle('promoteMode', mode === 'promote');
    groupWindowEl.classList.toggle('kickMode', mode === 'kick');
}

    if (groupFollowBtnEl) groupFollowBtnEl.classList.toggle('active', mode === 'follow');
    if (groupPromoteBtnEl) groupPromoteBtnEl.classList.toggle('active', mode === 'promote');
    if (groupKickBtnEl) groupKickBtnEl.classList.toggle('active', mode === 'kick');
}

function clearGroupActionMode() {
    setGroupActionMode(null);
}
function formatMapIdShort(mapId) {
    switch (mapId) {
        case 1:  return "1-1";
        case 2:  return "1-2";
        case 3:  return "1-3";
        case 4:  return "1-4";
        case 5:  return "2-1";
        case 6:  return "2-2";
        case 7:  return "2-3";
        case 8:  return "2-4";
        case 9:  return "3-1";
        case 10: return "3-2";
        case 11: return "3-3";
        case 12: return "3-4";
        case 13: return "4-1";
        case 14: return "4-2";
        case 15: return "4-3";
        case 16: return "4-4";
        case 17: return "1-5";
        case 18: return "1-6";
        case 19: return "1-7";
        case 20: return "1-8";
        case 21: return "2-5";
        case 22: return "2-6";
        case 23: return "2-7";
        case 24: return "2-8";
        default: return null;
    }
}


    function renderGroupList() {
        if (!groupListEl) return;
		updateGroupBlockInvitesButton();

        const memberIds = Object.keys(groupMembers);
        const inGroup = (groupLeaderId !== null) || (memberIds.length > 0);
		if (!isHeroGroupLeader()) selectedGroupMemberId = null;
if (selectedGroupMemberId !== null && !groupMembers[selectedGroupMemberId]) selectedGroupMemberId = null;
updateGroupLeaderButtons();



        const toggleSection = (el, hidden) => {
            if (!el) return;
            el.classList.toggle('hidden', hidden);
        };

        toggleSection(groupSessionControlsEl, !inGroup);
        toggleSection(groupListEl, !inGroup);
        toggleSection(groupInviteControlsEl, false);
		renderGroupInvitations();

		if (groupWindowEl) groupWindowEl.classList.toggle('groupNoGroup', !inGroup);
		if (groupWindowEl) groupWindowEl.classList.toggle('groupInGroup', inGroup);


        if (!inGroup) {
            groupListEl.innerHTML = '';
            groupRowCache.clear();
            return;
        }

        const emptyNode = groupListEl.querySelector('.groupEmpty');
        if (emptyNode) {
            emptyNode.remove();
        }

        Array.from(groupRowCache.keys()).forEach((id) => {
            if (!groupMembers[id]) {
                const row = groupRowCache.get(id);
                if (row && row.parentElement) row.parentElement.removeChild(row);
                groupRowCache.delete(id);
            }
        });

        const sortedIds = memberIds
            .map((id) => ({ id, order: groupMembers[id].order || 999 }))
            .sort((a, b) => a.order - b.order)
            .map((entry) => entry.id);

        sortedIds.forEach((id) => {
            const m = groupMembers[id];
            let row = groupRowCache.get(id);

            if (!row) {
                row = document.createElement('div');
                row.className = 'groupRow';
                row.dataset.memberId = id;
				row.addEventListener('click', () => {
    if (!groupActionMode) return;

    const myId = parseInt(heroId, 10);
    const mid = parseInt(row.dataset.memberId, 10);
    const mem = groupMembers[mid];
    if (!mem) return;

    // pas d'action sur soi
    if (!isNaN(myId) && mid === myId) return;

    if (groupActionMode === 'follow') {
        sendGroupFollow(mid, mem.name);
    } else if (groupActionMode === 'promote') {
        if (!isHeroGroupLeader()) { clearGroupActionMode(); return; }
        sendGroupChangeLeader(mid, mem.name);
    } else if (groupActionMode === 'kick') {
        if (!isHeroGroupLeader()) { clearGroupActionMode(); return; }
        sendGroupKick(mid, mem.name);
    }

    // IMPORTANT : one-shot comme Flash
    clearGroupActionMode();
    forceGroupUiUpdate();
});




                const name = document.createElement('div');
                name.className = 'groupName';

                const mapTag = document.createElement('div');
                mapTag.className = 'groupMap';

                const hp = document.createElement('div');
hp.className = 'groupBar hp';

const sh = document.createElement('div');
sh.className = 'groupBar sh';

const actions = document.createElement('div');
actions.className = 'groupRowActions';

// Wrap barres + icône
const barsWrap = document.createElement('div');
barsWrap.className = 'groupBarsWrap';

const shipIcon = document.createElement('div');
shipIcon.className = 'groupShipIcon';

// image 186 (chemin avec basePath si nécessaire)
const base = (window.cfg && typeof cfg.basePath === "string") ? cfg.basePath : "";
shipIcon.style.backgroundImage = `url("${base}graphics/ui/ui/images/186_iconShip10.png")`;

const barsCol = document.createElement('div');
barsCol.className = 'groupBarsCol';
barsCol.appendChild(hp);
barsCol.appendChild(sh);

barsWrap.appendChild(shipIcon);
barsWrap.appendChild(barsCol);

row._refs = { name, mapTag, hp, sh, actions };

row.appendChild(name);
row.appendChild(mapTag);
row.appendChild(barsWrap);
row.appendChild(actions);


                groupRowCache.set(id, row);
            }

            const { name, mapTag, hp, sh, actions } = row._refs;

            const isLeader = (groupLeaderId === m.id);

const myMapId = (typeof cfg.mapID !== 'undefined') ? cfg.mapID : 0;
const shortMap = formatMapIdShort(m.mapId) || (m.mapId ? `Map ${m.mapId}` : '???');

// Map à gauche du pseudo seulement si différent de ma map
const mapPrefix = (myMapId && m.mapId && m.mapId !== myMapId) ? `${shortMap} ` : '';

name.textContent = `${isLeader ? '★ ' : ''}${mapPrefix}${m.name || '???'}`;

// Ligne dessous : garde "Ici" si même map, sinon affiche la map formatée (comme minimap)
mapTag.textContent = '';
mapTag.classList.add('hidden');



            const hpRatio = (m.maxHp > 0) ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
            hp.style.setProperty('--ratio', hpRatio);
            hp.title = `${m.hp} / ${m.maxHp}`;

            const shRatio = (m.maxShield > 0) ? Math.max(0, Math.min(1, m.shield / m.maxShield)) : 0;
            sh.style.setProperty('--ratio', shRatio);
            sh.title = `${m.shield} / ${m.maxShield}`;

            const myId = parseInt(heroId, 10);
actions.innerHTML = '';
actions.classList.add('hidden'); // plus de boutons sous les membres (Chef/Kick déplacés en bas)



            if (row.parentElement !== groupListEl) {
                groupListEl.appendChild(row);
            }
        });
    }

function renderGroupInvitations() {
    if (!groupInvitesEl) return;

    const incomingIds = Object.keys(groupIncomingInvites)
        .map(x => parseInt(x, 10))
        .filter(x => !isNaN(x));

    const outgoingIds = Object.keys(groupOutgoingInvites)
        .map(x => parseInt(x, 10))
        .filter(x => !isNaN(x));

    const hasInvites = incomingIds.length > 0 || outgoingIds.length > 0;
    groupInvitesEl.classList.toggle('hidden', !hasInvites);

    if (!hasInvites) {
        groupInvitesEl.innerHTML = '';
        return;
    }

    groupInvitesEl.innerHTML = '';

    // 1) Sortantes : pseudo + bouton revoke (106/107)
    outgoingIds.forEach((cid) => {
        const inv = groupOutgoingInvites[cid];
        if (!inv) return;

        const row = document.createElement('div');
        row.className = 'groupInviteRow';

        const name = document.createElement('div');
        name.className = 'groupInviteName';
        name.textContent = inv.name || `#${cid}`;

        const btns = document.createElement('div');
        btns.className = 'groupInviteBtns';

        const revokeBtn = makeIconButton(
            '106_btn_revokeinv_std.png.png',
            '107_btn_revokeinv_mo.png.png',
            'Revoke invite'
        );

        revokeBtn.addEventListener('click', () => {
            // Flash: ps|inv|rji|candidateId
            sendRaw(`ps|inv|rji|${cid}`);
            delete groupOutgoingInvites[cid];
            renderGroupInvitations();
        });

        btns.appendChild(revokeBtn);
        row.appendChild(name);
        row.appendChild(btns);
        groupInvitesEl.appendChild(row);
    });

    // 2) Entrantes : pseudo + accept (139/140) + reject (110/111)
    incomingIds.forEach((iid) => {
        const inv = groupIncomingInvites[iid];
        if (!inv) return;

        const row = document.createElement('div');
        row.className = 'groupInviteRow';

        const name = document.createElement('div');
        name.className = 'groupInviteName';
        name.textContent = inv.name || `#${iid}`;

        const btns = document.createElement('div');
        btns.className = 'groupInviteBtns';

        const acceptBtn = makeIconButton(
            '139_btn_acceptinv_std.png.png',
            '140_btn_acceptinv_mo.png.png',
            'Accept invite'
        );
        acceptBtn.addEventListener('click', () => {
            sendRaw(`ps|inv|ack|${iid}`);
            delete groupIncomingInvites[iid];
            pendingGroupInvite = null; // compat
            renderGroupInvitations();
        });

        const rejectBtn = makeIconButton(
		'109_btn_rejectinv_std.png.png',
		'110_btn_rejectinv_mo.png.png',
		'Reject invite'
		);
        rejectBtn.addEventListener('click', () => {
            // Flash: ps|inv|rjc|inviterId
            sendRaw(`ps|inv|rjc|${iid}`);
            delete groupIncomingInvites[iid];
            if (pendingGroupInvite && pendingGroupInvite.id === iid) pendingGroupInvite = null;
            renderGroupInvitations();
        });

        btns.appendChild(acceptBtn);
        btns.appendChild(rejectBtn);

        row.appendChild(name);
        row.appendChild(btns);
        groupInvitesEl.appendChild(row);
    });
}


    function forceGroupUiUpdate() {
        lastGroupSignature = '';
        renderGroupList();
        renderGroupInvitations();

    }

    function computeGroupSignature() {
        const ids = Object.keys(groupMembers)
            .map((x) => parseInt(x, 10))
            .sort((a, b) => a - b);
        const payload = ids.map((id) => {
            const m = groupMembers[id];
            if (!m) return null;
            return `${id}:${m.name || ''}:${m.hp}/${m.maxHp}:${m.shield}/${m.maxShield}:${m.mapId || ''}:${m.order || 0}`;
        });
        payload.push(`leader:${groupLeaderId || ''}`);
        payload.push(`invIn:${Object.keys(groupIncomingInvites).sort().join(',')}`);
		payload.push(`invOut:${Object.keys(groupOutgoingInvites).sort().join(',')}`);

        payload.push(`blocked:${groupInvitesBlocked ? 1 : 0}`);
        payload.push(`behavior:${groupInvitationBehavior}`);
        return JSON.stringify(payload);
    }

    if (typeof makeElementDraggable !== 'function') {
        function makeElementDraggable(element, handle) {
            if (!element) return;
            const dragHandle = handle || element;
            dragHandle.style.cursor = 'move';

            let isDragging = false;
            let offsetX = 0;
            let offsetY = 0;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                element.style.position = 'absolute';
                element.style.left = `${e.clientX - offsetX}px`;
                element.style.top = `${e.clientY - offsetY}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            dragHandle.addEventListener('mousedown', (e) => {
                isDragging = true;
                const rect = element.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    }
	function makeIconButton(stdFile, hoverFile, title) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'groupIconBtn';
    if (title) b.title = title;

    // Chemins relatifs (ceux qui marchent dans /spacemap_html5/)
    const relStd = `graphics/ui/ui/images/${stdFile}`;
    const relHov = `graphics/ui/ui/images/${hoverFile}`;

    // Chemins avec basePath (au cas où ton install en a besoin)
    const base = (window.cfg && typeof cfg.basePath === "string") ? cfg.basePath : "";
    const baseStd = `${base}${relStd}`;
    const baseHov = `${base}${relHov}`;

    // Par défaut on affiche RELATIF (ton cas)
    let stdUrl = relStd;
    let hovUrl = relHov;

    const setStd = () => { b.style.backgroundImage = `url("${stdUrl}")`; };
    const setHov = () => { b.style.backgroundImage = `url("${hovUrl}")`; };

    setStd();

    // Si basePath existe, on teste : si ça charge => on bascule sur basePath
    if (base) {
        const test = new Image();
        test.onload = () => {
            stdUrl = baseStd;
            hovUrl = baseHov;
            setStd();
        };
        test.onerror = () => {
            // on garde relStd/relHov (rien à faire)
        };
        test.src = baseStd;
    }

    b.addEventListener('mouseenter', setHov);
    b.addEventListener('mouseleave', setStd);
    b.addEventListener('focus', setHov);
    b.addEventListener('blur', setStd);

    return b;
}
function makeGroupIconButton(stdFile, hoverFile, title) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'groupIconBtn';
    if (title) b.title = title;

    const base = (window.cfg && typeof cfg.basePath === "string") ? cfg.basePath : "";
    const std = `${base}graphics/ui/ui/images/${stdFile}`;
    const hov = `${base}graphics/ui/ui/images/${hoverFile}`;

    b.dataset.std = std;
    b.dataset.hov = hov;
    b.style.backgroundImage = `url("${std}")`;

    const setStd = () => { b.style.backgroundImage = `url("${b.dataset.std}")`; };
    const setHov = () => { b.style.backgroundImage = `url("${b.dataset.hov}")`; };

    b.addEventListener('mouseenter', setHov);
    b.addEventListener('mouseleave', setStd);
    b.addEventListener('focus', setHov);
    b.addEventListener('blur', setStd);

    return b;
}



    function initGroupWindow() {
        if (groupWindowEl) return;

        const style = document.createElement('style');
        const groupTop = (WINDOW_DEFAULT_POS.group && WINDOW_DEFAULT_POS.group.top) || 130;
        const groupLeft = (WINDOW_DEFAULT_POS.group && WINDOW_DEFAULT_POS.group.left) || 10;

        style.innerHTML = `
            #win_group {
    position: absolute;
    top: ${groupTop}px;
    left: ${groupLeft}px;

    width: 280px;
padding: 30px 8px 8px 8px;

    /* Couleurs type "Pilot Sheet" */
    background: rgba(0, 10, 20, 0.85);
    border: 1px solid #4a6b8c;
    box-shadow: 0 0 10px #000;
    border-radius: 6px;

    color: #ccc;
    font-family: Arial, sans-serif;
    font-size: 11px;

    z-index: 20;
    display: none;
}


/* Bandeau façon Flash (haut) */
#win_group::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    height: 24px;
    background: rgba(0,0,0,0.65);
    border-bottom: 1px solid #4a6b8c;
    border-radius: 6px 6px 0 0;
}


    #win_group .groupTitle {
    position: absolute;
    top: 5px;
    left: 34px; /* laisse la place à l’icône */
    margin: 0;
    font-size: 12px;
    font-weight: bold;
    color: #00aaff;
    z-index: 1;
}


            #win_group .groupCloseIcon {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 22px;
    height: 22px;
    cursor: pointer;

    /* Effet "comme l'icône du chat" */
    border-radius: 4px;
    box-shadow: 0 0 4px #000;
    transition: box-shadow 0.15s ease;
	z-index: 3;
}

/* Zone de déplacement (barre du haut) */
#win_group .groupDragBar {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    height: 24px;
    z-index: 1;
    user-select: none;
}

/* Pour que le texte ne bloque pas le drag */
#win_group .groupTitle {
    z-index: 2;
    pointer-events: none;
}


#win_group .groupCloseIcon:hover {
    box-shadow: 0 0 6px #0ff;
}

            /* Barre INVITE : collée dans le bandeau du haut */
#win_group .groupInviteControls {
    display: flex;
    gap: 3px;            /* moins d'espace entre input et bouton */
    align-items: center;
    margin: 0 0 4px 0;   /* moins de vide dessous */
	}

#win_group.groupNoGroup {
    padding-bottom: 10px;

    /* La fenêtre se cale sur le contenu (plus de vide à droite) */
    width: max-content;
    width: fit-content;

    /* un peu moins de marge à droite (optionnel) */
    padding-right: 6px;
}
#win_group.groupInGroup {
    width: fit-content;
    max-width: 280px;      /* évite que ça devienne énorme si un pseudo est très long */
    padding-right: 6px;    /* optionnel, pour rapprocher un peu la bordure */
}

/* Hors groupe : on empêche le champ de "s'étirer" inutilement */
#win_group.groupNoGroup .groupInviteControls input {
    flex: 0 0 160px; /* ajuste si tu veux: 140 / 160 / 180 */
}
/* En groupe : champ plus court (évite le gros vide) */
#win_group.groupInGroup .groupInviteControls input{
    flex: 0 0 160px;
    width: 160px;
}



/* Barre SESSION (Quitter/Ping) : normale, sous le bandeau */
#win_group .groupSessionControls {
    display: flex;
    gap: 6px;
    margin: 0 0 6px 0;
}

            #win_group .groupControls input { flex: 1; }
            #win_group input.groupInput {
                background: #0c141c;
                border: 1px solid #4bc0ff;
                color: #e6f4ff;
                padding: 3px 4px;
                border-radius: 2px;
                font-family: Arial, sans-serif;
                font-size: 11px;
            }
            #win_group input.groupInput:focus {
                outline: none;
                border-color: #6ad7ff;
                box-shadow: 0 0 4px rgba(106, 215, 255, 0.4);
            }
            #win_group .groupButton {
                background: #193245;
                border: 1px solid #4bc0ff;
                color: #e6f4ff;
                padding: 4px 8px;
                border-radius: 2px;
                cursor: pointer;
                font-family: Arial, sans-serif;
                font-size: 11px;
            }
            #win_group .groupButton:hover { background: #24506d; }
            #win_group .groupButton:active { background: #163347; }
            #win_group .groupButton:disabled { background: #111c26; color: #708295; cursor: default; }

/* Boutons icônes (Quitter / Ping / Suivre) */
#win_group .groupIconBtn{
    width: 22px;
    height: 22px;
    border: 0;
    padding: 0;
    background: transparent;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    cursor: pointer;
}

#win_group .groupList { max-height: 260px; overflow-y: auto; }


/* Boutons en image (inviter / block invites / allow invites) */
#win_group .groupImgButton{
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
}
#win_group .groupImgButton img{
    display: block;
    user-select: none;
    -webkit-user-drag: none;
}



/* Bouton "Inviter" en image (std / hover) */
#win_group .groupInviteImgButton{
    background: transparent;
    border: none;
    padding: 0;
    margin-left: 0px; /* petit espace après l'input */
    cursor: pointer;
}
#win_group .groupInviteImgButton img{
    display: block;
    user-select: none;
    -webkit-user-drag: none;
}


            #win_group .groupRow {
    margin-bottom: 4px;
    padding: 3px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    box-sizing: border-box;

    width: fit-content;   
    max-width: 100%;      
    margin-right: auto;  
transition: background 80ms linear, border-color 80ms linear, box-shadow 80ms linear;	
}

	#win_group .groupRow.selected {
    background: rgba(75,192,255,0.10);
    border-color: rgba(75,192,255,0.9);
    box-shadow: inset 0 0 0 1px rgba(75,192,255,0.65), 0 0 6px rgba(75,192,255,0.35);
}

            #win_group .groupName {
    font-weight: bold;
    color: #fff;

    /* ✅ empêche la fenêtre de s’élargir à cause d’un pseudo trop long */
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

            #win_group .groupMap { color: #b4d9ff; margin-bottom: 1px; }
            #win_group .groupBar {
  position: relative;
  width: 62px;     /* Flash: BAR_WIDTH */
  height: 7px;     /* Flash: BAR_HEIGHT */
  background: #222;
  border: 1px solid #444;
  margin-bottom: 2px;
}

#win_group .groupBar::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: calc(var(--ratio, 0) * 100%);
}

            #win_group .groupBar.hp::after { background: #5bff6a; }
            #win_group .groupBar.sh::after { background: #4bc0ff; }
			/* Wrap barres + icône (186_iconShip10.png) */
#win_group .groupBarsWrap{
  display: flex;
  align-items: center;
  gap: 6px;
}
#win_group .groupShipIcon{
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
#win_group .groupBarsCol{
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

            #win_group .groupRowActions { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
            #win_group .groupRowActions .groupActionButton { padding: 2px 6px; min-width: 70px; }
			#win_group .hidden { display: none !important; }

#win_group .groupIconBtn:disabled{
    opacity: 0.4;
    cursor: default;
}


#win_group .groupInvites{
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#win_group .groupInviteRow{
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-top: 1px solid rgba(255,255,255,0.08);
}

#win_group .groupInviteName{
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

#win_group .groupInviteBtns{
  display: flex;
  align-items: center;
  gap: 6px;
}

			
			/* Base : on permet de réordonner visuellement */
#win_group {
  display: flex;
  flex-direction: column;
}

#win_group.groupInGroup .groupList { order: 1; }
#win_group.groupInGroup .groupInvites { order: 2; margin-top: 8px; }
#win_group.groupInGroup .groupInviteControls { order: 3; margin-top: 8px; }
#win_group.groupInGroup .groupSessionControls { order: 4; margin-top: 10px; }

#win_group.groupNoGroup .groupInviteControls { order: 1; }
#win_group.groupNoGroup .groupInvites { order: 2; margin-top: 8px; }


/* Dans la fenêtre "en groupe", on ne montre pas Bloquer invits */
#win_group.groupInGroup .groupBlockInvitesBtn { display: none !important; }

        `;
        document.head.appendChild(style);

        groupWindowEl = document.createElement('div');
        groupWindowEl.id = 'win_group';
		const dragBar = document.createElement('div');
dragBar.className = 'groupDragBar';
groupWindowEl.appendChild(dragBar);


        const closeIcon = document.createElement('img');
        closeIcon.className = 'groupCloseIcon';
        const closeImg = getUiImage(UI_SPRITES.dockIconGroup);
		closeIcon.src = (closeImg && closeImg.src) ? closeImg.src : UI_SPRITES.dockIconGroup;
		closeIcon.alt = 'Groupe';
        closeIcon.addEventListener('click', () => {
            if (typeof toggleWindow === 'function') toggleWindow('group', false);
            else groupWindowEl.style.display = 'none';
        });
        groupWindowEl.appendChild(closeIcon);

        const title = document.createElement('div');
        title.className = 'groupTitle';
        title.textContent = 'Groupe';
        groupWindowEl.appendChild(title);

        const controls = document.createElement('div');
        controls.className = 'groupControls';
		controls.classList.add('groupInviteControls');
        const input = document.createElement('input');
        input.id = 'groupInputName';
        input.className = 'groupInput';
        input.placeholder = 'Nom du joueur';
        // Empêche les raccourcis du jeu (quickbar / menu actions) pendant la saisie
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        input.addEventListener('keyup', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });

        controls.appendChild(input);

const inviteBtn = makeIconButton(
  '103_btn_sendinv_std.png.png',
  '104_btn_sendinv_mo.png.png',
  'Inviter'
);


const inviteImg = document.createElement('img');
const INV_STD = 'graphics/ui/ui/images/103_btn_sendinv_std.png.png';
const INV_HOVER = 'graphics/ui/ui/images/104_btn_sendinv_mo.png.png';

inviteImg.src = INV_STD;
inviteImg.alt = 'Inviter';
inviteImg.draggable = false;
inviteBtn.appendChild(inviteImg);

inviteBtn.addEventListener('mouseenter', () => { inviteImg.src = INV_HOVER; });
inviteBtn.addEventListener('mouseleave', () => { inviteImg.src = INV_STD; });
// Bonus accessibilité clavier
inviteBtn.addEventListener('focus', () => { inviteImg.src = INV_HOVER; });
inviteBtn.addEventListener('blur',  () => { inviteImg.src = INV_STD; });

inviteBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    sendRaw(`ps|inv|name|${name}`);
    addInfoMessage(`Invitation envoyée à ${name}`);
});

controls.appendChild(inviteBtn);


        const blockBtn = document.createElement('button');
blockBtn.type = 'button';
blockBtn.className = 'groupImgButton groupBlockInvitesBtn';

const blockImg = document.createElement('img');
blockImg.draggable = false;
blockBtn.appendChild(blockImg);

// Sauvegarde refs globales pour update
groupBlockInvitesBtnEl = blockBtn;
groupBlockInvitesImgEl = blockImg;

blockBtn.addEventListener('mouseenter', () => {
    groupBlockInvitesHover = true;
    updateGroupBlockInvitesButton();
});
blockBtn.addEventListener('mouseleave', () => {
    groupBlockInvitesHover = false;
    updateGroupBlockInvitesButton();
});
blockBtn.addEventListener('focus', () => {
    groupBlockInvitesHover = true;
    updateGroupBlockInvitesButton();
});
blockBtn.addEventListener('blur', () => {
    groupBlockInvitesHover = false;
    updateGroupBlockInvitesButton();
});

blockBtn.addEventListener('click', () => {
    // Le serveur répond ensuite avec ps|blk|0/1 et ton client affiche déjà
    // "Invitations de groupe bloquées/autorisées."
    sendRaw('ps|blk');
});

controls.appendChild(blockBtn);

// Init visuel immédiat
updateGroupBlockInvitesButton();


        groupWindowEl.appendChild(controls);
        groupInviteControlsEl = controls;

        const actions = document.createElement('div');
        actions.className = 'groupControls';
		actions.classList.add('groupSessionControls');

        const leaveBtn = makeGroupIconButton(
    '118_btn_leave_std.png.png',
    '119_btn_leave_mo.png.png',
    'Quitter'
);
leaveBtn.addEventListener('click', () => {
    sendRaw('ps|lv');
    addInfoMessage('Demande de départ du groupe...');
});
actions.appendChild(leaveBtn);

const pingBtn = makeGroupIconButton(
    '115_btn_ping_std.png.png',
    '116_btn_ping_mo.png.png',
    'Ping'
);
pingBtn.addEventListener('click', () => {
    groupPingMode = !groupPingMode;
    addInfoMessage(`Mode ping de groupe ${groupPingMode ? 'ACTIVÉ' : 'désactivé'}.`);
});
actions.appendChild(pingBtn);

const followBtn = makeGroupIconButton(
    '130_btn_follow_std.png.png',
    '131_btn_follow_mo.png.png',
    'Suivre'
);
groupFollowBtnEl = followBtn;

followBtn.addEventListener('click', () => {
    // toggle pour annuler manuellement si besoin
    if (groupActionMode === 'follow') {
        clearGroupActionMode();
        return;
    }
    setGroupActionMode('follow');
    addInfoMessage('Cliquez sur un membre pour le suivre.');
});

actions.appendChild(followBtn);

const promoteBtn = makeGroupIconButton(
    '112_btn_promote_std.png.png',
    '113_btn_promote_mo.png.png',
    'Chef'
);
promoteBtn.classList.add('hidden');
promoteBtn.disabled = false;
promoteBtn.addEventListener('click', () => {
    if (!isHeroGroupLeader()) return;

    if (groupActionMode === 'promote') {
        clearGroupActionMode();
        return;
    }
    setGroupActionMode('promote');
    addInfoMessage('Cliquez sur un membre pour le passer Chef.');
});

actions.appendChild(promoteBtn);
groupPromoteBtnEl = promoteBtn;

const kickBtn = makeGroupIconButton(
    '121_btn_kick_std.png.png',
    '122_btn_kick_mo.png.png',
    'Kick'
);
kickBtn.classList.add('hidden');
kickBtn.disabled = false;
kickBtn.addEventListener('click', () => {
    if (!isHeroGroupLeader()) return;

    if (groupActionMode === 'kick') {
        clearGroupActionMode();
        return;
    }
    setGroupActionMode('kick');
    addInfoMessage('Cliquez sur un membre pour le Kick.');
});

actions.appendChild(kickBtn);
groupKickBtnEl = kickBtn;

updateGroupLeaderButtons();




        groupWindowEl.appendChild(actions);
        groupSessionControlsEl = actions;
		actions.classList.add('hidden'); // par défaut on n'est pas en groupe


        groupListEl = document.createElement('div');
        groupListEl.className = 'groupList';
        groupWindowEl.appendChild(groupListEl);
		groupInvitesEl = document.createElement('div');
groupInvitesEl.className = 'groupInvites hidden';
groupWindowEl.appendChild(groupInvitesEl);


        document.body.appendChild(groupWindowEl);

        if (typeof makeElementDraggable === 'function') {
            makeElementDraggable(groupWindowEl, dragBar);
        }


        // Rafraîchissement périodique comme le client Flash qui met à jour ses composants
        setInterval(() => {
            const sig = computeGroupSignature();
            if (sig !== lastGroupSignature) {
                lastGroupSignature = sig;
                renderGroupList();
				renderGroupInvitations();
            }
        }, 400);

        if (typeof refreshWindowsVisibility === 'function') {
            refreshWindowsVisibility();
        }
    }

    window.addEventListener('load', initGroupWindow);


    // -------------------------------------------------
    // 11. BOUCLE RENDU
    // -------------------------------------------------

    let lastTime = performance.now();
    let shieldAnimTime = 0;
