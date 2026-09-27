import { createApp } from '../server/app.js';

// Vercel serves the Vite build separately; keep API requests on the same origin.
export default createApp();
