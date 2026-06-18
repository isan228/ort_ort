# Деплой ORT.KG на сервер (VPS)

Инструкция для production без Docker: **Ubuntu 22.04/24.04**, **Node.js 20**, **PostgreSQL 16**, **Nginx**, **PM2**, **Let's Encrypt**.

Репозиторий: https://github.com/isan228/ort_ort

---

## 1. Архитектура

```
Пользователь → HTTPS (Nginx :443)
                 ├─ /          → frontend/dist (статика React)
                 └─ /api/*     → backend :3001 (Node.js + Express)
                                    └─ PostgreSQL
                                    └─ backend/uploads/ (сертификаты)
```

Backend слушает **только localhost:3001** — наружу торчит Nginx.

---

## 2. Требования к серверу

| Параметр | Минимум |
|----------|---------|
| CPU | 1 vCPU |
| RAM | 2 GB |
| Диск | 20 GB SSD |
| ОС | Ubuntu 22.04 LTS или новее |

Домен (пример): `ort.kg` или `app.ort.kg` — A-запись на IP сервера.

---

## 3. Подготовка сервера

Подключитесь по SSH:

```bash
ssh root@YOUR_SERVER_IP
```

Обновление системы и базовые пакеты:

```bash
apt update && apt upgrade -y
apt install -y curl git nginx ufw
```

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v
```

### PM2 (менеджер процессов)

```bash
npm install -g pm2
```

### PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

Создайте БД и пользователя:

```bash
sudo -u postgres psql
```

```sql
CREATE USER ort_app WITH PASSWORD 'Enigma10';
CREATE DATABASE ort_kg OWNER ort_app;
GRANT ALL PRIVILEGES ON DATABASE ort_kg TO ort_app;
\q
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## 4. Клонирование проекта

Создайте пользователя для приложения (рекомендуется):

```bash
adduser --disabled-password --gecos "" ort
su - ort
```

Клон:

```bash
cd ~
git clone https://github.com/isan228/ort_ort.git ort
cd ort
npm install
```

---

## 5. Backend — production `.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

> **Файл должен быть именно `~/ort_ort/backend/.env`**, не `~/ort_ort/.env` в корне репозитория.

Пример **production**:

```env
NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ort_kg
DB_USER=ort_app
DB_PASSWORD=СИЛЬНЫЙ_ПАРОЛЬ_БД

# В production НЕ используйте alter на каждый старт
DB_SYNC_ALTER=false

JWT_SECRET=СГЕНЕРИРУЙТЕ_ДЛИННУЮ_СЛУЧАЙНУЮ_СТРОКУ_64+_СИМВОЛОВ
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

TZ=Asia/Bishkek

# Публичный URL сайта (с https)
CLIENT_URL=https://ort.kg

PAYMENT_CALLBACK_SECRET=СЛУЧАЙНЫЙ_СЕКРЕТ_ДЛЯ_WEBHOOK
```

Сгенерировать секреты:

```bash
openssl rand -hex 32
```

Папка для загрузок:

```bash
mkdir -p backend/uploads/certificates
chmod 750 backend/uploads
```

### Первый запуск БД (создание таблиц + seed)

**Важно:** на сервере держите `DB_SYNC_ALTER=false`. Таблицы создаются через обычный `sync()` без `alter`.

Если ранее был неудачный старт с `DB_SYNC_ALTER=true`, пересоздайте БД:

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ort_kg;"
sudo -u postgres psql -c "CREATE DATABASE ort_kg OWNER ort_app;"
```

Один раз после деплоя (или после `pm2 restart` на пустой БД — таблицы создадутся автоматически при старте API).

Ручной вариант:

```bash
cd ~/ort_ort/backend
DB_SYNC_ALTER=false node src/scripts/syncDb.js
```

После успешного создания таблиц в `.env` обязательно:

```env
DB_SYNC_ALTER=false
NODE_ENV=production
```

---

## 6. Frontend — сборка

Если API и сайт на **одном домене** (Nginx проксирует `/api`), переменная не нужна:

```bash
cd ~/ort
npm run build -w frontend
```

Если API на отдельном поддомене (`api.ort.kg`):

```bash
echo 'VITE_API_URL=https://api.ort.kg' > frontend/.env.production
npm run build -w frontend
```

Статика появится в `frontend/dist/`.

---

## 7. PM2 — автозапуск backend

Из корня проекта:

```bash
cd ~/ort_ort
pm2 start src/index.js --name ort-api --cwd backend
pm2 save
pm2 startup
# выполните команду, которую выведет pm2 startup (sudo env PATH=...)
```

> **Важно:** при `--cwd backend` путь к скрипту — `src/index.js`, а не `backend/src/index.js` (иначе PM2 ищет `backend/backend/...`).

Полезные команды:

```bash
pm2 status
pm2 logs ort-api
pm2 restart ort-api
```

---

## 8. Nginx

```bash
sudo nano /etc/nginx/sites-available/ort
```

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    # Домен + IP (пока нет DNS — открывайте по IP)
    server_name ort.kg www.ort.kg 82.208.23.207 _;

    client_max_body_size 12M;

    root /root/ort_ort/frontend/dist;
    index index.html;

    # React Router — все не-файлы → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API → Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> Замените путь `root` на свой (`/root/ort_ort` или `/home/ort/ort`).  
> `default_server` и `_` нужны, чтобы сайт открывался **по IP**, а не дефолтная страница Nginx.

Активация:

```bash
# отключить дефолтную страницу «Welcome to nginx»
sudo rm -f /etc/nginx/sites-enabled/default

