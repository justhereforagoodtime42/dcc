/*
 * Nexora installer wrapper — conflict detection before invoking Vencord Installer CLI
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALLER = join(ROOT, "dist", "Installer", "VencordInstallerCli.exe");
const PATCHER = join(ROOT, "dist", "patcher.js");

const CHANNELS = {
    stable: "Discord",
    ptb: "DiscordPTB",
    canary: "DiscordCanary",
    development: "DiscordDevelopment"
};

function parseArgs(argv) {
    const out = { action: "install", branch: "stable", force: false, yes: false, location: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "install" || a === "uninstall" || a === "repair" || a === "status" || a === "explain") out.action = a;
        else if (a === "-branch" || a === "--branch") out.branch = argv[++i];
        else if (a === "-location" || a === "--location") out.location = argv[++i];
        else if (a === "-force" || a === "--force") out.force = true;
        else if (a === "-y" || a === "--yes") out.yes = true;
        else if (a === "-h" || a === "--help") out.action = "help";
    }
    return out;
}

function findDiscordRoot(branch) {
    const name = CHANNELS[branch] || CHANNELS.stable;
    const base = join(process.env.LOCALAPPDATA || "", name);
    if (!existsSync(base)) return null;
    const apps = readdirSync(base)
        .filter(d => d.startsWith("app-"))
        .map(d => join(base, d))
        .filter(p => existsSync(join(p, "resources")))
        .sort((a, b) => {
            try {
                return statSync(b).mtimeMs - statSync(a).mtimeMs;
            } catch {
                return 0;
            }
        });
    return apps[0] ? { channelDir: base, appDir: apps[0], resources: join(apps[0], "resources"), folderName: name } : null;
}

function inspectInstall(resources) {
    const appAsar = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    const info = {
        hasAppAsar: existsSync(appAsar),
        hasBackup: existsSync(backup),
        patchedByVencordStyle: existsSync(backup),
        appAsarBytes: existsSync(appAsar) ? statSync(appAsar).size : 0,
        conflicts: []
    };

    if (info.patchedByVencordStyle && info.appAsarBytes > 0 && info.appAsarBytes < 4096) {
        try {
            // tiny loader asar — try to read as zip-like text is unreliable; note present
            info.loaderLikely = true;
        } catch {
            info.loaderLikely = true;
        }
    }

    // BetterDiscord marker
    const bd = join(resources, "app");
    if (existsSync(bd) && !info.hasBackup) {
        info.conflicts.push({
            id: "betterdiscord-or-unpacked",
            message: "Found an unpacked resources/app directory without _app.asar. Another client mod may be installed."
        });
    }

    if (info.patchedByVencordStyle) {
        info.conflicts.push({
            id: "existing-vencord-style",
            message: "This Discord install already has a Vencord-style patch (_app.asar present). Reinstall/repair will replace the current mod loader."
        });
    }

    return info;
}

function printExplain(opts, discord, info) {
    console.log("=== Nexora install plan ===");
    console.log(`Action:     ${opts.action}`);
    console.log(`Branch:     ${opts.branch}`);
    if (!discord) {
        console.log("Target:     NOT FOUND — install Discord for this channel first.");
        return;
    }
    console.log(`Channel:    ${discord.folderName}`);
    console.log(`App dir:    ${discord.appDir}`);
    console.log(`Resources:  ${discord.resources}`);
    console.log(`app.asar:   ${info.hasAppAsar ? `${info.appAsarBytes} bytes` : "missing"}`);
    console.log(`_app.asar:  ${info.hasBackup ? "present (already patched)" : "absent (stock)"}`);
    console.log("");
    console.log("What will change:");
    if (opts.action === "install" || opts.action === "repair") {
        console.log("  - Rename resources/app.asar → resources/_app.asar (backup of Discord's original)");
        console.log("  - Write a tiny resources/app.asar that loads this repo's dist/patcher.js");
        console.log("  - Does NOT request Discord passwords or tokens");
        console.log("  - Does NOT delete user Documents/Downloads or Discord message history");
    } else if (opts.action === "uninstall") {
        console.log("  - Restore resources/_app.asar → resources/app.asar when possible");
        console.log("  - Remove the Nexora/Vencord-style loader asar");
    }
    if (info.conflicts.length) {
        console.log("");
        console.log("Conflicts / notices:");
        for (const c of info.conflicts) console.log(`  ! [${c.id}] ${c.message}`);
        if (!opts.force && opts.action !== "status" && opts.action !== "explain") {
            console.log("");
            console.log("Re-run with --force to proceed despite an existing patch, or uninstall first.");
        }
    }
    console.log("");
    console.log(`Patcher built: ${existsSync(PATCHER) ? "yes" : "NO — run pnpm build first"}`);
}

function ensureBuilt() {
    if (!existsSync(PATCHER)) {
        console.error("dist/patcher.js missing. Run: pnpm build");
        process.exit(1);
    }
}

function runInstallerCli(args) {
    // Ensure installer binary exists via upstream helper
    const prep = spawnSync(process.execPath, [join(ROOT, "scripts", "runInstaller.mjs"), "--", "-help"], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, VENCORD_USER_DATA_DIR: ROOT, VENCORD_DEV_INSTALL: "1" }
    });
    // runInstaller always tries to exec help and may exit non-zero; binary should exist after
    const bin = process.platform === "win32"
        ? INSTALLER
        : join(ROOT, "dist", "Installer", process.platform === "darwin" ? "VencordInstallerCli-darwin" : "VencordInstallerCli-linux");

    if (!existsSync(bin) && process.platform === "win32") {
        console.error("Installer CLI missing after download attempt:", bin);
        process.exit(1);
    }

    const r = spawnSync(bin, args, {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, VENCORD_USER_DATA_DIR: ROOT, VENCORD_DEV_INSTALL: "1" }
    });
    process.exit(r.status ?? 1);
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.action === "help") {
        console.log(`Nexora installer wrapper

Usage:
  node scripts/nexora-install.mjs <install|uninstall|repair|status|explain> [-branch stable|ptb|canary] [--force]

Examples:
  pnpm nexora:install
  pnpm nexora:status
  pnpm nexora:uninstall
`);
        process.exit(0);
    }

    const discord = opts.location
        ? { channelDir: opts.location, appDir: opts.location, resources: join(opts.location, "resources"), folderName: "custom" }
        : findDiscordRoot(opts.branch);

    const info = discord ? inspectInstall(discord.resources) : { conflicts: [], hasAppAsar: false, hasBackup: false, appAsarBytes: 0 };

    if (opts.action === "status" || opts.action === "explain") {
        printExplain(opts, discord, info);
        process.exit(discord ? 0 : 2);
    }

    if (!discord) {
        console.error(`Discord ${opts.branch} not found under %LOCALAPPDATA%.`);
        process.exit(2);
    }

    printExplain(opts, discord, info);

    if (!existsSync(PATCHER)) ensureBuilt();

    const blocking = info.conflicts.some(c => c.id === "existing-vencord-style");
    if (blocking && (opts.action === "install") && !opts.force) {
        console.error("Refusing to overwrite an existing client mod without --force.");
        console.error("Use: pnpm nexora:uninstall   or   pnpm nexora:repair --force");
        process.exit(3);
    }

    const branchArgs = ["-branch", opts.branch];
    // Note: the upstream installer may refresh files under dist/. Always rebuild Nexora after install/repair.
    if (opts.action === "install" || opts.action === "repair") {
        console.log("Building Nexora dist before patching…");
        const build = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build"], {
            cwd: ROOT,
            stdio: "inherit",
            shell: true
        });
        if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);
    }
    if (opts.action === "install") runInstallerCli(["-install", ...branchArgs]);
    if (opts.action === "uninstall") runInstallerCli(["-uninstall", ...branchArgs]);
    if (opts.action === "repair") runInstallerCli(["-repair", ...branchArgs]);
    if (opts.action === "install" || opts.action === "repair") {
        console.log("Rebuilding Nexora dist after installer (installer may refresh upstream artifacts)…");
        const rebuild = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build"], {
            cwd: ROOT,
            stdio: "inherit",
            shell: true
        });
        if ((rebuild.status ?? 1) !== 0) process.exit(rebuild.status ?? 1);
        console.log("Done. Restart Discord. If the loader still points at stale files, run: pnpm build && pnpm inject:stable");
    }
}

main();
