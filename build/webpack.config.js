const webpack = require('webpack')
const cssnano = require('cssnano')
const HtmlWebpackPlugin = require('html-webpack-plugin')
// const ExtractTextPlugin = require('extract-text-webpack-plugin')
const config = require('../config')
const debug = require('debug')('app:webpack:config')

const paths = config.utils_paths
const __DEV__ = config.globals.__DEV__
const __PROD__ = config.globals.__PROD__
const __TEST__ = config.globals.__TEST__

debug('Creating configuration.')
const webpackConfig = {
  name: 'client',
  target: 'web',
  devtool: "source-map",
  resolve: {
       modules: [paths.client(),"node_modules"],
    extensions: ['.js', '.jsx', '.json']
  },
  module: {}
}
// ------------------------------------
// Entry Points
// ------------------------------------
const APP_ENTRY = paths.client('index.js')

webpackConfig.entry = {
  app: __DEV__
    ? [APP_ENTRY].concat(`webpack-hot-middleware/client?path=${config.compiler_public_path}__webpack_hmr`)
    : [APP_ENTRY],
  vendor: config.compiler_vendors,
  // fetch:'whatwg-fetch',
}

// ------------------------------------
// Bundle Output
// ------------------------------------
webpackConfig.output = {
  filename: `[name].[${config.compiler_hash_type}].js`,
  path: paths.dist(),
  publicPath: config.compiler_public_path,
  chunkFilename: `[name].[${config.compiler_hash_type}].chunk.js`,
}

// ------------------------------------
// Plugins
// ------------------------------------
webpackConfig.plugins = [
  new webpack.DefinePlugin(config.globals),
  new webpack.ProvidePlugin({
      'fetch': 'imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch'
  }),
  new HtmlWebpackPlugin({
    template: paths.client('index.html'),
    hash: false,
    favicon: paths.client('static/favicon.png'),
    filename: 'index.html',
    inject: 'body',
    minify: {
      collapseWhitespace: true
    }
  })
]

if (__DEV__) {
  debug('Enable plugins for live development (HMR, NoErrors).')
  webpackConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )
} else if (__PROD__) {
  debug('Enable plugins for production (OccurenceOrder, Dedupe & UglifyJS).')
  webpackConfig.plugins.push(
    new webpack.LoaderOptionsPlugin({
              minimize: true,
              debug: false,
        }),
    new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        // 删除所有的注释
        comments: false,
      compress: {
        unused: true,
        dead_code: true,
        warnings: true
      }
    })
  )
}

// Don't split bundles during testing, since we only want import one bundle
if (!__TEST__) {
  webpackConfig.plugins.push(
    new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
        filename: 'vendor-[hash].min.js',
    })
  )
}

// ------------------------------------
// Loaders
// ------------------------------------
// JavaScript / JSON
webpackConfig.module.rules = [{
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  loader: 'babel-loader',
  options:{
    cacheDirectory : true,
    plugins        : [
    "react-hot-loader/babel",
    "transform-class-properties",
    "transform-runtime",
    "async-to-promises",
    // "transform-flow-strip-types"
],
    presets        : ['es2015', 'react', 'stage-0']
},
}, {
  test: /\.json$/,
  loader: 'json-loader'
}]

// ------------------------------------
// Style Loaders
// ------------------------------------
// We use cssnano with the postcss loader, so we tell
// css-loader not to duplicate minimization.
const BASE_CSS_LOADER = 'css?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]?sourceMap&-minimize'

webpackConfig.module.rules.push({
  test: /\.css$/,
  exclude: [/node_modules/,/styles/],
  use: [
       "style-loader",
       {
        loader: 'css-loader',
        options: {
          modules: true,
          importLoaders:1,
          localIdentName:'[name]__[local]___[hash:base64:5]',
          sourceMap:true
        }
      },
     ]
})

var autoprefixer = require('autoprefixer');
webpackConfig.module.rules.push({
  test: /\.css$/,
  include:[/node_modules/,/styles/],
  use: [
       "style-loader",
      "css-loader",
      {
          loader: 'postcss-loader',
              options: {
                plugins: function () {
                  return [
                    require('postcss-flexibility'),
                    autoprefixer({
                      browsers: [
                        'ie >= 9',
                        'ie_mob >= 10',
                        'ff >= 30',
                        'chrome >= 34',
                        'safari >= 7',
                        'opera >= 23',
                        'ios >= 7',
                        'android >= 4.4',
                        'bb >= 10'
                      ]
                    }),
                  ];
                }
            }
      },
     ]

})


// File loaders
/* eslint-disable */
webpackConfig.module.rules.push(
    {
        test:/\.(png|jpg)$/,
        use: { loader: 'url-loader' },
    },
    {
        test:/\.svg(\?.*)?$/,
        use: { loader: 'url-loader', options: { limit: 8192 } },
    },
    {
        test:/\.woff(\?.*)?$/,
        use: {
            loader: 'url-loader',
            options: {
             prefix: 'fonts/&name=[path][name].[ext]',
             limit:10000,
             mimetype:'application/font-woff'
            }
        },
    },
    {
        test:/\.woff2(\?.*)?$/,
        use: {
            loader: 'url-loader',
            options: {
             prefix: 'fonts/&name=[path][name].[ext]',
             limit:10000,
             mimetype:'application/font-woff2'
            }
        },
    },
    {
        test:/\.otf(\?.*)?$/,
        use: {
            loader: 'file',
            options: {
             prefix: 'fonts/&name=[path][name].[ext]',
             limit:10000,
             mimetype:'mimetype=font/opentype'
            }
        },
    },
    {
        test:/\.ttf(\?.*)?$/,
        use: {
            loader: 'file-loader',
            options: {
             prefix: 'fonts/&name=[path][name].[ext]',
             limit:10000,
             mimetype:'application/octet-stream'
            }
        },
    },
    {
        test:/\.eot(\?.*)?$/,
        use: {
            loader: 'file-loader',
            options: {
             prefix: 'fonts/&name=[path][name].[ext]',
            }
        },
    }
)
/* eslint-enable */

// ------------------------------------
// Finalize Configuration
// ------------------------------------
// when we don't know the public path (we know it only when HMR is enabled [in development]) we
// need to use the extractTextPlugin to fix this issue:
// http://stackoverflow.com/questions/34133808/webpack-ots-parsing-error-loading-fonts/34133809#34133809
// if (!__DEV__) {
//   // debug('Apply ExtractTextPlugin to CSS loaders.')
//   // webpackConfig.module.rules.filter((loader) =>
//   //   loader.loaders && loader.loaders.find((name) => /css/.test(name.split('?')[0]))
//   // ).forEach((loader) => {
//   //   const first = loader.loaders[0]
//   //   const rest = loader.loaders.slice(1)
//   //   loader.loader = ExtractTextPlugin.extract(first, rest.join('!'))
//   //   delete loader.loaders
//   // })
//
//   webpackConfig.plugins.push(
//     new ExtractTextPlugin('[name].[contenthash].css', {
//       allChunks: true
//     })
//   )
// }

module.exports = webpackConfig
