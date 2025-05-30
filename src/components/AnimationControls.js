import React from "react";
import styled from "styled-components";
import { useAppContext, actions } from "../context/AppContext";

const ControlsContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 100;
`;

// Create a styled button component with proper prop handling
const ControlButton = styled(({ isActive, ...rest }) => <button {...rest} />)`
  background-color: ${(props) =>
    props.isActive ? "rgba(255, 71, 87, 0.9)" : "rgba(42, 42, 42, 0.9)"};
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: "League Spartan", sans-serif;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: ${(props) =>
      props.isActive ? "rgba(255, 91, 107, 0.9)" : "rgba(66, 66, 66, 0.9)"};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StatusText = styled.div`
  color: white;
  font-size: 12px;
  text-align: center;
  margin-top: 5px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
  border-radius: 4px;
`;

const ButtonIcon = styled.div`
  width: 14px;
  height: 14px;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export default function AnimationControls({
  startAutoAnimation,
  stopAutoAnimation,
}) {
  const { state } = useAppContext();

  const isAutoAnimating = state.animation.isAutoAnimating;
  const currentCountryIndex = state.animation.currentCountryIndex;

  return (
    <ControlsContainer>
      <div>
        <ControlButton
          isActive={isAutoAnimating}
          onClick={isAutoAnimating ? stopAutoAnimation : startAutoAnimation}
        >
          <ButtonIcon>
            {isAutoAnimating ? <PauseIcon /> : <PlayIcon />}
          </ButtonIcon>
          {isAutoAnimating ? "Stop Animation" : "Start Animation"}
        </ControlButton>
        <StatusText>
          {isAutoAnimating
            ? `Country ${currentCountryIndex + 1}/10`
            : "Ready to animate"}
        </StatusText>
      </div>
    </ControlsContainer>
  );
}
