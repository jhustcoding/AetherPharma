module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable webpack cache to avoid permission issues
      webpackConfig.cache = false;
      
      // Use temp directory for any cache that can't be disabled
      if (webpackConfig.cache !== false) {
        webpackConfig.cache = {
          type: 'filesystem',
          cacheDirectory: '/tmp/webpack-cache-' + Date.now(),
        };
      }
      
      return webpackConfig;
    },
  },
  babel: {
    loaderOptions: {
      // Disable babel-loader cache
      cacheDirectory: false,
    },
  },
  eslint: {
    enable: false,
  },
};