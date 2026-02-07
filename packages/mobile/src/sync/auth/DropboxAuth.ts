/**
 * Dropbox OAuth Authentication
 *
 * Handles OAuth 2.0 flow for Dropbox using expo-auth-session.
 * Stores access token securely in AsyncStorage.
 */

import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dropbox-access-token';
const DROPBOX_CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID;

interface AuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

/**
 * Authenticate with Dropbox using OAuth 2.0
 *
 * @returns Access token if successful, error message otherwise
 */
export async function authenticateDropbox(): Promise<AuthResult> {
  if (!DROPBOX_CLIENT_ID) {
    return {
      success: false,
      error: 'Dropbox client ID not configured. Please set EXPO_PUBLIC_DROPBOX_CLIENT_ID in .env',
    };
  }

  try {
    // Create redirect URI for OAuth callback
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.juhertra.expenses', // Use app scheme for production
      path: 'auth',
    });

    // Dropbox OAuth 2.0 authorization endpoint
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${DROPBOX_CLIENT_ID}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Start OAuth flow
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: redirectUri,
    });

    if (result.type === 'success' && result.params.access_token) {
      const accessToken = result.params.access_token;

      // Store token securely
      await AsyncStorage.setItem(STORAGE_KEY, accessToken);

      return {
        success: true,
        accessToken,
      };
    }

    return {
      success: false,
      error: 'OAuth flow was cancelled or failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get stored Dropbox access token
 *
 * @returns Access token if available, null otherwise
 */
export async function getDropboxToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get Dropbox token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated with Dropbox
 */
export async function isDropboxAuthenticated(): Promise<boolean> {
  const token = await getDropboxToken();
  return token !== null;
}

/**
 * Disconnect from Dropbox (remove stored token)
 */
export async function disconnectDropbox(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove Dropbox token:', error);
  }
}

/**
 * Refresh authentication (re-run OAuth flow)
 *
 * Use this when token expires or returns 401 errors.
 */
export async function refreshDropboxAuth(): Promise<AuthResult> {
  // Dropbox tokens don't expire, but can be revoked
  // If we get 401, just re-authenticate
  await disconnectDropbox();
  return authenticateDropbox();
}
