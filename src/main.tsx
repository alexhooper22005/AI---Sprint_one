import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { createTrailRepositoryFromEnvironment } from "./data/createTrailRepository";
import App from "./ui/App";
import "./ui/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const repositoryConfiguration = createTrailRepositoryFromEnvironment();

createRoot(rootElement).render(
  <StrictMode>
    <App
      repository={repositoryConfiguration.repository}
      configurationError={repositoryConfiguration.error}
    />
  </StrictMode>,
);
