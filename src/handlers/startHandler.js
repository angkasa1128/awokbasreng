const { getMainKeyboard } = require('../utils/keyboard');

/**
 * Handle /start command
 */
async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const safeName = (msg.from.first_name || 'User').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const welcomeCaption = `
🐬 <b>Selamat Datang di Dolphin Web2 APK, ${safeName}!</b>

🚀 <b>Dolphin Web2 APK</b> adalah solusi modern & powerful untuk mengubah website menjadi aplikasi Android profesional.

✨ <i>Fitur Unggulan:</i>
• 🎨 Custom Icon & Theme Color
• ⚡ Proses Super Cepat
• 🔥 Build Quality Tinggi
• 💎 Interface Modern & Elegan

👇 <b>Mulai project Anda sekarang:</b>
    `.trim();

    // Kirim foto dengan caption dan menu
    await bot.sendPhoto(chatId, 'https://files.catbox.moe/5z33zb.jpg', {
        caption: welcomeCaption,
        parse_mode: 'HTML',
        reply_markup: getMainKeyboard()
    }).catch(async () => {
        // Fallback jika gagal kirim foto
        await bot.sendMessage(chatId, welcomeCaption, {
            parse_mode: 'HTML',
            reply_markup: getMainKeyboard()
        });
    });
}

module.exports = { handleStart };
