'use strict'

const http = require("hittp")
const sax = require("sax"),
  strict = true
const stream = require("stream")
const robots = require("./robots")

const map = async (url) => {
  return new Promise((resolve, reject) => {
    robots.getSitemaps(url).then((sitemapurls) => {
      if (sitemapurls.length === 0) {
        if (typeof(url) === "string") {
          if (url.indexOf("/sitemap.xml") === -1) sitemapurls.push(`${url}/sitemap.xml`)
        } else if (url.pathname) {
          if (url.pathname.indexOf("sitemap.xml") === -1) {
            const sitemapurl = url
            sitemapurl.pathname = "sitemap.xml"
            sitemapurls.push(sitemapurl)
          }
        }
      }
      const outstream = stream.PassThrough({autoDestroy: true})
      resolve(outstream)
      for (const sitemapurl of sitemapurls) {
        get(sitemapurl).then((sitemapstream) =>  {
          sitemapstream.pipe(outstream)
        })
      }
    })
  })
}

const get = async (url) => {
  if (typeof(url) === "string") url = http.str2url(url)
  if (url.pathname.endsWith(".gz")) {
    url.pathname = url.pathname.slice(0, -3)
  }
  try {
    const sitemapstream = await _getRecursive(url)
    return sitemapstream
  } catch (err) {
    console.error("sitemapper.get", err.message)
    return null
  }
}

const _getRecursive = async (url, outstream=null) => {
  return new Promise((resolve, reject) => {
    let isSitemapIndex = false
    _get(url).then((urlstream) => {
      if (!urlstream) return
      if (!outstream) {
        outstream = stream.PassThrough({autoDestroy: true})
        resolve(outstream)
      }
      urlstream.on("data", (chunk) => {
        const chunkstring = chunk.toString()
        if (chunkstring === "sitemapindex") {
          isSitemapIndex = true
        } else if (isSitemapIndex) {
          const chunkobj = JSON.parse(chunkstring)
          //TODO: check chunkobj.lastmod
          const locurl = http.str2url(chunkobj.loc)
          _getRecursive(locurl, outstream)
          //chunk is a sitemap
        } else {
          outstream.write(chunk)
          //chunk is a URL
        }
      })
    }).catch((err) => {
      console.error("RECURSIVE ERROR", err.message)
      reject(err)
    })
  })
}

const _get = async (url) => {
  return new Promise((resolve, reject) => {
    const urls = []
    const sitemaps = []
    let loc = null
    let lastmod = null
    let text = ""
    
    http.stream(url).then((httpstream) => {
      if (!httpstream) {
        resolve(null)
        return
      }
      const passthrough = stream.PassThrough({autoDestroy: true})
      const parser = sax.createStream(strict, {autoDestroy: true})
      httpstream.pipe(parser)
      resolve(passthrough)
      parser.on("opentag", (node) => {
        if (passthrough.writableEnded) return
        if (node.name === "sitemapindex") {
          passthrough.write(node.name)
        }
      })
      parser.on("closetag", (name) => {
        if (name === "loc") {
          loc = text
        } else if (name === "lastmod") {
          lastmod = text
        } else if (name === "url") {
          if (passthrough.writableEnded) return
          const obj = {loc}
          if (lastmod) obj.lastmod = lastmod
          passthrough.write(`${JSON.stringify(obj)}
`)
        } else if (name === "sitemap") {
          if (passthrough.writableEnded) return
          const obj = {loc}
          if (lastmod) obj.lastmod = lastmod
          passthrough.write(`${JSON.stringify(obj)}
`)
        } else if (name === "urlset") {
          // if (passthrough.writableEnded) return
          // passthrough.end()
        } else if (name === "sitemapindex") {
          // if (passthrough.writableEnded) return
          // passthrough.end()
        }
        text = null
      })
      parser.on("text", (t) => {
        text = t
      })
      parser.on("error", (err) => {
        if (passthrough.writableEnded) return
        passthrough.end()
      })
    }).catch((err) => {
      console.error("HTTP STREAM ERROR", err.message)
    })
  })
}

module.exports = {
  map
}