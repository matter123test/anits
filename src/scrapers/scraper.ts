import type { AnimeFetchResponse, EpisodesFetchResponse, StreamSource } from "./responses.js";

export interface AnimeScraper {
    getAnime(query: string): Promise<AnimeFetchResponse>;
    getEpisodes(animeSession: string): Promise<EpisodesFetchResponse>;
    getStreamSources(animeSession: string, episodeSession: string): Promise<Array<StreamSource>>;
}