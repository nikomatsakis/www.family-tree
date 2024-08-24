import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'family-tree/config/environment';
import { setBuildURLConfig } from '@ember-data/request-utils';

setBuildURLConfig({
  namespace: 'api/v1',
});

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);
