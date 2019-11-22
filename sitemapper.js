'use strict'

const http = require("hittp")
const stream = require("stream")
const robots = require("./robots")
const url2date = require("./url2date")
const URLStream = require("./urlstream")

class SiteMapper {

  constructor(domain) {
    let domainstring = domain.slice()
    this.domain = http.str2url(domainstring)
    if (!this.domain) throw new Error("Invalid URL", domain)
    this.hosts = [this.domain]
    this.countmap = new Map()
    this.outercount = 0
    this.timeout = null
    this.logLevel = null
  }

  setLogLevel(level) {
    http.setLogLevel(level)
    if (level === "info") {
      this.info = console.log
      this.debug = console.log
      this.error = console.error
    } else if (level === "debug") {
      this.info = () => {}
      this.debug = console.log
      this.error = console.error
    } else if (level === "error") {
      this.info = () => {}
      this.debug = () => {}
      this.error = console.error
    } else {
      this.info = () => {}
      this.debug = () => {}
      this.error = () => {}
    }
  }

  /**
   * If you have a long running Sitemapper and want to cancel
   * all of its queued HTTP calls.
   */
  cancel() {
    for (let host of this.hosts) {
      if (!host) continue
      if (typeof(host) === "string") host = http.str2url(host)
      else if (host.href) host = new URL(host.href)
      else continue
      http.cancel(host)
    }
  }

  map(since, uoptions) {
    const options = Object.assign({ delay_ms: 3000 }, uoptions)
    
    const outstream = new stream.PassThrough(Object.assign(options, { writableObjectMode: true }))
    // process.nextTick( (outstream) => {
    let date = null
    if (typeof(since) === "string") {
      date = Date.parse(since)
      if (!date || isNaN(date)) throw new Error("Invalid date for 'since' parameter")
    } else {
      date = since
    }
    robots.getSitemaps(this.domain, options).then((sitemapurls) => {
      // TODO: Maybe do this entire process serially for simplicity
      if (sitemapurls.length === 0) {
        sitemapurls.push(`${this.domain.href}/sitemap.xml`)
        sitemapurls.push(`${this.domain.href}/sitemap_index.xml`)
      }
      sitemapurls = [...(new Set(sitemapurls))]
      // console.log(sitemapurls)
      this.outercount = sitemapurls.length
      for (const sitemapurl of sitemapurls) {
        // const sitemapstream = await this.get(sitemapurl, date)
        // sitemapstream.pipe(outstream, {end: false})
        this.countmap.set(sitemapurl, 0)
        this.get(sitemapurl, date, options).then((sitemapstream) =>  {
          sitemapstream.on("end", () => {
            this.outercount -= 1
            if (this.outercount === 0) outstream.end()
            // if (this.outercount === 0 && !this.timeout) {
              // this.timeout = setTimeout(() => {
                // if (outstream && !outstream.ended) outstream.end()
              // }, 10000)
            // }
            // console.log("Outer feeder to sitemapstream ended", this.outercount)
          })
          sitemapstream.on("error", () => {
            this.outercount -= 1
            if (this.outercount === 0) outstream.end()
            // if (this.outercount === 0 && !this.timeout) {
            //   this.timeout = setTimeout(() => {
            //     if (outstream && !outstream.ended) outstream.end()
            //   }, 10000)
            // }
            // console.log("Outer feeder to sitemapstream errored", this.outercount)
          })
          sitemapstream.pipe(outstream, {end: false})
          // console.log(sitemapstream)
        }).catch((err) => {
          // console.error(err.message, sitemapurl)
        })
      }
    })
    // })
    return outstream
  }

  async get(url, since, options) {
    return new Promise((resolve, reject) => {
      this._getRecursive(url, since, null, null, options).then((sitemapstream) => {
        resolve(sitemapstream)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  async _getRecursive(url, since, outstream=null, parent=null, options) {
    let innercount = this.countmap.get(parent || url) || 0
    innercount += 1
    this.countmap.set(parent || url, innercount)
    return new Promise((resolve, reject) => {
      if (!outstream) {
        outstream = new stream.PassThrough(Object.assign(options, { writableObjectMode: true }))
        resolve(outstream)
      }
      if (this.timeout) {
        // console.log("Resetting timeout", this.innercount)
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this._get(url, since, options).then((urlstream) => {
        urlstream.on("sitemap", (sitemapurl) => {
          process.nextTick(()=>this._getRecursive(sitemapurl, since, outstream, parent || url, options).catch((err) => {}))
        })
        urlstream.pipe(outstream, {end:false})
        urlstream.on("end", () => {
          let innercount = this.countmap.get(parent || url) || 0
          innercount -= 1
          this.countmap.set(parent || url, innercount)
          if (innercount === 0) {
            outstream.end()
            // this.timeout = setTimeout(() => {
              // if (outstream && !outstream.ended) outstream.end()
            // }, 5000)
          }
          // console.log("Inner feeder to sitemapstream ended", innercount)
        })
        urlstream.on("error", (err) => {
          console.error("Error in the sitemapper for", this.domain.href, err.message)
          let innercount = this.countmap.get(parent || url) || 0
          innercount -= 1
          this.countmap.set(parent || url, innercount)
          if (innercount === 0) {
            outstream.end()
            // this.timeout = setTimeout(() => {
              // if (outstream && !outstream.ended) outstream.end()
            // }, 5000)
          }
          // console.log("Inner feeder to sitemapstream ended", innercount)
        })
      }).catch((err) => {
        let innercount = this.countmap.get(parent || url) || 0
        innercount -= 1
        this.countmap.set(parent || url, innercount)
        if (innercount === 0) {
          outstream.end()
          // this.timeout = setTimeout(() => {
            // if (outstream && !outstream.ended) outstream.end()
          // }, 5000)
        }
        // console.error("Inner feeder to sitemapstream errored", innercount)
        // console.error(err)
        reject(err)
      })
    })
  }

  async _get(url, since, options) {
    if (this.hosts.indexOf(url.origin) === -1) {
      this.hosts.push(url.origin)
    }
    return new Promise((resolve, reject) => {
      http.stream(url, options).then((httpstream) => {
        const urlstream = new URLStream(url, since, options)
        httpstream.on("error", (err) => {
          console.error("Error fetching a sitemap", url.href, err.message)
        })
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