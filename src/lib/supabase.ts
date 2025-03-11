import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = 'https://jiqndffacllyrwbercfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcW5kZmZhY2xseXJ3YmVyY2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNjMxOTQsImV4cCI6MjA1NDkzOTE5NH0.cnz7LjpFq1GVS_IaR8Z5EXZLwqMmd_v3sTxpDXEf94M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error.message);
    throw new Error('Failed to sign in: ' + error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw new Error('Failed to sign out: ' + error.message);
  }
}

// Helper function to check if user is authenticated
async function ensureAuthenticated(): Promise<User> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Authentication error:', error?.message || 'No user found');
    throw new Error('You must be signed in to perform this action');
  }

  return user;
}

// Helper function to verify bucket access
async function verifyBucketAccess(bucket: string): Promise<void> {
  try {
    // Ensure user is authenticated first
    await ensureAuthenticated();

    // Try to list files in the bucket to verify access
    const { data, error } = await supabase.storage
      .from(bucket)
      .list();

    if (error) {
      console.error('Error accessing bucket:', error);
      if (error.message.includes('The resource was not found')) {
        throw new Error(`Bucket '${bucket}' not found. Please check your Supabase configuration.`);
      } else if (error.message.includes('Permission denied')) {
        throw new Error(`Permission denied to access bucket '${bucket}'. Please check your storage policies.`);
      }
      throw new Error(`Failed to access bucket '${bucket}': ${error.message}`);
    }

    console.log('Successfully verified bucket access');
  } catch (error) {
    console.error('Bucket access verification failed:', error);
    throw error;
  }
}

// Helper function to upload image to Supabase Storage
export async function uploadImage(file: File, bucket: string = 'demo-pages') {
  // Ensure user is authenticated first
  await ensureAuthenticated();

  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  // Verify bucket access before uploading
  await verifyBucketAccess(bucket);

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    if (uploadError.message.includes('Permission denied')) {
      throw new Error('Permission denied to upload file. Please check your storage policies.');
    }
    throw new Error('Failed to upload image: ' + uploadError.message);
  }

  // Get public URL
  const { data: { publicUrl }, error: urlError } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (urlError) {
    console.error('Error getting public URL:', urlError);
    throw new Error('Failed to get image URL');
  }

  return publicUrl;
}

// Helper function to delete image from Supabase Storage
export async function deleteImage(url: string, bucket: string = 'demo-pages') {
  // Ensure user is authenticated first
  await ensureAuthenticated();

  try {
    const path = url.split('/').pop();
    if (!path) {
      throw new Error('Invalid image URL');
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied to delete file. Please check your storage policies.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteImage:', error);
    throw new Error('Failed to delete image');
  }
} 