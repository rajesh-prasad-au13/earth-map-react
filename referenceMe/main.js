// main.js
// Note: ThreeGlobe is loaded globally via CDN in index.html
import { createEarth } from "./components/earth.js";
import {
  getBestCountryCenter,
  addImprovedCentroidMarker,
} from "./coreFunctions/improved-center.js";
import { startRecording, stopRecording } from "./components/recording.js";
import { setupUIHandlers } from "./components/settings.js";
import { hideFlagIfMoving, showFlagIfStationary } from "./components/flags.js";
import {
  highlightCountry,
  clearCountryHighlight,
  updateBorderEffects,
  updateCountryStyles,
  triggerBorderAnimationAtZoomDistance,
} from "./components/countries.js";
import { animateCameraToPosition } from "./components/camera.js";
import {
  topCountries,
  camera,
  scene,
  renderer,
  globe,
  light,
  controls,
  textureLoader,
  countryIndex,
  animationTimeoutId,
  isAnimating,
  animationSpeed,
  currentAnimation,
  showFlags,
  showRank,
  videoTitle,
  channelName,
  isCameraMoving,
  cameraStationaryTimeout,
  flagAnimationType,
  defaultBorderColor,
  focusedBorderColor,
  allcountries_border_color,
  glowColor,
  glowIntensity,
  enableGlow,
  countryPolygons,
  currentHighlightedCountry,
  previousCountryCenter,
  previousCameraPosition,
  INITIAL_ZOOM_DISTANCE,
  setCamera,
  setScene,
  setRenderer,
  setGlobe,
  setLight,
  setControls,
  setTextureLoader,
  setCountryIndex,
  setAnimationTimeoutId,
  setIsAnimating,
  setCurrentAnimation,
  setIsCameraMoving,
  setCameraStationaryTimeout,
  setCountryPolygons,
  setCurrentHighlightedCountry,
  setPreviousCountryCenter,
  setPreviouseCameraPosition,
  // Animated border outline state and setters
  activeBorderOutline,
  borderOutlineAnimationDuration,
  setActiveBorderOutline,
  setBorderOutlineAnimationDuration,
} from "./constants/state.js";
import { updateDisplayCard } from "./components/displayCard.js";

console.log("in main.js");

let label;

init();
loadCountryData();

function init() {
  const newScene = new THREE.Scene();
  setScene(newScene);

  const newCamera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  newCamera.position.set(0, 0, INITIAL_ZOOM_DISTANCE);
  setCamera(newCamera);

  const newRenderer = new THREE.WebGLRenderer({ antialias: true });
  newRenderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(newRenderer.domElement);
  setRenderer(newRenderer);

  const newLight = new THREE.DirectionalLight(0xffffff, 1);
  newLight.position.set(1, 1, 1).normalize();
  scene.add(newLight);
  setLight(newLight);

  const ambient = new THREE.AmbientLight(0x404040);
  scene.add(ambient);

  // Initialize texture loader
  const newTextureLoader = new THREE.TextureLoader();
  setTextureLoader(newTextureLoader);

  // Starry background
  textureLoader.load(
    "./public/Space.png",
    function (texture) {
      scene.background = texture;
    },
    undefined,
    function (err) {
      console.error("Error loading starfield texture:", err);
      // Fallback background color if texture fails to load
      scene.background = new THREE.Color(0x000010); // Dark blue fallback
    }
  );

  // Create realistic Earth and assign it to the global globe variable
  const newGlobe = createEarth(scene);
  // Ensure globe is perfectly centered
  newGlobe.position.set(0, 0, 0);
  setGlobe(newGlobe);

  const newControls = new THREE.OrbitControls(camera, renderer.domElement);
  newControls.enableZoom = true; // Enable zoom
  newControls.enablePan = false; // Disable pan to keep center fixed
  newControls.enableRotate = true; // Enable rotate around center
  newControls.target.set(0, 0, 0); // Set rotation target to globe center
  newControls.enableDamping = false; // Disable damping to prevent drift
  newControls.minDistance = 30; // Allow camera to get very close for country viewing
  newControls.maxDistance = 500; // Maximum zoom distance
  newControls.screenSpacePanning = false; // Disable screen space panning
  newControls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: null, // Disable right click
  };

  setControls(newControls);

  // Add camera movement tracking for flag and glow effects
  controls.addEventListener("start", () => {
    setIsCameraMoving(true);
    hideFlagIfMoving();
    updateBorderEffects();

    if (isAnimating) {
      setIsAnimating(false);
      const stopBtn = document.getElementById("stopBtn");
      if (stopBtn) {
        stopBtn.textContent = "Start Animation";
      }
      if (currentAnimation) {
        currentAnimation.stop();
      }
      if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
        setAnimationTimeoutId(null);
      }
      // Reset previous position tracking (so next animation is direct)
      setPreviousCountryCenter(null);
      setPreviouseCameraPosition(null);

      // Optionally, hide the country label and marker when manual interaction starts
      if (label) {
        label.textContent = "";
      }
      const locationMarker = document.getElementById("locationMarker");
      if (locationMarker) {
        locationMarker.style.display = "none";
      }
    }
  });

  controls.addEventListener("end", () => {
    // Camera stopped moving, set up delay before showing effects
    if (cameraStationaryTimeout) {
      clearTimeout(cameraStationaryTimeout);
    }

    const timeout = setTimeout(() => {
      setIsCameraMoving(false);
      showFlagIfStationary();
      updateBorderEffects();
    }, 500); // 500ms delay after camera stops
    setCameraStationaryTimeout(timeout);
  });

  label = document.getElementById("countryLabel");
  const stopBtn = document.getElementById("stopBtn");

  if (stopBtn) {
    stopBtn.textContent = isAnimating ? "Stop Animation" : "Start Animation";
  }

  // Setup UI event handlers
  setupUIHandlers();

  animate();
}

