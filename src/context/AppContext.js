import React, { createContext, useContext, useReducer } from "react";

// Initial state
const initialState = {
  // Camera settings
  camera: {
    position: { x: 0, y: 0, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    zoom: 1,
    autoRotate: true,
    rotationSpeed: 0.01,
    previousCameraPosition: null, // For tracking camera movements between countries
    previousCountryCenter: null, // For tracking previous target positions
  },

  // Earth settings
  earth: {
    visible: true,
    wireframe: false,
    rotation: { x: 0, y: 0, z: 0 },
    texture: "day", // 'day', 'night', 'bump', 'clouds'
  },

  // Countries
  countries: {
    selected: null,
    hovered: null,
    visible: true,
    showBorders: true,
    highlightColor: "#ff6b6b",
    showFlags: true,
    enableGlow: true,
    glowIntensity: 1.0,
    glowColor: "#ff6b6b",
  },

  // UI state
  ui: {
    showControls: true,
    showCountryInfo: false,
    showSettings: false,
    isRecording: false,
    theme: "dark",
  },

  // Animation
  animation: {
    isPlaying: false,
    speed: 4000, // 4 seconds per country (from original)
    time: 0,
    currentCountryIndex: 0,
    isAutoAnimating: false,
    timeToWaitForHighlightedCountry: 6000, // 6 seconds total per country (reduced from 9s)
  },

  // Recording settings
  recording: {
    resolution: "1080p",
    framerate: 30,
    duration: 60, // in seconds
    format: "webm",
    quality: "high",
  },

  // Zoom distance constants (from original implementation)
  INITIAL_ZOOM_DISTANCE: 350,
  COUNTRY_VIEW_ZOOM_DISTANCE: 110,
  COUNTRY_TO_COUNTRY_ZOOM_DISTANCE: 220,
};

// Action types
export const actionTypes = {
  // Camera actions
  SET_CAMERA_POSITION: "SET_CAMERA_POSITION",
  SET_CAMERA_ROTATION: "SET_CAMERA_ROTATION",
  SET_CAMERA_ZOOM: "SET_CAMERA_ZOOM",
  TOGGLE_AUTO_ROTATE: "TOGGLE_AUTO_ROTATE",
  SET_ROTATION_SPEED: "SET_ROTATION_SPEED",
  SET_PREVIOUS_CAMERA_POSITION: "SET_PREVIOUS_CAMERA_POSITION",
  SET_PREVIOUS_COUNTRY_CENTER: "SET_PREVIOUS_COUNTRY_CENTER",

  // Earth actions
  TOGGLE_EARTH_VISIBILITY: "TOGGLE_EARTH_VISIBILITY",
  TOGGLE_WIREFRAME: "TOGGLE_WIREFRAME",
  SET_EARTH_ROTATION: "SET_EARTH_ROTATION",
  SET_EARTH_TEXTURE: "SET_EARTH_TEXTURE",

  // Country actions
  SELECT_COUNTRY: "SELECT_COUNTRY",
  HOVER_COUNTRY: "HOVER_COUNTRY",
  TOGGLE_COUNTRIES_VISIBILITY: "TOGGLE_COUNTRIES_VISIBILITY",
  TOGGLE_BORDERS: "TOGGLE_BORDERS",
  SET_HIGHLIGHT_COLOR: "SET_HIGHLIGHT_COLOR",
  TOGGLE_FLAGS: "TOGGLE_FLAGS",
  TOGGLE_GLOW_EFFECT: "TOGGLE_GLOW_EFFECT",
  SET_GLOW_INTENSITY: "SET_GLOW_INTENSITY",
  SET_GLOW_COLOR: "SET_GLOW_COLOR",

  // UI actions
  TOGGLE_CONTROLS: "TOGGLE_CONTROLS",
  TOGGLE_COUNTRY_INFO: "TOGGLE_COUNTRY_INFO",
  TOGGLE_SETTINGS: "TOGGLE_SETTINGS",
  TOGGLE_RECORDING: "TOGGLE_RECORDING",
  SET_THEME: "SET_THEME",

  // Animation actions
  TOGGLE_ANIMATION: "TOGGLE_ANIMATION",
  SET_ANIMATION_SPEED: "SET_ANIMATION_SPEED",
  UPDATE_TIME: "UPDATE_TIME",
  START_AUTO_ANIMATION: "START_AUTO_ANIMATION",
  STOP_AUTO_ANIMATION: "STOP_AUTO_ANIMATION",
  SET_CURRENT_COUNTRY_INDEX: "SET_CURRENT_COUNTRY_INDEX",
  NEXT_COUNTRY: "NEXT_COUNTRY",

  // Recording actions
  SET_RESOLUTION: "SET_RESOLUTION",
  SET_FRAMERATE: "SET_FRAMERATE",
  SET_RECORDING_DURATION: "SET_RECORDING_DURATION",
  SET_RECORDING_FORMAT: "SET_RECORDING_FORMAT",
  SET_RECORDING_QUALITY: "SET_RECORDING_QUALITY",
  START_RECORDING: "START_RECORDING",
  STOP_RECORDING: "STOP_RECORDING",
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    // Camera actions
    case actionTypes.SET_CAMERA_POSITION:
      return {
        ...state,
        camera: { ...state.camera, position: action.payload },
      };

    case actionTypes.SET_CAMERA_ROTATION:
      return {
        ...state,
        camera: { ...state.camera, rotation: action.payload },
      };

    case actionTypes.SET_CAMERA_ZOOM:
      return {
        ...state,
        camera: { ...state.camera, zoom: action.payload },
      };

    case actionTypes.TOGGLE_AUTO_ROTATE:
      return {
        ...state,
        camera: { ...state.camera, autoRotate: !state.camera.autoRotate },
      };

    case actionTypes.SET_ROTATION_SPEED:
      return {
        ...state,
        camera: { ...state.camera, rotationSpeed: action.payload },
      };

    case actionTypes.SET_PREVIOUS_CAMERA_POSITION:
      return {
        ...state,
        camera: { ...state.camera, previousCameraPosition: action.payload },
      };

    case actionTypes.SET_PREVIOUS_COUNTRY_CENTER:
      return {
        ...state,
        camera: { ...state.camera, previousCountryCenter: action.payload },
      };

    // Earth actions
    case actionTypes.TOGGLE_EARTH_VISIBILITY:
      return {
        ...state,
        earth: { ...state.earth, visible: !state.earth.visible },
      };

    case actionTypes.TOGGLE_WIREFRAME:
      return {
        ...state,
        earth: { ...state.earth, wireframe: !state.earth.wireframe },
      };

    case actionTypes.SET_EARTH_ROTATION:
      return {
        ...state,
        earth: { ...state.earth, rotation: action.payload },
      };

    case actionTypes.SET_EARTH_TEXTURE:
      return {
        ...state,
        earth: { ...state.earth, texture: action.payload },
      };

    // Country actions
    case actionTypes.SELECT_COUNTRY:
      return {
        ...state,
        countries: { ...state.countries, selected: action.payload },
      };

    case actionTypes.HOVER_COUNTRY:
      return {
        ...state,
        countries: { ...state.countries, hovered: action.payload },
      };

    case actionTypes.TOGGLE_COUNTRIES_VISIBILITY:
      return {
        ...state,
        countries: {
          ...state.countries,
          visible: !state.countries.visible,
        },
      };

    case actionTypes.TOGGLE_BORDERS:
      return {
        ...state,
        countries: {
          ...state.countries,
          showBorders: !state.countries.showBorders,
        },
      };

    case actionTypes.SET_HIGHLIGHT_COLOR:
      return {
        ...state,
        countries: { ...state.countries, highlightColor: action.payload },
      };

    case actionTypes.TOGGLE_FLAGS:
      return {
        ...state,
        countries: {
          ...state.countries,
          showFlags: !state.countries.showFlags,
        },
      };

    case actionTypes.TOGGLE_GLOW_EFFECT:
      return {
        ...state,
        countries: {
          ...state.countries,
          enableGlow: !state.countries.enableGlow,
        },
      };

    case actionTypes.SET_GLOW_INTENSITY:
      return {
        ...state,
        countries: { ...state.countries, glowIntensity: action.payload },
      };

    case actionTypes.SET_GLOW_COLOR:
      return {
        ...state,
        countries: { ...state.countries, glowColor: action.payload },
      };

    // UI actions
    case actionTypes.TOGGLE_CONTROLS:
      return {
        ...state,
        ui: {
          ...state.ui,
          showControls: !state.ui.showControls,
        },
      };

    case actionTypes.TOGGLE_COUNTRY_INFO:
      return {
        ...state,
        ui: {
          ...state.ui,
          showCountryInfo: !state.ui.showCountryInfo,
        },
      };

    case actionTypes.TOGGLE_SETTINGS:
      return {
        ...state,
        ui: {
          ...state.ui,
          showSettings: !state.ui.showSettings,
        },
      };

    case actionTypes.TOGGLE_RECORDING:
      return {
        ...state,
        ui: {
          ...state.ui,
          isRecording: !state.ui.isRecording,
        },
      };

    case actionTypes.SET_THEME:
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload },
      };

    // Animation actions
    case actionTypes.TOGGLE_ANIMATION:
      return {
        ...state,
        animation: {
          ...state.animation,
          isPlaying: !state.animation.isPlaying,
        },
      };

    case actionTypes.SET_ANIMATION_SPEED:
      return {
        ...state,
        animation: { ...state.animation, speed: action.payload },
      };

    case actionTypes.UPDATE_TIME:
      return {
        ...state,
        animation: { ...state.animation, time: action.payload },
      };

    case actionTypes.START_AUTO_ANIMATION:
      return {
        ...state,
        animation: {
          ...state.animation,
          isAutoAnimating: true,
          currentCountryIndex: 0,
        },
      };

    case actionTypes.STOP_AUTO_ANIMATION:
      return {
        ...state,
        animation: {
          ...state.animation,
          isAutoAnimating: false,
        },
      };

    case actionTypes.SET_CURRENT_COUNTRY_INDEX:
      return {
        ...state,
        animation: {
          ...state.animation,
          currentCountryIndex: action.payload,
        },
      };

    case actionTypes.NEXT_COUNTRY:
      return {
        ...state,
        animation: {
          ...state.animation,
          currentCountryIndex: state.animation.currentCountryIndex + 1,
        },
      };

    // Recording actions
    case actionTypes.SET_RESOLUTION:
      return {
        ...state,
        recording: { ...state.recording, resolution: action.payload },
      };

    case actionTypes.SET_FRAMERATE:
      return {
        ...state,
        recording: { ...state.recording, framerate: action.payload },
      };

    case actionTypes.SET_RECORDING_DURATION:
      return {
        ...state,
        recording: { ...state.recording, duration: action.payload },
      };

    case actionTypes.SET_RECORDING_FORMAT:
      return {
        ...state,
        recording: { ...state.recording, format: action.payload },
      };

    case actionTypes.SET_RECORDING_QUALITY:
      return {
        ...state,
        recording: { ...state.recording, quality: action.payload },
      };

    case actionTypes.START_RECORDING:
      return {
        ...state,
        ui: { ...state.ui, isRecording: true },
      };

    case actionTypes.STOP_RECORDING:
      return {
        ...state,
        ui: { ...state.ui, isRecording: false },
      };

    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// Action creators
