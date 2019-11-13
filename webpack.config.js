const path = require('path')
const { CheckerPlugin } = require('awesome-typescript-loader')

module.exports = {
  entry: './index.ts',
  devtool: 'source-map',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        exclude: /node_modules/,
        loader: 'awesome-typescript-loader'
      },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
    ]
  },
  resolve: {
    extensions: ['.ts', '.ts', '.js']
  },
  plugins: [new CheckerPlugin()]
}
