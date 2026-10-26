/*
 * Download All Attachments (ported — original author below)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React, showToast } from "@webpack/common";

/** Do not credit Nexora / acidicreturns — Equicord DownloadAllAttachments author */
const Authors = [{ name: "dhopcs", id: 206309860038410240n }] as const;

migratePluginSettings("DownloadAllAttachments", "NexoraDownloadAllAttachments");

const settings = definePluginSettings({
    openExternally: {
        type: OptionType.BOOLEAN,
        description: "Open each attachment URL (browser/download manager handles the file). Never executes downloads.",
        default: true
    }
});

function uniqueName(name: string, used: Set<string>) {
    if (!used.has(name)) {
        used.add(name);
        return name;
    }
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let i = 2;
    let candidate = `${base} (${i})${ext}`;
    while (used.has(candidate)) {
        i++;
        candidate = `${base} (${i})${ext}`;
    }
    used.add(candidate);
    return candidate;
}

async function downloadAll(message: any) {
    const attachments = message?.attachments;
    if (!attachments?.length) {
        showToast({ text: "No attachments on this message" });
        return;
    }

    const used = new Set<string>();
    let ok = 0;
    let fail = 0;

    for (const att of attachments) {
        const url = att.url || att.proxy_url;
        if (!url) {
            fail++;
            continue;
        }
        const name = uniqueName(att.filename || "attachment", used);
        try {
            window.open(url, "_blank", "noopener,noreferrer");
            ok++;
            void name;
        } catch {
            fail++;
        }
    }

    showToast({
        text: `Attachments: opened ${ok}${fail ? `, failed ${fail}` : ""}. Files are not auto-executed.`,
        variant: "success"
    });
}

const messageCtx: NavContextMenuPatchCallback = (children, { message }: { message: any; }) => {
    if (!message?.attachments?.length) return;
    const group = findGroupChildrenByChildId("copy-link", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="nx-download-all"
            label={`Download All Attachments (${message.attachments.length})`}
            action={() => void downloadAll(message)}
        />
    );
};

export default definePlugin({
    name: "DownloadAllAttachments",
    description: "Context action to download/open all attachments on a message (no auto-execute)",
    authors: [...Authors],
    tags: ["Utility"],
    enabledByDefault: true,
    settings,
    contextMenus: {
        message: messageCtx
    }
});
