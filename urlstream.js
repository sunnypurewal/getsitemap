'use strict'

const stream = require("stream")
const os = require("os")

class URLStream extends stream.Transform {

  constructor(options) {
    options = options || {}
    options.decodeStrings = false
    super(options)
    this.mode = -1
    this.open = null
    this.close = null
    this.lastChunk = null
  }

  _transform(chunk, enc, cb) {
    if (this.mode === -1) {
      if (chunk.search(/<\w*sitemapindex/ig) !== -1) {
        this.mode = 1
      } else {
        this.mode = 0
      }
    }
    let opens = null
    let closes = null
    if (this.lastChunk) {
      chunk = this.lastChunk.concat(chunk)
      this.lastChunk = null
    }
    if (this.mode === 1) {
      opens = chunk.matchAll(/<sitemap>/gi)
      closes = chunk.matchAll(/<\/sitemap>/gi)
    } else {
      opens = chunk.matchAll(/<url>/gi)
      closes = chunk.matchAll(/<\/url>/gi)
    }
    this.open = opens.next()
    this.close = closes.next()
    while (!this.open.done) {
      const openval = this.open.value
      if (this.close.done) {
        this.lastChunk = openval.input.slice(openval.index)
        break
      }
      const closeval = this.close.value
      const xml = openval.input.slice(openval.index, closeval.index + closeval[0].length)
      // console.log("____")
      // console.log(xml)
      const loc = xml.match(/<loc>[\w|\W]*<\/loc>/ig)
      if (loc) {
        const lastmod = xml.match(/<[lastmod|news:publication_date]>[\w|\W]*<\/[lastmod|news:publication_date]>/ig)
        if (lastmod) {

        }
        this.push(`${loc[0].slice(5,-6)}\n`, enc)
      }
      this.open = opens.next()
      this.close = closes.next()
    }
    cb()
  }
}

module.exports = URLStream