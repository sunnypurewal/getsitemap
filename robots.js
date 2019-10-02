'use strict'
const hittp = require("hittp")
const stream = require("stream")
const events = require("events")

const emitter = new events.EventEmitter()

const getSitemaps = async (url) => {
  if (typeof(url) === "string") {
    if (url.indexOf("/robots.txt") === -1) url = `${url}/robots.txt`
  } else if (url.pathname) {
    if (url.pathname.indexOf("robots.txt") === -1) url.pathname = "robots.txt"
  }
  try {
    const txt = await hittp.get(url)
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
    throw(err)
  }
}

const getKeyVal = (line, lower=true) => {
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