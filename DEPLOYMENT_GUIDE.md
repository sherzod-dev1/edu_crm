# 🚀 EDU CRM — Serverga O'rnatish va Ishga Tushirish Bo'yicha To'liq Qo'llanma (Production Deployment Guide)

Ushbu qo'llanma **EDU CRM** tizimini real serverga (Ubuntu, Debian yoki boshqa Linux VPS/VDS serverlarga) xatosiz, ishonchli va professional tarzda o'rnatish bo'yicha bosqichma-bosqich yo'riqnomadir.

---

## 1. Talab qilinadigan dasturlar (Prerequisites)

Serverda quyidagilar o'rnatilgan bo'lishi kerak:
- **Node.js**: v18 yoki v20+ LTS
- **PostgreSQL**: v14 yoki v15+
- **Nginx**: Web server va Reverse Proxy
- **PM2**: Node.js jarayonlarini boshqarish uchun (`npm install -g pm2`)

```bash
# Ubuntu/Debian paketlarini yangilash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS o'rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL va Nginx o'rnatish
sudo apt install -y postgresql postgresql-contrib nginx git

# PM2 o'rnatish
sudo npm install -g pm2
```

---

## 2. PostgreSQL Ma'lumotlar Bazasini Tayyorlash

PostgreSQL foydalanuvchisi va parolini sozlang:

```bash
sudo -u postgres psql
```

PostgreSQL terminalida quyidagilarni bajaring:
```sql
-- Parol o'rnatish (masalan: your_password)
ALTER USER postgres WITH PASSWORD 'your_password';

-- Baza yaratish (ixtiyoriy, agar yaratilmasa backend o'zi avtomatik yaratadi)
CREATE DATABASE edu_crm_db;

-- Chiqish
\q
```

---

## 3. Loyihani Serverga Yuklash va Paketlarni O'rnatish

Loyiha papkasiga kiring:
```bash
cd /var/www/edu_crm  # yoki sizning papkangiz

# Root, backend va frontend paketlarini to'liq o'rnatish
npm run install:all
```

---

## 4. Konfiguratsiya Fayllari (.env)

### Backend `.env` fayli:
`backend/.env` faylini oching yoki yarating:
```bash
nano backend/.env
```
Quyidagilarni kiriting:
```ini
PORT=5000
NODE_ENV=production

# Database Configuration (PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=edu_crm_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=super_secret_jwt_key_crm_2026_change_in_production
JWT_EXPIRES_IN=7d
```

### Frontend `.env` fayli:
Agar Nginx reverse proxy ishlatilsa (tavsiya etiladi), frontend uchun:
```ini
VITE_API_BASE_URL=/api/v1
```
Agar to'g'ridan-to'g'ri backend portiga ulanmoqchi bo'lsangiz:
```ini
VITE_API_BASE_URL=http://SERVER_IP_MANZILI:5000/api/v1
```

---

## 5. Frontendni Yig'ish (Production Build)

Frontendni production uchun kompilyatsiya qiling:
```bash
npm run build:frontend
```
Bu buyruq `frontend/dist` papkasida optimallashtirilgan fayllarni tayyorlaydi.

---

## 6. Backendni PM2 Orqali Doimiy Ishga Tushirish

Backend server o'chib qolmasligi va server qayta yoqilganda avtomatik ishga tushishi uchun:

```bash
# PM2 orqali ishga tushirish
pm2 start ecosystem.config.js

# Holatini tekshirish
pm2 status

# Server qayta yoqilganda avtomatik ishga tushirishni yoqish
pm2 save
pm2 startup
```

---

## 7. Nginx Konfiguratsiyasi (Web Server & Reverse Proxy)

Nginx konfiguratsiya faylini yarating:
```bash
sudo nano /etc/nginx/sites-available/edu_crm
```

Quyidagi sozlamalarni joylang (`your-domain.com` yoki server IP sini o'zgartiring):
```nginx
server {
    listen 80;
    server_name your-domain.com; # yoki server IP manzili

    # Frontend yig'ilgan statik fayllar joylashuvi
    root /var/www/edu_crm/frontend/dist;
    index index.html;

    # SPA (Single Page Application) routing — sahifa yangilanganda 404 chiqmasligi uchun
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Statik fayllarni keshga olish (tez yuklanishi uchun)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API ga so'rovlarni yo'naltirish (Reverse Proxy)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Saytni faollashtiring va Nginx ni qayta ishga tushiring:
```bash
sudo ln -s /etc/nginx/sites-available/edu_crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. Birlamchi Tizimga Kirish Ma'lumotlari (Default Credentials)

Serverda baza birinchi marta ishga tushganda, tizim avtomatik ravishda bosh administrator va bosh filialni yaratadi:

- **Kirish manzili:** `http://SERVER_IP_MANZILI/login` yoki `http://your-domain.com/login`
- **Email:** `admin@gmail.com`
- **Parol:** `admin123`
- **Roli:** `SUPER_ADMIN` (To'liq huquqli administrator)

> Kirgandan so'ng xavfsizlik uchun profil bo'limidan parolni o'zgartiring!

---

## 9. Tizim Xavfsizligi va SSL (HTTPS) — Bepul Let's Encrypt

Domeningiz bo'lsa, SSL sertifikatini 1 ta buyruq bilan yoqishingiz mumkin:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Certbot avtomatik ravishda HTTPS ni yoqadi va har 90 kunda yangilab turadi.

