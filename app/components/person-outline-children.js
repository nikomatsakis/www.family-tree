import Component from '@glimmer/component';

export default class PersonOutlineChildrenComponent extends Component {
    isIncluded(includeSet, child) {
        if (includeSet) {
            console.log("isIncluded", includeSet, child);
            return includeSet.has(child);
        } else
            return true;
    }
}
