/**
 * Quick script to migrate all files and images from Supabase Cloud to Self-Hosted Supabase
 * Usage:
 *   node scripts/sync-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';

// 1. Cloud Credentials
const CLOUD_URL = process.env.CLOUD_SUPABASE_URL || 'https://futnctdhcrtlqrepvzdt.supabase.co';
const CLOUD_SERVICE_KEY = process.env.CLOUD_SERVICE_ROLE_KEY || ''; // Cloud service_role secret key

// 2. Self-Hosted Credentials (from Coolify)
const SELF_URL = process.env.SELF_SUPABASE_URL || 'https://construction.infispark.in';
const SELF_SERVICE_KEY = process.env.SELF_SERVICE_ROLE_KEY || ''; // Self-hosted service_role secret key

// Buckets to migrate
const BUCKETS = ['inventory-documents', 'project-documents', 'expense-documents'];

if (!CLOUD_SERVICE_KEY || !SELF_SERVICE_KEY) {
  console.log(`
[ERROR] Please provide the service_role keys.
Example run command:

CLOUD_SERVICE_ROLE_KEY="your_cloud_service_key" \\
SELF_SERVICE_ROLE_KEY="your_selfhosted_service_key" \\
node scripts/sync-storage.mjs
`);
  process.exit(1);
}

const cloudClient = createClient(CLOUD_URL, CLOUD_SERVICE_KEY, {
  auth: { persistSession: false },
});

const selfClient = createClient(SELF_URL, SELF_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function listAllFiles(client, bucket, folder = '') {
  let fileList = [];
  const { data, error } = await client.storage.from(bucket).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Error listing ${bucket}/${folder}:`, error.message);
    return fileList;
  }

  for (const item of data || []) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      // Sub-folder -> recurse
      const subFiles = await listAllFiles(client, bucket, itemPath);
      fileList = fileList.concat(subFiles);
    } else {
      fileList.push(itemPath);
    }
  }

  return fileList;
}

async function run() {
  console.log('🚀 Starting Storage Migration from Cloud to Self-Hosted...');

  for (const bucket of BUCKETS) {
    console.log(`\n📂 Checking bucket: "${bucket}"...`);

    // Ensure bucket exists on self-hosted
    const { error: bucketErr } = await selfClient.storage.createBucket(bucket, {
      public: true,
    });
    if (bucketErr && !bucketErr.message.includes('already exists')) {
      console.warn(`Could not create bucket ${bucket}:`, bucketErr.message);
    } else {
      console.log(`✓ Bucket "${bucket}" is ready on self-hosted.`);
    }

    // List all files from Cloud
    const files = await listAllFiles(cloudClient, bucket);
    console.log(`Found ${files.length} file(s) in "${bucket}".`);

    for (const filePath of files) {
      process.stdout.write(`  Transferring: ${filePath} ... `);
      // Download from Cloud
      const { data: fileBlob, error: downloadErr } = await cloudClient.storage
        .from(bucket)
        .download(filePath);

      if (downloadErr || !fileBlob) {
        console.log(`❌ Failed download: ${downloadErr?.message}`);
        continue;
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // Upload to Self-Hosted
      const { error: uploadErr } = await selfClient.storage
        .from(bucket)
        .upload(filePath, buffer, {
          upsert: true,
          contentType: fileBlob.type || 'application/octet-stream',
        });

      if (uploadErr) {
        console.log(`❌ Failed upload: ${uploadErr.message}`);
      } else {
        console.log(`✓ OK`);
      }
    }
  }

  console.log('\n🎉 Storage migration completed successfully!');
}

run().catch((err) => {
  console.error('Fatal error:', err);
});

