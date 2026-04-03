import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { reconnectSocketWithFreshToken } from "../socket";
import { reconnectNotificationsSocketWithFreshToken } from "../notificationsSocket";
import { applyApiResultToasts, peelToastFlags } from "./apiToast";

const API_URL = import.meta.env.VITE_API_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

async function runBaseQueryWithReauth(
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: Record<string, unknown> | undefined,
) {
  const result = await rawBaseQuery(
    args,
    api,
    extraOptions as Parameters<typeof rawBaseQuery>[2],
  );

  if (result.meta?.response?.headers) {
    const headers = result.meta.response.headers;
    const tokenRefreshed = headers.get("X-Token-Refreshed");
    const newAccessToken = headers.get("X-Access-Token");
    const newRefreshToken = headers.get("X-Refresh-Token");

    if (
      tokenRefreshed === "true" &&
      newAccessToken &&
      newRefreshToken &&
      api.dispatch
    ) {
      localStorage.setItem("token", newAccessToken);
      localStorage.setItem("refresh_token", newRefreshToken);

      api.dispatch({
        type: "auth/setTokens",
        payload: {
          token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      });

      reconnectSocketWithFreshToken();
      reconnectNotificationsSocketWithFreshToken();
    }
  }

  if (result.error && result.error.status === 401 && api.dispatch) {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    api.dispatch({ type: "auth/logout" });
  }

  return result;
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const { arg: fetchArg, flags } = peelToastFlags(args);
  const result = await runBaseQueryWithReauth(
    fetchArg,
    api,
    extraOptions as Record<string, unknown> | undefined,
  );
  applyApiResultToasts(result, api, flags);
  return result;
};
