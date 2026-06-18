const http = require("http");

const WebSocket = require("ws");

const net = require("net");

const WS_PORT = parseInt(process.env.WS_PORT || "8082", 10);

const TCP_HOST = process.env.TCP_HOST || "127.0.0.1";

const TCP_PORT = parseInt(process.env.TCP_PORT || "8080", 10);

const RX_MAX = 1024 * 1024;

function parsePositiveIntEnv(name, fallback) {
    const parsed = parseInt(process.env[name] || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const WS_MAX_PAYLOAD = parsePositiveIntEnv("WS_MAX_PAYLOAD", 5 * 1024 * 1024);

const WS_BUFFER_HIGH_WATER = parsePositiveIntEnv("WS_BUFFER_HIGH_WATER", 512 * 1024);

const WS_BUFFER_LOW_WATER = parsePositiveIntEnv("WS_BUFFER_LOW_WATER", 128 * 1024);

const TCP_WRITE_QUEUE_MAX = parsePositiveIntEnv("TCP_WRITE_QUEUE_MAX", 512 * 1024);

const BACKPRESSURE_CHECK_MS = parsePositiveIntEnv("BACKPRESSURE_CHECK_MS", 25);

const BACKPRESSURE_LOG_THROTTLE_MS = parsePositiveIntEnv("BACKPRESSURE_LOG_THROTTLE_MS", 5000);

const TCP_TO_WS_MAX_PACKETS_PER_TICK = parsePositiveIntEnv("TCP_TO_WS_MAX_PACKETS_PER_TICK", 256);

const TCP_TO_WS_MAX_MS_PER_TICK = parsePositiveIntEnv("TCP_TO_WS_MAX_MS_PER_TICK", 4);

const TCP_TO_WS_BURST_LOG_PACKETS = parsePositiveIntEnv("TCP_TO_WS_BURST_LOG_PACKETS", 512);

const TCP_TO_WS_BURST_LOG_MS = parsePositiveIntEnv("TCP_TO_WS_BURST_LOG_MS", 8);

const EVENT_LOOP_LAG_CHECK_MS = parsePositiveIntEnv("EVENT_LOOP_LAG_CHECK_MS", 1000);

const EVENT_LOOP_LAG_WARN_MS = parsePositiveIntEnv("EVENT_LOOP_LAG_WARN_MS", 200);

const EVENT_LOOP_LAG_LOG_THROTTLE_MS = parsePositiveIntEnv("EVENT_LOOP_LAG_LOG_THROTTLE_MS", 5000);

const LOG_PACKETS = (process.env.LOG_PACKETS || "0") === "1";

const WS_BINARY_OUT = (process.env.WS_BINARY_OUT || "1") !== "0";

const DELIM_NULL = Buffer.from([ 0 ]);

const DELIM_BS0 = Buffer.from("\\0", "utf8");

const TCP_DELIM = DELIM_NULL;

function findDelimiter(buf) {
    const i0 = buf.indexOf(0);
    const i1 = buf.indexOf(DELIM_BS0);
    if (i0 === -1 && i1 === -1) return null;
    if (i0 === -1) return {
        idx: i1,
        len: 2
    };
    if (i1 === -1) return {
        idx: i0,
        len: 1
    };
    return i0 < i1 ? {
        idx: i0,
        len: 1
    } : {
        idx: i1,
        len: 2
    };
}

function endsWithDelimiter(buf) {
    if (!buf || buf.length === 0) return false;
    if (buf[buf.length - 1] === 0) return true;
    if (buf.length >= 2 && buf[buf.length - 2] === 92 && buf[buf.length - 1] === 48) return true;
    return false;
}

const server = http.createServer((req, res) => {
    try {
        if (req.url === "/health") {
            res.writeHead(200, {
                "Content-Type": "text/plain"
            });
            res.end("OK");
            return;
        }
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });
        res.end("Andromeda WS Proxy");
    } catch (e) {
        try {
            res.writeHead(500);
            res.end("ERR");
        } catch {}
    }
});

