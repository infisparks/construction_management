# Supabase Cloud to VPS (Coolify) Backup & Restore Guide

This guide documents the exact process to backup from Supabase Cloud and restore to Coolify self-hosted Supabase (PostgreSQL 15.8).

---

## 1. Quick 1-Command Backup (Run Anytime)

Run this command directly in your Mac terminal:

```bash
python3 scripts/backup-cloud-to-vps.py
```

This automated script will:
1. Connect to your Supabase Cloud database.
2. Export all 18 tables and data from `public`.
3. Export all user accounts and password hashes from `auth.users` & `auth.identities`.
4. Export storage metadata from `storage.buckets` and `storage.objects` formatted cleanly for Postgres 15.8.
5. Create two files on your Desktop:
   - `~/Desktop/backup.sql` (and `backup.sql.gz`)
   - `~/Desktop/supabase_cloud_backup_YYYYMMDD_HHMMSS.sql` (timestamped archive)

---

## 2. Restore in Coolify

1. Open Coolify → Go to your Supabase project → Select **Database: supabase-db** → Click **Import Backup**.
2. Check the box: **"Replace objects that already exist"**.
3. Under **Backup source**, select **File**.
4. Drag & drop `backup.sql` (or `backup.sql.gz`) from your Desktop into the upload box.
5. Click **Import / Restore**.

---

## 3. Sync Images & Documents (Storage Files)

After restoring the database, transfer the actual files from Cloud to VPS with:

```bash
CLOUD_SERVICE_ROLE_KEY="your_cloud_service_role_key" \
SELF_SERVICE_ROLE_KEY="your_coolify_service_role_key" \
node scripts/sync-storage.mjs
```

---

## 4. Connection Details Reference

### Cloud Supabase:
- **Host:** `db.futnctdhcrtlqrepvzdt.supabase.co`
- **Port:** `5432`
- **User:** `postgres`
- **Database:** `postgres`
- **Connection URI:** `postgresql://postgres:Mud2ssirs472@db.futnctdhcrtlqrepvzdt.supabase.co:5432/postgres`

### Self-Hosted Coolify Supabase:
- **Dashboard URL:** `https://construction.infispark.in/project/default`
- **Database Service:** `supabase-db` (PostgreSQL 15.8)
- **App Environment:** `.env.local`

