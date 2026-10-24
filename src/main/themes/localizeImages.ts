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
const IMPORT_RE = /@import\s+(?:url\s*\(\s*)?['"]?(https?:\/\/[^'")\s]+)['"]?\s*\)?\s*;?/gi;

function looksLikeThemeImage(url: string) {
    try {
        const u = new URL(url);
        if (/\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(u.pathname)) return true;
        return /alphacoders|wallhaven|unsplash|imgur|ibb\.co|pinimg|catbox|discordapp|googleusercontent|redd\.it|twimg|deviantart|raw\.githubusercontent|github\.io|clearvision/i.test(u.host);
    } catch {
        return false;
    }
}

function looksLikeIconOrTinyAsset(url: string) {
    return /icon|avatar|emoji|logo|favicon|badge|button|svg/i.test(url);
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

async function fetchText(url: string): Promise<string | null> {
    try {
        const res = await net.fetch(url, { bypassCustomProtocolHandlers: true } as any);
        if (!res.ok) {
            console.error(`[Nexora] Theme @import failed (${res.status}): ${url}`);
            return null;
        }
        return await res.text();
    } catch (err) {
        console.error("[Nexora] Theme @import error", url, err);
        return null;
    }
}

/**
 * Pull remote @import stylesheets into the theme so CSP / offline / Discord
 * visual-refresh quirks cannot leave variable-only stubs with no real CSS.
 */
async function inlineImports(css: string, depth = 0, seen = new Set<string>()): Promise<string> {
    if (depth > 4) return css;

    let out = css;
    const matches = [...css.matchAll(IMPORT_RE)];
    for (const m of matches) {
        const url = m[1];
        if (!url || seen.has(url)) {
            out = out.replace(m[0], `/* Nexora: skipped duplicate @import ${url} */`);
            continue;
        }
        seen.add(url);
        const body = await fetchText(url);
        if (!body) {
            // leave original @import as fallback if CSP allows it
            continue;
        }
        const nested = await inlineImports(body, depth + 1, seen);
        out = out.replace(m[0], `\n/* Nexora: inlined @import ${url} */\n${nested}\n`);
    }
    return out;
}

function pickWallpaperUrls(css: string, localByRemote: Map<string, string>): string[] {
    // Prefer urls assigned to background-ish custom properties
    const varBg: string[] = [];
    const varRe = /(--[a-z0-9-]*(?:background|wallpaper|theme-background|bg-image)[a-z0-9-]*)\s*:\s*[^;]*url\(\s*(['"]?)(https?:\/\/[^'")\s]+|vencord:\/\/[^'")\s]+)\2\s*\)/gi;
    for (const m of css.matchAll(varRe)) {
        const remoteOrLocal = m[3];
        if (remoteOrLocal.startsWith("vencord://")) {
            varBg.push(remoteOrLocal);
        } else {
            const local = localByRemote.get(remoteOrLocal);
            if (local) varBg.push(local);
        }
    }

    // Also pick from rewritten locals that came from non-icon images
    const fromMap: string[] = [];
    for (const [remote, local] of localByRemote) {
        if (looksLikeIconOrTinyAsset(remote)) continue;
        fromMap.push(local);
    }

    const preferred = [...new Set([...varBg, ...fromMap])];
    // One wallpaper is enough — avoid stacking home-icon over the bg
    return preferred.slice(0, 1);
}

/**
 * Discord renames hashed classes often. Expand old .app__XXXX background
 * rules and force wallpaper + translucent chrome so it shows in servers.
 */
