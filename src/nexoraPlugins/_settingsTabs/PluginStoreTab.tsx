/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast, TextInput, useState } from "@webpack/common";

import { NEXORA_REGISTRY } from "../_registry/registryData";

function PluginStoreTab() {
    const [q, setQ] = useState("");
    const plugins = NEXORA_REGISTRY.plugins as readonly any[];
    const filtered = plugins.filter(p =>
        !q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Plugin Store</Forms.FormTitle>
            <Paragraph>
                Official catalog from this repository. Enable plugins in the <strong>Plugins</strong> tab.
            </Paragraph>
            <TextInput value={q} onChange={setQ} placeholder="Search plugins…" />
            <Flex flexDirection="column" gap="0.75em">
                {filtered.map(p => (
                    <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}>
                        <Forms.FormTitle tag="h4">{p.name}{p.official ? " (official)" : ""}</Forms.FormTitle>
                        <Paragraph>{p.description}</Paragraph>
                        <Paragraph>v{p.version} · {p.license} · {p.category}</Paragraph>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => showToast({ text: `Enable “${p.name}” under Settings → Plugins` })}
                        >
                            How to enable
                        </Button>
                    </div>
                ))}
                {!filtered.length && <Paragraph>No plugins match.</Paragraph>}
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(PluginStoreTab, "Plugin Store");
