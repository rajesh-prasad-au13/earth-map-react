import {
  isCameraMoving,
  currentHighlightedCountry,
  showFlags,
  flagAnimationType,
} from "../constants/state.js";

// Function to hide flag when camera is moving
export function hideFlagIfMoving() {
  if (isCameraMoving) {
    const flagOverlay = document.getElementById("flag-overlay");
    if (flagOverlay) {
      flagOverlay.classList.remove("visible");
    }
  }
}

// Function to show flag when camera is stationary
export function showFlagIfStationary() {
  if (!isCameraMoving && currentHighlightedCountry && showFlags) {
    const flagOverlay = document.getElementById("flag-overlay");
    const flagImg = document.getElementById("country-flag-img");

    if (flagOverlay && flagImg) {
      // Apply the selected animation type
      flagOverlay.className = ""; // Remove all classes
      flagOverlay.classList.add(flagAnimationType);
      flagOverlay.classList.add("visible");
    }
  }
}
