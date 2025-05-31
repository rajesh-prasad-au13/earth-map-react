import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import polylabel from "polylabel";
import { useAppContext, actions } from "../context/AppContext";
import { topCountries } from "../data/topCountries";
import { createEarth } from "./createEarth";
import { all } from "three/tsl";

export function useThreeJS(containerRef) {
  // Use centralized state management
  const { state, dispatch } = useAppContext();

  const [geojsonCountriesData, setGeojsonCountriesData] = useState(null);

  // State for country interaction
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // State for camera movement (local state)
  const [isCameraMoving, setIsCameraMoving] = useState(false);
  const [shouldTriggerBorderAnimation, setShouldTriggerBorderAnimation] =
    useState(false);
  const [borderAnimationTriggered, setBorderAnimationTriggered] =
    useState(false);

  // Use showFlags from context instead of local state
  const showFlags = state.countries.showFlags;

  // Add a ref to track auto-animation state more reliably
  const isAutoAnimatingRef = useRef(false);

  // Add a ref to prevent double camera animations
  const isCameraAnimatingRef = useRef(false);
  const currentAnimationIdRef = useRef(null);

  // Refs for Three.js objects that need to persist
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Refs for border animation
  const borderAnimationObjects = useRef([]);
  const borderAnimationFrameId = useRef(null);
  const cloudsMeshRef = useRef(null);
  const activeBorderOutlineRef = useRef(null);
  const centroidMarkerRef = useRef(null); // For centroid visualization
  const flagLoadingTimeoutRef = useRef(null);
  const globeRef = useRef(null); // For three-globe instance

  // Animation constants from centralized state (adjusted for three-globe radius 50)
  const INITIAL_ZOOM_DISTANCE = state.INITIAL_ZOOM_DISTANCE;
  const COUNTRY_VIEW_ZOOM_DISTANCE = state.COUNTRY_VIEW_ZOOM_DISTANCE;

  // --- Load GeoJSON Data ---
  useEffect(() => {
    fetch("/countries.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setGeojsonCountriesData(data);
      })
      .catch((error) => {
        console.error("FETCH: Error loading GeoJSON data:", error);
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current || !geojsonCountriesData) return;

    // --- Scene, Camera, Renderer, Controls Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000 // Increased far plane for larger three-globe (radius 100)
    );

    if (state && state.camera && state.camera.position) {
      camera.position.set(
        state.camera.position.x,
        state.camera.position.y,
        state.camera.position.z
      );
    } else {
      camera.position.z = INITIAL_ZOOM_DISTANCE; // Default camera position for three-globe
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011, 1);

    // Clear any existing canvas before adding new one
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    containerRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50; // Min zoom for three-globe (allow camera to reach 150)
    controls.maxDistance = 500; // Max zoom for three-globe
    controls.enablePan = true; // Allow panning

    // Add camera movement tracking for flag effects
    controls.addEventListener("start", () => {
      setIsCameraMoving(true);
      console.log("[Camera] Movement started, hiding flags");
    });

    controls.addEventListener("end", () => {
      // Delay to ensure camera has stopped
      setTimeout(() => {
        setIsCameraMoving(false);
        console.log("[Camera] Movement ended, flags can be shown");
      }, 500);
    });

    // --- Lighting ---
    // Main directional light that will follow the camera (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
    // Initial position will be updated in animation loop
    directionalLight.position.set(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );
    // Create and add a target for the directional light
    directionalLight.target = new THREE.Object3D();
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight.target);
    scene.add(directionalLight);

    // Slightly offset additional light to soften shadows and create more balanced lighting
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Ambient light for minimal illumination of dark side
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2); // Reduced ambient for more contrast
    scene.add(ambientLight);

    // --- Three-Globe Setup (Primary Earth) ---
    // Create a new ThreeGlobe instance as our main Earth
    const globe = createEarth(scene);

    // Position the globe at center - no scaling needed since this IS our earth
    globe.position.set(0, 0, 0);
    scene.add(globe);

    // CRITICAL: Check three-globe's internal radius

    // Store reference - we'll reapply transforms after polygon data changes
    globeRef.current = globe;

    // Store references for cleanup and later access
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    globeRef.current = globe;

    // --- Mouse Event Handlers for Country Interaction ---
    const handleMouseMove = (event) => {
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Check for intersections with three-globe object
      const intersects = raycasterRef.current.intersectObject(globe, true);

      if (intersects.length > 0) {
        // We'll need to implement country detection using three-globe's built-in methods
        // For now, just indicate we're hovering over the globe
        renderer.domElement.style.cursor = "pointer";

        // TODO: Implement proper country detection using three-globe's methods
        // This would require accessing the polygon data and doing point-in-polygon tests
      } else {
        if (hoveredCountry) {
          setHoveredCountry(null);
          dispatch(actions.hoverCountry(null));
          renderer.domElement.style.cursor = "default";
        }
      }
    };

    const handleMouseClick = (event) => {
      if (isAnimating) return;

      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Check for intersections with three-globe object
      const intersects = raycasterRef.current.intersectObject(globe, true);

      if (intersects.length > 0) {
        // TODO: Implement proper country detection using three-globe's methods
        console.log("Clicked on globe at point:", intersects[0].point);

        // For now, we'll rely on the auto-animation and manual country selection
        // Rather than implementing complex click-to-country detection
      }
    };

    // Add event listeners
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleMouseClick);

    // --- Clouds Layer ---
    const cloudGeometry = new THREE.SphereGeometry(2.05, 64, 64); // Slightly larger than Earth
    const textureLoader = new THREE.TextureLoader();
    const cloudTexture = textureLoader.load("/Clouds.png");
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.6, // Adjust cloud opacity
      blending: THREE.AdditiveBlending, // Optional: for a brighter/softer cloud appearance
    });
    const cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudsMeshRef.current = cloudsMesh;
    // scene.add(cloudsMesh);

    // --- Animation Loop ---
    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);

      controls.update();

      // Set auto-rotate from state
      controls.autoRotate = state.camera.autoRotate;
      controls.autoRotateSpeed = state.camera.rotationSpeed * 10; // Scale to reasonable speed

      // Update directional light to follow camera position
      // Position the light to come from the camera's direction but from further out
      // This creates a sun-like effect that follows the viewer's perspective
      const lightOffset = 500; // Large distance for more parallel light rays (sun-like)

      // Copy camera position first
      directionalLight.position.copy(camera.position);

      // Set target to the center of the scene (origin)
      directionalLight.target.position.set(0, 0, 0);

      // Position light further away in same direction
      directionalLight.position.normalize().multiplyScalar(lightOffset);

      // Optional: Add slight upward/sideways bias for more interesting shadows
      directionalLight.position.y += lightOffset * 0.2; // 20% upward bias
      directionalLight.position.x += lightOffset * 0.1; // 10% sideways bias

      // Ensure light is still pointing at the origin/earth
      directionalLight.lookAt(0, 0, 0);

      // Update the light target
      directionalLight.target.updateMatrixWorld();

      // Globe rotation - only if we're not auto-rotating with controls
      if (globeRef.current && !state.camera.autoRotate) {
        if (state.animation.isPlaying) {
          globeRef.current.rotation.y += 0.002;
        }
      }

      // Clouds rotation - always rotate for visual effect
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0015;
        cloudsMeshRef.current.rotation.x += 0.0005;

        // Show or hide clouds based on settings
        cloudsMeshRef.current.visible = state.earth.texture === "clouds";
      }

      renderer.render(scene, camera);
    }
    animate();

    // load country data
    try {
      // Store ALL country polygons for later use - not just top countries
      const allCountryPolygons = geojsonCountriesData.features.map(
        (feature) => {
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
        }
      );
      // setCountryPolygons(allCountryPolygons);

      // Set up the globe with country polygons
      globeRef.current
        .polygonsData(allCountryPolygons)
        .polygonGeoJsonGeometry((d) => d.geometry)
        .polygonCapColor((d) => {
          return "rgba(200, 200, 200, 0.1)";
        })
        .polygonSideColor((d) => {
          return "rgba(200, 200, 200, 0.05)";
        })
        .polygonStrokeColor((d) => {
          if (
            d.isHighlighted &&
            !isCameraMoving &&
            state.countries.enableGlow
          ) {
            return state.countries.highlightColor;
          }
          return state.countries.allcountries_border_color; // Use the global border color for all countries
        })
        .polygonAltitude((d) => {
          if (d.isHighlighted && !isCameraMoving) {
            if (state.countries.glowIntensity) {
              return 0.025 * state.countries.glowIntensity;
            } else {
              return 0.02;
            }
          }
          return 0.001;
        })
        .polygonCapMaterial((d) => {
          if (
            d.isHighlighted &&
            d.flagTexture &&
            !isCameraMoving &&
            showFlags
          ) {
            return new THREE.MeshBasicMaterial({
              map: d.flagTexture,
              transparent: true,
              opacity: 1,
              side: THREE.DoubleSide,
            });
          }
          return undefined; // Use default color
        });

      // Initialize default styles
      updateCountryStyles();
    } catch (err) {
      console.error("Error loading data:", err);
    }

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      console.log("CLEANUP: Starting Three.js cleanup");

      window.removeEventListener("resize", handleResize);

      // Remove mouse event listeners
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.removeEventListener(
          "mousemove",
          handleMouseMove
        );
        rendererRef.current.domElement.removeEventListener(
          "click",
          handleMouseClick
        );
      }

      // Remove canvas from DOM
      if (
        containerRef.current &&
        renderer.domElement &&
        containerRef.current.contains(renderer.domElement)
      ) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Dispose renderer and controls
      renderer.dispose();
      controls.dispose();

      // Clear refs
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;

      // Remove centroid marker
      removeCentroidMarker();

      // Dispose Clouds materials and geometry
      if (cloudsMeshRef.current) {
        const cloudsMesh = cloudsMeshRef.current;
        cloudsMesh.material?.dispose();
        cloudsMesh.geometry?.dispose();
        cloudsMesh.material?.map?.dispose();
      }

      // Dispose active border outline
      if (activeBorderOutlineRef.current) {
        activeBorderOutlineRef.current.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        scene.remove(activeBorderOutlineRef.current);
      }

      // Dispose centroid marker if it exists
      if (centroidMarkerRef.current) {
        scene.remove(centroidMarkerRef.current);
        centroidMarkerRef.current.geometry.dispose();
        centroidMarkerRef.current.material.dispose();
      }

      cancelAnimationFrame(animationId);
    };
    // Add geojsonCountriesData to dependency array
  }, [
    containerRef,
    state && state.camera && state.camera.position,
    geojsonCountriesData,
  ]);

  function updateCountryStyles() {
    if (!globeRef.current || !geojsonCountriesData.features.length) return;

    // Update polygon styling
    globeRef.current
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
      .polygonStrokeColor((d) => {
        if (d.isHighlighted) {
          return "rgb(224, 227, 25)";
        }
        return "rgb(246, 9, 9)";
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

  // --- Country Highlighting Functions ---
  const highlightCountry = (countryCode, countryName) => {
    console.log(`Highlighting country: ${countryName} (${countryCode})`);

    // Clear any existing highlighted country
    clearCountryHighlight();

    // Use our flexible country finding function
    const targetCountry = findCountryByCode(countryCode, countryName);

    if (!targetCountry) {
      console.warn(
        `Country not found for code: ${countryCode}, name: ${countryName}`
      );
      // Find the next country to keep auto-animation going
      if (state.animation.isAutoAnimating) {
        const nextIndex =
          (state.animation.currentCountryIndex + 1) % topCountries.length;
        console.log(`Skipping to next country index: ${nextIndex}`);
        dispatch(actions.setCurrentCountryIndex(nextIndex));
      }
      return;
    }

    // Update context to mark this country as selected
    dispatch(actions.selectCountry(countryName));
    setSelectedCountry({ countryCode, countryName, feature: targetCountry });

    // Note: Border glow disabled - using flag-textured polygons instead
    // createCountryBorderGlow(targetCountry, countryName);

    // Clear any existing flag loading timeout
    if (flagLoadingTimeoutRef.current) {
      clearTimeout(flagLoadingTimeoutRef.current);
      flagLoadingTimeoutRef.current = null;
    }
  };

  const clearCountryHighlight = () => {
    // Clear any pending flag loading timeout
    if (flagLoadingTimeoutRef.current) {
      clearTimeout(flagLoadingTimeoutRef.current);
      flagLoadingTimeoutRef.current = null;
    }

    // Reset all country polygons to default state instead of clearing them
    if (globeRef.current && geojsonCountriesData) {
      const allCountryPolygons = geojsonCountriesData.features.map(
        (feature) => {
          const topCountry = topCountries.find(
            (c) => c.code === feature.properties.ISO_A3
          );

          return {
            ...feature,
            countryName: feature.properties.ADMIN || feature.properties.NAME,
            countryCode: feature.properties.ISO_A3,
            isTopCountry: !!topCountry,
            isHighlighted: false, // Reset highlight state
          };
        }
      );

      globeRef.current.polygonsData(allCountryPolygons);
    }

    // Remove any existing border glow and flags
    if (activeBorderOutlineRef.current) {
      sceneRef.current.remove(activeBorderOutlineRef.current);

      // Clean up geometry and materials for all children (borders and flags)
      if (activeBorderOutlineRef.current.children) {
        activeBorderOutlineRef.current.children.forEach((child) => {
          // Clean up flag textures specifically
          if (child.userData?.type === "countryFlag" && child.material?.map) {
            child.material.map.dispose();
          }
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      } else {
        if (activeBorderOutlineRef.current.geometry)
          activeBorderOutlineRef.current.geometry.dispose();
        if (activeBorderOutlineRef.current.material) {
          // Clean up texture if it's a flag
          if (activeBorderOutlineRef.current.material.map) {
            activeBorderOutlineRef.current.material.map.dispose();
          }
          activeBorderOutlineRef.current.material.dispose();
        }
      }

      activeBorderOutlineRef.current = null;
    }

    // Also clean up any standalone flag meshes and border glows that might exist
    if (sceneRef.current) {
      const elementsToRemove = [];
      sceneRef.current.traverse((child) => {
        if (
          child.userData?.type === "countryFlag" ||
          child.userData?.type === "countryBorderGlow"
        ) {
          elementsToRemove.push(child);
        }
      });

      elementsToRemove.forEach((element) => {
        try {
          sceneRef.current.remove(element);
          if (element.material?.map) element.material.map.dispose();
          if (element.geometry) element.geometry.dispose();
          if (element.material) element.material.dispose();
        } catch (error) {
          console.warn("Error cleaning up element:", error);
        }
      });
    }

    // Remove centroid marker
    removeCentroidMarker();

    // Clear selected country
    setSelectedCountry(null);
    dispatch(actions.selectCountry(null));
  };

  // Function to create a visual marker at the centroid point
  const createCentroidMarker = (lat, lng, countryName) => {
    // Remove any existing centroid marker
    removeCentroidMarker();

    if (!sceneRef.current || !globeRef.current) return;

    console.log(
      `[CENTROID] Creating marker for ${countryName} at lat=${lat.toFixed(
        4
      )}, lng=${lng.toFixed(4)}`
    );

    // Use three-globe's native object positioning system instead of manual conversion
    // This ensures the marker uses the same coordinate system as the country polygons
    const markerData = [
      {
        lat: lat,
        lng: lng,
        name: countryName,
      },
    ];

    // Configure three-globe to render custom objects at these coordinates
    globeRef.current
      .objectsData(markerData)
      .objectLat((d) => d.lat)
      .objectLng((d) => d.lng)
      .objectAltitude(0.05) // Small altitude above the surface
      .objectThreeObject((d) => {
        // Create a bright cyan sphere
        const markerGeometry = new THREE.SphereGeometry(2.0, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff, // Bright cyan color
          transparent: false,
          opacity: 1.0,
          emissive: 0x008888, // Strong emissive glow
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.userData = { type: "centroidMarker", countryName: d.name };

        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(3.0, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.6,
          side: THREE.BackSide,
          emissive: 0x004444,
        });

        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        marker.add(glow); // Add glow as child of marker

        return marker;
      });

    // Store reference for cleanup
    centroidMarkerRef.current = { usingThreeGlobe: true };
  };

  // Function to remove the centroid marker
  const removeCentroidMarker = () => {
    if (centroidMarkerRef.current) {
      if (centroidMarkerRef.current.usingThreeGlobe && globeRef.current) {
        // Clear three-globe objects
        globeRef.current.objectsData([]);
      } else if (sceneRef.current) {
        // Handle old manual markers (fallback)
        const { marker, glow } = centroidMarkerRef.current;

        if (marker) {
          sceneRef.current.remove(marker);
          marker.geometry?.dispose();
          marker.material?.dispose();
        }

        if (glow) {
          sceneRef.current.remove(glow);
          glow.geometry?.dispose();
          glow.material?.dispose();
        }
      }

      centroidMarkerRef.current = null;
    }
  };

  const displayCountryFlag = (countryName, countryFeature) => {
    // Skip flag display if disabled in settings
    if (state.countries.showFlags === false) {
      return;
    }

    if (!countryFeature || !countryName) {
      console.warn("Missing country data for flag display");
      return;
    }

    console.log(`[Flag Display] Starting flag display for: ${countryName}`);
    console.log(`[Flag Display] Country feature:`, countryFeature);

    // Generate a clean country name for the flag file
    const countryNameStr = String(countryName);
    const cleanCountryName = countryNameStr.replace(/\s+/g, " ").trim();

    const flagPath = `/flags/${cleanCountryName}.png`;
    console.log(`[Flag Display] Raw country name: "${countryName}"`);
    console.log(`[Flag Display] Clean country name: "${cleanCountryName}"`);
    console.log(`[Flag Display] Flag path: "${flagPath}"`);
    console.log(`[Flag Display] showFlags setting:`, state.countries.showFlags);

    // Clear any existing flag loading timeout
    if (flagLoadingTimeoutRef.current) {
      clearTimeout(flagLoadingTimeoutRef.current);
      flagLoadingTimeoutRef.current = null;
    }

    // Set a loading timeout so we don't wait forever
    flagLoadingTimeoutRef.current = setTimeout(() => {
      console.warn(`[Flag Display] Flag loading timed out for ${countryName}`);
      createFlagFilledCountry(countryFeature, null, countryName);
    }, 3000);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      flagPath,
      (texture) => {
        clearTimeout(flagLoadingTimeoutRef.current);
        flagLoadingTimeoutRef.current = null;

        // Configure texture for better appearance
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        console.log(
          `[Flag Display] Flag texture loaded successfully for ${countryName}`
        );

        // Create flag-filled country
        createFlagFilledCountry(countryFeature, texture, countryName);
      },
      undefined,
      (error) => {
        clearTimeout(flagLoadingTimeoutRef.current);
        flagLoadingTimeoutRef.current = null;
        console.error(
          `[Flag Display] Could not load flag texture for ${countryName}:`
        );
        console.error(`[Flag Display] Flag path attempted: ${flagPath}`);
        console.error(`[Flag Display] Error details:`, error);
        console.error(`[Flag Display] Error message:`, error.message);
        console.error(`[Flag Display] Error status:`, error.status);

        // Still create highlight even without flag
        createFlagFilledCountry(countryFeature, null, countryName);
      }
    );
  };

  const createFlagFilledCountry = (
    countryFeature,
    flagTexture,
    countryName
  ) => {
    console.log(`[Flag Filled Country] Starting creation for: ${countryName}`);
    console.log(`[Flag Filled Country] Has flag texture:`, !!flagTexture);
    console.log(
      `[Flag Filled Country] Camera currently animating:`,
      isCameraAnimatingRef.current
    );
    console.log(
      `[Flag Filled Country] Current animation ID:`,
      currentAnimationIdRef.current
    );
    console.log(
      `[Flag Filled Country] Country feature geometry type:`,
      countryFeature?.geometry?.type
    );

    if (!countryFeature || !countryFeature.geometry || !globeRef.current) {
      console.warn(
        "[Flag Filled Country] Missing country feature or globe instance"
      );
      return;
    }

    console.log(
      `[Flag Filled Country] Creating flag-filled country for: ${countryName}`
    );

    // Create a polygon data object for three-globe
    // Using standard GeoJSON format that three-globe can understand
    const polygonData = {
      ...countryFeature,
      flagTexture: flagTexture, // This is key - attach texture to data
      countryName: countryName,
      isHighlighted: true,
      // Calculate country centroid for camera positioning and marker
      centroid: calculateCountryCentroid(countryFeature),
    };

    console.log(
      `[Flag Filled Country] Created polygon data with texture:`,
      !!flagTexture
    );
    console.log(
      `[Flag Filled Country] Country centroid:`,
      polygonData.centroid
    );

    // Use an accessor function for altitude to ensure it's applied per polygon
    globeRef.current.polygonAltitude((d) => {
      // Use small altitude values since we're using globe's natural coordinate system
      // return 0.01; // Small positive altitude above the globe surface
      return 0.005; // 0.01 initially-  Small positive altitude above the globe surface
    });

    // Instead of clearing all polygons and showing only one,
    // update all countries with the highlighting information
    if (geojsonCountriesData) {
      const allCountryPolygons = geojsonCountriesData.features.map(
        (feature) => {
          const topCountry = topCountries.find(
            (c) => c.code === feature.properties.ISO_A3
          );

          const isCurrentCountry =
            feature.properties.ADMIN === countryName ||
            feature.properties.NAME === countryName ||
            feature.properties.ISO_A3 === polygonData.countryCode;

          return {
            ...feature,
            countryName: feature.properties.ADMIN || feature.properties.NAME,
            countryCode: feature.properties.ISO_A3,
            isTopCountry: !!topCountry,
            isHighlighted: isCurrentCountry,
            flagTexture: isCurrentCountry ? flagTexture : null,
            centroid: isCurrentCountry ? polygonData.centroid : null,
          };
        }
      );

      // Update the globe with all countries, but with highlighting
      globeRef.current.polygonsData(allCountryPolygons);
    }

    // Force a scene update
    if (sceneRef.current) {
      sceneRef.current.updateMatrixWorld();
    }

    // Force a material update by resetting the accessor (will use the one we defined at initialization)
    if (flagTexture) {
      console.log(
        `[Flag Filled Country] Flag texture is available for ${countryName}`
      );

      // Make sure the texture is properly configured
      flagTexture.needsUpdate = true;
      flagTexture.minFilter = THREE.LinearFilter;
      flagTexture.magFilter = THREE.LinearFilter;

      // Log that we're using the accessor function that references polygon.flagTexture
      console.log(
        `[Flag Filled Country] Using material accessor for flag texture`
      );
    } else {
      console.log(
        `[Flag Filled Country] Using fallback color for ${countryName}`
      );
    }

    console.log(
      `[Flag Filled Country] Flag-filled country created for: ${countryName}`
    );
  };

  // --- Auto-Animation Functions ---
  const animateToCountry = (
    countryIndex = 0,
    callback = null,
    forceAnimate = false
  ) => {
    // Make sure we have valid data
    if (!topCountries || topCountries.length === 0) {
      console.error("[Auto-Animation] No countries data available");
      return;
    }

    // Handle loop back to start
    if (countryIndex >= topCountries.length) {
      console.log(
        "[Auto-Animation] Reached end of countries list, starting over"
      );
      dispatch(actions.setCurrentCountryIndex(0));
      setTimeout(() => animateToCountry(0, callback, forceAnimate), 1000);
      return;
    }

    // Make sure we're still in auto-animation mode, unless force flag is true
    if (!forceAnimate && !isAutoAnimatingRef.current) {
      return;
    }

    const country = topCountries[countryIndex];
    console.log(
      `[Auto-Animation] Moving to country ${countryIndex + 1}/${
        topCountries.length
      }: ${country.name}`
    );

    // logCameraPosition(`Start of animateToCountry for ${country.name}`);

    if (!geojsonCountriesData) {
      console.warn("[Auto-Animation] GeoJSON data not loaded yet");
      // Try again after a short delay
      setTimeout(() => {
        if (isAutoAnimatingRef.current) {
          animateToCountry(countryIndex, callback, forceAnimate);
        }
      }, 1000);
      return;
    }

    // Use our flexible country finding function
    const countryPolygon = findCountryByCode(country.code, country.name);

    if (!countryPolygon) {
      console.warn(
        `[Auto-Animation] Country not found: ${country.name} (${country.code})`
      );
      // Skip to next country
      setTimeout(() => {
        if (isAutoAnimatingRef.current) {
          dispatch(actions.nextCountry());
          animateToCountry(
            (countryIndex + 1) % topCountries.length,
            callback,
            forceAnimate
          );
        }
      }, 1000);
      return;
    }

    // Update context state
    dispatch(actions.selectCountry(country.name));
    dispatch(actions.setCurrentCountryIndex(countryIndex));

    // Highlight the country with visual effects
    console.log(`[Auto-Animation] Highlighting country: ${country.name}`);

    // Log current camera position before animation
    // logCameraPosition(`Before animating to ${country.name}`);

    highlightCountry(country.code, country.name);

    // Calculate country centroid using our improved function
    const centroid = calculateCountryCentroid(countryPolygon);

    if (!centroid || (centroid.lat === 0 && centroid.lng === 0)) {
      // Skip to next country on error
      setTimeout(() => {
        if (state.animation.isAutoAnimating) {
          dispatch(actions.nextCountry());
          animateToCountry((countryIndex + 1) % topCountries.length, callback);
        }
      }, 1000);
      return;
    }

    const avgLat = centroid.lat;
    const avgLng = centroid.lng;

    console.log(
      `[Auto-Animation] Calculated centroid for ${country.name}: lat=${avgLat}, lng=${avgLng}`
    );

    // Create visual marker at the centroid point
    createCentroidMarker(avgLat, avgLng, country.name);

    // Get the actual 3D position from three-globe's coordinate system
    // This ensures camera looks at the same position as the centroid marker
    const coordsResult = globeRef.current.getCoords(avgLat, avgLng, 0);

    // Convert to THREE.Vector3 if it's not already
    const targetPosition =
      coordsResult instanceof THREE.Vector3
        ? coordsResult
        : new THREE.Vector3(coordsResult.x, coordsResult.y, coordsResult.z);

    // Calculate final camera position based on direction from origin to target
    const targetDirection = targetPosition.clone().normalize();
    const cameraPosition = targetDirection
      .clone()
      .multiplyScalar(COUNTRY_VIEW_ZOOM_DISTANCE);

    // Reset border animation trigger state for new animation
    resetBorderAnimationTrigger();

    // Animate camera to country with improved multi-phase movement
    animateCameraToPosition(cameraPosition, targetPosition, () => {
      const currentCameraDistance = cameraRef.current?.position.length() || 0;

      // Phase 1: Border animation (starts immediately after camera animation)
      setTimeout(() => {
        console.log(
          `Triggering border animation for ${country.name} (${state.animation.borderAnimationTime}ms duration)`
        );

        // Trigger border animation here
        triggerBorderAnimationAtZoomDistance();

        // Phase 2: Flag animation (starts after border animation)
        setTimeout(() => {
          console.log(
            `Triggering flag display for ${country.name} (after ${state.animation.borderAnimationTime}ms border animation)`
          );

          // Find the target country for flag display
          const targetCountry = findCountryByCode(country.code, country.name);
          if (
            targetCountry &&
            (isAutoAnimatingRef.current ||
              selectedCountry?.countryCode === country.code)
          ) {
            displayCountryFlag(country.name, targetCountry);
          }

          // Phase 3: Wait before moving to next country
          setTimeout(() => {
            console.log(
              `Wait period complete for ${country.name} (${state.animation.afterFlagAnimationWaitFor}ms), moving to next country`
            );

            // Re-check the ref state at the time of execution
            if (isAutoAnimatingRef.current) {
              // logCameraPosition("Before moving to next country");
              console.log(`Moving to next country after ${country.name}`);
              dispatch(actions.nextCountry());
              animateToCountry(countryIndex + 1, callback);
            } else {
              console.log(
                `Auto-animation stopped (ref check), not proceeding to next country`
              );
            }
          }, state.animation.afterFlagAnimationWaitFor);
        }, state.animation.flagAnimationTime);
      }, 0); // Border animation starts immediately after camera animation completes
    });
  };

  const animateCameraToPosition = (
    cameraPosition,
    lookAtTarget,
    callback = null
  ) => {
    if (!cameraRef.current || !controlsRef.current) return;

    // Prevent double animations by checking if one is already in progress
    if (isCameraAnimatingRef.current) {
      return;
    }

    // Set animation flag and create unique animation ID
    isCameraAnimatingRef.current = true;
    const animationId = Date.now() + Math.random();
    currentAnimationIdRef.current = animationId;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    setIsAnimating(true);
    setIsCameraMoving(true);

    // Disable OrbitControls during animation to prevent interference
    controls.enabled = false;

    // Store starting positions
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startDistance = startPosition.length();

    // logCameraPosition("Simple animation start");

    // Final target position and distance
    const finalDirection = cameraPosition.clone().normalize();
    const finalDistance = COUNTRY_VIEW_ZOOM_DISTANCE;

    // Simple zoom out distance for smooth transition
    const zoomOutDistance = Math.max(
      state.COUNTRY_TO_COUNTRY_ZOOM_DISTANCE,
      startDistance + 50
    );

    // Animation phases with durations
    const ZOOM_OUT_DURATION = 1500; // 1.5 seconds to zoom out
    const ZOOM_IN_DURATION = 1500; // 1.5 seconds to zoom in
    const TOTAL_DURATION = ZOOM_OUT_DURATION + ZOOM_IN_DURATION;

    const startTime = Date.now();

    // Simple easing function
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateFrame = () => {
      // Check if this animation is still valid
      if (currentAnimationIdRef.current !== animationId) {
        return;
      }

      const elapsed = Date.now() - startTime;
      const totalProgress = Math.min(elapsed / TOTAL_DURATION, 1);

      let currentDistance, currentDirection, currentTarget;

      if (elapsed < ZOOM_OUT_DURATION) {
        // Phase 1: Zoom out from current position
        const phase1Progress = elapsed / ZOOM_OUT_DURATION;
        const easedProgress = easeInOutCubic(phase1Progress);

        // Keep same direction, just zoom out
        const startDirection = startPosition.clone().normalize();
        currentDistance = THREE.MathUtils.lerp(
          startDistance,
          zoomOutDistance,
          easedProgress
        );
        currentDirection = startDirection;
        currentTarget = startTarget.clone();
      } else {
        // Phase 2: Zoom in to target position
        const phase2Progress = (elapsed - ZOOM_OUT_DURATION) / ZOOM_IN_DURATION;
        const easedProgress = easeInOutCubic(phase2Progress);

        // Interpolate direction and zoom in
        const startDirection = startPosition.clone().normalize();

        // Use spherical interpolation for smooth direction change
        const startQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          startDirection
        );
        const endQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          finalDirection
        );
        const slerpedQuat = startQuat.clone().slerp(endQuat, easedProgress);
        currentDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(
          slerpedQuat
        );

        // Zoom in from zoom out distance to final distance
        currentDistance = THREE.MathUtils.lerp(
          zoomOutDistance,
          finalDistance,
          easedProgress
        );

        // Interpolate target
        currentTarget = startTarget.clone().lerp(lookAtTarget, easedProgress);

        // Trigger border animation when getting close to final position
        if (phase2Progress > 0.8) {
          triggerBorderAnimationAtZoomDistance();
        }
      }

      // Apply the calculated position and target
      camera.position.copy(currentDirection.multiplyScalar(currentDistance));
      controls.target.copy(currentTarget);

      if (totalProgress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        // Animation complete - set final position precisely
        const originalMinDistance = controls.minDistance;
        controls.minDistance = 0;

        // Set exact final position
        const finalCameraPosition = finalDirection
          .clone()
          .multiplyScalar(finalDistance);
        camera.position.copy(finalCameraPosition);
        controls.target.copy(lookAtTarget);
        controls.update();

        const actualDistance = camera.position.length();
        // Force position if needed
        if (Math.abs(actualDistance - finalDistance) > 1) {
          camera.position.copy(finalCameraPosition);
          camera.updateMatrixWorld(true);
        }

        // Restore controls
        controls.minDistance = originalMinDistance;
        controls.enabled = true;

        // Store position and cleanup
        dispatch(actions.setPreviousCameraPosition(camera.position.clone()));

        setIsAnimating(false);
        setIsCameraMoving(false);
        isCameraAnimatingRef.current = false;
        currentAnimationIdRef.current = null;

        // logCameraPosition("Simple animation end");

        if (callback) callback();
      }
    };

    requestAnimationFrame(animateFrame);
  };

  const startAutoAnimation = () => {
    console.log(`[Auto-Animation starting.......]`);
    // Set ref to true immediately
    isAutoAnimatingRef.current = true;

    dispatch(actions.startAutoAnimation());

    // Add a small delay to ensure the state is updated
    setTimeout(() => {
      // Force start the animation regardless of current state
      animateToCountry(0, null, true);
    }, 100);
  };

  const stopAutoAnimation = () => {
    console.log("[Auto-Animation stopping......]");
    isAutoAnimatingRef.current = false;

    // Clear any ongoing camera animation flags to prevent stuck state
    isCameraAnimatingRef.current = false;
    currentAnimationIdRef.current = null;

    dispatch(actions.stopAutoAnimation());
  };

  // Helper function to match country codes more flexibly
  const findCountryByCode = (countryCode, countryName) => {
    if (!geojsonCountriesData || !geojsonCountriesData.features) {
      console.warn("GeoJSON data not loaded yet");
      return null;
    }

    console.log(
      `[FIND COUNTRY] Looking for: code="${countryCode}", name="${countryName}"`
    );

    // First try exact code match (check multiple possible property names)
    let match = geojsonCountriesData.features.find((feature) => {
      const props = feature.properties;
      const possibleCodes = [
        props.ISO_A2,
        props.iso_a2,
        props.Iso_a2,
        props.ISO_A3,
        props.iso_a3,
        props.Iso_a3,
        props.ADM0_A3,
        props.adm0_a3,
        props.CODE,
        props.code,
        props.SOV_A3,
        props.sov_a3,
      ].filter(Boolean); // Remove null/undefined values

      const foundMatch = possibleCodes.some((code) => code === countryCode);
      // if (!foundMatch) {
      //   console.log(`[FIND COUNTRY] Code match found with properties:`, props);
      // }
      return foundMatch;
    });

    if (match) {
      console.log(
        `[FIND COUNTRY] ✓ Found by exact code match: ${
          match.properties.name || match.properties.NAME || "unnamed"
        }`
      );
      return match;
    }

    // If no exact match, try by name
    match = geojsonCountriesData.features.find((feature) => {
      const props = feature.properties;
      const possibleNames = [
        props.name,
        props.NAME,
        props.Name,
        props.NAME_EN,
        props.name_en,
        props.ADMIN,
        props.admin,
        props.NAME_LONG,
        props.name_long,
      ].filter(Boolean);

      const foundMatch = possibleNames.some(
        (name) => name.toLowerCase() === countryName.toLowerCase()
      );
      return foundMatch;
    });

    if (match) {
      console.log(
        `[FIND COUNTRY] ✓ Found by exact name match: ${
          match.properties.name || match.properties.NAME || "unnamed"
        }`
      );
      return match;
    }

    // Special cases for common mismatches
    const specialCases = {
      USA: ["United States", "US", "United States of America", "America"],
      CAN: ["Canada"],
      CHN: ["China", "People's Republic of China"],
      BRA: ["Brazil", "Brasil"],
      AUS: ["Australia"],
      IND: ["India"],
      ARG: ["Argentina"],
      KAZ: ["Kazakhstan"],
      DZA: ["Algeria"],
    };

    if (specialCases[countryCode]) {
      match = geojsonCountriesData.features.find((feature) => {
        const props = feature.properties;
        const featureName = props.name || props.NAME || props.ADMIN || "";
        return specialCases[countryCode].some(
          (specialName) =>
            featureName.toLowerCase().includes(specialName.toLowerCase()) ||
            specialName.toLowerCase().includes(featureName.toLowerCase())
        );
      });

      if (match) {
        console.log(
          `[FIND COUNTRY] ✓ Found by special case: ${
            match.properties.name || match.properties.NAME || "unnamed"
          }`
        );
        return match;
      }
    }

    // Last resort: try fuzzy name matching (substring)
    match = geojsonCountriesData.features.find((feature) => {
      const props = feature.properties;
      const featureName = props.name || props.NAME || props.ADMIN || "";
      return (
        featureName.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(featureName.toLowerCase())
      );
    });

    if (match) {
      console.log(
        `[FIND COUNTRY] ✓ Found by fuzzy match: ${
          match.properties.name || match.properties.NAME || "unnamed"
        }`
      );
      return match;
    }

    console.warn(
      `[FIND COUNTRY] ✗ Could not find country for code: ${countryCode}, name: ${countryName}`
    );

    // Log a few sample country names from the GeoJSON for debugging
    const sampleNames = geojsonCountriesData.features
      .slice(0, 5)
      .map(
        (f) =>
          f.properties.name ||
          f.properties.NAME ||
          f.properties.ADMIN ||
          "unnamed"
      );

    return null;
  };

  // Debug sphere has been removed
  useEffect(() => {
    if (sceneRef.current && rendererRef.current) {
      // We've removed the debug sphere to keep the visuals clean

      // Force render to make sure it appears
      if (cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }

    // Cleanup function
    return () => {
      // Ensure border animations are cleaned up when component unmounts
      cleanupExistingBorderAnimation();
    };
  }, [sceneRef.current, rendererRef.current]);

  // Reset border animation trigger state for new animations
  const resetBorderAnimationTrigger = () => {
    setBorderAnimationTriggered(false);
    setShouldTriggerBorderAnimation(true);
  };

  // Function to trigger border animation when camera reaches COUNTRY_TO_COUNTRY_ZOOM_DISTANCE
  const triggerBorderAnimationAtZoomDistance = () => {
    // If there's no selected country, animation already triggered, or we shouldn't trigger it
    if (
      !selectedCountry ||
      borderAnimationTriggered ||
      !shouldTriggerBorderAnimation
    ) {
      return;
    }

    const currentDistance = cameraRef.current.position.length();
    const targetDistance = state.COUNTRY_TO_COUNTRY_ZOOM_DISTANCE;
    const tolerance = 5; // Allow for small distance variations

    // Check if camera is at or near the target zoom distance
    if (Math.abs(currentDistance - targetDistance) <= tolerance) {
      console.log(
        `[Border Animation] Triggering border animation at zoom distance: ${currentDistance.toFixed(
          2
        )} (target: ${targetDistance})`
      );

      // Create animated border outline for the currently highlighted country
      if (selectedCountry) {
        // Find the country feature in the GeoJSON data
        const countryCode = selectedCountry.code || selectedCountry.alpha3Code;
        const countryName = selectedCountry.name;

        // Find the country feature in the GeoJSON data
        const countryFeature = findCountryByCode(countryCode, countryName);

        if (countryFeature) {
          createAnimatedBorderOutline(countryFeature);
          setBorderAnimationTriggered(true);
        } else {
          console.warn(
            `[Border Animation] Could not find GeoJSON feature for ${countryName}`
          );
        }
      } else {
        console.warn(
          "[Border Animation] No country selected for border animation"
        );
      }
    }
  };

  // Create an animated border outline for the selected country
  const createAnimatedBorderOutline = (countryFeature) => {
    if (!countryFeature || !countryFeature.geometry) {
      console.warn("[Border Animation] Invalid country feature provided");
      return;
    }

    try {
      // Clean up any existing border animation
      cleanupExistingBorderAnimation();

      // Extract the coordinates from the feature
      const countryGeometry = countryFeature.geometry;
      const coordinates = extractAllCoordinates(countryGeometry);

      // Create the line segments for the border
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff, // White color
        linewidth: 3, // Line thickness
        opacity: 0.8, // Slight transparency
        transparent: true,
      });

      // Create animated border for each polygon in the country
      const borderObjects = [];

      coordinates.forEach((polygonCoords, index) => {
        // Create a line geometry from the coordinates
        const points = polygonCoords.map((coord) => {
          // Convert GeoJSON coordinates to globe coordinates
          // Note: Three-globe expects coordinates as [lng, lat]
          return new THREE.Vector3(coord[0], coord[1], 0.02); // Slight elevation
        });

        if (points.length < 3) return; // Skip invalid polygons

        // Close the loop if needed
        if (points[0] !== points[points.length - 1]) {
          points.push(points[0]);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);

        // Add to scene as child of the globe
        if (globeRef.current) {
          globeRef.current.add(line);
          borderObjects.push(line);
        }
      });

      // Store references to the created objects for later cleanup
      borderAnimationObjects.current = borderObjects;

      // Create pulsing animation effect
      animateBorders(borderObjects);
    } catch (error) {
      console.error(
        "[Border Animation] Error creating border animation:",
        error
      );
    }
  };

  // Helper to extract all coordinate arrays from a GeoJSON geometry
  const extractAllCoordinates = (geometry) => {
    const allCoords = [];

    if (geometry.type === "Polygon") {
      // For a Polygon, use the outer ring (first array of coordinates)
      allCoords.push(geometry.coordinates[0]);
    } else if (geometry.type === "MultiPolygon") {
      // For MultiPolygon, extract the outer ring of each polygon
      geometry.coordinates.forEach((polygon) => {
        allCoords.push(polygon[0]); // outer ring of each polygon
      });
    }

    return allCoords;
  };

  // Animate the border objects with a pulsing effect
  const animateBorders = (borderObjects) => {
    if (!borderObjects || borderObjects.length === 0) return;

    let pulseDirection = 1;
    let opacity = 0;

    const animatePulse = () => {
      // Cancel animation if component unmounted or animation turned off
      if (!borderAnimationObjects.current) return;

      // Update opacity with pulsing effect
      opacity += 0.03 * pulseDirection;

      // Reverse direction when reaching limits
      if (opacity >= 1) {
        pulseDirection = -1;
        opacity = 1;
      } else if (opacity <= 0.2) {
        pulseDirection = 1;
        opacity = 0.2;
      }

      // Apply opacity to all border objects
      borderObjects.forEach((line) => {
        if (line && line.material) {
          line.material.opacity = opacity;
        }
      });

      // Request next frame
      borderAnimationFrameId.current = requestAnimationFrame(animatePulse);
    };

    // Start animation
    borderAnimationFrameId.current = requestAnimationFrame(animatePulse);
  };

  // Clean up any existing border animation
  const cleanupExistingBorderAnimation = () => {
    // Cancel animation frame if active
    if (borderAnimationFrameId.current) {
      cancelAnimationFrame(borderAnimationFrameId.current);
      borderAnimationFrameId.current = null;
    }

    // Remove existing border objects
    if (
      borderAnimationObjects.current &&
      borderAnimationObjects.current.length > 0
    ) {
      borderAnimationObjects.current.forEach((obj) => {
        if (obj && globeRef.current) {
          globeRef.current.remove(obj);
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        }
      });
      borderAnimationObjects.current = [];
    }
  };

  // Debug function to monitor camera position
  const logCameraPosition = (context = "") => {
    if (cameraRef.current) {
      const pos = cameraRef.current.position;
      const distance = pos.length();
      console.log(
        `[CAMERA DEBUG] ${context}: position(${pos.x.toFixed(
          2
        )}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(
          2
        )}), distance=${distance.toFixed(2)}`
      );
    }
  };

  // Return interaction state for use in components
  return {
    selectedCountry,
    hoveredCountry,
    isAnimating,
    setSelectedCountry,
    setHoveredCountry,
    startAutoAnimation,
    stopAutoAnimation,
  };
}