export const actions = {
  // Camera actions
  setCameraPosition: (position) => ({
    type: actionTypes.SET_CAMERA_POSITION,
    payload: position,
  }),

  setCameraRotation: (rotation) => ({
    type: actionTypes.SET_CAMERA_ROTATION,
    payload: rotation,
  }),

  setCameraZoom: (zoom) => ({
    type: actionTypes.SET_CAMERA_ZOOM,
    payload: zoom,
  }),

  toggleAutoRotate: () => ({
    type: actionTypes.TOGGLE_AUTO_ROTATE,
  }),

  setRotationSpeed: (speed) => ({
    type: actionTypes.SET_ROTATION_SPEED,
    payload: speed,
  }),

  setPreviousCameraPosition: (position) => ({
    type: actionTypes.SET_PREVIOUS_CAMERA_POSITION,
    payload: position,
  }),

  setPreviousCountryCenter: (center) => ({
    type: actionTypes.SET_PREVIOUS_COUNTRY_CENTER,
    payload: center,
  }),

  // Earth actions
  toggleEarthVisibility: () => ({
    type: actionTypes.TOGGLE_EARTH_VISIBILITY,
  }),

  toggleWireframe: () => ({
    type: actionTypes.TOGGLE_WIREFRAME,
  }),

  setEarthRotation: (rotation) => ({
    type: actionTypes.SET_EARTH_ROTATION,
    payload: rotation,
  }),

  setEarthTexture: (texture) => ({
    type: actionTypes.SET_EARTH_TEXTURE,
    payload: texture,
  }),

  // Country actions
  selectCountry: (country) => ({
    type: actionTypes.SELECT_COUNTRY,
    payload: country,
  }),

  hoverCountry: (country) => ({
    type: actionTypes.HOVER_COUNTRY,
    payload: country,
  }),

  toggleCountriesVisibility: () => ({
    type: actionTypes.TOGGLE_COUNTRIES_VISIBILITY,
  }),

  toggleBorders: () => ({
    type: actionTypes.TOGGLE_BORDERS,
  }),

  setHighlightColor: (color) => ({
    type: actionTypes.SET_HIGHLIGHT_COLOR,
    payload: color,
  }),

  toggleFlags: () => ({
    type: actionTypes.TOGGLE_FLAGS,
  }),

  toggleGlowEffect: () => ({
    type: actionTypes.TOGGLE_GLOW_EFFECT,
  }),

  setGlowIntensity: (intensity) => ({
    type: actionTypes.SET_GLOW_INTENSITY,
    payload: intensity,
  }),

  setGlowColor: (color) => ({
    type: actionTypes.SET_GLOW_COLOR,
    payload: color,
  }),

  // UI actions
  toggleControls: () => ({
    type: actionTypes.TOGGLE_CONTROLS,
  }),

  toggleCountryInfo: () => ({
    type: actionTypes.TOGGLE_COUNTRY_INFO,
  }),

  toggleSettings: () => ({
    type: actionTypes.TOGGLE_SETTINGS,
  }),

  toggleRecording: () => ({
    type: actionTypes.TOGGLE_RECORDING,
  }),

  setTheme: (theme) => ({
    type: actionTypes.SET_THEME,
    payload: theme,
  }),

  // Animation actions
  toggleAnimation: () => ({
    type: actionTypes.TOGGLE_ANIMATION,
  }),

  setAnimationSpeed: (speed) => ({
    type: actionTypes.SET_ANIMATION_SPEED,
    payload: speed,
  }),

  updateTime: (time) => ({
    type: actionTypes.UPDATE_TIME,
    payload: time,
  }),

  startAutoAnimation: () => ({
    type: actionTypes.START_AUTO_ANIMATION,
  }),

  stopAutoAnimation: () => ({
    type: actionTypes.STOP_AUTO_ANIMATION,
  }),

  setCurrentCountryIndex: (index) => ({
    type: actionTypes.SET_CURRENT_COUNTRY_INDEX,
    payload: index,
  }),

  nextCountry: () => ({
    type: actionTypes.NEXT_COUNTRY,
  }),

  // Recording actions
  setResolution: (resolution) => ({
    type: actionTypes.SET_RESOLUTION,
    payload: resolution,
  }),

  setFramerate: (framerate) => ({
    type: actionTypes.SET_FRAMERATE,
    payload: framerate,
  }),

  setRecordingDuration: (duration) => ({
    type: actionTypes.SET_RECORDING_DURATION,
    payload: duration,
  }),

  setRecordingFormat: (format) => ({
    type: actionTypes.SET_RECORDING_FORMAT,
    payload: format,
  }),

  setRecordingQuality: (quality) => ({
    type: actionTypes.SET_RECORDING_QUALITY,
    payload: quality,
  }),

  startRecording: () => ({
    type: actionTypes.START_RECORDING,
  }),

  stopRecording: () => ({
    type: actionTypes.STOP_RECORDING,
  }),
};
