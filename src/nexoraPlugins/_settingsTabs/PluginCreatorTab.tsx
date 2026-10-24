/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast, TextInput, useState } from "@webpack/common";

import { generatePluginFiles, TemplateId } from "../pluginCreator/templates";

function Field({ title, help, children }: { title: string; help: string; children: React.ReactNode; }) {
    return (
        <div>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Paragraph>{help}</Paragraph>
            {children}
        </div>
    );
}

function PluginCreatorTab() {
    const [name, setName] = useState("My Plugin");
    const [id, setId] = useState("myPlugin");
    const [description, setDescription] = useState("A custom plugin");
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
        setPreview(Object.entries(files).map(([k, v]) => `===== ${k} =====\n${v}`).join("\n"));
        void navigator.clipboard.writeText(files["index.ts"] || "");
        showToast({ text: "Generated — index.ts copied. Put it in src/userplugins/<id>/ then rebuild." });
    };

    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Plugin Creator</Forms.FormTitle>
            <Paragraph>
                Fills in a starter plugin using real host APIs. A successful build is not a security proof.
            </Paragraph>
            <Flex flexDirection="column" gap="1em">
                <Field
                    title="Plugin name"
                    help="Human-readable title shown in the Plugins list (e.g. Better Mentions)."
                >
                    <TextInput value={name} onChange={setName} placeholder="Better Mentions" />
                </Field>

                <Field
                    title="Folder ID"
                    help="Machine name for the folder under src/userplugins/. Use camelCase letters/numbers only (e.g. betterMentions). This becomes the plugin’s code identity."
                >
                    <TextInput value={id} onChange={setId} placeholder="betterMentions" />
                </Field>

                <Field
                    title="Description"
                    help="Short explanation of what the plugin does. Shown under the name in Plugins."
                >
                    <TextInput value={description} onChange={setDescription} placeholder="Highlights mentions you care about" />
                </Field>

                <Field
                    title="Author"
                    help="Your display name for credit in the plugin card (not a Discord login)."
                >
                    <TextInput value={author} onChange={setAuthor} placeholder="Your name" />
                </Field>

                <Field
                    title="Template"
                    help={"Starter code style. Use: hello (empty start/stop), settings (example toggle), command (slash-style bot command), listener (MESSAGE_CREATE observer), utility (same as hello)."}
                >
                    <TextInput value={template} onChange={v => setTemplate(v as TemplateId)} placeholder="hello" />
                </Field>

                <Button onClick={generate}>Generate project</Button>
                {preview && (
                    <textarea readOnly style={{ width: "100%", minHeight: 240, fontFamily: "monospace" }} value={preview} />
                )}
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(PluginCreatorTab, "Plugin Creator");
