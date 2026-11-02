#!/usr/bin/env python3
"""
Supabase Cloud to Self-Hosted (Coolify / Postgres 15.8) Backup Generator
------------------------------------------------------------------------
Connects to Supabase Cloud, extracts:
1. auth.users & auth.identities (user accounts, logins, passwords)
2. storage.buckets & storage.objects (compatible 8-column format)
3. Full public schema (all tables, data, triggers, functions, indexes)

Outputs a clean backup.sql ready for 1-click restore in Coolify.

Usage:
    python3 scripts/backup-cloud-to-vps.py
"""

import os
import sys
import subprocess
import re
import csv
import io
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
CLOUD_DB_URL = os.environ.get(
    "CLOUD_DB_URL",
    "postgresql://postgres:Mud2ssirs472@db.futnctdhcrtlqrepvzdt.supabase.co:5432/postgres"
)

# Output destinations
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
DESKTOP_DIR = os.path.expanduser("~/Desktop")
OUTPUT_SQL = os.path.join(DESKTOP_DIR, "backup.sql")
OUTPUT_SQL_TIMED = os.path.join(DESKTOP_DIR, f"supabase_cloud_backup_{TIMESTAMP}.sql")
OUTPUT_GZ = os.path.join(DESKTOP_DIR, "backup.sql.gz")

PG_DUMP_BIN = "/opt/homebrew/opt/postgresql@17/bin/pg_dump"
if not os.path.exists(PG_DUMP_BIN):
    PG_DUMP_BIN = "pg_dump"

