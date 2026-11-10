/*
 * Google and Apple sign-in for the OAuth consent page. Both SDKs are loaded on
 * demand (preloaded on page mount, so the popup still opens inside the click's
 * user gesture).
 */

export const GOOGLE_CLIENT_ID: string = (import.meta.env.PRIMAL_GOOGLE_CLIENT_ID as string | undefined) || '';
export const APPLE_CLIENT_ID: string = (import.meta.env.PRIMAL_APPLE_CLIENT_ID as string | undefined) || '';

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client';
const APPLE_SDK = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

/** Thrown when the user closes the provider popup: not worth an error message. */
export class ProviderCancelled extends Error {}

const scripts: Record<string, Promise<void>> = {};

const loadScript = (src: string) => {
  if (!scripts[src]) {
    scripts[src] = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        delete scripts[src];
        script.remove();
        reject(new Error('provider_unavailable'));
      };
      document.head.appendChild(script);
    });
  }
  return scripts[src];
};

export const preloadProviders = () => {
  if (GOOGLE_CLIENT_ID) loadScript(GOOGLE_SDK).catch(() => {});
  if (APPLE_CLIENT_ID) loadScript(APPLE_SDK).catch(() => {});
};

/** GSI code flow in a popup; the backend redeems the code with redirect_uri "postmessage". */
export const googleAuthCode = async () => {
  await loadScript(GOOGLE_SDK);
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) throw new Error('provider_unavailable');

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response: { code?: string, error?: string }) => {
        if (response.code) resolve(response.code);
        else if (response.error === 'access_denied') reject(new ProviderCancelled());
        else reject(new Error('google_failed'));
      },
      error_callback: (error: { type?: string }) => {
        if (error?.type === 'popup_closed') reject(new ProviderCancelled());
        else reject(new Error('google_failed'));
      },
    });
    client.requestCode();
  });
};

export const appleIdToken = async () => {
  await loadScript(APPLE_SDK);
  const AppleID = (window as any).AppleID;
  if (!AppleID?.auth) throw new Error('provider_unavailable');

  AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: '',
    usePopup: true,
    redirectURI: `${window.location.origin}${window.location.pathname}`,
  });

  try {
    const result = await AppleID.auth.signIn();
    const idToken = result?.authorization?.id_token;
    if (!idToken) throw new Error('apple_failed');
    return idToken as string;
  } catch (e: any) {
    if (e?.error === 'popup_closed_by_user' || e?.error === 'user_cancelled_authorize') {
      throw new ProviderCancelled();
    }
    throw e;
  }
};
