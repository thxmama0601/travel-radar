import { createRoot } from "react-dom/client";
import Dashboard from "../app/news-dashboard";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <Dashboard endpoint="./data/news.json" snapshotMode />,
);
