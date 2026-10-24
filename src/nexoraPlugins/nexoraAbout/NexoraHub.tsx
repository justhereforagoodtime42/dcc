/*
 * Nexora settings hub
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins as Plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Button, Forms, React, showToast, TabBar, TextInput, useMemo, useState } from "@webpack/common";

import gitHash from "~git-hash";

import { NEXORA_HOST_PLUGIN_MAP, NEXORA_VERSION } from "../_shared/nexoraShared";
import { generatePluginFiles, TemplateId } from "../pluginCreator/templates";
import { applyThemeCss, getTheme, setTheme, themeEditorSettings } from "../themeEditor";
import { DEFAULT_THEME, NexoraThemeJson, themeToCss, validateTheme } from "../themeEditor/themeJson";
import { NEXORA_REGISTRY } from "../_registry/registryData";

const enum HubTab {
    General,
    Plugins,
    Store,
    ThemeEditor,
    Themes,
    Creator,
    DevTools,
    Updates,
    ImportExport,
    About
}

function toast(message: string) {
    showToast({ text: message });
}

function toggleHostPlugin(name: string, enable: boolean) {
    const p = Plugins[name];
    if (!p) {
        toast(`Plugin ${name} is not in this build`);
        return;
    }
    Settings.plugins[name] ??= { enabled: false } as any;
    if (enable) {
        Settings.plugins[name].enabled = true;
        if (!p.started) startPlugin(p);
    } else {
        if (p.started) stopPlugin(p);
        Settings.plugins[name].enabled = false;
    }
}

function GeneralTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">General</Forms.FormTitle>
            <Paragraph>
                Nexora customizes your existing Discord desktop client. It is not a separate chat app and is not affiliated with Discord Inc.
            </Paragraph>
            <Paragraph>
                Client modifications may violate Discord’s Terms of Service. Nexora never asks for passwords or user tokens.
            </Paragraph>
            <Paragraph>
                Version {NEXORA_VERSION} · Build {gitHash || "unknown"}
            </Paragraph>
        </Flex>
    );
}

function PluginsTab() {
    const nexoraPlugins = useMemo(
        () => Object.values(Plugins).filter(p => p.name.startsWith("Nexora")),
        []
    );

    return (
        <Flex flexDirection="column" gap="1em">
            <Forms.FormTitle tag="h3">Plugin Manager</Forms.FormTitle>
            <Paragraph>Nexora-built plugins (enable/disable independently):</Paragraph>
            {nexoraPlugins.map(p => (
                <FormSwitch
                    key={p.name}
                    title={p.name}
                    description={p.description}
                    value={isPluginEnabled(p.name)}
                    onChange={v => toggleHostPlugin(p.name, v)}
                    hideBorder
                />
            ))}

            <Forms.FormTitle tag="h3" className={Margins.top16}>Recommended host plugins</Forms.FormTitle>
            <Paragraph>
                These ship with the Vencord host. Nexora does not duplicate their patches (avoids conflicts). Toggle them here:
            </Paragraph>
            {NEXORA_HOST_PLUGIN_MAP.map(item => (
                <FormSwitch
                    key={item.id}
                    title={item.nexoraLabel}
                    description={`${item.category} · ${item.notes}`}
                    value={!!Plugins[item.id] && isPluginEnabled(item.id)}
                    disabled={!Plugins[item.id]}
                    onChange={v => toggleHostPlugin(item.id, v)}
                    hideBorder
                />
            ))}
        </Flex>
    );
}

function StoreTab() {
    const [q, setQ] = useState("");
    const plugins = NEXORA_REGISTRY.plugins as readonly any[];
    const filtered = plugins.filter(p =>
        !q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Plugin Store</Forms.FormTitle>
            <Paragraph>
                Official registry snapshot from this repository (<code>registry/plugins.json</code>).
                Community install/update/rollback with hash verification expands in later releases. Offline: installed plugins remain available above.
            </Paragraph>
            <TextInput value={q} onChange={setQ} placeholder="Search plugins…" />
            {filtered.map(p => (
                <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}>
                    <Forms.FormTitle tag="h4">{p.name} {p.official ? "(official)" : ""}</Forms.FormTitle>
                    <Paragraph>{p.description}</Paragraph>
                    <Paragraph>
                        v{p.version} · {p.license} · {p.category}
                        {p.source ? ` · ${p.source}` : ""}
                    </Paragraph>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={() => toast(`${p.name} is bundled when present under ${p.source}. Enable it in Plugin Manager.`)}
                    >
                        Details
                    </Button>
                </div>
            ))}
            {!filtered.length && <Paragraph>No plugins match. Registry may be empty or filtered out.</Paragraph>}
        </Flex>
    );
}

function ThemeEditorTab() {
    const [theme, setLocal] = useState<NexoraThemeJson>(() => getTheme());
    const [customCssOptIn, setOptIn] = useState(() => !!themeEditorSettings.store.allowCustomCss);

    const update = (patch: Partial<NexoraThemeJson>) => {
        const next = {
            ...theme,
            ...patch,
            colors: { ...theme.colors, ...patch.colors },
            typography: { ...theme.typography, ...patch.typography },
            layout: { ...theme.layout, ...patch.layout },
            effects: { ...theme.effects, ...patch.effects }
        };
        setLocal(next);
        try {
            setTheme(next);
        } catch (e: any) {
            toast(e?.message || "Invalid theme");
        }
    };

    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Theme Editor</Forms.FormTitle>
            <Paragraph>Edits a structured <code>.theme.json</code> and compiles to CSS. Themes cannot execute JavaScript.</Paragraph>

            <Forms.FormTitle tag="h4">Name</Forms.FormTitle>
            <TextInput value={theme.name} onChange={v => update({ name: v })} />

            <Forms.FormTitle tag="h4">Accent</Forms.FormTitle>
            <TextInput value={theme.colors?.accent || ""} onChange={v => update({ colors: { accent: v } })} />
            <Forms.FormTitle tag="h4">Background</Forms.FormTitle>
            <TextInput value={theme.colors?.background || ""} onChange={v => update({ colors: { background: v } })} />
            <Forms.FormTitle tag="h4">Chat background</Forms.FormTitle>
            <TextInput value={theme.colors?.chatBackground || ""} onChange={v => update({ colors: { chatBackground: v } })} />
            <Forms.FormTitle tag="h4">Sidebar</Forms.FormTitle>
            <TextInput value={theme.colors?.sidebar || ""} onChange={v => update({ colors: { sidebar: v } })} />
            <Forms.FormTitle tag="h4">Text</Forms.FormTitle>
            <TextInput value={theme.colors?.text || ""} onChange={v => update({ colors: { text: v } })} />
            <Forms.FormTitle tag="h4">Font family</Forms.FormTitle>
            <TextInput value={theme.typography?.fontFamily || ""} onChange={v => update({ typography: { fontFamily: v } })} />

            <FormSwitch
                title="Allow custom CSS (opt-in)"
                description="Arbitrary CSS can break layout and accessibility."
                value={customCssOptIn}
                onChange={v => {
                    setOptIn(v);
                    themeEditorSettings.store.allowCustomCss = v;
                    applyThemeCss();
                }}
                hideBorder
            />
            {customCssOptIn && (
                <>
                    <Forms.FormTitle tag="h4">Custom CSS</Forms.FormTitle>
                    <textarea
                        style={{ width: "100%", minHeight: 120, fontFamily: "monospace" }}
                        value={theme.customCss || ""}
                        onChange={e => update({ customCss: (e.target as HTMLTextAreaElement).value })}
                    />
                </>
            )}

            <Flex gap="0.5em">
                <Button onClick={() => { update(DEFAULT_THEME); toast("Reset to default"); }}>Reset</Button>
                <Button
                    onClick={() => {
                        const css = themeToCss(theme);
                        void navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
                        toast("Copied .theme.json to clipboard");
                        void css;
                    }}
                >
                    Export JSON
                </Button>
                <Button
                    onClick={async () => {
                        const text = prompt("Paste .theme.json");
                        if (!text) return;
                        try {
                            const v = validateTheme(JSON.parse(text));
                            if (!v.ok) return toast(v.error);
                            setLocal(v.theme);
                            setTheme(v.theme);
                            toast("Imported theme");
                        } catch {
                            toast("Invalid JSON");
                        }
                    }}
                >
                    Import JSON
                </Button>
            </Flex>
        </Flex>
    );
}

function ThemesInstalledTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Installed Themes</Forms.FormTitle>
            <Paragraph>
                CSS themes also live under Discord Settings → Themes (QuickCSS / local theme files).
                Nexora Theme Editor themes are stored in plugin settings as <code>.theme.json</code>.
            </Paragraph>
            <Paragraph>Active editor theme: <strong>{getTheme().name}</strong></Paragraph>
        </Flex>
    );
}

function CreatorTab() {
    const [name, setName] = useState("My Plugin");
    const [id, setId] = useState("myPlugin");
    const [description, setDescription] = useState("A Nexora userplugin");
    const [author, setAuthor] = useState("Me");
    const [template, setTemplate] = useState<TemplateId>("hello");
    const [preview, setPreview] = useState("");

    const generate = () => {
        const files = generatePluginFiles({
            id: id.replace(/[^a-zA-Z0-9_-]/g, "") || "myPlugin",
            name,
            description,
            author,
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            template
        });
        const blob = Object.entries(files).map(([k, v]) => `===== ${k} =====\n${v}`).join("\n");
        setPreview(blob);
        void navigator.clipboard.writeText(files["index.ts"] || "");
        toast("Generated. index.ts copied — paste into src/userplugins/<id>/ then pnpm build. Not a security proof.");
    };

    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Plugin Creator</Forms.FormTitle>
            <Paragraph>Generates real Vencord-compatible TypeScript using APIs that exist in this host.</Paragraph>
            <TextInput value={name} onChange={setName} placeholder="Name" />
            <TextInput value={id} onChange={setId} placeholder="folder id (camelCase)" />
            <TextInput value={description} onChange={setDescription} placeholder="Description" />
            <TextInput value={author} onChange={setAuthor} placeholder="Author" />
            <Forms.FormTitle tag="h4">Template</Forms.FormTitle>
            <TextInput value={template} onChange={v => setTemplate(v as TemplateId)} placeholder="hello|settings|command|listener|utility" />
            <Button onClick={generate}>Generate project</Button>
            {preview && (
                <textarea readOnly style={{ width: "100%", minHeight: 240, fontFamily: "monospace" }} value={preview} />
            )}
        </Flex>
    );
}

function DevToolsTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Developer Tools</Forms.FormTitle>
            <Paragraph>Use Vencord Patch Helper (dev builds), browser DevTools, and <code>pnpm build --watch</code>.</Paragraph>
            <Button onClick={() => {
                console.info("[Nexora] Plugins:", Object.keys(Plugins));
                toast("Plugin list logged to console");
            }}>Log loaded plugins</Button>
        </Flex>
    );
}

function UpdatesTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Updates</Forms.FormTitle>
            <Paragraph>
                Update Nexora by pulling git, <code>pnpm install --frozen-lockfile</code>, <code>pnpm build</code>, then <code>pnpm nexora:repair --force</code> if Discord replaced app.asar.
            </Paragraph>
            <Paragraph>Automatic update checks can be disabled later; for now use manual git + rebuild.</Paragraph>
            <Button onClick={() => toast("Manual update: git pull && pnpm build && pnpm nexora:status")}>How to update</Button>
        </Flex>
    );
}

function ImportExportTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">Import / Export</Forms.FormTitle>
            <Paragraph>Export theme JSON from Theme Editor. Plugin settings use Vencord Backup &amp; Restore. Share plugins as source folders or GitHub links — never execute arbitrary downloads on click.</Paragraph>
            <Button onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify(getTheme(), null, 2));
                toast("Theme JSON copied");
            }}>Copy current theme</Button>
        </Flex>
    );
}

function AboutTab() {
    return (
        <Flex flexDirection="column" gap="0.75em">
            <Forms.FormTitle tag="h3">About &amp; Diagnostics</Forms.FormTitle>
            <Paragraph>Nexora {NEXORA_VERSION}</Paragraph>
            <Paragraph>Git: {gitHash || "unknown"}</Paragraph>
            <Paragraph>Based on Vencord (GPL-3.0-or-later). See NOTICE and docs/ARCHITECTURE.md.</Paragraph>
            <Paragraph>Repo: https://github.com/justhereforagoodtime42/dcc</Paragraph>
            <Paragraph>Loaded plugins: {Object.keys(Plugins).length}</Paragraph>
        </Flex>
    );
}

function NexoraHub() {
    const [tab, setTab] = useState(HubTab.General);

    return (
        <SettingsTab>
            <TabBar type="top" look="brand" className="vc-settings-tab-bar" selectedItem={tab} onItemSelect={setTab}>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.General}>General</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.Plugins}>Plugin Manager</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.Store}>Plugin Store</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.ThemeEditor}>Theme Editor</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.Themes}>Installed Themes</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.Creator}>Plugin Creator</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.DevTools}>Developer Tools</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.Updates}>Updates</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.ImportExport}>Import / Export</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={HubTab.About}>About</TabBar.Item>
            </TabBar>

            <div className={Margins.top16}>
                {tab === HubTab.General && <GeneralTab />}
                {tab === HubTab.Plugins && <PluginsTab />}
                {tab === HubTab.Store && <StoreTab />}
                {tab === HubTab.ThemeEditor && <ThemeEditorTab />}
                {tab === HubTab.Themes && <ThemesInstalledTab />}
                {tab === HubTab.Creator && <CreatorTab />}
                {tab === HubTab.DevTools && <DevToolsTab />}
                {tab === HubTab.Updates && <UpdatesTab />}
                {tab === HubTab.ImportExport && <ImportExportTab />}
                {tab === HubTab.About && <AboutTab />}
            </div>
        </SettingsTab>
    );
}

export default wrapTab(NexoraHub, "Nexora");
