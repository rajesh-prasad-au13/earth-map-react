import {
  getRenderer,
  getCamera,
  getIsRecording,
  setIsRecording,
  getRecordingStartTime,
  setRecordingStartTime,
  getRecordingDuration,
  setRecordingDuration,
  getMediaRecorder,
  setMediaRecorder,
  getRecordedChunks,
  setRecordedChunks,
  getOriginalRendererSize,
  setOriginalRendererSize,
} from "../constants/state.js";

// Get optimal bitrate based on resolution
function getBitrate(resolution) {
  const bitrateMap = {
    "720p": 5000000, // 5 Mbps
    "1080p": 8000000, // 8 Mbps
    "4k": 25000000, // 25 Mbps
  };
  return bitrateMap[resolution] || 8000000;
}

export function startRecording() {
  const resolutionSelect = document.getElementById("resolution-select");
  const framerateSelect = document.getElementById("framerate-select");
  const durationSelect = document.getElementById("duration-select");

  // Resolution configurations
  const resolutionConfigs = {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "4k": { width: 3840, height: 2160 },
  };
  const resolution = resolutionSelect.value;
  const framerate = parseInt(framerateSelect.value);
  const duration = parseInt(durationSelect.value) * 1000; // Convert to milliseconds

  const config = resolutionConfigs[resolution];

  const renderer = getRenderer();
  const camera = getCamera();

  // Store original renderer size
  setOriginalRendererSize({
    width: renderer.domElement.width,
    height: renderer.domElement.height,
  });

  // Set new resolution
  renderer.setSize(config.width, config.height);
  camera.aspect = config.width / config.height;
  camera.updateProjectionMatrix();

  // Prepare canvas for recording
  const canvas = renderer.domElement;
  const stream = canvas.captureStream(framerate);

  // Configure MediaRecorder
  const options = {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: getBitrate(resolution),
  };

  // Fallback for browsers that don't support VP9
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = "video/webm;codecs=vp8";
  }

  setRecordedChunks([]);
  const mediaRecorder = new MediaRecorder(stream, options);
  setMediaRecorder(mediaRecorder);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      const chunks = getRecordedChunks();
      chunks.push(event.data);
      setRecordedChunks(chunks);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(getRecordedChunks(), { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `earth-animation-${resolution}-${framerate}fps-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
    resetRecordingUI();
  };

  // Start recording
  setIsRecording(true);
  setRecordingStartTime(Date.now());
  setRecordingDuration(duration);

  mediaRecorder.start();
  updateRecordingUI();

  // Update progress
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - getRecordingStartTime();
    const progress = Math.min((elapsed / duration) * 100, 100);

    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    progressFill.style.width = progress + "%";
    progressText.textContent = Math.round(progress) + "%";

    if (elapsed >= duration) {
      clearInterval(progressInterval);
      stopRecording();
    }
  }, 100);

  // Auto-stop after duration
  setTimeout(() => {
    if (getIsRecording()) {
      stopRecording();
    }
  }, duration);
}

export function stopRecording() {
  const mediaRecorder = getMediaRecorder();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  setIsRecording(false);

  const renderer = getRenderer();
  const camera = getCamera();
  const originalRendererSize = getOriginalRendererSize();

  // Restore original renderer size
  renderer.setSize(originalRendererSize.width, originalRendererSize.height);
  camera.aspect = originalRendererSize.width / originalRendererSize.height;
  camera.updateProjectionMatrix();
}

export function updateRecordingUI() {
  const downloadBtn = document.getElementById("download-btn");
  const downloadProgress = document.getElementById("download-progress");
  const resolutionSelect = document.getElementById("resolution-select");
  const framerateSelect = document.getElementById("framerate-select");
  const durationSelect = document.getElementById("duration-select");

  downloadBtn.textContent = "Stop Recording";
  downloadBtn.style.backgroundColor = "#d73a49";
  downloadProgress.style.display = "block";

  // Disable controls during recording
  resolutionSelect.disabled = true;
  framerateSelect.disabled = true;
  durationSelect.disabled = true;
}

export function resetRecordingUI() {
  const downloadBtn = document.getElementById("download-btn");
  const downloadProgress = document.getElementById("download-progress");
  const resolutionSelect = document.getElementById("resolution-select");
  const framerateSelect = document.getElementById("framerate-select");
  const durationSelect = document.getElementById("duration-select");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  downloadBtn.textContent = "Start Recording";
  downloadBtn.style.backgroundColor = "#0078d7";
  downloadProgress.style.display = "none";

  // Re-enable controls
  resolutionSelect.disabled = false;
  framerateSelect.disabled = false;
  durationSelect.disabled = false;

  // Reset progress
  progressFill.style.width = "0%";
  progressText.textContent = "0%";
}
