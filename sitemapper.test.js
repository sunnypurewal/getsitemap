const { SiteMapper } = require("./sitemapper")
const fs = require("fs")

const mapper = new SiteMapper()
mapper.map("nationalpost.com", "2019-10-22").then((sitemapstream) => {
  const file = fs.createWriteStream("./.playground/streamtest.txt")
  sitemapstream.pipe(file)
})