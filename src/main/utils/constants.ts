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

import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "fs";
import { app } from "electron";
import { join } from "path";

const MIGRATED_STAMP = ".nexora-migrated-from-vencord";

/** Copy legacy files into dest without clobbering newer Nexora files. */
function mergeDir(src: string, dest: string) {
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });

    for (const name of readdirSync(src)) {
        const from = join(src, name);
        const to = join(dest, name);
        let st;
        try {
            st = statSync(from);
        } catch {
            continue;
        }

        if (st.isDirectory()) {
            mergeDir(from, to);
            continue;
        }

        if (!existsSync(to)) {
            cpSync(from, to);
            continue;
        }

        // settings.json / quickCss: keep whichever file is newer
        try {
            const toSt = statSync(to);
            if (st.mtimeMs > toSt.mtimeMs) {
                cpSync(from, to);
            }
        } catch { /* keep dest */ }
    }
}

/**
 * Prefer %AppData%/Nexora. If an old %AppData%/Vencord folder still exists,
 * merge it in (don't wipe Nexora), then remove Vencord so settings stop splitting.
 */
function migrateVencordIntoNexora(nexora: string, legacy: string) {
    if (!existsSync(legacy)) return;

    try {
        if (!existsSync(nexora)) {
            renameSync(legacy, nexora);
            console.info("[Nexora] Renamed data folder Vencord → Nexora");
            return;
        }

        const stamp = join(nexora, MIGRATED_STAMP);
        if (existsSync(stamp)) {
            // Already merged once; drop leftover Vencord if still present
            try { rmSync(legacy, { recursive: true, force: true }); } catch { /* ignore */ }
            return;
        }

        console.info("[Nexora] Merging leftover Vencord data into Nexora…");
        mergeDir(legacy, nexora);
        mkdirSync(nexora, { recursive: true });
        writeFileSync(stamp, new Date().toISOString(), "utf-8");

        try {
            rmSync(legacy, { recursive: true, force: true });
            console.info("[Nexora] Removed old Vencord data folder after merge");
        } catch (err) {
            console.warn("[Nexora] Could not delete old Vencord folder (close Discord / retry)", err);
        }
    } catch (err) {
        console.error("[Nexora] Failed to migrate Vencord → Nexora", err);
    }
}

function resolveDataDir() {
    if (process.env.NEXORA_USER_DATA_DIR || process.env.VENCORD_USER_DATA_DIR) {
        return process.env.NEXORA_USER_DATA_DIR || process.env.VENCORD_USER_DATA_DIR!;
    }

    if (process.env.DISCORD_USER_DATA_DIR) {
        return join(process.env.DISCORD_USER_DATA_DIR, "..", "NexoraData");
    }

    const parent = join(app.getPath("userData"), "..");
    const nexora = join(parent, "Nexora");
    const legacy = join(parent, "Vencord");

    migrateVencordIntoNexora(nexora, legacy);

    return nexora;
}

export const DATA_DIR = resolveDataDir();
export const SETTINGS_DIR = join(DATA_DIR, "settings");
export const THEMES_DIR = join(DATA_DIR, "themes");
export const QUICK_CSS_PATH = join(SETTINGS_DIR, "quickCss.css");
export const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");
export const NATIVE_SETTINGS_FILE = join(SETTINGS_DIR, "native-settings.json");
export const ALLOWED_PROTOCOLS = [
    "https:",
    "http:",
    "steam:",
    "spotify:",
    "com.epicgames.launcher:",
    "tidal:",
    "itunes:",
];

export const IS_VANILLA = /* @__PURE__ */ process.argv.includes("--vanilla");
