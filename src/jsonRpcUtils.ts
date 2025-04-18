export function parseJsonRpcMessages(
    stream: NodeJS.ReadableStream,
    onMessage: (msg: any, raw: string) => void
): void {
    let buffer = "";
    stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.trim()) {
                try {
                    const msg = JSON.parse(line);
                    onMessage(msg, line);
                } catch (e) {
                    // Not JSON, ignore
                }
            }
        }
    });
}

export function sendJsonRpcMessage(stream: NodeJS.WritableStream, msg: any): void {
    stream.write(JSON.stringify(msg) + "\n");
} 