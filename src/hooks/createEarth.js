import ThreeGlobe from "three-globe";

// Create Earth using three-globe library
export function createEarth(scene) {
  console.log("Creating ThreeGlobe instance...");

  // Create the globe instance with basic setup
  const globe = new ThreeGlobe()
    .globeImageUrl("/Albedo.jpg") // Earth texture
    .bumpImageUrl("./Bump.jpg") // Bump map for terrain
    .showAtmosphere(true) // Enable atmosphere
    .atmosphereColor("#87ceeb") // Light sky blue atmosphere
    .atmosphereAltitude(0.15); // Atmosphere height

  console.log("ThreeGlobe created successfully");
  console.log("Globe radius:", globe.getGlobeRadius());
  console.log("Globe position:", globe.position);
  console.log("Globe scale:", globe.scale);

  // Return the globe instance so it can be added to the scene in main.js
  return globe;
}

// if you dont want to use ocean and land textures then comment globeImageUrl, bumpImageUrl and set the color of polygonCapColor in updateCountryStyles
