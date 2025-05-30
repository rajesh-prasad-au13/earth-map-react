import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useAppContext, actions } from "../context/AppContext";
import { topCountries } from "../data/topCountries";

export function useThreeJS(containerRef) {
  // Use centralized state management
  const { state, dispatch } = useAppContext();

  const [geojsonCountriesData, setGeojsonCountriesData] = useState(null);

  // State for country interaction
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Add a ref to track auto-animation state more reliably
  const isAutoAnimatingRef = useRef(false);

  // Refs for Three.js objects that need to persist
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const countryBordersRef = useRef(null);
  const earthMeshRef = useRef(null);
  const cloudsMeshRef = useRef(null);
  const activeBorderOutlineRef = useRef(null);
  const flagLoadingTimeoutRef = useRef(null);

  // Animation constants from centralized state
  const INITIAL_ZOOM_DISTANCE = state.INITIAL_ZOOM_DISTANCE / 70; // Scale down for our scene
  const COUNTRY_TO_COUNTRY_ZOOM_DISTANCE =
    state.COUNTRY_TO_COUNTRY_ZOOM_DISTANCE / 70;
  const COUNTRY_VIEW_ZOOM_DISTANCE = state.COUNTRY_VIEW_ZOOM_DISTANCE / 70;

  // --- Helper function to convert lat/lon to 3D position ---
  const latLonToVector3 = (lat, lon, radius) => {
    // Convert latitude and longitude from degrees to radians
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    // Calculate 3D position
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  };

  // --- Load GeoJSON Data ---
  useEffect(() => {
    console.log("FETCH: Starting GeoJSON fetch...");
    fetch("/countries.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("FETCH: Response received, parsing JSON...");
        return response.json();
      })
      .then((data) => {
        console.log(
          "FETCH: GeoJSON data loaded successfully:",
          data.features
            ? `${data.features.length} countries found`
            : "No features found"
        );

        // Log the first few features to understand the structure
        if (data.features && data.features.length > 0) {
          console.log(
            "FETCH: Sample feature properties:",
            data.features[0].properties
          );
          console.log(
            "FETCH: Available property keys:",
            Object.keys(data.features[0].properties)
          );
        }

        setGeojsonCountriesData(data);
      })
      .catch((error) => {
        console.error("FETCH: Error loading GeoJSON data:", error);
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log("RENDER: Starting main Three.js render effect");

    // Check if renderer already exists to prevent duplicate creation
    if (rendererRef.current) {
      console.log("RENDER: Renderer already exists, skipping creation");
      return;
    }

    // --- Scene, Camera, Renderer, Controls Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    if (state && state.camera && state.camera.position) {
      camera.position.set(
        state.camera.position.x,
        state.camera.position.y,
        state.camera.position.z
      );
    } else {
      camera.position.z = 5; // Default camera position
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
    controls.minDistance = 2.5; // Min zoom
    controls.maxDistance = 10; // Max zoom
    controls.enablePan = true; // Allow panning

    // --- Lighting ---
    // Main directional light that will follow the camera (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    // Initial position will be updated in animation loop
    directionalLight.position.set(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );
    scene.add(directionalLight);

    // Slightly offset additional light to soften shadows and create more balanced lighting
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Ambient light for minimal illumination of dark side
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2); // Reduced ambient for more contrast
    scene.add(ambientLight);

    // --- Earth Globe ---
    const textureLoader = new THREE.TextureLoader();
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64); // Increased segments for smoother sphere

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load("/Albedo.jpg"), // Base color texture
      // bumpMap: textureLoader.load("/Bump.jpg"), // Bump texture for surface details
      bumpScale: 0.05, // Adjust bump intensity
      specularMap: textureLoader.load("/Ocean.png"), // Specular map for water highlights
      specular: new THREE.Color("grey"), // Adjust specular color if needed
      shininess: 10, // Adjust shininess
      emissiveMap: textureLoader.load("/night_lights_modified.png"), // Night lights
      emissive: new THREE.Color(0xffffff), // Make emissive map visible
      emissiveIntensity: 0.8, // Adjust intensity of night lights
    });

    // Create the Earth mesh
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // Store references for cleanup and later access
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    earthMeshRef.current = earthMesh;

    // --- Mouse Event Handlers for Country Interaction ---
    const handleMouseMove = (event) => {
      if (!countryMeshes.length) return;

      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Check for intersections with country meshes
      const intersects = raycasterRef.current.intersectObjects(countryMeshes);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.userData.type === "country") {
          const newHoveredCountry = intersectedObject.userData;
          if (hoveredCountry?.countryCode !== newHoveredCountry.countryCode) {
            setHoveredCountry(newHoveredCountry);
            // Update context state
            dispatch(actions.hoverCountry(newHoveredCountry.countryName));
            // Change cursor to pointer
            renderer.domElement.style.cursor = "pointer";
            console.log("Hovered country:", newHoveredCountry.countryName);
          }
        }
      } else {
        if (hoveredCountry) {
          setHoveredCountry(null);
          // Update context state
          dispatch(actions.hoverCountry(null));
          renderer.domElement.style.cursor = "default";
        }
      }
    };

    const handleMouseClick = (event) => {
      if (!countryMeshes.length || isAnimating) return;

      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Check for intersections with country meshes
      const intersects = raycasterRef.current.intersectObjects(countryMeshes);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.userData.type === "country") {
          const clickedCountry = intersectedObject.userData;
          console.log("Clicked country:", clickedCountry.countryName);

          // Set selected country and trigger camera animation
          setSelectedCountry(clickedCountry);
          // Update context state
          dispatch(actions.selectCountry(clickedCountry.countryName));
          animateToCountry(clickedCountry, intersects[0].point);
        }
      }
    };

    // Add event listeners
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleMouseClick);

    // --- Country Animation Functions ---
    const animateToCountry = (countryData, targetPoint) => {
      console.log({ countryData });
      if (isAnimating) return;

      setIsAnimating(true);
      console.log(`Animating to country: ${countryData.countryName}`);

      // Calculate target camera position
      const targetDirection = targetPoint.clone().normalize();
      const targetPosition = targetDirection.multiplyScalar(
        COUNTRY_VIEW_ZOOM_DISTANCE
      );

      // Animate camera position
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();

      let animationProgress = 0;
      const animationDuration = 2000; // 2 seconds
      const startTime = Date.now();

      const animateStep = () => {
        const elapsed = Date.now() - startTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);

        // Easing function
        const eased = 1 - Math.pow(1 - animationProgress, 3); // Ease out cubic

        // Interpolate camera position
        camera.position.lerpVectors(startPosition, targetPosition, eased);

        // Interpolate controls target
        controls.target.lerpVectors(startTarget, targetPoint, eased);
        controls.update();

        if (animationProgress < 1) {
          requestAnimationFrame(animateStep);
        } else {
          setIsAnimating(false);
          console.log(`Animation complete for: ${countryData.countryName}`);

          // Create animated border outline
          createAnimatedBorderOutline(countryData);
        }
      };

      requestAnimationFrame(animateStep);
    };

    // Function to create animated border outline for selected country
    const createAnimatedBorderOutline = (countryData) => {
      // Clear any existing outline
      if (activeBorderOutlineRef.current) {
        scene.remove(activeBorderOutlineRef.current);
        activeBorderOutlineRef.current.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }

      // Find the country feature in GeoJSON data using our improved function
      const countryFeature = findCountryByCode(
        countryData.countryCode,
        countryData.countryName
      );

      if (!countryFeature) {
        console.warn(
          "Could not find country feature for border animation:",
          countryData
        );
        return;
      }

      // Create glowing border outline
      const borderGroup = new THREE.Group();
      const glowMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff, // Cyan color
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
      });

      // Process geometry for border outline
      let borderPoints = [];
      if (countryFeature.geometry.type === "Polygon") {
        borderPoints = countryFeature.geometry.coordinates[0].map(
          (coord) => latLonToVector3(coord[1], coord[0], 2.01) // Slightly above surface
        );
      } else if (countryFeature.geometry.type === "MultiPolygon") {
        // Use the largest polygon
        let largestPolygon = countryFeature.geometry.coordinates[0];
        let maxPoints = 0;
        countryFeature.geometry.coordinates.forEach((polygon) => {
          if (polygon[0].length > maxPoints) {
            maxPoints = polygon[0].length;
            largestPolygon = polygon;
          }
        });
        borderPoints = largestPolygon[0].map((coord) =>
          latLonToVector3(coord[1], coord[0], 2.01)
        );
      }

      if (borderPoints.length > 0) {
        // Close the loop
        borderPoints.push(borderPoints[0].clone());

        const geometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
        const line = new THREE.Line(geometry, glowMaterial);
        borderGroup.add(line);

        scene.add(borderGroup);
        activeBorderOutlineRef.current = borderGroup;

        console.log(`Created animated border for: ${countryData.countryName}`);
      }
    };

    // --- Clouds Layer ---
    const cloudGeometry = new THREE.SphereGeometry(2.05, 64, 64); // Slightly larger than Earth
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

    // --- Process GeoJSON Data to create country borders ---
    let countryBorders = null;
    let countryMeshes = []; // Store references to country meshes for raycasting

    if (geojsonCountriesData) {
      console.log("BORDERS: Processing GeoJSON data...");
      console.log(
        "BORDERS: Features count:",
        geojsonCountriesData.features?.length
      );

      // Create a group to hold all country lines
      countryBorders = new THREE.Group();
      countryBordersRef.current = countryBorders;

      // Material for the country borders
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff, // White borders
        transparent: true,
        opacity: 0.5, // Semi-transparent
        linewidth: 1, // WebGL has line width limitations, 1 is standard
      });

      let bordersCreated = 0;
      let pointsProcessed = 0;

      // Process each feature (country) and create both borders and clickable meshes
      if (geojsonCountriesData.features) {
        geojsonCountriesData.features.forEach((feature, index) => {
          const countryName =
            feature.properties.name || `Unknown Country ${index}`;
          const countryCode =
            feature.properties.iso_a2 ||
            feature.properties.iso_a3 ||
            `UNKNOWN_${index}`;

          // Only log the first few to avoid console spam
          if (index < 3) {
            console.log(`BORDERS: Processing country ${index}: ${countryName}`);
          }

          // Create clickable country mesh for interaction
          createCountryMesh(feature, countryMeshes, countryName, countryCode);

          // Process the geometry based on its type for borders
          if (feature.geometry.type === "Polygon") {
            processPolygon(
              feature.geometry.coordinates,
              countryBorders,
              lineMaterial,
              countryName
            );
            bordersCreated++;
          } else if (feature.geometry.type === "MultiPolygon") {
            // Handle multiple polygons (e.g., countries with islands)
            feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
              processPolygon(
                polygonCoords,
                countryBorders,
                lineMaterial,
                `${countryName} (Part ${polyIndex + 1})`
              );
              bordersCreated++;
            });
          } else {
            console.warn(
              `BORDERS: Unsupported geometry type: ${feature.geometry.type} for ${countryName}`
            );
          }

          // Debug only first few countries in detail to avoid console spam
          if (index < 3) {
            console.log(`BORDERS: Processed ${countryName}`, feature.geometry);
          }
        });
      } else {
        console.error("BORDERS: No features found in GeoJSON data");
      }

      console.log(
        `BORDERS: Created ${bordersCreated} borders with ${pointsProcessed} total points`
      );

      // Add the country borders group to the scene (not as child of Earth)
      scene.add(countryBorders);
      console.log("BORDERS: Added country borders group to scene");

      // Add country meshes to scene for raycasting
      countryMeshes.forEach((mesh) => {
        scene.add(mesh);
      });
      console.log(
        `BORDERS: Added ${countryMeshes.length} country meshes for interaction`
      );

      // Debug the first border to make sure it's visible
      if (countryBorders.children.length > 0) {
        const firstBorder = countryBorders.children[0];
        console.log("BORDERS: First border details:", {
          name: firstBorder.name,
          position: firstBorder.position,
          visible: firstBorder.visible,
          vertices: firstBorder.geometry.attributes.position.count,
          material: firstBorder.material,
        });
      }

      // Function to create clickable country mesh
      function createCountryMesh(feature, meshArray, countryName, countryCode) {
        const material = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0, // Invisible but clickable
        });

        if (feature.geometry.type === "Polygon") {
          const mesh = createPolygonMesh(
            feature.geometry.coordinates[0],
            material,
            countryName,
            countryCode
          );
          if (mesh) meshArray.push(mesh);
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
            const mesh = createPolygonMesh(
              polygonCoords[0],
              material,
              `${countryName} (Part ${polyIndex + 1})`,
              countryCode
            );
            if (mesh) meshArray.push(mesh);
          });
        }
      }

      // Function to create a polygon mesh from coordinates
      function createPolygonMesh(coordinates, material, name, countryCode) {
        if (coordinates.length < 3) return null;

        // Convert coordinates to 3D vectors
        const points = coordinates.map((coord) => {
          return latLonToVector3(coord[1], coord[0], 2.001); // Slightly closer to borders
        });

        // Create a simple triangulated mesh using the earcut algorithm approach
        // For now, we'll create a simplified version using the first few points
        const geometry = new THREE.BufferGeometry();

        // For complex polygons, we'd need proper triangulation
        // For simplicity, we'll create a basic mesh that covers the area
        const positions = [];
        const indices = [];

        // Add all points
        points.forEach((point) => {
          positions.push(point.x, point.y, point.z);
        });

        // Simple fan triangulation from first point
        for (let i = 1; i < points.length - 1; i++) {
          indices.push(0, i, i + 1);
        }

        geometry.setFromPoints(points);
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        mesh.userData = { countryCode, countryName: name, type: "country" };

        return mesh;
      }

      function processPolygon(polygonCoords, group, material, name) {
        // Each polygon is an array of linear rings (first is outer, rest are holes)
        // For simplicity, we'll just process the outer ring
        const outerRing = polygonCoords[0];

        // Create points for the line
        const points = [];
        outerRing.forEach((coord) => {
          // GeoJSON format is [longitude, latitude]
          // Use radius 2.005 (just barely above Earth radius of 2.0)
          // This positions borders very close to the Earth's surface
          // 2.02 was too large, making the borders appear to float
          const vector = latLonToVector3(coord[1], coord[0], 2.003); //2.02 by default by gpt
          points.push(vector);
          pointsProcessed++;
        });

        // Create a closed loop by adding the first point again
        if (points.length > 0) {
          points.push(points[0].clone());
          pointsProcessed++;
        }

        // Log points for first country for debugging
        if (
          name.includes("(Part 1)") ||
          (!name.includes("Part") && pointsProcessed < 100)
        ) {
          console.log(
            `BORDERS: First few points for ${name}:`,
            points.slice(0, 3)
          );
        }

        // Create the line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.name = name; // Set the name for later identification

        // Add to the group
        group.add(line);
      }
    } else {
      console.log("BORDERS: No GeoJSON data available yet");
    }

    // --- Animation Loop ---
    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);

      controls.update();

      // Set auto-rotate from state
      controls.autoRotate = state.camera.autoRotate;
      controls.autoRotateSpeed = state.camera.rotationSpeed * 10; // Scale to reasonable speed

      // Update directional light to follow camera position
      // Offset it slightly to create better illumination angle
      const lightOffset = 2; // Distance the light is positioned from camera
      directionalLight.position
        .copy(camera.position)
        .normalize()
        .multiplyScalar(lightOffset);

      // Optional: Add slight upward bias to the light for more realistic sun-like illumination
      directionalLight.position.y += 0.5;
      directionalLight.position.normalize().multiplyScalar(lightOffset);

      // Earth rotation - only if we're not auto-rotating with controls
      if (earthMeshRef.current && !state.camera.autoRotate) {
        if (state.animation.isPlaying) {
          earthMeshRef.current.rotation.y += 0.002;

          // Make country borders rotate with Earth
          if (countryBordersRef.current) {
            countryBordersRef.current.rotation.y =
              earthMeshRef.current.rotation.y;
          }
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

      // Dispose Earth materials and geometry
      earthMaterial.dispose();
      earthGeometry.dispose();
      earthMaterial.map?.dispose();
      earthMaterial.bumpMap?.dispose();
      earthMaterial.specularMap?.dispose();
      earthMaterial.emissiveMap?.dispose();

      // Dispose Clouds materials and geometry
      cloudMaterial.dispose();
      cloudGeometry.dispose();
      cloudTexture?.dispose();

      // Dispose country borders if they exist
      if (countryBorders) {
        countryBorders.traverse((object) => {
          if (object instanceof THREE.Line) {
            object.geometry.dispose();
            object.material.dispose();
          }
        });
        scene.remove(countryBorders);
      }

      // Dispose country meshes
      countryMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
        scene.remove(mesh);
      });

      // Dispose active border outline
      if (activeBorderOutlineRef.current) {
        activeBorderOutlineRef.current.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        scene.remove(activeBorderOutlineRef.current);
      }

      cancelAnimationFrame(animationId);
    };
    // Add geojsonCountriesData to dependency array
  }, [
    containerRef,
    state && state.camera && state.camera.position,
    geojsonCountriesData,
  ]);

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

    // Create glowing border effect for the highlighted country
    createCountryBorderGlow(targetCountry, countryName);

    // Clear any existing flag loading timeout
    if (flagLoadingTimeoutRef.current) {
      clearTimeout(flagLoadingTimeoutRef.current);
      flagLoadingTimeoutRef.current = null;
    }

    // Schedule flag display after delay (last 4 seconds of highlight)
    const flagDelay = state.animation.timeToWaitForHighlightedCountry - 4000;
    flagLoadingTimeoutRef.current = setTimeout(() => {
      if (selectedCountry?.countryCode === countryCode) {
        displayCountryFlag(countryName, targetCountry);
      }
    }, flagDelay);

    console.log(
      `[Highlight Country] Country highlighting complete for: ${countryName}`
    );
  };

  const clearCountryHighlight = () => {
    // Clear any pending flag loading timeout
    if (flagLoadingTimeoutRef.current) {
      clearTimeout(flagLoadingTimeoutRef.current);
      flagLoadingTimeoutRef.current = null;
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

    // Also clean up any standalone flag meshes that might exist
    if (sceneRef.current) {
      const flagMeshesToRemove = [];
      sceneRef.current.traverse((child) => {
        if (child.userData?.type === "countryFlag") {
          flagMeshesToRemove.push(child);
        }
      });

      flagMeshesToRemove.forEach((flagMesh) => {
        try {
          sceneRef.current.remove(flagMesh);
          if (flagMesh.material?.map) flagMesh.material.map.dispose();
          if (flagMesh.geometry) flagMesh.geometry.dispose();
          if (flagMesh.material) flagMesh.material.dispose();
        } catch (error) {
          console.warn("Error cleaning up flag mesh:", error);
        }
      });
    }

    // Clear selected country
    setSelectedCountry(null);
    dispatch(actions.selectCountry(null));
  };

  const createCountryBorderGlow = (countryFeature, countryName) => {
    // Skip if glow is disabled in settings
    if (state.countries.enableGlow === false) {
      return;
    }

    if (!countryFeature || !countryFeature.geometry) {
      console.warn("No country feature or geometry for border glow");
      return;
    }

    const coordinates = countryFeature.geometry.coordinates;
    const type = countryFeature.geometry.type;
    let borderPoints = [];

    // Extract border points from GeoJSON
    let pathCoordinates = [];
    if (type === "Polygon") {
      pathCoordinates = coordinates[0]; // Outer ring
    } else if (type === "MultiPolygon") {
      // Find the largest polygon for main outline
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

    // Convert lat/lon path to 3D points
    if (pathCoordinates && pathCoordinates.length > 0) {
      // Earth radius is 1.0 in our scene
      const earthRadius = 1.0;
      borderPoints = pathCoordinates.map((coord) => {
        return latLonToVector3(coord[1], coord[0], earthRadius + 0.002);
      });
    }

    if (borderPoints.length < 2) {
      console.warn("Not enough points for border glow");
      return;
    }

    // Create border path
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(
      borderPoints
    );

    // Use the highlight color from state
    const glowColor = state.countries.highlightColor;
    const glowIntensity = state.countries.glowIntensity || 1.0;

    // Create a line with glowing material
    const borderMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(glowColor),
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const borderLine = new THREE.Line(borderGeometry, borderMaterial);
    borderLine.userData = { type: "countryBorderGlow", countryName };
    sceneRef.current.add(borderLine);

    // Create an additional glow effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(glowColor) },
        viewVector: { value: cameraRef.current.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(1.0 - abs(dot(vNormal, vNormel)), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float intensity;
        void main() {
          vec3 glow = color * intensity;
          gl_FragColor = vec4(glow, 0.6);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.7 * glowIntensity,
    });

    // Create a slightly larger tube around the line for glow effect
    const tubeGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(borderPoints),
      borderPoints.length,
      0.003,
      8,
      false
    );

    const glowMesh = new THREE.Mesh(tubeGeometry, glowMaterial);
    glowMesh.userData = { type: "countryBorderGlow", countryName };
    sceneRef.current.add(glowMesh);

    // Store the glow and border objects for later removal
    if (!activeBorderOutlineRef.current) {
      activeBorderOutlineRef.current = [];
    }
    activeBorderOutlineRef.current.push(borderLine, glowMesh);

    return { borderLine, glowMesh };
  };

  const displayCountryFlag = (countryFeature, countryName) => {
    // Skip flag display if disabled in settings
    if (state.countries.showFlags === false) {
      return;
    }

    if (!countryFeature || !countryName) {
      console.warn("Missing country data for flag display");
      return;
    }

    // Clean up any previous flags to avoid memory leaks
    clearCountryHighlight();

    // Generate a clean country name for the flag file
    // Ensure countryName is a string before calling replace
    const countryNameStr = String(countryName);
    const cleanCountryName = countryNameStr.replace(/\s+/g, " ").trim();

    const flagPath = `/flags/${cleanCountryName}.png`;
    console.log(`Loading flag from path: ${flagPath}`);

    // Set a loading timeout so we don't wait forever
    flagLoadingTimeoutRef.current = setTimeout(() => {
      console.warn(`Flag loading timed out for ${countryName}`);
      applyFlagTextureToCountry(countryFeature, null, countryName);
    }, 3000);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      flagPath,
      (texture) => {
        clearTimeout(flagLoadingTimeoutRef.current);

        // Configure texture for better appearance
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        console.log(`Flag texture loaded successfully for ${countryName}`);

        // Apply the flag texture to the country
        applyFlagTextureToCountry(countryFeature, texture, countryName);
      },
      undefined,
      (error) => {
        clearTimeout(flagLoadingTimeoutRef.current);
        console.warn(`Could not load flag texture for ${countryName}:`, error);
        // Still apply a highlight even without flag
        applyFlagTextureToCountry(countryFeature, null, countryName);
      }
    );
  };

  const applyFlagTextureToCountry = (
    countryFeature,
    flagTexture,
    countryName
  ) => {
    if (!countryFeature || !countryFeature.geometry) {
      console.warn("No country feature for flag texture application");
      return;
    }

    // Calculate country center for flag placement
    const coordinates = countryFeature.geometry?.coordinates;
    const type = countryFeature.geometry?.type;
    let centerLat = 0,
      centerLon = 0,
      pointCount = 0;

    if (!coordinates || !type) {
      console.warn("Invalid country geometry for flag placement");
      return;
    }

    // Calculate centroid
    try {
      if (type === "Polygon" && coordinates[0]) {
        coordinates[0].forEach((coord) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            centerLon += coord[0];
            centerLat += coord[1];
            pointCount++;
          }
        });
      } else if (type === "MultiPolygon") {
        coordinates.forEach((polygon) => {
          if (polygon && polygon[0]) {
            polygon[0].forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                centerLon += coord[0];
                centerLat += coord[1];
                pointCount++;
              }
            });
          }
        });
      }
    } catch (error) {
      console.error("Error calculating country centroid:", error);
      return;
    }

    // Prevent division by zero
    if (pointCount === 0) {
      console.warn("No valid points found for flag placement");
      return;
    }

    centerLat /= pointCount;
    centerLon /= pointCount;

    // Convert to 3D position
    const flagPosition = latLonToVector3(centerLat, centerLon, 2.05);

    // Create flag plane geometry
    const flagWidth = 0.3;
    const flagHeight = 0.2;
    const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);

    // Create flag material
    let flagMaterial;
    if (flagTexture) {
      flagMaterial = new THREE.MeshBasicMaterial({
        map: flagTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
    } else {
      // Fallback material if flag texture fails to load
      flagMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
    }

    // Create flag mesh
    const flagMesh = new THREE.Mesh(flagGeometry, flagMaterial);

    // Position the flag at the country center
    flagMesh.position.copy(flagPosition);

    // Make the flag face the camera
    flagMesh.lookAt(cameraRef.current.position);

    // Add some rotation for a more natural look
    flagMesh.rotateZ(Math.random() * 0.2 - 0.1);

    // Store reference for cleanup
    flagMesh.userData = { type: "countryFlag", countryName };

    // Add flag directly to scene for now - it will be cleaned up by clearCountryHighlight
    sceneRef.current.add(flagMesh);

    // Add subtle animation to the flag
    const animateFlag = () => {
      if (flagMesh.parent) {
        const time = Date.now() * 0.001;
        flagMesh.rotation.x = Math.sin(time * 0.5) * 0.1;
        flagMesh.rotation.y = Math.sin(time * 0.3) * 0.05;
        requestAnimationFrame(animateFlag);
      }
    };
    animateFlag();

    console.log(`Flag displayed for ${countryName} at position:`, flagPosition);
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
      console.log(
        "[Auto-Animation] Checking auto-animation ref state:",
        isAutoAnimatingRef.current
      );
      console.log(
        "[Auto-Animation] Auto-animation stopped (ref check), aborting sequence"
      );
      return;
    }

    console.log(
      `[Auto-Animation] State check passed. isAutoAnimating (ref): ${isAutoAnimatingRef.current}, forceAnimate: ${forceAnimate}`
    );

    console.log(
      `[Auto-Animation] Auto-animation state confirmed: ${state.animation.isAutoAnimating}`
    );

    const country = topCountries[countryIndex];
    console.log(
      `[Auto-Animation] Moving to country ${countryIndex + 1}/${
        topCountries.length
      }: ${country.name}`
    );

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
    highlightCountry(country.code, country.name);

    // Calculate country center (simple centroid for now)
    console.log(`[Auto-Animation] Calculating centroid for: ${country.name}`);
    let latSum = 0,
      lngSum = 0,
      pointCount = 0;

    try {
      if (
        countryPolygon.geometry.type === "Polygon" &&
        countryPolygon.geometry.coordinates[0]
      ) {
        countryPolygon.geometry.coordinates[0].forEach((coord) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            lngSum += coord[0];
            latSum += coord[1];
            pointCount++;
          }
        });
      } else if (countryPolygon.geometry.type === "MultiPolygon") {
        countryPolygon.geometry.coordinates.forEach((polygon) => {
          if (polygon && polygon[0]) {
            polygon[0].forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                lngSum += coord[0];
                latSum += coord[1];
                pointCount++;
              }
            });
          }
        });
      }
    } catch (error) {
      console.error(
        "Error calculating country centroid for camera animation:",
        error
      );
      // Skip to next country on error
      setTimeout(() => {
        if (state.animation.isAutoAnimating) {
          dispatch(actions.nextCountry());
          animateToCountry((countryIndex + 1) % topCountries.length, callback);
        }
      }, 1000);
      return;
    }

    // Prevent division by zero
    if (pointCount === 0) {
      console.warn("No valid points found for country centroid calculation");
      // Skip to next country
      setTimeout(() => {
        if (state.animation.isAutoAnimating) {
          dispatch(actions.nextCountry());
          animateToCountry((countryIndex + 1) % topCountries.length, callback);
        }
      }, 1000);
      return;
    }

    const avgLat = latSum / pointCount;
    const avgLng = lngSum / pointCount;

    console.log(
      `[Auto-Animation] Calculated centroid for ${country.name}: lat=${avgLat}, lng=${avgLng}, pointCount=${pointCount}`
    );

    // Convert to 3D position
    const targetPosition = latLonToVector3(avgLat, avgLng, 1);
    const cameraOffset = targetPosition
      .clone()
      .normalize()
      .multiplyScalar(COUNTRY_VIEW_ZOOM_DISTANCE);

    console.log(`[Auto-Animation] Animating camera to ${country.name}`);

    // Animate camera to country
    animateCameraToPosition(cameraOffset, targetPosition, () => {
      console.log(
        `[Auto-Animation] Camera animation complete for ${country.name}, waiting ${state.animation.timeToWaitForHighlightedCountry}ms`
      );
      console.log(
        `[Auto-Animation] Current auto-animation state during callback: ${state.animation.isAutoAnimating}`
      );

      // Stay focused on country for specified time
      setTimeout(() => {
        // Re-check the ref state at the time of execution
        console.log(
          `[Auto-Animation] Timeout callback executing. Current ref state: ${isAutoAnimatingRef.current}`
        );

        if (isAutoAnimatingRef.current) {
          console.log(
            `[Auto-Animation] Moving to next country after ${country.name}`
          );
          dispatch(actions.nextCountry());
          animateToCountry(countryIndex + 1, callback);
        } else {
          console.log(
            `[Auto-Animation] Auto-animation stopped (ref check), not proceeding to next country`
          );
        }
      }, state.animation.timeToWaitForHighlightedCountry);
    });
  };

  const animateCameraToPosition = (
    cameraPosition,
    lookAtTarget,
    callback = null
  ) => {
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    setIsAnimating(true);

    // Use a simple linear interpolation for camera movement
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();

    const duration = 2000; // 2 seconds for camera movement
    const startTime = Date.now();

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease in-out)
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate camera position
      camera.position.lerpVectors(startPosition, cameraPosition, eased);

      // Update controls target
      controls.target.lerpVectors(startTarget, lookAtTarget, eased);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        setIsAnimating(false);
        console.log(
          `[Camera Animation] Camera animation completed, calling callback`
        );
        if (callback) callback();
      }
    };

    requestAnimationFrame(animateFrame);
  };

  const startAutoAnimation = () => {
    console.log("[Auto-Animation] Starting auto-animation sequence");
    console.log(
      "[Auto-Animation] Current state before starting:",
      state.animation.isAutoAnimating
    );

    // Set ref to true immediately
    isAutoAnimatingRef.current = true;

    dispatch(actions.startAutoAnimation());

    // Add a small delay to ensure the state is updated
    setTimeout(() => {
      console.log(
        "[Auto-Animation] State after dispatch:",
        state.animation.isAutoAnimating
      );
      console.log("[Auto-Animation] Ref state:", isAutoAnimatingRef.current);
      // Force start the animation regardless of current state
      console.log("[Auto-Animation] Force initializing first country");
      animateToCountry(0, null, true);
    }, 100);
  };

  const stopAutoAnimation = () => {
    console.log("[Auto-Animation] Stopping auto-animation");
    isAutoAnimatingRef.current = false;
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
      if (foundMatch) {
        console.log(`[FIND COUNTRY] Code match found with properties:`, props);
      }
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
    console.log("[FIND COUNTRY] Sample countries in GeoJSON:", sampleNames);

    return null;
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
