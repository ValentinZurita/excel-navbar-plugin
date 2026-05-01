const path = require('path');
const fs = require('fs');
const os = require('os');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

function getHttpsServerOptions() {
  const certsDir = path.join(os.homedir(), '.office-addin-dev-certs');
  try {
    return {
      type: 'https',
      options: {
        key: fs.readFileSync(path.join(certsDir, 'localhost.key')),
        cert: fs.readFileSync(path.join(certsDir, 'localhost.crt')),
        ca: fs.readFileSync(path.join(certsDir, 'ca.crt')),
      },
    };
  } catch {
    // Fallback: webpack will generate a self-signed certificate
    return { type: 'https' };
  }
}

module.exports = (env) => {
  const serverOptions = getHttpsServerOptions();

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
      server: serverOptions,
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
