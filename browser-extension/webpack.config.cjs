const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    'content-script': './src/content-script.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/u,
        use: 'ts-loader',
        exclude: /node_modules/u
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json'
        }
      ]
    })
  ]
};
