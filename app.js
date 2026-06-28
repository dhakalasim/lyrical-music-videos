const audioInput = document.getElementById('audioInput');
const imageInput = document.getElementById('imageInput');
const audioPreview = document.getElementById('audioPreview');
const audioMeta = document.getElementById('audioMeta');
const dropZone = document.getElementById('dropZone');
const slidesList = document.getElementById('slidesList');
const addSlideBtn = document.getElementById('addSlideBtn');
const startPreviewBtn = document.getElementById('startPreviewBtn');
const stopPreviewBtn = document.getElementById('stopPreviewBtn');
const currentImage = document.getElementById('currentImage');
const currentCaption = document.getElementById('currentCaption');
const previewTime = document.getElementById('previewTime');
const previewStatus = document.getElementById('previewStatus');
const exportBtn = document.getElementById('exportBtn');

const state = {
  audioFile: null,
  slides: [],
  activeSlideIndex: 0,
  preview: {
    running: false,
    intervalId: null,
  },
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateAudioMeta() {
  if (!state.audioFile) {
    audioMeta.textContent = 'No audio selected yet.';
    return;
  }
  const duration = audioPreview.duration;
  const durationText = Number.isFinite(duration) ? formatTime(duration) : 'loading...';
  audioMeta.textContent = `Audio: ${state.audioFile.name} • Duration: ${durationText}`;
}

function renderSlides() {
  slidesList.innerHTML = '';

  state.slides.forEach((slide, index) => {
    const slideCard = document.createElement('div');
    slideCard.className = 'slide-card';

    slideCard.innerHTML = `
      <label>
        <span>Image ${index + 1}</span>
        <input type="text" class="caption-input" value="${slide.caption}" placeholder="Enter lyrics or caption" data-index="${index}" />
      </label>
      <label>
        <span>Duration (seconds)</span>
        <input type="number" min="1" value="${slide.duration}" class="duration-input" data-index="${index}" />
      </label>
      <div class="slide-controls">
        <button class="secondary-btn select-slide-btn" data-index="${index}">Show Slide</button>
        <button class="secondary-btn remove-slide-btn" data-index="${index}">Remove</button>
      </div>
    `;

    slidesList.appendChild(slideCard);
  });
}

function updateCurrentPreview() {
  if (!state.slides.length) {
    currentImage.src = '';
    currentCaption.textContent = 'No slide selected';
    return;
  }

  const slide = state.slides[state.activeSlideIndex];
  currentImage.src = slide.previewUrl;
  currentCaption.textContent = slide.caption || `Slide ${state.activeSlideIndex + 1}`;
}

function setActiveSlide(index) {
  state.activeSlideIndex = Math.max(0, Math.min(index, state.slides.length - 1));
  updateCurrentPreview();
}

function syncPreviewWithAudio() {
  const currentTime = audioPreview.currentTime;
  previewTime.textContent = formatTime(currentTime);
  const totalDuration = state.slides.reduce((sum, slide) => sum + slide.duration, 0);
  if (!totalDuration) return;

  let runningTime = 0;
  for (let i = 0; i < state.slides.length; i += 1) {
    runningTime += state.slides[i].duration;
    if (currentTime <= runningTime) {
      if (i !== state.activeSlideIndex) {
        state.activeSlideIndex = i;
        updateCurrentPreview();
      }
      break;
    }
  }
}

function stopPreview() {
  if (!state.preview.running) return;
  state.preview.running = false;
  clearInterval(state.preview.intervalId);
  state.preview.intervalId = null;
  audioPreview.pause();
  previewStatus.textContent = 'Preview stopped';
}

function startPreview() {
  if (!state.audioFile || !state.slides.length) {
    previewStatus.textContent = 'Upload audio and at least one image first.';
    return;
  }

  state.preview.running = true;
  previewStatus.textContent = 'Preview running';
  state.activeSlideIndex = 0;
  updateCurrentPreview();

  audioPreview.currentTime = 0;
  audioPreview.play().catch(() => {
    previewStatus.textContent = 'Audio playback blocked. Tap play on the audio control.';
  });

  state.preview.intervalId = setInterval(() => {
    syncPreviewWithAudio();
    if (audioPreview.paused && !audioPreview.seeking && audioPreview.currentTime > 0) {
      stopPreview();
    }
  }, 200);
}

function addSlide(file) {
  const reader = new FileReader();
  reader.onload = () => {
    state.slides.push({
      file,
      previewUrl: reader.result,
      caption: '',
      duration: 5,
    });
    renderSlides();
    setActiveSlide(state.slides.length - 1);
  };
  reader.readAsDataURL(file);
}

function handleSlideInputs(event) {
  const target = event.target;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || index < 0 || index >= state.slides.length) return;

  if (target.classList.contains('caption-input')) {
    state.slides[index].caption = target.value;
    if (index === state.activeSlideIndex) updateCurrentPreview();
    return;
  }

  if (target.classList.contains('duration-input')) {
    const value = Number(target.value) || 1;
    state.slides[index].duration = Math.max(1, value);
    return;
  }

  if (target.classList.contains('remove-slide-btn')) {
    state.slides.splice(index, 1);
    if (state.activeSlideIndex >= state.slides.length) {
      state.activeSlideIndex = Math.max(0, state.slides.length - 1);
    }
    renderSlides();
    updateCurrentPreview();
    return;
  }

  if (target.classList.contains('select-slide-btn')) {
    setActiveSlide(index);
    return;
  }
}

audioInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  state.audioFile = file;
  audioPreview.src = URL.createObjectURL(file);
  audioPreview.load();
  updateAudioMeta();
});

audioPreview.addEventListener('loadedmetadata', updateAudioMeta);

audioPreview.addEventListener('ended', () => {
  stopPreview();
});

imageInput.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  files.forEach(addSlide);
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-active');
  const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
  files.forEach(addSlide);
});

slidesList.addEventListener('click', handleSlideInputs);
slidesList.addEventListener('input', handleSlideInputs);

addSlideBtn.addEventListener('click', () => {
  state.slides.push({
    file: null,
    previewUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%23333d58%22/%3E%3Ctext x=%2260%22 y=%2268%22 fill=%22%23cbd5e1%22 font-family=%22Inter%22 font-size=%2210%22 text-anchor=%22middle%22%3EAdd Image%3C/text%3E%3C/svg%3E',
    caption: 'New slide caption',
    duration: 5,
  });
  renderSlides();
  setActiveSlide(state.slides.length - 1);
});

startPreviewBtn.addEventListener('click', startPreview);
stopPreviewBtn.addEventListener('click', stopPreview);

exportBtn.addEventListener('click', () => {
  const payload = {
    audioFileName: state.audioFile?.name || null,
    slides: state.slides.map(({ caption, duration }) => ({ caption, duration })),
    timestamp: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'lyric-video-project.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

// Initialize default state
renderSlides();
updateCurrentPreview();
