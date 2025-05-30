export function createDisplayCard(countryData) {
  const card = document.createElement("div");
  card.id = "country-display-card";
  card.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
  card.style.color = "white";
  card.style.padding = "15px";
  card.style.borderRadius = "8px";
  card.style.textAlign = "center";
  card.style.minWidth = "200px"; // Adjust as needed

  const flagImg = document.createElement("img");
  flagImg.src = `public/flags/${countryData.name}.png`; // Assuming flag images are named by country
  flagImg.alt = `${countryData.name} Flag`;
  flagImg.style.width = "100px";
  flagImg.style.height = "auto";
  flagImg.style.marginBottom = "10px";
  flagImg.style.borderRadius = "4px";

  const countryName = document.createElement("h3");
  countryName.textContent = countryData.name;
  countryName.style.margin = "0 0 5px 0";
  countryName.style.fontSize = "18px";

  const countryRank = document.createElement("p");
  countryRank.textContent = `Rank: ${countryData.rank}`;
  countryRank.style.margin = "0 0 5px 0";
  countryRank.style.fontSize = "14px";

  const countryScore = document.createElement("p");
  countryScore.textContent = `Score: ${countryData.score}`;
  countryScore.style.margin = "0";
  countryScore.style.fontSize = "14px";

  card.appendChild(flagImg);
  card.appendChild(countryName);
  //   card.appendChild(countryRank);
  //   card.appendChild(countryScore);

  return card;
}

export function updateDisplayCard(countryData) {
  let card = document.getElementById("country-display-card");
  const cardContainer = document.getElementById("country-info-card");

  if (!cardContainer) return;

  if (!countryData) {
    if (card) {
      card.remove();
    }
    return;
  }

  if (!card) {
    card = createDisplayCard(countryData);
    cardContainer.appendChild(card);
  } else {
    // Update existing card content
    card.querySelector("img").src = `public/flags/${countryData.name}.png`;
    card.querySelector("img").alt = `${countryData.name} Flag`;
    card.querySelector("h3").textContent = countryData.name;
    card.querySelector(
      "p:nth-of-type(1)"
    ).textContent = `Rank: ${countryData.rank}`;
    card.querySelector(
      "p:nth-of-type(2)"
    ).textContent = `Score: ${countryData.score}`;
  }
}
