<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  clipSeconds: number;
  revealed: boolean;
  src: string;
  title: string;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
let clipStartTime: number | null = null;
let segmentEndTime = 0;
let segmentTimer: number | null = null;

const buttonLabel = computed(() => (isPlaying.value ? "暂停播放" : "开始播放"));

function clearSegmentTimer() {
  if (segmentTimer === null) {
    return;
  }

  window.clearTimeout(segmentTimer);
  segmentTimer = null;
}

function resetPlaybackState() {
  clearSegmentTimer();
  segmentEndTime = 0;
  isPlaying.value = false;
}

function resetClipSelection() {
  clipStartTime = null;
}

function ensureMetadataLoaded(audio: HTMLAudioElement): Promise<void> {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const handleLoadedMetadata = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("试听音频加载失败，请稍后重试。"));
    };

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    audio.load();
  });
}

function scheduleSegmentStop(audio: HTMLAudioElement) {
  clearSegmentTimer();

  const remainingMs = Math.max((segmentEndTime - audio.currentTime) * 1000, 0);
  segmentTimer = window.setTimeout(() => {
    audio.pause();
    resetPlaybackState();
  }, remainingMs);
}

async function startSelectedClip() {
  if (!audioRef.value) {
    return;
  }

  const audio = audioRef.value;
  await ensureMetadataLoaded(audio);

  const maxClipLength = Math.max(Math.floor(audio.duration), 1);
  const clipLength = Math.min(props.clipSeconds, maxClipLength);
  if (clipStartTime === null) {
    const maxStartTime = Math.max(audio.duration - clipLength, 0);
    clipStartTime = maxStartTime > 0 ? Math.random() * maxStartTime : 0;
  }

  audio.currentTime = clipStartTime;
  segmentEndTime = clipStartTime + clipLength;
  await audio.play();
  scheduleSegmentStop(audio);
}

async function startFullPreview() {
  if (!audioRef.value) {
    return;
  }

  const audio = audioRef.value;
  await ensureMetadataLoaded(audio);
  clearSegmentTimer();
  segmentEndTime = 0;
  audio.currentTime = 0;
  await audio.play();
}

async function togglePlayback() {
  if (!audioRef.value) {
    return;
  }

  const audio = audioRef.value;

  if (isPlaying.value) {
    audio.pause();
    clearSegmentTimer();
    return;
  }

  if (props.revealed) {
    await startFullPreview();
    return;
  }

  await startSelectedClip();
}

async function playFromCurrentMode() {
  if (isPlaying.value) {
    return;
  }

  await togglePlayback();
}

watch(
  () => [props.src, props.clipSeconds],
  () => {
    if (!audioRef.value) {
      return;
    }

    audioRef.value.pause();
    audioRef.value.load();
    resetClipSelection();
    resetPlaybackState();
  }
);

watch(
  () => props.revealed,
  (revealed) => {
    if (!revealed || !audioRef.value) {
      return;
    }

    audioRef.value.pause();
    audioRef.value.currentTime = 0;
    resetPlaybackState();
  }
);

onBeforeUnmount(() => {
  clearSegmentTimer();
  audioRef.value?.pause();
});

defineExpose({
  playFromCurrentMode
});
</script>

<template>
  <div v-if="props.revealed" class="player-meta">
    <p class="player-label">30 秒试听片段</p>
    <h3>{{ title }}</h3>
  </div>

  <button class="secondary-button player-button" type="button" @click="togglePlayback">
    {{ buttonLabel }}
  </button>
  <audio
    ref="audioRef"
    preload="none"
    class="hidden-audio"
    :src="src"
    @play="isPlaying = true"
    @pause="isPlaying = false"
    @ended="resetPlaybackState"
  />
</template>
