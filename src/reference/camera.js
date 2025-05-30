import {
  camera,
  controls,
  currentAnimation,
  animationTimeoutId,
  isCameraMoving,
  previousCountryCenter,
  previousCameraPosition,
  isAnimating,
  countryIndex,
  topCountries,
  showFlags,
  showRank,
  animationSpeed,
  flagAnimationType,
  INITIAL_ZOOM_DISTANCE,
  COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
  COUNTRY_VIEW_ZOOM_DISTANCE,
  setCurrentAnimation,
  setAnimationTimeoutId,
  setIsCameraMoving,
  setPreviousCountryCenter,
  setPreviouseCameraPosition,
  setCountryIndex,
  setShouldTriggerBorderAnimation,
  setBorderAnimationTriggered,
} from "../constants/state.js";
import {
  clearCountryHighlight,
  updateBorderEffects,
  triggerBorderAnimationAtZoomDistance,
  resetBorderAnimationTrigger,
} from "../components/countries.js";

// Helper function to animate camera to a target position
export function animateCameraToPosition(
  center,
  offset,
  countryName,
  onAnimationComplete
) {
  // Cancel previous animation if running
  if (currentAnimation) {
    currentAnimation.stop();
  }
  if (animationTimeoutId) {
    clearTimeout(animationTimeoutId); // Clear any pending timeout
    setAnimationTimeoutId(null);
  }

  // Hide flag initially
  const flagOverlay = document.getElementById("flag-overlay");
  const flagImg = document.getElementById("country-flag-img");
  if (flagOverlay) flagOverlay.classList.remove("visible");

  // Set camera as moving initially during animation
  setIsCameraMoving(true);

  // Reset border animation trigger state for new animation
  resetBorderAnimationTrigger();
  setShouldTriggerBorderAnimation(true);

  // Calculate initial and final camera positions
  const targetDirection = center.clone().normalize();

  // Store initial camera position for smooth transition
  const initialCameraPosition = camera.position.clone();

  // Get previous position if available, otherwise use current camera position
  const hasPreviousPosition =
    previousCountryCenter !== null && previousCameraPosition !== null;

  // Calculate final position
  const finalPosition = center
    .clone()
    .normalize()
    .multiplyScalar(COUNTRY_VIEW_ZOOM_DISTANCE);

  // --- Calculate angular distance for smooth, constant-speed animation ---
  // Use the angle between previous and target direction (in radians)
  let angularDistance = 0;
  if (hasPreviousPosition && previousCameraPosition) {
    const prevDir = previousCameraPosition.clone().normalize();
    angularDistance = prevDir.angleTo(targetDirection); // in radians
  } else {
    const startDir = initialCameraPosition.clone().normalize();
    angularDistance = startDir.angleTo(targetDirection);
  }

  // Set a constant angular speed (radians per second)
  const ANGULAR_SPEED = Math.PI / 2; // e.g., 90 degrees per second
  // Calculate duration based on angular distance
  // Minimum duration for very small moves (avoid instant jumps)
  const MIN_DURATION = 4000;
  let duration = Math.max(
    (angularDistance / ANGULAR_SPEED) * 1000,
    MIN_DURATION
  );

  // Animate camera position with arc movement
  const positionTween = new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .onUpdate(function (obj) {
      const t = obj.t;

      if (hasPreviousPosition && previousCameraPosition) {
        // COUNTRY-TO-COUNTRY TRAVEL MODE - Three phases: zoom out, travel, zoom in
        if (t < 0.25) {
          // Phase 1: Zoom out from current country to travel distance
          const normalizedT = t / 0.25;
          const currentDirection = previousCameraPosition.clone().normalize();
          const startDistance = previousCameraPosition.length();
          const zoomOutDistance = THREE.MathUtils.lerp(
            startDistance,
            COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
            normalizedT
          );
          camera.position.copy(
            currentDirection.clone().multiplyScalar(zoomOutDistance)
          );
          console.log(
            `Animation Phase 1 - Zoom Out: ${zoomOutDistance.toFixed(2)}`
          );

          // Trigger border animation when reaching target zoom distance
          if (
            Math.abs(zoomOutDistance - COUNTRY_TO_COUNTRY_ZOOM_DISTANCE) <= 5
          ) {
            triggerBorderAnimationAtZoomDistance();
          }
        } else if (t < 0.75) {
          // Phase 2: Travel between countries at default zoomed out level
          const normalizedT = (t - 0.25) / 0.5;
          const previousDir = previousCameraPosition.clone().normalize();
          const finalDir = targetDirection.clone();

          // Use spherical interpolation for smooth path
          const startQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            previousDir
          );
          const endQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            finalDir
          );

          const slerpedQuat = startQuat.clone().slerp(endQuat, normalizedT);
          const journeyDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(
            slerpedQuat
          );

          // Travel at travel zoom distance (most zoomed out during travel)
          camera.position.copy(
            journeyDirection.multiplyScalar(COUNTRY_TO_COUNTRY_ZOOM_DISTANCE)
          );
          console.log(
            `Animation Phase 2 - Travel: ${COUNTRY_TO_COUNTRY_ZOOM_DISTANCE}`
          );

          // Trigger border animation during travel phase
          triggerBorderAnimationAtZoomDistance();
        } else {
          // Phase 3: Zoom in to destination country
          const normalizedT = (t - 0.75) / 0.25;
          const zoomInDistance = THREE.MathUtils.lerp(
            COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
            COUNTRY_VIEW_ZOOM_DISTANCE,
            normalizedT
          );
          camera.position.copy(
            targetDirection.clone().multiplyScalar(zoomInDistance)
          );
          console.log(
            `Animation Phase 3 - Zoom In: ${zoomInDistance.toFixed(2)}`
          );
        }
      } else {
        // DIRECT MOVEMENT (FIRST COUNTRY OR AFTER MANUAL INTERACTION)
        // Check if this is the initial movement from INITIAL_ZOOM_DISTANCE
        const startDistance = initialCameraPosition.length();
        const isInitialMovement =
          Math.abs(startDistance - INITIAL_ZOOM_DISTANCE) < 10;

        if (isInitialMovement) {
          // THREE PHASES FOR INITIAL MOVEMENT: zoom out, travel, zoom in
          if (t < 0.33) {
            // Phase 1: Smooth zoom out from initial distance to travel distance
            const normalizedT = t / 0.33;
            const startDirection = initialCameraPosition.clone().normalize();
            const zoomOutDistance = THREE.MathUtils.lerp(
              INITIAL_ZOOM_DISTANCE,
              COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
              normalizedT
            );
            camera.position.copy(
              startDirection.clone().multiplyScalar(zoomOutDistance)
            );
            console.log(
              `Initial Movement Phase 1 - Zoom Out: ${zoomOutDistance.toFixed(
                2
              )}`
            );

            // Trigger border animation when reaching target zoom distance
            if (
              Math.abs(zoomOutDistance - COUNTRY_TO_COUNTRY_ZOOM_DISTANCE) <= 5
            ) {
              triggerBorderAnimationAtZoomDistance();
            }
          } else if (t < 0.67) {
            // Phase 2: Travel to target direction at travel distance
            const normalizedT = (t - 0.33) / 0.34;
            const startDirection = initialCameraPosition.clone().normalize();

            const startQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              startDirection
            );
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              targetDirection
            );

            const slerpedQuat = startQuat
              .clone()
              .slerp(targetQuat, normalizedT);
            const interpolatedDirection = new THREE.Vector3(
              0,
              1,
              0
            ).applyQuaternion(slerpedQuat);

            camera.position.copy(
              interpolatedDirection
                .clone()
                .multiplyScalar(COUNTRY_TO_COUNTRY_ZOOM_DISTANCE)
            );
            console.log(
              `Initial Movement Phase 2 - Travel: ${COUNTRY_TO_COUNTRY_ZOOM_DISTANCE}`
            );

            // Trigger border animation during travel phase
            triggerBorderAnimationAtZoomDistance();
          } else {
            // Phase 3: Zoom in to country level
            const normalizedT = (t - 0.67) / 0.33;
            const zoomInDistance = THREE.MathUtils.lerp(
              COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
              COUNTRY_VIEW_ZOOM_DISTANCE,
              normalizedT
            );
            camera.position.copy(
              targetDirection.clone().multiplyScalar(zoomInDistance)
            );
            console.log(
              `Initial Movement Phase 3 - Zoom In: ${zoomInDistance.toFixed(2)}`
            );
          }
        } else {
          // REGULAR DIRECT MOVEMENT (after manual interaction)
          if (t < 0.5) {
            // Phase 1: Move to target direction at default distance
            const normalizedT = t / 0.5;
            const startDirection = initialCameraPosition.clone().normalize();

            const startQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              startDirection
            );
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              targetDirection
            );

            const slerpedQuat = startQuat
              .clone()
              .slerp(targetQuat, normalizedT);
            const interpolatedDirection = new THREE.Vector3(
              0,
              1,
              0
            ).applyQuaternion(slerpedQuat);

            // Move to position above target country at travel distance
            camera.position.copy(
              interpolatedDirection
                .clone()
                .multiplyScalar(COUNTRY_TO_COUNTRY_ZOOM_DISTANCE)
            );
            console.log(
              `Direct Movement Phase 1 - Travel Distance: ${COUNTRY_TO_COUNTRY_ZOOM_DISTANCE}`
            );

            // Trigger border animation during travel phase
            triggerBorderAnimationAtZoomDistance();
          } else {
            // Phase 2: Zoom in to country level
            const normalizedT = (t - 0.5) / 0.5;
            const zoomInDistance = THREE.MathUtils.lerp(
              COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
              COUNTRY_VIEW_ZOOM_DISTANCE,
              normalizedT
            );
            camera.position.copy(
              targetDirection.clone().multiplyScalar(zoomInDistance)
            );
            console.log(
              `Direct Movement Phase 2 - Zoom In: ${zoomInDistance.toFixed(2)}`
            );
          }
        }
      }

      controls.update();
    })
    .onComplete(() => {
      // Ensure camera is at exact final position when animation completes
      const finalCameraPosition = center
        .clone()
        .normalize()
        .multiplyScalar(COUNTRY_VIEW_ZOOM_DISTANCE);
      camera.position.copy(finalCameraPosition);
      console.log(
        `Animation Complete - Final Position Set: ${COUNTRY_VIEW_ZOOM_DISTANCE}`
      );
      controls.update();
    })
    .start();

  // Animate camera target (pointing at country center)
  const prevTarget =
    previousCountryCenter !== null ? controls.target.clone() : center.clone();

  setCurrentAnimation(
    new TWEEN.Tween(controls.target)
      .to({ x: center.x, y: center.y, z: center.z }, duration)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(() => controls.update())
      .onComplete(() => {
        // Show country name and location marker
        const currentCountryDiv = document.getElementById("current-country");
        if (currentCountryDiv) {
          currentCountryDiv.textContent = countryName;
        }

        // Update country rank
        updateCountryRank(countryIndex);

        const locationMarker = document.getElementById("locationMarker");
        if (locationMarker) {
          locationMarker.style.display = "block";
        }

        // Camera animation is complete, so camera is now stationary
        setIsCameraMoving(false);

        // Show flag with animation (if enabled and camera is stationary)
        const country = topCountries.find((c) => c.name === countryName);
        if (country && showFlags && !isCameraMoving) {
          const flagOverlay = document.getElementById("flag-overlay");
          const flagImg = document.getElementById("country-flag-img");

          if (flagImg && flagOverlay) {
            flagImg.src = `./public/flags/${country.name}.png`;

            // Apply the selected animation type
            flagOverlay.className = ""; // Remove all classes
            flagOverlay.classList.add(flagAnimationType);
            flagOverlay.classList.add("visible");
          }
        }

        // Update border effects now that camera is stationary
        updateBorderEffects();

        // Store the current position to use for the next country transition
        setPreviousCountryCenter(center.clone());
        setPreviouseCameraPosition(camera.position.clone());

        if (isAnimating) {
          // Move to next country after delay using configurable speed
          setAnimationTimeoutId(
            setTimeout(() => {
              if (!isAnimating) return;

              // Hide label and marker
              const currentCountryDiv =
                document.getElementById("current-country");
              if (currentCountryDiv) {
                currentCountryDiv.textContent = "";
              }
              const locationMarker = document.getElementById("locationMarker");
              if (locationMarker) {
                locationMarker.style.display = "none";
              }
              // Hide flag overlay
              const flagOverlay = document.getElementById("flag-overlay");
              if (flagOverlay) flagOverlay.classList.remove("visible");

              // Clear country highlight
              clearCountryHighlight();

              // Increment country index and continue animation
              setCountryIndex((countryIndex + 1) % topCountries.length);
              if (onAnimationComplete) {
                onAnimationComplete();
              }
            }, animationSpeed)
          );
        }
      })
      .start()
  );
}

// Function to zoom out camera when no country is highlighted
export function zoomOutCamera() {
  const currentDistance = camera.position.length();
  console.log(
    `ZoomOut: Starting from ${currentDistance.toFixed(
      2
    )}, target: ${INITIAL_ZOOM_DISTANCE}`
  );

  if (currentAnimation) {
    currentAnimation.stop();
  }

  const direction = camera.position.clone().normalize();

  setCurrentAnimation(
    new TWEEN.Tween({ distance: currentDistance })
      .to({ distance: INITIAL_ZOOM_DISTANCE }, 2000) // 2 second zoom out to default
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        camera.position.copy(direction.clone().multiplyScalar(obj.distance));
        console.log(`ZoomOut Progress: ${obj.distance.toFixed(2)}`);
        if (controls) {
          controls.update();
        }
      })
      .start()
  );
}

// Update country rank display
export function updateCountryRank(index) {
  const rankDisplay = document.getElementById("country-rank");
  if (rankDisplay && showRank) {
    rankDisplay.textContent = `#${index + 1}`;
    rankDisplay.style.display = "block";
  }
}
