// src/utils/passwordPolicy.js
//
// Kebijakan password mengikuti semangat NIST 800-63B: prioritaskan panjang
// & cek terhadap password yang sudah umum diketahui, bukan aturan
// kompleksitas paksa (huruf besar+simbol+angka) yang justru mendorong
// pola gampang ditebak seperti "Password123!".
// (Rationale ini didokumentasikan di SECURITY_REVIEW.md Finding #6.)

const MIN_LENGTH = 12;

// Daftar pendek password paling umum ditemukan di breach list publik.
// Ini bukan pengganti pengecekan terhadap breach database penuh
// (mis. HaveIBeenPwned k-anonymity API) — itu opsional & bisa ditambah
// belakangan. Ini cuma menutup kasus paling sering & paling murah dicegah.
const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', '123456', '123456789',
    'qwerty', 'qwerty123', 'admin', 'admin123', 'letmein',
    'welcome', 'welcome1', 'monkey', 'dragon', 'iloveyou',
    '111111', '123123', 'abc123', 'password!', 'passw0rd',
    '12345678', '1234567890', 'sunshine', 'princess', 'football',
]);

/**
 * @param {string} password
 * @param {string} [username] - dicek supaya password tidak sama dengan username
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password, username) {
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
        return { valid: false, error: `Password minimal ${MIN_LENGTH} karakter` };
    }

    if (username && password.toLowerCase() === String(username).toLowerCase()) {
        return { valid: false, error: 'Password tidak boleh sama dengan username' };
    }

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        return { valid: false, error: 'Password terlalu umum, gunakan password lain' };
    }

    return { valid: true };
}

module.exports = { validatePassword, MIN_LENGTH };