import Component from '@glimmer/component';
import PersonLink from './person-link';
import PersonOutline from './person-outline';

export default class PersonOutlineChildrenComponent extends Component {
  <template>
    {{#if @partnership.children}}
      <ul>
        {{#each @partnership.children as |child|}}
          {{#if (isIncluded @includeSet child)}}
            <PersonOutline
              @person={{child}}
              @pagePerson={{@pagePerson}}
              @referencePerson={{@referencePerson}}
              @includeSet={{@includeSet}}
            />
          {{else}}
            <li>
              <PersonLink
                @person={{child}}
                @pagePerson={{@pagePerson}}
                @referencePerson={{@referencePerson}}
                @includeSet={{@includeSet}}
              />
              ...
            </li>
          {{/if}}
        {{/each}}
      </ul>
    {{/if}}
  </template>
}

function isIncluded(includeSet, child) {
  if (includeSet) {
    console.log('isIncluded', includeSet, child);
    return includeSet.has(child);
  } else return true;
}
