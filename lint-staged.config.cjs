module.exports = {
  "*.{ts,tsx}": ["prettier --write", "eslint --config eslint.config.mjs --fix"],
  "*.{json,css,scss,md}": ["prettier --write"],
};
