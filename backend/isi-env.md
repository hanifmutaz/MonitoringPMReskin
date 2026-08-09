Server (production)	Laptop pribadi / kantor (dev)
NODE_ENV    
Server (production)	production
	development

DATABASE_URL
Server (production)	connection string ke Postgres beneran di server	
    Postgres lokal di laptop (localhost:5432), atau tunnel/forward ke DB server kalau mau pake data asli

CONMAS_DB_*
Server (production)	isi kredensial ConMas asli (read-only)
	kosongin aja — sync job otomatis di-skip, gak bikin app crash (udah didesain gitu, liat komentar di env.js)

JWT_SECRET
Server (production)	random string panjang, generate sekali, jangan pernah ganti-ganti selama masih ada user yang lagi login (ganti = semua orang ke-logout paksa)
	boleh beda dari server punya, gak masalah — cuma DEV token doang

CORS_ORIGIN 
Server (production)	domain/IP asli tempat frontend production di-hosting
	http://localhost:5173

SMTP_*
Server (production)	isi kredensial SMTP asli
	kosongin — biar pas testing gak nyasar kirim email beneran ke orang

ADMIN_DEFAULT_*
Server (production)	cuma kepake sekali doang pas migration pertama kali jalan
	sama, cuma kepake sekali doang

SITE_ID
Server (production)	'internal' di server Internal, 'sgp' di server SGP, 'systech' di server Systech
	boleh isi bebas, gak ngaruh ke dev

REPORTING_API_KEY
Server (production)	random string, BEDA-BEDA tiap instance (Internal/SGP/Systech punya key masing-masing). Ini yang lo kasih tau ke instance Internal biar bisa narik data dari sini
	kosongin — endpoint /api/v1/reporting/site-summary otomatis nolak semua request kalau kosong (fail closed), gak masalah buat dev

REMOTE_SITE_1_ID, REMOTE_SITE_1_LABEL, REMOTE_SITE_1_BASE_URL, REMOTE_SITE_1_API_KEY
Server (production)	CUMA diisi di server Internal. REMOTE_SITE_1_* buat Subcont pertama (misal SGP), REMOTE_SITE_2_* buat Subcont kedua (Systech). BASE_URL = alamat server Subcont itu, API_KEY = REPORTING_API_KEY yang Subcont itu kasih ke lo
	kosongin — instance dev gak perlu narik data dari mana-mana

export PORT=5051
export SITE_ID=sgp
export REPORTING_API_KEY=sgp-dev-key-123