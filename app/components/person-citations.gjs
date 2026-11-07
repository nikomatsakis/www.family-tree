import Component from '@glimmer/component';
import { citationLink, SOURCE_ICON_PATHS } from '../utils/citations';

export default class PersonCitations extends Component {
  iconPaths = SOURCE_ICON_PATHS;

  get links() {
    return (this.args.person?.citations || []).map((citation) => ({
      href: citationLink(citation, this.args.person.name),
      label: `Read original source, page ${citation.page}, for ${this.args.person.name} (opens in a new tab)`,
    }));
  }

  <template>
    {{#each this.links as |citation|}}
      <a
        class='person-citation'
        href={{citation.href}}
        target='_blank'
        rel='noopener noreferrer'
        title={{citation.label}}
        aria-label={{citation.label}}
      >
        <svg
          class='source-icon'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          aria-hidden='true'
        >
          {{#each this.iconPaths as |pathData|}}
            <path d={{pathData}} />
          {{/each}}
        </svg>
      </a>
    {{/each}}
  </template>
}
