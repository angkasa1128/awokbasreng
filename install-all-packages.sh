#!/data/data/com.termux/files/usr/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  ████████╗███████╗██████╗ ███╗   ███╗██╗   ██╗██╗  ██╗
#  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║   ██║╚██╗██╔╝
#     ██║   █████╗  ██████╔╝██╔████╔██║██║   ██║ ╚███╔╝ 
#     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║   ██║ ██╔██╗ 
#     ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╔╝██╔╝ ╚██╗
#     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝   ╚═╝
#  INSTALL ALL PACKAGES SCRIPT
#  Author: LordDzik
#  Description: Script untuk menginstall semua package Termux
# ═══════════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Functions
print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     ████████╗███████╗██████╗ ███╗   ███╗██╗   ██╗██╗  ██╗    ║"
    echo "║     ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║   ██║╚██╗██╔╝    ║"
    echo "║        ██║   █████╗  ██████╔╝██╔████╔██║██║   ██║ ╚███╔╝     ║"
    echo "║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║   ██║ ██╔██╗     ║"
    echo "║        ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╔╝██╔╝ ╚██╗   ║"
    echo "║        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝   ╚═╝   ║"
    echo "║                  INSTALL ALL PACKAGES                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}[*] $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_info() {
    echo -e "${CYAN}[i] $1${NC}"
}

install_package() {
    local package=$1
    echo -e "${BLUE}[→] Installing: ${WHITE}$package${NC}"
    pkg install -y $package > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "$package installed successfully"
    else
        print_error "Failed to install $package"
    fi
}

# Main Script
print_banner

echo -e "${YELLOW}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Script ini akan menginstall SEMUA package Termux populer   ║"
echo "║  Pastikan Anda memiliki koneksi internet yang stabil        ║"
echo "║  Proses ini membutuhkan waktu yang cukup lama               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

read -p "$(echo -e ${CYAN}[?] Lanjutkan instalasi? [y/n]: ${NC})" confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_warning "Instalasi dibatalkan."
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Setup Storage & Update Repository
# ═══════════════════════════════════════════════════════════════════════════════
print_section "SETUP STORAGE & UPDATE REPOSITORY"

print_info "Setting up storage permission..."
termux-setup-storage

print_info "Updating package repository..."
pkg update -y && pkg upgrade -y
print_success "Repository updated!"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Essential Packages
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING ESSENTIAL PACKAGES"

ESSENTIAL_PACKAGES=(
    "coreutils"
    "curl"
    "wget"
    "git"
    "openssh"
    "openssl"
    "zip"
    "unzip"
    "tar"
    "nano"
    "vim"
    "neovim"
    "tmux"
    "screen"
    "htop"
    "ncdu"
    "tree"
    "man"
    "less"
    "grep"
    "sed"
    "awk"
    "bc"
    "jq"
    "pv"
    "file"
)

for pkg in "${ESSENTIAL_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Programming Languages
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING PROGRAMMING LANGUAGES"

PROGRAMMING_PACKAGES=(
    "python"
    "python-pip"
    "nodejs"
    "nodejs-lts"
    "ruby"
    "php"
    "perl"
    "lua54"
    "golang"
    "rust"
    "clang"
    "make"
    "cmake"
    "pkg-config"
    "gdb"
    "llvm"
    "ndk-multilib"
)

for pkg in "${PROGRAMMING_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Networking Tools
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING NETWORKING TOOLS"

NETWORK_PACKAGES=(
    "nmap"
    "netcat-openbsd"
    "dnsutils"
    "iproute2"
    "traceroute"
    "whois"
    "tcpdump"
    "tshark"
    "hydra"
    "sqlmap"
    "nikto"
    "aircrack-ng"
    "ettercap"
    "net-tools"
    "proxychains-ng"
    "tor"
    "torsocks"
    "socat"
    "mtr"
    "iperf3"
    "speedtest-go"
    "aria2"
    "axel"
)

for pkg in "${NETWORK_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Security & Hacking Tools
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING SECURITY & HACKING TOOLS"

SECURITY_PACKAGES=(
    "hashcat"
    "john"
    "crunch"
    "wordlists"
    "metasploit"
    "radare2"
    "binwalk"
    "steghide"
    "exiftool"
    "foremost"
    "apktool"
    "dex2jar"
    "jadx"
    "nuclei"
    "subfinder"
    "httpx"
    "ffuf"
    "gobuster"
    "wfuzz"
    "masscan"
    "amass"
    "fierce"
)

for pkg in "${SECURITY_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Development Tools
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING DEVELOPMENT TOOLS"

DEV_PACKAGES=(
    "libffi"
    "libjpeg-turbo"
    "libpng"
    "libxml2"
    "libxslt"
    "freetype"
    "sqlite"
    "mariadb"
    "postgresql"
    "redis"
    "mongodb"
    "libbz2"
    "zlib"
    "readline"
    "ncurses"
    "libevent"
)

for pkg in "${DEV_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: Media & Graphics
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING MEDIA & GRAPHICS PACKAGES"

