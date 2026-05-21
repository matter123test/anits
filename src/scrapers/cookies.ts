import { readFile, writeFile } from "fs/promises";
import puppeteer, { type Cookie } from "puppeteer";

export class Cookies {
    private static async fetchCookies(): Promise<Cookie[]> {
        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        await page.goto("https://animepahe.pw");
        await page.waitForSelector('.episode-snapshot');

        const cookies = await browser.cookies();

        await page.close();
        await browser.close();

        return cookies;
    }

    private static stringifyCookies(cookies: Cookie[]): string {
        return cookies
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join('; ');
    }

    public static async getCookiesStringFromPath(path: string): Promise<string> {
        const data = await readFile(path, 'utf-8');
        const cookie = this.stringifyCookies(JSON.parse(data));
        return cookie;
    }

    public static async getCookiesStringAndWriteToFile(path: string): Promise<string> {
        const cookies = await this.fetchCookies();

        await writeFile(path, JSON.stringify(cookies));

        return this.stringifyCookies(cookies);
    }
}
