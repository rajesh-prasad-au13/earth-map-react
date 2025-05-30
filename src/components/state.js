// Shared state and variables across modules
export const topCountries = [
  { name: "Madagascar", code: "MDG" },
  { name: "Botswana", code: "BWA" },
  { name: "Kenya", code: "KEN" },
  { name: "Yemen", code: "YEM" },
  { name: "Thailand", code: "THA" },
  { name: "Spain", code: "ESP" },
  { name: "Turkmenistan", code: "TKM" },
  { name: "Cameroon", code: "CMR" },
  { name: "Papua New Guinea", code: "PNG" },
  { name: "Sweden", code: "SWE" },
  { name: "Uzbekistan", code: "UZB" },
];

// Three.js objects
export let camera, scene, renderer, globe, light;
export let controls, textureLoader;

// Animation state
export let countryIndex = 0;
export let animationTimeoutId = null;
export let isAnimating = false;
export let animationSpeed = 4000;
export let currentAnimation = null;

// Camera focus timing
export let time_to_wait_for_highlighted_country = 9000; // Time in milliseconds to stay focused on highlighted country

// Display settings
export let showFlags = true;
export let showRank = true;
export let videoTitle = "Top 10 Biggest Countries in the World";
export let channelName = "Your Channel Name";

// Camera movement tracking
export let isCameraMoving = false;
export let cameraStationaryTimeout = null;

// Flag animation settings
export let flagAnimationType = "fade-in";

// Camera zoom configuration - easily configurable values
export const INITIAL_ZOOM_DISTANCE = 350; // 1. Default initial zoom distance at the start of animation
export const COUNTRY_VIEW_ZOOM_DISTANCE = 120; // 2. Zoom distance while viewing highlighted country
export const COUNTRY_TO_COUNTRY_ZOOM_DISTANCE = 220; // 3. Default zoom distance before going to next highlighted country (country to country travel)

// Border styling settings
export let defaultBorderColor = "#ffffff";
export let focusedBorderColor = "#ff4757";
export let allcountries_border_color = "#ffffff"; // Color for borders of all countries
export let glowColor = "#ffffff";
export let glowIntensity = 1.0;
export let enableGlow = true;

// Country data
export let countryPolygons = [];
export let currentHighlightedCountry = null;

// Animated border outline state
export let activeBorderOutline = null;
export let borderOutlineAnimationDuration = 6000; // Duration in milliseconds (made slower)
export let borderThickness = 0.03; // Thickness of the animated border outline
export let borderLinesCount = 25; // Number of lines to create thick border effect

// Border animation trigger state
export let shouldTriggerBorderAnimation = false;
export let borderAnimationTriggered = false;

// Previous positions for smooth transitions
export let previousCountryCenter = null;
export let previousCameraPosition = null;

// Recording variables
export let mediaRecorder = null;
export let recordedChunks = [];
export let isRecording = false;
export let originalRendererSize = { width: 0, height: 0 };
export let recordingStartTime = 0;
export let recordingDuration = 0;

// Setters for variables that need to be updated from other modules
export function setCamera(newCamera) {
  camera = newCamera;
}
export function setScene(newScene) {
  scene = newScene;
}
export function setRenderer(newRenderer) {
  renderer = newRenderer;
}
export function setGlobe(newGlobe) {
  globe = newGlobe;
}
export function setLight(newLight) {
  light = newLight;
}
export function setControls(newControls) {
  controls = newControls;
}
export function setTextureLoader(newLoader) {
  textureLoader = newLoader;
}

export function setCountryIndex(index) {
  countryIndex = index;
}
export function setAnimationTimeoutId(id) {
  animationTimeoutId = id;
}
export function setIsAnimating(value) {
  isAnimating = value;
}
export function setAnimationSpeed(speed) {
  animationSpeed = speed;
}
export function setCurrentAnimation(animation) {
  currentAnimation = animation;
}
export function setTimeToWaitForHighlightedCountry(time) {
  time_to_wait_for_highlighted_country = time;
}

export function setVideoTitle(title) {
  videoTitle = title;
}
export function setChannelName(name) {
  channelName = name;
}
export function setShowFlags(value) {
  showFlags = value;
}
export function setShowRank(value) {
  showRank = value;
}
export function setFlagAnimationType(type) {
  flagAnimationType = type;
}

export function setDefaultBorderColor(color) {
  defaultBorderColor = color;
}
export function setFocusedBorderColor(color) {
  focusedBorderColor = color;
}
export function setAllCountriesBorderColor(color) {
  allcountries_border_color = color;
}
export function setGlowColor(color) {
  glowColor = color;
}
export function setGlowIntensity(intensity) {
  glowIntensity = intensity;
}
export function setEnableGlow(value) {
  enableGlow = value;
}

export function setIsCameraMoving(value) {
  isCameraMoving = value;
}
export function setCameraStationaryTimeout(timeout) {
  cameraStationaryTimeout = timeout;
}

export function setCountryPolygons(polygons) {
  countryPolygons = polygons;
}
export function setCurrentHighlightedCountry(country) {
  currentHighlightedCountry = country;
}

export function setPreviousCountryCenter(center) {
  previousCountryCenter = center;
}
export function setPreviouseCameraPosition(position) {
  previousCameraPosition = position;
}

export function setMediaRecorder(recorder) {
  mediaRecorder = recorder;
}
export function setRecordedChunks(chunks) {
  recordedChunks = chunks;
}
export function setIsRecording(value) {
  isRecording = value;
}
export function setOriginalRendererSize(size) {
  originalRendererSize = size;
}
export function setRecordingStartTime(time) {
  recordingStartTime = time;
}
export function setRecordingDuration(duration) {
  recordingDuration = duration;
}

// Setters for animated border outline
export function setActiveBorderOutline(outline) {
  activeBorderOutline = outline;
}

export function setBorderOutlineAnimationDuration(duration) {
  borderOutlineAnimationDuration = duration;
}
export function setBorderThickness(thickness) {
  borderThickness = thickness;
}
export function setBorderLinesCount(count) {
  borderLinesCount = count;
}

// Setters for border animation trigger state
export function setShouldTriggerBorderAnimation(value) {
  shouldTriggerBorderAnimation = value;
}
export function setBorderAnimationTriggered(value) {
  borderAnimationTriggered = value;
}

// Getters for recording state
export function getRenderer() {
  return renderer;
}
export function getCamera() {
  return camera;
}
export function getMediaRecorder() {
  return mediaRecorder;
}
export function getRecordedChunks() {
  return recordedChunks;
}
export function getIsRecording() {
  return isRecording;
}
export function getOriginalRendererSize() {
  return originalRendererSize;
}
export function getRecordingStartTime() {
  return recordingStartTime;
}
export function getRecordingDuration() {
  return recordingDuration;
}

// Initialize centroid markers array
if (typeof window !== "undefined") {
  window.centroidMarkers = [];
}
