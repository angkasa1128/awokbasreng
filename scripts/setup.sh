#!/bin/bash

# ============================================
# Web2APK Gen 2 - Complete Setup Script
# For Linux/Termux
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  Web2APK Gen 2 - Complete Setup${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# ============================================
# PART 1: Install Node.js Dependencies
# ============================================

echo -e "${MAGENTA}================================================${NC}"
echo -e "${MAGENTA}  PART 1: Installing Node.js Dependencies${NC}"
echo -e "${MAGENTA}================================================${NC}"
echo ""

# Check if Node.js is installed
echo -e "${YELLOW}[1/3] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}  [ERROR] Node.js not found!${NC}"
    echo ""
    echo "  For Ubuntu/Debian:"
    echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "    sudo apt install -y nodejs"
    echo ""
    echo "  For Termux:"
    echo "    pkg install nodejs"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}  [OK] Node.js $NODE_VERSION${NC}"

# Check npm version
echo -e "${YELLOW}[2/3] Checking npm...${NC}"
NPM_VERSION=$(npm --version)
echo -e "${GREEN}  [OK] npm v$NPM_VERSION${NC}"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}  [ERROR] package.json not found!${NC}"
    exit 1
fi

# Install npm dependencies
echo -e "${YELLOW}[3/3] Installing npm dependencies...${NC}"
npm install

# Install sharp with wasm32 support (for ARM/Termux compatibility)
echo -e "${YELLOW}Installing sharp with wasm32 support...${NC}"
npm install --cpu=wasm32 sharp 2>/dev/null || true
npm install @img/sharp-wasm32 --force 2>/dev/null || true

echo -e "${GREEN}  [OK] Dependencies installed${NC}"
echo ""

# ============================================
# PART 2: Setup Android SDK
# ============================================

echo -e "${MAGENTA}================================================${NC}"
echo -e "${MAGENTA}  PART 2: Setting up Android SDK${NC}"
echo -e "${MAGENTA}================================================${NC}"
echo ""

# Detect OS
detect_os() {
    if [ -f /data/data/com.termux/files/usr/bin/bash ]; then
        echo "termux"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/redhat-release ]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

OS_TYPE=$(detect_os)
echo -e "${CYAN}Detected OS: $OS_TYPE${NC}"

