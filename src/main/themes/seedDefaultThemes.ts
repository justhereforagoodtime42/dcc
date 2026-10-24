/*
 * Install Nexora's bundled default themes into %AppData%/Nexora/themes
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SETTINGS_FILE, THEMES_DIR } from "@main/utils/constants";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "fs";
import { join } from "path";

/** Bump when shipped theme CSS / wallpapers change so installs refresh. */
export const NEXORA_DEFAULT_THEMES_VERSION = 4;

const STAMP_NAME = ".nexora-defaults-version";
const CACHE_DIR_NAME = ".image-cache";

/** Bundled next to patcher.js / vencordDesktopMain.js as dist/themes/defaults */
function defaultsDir() {
    return join(__dirname, "themes", "defaults");
}

function isManagedTheme(css: string) {
    return /@nexoraManaged\s+true/i.test(css);
}

function ensureDefaultThemesEnabled() {
    try {
        if (!existsSync(SETTINGS_FILE)) return;
        const raw = readFileSync(SETTINGS_FILE, "utf-8");
        const settings = JSON.parse(raw);
        if (!settings || typeof settings !== "object") return;

        const files = readdirSync(THEMES_DIR).filter(f => f.endsWith(".theme.css"));
        if (!files.length) return;

        const enabled: string[] = Array.isArray(settings.enabledThemes) ? settings.enabledThemes : [];
        // Fresh install: nothing enabled yet → turn on New Rem as the showcase default
        if (enabled.length === 0 && files.includes("NewRemTheme.theme.css")) {
            settings.enabledThemes = ["NewRemTheme.theme.css"];
            writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4), "utf-8");
            console.info("[Nexora] Enabled NewRemTheme by default");
        }
    } catch (err) {
        console.error("[Nexora] Failed to set default enabled theme", err);
    }
}

/**
 * Copy bundled themes (+ wallpaper cache) into the user themes folder.
 * Missing files are always installed; managed themes refresh when the stamp version bumps.
 */
export function seedDefaultThemes() {
    const srcRoot = defaultsDir();
    if (!existsSync(srcRoot)) {
        console.warn("[Nexora] No bundled default themes at", srcRoot);
        return;
    }

    mkdirSync(THEMES_DIR, { recursive: true });
    const stampPath = join(THEMES_DIR, STAMP_NAME);
    const prev = existsSync(stampPath) ? Number(readFileSync(stampPath, "utf-8").trim()) || 0 : 0;
    const shouldRefreshManaged = prev < NEXORA_DEFAULT_THEMES_VERSION;

    for (const name of readdirSync(srcRoot)) {
        if (name === CACHE_DIR_NAME) continue;
        if (!name.endsWith(".css")) continue;

        const from = join(srcRoot, name);
        const to = join(THEMES_DIR, name);
        const bundled = readFileSync(from, "utf-8");

        if (!existsSync(to)) {
            writeFileSync(to, bundled, "utf-8");
            console.info("[Nexora] Installed default theme:", name);
            continue;
        }

        if (shouldRefreshManaged) {
            try {
                const existing = readFileSync(to, "utf-8");
                if (isManagedTheme(existing) || isManagedTheme(bundled)) {
                    writeFileSync(to, bundled, "utf-8");
                    console.info("[Nexora] Updated managed theme:", name);
                }
            } catch (err) {
                console.error("[Nexora] Failed updating theme", name, err);
            }
        }
    }

    // Wallpaper cache used by NewRem (and friends) so first paint works offline
    const srcCache = join(srcRoot, CACHE_DIR_NAME);
    const destCache = join(THEMES_DIR, CACHE_DIR_NAME);
    if (existsSync(srcCache)) {
        mkdirSync(destCache, { recursive: true });
        for (const img of readdirSync(srcCache)) {
            const from = join(srcCache, img);
            const to = join(destCache, img);
            if (!existsSync(to) || shouldRefreshManaged) {
                copyFileSync(from, to);
            }
        }
    }

    writeFileSync(stampPath, String(NEXORA_DEFAULT_THEMES_VERSION), "utf-8");
    ensureDefaultThemesEnabled();
}
