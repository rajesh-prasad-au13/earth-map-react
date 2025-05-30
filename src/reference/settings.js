import {
  isAnimating,
  setIsAnimating,
  currentAnimation,
  setCurrentAnimation,
  animationTimeoutId,
  setAnimationTimeoutId,
  animationSpeed,
  setAnimationSpeed,
  videoTitle,
  setVideoTitle,
  channelName,
  setChannelName,
  showFlags,
  setShowFlags,
  showRank,
  setShowRank,
  flagAnimationType,
  setFlagAnimationType,
  defaultBorderColor,
  setDefaultBorderColor,
  focusedBorderColor,
  setFocusedBorderColor,
  glowColor,
  setGlowColor,
  glowIntensity,
  setGlowIntensity,
  enableGlow,
  setEnableGlow,
  currentHighlightedCountry,
  isCameraMoving,
  isRecording,
} from "../constants/state.js";
import { animateToCountry, startIntroAnimation } from "../main.js";
import { updateCountryStyles } from "./countries.js";
import { startRecording, stopRecording } from "./recording.js";

// Setup UI event handlers
export function setupUIHandlers() {
  // Start visualization button
  const startBtn = document.getElementById("start-visualization");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const titleScreen = document.getElementById("youtube-title-screen");
      titleScreen.classList.add("fade-out");
      setTimeout(() => {
        titleScreen.style.display = "none";
        setIsAnimating(true);
        startIntroAnimation();
      }, 1000);
    });
  }

  // Settings toggle
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsPanel = document.getElementById("settings-panel");
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener("click", () => {
      settingsPanel.classList.toggle("visible");
    });
  }

  // Apply settings button
  const applySettingsBtn = document.getElementById("apply-settings");
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener("click", applySettings);
  }

  // Reset settings button
  const resetSettingsBtn = document.getElementById("reset-settings");
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", resetSettings);
  }

  // Glow intensity slider real-time update
  const glowIntensityInput = document.getElementById("glow-intensity");
  if (glowIntensityInput) {
    glowIntensityInput.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      const glowValueSpan = document.getElementById("glow-intensity-value");
      if (glowValueSpan) {
        glowValueSpan.textContent = value.toFixed(1);
      }
    });
  }

  // Stop/Start button
  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      setIsAnimating(!isAnimating);
      stopBtn.textContent = isAnimating ? "Stop Animation" : "Start Animation";

      if (isAnimating) {
        animateToCountry();
      } else {
        if (currentAnimation) {
          currentAnimation.stop();
        }
        if (animationTimeoutId) {
          clearTimeout(animationTimeoutId);
          setAnimationTimeoutId(null);
        }
      }
    });
  }

  // Download/Recording button functionality
  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }
}

// Apply user settings
export function applySettings() {
  const videoTitleInput = document.getElementById("video-title");
  const channelNameInput = document.getElementById("channel-name");
  const animationSpeedSelect = document.getElementById("animation-speed");
  const showFlagsCheckbox = document.getElementById("show-flags");
  const showRankCheckbox = document.getElementById("show-rank");
  const flagAnimationSelect = document.getElementById("flag-animation");
  const defaultBorderColorInput = document.getElementById(
    "default-border-color"
  );
  const focusedBorderColorInput = document.getElementById(
    "focused-border-color"
  );
  const glowColorInput = document.getElementById("glow-color");
  const glowIntensityInput = document.getElementById("glow-intensity");
  const enableGlowCheckbox = document.getElementById("enable-glow");

  if (videoTitleInput) setVideoTitle(videoTitleInput.value);
  if (channelNameInput) setChannelName(channelNameInput.value);
  if (showFlagsCheckbox) setShowFlags(showFlagsCheckbox.checked);
  if (showRankCheckbox) setShowRank(showRankCheckbox.checked);

  if (animationSpeedSelect) {
    const speed = animationSpeedSelect.value;
    switch (speed) {
      case "slow":
        setAnimationSpeed(5000);
        break;
      case "normal":
        setAnimationSpeed(3000);
        break;
      case "fast":
        setAnimationSpeed(2000);
        break;
    }
  }

  // Flag animation settings
  if (flagAnimationSelect) setFlagAnimationType(flagAnimationSelect.value);

  // Border styling settings
  if (defaultBorderColorInput)
    setDefaultBorderColor(defaultBorderColorInput.value);
  if (focusedBorderColorInput)
    setFocusedBorderColor(focusedBorderColorInput.value);
  if (glowColorInput) setGlowColor(glowColorInput.value);
  if (glowIntensityInput) {
    setGlowIntensity(parseFloat(glowIntensityInput.value));
    const glowValueSpan = document.getElementById("glow-intensity-value");
    if (glowValueSpan) glowValueSpan.textContent = glowIntensity.toFixed(1);
  }
  if (enableGlowCheckbox) setEnableGlow(enableGlowCheckbox.checked);

  // Update title if needed
  document.title = videoTitle;

  // Show/hide rank display
  const rankDisplay = document.getElementById("country-rank");
  if (rankDisplay) {
    rankDisplay.style.display = showRank ? "block" : "none";
  }

  // Update the flag overlay with the selected animation class
  const flagOverlay = document.getElementById("flag-overlay");
  if (flagOverlay && currentHighlightedCountry) {
    flagOverlay.className = ""; // Remove all classes
    flagOverlay.classList.add(flagAnimationType);
    if (!isCameraMoving && showFlags) {
      flagOverlay.classList.add("visible");
    }
  }

  // Apply border changes to globe visualization
  updateCountryStyles();

  alert("Settings applied successfully!");
}

// Reset settings to default
export function resetSettings() {
  document.getElementById("video-title").value =
    "Top 10 Biggest Countries in the World";
  document.getElementById("channel-name").value = "Your Channel Name";
  document.getElementById("animation-speed").value = "normal";
  document.getElementById("show-flags").checked = true;
  document.getElementById("show-rank").checked = true;
  document.getElementById("flag-animation").value = "fade-in";
  document.getElementById("default-border-color").value = "#ffffff";
  document.getElementById("focused-border-color").value = "#ff4757";
  document.getElementById("glow-color").value = "#ffffff";
  document.getElementById("glow-intensity").value = "1.0";
  const glowValueSpan = document.getElementById("glow-intensity-value");
  if (glowValueSpan) glowValueSpan.textContent = "1.0";
  document.getElementById("enable-glow").checked = true;

  // Reset the variables to default values
  setFlagAnimationType("fade-in");
  setDefaultBorderColor("#ffffff");
  setFocusedBorderColor("#ff4757");
  setGlowColor("#ffffff");
  setGlowIntensity(1.0);
  setEnableGlow(true);
  setShowFlags(true);
  setShowRank(true);
  setAnimationSpeed(3000);

  applySettings();
}
