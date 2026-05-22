import { access } from "fs/promises";
import { exec } from 'node:child_process';

export async function fileExists(path: string): Promise<boolean> {
    try {
        await access("cookies.json");
        return true;
    }
    catch (error) {
        return false;
    }
}

export function openUrl(url: string) {
    const cmd = process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
            ? `open "${url}"`
            : `xdg-open "${url}"`;

    exec(cmd);
}

export function buildMPVCommand(stream: string) {
    return `mpv ${stream} --http-header-fields="Referer: https://kwik.cx/, User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36, Accept: */*"`;
}
