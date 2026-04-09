const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    taskpane: path.resolve(__dirname, 'src/taskpane/index.tsx'),
    commands: path.resolve(__dirname, 'src/commands/commands.ts'),
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
    new HtmlWebpackPlugin({
      filename: 'commands.html',
      template: path.resolve(__dirname, 'src/commands/commands.html'),
      chunks: ['commands'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.xml', to: 'manifest.xml' },
        { from: 'assets', to: 'assets' },
      ],
    }),
  ],
  devServer: {
    port: 3000,
    server: 'https',
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
