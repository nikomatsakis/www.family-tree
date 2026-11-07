'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { Webpack } = require('@embroider/webpack');

module.exports = function (defaults) {
  // Bundle the PDF renderer locally; citation documents never go to a third party.
  const fs = require('fs');
  fs.mkdirSync('public/pdfjs', { recursive: true });
  for (const file of ['pdf.mjs', 'pdf.worker.mjs']) {
    fs.copyFileSync(
      require.resolve(`pdfjs-dist/build/${file}`),
      `public/pdfjs/${file}`,
    );
  }

  fs.copyFileSync(
    require.resolve('pdfjs-dist/web/pdf_viewer.css'),
    'public/pdfjs/pdf_viewer.css',
  );

  const app = new EmberApp(defaults, {
    // Add options here
  });

  return require('@embroider/compat').compatBuild(app, Webpack, {
    staticAddonTestSupportTrees: true,
    staticAddonTrees: true,
    staticHelpers: true,
    staticModifiers: true,
    staticComponents: true,
    staticEmberSource: true,
    // splitAtRoutes: ['route.name'], // can also be a RegExp
    // packagerOptions: {
    //    webpackConfig: { }
    // }
  });
};
