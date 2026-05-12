<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import PreviewPlayer from "./components/PreviewPlayer.vue";
import { ItunesRequestError, searchSongPreview } from "./services/itunes";
import type { ItunesTrack, SongSeed } from "./types";

const songPool = ref<SongSeed[]>([]);
const selectedSong = ref<SongSeed | null>(null);
const selectedTrack = ref<ItunesTrack | null>(null);
const isLoading = ref(false);
const hasRevealedAnswer = ref(false);
const errorMessage = ref("");
const requestCooldownSeconds = ref(0);
const clipSeconds = ref(1);
const previewPlayerRef = ref<InstanceType<typeof PreviewPlayer> | null>(null);
let requestCooldownTimer: number | null = null;
let shouldAutoplayAfterDraw = false;

const minClipSeconds = 1;
const maxClipSeconds = 30;
const siteLogoUrl = `${import.meta.env.BASE_URL}logo.jpeg`;

const canRequestSong = computed(() => {
  return !isLoading.value && requestCooldownSeconds.value === 0;
});
const requestButtonLabel = computed(() => {
  if (isLoading.value) {
    return "正在加载曲目";
  }

  if (requestCooldownSeconds.value > 0) {
    return `${requestCooldownSeconds.value} 秒后可重新抽取`;
  }

  return "重新抽取曲目";
});

function increaseClipSeconds() {
  clipSeconds.value = Math.min(clipSeconds.value + 1, maxClipSeconds);
}

function decreaseClipSeconds() {
  clipSeconds.value = Math.max(clipSeconds.value - 1, minClipSeconds);
}

function getSongJsonUrl(): string {
  return `${import.meta.env.BASE_URL}song.json`;
}

async function loadSongPool() {
  const response = await fetch(getSongJsonUrl());
  if (!response.ok) {
    throw new Error("曲目库加载失败。");
  }

  songPool.value = (await response.json()) as SongSeed[];
}

function pickRandomSong(): SongSeed | null {
  if (songPool.value.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * songPool.value.length);
  return songPool.value[randomIndex] ?? null;
}

function clearRequestCooldownTimer() {
  if (requestCooldownTimer === null) {
    return;
  }

  window.clearInterval(requestCooldownTimer);
  requestCooldownTimer = null;
}

function startRequestCooldown() {
  clearRequestCooldownTimer();
  requestCooldownSeconds.value = 5;

  requestCooldownTimer = window.setInterval(() => {
    if (requestCooldownSeconds.value <= 1) {
      requestCooldownSeconds.value = 0;
      clearRequestCooldownTimer();
      return;
    }

    requestCooldownSeconds.value -= 1;
  }, 1000);
}

async function drawRandomSong() {
  if (songPool.value.length === 0) {
    errorMessage.value = "当前曲库为空，请检查 song.json 数据。";
    return;
  }

  isLoading.value = true;
  hasRevealedAnswer.value = false;
  errorMessage.value = "";
  selectedTrack.value = null;
  selectedSong.value = null;

  const candidate = pickRandomSong();

  if (!candidate) {
    errorMessage.value = "当前曲库为空，请检查 song.json 数据。";
    isLoading.value = false;
    return;
  }

  try {
    const track = await searchSongPreview(candidate);
    selectedSong.value = candidate;
    selectedTrack.value = track;

    if (shouldAutoplayAfterDraw) {
      await nextTick();
      await previewPlayerRef.value?.playFromCurrentMode();
      shouldAutoplayAfterDraw = false;
    }
  } catch (error) {
    shouldAutoplayAfterDraw = false;
    errorMessage.value =
      error instanceof ItunesRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : "歌曲查询失败，请稍后重试。";
  } finally {
    isLoading.value = false;
  }
}

async function requestRandomSong() {
  if (!canRequestSong.value) {
    return;
  }

  startRequestCooldown();
  shouldAutoplayAfterDraw = true;
  await drawRandomSong();
}

function revealAnswer() {
  hasRevealedAnswer.value = true;
}

onMounted(async () => {
  try {
    await loadSongPool();
    await drawRandomSong();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "初始化失败，请刷新页面重试。";
  }
});

onBeforeUnmount(() => {
  clearRequestCooldownTimer();
});
</script>

