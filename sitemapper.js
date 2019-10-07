'use strict'

const http = require("hittp")
const sax = require("sax"),
  strict = true
const stream = require("stream")
const robots = require("./robots")
const queryString = require('query-string');

const map = async (url, since) => {
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
        get(sitemapurl, since).then((sitemapstream) =>  {
          if (sitemapstream) sitemapstream.pipe(outstream)
        })
      }
    }).catch((err) => {
      reject(err)
    })
  })
}

const get = async (url, since) => {
  if (typeof(url) === "string") url = http.str2url(url)
  if (url.pathname.endsWith(".gz")) {
    url.pathname = url.pathname.slice(0, -3)
  }
  _getRecursive(url, since).then((sitemapstream) => {
    return sitemapstream
  }).catch((err) => {
    return null
  })
}

const _getRecursive = async (url, since, outstream=null) => {
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
          const locurl = http.str2url(chunkobj.loc)
          if (chunkobj.lastmod) {
            const lastmod = Date.parse(chunkobj.lastmod.toString())
            if (lastmod !== NaN && lastmod > since) {
              _getRecursive(locurl, since, outstream).catch((err) => {
                // Failed to fetch a node from sitemapindex
                // Nothing we can do here. Just skip it.
              })
            }
          } else if (locurl.search.length > 0) {
            //try to parse date from query string
            const args = queryString.parse(locurl.search)
            let yyyy = null, mm = null, dd = null
            for (const key in args) {
              const lowerkey = key.toLowerCase()
              if (lowerkey === "yyyy" || lowerkey === "yy") {
                yyyy = args[key]
              } else if (lowerkey === "mm" || lowerkey === "m") {
                mm = args[key]
              } else if (lowerkey === "dd" || lowerkey === "d") {
                dd = args[key]
              }
            }
            if (yyyy) {
              let dateString = yyyy
              if (mm) dateString += `-${mm}`
              else datestring += "-12" 
              if (dd) dateString += `-${dd}`
              else dateString += "-31"
              const lastmod = Date.parse(dateString)
              if (lastmod !== NaN && lastmod > since) {
                _getRecursive(locurl, since, outstream).catch((err) => {
                  // Failed to fetch a sitemap from sitemapindex
                  // Nothing we can do here. Just skip it.
                })
              }
            }
          } else {
            const pathname = locurl.pathname
            let yyyy = null, mm = null, dd = null
            const yyyyIndex = pathname.search(/20\d{2}/g)
            if (yyyyIndex != -1) {
              yyyy = parseInt(pathname.slice(yyyyIndex, yyyyIndex+4))
            }
            if (yyyy) {
              let dateString = yyyy
              const ddmmyyyyindex = pathname.search(/[0-9]?[0-9][-_]?[0-9]?[0-9][-_]?20\d{2}}/g)
              if (ddmmyyyyindex != -1) {
                //parse date woooo
              }
            }
            console.log(pathname, "Found a year at index", yyyyIndex)
            // console.log("No date information about sitemap", filename, url.origin)
          }
          //chunk is a sitemap
        } else {
          outstream.write(chunk)
          //chunk is a URL
        }
      })
    }).catch((err) => {
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
      reject(err)
    })
  })
}

const configure = (options) => {
  http.configure(options)
}

module.exports = {
  map,
  configure
}