# Setup for Termux
setup_termux() {
    echo -e "${YELLOW}Installing packages for Termux...${NC}"
    pkg update -y
    pkg install -y openjdk-17 wget unzip zip aapt2 gradle

    export JAVA_HOME=$PREFIX/lib/jvm/java-17-openjdk
    
    echo -e "${YELLOW}Downloading Android SDK command-line tools...${NC}"
    mkdir -p $HOME/android-sdk/cmdline-tools
    cd $HOME/android-sdk/cmdline-tools
    
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip" -O tools.zip
    unzip -q tools.zip
    if [ -d "cmdline-tools" ]; then
        mv cmdline-tools latest
    elif [ -d "tools" ]; then
        mkdir -p latest
        mv tools/* latest/
        rmdir tools
    else 
        mv cmdline-tools latest 2>/dev/null || true
    fi
    rm tools.zip
    
    export ANDROID_HOME=$HOME/android-sdk
    export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
    
    echo -e "${YELLOW}Installing SDK components...${NC}"
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    sdkmanager "platforms;android-36" "build-tools;36.0.0" "build-tools;28.0.3" "platform-tools"
    
    # AAPT2 Fix
    AAPT2_PATH=$(which aapt2)
    if [ -n "$AAPT2_PATH" ]; then
        echo -e "${GREEN}  [OK] ARM AAPT2 detected${NC}"
    fi
    
    # Save environment variables
    if ! grep -q "export ANDROID_HOME" $HOME/.bashrc; then
        echo "export JAVA_HOME=$JAVA_HOME" >> $HOME/.bashrc
        echo "export ANDROID_HOME=$ANDROID_HOME" >> $HOME/.bashrc
        echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools" >> $HOME/.bashrc
    fi
    
    if [ -n "$AAPT2_PATH" ]; then
        if ! grep -q "export AAPT2_PATH" $HOME/.bashrc; then
            echo "export AAPT2_PATH=$AAPT2_PATH" >> $HOME/.bashrc
        fi
    fi
    
    # Install Flutter for Termux (limited support)
    echo -e "${YELLOW}Note: Flutter has limited support on Termux${NC}"
    echo -e "${YELLOW}For Flutter projects, use a VPS or desktop environment${NC}"
}

# Setup for Debian/Ubuntu
setup_debian() {
    echo -e "${YELLOW}Installing packages for Debian/Ubuntu...${NC}"
    sudo apt update
    sudo apt install -y openjdk-17-jdk wget unzip zip lib32z1 lib32stdc++6
    
    export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
    
    echo -e "${YELLOW}Downloading Android SDK command-line tools...${NC}"
    sudo mkdir -p /opt/android-sdk/cmdline-tools
    cd /opt/android-sdk/cmdline-tools
    
    sudo wget -q "https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip" -O tools.zip
    sudo unzip -q tools.zip
    
    if [ -d "cmdline-tools" ]; then
        sudo mv cmdline-tools latest
    else
        sudo mkdir -p latest
        sudo mv tools latest/ 2>/dev/null || true
    fi

    sudo rm tools.zip
    sudo chmod -R 777 /opt/android-sdk
    
    export ANDROID_HOME=/opt/android-sdk
    export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
    
    echo -e "${YELLOW}Installing SDK components...${NC}"
    sudo chmod +x $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager
    
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1 || true
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-36" "build-tools;36.0.0" "build-tools;28.0.3" "platform-tools"
    
    # Save environment variables
    sudo sed -i '/JAVA_HOME/d' /etc/environment
    sudo sed -i '/ANDROID_HOME/d' /etc/environment
    
    echo "JAVA_HOME=$JAVA_HOME" | sudo tee -a /etc/environment
    echo "ANDROID_HOME=$ANDROID_HOME" | sudo tee -a /etc/environment
    
    if ! grep -q "export ANDROID_HOME" $HOME/.bashrc; then
        echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools" >> $HOME/.bashrc
    fi
    
    # Install Flutter SDK for Debian
    echo -e "${YELLOW}Installing Flutter SDK...${NC}"
    FLUTTER_HOME=/opt/flutter
    
    sudo apt install -y curl git xz-utils libglu1-mesa clang cmake ninja-build pkg-config libgtk-3-dev 2>/dev/null || true
    
    if [ ! -d "$FLUTTER_HOME" ]; then
        cd /opt
        sudo git clone https://github.com/flutter/flutter.git -b stable --depth 1
        sudo chmod -R 777 $FLUTTER_HOME
    fi
    
    export PATH=$PATH:$FLUTTER_HOME/bin
    
    # Add Flutter to environment
    echo "FLUTTER_HOME=$FLUTTER_HOME" | sudo tee -a /etc/environment
    
    if ! grep -q "export FLUTTER_HOME" $HOME/.bashrc; then
        echo "export FLUTTER_HOME=$FLUTTER_HOME" >> $HOME/.bashrc
        echo "export PATH=\$PATH:\$FLUTTER_HOME/bin" >> $HOME/.bashrc
    fi
    
    # Pre-cache Flutter
    flutter precache --android 2>/dev/null || true
    echo -e "${GREEN}  [OK] Flutter installed${NC}"
}

# Main execution
case $OS_TYPE in
    termux)
        setup_termux
        ;;
    debian)
        setup_debian
        ;;
    *)
        echo -e "${RED}Unsupported OS. Please install Android SDK manually.${NC}"
        exit 1
        ;;
esac

# ============================================
# COMPLETE
# ============================================

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${CYAN}Changes Applied:${NC}"
echo "  1. Node.js dependencies installed"
echo "  2. Java JDK 17"
echo "  3. Android SDK 34 + Build Tools 34.0.0"
if [ "$OS_TYPE" = "termux" ]; then
    echo "  4. AAPT2 ARM Native"
    echo "  5. Gradle from pkg"
    echo "  Note: Flutter not available on Termux"
else
    echo "  4. 32-bit libraries for AAPT2"
    echo "  5. Flutter SDK"
fi
echo ""
echo -e "${YELLOW}Please restart your terminal or run:${NC}"
echo "  source ~/.bashrc"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Copy .env: cp .env.example .env"
echo "  2. Edit .env and add BOT_TOKEN"
echo "  3. Start bot: npm run dev"
echo ""
