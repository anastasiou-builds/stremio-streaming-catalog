const qs = require("querystring")
const { builder } = require("../addon")

const addonInterface = builder.getInterface()

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
}

function sendJSON(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  setCORS(res)
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}

function sendHTML(res, statusCode, html) {
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  setCORS(res)
  res.statusCode = statusCode
  res.end(html)
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`)
  const path = url.pathname

  if (req.method === "OPTIONS") {
    setCORS(res)
    res.statusCode = 204
    res.end()
    return
  }

  if (path === "/manifest.json") {
    return sendJSON(res, 200, addonInterface.manifest)
  }

  if (path === "/" || path === "/configure") {
    return sendHTML(res, 200, `<!DOCTYPE html>
<html>
<head><title>Streaming Catalog Addon</title></head>
<body>
  <h1>Streaming Catalog — Stremio Addon</h1>
  <p><a href="/manifest.json">/manifest.json</a></p>
  <p>Add this URL in Stremio to install the addon.</p>
</body>
</html>`)
  }

  const match = path.match(/^\/(catalog|meta|stream)\/(movie|series)\/([^/]+?)(?:\/([^/]+))?\.json$/)
  if (!match) {
    return sendJSON(res, 404, { err: "not found" })
  }

  const [, resource, type, id, extraStr] = match
  let extra = {}
  if (extraStr) {
    extra = qs.parse(extraStr)
  }

  try {
    const result = await addonInterface.get(resource, type, id, extra)
    sendJSON(res, 200, result)
  } catch (err) {
    console.error("Handler error:", err.message || err)
    if (err.noHandler) {
      sendJSON(res, 404, { err: "not found" })
    } else {
      sendJSON(res, 500, { err: "handler error" })
    }
  }
}
