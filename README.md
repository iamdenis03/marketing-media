# VVRobots 19116 - Platformă Organizare Media (MVP)

Platformă web securizată pentru organizarea și arhivaria fișierelor foto/video ale departamentului de marketing pentru echipa de robotică **VVRobots 19116**.

---

## 🛠️ Tech Stack & Arhitectură

- **Framework**: Next.js 14 (App Router), TypeScript
- **Database & ORM**: PostgreSQL / SQLite cu Prisma ORM
- **Autentificare**: NextAuth.js (Credentials Provider + Roles: ADMIN, EDITOR, VIEWER)
- **Stocare Fișiere**: Disc local pe server AlmaLinux (`MEDIA_STORAGE_PATH`)
- **Procesare Imagini & Thumbnails**: `sharp`
- **Arhivare Bulk ZIP Streaming**: `archiver`
- **UI & Styling**: Tailwind CSS, Lucide Icons, Dark Mode

---

## 🚀 Instalare și Deploy pe Server AlmaLinux

### 1. Cerințe Prealabile pe Server

- Node.js v18.x sau v20.x
- npm / yarn
- PM2 (`npm install -g pm2`)
- PostgreSQL (sau SQLite pentru teste rapide)

### 2. Clonare și Dependențe

```bash
cd /var/www/
git clone https://github.com/UTILIZATOR/marketing-media.git
cd marketing-media
npm install
```

### 3. Configurare Folder Stocare Media și Permisiuni

Creează folder-ul dedicat pentru stocarea fișierelor media pe AlmaLinux și acordă permisiuni de citire/scriere utilizatorului care rulează Node.js:

```bash
# Creează folder-ul de stocare pe disc
sudo mkdir -p /home/vvrobots-media

# Acordă permisiuni utilizatorului tau (ex: appuser)
sudo chown -R $USER:$USER /home/vvrobots-media
sudo chmod -R 775 /home/vvrobots-media
```

### 4. Configurare Variabile de Mediu (.env)

Creează fișierul `.env` în rădăcina proiectului:

```env
# Portul pe care va rula serverul Next.js (port diferit de 3000)
PORT=3005

# NextAuth Secretele
NEXTAUTH_SECRET="vvrobots-marketing-media-super-secret-key-2026"
NEXTAUTH_URL="http://SERVER_IP:3005"

# Bază de date PostgreSQL (sau SQLite "file:./dev.db")
DATABASE_URL="postgresql://vvrobots_user:parola_db@localhost:5432/vvrobots_media?schema=public"

# Calea absolută pe disc către folderul de stocare media
MEDIA_STORAGE_PATH="/home/vvrobots-media"
```

### 5. Inițializare Bază de Date & Seed Date Test

```bash
# Generare Prisma Client
npx prisma generate

# Rulare migrații / Push schemă
npx prisma db push

# Populare cu utilizatori demo și structură inițială
npm run seed
```

#### Conturi Demo Create la Seed:
- **ADMIN**: `admin@vvrobots.ro` / `admin123`
- **EDITOR**: `editor@vvrobots.ro` / `editor123`
- **VIEWER**: `viewer@vvrobots.ro` / `viewer123`

---

### 6. Build Producție și Pornire cu PM2

```bash
# Rulare build producție Next.js
npm run build

# Pornire proces cu PM2 pe PORT=3005
pm2 start npm --name "vvrobots-marketing-media" -- start

# Salvare configurare PM2 la reboot server
pm2 save
pm2 startup
```

---

## ⚡ Nginx Reverse Proxy (Opțional cu SSL HTTPS)

Exemplu de configurare `/etc/nginx/conf.d/media.vvrobots.ro.conf`:

```nginx
server {
    listen 80;
    server_name media.vvrobots.ro;

    client_max_body_size 600M; # Permite upload fișiere mari video (până la 600MB)

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📁 Structură Ierarhică Stocare pe Disc

Fișierele media se salvează automat pe disc după structura:
`{MEDIA_STORAGE_PATH}/{eventId}/{dayId}/{fileName}`

- Thumbnails-urile pentru imagini sunt generate automat și salvate ca WebP lângă fișierul original.
- Livrarea fișierelor se face prin endpoint-ul protejat `/api/media/[...path]` cu streaming și verificare de autentificare.
