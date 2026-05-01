const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

function getHttpsServerOptions() {
  try {
    const { getHttpsServerOptions } = require('office-addin-dev-certs');
    return getHttpsServerOptions();
  } catch {
    // Fallback: webpack will generate a self-signed certificate
    return 'https';
  }
}

module.exports = (env) => {
  const httpsOptions = getHttpsServerOptions();
  
  return {
    entry: {
      taskpane: path.resolve(__dirname, 'src/taskpane/index.tsx'),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webpack.json',
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    output: {
      clean: true,
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'taskpane.html',
        template: path.resolve(__dirname, 'src/taskpane/taskpane.html'),
        chunks: ['taskpane'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'excel-navbar-plugin.xml', to: 'excel-navbar-plugin.xml' },
          { from: 'assets', to: 'assets' },
          { from: 'shortcuts.json', to: 'shortcuts.json' },
          { from: 'src/landing/index.html', to: 'index.html' },
          { from: 'src/landing/styles.css', to: 'styles.css' },
          { from: 'src/landing/main.js', to: 'main.js' },
        ],
      }),
      env?.analyze
        ? new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
          })
        : null,
    ].filter(Boolean),
    devServer: {
      port: 3000,
      server: httpsOptions,
      hot: false,
      liveReload: false,
      client: {
        overlay: false,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
};
