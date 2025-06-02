import js from "@eslint/js";
import emberPlugin from "eslint-plugin-ember";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import qunitPlugin from "eslint-plugin-qunit";
import nodePlugin from "eslint-plugin-n";
import babelParser from "@babel/eslint-parser";
import emberEslintParser from "ember-eslint-parser";
import globals from "globals";

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      // unconventional js
      "blueprints/*/files/**",
      // compiled output
      "declarations/**",
      "dist/**",
      // misc
      "coverage/**",
      // ember-try
      ".node_modules.ember-try/**",
      // node_modules
      "node_modules/**",
    ],
  },

  // Default configuration for all JavaScript files
  {
    files: ["**/*.js", "**/*.mjs"],
    plugins: {
      ember: emberPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: babelParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [
            [
              "@babel/plugin-proposal-decorators",
              { decoratorsBeforeExport: true },
            ],
          ],
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...emberPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
    },
  },

  // Node.js files
  {
    files: [
      ".eslintrc.js",
      ".prettierrc.js",
      ".stylelintrc.js",
      ".template-lintrc.js",
      "ember-cli-build.js",
      "testem.js",
      "blueprints/*/index.js",
      "config/**/*.js",
      "lib/*/index.js",
      "server/**/*.js",
      "eslint.config.js",
      "eslint.config.mjs",
    ],
    plugins: {
      n: nodePlugin,
    },
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...nodePlugin.configs.recommended.rules,
    },
  },

  // Test files
  {
    files: ["tests/**/*-test.{js,ts}"],
    plugins: {
      qunit: qunitPlugin,
    },
    rules: {
      ...qunitPlugin.configs.recommended.rules,
    },
  },

  // Node.js test files
  {
    files: ["tests/node/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        global: "readonly",
        process: "readonly",
      },
    },
  },

  // .gjs and .gts files
  {
    files: ["**/*.gjs", "**/*.gts"],
    plugins: {
      ember: emberPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: emberEslintParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [
            [
              "@babel/plugin-proposal-decorators",
              { decoratorsBeforeExport: true },
            ],
          ],
        },
      },
      globals: {
        ...globals.browser,
        console: "readonly",
      },
    },
    rules: {
      ...emberPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
    },
  },
];
