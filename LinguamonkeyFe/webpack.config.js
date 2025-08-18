const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'firebase': path.resolve(__dirname, 'web-mocks/firebase-shim.js'),
    'three': path.resolve(__dirname, 'web-mocks/three-shim.js'),
  };

  return config;
};