// Export the function that starts the intro animation
export function startIntroAnimation() {
  // Start the animation sequence
  setIsAnimating(true);
  setCountryIndex(0);
  animateToCountry();
}

// Function to remove centroid markers
function removeCentroidMarkers() {
  if (window.centroidMarkers && window.centroidMarkers.length > 0) {
    window.centroidMarkers.forEach((marker) => {
      scene.remove(marker);
    });
    window.centroidMarkers = []; // Clear the array after removing markers
  }
}

// Note: Flag display is now handled by three-globe's polygon system

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);

  // Update controls and force center lock
  if (controls) {
    controls.update();
    // Aggressively force target to stay at center
    controls.target.copy(new THREE.Vector3(0, 0, 0));
    // Force camera to look at center
    camera.lookAt(0, 0, 0);
  }

  // Ensure globe stays perfectly centered
  if (globe) {
    globe.position.set(0, 0, 0);
  }

  // No Earth rotation - removed as per request
  // Note: three-globe handles its own internal animations

  // Make light follow camera
  if (light && camera) {
    light.position.copy(camera.position);
  }

  // Continuously log current zoom distance
  if (camera) {
    const currentZoomDistance = camera.position.length();
    console.log(`Current Zoom Distance: ${currentZoomDistance.toFixed(2)}`);

    // Check if border animation should be triggered at current zoom distance
    triggerBorderAnimationAtZoomDistance();
  }

  renderer.render(scene, camera);
}

// loadCountryData();

async function loadCountryData() {
  try {
    const res = await fetch("./public/countries.geojson");
    const geojson = await res.json();

    // Store ALL country polygons for later use - not just top countries
    const allCountryPolygons = geojson.features.map((feature) => {
      // Check if this is one of the top countries
      const topCountry = topCountries.find(
        (c) => c.code === feature.properties.ISO_A3
      );

      return {
        ...feature,
        countryName: feature.properties.ADMIN || feature.properties.NAME,
        countryCode: feature.properties.ISO_A3,
        isTopCountry: !!topCountry,
      };
    });
    setCountryPolygons(allCountryPolygons);

    // Set up the globe with country polygons
    globe
      .polygonsData(countryPolygons)
      .polygonGeoJsonGeometry((d) => d.geometry)
      .polygonCapColor((d) => {
        return "rgba(200, 200, 200, 0.1)";
      })
      .polygonSideColor((d) => {
        return "rgba(200, 200, 200, 0.05)";
      })
      .polygonStrokeColor((d) => {
        if (d.isHighlighted && !isCameraMoving && enableGlow) {
          return focusedBorderColor;
        }
        return allcountries_border_color; // Use the global border color for all countries
      })
      .polygonAltitude((d) => {
        if (d.isHighlighted && !isCameraMoving) {
          if (enableGlow) {
            return 0.025 * glowIntensity;
          } else {
            return 0.02;
          }
        }
        return 0.001;
      })
      .polygonCapMaterial((d) => {
        if (d.isHighlighted && d.flagTexture && !isCameraMoving && showFlags) {
          return new THREE.MeshBasicMaterial({
            map: d.flagTexture,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
          });
        }
        return undefined; // Use default color
      });

    document.getElementById("loading").style.display = "none";
    console.log("Country data loaded successfully");

    // Initialize default styles
    updateCountryStyles();

    // Don't start animation automatically anymore
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById("loading").textContent = "Error loading data.";
  }
}

// Note: Country borders and polygons are now handled by three-globe

