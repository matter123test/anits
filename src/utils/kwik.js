import { load } from 'cheerio';
import vm from 'node:vm';

function runVM(script) {
    const context = {
        console,
        window: {},
        document: {}, // fake stub to avoid crash
    };

    vm.createContext(context);

    try {
        vm.runInContext(script, context);
        return { ok: true, context };
    } catch (err) {
        return {
            ok: false,
            name: err.name,
            message: err.message,
            stack: err.stack
        };
    }
}

export async function getKwikStreamUrl(kwikEmbededUrl) {
    const response = await fetch(kwikEmbededUrl, {
        method: "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Referer": "https://kwik.cx/",
            "Origin": "https://kwik.cx",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
    });

    const html = await response.text();

    const $ = load(html);

    const script = $('script').get(5).children[0].data;

    const vmOut = runVM(script);
    const out = vmOut.stack;

    if (out) {
        const match = out.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/);

        return match[0];
    }

    return null;
}

// console.log(await getKwikStreamUrl("https://kwik.cx/e/07TcFXQaFfe9"));