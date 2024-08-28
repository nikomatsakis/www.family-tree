import { LinkTo } from '@ember/routing';
import { hash } from '@ember/helper';

<template>
  <LinkTo @route='person' @query={{hash referencePersonId=@person.id}}>
    (make
    {{@person.name}}
    the reference person)
  </LinkTo>
</template>
