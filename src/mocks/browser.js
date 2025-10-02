// src/mocks/browser.js
// MSW v2: import setupWorker from msw/browser
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// Start the worker when dev environment loads (example)
worker.start();
