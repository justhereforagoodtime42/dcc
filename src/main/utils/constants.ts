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

import { existsSync, renameSync } from "fs";
import { app } from "electron";
import { join } from "path";

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

    // One-time migrate %AppData%/Vencord → %AppData%/Nexora so themes/settings keep working
    try {
        if (!existsSync(nexora) && existsSync(legacy)) {
            renameSync(legacy, nexora);
            console.info("[Nexora] Migrated data folder Vencord → Nexora");
        }
    } catch (err) {
        console.error("[Nexora] Failed to migrate data folder; using Nexora path", err);
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
