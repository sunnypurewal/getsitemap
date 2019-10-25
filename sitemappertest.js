const { SiteMapper } = require("./sitemapper")
const { createWriteStream, readFileSync } = require("fs")

let domains = readFileSync("./domains.json")
domains = domains.toString()
domains = JSON.parse(domains)

let random = Math.floor(Math.random() * domains.length)
let domain = domains[random]
const mapper = new SiteMapper(domain)
console.log(mapper.domain)
const sitemapstream = mapper.map("2019-10-23")
const file = createWriteStream("./.playground/streamtest.txt")
sitemapstream.pipe(file)
sitemapstream.on("end", () => {
  console.log("Sitemapstream closed")
})