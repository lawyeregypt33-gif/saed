// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    app: "SAED COMPLY",
    service: "Saudi HR Compliance & Violations Management System",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  const indexPath = path.join(distPath, "index.html");
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SAED COMPLY server listening on port ${PORT}`);
});
