// Delegates to the repo-root babel config so `jest` run from this directory
// picks up the same transform settings (including the `test` env plugins).
module.exports = require('../babel.config.js');
