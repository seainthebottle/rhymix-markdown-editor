// webpack.config.js

const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/loader.js",

  output: {
    path: path.resolve("build"),
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
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
    ],
  },

  resolve: {
    modules: [path.join(__dirname, "src"), "node_modules"], 
    extensions: [".ts", ".js"],
    fallback: {
        "fs": false,
        "path": false ,
        "os": false
    }
  }
};
