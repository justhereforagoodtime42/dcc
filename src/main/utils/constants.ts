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
const CHECKOUT_STAMP = ".nexora-migrated-from-checkout";

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

        try {
            const toSt = statSync(to);
            if (st.mtimeMs > toSt.mtimeMs) {
                cpSync(from, to);
            }
        } catch { /* keep dest */ }
    }
}

/** Git clone / pnpm inject root — never use as the live settings/themes folder. */
function isSourceCheckout(dir: string) {
    try {
        return existsSync(join(dir, "pnpm-workspace.yaml"))
            || existsSync(join(dir, "src", "main", "patcher.ts"))
            || existsSync(join(dir, "src", "main", "ipcMain.ts"));
    } catch {
        return false;
    }
}

function migrateIntoNexora(nexora: string, legacy: string, stampName: string, label: string) {
    if (!existsSync(legacy)) return;

    try {
        if (!existsSync(nexora)) {
            // Only rename when legacy is a pure data folder (not the git repo)
            if (!isSourceCheckout(legacy)) {
                renameSync(legacy, nexora);
                console.info(`[Nexora] Renamed data folder ${label} → Nexora`);
                return;
            }
        }

        const stamp = join(nexora, stampName);
        if (existsSync(stamp) && !isSourceCheckout(legacy)) {
            try { rmSync(legacy, { recursive: true, force: true }); } catch { /* ignore */ }
            return;
        }

        console.info(`[Nexora] Merging ${label} data into %AppData%/Nexora…`);
        mkdirSync(nexora, { recursive: true });
        // Source checkout: only merge settings/ + themes/, never the whole repo
        if (isSourceCheckout(legacy)) {
            mergeDir(join(legacy, "settings"), join(nexora, "settings"));
            mergeDir(join(legacy, "themes"), join(nexora, "themes"));
        } else {
            mergeDir(legacy, nexora);
            try { rmSync(legacy, { recursive: true, force: true }); } catch { /* ignore */ }
        }
        writeFileSync(stamp, new Date().toISOString(), "utf-8");
    } catch (err) {
        console.error(`[Nexora] Failed to migrate ${label} → Nexora`, err);
    }
}

function resolveDataDir() {
    // Explicit Nexora override only (portable / tests)
    if (process.env.NEXORA_USER_DATA_DIR) {
        return process.env.NEXORA_USER_DATA_DIR;
    }

    // Dev inject sets VENCORD_USER_DATA_DIR to the git repo so the installer finds dist/.
    // That must NOT become the themes/settings folder — always use %AppData%/Nexora.
    const vencordEnv = process.env.VENCORD_USER_DATA_DIR;
    if (vencordEnv && !isSourceCheckout(vencordEnv)) {
        return vencordEnv;
    }

    if (process.env.DISCORD_USER_DATA_DIR) {
        return join(process.env.DISCORD_USER_DATA_DIR, "..", "NexoraData");
    }

    const parent = join(app.getPath("userData"), "..");
    const nexora = join(parent, "Nexora");
    const legacyVencord = join(parent, "Vencord");

    migrateIntoNexora(nexora, legacyVencord, MIGRATED_STAMP, "Vencord");

    // Pull settings/themes out of a mistaken repo-root data dir (dev inject)
    if (vencordEnv && isSourceCheckout(vencordEnv)) {
        migrateIntoNexora(nexora, vencordEnv, CHECKOUT_STAMP, "git-checkout");
    }

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
