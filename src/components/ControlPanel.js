import React from "react";
import styled, { css } from "styled-components";
import { useAppContext, actions } from "../context/AppContext";

// Styled Components Definitions
const ShowControlsButton = styled.button`
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 50;
  background-color: rgba(
    51,
    65,
    85,
    0.8
  ); // bg-space-blue (assuming space-blue is slate-700) bg-opacity-80
  color: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease-in-out;
  backdrop-filter: blur(4px); // backdrop-blur-sm

  &:hover {
    background-color: rgba(51, 65, 85, 1); // hover:bg-opacity-100
  }
`;

const SvgIcon = styled.svg`
  width: 1.5rem;
  height: 1.5rem;
`;

const ControlPanelWrapper = styled.div`
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 50;
  background-color: rgba(
    51,
    65,
    85,
    0.9
  ); // bg-space-blue (assuming space-blue is slate-700) bg-opacity-90
  color: white;
  padding: 1.5rem;
  border-radius: 0.75rem; // rounded-xl
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04); // shadow-2xl
  backdrop-filter: blur(8px); // backdrop-blur-md
  max-width: 24rem; // max-w-sm
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem; // text-xl
  font-weight: 700; // font-bold
`;

const HideControlsButton = styled.button`
  color: #d1d5db; // text-gray-300
  transition: color 0.15s ease-in-out;
  &:hover {
    color: white; // hover:text-white
  }
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem; // text-lg
  font-weight: 600; // font-semibold
  color: #93c5fd; // text-blue-300
  margin-bottom: 1rem; // Applied to parent in original, adding here for consistency
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem; // space-y-3 on parent
`;

const ControlLabel = styled.span`
  font-size: 0.875rem; // text-sm
`;

const ToggleButton = styled.button`
  position: relative;
  display: inline-flex;
  height: 1.5rem; // h-6
  width: 2.75rem; // w-11
  align-items: center;
  border-radius: 9999px; // rounded-full
  transition: background-color 0.2s ease-in-out;
  background-color: ${(props) =>
    props.$active ? "#2563eb" : "#4b5563"}; // bg-blue-600 or bg-gray-600
`;

const ToggleSwitch = styled.span`
  display: inline-block;
  height: 1rem; // h-4
  width: 1rem; // w-4
  border-radius: 9999px; // rounded-full
  background-color: white;
  transition: transform 0.2s ease-in-out;
  transform: ${(props) =>
    props.$active
      ? "translateX(1.5rem)"
      : "translateX(0.25rem)"}; // translate-x-6 or translate-x-1
`;

const RangeLabel = styled.label`
  display: block;
  font-size: 0.875rem; // text-sm
  margin-bottom: 0.5rem;
`;

const RangeInput = styled.input`
  width: 100%;
  height: 0.5rem; // h-2
  background-color: #374151; // bg-gray-700
  border-radius: 0.5rem; // rounded-lg
  appearance: none;
  cursor: pointer;
  // Custom slider thumb styles might be needed here for full parity
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1rem;
    height: 1rem;
    background: #9ca3af; // A generic thumb color, adjust as needed
    cursor: pointer;
    border-radius: 50%;
  }
  &::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    background: #9ca3af;
    cursor: pointer;
    border-radius: 50%;
    border: none;
  }
`;

const TextureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); // grid-cols-2
  gap: 0.5rem; // gap-2
