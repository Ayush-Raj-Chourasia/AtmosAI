const path = require('path');

module.exports = function (options) {
  const existingExternals = Array.isArray(options.externals)
    ? options.externals
    : options.externals
      ? [options.externals]
      : [];

  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@disaster-app/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    module: {
      ...options.module,
      rules: [
        ...(options.module?.rules || []),
        {
          test: /\.md$/,
          type: 'asset/source',
        },
      ],
    },
    externals: [
      ...existingExternals,
      {
        '@ffprobe-installer/ffprobe': 'commonjs @ffprobe-installer/ffprobe',
      },
    ],
  };
};
