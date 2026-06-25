<style>
    /* ================= GLOBAL & LAYOUT ================= */
    .lottery-wrapper {
        display: flex; justify-content: center; padding-top: 2rem; width: 100%;
        position: relative;
    }

    .shop-card.lottery-card {
        display: grid; grid-template-columns: 1fr 340px;
        width: 100%; max-width: 1000px;
        background: rgba(13, 20, 36, 0.95); border: 1px solid #1e293b;
        border-radius: 8px; box-shadow: 0 0 50px rgba(0,0,0,0.5); overflow: hidden;
        user-select: none;
    }

    @media (max-width: 900px) { .shop-card.lottery-card { grid-template-columns: 1fr; } }

    /* ================= LEFT ZONE (VISUAL) ================= */
    .left-zone {
        position: relative; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
        border-right: 1px solid #334155; display: flex; flex-direction: column;
    }

    /* Tabs */
    .gate-tabs { display: flex; background: rgba(0,0,0,0.3); border-bottom: 1px solid #334155; }
    .gate-tab {
        flex: 1; text-align: center; padding: 12px 0; cursor: pointer; color: #64748b;
        font-weight: 700; text-transform: uppercase; font-size: 0.9rem; transition: all 0.2s;
        border-right: 1px solid rgba(255,255,255,0.05);
    }
    .gate-tab:hover { color: #fff; background: rgba(255,255,255,0.02); }
    .gate-tab.active { color: #22d3ee; background: rgba(34, 211, 238, 0.05); box-shadow: inset 0 -2px 0 #22d3ee; }

    /* Visualizer */
    .visual-container {
        flex: 1; height: 420px; display: flex; justify-content: center; align-items: center;
        position: relative; overflow: hidden;
    }

    .gate-art-stage {
        position: relative; width: clamp(170px, 36vw, 235px); aspect-ratio: 235 / 290;
        filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.35)); transform: scale(1.04);
    }
    .gate-art-stage::before {
        content: ""; position: absolute; inset: 16% -18%; border-radius: 50%;
        background: radial-gradient(circle, rgba(34,211,238,0.18), rgba(34,211,238,0.04) 45%, transparent 70%);
        opacity: .8; pointer-events: none; z-index: 0;
    }
    .left-zone[data-gate="2"] .gate-art-stage { filter: drop-shadow(0 0 24px rgba(74, 222, 128, 0.32)); }
    .left-zone[data-gate="3"] .gate-art-stage { filter: drop-shadow(0 0 24px rgba(248, 113, 113, 0.32)); }
    .left-zone[data-gate="4"] .gate-art-stage { filter: drop-shadow(0 0 24px rgba(167, 139, 250, 0.34)); }
    .gate-art-bg,
    .gate-art-part,
    .gate-art-spin {
        position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
        pointer-events: none; user-select: none;
    }
    .gate-art-bg { opacity: .34; filter: brightness(1.35) saturate(.9); z-index: 1; }
    .gate-art-stage.complete .gate-art-bg { opacity: 0; }
    .gate-part-layer { position: absolute; inset: 0; z-index: 2; }
    .gate-art-part { opacity: .98; }
    .gate-art-spin {
        opacity: 0; transform: scale(1.02); transition: opacity .25s ease;
        filter: brightness(1.08) saturate(1.2); z-index: 3;
    }
    .gate-art-stage.on-map .gate-art-spin { opacity: .6; }
    .gate-art-empty {
        position: absolute; left: 50%; bottom: -28px; transform: translateX(-50%);
        color: #64748b; font-size: .75rem; font-weight: 800; letter-spacing: .5px;
        text-transform: uppercase; white-space: nowrap; z-index: 4;
    }
    .gate-art-stage:not(.empty) .gate-art-empty { display: none; }

    /* Overlay Info */
    .gate-info-overlay {
        position: absolute; bottom: 0; left: 0; right: 0; padding: 20px;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); text-align: center;
    }
    .progress-container { position: relative; z-index: 2; width: 70%; margin: 0 auto; }
    .progress-text { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; }
    .progress-bar-bg { width: 100%; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; border: 1px solid #334155; }
    .progress-bar-fill { height: 100%; width: 0%; background: #22d3ee; transition: width 0.5s; box-shadow: 0 0 10px #22d3ee; }
    .status-msg { margin-top: 10px; color: #4ade80; font-weight: bold; font-size: 0.9rem; letter-spacing: 1px; display: none; text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }

    .multiplier-badge {
        position: absolute; top: 20px; right: 20px;
        background: #f59e0b; color: #000; font-weight: 800; padding: 4px 12px; border-radius: 4px;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); transform: scale(0); transition: transform 0.3s; z-index: 10;
    }
    .multiplier-badge.show { transform: scale(1); }

    /* ================= RIGHT ZONE (CONTROLS) ================= */
    .controls-zone {
        padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; background: rgba(0,0,0,0.2);
    }
    .shop-title {
        font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0; text-transform: uppercase;
        letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 10px;
    }

    .cost-box {
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3);
        padding: 10px; border-radius: 4px; color: #22d3ee; font-weight: bold; font-size: 0.9rem;
    }

    .amount-selector { display: flex; gap: 5px; margin-bottom: 5px; }
    .amt-btn {
        flex: 1; background: #0f172a; border: 1px solid #334155; color: #64748b;
        padding: 8px 0; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: all 0.2s;
    }
    .amt-btn:hover { background: #1e293b; color: #fff; }
    .amt-btn.active { background: #22d3ee; color: #0f172a; border-color: #22d3ee; box-shadow: 0 0 10px rgba(34, 211, 238, 0.3); }

    .btn-action {
        width: 100%; padding: 14px; border: none; border-radius: 4px;
        font-weight: 800; font-size: 1rem; text-transform: uppercase; cursor: pointer;
        transition: all 0.2s; position: relative; overflow: hidden;
    }
    .btn-spin {
        background: linear-gradient(135deg, #22d3ee, #0891b2); color: #0f172a;
        box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
    }
    .btn-spin:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5); filter: brightness(1.1); }
    .btn-spin:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.8); }

    .btn-prepare {
        display: none; background: linear-gradient(135deg, #4ade80, #16a34a); color: #022c22;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); animation: pulseBtn 2s infinite;
    }
    .gate-life-actions { display: none; justify-content: center; margin-top: 12px; }
    .btn-buy-life {
        border: 1px solid rgba(34, 211, 238, 0.45); border-radius: 4px;
        background: rgba(15, 23, 42, 0.88); color: #67e8f9; cursor: pointer;
        font-size: 0.75rem; font-weight: 900; letter-spacing: 0.06em;
        padding: 8px 14px; text-transform: uppercase; transition: all 0.2s;
    }
    .btn-buy-life:hover:not(:disabled) {
        background: rgba(34, 211, 238, 0.16); color: #f8fafc; box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
    }
    .btn-buy-life:disabled { opacity: 0.5; cursor: not-allowed; }
    @keyframes pulseBtn { 0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }

    .result-panel {
        flex: none; height: 296px; min-height: 296px; max-height: 296px; background: rgba(2, 6, 23, 0.78);
        border: 1px solid #1e293b; border-radius: 6px; padding: 10px;
        overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
    }
    .result-empty {
        flex: 1; min-height: 210px; display: flex; align-items: center; justify-content: center;
        color: #64748b; font-size: 0.78rem; text-align: center; text-transform: uppercase; letter-spacing: 0.08em;
    }
    .result-group {
        display: flex; flex-direction: column; gap: 7px; padding-bottom: 9px;
        border-bottom: 1px solid rgba(51, 65, 85, 0.62);
    }
    .result-group:last-child { border-bottom: none; padding-bottom: 0; }
    .result-group-header {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        color: #94a3b8; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em;
    }
    .result-group-time { color: #475569; font-size: 0.68rem; white-space: nowrap; }
    .result-card {
        display: grid; grid-template-columns: 42px 1fr auto; gap: 10px; align-items: center;
        min-height: 54px; padding: 8px; border: 1px solid rgba(51, 65, 85, 0.75);
        border-radius: 6px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.72));
    }
    .result-card.part { border-color: rgba(250, 204, 21, 0.45); box-shadow: inset 0 0 16px rgba(250, 204, 21, 0.07); }
    .result-card.error { border-color: rgba(239, 68, 68, 0.45); }
    .result-card.mult { border-color: rgba(245, 158, 11, 0.42); }
    .result-icon {
        width: 42px; height: 42px; border-radius: 6px; background: #020617; border: 1px solid #334155;
        display: flex; align-items: center; justify-content: center; color: #22d3ee;
        font-size: 0.68rem; font-weight: 900; overflow: hidden; text-align: center; line-height: 1;
    }
    .result-icon img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .result-name { color: #f8fafc; font-size: 0.86rem; font-weight: 800; line-height: 1.15; }
    .result-desc { color: #64748b; font-size: 0.72rem; margin-top: 3px; }
    .result-qty { color: #4ade80; font-size: 1rem; font-weight: 900; white-space: nowrap; }
    .result-card.part .result-qty { color: #facc15; }
    .result-card.error .result-qty { color: #ef4444; }
    .result-card.mult .result-qty { color: #f59e0b; }

    .drop-overview {
        border: 1px solid #1e293b; border-radius: 6px; background: rgba(15, 23, 42, 0.56);
        padding: 10px; margin-top: auto;
    }
    .drop-title { color: #cbd5e1; font-size: 0.74rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 8px; }
    .drop-row { display: grid; grid-template-columns: 82px 1fr 38px; gap: 8px; align-items: center; font-size: 0.75rem; color: #94a3b8; padding: 4px 0; }
    .drop-bar { height: 6px; border-radius: 999px; background: #0f172a; overflow: hidden; }
    .drop-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #4ade80); }
    .drop-row.part .drop-fill { background: linear-gradient(90deg, #f59e0b, #facc15); }
    .drop-row.resource .drop-fill { background: linear-gradient(90deg, #38bdf8, #818cf8); }
    .drop-row.logfiles .drop-fill { background: linear-gradient(90deg, #a78bfa, #f472b6); }

    /* ================= MODAL OVERLAY ================= */
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999; opacity: 0; pointer-events: none; transition: opacity 0.3s;
    }
    .modal-overlay.active { opacity: 1; pointer-events: auto; }
    
    .modal-box {
        background: #0f172a; border: 1px solid #22d3ee; border-radius: 8px;
        width: 400px; padding: 20px; box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
        transform: scale(0.9); transition: transform 0.3s; text-align: center;
    }
    .modal-overlay.active .modal-box { transform: scale(1); }
    
    .modal-title { font-size: 1.2rem; font-weight: bold; color: #fff; margin-bottom: 10px; text-transform: uppercase; }
    .modal-text { color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
    
    .modal-actions { display: flex; gap: 10px; justify-content: center; }
    .btn-modal { padding: 10px 20px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    .btn-cancel { background: #334155; color: #fff; }
    .btn-cancel:hover { background: #475569; }
    .btn-confirm { background: #22d3ee; color: #020617; }
    .btn-confirm:hover { background: #06b6d4; box-shadow: 0 0 10px rgba(34, 211, 238, 0.4); }

</style>

<div class="CMSContent">
    <div class="lottery-wrapper">
        <div class="shop-card lottery-card">
            
            <div class="left-zone" id="leftZone" data-gate="1">
                <div class="gate-tabs">
                    <div class="gate-tab active" onclick="switchGate(1)">Alpha</div>
                    <div class="gate-tab" onclick="switchGate(2)">Beta</div>
                    <div class="gate-tab" onclick="switchGate(3)">Gamma</div>
                    <div class="gate-tab" onclick="switchGate(4)">Delta</div>
                </div>

                <div class="visual-container">
                    <div id="multBadge" class="multiplier-badge">x2</div>

                    <div class="gate-art-stage empty" id="gateArtStage" aria-hidden="true">
                        <img id="gateArtBg" class="gate-art-bg" alt="" draggable="false">
                        <div id="gatePartLayer" class="gate-part-layer"></div>
                        <img id="gateSpinVisual" class="gate-art-spin" alt="" draggable="false">
                        <div class="gate-art-empty">No parts collected</div>
                    </div>

                    <div class="gate-info-overlay">
                        <div class="progress-container">
                            <div class="progress-text">
                                <span id="uiGateName">Alpha Gate</span>
                                <span id="uiGateCount">0 / 34</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" id="uiGateBar"></div>
                            </div>
                            <div class="status-msg" id="uiGateMsg">PORTAL PREPARED!</div>
                            <div class="gate-life-actions" id="gateLifeActions">
                                <button type="button" class="btn-buy-life" id="btnBuyLife">Buy Extra Life - 10,000 U.</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="controls-zone">
                <h3 class="shop-title">Materializer</h3>

                <div class="cost-box">
                    <span>TOTAL COST</span>
                    <span id="uiTotalCost">40 U.</span>
                </div>

                <div class="amount-selector">
                    <button class="amt-btn active" onclick="setAmount(1)">1</button>
                    <button class="amt-btn" onclick="setAmount(5)">5</button>
                    <button class="amt-btn" onclick="setAmount(10)">10</button>
                    <button class="amt-btn" onclick="setAmount(100)">100</button>
                </div>

                <div class="result-panel" id="resultPanel">
                    <div class="result-empty">No materializations yet.</div>
                </div>

                <button id="btnSpin" class="btn-action btn-spin">MATERIALIZE</button>
                
                <button id="btnPrepare" class="btn-action btn-prepare">PREPARE JUMP</button>

                <div class="drop-overview">
                    <div class="drop-title">Drop Overview</div>
                    <div class="drop-row ammo"><span>Ammo</span><div class="drop-bar"><div class="drop-fill" style="width:62%"></div></div><strong>62%</strong></div>
                    <div class="drop-row part"><span>Gate Part</span><div class="drop-bar"><div class="drop-fill" style="width:20%"></div></div><strong>20%</strong></div>
                    <div class="drop-row resource"><span>Resources</span><div class="drop-bar"><div class="drop-fill" style="width:10%"></div></div><strong>10%</strong></div>
                    <div class="drop-row logfiles"><span>Logfiles</span><div class="drop-bar"><div class="drop-fill" style="width:8%"></div></div><strong>8%</strong></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="confirmModal">
        <div class="modal-box">
            <div class="modal-title">System Alert</div>
            <div class="modal-text" id="modalMessage">Do you really want to place this gate on your map?</div>
            <div class="modal-actions">
                <button class="btn-modal btn-cancel" onclick="closeModal()">Cancel</button>
                <button class="btn-modal btn-confirm" id="btnModalConfirm">DEPLOY GATE</button>
            </div>
        </div>
    </div>

</div>

<script>
// --- GLOBAL VARS ---
let currentGateId = 1; 
let gatesData = {};
let spinAmount = 1;

// --- DOM ELEMENTS ---
const leftZone = document.getElementById('leftZone');
const uiName = document.getElementById('uiGateName');
const uiCount = document.getElementById('uiGateCount');
const uiBar = document.getElementById('uiGateBar');
const uiMsg = document.getElementById('uiGateMsg');
const uiTotalCost = document.getElementById('uiTotalCost');
const btnSpin = document.getElementById('btnSpin');
const btnPrepare = document.getElementById('btnPrepare');
const btnBuyLife = document.getElementById('btnBuyLife');
const gateLifeActions = document.getElementById('gateLifeActions');
const resultPanel = document.getElementById('resultPanel');
const multBadge = document.getElementById('multBadge');
const amtBtns = document.querySelectorAll('.amt-btn');
const tabs = document.querySelectorAll('.gate-tab');
const gateArtStage = document.getElementById('gateArtStage');
const gateArtBg = document.getElementById('gateArtBg');
const gatePartLayer = document.getElementById('gatePartLayer');
const gateSpinVisual = document.getElementById('gateSpinVisual');

// Modal Elements
const modal = document.getElementById('confirmModal');
const modalMsg = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('btnModalConfirm');

const ENDPOINT = '/views/lottery/generate.php';
const COST_PER_SPIN = 40;
const GATE_VISUAL_BASE = '/img/galaxygates/';
const GATE_VISUAL_TOTALS = { 1: 34, 2: 48, 3: 82, 4: 128 };

// --- UTILS ---
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, chr => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;'
    }[chr]));
}

function getFallbackIconLabel(label) {
    const words = String(label || 'GG').split(/[\s-]+/).filter(Boolean);
    const textWord = words.find(word => /[A-Za-z]/.test(word)) || words[0] || 'GG';
    return String(textWord).slice(0, 3).toUpperCase();
}

function getResultGroupTime() {
    return new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
}

function getMaterializationTitle(amount) {
    return 'x' + parseInt(amount || 1, 10) + ' Materialization';
}

function formatNumber(value) {
    return parseInt(value || 0, 10).toLocaleString();
}

function buildResultCardHtml(card) {
    const type = card.type || card.kind || 'item';
    const label = card.label || 'Reward';
    const desc = card.description || 'Materializer reward';
    const qty = card.quantity || '';
    const icon = card.icon || '';
    const fallback = getFallbackIconLabel(label);
    const iconHtml = icon
        ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(label)}" onerror="this.replaceWith(document.createTextNode('${escapeHtml(fallback)}'))">`
        : escapeHtml(fallback);

    return `<div class="result-card ${escapeHtml(type)}">
        <div class="result-icon">${iconHtml}</div>
        <div>
            <div class="result-name">${escapeHtml(label)}</div>
            <div class="result-desc">${escapeHtml(desc)}</div>
        </div>
        <div class="result-qty">${escapeHtml(qty)}</div>
    </div>`;
}

function prependResultGroup(cards, title = 'Materialization') {
    const safeCards = Array.isArray(cards) ? cards : [];
    if (!safeCards.length) {
        renderResultMessage('No materialized reward this spin.', 'mult', title);
        return;
    }

    const emptyState = resultPanel.querySelector('.result-empty');
    if (emptyState) emptyState.remove();

    const groupHtml = `<div class="result-group">
        <div class="result-group-header">
            <span>${escapeHtml(title)}</span>
            <span class="result-group-time">${escapeHtml(getResultGroupTime())}</span>
        </div>
        ${safeCards.map(buildResultCardHtml).join('')}
    </div>`;

    resultPanel.insertAdjacentHTML('afterbegin', groupHtml);
    resultPanel.scrollTop = 0;
}

function renderResultCards(cards, title = 'Materialization') {
    prependResultGroup(cards, title);
}

function renderResultMessage(message, type = 'normal', title = 'Status') {
    const label = type === 'error' ? 'Error' : type === 'part' ? 'Gate Part' : type === 'mult' ? 'Multiplier' : 'Status';
    prependResultGroup([{
        label,
        description: message || 'Materializer updated.',
        quantity: '',
        type
    }], title);
}

function renderResultEntries(entries, title = 'Status') {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const cards = safeEntries
        .filter(entry => entry && entry.message)
        .map(entry => ({
            label: entry.label || 'Status',
            description: entry.message,
            quantity: '',
            type: entry.type || 'normal'
        }));

    if (cards.length) {
        prependResultGroup(cards, title);
    } else {
        renderResultMessage('Materializer updated.', 'normal', title);
    }
}

function updateMultiplierBadge(multiplierNext) {
    const next = parseInt(multiplierNext || 1, 10);
    if(next > 1) {
        multBadge.innerText = "x" + next;
        multBadge.classList.add('show');
    } else {
        multBadge.classList.remove('show');
    }
}

function refreshPilotBar(pilot) {
    if (!pilot) return;

    const creditsEl = document.getElementById('pilot-credits');
    const uridiumEl = document.getElementById('pilot-uridium');
    const xpEl = document.getElementById('pilot-xp');
    const honorEl = document.getElementById('pilot-honor');
    const rankpointsEl = document.getElementById('pilot-rankpoints');

    if (creditsEl) creditsEl.textContent = pilot.credits;
    if (uridiumEl) uridiumEl.textContent = pilot.uridium;
    if (xpEl) xpEl.textContent = pilot.experience;
    if (honorEl) honorEl.textContent = pilot.honor;
    if (rankpointsEl) rankpointsEl.textContent = pilot.rankpoints;
}

function getGateVisualParts(data, gateId) {
    const total = GATE_VISUAL_TOTALS[gateId] || parseInt(data.total || 0, 10);
    if (data.on_map) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (Array.isArray(data.parts)) {
        return data.parts
            .map(part => parseInt(part, 10))
            .filter(part => Number.isFinite(part) && part > 0 && part <= total)
            .filter((part, index, parts) => parts.indexOf(part) === index)
            .sort((a, b) => a - b);
    }

    const current = Math.max(0, Math.min(total, parseInt(data.current || 0, 10)));
    return Array.from({ length: current }, (_, index) => index + 1);
}

function updateGateVisual(data) {
    if (!gateArtStage || !gateArtBg || !gatePartLayer || !gateSpinVisual) return;

    const gateId = parseInt(data.id || currentGateId, 10);
    const parts = getGateVisualParts(data, gateId);
    const total = GATE_VISUAL_TOTALS[gateId] || parseInt(data.total || 0, 10);
    const showSpin = !!data.on_map && !data.completed;

    gateArtBg.src = `${GATE_VISUAL_BASE}gate_${gateId}_bg.png`;
    gateSpinVisual.src = `${GATE_VISUAL_BASE}spins/${gateId}.webp`;
    gatePartLayer.innerHTML = '';

    const fragment = document.createDocumentFragment();
    parts.forEach(partId => {
        const img = document.createElement('img');
        img.className = 'gate-art-part';
        img.alt = '';
        img.draggable = false;
        img.loading = 'lazy';
        img.src = `${GATE_VISUAL_BASE}gate_${gateId}_${partId}.png`;
        fragment.appendChild(img);
    });
    gatePartLayer.appendChild(fragment);

    gateArtStage.classList.toggle('empty', parts.length === 0 && !showSpin);
    gateArtStage.classList.toggle('complete', total > 0 && parts.length >= total);
    gateArtStage.classList.toggle('on-map', showSpin);
}

// --- MODAL FUNCTIONS ---
function openModal(gateName) {
    modalMsg.innerText = `Are you sure you want to deploy the ${gateName} gate to your home map?`;
    modal.classList.add('active');
    
    // On click confirm, execute the real function
    modalConfirmBtn.onclick = function() {
        executePrepareGate();
        closeModal();
    };
}

function closeModal() {
    modal.classList.remove('active');
}

// --- UI UPDATES ---
function updateUI() {
    if (!gatesData[currentGateId]) return;
    const data = gatesData[currentGateId];
    const current = parseInt(data.current || 0, 10);
    const total = parseInt(data.total || 0, 10);
    const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    const lives = parseInt(data.lives || 0, 10);
    const wave = parseInt(data.current_wave || 0, 10);
    const totalWaves = parseInt(data.total_waves || 10, 10);
    
    uiName.innerText = data.name + " Gate";

    // Reset visual states
    btnPrepare.style.display = "none";
    btnPrepare.disabled = true;
    gateLifeActions.style.display = "none";
    btnBuyLife.disabled = true;
    uiMsg.style.display = "none";

    if (data.on_map) {
        uiCount.innerText = "ACTIVE";
        uiBar.style.width = "100%";
        uiMsg.innerText = `PORTAL ON MAP — Lives: ${lives} — Wave: ${wave} / ${totalWaves}`;
        uiMsg.style.display = "block";
        btnSpin.disabled = false;
        if (data.can_buy_life) {
            btnBuyLife.innerText = "Buy Extra Life - " + formatNumber(data.extra_life_price || 10000) + " U.";
            btnBuyLife.disabled = false;
            gateLifeActions.style.display = "flex";
        }
    } else {
        uiCount.innerText = `${current} / ${total}`;
        uiBar.style.width = pct + "%";
        
        if (data.completed) {
            uiMsg.innerText = "COMPLETED";
            uiMsg.style.display = "block";
        } else if (data.ready) {
            uiMsg.innerText = "READY TO BUILD";
            uiMsg.style.display = "block";
            btnPrepare.innerText = "PREPARE " + data.name;
            btnPrepare.disabled = false;
            btnPrepare.style.display = "block";
        } else if (current > 0) {
            uiMsg.innerText = "IN PROGRESS";
            uiMsg.style.display = "block";
        }
    }
    
    leftZone.setAttribute('data-gate', currentGateId);
    updateGateVisual(data);
}

// --- SELECTION LOGIC ---
window.switchGate = function(id) {
    currentGateId = id;
    tabs.forEach((t, index) => {
        if(index + 1 === id) t.classList.add('active');
        else t.classList.remove('active');
    });
    updateUI();
}

window.setAmount = function(amt) {
    spinAmount = amt;
    amtBtns.forEach(btn => {
        if(parseInt(btn.innerText) === amt) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    uiTotalCost.innerText = (COST_PER_SPIN * amt).toLocaleString() + " U.";
}

// --- API CALLS ---
async function loadGateInfo() {
    try {
        const resp = await fetch(ENDPOINT + '?action=init');
        const json = await resp.json();
        if(json.status === 'success') {
            gatesData = json.gates;
            updateMultiplierBadge(json.multiplier_next);
            updateUI();
        }
    } catch(e) { console.error(e); }
}

async function spinGate() {
    if(btnSpin.disabled) return;
    btnSpin.disabled = true;
    amtBtns.forEach(btn => btn.disabled = true);
    const previousText = btnSpin.innerText;
    btnSpin.innerText = 'MATERIALIZING...';

    try {
        const formData = new FormData();
        formData.append('action', 'spin');
        formData.append('amount', spinAmount);
        formData.append('gate_id', currentGateId);

        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();

        if(data.status === 'success') {
            refreshPilotBar(data.pilot);
            const resultTitle = getMaterializationTitle(spinAmount);

            if(Array.isArray(data.result_cards) && data.result_cards.length) {
                renderResultCards(data.result_cards, resultTitle);
            } else if(Array.isArray(data.log_group)) {
                renderResultEntries(data.log_group, resultTitle);
            } else if(Array.isArray(data.logs)) {
                renderResultEntries(data.logs, resultTitle);
            } else {
                let css = 'normal';
                if(data.type === 'part') css = 'part';
                if(data.type === 'item') css = 'item';
                renderResultMessage(data.log, css, resultTitle);
            }

            if(data.gate_updates) {
                data.gate_updates.forEach(u => {
                    if(gatesData[u.id]) {
                        gatesData[u.id] = Object.assign(gatesData[u.id], u);
                    } else {
                        gatesData[u.id] = u;
                    }
                });
                updateUI();
            }

            updateMultiplierBadge(data.multiplier_next);
        } else {
            renderResultMessage(data.message || "Transaction failed", 'error', 'Materialization Failed');
        }
    } catch(e) {
        renderResultMessage("Server connection error", 'error', 'Materialization Failed');
    } finally {
        btnSpin.innerText = previousText;
        btnSpin.disabled = false;
        amtBtns.forEach(btn => btn.disabled = false);
    }
}

// Click on the button opens the Modal
btnPrepare.addEventListener('click', function() {
    const gateName = gatesData[currentGateId].name;
    openModal(gateName);
});

async function executePrepareGate() {
    btnPrepare.disabled = true;
    try {
        const formData = new FormData();
        formData.append('action', 'prepare');
        formData.append('gate_id', currentGateId);
        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();
        
        if(data.status === 'success') {
            renderResultMessage(data.message, 'item', 'Gate Deployment');
            if(data.gate) {
                gatesData[currentGateId] = data.gate;
            } else {
                gatesData[currentGateId].on_map = true;
                gatesData[currentGateId].current = 0;
                gatesData[currentGateId].ready = false;
                gatesData[currentGateId].lives = 3;
                gatesData[currentGateId].current_wave = 1;
            }
            btnPrepare.disabled = false;
            updateUI();
        } else {
            renderResultMessage(data.message, 'error', 'Gate Deployment');
            btnPrepare.disabled = false;
        }
    } catch(e) {
        renderResultMessage("Error preparing gate", 'error', 'Gate Deployment');
        btnPrepare.disabled = false;
    }
}

// --- LE BOUTON ÉTAIT MANQUANT ICI ---
async function buyExtraLife() {
    if (!gatesData[currentGateId] || btnBuyLife.disabled) return;

    btnBuyLife.disabled = true;
    const previousText = btnBuyLife.innerText;
    btnBuyLife.innerText = 'Buying...';

    try {
        const formData = new FormData();
        formData.append('action', 'buy_life');
        formData.append('gate_id', currentGateId);

        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();

        if (data.status === 'success') {
            if (data.gate) {
                gatesData[currentGateId] = data.gate;
            }
            refreshPilotBar(data.pilot);
            renderResultMessage(data.message, 'item', 'Extra Life');
            updateUI();
        } else {
            renderResultMessage(data.message || 'Extra life purchase failed.', 'error', 'Extra Life');
            updateUI();
        }
    } catch(e) {
        renderResultMessage('Server connection error', 'error', 'Extra Life');
        updateUI();
    } finally {
        if (gatesData[currentGateId] && gatesData[currentGateId].can_buy_life) {
            btnBuyLife.disabled = false;
            btnBuyLife.innerText = "Buy Extra Life - " + formatNumber(gatesData[currentGateId].extra_life_price || 10000) + " U.";
        } else {
            btnBuyLife.innerText = previousText;
        }
    }
}

btnSpin.addEventListener('click', spinGate);
btnBuyLife.addEventListener('click', buyExtraLife);
// ------------------------------------

// Init
loadGateInfo();
</script>
