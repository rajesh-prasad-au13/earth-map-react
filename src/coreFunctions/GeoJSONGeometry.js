// Custom GeoJSONGeometry class as a fallback

THREE.GeoJSONGeometry = class GeoJSONGeometry extends THREE.BufferGeometry {
  constructor(geoJson, radius = 1) {
    super();
    this.type = "GeoJSONGeometry";
    this.radius = radius;

    if (!geoJson) {
      console.error("No GeoJSON data provided");
      return;
    }

    if (geoJson.type === "Polygon") {
      this.fromPolygon(geoJson.coordinates, radius);
    } else if (geoJson.type === "MultiPolygon") {
      this.fromMultiPolygon(geoJson.coordinates, radius);
    } else {
      console.error("Unsupported GeoJSON type:", geoJson.type);
    }
  }

  fromPolygon(coordinates, radius) {
    const indices = [];
    const vertices = [];
    const uvs = []; // Add UV coordinates for proper texture mapping

    // Process only the outer ring for now (first ring)
    // TODO: Handle holes (inner rings) with proper triangulation library
    const outerRing = coordinates[0];

    if (!outerRing || outerRing.length < 3) {
      console.warn("Invalid polygon coordinates");
      return;
    }

    // Convert coordinates to 3D points and calculate bounds for UV mapping
    let minLon = Infinity,
      maxLon = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;

    const points3D = [];
    outerRing.forEach((coord) => {
      const [lon, lat] = coord;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      points3D.push({ x, y, z, lon, lat });
    });

    // Add vertices and UV coordinates
    points3D.forEach((point) => {
      vertices.push(point.x, point.y, point.z);

      // Calculate UV coordinates based on bounding box
      const u = (point.lon - minLon) / (maxLon - minLon);
      const v = (point.lat - minLat) / (maxLat - minLat);
      uvs.push(u, v);
    });

    // Improved ear clipping triangulation for better area coverage
    const numVertices = points3D.length - 1; // Exclude last point if it's duplicate of first

    if (numVertices >= 3) {
      // Use ear clipping triangulation for complete area coverage
      const triangles = this.earClipTriangulation(
        points3D.slice(0, numVertices)
      );
      indices.push(...triangles);
    }

    this.setIndex(indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.computeVertexNormals();
  }

  fromMultiPolygon(coordinates, radius) {
    const indices = [];
    const vertices = [];
    const uvs = [];

    // Calculate overall bounds for UV mapping
    let globalMinLon = Infinity,
      globalMaxLon = -Infinity;
    let globalMinLat = Infinity,
      globalMaxLat = -Infinity;

    // First pass: calculate global bounds
    coordinates.forEach((polygon) => {
      const outerRing = polygon[0]; // Only process outer ring for now
      if (outerRing) {
        outerRing.forEach((coord) => {
          const [lon, lat] = coord;
          globalMinLon = Math.min(globalMinLon, lon);
          globalMaxLon = Math.max(globalMaxLon, lon);
          globalMinLat = Math.min(globalMinLat, lat);
          globalMaxLat = Math.max(globalMaxLat, lat);
        });
      }
    });

    // Process each polygon in the multipolygon
    coordinates.forEach((polygon) => {
      const outerRing = polygon[0]; // Only process outer ring for now

      if (!outerRing || outerRing.length < 3) {
        console.warn("Invalid polygon in MultiPolygon");
        return;
      }

      const ringStartIndex = vertices.length / 3;
      const points3D = [];

      // Convert coordinates to 3D points
      outerRing.forEach((coord) => {
        const [lon, lat] = coord;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        points3D.push({ x, y, z, lon, lat });
      });

      // Add vertices and UV coordinates
      points3D.forEach((point) => {
        vertices.push(point.x, point.y, point.z);

        // Calculate UV coordinates based on global bounding box
        const u = (point.lon - globalMinLon) / (globalMaxLon - globalMinLon);
        const v = (point.lat - globalMinLat) / (globalMaxLat - globalMinLat);
        uvs.push(u, v);
      });

      // Improved triangulation for this polygon using ear clipping
      const numVertices = points3D.length - 1; // Exclude last point if it's duplicate of first

      if (numVertices >= 3) {
        // Use ear clipping triangulation for complete area coverage
        const triangles = this.earClipTriangulation(
          points3D.slice(0, numVertices)
        );

        // Adjust indices to account for the current vertex offset
        triangles.forEach((index) => {
          indices.push(ringStartIndex + index);
        });
      }
    });

    this.setIndex(indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.computeVertexNormals();
  }

  // Ear clipping triangulation for complete area coverage
  earClipTriangulation(points3D) {
    if (points3D.length < 3) return [];

    const indices = [];

    // Create 2D projection for triangulation (use lon/lat)
    const points2D = points3D.map((p) => [p.lon, p.lat]);
    const vertexIndices = points2D.map((_, i) => i);

    // Simple ear clipping algorithm
    while (vertexIndices.length > 3) {
      let earFound = false;

      for (let i = 0; i < vertexIndices.length; i++) {
        const prevIdx = (i - 1 + vertexIndices.length) % vertexIndices.length;
        const currIdx = i;
        const nextIdx = (i + 1) % vertexIndices.length;

        const prev = points2D[vertexIndices[prevIdx]];
        const curr = points2D[vertexIndices[currIdx]];
        const next = points2D[vertexIndices[nextIdx]];

        if (this.isEar(prev, curr, next, points2D, vertexIndices)) {
          // Add triangle (note: reversing order for correct winding)
          indices.push(
            vertexIndices[prevIdx],
            vertexIndices[currIdx],
            vertexIndices[nextIdx]
          );

          // Remove the ear vertex
          vertexIndices.splice(currIdx, 1);
          earFound = true;
          break;
        }
      }

      // Fallback: if no ear found, just take first three vertices
      if (!earFound) {
        indices.push(vertexIndices[0], vertexIndices[1], vertexIndices[2]);
        vertexIndices.splice(1, 1);
      }
    }

    // Add final triangle
    if (vertexIndices.length === 3) {
      indices.push(vertexIndices[0], vertexIndices[1], vertexIndices[2]);
    }

    return indices;
  }

  // Check if a vertex forms an ear (convex vertex with no points inside triangle)
  isEar(prev, curr, next, allPoints2D, indices) {
    // Check if angle is convex (for spherical surface, we want counter-clockwise)
    const cross =
      (next[0] - curr[0]) * (prev[1] - curr[1]) -
      (next[1] - curr[1]) * (prev[0] - curr[0]);
    if (cross <= 0) return false; // Concave or flat

    // Check if any other vertex is inside this triangle
    for (let i = 0; i < indices.length; i++) {
      const point = allPoints2D[indices[i]];
      if (point === prev || point === curr || point === next) continue;

      if (this.pointInTriangle(point, prev, curr, next)) {
        return false;
      }
    }

    return true;
  }

  // Check if point is inside triangle using barycentric coordinates
  pointInTriangle(point, a, b, c) {
    const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(denom) < 1e-10) return false;

    const alpha =
      ((b[1] - c[1]) * (point[0] - c[0]) + (c[0] - b[0]) * (point[1] - c[1])) /
      denom;
    const beta =
      ((c[1] - a[1]) * (point[0] - c[0]) + (a[0] - c[0]) * (point[1] - c[1])) /
      denom;
    const gamma = 1 - alpha - beta;

    return alpha > 0 && beta > 0 && gamma > 0;
  }
};
