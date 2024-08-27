import Component from '@glimmer/component';
import { service } from '@ember/service';
import PersonLink from './person-link';
import PersonOutlineChildren from './person-outline-children';
import { cached } from '@glimmer/tracking';

export default class PersonOutlineComponent extends Component {
  @service genea;

  <template>
    {{#let
      (component
        PersonLink pagePerson=@pagePerson referencePerson=@referencePerson
      )
      as |Link|
    }}
      {{#if this.partnerships.isPresent}}
        {{#let
          (component
            PersonOutlineChildren
            pagePerson=@pagePerson
            referencePerson=@referencePerson
            includeSet=@includeSet
          )
          as |Children|
        }}
          {{#let this.partnerships.first as |partnership|}}
            <li>
              <Link @person={{@person}} />
              {{#if partnership.partner}}
                +
                <Link @person={{partnership.partner}} />
              {{/if}}

              <Children @partnership={{partnership}} />
            </li>
          {{/let}}

          {{#each this.partnerships.next as |partnership|}}
            <li>
              ...
              {{#if partnership.partner}}
                +
                <Link @person={{partnership.partner}} />
              {{/if}}

              <Children @partnership={{partnership}} />
            </li>
          {{/each}}
        {{/let}}
      {{else}}

        <li>
          <Link @person={{@person}} />
        </li>
      {{/if}}
    {{/let}}
  </template>

  @cached
  get partnerships() {
    return new Partnerships(this.args.person, this.args.includeSet);
  }
}

class Partnerships {
  #list;

  constructor(person, includeSet) {
    let parentIn = person.parentIn;

    if (includeSet) {
      parentIn = parentIn.filter((p) => p.parentSet.isSubsetOf(includeSet));
    }

    this.#list = parentIn.map((partnership) => ({
      partner: partnership.partnerTo(person),
      children: partnership.children,
    }));
  }

  get isPresent() {
    return this.#list.length > 0;
  }

  get first() {
    return this.#list[0];
  }

  get next() {
    return this.#list.slice(1);
  }
}
