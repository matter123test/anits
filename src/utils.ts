import { access } from "fs/promises";

export async function fileExists(path: string): Promise<boolean> {
    try {
        await access("cookies.json");
        return true;
    }
    catch (error) {
        return false;
    }
}