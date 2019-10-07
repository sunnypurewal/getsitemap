'use strict'

const parse = (pathname) => {
  let yyyy = null, mm = null, dd = null
  let index = pathname.search(/\D20\d{2}/g)
  if (index === -1) index = pathname.search(/20\d{2}\D/g)
  else index += 1
  if (index === -1) return null

  yyyy = parseInt(pathname.slice(index, index+4))
  if (!yyyy || yyyy === NaN) return null
  // console.log(pathname)
  let dateString = `${yyyy}`
  let ddmmyyyyindex = pathname.search(/[\d{2}\D?]?\d{2}\D?20\d{2}/g)
  if (ddmmyyyyindex != -1) {
    // console.log("DDMMYYYY")
    index -= 1
    let char = pathname[index]
    if (char && char.search(/\d/g) === -1) {
      index -= 1
      char = pathname[index]
      // console.log(char)
    }
    mm = ""
    dd = ""
    while (char && char.search(/\d/g) !== -1 && index < pathname.length && mm.length <= 2) {
      mm += char
      index -= 1
      char = pathname[index]
      // console.log(char)
    }
    mm = mm.split("").reverse().join("")
    if (char && char.search(/\d/g) === -1) {
      index -= 1
      char = pathname[index]
      // console.log(char)
    }
    while (char && char.search(/\d/g) !== -1 && index < pathname.length && dd.length <= 2) {
      dd += char
      index -= 1
      char = pathname[index]
      // console.log(char)
    }
    dd = dd.split("").reverse().join("")
    const mmint = parseInt(mm)
    const ddint = parseInt(dd)
    // console.log(yyyy, mmint, ddint)
    if (mmint != NaN && mmint > 0 && mmint <= 12) dateString += `-${mm}`
    else dateString += "-12" 
    if (ddint != NaN && ddint > 0 && ddint <= 31) dateString += `-${dd}`
    else dateString += "-31"
    // console.log("Built datestring", dateString, "from", pathname)
    const lastmod = Date.parse(dateString)
    // console.log("Parsed to ", lastmod)
    if (lastmod && lastmod !== NaN) {
      return lastmod
    }
  }
  let yyyymmddIndex = pathname.search(/20\d{2}\D?\d{1,2}[\D?\d{1,2}]?/g)
  if (yyyymmddIndex !== -1) {
    // console.log("YYYYMMDD")
    index += 4
    let char = pathname[index]
    // console.log(char)
    if (char && char.search(/\d/g) === -1) {
      index += 1
      char = pathname[index]
      // console.log(char)
    }
    mm = ""
    dd = ""
    while (char && char.search(/\d/g) !== -1 && index < pathname.length && mm.length <= 2) {
      mm += char
      index += 1
      char = pathname[index]
      // console.log(char)
    }
    if (char && char.search(/\d/g) === -1) {
      index += 1
      char = pathname[index]
      // console.log(char)
    }
    while (char && char.search(/\d/g) !== -1 && index < pathname.length && dd.length <= 2) {
      dd += char
      index += 1
      char = pathname[index]
      // console.log(char)
    }
    const mmint = parseInt(mm)
    const ddint = parseInt(dd)
    // console.log(yyyy, mmint, ddint)
    if (mmint > 0 && mmint <= 12) dateString += `-${mm}`
    else dateString += "-12" 
    if (ddint > 0 && ddint <= 31) dateString += `-${dd}`
    else dateString += "-31"
    // console.log("Built datestring", dateString, "from", pathname)
    const lastmod = Date.parse(dateString)
    // console.log("Parsed to ", lastmod)
    if (lastmod && lastmod !== NaN) {
      return lastmod
    }
  }
  return null
}

module.exports = {
  parse
}