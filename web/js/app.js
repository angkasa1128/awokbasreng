/**
 * Dolphin Web2 APK Dashboard - JavaScript App
 */

// State
let selectedColor = '#2196F3';
let selectedIcon = null;
let expireCountdown = null;

// ZIP Build State
let selectedProjectType = 'flutter';
let selectedBuildType = 'release';
let selectedZipFile = null;
let zipExpireCountdown = null;

// DOM Elements
const elements = {
    // Stats
    serverStatus: document.getElementById('serverStatus'),
    totalUsers: document.getElementById('totalUsers'),
    uptime: document.getElementById('uptime'),
    queueStatus: document.getElementById('queueStatus'),
    activeSessions: document.getElementById('activeSessions'),

    // Specs
    osInfo: document.getElementById('osInfo'),
    cpuInfo: document.getElementById('cpuInfo'),
    memInfo: document.getElementById('memInfo'),
    memoryBar: document.getElementById('memoryBar'),
    memoryText: document.getElementById('memoryText'),
    nodeInfo: document.getElementById('nodeInfo'),

    // Form
    buildForm: document.getElementById('buildForm'),
    urlInput: document.getElementById('urlInput'),
    appNameInput: document.getElementById('appNameInput'),
    buildBtn: document.getElementById('buildBtn'),

    // Icon upload
    iconUploadZone: document.getElementById('iconUploadZone'),
    iconInput: document.getElementById('iconInput'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    uploadPreview: document.getElementById('uploadPreview'),
    iconPreviewImg: document.getElementById('iconPreviewImg'),
    removeIconBtn: document.getElementById('removeIconBtn'),

    // Progress
    buildProgress: document.getElementById('buildProgress'),
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),

    // Result
    buildResult: document.getElementById('buildResult'),
    downloadBtn: document.getElementById('downloadBtn'),
    expireTime: document.getElementById('expireTime'),

    // Error
    buildError: document.getElementById('buildError'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),

    // ZIP Build Form
    zipBuildForm: document.getElementById('zipBuildForm'),
    zipUploadZone: document.getElementById('zipUploadZone'),
    zipInput: document.getElementById('zipInput'),
    zipPlaceholder: document.getElementById('zipPlaceholder'),
    zipPreview: document.getElementById('zipPreview'),
    zipFileName: document.getElementById('zipFileName'),
    removeZipBtn: document.getElementById('removeZipBtn'),
    zipBuildBtn: document.getElementById('zipBuildBtn'),

    // ZIP Build Progress/Result/Error
    zipBuildProgress: document.getElementById('zipBuildProgress'),
    zipProgressText: document.getElementById('zipProgressText'),
    zipProgressFill: document.getElementById('zipProgressFill'),
    zipBuildResult: document.getElementById('zipBuildResult'),
    zipDownloadBtn: document.getElementById('zipDownloadBtn'),
    zipExpireTime: document.getElementById('zipExpireTime'),
    zipBuildError: document.getElementById('zipBuildError'),
    zipErrorMessage: document.getElementById('zipErrorMessage'),
    zipRetryBtn: document.getElementById('zipRetryBtn'),

    // Actions
    refreshBtn: document.getElementById('refreshBtn')
};

// Build card elements
const urlBuildCard = document.getElementById('urlBuildCard');
const zipBuildCard = document.getElementById('zipBuildCard');

// Logs elements
const logsCard = document.querySelector('.logs-card');
const logsToggle = document.getElementById('logsToggle');
const logsContainer = document.getElementById('logsContainer');
const logsRefreshBtn = document.getElementById('logsRefreshBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadSpecs();
    setupColorPicker();
    setupIconUpload();
    setupForm();
    setupRefresh();
    setupTabs();

    // ZIP Build setup
    setupProjectTypePicker();
    setupBuildTypePicker();
    setupZipUpload();
    setupZipForm();

    // Logs setup
    setupLogs();
    loadLogs();

    // Auto-refresh stats every 10 seconds
    setInterval(loadStats, 10000);
});

// Setup build mode tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;

            if (tab === 'url') {
                urlBuildCard.classList.remove('hidden');
                zipBuildCard.classList.add('hidden');
            } else {
                urlBuildCard.classList.add('hidden');
                zipBuildCard.classList.remove('hidden');
            }
        });
    });
}

