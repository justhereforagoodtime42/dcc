/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./ipcMain";

import { app, net, protocol } from "electron";
import { readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

import { initCsp } from "./csp";
import { RendererSettings } from "./settings";
import { localizeThemeCssImages } from "./themes/localizeImages";
import { IS_VANILLA, THEMES_DIR } from "./utils/constants";
import { ensureSafePath } from "./utils/ensureSafePath";
import { installExt } from "./utils/extensions";

// Must run before app ready so nexora:// theme URLs work in the renderer
try {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: "nexora",
            privileges: { standard: true, supportFetchAPI: true, bypassCSP: true, stream: true, corsEnabled: true }
        },
        {
            scheme: "vencord",
            privileges: { standard: true, supportFetchAPI: true, bypassCSP: true, stream: true, corsEnabled: true }
        },
    ]);
} catch { /* already registered / too late — handlers below still work for vencord */ }

if (IS_VESKTOP || !IS_VANILLA) {
    app.whenReady().then(() => {
        const serveNexoraProtocol = async ({ url: unsafeUrl }: { url: string; }) => {
            const scheme = unsafeUrl.startsWith("nexora:") ? "nexora://" : "vencord://";
            let url = decodeURI(unsafeUrl).slice(scheme.length).replace(/\?v=\d+$/, "");

            if (url.endsWith("/")) url = url.slice(0, -1);

            if (url.startsWith("/themes/")) {
                const theme = url.slice("/themes/".length);

                const safeUrl = ensureSafePath(THEMES_DIR, theme);
                if (!safeUrl) {
                    return new Response(null, {
                        status: 404
                    });
                }

                // Localize remote background images in CSS so CSP cannot block them
                if (theme.endsWith(".css") && !theme.includes(".image-cache/")) {
                    try {
                        const raw = readFileSync(safeUrl, "utf-8");
                        const localized = await localizeThemeCssImages(raw);
                        return new Response(localized, {
                            headers: { "Content-Type": "text/css; charset=utf-8" }
                        });
                    } catch (err) {
                        console.error("[Nexora] Failed to serve localized theme", theme, err);
                    }
                }

                return net.fetch(pathToFileURL(safeUrl).toString());
            }

            // Source Maps! Maybe there's a better way but since the renderer is executed
            // from a string I don't think any other form of sourcemaps would work

            switch (url) {
                case "renderer.js.map":
                case "vencordDesktopRenderer.js.map":
                case "preload.js.map":
                case "vencordDesktopPreload.js.map":
                case "patcher.js.map":
                case "vencordDesktopMain.js.map":
                    return net.fetch(pathToFileURL(join(__dirname, url)).toString());
                default:
                    return new Response(null, {
                        status: 404
                    });
            }
        };

        // nexora:// is the public scheme; keep vencord:// so older cached theme CSS still loads
        protocol.handle("nexora", serveNexoraProtocol);
        protocol.handle("vencord", serveNexoraProtocol);

        try {
            if (RendererSettings.store.enableReactDevtools)
                installExt("fmkadmapgofadopljbjfkapdkoienihi")
                    .then(() => console.info("[Nexora] Installed React Developer Tools"))
                    .catch(err => console.error("[Nexora] Failed to install React Developer Tools", err));
        } catch { }


        initCsp();
    });
}

if (IS_DISCORD_DESKTOP) {
    require("./patcher");
}
