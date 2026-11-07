import Component from '@glimmer/component';

export default class PersonDates extends Component {
  <template>
    {{#if @person.lifeDates.length}}
      <span class='person-dates' aria-label='Life dates'>
        {{#each @person.lifeDates as |date|}}
          <span
            class='life-date-badge life-date-{{date.kind}}'
            title={{if date.yearRedacted 'Birth year withheld for the last 75 years' date.label}}
          >{{date.label}}</span>
        {{/each}}
      </span>
    {{/if}}
  </template>
}
