import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { reconnectSocketWithFreshToken } from "../socket";

const API_URL = import.meta.env.VITE_API_URL;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  console.log("🔍 Vérification des headers de réponse...", {
    hasMeta: !!result.meta,
    hasResponse: !!result.meta?.response,
    hasHeaders: !!result.meta?.response?.headers,
  });

  if (result.meta?.response?.headers) {
    const headers = result.meta.response.headers;
    const tokenRefreshed = headers.get("X-Token-Refreshed");
    const newAccessToken = headers.get("X-Access-Token");
    const newRefreshToken = headers.get("X-Refresh-Token");

    console.log("📋 Headers reçus:", {
      tokenRefreshed,
      hasAccessToken: !!newAccessToken,
      hasRefreshToken: !!newRefreshToken,
    });

    if (tokenRefreshed === "true" && newAccessToken && newRefreshToken) {
      console.log("🔄 Tokens rafraîchis automatiquement par le backend");

      localStorage.setItem("token", newAccessToken);
      localStorage.setItem("refresh_token", newRefreshToken);
      console.log("✅ Nouveaux tokens sauvegardés dans localStorage");

      api.dispatch({
        type: "auth/setTokens",
        payload: {
          token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      });

      // Socket may be disconnected or retrying with the old expired token.
      // Force a reconnect now that localStorage has the fresh token so the
      // next handshake succeeds immediately instead of waiting for retries.
      console.log("[socket] reconnecting socket after token refresh");
      reconnectSocketWithFreshToken();
    }
  }

  if (result.error && result.error.status === 401) {
    console.log("❌ Session expirée, déconnexion...");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    console.log("🗑️ Tokens supprimés du localStorage");
    api.dispatch({ type: "auth/logout" });
  }

  return result;
};
