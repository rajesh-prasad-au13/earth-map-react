// Create Earth using three-globe library
export function createEarth(scene) {
  // Create the globe instance
  const globe = new ThreeGlobe()
    .globeImageUrl("./public/Albedo.jpg") // Earth texture
    .bumpImageUrl("./public/Bump.jpg") // Bump map for terrain
    .showAtmosphere(true) // Enable atmosphere
    .atmosphereColor("#87ceeb") // Light sky blue atmosphere
    .atmosphereAltitude(0.15); // Atmosphere height

  // Add the globe to the scene
  scene.add(globe);

  // Return the globe instance so it can be used in main.js
  return globe;
}

// if you dont want to use ocean and land textures then comment globeImageUrl, bumpImageUrl and set the color of polygonCapColor in updateCountryStyles
