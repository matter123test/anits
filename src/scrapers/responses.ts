export type { AnimeFetchResponse, EpisodesFetchResponse, StreamSource };

interface AnimeFetchResponse {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    next_page_url?: string;
    prev_page_url?: string;
    from: number;
    to: number;
    data: Array<{
        id: number;
        title: string;
        type: string;
        episodes: number;
        status: string;
        season: string;
        year: number;
        score: number;
        poster: string;
        session: string;
    }>;
}

interface EpisodesFetchResponse {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    next_page_url?: string;
    prev_page_url?: string;
    from: number;
    to: number;
    data: Array<{
        id: number,
        anime_id: number,
        episode: number,
        episode2: number,
        edition: string,
        title: string,
        snapshot: string,
        disc: string,
        audio: string,
        duration: string,
        session: string,
        filler: number,
        created_at: string
    }>;
}

interface StreamSource {
    text?: string | undefined;
    src?: string | undefined;
    fansub?: string | undefined;
    resolution?: string | undefined;
    audio?: string | undefined;
}