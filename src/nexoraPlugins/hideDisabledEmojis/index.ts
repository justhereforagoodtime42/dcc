/*
 * HideDisabledEmojis — hide locked/unavailable emojis from the picker
 * Inspired by BetterDiscord HideDisabledEmojis (Zerebos)
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

import { NexoraAuthors } from "../_shared/nexoraShared";
import hideStyle from "./hide.css?managed";

const logger = new Logger("HideDisabledEmojis");

const EmojiInfo = findByPropsLazy("isEmojiDisabled", "isEmojiFiltered");

let originalIsEmojiFiltered: ((...args: any[]) => boolean) | undefined;

export default definePlugin({
    name: "HideDisabledEmojis",
    description: "Hides disabled / locked emojis from the emoji picker (useful without Nitro)",
    authors: [...NexoraAuthors],
    tags: ["Utility", "Chat"],
    enabledByDefault: true,

    start() {
        enableStyle(hideStyle);

        if (!EmojiInfo?.isEmojiFiltered || !EmojiInfo?.isEmojiDisabled) {
            logger.error("Emoji filter module not found");
            return;
        }

        originalIsEmojiFiltered = EmojiInfo.isEmojiFiltered;
        EmojiInfo.isEmojiFiltered = function (this: unknown, ...args: any[]) {
            try {
                if (EmojiInfo.isEmojiDisabled(...args)) return true;
            } catch { /* fall through */ }
            return originalIsEmojiFiltered!.apply(this, args);
        };
    },

    stop() {
        disableStyle(hideStyle);
        if (originalIsEmojiFiltered && EmojiInfo) {
            EmojiInfo.isEmojiFiltered = originalIsEmojiFiltered;
            originalIsEmojiFiltered = undefined;
        }
    }
});
