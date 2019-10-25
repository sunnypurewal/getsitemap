const { SiteMapper } = require("./sitemapper")
const { createWriteStream, readFileSync } = require("fs")

let domains = readFileSync("./domains.json")
domains = JSON.parse(domains.toString())
let random = Math.floor(Math.random() * domains.length)
let domain = domains[random]

const mapper = new SiteMapper()
const sitemapstream = mapper.map(domain, "2019-10-23")
const file = createWriteStream("./.playground/streamtest.txt")
sitemapstream.pipe(file)
sitemapstream.on("end", () => {
  console.log("Sitemapstream closed")
})
setTimeout(() => {
  mapper.cancel()
}, 2000)