/*
 * Auto Jump to Message (ported — original author below)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions, NavigationRouter, showToast } from "@webpack/common";

const Authors = [{ name: "k304", id: 255004979637649408n }] as const;

migratePluginSettings("AutoJumpToMessage", "NexoraAutoJumpToMessage");

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Automatically jump when a discord.com/channels/... message link is clicked",
        default: true
    }
});

const LINK_RE = /https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(@me|\d+)\/(\d+)\/(\d+)/i;

function toast(message: string, variant: "default" | "success" | "critical" = "default") {
    showToast({ text: message, variant: variant === "default" ? undefined : variant });
}

async function jumpFromHref(href: string) {
    const m = LINK_RE.exec(href);
    if (!m) return false;
    const [, guildId, channelId, messageId] = m;
    try {
        NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}/${messageId}`);
        try {
            MessageActions.jumpToMessage({
                channelId,
                messageId,
                flash: true,
                jumpType: "ANIMATED"
            });
        } catch {
            toast("Could not jump to that message (missing, deleted, or inaccessible).");
        }
        return true;
    } catch {
        toast("Could not open that message link.");
        return true;
    }
}

function onClick(e: MouseEvent) {
    if (!settings.store.enabled) return;
    const t = e.target as HTMLElement | null;
    const a = t?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a?.href || !LINK_RE.test(a.href)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    void jumpFromHref(a.href);
}

export default definePlugin({
    name: "AutoJumpToMessage",
    description: "Jump to referenced Discord message links; handles missing/inaccessible targets",
    authors: [...Authors],
    tags: ["Utility"],
    enabledByDefault: true,
    settings,

    start() {
        document.addEventListener("click", onClick, true);
    },

    stop() {
        document.removeEventListener("click", onClick, true);
    }
});