function expandBackgroundSelectors(css: string, wallpaperUrls: string[]): string {
    if (!wallpaperUrls.length) return css;

    // Widen legacy app root selectors used by older BD themes
    let out = css.replace(
        /#app-mount\s+\.app__[a-zA-Z0-9]+\s*\{/g,
        '#app-mount, body, .app__160d8, [class*="app_"], [class*="bg_"], [class*="appMount_"] {'
    );
    out = out.replace(
        /\.app__[a-zA-Z0-9]+\s*\{/g,
        '.app__160d8, #app-mount, body, [class*="app_"], [class*="bg_"], [class*="appMount_"] {'
    );

    const urlsCss = wallpaperUrls
        .map(u => `  background-image: url(${u}) !important;`)
        .join("\n");

    out += `

/* Nexora: force theme wallpaper onto current Discord roots */
#app-mount,
body,
[class*="appMount_"],
[class*="bg_"],
[class*="app_"][class*="base_"],
.visual-refresh [class*="bg_"] {
${urlsCss}
  background-size: cover !important;
  background-position: center center !important;
  background-attachment: fixed !important;
  background-color: transparent !important;
  background-repeat: no-repeat !important;
}

/* Nexora: punch through opaque Discord chrome so wallpaper shows in servers */
[class*="layers_"],
[class*="layer_"],
[class*="base_"],
.visual-refresh [class*="bg_"],
.visual-refresh [class*="sidebar_"],
.visual-refresh [class*="guilds_"],
.visual-refresh [class*="panels_"],
.visual-refresh [class*="wrapper_"][class*="guilds"],
#app-mount [class*="chat_"],
#app-mount [class*="chatContent_"],
#app-mount [class*="content_"][class*="chat"],
[class*="members_"],
[class*="membersWrap_"],
[class*="member_"] > div,
.theme-dark [class*="container_"][class*="chat"],
.theme-dark [class*="scroller_"][class*="sidebar"],
.visual-refresh [class*="messages_"],
.visual-refresh [class*="messagesWrapper_"] {
  background-color: transparent !important;
  background-image: none !important;
}

/* Keep panels readable but not fully opaque */
#app-mount [class*="panels_"],
.visual-refresh [class*="channelTextArea_"],
.visual-refresh [class*="form_"] {
  background-color: rgba(0, 0, 0, 0.35) !important;
}

/* Soften modern design tokens that paint solid over the wallpaper */
.theme-dark, .theme-light, .visual-refresh {
  --background-primary: transparent !important;
  --background-secondary: transparent !important;
  --background-secondary-alt: transparent !important;
  --background-tertiary: transparent !important;
  --background-accent: transparent !important;
  --background-base-lowest: transparent !important;
  --background-base-lower: transparent !important;
  --background-base-low: transparent !important;
  --background-mod-subtle: rgba(0, 0, 0, 0.2) !important;
  --background-mod-normal: rgba(0, 0, 0, 0.3) !important;
  --background-mod-strong: rgba(0, 0, 0, 0.4) !important;
  --bg-overlay-chat: transparent !important;
  --bg-overlay-app-frame: transparent !important;
}
`;

    return out;
}

/**
 * Rewrite remote url(...) images in theme CSS to vencord:///themes/.image-cache/...
 * inline @imports, and expand outdated Discord class selectors so wallpapers show in servers.
 */
export async function localizeThemeCssImages(css: string): Promise<string> {
    const withImports = await inlineImports(css);

    const urls = new Set<string>();
    for (const match of withImports.matchAll(URL_IN_CSS)) {
        urls.add(match[2]);
    }

    let out = withImports;
    const localByRemote = new Map<string, string>();

    for (const url of urls) {
        if (!looksLikeThemeImage(url)) continue;
        try {
            const fileName = await ensureCached(url);
            if (!fileName) continue;
            const local = `vencord:///themes/${CACHE_DIR_NAME}/${fileName}`;
            out = out.split(url).join(local);
            localByRemote.set(url, local);
        } catch (err) {
            console.error("[Nexora] Failed to cache theme image", url, err);
        }
    }

    const wallpapers = pickWallpaperUrls(out, localByRemote);
    // Fallback: any non-icon cached image
    if (!wallpapers.length) {
        for (const [remote, local] of localByRemote) {
            if (!looksLikeIconOrTinyAsset(remote)) {
                wallpapers.push(local);
                break;
            }
        }
    }

    return expandBackgroundSelectors(out, wallpapers);
}
