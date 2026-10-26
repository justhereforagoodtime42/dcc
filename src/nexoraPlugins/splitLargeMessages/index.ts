/*
 * Split Large Messages (ported — original authors below)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions, showToast, UserStore } from "@webpack/common";

/** Do not credit Nexora / acidicreturns — Equicord SplitLargeMessages authors */
const Authors = [
    { name: "Reycko", id: 1123725368004726794n },
    { name: "justjxke", id: 852558183087472640n },
] as const;

migratePluginSettings("SplitLargeMessages", "NexoraSplitLargeMessages");

const DEFAULT_LIMIT = 2000;
const NITRO_LIMIT = 4000;

const settings = definePluginSettings({
    requireConfirm: {
        type: OptionType.BOOLEAN,
        description: "Ask for confirmation before sending multiple chunks",
        default: true
    },
    delayMs: {
        type: OptionType.NUMBER,
        description: "Delay between chunks (ms) to respect rate limits",
        default: 800
    }
});

function maxLen() {
    try {
        return UserStore.getCurrentUser()?.premiumType === 2 ? NITRO_LIMIT : DEFAULT_LIMIT;
    } catch {
        return DEFAULT_LIMIT;
    }
}

function splitText(text: string, limit: number): string[] {
    if (text.length <= limit) return [text];
    const chunks: string[] = [];
    let rest = text;
    while (rest.length > limit) {
        let cut = rest.lastIndexOf("\n", limit);
        if (cut < limit * 0.4) cut = rest.lastIndexOf(" ", limit);
        if (cut < limit * 0.4) cut = limit;
        chunks.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }
    if (rest) chunks.push(rest);
    return chunks;
}

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

export default definePlugin({
    name: "SplitLargeMessages",
    description: "Split long outgoing messages into chunks with optional confirmation",
    authors: [...Authors],
    tags: ["Chat"],
    enabledByDefault: true,
    settings,

    async onBeforeMessageSend(channelId: string, msg: { content: string; }) {
        const limit = maxLen();
        if (!msg.content || msg.content.length <= limit) return;

        const chunks = splitText(msg.content, limit);
        if (settings.store.requireConfirm) {
            const ok = confirm(`Message is ${msg.content.length} characters. Send as ${chunks.length} parts?`);
            if (!ok) {
                showToast({ text: "Send cancelled" });
                return { cancel: true };
            }
        }

        const delay = Math.max(200, Number(settings.store.delayMs) || 800);
        for (let i = 0; i < chunks.length - 1; i++) {
            await MessageActions.sendMessage(channelId, { content: chunks[i] });
            await sleep(delay);
        }
        msg.content = chunks[chunks.length - 1]!;
    }
});
