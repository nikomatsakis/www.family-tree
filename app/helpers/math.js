import { helper } from '@ember/component/helper';

export function mult([a, b]) {
  return a * b;
}

export default helper(mult);
