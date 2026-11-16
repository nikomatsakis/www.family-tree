'use strict';

module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-prettier/recommended'],
  rules: {
    // 💡: app.css groups rules by component, so a base selector often follows a more
    // specific one from another component. Reordering to satisfy this rule could change
    // which styles win, so it is turned off rather than "fixed".
    'no-descending-specificity': null,
  },
};
