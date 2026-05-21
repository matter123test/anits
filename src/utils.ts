import { access } from "fs/promises"; 7
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