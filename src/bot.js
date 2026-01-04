require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs-extra');

// Handlers
const { handleStart } = require('./handlers/startHandler');
const { handleCallback, handleZipUpload } = require('./handlers/callbackHandler');
const { handleMessage } = require('./handlers/messageHandler');

// Utils
const { cleanupOldFiles } = require('./utils/cleanup');
const userService = require('./utils/userService');
const { startWebServer } = require('./server');

// Validate environment
if (!process.env.BOT_TOKEN) {
    console.error('❌ Error: BOT_TOKEN tidak ditemukan di .env');
    console.error('   Silakan copy .env.example ke .env dan isi token bot Anda');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Store user sessions
global.sessions = new Map();

// Ensure directories exist
const dirs = ['temp', 'output'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    fs.ensureDirSync(dirPath);
});

// Set bot commands menu
bot.setMyCommands([
    { command: 'start', description: '🐬 Mulai menggunakan Dolphin Web2 APK' },
    { command: 'help', description: '❓ Bantuan & panduan' },
    { command: 'stats', description: '📊 Statistik bot (Admin)' },
    { command: 'broadcast', description: '📢 Broadcast pesan (Admin)' }
]).catch(e => console.error('Failed to set commands:', e.message));

// --- CHANNEL MEMBERSHIP CHECK ---
async function checkChannelMembership(userId) {
    const requiredChannel = process.env.REQUIRED_CHANNEL;
    if (!requiredChannel) return true; // No channel required

    try {
        const member = await bot.getChatMember(requiredChannel, userId);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (error) {
        console.warn(`Channel check failed for ${userId}:`, error.message);
        return true; // Allow if check fails
    }
}

// --- ADMIN CHECK ---
function isAdmin(userId) {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    return adminIds.includes(String(userId));
}

// Command handlers
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Save user to database
    userService.saveUser(chatId, bot);

    // Check channel membership
    const isMember = await checkChannelMembership(chatId);
    if (!isMember) {
        const channelUsername = process.env.REQUIRED_CHANNEL.replace('@', '');
        return bot.sendMessage(chatId, `
⚠️ <b>Verifikasi Diperlukan</b>

Silakan join channel kami terlebih dahulu:
👉 @${channelUsername}

Setelah join, tekan /start lagi.
        `.trim(), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📢 Join Channel', url: `https://t.me/${channelUsername}` }
                ]]
            }
        });
    }

    handleStart(bot, msg);
});

bot.onText(/\/help/, (msg) => handleStart(bot, msg));

// --- ADMIN: STATS COMMAND ---
bot.onText(/\/stats/, async (msg) => {
    if (!isAdmin(msg.chat.id)) return;

    const stats = `
📊 <b>BOT STATISTICS</b>
━━━━━━━━━━━━━━━━━━
👥 Total Users: <code>${userService.getCount()}</code>
🔄 Active Sessions: <code>${global.sessions.size}</code>
⏱ Uptime: <code>${Math.floor(process.uptime() / 60)} minutes</code>
━━━━━━━━━━━━━━━━━━
    `.trim();

    bot.sendMessage(msg.chat.id, stats, { parse_mode: 'HTML' });
});