// Load server stats
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        elements.totalUsers.textContent = data.totalUsers;
        elements.activeSessions.textContent = data.activeSessions;
        elements.uptime.textContent = formatUptime(data.uptime);

        // Queue status
        const isBusy = data.queueStatus === 'busy';
        elements.queueStatus.textContent = isBusy ? 'Busy' : 'Ready';
        elements.serverStatus.className = `status-badge ${isBusy ? 'busy' : ''}`;
        elements.serverStatus.querySelector('span:last-child').textContent =
            isBusy ? 'Building...' : 'Online';

    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load server specs
async function loadSpecs() {
    try {
        const response = await fetch('/api/specs');
        const data = await response.json();

        // OS Info
        const osName = getOSName(data.os.platform);
        elements.osInfo.textContent = `${osName} (${data.os.arch})`;

        // CPU Info
        const cpuModel = data.cpu.model.split('@')[0].trim();
        elements.cpuInfo.textContent = `${cpuModel} • ${data.cpu.cores} Cores`;

        // Memory Info
        elements.memInfo.textContent = `${data.memory.used} GB / ${data.memory.total} GB`;

        const memPercent = Math.round((data.memory.used / data.memory.total) * 100);
        elements.memoryBar.style.width = `${memPercent}%`;
        elements.memoryText.textContent = `${memPercent}% used`;

        // Node Info
        elements.nodeInfo.textContent = data.node;

    } catch (error) {
        console.error('Failed to load specs:', error);
    }
}

// Format uptime
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Get OS name from platform
function getOSName(platform) {
    const names = {
        'win32': 'Windows',
        'darwin': 'macOS',
        'linux': 'Linux',
        'android': 'Android'
    };
    return names[platform] || platform;
}

// Setup color picker
function setupColorPicker() {
    const colorBtns = document.querySelectorAll('.color-btn');

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });
}

// Setup icon upload
function setupIconUpload() {
    const zone = elements.iconUploadZone;
    const input = elements.iconInput;

    // Click to upload
    zone.addEventListener('click', () => {
        if (!selectedIcon) {
            input.click();
        }
    });

    // File selected
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleIconFile(file);
        }
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleIconFile(file);
        }
    });

    // Remove button
    elements.removeIconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeIcon();
    });
}

// Handle icon file
function handleIconFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file (PNG or JPG)');
        return;
    }

    selectedIcon = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.iconPreviewImg.src = e.target.result;
        elements.uploadPlaceholder.classList.add('hidden');
        elements.uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Remove icon
function removeIcon() {
    selectedIcon = null;
    elements.iconInput.value = '';
    elements.iconPreviewImg.src = '';
    elements.uploadPlaceholder.classList.remove('hidden');
    elements.uploadPreview.classList.add('hidden');
}

// Setup form
function setupForm() {
    elements.buildForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await startBuild();
    });

    elements.retryBtn.addEventListener('click', () => {
        resetForm();
    });
}

// Setup refresh button
function setupRefresh() {
    elements.refreshBtn.addEventListener('click', () => {
        loadStats();
        loadSpecs();
    });
}

// Start build
async function startBuild() {
    const url = elements.urlInput.value.trim();
    const appName = elements.appNameInput.value.trim();

    if (!url || !appName) return;

    // Validate URL
    try {
        new URL(url);
    } catch {
        showError('URL tidak valid. Pastikan dimulai dengan http:// atau https://');
        return;
    }

    // Show progress
    showProgress();

    try {
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 15, 90);
            elements.progressFill.style.width = `${progress}%`;

            // Update text based on progress
            if (progress < 20) {
                elements.progressText.textContent = 'Preparing project...';
            } else if (progress < 40) {
                elements.progressText.textContent = 'Configuring Android project...';
            } else if (progress < 60) {
                elements.progressText.textContent = 'Building APK...';
            } else if (progress < 80) {
                elements.progressText.textContent = 'Compiling resources...';
            } else {
                elements.progressText.textContent = 'Finalizing...';
            }
        }, 500);

        // Use FormData for file upload
        const formData = new FormData();
        formData.append('url', url);
        formData.append('appName', appName);
        formData.append('themeColor', selectedColor);
        if (selectedIcon) {
            formData.append('icon', selectedIcon);
        }

        const response = await fetch('/api/build', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Build failed');
        }

        // Success
        elements.progressFill.style.width = '100%';
        elements.progressText.textContent = 'Build complete!';

        setTimeout(() => {
            showResult(data.downloadUrl, data.expiresIn);
        }, 500);

    } catch (error) {
        showError(error.message);
    }
}

// Show progress
function showProgress() {
    elements.buildBtn.disabled = true;
    elements.buildProgress.classList.remove('hidden');
    elements.buildResult.classList.add('hidden');
    elements.buildError.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = 'Starting build...';
}

