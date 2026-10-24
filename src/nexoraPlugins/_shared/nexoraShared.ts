/*
 * Nexora shared helpers
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const NexoraAuthors = [{ name: "Nexora", id: 0n }] as const;

export const NEXORA_VERSION = "0.1.0";

/** Upstream host plugins that implement requested Nexora features (avoid double-patching). */
export const NEXORA_HOST_PLUGIN_MAP = [
    { id: "AlwaysTrust", nexoraLabel: "Always Trust", category: "Organization", notes: "Untrusted domain / dangerous download prompts only — never auto-trust arbitrary executables." },
    { id: "AnonymiseFileNames", nexoraLabel: "Anonymous Filenames", category: "Organization", notes: "Masks names in the upload UI; does not rewrite bytes on disk after send." },
    { id: "SilentTyping", nexoraLabel: "Silent Typing", category: "Messages", notes: "Suppresses typing indicators via client startTyping patch." },
    { id: "MessageLogger", nexoraLabel: "Message Logger", category: "Messages", notes: "Logs only events the client observes; local by default." },
    { id: "ClearURLs", nexoraLabel: "Clear URLs", category: "Links", notes: "Strips tracking parameters on send/edit." },
    { id: "Translate", nexoraLabel: "Message Translation", category: "Messages", notes: "Uses an external provider — disclose data transmission in plugin settings." },
    { id: "ShowHiddenThings", nexoraLabel: "Show Hidden Things", category: "Messages", notes: "UI-only; does not bypass server access controls." },
    { id: "ShowHiddenChannels", nexoraLabel: "Show Hidden Channels", category: "Organization", notes: "Shows channels the client knows about but UI hides; cannot open channels without permission." },
    { id: "ReadAllNotificationsButton", nexoraLabel: "Read All Notifications", category: "Organization", notes: "Marks supported notifications read." },
    { id: "VolumeBooster", nexoraLabel: "Volume Booster", category: "Media", notes: "Gain above Discord UI max when the audio pipeline allows; may clip." },
    { id: "GameActivityToggle", nexoraLabel: "Game Activity Toggle", category: "Media", notes: "Toggles activity visibility using Discord privacy controls." },
    { id: "FixYoutubeEmbeds", nexoraLabel: "Fix YouTube Embeds", category: "Links", notes: "Desktop embed improvements; respects provider limits." },
    { id: "DirectFileDownload", nexoraLabel: "Direct File Download", category: "Links", notes: "Desktop download controls; never auto-executes files." },
] as const;
