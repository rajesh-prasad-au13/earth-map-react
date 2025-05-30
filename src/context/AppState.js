import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

// Initial state matching the reference implementation
const initialState = {
  // Country data
  topCountries: [
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
  ],

  // Animation state
  countryIndex: 0,
  animationTimeoutId: null,
  isAnimating: false,
  animationSpeed: 4000,
  currentAnimation: null,
  time_to_wait_for_highlighted_country: 9000,

  // Display settings
  showFlags: true,
  showRank: true,
  videoTitle: "Top 10 Biggest Countries in the World",
  channelName: "Your Channel Name",

  // Camera movement tracking
  isCameraMoving: false,
  cameraStationaryTimeout: null,

  // Flag animation settings
  flagAnimationType: "fade-in",

  // Camera zoom configuration
  INITIAL_ZOOM_DISTANCE: 350,
  COUNTRY_VIEW_ZOOM_DISTANCE: 110,
  COUNTRY_TO_COUNTRY_ZOOM_DISTANCE: 220,

  // Border styling settings
  defaultBorderColor: "#ffffff",
  focusedBorderColor: "#ff4757",
  allcountries_border_color: "#ffffff",
  glowColor: "#ffffff",
  glowIntensity: 1.0,
  enableGlow: true,

  // Country data
  countryPolygons: [],
  currentHighlightedCountry: null,

  // Animated border outline state
  activeBorderOutline: null,
  borderOutlineAnimationDuration: 6000,
  borderThickness: 0.03,
  borderLinesCount: 25,

  // Border animation trigger state
  shouldTriggerBorderAnimation: false,
  borderAnimationTriggered: false,

  // Previous positions for smooth transitions
  previousCountryCenter: null,
  previousCameraPosition: null,

  // Recording variables
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  originalRendererSize: { width: 0, height: 0 },
  recordingStartTime: 0,
  recordingDuration: 0,

  // Three.js objects (will be set by useThreeJS hook)
  camera: null,
  scene: null,
  renderer: null,
  globe: null,
  light: null,
  controls: null,
  textureLoader: null,
  earthMesh: null,
  cloudsMesh: null,
};

