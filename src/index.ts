import { isCancel, log, select, spinner, text, type SpinnerResult } from '@clack/prompts';

import { Animepahe } from './scrapers/animepahe.js';
import { buildMPVCommand, openUrl } from './utils/utils.js';
import { getKwikStreamUrl } from './utils/kwik.js';
import { exec } from 'node:child_process';

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

async function getEpisodeSession(api: Animepahe, animeSession: string, s: SpinnerResult) {
    let episodeSession;

    while (true) {
        s.start("Fetching episodes...");
        const episodeResults = await retryFunc(
            () => api.getEpisodes(animeSession.toString()),
            async () => {
                s.message("Retrying...");
            }
        );
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

    return episodeSession;
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


    const animeSession = await select<string>({
        message: "Select anime",
        options: animeResults.data.map((anime) => ({ value: anime.session, label: anime.title }))
    });

    checkIfCancel(animeSession);

    // Select episode
    let episodeSession = await getEpisodeSession(api, animeSession.toString(), s);

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

    const command = buildMPVCommand(stream);
    exec(command);
}

main().catch(
    (error) => {
        console.log(error);
        process.exit(1);
    }
);