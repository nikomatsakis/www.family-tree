import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ReferencePersonService extends Service {
    @tracked current = null;
}
