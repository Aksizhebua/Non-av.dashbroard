const fs = require('fs');
const path = require('path');
const http = require('http');

// Function to find available port
async function findAvailablePort(startPort) {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => {
                resolve(port);
            });
        });
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// Start server with available port
async function startServer() {
    const port = await findAvailablePort(3000);

    // MIME types untuk file static
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
    };

    const server = http.createServer((req, res) => {
        console.log(`Request: ${req.method} ${req.url}`);
        
        // Default ke login.html jika akses root
        let filePath = req.url === '/' ? '/login.html' : req.url;
        filePath = path.join(__dirname, filePath);
        
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeType = mimeTypes[extname] || 'application/octet-stream';
        
        // Cek apakah file ada
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    // File not found - return 404
                    console.log(`❌ File not found: ${filePath}`);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <head><title>404 - File Not Found</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                            <h1>404 - File Not Found</h1>
                            <p>The requested file "${req.url}" was not found.</p>
                            <p><a href="/login.html">← Back to Login</a></p>
                        </body>
                        </html>
                    `);
                } else {
                    console.log(`❌ Server error: ${error.code} for ${filePath}`);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <head><title>500 - Server Error</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                            <h1>500 - Server Error</h1>
                            <p>An error occurred: ${error.code}</p>
                            <p><a href="/login.html">← Back to Login</a></p>
                        </body>
                        </html>
                    `);
                }
            } else {
                res.writeHead(200, { 
                    'Content-Type': mimeType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(port, () => {
        console.log(`🚀 AJSquare Payment System running at:`);
        console.log(`   ➜ Local:   http://localhost:${port}`);
        console.log(`   ➜ Network: http://localhost:${port}`);
        console.log(`\n🔐 Login page: http://localhost:${port}/login.html`);
        console.log(`📊 Dashboard: http://localhost:${port}/index.html`);
        console.log(`💳 Payments:  http://localhost:${port}/kelola-ajsquare.html`);
        console.log(`\n⏳ Server ready! Press Ctrl+C to stop`);
    });

    // Error handling
    server.on('error', (error) => {
        console.error(`❌ Server error: ${error.message}`);
        if (error.code === 'EADDRINUSE') {
            console.log(`🔄 Port ${port} is busy, trying another port...`);
            startServer(); // Try again with different port
        }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error.message);
        console.log('🔧 Server continuing to run...');
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        console.log('🔧 Server continuing to run...');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n👋 Server shutting down gracefully...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('\n👋 Server shutting down gracefully...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });
}

// Start the server
startServer().catch(console.error);