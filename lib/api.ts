const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://auxilia-web.trap.show/"
).replace(/\/+$/, "");

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token = "",
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "通信に失敗しました");
  return body;
}
