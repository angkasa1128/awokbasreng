const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const { generateProject } = require('./projectGenerator');

/**
 * Build APK from user configuration
 * @param {Object} config - User configuration
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Build result
 */
async function buildApk(config, onProgress = () => { }) {
    const buildId = uuidv4();
    const buildDir = path.join(__dirname, '..', '..', 'temp', buildId);

    try {
        onProgress('📋 Menyiapkan project...');

        // Generate Android project from template
        await generateProject(buildDir, config);

        onProgress('🔨 Mengompilasi APK...');

        // Build APK with Gradle
        const gradleResult = await runGradle(buildDir, onProgress);

        if (!gradleResult.success) {
            throw new Error(gradleResult.error);
        }

        // Find the output APK
        const apkPath = await findApk(buildDir);

        if (!apkPath) {
            throw new Error('APK tidak ditemukan setelah build');
        }

        // Copy APK to output directory with proper name
        const outputDir = path.join(__dirname, '..', '..', 'output');
        await fs.ensureDir(outputDir);

        const sanitizedName = config.appName.replace(/[^a-zA-Z0-9]/g, '_');
        const finalApkPath = path.join(outputDir, `${sanitizedName}_${Date.now()}.apk`);
        await fs.copy(apkPath, finalApkPath);

        onProgress('✅ APK berhasil dibuat!');

        return {
            success: true,
            apkPath: finalApkPath,
            buildDir: buildDir
        };

    } catch (error) {
        console.error('Build error:', error);

        // Cleanup on error
        await fs.remove(buildDir).catch(() => { });

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Run Gradle build
 */
async function runGradle(projectDir, onProgress) {
    return new Promise(async (resolve) => {
        const isWindows = process.platform === 'win32';

        // Always use global gradle command (more reliable than wrapper)
        // Gradle global sudah terinstall via setup-sdk atau package manager
        const gradleCmd = 'gradle';

        onProgress('🔨 Building with Gradle...');

        // Termux/ARM compatible flags
        const args = [
            'assembleDebug',
            '--no-daemon',
            '--no-watch-fs',
            '--no-build-cache',
            '-Dorg.gradle.native=false',
            '--stacktrace'
        ];

        const gradle = spawn(gradleCmd, args, {
            cwd: projectDir,
            shell: true,
            env: {
                ...process.env,
                JAVA_HOME: process.env.JAVA_HOME || '',
                ANDROID_HOME: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '',
                // Critical: Set GRADLE_OPTS to bypass native-platform error on Termux
                // Use smaller heap for mobile devices (512m instead of 2048m)
                GRADLE_OPTS: (process.env.GRADLE_OPTS || '') + ' -Dorg.gradle.native=false -Dfile.encoding=UTF-8 -Xmx512m',
                // Smaller heap for Termux mobile
                _JAVA_OPTIONS: '-Xmx512m -Dfile.encoding=UTF-8'
            }
        });

        let stdout = '';
        let stderr = '';

        gradle.stdout.on('data', (data) => {
            stdout += data.toString();
            // Parse progress if available
            const output = data.toString();
            if (output.includes('BUILD')) {
                onProgress('🔨 Building...');
            }
        });

        gradle.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        gradle.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                // Log full output for debugging
                console.error('=== GRADLE BUILD FAILED ===');
                console.error('STDOUT:', stdout);
                console.error('STDERR:', stderr);
                console.error('===========================');

                // Extract meaningful error message
                let errorMsg = 'Build gagal';
                const allOutput = stdout + stderr;

                if (allOutput.includes('SDK location not found')) {
                    errorMsg = 'Android SDK tidak ditemukan. Pastikan ANDROID_HOME sudah diset.';
                } else if (allOutput.includes('JAVA_HOME')) {
                    errorMsg = 'Java tidak ditemukan. Pastikan JAVA_HOME sudah diset.';
                } else if (allOutput.includes('Could not find com.android.tools')) {
                    errorMsg = 'Android Gradle Plugin tidak ditemukan. Periksa koneksi internet.';
                } else if (allOutput.includes('error:')) {
                    // Get the error line
                    const errorLines = allOutput.split('\n').filter(l => l.includes('error:'));
                    errorMsg = errorLines[0] || 'Build gagal dengan error';
                } else {
                    // Get BUILD FAILED line and context
                    const lines = allOutput.split('\n').filter(l => l.trim());
                    const failedIndex = lines.findIndex(l => l.includes('BUILD FAILED'));
                    if (failedIndex > 0) {
                        errorMsg = lines[failedIndex - 1] || lines[failedIndex];
                    } else {
                        errorMsg = lines[lines.length - 1] || 'Build gagal';
                    }
                }
                resolve({
                    success: false,
                    error: errorMsg
                });
            }
        });

        gradle.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });

        // Timeout: 30 minutes absolute maximum
        const TIMEOUT_MS = 30 * 60 * 1000;
        const buildStartTime = Date.now();

        const timeoutCheck = setInterval(() => {
            const elapsed = Date.now() - buildStartTime;
            if (elapsed > TIMEOUT_MS) {
                clearInterval(timeoutCheck);
                try {
                    gradle.kill('SIGKILL'); // Force kill
                } catch (e) {
                    console.error('[Gradle] Failed to kill process:', e.message);
                }
                resolve({
                    success: false,
                    error: 'Build timeout (exceeded 30 minutes). Server mungkin overloaded, coba lagi nanti.'
                });
            }
        }, 30000); // Check every 30 seconds

        // Clear timeout when process ends
        gradle.on('close', () => clearInterval(timeoutCheck));
    });
}

/**
 * Find the built APK file
 */
async function findApk(projectDir) {
    const apkDir = path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'release');

    if (!await fs.pathExists(apkDir)) {
        // Try debug folder
        const debugDir = path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'debug');
        if (await fs.pathExists(debugDir)) {
            const files = await fs.readdir(debugDir);
            const apk = files.find(f => f.endsWith('.apk'));
            if (apk) return path.join(debugDir, apk);
        }
        return null;
    }

    const files = await fs.readdir(apkDir);
    const apk = files.find(f => f.endsWith('.apk'));

    return apk ? path.join(apkDir, apk) : null;
}

/**
 * Download gradle-wrapper.jar
 */
async function downloadGradleWrapper(targetPath) {
    const https = require('https');
    const http = require('http');

    // Ensure directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Gradle wrapper URLs to try
    const urls = [
        'https://raw.githubusercontent.com/AkaGiant/gradle-wrapper/main/gradle-wrapper.jar',
        'https://raw.githubusercontent.com/nicbou/gradle-wrapper-template/master/gradle/wrapper/gradle-wrapper.jar'
    ];

    for (const url of urls) {
        try {
            await downloadFile(url, targetPath);
            const stats = await fs.stat(targetPath);
            if (stats.size > 50000) { // Should be at least 50KB
                return true;
            }
        } catch (err) {
            console.error(`Failed to download from ${url}:`, err.message);
        }
    }

    throw new Error('Failed to download gradle wrapper from all sources');
}

/**
 * Download a file from URL
 */
function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        const https = require('https');
        const file = fs.createWriteStream(targetPath);

        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirect
                downloadFile(res.headers.location, targetPath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(targetPath, () => { });
            reject(err);
        });
    });
}

module.exports = { buildApk };