const wss = new WebSocket.Server({
    server: server,
    perMessageDeflate: false,
    maxPayload: WS_MAX_PAYLOAD
});

server.listen(WS_PORT, "0.0.0.0", () => {
    console.log("========================================");
    console.log("[Proxy] WebSocket -> TCP started");
    console.log(`[Proxy] Health check : http://0.0.0.0:${WS_PORT}/health`);
    console.log(`[Proxy] WS listening : ws://0.0.0.0:${WS_PORT}`);
    console.log(`[Proxy] TCP target  : ${TCP_HOST}:${TCP_PORT}`);
    console.log("========================================");
});

let lastEventLoopCheckAt = Date.now();
let lastEventLoopLagLogAt = 0;
const eventLoopLagTimer = setInterval(() => {
    const now = Date.now();
    const lagMs = now - lastEventLoopCheckAt - EVENT_LOOP_LAG_CHECK_MS;
    lastEventLoopCheckAt = now;
    if (lagMs < EVENT_LOOP_LAG_WARN_MS) return;
    if (now - lastEventLoopLagLogAt < EVENT_LOOP_LAG_LOG_THROTTLE_MS) return;
    lastEventLoopLagLogAt = now;
    console.warn(`[EVENT_LOOP_LAG] lag=${lagMs}ms expected=${EVENT_LOOP_LAG_CHECK_MS}ms clients=${wss.clients.size}`);
}, EVENT_LOOP_LAG_CHECK_MS);
if (typeof eventLoopLagTimer.unref === "function") eventLoopLagTimer.unref();

