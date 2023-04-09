/*eslint-disable */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;

const babelLoaderPlugins = [
  require.resolve('@babel/plugin-transform-modules-commonjs'),
  require.resolve('@babel/plugin-proposal-class-properties'),
  require.resolve("@babel/plugin-proposal-optional-chaining"),
  require.resolve("@babel/plugin-transform-runtime"),
];

const babelLoaderPresets = [[require.resolve('@babel/preset-env'), { useBuiltIns: 'entry', corejs: '3' }]];

function config() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    mode: process.env.NODE_ENV,

    devtool: isProd ? false : 'cheap-module-source-map',

    entry: {
      'fps': ['./src/index.js', './src/index.css'],
    },
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: '[name].min-[chunkhash].js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: (info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            minSize: 1048576,
            maxSize: 2097152,
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
          },
        },
      },
      minimizer: [
        isProd &&
          new TerserPlugin({
            sourceMap: true,
            terserOptions: {
              ecma: 6,
              compress: {},
            },
          }),
      ].filter(Boolean),
    },
    resolve: {
      alias: {
        'fps': path.resolve(path.join(__dirname, './src')),
      },
      extensions: ['.eot', '.js', '.json'],
    },
    module: {
      strictExportPresence: true,
      rules: [
        {
          oneOf: [
            {
              test: /\.(jpg|png|svg|ico|eot|svg|ttf|woff(2)?)(\?v=\d+\.\d+\.\d+)?/,
              use: {
                loader: 'url-loader',
                options: {
                  name: 'assets/[name].[ext]',
                },
              },
            },

            // Links within index.html need to factor in hash codes of assets.
            {
              test: /(index)\.html$/,
              use: {
                loader: 'html-loader',
                options: {attrs: 'img:src link:href'}
              }
            },

            {
              test: /\.js$/,
              exclude: (path) => /(node_modules)/.test(path),
              use: {
                loader: 'babel-loader',
                options: {
                  cacheDirectory: true,
                  presets: babelLoaderPresets,
                  plugins: babelLoaderPlugins,
                },
              },
            },

            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: ['style-loader', 'css-loader', 'import-glob-loader'],
            },

            {
              loader: require.resolve('file-loader'),
              exclude: [/\.(js|mjs|ts|tsx)$/, /\.html$/, /\.json$/],
              options: {
                name: '[name].[hash:8].[ext]',
              },
            },
          ],
        },
      ],
    },

    plugins: [
      // Cleans any lingering files from the dist directory.
      new CleanWebpackPlugin(),

      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        template: './src/index.html',
      }),

      isProd &&
        new webpack.LoaderOptionsPlugin({
          options: {
            htmlLoader: {
              ignoreCustomFragments: [/\{\{.*?}}/],
            },
          },
        }),

      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].chunk.css',
      }),
    ].filter(Boolean),

    performance: false,
  };
}

module.exports = config;
