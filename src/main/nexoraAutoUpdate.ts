/*
 * Auto-update NexoraClient installs from the nexora-latest GitHub Release
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, dialog, net } from "electron";
import { execFileSync } from "child_process";
import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

const REPO = "justhereforagoodtime42/dcc";
const RELEASE_TAG = "nexora-latest";
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/tags/${RELEASE_TAG}`;
const BUILD_ID_FILE = ".nexora-release-id";

function installRoot(): string {
    // patcher.js lives in <install>/dist — __dirname is that dist folder
    return dirname(__dirname);
}

function isNexoraClientInstall() {
    const root = installRoot();
    if (!existsSync(join(root, "dist", "patcher.js"))) return false;
    const norm = root.replace(/\\/g, "/").toLowerCase();
    return norm.includes("/nexoraclient") || existsSync(join(__dirname, BUILD_ID_FILE));
}

function localBuildId(): string {
    try {
        return readFileSync(join(__dirname, BUILD_ID_FILE), "utf-8").trim();
    } catch {
        return "";
    }
}

async function fetchJson(url: string): Promise<any> {
    const res = await net.fetch(url, {
        headers: {
            "User-Agent": "NexoraAutoUpdate",
            Accept: "application/vnd.github+json",
        },
    } as any);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function downloadToFile(url: string, dest: string) {
    const res = await net.fetch(url, {
        headers: { "User-Agent": "NexoraAutoUpdate" },
        bypassCustomProtocolHandlers: true,
    } as any);
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function extractZipWindows(zipPath: string, destDir: string) {
    const ps = `
$ErrorActionPreference = 'Stop'
$zip = '${zipPath.replace(/'/g, "''")}'
$dest = '${destDir.replace(/'/g, "''")}'
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force
`;
    const script = join(tmpdir(), `nexora-extract-${Date.now()}.ps1`);
    writeFileSync(script, ps, "utf-8");
    try {
        execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
            stdio: "ignore",
            windowsHide: true,
        });
    } finally {
        try { rmSync(script, { force: true }); } catch { /* ignore */ }
    }
}

function findDistInExtract(extractedRoot: string): string | null {
    if (existsSync(join(extractedRoot, "patcher.js"))) return extractedRoot;
    if (existsSync(join(extractedRoot, "dist", "patcher.js"))) return join(extractedRoot, "dist");

    for (const name of readdirSync(extractedRoot)) {
        const nested = join(extractedRoot, name);
        if (existsSync(join(nested, "patcher.js"))) return nested;
        if (existsSync(join(nested, "dist", "patcher.js"))) return join(nested, "dist");
    }
    return null;
}

/**
 * For one-click installs: if GitHub nexora-latest is newer, replace dist/.
 * Friend keeps their own theme files in %AppData%\Nexora\themes.
 */
export async function maybeAutoUpdateNexora(): Promise<void> {
    if (process.platform !== "win32") return;
    if (!isNexoraClientInstall()) return;

    try {
        const release = await fetchJson(RELEASE_API);
        const fromTitle = /Nexora latest \(([0-9a-f]{7,40})\)/i.exec(String(release.name || ""));
        const wanted = (fromTitle?.[1] || String(release.target_commitish || release.id || "")).slice(0, 40);
        const have = localBuildId();

        if (have && wanted && have === wanted) {
            console.info("[Nexora] Auto-update: already up to date", have);
            return;
        }

        const asset = (release.assets || []).find((a: any) => a.name === "Nexora-Windows.zip");
        if (!asset?.browser_download_url) {
            console.warn("[Nexora] Auto-update: no Nexora-Windows.zip on release");
            return;
        }

        console.info("[Nexora] Auto-update: downloading", wanted, "(have:", have || "none", ")");
        const tmp = join(tmpdir(), `nexora-update-${Date.now()}`);
        mkdirSync(tmp, { recursive: true });
        const zip = join(tmp, "Nexora-Windows.zip");
        const extractTo = join(tmp, "out");

        await downloadToFile(asset.browser_download_url, zip);
        extractZipWindows(zip, extractTo);

        const srcDist = findDistInExtract(extractTo);
        if (!srcDist) throw new Error("Update zip missing dist/patcher.js");

        mkdirSync(__dirname, { recursive: true });
        cpSync(srcDist, __dirname, { recursive: true });

        if (wanted) {
            writeFileSync(join(__dirname, BUILD_ID_FILE), wanted, "utf-8");
        }

        console.info("[Nexora] Auto-update applied. Restart Discord to finish.");
        try {
            const win = BrowserWindow.getAllWindows()[0];
            const opts = {
                type: "info" as const,
                title: "Nexora updated",
                message: "Nexora downloaded an update. Restart Discord to use it.",
                buttons: ["OK"],
            };
            if (win) await dialog.showMessageBox(win, opts);
            else await dialog.showMessageBox(opts);
        } catch { /* early boot / no window yet */ }

        try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    } catch (err) {
        console.error("[Nexora] Auto-update failed", err);
    }
}
