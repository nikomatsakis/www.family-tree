import Service from '@ember/service';

export default class GeneaService extends Service {
    _roots = null;
    _people = {};
    _partnerships = {};

    isPopulated() {
        return this._roots !== null;
    }

    async populate() {
        if (this._roots === null) {
            let rootsFetch = await fetch('/api/v1/roots.json');
            let { data, included } = await rootsFetch.json();

            this._roots = new Roots(this, data.attributes, data.relationships);
            for (let object of included) {
                switch (object.type) {
                    case "person":
                        this._people[object.id] = new Person(this, object.id, object.attributes, object.relationships);
                        break;

                    case "partnership":
                        this._partnerships[object.id] = new Partnership(this, object.id, object.attributes, object.relationships);
                        break;

                    default:
                        throw new Error(`unexpected type of object ${object.type}`);
                }
            }
        }
    }

    _getPerson(id) {
        const p = this._people[id];
        if (p === undefined) {
            throw new Error(`no person defined with id ${id}`);
        }
        return p;
    }

    _person(r) {
        if (r === null) {
            return null;
        }
        if (r.type !== "person") {
            throw new Error(`unexpected reference to have type "person": ${JSON.stringify(r)} `);
        }
        return this._getPerson(r.id);
    }

    _partnership(r) {
        if (r === null) {
            return null;
        }
        if (r.type !== "partnership") {
            throw new Error(`unexpected reference to have type "partnership": ${JSON.stringify(r)} `);
        }
        return this._partnerships[r.id];
    }

    roots() {
        if (!this.isPopulated()) {
            throw new Error("genea not populated");
        }
        return this._roots;
    }

    person(id) {
        if (!this.isPopulated()) {
            throw new Error("genea not populated");
        }
        return this._getPerson(id);
    }
}

export class Roots {
    #genea;
    #attributes;
    #relationships;

    constructor(genea, attributes, relationships) {
        this.#genea = genea;
        this.#attributes = attributes;
        this.#relationships = relationships;
    }

    get maintainerLink() {
        return this.#attributes.maintainerLink;
    }

    get rootPeople() {
        return this.#relationships.rootPeople.data.map(r => this.#genea._person(r))
    }
}


export class Person {
    constructor(genea, id, attributes, relationships) {
        this._genea = genea;
        this.id = id;
        this._attributes = attributes;
        this._relationships = relationships;
    }

    get name() {
        return this._attributes.name;
    }

    get comments() {
        return this._attributes.comments;
    }

    get gender() {
        return this._attributes.gender;
    }

    get isSpouse() {
        return this._attributes.isSpouse;
    }

    /// Spouses or other partners
    get partners() {
        return this.parentIn.flatMap(partnership => partnership.partnersTo(this));
    }

    /// Spouses or other partners
    get parents() {
        return (this.childIn ? this.childIn.parents : []);
    }

    /// Relationship in which this person is a child, or null.
    get childIn() {
        return this._genea._partnership(this._relationships.childIn.data);
    }

    /// Array of relationships in which this person is a parent (or partner).
    get parentIn() {
        return this._relationships.parentIn.data.map(r => this._genea._partnership(r));
    }

    childInArray() {
        return (this.childIn ? [this.childIn] : []);
    }

    /// Returns a list of the closest ancestors between `this` and `person`.
    commonAncestralPartnershipsWith(person) {
        let myAncestors = this.ancestralPartnerships();

        let queue = person.childInArray();
        let visited = new Set(queue);
        let result = [];

        // Walk the ancestors of `person` in breadth-first
        // order, looking for those that appear in `
        while (queue.length) {
            let partnership = queue.shift();

            if (myAncestors.has(partnership)) {
                result.push(partnership);
                continue;
            }

            if (partnership.parentSet.has(this)) {
                result.push(partnership);
                continue;
            }

            for (let parentPartnership of partnership.parents.flatMap(p => p.childInArray())) {
                if (!visited.has(parentPartnership)) {
                    visited.add(parentPartnership);
                    queue.push(parentPartnership);
                }
            }
        }

        for (let ancestor of myAncestors) {
            if (ancestor.parentSet.has(person)) {
                result.push(ancestor);
            }
        }

        return result;
    }

    /// Returns a set of all partnerships involving this person or an ancestor of this person.
    ancestralPartnerships() {
        let stack = this.childInArray();
        let visited = new Set(stack);

        while (stack.length) {
            let partnership = stack.pop();
            for (let parentPartnership of partnership.parents.flatMap(p => p.childInArray())) {
                if (!visited.has(parentPartnership)) {
                    visited.add(parentPartnership);
                    stack.push(parentPartnership);
                }
            }
        }

        return visited;
    }

