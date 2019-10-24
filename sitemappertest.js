const { SiteMapper } = require("./sitemapper")
const fs = require("fs")


const mapper = new SiteMapper()
const sitemapstream = mapper.map("nationalpost.com", "2019-10-23")
const file = fs.createWriteStream("./.playground/streamtest.txt")
sitemapstream.pipe(file)
sitemapstream.on("end", () => {
  console.log("Sitemapstream closed")
})