// Calculate the center point (centroid) of a GeoJSON feature
const calculateCountryCentroid = (feature) => {
  if (!feature || !feature.geometry) {
    console.error("[Centroid] Invalid feature:", feature);
    return { lat: 0, lng: 0 };
  }

  const countryName =
    feature.properties?.name || feature.properties?.NAME || "Unknown";

  try {
    let targetPolygon = null;

    if (feature.geometry.type === "Polygon") {
      // For simple polygon, use the outer ring
      targetPolygon = feature.geometry.coordinates[0];
    } else if (feature.geometry.type === "MultiPolygon") {
      // For MultiPolygon, find the largest polygon by bounding box area (matches reference implementation)
      let maxArea = 0;
      let largestPolygon = null;
      let polygonIndex = 0;

      feature.geometry.coordinates.forEach((polygon, index) => {
        const coords = polygon[0]; // outer ring

        if (!coords || coords.length < 4) {
          console.warn(
            `[Centroid] Skipping invalid polygon ${index} for ${countryName}`
          );
          return;
        }

        // Calculate approximate area using bounding box (matches reference implementation)
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;

        coords.forEach(([lng, lat]) => {
          minX = Math.min(minX, lng);
          maxX = Math.max(maxX, lng);
          minY = Math.min(minY, lat);
          maxY = Math.max(maxY, lat);
        });

        const area = (maxX - minX) * (maxY - minY);

        if (area > maxArea) {
          maxArea = area;
          largestPolygon = coords;
          polygonIndex = index;
        }
      });

      targetPolygon = largestPolygon;
    }

    if (!targetPolygon || targetPolygon.length < 3) {
      console.warn(`[Centroid] No valid polygon found for ${countryName}`);
      return { lat: 0, lng: 0 };
    }

    // Use polylabel to find the pole of inaccessibility (visual center)
    const centroidPoint = polylabel([targetPolygon], 1.0);
    const [lng, lat] = centroidPoint;

    return { lat, lng };
  } catch (error) {
    console.error(
      `[Centroid] Error calculating polylabel centroid for ${countryName}:`,
      error
    );

    // Fallback to simple bounding box center
    if (feature.bbox && feature.bbox.length >= 4) {
      const [west, south, east, north] = feature.bbox;
      const centerLng = (west + east) / 2;
      const centerLat = (north + south) / 2;

      console.log(
        `[Centroid] Using BBOX fallback for ${countryName}: lat=${centerLat.toFixed(
          4
        )}, lng=${centerLng.toFixed(4)}`
      );
      return { lat: centerLat, lng: centerLng };
    }

    return { lat: 0, lng: 0 };
  }
};
