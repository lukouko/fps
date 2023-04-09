module.exports = {
  presets: ['@babel/env'],
  env: {
    test: {
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-transform-runtime',
      ],
    },
  },
};
