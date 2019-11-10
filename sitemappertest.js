const { SiteMapper } = require("./sitemapper")
const { createWriteStream, readFileSync } = require("fs")

let domains = readFileSync("./domains.json")
domains = domains.toString()
domains = JSON.parse(domains)

let random = Math.floor(Math.random() * domains.length)
let domain = domains[random]
// domain = 'phillyvoice.com'
const mapper = new SiteMapper(domain)
mapper.setLogLevel("info")
const sitemapstream = mapper.map("2019-11-09")
const file = createWriteStream("./.playground/streamtest.txt")
sitemapstream.pipe(file)
sitemapstream.on("end", () => {
  console.log("Sitemapstream closed")
})