// --- ADMIN: BROADCAST COMMAND ---
bot.onText(/\/broadcast(?: (.+))?/, async (msg, match) => {
    if (!isAdmin(msg.chat.id)) return;

    const textContent = match[1];
    const isReply = msg.reply_to_message;

    if (!isReply && !textContent) {
        return bot.sendMessage(msg.chat.id, `
╔══════════════════════════╗
     📢  <b>BROADCAST CENTER</b>  📢
╚══════════════════════════╝

<b>📝 Cara Penggunaan:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>1️⃣ Text Broadcast:</b>
<code>/broadcast &lt;pesan anda&gt;</code>

<b>2️⃣ Forward Message:</b>
Reply pesan apapun dengan <code>/broadcast</code>

<b>3️⃣ Rich Format (HTML):</b>
<code>/broadcast &lt;b&gt;Bold&lt;/b&gt; &lt;i&gt;Italic&lt;/i&gt;</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Total Users: <code>${userService.getCount()}</code>
        `.trim(), { parse_mode: 'HTML' });
    }

    const users = userService.getBroadcastList();
    const totalUsers = users.length;
    const estimatedTime = Math.ceil(totalUsers * 0.05); // 50ms per user

    // Confirmation message
    const confirmMsg = await bot.sendMessage(msg.chat.id, `
╔══════════════════════════╗
   ⚠️  <b>KONFIRMASI BROADCAST</b>  ⚠️
╚══════════════════════════╝

📊 <b>Statistik:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Target: <code>${totalUsers}</code> users
⏱ Estimasi: <code>~${estimatedTime}</code> detik
📨 Tipe: ${isReply ? 'Forward Message' : 'Text Message'}

📝 <b>Preview:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
${isReply ? '📎 <i>(Forward dari pesan yang di-reply)</i>' : textContent?.substring(0, 200) + (textContent?.length > 200 ? '...' : '')}

━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Klik tombol untuk melanjutkan...</i>
    `.trim(), {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Mulai Broadcast', callback_data: 'bc_confirm' },
                    { text: '❌ Batal', callback_data: 'bc_cancel' }
                ]
            ]
        }
    });

    // Store broadcast data temporarily
    global.pendingBroadcast = {
        adminId: msg.chat.id,
        confirmMsgId: confirmMsg.message_id,
        isReply,
        textContent,
        replyMsgId: isReply ? msg.reply_to_message.message_id : null,
        users,
        timestamp: Date.now()
    };
});

// Handle broadcast confirmation
bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('bc_')) return;
    if (!isAdmin(query.from.id)) return;

    const action = query.data;
    const bc = global.pendingBroadcast;

    if (!bc || bc.adminId !== query.from.id) {
        return bot.answerCallbackQuery(query.id, { text: '⚠️ Session expired', show_alert: true });
    }

    if (action === 'bc_cancel') {
        await bot.editMessageText('❌ <b>Broadcast dibatalkan.</b>', {
            chat_id: bc.adminId,
            message_id: bc.confirmMsgId,
            parse_mode: 'HTML'
        });
        global.pendingBroadcast = null;
        return bot.answerCallbackQuery(query.id);
    }

    if (action === 'bc_confirm') {
        await bot.answerCallbackQuery(query.id, { text: '🚀 Memulai broadcast...' });

        const startTime = Date.now();
        let success = 0, failed = 0;
        const total = bc.users.length;

        // Progress bar function
        const getProgressBar = (current, total) => {
            const percent = Math.round((current / total) * 100);
            const filled = Math.round(percent / 5);
            const empty = 20 - filled;
            return '█'.repeat(filled) + '░'.repeat(empty);
        };

        // Initial progress message
        await bot.editMessageText(`
╔══════════════════════════╗
   🚀  <b>BROADCAST IN PROGRESS</b>  🚀
╚══════════════════════════╝

📊 <b>Progress:</b>
<code>[${getProgressBar(0, total)}]</code> 0%

📬 Sent: <code>0</code>
❌ Failed: <code>0</code>
👥 Total: <code>${total}</code>

⏱ Elapsed: <code>0s</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⏳ Mohon tunggu...</i>
        `.trim(), {
            chat_id: bc.adminId,
            message_id: bc.confirmMsgId,
            parse_mode: 'HTML'
        });

        let lastUpdate = 0;

        for (let i = 0; i < bc.users.length; i++) {
            const userId = bc.users[i];

            try {
                if (bc.isReply) {
                    // For forwarded messages, send header first then forward
                    await bot.sendMessage(userId, `
╔═══════════════════════════════╗
     📢  <b>PENGUMUMAN RESMI</b>  📢
╚═══════════════════════════════╝
`, { parse_mode: 'HTML' });
                    await bot.forwardMessage(userId, bc.adminId, bc.replyMsgId);
                } else {
                    // For text messages, wrap in professional template
                    const formattedMessage = `
╔═══════════════════════════════╗
     📢  <b>PENGUMUMAN RESMI</b>  📢
╚═══════════════════════════════╝

${bc.textContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🐬 <i>Pesan otomatis dari Dolphin Web2 APK</i>
📅 <i>${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</i>
`.trim();
                    await bot.sendMessage(userId, formattedMessage, { parse_mode: 'HTML' });
                }
                success++;
            } catch (e) {
                failed++;
                if (e.response?.body?.error_code === 403) {
                    userService.removeUser(userId);
                }
            }

            // Update progress every 10 users or at the end
            const current = i + 1;
            if (current - lastUpdate >= 10 || current === total) {
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const percent = Math.round((current / total) * 100);

                await bot.editMessageText(`
╔══════════════════════════╗
   🚀  <b>BROADCAST IN PROGRESS</b>  🚀
╚══════════════════════════╝

📊 <b>Progress:</b>
<code>[${getProgressBar(current, total)}]</code> ${percent}%

📬 Sent: <code>${success}</code>
❌ Failed: <code>${failed}</code>
👥 Total: <code>${total}</code>

⏱ Elapsed: <code>${elapsed}s</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⏳ ${current}/${total} processed...</i>
                `.trim(), {
                    chat_id: bc.adminId,
                    message_id: bc.confirmMsgId,
                    parse_mode: 'HTML'
                }).catch(() => { });

                lastUpdate = current;
            }

            await new Promise(r => setTimeout(r, 50));
        }

        const totalTime = Math.round((Date.now() - startTime) / 1000);
        const successRate = Math.round((success / total) * 100);

        // Final result
        await bot.editMessageText(`
╔══════════════════════════╗
   ✅  <b>BROADCAST COMPLETE</b>  ✅
╚══════════════════════════╝

📊 <b>Final Result:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<code>[████████████████████]</code> 100%

📬 Sent: <code>${success}</code> ✓
❌ Failed: <code>${failed}</code>
📈 Success Rate: <code>${successRate}%</code>

⏱ Total Time: <code>${totalTime}s</code>
📅 Completed: <code>${new Date().toLocaleString('id-ID')}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
${failed > 0 ? `\n⚠️ <i>${failed} users telah dihapus (blocked/deleted)</i>` : '🎉 <i>Semua pesan terkirim dengan sukses!</i>'}
        `.trim(), {
            chat_id: bc.adminId,
            message_id: bc.confirmMsgId,
            parse_mode: 'HTML'
        });

        global.pendingBroadcast = null;
    }
});

