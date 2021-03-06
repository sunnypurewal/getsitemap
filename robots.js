'use strict'
const hittp = require("hittp")
const events = require("events")

async function getSitemaps(url, uoptions) {
  let robotsurl = null
  if (typeof(url) === "string") {
    if (url.indexOf("/robots.txt") === -1) robotsurl = `${url}/robots.txt`
  } else if (url.pathname) {
    robotsurl = new URL(url.href)
    if (robotsurl.pathname.indexOf("robots.txt") === -1) {
      robotsurl.pathname = "robots.txt"
    }
  }
  try {
    const options = Object.assign({ delay_ms: 3000 }, uoptions)
    const txt = await hittp.get(robotsurl, options)
    const lines = txt.split("\n")
    const sitemaps = []
    for (const line of lines) {
      const kv = getKeyVal(line)
      if (!kv) continue
      const key = kv.key
      const val = kv.val
      if (key === "sitemap") {
        sitemaps.push(val)
      }
    }
    return sitemaps
  } catch (err) {
    return []
  }
}

function getKeyVal(line, lower=true) {
  if (line.length == 0) return null
  if (line.startsWith("#")) return null
  let colon = line.indexOf(":")
  if (colon === -1) return null
  const kv = {}
  kv.key = line.slice(0, colon)
  kv.val = line.slice(colon+1).trim()
  if (lower) kv.key = kv.key.toLowerCase(); kv.val = kv.val.toLowerCase();
  return kv
}

module.exports = {
  getSitemaps
}