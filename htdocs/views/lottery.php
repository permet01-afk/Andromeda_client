<style>
    .gg-page .result-panel{
        flex: none; height: 296px; min-height: 296px; max-height: 296px; background: rgba(2, 6, 23, 0.78);
        border: 1px solid #1e293b; border-radius: 6px; padding: 10px;
        overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
    }
    .gg-page .result-empty{
        flex: 1; min-height: 210px; display: flex; align-items: center; justify-content: center;
        color: #64748b; font-size: 0.78rem; text-align: center; text-transform: uppercase; letter-spacing: 0.08em;
    }
    .gg-page .result-group{
        display: flex; flex-direction: column; gap: 7px; padding-bottom: 9px;
        border-bottom: 1px solid rgba(51, 65, 85, 0.62);
    }
    .gg-page .result-group:last-child{ border-bottom: none; padding-bottom: 0; }
    .gg-page .result-group-header{
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        color: #94a3b8; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em;
    }
    .gg-page .result-group-time{ color: #475569; font-size: 0.68rem; white-space: nowrap; }
    .gg-page .result-card{
        display: grid; grid-template-columns: 42px 1fr auto; gap: 10px; align-items: center;
        min-height: 54px; padding: 8px; border: 1px solid rgba(51, 65, 85, 0.75);
        border-radius: 6px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.72));
    }
    .gg-page .result-card.part{ border-color: rgba(250, 204, 21, 0.45); box-shadow: inset 0 0 16px rgba(250, 204, 21, 0.07); }
    .gg-page .result-card.error{ border-color: rgba(239, 68, 68, 0.45); }
    .gg-page .result-card.mult{ border-color: rgba(245, 158, 11, 0.42); }
    .gg-page .result-icon{
        width: 42px; height: 42px; border-radius: 6px; background: #020617; border: 1px solid #334155;
        display: flex; align-items: center; justify-content: center; color: #22d3ee;
        font-size: 0.68rem; font-weight: 900; overflow: hidden; text-align: center; line-height: 1;
    }
    .gg-page .result-icon img{ width: 100%; height: 100%; object-fit: contain; display: block; }
    .gg-page .result-name{ color: #f8fafc; font-size: 0.86rem; font-weight: 800; line-height: 1.15; }
    .gg-page .result-desc{ color: #64748b; font-size: 0.72rem; margin-top: 3px; }
    .gg-page .result-qty{ color: #4ade80; font-size: 1rem; font-weight: 900; white-space: nowrap; }
    .gg-page .result-card.part .result-qty{ color: #facc15; }
    .gg-page .result-card.error .result-qty{ color: #ef4444; }
    .gg-page .result-card.mult .result-qty{ color: #f59e0b; }

    .gg-page .drop-overview{
        border: 1px solid #1e293b; border-radius: 6px; background: rgba(15, 23, 42, 0.56);
        padding: 10px; margin-top: auto;
    }
    .gg-page .drop-title{ color: #cbd5e1; font-size: 0.74rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 8px; }
    .gg-page .drop-row{ display: grid; grid-template-columns: 82px 1fr 38px; gap: 8px; align-items: center; font-size: 0.75rem; color: #94a3b8; padding: 4px 0; }
    .gg-page .drop-bar{ height: 6px; border-radius: 999px; background: #0f172a; overflow: hidden; }
    .gg-page .drop-fill{ height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #4ade80); }
    .gg-page .drop-row.part .drop-fill{ background: linear-gradient(90deg, #f59e0b, #facc15); }
    .gg-page .drop-row.resource .drop-fill{ background: linear-gradient(90deg, #38bdf8, #818cf8); }
    .gg-page .drop-row.logfiles .drop-fill{ background: linear-gradient(90deg, #a78bfa, #f472b6); }

    /* ================= MODAL OVERLAY ================= */
    .gg-page .modal-overlay{
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999; opacity: 0; pointer-events: none; transition: opacity 0.3s;
    }
    .gg-page .modal-overlay.active{ opacity: 1; pointer-events: auto; }
    
    .gg-page .modal-box{
        background: #0f172a; border: 1px solid #22d3ee; border-radius: 8px;
        width: 400px; padding: 20px; box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
        transform: scale(0.9); transition: transform 0.3s; text-align: center;
    }
    .gg-page .modal-overlay.active .modal-box{ transform: scale(1); }
    
    .gg-page .modal-title{ font-size: 1.2rem; font-weight: bold; color: #fff; margin-bottom: 10px; text-transform: uppercase; }
    .gg-page .modal-text{ color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
    
    .gg-page .modal-actions{ display: flex; gap: 10px; justify-content: center; }
    .gg-page .btn-modal{ padding: 10px 20px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    .gg-page .btn-cancel{ background: #334155; color: #fff; }
    .gg-page .btn-cancel:hover{ background: #475569; }
    .gg-page .btn-confirm{ background: #22d3ee; color: #020617; }
    .gg-page .btn-confirm:hover{ background: #06b6d4; box-shadow: 0 0 10px rgba(34, 211, 238, 0.4); }


.gg-page{width:100%;max-width:1180px;margin:28px auto 45px;color:#c3d4e3;font-family:inherit}
.gg-page *{box-sizing:border-box;min-width:0}
.gg-page .gg-heading{margin:0 0 18px;font-size:24px;letter-spacing:2px;color:#eef6fb}
.gg-page .gg-heading small{display:block;margin-top:8px;font-size:12px;letter-spacing:1px;color:#819bb0;font-weight:400}
.gg-page .lottery-card{display:grid;grid-template-columns:150px minmax(270px,1fr) 310px;gap:14px;align-items:start}
.gg-page .gate-tabs{display:grid;gap:10px}
.gg-page .modal-overlay[hidden]{display:none!important}
.gg-page .gate-tab{position:relative;text-align:left;cursor:pointer;border:1px solid #2b455d;border-radius:7px;padding:21px 15px;color:#a2bbd0;background:linear-gradient(130deg,#172e42,#0c1725);font-family:inherit;font-size:14px;font-weight:700;letter-spacing:1px}
.gg-page .gate-tab small{display:block;font:11px/1.6 Arial,sans-serif;letter-spacing:0;color:#8da8bf;margin-top:8px}
.gg-page .gate-tab.active{border-color:#4ab2d2;color:#effcff;box-shadow:inset 3px 0 #57c4e0;background:linear-gradient(130deg,#20485e,#102030)}
.gg-page button:focus-visible{outline:2px solid #7de7fb;outline-offset:3px}
.gg-page .left-zone,.gg-page .controls-zone{border:1px solid #2c4359;border-radius:8px;overflow:hidden;background:linear-gradient(145deg,#14273a,#0b1522)}
.gg-page .gate-title{padding:20px 24px;font-size:18px;letter-spacing:2px;border-bottom:1px solid #233c52;color:#eef6fd}
.gg-page .visual-container{height:335px;display:flex;align-items:center;justify-content:center;position:relative;background:radial-gradient(ellipse,#1b3b52 0%,#0b1829 68%);overflow:hidden}
.gg-page .gate-art-stage{position:relative;width:211px;height:261px;filter:drop-shadow(0 0 17px #16768b55)}
.gg-page .gate-art-bg,.gg-page .gate-art-part,.gg-page .gate-art-spin,.gg-page .gate-part-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
.gg-page .gate-art-bg{opacity:.3;filter:brightness(1.3)}
.gg-page .gate-art-stage.complete .gate-art-bg{opacity:0}
.gg-page .gate-art-spin{opacity:0;z-index:3}.gg-page .gate-art-stage.on-map .gate-art-spin{opacity:.6}
.gg-page .gate-art-empty{position:absolute;bottom:-20px;text-align:center;width:100%;font-size:11px;color:#7091a9}
.gg-page .gate-art-stage:not(.empty) .gate-art-empty{display:none}
.gg-page .gate-info-overlay{padding:20px 24px 24px;border-top:1px solid #233c52}
.gg-page .progress-text,.gg-page .gg-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;line-height:1.5}
.gg-page strong{color:#e1f4ff;overflow-wrap:anywhere;text-align:right}
.gg-page .progress-bar-bg{height:7px;background:#07111c;border:1px solid #2a4559;border-radius:4px;overflow:hidden;margin-top:10px}
.gg-page .progress-bar-fill{height:100%;width:0;background:linear-gradient(90deg,#3481a9,#62d3d4);transition:width .3s}
.gg-page .status-msg{font-size:12px;color:#87d8c8;line-height:1.7;margin:13px 0;overflow-wrap:anywhere}
.gg-page .gg-facts{display:flex;gap:10px;margin:15px 0}.gg-page .gg-facts span{flex:1;border:1px solid #2a4358;background:#0a1725;padding:10px;font-size:10px;letter-spacing:1px}
.gg-page .gg-facts b{display:block;margin-top:5px;font-size:19px;color:#dcedfa;letter-spacing:0}
.gg-page .gg-note{font-size:11px;line-height:1.8;padding:16px 23px;color:#7f9bb0}
.gg-page .controls-zone{padding:20px;display:flex;flex-direction:column;gap:15px}
.gg-page .shop-title{margin:0 0 2px;color:#e9f5ff;font-size:15px;letter-spacing:1.5px}
.gg-page .amount-selector{display:flex;gap:6px}.gg-page .amt-btn{flex:1;border:1px solid #304b61;border-radius:4px;background:#0a1827;color:#86a4bd;padding:9px 0;cursor:pointer;font-weight:700}
.gg-page .amt-btn.active{background:#235772;color:#effbff;border-color:#58a9c7}
.gg-page .btn-action{width:100%;border:1px solid #3981a2;border-radius:5px;background:linear-gradient(#2b7598,#194967);color:#e6faff;font-size:12px;font-weight:700;letter-spacing:.6px;line-height:1.5;padding:13px 10px;cursor:pointer;white-space:normal}
.gg-page .btn-prepare{background:linear-gradient(#247669,#18544d);border-color:#388b7d;margin-top:14px;display:none}
.gg-page button:disabled{opacity:.45;cursor:not-allowed}
.gg-page .gate-life-actions{display:none;margin-top:13px}.gg-page .btn-buy-life{width:100%;padding:10px;background:#142e40;border:1px solid #37657e;border-radius:4px;color:#b7e4f2;font-size:11px;cursor:pointer;white-space:normal}
.gg-page .multiplier-badge{font-size:20px;color:#e8c17f;font-weight:700}.gg-page .cost-box{border-top:1px solid #2a4358;padding-top:14px}
.gg-page .result-panel{height:235px;min-height:235px;max-height:235px;padding:8px}
.gg-page .result-card{grid-template-columns:32px minmax(0,1fr);gap:7px}.gg-page .result-icon{width:32px;height:32px}.gg-page .result-qty{grid-column:2;white-space:normal;overflow-wrap:anywhere;font-size:13px}
.gg-page .result-name,.gg-page .result-desc{overflow-wrap:anywhere}.gg-page .result-empty{min-height:180px}
.gg-page .drop-overview{margin:0}.gg-page .drop-row{grid-template-columns:65px 1fr 32px;font-size:11px}
@media(max-width:1000px){.gg-page .lottery-card{grid-template-columns:120px minmax(240px,1fr) 270px;gap:10px}.gg-page .controls-zone{padding:15px}}
@media(max-width:780px){.gg-page .lottery-card{grid-template-columns:minmax(0,1fr)}.gg-page .gate-tabs{grid-template-columns:repeat(4,minmax(0,1fr))}.gg-page .gate-tab{padding:12px 8px;font-size:12px}.gg-page .visual-container{height:310px}}
</style>
<div class="CMSContent gg-page">
    <h1 class="gg-heading">GALAXY GATES<small>ASSEMBLE · PREPARE · EXPLORE</small></h1>
    <div class="lottery-wrapper">
        <div class="shop-card lottery-card">
            
            <nav class="gate-tabs" aria-label="Galaxy Gate selection">
                <button type="button" class="gate-tab active" onclick="switchGate(1)" aria-pressed="true">Alpha<small id="gateSummary1">Loading…</small></button>
                <button type="button" class="gate-tab" onclick="switchGate(2)" aria-pressed="false">Beta<small id="gateSummary2">Loading…</small></button>
                <button type="button" class="gate-tab" onclick="switchGate(3)" aria-pressed="false">Gamma<small id="gateSummary3">Loading…</small></button>
                <button type="button" class="gate-tab" onclick="switchGate(4)" aria-pressed="false">Delta<small id="gateSummary4">Loading…</small></button>
            </nav>
            <div class="left-zone" id="leftZone" data-gate="1">
                <div class="gate-title" id="uiGateTitle">ALPHA</div>

                <div class="visual-container">


                    <div class="gate-art-stage empty" id="gateArtStage" aria-hidden="true">
                        <img id="gateArtBg" class="gate-art-bg" alt="" draggable="false">
                        <div id="gatePartLayer" class="gate-part-layer"></div>
                        <img id="gateSpinVisual" class="gate-art-spin" alt="" draggable="false">
                        <div class="gate-art-empty">No parts collected</div>
                    </div>

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
                            <div class="gg-facts" id="gateFacts" hidden><span>LIVES<b id="gateLives">—</b></span><span>WAVE<b id="gateWave">—</b></span></div>
                            <button id="btnPrepare" class="btn-action btn-prepare">PREPARE JUMP</button>
                            <div class="gate-life-actions" id="gateLifeActions">
                                <button type="button" class="btn-buy-life" id="btnBuyLife">Buy Extra Life - 10,000 U.</button>
                            </div>
                        </div>
                    </div>
                <div class="gg-note" id="gatePoolNote">Alpha / Beta / Gamma: shared generator.<br>Enter a prepared portal from your home map.</div>
            </div>

            <div class="controls-zone">
                <h3 class="shop-title">Materializer</h3>
                <div class="gg-row"><span>Uridium</span><strong id="ggUridium">—</strong></div>
                <div class="gg-row"><span>Cost / energy</span><strong>40 U.</strong></div>
                <div class="gg-row"><span>Next multiplier</span><strong id="multBadge" class="multiplier-badge">×1</strong></div>

                <div class="cost-box gg-row">
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

                <button id="btnSpin" class="btn-action btn-spin" disabled>MATERIALIZE</button>
                
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

    <div class="modal-overlay" id="confirmModal" role="dialog" aria-modal="true" aria-label="Deploy Galaxy Gate" hidden>
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
let actionPending = false;
let renderGeneration = 0;
let ggCsrf = "";

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
    multBadge.textContent = "×" + Math.max(1, Math.min(6, parseInt(multiplierNext || 1, 10)));
}

function refreshPilotBar(pilot) {
    if (!pilot) return;
    document.getElementById("ggUridium").textContent = pilot.uridium + " U.";

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
    modal.hidden = false;
    modal.classList.add('active');
    
    // On click confirm, execute the real function
    modalConfirmBtn.onclick = function() {
        executePrepareGate();
        closeModal();
    };
}

function closeModal() {
    modal.classList.remove('active');
    modal.hidden = true;
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

    document.getElementById('uiGateTitle').textContent = data.name.toUpperCase();
    uiCount.textContent = data.on_map ? total + ' / ' + total : current + ' / ' + total;
    uiBar.style.width = (data.on_map ? 100 : pct) + '%';
    uiMsg.style.display = 'block';
    uiMsg.textContent = data.completed ? 'COMPLETED · Collect your reward through the exit portal.'
        : data.on_map ? 'PORTAL ON MAP · Enter from your home map.'
        : data.ready ? 'READY TO PREPARE' : current > 0 ? 'ASSEMBLY IN PROGRESS' : 'COLLECT PARTS TO ASSEMBLE THIS GATE';
    btnPrepare.style.display = data.ready && !data.completed ? 'block' : 'none';
    btnPrepare.disabled = actionPending || !data.ready;
    btnPrepare.textContent = 'PREPARE ' + data.name.toUpperCase();
    gateLifeActions.style.display = data.can_buy_life ? 'flex' : 'none';
    btnBuyLife.disabled = actionPending || !data.can_buy_life;
    btnBuyLife.textContent = 'Buy Extra Life · ' + formatNumber(data.extra_life_price) + ' U.';
    btnSpin.disabled = actionPending;
    amtBtns.forEach(button => button.disabled = actionPending);
    document.getElementById('gateFacts').style.display = data.on_map || data.completed ? 'flex' : 'none';
    document.getElementById('gateLives').textContent = lives;
    document.getElementById('gateWave').textContent = wave + ' / ' + totalWaves;
    document.getElementById('gatePoolNote').innerHTML = (currentGateId === 4 ? 'Delta: separate generator.' : 'Alpha / Beta / Gamma: shared generator.') + '<br>Enter a prepared portal from your home map.';
    tabs.forEach((tab, index) => {
        const gate = gatesData[index + 1];
        tab.setAttribute('aria-pressed', String(index + 1 === currentGateId));
        if (gate) document.getElementById('gateSummary' + (index + 1)).textContent = gate.completed ? 'Completed' : gate.on_map ? 'On map · ' + gate.lives + ' lives' : gate.current + ' / ' + gate.total + ' parts';
    });

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
    if (actionPending) return;
    const generation = renderGeneration;
    try {
        const resp = await fetch(ENDPOINT + '?action=init');
        const json = await resp.json();
        if (generation !== renderGeneration) return;
        if(json.status === 'success') {
            ggCsrf = json.csrf;
            refreshPilotBar(json.pilot);
            gatesData = json.gates;
            updateMultiplierBadge(json.multiplier_next);
            updateUI();
        }
    } catch(e) { console.error(e); }
}

async function spinGate() {
    if(btnSpin.disabled || actionPending) return;
    actionPending = true; ++renderGeneration;
    const submittedAmount = spinAmount;
    btnSpin.disabled = true;
    amtBtns.forEach(btn => btn.disabled = true);
    const previousText = btnSpin.innerText;
    btnSpin.innerText = 'MATERIALIZING...';

    try {
        const formData = new FormData();
        formData.append("csrf", ggCsrf);
        formData.append('action', 'spin');
        formData.append('amount', spinAmount);
        formData.append('gate_id', currentGateId);

        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();

        if(data.status === 'success') {
            refreshPilotBar(data.pilot);
            const resultTitle = getMaterializationTitle(submittedAmount);

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
        actionPending = false;
        updateUI();
    }
}

// Click on the button opens the Modal
btnPrepare.addEventListener('click', function() {
    const gateName = gatesData[currentGateId].name;
    openModal(gateName);
});

async function executePrepareGate() {
    if (actionPending) return;
    actionPending = true; ++renderGeneration;
    const submittedGateId = currentGateId;
    btnPrepare.disabled = true;
    try {
        const formData = new FormData();
        formData.append("csrf", ggCsrf);
        formData.append('action', 'prepare');
        formData.append('gate_id', currentGateId);
        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();
        
        if(data.status === 'success') {
            renderResultMessage(data.message, 'item', 'Gate Deployment');
            if(data.gate) {
                gatesData[data.gate.id] = data.gate;
            } else {
                gatesData[submittedGateId].on_map = true;
                gatesData[submittedGateId].current = 0;
                gatesData[submittedGateId].ready = false;
                gatesData[submittedGateId].lives = 3;
                gatesData[submittedGateId].current_wave = 1;
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
    } finally {
        actionPending = false;
        updateUI();
    }
}

// --- LE BOUTON ÉTAIT MANQUANT ICI ---
async function buyExtraLife() {
    if (!gatesData[currentGateId] || btnBuyLife.disabled || actionPending) return;
    actionPending = true; ++renderGeneration;

    btnBuyLife.disabled = true;
    const previousText = btnBuyLife.innerText;
    btnBuyLife.innerText = 'Buying...';

    try {
        const formData = new FormData();
        formData.append("csrf", ggCsrf);
        formData.append('action', 'buy_life');
        formData.append('gate_id', currentGateId);

        const resp = await fetch(ENDPOINT, { method: 'POST', body: formData });
        const data = await resp.json();

        if (data.status === 'success') {
            if (data.gate) {
                gatesData[data.gate.id] = data.gate;
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
        actionPending = false;
        updateUI();
    }
}

btnSpin.addEventListener('click', spinGate);
btnBuyLife.addEventListener('click', buyExtraLife);
// ------------------------------------

// Init
loadGateInfo();
setInterval(() => { if (!document.hidden) loadGateInfo(); }, 10000);
</script>
