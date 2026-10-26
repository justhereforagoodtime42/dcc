/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { execFileSync } from "child_process";
import { ipcMain } from "electron";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { serializeErrors, VENCORD_FILES } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
/** Rolling Nexora one-click release (also marked latest). */
const RELEASE_ENDPOINT = "/releases/latest";
const THEMES_ZIP = "themes-defaults.zip";

let PendingUpdates = [] as [string, string][];
let PendingThemesZip: string | null = null;

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

/** Release titles: "DevBuild abc1234" / "Nexora Build abc1234" / legacy "Nexora latest (abc1234)". */
function hashFromReleaseName(name: string) {
    const m = /([0-9a-f]{7,40})\)?\s*$/i.exec(String(name || "").trim());
    return m?.[1]?.toLowerCase() ?? "";
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
    const script = join(tmpdir(), `nexora-themes-${Date.now()}.ps1`);
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

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    const data = await githubGet(`/compare/${gitHash}...HEAD`);

    return data.commits.map((c: any) => ({
        // github api only sends the long sha
        hash: c.sha.slice(0, 7),
        author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    const data = await githubGet(RELEASE_ENDPOINT);

    const hash = hashFromReleaseName(data.name);
    if (hash && (hash === gitHash.toLowerCase() || gitHash.toLowerCase().startsWith(hash) || hash.startsWith(gitHash.toLowerCase())))
        return false;

    PendingUpdates = [];
    PendingThemesZip = null;
    data.assets.forEach(({ name, browser_download_url }) => {
        if (name === THEMES_ZIP) {
            PendingThemesZip = browser_download_url;
            return;
        }
        if (VENCORD_FILES.some(s => name === s || name.startsWith(s))) {
            PendingUpdates.push([name, browser_download_url]);
        }
    });

    // No matching assets ⇒ not a usable update (don't pretend we updated)
    if (!PendingUpdates.length) return false;

    return true;
}

async function applyUpdates() {
    const fileContents = await Promise.all(PendingUpdates.map(async ([name, url]) => {
        const contents = await fetchBuffer(url);
        return [join(__dirname, name), contents] as const;
    }));

    await Promise.all(fileContents.map(async ([filename, contents]) =>
        writeFile(filename, contents))
    );

    if (PendingThemesZip) {
        try {
            const buf = await fetchBuffer(PendingThemesZip);
            const zipPath = join(tmpdir(), `nexora-${THEMES_ZIP}`);
            writeFileSync(zipPath, Buffer.from(buf));
            const extractTo = join(tmpdir(), `nexora-themes-out-${Date.now()}`);
            extractZipWindows(zipPath, extractTo);
            // zip root is "themes/" (contains defaults/)
            const srcThemes = join(extractTo, "themes");
            const destThemes = join(__dirname, "themes");
            mkdirSync(destThemes, { recursive: true });
            if (existsSync(srcThemes)) {
                cpSync(srcThemes, destThemes, { recursive: true });
            } else if (existsSync(join(extractTo, "defaults"))) {
                mkdirSync(join(destThemes, "defaults"), { recursive: true });
                cpSync(join(extractTo, "defaults"), join(destThemes, "defaults"), { recursive: true });
            }
            try { rmSync(zipPath, { force: true }); } catch { /* ignore */ }
            try { rmSync(extractTo, { recursive: true, force: true }); } catch { /* ignore */ }
            console.info("[Nexora] Updated bundled default themes");
        } catch (err) {
            console.error("[Nexora] Failed to apply themes-defaults.zip", err);
        }
    }

    PendingUpdates = [];
    PendingThemesZip = null;
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
