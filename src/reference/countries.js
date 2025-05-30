import {
  globe,
  textureLoader,
  countryPolygons,
  currentHighlightedCountry,
  isCameraMoving,
  enableGlow,
  defaultBorderColor,
  focusedBorderColor,
  allcountries_border_color,
  glowColor,
  glowIntensity,
  showFlags,
  setCurrentHighlightedCountry,
  // Added missing imports for border animation
  scene,
  activeBorderOutline,
  setActiveBorderOutline,
  borderOutlineAnimationDuration,
  time_to_wait_for_highlighted_country,
  borderThickness,
  borderLinesCount,
  // Import new border animation trigger state
  shouldTriggerBorderAnimation,
  borderAnimationTriggered,
  setShouldTriggerBorderAnimation,
  setBorderAnimationTriggered,
  COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
  camera,
} from "../constants/state.js";
import { zoomOutCamera } from "./camera.js";

// Variable to track flag loading timeout
let flagLoadingTimeout = null;

// Function to highlight a country and show its flag
export function highlightCountry(countryCode, countryName) {
  console.log(1);
  console.log("BASIC TEST: highlightCountry function called");
  console.log(
    "[Highlight Country] Called with code:",
    countryCode,
    "name:",
    countryName
  );
  console.log(2);
  // Reset all countries
  countryPolygons.forEach((polygon) => {
    polygon.isHighlighted = false;
    polygon.flagTexture = null;
  });

  // Find and highlight the target country
  const targetCountry = countryPolygons.find(
    (p) => p.countryCode === countryCode
  );
  if (targetCountry) {
    console.log(
      "[Highlight Country] Target country found:",
      targetCountry.countryName
    );
    targetCountry.isHighlighted = true;

    // Calculate flag delay: show flag in the last 4 seconds
    // time_to_wait_for_highlighted_country = 9000ms, so flag appears after 6000ms
    const flagDelay = time_to_wait_for_highlighted_country - 4000;

    console.log(
      `[Highlight Country] Flag will appear after ${flagDelay}ms delay`
    );

    // Clear any existing flag timeout
    if (flagLoadingTimeout) {
      clearTimeout(flagLoadingTimeout);
      flagLoadingTimeout = null;
    }

    // Delay flag loading to appear in the last 4 seconds
    flagLoadingTimeout = setTimeout(() => {
      // Load flag texture for the highlighted country
      const flagPath = `./public/flags/${countryName}.png`;
      textureLoader.load(
        flagPath,
        (texture) => {
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          targetCountry.flagTexture = texture;

          // Update the globe polygons with new styling
          updateCountryStyles();
          globe.polygonsData([...countryPolygons]);

          console.log(
            `[Highlight Country] Flag loaded and displayed for ${countryName}`
          );
        },
        undefined,
        (error) => {
          console.warn(
            `Could not load flag texture for ${countryName}:`,
            error
          );
          // Update without flag texture but with styling
          updateCountryStyles();
          globe.polygonsData([...countryPolygons]);
        }
      );
    }, flagDelay);

    // Initial update without flag texture
    updateCountryStyles();
    globe.polygonsData([...countryPolygons]);

    setCurrentHighlightedCountry(targetCountry);

    // Update border effects immediately
    updateBorderEffects();

    // Note: Border animation will be triggered automatically when camera reaches COUNTRY_TO_COUNTRY_ZOOM_DISTANCE
    console.log(
      "[Highlight Country] Border animation will be triggered during camera movement"
    );
  } else {
    console.warn(
      "[Highlight Country] Target country NOT found for code:",
      countryCode
    );
  }
}

// Function to clear country highlighting
export function clearCountryHighlight() {
  // Clear any pending flag loading timeout
  if (flagLoadingTimeout) {
    clearTimeout(flagLoadingTimeout);
    flagLoadingTimeout = null;
  }

  countryPolygons.forEach((polygon) => {
    polygon.isHighlighted = false;
    polygon.flagTexture = null;
  });
  updateCountryStyles();
  globe.polygonsData([...countryPolygons]);
  setCurrentHighlightedCountry(null);

  // Hide flag overlay
  const flagOverlay = document.getElementById("flag-overlay");
  if (flagOverlay) {
    flagOverlay.classList.remove("visible");
  }

  // Zoom out camera when no country is highlighted
  zoomOutCamera();

  // Clear any active border outline
  if (activeBorderOutline) {
    scene.remove(activeBorderOutline);

    // If it's a group, dispose of all children
    if (activeBorderOutline.children) {
      activeBorderOutline.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    } else {
      // Single line cleanup (fallback)
      if (activeBorderOutline.geometry) activeBorderOutline.geometry.dispose();
      if (activeBorderOutline.material) activeBorderOutline.material.dispose();
    }

    setActiveBorderOutline(null);
  }
}

