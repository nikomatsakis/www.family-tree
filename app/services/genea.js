import Service from '@ember/service';

export default class GeneaService extends Service {
    #roots = null;
    #people = {};
    #partnerships = {};

    isPopulated() {
        return this.#roots !== null;
    }

    async populate() {
        if (this.#roots === null) {
            let rootsFetch = await fetch('/api/v1/roots.json');
            let { data, included } = await rootsFetch.json();

            this.#roots = new Roots(this, data.attributes, data.relationships);
            for (let object of included) {
                switch (object.type) {
                    case "person":
                        this.#people[object.id] = new Person(this, object.id, object.attributes, object.relationships);
                        break;

                    case "partnership":
                        this.#partnerships[object.id] = new Partnership(this, object.id, object.attributes, object.relationships);
                        break;

                    default:
                        throw new Error(`unexpected type of object ${object.type}`);
                }
            }
        }
    }

    populatedPersonById(id) {
        const p = this.#people[id];
        if (p === undefined) {
            throw new Error(`no person defined with id ${id}`);
        }
        return p;
    }

    populatedPersonFromRelationship(r) {
        if (r === null) {
            return null;
        }
        if (r.type !== "person") {
            throw new Error(`unexpected reference to have type "person": ${JSON.stringify(r)} `);
        }
        return this.populatedPersonById(r.id);
    }

    _partnership(r) {
        if (r === null) {
            return null;
        }
        if (r.type !== "partnership") {
            throw new Error(`unexpected reference to have type "partnership": ${JSON.stringify(r)} `);
        }
        return this.#partnerships[r.id];
    }

    roots() {
        if (!this.isPopulated()) {
            throw new Error("genea not populated");
        }
        return this.#roots;
    }

    person(id) {
        if (!this.isPopulated()) {
            throw new Error("genea not populated");
        }
        return this.populatedPersonById(id);
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
        return this.#relationships.rootPeople.data.map(r => this.#genea.populatedPersonFromRelationship(r))
    }
}


export class Person {
    #genea;
    #attributes;
    #relationships;

    constructor(genea, id, attributes, relationships) {
        this.#genea = genea;
        this.id = id;
        this.#attributes = attributes;
        this.#relationships = relationships;
    }

    get name() {
        return this.#attributes.name;
    }

    get firstName() {
        return this.name.split(" ")[0];
    }

    get comments() {
        return this.#attributes.comments;
    }

    get gender() {
        return this.#attributes.gender;
    }

    get isSpouse() {
        return this.#attributes.isSpouse;
    }

    /// Spouses or other partners
    get partners() {
        return this.parentIn.flatMap(partnership => partnership.partnersTo(this));
    }

    /// Spouses or other partners
    get parents() {
        return (this.childIn ? this.childIn.parents : []);
    }

    allAncestors() {
        return new Traversal(this).visitInLaws().visitStep().allPeople();
    }

    parentPartnerships(inlaws) {
        let result = this.partnerships(true, false);

        if (inlaws) {
            return result.concat(this.partners.flatMap(p => p.parentPartnerships(false)));
        }

        return result;
    }

    /// Relationship in which this person is a child, or null.
    get childIn() {
        return this.#genea._partnership(this.#relationships.childIn.data);
    }

    /// Array of relationships in which this person is a parent (or partner).
    get parentIn() {
        return this.#relationships.parentIn.data.map(r => this.#genea._partnership(r));
    }

    /// Array of partnerships in which `this` participates.
    partnerships(includeChildIn, includePartners) {
        let result = [];

        if (includeChildIn && this.childIn)
            result.push(this.childIn);

        if (includePartners)
            result = result.concat(this.parentIn);

        return result;
    }

    /// Returns a list of the closest ancestors between `this` and `person`.
    commonAncestralPartnershipsWith(person) {
        // Get the set of all my ancestors (including inlaws).
        let myAncestors = new Traversal(this).visitInLaws().visitStep().allPeople();
        let result = new Traversal(person).visitInLaws().visitStep().partnershipsUntil(myAncestors);
        return result;
    }

    generationsFromAncestralPartnership(ancestralPartnership) {
        return new Traversal(this).visitInLaws().visitStep().generationsUntil(ancestralPartnership);
    }
}

export class Partnership {
    #genea;
    #attributes;
    #relationships;

    constructor(genea, id, attributes, relationships) {
        this.#genea = genea;
        this.id = id;
        this.#attributes = attributes;
        this.#relationships = relationships;
    }

    get children() {
        return this.#relationships.children.data.map(r => this.#genea.populatedPersonFromRelationship(r));
    }

    get parents() {
        return this.#relationships.parents.data.map(r => this.#genea.populatedPersonFromRelationship(r));
    }

    get parentSet() {
        return new Set(this.parents);
    }

