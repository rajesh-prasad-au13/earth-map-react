import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { useAppContext } from "../context/AppContext";

// Animation keyframes
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideDown = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(-50px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
`;

const slideUp = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(50px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
`;

const slideLeft = keyframes`
  from { 
    opacity: 0; 
    transform: translateX(50px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
`;

const slideRight = keyframes`
  from { 
    opacity: 0; 
    transform: translateX(-50px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
`;

const zoomIn = keyframes`
  from { 
    opacity: 0; 
    transform: scale(0.5); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
`;

// Styled flag overlay container
const FlagOverlay = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;

  ${(props) =>
    props.visible &&
    css`
      opacity: 1;
    `}

  ${(props) =>
    props.animationType === "fade" &&
    css`
      animation: ${fadeIn} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.animationType === "slide-down" &&
    css`
      animation: ${slideDown} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.animationType === "slide-up" &&
    css`
      animation: ${slideUp} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.animationType === "slide-left" &&
    css`
      animation: ${slideLeft} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.animationType === "slide-right" &&
    css`
      animation: ${slideRight} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.animationType === "zoom" &&
    css`
      animation: ${zoomIn} 0.5s ease-in-out;
    `}
`;

const FlagImage = styled.img`
  width: 200px;
  height: auto;
  border-radius: 8px;
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
`;

const FlagLabel = styled.div`
  text-align: center;
  margin-top: 10px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
`;

export default function Flag() {
  const { state } = useAppContext();
  const [flagImageUrl, setFlagImageUrl] = useState(null);
  const [flagVisible, setFlagVisible] = useState(false);

  // Get current selected/hovered country
  const currentCountry = state.countries.selected || state.countries.hovered;

  // Settings from state
  const showFlags = true; // You can add this to context later
  const flagAnimationType = "fade"; // You can add this to context later
  const isCameraMoving = false; // You can add this to context later

  useEffect(() => {
    if (currentCountry && showFlags && !isCameraMoving) {
      // Load flag image based on country name
      const flagUrl = `/flags/${currentCountry}.png`;
      setFlagImageUrl(flagUrl);
      setFlagVisible(true);
    } else {
      setFlagVisible(false);
    }
  }, [currentCountry, showFlags, isCameraMoving]);

  if (!flagVisible || !flagImageUrl || !currentCountry) {
    return null;
  }

  return (
    <FlagOverlay visible={flagVisible} animationType={flagAnimationType}>
      <FlagImage
        src={flagImageUrl}
        alt={`Flag of ${currentCountry}`}
        onError={(e) => {
          // Hide flag if image fails to load
          console.log(`Flag not found for ${currentCountry}`);
          setFlagVisible(false);
        }}
      />
      <FlagLabel>{currentCountry}</FlagLabel>
    </FlagOverlay>
  );
}
