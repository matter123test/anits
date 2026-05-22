import { isCancel, log, select, spinner, text, type SpinnerResult } from '@clack/prompts';
import { Animepahe } from './scrapers/animepahe.js';
import { runMPV } from './utils/utils.js';
import { getKwikStreamUrl } from './utils/kwik.js';

function checkIfCancel(input: unknown) {
    if (isCancel(input)) {
        return process.exit(0);
    }
}

async function retryFunc<T>(main: () => Promise<T>, or: () => Promise<void>, maxTries = 4) {
    let current = 0;
    let lastError: unknown;

    while (current < maxTries) {
        try {
            return await main();
        }
        catch (error) {
            lastError = error;
            await or();
        }
        current++;
    }

    throw lastError;
}

async function main() {
    console.clear();

    const s = spinner();

    const api = new Animepahe();
    s.start("Starting api...");
    await api.init();
    s.stop("Started api");

    // Search anime
    const animeSearch = await text({
        message: "Search anime: "
    });

    checkIfCancel(animeSearch);

    s.start("Searching anime...");
    let animeResults = await retryFunc(
        () => api.getAnime(animeSearch.toString()),
        async () => {
            s.message("Refreshing cookies...");
            await api.refreshCookies();
        }
    );
    s.stop("Done searching anime");

    // Select anime
    const animeSession = (await select<string>({
        message: "Select anime",
        options: animeResults.data.map((anime) => ({ value: anime.session, label: anime.title }))
    })).toString();

    checkIfCancel(animeSession);

    // Fetch episodes and select
    let episodeSession: string;
    let episodeTitle: string | undefined;

    while (true) {
        s.start("Fetching episodes...");
        const episodesData = await retryFunc(
            () => api.getEpisodes(animeSession),
            async () => {
                s.message("Retrying...");
            }
        );
        s.stop("Fetched episodes");


        let episodesOptions = episodesData.data.map(
            (ep) => ({ value: ep.session, label: ep.episode.toString() })
        ).reverse();

        if (episodesData.next_page_url) {
            episodesOptions.push({ value: "next_page", label: "<-- BACK PAGE" });
        }
        if (episodesData.prev_page_url) {
            episodesOptions.push({ value: "back_page", label: "NEXT PAGE -->" });
        }

        episodeSession = (await select<string>({
            message: "Select episode",
            options: episodesOptions
        })).toString();

        episodeTitle = episodesData.data.find((ep) => ep.session == episodeSession)?.episode.toString();

        checkIfCancel(episodeSession);

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


    // Fetch episode streams
    s.start("Fetching url...");
    const sources = await retryFunc(
        () => api.getStreamSources(animeSession.toString(), episodeSession.toString()),
        async () => {
            s.message("Retrying...");
        }
    );
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

    checkIfCancel(source);

    const url = source.toString();
    const stream = await getKwikStreamUrl(url);

    console.log(`Embeded video url: ${url}`);
    console.log(`Video source: ${stream}`);


    // Get anime info    
    const animeTitle = animeResults.data.find((anime) => anime.session == animeSession)?.title;

    if (stream) {
        runMPV(stream, animeTitle!, episodeTitle!);
    }
    else {
        log.message("Stream not found");
    }
}

main().catch(
    (error) => {
        console.log(error);
        process.exit(1);
    }
);