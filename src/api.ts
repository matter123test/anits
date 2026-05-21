import { access, readFile, writeFile } from "fs/promises";
import { FetchCookies, StringifyCookies } from "./cookies.js";
import type { Cookie } from "playwright";
import * as cheerio from "cheerio";

import axios from "axios";
import { fileExists } from "./utils.js";
import { log } from "@clack/prompts";

interface AnimeFetchResponse {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    next_page_url?: string;
    prev_page_url?: string;
    from: number;
    to: number;
    data: Array<{
        id: number;
        title: string;
        type: string;
        episodes: number;
        status: string;
        season: string;
        year: number;
        score: number;
        poster: string;
        session: string;
    }>;
}

interface EpisodesFetchResponse {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    next_page_url?: string;
    prev_page_url?: string;
    from: number;
    to: number;
    data: Array<{
        id: number,
        anime_id: number,
        episode: number,
        episode2: number,
        edition: string,
        title: string,
        snapshot: string,
        disc: string,
        audio: string,
        duration: string,
        session: string,
        filler: number,
        created_at: string
    }>;
}

interface EmbededSource {
    text?: string | undefined;
    src?: string | undefined;
    fansub?: string | undefined;
    resolution?: string | undefined;
    audio?: string | undefined;
}


interface AnimeScraper {
    getAnime(query: string): Promise<AnimeFetchResponse>;
    getEpisodes(animeSession: string): Promise<EpisodesFetchResponse>;
    getStreamSources(animeSession: string, episodeSession: string): Promise<Array<EmbededSource>>;
}

export class AnimepaheScraper implements AnimeScraper {
    readonly DEFAULT_COOKIES_PATH = 'cookies.json';
    private cookie!: string;
    private current_page = 1;
    private changed_to_first_page = false;

    public async init() {
        if (await fileExists(this.DEFAULT_COOKIES_PATH)) {
            const data = await readFile(this.DEFAULT_COOKIES_PATH, 'utf-8');
            this.cookie = StringifyCookies(JSON.parse(data));
            log.message(`Loaded ${this.DEFAULT_COOKIES_PATH}`);
        }

        // console.log(this.cookie);
    }

    async close() {

    }

    public async refreshCookies() {
        const jsonCookies = await FetchCookies();
        await writeFile(this.DEFAULT_COOKIES_PATH, JSON.stringify(jsonCookies));
        this.cookie = StringifyCookies(jsonCookies);
    }

    private getFakeHeaders() {
        return {
            headers: {
                Accept: 'application/json',
                Cookie: this.cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0'
            }
        };
    }

    async getAnime(query: string): Promise<AnimeFetchResponse> {
        const url = `https://animepahe.pw/api?m=search&q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, this.getFakeHeaders());

        return response.data;
    }

    nextPage() {
        this.current_page++;
    }

    backPage() {
        this.current_page--;
    }

    async getEpisodes(animeSession: string): Promise<EpisodesFetchResponse> {
        const url = `https://animepahe.pw/api?m=release&id=${animeSession}&sort=episode_desc&page=${this.current_page}`;

        const response = await axios.get(url, this.getFakeHeaders())

        const data = response.data;

        if (!this.changed_to_first_page && data.last_page != this.current_page) {
            this.current_page = data.last_page;
            this.changed_to_first_page = true;
            return await this.getEpisodes(animeSession);
        }

        return data;
    }

    async getStreamSources(animeSession: string, episodeSession: string): Promise<Array<EmbededSource>> {
        const url = `https://animepahe.pw/play/${animeSession}/${episodeSession}`;
        const response = await axios.get(url, this.getFakeHeaders());

        const $ = cheerio.load(response.data);

        const items = $('.dropdown-item')
            .map((i, el) => ({
                text: $(el).text().trim(),
                src: $(el).attr('data-src')?.toString(),
                fansub: $(el).attr('data-fansub'),
                resolution: $(el).attr('data-resolution'),
                audio: $(el).attr('data-audio'),
            })).filter(
                (i, el) => !!el.src
            ).get();

        return items;
    }
}