<template>
  <main class="page-shell">
    <section class="hero-panel">
      <div class="hero-topbar">
        <p class="eyebrow">The Best People in Life are Free</p>
        <a
          class="repo-link"
          href="https://github.com/dream-oyh/TS-Song"
          target="_blank"
          rel="noreferrer"
          aria-label="Open GitHub repository"
        >
          <svg
            class="repo-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.41-4.04-1.41-.55-1.37-1.34-1.73-1.34-1.73-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.22 1.84 1.22 1.07 1.81 2.8 1.29 3.49.98.11-.76.42-1.29.76-1.59-2.67-.3-5.48-1.32-5.48-5.86 0-1.29.47-2.35 1.23-3.18-.12-.3-.53-1.52.12-3.17 0 0 1.01-.32 3.3 1.21a11.5 11.5 0 0 1 6 0c2.29-1.53 3.29-1.21 3.29-1.21.66 1.65.25 2.87.13 3.17.77.83 1.23 1.89 1.23 3.18 0 4.55-2.81 5.56-5.49 5.86.43.37.81 1.09.81 2.2v3.26c0 .32.22.69.82.58A12 12 0 0 0 12 .5Z"
            />
          </svg>
        </a>
      </div>
      <div class="hero-brand">
        <img class="hero-logo" :src="siteLogoUrl" alt="TS 猜歌挑战 logo" />
        <h1>TS猜歌挑战</h1>
      </div>
      <p class="hero-copy">
        点击“重新抽取曲目”后，系统将从试听音频中随机截取一段指定长度的音频片段。
        请先收听音频，再根据内容判断对应的 Taylor Swift 曲目；如需核对结果，
        可点击“查看曲目信息”。
      </p>

      <div class="hero-actions">
        <button
          class="primary-button"
          type="button"
          @click="requestRandomSong"
          :disabled="!canRequestSong"
        >
          {{ requestButtonLabel }}
        </button>
        <button
          class="ghost-button"
          type="button"
          @click="revealAnswer"
          :disabled="!selectedSong"
        >
          查看曲目信息
        </button>
      </div>
    </section>

    <section class="settings-panel">
      <p class="card-label">筛选与配置</p>
      <div class="setting-row">
        <div class="setting-copy">
          <h2>猜歌秒数</h2>
          <p>设置每次播放时，从试听音频中随机截取的片段长度。</p>
        </div>

        <div class="stepper" aria-label="猜歌秒数设置">
          <button
            class="ghost-button stepper-button"
            type="button"
            @click="decreaseClipSeconds"
            :disabled="clipSeconds <= minClipSeconds"
          >
            -1
          </button>
          <div class="stepper-value">
            <strong>{{ clipSeconds }}</strong>
            <span>秒</span>
          </div>
          <button
            class="ghost-button stepper-button"
            type="button"
            @click="increaseClipSeconds"
            :disabled="clipSeconds >= maxClipSeconds"
          >
            +1
          </button>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <article class="clue-card">
        <p class="card-label">曲目状态</p>
        <div
          v-if="selectedTrack && selectedSong"
          :class="['clue-body', { 'clue-body--revealed': hasRevealedAnswer }]"
        >
          <img
            v-if="hasRevealedAnswer && selectedTrack.artworkUrl100"
            class="cover-art"
            :src="selectedTrack.artworkUrl100"
            :alt="selectedTrack.trackName"
          />

          <div class="answer-block">
            <template v-if="hasRevealedAnswer">
              <h2>{{ selectedTrack.trackName }}</h2>
              <p>{{ selectedTrack.artistName }}</p>
            </template>

            <template v-else>
              <h2>当前曲目信息未知</h2>
              <p>
                请先收听本轮提供的试听片段，并根据音频内容自行判断对应曲目的名称与演唱者。
                如需查看本轮答案，请点击上方“查看曲目信息”按钮。
              </p>
            </template>
          </div>
        </div>

        <p v-else-if="isLoading" class="muted-copy">正在获取可播放的试听内容，请稍候。</p>
        <p v-else class="muted-copy">请点击“重新抽取曲目”以开始本轮挑战。</p>
      </article>

      <article class="audio-card">
        <p class="card-label">试听音频</p>
        <PreviewPlayer
          ref="previewPlayerRef"
          v-if="selectedTrack?.previewUrl"
          :clip-seconds="clipSeconds"
          :revealed="hasRevealedAnswer"
          :src="selectedTrack.previewUrl"
          :title="selectedTrack.trackName"
        />
        <p v-else class="muted-copy">当前暂无可用试听音频。</p>
      </article>
    </section>

    <p v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </p>

    <footer class="page-footer">
      <span class="footer-line" aria-hidden="true"></span>
      <p class="footer-kicker">Taylor Swift Song Challenge</p>
      <p class="footer-credit">BUILD BY DREAM</p>
      <p class="footer-support">SUPPORTED BY iTunes API SERVICE</p>
    </footer>
  </main>
</template>
