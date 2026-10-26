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
const ZIP_URL = `https://github.com/${REPO}/releases/download/${RELEASE_TAG}/Nexora-Windows.zip`;
const BUILD_ID_FILE = ".nexora-release-id";
const BUILD_META_FILE = ".nexora-release-meta.json";

function installRoot(): string {
    // patcher.js lives in <install>/dist — __dirname is that dist folder
    return dirname(__dirname);
}

function isNexoraClientInstall() {
    const root = installRoot();
    if (!existsSync(join(root, "dist", "patcher.js")) && !existsSync(join(__dirname, "patcher.js")))
        return false;
    const norm = root.replace(/\\/g, "/").toLowerCase();
    // LocalAppData\NexoraClient or stamped release builds
    return norm.includes("nexoraclient") || existsSync(join(__dirname, BUILD_ID_FILE)) || existsSync(join(__dirname, BUILD_META_FILE));
}

function localBuildId(): string {
    try {
        return readFileSync(join(__dirname, BUILD_ID_FILE), "utf-8").trim();
    } catch {
        return "";
    }
}

function localBuildMeta(): { id: string; assetUpdatedAt: string; } {
    try {
        const raw = readFileSync(join(__dirname, BUILD_META_FILE), "utf-8");
        const j = JSON.parse(raw);
        return { id: String(j.id || ""), assetUpdatedAt: String(j.assetUpdatedAt || "") };
    } catch {
        return { id: localBuildId(), assetUpdatedAt: "" };
    }
}

function writeBuildStamp(id: string, assetUpdatedAt: string) {
    writeFileSync(join(__dirname, BUILD_ID_FILE), id, "utf-8");
    writeFileSync(
        join(__dirname, BUILD_META_FILE),
        JSON.stringify({ id, assetUpdatedAt, updatedAt: new Date().toISOString() }, null, 2),
        "utf-8"
    );
}

/** Short SHAs from git / release titles can differ in length (7 vs 8+). */
function sameCommit(a: string, b: string) {
    if (!a || !b) return false;
    if (a === b) return true;
    return a.startsWith(b) || b.startsWith(a);
}

async function fetchJson(url: string): Promise<any> {
    const res = await net.fetch(url, {
        headers: {
            "User-Agent": "NexoraAutoUpdate",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    } as any);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function downloadToFile(url: string, dest: string) {
    const res = await net.fetch(url, {
        headers: { "User-Agent": "NexoraAutoUpdate", Accept: "application/octet-stream" },
        bypassCustomProtocolHandlers: true,
        redirect: "follow",
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
        try {
            if (existsSync(join(nested, "patcher.js"))) return nested;
            if (existsSync(join(nested, "dist", "patcher.js"))) return join(nested, "dist");
        } catch { /* ignore */ }
    }
    return null;
}

async function notify(title: string, message: string) {
    try {
        const win = BrowserWindow.getAllWindows()[0];
        const opts = {
            type: "info" as const,
            title,
            message,
            buttons: ["OK"],
        };
        if (win) await dialog.showMessageBox(win, opts);
        else await dialog.showMessageBox(opts);
    } catch { /* early boot / no window yet */ }
}

/**
 * For one-click installs: if GitHub nexora-latest is newer, replace dist/.
 * Friend keeps their own theme files in %AppData%\Nexora\themes.
 */
export async function maybeAutoUpdateNexora(): Promise<void> {
    if (process.platform !== "win32") return;
    if (!isNexoraClientInstall()) {
        console.info("[Nexora] Auto-update: skipped (not a NexoraClient install)");
        return;
    }

    try {
        const release = await fetchJson(RELEASE_API);
        const fromTitle = /Nexora latest \(([0-9a-f]{7,40})\)/i.exec(String(release.name || ""));
        const wanted = (fromTitle?.[1] || String(release.target_commitish || "")).trim();
        const asset = (release.assets || []).find((a: any) => a.name === "Nexora-Windows.zip");
        const assetUpdatedAt = String(asset?.updated_at || release.published_at || "");
        const have = localBuildMeta();

        if (
            wanted
            && sameCommit(have.id, wanted)
            && have.assetUpdatedAt
            && have.assetUpdatedAt === assetUpdatedAt
        ) {
            console.info("[Nexora] Auto-update: already up to date", have.id, have.assetUpdatedAt);
            return;
        }

        // Also treat matching commit with empty meta as up to date only if asset times match after first update
        if (wanted && sameCommit(have.id, wanted) && !assetUpdatedAt) {
            console.info("[Nexora] Auto-update: already up to date", have.id);
            return;
        }

        const downloadUrl = asset?.browser_download_url || ZIP_URL;
        console.info("[Nexora] Auto-update: downloading", wanted || "latest", "(have:", have.id || "none", ")");

        const tmp = join(tmpdir(), `nexora-update-${Date.now()}`);
        mkdirSync(tmp, { recursive: true });
        const zip = join(tmp, "Nexora-Windows.zip");
        const extractTo = join(tmp, "out");

        await downloadToFile(downloadUrl, zip);
        extractZipWindows(zip, extractTo);

        const srcDist = findDistInExtract(extractTo);
        if (!srcDist) throw new Error("Update zip missing dist/patcher.js");

        mkdirSync(__dirname, { recursive: true });
        cpSync(srcDist, __dirname, { recursive: true });

        const stampedId = wanted || localBuildId() || "unknown";
        writeBuildStamp(stampedId, assetUpdatedAt);

        console.info("[Nexora] Auto-update applied. Restart Discord to finish.");
        await notify(
            "Nexora updated",
            "Nexora downloaded an update. Fully quit Discord (tray too), then open it again to finish."
        );

        try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    } catch (err) {
        console.error("[Nexora] Auto-update failed", err);
        // Don't spam every launch with a modal on transient errors — log is enough.
        // Friends without auto-update in their build never reach here; they must re-run the installer.
    }
}
