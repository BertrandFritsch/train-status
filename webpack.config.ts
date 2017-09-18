import * as path from 'path';
import * as webpack from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';

const productionEnv = process.env.NODE_ENV === 'production';
const developmentEnv = !productionEnv;
const title = 'Train Status';
const publicPath = process.env.PUBLIC_PATH || '';

let config: webpack.Configuration = {};

config.entry = [];
config.plugins = [
  new HtmlWebpackPlugin({
    template: 'index.html',
    inject: 'body',
    filename: 'index.html',
    title
  })
];

if (developmentEnv) {
  const WebpackNotifierPlugin = require('webpack-notifier');

  // add development-specific properties
  config = {
    ...config,
    plugins: [
      ...config.plugins,
      new WebpackNotifierPlugin({ alwaysNotify: true, title }),

      // enable HMR globally
      new webpack.HotModuleReplacementPlugin(),

      // prints more readable module names in the browser console on HMR updates
      new webpack.NamedModulesPlugin()
    ],

    entry: [
      // activate HMR for React
      'react-hot-loader/patch'
    ],

    devServer: {
      hot: true
    },

    devtool: 'cheap-module-source-map'
  };
}

else {
  // add production-specific properties
  config = {
    ...config,
    devtool: 'cheap-source-map'
  };
}

// add common properties
config = {
  ...config,

  entry:
    Array.isArray(config.entry)
      ? [
        ...config.entry,
        './src/index.tsx'
      ]
      : './src/index.tsx',

  output: {
    path: path.join(__dirname, '/dist/'),
    filename: 'bundle-[hash].js',
    publicPath
  },

  resolve: {
    // resolvable extensions.
    extensions: [ '.ts', '.tsx', '.js' ]
  },

  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        loaders: [
          'react-hot-loader/webpack',
          'awesome-typescript-loader'
        ],
        exclude: /node-modules/
      },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
      },
      {
        /**
         * css-loader makes any urls within the project part of our dependency graph
         * and the style-loader puts a style tag for the CSS in our HTML.
         */
        test: /\.s?css$/,
        use: [ 'style-loader', 'css-loader', 'sass-loader' ]
      },
      {
        test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg|pdf)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              hash: 'sha512',
              digest: 'hex',
              publicPath: `${publicPath}/`,
              outputPath: 'assets/',
              name: '[name]-[hash].[ext]'
            }
          }
        ]
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  }

  // When importing a module whose path matches one of the following, just
  // assume a corresponding global variable exists and use that instead.
  // This is important because it allows us to avoid bundling all of our
  // dependencies, which allows browsers to cache those libraries between builds.
  // To use it, add script includes into index.html
  // externals: {
  //   React: 'React',
  //   ReactDOM: 'ReactDOM'
  // },
};

export default config;