sudo ln -sf /etc/nginx/sites-available/ort /etc/nginx/sites-enabled/ort
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ort.kg -d www.ort.kg
```

Certbot сам настроит редирект HTTP → HTTPS. Проверьте, что в `backend/.env`:

```env
CLIENT_URL=https://ort.kg
```

---

## 9. Проверка после деплоя

```bash
curl -s https://ort.kg/api/health
# {"status":"ok","service":"ort-kg-api",...}

curl -s -o /dev/null -w "%{http_code}" https://ort.kg/
# 200
```

В браузере:
1. Откройте `https://ort.kg`
2. Регистрация / вход
3. `GET /api/health` в DevTools → Network

---

## 10. Первый администратор

После регистрации своего аккаунта на сайте:

```bash
sudo -u postgres psql -d ort_kg
```

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'admin')
WHERE email = 'ваш@email.com';
```

Публикация результатов ОРТ (если нужно): `/admin` → вкладка «Настройки».

---

## 11. Обновление версии на сервере

На сервере под пользователем `ort`:

```bash
cd ~/ort
git pull origin main
npm install
npm run build -w frontend
pm2 restart ort-api
```

Или с локальной машины (если настроен `npm run push`):

```powershell
# локально
npm run push -- "fix: описание"
```

```bash
# на сервере
cd ~/ort && git pull && npm install && npm run build -w frontend && pm2 restart ort-api
```

---

## 12. Бэкапы (рекомендуется)

### База данных — ежедневно

```bash
mkdir -p ~/backups
crontab -e
```

```cron
0 3 * * * pg_dump -U ort_app -h localhost ort_kg | gzip > /home/ort/backups/ort_kg_$(date +\%Y\%m\%d).sql.gz
```

### Загруженные сертификаты

```bash
tar -czf ~/backups/uploads_$(date +%Y%m%d).tar.gz -C ~/ort/backend uploads
```

---

## 13. Частые проблемы

| Симптом | Решение |
|---------|---------|
| CORS error в браузере | `CLIENT_URL` в `.env` должен совпадать с URL сайта (с `https://`) |
| Белая страница / «Welcome to nginx» по IP | Удалите `sites-enabled/default`, добавьте `default_server` и IP в `server_name`, проверьте `root` |
| 502 Bad Gateway | `pm2 status` — backend упал; смотрите `pm2 logs ort-api` |
| Белая страница после F5 | Проверьте `try_files ... /index.html` в Nginx |
| API 401 для всех | Проверьте `JWT_SECRET` — не меняйте после выдачи токенов |
| Ошибка `syntax error at or near "UNIQUE"` при старте | `DB_SYNC_ALTER=true` + PostgreSQL ENUM — поставьте `false`, пересоздайте БД (см. ниже) |
| Ошибка `postgres` / `28P01`, хотя в `.env` указан `ort_app` | `.env` не в `backend/.env` или PM2 без перезапуска: `cat backend/.env`, `pm2 restart ort-api --update-env` |
| Не грузятся сертификаты | Права на `backend/uploads/`, `client_max_body_size 12M` |
| Пустой каталог / нет туров | Повторите seed (раздел 5) или проверьте подключение к БД |

---

## 14. Переменные окружения — справка

| Переменная | Описание |
|------------|----------|
| `NODE_ENV` | `production` на сервере |
| `PORT` | Порт backend (3001) |
| `DB_*` | PostgreSQL |
| `DB_SYNC_ALTER` | `true` только при первом деплое / миграции; в runtime — `false` |
| `JWT_SECRET` | Обязательно уникальный длинный ключ |
| `CLIENT_URL` | URL фронтенда для CORS |
| `PAYMENT_CALLBACK_SECRET` | Заголовок `X-Payment-Secret` для webhook оплаты |
| `VITE_API_URL` | (опционально) URL API при сборке фронта, если не same-origin |

---

## 15. Чеклист деплоя

- [ ] PostgreSQL: БД `ort_kg`, пользователь `ort_app`
- [ ] `backend/.env` заполнен, секреты сгенерированы
- [ ] Таблицы созданы, seed выполнен
- [ ] `npm run build -w frontend`
- [ ] PM2: `ort-api` running + `pm2 save` + startup
- [ ] Nginx: статика + proxy `/api`
- [ ] SSL (certbot)
- [ ] Admin user назначен в БД
- [ ] `curl https://ваш-домен/api/health` → ok
- [ ] UFW: открыты 22, 80, 443

---

## 16. Дальнейшие шаги (не обязательны для MVP)

- **Отдельный поддомен API** (`api.ort.kg`) — второй server block в Nginx
- **CI/CD** — GitHub Actions: push → SSH deploy script
- **S3/MinIO** — вынести `uploads/` с диска VPS
- **Email/SMS** — для forgot password вместо `dev_token`
- **Мониторинг** — Uptime Kuma, PM2 Plus, или простой healthcheck cron
