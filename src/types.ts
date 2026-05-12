export interface SongSeed {
  name: string;
  artist: string;
  country: string;
}

export interface ItunesTrack {
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}
