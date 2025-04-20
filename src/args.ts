// Utility for argument parsing
export interface ParsedArgs {
    command?: string;
    subcommand?: string;
    flags: Record<string, string | boolean>;
    positionals: string[];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
    const result: ParsedArgs = { flags: {}, positionals: [] };
    let i = 0;
    // Parse command and subcommand
    if (argv[i] && !argv[i].startsWith("-")) {
        result.command = argv[i++];
        if (argv[i] && !argv[i].startsWith("-")) {
            result.subcommand = argv[i++];
        }
    }
    // Parse flags and positionals
    while (i < argv.length) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const eqIdx = arg.indexOf("=");
            if (eqIdx !== -1) {
                const key = arg.slice(0, eqIdx);
                const value = arg.slice(eqIdx + 1);
                result.flags[key] = value;
            } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
                result.flags[arg] = argv[i + 1];
                i++;
            } else {
                result.flags[arg] = true;
            }
        } else if (arg.startsWith("-")) {
            // Short flag, e.g. -c config.json
            if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
                result.flags[arg] = argv[i + 1];
                i++;
            } else {
                result.flags[arg] = true;
            }
        } else {
            result.positionals.push(arg);
        }
        i++;
    }
    return result;
}

// Backward compatible getArgValue for legacy code
export function getArgValue<Req extends boolean = false, Rt = Req extends true ? string : string | undefined>(
    keys: string[],
    required?: Req
): Rt {
    const { flags } = parseArgs();
    let value: string | undefined;
    for (const key of keys) {
        if (flags[key] && typeof flags[key] === 'string') {
            value = flags[key] as string;
            break;
        }
    }
    if (required && !value) {
        console.error(`Usage: mcpm --server <server-key> [--config <config-file-path>]`);
        process.exit(1);
    }
    return value as Rt;
} 