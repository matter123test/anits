import { readFile, writeFile } from "fs/promises";
import { chromium, type Cookie } from "playwright";

export class Cookies {
    private static async fetchCookies(): Promise<Cookie[]> {
        const browser = await chromium.launch({
            headless: true, args: [
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-sandbox"
            ]
        });

        const context = await browser.newContext();

        // Load the website
        const page = await context.newPage();
        await page.goto("https://animepahe.pw");
        await page.waitForSelector('.episode-snapshot');
        await page.close();

        const cookies = await context.cookies();

        // Cleanup
        await context.close();
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
