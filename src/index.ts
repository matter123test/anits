import { select, spinner, text } from '@clack/prompts';
import { type Browser, type BrowserContext, chromium } from 'playwright';
import * as cheerio from "cheerio";
import { exec } from 'node:child_process';

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
    text?: string;
    src?: string;
    fansub?: string;
    resolution?: string;
    audio?: string;
}

class Animepahe {
    browser!: Browser;
    context!: BrowserContext;

    current_page = 1;

    async init() {
        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext();

        // Preload the website
        const page = await this.context.newPage();
        await page.goto("https://animepahe.pw");
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('.main');
        await page.close();
    }

    async close() {
        await this.context.close();
        await this.browser.close();
    }

    throwFailedToFetchAnime(msg: string) {
        throw new Error(`Failed to search anime, ${msg}`);
    }

    async getAnime(query: string): Promise<AnimeSearchResponse> {
        const url = `https://animepahe.pw/api?m=search&q=${encodeURIComponent(query)}`;
        const res = await this.context.request.get(url);

        if (!res.ok) {
            this.throwFailedToFetchAnime(res.status.toString());
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
                src: $(el).attr('data-src'),
                fansub: $(el).attr('data-fansub'),
                resolution: $(el).attr('data-resolution'),
                audio: $(el).attr('data-audio'),
            })).filter(
                (i, el) => !!el.src
            )
            .get();

        await page.close();

        return items;
    }
}

function openUrl(url: string) {
    const cmd = process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
            ? `open "${url}"`
            : `xdg-open "${url}"`;

    exec(cmd);
}

async function main() {
    const s = spinner();

    const api = new Animepahe();
    s.start("Starting api...");
    await api.init();
    s.stop("Started api");

    // var data = await api.getAnime("jojo");
    // const session = data.data.at(0)?.session;
    // let other = await api.getEpisodes(session!);
    // console.log(other);

    const animeSearch = await text({
        message: "Search anime: "
    });

    const animeResults = await api.getAnime(animeSearch.toString());

    const animeSession = await select<string>({
        message: "Select anime",
        options: animeResults.data.map((anime) => ({ value: anime.session, label: anime.title }))
    });

    let episodeSession;

    while (true) {
        const episodeResults = await api.getEpisodes(animeSession.toString());

        let episodesOptions = episodeResults.data.map(
            (ep) => ({ value: ep.session, label: ep.episode.toString() })
        ).reverse();

        if (episodeResults.next_page_url) {
            episodesOptions.push({ value: "next_page", label: "<-- BACK PAGE" });
        }
        if (episodeResults.prev_page_url) {
            episodesOptions.push({ value: "back_page", label: "NEXT PAGE -->" });
        }

        episodeSession = await select<string>({
            message: "Select episode",
            options: episodesOptions
        })

        if (episodeSession == "next_page") {
            api.nextPage();
        }
        else if (episodeSession == "back_page") {
            api.backPage();
        }
        else {
            break;
        }
    }

    const sources = await api.getEmbededSources(animeSession.toString(), episodeSession.toString());

    const source = await select<string>({
        message: "Select source",
        options: sources
            .filter(s => s.src != null)
            .map((source) => ({
                value: source.src!.toString(),
                label: `Resolution: ${source.resolution?.toString()} Audio: ${source.audio?.toString()}`
            }))
    });


    const url = source.toString();
    console.log(`Selected url ${url}`);
    openUrl(url);

    await api.close();
}

main().catch(console.error);