// Action types
const actionTypes = {
  SET_COUNTRY_INDEX: "SET_COUNTRY_INDEX",
  SET_ANIMATION_TIMEOUT_ID: "SET_ANIMATION_TIMEOUT_ID",
  SET_IS_ANIMATING: "SET_IS_ANIMATING",
  SET_ANIMATION_SPEED: "SET_ANIMATION_SPEED",
  SET_CURRENT_ANIMATION: "SET_CURRENT_ANIMATION",
  SET_TIME_TO_WAIT_FOR_HIGHLIGHTED_COUNTRY:
    "SET_TIME_TO_WAIT_FOR_HIGHLIGHTED_COUNTRY",
  SET_VIDEO_TITLE: "SET_VIDEO_TITLE",
  SET_CHANNEL_NAME: "SET_CHANNEL_NAME",
  SET_SHOW_FLAGS: "SET_SHOW_FLAGS",
  SET_SHOW_RANK: "SET_SHOW_RANK",
  SET_FLAG_ANIMATION_TYPE: "SET_FLAG_ANIMATION_TYPE",
  SET_DEFAULT_BORDER_COLOR: "SET_DEFAULT_BORDER_COLOR",
  SET_FOCUSED_BORDER_COLOR: "SET_FOCUSED_BORDER_COLOR",
  SET_ALL_COUNTRIES_BORDER_COLOR: "SET_ALL_COUNTRIES_BORDER_COLOR",
  SET_GLOW_COLOR: "SET_GLOW_COLOR",
  SET_GLOW_INTENSITY: "SET_GLOW_INTENSITY",
  SET_ENABLE_GLOW: "SET_ENABLE_GLOW",
  SET_IS_CAMERA_MOVING: "SET_IS_CAMERA_MOVING",
  SET_CAMERA_STATIONARY_TIMEOUT: "SET_CAMERA_STATIONARY_TIMEOUT",
  SET_COUNTRY_POLYGONS: "SET_COUNTRY_POLYGONS",
  SET_CURRENT_HIGHLIGHTED_COUNTRY: "SET_CURRENT_HIGHLIGHTED_COUNTRY",
  SET_PREVIOUS_COUNTRY_CENTER: "SET_PREVIOUS_COUNTRY_CENTER",
  SET_PREVIOUS_CAMERA_POSITION: "SET_PREVIOUS_CAMERA_POSITION",
  SET_MEDIA_RECORDER: "SET_MEDIA_RECORDER",
  SET_RECORDED_CHUNKS: "SET_RECORDED_CHUNKS",
  SET_IS_RECORDING: "SET_IS_RECORDING",
  SET_ORIGINAL_RENDERER_SIZE: "SET_ORIGINAL_RENDERER_SIZE",
  SET_RECORDING_START_TIME: "SET_RECORDING_START_TIME",
  SET_RECORDING_DURATION: "SET_RECORDING_DURATION",
  SET_ACTIVE_BORDER_OUTLINE: "SET_ACTIVE_BORDER_OUTLINE",
  SET_BORDER_OUTLINE_ANIMATION_DURATION:
    "SET_BORDER_OUTLINE_ANIMATION_DURATION",
  SET_BORDER_THICKNESS: "SET_BORDER_THICKNESS",
  SET_BORDER_LINES_COUNT: "SET_BORDER_LINES_COUNT",
  SET_SHOULD_TRIGGER_BORDER_ANIMATION: "SET_SHOULD_TRIGGER_BORDER_ANIMATION",
  SET_BORDER_ANIMATION_TRIGGERED: "SET_BORDER_ANIMATION_TRIGGERED",
  SET_CAMERA: "SET_CAMERA",
  SET_SCENE: "SET_SCENE",
  SET_RENDERER: "SET_RENDERER",
  SET_GLOBE: "SET_GLOBE",
  SET_LIGHT: "SET_LIGHT",
  SET_CONTROLS: "SET_CONTROLS",
  SET_TEXTURE_LOADER: "SET_TEXTURE_LOADER",
  SET_EARTH_MESH: "SET_EARTH_MESH",
  SET_CLOUDS_MESH: "SET_CLOUDS_MESH",
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_COUNTRY_INDEX:
      return { ...state, countryIndex: action.payload };
    case actionTypes.SET_ANIMATION_TIMEOUT_ID:
      return { ...state, animationTimeoutId: action.payload };
    case actionTypes.SET_IS_ANIMATING:
      return { ...state, isAnimating: action.payload };
    case actionTypes.SET_ANIMATION_SPEED:
      return { ...state, animationSpeed: action.payload };
    case actionTypes.SET_CURRENT_ANIMATION:
      return { ...state, currentAnimation: action.payload };
    case actionTypes.SET_TIME_TO_WAIT_FOR_HIGHLIGHTED_COUNTRY:
      return { ...state, time_to_wait_for_highlighted_country: action.payload };
    case actionTypes.SET_VIDEO_TITLE:
      return { ...state, videoTitle: action.payload };
    case actionTypes.SET_CHANNEL_NAME:
      return { ...state, channelName: action.payload };
    case actionTypes.SET_SHOW_FLAGS:
      return { ...state, showFlags: action.payload };
    case actionTypes.SET_SHOW_RANK:
      return { ...state, showRank: action.payload };
    case actionTypes.SET_FLAG_ANIMATION_TYPE:
      return { ...state, flagAnimationType: action.payload };
    case actionTypes.SET_DEFAULT_BORDER_COLOR:
      return { ...state, defaultBorderColor: action.payload };
    case actionTypes.SET_FOCUSED_BORDER_COLOR:
      return { ...state, focusedBorderColor: action.payload };
    case actionTypes.SET_ALL_COUNTRIES_BORDER_COLOR:
      return { ...state, allcountries_border_color: action.payload };
    case actionTypes.SET_GLOW_COLOR:
      return { ...state, glowColor: action.payload };
    case actionTypes.SET_GLOW_INTENSITY:
      return { ...state, glowIntensity: action.payload };
    case actionTypes.SET_ENABLE_GLOW:
      return { ...state, enableGlow: action.payload };
    case actionTypes.SET_IS_CAMERA_MOVING:
      return { ...state, isCameraMoving: action.payload };
    case actionTypes.SET_CAMERA_STATIONARY_TIMEOUT:
      return { ...state, cameraStationaryTimeout: action.payload };
    case actionTypes.SET_COUNTRY_POLYGONS:
      return { ...state, countryPolygons: action.payload };
    case actionTypes.SET_CURRENT_HIGHLIGHTED_COUNTRY:
      return { ...state, currentHighlightedCountry: action.payload };
    case actionTypes.SET_PREVIOUS_COUNTRY_CENTER:
      return { ...state, previousCountryCenter: action.payload };
    case actionTypes.SET_PREVIOUS_CAMERA_POSITION:
      return { ...state, previousCameraPosition: action.payload };
    case actionTypes.SET_MEDIA_RECORDER:
      return { ...state, mediaRecorder: action.payload };
    case actionTypes.SET_RECORDED_CHUNKS:
      return { ...state, recordedChunks: action.payload };
    case actionTypes.SET_IS_RECORDING:
      return { ...state, isRecording: action.payload };
    case actionTypes.SET_ORIGINAL_RENDERER_SIZE:
      return { ...state, originalRendererSize: action.payload };
    case actionTypes.SET_RECORDING_START_TIME:
      return { ...state, recordingStartTime: action.payload };
    case actionTypes.SET_RECORDING_DURATION:
      return { ...state, recordingDuration: action.payload };
    case actionTypes.SET_ACTIVE_BORDER_OUTLINE:
      return { ...state, activeBorderOutline: action.payload };
    case actionTypes.SET_BORDER_OUTLINE_ANIMATION_DURATION:
      return { ...state, borderOutlineAnimationDuration: action.payload };
    case actionTypes.SET_BORDER_THICKNESS:
      return { ...state, borderThickness: action.payload };
    case actionTypes.SET_BORDER_LINES_COUNT:
      return { ...state, borderLinesCount: action.payload };
    case actionTypes.SET_SHOULD_TRIGGER_BORDER_ANIMATION:
      return { ...state, shouldTriggerBorderAnimation: action.payload };
    case actionTypes.SET_BORDER_ANIMATION_TRIGGERED:
      return { ...state, borderAnimationTriggered: action.payload };
    case actionTypes.SET_CAMERA:
      return { ...state, camera: action.payload };
    case actionTypes.SET_SCENE:
      return { ...state, scene: action.payload };
    case actionTypes.SET_RENDERER:
      return { ...state, renderer: action.payload };
    case actionTypes.SET_GLOBE:
      return { ...state, globe: action.payload };
    case actionTypes.SET_LIGHT:
      return { ...state, light: action.payload };
    case actionTypes.SET_CONTROLS:
      return { ...state, controls: action.payload };
    case actionTypes.SET_TEXTURE_LOADER:
      return { ...state, textureLoader: action.payload };
    case actionTypes.SET_EARTH_MESH:
      return { ...state, earthMesh: action.payload };
    case actionTypes.SET_CLOUDS_MESH:
      return { ...state, cloudsMesh: action.payload };
    default:
      return state;
  }
};

