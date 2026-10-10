const baseConfig = require("../../prettier.config.js");

module.exports = {
  ...baseConfig,
  plugins: [...baseConfig.plugins, require.resolve("prettier-plugin-tailwindcss")],
};
