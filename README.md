# getsitemap

getsitemap is a library that takes a domain name as input and returns a stream of `<url>` from the `<urlset>` elements of the website's sitemap.xml file(s). It can be used for obtaining a list of pages to crawl from a website. The objects in the stream will match the  [sitemap protocol](https://www.sitemaps.org/protocol.html#urldef):
```
{
  url: "http//newyorktimes.com", // Always present
  lastmod: "2019-10-01" // Optional
}
```

## Usage
Streaming the URL set to a file. The file will be of `jsonlines` type, which means that each line will be a JSON object. Note that this will *not* be a valid JSON file but is useful for reading large files line-by-line.
```
const getsitemap = require("getsitemap")

getsitemap.map("theintercept.com").then((sitemapstream) => {
  const file = fs.createWriteStream(`./intercept.txt`)
  sitemapstream.pipe(file)
}
/* OR */
getsitemap.map("theintercept.com").then((sitemapstream) => {
  sitemapstream.on("data", (obj) => {
    // obj.url, obj.lastmod
  })
})
```

## Configuration

getsitemap uses [hittp](https://www.npmjs.com/package/hittp) under the hood to make HTTP requests, and by default it will delay requests to the same host for 3 seconds so as to not overload the server. getsitemap can be configured in the same way as hittp:

```
const getsitemap = require("getsitemap")
// Defaults:
getsitemap.configure({
  delay_ms: 3000,
  maxConnections: 16,
  cachePath: "./.cache"
})
```
### Don't forget to add your cache path to .gitignore! Default path is `./.cache`