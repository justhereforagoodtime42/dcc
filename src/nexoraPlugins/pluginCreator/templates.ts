/*
 * Nexora Plugin Creator templates
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type TemplateId =
    | "hello"
    | "settings"
    | "command"
    | "shortcut"
    | "notification"
    | "listener"
    | "utility";

export interface CreatorInput {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    license: string;
    template: TemplateId;
}

function header(meta: CreatorInput) {
    return `/*
 * ${meta.name}
 * Author: ${meta.author}
 * Version: ${meta.version}
 * License: ${meta.license}
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
`;
}

export function generatePluginFiles(meta: CreatorInput): Record<string, string> {
    const pluginExportName = meta.name.replace(/[^a-zA-Z0-9]/g, "") || "MyPlugin";
    const base = header(meta);

    const files: Record<string, string> = {
        "README.md": `# ${meta.name}

${meta.description}

- ID folder: \`${meta.id}\`
- Version: ${meta.version}
- License: ${meta.license}
- Template: ${meta.template}

Place this folder in \`src/userplugins/${meta.id}/\`, run \`pnpm build\`, then enable the plugin in Discord settings.

A successful build does **not** prove the plugin is secure.
`,
        "manifest.json": JSON.stringify({
            id: meta.id,
            name: meta.name,
            description: meta.description,
            author: meta.author,
            version: meta.version,
            license: meta.license,
            template: meta.template,
            nexoraSdk: "0.1.0"
        }, null, 2) + "\n"
    };

    switch (meta.template) {
        case "settings":
            files["index.ts"] = `${base}
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    enabledFeature: {
        type: OptionType.BOOLEAN,
        description: "Example toggle",
        default: true
    }
});

export default definePlugin({
    name: ${JSON.stringify(pluginExportName)},
    description: ${JSON.stringify(meta.description)},
    authors: [{ name: ${JSON.stringify(meta.author)}, id: 0n }],
    settings,
    start() {
        console.log(${JSON.stringify(pluginExportName)}, "started", settings.store.enabledFeature);
    },
    stop() {}
});
`;
            break;
        case "command":
            files["index.ts"] = `${base}
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";

export default definePlugin({
    name: ${JSON.stringify(pluginExportName)},
    description: ${JSON.stringify(meta.description)},
    authors: [{ name: ${JSON.stringify(meta.author)}, id: 0n }],
    commands: [{
        name: "nexora-hello",
        description: "Example Nexora command",
        inputType: ApplicationCommandInputType.BOT,
        execute: (_opts, ctx) => {
            sendBotMessage(ctx.channel.id, { content: "Hello from ${pluginExportName}!" });
        }
    }]
});
`;
            break;
        case "listener":
            files["index.ts"] = `${base}
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

function onMessage({ message }: any) {
    if (!message?.content) return;
    // Observe only — do not exfiltrate
}

export default definePlugin({
    name: ${JSON.stringify(pluginExportName)},
    description: ${JSON.stringify(meta.description)},
    authors: [{ name: ${JSON.stringify(meta.author)}, id: 0n }],
    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    }
});
`;
            break;
        case "shortcut":
        case "notification":
        case "utility":
        case "hello":
        default:
            files["index.ts"] = `${base}
import definePlugin from "@utils/types";

export default definePlugin({
    name: ${JSON.stringify(pluginExportName)},
    description: ${JSON.stringify(meta.description)},
    authors: [{ name: ${JSON.stringify(meta.author)}, id: 0n }],
    start() {
        console.info("[${pluginExportName}] started");
    },
    stop() {
        console.info("[${pluginExportName}] stopped");
    }
});
`;
    }

    files["settings.example.json"] = JSON.stringify({ enabled: true }, null, 2) + "\n";
    return files;
}
