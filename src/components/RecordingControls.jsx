import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useAppContext, actions } from "../context/AppContext";

const RecordingControlsContainer = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 100;
`;

const RecordingButton = styled(({ isRecording, ...rest }) => (
  <button {...rest} />
))`
  background-color: ${(props) =>
    props.isRecording ? "rgba(255, 71, 87, 0.9)" : "rgba(42, 42, 42, 0.9)"};
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
      props.isRecording ? "rgba(255, 91, 107, 0.9)" : "rgba(66, 66, 66, 0.9)"};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const RecordingIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const CountdownOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  pointer-events: none;
`;

const CountdownNumber = styled.div`
  font-size: 120px;
  color: white;
  font-weight: bold;
  opacity: 0.8;
`;

const RecordingIndicator = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 71, 87, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-family: "League Spartan", sans-serif;
  font-size: 14px;
  font-weight: 600;
  z-index: 100;

  .recording-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: white;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      opacity: 1;
    }
  }
`;

const RecordingTime = styled.div`
  margin-left: 4px;
`;

const RecordingControls = () => {
  const { state, dispatch } = useAppContext();
  const [countdown, setCountdown] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const rendererRef = useRef(null);
  const originalSizeRef = useRef(null);

  // Find the renderer element in the DOM
  useEffect(() => {
    rendererRef.current = document.querySelector("canvas");
  }, []);

  // Handle recording state changes
  useEffect(() => {
    if (!state.ui.isRecording) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        stopRecording();
      }
    }
  }, [state.ui.isRecording]);

  // Clean up resources when unmounting
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Get optimal bitrate based on resolution
  const getBitrate = (resolution) => {
    const bitrateMap = {
      "720p": 5000000, // 5 Mbps
      "1080p": 8000000, // 8 Mbps
      "4k": 25000000, // 25 Mbps
    };
    return bitrateMap[resolution] || 8000000;
  };

  // Get resolution configuration
  const getResolutionConfig = (resolution) => {
    const configs = {
      "720p": { width: 1280, height: 720 },
      "1080p": { width: 1920, height: 1080 },
      "4k": { width: 3840, height: 2160 },
    };
    return configs[resolution] || configs["1080p"];
  };

  // Start recording countdown
  const startCountdown = () => {
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Begin actual recording
  const beginRecording = async () => {
    try {
      if (!rendererRef.current) {
        console.error("Cannot find canvas element");
        return;
      }

      // Store original renderer size
      originalSizeRef.current = {
        width: rendererRef.current.width,
        height: rendererRef.current.height,
      };

      // Get resolution config
      const config = getResolutionConfig(state.recording.resolution);

      // Resize canvas for recording
      rendererRef.current.width = config.width;
      rendererRef.current.height = config.height;

      // Set up stream
      streamRef.current = rendererRef.current.captureStream(
        state.recording.framerate
      );

      // Configure media recorder
      const options = {
        mimeType:
          state.recording.format === "webm"
            ? "video/webm;codecs=vp9"
            : "video/webm",
        videoBitsPerSecond: getBitrate(state.recording.resolution),
      };

      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      recordedChunksRef.current = [];

      // Set up event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = finishRecording;

      // Start media recorder
      mediaRecorderRef.current.start(1000); // Collect data every 1 second

      // Set recording state
      dispatch(actions.startRecording());
      startTimeRef.current = Date.now();

      // Start timer for UI
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedTime(elapsed);

        // Auto-stop if duration is reached
        if (elapsed >= state.recording.duration) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setCountdown(0);
    }
  };

  // Stop the recording
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Reset recording UI state
      setElapsedTime(0);
      dispatch(actions.stopRecording());

      // Reset canvas size
      if (originalSizeRef.current && rendererRef.current) {
        rendererRef.current.width = originalSizeRef.current.width;
        rendererRef.current.height = originalSizeRef.current.height;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Finish recording and download video
  const finishRecording = () => {
    try {
      const blob = new Blob(recordedChunksRef.current, {
        type: state.recording.format === "webm" ? "video/webm" : "video/mp4",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style.display = "none";
      a.href = url;
      a.download = `earth-visualization-${new Date()
        .toISOString()
        .substring(0, 19)}.${state.recording.format}`;
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      recordedChunksRef.current = [];
    } catch (error) {
      console.error("Error finishing recording:", error);
    }
  };

  // Handle record button click
  const handleRecordClick = () => {
    if (state.ui.isRecording) {
      stopRecording();
    } else {
      startCountdown();
    }
  };

  return (
    <>
      <RecordingControlsContainer>
        <RecordingButton
          isRecording={state.ui.isRecording}
          onClick={handleRecordClick}
        >
          {state.ui.isRecording ? (
            <>
              <StopIcon /> Stop Recording
            </>
          ) : (
            <>
              <RecordingIcon /> Record
            </>
          )}
        </RecordingButton>
      </RecordingControlsContainer>

      {countdown > 0 && (
        <CountdownOverlay>
          <CountdownNumber>{countdown}</CountdownNumber>
        </CountdownOverlay>
      )}

      {state.ui.isRecording && (
        <RecordingIndicator>
          <div className="recording-dot" />
          Recording
          <RecordingTime>{formatTime(elapsedTime)}</RecordingTime>
        </RecordingIndicator>
      )}
    </>
  );
};

export default RecordingControls;
