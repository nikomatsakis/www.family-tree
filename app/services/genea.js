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
        if (r.type !== "person") {
            throw new Error(`unexpected reference to have type "person": ${JSON.stringify(r)} `);
        }
        return this._getPerson(r.id);
    }

    _partnership(r) {
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
    constructor(genea, attributes, relationships) {
        this._genea = genea;
        this._attributes = attributes;
        this._relationships = relationships;
    }

    get rootPeople() {
        return this._relationships.rootPeople.data.map(r => this._genea._person(r))
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

    get childIn() {
        return this._relationships.childIn.data.map(r => this._genea._partnership(r));
    }

    get parentIn() {
        return this._relationships.parentIn.data.map(r => this._genea._partnership(r));
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

    partnerTo(person) {
        return this.parents.find(p => p.id !== person.id);
    }
}