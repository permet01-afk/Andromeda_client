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
    .gate-part-layer { position: absolute; inset: 0; z-index: 2; }
    .gate-art-part { opacity: .98; }
    .gate-art-spin {
        opacity: 0; transform: scale(1.02); transition: opacity .25s ease;
        filter: brightness(1.08) saturate(1.2); z-index: 3;
    }
    .gate-art-stage.on-map .gate-art-spin { opacity: .94; }
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
    @keyframes pulseBtn { 0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }

    .log-window {
        flex: none; height: 220px; background: #020617; border: 1px solid #1e293b; border-radius: 4px;
        font-family: 'Courier New', monospace; font-size: 0.8rem; padding: 10px;
        overflow-y: auto;
    }
    .log-entry { margin-bottom: 8px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; color: #64748b; }
    .log-entry span { color: #334155; font-size: 0.7rem; margin-right: 5px; }
    .log-entry.part { color: #facc15; }
    .log-entry.item { color: #fff; }
    .log-entry.error { color: #ef4444; }
    .log-entry.mult { color: #f59e0b; }
    .log-entry.group { color: #94a3b8; }
    .log-line { margin: 2px 0; line-height: 1.35; }
    .log-line .tag { display: inline-block; min-width: 82px; color: #64748b; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }
    .log-line.part { color: #facc15; }
    .log-line.item { color: #e2e8f0; }
    .log-line.mult { color: #f59e0b; }
    .log-line.error { color: #ef4444; }

    .loot-table { font-size: 0.75rem; color: #64748b; margin-top: auto; }
    .loot-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #334155; padding: 3px 0; }
    .loot-note { color: #94a3b8; font-size: 0.72rem; line-height: 1.35; margin-top: 8px; }

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

                <div class="log-window" id="logBox">
                    <div class="log-entry"><span>SYS</span> Materializer ready.</div>
                </div>

                <button id="btnSpin" class="btn-action btn-spin">MATERIALIZE</button>
                
                <button id="btnPrepare" class="btn-action btn-prepare">PREPARE JUMP</button>

                <div class="loot-table">
                    <div class="loot-row"><span>Ammo (MCB, SAB, rockets)</span><span>62%</span></div>
                    <div class="loot-row"><span style="color:#facc15">Gate Part</span><span>20%</span></div>
                    <div class="loot-row"><span>Resources</span><span>10%</span></div>
                    <div class="loot-row"><span>Logfiles</span><span>8%</span></div>
                    <div class="loot-note">MCB-25 is reduced. PLT-2021 and Hellstorm can drop. Selected Alpha/Beta/Gamma has a light part priority; Delta is separate.</div>
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
const logBox = document.getElementById('logBox');
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

function trimLogs(maxEntries = 40) {
    while (logBox.children.length > maxEntries) {
        logBox.removeChild(logBox.lastElementChild);
    }
}

function addLog(msg, type = 'normal') {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    const div = document.createElement('div');
    div.className = 'log-entry ' + type;
    div.innerHTML = `<span>${time}</span> ${escapeHtml(msg)}`;
    logBox.prepend(div);
    trimLogs();
}

function addLogGroup(entries) {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    const div = document.createElement('div');
    div.className = 'log-entry group';

    const safeEntries = Array.isArray(entries) ? entries : [];
    const lines = safeEntries.map(entry => {
        const type = entry.type || 'normal';
        const label = entry.label || 'INFO';
        const message = entry.message || '';
        return `<div class="log-line ${escapeHtml(type)}"><span class="tag">${escapeHtml(label)}</span>${escapeHtml(message)}</div>`;
    });

    div.innerHTML = `<span>${time}</span>${lines.join('')}`;
    logBox.prepend(div);
    trimLogs();
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
    uiMsg.style.display = "none";

    if (data.on_map) {
        uiCount.innerText = "ACTIVE";
        uiBar.style.width = "100%";
        uiMsg.innerText = `PORTAL ON MAP — Lives: ${lives} — Wave: ${wave} / ${totalWaves}`;
        uiMsg.style.display = "block";
        btnSpin.disabled = false;
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

            if(Array.isArray(data.log_group)) {
                addLogGroup(data.log_group);
            } else if(Array.isArray(data.logs)) {
                data.logs.slice().reverse().forEach(entry => {
                    addLog(entry.message || '', entry.type || data.type || 'normal');
                });
            } else {
                let css = 'normal';
                if(data.type === 'part') css = 'part';
                if(data.type === 'item') css = 'item';
                addLog(data.log, css);
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
            addLog(data.message || "Transaction failed", 'error');
        }
    } catch(e) {
        addLog("Server connection error", 'error');
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
            addLog(data.message, 'item');
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
            addLog(data.message, 'error');
            btnPrepare.disabled = false;
        }
    } catch(e) {
        addLog("Error preparing gate", 'error');
        btnPrepare.disabled = false;
    }
}

// --- LE BOUTON ÉTAIT MANQUANT ICI ---
btnSpin.addEventListener('click', spinGate);
// ------------------------------------

// Init
loadGateInfo();
</script>
