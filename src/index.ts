import { select, spinner, text } from '@clack/prompts';
import { exec } from 'node:child_process';
import { Animepahe } from './animepahe.js';


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

    // Search anime
    const animeSearch = await text({
        message: "Search anime: "
    });

    s.start("Searching anime...");
    const animeResults = await api.getAnime(animeSearch.toString());
    s.stop("Done searching anime");

    const animeSession = await select<string>({
        message: "Select anime",
        options: animeResults.data.map((anime) => ({ value: anime.session, label: anime.title }))
    });

    // Select episode
    let episodeSession;
    while (true) {
        s.start("Fetching episodes...");
        const episodeResults = await api.getEpisodes(animeSession.toString());
        s.stop("Fetched episodes");

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

    s.start("Fetching url...");
    const sources = await api.getEmbededSources(animeSession.toString(), episodeSession.toString());
    s.stop("Fetched urls");

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