// Function to create and animate the glowing border outline
function createAnimatedBorderOutline(countryFeature) {
  console.log(
    "DEBUG: borderOutlineAnimationDuration value:",
    borderOutlineAnimationDuration
  );
  console.log(
    "DEBUG: typeof borderOutlineAnimationDuration:",
    typeof borderOutlineAnimationDuration
  );

  console.log(
    "[Border Animation] Attempting to create outline for:",
    countryFeature ? countryFeature.countryName : "Unknown Country"
  );

  if (!countryFeature || !countryFeature.geometry) {
    console.warn("[Border Animation] Exiting: No country feature or geometry.");
    return;
  }

  // Clear any existing outline
  if (activeBorderOutline) {
    scene.remove(activeBorderOutline);

    // If it's a group, dispose of all children
    if (activeBorderOutline.children) {
      activeBorderOutline.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    } else {
      // Single line cleanup (fallback)
      if (activeBorderOutline.geometry) activeBorderOutline.geometry.dispose();
      if (activeBorderOutline.material) activeBorderOutline.material.dispose();
    }

    setActiveBorderOutline(null);
  }

  const coordinates = countryFeature.geometry.coordinates;
  const type = countryFeature.geometry.type;
  let borderPoints = [];

  // Extract border points (simplified for the first ring of a Polygon or MultiPolygon's largest part)
  // This needs to handle GeoJSON structure correctly
  let pathCoordinates = [];
  if (type === "Polygon") {
    pathCoordinates = coordinates[0]; // Outer ring
  } else if (type === "MultiPolygon") {
    // For MultiPolygon, find the largest polygon and use its outer ring
    // This is a simplification; a more robust solution might trace all parts
    let largestPolygon = coordinates[0];
    let maxPoints = 0;
    coordinates.forEach((polygon) => {
      if (polygon[0].length > maxPoints) {
        maxPoints = polygon[0].length;
        largestPolygon = polygon;
      }
    });
    pathCoordinates = largestPolygon[0];
  }

  console.log(
    "[Border Animation] pathCoordinates.length:",
    pathCoordinates.length
  );

  if (pathCoordinates.length === 0) {
    console.warn(
      "[Border Animation] Exiting: No path coordinates found for border outline:",
      countryFeature.countryName
    );
    return;
  }

  // Convert GeoJSON [lon, lat] to 3D points on the globe surface
  pathCoordinates.forEach((coord) => {
    const [lon, lat] = coord;
    const pos = globe.getCoords(lat, lon, 0.01); // 0.01 altitude to be slightly above surface
    borderPoints.push(new THREE.Vector3(pos.x, pos.y, pos.z));
  });

  console.log("[Border Animation] borderPoints.length:", borderPoints.length);

  if (borderPoints.length < 2) {
    console.warn(
      "[Border Animation] Exiting: Not enough points for border outline:",
      countryFeature.countryName
    );
    return;
  }

  // Create thick border using multiple offset lines for better visibility
  const lineGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(borderPoints.length * 3);
  const lineDistances = new Float32Array(borderPoints.length);

  // Calculate cumulative line distances for smooth animation
  let distance = 0;
  let prevPoint = null;

  // Fill positions array and calculate line distances
  for (let i = 0; i < borderPoints.length; i++) {
    positions[i * 3] = borderPoints[i].x;
    positions[i * 3 + 1] = borderPoints[i].y;
    positions[i * 3 + 2] = borderPoints[i].z;

    // Calculate cumulative distance along the line
    if (prevPoint !== null) {
      distance += borderPoints[i].distanceTo(prevPoint);
    }
    lineDistances[i] = distance;
    prevPoint = borderPoints[i];
  }

  // Normalize line distances to range [0, 1] for shader
  if (distance > 0) {
    for (let i = 0; i < lineDistances.length; i++) {
      lineDistances[i] /= distance;
    }
  }

  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  lineGeometry.setAttribute(
    "lineDistance",
    new THREE.BufferAttribute(lineDistances, 1)
  );

  // Create a special shader material for smoother line animation
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x00ffff) }, // Cyan color
      opacity: { value: 0.6 },
      dashOffset: { value: 0.0 }, // Will be animated for smooth effect
      dashSize: { value: 0.5 },
      gapSize: { value: 1.0 },
    },
    vertexShader: `
      attribute float lineDistance;
      varying float vLineDistance;
      
      void main() {
        vLineDistance = lineDistance;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform float dashSize;
      uniform float gapSize;
      uniform float dashOffset;
      
      varying float vLineDistance;
      
      void main() {
        float totalSize = dashSize + gapSize;
        if (totalSize <= 0.0) {
          // If no gaps, show solid line
          gl_FragColor = vec4(color, opacity);
        } else {
          float modulo = mod(vLineDistance + dashOffset, totalSize);
          float dashOpacity = step(modulo, dashSize);
          
          // Create a smooth transition for the wave effect
          float waveProgress = clamp((vLineDistance + dashOffset) / 2.0, 0.0, 1.0);
          float finalOpacity = opacity * max(dashOpacity, waveProgress);
          
          gl_FragColor = vec4(color, finalOpacity);
        }
      }
    `,
    transparent: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  // Create multiple lines with slight offsets to make border appear thicker
  const borderGroup = new THREE.Group();

  console.log(
    `[Border Animation] Using thickness: ${borderThickness}, lines: ${borderLinesCount}`
  );

  // Create multiple lines with configurable count and thickness
  for (let i = 0; i < borderLinesCount; i++) {
    const offsetGeometry = lineGeometry.clone();
    const offsetPositions = offsetGeometry.attributes.position.array;

    // Apply offsets to create thickness using configurable values
    for (let j = 0; j < offsetPositions.length; j += 3) {
      const angle = (i / borderLinesCount) * Math.PI * 2; // Distribute offsets in a circle
      const offsetX = Math.cos(angle) * borderThickness;
      const offsetY = Math.sin(angle) * borderThickness;

      offsetPositions[j] += offsetX;
      offsetPositions[j + 1] += offsetY;
    }
    offsetGeometry.attributes.position.needsUpdate = true;

    // Create a new instance of the shader material with the same parameters
    const offsetMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x00ffff) }, // Cyan color
        opacity: { value: 0.6 },
        dashOffset: { value: -1.5 }, // Start with line invisible (matches wave range)
        dashSize: { value: 0.2 }, // Match animation values
        gapSize: { value: 0.8 }, // Match animation values
      },
      vertexShader: lineMaterial.vertexShader,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float dashSize;
        uniform float gapSize;
        uniform float dashOffset;
        
        varying float vLineDistance;
        
        void main() {
          float totalSize = dashSize + gapSize;
          if (totalSize <= 0.0) {
            // If no gaps, show solid line
            gl_FragColor = vec4(color, opacity);
          } else {
            float modulo = mod(vLineDistance + dashOffset, totalSize);
            float dashOpacity = step(modulo, dashSize);
            
            // Create a smooth transition for the wave effect
            float waveProgress = clamp((vLineDistance + dashOffset) / 2.0, 0.0, 1.0);
            float finalOpacity = opacity * max(dashOpacity, waveProgress);
            
            gl_FragColor = vec4(color, finalOpacity);
          }
        }
      `,
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const offsetLine = new THREE.Line(offsetGeometry, offsetMaterial);
    borderGroup.add(offsetLine);
  }

  // Animation setup - prepare for shader-based animation
  const totalPoints = borderPoints.length;

  // Make all lines completely visible (points) but shader will control their appearance
  borderGroup.children.forEach((line) => {
    line.geometry.setDrawRange(0, totalPoints); // Show all points
    // Set shader uniforms to make the line initially invisible
    if (line.material.uniforms) {
      line.material.uniforms.dashOffset.value = -1.5; // Start further back for smoother entry (matches wave range)
    }
  });

  // Add to scene
  scene.add(borderGroup);
  setActiveBorderOutline(borderGroup);

  console.log(
    "[Border Animation] Starting animation. totalPoints:",
    totalPoints,
    "duration:",
    borderOutlineAnimationDuration
  );

  const startTime = Date.now();

  // Easing function to make the animation smoother
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateBorder() {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / borderOutlineAnimationDuration, 1);

    // Use easing function to make the start and end of animation smoother
    const easedProgress = easeInOutCubic(progress);

    console.log(
      "[Border Animation Tick] elapsedTime:",
      elapsedTime,
      "progress:",
      progress.toFixed(3),
      "easedProgress:",
      easedProgress.toFixed(3)
    );

    // For shader-based smooth animation that leaves borders visible
    borderGroup.children.forEach((line) => {
      // For the shader material
      if (line.material.uniforms) {
        // Create a wave effect that reveals the border progressively but leaves it visible
        // The wave should travel the full distance over the entire animation duration
        const wavePosition = easedProgress * 1.5; // Wave travels from 0 to 1.5 over full duration

        // Use a smaller dash size and adjust gap based on wave position
        line.material.uniforms.dashSize.value = 0.2; // Smaller dashes for smoother effect
        line.material.uniforms.gapSize.value = Math.max(0, 0.8 - wavePosition); // Gap shrinks as wave passes
        line.material.uniforms.dashOffset.value = -wavePosition; // Move the wave forward
      }

      // Set all points visible but they'll be controlled by the shader
      line.geometry.setDrawRange(0, totalPoints);
    });

    if (progress < 1) {
      requestAnimationFrame(animateBorder);
    } else {
      // Animation complete - make the entire line solid and visible
      borderGroup.children.forEach((line) => {
        if (line.material.uniforms) {
          line.material.uniforms.dashOffset.value = 0.0;
          line.material.uniforms.dashSize.value = 1.0; // Solid line
          line.material.uniforms.gapSize.value = 0.0; // No gaps
        }
      });
      console.log(
        "[Border Animation] Animation complete for",
        countryFeature.countryName
      );
    }
  }

  // Easing function to make the animation smoother
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Start animation after a small delay to ensure everything is set up
  setTimeout(() => {
    requestAnimationFrame(animateBorder);
  }, 100);
}

// Function to trigger border animation when camera reaches COUNTRY_TO_COUNTRY_ZOOM_DISTANCE
export function triggerBorderAnimationAtZoomDistance() {
  if (
    !currentHighlightedCountry ||
    borderAnimationTriggered ||
    !shouldTriggerBorderAnimation
  ) {
    return;
  }

  const currentDistance = camera.position.length();
  const targetDistance = COUNTRY_TO_COUNTRY_ZOOM_DISTANCE;
  const tolerance = 5; // Allow for small distance variations

  // Check if camera is at or near the target zoom distance
  if (Math.abs(currentDistance - targetDistance) <= tolerance) {
    console.log(
      `[Border Animation] Triggering border animation at zoom distance: ${currentDistance.toFixed(
        2
      )} (target: ${targetDistance})`
    );

    // Start border animation for the currently highlighted country
    createAnimatedBorderOutline(currentHighlightedCountry);
    setBorderAnimationTriggered(true);
  }
}

// Function to reset border animation trigger state
export function resetBorderAnimationTrigger() {
  setBorderAnimationTriggered(false);
  setShouldTriggerBorderAnimation(false);
}

// Function to update border effects based on camera state and focus
export function updateBorderEffects() {
  // Update the globe's polygon styling
  updateCountryStyles();
}

// Function to update country styles including borders and glow effects
export function updateCountryStyles() {
  if (!globe || !countryPolygons.length) return;

  // Update polygon styling
  globe
    .polygonStrokeColor((d) => {
      if (d.isHighlighted) {
        // Use focused border color for highlighted countries
        // return focusedBorderColor;
        // return allcountries_border_color;
        return "rgba(200, 200, 200, 0.1)";
      }
      // Apply border to all countries in the world
      // return allcountries_border_color;
      return "rgba(200, 200, 200, 0.1)";
    })
    .polygonCapColor((d) => {
      return "rgba(200, 200, 200, 0.1)";
    })
    .polygonSideColor((d) => {
      return "rgba(200, 200, 200, 0.05)";
    })
    .polygonAltitude((d) => {
      // if (d.isHighlighted && !isCameraMoving) {
      //   if (enableGlow) {
      //     // Slightly more elevated when glowing
      //     return 0.025 * glowIntensity;
      //   } else {
      //     return 0.02;
      //   }
      // }
      return 0.01;
    });
}
