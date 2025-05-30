import { useEffect } from "react";
import { useAppContext, actions } from "../context/AppContext";

const KeyboardShortcuts = () => {
  const { dispatch } = useAppContext();

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent default if it's one of our shortcuts
      const shortcuts = ["c", "s", "r", "h", "Space", "f"];
      if (shortcuts.includes(event.code) || shortcuts.includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key.toLowerCase()) {
        case "c":
          dispatch(actions.toggleControls());
          break;
        case "s":
          dispatch(actions.toggleSettings());
          break;
        case "r":
          dispatch(actions.toggleRecording());
          break;
        case "h":
          dispatch(actions.toggleCountryInfo());
          break;
        case " ":
        case "space":
          dispatch(actions.toggleAnimation());
          break;
        case "f":
          // Toggle fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
        case "escape":
          dispatch(actions.selectCountry(null));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [dispatch]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