    /// Return a set of all ancestors
    allAncestors() {
        return new Set(Array.from(this.ancestralPartnerships()).flatMap(p => p.parents));
    }

    generationsFromAncestralPartnership(ancestralPartnership) {
        if (ancestralPartnership.parentSet.has(this))
            return 0;

        if (this.childIn === ancestralPartnership)
            return 1;

        if (!this.childIn)
            return Infinity;

        let parentGens = this.parents.map(p => p.generationsFromAncestralPartnership(ancestralPartnership));
        return Math.min(...parentGens) + 1;
    }
}

export class Partnership {
    constructor(genea, id, attributes, relationships) {
        this._genea = genea;
        this.id = id;
        this._attributes = attributes;
        this._relationships = relationships;
    }

    get children() {
        return this._relationships.children.data.map(r => this._genea._person(r));
    }

    get parents() {
        return this._relationships.parents.data.map(r => this._genea._person(r));
    }

    get parentSet() {
        return new Set(this.parents);
    }

    get firstParent() {
        return this.parents[0];
    }

    get nextParents() {
        return this.parents.slice(1);
    }

    get parentNames() {
        return this.parents.map(p => p.name).join(" + ");
    }

    partnerTo(person) {
        return this.parents.find(p => p.id !== person.id);
    }

    partnersTo(person) {
        return this.parents.filter(p => p.id !== person.id);
    }
}

/// Returns a relationship $R such that $FROM is $TO's $R.
///
/// e.g. Spock is Leto's uncle.
///
/// Sarin is Spock's father.
///
/// Spock is Sarin's son.
export function relationshipName(
    fromPerson,
    toPerson,
    commonAncestralPartnership,
) {
    let fromGenerations = fromPerson.generationsFromAncestralPartnership(commonAncestralPartnership);
    let toGenerations = toPerson.generationsFromAncestralPartnership(commonAncestralPartnership);

    if (fromGenerations == 0) {
        return lineageModifiers(toGenerations, parentName(fromPerson));
    }

    if (toGenerations == 0) {
        return lineageModifiers(fromGenerations, childName(fromPerson));
    }

    if (fromGenerations == toGenerations) {
        if (fromGenerations == 1) {
            return siblingName(fromPerson);
        } else {
            return `${ordinal(fromGenerations - 1)} cousin`;
        }
    }

    if (fromGenerations == 1) {
        return lineageModifiers(toGenerations - 1, piblingName(fromPerson));
    }

    if (toGenerations == 1) {
        return lineageModifiers(fromGenerations - 1, niblingName(toPerson));
    }
    
    let minGeneration = Math.min(fromGenerations, toGenerations);
    let maxGeneration = Math.max(fromGenerations, toGenerations);
    let removed = maxGeneration - minGeneration;
    return `${ordinal(minGeneration)} cousin ${times(removed)} removed`;
}

function lineageModifiers(generations, relationship) {
    console.log("lineageModifiers", generations, relationship);
    switch (generations) {
        case 0:
            return "self";
        
        case 1:
            return relationship;

        default:
            let greats = "great ".repeat(generations - 2);
            return `${greats}grand${relationship}`;
    }
}

function parentName(person) {
    switch (person.gender) {
        case "male":
            return "father";
        case "female":
            return "mother";
        default:
            return "parent";
    }
}

function childName(person) {
    switch (person.gender) {
        case "male":
            return "son";
        case "female":
            return "daughter";
        default:
            return "child";
    }
}

function piblingName(person) {
    switch (person.gender) {
        case "male":
            return "uncle";
        case "female":
            return "aunt";
        default:
            return "pibling";
    }
}

function niblingName(person) {
    console.log("nibling", person, "has gender", person.gender);
    switch (person.gender) {
        case "male":
            return "nephew";
        case "female":
            return "niece";
        default:
            return "nibling";
    }
}

function siblingName(person) {
    switch (person.gender) {
        case "male":
            return "brother";
        case "female":
            return "sister";
        default:
            return "sibling";
    }
}

function ordinal(n) {
    switch (n) {
        case 1: return "first";
        case 2: return "second";
        case 3: return "third";
        default:
            switch (n % 10) {
                case 0: return `${n}th`;
                case 1: return `${n}st`;
                case 2: return `${n}nd`;
                case 3: return `${n}rd`;
                case 4: return `${n}th`;
                case 5: return `${n}th`;
                case 6: return `${n}th`;
                case 7: return `${n}th`;
                case 8: return `${n}th`;
                case 9: return `${n}th`;
            }
    }
}

function times(n) {
    switch (n) {
        case 1: return "once";
        case 2: return "twice";
        default: return `${n} times`;
    }
}