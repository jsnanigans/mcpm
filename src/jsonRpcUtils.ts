import { log } from "./logger.js";

interface JsonRpcMessage {
    jsonrpc?: string;
    id?: string | number;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

export function parseJsonRpcMessages(
    stream: NodeJS.ReadableStream,
    onMessage: (msg: JsonRpcMessage, raw: string) => void
): void {
    let buffer = "";
    
    const handleData = (chunk: Buffer) => {
        buffer += chunk.toString();
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.trim()) {
                try {
                    const msg = JSON.parse(line) as JsonRpcMessage;
                    onMessage(msg, line);
                } catch (e) {
                    // Log parse errors for debugging but don't crash
                    log(`JSON parse error: ${e instanceof Error ? e.message : e} for line: ${line.substring(0, 100)}...`, { 
                        domain: 'error', 
                        level: 'warn' 
                    });
                }
            }
        }
    };
    
    stream.on("data", handleData);
    stream.on("error", (err) => {
        log(`Stream error: ${err.message}`, { domain: 'error', level: 'error' });
    });
}

export function sendJsonRpcMessage(stream: NodeJS.WritableStream, msg: JsonRpcMessage): void {
    try {
        const data = JSON.stringify(msg) + "\n";
        if (!stream.writable) {
            throw new Error('Stream is not writable');
        }
        stream.write(data, (err) => {
            if (err) {
                log(`Error writing to stream: ${err.message}`, { domain: 'error', level: 'error' });
            }
        });
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        log(`Error sending JSON-RPC message: ${error.message}`, { domain: 'error', level: 'error' });
        console.error("Error sending JSON-RPC message:", error);
    }
} 