def main():
    print(f"🚀 [1/4] Starting Cloud to VPS Backup Pipeline ({TIMESTAMP})...")
    print(f"🔗 Target: {CLOUD_DB_URL.split('@')[-1]}")

    # 1. Dump Public Schema
    print("📦 [2/4] Exporting public application schema & data...")
    tmp_public = "/tmp/pub_temp.sql"
    cmd_pub = [
        PG_DUMP_BIN,
        CLOUD_DB_URL,
        "--schema=public",
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "-f", tmp_public
    ]
    res_pub = subprocess.run(cmd_pub, capture_output=True, text=True)
    if res_pub.returncode != 0:
        print(f"❌ Error dumping public schema: {res_pub.stderr}")
        sys.exit(1)

    # 2. Dump Auth & Storage data
    print("🔑 [3/4] Exporting auth accounts & storage metadata...")
    tmp_auth_storage = "/tmp/auth_storage_temp.sql"
    cmd_auth = [
        PG_DUMP_BIN,
        CLOUD_DB_URL,
        "--data-only",
        "--column-inserts",
        "--no-owner",
        "--no-privileges",
        "-t", "auth.users",
        "-t", "auth.identities",
        "-t", "storage.buckets",
        "-t", "storage.objects",
        "-f", tmp_auth_storage
    ]
    res_auth = subprocess.run(cmd_auth, capture_output=True, text=True)
    if res_auth.returncode != 0:
        print(f"❌ Error dumping auth/storage data: {res_auth.stderr}")
        sys.exit(1)

    # 3. Clean and Assemble
    print("🛠️  [4/4] Adapting for Coolify Postgres 15.8...")
    with open(tmp_public, "r", encoding="utf-8") as f:
        pub_lines = f.readlines()

    clean_pub = []
    for line in pub_lines:
        s = line.strip()
        if s.startswith(r"\restrict") or s.startswith(r"\unrestrict"):
            continue
        if s.startswith("SET transaction_timeout"):
            continue
        clean_pub.append(line)

    with open(tmp_auth_storage, "r", encoding="utf-8") as f:
        auth_lines = f.readlines()

    users_sql = []
    identities_sql = []
    buckets_sql = []
    objects_sql = []

    for line in auth_lines:
        if line.startswith("INSERT INTO auth.users"):
            clean = line.strip()
            if clean.endswith(";"):
                clean = clean[:-1]
            clean += " ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = EXCLUDED.updated_at;\n"
            users_sql.append(clean)
        elif line.startswith("INSERT INTO auth.identities"):
            clean = line.strip()
            if clean.endswith(";"):
                clean = clean[:-1]
            clean += " ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, last_sign_in_at = EXCLUDED.last_sign_in_at;\n"
            identities_sql.append(clean)
        elif line.startswith("INSERT INTO storage.buckets"):
            m = re.search(r"VALUES \('([^']+)',\s*'([^']+)'", line)
            if m:
                b_id, b_name = m.group(1), m.group(2)
                buckets_sql.append(
                    f"INSERT INTO storage.buckets (id, name, public, created_at, updated_at) "
                    f"VALUES ('{b_id}', '{b_name}', true, now(), now()) "
                    f"ON CONFLICT (id) DO UPDATE SET public = true;\n"
                )
        elif line.startswith("INSERT INTO storage.objects"):
            vals_part = line[line.find("VALUES (") + 8 : line.rfind(");")]
            reader = csv.reader(io.StringIO(vals_part), delimiter=",", quotechar="'", skipinitialspace=True)
            for row in reader:
                first8 = row[:8]
                formatted_vals = []
                for idx, v in enumerate(first8):
                    if v == "NULL" or v is None:
                        formatted_vals.append("NULL")
                    elif idx == 3 and (v == "" or v == "NULL"):
                        formatted_vals.append("NULL")
                    else:
                        v_esc = v.replace("'", "''")
                        formatted_vals.append(f"'{v_esc}'")
                vals_str = ", ".join(formatted_vals)
                stmt = (
                    f"INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata) "
                    f"VALUES ({vals_str}) ON CONFLICT (id) DO NOTHING;\n"
                )
                objects_sql.append(stmt)

    full_sql = []
    full_sql.append("-- ==========================================================\n")
    full_sql.append(f"-- SUPABASE CLOUD TO VPS BACKUP (Generated: {TIMESTAMP})\n")
    full_sql.append(f"-- Target: Self-Hosted Supabase / Coolify (Postgres 15.8)\n")
    full_sql.append("-- ==========================================================\n\n")

    full_sql.append("SET statement_timeout = 0;\n")
    full_sql.append("SET lock_timeout = 0;\n")
    full_sql.append("SET idle_in_transaction_session_timeout = 0;\n")
    full_sql.append("SET client_encoding = 'UTF8';\n")
    full_sql.append("SET standard_conforming_strings = on;\n")
    full_sql.append("SET check_function_bodies = false;\n")
    full_sql.append("SET client_min_messages = warning;\n")
    full_sql.append("SET row_security = off;\n\n")

    full_sql.append("-- 1. AUTH USERS & IDENTITIES\n")
    full_sql.extend(users_sql)
    full_sql.append("\n")
    full_sql.extend(identities_sql)
    full_sql.append("\n")

    full_sql.append("-- 2. STORAGE BUCKETS\n")
    full_sql.extend(buckets_sql)
    full_sql.append("\n")

    full_sql.append("-- 3. STORAGE OBJECTS (8-column Postgres 15 safe)\n")
    full_sql.append("DO $$\nBEGIN\n")
    for stmt in objects_sql:
        full_sql.append("  " + stmt)
    full_sql.append("EXCEPTION WHEN OTHERS THEN\n")
    full_sql.append("  RAISE NOTICE 'Notice on storage objects: %', SQLERRM;\n")
    full_sql.append("END $$;\n\n")

    full_sql.append("-- 4. PUBLIC APPLICATION SCHEMA & DATA\n")
    full_sql.extend(clean_pub)

    full_sql.append("\n-- 5. GRANT PERMISSIONS TO SUPABASE ROLES (ANON, AUTHENTICATED, SERVICE_ROLE)\n")
    full_sql.append("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;\n")
    full_sql.append("GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;\n")
    full_sql.append("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;\n")
    full_sql.append("GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;\n\n")
    full_sql.append("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;\n")
    full_sql.append("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;\n")
    full_sql.append("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;\n")

    # Write both backup.sql and timestamped backup
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.writelines(full_sql)

    with open(OUTPUT_SQL_TIMED, "w", encoding="utf-8") as f:
        f.writelines(full_sql)

    # Gzip
    subprocess.run(f"gzip -c '{OUTPUT_SQL}' > '{OUTPUT_GZ}'", shell=True)

    print("\n✅ Backup generated successfully!")
    print(f"📄 Latest Backup:      {OUTPUT_SQL}")
    print(f"📄 Timestamped Backup: {OUTPUT_SQL_TIMED}")
    print(f"📦 Compressed Archive: {OUTPUT_GZ}")
    print("\nYou can now drag & drop this file directly into Coolify Import Backup!")

if __name__ == "__main__":
    main()

