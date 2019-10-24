const URLStream = require("./urlstream")

test("includes parent", () => {
  const urlstream = new URLStream("http://parent.com", "2019-10-22")
  
  urlstream.on("data", (chunk) => {
    const index = chunk.toString().indexOf("http://parent.com")
    expect(index).not.toBe(-1)
    urlstream.end()
  })
  
  urlstream.write(`<url><loc>http://parent.com/child</loc><lastmod>2019-10-23T00:00:00Z</lastmod></url>`)
})
