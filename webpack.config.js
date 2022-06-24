// webpack.config.js

const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/loader.js",

  output: {
    path: path.resolve("dist"),
    filename: "rhymix_markdown_editor.js",
  },

  externals: {
    jquery: "jQuery",
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
      },
    ],
  },
};
