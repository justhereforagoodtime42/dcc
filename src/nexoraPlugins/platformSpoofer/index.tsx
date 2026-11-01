/*
 * PlatformSpoofer — ported from Equicord
 * https://github.com/Equicord/Equicord/blob/main/src/equicordplugins/platformSpoofer/index.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Paragraph } from "@components/Paragraph";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const Authors = [
    { name: "dragalt_", id: 1189903210564038697n },
    { name: "neoarz", id: 218675193592283137n },
] as const;

const settings = definePluginSettings({
    platform: {
        type: OptionType.SELECT,
        description: "What platform to pretend you're on.",
        restartNeeded: true,
        options: [
            { label: "Desktop", value: "desktop", default: true },
            { label: "Web", value: "web" },
            { label: "Android", value: "android" },
            { label: "iOS", value: "ios" },
            { label: "Xbox", value: "xbox" },
            { label: "Playstation", value: "playstation" },
            { label: "VR", value: "vr" },
        ]
    }
});

export default definePlugin({
    name: "PlatformSpoofer",
    description: "Spoof what platform or device you're on",
    tags: ["Utility"],
    authors: [...Authors],
    settings,
    settingsAboutComponent: () => (
        <ErrorCard>
            <Paragraph>
                We can't guarantee this plugin won't get you warned or banned. Choosing Xbox/Playstation/VR may make your client an outdated version.
            </Paragraph>
        </ErrorCard>
    ),
    patches: [
        {
            find: "_doIdentify(){",
            replacement: [
                {
                    match: /window\._ws=null,null!=\i/,
                    replace: "false"
                },
                {
                    match: /(?<="GatewaySocket"\)\}\),properties:)(\i)/,
                    replace: "{...$1,...$self.getPlatform(true)}"
                },
            ]
        }
    ],
    getPlatform(bypass: boolean, userId?: string) {
        const platform = settings.store.platform ?? "desktop";

        if (bypass || userId === UserStore.getCurrentUser()?.id) {
            switch (platform) {
                case "desktop":
                    return { browser: "Discord Client" };
                case "web":
                    return { browser: "Discord Web" };
                case "ios":
                    return { browser: "Discord iOS" };
                case "android":
                    return { browser: "Discord Android" };
                case "xbox":
                case "playstation":
                    return { browser: "Discord Embedded" };
                case "vr":
                    return { browser: "Discord VR" };
                default:
                    return {};
            }
        }

        return {};
    }
});
