'use strict'

const http = require("hittp")
const stream = require("stream")
const robots = require("./robots")
const url2date = require("./url2date")
const URLStream = require("./urlstream")

class SiteMapper {

  constructor() {
    this.outStreams = []
    this.hosts = []
  }

  cancel() {
    console.log("Cancelling", this.hosts)
    for (let host of this.hosts) {
      if (!host) continue
      if (typeof(host) === "string") host = http.str2url(host)
      else if (host.href) host = new URL(host.href)
      else continue
      http.cancel(host)
    }
  }

  map(url, since) {
    const outstream = stream.PassThrough({autoDestroy: true})
    let urlcopy = null
    if (typeof(url) === "string") urlcopy = http.str2url(url)
    if (!urlcopy) throw new Error("Invalid URL")
    if (urlcopy.pathname.endsWith(".gz")) {
      urlcopy.pathname = urlcopy.pathname.slice(0, -3)
    }
    this.hosts.push(urlcopy.host)
    // process.nextTick( (outstream) => {
      let date = null
      if (typeof(since) === "string") {
        date = Date.parse(since)
        if (!date || isNaN(date)) throw new Error("Invalid date for 'since' parameter")
      } else {
        date = since
      }
      robots.getSitemaps(urlcopy).then((sitemapurls) => {
        if (sitemapurls.length === 0) {
          if (typeof(url) === "string") {
            sitemapurls.push(`${url}/sitemap.xml`)
            sitemapurls.push(`${url}/sitemap_index.xml`)
          } else if (url.origin) {
            sitemapurls.push(`${url.origin}/sitemap.xml`)
            sitemapurls.push(`${url.origin}/sitemap_index.xml`)
          }
        }
        for (const sitemapurl of sitemapurls) {
          // const sitemapstream = await this.get(sitemapurl, date)
          // sitemapstream.pipe(outstream, {end: false})
          this.get(sitemapurl, date).then((sitemapstream) =>  {
            sitemapstream.pipe(outstream)
            // console.log(sitemapstream)
          }).catch((err) => {
            console.error(err.message, sitemapurl)
          })
        }
      })
    // })
    return outstream
  }

  async get(url, since) {
    return new Promise((resolve, reject) => {
      this._getRecursive(url, since).then((sitemapstream) => {
        resolve(sitemapstream)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  async _getRecursive(url, since, outstream=null) {
    return new Promise((resolve, reject) => {
      this._get(url, since).then((urlstream) => {
        if (!outstream) {
          outstream = new stream.PassThrough()
          resolve(outstream)
        }
        urlstream.on("sitemap", (sitemapurl) => {
          this._getRecursive(sitemapurl, since, outstream).catch((err) => {})
        })
        urlstream.pipe(outstream, {end:false})
      }).catch((err) => {
        // console.log("urlstream error", this.outcount)
        this.outcount -= 1
        if (this.outcount == 0) {
          if (outstream) outstream.end()
        }
        reject(err)
      })
    })
  }

  async _get(url, since) {
    return new Promise((resolve, reject) => {
      if (this.hosts.indexOf(url.host) === -1) {
        this.hosts.push(url.host)
      }
      http.stream(url, {timeout_ms: 10000}).then((httpstream) => {
        const urlstream = new URLStream(url, since)
        resolve(httpstream.pipe(urlstream))
      }).catch((err) => {
        reject(err)
      })
    })
  }

  configure(options) {
    http.configure(options)
  }
}

module.exports = {
  SiteMapper
}