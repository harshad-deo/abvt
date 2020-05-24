const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      DEVELOPMENT_BUILD: true,
      WEBSOCKET_URL: JSON.stringify('ws://localhost:8080/ws'),
    }),
  ],
});
