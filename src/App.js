import { AppProvider } from "./context/AppContext";
import EarthViewer from "./components/EarthViewer";
import "./App.css"; // Re-enable this import

export default function App() {
  return (
    <AppProvider>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000011",
          position: "relative",
        }}
      >
        <EarthViewer />
      </div>
    </AppProvider>
  );
}
