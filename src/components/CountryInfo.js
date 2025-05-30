import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components"; // Import styled and keyframes
import { useAppContext, actions } from "../context/AppContext";
import { topCountries } from "../data/topCountries";

// Styled Components
const InfoPanelWrapper = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  background-color: rgba(
    107,
    33,
    168,
    0.9
  ); /* bg-space-purple (assuming space-purple is purple-700) bg-opacity-90 */
  color: white;
  padding: 1.5rem;
  border-radius: 0.75rem; /* rounded-xl */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04); /* shadow-2xl */
  backdrop-filter: blur(8px); /* backdrop-blur-md */
  max-width: 24rem; /* max-w-sm */
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem; /* mb-4 */
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem; /* text-xl */
  font-weight: 700; /* font-bold */
`;

const CloseButton = styled.button`
  color: #d1d5db; /* text-gray-300 */
  transition: color 0.15s ease-in-out;
  &:hover {
    color: white; /* hover:text-white */
  }
`;

const SvgIcon = styled.svg`
  width: 1.25rem; /* w-5 */
  height: 1.25rem; /* h-5 */
`;

const spinAnimation = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const LoadingSpinnerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2rem; /* py-8 (assuming padding top and bottom) */
  padding-bottom: 2rem;
`;

const Spinner = styled.div`
  animation: ${spinAnimation} 1s linear infinite; /* animate-spin (default 1s) */
  width: 2rem; /* w-8 */
  height: 2rem; /* h-8 */
  border: 2px solid #3b82f6; /* border-2 border-blue-500 */
  border-top-color: transparent; /* border-t-transparent */
  border-radius: 50%; /* rounded-full */
`;

const ContentWrapper = styled.div`
  /* space-y-4 applied here by spacing children */
`;

const CountryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem; /* space-x-3 */
  margin-bottom: 1rem; /* mb-4 */
`;

const FlagImage = styled.img`
  width: 3rem; /* w-12 */
  height: 2rem; /* h-8 */
  object-fit: cover;
  border-radius: 0.25rem; /* rounded */
  border: 1px solid #4b5563; /* border-gray-600 */
`;

const CountryName = styled.h3`
  font-size: 1.125rem; /* text-lg */
  font-weight: 600; /* font-semibold */
  color: #93c5fd; /* text-blue-300 */
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* grid-cols-2 */
  gap: 1rem; /* gap-4 */
  font-size: 0.875rem; /* text-sm */
  margin-bottom: 0.75rem; /* From parent space-y-3 */
`;

const DetailItem = styled.div``;

const DetailLabel = styled.span`
  color: #9ca3af; /* text-gray-400 */
`;

const DetailValue = styled.p`
  font-weight: 500; /* font-medium */
`;

const SingleDetail = styled.div`
  font-size: 0.875rem; /* text-sm */
  margin-bottom: 0.75rem; /* From parent space-y-3 */
`;

const MonoText = styled.p`
  font-weight: 500; /* font-medium */
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace; /* font-mono */
`;

const ActionButtonsWrapper = styled.div`
  padding-top: 1rem; /* pt-4 */
  border-top: 1px solid #4b5563; /* border-t border-gray-600 */
  /* space-y-2 applied by spacing children */
