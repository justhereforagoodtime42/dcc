/*
 * BetterDiscord-style theme browser (Themes → Browse)
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Forms, React, Select, showToast, TextInput, useCallback, useEffect, useMemo, useState } from "@webpack/common";

const BD_API = "https://api.betterdiscord.app/v3/store/themes";
const BD_SITE = "https://betterdiscord.app";

interface BdAuthor {
    display_name: string;
    github_name?: string;
}

export interface BdTheme {
    id: number;
    name: string;
    file_name: string;
    description: string;
    version: string;
    author: BdAuthor;
    likes: string | number;
    downloads: number;
    tags: string[];
    thumbnail_url: string;
    latest_source_url: string;
}

type SortKey = "downloads" | "likes" | "name" | "newest";

function formatCount(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function thumbUrl(theme: BdTheme) {
    if (!theme.thumbnail_url) return null;
    if (theme.thumbnail_url.startsWith("http")) return theme.thumbnail_url;
    return `${BD_SITE}${theme.thumbnail_url.startsWith("/") ? "" : "/"}${theme.thumbnail_url}`;
}

function enableLocalTheme(fileName: string) {
    if (!Settings.enabledThemes.includes(fileName)) {
        Settings.enabledThemes = [...Settings.enabledThemes, fileName];
    }
}

function disableLocalTheme(fileName: string) {
    Settings.enabledThemes = Settings.enabledThemes.filter(f => f !== fileName);
}

function bdFileName(theme: BdTheme) {
    return theme.file_name?.endsWith(".css")
        ? theme.file_name
        : `${theme.name.replace(/[^\w.-]+/g, "") || "theme"}.theme.css`;
}

export function ThemeEditorPanel() {
    const settings = useSettings(["themeLinks", "enabledThemes"]);
    const [themes, setThemes] = useState<BdTheme[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState<string | null>(null);
    const [sort, setSort] = useState<SortKey>("downloads");
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [localNames, setLocalNames] = useState<Set<string>>(new Set());

    const refreshLocal = async () => {
        try {
            const list = await VencordNative.themes.getThemesList();
            setLocalNames(new Set(list.map(t => t.fileName)));
        } catch {
            setLocalNames(new Set());
        }
    };

    const loadStore = useCallback(async () => {
        setError(null);
        setThemes(null);
        try {
            const res = await fetch(BD_API, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as BdTheme[];
            setThemes(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load themes");
            setThemes([]);
        }
    }, []);

    useEffect(() => {
        void refreshLocal();
        void loadStore();
    }, [loadStore]);

    const allTags = useMemo(() => {
        const set = new Set<string>();
        for (const t of themes || []) for (const x of t.tags || []) set.add(x);
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [themes]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = (themes || []).filter(t => {
            if (tag && !(t.tags || []).includes(tag)) return false;
            if (!q) return true;
            const hay = `${t.name} ${t.description} ${t.author?.display_name || ""} ${(t.tags || []).join(" ")}`.toLowerCase();
            return hay.includes(q);
        });

        list = [...list].sort((a, b) => {
            switch (sort) {
                case "likes":
                    return Number(b.likes) - Number(a.likes);
                case "name":
                    return a.name.localeCompare(b.name);
                case "newest":
                    return b.id - a.id;
                case "downloads":
                default:
                    return (b.downloads || 0) - (a.downloads || 0);
            }
        });
        return list;
    }, [themes, query, tag, sort]);

    const downloadBd = async (theme: BdTheme) => {
        if (!theme.latest_source_url) {
            showToast({ text: "No download URL for this theme", variant: "critical" });
            return;
        }
        const fileName = bdFileName(theme);

        setBusyKey(`bd-${theme.id}`);
        try {
            if (localNames.has(fileName)) {
                await VencordNative.themes.deleteTheme(fileName);
                disableLocalTheme(fileName);
                settings.themeLinks = settings.themeLinks.filter(l => !l.includes(theme.latest_source_url));
                showToast({ text: `Removed ${theme.name}` });
            } else {
                const res = await fetch(theme.latest_source_url);
                if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
                const css = await res.text();
                await VencordNative.themes.uploadTheme(fileName, css);
                enableLocalTheme(fileName);
                showToast({ text: `Downloaded ${theme.name} — fully restart Discord if images are blocked`, variant: "success" });
            }
            await refreshLocal();
        } catch (e: any) {
            showToast({ text: e?.message || "Download failed", variant: "critical" });
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <Flex flexDirection="column" gap="1em">
            <Paragraph>
                Themes from the{" "}
                <Link href={`${BD_SITE}/themes`}>BetterDiscord theme list</Link>
                {" "}(same catalog as the website). Download installs into your local themes folder and enables it.
                If a theme uses outside images, use <strong>Allow</strong> under Blocked Resources, then fully restart Discord.
            </Paragraph>

            <Flex gap="0.5em" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <Button size="small" variant="secondary" onClick={() => VencordNative.native.openExternal(`${BD_SITE}/themes`)}>
                    Open betterdiscord.app/themes
                </Button>
                <Button size="small" variant="secondary" onClick={() => void loadStore()}>
                    Refresh list
                </Button>
            </Flex>

            <Flex gap="0.5em" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: "1 1 200px", minWidth: 160 }}>
                    <TextInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search themes…"
                    />
                </div>
                <Select
                    options={[
                        { label: "Most downloads", value: "downloads" },
                        { label: "Most likes", value: "likes" },
                        { label: "Name", value: "name" },
                        { label: "Newest", value: "newest" },
                    ]}
                    serialize={String}
                    isSelected={(v: SortKey) => v === sort}
                    select={(v: SortKey) => setSort(v)}
                />
                <Select
                    options={[
                        { label: "All tags", value: "" },
                        ...allTags.map(t => ({ label: t, value: t })),
                    ]}
                    serialize={String}
                    isSelected={(v: string) => (v || "") === (tag || "")}
                    select={(v: string) => setTag(v || null)}
                />
            </Flex>

            {error && (
                <Card variant="danger">
                    <Forms.FormText>Couldn’t load the theme store: {error}</Forms.FormText>
                    <Forms.FormText className={Margins.top8}>
                        Open <Link href={`${BD_SITE}/themes`}>betterdiscord.app/themes</Link> and drop the file into your themes folder instead.
                    </Forms.FormText>
                </Card>
            )}

            {!themes && !error && <Forms.FormText>Loading themes…</Forms.FormText>}

            {themes && (
                <Forms.FormText className={Margins.bottom8}>
                    {filtered.length} theme{filtered.length === 1 ? "" : "s"}
                </Forms.FormText>
            )}

            <div className="nx-bd-theme-grid">
                {filtered.map(theme => {
                    const fileName = bdFileName(theme);
                    const installed = localNames.has(fileName);
                    const thumb = thumbUrl(theme);
                    return (
                        <Card key={theme.id} className="nx-bd-theme-card">
                            <div className="nx-bd-theme-thumb-wrap">
                                {thumb
                                    ? <img className="nx-bd-theme-thumb" src={thumb} alt="" loading="lazy" />
                                    : <div className={classes("nx-bd-theme-thumb", "nx-bd-theme-thumb-empty")} />}
                            </div>
                            <div className="nx-bd-theme-body">
                                <Forms.FormTitle tag="h5" className={Margins.bottom8}>
                                    <Link href={`${BD_SITE}/theme/${encodeURIComponent(theme.name)}`}>
                                        {theme.name}
                                    </Link>
                                </Forms.FormTitle>
                                <Forms.FormText className="nx-bd-theme-author">
                                    by {theme.author?.display_name || "Unknown"}
                                </Forms.FormText>
                                <Paragraph className="nx-bd-theme-desc">{theme.description}</Paragraph>
                                {(theme.tags?.length ?? 0) > 0 && (
                                    <div className="nx-bd-theme-tags">
                                        {theme.tags.slice(0, 4).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                className="nx-bd-theme-tag"
                                                onClick={() => setTag(t)}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <Flex justifyContent="space-between" alignItems="center" className={Margins.top8} style={{ gap: 8 }}>
                                    <Forms.FormText className="nx-bd-theme-meta">
                                        {formatCount(theme.downloads)} ↓ · {formatCount(Number(theme.likes))} ♥
                                    </Forms.FormText>
                                    <Button
                                        size="small"
                                        disabled={busyKey === `bd-${theme.id}`}
                                        onClick={() => void downloadBd(theme)}
                                        variant={installed ? "secondary" : "primary"}
                                    >
                                        {installed ? "Remove" : "Download"}
                                    </Button>
                                </Flex>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </Flex>
    );
}
