import { type Browser, type BrowserContext, chromium } from 'playwright';
import * as cheerio from "cheerio";

interface AnimeSearchResponse {
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
    text?: string | undefined ;
    src?: string | undefined;
    fansub?: string | undefined;
    resolution?: string | undefined;
    audio?: string | undefined;
}

export class Animepahe {
    browser!: Browser;
    context!: BrowserContext;

    current_page = 1;

    async init() {
        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext();

        // Preload the website
        const page = await this.context.newPage();
        await page.goto("https://animepahe.pw");
        await page.waitForSelector('.episode-snapshot');
        await page.close();
    }

    async close() {
        await this.context.close();
        await this.browser.close();
    }

    async getAnime(query: string): Promise<AnimeSearchResponse> {
        const url = `https://animepahe.pw/api?m=search&q=${encodeURIComponent(query)}`;
        const res = await this.context.request.get(url);

        if (!res.ok) {
            throw new Error(`Failed to search anime, ${res.status}`);
        }

        let data;
        try {
            data = await res.json();
        }
        catch (err) {
            console.log(await res.text());
            throw new Error(`Failed to parse json, ${err}`);
        }

        return data;
    }

    async getEpisodes(animeSession: string): Promise<EpisodesFetchResponse> {
        const url = `https://animepahe.pw/api?m=release&id=${animeSession}&sort=episode_desc&page=${this.current_page}`;
        const res = await this.context.request.get(url);

        if (!res.ok) {
            throw new Error(`Failed to fetch episodes, with response: ${res.status()}`);
        }

        const data = await res.json();

        return data;
    }

    nextPage() {
        this.current_page++;
    }

    backPage() {
        this.current_page--;
    }

    async getEmbededSources(animeSession: string, episodeSession: string): Promise<Array<EmbededSource>> {
        const url = `https://animepahe.pw/play/${animeSession}/${episodeSession}`;

        const page = await this.context.newPage();
        await page.goto(url);
        await page.waitForSelector('.dropup');

        const $ = cheerio.load(await page.content());

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

        await page.close();

        return items;
    }
}