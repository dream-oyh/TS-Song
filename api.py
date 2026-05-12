import requests


def normalize_text(text):
    """统一比较字符串，忽略空格和大小写。"""
    return "".join(text.lower().split())


def get_itunes_preview(song_name, artist_name=None, country="us"):
    # 1. 定义 API 地址
    url = "https://itunes.apple.com/search"

    # 2. 设置参数
    # term: 搜索关键词
    # entity: 设定为 song 获取歌曲
    # limit: 多取几条结果，方便做精确匹配
    # country: 指定搜索区服，英文歌曲建议用 us
    search_term = song_name if not artist_name else f"{artist_name} {song_name}"
    params = {
        "term": search_term,
        "media": "music",
        "entity": "song",
        "limit": 10,
        "country": country
    }

    try:
        # 3. 发送请求
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()  # 检查请求是否成功

        # 4. 解析 JSON 数据
        data = response.json()

        if data["resultCount"] > 0:
            track = None

            if artist_name:
                target_song = normalize_text(song_name)
                target_artist = normalize_text(artist_name)

                for item in data["results"]:
                    item_song = normalize_text(item.get("trackName", ""))
                    item_artist = normalize_text(item.get("artistName", ""))
                    if item_song == target_song and item_artist == target_artist:
                        track = item
                        break

            if track is None:
                track = data["results"][0]

            print(f"--- 找到歌曲 ---")
            print(f"歌名: {track['trackName']}")
            print(f"歌手: {track['artistName']}")
            print(f"专辑: {track['collectionName']}")
            print(f"\n--- 核心歌源路径 (m4a) ---")
            print(track['previewUrl'])
            print(f"\n提示：你可以直接点击上方链接试听 30 秒片段。")
        else:
            print("未找到相关歌曲。")

    except Exception as e:
        print(f"发生错误: {e}")


if __name__ == "__main__":
    # 原来的中文搜索写法
    get_itunes_preview("七里香", artist_name="周杰伦", country="cn")

    print("\n" + "=" * 50 + "\n")

    # 搜索 Taylor Swift 的 Bye Bye Baby
    # 即使你写成 ByeByeBaby，也会自动忽略空格进行匹配
    get_itunes_preview("HolyGround", artist_name="Taylor Swift", country="us")
