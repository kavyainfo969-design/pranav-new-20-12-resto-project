// Safe fetch helper that returns both the Response and parsed JSON (if any).
// This prevents "Unexpected end of JSON input" when the server returns an empty
// body or an HTML error page. Callers should check `result.res.ok` and use
// `result.json` when available.
export async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init)
  const text = await res.text()
  let json: any = null
  try {
    if (text) json = JSON.parse(text)
  } catch (e) {
    // parsing failed; keep json as null and propagate text for debugging
    json = null
  }
  return { res, ok: res.ok, status: res.status, json, text }
}

export default fetchJson
