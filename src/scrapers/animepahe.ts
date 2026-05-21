import { fileExists } from "../utils.js";
import type { AnimeScraper } from "./scraper.js";
import type { AnimeFetchResponse, EpisodesFetchResponse, StreamSource } from "./responses.js";
import axios from "axios";
import { Cookies as CookiesManager } from "./cookies.js";
import * as cheerio from "cheerio";


class Globals {
    static readonly HOME_PAGE = "https://animepahe.pw/";

    static getSearchUrl(query: string) {
        return `${this.HOME_PAGE}api?m=search&q=${encodeURIComponent(query)}`;
    }

    static getEpisodesUrl(animeSession: string, page = 1) {
        return `${this.HOME_PAGE}api?m=release&id=${animeSession}&sort=episode_desc&page=${page}`;
    }

    static getStreamSourcesUrl(animeSession: string, episodeSession: string) {
        return `${this.HOME_PAGE}play/${animeSession}/${episodeSession}`;
    }
}

export class Animepahe implements AnimeScraper {
    readonly DEFAULT_COOKIES_PATH = 'cookies.json';
    private cookies_str!: string;
    private current_page = 1;
    private changed_to_first_page = false;

    public async init() {
        if (await fileExists(this.DEFAULT_COOKIES_PATH)) {
            this.cookies_str = await CookiesManager.getCookiesStringFromPath(this.DEFAULT_COOKIES_PATH);
        }
    }

    public async refreshCookies() {
        this.cookies_str = await CookiesManager.getCookiesStringAndWriteToFile(this.DEFAULT_COOKIES_PATH);
    }

    private getFakeHeaders() {
        return {
            headers: {
                Accept: 'application/json',
                Cookie: this.cookies_str,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0'
            }
        };
    }

    private async sendRequest(url: string) {
        return axios.get(url, this.getFakeHeaders());;
    }

    public async getAnime(query: string): Promise<AnimeFetchResponse> {
        const url = Globals.getSearchUrl(query);
        const response = await this.sendRequest(url);

        return response.data;
    }

    public nextPage() {
        this.current_page++;
    }

    public backPage() {
        this.current_page--;
    }

    public async getEpisodes(animeSession: string): Promise<EpisodesFetchResponse> {
        const url = Globals.getEpisodesUrl(animeSession, this.current_page);
        const response = await this.sendRequest(url);

        const data = response.data;

        // If the anime has multiple pages the return to the first page 
        // because animepahe returns the first page as the last by default
        if (!this.changed_to_first_page && data.last_page != this.current_page) {
            this.current_page = data.last_page;
            this.changed_to_first_page = true;
            return await this.getEpisodes(animeSession);
        }

        return data;
    }

    // Fetches only embeded videos, not the actual video data
    public async getStreamSources(animeSession: string, episodeSession: string): Promise<Array<StreamSource>> {
        const url = Globals.getStreamSourcesUrl(animeSession, episodeSession);
        const response = await this.sendRequest(url);

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