MEDIA_PACKAGES=(
    "ffmpeg"
    "imagemagick"
    "graphicsmagick"
    "sox"
    "opus-tools"
    "lame"
    "flac"
    "vorbis-tools"
    "youtube-dl"
    "yt-dlp"
    "gallery-dl"
    "mpv"
    "feh"
    "chafa"
    "cmatrix"
    "figlet"
    "toilet"
    "cowsay"
    "lolcat"
    "neofetch"
    "screenfetch"
    "sl"
)

for pkg in "${MEDIA_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: Text Processing & Documentation
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING TEXT PROCESSING PACKAGES"

TEXT_PACKAGES=(
    "pandoc"
    "texlive-bin"
    "groff"
    "asciidoc"
    "markdown"
    "hugo"
    "pelican"
    "fd"
    "fzf"
    "ripgrep"
    "ag"
    "bat"
    "exa"
    "lsd"
    "ranger"
    "mc"
    "nnn"
    "vifm"
)

for pkg in "${TEXT_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9: Web Frameworks & Servers
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING WEB FRAMEWORKS & SERVERS"

WEB_PACKAGES=(
    "nginx"
    "apache2"
    "lighttpd"
    "php-fpm"
    "php-apache"
    "php-pgsql"
    "php-sodium"
    "composer"
    "npm"
    "yarn"
)

for pkg in "${WEB_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 10: Python Libraries (Popular)
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING POPULAR PYTHON LIBRARIES"

print_info "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

PYTHON_PACKAGES=(
    "requests"
    "beautifulsoup4"
    "selenium"
    "pandas"
    "numpy"
    "matplotlib"
    "flask"
    "django"
    "fastapi"
    "uvicorn"
    "aiohttp"
    "httpx"
    "scrapy"
    "Pillow"
    "opencv-python"
    "cryptography"
    "pycryptodome"
    "paramiko"
    "fabric"
    "boto3"
    "google-api-python-client"
    "tweepy"
    "telethon"
    "pyrogram"
    "python-telegram-bot"
    "discord.py"
    "colorama"
    "rich"
    "tqdm"
    "click"
    "typer"
    "pyfiglet"
    "phonenumbers"
    "shodan"
    "censys"
    "twilio"
)

for pkg in "${PYTHON_PACKAGES[@]}"; do
    echo -e "${BLUE}[→] Installing Python: ${WHITE}$pkg${NC}"
    pip install $pkg > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "$pkg installed successfully"
    else
        print_error "Failed to install $pkg"
    fi
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 11: Node.js Packages (Popular)
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING POPULAR NODE.JS PACKAGES"

NODE_PACKAGES=(
    "express"
    "axios"
    "cheerio"
    "puppeteer"
    "playwright"
    "socket.io"
    "nodemon"
    "pm2"
    "typescript"
    "eslint"
    "prettier"
    "@adiwajshing/baileys"
    "whatsapp-web.js"
    "telegraf"
    "grammy"
    "discord.js"
    "mongoose"
    "prisma"
    "sequelize"
    "sharp"
    "jimp"
    "fluent-ffmpeg"
    "node-fetch"
    "chalk"
    "ora"
    "inquirer"
    "commander"
    "yargs"
)

for pkg in "${NODE_PACKAGES[@]}"; do
    echo -e "${BLUE}[→] Installing Node.js: ${WHITE}$pkg${NC}"
    npm install -g $pkg > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "$pkg installed successfully"
    else
        print_error "Failed to install $pkg"
    fi
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 12: Miscellaneous & Fun Packages
# ═══════════════════════════════════════════════════════════════════════════════
print_section "INSTALLING MISCELLANEOUS PACKAGES"

MISC_PACKAGES=(
    "termux-api"
    "termux-tools"
    "termux-services"
    "termux-auth"
    "proot"
    "proot-distro"
    "tsu"
    "w3m"
    "lynx"
    "elinks"
    "irssi"
    "weechat"
    "finch"
    "mutt"
    "newsboat"
    "calcurse"
    "taskwarrior"
    "pass"
    "gnupg"
    "pinentry"
)

for pkg in "${MISC_PACKAGES[@]}"; do
    install_package "$pkg"
done

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 13: Final Cleanup
# ═══════════════════════════════════════════════════════════════════════════════
print_section "FINAL CLEANUP"

print_info "Cleaning up cache..."
pkg clean
apt autoremove -y > /dev/null 2>&1

# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETION
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║       ███████╗██╗   ██╗ ██████╗ ██████╗███████╗███████╗      ║"
echo "║       ██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝      ║"
echo "║       ███████╗██║   ██║██║     ██║     █████╗  ███████╗      ║"
echo "║       ╚════██║██║   ██║██║     ██║     ██╔══╝  ╚════██║      ║"
echo "║       ███████║╚██████╔╝╚██████╗╚██████╗███████╗███████║      ║"
echo "║       ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝╚══════╝╚══════╝      ║"
echo "║                                                              ║"
echo "║      INSTALASI SELESAI! Semua package telah terinstall!      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_info "Terima kasih telah menggunakan script ini!"
print_info "Restart Termux untuk menerapkan semua perubahan."
echo ""