`;

const TextureButton = styled.button`
  padding: 0.75rem; // p-3
  border-radius: 0.5rem; // rounded-lg
  transition: all 0.2s ease-in-out;
  background-color: ${(props) =>
    props.$active ? "#2563eb" : "#374151"}; // bg-blue-600 or bg-gray-700
  ${(props) =>
    props.$active &&
    css`
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05); // shadow-lg
      transform: scale(1.05);
    `}
  &:hover {
    background-color: ${(props) =>
      props.$active
        ? "#1d4ed8"
        : "#4b5563"}; // hover:bg-gray-600 or adjust for active
`;

const TextureEmoji = styled.div`
  font-size: 1.125rem; // text-lg
  margin-bottom: 0.25rem;
`;

const TextureLabel = styled.div`
  font-size: 0.75rem; // text-xs
`;

const ActionButtonsWrapper = styled.div`
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #4b5563; // border-t border-gray-600
  display: flex;
  gap: 0.5rem; // gap-2
`;

const ActionButton = styled.button`
  flex: 1;
  background-color: #374151; // bg-gray-700
  color: white;
  padding: 0.5rem 1rem; // py-2 px-4
  border-radius: 0.5rem; // rounded-lg
  transition: background-color 0.15s ease-in-out;
  font-size: 0.875rem; // text-sm
  &:hover {
    background-color: #4b5563; // hover:bg-gray-600
  }
`;

const RecordButton = styled(ActionButton)`
  background-color: ${(props) =>
    props.$isRecording ? "#dc2626" : "#16a34a"}; // bg-red-600 or bg-green-600
  &:hover {
    background-color: ${(props) =>
      props.$isRecording
        ? "#b91c1c"
        : "#15803d"}; // hover:bg-red-700 or hover:bg-green-700
  }
`;

const ControlPanel = () => {
  const { state, dispatch } = useAppContext();

  const handleTextureChange = (texture) => {
    dispatch(actions.setEarthTexture(texture));
  };

  const handleRotationSpeedChange = (event) => {
    const speed = parseFloat(event.target.value);
    dispatch(actions.setRotationSpeed(speed));
  };

  const handleZoomChange = (event) => {
    const zoom = parseFloat(event.target.value);
    dispatch(actions.setCameraZoom(zoom));
  };

  if (!state.ui.showControls) {
    return (
      <ShowControlsButton
        onClick={() => dispatch(actions.toggleControls())}
        title="Show Controls"
      >
        <SvgIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
          />
        </SvgIcon>
      </ShowControlsButton>
    );
  }

  return (
    <ControlPanelWrapper>
      <Header>
        <HeaderTitle>Earth Controls</HeaderTitle>
        <HideControlsButton
          onClick={() => dispatch(actions.toggleControls())}
          title="Hide Controls"
        >
          <SvgIcon
            style={{ width: "1.25rem", height: "1.25rem" }} // w-5 h-5
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </SvgIcon>
        </HideControlsButton>
      </Header>

      <Section>
        <SectionTitle>Animation</SectionTitle>
        <ControlRow>
          <ControlLabel>Auto Rotate</ControlLabel>
          <ToggleButton
            onClick={() => dispatch(actions.toggleAutoRotate())}
            $active={state.camera.autoRotate}
          >
            <ToggleSwitch $active={state.camera.autoRotate} />
          </ToggleButton>
        </ControlRow>

        <div>
          <RangeLabel>
            Rotation Speed: {state.camera.rotationSpeed.toFixed(3)}
          </RangeLabel>
          <RangeInput
            type="range"
            min="0"
            max="0.05"
            step="0.001"
            value={state.camera.rotationSpeed}
            onChange={handleRotationSpeedChange}
          />
        </div>

        <div style={{ marginTop: "1rem" }}>
          {" "}
          {/* Added margin for spacing similar to space-y-4 */}
          <RangeLabel>Zoom: {state.camera.zoom.toFixed(1)}x</RangeLabel>
          <RangeInput
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={state.camera.zoom}
            onChange={handleZoomChange}
          />
        </div>
      </Section>

      <Section>
        <SectionTitle>Textures</SectionTitle>
        <TextureGrid>
          {[
            { key: "day", label: "Day", emoji: "🌍" },
            { key: "night", label: "Night", emoji: "🌃" },
            { key: "bump", label: "Bump", emoji: "🏔️" },
            { key: "clouds", label: "Clouds", emoji: "☁️" },
          ].map(({ key, label, emoji }) => (
            <TextureButton
              key={key}
              onClick={() => handleTextureChange(key)}
              $active={state.earth.texture === key}
            >
              <TextureEmoji>{emoji}</TextureEmoji>
              <TextureLabel>{label}</TextureLabel>
            </TextureButton>
          ))}
        </TextureGrid>
      </Section>

      <Section>
        <SectionTitle>Display</SectionTitle>
        <ControlRow>
          <ControlLabel>Show Earth</ControlLabel>
          <ToggleButton
            onClick={() => dispatch(actions.toggleEarthVisibility())}
            $active={state.earth.visible}
          >
            <ToggleSwitch $active={state.earth.visible} />
          </ToggleButton>
        </ControlRow>
        <ControlRow>
          <ControlLabel>Wireframe</ControlLabel>
          <ToggleButton
            onClick={() => dispatch(actions.toggleWireframe())}
            $active={state.earth.wireframe}
          >
            <ToggleSwitch $active={state.earth.wireframe} />
          </ToggleButton>
        </ControlRow>
        <ControlRow>
          <ControlLabel>Countries</ControlLabel>
          <ToggleButton
            onClick={() => dispatch(actions.toggleCountriesVisibility())}
            $active={state.countries.visible}
          >
            <ToggleSwitch $active={state.countries.visible} />
          </ToggleButton>
        </ControlRow>
      </Section>

      <ActionButtonsWrapper>
        <ActionButton onClick={() => dispatch(actions.toggleSettings())}>
          Settings
        </ActionButton>
        <RecordButton
          onClick={() => dispatch(actions.toggleRecording())}
          $isRecording={state.ui.isRecording}
        >
          {state.ui.isRecording ? "⏹ Stop" : "🔴 Record"}
        </RecordButton>
      </ActionButtonsWrapper>
    </ControlPanelWrapper>
  );
};

export default ControlPanel;
