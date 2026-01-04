/**
 * Web Server for Dolphin Web2 APK Dashboard
 * Auto-detects domain and displays server specs
 */

const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const multer = require('multer');
const cors = require('cors');

const app = express();
const HOST = process.env.WEB_HOST || '0.0.0.0';

// Trust proxy for reverse proxy support (Nginx, Cloudflare, etc.)
app.set('trust proxy', 1);
const PORT = process.env.WEB_PORT || 3000;

// Configure multer for icon uploads
const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `icon-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware
// CORS configuration for custom domain access
app.use(cors({
    origin: true,  // Allow all origins (for flexibility with custom domains)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request timeout for long build operations (30 minutes)
app.use((req, res, next) => {
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'web')));

// Store for web builds (with 1-minute auto-cleanup)
const webBuilds = new Map();

// Get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }

    return ips;
}

// Get server specifications
function getServerSpecs() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
        os: {
            platform: os.platform(),
            release: os.release(),
            type: os.type(),
            arch: os.arch()
        },
        cpu: {
            model: cpus[0]?.model || 'Unknown',
            cores: cpus.length,
            speed: cpus[0]?.speed || 0
        },
        memory: {
            total: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
            free: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
            used: Math.round((totalMem - freeMem) / (1024 * 1024 * 1024) * 100) / 100
        },
        node: process.version,
        uptime: Math.floor(os.uptime())
    };
}

// API Routes
app.get('/api/specs', (req, res) => {
    res.json(getServerSpecs());
});

app.get('/api/stats', (req, res) => {
    const userService = require('./utils/userService');
    const { buildQueue } = require('./utils/buildQueue');

    res.json({
        totalUsers: userService.getCount(),
        activeSessions: global.sessions?.size || 0,
        queueStatus: buildQueue.isBusy() ? 'busy' : 'available',
        currentBuild: buildQueue.getCurrentBuild(),
        uptime: Math.floor(process.uptime())
    });
});

// Build from web (URL to APK) with optional icon upload
app.post('/api/build', upload.single('icon'), async (req, res) => {
    const { url, appName, themeColor } = req.body;
    const iconFile = req.file;
    const { buildQueue } = require('./utils/buildQueue');
    const { buildApk } = require('./builder/apkBuilder');

    // Validate input
    if (!url || !appName) {
        if (iconFile) await fs.remove(iconFile.path).catch(() => { });
        return res.status(400).json({ error: 'URL dan nama aplikasi diperlukan' });
    }

    // Check queue
    if (!buildQueue.acquire('web-' + Date.now())) {
        if (iconFile) await fs.remove(iconFile.path).catch(() => { });
        return res.status(503).json({ error: 'Server sedang sibuk. Coba lagi nanti.' });
    }

    try {
        const buildData = {
            url,
            appName,
            themeColor: themeColor || '#2196F3',
            iconPath: iconFile ? iconFile.path : null
        };

        const result = await buildApk(buildData, (status) => {
            console.log('[Web Build]', status);
        });

        // Cleanup uploaded icon
        if (iconFile) {
            await fs.remove(iconFile.path).catch(() => { });
        }

        if (result.success) {
            // Generate unique ID for download
            const buildId = 'web-' + Date.now();

            webBuilds.set(buildId, {
                path: result.apkPath,
                buildDir: result.buildDir,
                fileName: `${appName}.apk`,
                createdAt: Date.now()
            });

            // Auto-delete after 1 minute
            setTimeout(async () => {
                const build = webBuilds.get(buildId);
                if (build) {
                    await fs.remove(build.path).catch(() => { });
                    await fs.remove(build.buildDir).catch(() => { });
                    webBuilds.delete(buildId);
                    console.log(`[Web Build] Auto-deleted: ${buildId}`);
                }
            }, 60 * 1000); // 1 minute

            res.json({
                success: true,
                buildId,
                downloadUrl: `/api/download/${buildId}`,
                expiresIn: 60 // seconds
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        // Cleanup on error
        if (iconFile) {
            await fs.remove(iconFile.path).catch(() => { });
        }
        res.status(500).json({ error: error.message });
    } finally {
        buildQueue.release();
    }
});

// Download APK (cleanup handled by 1-minute auto-delete timeout)
app.get('/api/download/:buildId', async (req, res) => {
    const { buildId } = req.params;
    const build = webBuilds.get(buildId);

    if (!build) {
        return res.status(404).json({ error: 'File tidak ditemukan atau sudah kadaluarsa' });
    }

    if (!await fs.pathExists(build.path)) {
        webBuilds.delete(buildId);
        return res.status(404).json({ error: 'File sudah dihapus' });
    }

    res.download(build.path, build.fileName);
});

// Configure multer for ZIP uploads (larger files)
const zipStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `project-${Date.now()}.zip`);
    }
});

const zipUpload = multer({
    storage: zipStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    }
});

// Build logs storage
const buildLogs = [];
const MAX_LOGS = 100;

function addBuildLog(level, message, details = null) {
    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level,
        message,
        details
    };
    buildLogs.unshift(log);
    if (buildLogs.length > MAX_LOGS) buildLogs.pop();
    console.log(`[${level.toUpperCase()}] ${message}`, details || '');
    return log;
}

// Get build logs
app.get('/api/logs', (req, res) => {
    res.json(buildLogs.slice(0, 50));
});

// SSE endpoint for ZIP build with real-time progress
app.post('/api/build-zip-stream', zipUpload.single('zipFile'), async (req, res) => {
    const { projectType, buildType } = req.body;
    const zipFile = req.file;
    const { buildQueue } = require('./utils/buildQueue');
    const { buildFromZip } = require('./builder/zipBuilder');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (!zipFile) {
        sendEvent('error', { error: 'ZIP file diperlukan' });
        return res.end();
    }

    if (!['flutter', 'android'].includes(projectType)) {
        await fs.remove(zipFile.path).catch(() => { });
        sendEvent('error', { error: 'Project type tidak valid' });
        return res.end();
    }

    if (!buildQueue.acquire('web-zip-' + Date.now())) {
        await fs.remove(zipFile.path).catch(() => { });
        sendEvent('error', { error: 'Server sedang sibuk. Coba lagi nanti.' });
        return res.end();
    }

    try {
        addBuildLog('info', `Starting ${projectType} ${buildType} build`, { fileName: zipFile.originalname });
        sendEvent('progress', { progress: 5, status: 'Memulai proses build...' });

        const result = await buildFromZip(
            zipFile.path,
            projectType,
            buildType || 'release',
            (status) => {
                addBuildLog('info', status);

                // Estimate progress based on status
                let progress = 10;
                if (status.includes('Extracting')) progress = 15;
                else if (status.includes('Cleaning')) progress = 20;
                else if (status.includes('dependencies') || status.includes('Getting')) progress = 30;
                else if (status.includes('Compiling') || status.includes('Building')) progress = 50;
                else if (status.includes('Packaging') || status.includes('Processing')) progress = 70;
                else if (status.includes('Locating') || status.includes('complete')) progress = 90;

                sendEvent('progress', { progress, status });
            }
        );

        if (result.success) {
            const buildId = 'zip-' + Date.now();

            webBuilds.set(buildId, {
                path: result.apkPath,
                buildDir: result.buildDir,
                fileName: `${projectType}_${buildType}.apk`,
                createdAt: Date.now()
            });

            setTimeout(async () => {
                const build = webBuilds.get(buildId);
                if (build) {
                    await fs.remove(build.path).catch(() => { });
                    await fs.remove(build.buildDir).catch(() => { });
                    webBuilds.delete(buildId);
                    addBuildLog('info', `Auto-deleted build: ${buildId}`);
                }
            }, 60 * 1000);

            addBuildLog('success', 'Build completed successfully', { buildId });
            sendEvent('complete', {
                success: true,
                buildId,
                downloadUrl: `/api/download/${buildId}`,
                expiresIn: 60
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        addBuildLog('error', 'Build failed', { error: error.message });
        sendEvent('error', { error: error.message });
    } finally {
        await fs.remove(zipFile.path).catch(() => { });
        buildQueue.release();
        res.end();
    }
});

// Legacy endpoint (fallback)
app.post('/api/build-zip', zipUpload.single('zipFile'), async (req, res) => {
    const { projectType, buildType } = req.body;
    const zipFile = req.file;
    const { buildQueue } = require('./utils/buildQueue');
    const { buildFromZip } = require('./builder/zipBuilder');

    if (!zipFile) {
        return res.status(400).json({ error: 'ZIP file diperlukan' });
    }

    if (!['flutter', 'android'].includes(projectType)) {
        await fs.remove(zipFile.path).catch(() => { });
        return res.status(400).json({ error: 'Project type tidak valid' });
    }

    if (!buildQueue.acquire('web-zip-' + Date.now())) {
        await fs.remove(zipFile.path).catch(() => { });
        return res.status(503).json({ error: 'Server sedang sibuk. Coba lagi nanti.' });
    }

    try {
        addBuildLog('info', `Starting ${projectType} ${buildType} build (legacy)`, { fileName: zipFile.originalname });

        const result = await buildFromZip(
            zipFile.path,
            projectType,
            buildType || 'release',
            (status) => {
                addBuildLog('info', status);
            }
        );

        if (result.success) {
            const buildId = 'zip-' + Date.now();

            webBuilds.set(buildId, {
                path: result.apkPath,
                buildDir: result.buildDir,
                fileName: `${projectType}_${buildType}.apk`,
                createdAt: Date.now()
            });

            setTimeout(async () => {
                const build = webBuilds.get(buildId);
                if (build) {
                    await fs.remove(build.path).catch(() => { });
                    await fs.remove(build.buildDir).catch(() => { });
                    webBuilds.delete(buildId);
                }
            }, 60 * 1000);

            addBuildLog('success', 'Build completed successfully', { buildId });
            res.json({
                success: true,
                buildId,
                downloadUrl: `/api/download/${buildId}`,
                expiresIn: 60
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        addBuildLog('error', 'Build failed', { error: error.message });
        res.status(500).json({ error: error.message });
    } finally {
        await fs.remove(zipFile.path).catch(() => { });
        buildQueue.release();
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// Start server
function startWebServer() {
    const server = app.listen(PORT, HOST, () => {
        const ips = getLocalIPs();

        console.log('');
        console.log('🐬 Dolphin Web2 APK Dashboard:');
        console.log(`   Local:   http://localhost:${PORT}`);
        console.log(`   Binding: http://${HOST}:${PORT}`);

        ips.forEach(ip => {
            console.log(`   Network: http://${ip}:${PORT}`);
        });

        console.log('   Custom domain akan bekerja dengan reverse proxy');
        console.log('');
    });

    // Set server timeout for long-running build operations
    server.timeout = 30 * 60 * 1000; // 30 minutes
    server.keepAliveTimeout = 65 * 1000; // 65 seconds (longer than typical LB timeout)
    server.headersTimeout = 66 * 1000; // Slightly longer than keepAliveTimeout
}

module.exports = { startWebServer, getServerSpecs, getLocalIPs };
