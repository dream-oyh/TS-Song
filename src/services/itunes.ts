import axios from "axios";
import type { ItunesTrack, SongSeed } from "../types";

export class ItunesRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItunesRequestError";
  }
}

function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "";
  }

  throw new ItunesRequestError("代理服务地址未配置。请设置 VITE_API_BASE_URL 后重新构建站点。");
}

export async function searchSongPreview(song: SongSeed): Promise<ItunesTrack> {
  try {
    const response = await axios.get<ItunesTrack>(`${getApiBaseUrl()}/api/itunes/search`, {
      params: {
        name: song.name,
        artist: song.artist,
        country: song.country
      },
      timeout: 15000
    });

    if (!response.data?.previewUrl) {
      throw new Error("代理服务返回了歌曲结果，但没有可播放的试听音频。");
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === "object" &&
        error.response?.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : error.message || "iTunes 请求失败，请点击按钮后重试。";
      throw new ItunesRequestError(message);
    }

    if (error instanceof Error) {
      throw new ItunesRequestError(error.message);
    }

    throw new ItunesRequestError("iTunes 请求失败，请点击按钮后重试。");
  }
}