export function animateToCountry() {
  console.log("-->");
  if (!isAnimating && currentAnimation) {
    // If animation was stopped, ensure tweens are also stopped.
    currentAnimation.stop();
    if (animationTimeoutId) clearTimeout(animationTimeoutId);
  }
  if (!isAnimating) return;

  // Clear previous country highlight
  clearCountryHighlight();

  // Remove any existing centroid markers
  removeCentroidMarkers();

  const country = topCountries[countryIndex];

  // Find the country polygon data
  const countryPolygon = countryPolygons.find(
    (p) => p.countryCode === country.code
  );
  console.log(
    `Attempting to find polygon for: ${country.code}`,
    countryPolygon
  );

  if (!countryPolygon) {
    console.warn(
      `Polygon data for ${country.name} (${country.code}) not found.`
    );
    if (isAnimating) {
      console.log("Advancing to next country due to missing polygon data.");
      setCountryIndex((countryIndex + 1) % topCountries.length);
      // Use setTimeout to avoid deep recursion issues and allow UI to update
      const timeoutId = setTimeout(() => animateToCountry(), 100);
      setAnimationTimeoutId(timeoutId);
    }
    return;
  }

  console.log(100);
  // Highlight the current country
  try {
    console.log(
      "About to call highlightCountry with:",
      country.code,
      country.name
    );
    highlightCountry(country.code, country.name);
    // Update the display card with the current country's data
    updateDisplayCard({
      name: country.name,
      rank: country.rank,
      score: country.score,
    }); // Call as global function
    console.log("highlightCountry call completed successfully");
  } catch (error) {
    console.error("Error in highlightCountry:", error);
  }

  // Use the getBestCountryCenter function
  const bestCenter = getBestCountryCenter(countryPolygon);

  try {
    if (bestCenter) {
      console.log("bestCenter");
      console.log(11);
      console.log("bestCenter");
      // Add visual marker at the calculated center
      addImprovedCentroidMarker(
        bestCenter.lat,
        bestCenter.lng,
        bestCenter.method,
        scene,
        country.name // Pass the country name
      );

      console.log(33);
      // Convert lat/lng to 3D coordinates using three-globe's coordinate system
      const centerPoint = globe.getCoords(bestCenter.lat, bestCenter.lng);
      const offset = new THREE.Vector3(
        centerPoint.x,
        centerPoint.y,
        centerPoint.z
      )
        .normalize()
        .multiplyScalar(220); // Final zoom distance (adjusted for three-globe's radius of 100)

      console.log(11);
      // Animate camera to the best center position
      animateCameraToPosition(
        new THREE.Vector3(centerPoint.x, centerPoint.y, centerPoint.z),
        offset,
        country.name,
        animateToCountry
      );
      return;
    }
  } catch (error) {
    console.error(
      "Error in getBestCountryCenter or addImprovedCentroidMarker:",
      error
    );
  }

  // Fallback: calculate center from polygon bounds
  console.log("Using fallback center calculation");
  // For fallback, we'll use a simple centroid calculation
  let latSum = 0,
    lngSum = 0,
    pointCount = 0;

  if (countryPolygon.geometry.type === "Polygon") {
    countryPolygon.geometry.coordinates[0].forEach((coord) => {
      lngSum += coord[0];
      latSum += coord[1];
      pointCount++;
    });
  } else if (countryPolygon.geometry.type === "MultiPolygon") {
    countryPolygon.geometry.coordinates.forEach((polygon) => {
      polygon[0].forEach((coord) => {
        lngSum += coord[0];
        latSum += coord[1];
        pointCount++;
      });
    });
  }

  const avgLat = latSum / pointCount;
  const avgLng = lngSum / pointCount;
  const centerPoint = globe.getCoords(avgLat, avgLng);
  const offset = new THREE.Vector3(centerPoint.x, centerPoint.y, centerPoint.z)
    .normalize()
    .multiplyScalar(220); // Adjusted for three-globe's radius of 100

  // Use the fallback center
  animateCameraToPosition(
    new THREE.Vector3(centerPoint.x, centerPoint.y, centerPoint.z),
    offset,
    country.name,
    animateToCountry
  );
}

// Control buttons
const stopBtn = document.getElementById("stopBtn");
const prevBtn = document.getElementById("prev-country");
const nextBtn = document.getElementById("next-country");

// Add stop button functionality
if (stopBtn) {
  stopBtn.addEventListener("click", () => {
    setIsAnimating(!isAnimating);

    if (isAnimating) {
      // Resume animation
      stopBtn.textContent = "Stop Animation";
      // Reset previous position so animation starts fresh
      setPreviousCountryCenter(null);
      setPreviouseCameraPosition(null);
      animateToCountry(); // This will restart the animation sequence
    } else {
      // Stop animation
      stopBtn.textContent = "Start Animation";

      if (animationTimeoutId) {
        clearTimeout(animationTimeoutId); // Clear the scheduled next country animation
        setAnimationTimeoutId(null);
      }
      // Reset previous position tracking when stopping
      setPreviousCountryCenter(null);
      setPreviouseCameraPosition(null);
      updateDisplayCard(null); // Call as global function to clear card
    }
  });
}
