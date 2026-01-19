import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5176,
        host: '0.0.0.0', // 외부 접속 허용
        strictPort: true,
        allowedHosts: true, // 모든 호스트 허용 (Vite 5.4+ 대응)
        cors: true,
        headers: {
            // 가장 강력한 수준의 허용 정책 주입
            'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' 'self'; style-src * 'unsafe-inline'; font-src * data:;",
            'Access-Control-Allow-Origin': '*'
        },
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1:3005',
                ws: true,
                changeOrigin: true
            }
        }
    }
});
