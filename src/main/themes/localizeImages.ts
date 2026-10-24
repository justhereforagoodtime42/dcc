/*
 * Cache remote theme background images locally so CSP cannot block them
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import { createHash } from "crypto";
import { net } from "electron";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_DIR_NAME = ".image-cache";
const CACHE_DIR = join(THEMES_DIR, CACHE_DIR_NAME);

const URL_IN_CSS = /url\(\s*(['"]?)(https?:\/\/[^'")\s]+)\1\s*\)/gi;

function looksLikeThemeImage(url: string) {
    try {
        const u = new URL(url);
        if (/\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(u.pathname)) return true;
        return /alphacoders|wallhaven|unsplash|imgur|ibb\.co|pinimg|catbox|discordapp|googleusercontent|redd\.it|twimg|deviantart|raw\.githubusercontent/i.test(u.host);
    } catch {
        return false;
    }
}

function cacheFileName(url: string) {
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 20);
    let ext = "jpg";
    try {
        const m = new URL(url).pathname.match(/\.(jpe?g|png|gif|webp|avif|bmp)$/i);
        if (m) ext = m[1].toLowerCase().replace("jpeg", "jpg");
    } catch { /* keep jpg */ }
    return `${hash}.${ext}`;
}

async function ensureCached(url: string): Promise<string | null> {
    mkdirSync(CACHE_DIR, { recursive: true });
    const fileName = cacheFileName(url);
    const dest = join(CACHE_DIR, fileName);
    if (!existsSync(dest)) {
        const res = await net.fetch(url, { bypassCustomProtocolHandlers: true } as any);
        if (!res.ok) {
            console.error(`[Nexora] Theme image download failed (${res.status}): ${url}`);
            return null;
        }
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        console.info(`[Nexora] Cached theme image → ${fileName}`);
    }
    return fileName;
}

/**
 * Discord renames hashed classes often. Expand old .app__XXXX background
 * rules so the wallpaper still paints on current Discord.
 */
function expandBackgroundSelectors(css: string, localUrls: string[]): string {
    if (!localUrls.length) return css;

    // Widen legacy app root selectors used by older BD themes
    let out = css.replace(
        /\.app__[a-zA-Z0-9]+\s*\{/g,
        '.app__160d8, #app-mount, body, [class*="app_"], [class*="bg_"], [class*="appMount_"] {'
    );

    const urlsCss = localUrls
        .map(u => `  background-image: url(${u}) !important;`)
        .join("\n");

    out += `

/* Nexora: force theme wallpaper onto current Discord roots */
#app-mount,
body,
[class*="appMount_"],
[class*="bg_"],
[class*="app_"][class*="base_"] {
${urlsCss}
  background-size: cover !important;
  background-position: center center !important;
  background-attachment: fixed !important;
  background-color: transparent !important;
}
[class*="layers_"],
[class*="layer_"],
[class*="base_"] {
  background-color: transparent !important;
}
`;

    return out;
}

/**
 * Rewrite remote url(...) images in theme CSS to vencord:///themes/.image-cache/...
 * and expand outdated Discord class selectors so the wallpaper actually shows.
 */
export async function localizeThemeCssImages(css: string): Promise<string> {
    const urls = new Set<string>();
    for (const match of css.matchAll(URL_IN_CSS)) {
        urls.add(match[2]);
    }

    let out = css;
    const localUrls: string[] = [];

    for (const url of urls) {
        if (!looksLikeThemeImage(url)) continue;
        try {
            const fileName = await ensureCached(url);
            if (!fileName) continue;
            const local = `vencord:///themes/${CACHE_DIR_NAME}/${fileName}`;
            out = out.split(url).join(local);
            localUrls.push(local);
        } catch (err) {
            console.error("[Nexora] Failed to cache theme image", url, err);
        }
    }

    return expandBackgroundSelectors(out, localUrls);
}
