'use strict'

const queryString = require('query-string');
const hittp = require("hittp")

const parse = (urlorstring) => {
  let url = null
  if (typeof(urlorstring) === "string") url = hittp.str2url(urlorstring)
  else if (urlorstring.href) url = hittp.str2url(urlorstring.href)
  else return null // Invalid input

  return parseQuery(url) || parsePath(url)
}

const parseQuery = (url) => {
  if (url.search.length === 0) return null
  //try to parse date from query string
  const args = queryString.parse(url.search)
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
    const date = Date.parse(dateString)
    if (date && date != NaN) {
      return date
    }
  }
  return null
}

const parsePath = (url) => {
  if (url.pathname.length === 0) return null
  const pathname = url.pathname
  let yyyy = null, mm = null, dd = null
  let index = pathname.search(/\D(20|19)\d{2}/g)
  if (index === -1) index = pathname.search(/(20|19)\d{2}\D/g)
  else index += 1
  if (index === -1) return null

  yyyy = parseInt(pathname.slice(index, index+4))
  if (!yyyy || yyyy === NaN) return null
  if (yyyy < 2000) {
    return Date.parse(`${yyyy}-12-31`)
  }
  // console.log(pathname)
  let ddmmyyyyindex = pathname.search(/[\d{2}\D?]?\d{2}\D?20\d{2}/g)
  if (ddmmyyyyindex != -1) {
    let dateString = `${yyyy}`
    // console.log(yyyy, pathname)
    // console.log("DDMMYYYY")
    let i = index - 1
    let char = pathname[i]
    if (char && char.search(/\d/g) === -1) {
      i -= 1
      char = pathname[i]
      // console.log(char)
    }
    mm = ""
    dd = ""
    while (char && char.search(/\d/g) !== -1 && i < pathname.length && mm.length < 2) {
      mm += char
      i -= 1
      char = pathname[i]
      // console.log(char)
    }
    mm = mm.split("").reverse().join("")
    if (char && char.search(/\d/g) === -1) {
      i -= 1
      char = pathname[i]
      // console.log(char)
    }
    while (char && char.search(/\d/g) !== -1 && i < pathname.length && dd.length < 2) {
      dd += char
      i -= 1
      char = pathname[i]
      // console.log(char)
    }
    dd = dd.split("").reverse().join("")
    const mmint = parseInt(mm)
    const ddint = parseInt(dd)
    // console.log(yyyy, mmint, ddint)
    if (mmint != NaN && mmint > 0 && mmint <= 12) dateString += `-${mm}`
    if (ddint != NaN && ddint > 0 && ddint <= 31) dateString += `-${dd}`
    else dateString += "-31"
    // console.log("Built datestring", dateString, "from", yyyy, mm, dd)
    const date = Date.parse(dateString)
    // console.log("Parsed to ", lastmod)
    if (date && date !== NaN) {
      return date
    }
  }
  let yyyymmddIndex = pathname.search(/20\d{2}\D?\d{1,2}[\D?\d{1,2}]?/g)
  if (yyyymmddIndex !== -1) {
    let dateString = `${yyyy}`
    // console.log("YYYYMMDD")
    let i = index + 4
    let char = pathname[i]
    // console.log(char)
    if (char && char.search(/\d/g) === -1) {
      i += 1
      char = pathname[i]
      // console.log(char)
    }
    mm = ""
    dd = ""
    while (char && char.search(/\d/g) !== -1 && i < pathname.length && mm.length < 2) {
      mm += char
      i += 1
      char = pathname[i]
      // console.log(char)
    }
    if (char && char.search(/\d/g) === -1) {
      i += 1
      char = pathname[i]
      // console.log(char)
    }
    while (char && char.search(/\d/g) !== -1 && i < pathname.length && dd.length < 2) {
      dd += char
      i += 1
      char = pathname[i]
      // console.log(char)
    }
    const mmint = parseInt(mm)
    const ddint = parseInt(dd)
    if (mmint && mmint > 0 && mmint <= 12) dateString += `-${mm}`
    if (ddint && ddint > 0 && ddint <= 31) dateString += `-${dd}`
    else dateString += "-31"
    // console.log(pathname, dateString, "from", yyyy, mm, dd)
    const date = Date.parse(dateString)
    // console.log("Parsed to ", lastmod)
    if (date && date !== NaN) {
      return date
    }
  }
  return null
}

module.exports = parse