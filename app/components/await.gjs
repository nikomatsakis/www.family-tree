import { load } from 'ember-async-data';

<template>
  {{#let (load @promise) as |result|}}
    {{#if result.isResolved}}
      {{yield result.value}}
    {{/if}}
  {{/let}}
</template>
