'use strict'

var htmlEntities = {
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
};

module.exports = function unescapeHTML(str) {
  return str.replace(/\&([^;]+);/g, function (entity, entityCode) {
      var match;
      if (entityCode in htmlEntities) {
          return htmlEntities[entityCode];
      } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
      } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
      } else {
          return entity;
      }
  });
};