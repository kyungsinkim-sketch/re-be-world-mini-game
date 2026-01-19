import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 5178;

// Remove CSP headers from responses
app.use((req, res, next) => {
    const originalSetHeader = res.setHeader;
    res.setHeader = function (name, value) {
        if (name.toLowerCase() === 'content-security-policy') {
            return; // Skip CSP headers
        }
        return originalSetHeader.apply(this, arguments);
    };
    next();
});

// Proxy all requests to Vite
app.use('/', createProxyMiddleware({
    target: 'http://localhost:5176',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxy
    onProxyRes: (proxyRes, req, res) => {
        // Force a permissive CSP header
        // This overrides any upstream headers and allows unsafe-eval
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';");

        // Remove potentially conflicting headers
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['content-security-policy-report-only'];
    }
}));

app.listen(PORT, () => {
    console.log(`\n🔧 Proxy server running on port ${PORT}`);
    console.log(`📡 Proxying to Vite dev server on port 5176`);
    console.log(`🌐 Access at: http://localhost:${PORT}\n`);
});
