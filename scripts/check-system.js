#!/usr/bin/env node
/**
 * System Check Script for Dolphin Web2 APK
 * Run this BEFORE npm install to check system compatibility
 * 
 * Usage: node scripts/check-system.js
 */

const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

// Colors for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, text) {
    console.log(`${color}${text}${colors.reset}`);
}

function checkCommand(cmd) {
    try {
        execSync(`which ${cmd}`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function getCommandVersion(cmd, args = '--version') {
    try {
        const output = execSync(`${cmd} ${args} 2>&1`, { stdio: 'pipe', encoding: 'utf8' });
        return output.split('\n')[0].trim();
    } catch {
        return null;
    }
}

console.log('\n');
log(colors.cyan, '╔══════════════════════════════════════════════════════════╗');
log(colors.cyan, '║       🐬 DOLPHIN WEB2 APK SYSTEM CHECK                  ║');
log(colors.cyan, '╚══════════════════════════════════════════════════════════╝');
console.log('');

// ============ SYSTEM INFO ============
log(colors.bright, '📱 SYSTEM INFORMATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const arch = os.arch();
const platform = os.platform();
const cpus = os.cpus();
const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);

// Detect Termux
const isTermux = process.env.PREFIX?.includes('com.termux') ||
    fs.existsSync('/data/data/com.termux/files/usr/bin/bash');

// Architecture mapping
const archMap = {
    'arm': 'ARM 32-bit (armv7l)',
    'arm64': 'ARM 64-bit (aarch64)',
    'x64': 'x86 64-bit (amd64)',
    'x86': 'x86 32-bit',
    'ia32': 'x86 32-bit'
};

console.log(`  Platform     : ${platform}`);
console.log(`  Architecture : ${colors.yellow}${archMap[arch] || arch}${colors.reset}`);
console.log(`  CPU          : ${cpus[0]?.model || 'Unknown'}`);
console.log(`  CPU Cores    : ${cpus.length}`);
console.log(`  Total RAM    : ${totalMem} GB`);
console.log(`  Free RAM     : ${freeMem} GB`);
console.log(`  Termux       : ${isTermux ? colors.green + 'Yes ✓' : colors.yellow + 'No'}${colors.reset}`);

console.log('');

// ============ ARCHITECTURE CHECK ============
log(colors.bright, '🏗️  ARCHITECTURE COMPATIBILITY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (arch === 'arm' || arch === 'arm64') {
    log(colors.yellow, `  ⚠️  ARM Architecture Detected: ${arch}`);
    console.log('');
    console.log('  📋 ARM Notes:');
    console.log('     - Sharp library uses WASM (may have issues)');
    console.log('     - Jimp will be used for image processing');
    console.log('     - Gradle builds may be slower');
    console.log('     - Recommended: Use VPS for faster builds');
} else {
    log(colors.green, `  ✓ x86/x64 Architecture: ${arch}`);
    console.log('     - Full compatibility with all libraries');
}

console.log('');

// ============ REQUIRED TOOLS ============
log(colors.bright, '🛠️  REQUIRED TOOLS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const tools = [
    { name: 'Node.js', cmd: 'node', args: '--version' },
    { name: 'npm', cmd: 'npm', args: '--version' },
    { name: 'Java', cmd: 'java', args: '-version 2>&1 | head -1' },
    { name: 'Gradle', cmd: 'gradle', args: '--version 2>&1 | grep Gradle' },
    { name: 'Git', cmd: 'git', args: '--version' }
];

let allToolsOk = true;

tools.forEach(tool => {
    const installed = checkCommand(tool.cmd);
    const version = installed ? getCommandVersion(tool.cmd, tool.args) : null;

    if (installed) {
        console.log(`  ${colors.green}✓${colors.reset} ${tool.name.padEnd(10)} : ${version || 'Installed'}`);
    } else {
        console.log(`  ${colors.red}✗${colors.reset} ${tool.name.padEnd(10)} : Not installed`);
        allToolsOk = false;
    }
});

console.log('');

// ============ ANDROID SDK ============
log(colors.bright, '📱 ANDROID SDK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const possibleSdkPaths = [
    '/opt/android-sdk',
    '/usr/lib/android-sdk',
    process.env.HOME + '/android-sdk',
    process.env.HOME + '/Android/Sdk',
    '/data/data/com.termux/files/home/android-sdk'
];

let sdkPath = androidHome;
if (!sdkPath) {
    for (const p of possibleSdkPaths) {
        if (fs.existsSync(p)) {
            sdkPath = p;
            break;
        }
    }
}

if (sdkPath && fs.existsSync(sdkPath)) {
    console.log(`  ${colors.green}✓${colors.reset} SDK Path    : ${sdkPath}`);

    // Check for build-tools
    const buildToolsPath = `${sdkPath}/build-tools`;
    if (fs.existsSync(buildToolsPath)) {
        const versions = fs.readdirSync(buildToolsPath);
        console.log(`  ${colors.green}✓${colors.reset} Build Tools : ${versions.join(', ')}`);
    }

    // Check for platforms
    const platformsPath = `${sdkPath}/platforms`;
    if (fs.existsSync(platformsPath)) {
        const platforms = fs.readdirSync(platformsPath);
        console.log(`  ${colors.green}✓${colors.reset} Platforms   : ${platforms.join(', ')}`);
    }
} else {
    console.log(`  ${colors.red}✗${colors.reset} Android SDK not found!`);
    console.log('');
    console.log('  📋 Install Android SDK:');
    if (isTermux) {
        console.log('     pkg install android-sdk');
        console.log('     export ANDROID_HOME=$HOME/android-sdk');
    } else {
        console.log('     Download from: https://developer.android.com/studio');
    }
    allToolsOk = false;
}

console.log('');

// ============ ENVIRONMENT VARIABLES ============
log(colors.bright, '🔧 ENVIRONMENT VARIABLES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const envVars = ['JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'GRADLE_OPTS'];
envVars.forEach(env => {
    const value = process.env[env];
    if (value) {
        console.log(`  ${colors.green}✓${colors.reset} ${env.padEnd(18)} = ${value}`);
    } else {
        console.log(`  ${colors.yellow}○${colors.reset} ${env.padEnd(18)} = (not set)`);
    }
});

console.log('');

// ============ RECOMMENDATIONS ============
log(colors.bright, '💡 RECOMMENDATIONS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (isTermux) {
    console.log('  📱 Termux Setup Commands:');
    console.log('');
    console.log(`  ${colors.cyan}# Set GRADLE_OPTS (required for Termux)${colors.reset}`);
    console.log('  echo \'export GRADLE_OPTS="-Dorg.gradle.native=false -Xmx512m"\' >> ~/.bashrc');
    console.log('  source ~/.bashrc');
    console.log('');
    console.log(`  ${colors.cyan}# Install dependencies${colors.reset}`);
    console.log('  npm install');
    console.log('');
    console.log(`  ${colors.cyan}# Start bot${colors.reset}`);
    console.log('  npm start');
}

console.log('');

// ============ SUMMARY ============
log(colors.bright, '📊 SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (allToolsOk) {
    log(colors.green, '  ✓ System is ready for Dolphin Web2 APK!');
    console.log('');
    console.log('  Next steps:');
    console.log('    1. npm install');
    console.log('    2. cp .env.example .env');
    console.log('    3. Edit .env with your bot token');
    console.log('    4. npm start');
} else {
    log(colors.red, '  ✗ Some requirements are missing!');
    console.log('');
    console.log('  Please install missing tools before continuing.');
}

console.log('');
log(colors.cyan, '══════════════════════════════════════════════════════════════');
console.log('');
