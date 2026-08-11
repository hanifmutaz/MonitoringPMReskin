// src/components/Avatar.jsx
import { apiOrigin } from '../api/client';

// Komponen kecil reusable - dipakai di Sidebar.jsx (footer, 2 tempat:
// collapsed & expanded) DAN ProfilePage.jsx (kartu identitas). Nampilin
// foto profil kalau `avatarUrl` ada, fallback ke inisial nama kalau NULL
// (foto profil OPSIONAL - lihat profileService.js backend, users.avatar_url
// nullable). `avatarUrl` dari backend cuma path RELATIF
// (mis. "/uploads/avatars/xxx.jpg", diserve dari root app.js, BUKAN di
// bawah /api/v1) - digabung sama `apiOrigin` di sini jadi URL lengkap yang
// bisa langsung dipasang ke <img src>.
function Avatar({ avatarUrl, initials, size = 34, className = '' }) {
  if (avatarUrl) {
    return (
      <img
        src={`${apiOrigin}${avatarUrl}`}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] font-bold text-primary ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
