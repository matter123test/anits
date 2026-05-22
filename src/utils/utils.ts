import { access } from "fs/promises";
import { exec, spawn } from 'node:child_process';

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

export function runMPV(url: string, title: string, episode: string) {
    const headers = "Referer: https://kwik.cx/, User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36, Accept: */*";

    const mpv = spawn('mpv', [
        `--title=${title} - ${episode}`,
        url, `--http-header-fields=${headers}`,
    ]);

    mpv.stdout.on('data', (data) => {
        console.log(`${data}`);
    });

    mpv.stderr.on('data', (data) => {
        console.error(`${data}`);
    });

    mpv.on('close', (code) => {
        console.log(`mpv process exited with code ${code}`);
    });
};