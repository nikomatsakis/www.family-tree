const fs = require('fs');
const path = require('path');

// The standalone PDF viewer and Ember app use one source of matching rules.
function prepareNameSearch() {
  fs.copyFileSync(
    path.join(__dirname, '../app/utils/name-search.js'),
    path.join(__dirname, '../public/name-search.mjs'),
  );
}
if (require.main === module) prepareNameSearch();
module.exports = { prepareNameSearch };