    get parentAndStepParentSet() {
        return new Set(this.parents.concat(this.parents.flatMap(p => p.partners)));
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

class Traversal {
    #startPeople;
    #includeStep = false;

    constructor(person) {
        this.#startPeople = [person];
    }

    /// Called during initialization to indicate that this traversal should also visit in-laws and step relations.
    /// Returns `this` for use in chaining.
    visitInLaws() {
        let startPerson = this.#startPeople[0];
        this.#startPeople = this.#startPeople.concat(startPerson.partners);
        return this;
    }

    visitStep() {
        this.#includeStep = true;
        return this;
    }

    /// Returns a list of the closest ancestral partnerships that contain a member of `peopleSet`.
    partnershipsUntil(peopleSet) {
        let {reached} = this.#walk(peopleSet);
        return reached;
    }

    /// Returns a list of the closest ancestral partnerships that contain a member of `peopleSet`.
    generationsUntil(partnership) {
        if (this.#startPeople.some(p => partnership.parentAndStepParentSet.has(p)))
            return 0;

        let {generation} = this.#walk(new Set(), partnership);
        if (!generation) {
            console.log("failed to find generation count", this.#startPeople, partnership);
            throw new Error(`failed to find generation count`);
        }

        return generation;
    }

    /// Returns a set of all reachable partnerships.
    allPartnerships() {
        let {visited} = this.#walk(new Set());
        return visited;
    }

    /// Returns a set containing the start people + their ancestors.
    allPeople() {
        let set = new Set([...this.allPartnerships()].flatMap(p => p.parents));
        for (let person of this.#startPeople)
            set.add(person);
        return set;
    }

    #walk(peopleSet, targetPartnership) {
        let reached = [];
        let queue = this.#startPeople.flatMap(p => p.partnerships(true, false)).map(p => [p, 1]);
        let visited = new Set(queue);
        while (queue.length !== 0) {
            // we walk in breadth-first search order so that, if we are in `findSomeoneIn`,
            // we stop at closer relations.
            let [partnership, generation] = queue.shift();

            console.log(partnership, generation, targetPartnership);

            if (partnership.parents.some(p => peopleSet.has(p))) {
                reached.push(partnership);
                continue;
            }

            if (partnership === targetPartnership)
                return {generation};

            let parentPartnerships = partnership.parents.flatMap(p => p.partnerships(true, this.#includeStep));
            for (let parentPartnership of parentPartnerships) {
                if (!visited.has(parentPartnership)) {
                    visited.add(parentPartnership);
                    queue.push([parentPartnership, generation + 1]);
                }
            }
        }

        return {reached, visited};
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
        switch (toGenerations) {
            case 0: return "self";
            case 1: return parentName(fromPerson);
            default:
                return `${lineageModifiers(toGenerations, parentName(fromPerson))} ${onWhoseSide(toPerson, commonAncestralPartnership)}`;
        }
    }

    if (toGenerations == 0) {
        return lineageModifiers(fromGenerations, childName(fromPerson));
    }

    if (fromGenerations == toGenerations) {
        if (fromGenerations == 1) {
            return siblingName(fromPerson);
        } else {
            return `${ordinal(fromGenerations - 1)} cousin ${onWhoseSide(fromPerson, commonAncestralPartnership)}`;
        }
    }

    if (fromGenerations == 1) {
        return `${piblingModifiers(toGenerations - 1, piblingName(fromPerson))} ${onWhoseSide(toPerson, commonAncestralPartnership)}`;
    }

    if (toGenerations == 1) {
        return `${lineageModifiers(fromGenerations - 1, niblingName(toPerson))} ${onWhoseSide(toPerson, commonAncestralPartnership)}`;
    }
    
    let minGeneration = Math.min(fromGenerations, toGenerations);
    let maxGeneration = Math.max(fromGenerations, toGenerations);
    let removed = maxGeneration - minGeneration;
    return `${ordinal(minGeneration)} cousin ${times(removed)} removed ${onWhoseSide(fromPerson, commonAncestralPartnership)}`;
}

function onWhoseSide(
    fromPerson,
    commonAncestralPartnership
) {
    return characterizeParent(fromPerson, fromSide(fromPerson, commonAncestralPartnership));
}

function fromSide(
    fromPerson,
    commonAncestralPartnership,
) {
    for (let parent of fromPerson.parents) {
        if (parent.ancestralPartnerships(true).has(commonAncestralPartnership)) {
            return parent;
        }
    }
    return null;
}

function characterizeParent(
    fromPerson,
    parent
) {
    if (parent) {
        if (fromPerson.parents.every(p => p == parent || p.gender != parent.gender)) {
            return `on ${possessive(fromPerson)} ${parentName(parent)}'s side`;
        } else {
            return `via ${parent.name}`;
        }    
    }
    return "";
}

function possessive(person) {
    return `${person.firstName}'s`;
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

function piblingModifiers(generations, relationship) {
    console.log("pniblingModifiers", generations, relationship);
    switch (generations) {
        case 0:
            return "self";
        
        case 1:
            return relationship;

        case 2:
            return "great";

        case 3:
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