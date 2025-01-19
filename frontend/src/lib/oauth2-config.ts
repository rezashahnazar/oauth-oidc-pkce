import { generateCodeVerifier, generateCodeChallenge } from "./pkce";

const OAUTH2_CONFIG = {
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID,
  clientSecret: import.meta.env.VITE_OAUTH_CLIENT_SECRET,
  redirectUri: "http://localhost:5173/callback",
  authorizationEndpoint: "http://localhost:8000/o/authorize/",
  tokenEndpoint: "http://localhost:8000/o/token/",
  userinfoEndpoint: "http://localhost:8000/o/userinfo/",
  revokeEndpoint: "http://localhost:8000/o/revoke/",
  scope: "openid profile email",
};

export async function getAuthorizationUrl() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem("code_verifier", codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH2_CONFIG.clientId,
    redirect_uri: OAUTH2_CONFIG.redirectUri,
    scope: OAUTH2_CONFIG.scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${OAUTH2_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const codeVerifier = localStorage.getItem("code_verifier");
  if (!codeVerifier) throw new Error("No code verifier found");

  const response = await fetch(OAUTH2_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        btoa(`${OAUTH2_CONFIG.clientId}:${OAUTH2_CONFIG.clientSecret}`),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: OAUTH2_CONFIG.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

export async function getUserInfo(accessToken: string) {
  const response = await fetch(OAUTH2_CONFIG.userinfoEndpoint, {
    headers: {
      Authorization: `Turbo ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  return response.json();
}

export async function revokeToken(token: string) {
  const response = await fetch(OAUTH2_CONFIG.revokeEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        btoa(`${OAUTH2_CONFIG.clientId}:${OAUTH2_CONFIG.clientSecret}`),
    },
    body: new URLSearchParams({
      token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to revoke token");
  }
}
