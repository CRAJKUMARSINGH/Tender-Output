import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => localStorage.getItem("pwd_api_key"));

export function setApiKey(key: string | null) {
  if (key) localStorage.setItem("pwd_api_key", key);
  else localStorage.removeItem("pwd_api_key");
}

export function hasApiKey() {
  return Boolean(localStorage.getItem("pwd_api_key"));
}