// Show result
function showResult(downloadUrl, expiresIn) {
    elements.buildProgress.classList.add('hidden');
    elements.buildResult.classList.remove('hidden');
    elements.downloadBtn.href = downloadUrl;

    // Start countdown
    let timeLeft = expiresIn;
    elements.expireTime.textContent = timeLeft;

    if (expireCountdown) clearInterval(expireCountdown);

    expireCountdown = setInterval(() => {
        timeLeft--;
        elements.expireTime.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(expireCountdown);
            resetForm();
        }
    }, 1000);
}

// Show error
function showError(message) {
    elements.buildProgress.classList.add('hidden');
    elements.buildResult.classList.add('hidden');
    elements.buildError.classList.remove('hidden');
    elements.errorMessage.textContent = message;
    elements.buildBtn.disabled = false;
}

// Reset form
function resetForm() {
    elements.buildBtn.disabled = false;
    elements.buildProgress.classList.add('hidden');
    elements.buildResult.classList.add('hidden');
    elements.buildError.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    removeIcon();

    if (expireCountdown) {
        clearInterval(expireCountdown);
        expireCountdown = null;
    }
}

// ==================== ZIP BUILD ====================

// Setup project type picker
function setupProjectTypePicker() {
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedProjectType = btn.dataset.type;
        });
    });
}

// Setup build type picker
function setupBuildTypePicker() {
    const buildBtns = document.querySelectorAll('.build-type-btn');
    buildBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            buildBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedBuildType = btn.dataset.build;
        });
    });
}

// Setup ZIP upload
function setupZipUpload() {
    const zone = elements.zipUploadZone;
    const input = elements.zipInput;

    zone.addEventListener('click', () => {
        if (!selectedZipFile) {
            input.click();
        }
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleZipFile(file);
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) {
            handleZipFile(file);
        }
    });

    elements.removeZipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeZip();
    });
}

function handleZipFile(file) {
    if (!file.name.endsWith('.zip')) {
        showZipError('Please select a ZIP file');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showZipError('File too large. Max 50MB.');
        return;
    }

    selectedZipFile = file;
    elements.zipFileName.textContent = file.name;
    elements.zipPlaceholder.classList.add('hidden');
    elements.zipPreview.classList.remove('hidden');
}

function removeZip() {
    selectedZipFile = null;
    elements.zipInput.value = '';
    elements.zipFileName.textContent = '';
    elements.zipPlaceholder.classList.remove('hidden');
    elements.zipPreview.classList.add('hidden');
}

// Setup ZIP form
function setupZipForm() {
    elements.zipBuildForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await startZipBuild();
    });

    elements.zipRetryBtn.addEventListener('click', () => {
        resetZipForm();
    });
}

