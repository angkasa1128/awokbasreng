# 🐬 Dolphin Web2 APK

Bot Telegram + Web Dashboard modern untuk konversi website menjadi aplikasi Android (APK) native dengan interface yang elegan dan powerful.

## ✨ Fitur Unggulan

| Fitur | Telegram Bot | Web Dashboard |
|-------|:------------:|:-------------:|
| **URL to APK** | ✅ | ✅ |
| **ZIP Build (Flutter/Android)** | ❌ | ✅ |
| **Custom Icon** | ✅ | ✅ |
| **Server Status** | ✅ | ✅ |
| **Build Queue** | ✅ | ✅ |
| **Auto IP Detection** | - | ✅ |
| **Server Specs Display** | - | ✅ |

---

## 📋 Requirements

| Requirement | Version | Keterangan |
|-------------|---------|------------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Java JDK** | 17+ | Untuk compile Android |
| **Gradle** | 9.x | Build tool |
| **Android SDK** | 34 | SDK & Build Tools |
| **Flutter** | 3.x | Untuk ZIP build Flutter |
| **Storage** | 2GB+ | Untuk SDK & dependencies |

**OS Support:** Windows 10/11, Ubuntu/Debian, Termux

---

## 🚀 Instalasi Cepat

### One-Click Setup

**Windows (PowerShell sebagai Admin):**

```powershell
.\scripts\setup.ps1
```

**Linux/Termux:**

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

> ℹ️ **Script akan otomatis:**
>
> - Install npm dependencies
> - Download & Install Android SDK
> - Set JAVA_HOME & ANDROID_HOME
> - Install Build Tools & Platform

### Install Gradle (jika belum ada)

**Windows:**

```powershell
choco install gradle
# atau download dari https://gradle.org/releases/
```

**Linux:**

```bash
sudo apt install gradle
```

---

## 📱 Instalasi di Termux (Android)

> ⚠️ **Catatan Penting:** Build di Termux lebih lambat karena keterbatasan HP. Untuk produksi, gunakan VPS.

### 1. Cek Sistem

```bash
# Jalankan system check SEBELUM install dependencies
npm run check
```

Ini akan menampilkan:

- Arsitektur (ARM/ARM64/x86)
- Tools yang terinstall
- Android SDK status
- Rekomendasi setup

### 2. Install Requirements

```bash
pkg update && pkg upgrade
pkg install nodejs git gradle openjdk-17

# Install Android SDK (jika belum)
pkg install android-sdk
```

### 3. Set Environment Variables (WAJIB!)

```bash
# Tambahkan ke ~/.bashrc
echo 'export ANDROID_HOME=$HOME/android-sdk' >> ~/.bashrc
echo 'export JAVA_HOME=$PREFIX/lib/jvm/java-17-openjdk' >> ~/.bashrc
echo 'export GRADLE_OPTS="-Dorg.gradle.native=false -Xmx512m"' >> ~/.bashrc
source ~/.bashrc
```

> ⚠️ **GRADLE_OPTS wajib di-set!** Tanpa ini, Gradle akan error `UnsupportedOperationException`.

### 4. Clone & Install

```bash
git clone https://github.com/yourusername/web2apk.git
cd web2apk
npm run check  # Cek sistem
npm install
cp .env.example .env
nano .env  # Isi BOT_TOKEN
```

### 5. Jalankan Bot

```bash
npm start

# Atau dengan PM2
pm2 start src/bot.js --name web2apk
```

### ⚠️ Termux Limitations

| Item | Status | Notes |
|------|--------|-------|
| Custom Icon | ✅ | Menggunakan Jimp (pure JS) |
| Build APK | ✅ | Lebih lambat (10-15 menit) |
| Build Flutter | ⚠️ | Sangat lambat, butuh RAM besar |
| Sharp Library | ❌ | WASM tidak kompatibel dengan ARM |

### 4. Konfigurasi Bot

```bash
cp .env.example .env
```

Edit file `.env` dan isi:

```env
BOT_TOKEN=your_bot_token_here
WEB_PORT=3000  # Optional, default 3000
```