// Callback query handler (for inline buttons)
bot.on('callback_query', (query) => {
    // Save user on any interaction
    userService.saveUser(query.from.id, bot);
    handleCallback(bot, query);
});

// Message handler (for user input during APK creation)
bot.on('message', (msg) => {
    // Skip commands
    if (msg.text && msg.text.startsWith('/')) return;
    handleMessage(bot, msg);
});

// Photo handler (for custom icon)
bot.on('photo', (msg) => {
    handleMessage(bot, msg, 'photo');
});

// Document handler (for ZIP file uploads)
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const document = msg.document;

    // Check if it's a ZIP file
    if (document.file_name?.endsWith('.zip')) {
        const session = global.sessions.get(chatId);

        if (session?.step === 'zip_upload') {
            try {
                // Download the file
                const filePath = await bot.downloadFile(document.file_id, path.join(__dirname, '..', 'temp'));
                await handleZipUpload(bot, chatId, filePath);
            } catch (error) {
                console.error('Error downloading ZIP:', error);
                bot.sendMessage(chatId, '❌ Gagal mengunduh file. Silakan coba lagi.');
            }
        } else {
            bot.sendMessage(chatId, '⚠️ Untuk build project ZIP, klik tombol "📦 BUILD PROJECT (ZIP)" terlebih dahulu.');
        }
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
    console.error('Bot error:', error.message);
});

// Cleanup scheduler (every 15 minutes for old files)
setInterval(() => {
    cleanupOldFiles(path.join(__dirname, '..', 'temp'), 15); // 15 min max age
    cleanupOldFiles(path.join(__dirname, '..', 'output'), 15);
}, 15 * 60 * 1000);

// Cleanup on startup - remove any leftover temp files from previous sessions
(async () => {
    console.log('🗑️ Cleaning up leftover temp files...');
    await cleanupOldFiles(path.join(__dirname, '..', 'temp'), 1); // Anything > 1 min old
    await cleanupOldFiles(path.join(__dirname, '..', 'output'), 1);
    console.log('✅ Startup cleanup complete');
})();

console.log('🐬 Dolphin Web2 APK Bot berhasil dijalankan!');
console.log(`   Total users: ${userService.getCount()}`);
console.log('   Tekan Ctrl+C untuk menghentikan bot');

// Start Web Server
startWebServer();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Bot dihentikan');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Bot dihentikan');
    bot.stopPolling();
    process.exit(0);
});
