import { load } from 'ember-async-data';
import Component from '@ember/component';

export default class extends Component {
  // This code intentionally uses a classic component
  // because glimmer components don't support positional
  // params. The `<template>` syntax works fine in classic
  // components, so it's not a big deal.
  static positionalParams = ['promise'];

  <template>
    {{#let (load @promise) as |result|}}
      {{#if result.isResolved}}
        {{#each result.value as |item|}}
          {{yield item}}
        {{/each}}
      {{/if}}
    {{/let}}
  </template>
}
