const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      'process/browser': require.resolve('process/browser'),
      "buffer": require.resolve("buffer/"),
      "timers": require.resolve("timers-browserify"),
      "events": require.resolve("events/"),
      "stream": false,
      "crypto": false,
      "fs": false,
      "path": false,
      "os": false,
      "tls": false,
      "net": false,
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),

    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
      setImmediate: ['timers', 'setImmediate'],
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^perf_hooks$/,
      path.resolve(__dirname, 'webpack-perf-hooks.js')
    ),
  ],
  devServer: {
    port: 3000,
    open: true,
    hot: true,
  },
};