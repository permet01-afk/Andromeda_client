const http = require("http");

const WebSocket = require("ws");

const net = require("net");

const WS_PORT = parseInt(process.env.WS_PORT || "8082", 10);

const TCP_HOST = process.env.TCP_HOST || "127.0.0.1";

const TCP_PORT = parseInt(process.env.TCP_PORT || "8080", 10);

const RX_MAX = 1024 * 1024;

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
    maxPayload: 50 * 1024 * 1024
});

server.listen(WS_PORT, "0.0.0.0", () => {
    console.log("========================================");
    console.log("[Proxy] WebSocket -> TCP started");
    console.log(`[Proxy] Health check : http://0.0.0.0:${WS_PORT}/health`);
    console.log(`[Proxy] WS listening : ws://0.0.0.0:${WS_PORT}`);
    console.log(`[Proxy] TCP target  : ${TCP_HOST}:${TCP_PORT}`);
    console.log("========================================");
});

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
    const closeBoth = (why, wsCode = 1011, wsReason = "proxy_close") => {
        if (closed) return;
        closed = true;
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
    ws.on("message", (data, isBinary) => {
        try {
            let payload;
            if (Buffer.isBuffer(data)) payload = data; else payload = Buffer.from(String(data), "utf8");
            if (!payload || payload.length === 0) return;
            if (!endsWithDelimiter(payload)) {
                payload = Buffer.concat([ payload, TCP_DELIM ]);
            } else {}
            const preview = payload.length > 200 ? payload.slice(0, 200).toString("utf8") + "..." : payload.toString("utf8");
            if (LOG_PACKETS) console.log("[WS -> TCP]", JSON.stringify(preview));
            tcp.write(payload);
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
            while (true) {
                const d = findDelimiter(tcpBuffer);
                if (!d) break;
                const packet = tcpBuffer.slice(0, d.idx);
                tcpBuffer = tcpBuffer.slice(d.idx + d.len);
                if (!packet || packet.length === 0) continue;
                if (ws.readyState === WebSocket.OPEN) {
                    if (WS_BINARY_OUT) {
                        const out = Buffer.concat([ packet, DELIM_NULL ]);
                        const preview = out.length > 200 ? out.slice(0, 200).toString("utf8") + "..." : out.toString("utf8");
                        if (LOG_PACKETS) console.log("[TCP -> WS/bin]", JSON.stringify(preview));
                        ws.send(out, {
                            binary: true
                        });
                    } else {
                        const text = packet.toString("utf8") + "\0";
                        const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
                        if (LOG_PACKETS) console.log("[TCP -> WS/txt]", JSON.stringify(preview));
                        ws.send(text);
                    }
                }
            }
        } catch (e) {
            console.error("[TCP -> WS] error:", e.message);
            closeBoth("TCP->WS error", 1011, "tcp_to_ws_error");
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