wss.on("connection", (ws, req) => {
    const ip = req?.socket?.remoteAddress || "unknown";
    console.log(`\n[WS] Client connected (${ip})`);
    const tcp = net.createConnection({
        host: TCP_HOST,
        port: TCP_PORT
    }, () => {
        console.log("[TCP] Connected to emulator");
    });
    tcp.setNoDelay(true);
    tcp.setKeepAlive(true, 3e4);
    let tcpBuffer = Buffer.alloc(0);
    let closed = false;
    let tcpPausedForWs = false;
    let wsResumeTimer = null;
    let tcpProcessScheduled = false;
    let tcpProcessing = false;
    let tcpBackpressured = false;
    let lastBackpressureLogAt = 0;
    let lastBurstLogAt = 0;
    const logBackpressure = message => {
        const now = Date.now();
        if (now - lastBackpressureLogAt < BACKPRESSURE_LOG_THROTTLE_MS) return;
        lastBackpressureLogAt = now;
        console.warn("[BACKPRESSURE]", message);
    };
    const logBurst = message => {
        const now = Date.now();
        if (now - lastBurstLogAt < BACKPRESSURE_LOG_THROTTLE_MS) return;
        lastBurstLogAt = now;
        console.warn("[TCP_TO_WS_BURST]", message);
    };
    const scheduleTcpBufferProcessing = () => {
        if (closed || tcpProcessScheduled) return;
        tcpProcessScheduled = true;
        setImmediate(() => {
            tcpProcessScheduled = false;
            processTcpBuffer();
        });
    };
    const clearWsResumeTimer = () => {
        if (!wsResumeTimer) return;
        clearTimeout(wsResumeTimer);
        wsResumeTimer = null;
    };
    const getWsBufferedAmount = () => {
        const amount = Number(ws && ws.bufferedAmount);
        return Number.isFinite(amount) ? amount : 0;
    };
    const scheduleWsResumeCheck = () => {
        if (closed || wsResumeTimer) return;
        wsResumeTimer = setTimeout(checkWsResume, BACKPRESSURE_CHECK_MS);
        if (typeof wsResumeTimer.unref === "function") wsResumeTimer.unref();
    };
    const pauseTcpForWs = reason => {
        if (closed || tcpPausedForWs) return;
        tcpPausedForWs = true;
        try {
            tcp.pause();
        } catch {}
        logBackpressure(`${reason}; paused TCP read wsBuffered=${getWsBufferedAmount()} tcpBuffer=${tcpBuffer.length}`);
        scheduleWsResumeCheck();
    };
    function checkWsResume() {
        wsResumeTimer = null;
        if (closed) return;
        if (ws.readyState !== WebSocket.OPEN) {
            closeBoth("WebSocket not open while paused", 1011, "ws_not_open");
            return;
        }
        if (getWsBufferedAmount() > WS_BUFFER_LOW_WATER) {
            scheduleWsResumeCheck();
            return;
        }
        tcpPausedForWs = false;
        processTcpBuffer();
        if (!closed && !tcpPausedForWs && !tcp.destroyed) {
            try {
                tcp.resume();
            } catch {}
        }
    }
    const closeBoth = (why, wsCode = 1011, wsReason = "proxy_close") => {
        if (closed) return;
        closed = true;
        clearWsResumeTimer();
        console.log("[CLOSE]", why, `| wsCode=${wsCode} wsReason=${wsReason}`);
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(wsCode, String(wsReason || "proxy_close").slice(0, 123));
            } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.terminate();
            }
        } catch {}
        try {
            if (!tcp.destroyed) tcp.destroy();
        } catch {}
    };
    const ensureTcpWriteRoom = () => {
        if (tcp.destroyed) return false;
        if (tcp.writableLength > TCP_WRITE_QUEUE_MAX) {
            closeBoth(`TCP write queue overflow writableLength=${tcp.writableLength}`, 1013, "tcp_backpressure");
            return false;
        }
        return true;
    };
    const sendPacketToWs = packet => {
        if (ws.readyState !== WebSocket.OPEN) return false;
        if (getWsBufferedAmount() > WS_BUFFER_HIGH_WATER) {
            pauseTcpForWs("ws_buffer_high_before_send");
            return false;
        }
        if (WS_BINARY_OUT) {
            const out = Buffer.concat([ packet, DELIM_NULL ]);
            const preview = out.length > 200 ? out.slice(0, 200).toString("utf8") + "..." : out.toString("utf8");
            if (LOG_PACKETS) console.log("[TCP -> WS/bin]", JSON.stringify(preview));
            ws.send(out, {
                binary: true
            }, err => {
                if (err) closeBoth(`WS send error: ${err.message}`, 1011, "ws_send_error");
            });
        } else {
            const text = packet.toString("utf8") + "\0";
            const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
            if (LOG_PACKETS) console.log("[TCP -> WS/txt]", JSON.stringify(preview));
            ws.send(text, err => {
                if (err) closeBoth(`WS send error: ${err.message}`, 1011, "ws_send_error");
            });
        }
        if (getWsBufferedAmount() > WS_BUFFER_HIGH_WATER) {
            pauseTcpForWs("ws_buffer_high_after_send");
        }
        return true;
    };
    function processTcpBuffer() {
        if (closed) return;
        if (tcpProcessing) {
            scheduleTcpBufferProcessing();
            return;
        }
        tcpProcessing = true;
        const startedAt = Date.now();
        let scannedPackets = 0;
        let sentPackets = 0;
        let deferred = false;
        try {
            while (!closed) {
                if (tcpPausedForWs) {
                    scheduleWsResumeCheck();
                    break;
                }
                if (getWsBufferedAmount() > WS_BUFFER_HIGH_WATER) {
                    pauseTcpForWs("ws_buffer_high");
                    break;
                }
                const d = findDelimiter(tcpBuffer);
                if (!d) break;
                const packet = tcpBuffer.slice(0, d.idx);
                scannedPackets++;
                if (!packet || packet.length === 0) {
                    tcpBuffer = tcpBuffer.slice(d.idx + d.len);
                } else {
                    if (!sendPacketToWs(packet)) break;
                    tcpBuffer = tcpBuffer.slice(d.idx + d.len);
                    sentPackets++;
                }
                if (scannedPackets >= TCP_TO_WS_MAX_PACKETS_PER_TICK || Date.now() - startedAt >= TCP_TO_WS_MAX_MS_PER_TICK) {
                    if (findDelimiter(tcpBuffer)) {
                        deferred = true;
                        scheduleTcpBufferProcessing();
                    }
                    break;
                }
            }
        } catch (e) {
            console.error("[TCP -> WS] error:", e.message);
            closeBoth("TCP->WS error", 1011, "tcp_to_ws_error");
        } finally {
            const elapsedMs = Date.now() - startedAt;
            tcpProcessing = false;
            if (!closed && !tcpPausedForWs && findDelimiter(tcpBuffer)) {
                scheduleTcpBufferProcessing();
            }
            if (sentPackets >= TCP_TO_WS_BURST_LOG_PACKETS || elapsedMs >= TCP_TO_WS_BURST_LOG_MS) {
                logBurst(`ip=${ip} sent=${sentPackets} scanned=${scannedPackets} duration=${elapsedMs}ms deferred=${deferred ? 1 : 0} tcpBuffer=${tcpBuffer.length} wsBuffered=${getWsBufferedAmount()}`);
            }
        }
    }
    ws.on("message", (data, isBinary) => {
        try {
            let payload;
            if (Buffer.isBuffer(data)) payload = data; else payload = Buffer.from(String(data), "utf8");
            if (!payload || payload.length === 0) return;
            if (!ensureTcpWriteRoom()) return;
            if (!endsWithDelimiter(payload)) {
                payload = Buffer.concat([ payload, TCP_DELIM ]);
            } else {}
            const preview = payload.length > 200 ? payload.slice(0, 200).toString("utf8") + "..." : payload.toString("utf8");
            if (LOG_PACKETS) console.log("[WS -> TCP]", JSON.stringify(preview));
            const writeOk = tcp.write(payload);
            if (!writeOk) {
                tcpBackpressured = true;
                logBackpressure(`tcp.write returned false writableLength=${tcp.writableLength}`);
            }
            ensureTcpWriteRoom();
        } catch (e) {
            console.error("[WS -> TCP] error:", e.message);
            closeBoth("WS->TCP error", 1011, "ws_to_tcp_error");
        }
    });
    tcp.on("data", chunk => {
        try {
            tcpBuffer = Buffer.concat([ tcpBuffer, chunk ]);
            if (tcpBuffer.length > RX_MAX) {
                console.error("[TCP] Buffer overflow >1MB (no delimiter).");
                closeBoth("Overflow TCP buffer", 1009, "tcp_buffer_overflow");
                return;
            }
            processTcpBuffer();
        } catch (e) {
            console.error("[TCP -> WS] error:", e.message);
            closeBoth("TCP->WS error", 1011, "tcp_to_ws_error");
        }
    });
    tcp.on("drain", () => {
        if (tcpBackpressured) {
            tcpBackpressured = false;
            logBackpressure("TCP write queue drained");
        }
    });
    ws.on("close", (code, reasonBuffer) => {
        const reason = Buffer.isBuffer(reasonBuffer) ? reasonBuffer.toString("utf8") : String(reasonBuffer || "");
        console.log(`[WS] Client socket closed code=${code} reason=${reason || "?"}`);
        closeBoth("WebSocket closed by client", 1000, "client_closed");
    });
    ws.on("error", err => {
        console.error("[WS] Error:", err.message);
        closeBoth("WebSocket error", 1011, "websocket_error");
    });
    tcp.on("close", hadError => closeBoth(`TCP closed by emulator${hadError ? " (error)" : ""}`, 1013, "emulator_closed"));
    tcp.on("error", err => {
        console.error("[TCP] Error:", err.message);
        closeBoth("TCP error", 1014, "emulator_tcp_error");
    });
});
