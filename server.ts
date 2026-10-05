import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Cloud Run container health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    app: 'SAED COMPLY',
    service: 'Saudi HR Compliance & Violations Management System',
    timestamp: new Date().toISOString(),
  });
});

// Serve production static assets from dist/
const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

// SPA fallback to index.html for client-side routing
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>SAED COMPLY</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>SAED COMPLY - Production Build Pending</h2>
          <p>Please run <code>npm run build</code> to generate the client bundle.</p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SAED COMPLY server listening on port ${PORT}`);
});
