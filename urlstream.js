'use strict'

const stream = require("stream")
const os = require("os")
const urldecode = require("./urldecode")
const url2date = require("./url2date")

class URLStream extends stream.Transform {

  constructor(since, options) {
    options = options || {}
    options.decodeStrings = false
    super(options)
    this.since = since
    this.mode = -1
    this.open = null
    this.close = null
    this.lastChunk = null
  }

  _transform(c, enc, cb) {
    let chunk = c.toString()
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
    if (this.mode === 0) {
      opens = chunk.matchAll(/<url>/gi)
      closes = chunk.matchAll(/<\/url>/gi)
    } else {
      opens = chunk.matchAll(/<\w*sitemap>/gi)
      closes = chunk.matchAll(/<\w*\/\w*sitemap>/gi)
    }
    this.open = opens.next()
    this.close = closes.next()
    while (!this.open.done) {
      const openval = this.open.value
      if (this.close.done) {
        //if we have an open tag without a closing tag
        //save the end of the chunk for the next chunk
        this.lastChunk = openval.input.slice(openval.index)
        break
      }
      const closeval = this.close.value
      const xml = openval.input.slice(openval.index, closeval.index + closeval[0].length)
      let loc = xml.match(/<\w*loc\w*>[\w|\W]*<\w*\/\w*loc\w*>/ig)
      if (loc && loc.length > 0) {
        loc = urldecode(loc[0].slice(5, -6))
        let lastmod = xml.match(/<(\w*lastmod\w*|\w*news\:publication_date\w*)>[\w|\W]*<\/(\w*lastmod\w*|\w*news\:publication_date\w*)>/ig)
        if (lastmod && lastmod.length > 0) {
          lastmod = lastmod[0]
          lastmod = lastmod.slice(lastmod.indexOf(">")+1, lastmod.indexOf("</"))
        }
        const date = url2date(loc) || Date.parse(lastmod)
        if (date && !isNaN(date) && date >= this.since) {
          if (this.mode === 0) {
            this.push(`${loc}||${lastmod ? lastmod : ""}\n`)
          } else {
            this.emit("sitemap", loc)
          }
        }
      }
      this.open = opens.next()
      if (!this.open.done) {
        //hold on to close tag if there's no more open tags
        this.close = closes.next()
      }
    }
    if (!this.lastChunk && !this.close.done) {
      //we might have a partial open tag
      const closeval = this.close.value
      if (closeval.index + closeval[0].length < closeval.input.length) {
        this.lastChunk = closeval.input.slice(closeval.index + closeval[0].length)
      }
    }
    if (this.lastChunk) {
      if (this.mode === 0) {
        if (this.lastChunk.search(/<\w*\/\w*urlset\w*>/ig) !== -1) {
          this.end()
        }
      } else {
        if (this.lastChunk.search(/<\w*\/\w*sitemapindex\w*>/ig) !== -1) {
          this.end()
        }
      }
    }
    cb()
  }
}

module.exports = URLStream