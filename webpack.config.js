// webpack.config.js

const path = require("path");

module.exports = {
  mode: "production",
  entry: "./js/loader.js",

  output: {
    path: path.resolve("dist"),
    filename: "rhymix_markdown_editor.min.js",
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

  resolve: {
    fallback: {
        "fs": false,
        "path": false ,
        "os": false
    }
  }
};