> Token didapatkan dari [@BotFather](https://t.me/BotFather) di Telegram

---

## ▶️ Menjalankan Bot

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Setelah berjalan, Anda akan melihat:

```
🤖 Web2APK Bot berhasil dijalankan!
   Total users: X

🌐 Web Dashboard:
   Local:   http://localhost:3000
   Network: http://192.168.x.x:3000
```

---

## 📱 Cara Pakai - Telegram Bot

1. Buka bot di Telegram
2. Kirim `/start`
3. Klik **📱 BUAT APLIKASI (URL)**
4. Masukkan URL website
5. Masukkan nama aplikasi
6. Upload icon (opsional) atau skip
7. Pilih warna tema
8. Konfirmasi dan tunggu build selesai

---

## 🌐 Cara Pakai - Web Dashboard

### Build dari URL

1. Buka `http://localhost:3000`
2. Isi form **Build APK**:
   - Website URL
   - App Name
   - Upload Icon (opsional)
   - Pilih Theme Color
3. Klik **Build APK**
4. Download APK (link expires dalam 1 menit)

### Build dari ZIP (Flutter/Android Studio)

1. Buka `http://localhost:3000`
2. Scroll ke **Build Project (ZIP)**
3. Pilih Project Type: **Flutter** atau **Android Studio**
4. Pilih Build Type: **Debug** atau **Release**
5. Upload file ZIP project
6. Klik **Build Project**
7. Download APK (link expires dalam 1 menit)

---

## 📁 Struktur Project

```
├── src/
│   ├── bot.js              # Telegram bot entry point
│   ├── server.js           # Express web server
│   ├── handlers/           # Telegram handlers
│   ├── builder/            # APK builder engine
│   └── utils/              # Utilities
├── web/
│   ├── index.html          # Dashboard page
│   ├── css/style.css       # Styling
│   └── js/app.js           # Frontend logic
├── android-template/       # Template Android native
├── scripts/                # Setup scripts
├── package.json
└── .env.example
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/specs` | GET | Server specifications |
| `/api/stats` | GET | Bot statistics & queue status |
| `/api/build` | POST | Build APK from URL |
| `/api/build-zip` | POST | Build APK from ZIP project |
| `/api/download/:id` | GET | Download built APK |

---

## 🖥️ Deploy di VPS (Ubuntu/Debian)

### 1. Download & Run Setup Script

```bash
# Download script
wget https://raw.githubusercontent.com/yourusername/web2apk/main/scripts/setup-vps.sh

# Jalankan
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

> ℹ️ **Script akan otomatis install:**
>
> - Node.js 20, Java 17, Gradle
> - Android SDK 34 + Build Tools
> - PM2 untuk process ma

### 2. Clone & Setup Project

```bash
git clone https://github.com/yourusername/web2apk.git
cd web2apk
npm install
cp .env.example .env
nano .env  # Edit dan isi BOT_TOKEN
```

### 3. Jalankan dengan PM2

```bash
pm2 start src/bot.js --name "web2apk"
pm2 startup && pm2 save

# Monitoring
pm2 logs web2apk
```

### 4. Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/web2apk
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name _;  # Ganti dengan domain atau biarkan _ untuk akses via IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> ℹ️ **Catatan `server_name`:**
>
> - `_` = Terima semua request (akses via IP: `http://IP-VPS-ANDA`)
> - `yourdomain.com` = Jika sudah punya domain yang diarahkan ke VPS

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/web2apk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL dengan Certbot (Optional)

> ⚠️ **Hanya jika punya domain!** SSL tidak bisa untuk akses via IP.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 6. Firewall

```bash
sudo ufw allow 22      # SSH (WAJIB!)
sudo ufw allow 80      # HTTP (jika pakai Nginx)
sudo ufw allow 3000    # Dashboard (jika TIDAK pakai Nginx)
sudo ufw enable
```

> ⚠️ **Jangan lupa buka port 22!** Jika tidak, Anda tidak bisa SSH ke VPS lagi.

### 7. Minimum VPS Specs

| Spec | Minimum | Recommended |
|------|---------|-------------|
| **RAM** | 2 GB | 4 GB |
| **CPU** | 1 Core | 2 Core |
| **Storage** | 20 GB | 40 GB |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 |

> ⚠️ **Catatan:** Build Flutter membutuhkan RAM lebih besar. Untuk VPS dengan RAM kecil, gunakan swap:
>
> ```bash
> sudo fallocate -l 4G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## ❓ Troubleshooting

| Error | Solusi |
|-------|--------|
| `JAVA_HOME not set` | Jalankan ulang setup script atau restart terminal |
| `ANDROID_HOME not set` | Jalankan ulang setup script atau restart terminal |
| `Gradle not found` | Install gradle: `choco install gradle` (Windows) |
| `Flutter not found` | Install Flutter SDK dan tambahkan ke PATH |
| `Build timeout` | Cek koneksi internet, build pertama butuh download dependencies |
| `APK too large (>50MB)` | Gunakan ProGuard, split per ABI, atau optimize assets |
| `UnsupportedOperationException` | **Termux:** Set `GRADLE_OPTS="-Dorg.gradle.native=false"` |
| `Could not reserve enough space for object heap` | **Termux:** Kurangi memory: `-Xmx512m` |
| `Sharp WASM error` | **Termux:** Otomatis pakai Jimp, pastikan `npm install jimp` |

---

## 📄 License

MIT License - Free to use and modify.

---

## 👤 Author

**LordDzik** - [@LordDzik](https://t.me/LordDzik)