`;

const FullWidthButton = styled.button`
  width: 100%;
  background-color: #2563eb; /* bg-blue-600 */
  color: white;
  padding: 0.5rem 1rem; /* py-2 px-4 */
  border-radius: 0.5rem; /* rounded-lg */
  transition: background-color 0.15s ease-in-out;
  font-size: 0.875rem; /* text-sm */
  margin-bottom: 0.5rem; /* For space-y-2 */

  &:hover {
    background-color: #1d4ed8; /* hover:bg-blue-700 */
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* grid-cols-2 */
  gap: 0.5rem; /* gap-2 */
`;

const SmallButton = styled.button`
  background-color: #374151; /* bg-gray-700 */
  color: white;
  padding: 0.5rem 0.75rem; /* py-2 px-3 */
  border-radius: 0.5rem; /* rounded-lg */
  transition: background-color 0.15s ease-in-out;
  font-size: 0.75rem; /* text-xs */

  &:hover {
    background-color: #4b5563; /* hover:bg-gray-600 */
  }
`;

const NoDataText = styled.div`
  text-align: center;
  padding-top: 1rem; /* py-4 (assuming padding top and bottom) */
  padding-bottom: 1rem;
  color: #9ca3af; /* text-gray-400 */
`;

const CountryInfo = () => {
  const { state, dispatch } = useAppContext();
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch country data when a country is selected
  useEffect(() => {
    if (!state.countries.selected) {
      setCountryData(null);
      return;
    }

    const fetchCountryData = async () => {
      setLoading(true);
      try {
        // Mock data for demonstration - replace with actual API call
        const mockData = {
          name: state.countries.selected,
          capital: "Mock Capital",
          population: "10,000,000",
          area: "500,000 km²",
          continent: "Mock Continent",
          languages: ["English", "Local Language"],
          currency: "Mock Currency",
          timezone: "UTC+0",
          coordinates: { lat: 0, lng: 0 },
        };

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setCountryData(mockData);
      } catch (error) {
        console.error("Error fetching country data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountryData();
  }, [state.countries.selected]);

  if (!state.ui.showCountryInfo || !state.countries.selected) {
    return null;
  }

  return (
    <InfoPanelWrapper>
      <Header>
        <HeaderTitle>Country Info</HeaderTitle>
        <CloseButton
          onClick={() => dispatch(actions.selectCountry(null))}
          title="Close"
        >
          <SvgIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </SvgIcon>
        </CloseButton>
      </Header>

      {loading ? (
        <LoadingSpinnerWrapper>
          <Spinner />
        </LoadingSpinnerWrapper>
      ) : countryData ? (
        <ContentWrapper>
          <CountryHeader>
            <FlagImage
              src={`/flags/${countryData.name}.png`}
              alt={`${countryData.name} flag`}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <CountryName>{countryData.name}</CountryName>
          </CountryHeader>

          <DetailsGrid>
            <DetailItem>
              <DetailLabel>Capital:</DetailLabel>
              <DetailValue>{countryData.capital}</DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Population:</DetailLabel>
              <DetailValue>{countryData.population}</DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Area:</DetailLabel>
              <DetailValue>{countryData.area}</DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Continent:</DetailLabel>
              <DetailValue>{countryData.continent}</DetailValue>
            </DetailItem>
          </DetailsGrid>

          <SingleDetail>
            <DetailLabel>Languages:</DetailLabel>
            <DetailValue>{countryData.languages.join(", ")}</DetailValue>
          </SingleDetail>

          <DetailsGrid>
            <DetailItem>
              <DetailLabel>Currency:</DetailLabel>
              <DetailValue>{countryData.currency}</DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Timezone:</DetailLabel>
              <DetailValue>{countryData.timezone}</DetailValue>
            </DetailItem>
          </DetailsGrid>

          <SingleDetail>
            <DetailLabel>Coordinates:</DetailLabel>
            <MonoText>
              {countryData.coordinates.lat.toFixed(4)}°,{" "}
              {countryData.coordinates.lng.toFixed(4)}°
            </MonoText>
          </SingleDetail>

          <ActionButtonsWrapper>
            <FullWidthButton
              onClick={() => {
                // Focus camera on country
                console.log("Focus on country:", countryData.name);
              }}
            >
              🎯 Focus on Country
            </FullWidthButton>

            <ButtonGrid>
              <SmallButton
                onClick={() => {
                  // Show more details
                  console.log("Show more details for:", countryData.name);
                }}
              >
                📊 Details
              </SmallButton>
              <SmallButton
                onClick={() => {
                  // Show on map
                  console.log("Show on map:", countryData.name);
                }}
              >
                🗺️ Map View
              </SmallButton>
            </ButtonGrid>
          </ActionButtonsWrapper>
        </ContentWrapper>
      ) : (
        <NoDataText>
          <p>No country data available</p>
        </NoDataText>
      )}
    </InfoPanelWrapper>
  );
};

export default CountryInfo;
