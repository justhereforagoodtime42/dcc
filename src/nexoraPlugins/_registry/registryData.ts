/*
 * In-tree plugin registry snapshot (keep in sync with registry/plugins.json)
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const NEXORA_REGISTRY = {
    schemaVersion: 1,
    updatedAt: "2026-10-24",
    featured: ["Declutter", "SplitLargeMessages", "ThemeEditor"],
    plugins: [
        {
            id: "Declutter",
            name: "Declutter",
            description: "Hide or collapse supported Discord UI chrome via CSS rules.",
            author: "Nexora",
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            category: "Organization",
            official: true,
            source: "src/nexoraPlugins/declutter",
            permissions: ["ui.css"],
        },
        {
            id: "SplitLargeMessages",
            name: "Split Large Messages",
            description: "Split long outgoing text into chunks with preview and confirmation.",
            author: "Nexora",
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            category: "Messages",
            official: true,
            source: "src/nexoraPlugins/splitLargeMessages",
            permissions: ["messages.send"],
        },
        {
            id: "DownloadAllAttachments",
            name: "Download All Attachments",
            description: "Download message attachments the client can access.",
            author: "Nexora",
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            category: "Links",
            official: true,
            source: "src/nexoraPlugins/downloadAllAttachments",
            permissions: ["attachments.download"],
        },
        {
            id: "AutoJumpToMessage",
            name: "Auto Jump to Message",
            description: "Navigate to referenced messages when links are opened.",
            author: "Nexora",
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            category: "Organization",
            official: true,
            source: "src/nexoraPlugins/autoJumpToMessage",
            permissions: ["navigation"],
        },
        {
            id: "ThemeEditor",
            name: "Theme Editor",
            description: "Visual .theme.json editor compiling to CSS variables.",
            author: "Nexora",
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            category: "Appearance",
            official: true,
            source: "src/nexoraPlugins/themeEditor",
            permissions: ["ui.css", "settings.write"],
        },
    ],
} as const;
