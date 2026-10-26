/*
 * Install Nexora's bundled default themes into %AppData%/Nexora/themes
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "fs";
import { join } from "path";

import { BUNDLED_THEME_CSS } from "./bundledThemeSources.generated";

/** Bump when shipped theme CSS / wallpapers change so installs refresh. */
export const NEXORA_DEFAULT_THEMES_VERSION = 10;

const STAMP_NAME = ".nexora-defaults-version";
const CACHE_DIR_NAME = ".image-cache";

/** Optional on-disk copy next to patcher.js (installer / themes-defaults.zip). */
function defaultsDir() {
    return join(__dirname, "themes", "defaults");
}

function isManagedTheme(css: string) {
    return /@nexoraManaged\s+true/i.test(css);
}

function themeSources(): Record<string, string> {
    const out: Record<string, string> = { ...BUNDLED_THEME_CSS };
    const srcRoot = defaultsDir();
    if (!existsSync(srcRoot)) return out;

    // Disk copy can be newer after themes-defaults.zip apply; prefer it when present
    for (const name of readdirSync(srcRoot)) {
        if (!name.endsWith(".css")) continue;
        try {
            out[name] = readFileSync(join(srcRoot, name), "utf-8");
        } catch { /* keep embedded */ }
    }
    return out;
}

/**
 * Copy bundled themes (+ wallpaper cache) into the user themes folder.
 * Theme CSS is embedded in patcher.js so HTTP auto-update always ships new defaults.
 * Themes are left disabled — user enables one in Settings.
 */
export function seedDefaultThemes() {
    const sources = themeSources();
    const names = Object.keys(sources);
    if (!names.length) {
        console.warn("[Nexora] No bundled default themes embedded or on disk");
        return;
    }

    mkdirSync(THEMES_DIR, { recursive: true });
    const stampPath = join(THEMES_DIR, STAMP_NAME);
    const prev = existsSync(stampPath) ? Number(readFileSync(stampPath, "utf-8").trim()) || 0 : 0;
    const shouldRefreshManaged = prev < NEXORA_DEFAULT_THEMES_VERSION;

    for (const name of names) {
        const bundled = sources[name];
        const to = join(THEMES_DIR, name);

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
    const srcCache = join(defaultsDir(), CACHE_DIR_NAME);
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
}
