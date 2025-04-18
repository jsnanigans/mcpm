// Utility for argument parsing
export function getArgValue<Req extends boolean = false, Rt = Req extends true ? string : string | undefined>(
    keys: string[],
    required?: Req
): Rt {
    const args = process.argv.slice(2);
    let value: string | undefined;
    for (let i = 0; i < args.length; i++) {
        for (const key of keys) {
            if (args[i] === key) {
                value = args[i + 1];
                break;
            } else if (args[i].startsWith(key + "=")) {
                value = args[i].split("=")[1];
                break;
            }
        }
        if (value) break;
    }
    if (required && !value) {
        console.error(`Usage: mcpm --mcp-server <mcp-server-key> [--config <config-file-path>]`);
        process.exit(1);
    }
    return value as Rt;
} 