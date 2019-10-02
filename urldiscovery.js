'use strict'

const fspromises = require("fs").promises

const fromJSON = async (filename) => {
  try {
    const obj = await fspromises.readFile(filename)
    obj = JSON.parse(obj)
    const domains = []
    const categories = Object.keys(obj)
    for (const cat of categories) {
      const urlList = obj[cat]
      for (const u of urlList) {
        domains.push(u)
      }
    }
    return domains
  } catch (error) {
    console.error(error)
    return []
  }
}

module.exports = {
  fromJSON
}