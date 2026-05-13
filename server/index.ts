import axios from "axios";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";

interface ItunesTrack {
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrack[];
}

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());

function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function isArtistMatch(resultArtistName: string, targetArtistName: string): boolean {
  const normalizedResultArtist = normalizeText(resultArtistName);
  const normalizedTargetArtist = normalizeText(targetArtistName);

  return (
    normalizedResultArtist === normalizedTargetArtist ||
    normalizedResultArtist.includes(normalizedTargetArtist)
  );
}

function pickBestTrack(results: ItunesTrack[], songName: string, artistName: string): ItunesTrack | null {
  const targetSong = normalizeText(songName);
  const artistMatchedResults = results.filter((item) => {
    return isArtistMatch(item.artistName, artistName);
  });

  const exactMatch = artistMatchedResults.find((item) => {
    return normalizeText(item.trackName) === targetSong;
  });

  return exactMatch ?? artistMatchedResults[0] ?? null;
}

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.get("/api/itunes/search", async (request: Request, response: Response) => {
  const songName = String(request.query.name || "").trim();
  const artistName = String(request.query.artist || "").trim();
  const country = String(request.query.country || "us").trim();

  if (!songName || !artistName) {
    response.status(400).json({
      message: "Missing required query parameters: name and artist."
    });
    return;
  }

  try {
    const apiResponse = await axios.get<ItunesSearchResponse>("https://itunes.apple.com/search", {
      params: {
        term: `${artistName} ${songName}`,
        media: "music",
        entity: "song",
        limit: 10,
        country
      },
      timeout: 12000,
      headers: {
        Accept: "application/json,text/javascript,*/*;q=0.1",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://music.apple.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });

    const payload = apiResponse.data;

    if (!payload?.resultCount || !Array.isArray(payload.results) || payload.results.length === 0) {
      response.status(404).json({
        message: `No search results found for ${artistName} - ${songName}.`
      });
      return;
    }

    const track = pickBestTrack(payload.results, songName, artistName);

    if (!track) {
      response.status(404).json({
        message: `No results matched artist ${artistName} for song ${songName}.`
      });
      return;
    }

    if (!track.previewUrl) {
      response.status(404).json({
        message: `A matching track for ${artistName} - ${songName} was found, but no preview audio is available.`
      });
      return;
    }

    response.json(track);
  } catch (error) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status || 502 : 500;
    const message = axios.isAxiosError(error)
      ? typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : error.message || "Failed to fetch data from iTunes Search API."
      : "Unexpected server error.";

    response.status(statusCode).json({ message });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`);
});
