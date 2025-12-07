// Discord SDK Integration
import { DiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk;
let auth;

export async function setupDiscordSdk() {
  console.log('🎮 Setting up Discord SDK...');
  console.log('Current URL:', window.location.href);
  console.log('URL params:', window.location.search);
  console.log('User agent:', navigator.userAgent);
  
  // Check if we're running in Discord (has frame_id parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const isInDiscord = urlParams.has('frame_id') || window.parent !== window;
  
  console.log('Is in Discord?', isInDiscord);
  console.log('Has frame_id?', urlParams.has('frame_id'));
  console.log('Is framed?', window.parent !== window);
  
  // Check if on iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (!isInDiscord) {
    console.warn('Not running in Discord - using standalone mode');
    // Return mock objects for standalone mode
    return {
      discordSdk: null,
      auth: {
        user: {
          username: 'Player',
          id: 'standalone',
          avatar: null,
          discriminator: '0000'
        }
      }
    };
  }
  
  // Show message if on unsupported platform
  if (isIOS && isInDiscord) {
    console.warn('Discord Activities may have limited support on iOS');
    // Still try to initialize but provide fallback
  }

  try {
    // Use hardcoded client ID (from your Discord application)
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1446725465300664402';
    discordSdk = new DiscordSDK(clientId);

    await discordSdk.ready();
    console.log("Discord SDK is ready");

    // For basic activities, we don't need OAuth - just use the ready state
    // Get basic user info from the SDK without authentication
    auth = {
      user: {
        username: 'Discord User',
        id: 'discord-user',
        avatar: null,
        discriminator: '0000'
      }
    };

    return { discordSdk, auth };
  } catch (error) {
    console.error('Failed to initialize Discord SDK:', error);
    // Return standalone mode on error
    return {
      discordSdk: null,
      auth: {
        user: {
          username: 'Player',
          id: 'standalone',
          avatar: null,
          discriminator: '0000'
        }
      }
    };
  }
}

export function getDiscordSdk() {
  return discordSdk;
}

export function getAuth() {
  return auth;
}

// Get current Discord user info
export function getCurrentUser() {
  return auth?.user;
}

// Get participant info (who's in the Activity)
// Note: This requires proper OAuth2 authentication with guilds.members.read scope
// For now, return empty array to avoid authentication errors
export async function getParticipants() {
  if (!discordSdk) return [];
  
  // Participants API requires authentication - disabled for now
  // To enable, you need to implement OAuth2 with proper scopes
  console.log("Participants API disabled - requires OAuth2 authentication");
  return [];
}

// Send an activity update (e.g., score)
export async function updateActivity(details) {
  if (!discordSdk) return;
  
  try {
    await discordSdk.commands.setActivity({
      activity: {
        details: details,
        type: 0, // Playing
      },
    });
  } catch (error) {
    console.error("Failed to update activity:", error);
  }
}
