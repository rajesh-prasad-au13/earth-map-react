import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { useAppContext, actions } from "../context/AppContext";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const IntroContainer = styled(({ isExiting, ...rest }) => <div {...rest} />)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: white;
  z-index: 1000;
  animation: ${(props) => (props.isExiting ? fadeOut : fadeIn)} 1s ease-out;
  animation-fill-mode: forwards;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  text-align: center;
  background: linear-gradient(to right, #ff8a00, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
  font-family: "League Spartan", sans-serif;
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: normal;
  opacity: 0.8;
  margin-bottom: 2rem;
  text-align: center;
  max-width: 700px;
  line-height: 1.4;
`;

const EarthIconContainer = styled.div`
  margin-bottom: 2rem;
  width: 150px;
  height: 150px;
  position: relative;
  animation: float 5s ease-in-out infinite;

  @keyframes float {
    0% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-15px) rotate(3deg);
    }
    100% {
      transform: translateY(0px) rotate(0deg);
    }
  }
`;

const StartButton = styled.button`
  background: linear-gradient(to right, #ff8a00, #ff6b6b);
  border: none;
  padding: 16px 32px;
  border-radius: 50px;
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.3);
  margin-top: 1rem;
  font-family: "League Spartan", sans-serif;

  &:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 12px 20px rgba(255, 107, 107, 0.4);
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }
`;

const Footer = styled.div`
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.6;
`;

const SkipButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.7;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    opacity: 1;
  }
`;

const EarthIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "100%" }}
  >
    <circle cx="12" cy="12" r="10" fill="url(#earth-gradient)" />
    <path
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM4 12C4 7.58 7.58 4 12 4C13.85 4 15.55 4.63 16.9 5.69C16.32 6.1 15.58 6.43 15 6.34C14.31 6.23 13.8 5.53 13.16 5.13C12.47 4.71 11.61 4.94 10.86 5.13C10.21 5.29 9.62 5.53 9.08 5.91C8.6 6.25 8.38 6.58 7.88 6.92C7.38 7.26 6.74 7.44 6.53 8.04C6.21 9.05 7.14 10.07 6.82 11.08C6.61 11.73 5.94 12.11 5.32 12.2C4.85 12.27 4.4 12.22 4 12.12V12Z"
      fill="url(#earth-details)"
    />
    <defs>
      <linearGradient
        id="earth-gradient"
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2196F3" />
        <stop offset="1" stopColor="#4FC3F7" />
      </linearGradient>
      <linearGradient
        id="earth-details"
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#388E3C" />
        <stop offset="1" stopColor="#4CAF50" />
      </linearGradient>
    </defs>
  </svg>
);

const IntroScreen = ({ onStart }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { state, dispatch } = useAppContext();

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      onStart();
    }, 1000);
  };

  return (
    <IntroContainer isExiting={isExiting}>
      <SkipButton onClick={handleStart}>Skip Intro</SkipButton>
      <EarthIconContainer>
        <EarthIcon />
      </EarthIconContainer>
      <Title>Interactive Earth Explorer</Title>
      <Subtitle>
        Journey through the world with an interactive 3D globe visualization.
        Explore countries, view their flags, and learn about our planet through
        an immersive visual experience.
      </Subtitle>
      <StartButton onClick={handleStart}>Begin Exploration</StartButton>
      <Footer>Created with React • Three.js • GeoJSON</Footer>
    </IntroContainer>
  );
};

export default IntroScreen;
