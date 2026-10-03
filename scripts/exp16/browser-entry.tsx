// Synthetic browser harness renders the real client component with real API handlers.
import React from "react";
import { createRoot } from "react-dom/client";
import { ReviewWorkspace } from "../../src/components/corrections/review-workspace";
createRoot(document.getElementById("root")!).render(<ReviewWorkspace/>);
