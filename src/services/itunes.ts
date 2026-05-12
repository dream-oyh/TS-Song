import type { ItunesTrack, SongSeed } from "../types";

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrack[];
}

export class ItunesRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItunesRequestError";
  }
}

let jsonpSequence = 0;

function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function pickBestTrack(results: ItunesTrack[], song: SongSeed): ItunesTrack | null {
  const targetSong = normalizeText(song.name);
  const targetArtist = normalizeText(song.artist);

  const exactMatch = results.find((item) => {
    return (
      normalizeText(item.trackName) === targetSong &&
      normalizeText(item.artistName) === targetArtist
    );
  });

  const songOnlyMatch = results.find((item) => {
    return normalizeText(item.trackName) === targetSong;
  });

  return exactMatch ?? songOnlyMatch ?? results[0] ?? null;
}

function jsonpRequest(url: URL): Promise<ItunesSearchResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__itunesJsonpCallback_${Date.now()}_${jsonpSequence++}`;
    const script = document.createElement("script");
    const callbackHost = window as unknown as Record<
      string,
      ((payload: ItunesSearchResponse) => void) | undefined
    >;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new ItunesRequestError("iTunes 请求超时，请点击按钮后重试。"));
    }, 12000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      delete callbackHost[callbackName];
      script.remove();
    };

    callbackHost[callbackName] = (payload: ItunesSearchResponse) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new ItunesRequestError("iTunes 请求失败，请点击按钮后重试。"));
    };

    url.searchParams.set("callback", callbackName);
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

export async function searchSongPreview(song: SongSeed): Promise<ItunesTrack> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", `${song.artist} ${song.name}`);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "10");
  url.searchParams.set("country", song.country);

  const payload = await jsonpRequest(url);

  if (!payload.resultCount || payload.results.length === 0) {
    throw new Error(`没有找到 ${song.artist} - ${song.name} 的搜索结果。`);
  }

  const track = pickBestTrack(payload.results, song);

  if (!track?.previewUrl) {
    throw new Error(`找到了歌曲，但没有可播放的试听音频。`);
  }

  return track;
}
