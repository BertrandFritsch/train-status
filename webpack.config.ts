import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import * as webpack from 'webpack';
import * as WebpackNotifierPlugin from 'webpack-notifier';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import * as ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const productionEnv = process.env.NODE_ENV === 'production';
const developmentEnv = !productionEnv;
const title = 'Train Status';
const publicPath = process.env.PUBLIC_PATH || '/';
const useCssSourceMap = false; // not yet ready to avoid the "Flash of Unstyled Content" effect

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
  // add development-specific properties
  config = {
    ...config,
    plugins: [
      ...config.plugins,
      new WebpackNotifierPlugin({ alwaysNotify: true, title }),

      // enable HMR globally
      new webpack.HotModuleReplacementPlugin(),

      // prints more readable module names in the browser console on HMR updates
      new webpack.NamedModulesPlugin(),

      new ForkTsCheckerWebpackPlugin(
        {
          tslint: false,
          watch: [ './src' ]
        }
      )
    ],

    devServer: {
      hot: true,
      historyApiFallback: {
        rewrites: [
          { from: '/favicon.ico', to: './nginx/assets/favicon.ico' },
          {
            from: '/assets/.+$',
            to: (context: { parsedUrl: { pathname: string } }) => `./nginx${ context.parsedUrl.pathname }`
          }
        ]
      }
    },

    devtool: 'cheap-module-eval-source-map'
  };
}
else {
  // add production-specific properties
  config = {
    ...config,
    plugins: [
      ...config.plugins,
      new ExtractTextPlugin({
        filename: 'bundle-[hash].css'
      })
    ]
  };
}

const cssLoaders = [
  {
    loader: 'css-loader',
    options: {
      importLoaders: 2,
      sourceMap: useCssSourceMap
    }
  },
  {
    loader: 'postcss-loader',
    options: {
      plugins: () => [
        require('autoprefixer')({ browsers: [ 'last 1 version', 'ie >= 11' ] })
      ],
      sourceMap: useCssSourceMap
    }
  },
  {
    loader: 'sass-loader',
    options: {
      sourceMap: useCssSourceMap
    }
  }
];

// add common properties
config = {
  ...config,

  entry: './src/index.tsx',

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
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              plugins: [ 'react-hot-loader/babel' ]
            }
          },
          {
            loader: 'ts-loader',
            options: {
              // disable type checker - we will use it in fork plugin
              transpileOnly: true
            }
          }
        ],
        exclude: /node-modules/
      },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: 'pre',
        test: /\.js$/,
        use: 'source-map-loader',
        exclude: [ /node_modules/, /dist/, /__test__/ ]
      },
      {
        test: /\.s?css$/,
        use: developmentEnv
          ? [
            'style-loader',
            ...cssLoaders
          ]
          : ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: cssLoaders
          })
      },
      {
        test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg|pdf)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              hash: 'sha512',
              digest: 'hex',
              publicPath: path.join(publicPath, 'assets/'),
              outputPath: 'assets/',
              name: '[name]-[hash].[ext]'
            }
          }
        ]
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