// Create contexts
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Provider component
export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// Custom hooks for using state and dispatch
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error("useAppDispatch must be used within an AppStateProvider");
  }
  return context;
};

// Action creators for easier usage
export const useAppActions = () => {
  const dispatch = useAppDispatch();

  return {
    setCountryIndex: useCallback(
      (index) =>
        dispatch({ type: actionTypes.SET_COUNTRY_INDEX, payload: index }),
      [dispatch]
    ),
    setAnimationTimeoutId: useCallback(
      (id) =>
        dispatch({ type: actionTypes.SET_ANIMATION_TIMEOUT_ID, payload: id }),
      [dispatch]
    ),
    setIsAnimating: useCallback(
      (value) =>
        dispatch({ type: actionTypes.SET_IS_ANIMATING, payload: value }),
      [dispatch]
    ),
    setAnimationSpeed: useCallback(
      (speed) =>
        dispatch({ type: actionTypes.SET_ANIMATION_SPEED, payload: speed }),
      [dispatch]
    ),
    setCurrentAnimation: useCallback(
      (animation) =>
        dispatch({
          type: actionTypes.SET_CURRENT_ANIMATION,
          payload: animation,
        }),
      [dispatch]
    ),
    setTimeToWaitForHighlightedCountry: useCallback(
      (time) =>
        dispatch({
          type: actionTypes.SET_TIME_TO_WAIT_FOR_HIGHLIGHTED_COUNTRY,
          payload: time,
        }),
      [dispatch]
    ),
    setVideoTitle: useCallback(
      (title) =>
        dispatch({ type: actionTypes.SET_VIDEO_TITLE, payload: title }),
      [dispatch]
    ),
    setChannelName: useCallback(
      (name) => dispatch({ type: actionTypes.SET_CHANNEL_NAME, payload: name }),
      [dispatch]
    ),
    setShowFlags: useCallback(
      (value) => dispatch({ type: actionTypes.SET_SHOW_FLAGS, payload: value }),
      [dispatch]
    ),
    setShowRank: useCallback(
      (value) => dispatch({ type: actionTypes.SET_SHOW_RANK, payload: value }),
      [dispatch]
    ),
    setFlagAnimationType: useCallback(
      (type) =>
        dispatch({ type: actionTypes.SET_FLAG_ANIMATION_TYPE, payload: type }),
      [dispatch]
    ),
    setDefaultBorderColor: useCallback(
      (color) =>
        dispatch({
          type: actionTypes.SET_DEFAULT_BORDER_COLOR,
          payload: color,
        }),
      [dispatch]
    ),
    setFocusedBorderColor: useCallback(
      (color) =>
        dispatch({
          type: actionTypes.SET_FOCUSED_BORDER_COLOR,
          payload: color,
        }),
      [dispatch]
    ),
    setAllCountriesBorderColor: useCallback(
      (color) =>
        dispatch({
          type: actionTypes.SET_ALL_COUNTRIES_BORDER_COLOR,
          payload: color,
        }),
      [dispatch]
    ),
    setGlowColor: useCallback(
      (color) => dispatch({ type: actionTypes.SET_GLOW_COLOR, payload: color }),
      [dispatch]
    ),
    setGlowIntensity: useCallback(
      (intensity) =>
        dispatch({ type: actionTypes.SET_GLOW_INTENSITY, payload: intensity }),
      [dispatch]
    ),
    setEnableGlow: useCallback(
      (value) =>
        dispatch({ type: actionTypes.SET_ENABLE_GLOW, payload: value }),
      [dispatch]
    ),
    setIsCameraMoving: useCallback(
      (value) =>
        dispatch({ type: actionTypes.SET_IS_CAMERA_MOVING, payload: value }),
      [dispatch]
    ),
    setCameraStationaryTimeout: useCallback(
      (timeout) =>
        dispatch({
          type: actionTypes.SET_CAMERA_STATIONARY_TIMEOUT,
          payload: timeout,
        }),
      [dispatch]
    ),
    setCountryPolygons: useCallback(
      (polygons) =>
        dispatch({ type: actionTypes.SET_COUNTRY_POLYGONS, payload: polygons }),
      [dispatch]
    ),
    setCurrentHighlightedCountry: useCallback(
      (country) =>
        dispatch({
          type: actionTypes.SET_CURRENT_HIGHLIGHTED_COUNTRY,
          payload: country,
        }),
      [dispatch]
    ),
    setPreviousCountryCenter: useCallback(
      (center) =>
        dispatch({
          type: actionTypes.SET_PREVIOUS_COUNTRY_CENTER,
          payload: center,
        }),
      [dispatch]
    ),
    setPreviousCameraPosition: useCallback(
      (position) =>
        dispatch({
          type: actionTypes.SET_PREVIOUS_CAMERA_POSITION,
          payload: position,
        }),
      [dispatch]
    ),
    setMediaRecorder: useCallback(
      (recorder) =>
        dispatch({ type: actionTypes.SET_MEDIA_RECORDER, payload: recorder }),
      [dispatch]
    ),
    setRecordedChunks: useCallback(
      (chunks) =>
        dispatch({ type: actionTypes.SET_RECORDED_CHUNKS, payload: chunks }),
      [dispatch]
    ),
    setIsRecording: useCallback(
      (value) =>
        dispatch({ type: actionTypes.SET_IS_RECORDING, payload: value }),
      [dispatch]
    ),
    setOriginalRendererSize: useCallback(
      (size) =>
        dispatch({
          type: actionTypes.SET_ORIGINAL_RENDERER_SIZE,
          payload: size,
        }),
      [dispatch]
    ),
    setRecordingStartTime: useCallback(
      (time) =>
        dispatch({ type: actionTypes.SET_RECORDING_START_TIME, payload: time }),
      [dispatch]
    ),
    setRecordingDuration: useCallback(
      (duration) =>
        dispatch({
          type: actionTypes.SET_RECORDING_DURATION,
          payload: duration,
        }),
      [dispatch]
    ),
    setActiveBorderOutline: useCallback(
      (outline) =>
        dispatch({
          type: actionTypes.SET_ACTIVE_BORDER_OUTLINE,
          payload: outline,
        }),
      [dispatch]
    ),
    setBorderOutlineAnimationDuration: useCallback(
      (duration) =>
        dispatch({
          type: actionTypes.SET_BORDER_OUTLINE_ANIMATION_DURATION,
          payload: duration,
        }),
      [dispatch]
    ),
    setBorderThickness: useCallback(
      (thickness) =>
        dispatch({
          type: actionTypes.SET_BORDER_THICKNESS,
          payload: thickness,
        }),
      [dispatch]
    ),
    setBorderLinesCount: useCallback(
      (count) =>
        dispatch({ type: actionTypes.SET_BORDER_LINES_COUNT, payload: count }),
      [dispatch]
    ),
    setShouldTriggerBorderAnimation: useCallback(
      (value) =>
        dispatch({
          type: actionTypes.SET_SHOULD_TRIGGER_BORDER_ANIMATION,
          payload: value,
        }),
      [dispatch]
    ),
    setBorderAnimationTriggered: useCallback(
      (value) =>
        dispatch({
          type: actionTypes.SET_BORDER_ANIMATION_TRIGGERED,
          payload: value,
        }),
      [dispatch]
    ),
    setCamera: useCallback(
      (camera) => dispatch({ type: actionTypes.SET_CAMERA, payload: camera }),
      [dispatch]
    ),
    setScene: useCallback(
      (scene) => dispatch({ type: actionTypes.SET_SCENE, payload: scene }),
      [dispatch]
    ),
    setRenderer: useCallback(
      (renderer) =>
        dispatch({ type: actionTypes.SET_RENDERER, payload: renderer }),
      [dispatch]
    ),
    setGlobe: useCallback(
      (globe) => dispatch({ type: actionTypes.SET_GLOBE, payload: globe }),
      [dispatch]
    ),
    setLight: useCallback(
      (light) => dispatch({ type: actionTypes.SET_LIGHT, payload: light }),
      [dispatch]
    ),
    setControls: useCallback(
      (controls) =>
        dispatch({ type: actionTypes.SET_CONTROLS, payload: controls }),
      [dispatch]
    ),
    setTextureLoader: useCallback(
      (loader) =>
        dispatch({ type: actionTypes.SET_TEXTURE_LOADER, payload: loader }),
      [dispatch]
    ),
    setEarthMesh: useCallback(
      (mesh) => dispatch({ type: actionTypes.SET_EARTH_MESH, payload: mesh }),
      [dispatch]
    ),
    setCloudsMesh: useCallback(
      (mesh) => dispatch({ type: actionTypes.SET_CLOUDS_MESH, payload: mesh }),
      [dispatch]
    ),
  };
};

export default AppStateProvider;
