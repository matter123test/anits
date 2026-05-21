import { chromium, type Cookie } from "playwright";

export async function FetchCookies(): Promise<Array<Cookie>> {
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

export function StringifyCookies(cookies: Cookie[]): string {
    return cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
}
