/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { isPluginEnabled } from "@api/PluginManager";
import OpenInAppPlugin from "@plugins/openInApp";
import { findByProps, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import { settings } from ".";

export interface Track {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;
    album: {
        id: string;
        name: string;
        image: {
            height: number;
            width: number;
            url: string;
        };
    };
    artists: {
        id: string;
        href: string;
        name: string;
        type: string;
        uri: string;
    }[];
}

/** Minimal track info for the upcoming-queue list */
export interface QueueTrack {
    id: string;
    name: string;
    artists: string;
    imageUrl?: string;
    uri?: string;
}

function mapSpotifyApiTrack(t: any): QueueTrack | null {
    if (!t?.name) return null;
    const images = t.album?.images;
    const image = Array.isArray(images) ? (images[images.length - 1] || images[0]) : null;
    return {
        id: t.id || t.uri || t.name,
        name: t.name,
        artists: (t.artists || []).map((a: any) => a?.name).filter(Boolean).join(", ") || "Unknown",
        imageUrl: image?.url,
        uri: t.uri
    };
}

interface PlayerState {
    accountId: string;
    track: Track | null;
    volumePercent: number,
    isPlaying: boolean,
    repeat: boolean,
    position: number,
    context?: any;
    device?: Device;

    // added by patch
    actual_repeat: Repeat;
    shuffle: boolean;
}

interface Device {
    id: string;
    is_active: boolean;
}

type Repeat = "off" | "track" | "context";

// Don't wanna run before Flux and Dispatcher are ready!
export const SpotifyStore = proxyLazyWebpack(() => {
    // For some reason ts hates extends Flux.Store
    const { Store } = Flux;

    const SpotifySocket = findByProps("getActiveSocketAndDevice");
    const SpotifyAPI = findByPropsLazy("vcSpotifyMarker");

    const API_BASE = "https://api.spotify.com/v1/me/player";

    class SpotifyStore extends Store {
        public mPosition = 0;
        public _start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;
        public muted = false;
        public queue: QueueTrack[] = [];
        /** Spotify context URI (playlist/album/…) when Discord provides it */
        public contextUri: string | null = null;

        public isSettingPosition = false;
        private _volumeTimer: any = null;
        private _queueTimer: any = null;
        private _volumeBeforeMute = 50;

        public openExternal(path: string) {
            const url = settings.store.useSpotifyUris || isPluginEnabled(OpenInAppPlugin.name)
                ? "spotify:" + path.replaceAll("/", (_, idx) => idx === 0 ? "" : ":")
                : "https://open.spotify.com" + path;

            VencordNative.native.openExternal(url);
        }

        // Need to keep track of this manually
        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this._start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this._start = Date.now();
        }

        prev() {
            this._req("post", "/previous");
        }

        next() {
            this._req("post", "/next").then(() => this.fetchQueue());
        }

        fetchQueue() {
            if (!settings.store.showUpcomingQueue) {
                if (this.queue.length) {
                    this.queue = [];
                    this.emitChange();
                }
                return Promise.resolve();
            }

            return this._req("get", "/queue")
                .then((res: any) => {
                    const body = res?.body ?? res;
                    const raw = Array.isArray(body?.queue) ? body.queue : [];
                    this.queue = raw
                        .map(mapSpotifyApiTrack)
                        .filter(Boolean)
                        .slice(0, 1) as QueueTrack[];
                    this.emitChange();
                })
                .catch((e: any) => {
                    console.error("[SpotifyControls] Failed to fetch queue", e);
                });
        }

        ensureQueuePolling() {
            if (this._queueTimer) return;
            this._queueTimer = setInterval(() => {
                if (settings.store.showUpcomingQueue && this.device?.is_active)
                    this.fetchQueue();
            }, 15_000);
        }

        setVolume(percent: number) {
            const v = Math.max(0, Math.min(100, Math.round(percent)));
            // Update UI immediately — Spotify’s API is slow
            this.volume = v;
            if (v > 0) {
                this.muted = false;
                this._volumeBeforeMute = v;
            } else {
                this.muted = true;
            }
            this.emitChange();

            if (this._volumeTimer) clearTimeout(this._volumeTimer);
            this._volumeTimer = setTimeout(() => {
                this._req("put", "/volume", {
                    query: { volume_percent: v }
                }).catch((e: any) => {
                    console.error("[SpotifyControls] Failed to set volume", e);
                });
            }, 80);
        }

        /** Click speaker: mute → 0, unmute → restore volume from before mute */
        toggleMute() {
            if (this.muted || this.volume === 0) {
                const restore = this._volumeBeforeMute > 0 ? this._volumeBeforeMute : 50;
                this.muted = false;
                this.setVolume(restore);
            } else {
                this._volumeBeforeMute = this.volume > 0 ? this.volume : this._volumeBeforeMute;
                this.muted = true;
                this.setVolume(0);
                // setVolume(0) sets muted true again — keep before-mute saved
                this._volumeBeforeMute = this._volumeBeforeMute || 50;
            }
        }

        setPlaying(playing: boolean) {
            this._req("put", playing ? "/play" : "/pause");
        }

        /**
         * Jump to a song in Up Next by skipping forward (same path as the Next button).
         * Avoids PUT /play with a JSON body — Discord’s Spotify client doesn’t send those correctly,
         * which was stopping playback entirely.
         */
        async playQueueItem(item: QueueTrack, index: number) {
            if (!item?.uri && index < 0) return;

            this.applyQueueItemOptimistically(item);

            try {
                const skips = Math.max(1, index + 1);
                for (let i = 0; i < skips; i++) {
                    await this._req("post", "/next");
                    // Let Spotify apply each skip before the next (avoids dropped skips)
                    if (i < skips - 1)
                        await new Promise(r => setTimeout(r, 200));
                }
                await this.fetchQueue();
            } catch (e) {
                console.error("[SpotifyControls] Failed to jump to queue item", item?.uri, e);
            }
        }

        private applyQueueItemOptimistically(item: QueueTrack) {
            this.isPlaying = true;
            this.position = 0;
            this.track = {
                id: item.id,
                name: item.name,
                duration: this.track?.duration ?? 0,
                isLocal: false,
                album: {
                    id: "",
                    name: "",
                    image: {
                        height: 64,
                        width: 64,
                        url: item.imageUrl || this.track?.album?.image?.url || ""
                    }
                },
                artists: (item.artists || "Unknown").split(", ").map(name => ({
                    id: "",
                    href: "",
                    name,
                    type: "artist",
                    uri: ""
                }))
            };
            this.emitChange();
        }

        setRepeat(state: Repeat) {
            this._req("put", "/repeat", {
                query: { state }
            });
        }

        setShuffle(state: boolean) {
            this._req("put", "/shuffle", {
                query: { state }
            }).then(() => {
                this.shuffle = state;
                this.emitChange();
            });
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();

            this.isSettingPosition = true;

            return this._req("put", "/seek", {
                query: {
                    position_ms: Math.round(ms)
                }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to seek", e);
                this.isSettingPosition = false;
            });
        }

        _req(method: "post" | "get" | "put", route: string, data: any = {}) {
            if (this.device?.is_active)
                (data.query ??= {}).device_id = this.device.id;

            const { socket } = SpotifySocket.getActiveSocketAndDevice();
            return SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url: API_BASE + route,
                ...data
            });
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(e: PlayerState) {
            const trackChanged = store.track?.id !== e.track?.id;
            store.track = e.track;
            store.device = e.device ?? null;
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volumePercent ?? store.volume;
            store.repeat = e.actual_repeat || "off";
            store.shuffle = e.shuffle ?? false;
            store.position = e.position ?? 0;
            store.contextUri = e.context?.uri ?? e.context?.external_url ?? store.contextUri;
            // Discord sometimes sends context as { uri: "spotify:playlist:…" }
            if (typeof e.context === "string") store.contextUri = e.context;
            store.isSettingPosition = false;
            store.emitChange();
            store.ensureQueuePolling();
            if (trackChanged || settings.store.showUpcomingQueue)
                store.fetchQueue();
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
            if (store.device?.is_active) store.fetchQueue();
        }
    });

    return store;
});
