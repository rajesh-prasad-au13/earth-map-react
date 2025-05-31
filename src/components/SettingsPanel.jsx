import React from "react";
import styled from "styled-components";
import { useAppContext, actions } from "../context/AppContext";

const SettingsContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(21, 21, 21, 0.85);
  color: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  backdrop-filter: blur(4px);
  font-family: "League Spartan", sans-serif;
  transition: all 0.3s ease;
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
`;

const SettingsTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const SettingsGroup = styled.div`
  margin-bottom: 20px;
`;

const SettingsGroupTitle = styled.h4`
  margin: 0 0 10px;
  font-size: 14px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SettingLabel = styled.label`
  font-size: 14px;
`;

const SettingSlider = styled.input`
  -webkit-appearance: none;
  width: 140px;
  height: 4px;
  background: #555;
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff6b6b;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff6b6b;
    cursor: pointer;
    border: none;
  }
`;

const SettingSelect = styled.select`
  background: rgba(45, 45, 45, 0.9);
  color: white;
  border: 1px solid #444;
  padding: 5px 10px;
  border-radius: 4px;
  width: 140px;
  font-size: 14px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #ff6b6b;
  }
`;

const ToggleSwitch = styled.div`
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #ff6b6b;
  }

  &:checked + span:before {
    transform: translateX(22px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #444;
  transition: 0.4s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

const ColorPickerContainer = styled.div`
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #444;
`;

const ColorDisplay = styled.div`
  width: 100%;
  height: 100%;
  background-color: ${(props) => props.color};
  cursor: pointer;
`;

const ColorInput = styled.input`
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
`;

const Button = styled.button`
  background-color: #555;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #676767;
  }
`;

const SettingsPanel = () => {
  const { state, dispatch } = useAppContext();

  if (!state.ui.showSettings) {
    return null;
  }

  // Open color picker when clicking on color display
  const handleColorClick = (colorPickerId) => {
    document.getElementById(colorPickerId).click();
  };

  return (
    <SettingsContainer>
      <SettingsHeader>
        <SettingsTitle>Visualization Settings</SettingsTitle>
        <CloseButton onClick={() => dispatch(actions.toggleSettings())}>
          ×
        </CloseButton>
      </SettingsHeader>

      {/* Animation Settings */}
      <SettingsGroup>
        <SettingsGroupTitle>Animation</SettingsGroupTitle>

        <SettingRow>
          <SettingLabel>Animation Speed</SettingLabel>
          <SettingSlider
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={state.animation.speed}
            onChange={(e) =>
              dispatch(actions.setAnimationSpeed(parseInt(e.target.value)))
            }
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Auto Rotate</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.camera.autoRotate}
              onChange={() => dispatch(actions.toggleAutoRotate())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Rotation Speed</SettingLabel>
          <SettingSlider
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={state.camera.rotationSpeed}
            onChange={(e) =>
              dispatch(actions.setRotationSpeed(parseFloat(e.target.value)))
            }
          />
        </SettingRow>
      </SettingsGroup>

      {/* Visualization Settings */}
      <SettingsGroup>
        <SettingsGroupTitle>Visualization</SettingsGroupTitle>

        <SettingRow>
          <SettingLabel>Earth Texture</SettingLabel>
          <SettingSelect
            value={state.earth.texture}
            onChange={(e) =>
              dispatch({
                type: "SET_EARTH_TEXTURE",
                payload: e.target.value,
              })
            }
          >
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="bump">Bump Map</option>
            <option value="clouds">Clouds</option>
          </SettingSelect>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Show Country Borders</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.countries.showBorders}
              onChange={() => dispatch(actions.toggleBorders())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Show Flags</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.countries.showFlags ?? true}
              onChange={() => dispatch(actions.toggleFlags())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Highlight Color</SettingLabel>
          <ColorPickerContainer>
            <ColorDisplay
              color={state.countries.highlightColor}
              onClick={() => handleColorClick("highlightColorPicker")}
            />
            <ColorInput
              id="highlightColorPicker"
              type="color"
              value={state.countries.highlightColor}
              onChange={(e) =>
                dispatch(actions.setHighlightColor(e.target.value))
              }
            />
          </ColorPickerContainer>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Enable Glow Effect</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.countries.enableGlow ?? true}
              onChange={() => dispatch(actions.toggleGlowEffect())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Glow Intensity</SettingLabel>
          <SettingSlider
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={state.countries.glowIntensity ?? 1}
            onChange={(e) =>
              dispatch(actions.setGlowIntensity(parseFloat(e.target.value)))
            }
          />
        </SettingRow>
      </SettingsGroup>

      {/* User Interface */}
      <SettingsGroup>
        <SettingsGroupTitle>Interface</SettingsGroupTitle>

        <SettingRow>
          <SettingLabel>Theme</SettingLabel>
          <SettingSelect
            value={state.ui.theme}
            onChange={(e) => dispatch(actions.setTheme(e.target.value))}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </SettingSelect>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Show Controls</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.ui.showControls}
              onChange={() => dispatch(actions.toggleControls())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Show Country Info</SettingLabel>
          <ToggleSwitch>
            <ToggleInput
              type="checkbox"
              checked={state.ui.showCountryInfo}
              onChange={() => dispatch(actions.toggleCountryInfo())}
            />
            <ToggleSlider />
          </ToggleSwitch>
        </SettingRow>
      </SettingsGroup>

      {/* Recording Settings */}
      <SettingsGroup>
        <SettingsGroupTitle>Recording</SettingsGroupTitle>

        <SettingRow>
          <SettingLabel>Resolution</SettingLabel>
          <SettingSelect
            value={state.recording.resolution}
            onChange={(e) => dispatch(actions.setResolution(e.target.value))}
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
          </SettingSelect>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Framerate</SettingLabel>
          <SettingSelect
            value={state.recording.framerate}
            onChange={(e) =>
              dispatch(actions.setFramerate(parseInt(e.target.value)))
            }
          >
            <option value="24">24 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </SettingSelect>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Duration (s)</SettingLabel>
          <SettingSlider
            type="range"
            min="10"
            max="300"
            step="10"
            value={state.recording.duration}
            onChange={(e) =>
              dispatch(actions.setRecordingDuration(parseInt(e.target.value)))
            }
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Format</SettingLabel>
          <SettingSelect
            value={state.recording.format}
            onChange={(e) =>
              dispatch(actions.setRecordingFormat(e.target.value))
            }
          >
            <option value="webm">WebM</option>
            <option value="mp4">MP4</option>
          </SettingSelect>
        </SettingRow>
      </SettingsGroup>

      <Button
        onClick={() => {
          // Export settings
          const settings = JSON.stringify(state, null, 2);
          const blob = new Blob([settings], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "earth-viewer-settings.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export Settings
      </Button>
    </SettingsContainer>
  );
};

export default SettingsPanel;
