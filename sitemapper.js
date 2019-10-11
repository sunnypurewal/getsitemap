'use strict'

const http = require("hittp")
const sax = require("sax"),
  strict = true
const stream = require("stream")
const robots = require("./robots")
const queryString = require('query-string');
const str2date = require("./str2date")

class SiteMapper {

  constructor(useCache = true) {
    this.outcount = 0
    this.useCache = useCache
  }

  map = async (url, since) => {
    return new Promise((resolve, reject) => {
      robots.getSitemaps(url, this.useCache).then((sitemapurls) => {
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
          this.get(sitemapurl, since).then((sitemapstream) =>  {
            if (sitemapstream) {
              sitemapstream.on("end", () => {
                outstream.end()
              })
              sitemapstream.pipe(outstream)
            }
          })
        }
      }).catch((err) => {
        reject(err)
      })
    })
  }

  get = async (url, since) => {
    return new Promise((resolve, reject) => {
      if (typeof(url) === "string") url = http.str2url(url)
      if (url.pathname.endsWith(".gz")) {
        url.pathname = url.pathname.slice(0, -3)
      }
      this._getRecursive(url, since).then((sitemapstream) => {
        resolve(sitemapstream)
      }).catch((err) => {
        resolve(null)
      })
    })
  }

  _getRecursive = async (url, since, outstream=null) => {
    this.outcount += 1
    return new Promise((resolve, reject) => {
      let isSitemapIndex = false
      this._get(url).then((urlstream) => {
        if (!urlstream) return
        if (!outstream) {
          outstream = stream.PassThrough({autoDestroy: true})
          resolve(outstream)
        }
        urlstream.on("end", () => {
          this.outcount -= 1
          // console.log("urlstream ended", this.outcount)
          if (this.outcount === 0) {
            outstream.end()
            // console.log("All streams back")
          }
        })
        urlstream.on("data", (chunk) => {
          const chunkstring = chunk.toString()
          if (chunkstring === "sitemapindex") {
            isSitemapIndex = true
            // return
          } else if (isSitemapIndex) {
            const chunkobj = JSON.parse(chunkstring)
            const locurl = http.str2url(chunkobj.loc)
            if (locurl && locurl.search.length > 0) {
              //try to parse date from query string
              const args = queryString.parse(locurl.search)
              let yyyy = null, mm = "", dd = ""
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
                if (mm.length) dateString += `-${mm}`
                else dateString += "-12" 
                if (dd.length) dateString += `-${dd}`
                else dateString += "-31"
                const lastmod = Date.parse(dateString)

                if (lastmod && lastmod != NaN) {
                  if (lastmod > since) {
                    this._getRecursive(locurl, since, outstream).catch((err) => {
                    })
                  }
                  return
                }
              }
            }
            if (locurl && locurl.pathname.length > 0) {
              let lastmod = str2date.parse(locurl.pathname)
              if (lastmod && lastmod != NaN) {
                if (lastmod > since) {
                  // console.log(locurl.pathname)
                  this._getRecursive(locurl, since, outstream).catch((err) => {
                  })
                }
                return
              }
            }
            if (chunkobj.lastmod) {
              const lastmod = Date.parse(chunkobj.lastmod)
              if (lastmod && lastmod != NaN) {
                if (lastmod > since) {
                  this._getRecursive(locurl, since, outstream).catch((err) => {
                  })
                }
                return
              }
            }
          }
          else {
            const chunkobj = JSON.parse(chunkstring)
            const lastmod = Date.parse(chunkobj.lastmod)
            if (lastmod && lastmod !== NaN && lastmod > since) {
              outstream.write(chunk)
            }
            //chunk is a URL
          }
        })
      }).catch((err) => {
        // console.log("urlstream error" this.outcount)
        this.outcount -= 1
        if (this.outcount == 0) {
          if (outstream) outstream.end()
        }
        reject(err)
      })
    })
  }

  _get = async (url) => {
    return new Promise((resolve, reject) => {
      const urls = []
      const sitemaps = []
      let loc = null
      let lastmod = null
      let text = ""
      http.stream(url, {  headers: { 'User-Agent': 'Mozilla/5.0' }, useCache: this.useCache, timeout_ms:3000}).then((httpstream) => {
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
          } else if (name === "lastmod" || name === "news:publication_date") {
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
            if (passthrough.writableEnded) return
            passthrough.end()
          } else if (name === "sitemapindex") {
            if (passthrough.writableEnded) return
            passthrough.end()
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

  static configure = (options) => {
    http.configure(options)
  }
}

module.exports = {
  SiteMapper
}