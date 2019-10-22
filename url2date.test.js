const url2date = require("./url2date")

test("yyyymmdd", () => {
  const url = "https://www.nraila.org/articles/20120120/virginia-sunday-hunting-legislation-passes-senate-committee"
  const date = url2date(url)
  const expected = Date.parse("2012-01-20")
  expect(date).toBe(expected)
})

test("yyyy/mm/dd", () => {
  const url = "http://www.iowawatch.org/2019/09/30/iowa-rural-hospitals-make-tough-choices-to-stay-lean-provide-needed-care/"
  const date = url2date(url)
  const expected = Date.parse("2019-09-30")
  expect(date).toBe(expected)
})

test("querystring", () => {
  const url = "https://nationalpost.com/sitemap.xml?yyyy=2019&mm=10&dd=18"
  const date = url2date(url)
  const expected = Date.parse("2019-10-18")
  expect(date).toBe(expected)
})