async function startZipBuild() {
    if (!selectedZipFile) {
        showZipError('Please select a ZIP file');
        return;
    }

    showZipProgress();
    elements.zipProgressText.textContent = 'Uploading project...';
    elements.zipProgressFill.style.width = '5%';

    // Create abort controller for timeout (30 minutes for Flutter builds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minute timeout

    try {
        const formData = new FormData();
        formData.append('zipFile', selectedZipFile);
        formData.append('projectType', selectedProjectType);
        formData.append('buildType', selectedBuildType);

        // Start progress animation
        let progress = 5;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 8, 90);
            elements.zipProgressFill.style.width = `${progress}%`;

            if (progress < 15) {
                elements.zipProgressText.textContent = 'Uploading project...';
            } else if (progress < 25) {
                elements.zipProgressText.textContent = 'Extracting files...';
            } else if (progress < 40) {
                elements.zipProgressText.textContent = 'Installing dependencies...';
            } else if (progress < 70) {
                elements.zipProgressText.textContent = 'Building APK (this may take a while)...';
            } else {
                elements.zipProgressText.textContent = 'Finalizing build...';
            }
        }, 2000);

        // Use legacy endpoint which is more reliable
        const response = await fetch('/api/build-zip', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Server error' }));
            throw new Error(data.error || `Build failed (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (data.success) {
            elements.zipProgressFill.style.width = '100%';
            elements.zipProgressText.textContent = 'Build complete!';

            // Refresh logs
            loadLogs();

            setTimeout(() => {
                showZipResult(data.downloadUrl, data.expiresIn);
            }, 500);
        } else {
            throw new Error(data.error || 'Build failed');
        }

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Build error:', error);

        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Build timeout (30 minutes). Check PM2 logs - build may still be running in background.';
        } else if (error.message === 'Failed to fetch') {
            errorMessage = 'Network error. Check your connection and try again.';
        }

        showZipError(errorMessage);
        loadLogs(); // Show error logs
    }
}

function handleSSEEvent(event, data) {
    switch (event) {
        case 'progress':
            elements.zipProgressFill.style.width = `${data.progress}%`;
            elements.zipProgressText.textContent = data.status;
            loadLogs(); // Auto-refresh logs
            break;
        case 'complete':
            elements.zipProgressFill.style.width = '100%';
            elements.zipProgressText.textContent = 'Build complete!';
            loadLogs(); // Final logs refresh
            setTimeout(() => {
                showZipResult(data.downloadUrl, data.expiresIn);
            }, 500);
            break;
        case 'error':
            showZipError(data.error);
            loadLogs(); // Show error in logs
            break;
    }
}

function showZipProgress() {
    elements.zipBuildBtn.disabled = true;
    elements.zipBuildProgress.classList.remove('hidden');
    elements.zipBuildResult.classList.add('hidden');
    elements.zipBuildError.classList.add('hidden');
    elements.zipProgressFill.style.width = '0%';
    elements.zipProgressText.textContent = 'Starting build...';
}

function showZipResult(downloadUrl, expiresIn) {
    elements.zipBuildProgress.classList.add('hidden');
    elements.zipBuildResult.classList.remove('hidden');
    elements.zipDownloadBtn.href = downloadUrl;

    let timeLeft = expiresIn;
    elements.zipExpireTime.textContent = timeLeft;

    if (zipExpireCountdown) clearInterval(zipExpireCountdown);

    zipExpireCountdown = setInterval(() => {
        timeLeft--;
        elements.zipExpireTime.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(zipExpireCountdown);
            resetZipForm();
        }
    }, 1000);
}

function showZipError(message) {
    elements.zipBuildProgress.classList.add('hidden');
    elements.zipBuildResult.classList.add('hidden');
    elements.zipBuildError.classList.remove('hidden');
    elements.zipErrorMessage.textContent = message;
    elements.zipBuildBtn.disabled = false;
}

function resetZipForm() {
    elements.zipBuildBtn.disabled = false;
    elements.zipBuildProgress.classList.add('hidden');
    elements.zipBuildResult.classList.add('hidden');
    elements.zipBuildError.classList.add('hidden');
    elements.zipProgressFill.style.width = '0%';
    removeZip();

    if (zipExpireCountdown) {
        clearInterval(zipExpireCountdown);
        zipExpireCountdown = null;
    }
}

// ==================== LOGS PANEL ====================

let logsAutoRefreshInterval = null;
let isBuildInProgress = false;

function setupLogs() {
    // Toggle logs panel
    logsToggle.addEventListener('click', (e) => {
        // Ignore if clicking the refresh button
        if (e.target.closest('.logs-refresh')) return;
        logsCard.classList.toggle('collapsed');
    });

    // Refresh logs button
    logsRefreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadLogs();
    });

    // Start auto-refresh (every 2 seconds during build, every 5 seconds when idle)
    startLogsAutoRefresh();
}

function startLogsAutoRefresh() {
    if (logsAutoRefreshInterval) {
        clearInterval(logsAutoRefreshInterval);
    }
    
    logsAutoRefreshInterval = setInterval(() => {
        // Refresh more frequently during builds
        loadLogs();
    }, isBuildInProgress ? 2000 : 5000);
}

function setBuildInProgress(inProgress) {
    isBuildInProgress = inProgress;
    // Restart interval with new timing
    startLogsAutoRefresh();
}

async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const logs = await response.json();

        if (logs.length === 0) {
            logsContainer.innerHTML = `
                <div class="log-empty">
                    <i class="ri-inbox-line"></i>
                    <span>No build logs yet</span>
                </div>
            `;
            return;
        }

        // Check if there's an active build based on recent logs
        const recentLog = logs[0];
        const isRecent = (Date.now() - new Date(recentLog.timestamp).getTime()) < 30000; // 30 seconds
        const isBuilding = isRecent && !['success', 'error'].includes(recentLog.level);
        
        if (isBuilding !== isBuildInProgress) {
            setBuildInProgress(isBuilding);
        }

        logsContainer.innerHTML = logs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const detailsHtml = log.details
                ? `<div class="log-details">${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</div>`
                : '';

            return `
                <div class="log-entry level-${log.level}">
                    <span class="log-time">${time}</span>
                    <span class="log-level">${log.level}</span>
                    <div class="log-message">
                        ${escapeHtml(log.message)}
                        ${detailsHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Auto-scroll to top (newest logs first)
        logsContainer.scrollTop = 0;

    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
