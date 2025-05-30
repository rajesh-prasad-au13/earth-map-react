import polylabel from "./turf-polylabel.js";

// Function to calculate the best visual center for a polygon feature using multiple strategies
function getBestCountryCenter(feature) {
  console.log("==========================================");
  console.log("HELLO! getBestCountryCenter FUNCTION CALLED");
  console.log("Feature:", feature);
  console.log("==========================================");
  if (!feature) {
    console.warn("Invalid feature for center calculation:", feature);
    return null;
  }

  // Store the feature name for logging
  const countryName = feature.properties ? feature.properties.name : "Unknown";

  // Strategy 1: Try the polylabel algorithm first (most accurate visual center)
  try {
    if (feature.geometry) {
      const geomType = feature.geometry.type;

      if (
        geomType === "Polygon" &&
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length > 0
      ) {
        // Use polylabel to find the pole of inaccessibility (visual center)
        const center = polylabel([feature.geometry.coordinates[0]], 1.0);
        if (center && center.length === 2) {
          console.log(
            `Using POLYLABEL for ${countryName}: Lat: ${center[1].toFixed(
              4
            )}, Lng: ${center[0].toFixed(4)}`
          );
          return {
            lng: center[0],
            lat: center[1],
            method: "polylabel",
          };
        }
      } else if (
        geomType === "MultiPolygon" &&
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length > 0 &&
        feature.geometry.coordinates[0].length > 0
      ) {
        // For MultiPolygon, find the largest polygon
        let maxArea = 0;
        let largestPolygon = null;
        let polygonIndex = 0;

        // Find the largest polygon by approximating area
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const polygon = feature.geometry.coordinates[i][0];
          // Calculate approximate area using bounding box
          if (polygon && polygon.length > 0) {
            let minX = Infinity,
              maxX = -Infinity,
              minY = Infinity,
              maxY = -Infinity;
            for (const point of polygon) {
              minX = Math.min(minX, point[0]);
              maxX = Math.max(maxX, point[0]);
              minY = Math.min(minY, point[1]);
              maxY = Math.max(maxY, point[1]);
            }
            const area = (maxX - minX) * (maxY - minY);
            if (area > maxArea) {
              maxArea = area;
              largestPolygon = polygon;
              polygonIndex = i;
            }
          }
        }

        if (largestPolygon) {
          // Use polylabel on the largest polygon
          try {
            const center = polylabel([largestPolygon], 1.0);
            if (center && center.length === 2) {
              console.log(
                `Using POLYLABEL (largest polygon #${polygonIndex}) for ${countryName}: Lat: ${center[1].toFixed(
                  4
                )}, Lng: ${center[0].toFixed(4)}`
              );
              return {
                lng: center[0],
                lat: center[1],
                method: "polylabel-multi",
              };
            }
          } catch (e) {
            console.warn(
              `Polylabel failed for MultiPolygon ${countryName}:`,
              e
            );
            // Continue to next strategy
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Polylabel strategy failed for ${countryName}:`, e);
    // Continue to next strategy
  }

  // Strategy 2: Try using the bounding box (bbox) if available
  if (feature.bbox && feature.bbox.length >= 4) {
    // bbox format is typically [west, south, east, north]
    const west = feature.bbox[0];
    const south = feature.bbox[1];
    const east = feature.bbox[2];
    const north = feature.bbox[3];

    // Calculate center of the bbox
    const centerLng = (west + east) / 2;
    const centerLat = (north + south) / 2;

    console.log(
      `Using BBOX center for ${countryName}: Lat: ${centerLat.toFixed(
        4
      )}, Lng: ${centerLng.toFixed(4)}`
    );

    return {
      lng: centerLng,
      lat: centerLat,
      method: "bbox",
    };
  }

  // Strategy 3: Fallback to weighted centroid calculation if other methods fail
  if (!feature.geometry || !feature.geometry.coordinates) {
    console.warn("Invalid geometry for centroid calculation:", feature);
    return null;
  }

  // Extract outer ring of the polygon based on geometry type
  let coordsToAverage;
  const geomType = feature.geometry.type;

  if (geomType === "Polygon") {
    if (feature.geometry.coordinates.length > 0) {
      coordsToAverage = feature.geometry.coordinates[0]; // Outer ring
    } else {
      console.warn(`Empty Polygon coordinates for centroid: ${countryName}`);
      return null;
    }
  } else if (geomType === "MultiPolygon") {
    // For MultiPolygon, we take the first polygon's outer ring for simplicity.
    if (
      feature.geometry.coordinates.length > 0 &&
      feature.geometry.coordinates[0].length > 0 &&
      feature.geometry.coordinates[0][0].length > 0
    ) {
      coordsToAverage = feature.geometry.coordinates[0][0]; // Outer ring of the first polygon
    } else {
      console.warn(
        `Empty MultiPolygon for centroid calculation: ${countryName}`
      );
      return null;
    }
  } else {
    console.warn(
      `Unsupported geometry type for centroid calculation: ${geomType} for ${countryName}`
    );
    return null;
  }

  if (!coordsToAverage || coordsToAverage.length === 0) {
    console.warn(`No coordinates to average for centroid: ${countryName}`);
    return null;
  }

  // Use a weighted centroid calculation for better results
  // This gives more importance to vertices that form larger angles
  let totalWeight = 0;
  let weightedSumLng = 0;
  let weightedSumLat = 0;
  const numPoints = coordsToAverage.length;

  for (let i = 0; i < numPoints; i++) {
    const prev =
      i === 0 ? coordsToAverage[numPoints - 2] : coordsToAverage[i - 1];
    const curr = coordsToAverage[i];
    const next =
      i === numPoints - 1 ? coordsToAverage[1] : coordsToAverage[i + 1];

    // Calculate vectors to neighboring points
    const v1x = prev[0] - curr[0];
    const v1y = prev[1] - curr[1];
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];

    // Calculate the angle between vectors (approximation)
    const dotProduct = v1x * v2x + v1y * v2y;
    const v1Len = Math.sqrt(v1x * v1x + v1y * v1y);
    const v2Len = Math.sqrt(v2x * v2x + v2y * v2y);

    // Use angle as weight (more weight to vertices that form sharper angles)
    let weight = 1.0;
    if (v1Len > 0 && v2Len > 0) {
      const cosAngle = dotProduct / (v1Len * v2Len);
      // Convert to angle and use as weight
      weight = Math.max(0.1, 1.0 - Math.abs(cosAngle));
    }

    weightedSumLng += curr[0] * weight;
    weightedSumLat += curr[1] * weight;
    totalWeight += weight;
  }

  console.log(
    `Using WEIGHTED CENTROID for ${countryName}: Lat: ${(
      weightedSumLat / totalWeight
    ).toFixed(4)}, Lng: ${(weightedSumLng / totalWeight).toFixed(4)}`
  );

  return {
    lng: weightedSumLng / totalWeight,
    lat: weightedSumLat / totalWeight,
    method: "weighted",
  };
}

// Function to remove centroid markers
function removeCentroidMarkers(scene) {
  if (window.centroidMarkers && window.centroidMarkers.length > 0) {
    window.centroidMarkers.forEach((markerGroup) => {
      // Recursively remove children if they are not automatically disposed
      markerGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
      scene.remove(markerGroup);
    });
    window.centroidMarkers = [];
  }
}

// Utility function to convert lat/lng to 3D vector
function latLngToVector3(lat, lng, radius = 50) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Function to create a text sprite
function createTextSprite(message, parameters) {
  const fontface = parameters.fontface || "Arial";
  const fontsize = parameters.fontsize || 24; // Increased for better visibility
  const borderThickness = parameters.borderThickness || 2;
  const borderColor = parameters.borderColor || { r: 0, g: 0, b: 0, a: 1.0 };
  const backgroundColor = parameters.backgroundColor || {
    r: 255,
    g: 255,
    b: 255,
    a: 0.8,
  };
  const textColor = parameters.textColor || { r: 0, g: 0, b: 0, a: 1.0 };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = "Bold " + fontsize + "px " + fontface;

  // Get text metrics
  const metrics = context.measureText(message);
  const textWidth = metrics.width;

  // Set canvas dimensions
  canvas.width =
    textWidth + borderThickness * 2 + (parameters.padding || 10) * 2; // Add padding
  canvas.height =
    fontsize + borderThickness * 2 + (parameters.padding || 10) * 2; // Add padding
  context.font = "Bold " + fontsize + "px " + fontface; // Re-set font after canvas resize

  // Background
  context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
  context.strokeStyle = `rgba(${borderColor.r},${borderColor.g},${borderColor.b},${borderColor.a})`;
  context.lineWidth = borderThickness;

  // Draw rounded rectangle
  const x = borderThickness / 2;
  const y = borderThickness / 2;
  const width = canvas.width - borderThickness;
  const height = canvas.height - borderThickness;
  const radius = parameters.borderRadius || 5;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  if (borderThickness > 0) context.stroke();

  // Text
  context.fillStyle = `rgba(${textColor.r},${textColor.g},${textColor.b},${textColor.a})`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);

  // Adjust sprite scale for visibility
  // The scale might need tuning depending on your scene's units and camera distance
  sprite.scale.set(canvas.width / 15, canvas.height / 15, 1.0); // Adjusted scale for better visibility

  return sprite;
}

// Function to add a marker at a specific lat/lng position with appropriate color based on method
function addImprovedCentroidMarker(
  lat,
  lng,
  method = "default",
  scene,
  countryName
) {
  // Remove existing markers first
  removeCentroidMarkers(scene);

  const markerGroup = new THREE.Group();

  // Different colors based on the method used
  let color;
  let size = 2; // Default size

  switch (method) {
    case "polylabel":
      // Bright green for the most accurate visual center
      color = 0x00ff00;
      size = 2.5;
      break;
    case "polylabel-multi":
      // Bright cyan for polylabel on multipolygon
      color = 0x00ffff;
      size = 2.5;
      break;
    case "bbox":
      // Yellow for bounding box center
      color = 0xffff00;
      size = 2;
      break;
    case "weighted":
      // Orange for weighted centroid
      color = 0xff8000;
      size = 2;
      break;
    default:
      // Red for fallback or unknown method
      color = 0xff0000;
      size = 1.5;
  }

  // Create a small sphere to represent the marker
  const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
  const sphereMarker = new THREE.Mesh(markerGeometry, markerMaterial);

  // Position the marker at the centroid coordinates
  const markerPosition = latLngToVector3(lat, lng, 50.5); // Slightly above the surface, adjusted from 102
  sphereMarker.position.copy(markerPosition);
  markerGroup.add(sphereMarker);

  // Add country name as a sprite
  if (countryName) {
    const nameSprite = createTextSprite(countryName, {
      fontsize: 32, // Adjusted font size
      fontface: "Arial",
      textColor: { r: 255, g: 255, b: 255, a: 1.0 },
      backgroundColor: { r: 0, g: 0, b: 0, a: 0.7 },
      borderColor: { r: 255, g: 255, b: 255, a: 0.9 },
      borderThickness: 1,
      borderRadius: 6,
      padding: 8,
    });
    // Position the name sprite slightly above the sphere marker
    nameSprite.position.copy(markerPosition).add(new THREE.Vector3(0, 3.5, 0)); // Adjusted Y offset for visibility
    markerGroup.add(nameSprite);
  }

  // Remove the line from the center of the globe to the marker, as it might clutter with the text
  // const lineGeometry = new THREE.BufferGeometry().setFromPoints([
  //   new THREE.Vector3(0, 0, 0),
  //   markerPosition,
  // ]);
  // const lineMaterial = new THREE.LineBasicMaterial({
  //   color: color,
  //   opacity: 0.6,
  //   transparent: true,
  // });
  // const line = new THREE.Line(lineGeometry, lineMaterial);
  // scene.add(line);
  // window.centroidMarkers.push(line);

  scene.add(markerGroup);
  window.centroidMarkers.push(markerGroup);

  return markerGroup;
}

export {
  getBestCountryCenter,
  addImprovedCentroidMarker,
  removeCentroidMarkers,
};
