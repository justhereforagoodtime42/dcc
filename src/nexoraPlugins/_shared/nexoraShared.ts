/*
 * Nexora shared helpers
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const NexoraAuthors = [{ name: "Nexora", id: 0n }] as const;

export const NEXORA_VERSION = "0.1.0";

/** Built-in + host plugins pinned at the top of the Plugins tab as “Recommended”. */
export const RECOMMENDED_PLUGIN_IDS = [
    // Nexora-built
    "Declutter",
    "SplitLargeMessages",
    "DownloadAllAttachments",
    "AutoJumpToMessage",
    "PermissionSearch",
    "HideDisabledEmojis",
    "SpotifyControls",
    // Host features users asked for (already in the client mod)
    "AlwaysTrust",
    "AnonymiseFileNames",
    "SilentTyping",
    "MessageLogger",
    "ClearURLs",
    "Translate",
    "ShowHiddenChannels",
    "ReadAllNotificationsButton",
    "VolumeBooster",
    "GameActivityToggle",
    "FixYoutubeEmbeds",
    "DirectFileDownload",
] as const;

/** @deprecated use RECOMMENDED_PLUGIN_IDS */
export const NEXORA_HOST_PLUGIN_MAP = RECOMMENDED_PLUGIN_IDS.map(id => ({
    id,
    nexoraLabel: id,
    category: "Recommended",
    notes: ""
}));
