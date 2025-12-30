import { getProfile, createProfile } from './database';

/**
 * Get or create a user profile
 * This ensures the user has a profile in the database
 */
export async function getOrCreateProfile(userId: string) {
  let profile = await getProfile(userId);
  
  if (!profile) {
    profile = await createProfile(userId);
  }
  
  return profile;
}

/**
 * Sync Clerk user with Supabase
 * This should be called when a user signs up or signs in
 */
export async function syncClerkUser(clerkUserId: string) {
  try {
    const profile = await getOrCreateProfile(clerkUserId);
    return profile;
  } catch (error) {
    console.error('Error syncing Clerk user:', error);
    throw error;
  }
}

