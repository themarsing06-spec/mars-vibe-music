/* ============================================
   MARS VIBE — плеер и плейлист
   ============================================

   ЧТОБЫ ДОБАВИТЬ НОВЫЙ ТРЕК:
   1. Положи mp3-файл в папку /audio (имя без пробелов и эмодзи,
      например: after-midnight-night-drive.mp3)
   2. Необязательно: положи обложку в /covers (jpg/png)
   3. Добавь новый объект в массив TRACKS ниже — больше ничего
      трогать не нужно, список и плеер обновятся сами.
*/

const TRACKS = [
  {
    title: "After Midnight",
    artist: "Night Drive",
    src: "audio/after-midnight-night-drive.mp3",
    cover: "" // например: "covers/after-midnight.jpg"
  }
  // { title: "...", artist: "...", src: "audio/....mp3", cover: "" },
];

/* ---------- Состояние ---------- */
let currentIndex = -1;
let isPlaying = false;

/* ---------- DOM ---------- */
const trackListEl = document.getElementById("trackList");
const trackCountEl = document.getElementById("trackCount");
const audio = document.getElementById("audio");

const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");

const seekBar = document.getElementById("seekBar");
const timeCurrent = document.getElementById("timeCurrent");
const timeTotal = document.getElementById("timeTotal");

const volumeBar = document.getElementById("volumeBar");
const muteBtn = document.getElementById("muteBtn");
const iconVolume = document.getElementById("iconVolume");
const iconMuted = document.getElementById("iconMuted");

/* ---------- Рендер списка треков ---------- */
function renderTrackList() {
  if (TRACKS.length === 0) {
    trackListEl.innerHTML = `<p class="tracks-empty">Треков пока нет. Добавь их в массив TRACKS в script.js.</p>`;
    trackCountEl.textContent = "";
    return;
  }

  trackCountEl.textContent = `${TRACKS.length} ${pluralizeTracks(TRACKS.length)}`;

  trackListEl.innerHTML = TRACKS.map((t, i) => `
    <button class="track-row" data-index="${i}" role="listitem" aria-label="Играть ${escapeHtml(t.title)}">
      <span class="track-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="track-meta">
        <p class="track-title">${escapeHtml(t.title)}</p>
        <p class="track-artist">${escapeHtml(t.artist || "")}</p>
      </span>
      <span class="track-duration" data-duration-for="${i}">—:—</span>
      <span class="track-play-icon">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </button>
  `).join("");

  trackListEl.querySelectorAll(".track-row").forEach(row => {
    row.addEventListener("click", () => {
      const i = Number(row.dataset.index);
      if (i === currentIndex) {
        togglePlay();
      } else {
        loadTrack(i);
        playAudio();
      }
    });
  });

  // Подтягиваем длительность каждого трека заранее (не блокирует загрузку)
  TRACKS.forEach((t, i) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = t.src;
    probe.addEventListener("loadedmetadata", () => {
      const el = trackListEl.querySelector(`[data-duration-for="${i}"]`);
      if (el) el.textContent = formatTime(probe.duration);
    });
    probe.addEventListener("error", () => {
      const el = trackListEl.querySelector(`[data-duration-for="${i}"]`);
      if (el) el.textContent = "";
    });
  });
}

function pluralizeTracks(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "трек";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "трека";
  return "треков";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Загрузка и воспроизведение ---------- */
function loadTrack(index) {
  if (index < 0 || index >= TRACKS.length) return;
  currentIndex = index;
  const t = TRACKS[index];

  audio.src = t.src;
  playerTitle.textContent = t.title;
  playerArtist.textContent = t.artist || "MARS VIBE";

  if (t.cover) {
    playerCover.style.backgroundImage = `url("${t.cover}")`;
  } else {
    playerCover.style.backgroundImage = "";
  }

  updateActiveRow();
  updateMediaSession(t);
}

function updateActiveRow() {
  trackListEl.querySelectorAll(".track-row").forEach(row => {
    row.classList.toggle("is-active", Number(row.dataset.index) === currentIndex);
  });
}

function playAudio() {
  audio.play().then(() => {
    isPlaying = true;
    setPlayIcon(true);
  }).catch(() => {
    // Автовоспроизведение могло быть заблокировано браузером — это нормально
    isPlaying = false;
    setPlayIcon(false);
  });
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  setPlayIcon(false);
}

function togglePlay() {
  if (currentIndex === -1) {
    loadTrack(0);
    playAudio();
    return;
  }
  isPlaying ? pauseAudio() : playAudio();
}

function setPlayIcon(playing) {
  iconPlay.hidden = playing;
  iconPause.hidden = !playing;
  playBtn.setAttribute("aria-label", playing ? "Пауза" : "Играть");
}

function playNext() {
  if (TRACKS.length === 0) return;
  const next = (currentIndex + 1) % TRACKS.length;
  loadTrack(next);
  playAudio();
}

function playPrev() {
  if (TRACKS.length === 0) return;
  const prev = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
  loadTrack(prev);
  playAudio();
}

/* ---------- Прогресс / перемотка ---------- */
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

let isSeeking = false;

audio.addEventListener("timeupdate", () => {
  if (isSeeking) return;
  timeCurrent.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    seekBar.value = (audio.currentTime / audio.duration) * 100;
  }
});

audio.addEventListener("loadedmetadata", () => {
  timeTotal.textContent = formatTime(audio.duration);
});

audio.addEventListener("ended", playNext);

seekBar.addEventListener("input", () => { isSeeking = true; });
seekBar.addEventListener("change", () => {
  if (audio.duration) {
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  }
  isSeeking = false;
});

/* ---------- Громкость ---------- */
function setVolume(v) {
  audio.volume = v / 100;
  localStorage.setItem("marsvibe_volume", v);
  iconVolume.hidden = v == 0;
  iconMuted.hidden = v != 0;
}

volumeBar.addEventListener("input", () => setVolume(volumeBar.value));

muteBtn.addEventListener("click", () => {
  if (audio.volume > 0) {
    audio.dataset.prevVolume = volumeBar.value;
    volumeBar.value = 0;
    setVolume(0);
  } else {
    const restored = audio.dataset.prevVolume || 80;
    volumeBar.value = restored;
    setVolume(restored);
  }
});

/* ---------- Кнопки ---------- */
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

/* Пробел = play/pause, но не когда фокус в текстовом поле */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    e.preventDefault();
    togglePlay();
  }
});

/* ---------- Media Session API — управление с экрана блокировки ---------- */
function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "MARS VIBE",
    album: "MARS VIBE"
  });
  navigator.mediaSession.setActionHandler("play", playAudio);
  navigator.mediaSession.setActionHandler("pause", pauseAudio);
  navigator.mediaSession.setActionHandler("previoustrack", playPrev);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

/* ---------- Инициализация ---------- */
(function init() {
  renderTrackList();

  const savedVolume = localStorage.getItem("marsvibe_volume");
  const startVolume = savedVolume !== null ? Number(savedVolume) : 80;
  volumeBar.value = startVolume;
  setVolume(startVolume);
})();
