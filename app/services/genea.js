import Service from '@ember/service';
import invariant from 'tiny-invariant';

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
          case 'person':
            this.#people[object.id] = new Person(
              this,
              object.id,
              object.attributes,
              object.relationships,
            );
            break;

          case 'partnership':
            this.#partnerships[object.id] = new Partnership(
              this,
              object.id,
              object.attributes,
              object.relationships,
            );
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
    if (r.type !== 'person') {
      throw new Error(
        `unexpected reference to have type "person": ${JSON.stringify(r)} `,
      );
    }
    return this.populatedPersonById(r.id);
  }

  _partnership(r) {
    if (r === null) {
      return null;
    }
    if (r.type !== 'partnership') {
      throw new Error(
        `unexpected reference to have type "partnership": ${JSON.stringify(r)} `,
      );
    }
    return this.#partnerships[r.id];
  }

  roots() {
    if (!this.isPopulated()) {
      throw new Error('genea not populated');
    }
    return this.#roots;
  }

  person(id) {
    if (!this.isPopulated()) {
      throw new Error('genea not populated');
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
    return this.#relationships.rootPeople.data.map((r) =>
      this.#genea.populatedPersonFromRelationship(r),
    );
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
    return this.name.split(' ')[0];
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
    return this.parentIn.flatMap((partnership) => partnership.partnersTo(this));
  }

  /// Spouses or other partners
  get parents() {
    return this.childIn ? this.childIn.parents : [];
  }

  parentPartnerships(inlaws) {
    let result = this.partnerships(true, false);

    if (inlaws) {
      return result.concat(
        this.partners.flatMap((p) => p.parentPartnerships(false)),
      );
    }

    return result;
  }

  /// Relationship in which this person is a child, or null.
  get childIn() {
    return this.#genea._partnership(this.#relationships.childIn.data);
  }

  /// Array of relationships in which this person is a parent (or partner).
  get parentIn() {
    return this.#relationships.parentIn.data.map((r) =>
      this.#genea._partnership(r),
    );
  }

  /// Array of partnerships in which `this` participates.
  partnerships(includeChildIn, includePartners) {
    let result = [];

    if (includeChildIn && this.childIn) result.push(this.childIn);

    if (includePartners) result = result.concat(this.parentIn);

    return result;
  }

  /// Returns an array of `Relationship` objects between `this` and `thatPerson`.
  relationshipsTo(thatPerson) {
    // Handle self-relationship case
    if (this === thatPerson) {
      return [];
    }
    
    // Find all ancestors of `person`
    let thatPersonPaths = thatPerson.#paths();

    // Create a map from an ancestor `A` to the path leading from `person` to `A`
    let thatPersonAncestors = new Map(
      thatPersonPaths.map((path) => [path.endPerson, path]),
    );

    // Find paths from `this` to some ancestor `A` of `person`
    let thisPaths = this.#paths().filter((path) =>
      thatPersonAncestors.has(path.endPerson),
    );

    // Create the final path by going from `this` to `A` and then down to `person`
    const allRelationships = thisPaths.map((thisPath) => {
      let thatPath = thatPersonAncestors.get(thisPath.endPerson);
      return new Relationship(thisPath, thatPath);
    });

    // Deduplicate relationships using the static helper
    const deduplicated = Person.deduplicateRelationships(allRelationships);
    
    // Filter to keep only the most direct relationships
    if (deduplicated.length <= 1) {
      return deduplicated;
    }
    
    // Find the minimum generation distance
    const minGenerations = Math.min(...deduplicated.map(rel => 
      rel.thisPath.generations + rel.thatPath.generations
    ));
    
    // Keep only relationships with the minimum generation distance
    return deduplicated.filter(rel => 
      rel.thisPath.generations + rel.thatPath.generations === minGenerations
    );
  }

  /// Static helper to deduplicate relationships - can be used by tests
  static deduplicateRelationships(relationships) {
    // Group relationships by their signature
    const groups = new Map();
    for (const rel of relationships) {
      const sig = rel.signature;
      if (!groups.has(sig)) {
        groups.set(sig, []);
      }
      groups.get(sig).push(rel);
    }

    // Select the best path from each group
    return Array.from(groups.values()).map((group) =>
      Person.selectBestPath(group),
    );
  }

  /// Static helper to select the best path from a group
  static selectBestPath(relationships) {
    if (relationships.length === 1) {
      return relationships[0];
    }

    // Sort by quality criteria and return the best one
    return relationships.sort((a, b) => {
      // 1. Prefer shorter total path length
      const aLength = a.thisPath.links.length + a.thatPath.links.length;
      const bLength = b.thisPath.links.length + b.thatPath.links.length;
      if (aLength !== bLength) {
        return aLength - bLength;
      }

      // 2. For equal lengths, prefer paths through biological parents
      // (those without partner links)
      const aPartnerLinks = Person.countPartnerLinks(a);
      const bPartnerLinks = Person.countPartnerLinks(b);
      if (aPartnerLinks !== bPartnerLinks) {
        return aPartnerLinks - bPartnerLinks;
      }

      // 3. Otherwise, maintain stable ordering by common ancestor ID
      return a.commonAncestor.id.localeCompare(b.commonAncestor.id);
    })[0];
  }

  /// Static helper to count partner links
  static countPartnerLinks(relationship) {
    const thisPartnerLinks = relationship.thisPath.links.filter(
      (l) => l.relation === 'partner',
    ).length;
    const thatPartnerLinks = relationship.thatPath.links.filter(
      (l) => l.relation === 'partner',
    ).length;
    return thisPartnerLinks + thatPartnerLinks;
  }

  /// Returns a set containing this person, their partners, and their collective ancestors.
  allAncestors() {
    return new Set(this.#paths().map((path) => path.endPerson));
  }

  /// Returns an array of `Paths` starting from `startPerson`.
  /// These paths reach the person, their partners, and any ancestors of them or their partners.
  #paths() {
    let queue = [new Path(this, [])];
    let result = 0;

    while (result < queue.length) {
      let path = queue[result];
      result += 1;
      for (let extension of path.extendUpAndOver()) queue.push(extension);
    }

    return queue;
  }
}

export class Partnership {
  #genea;
  #attributes;
  #relationships;
  id;

  constructor(genea, id, attributes, relationships) {
    this.#genea = genea;
    this.id = id;
    this.#attributes = attributes;
    this.#relationships = relationships;
  }

  get children() {
    return this.#relationships.children.data.map((r) =>
      this.#genea.populatedPersonFromRelationship(r),
    );
  }

  get parents() {
    return this.#relationships.parents.data.map((r) =>
      this.#genea.populatedPersonFromRelationship(r),
    );
  }

  get parentSet() {
    return new Set(this.parents);
  }

  get parentAndStepParentSet() {
    return new Set(
      this.parents.concat(this.parents.flatMap((p) => p.partners)),
    );
  }

  get firstParent() {
    return this.parents[0];
  }

  get nextParents() {
    return this.parents.slice(1);
  }

  get parentNames() {
    return this.parents.map((p) => p.name).join(' + ');
  }

  partnerTo(person) {
    return this.parents.find((p) => p.id !== person.id);
  }

  partnersTo(person) {
    return this.parents.filter((p) => p.id !== person.id);
  }
}

class Path {
  startPerson;
  links;

  constructor(startPerson, links) {
    invariant(startPerson);
    invariant(links);
    this.startPerson = startPerson;
    this.links = links;
  }

  get endPerson() {
    if (this.links.length !== 0)
      return this.links[this.links.length - 1].toPerson;
    return this.startPerson;
  }

  get generations() {
    return this.links.filter(
      (l) => l.relation === 'parent' || l.relation === 'child',
    ).length;
  }

  reversed() {
    let reversedLinks = [];
    for (let i = this.links.length - 1; i >= 0; i--) {
      reversedLinks.push(this.links[i].reversed());
    }
    return new Path(this.endPerson, reversedLinks);
  }

  /// True if `person` appears on this path (including as the start person).
  #visits(person) {
    return (
      this.startPerson === person ||
      this.links.some((l) => l.toPerson === person)
    );
  }

  /// Tries to create a new path that extends `this` but with `(relation, person)` as the next step.
  /// Returns `[]` if `person` is already on the path or if this would be extending a partner path with
  /// another partner. Otherwise returns a singleton array with the new path.
  #tryExtend(relation, person) {
    if (this.#visits(person)) return [];

    if (
      relation === 'partner' &&
      last(this.links).some((p) => p.relation === 'partner')
    )
      return [];

    let link = new Link(this.endPerson, relation, person);
    return [new Path(this.startPerson, this.links.concat([link]))];
  }

  /// Returns an array of paths going up (to parents) and over (to partners).
  extendUpAndOver() {
    return this.endPerson.partners
      .flatMap((partner) => this.#tryExtend('partner', partner))
      .concat(
        this.endPerson.parents.flatMap((parent) =>
          this.#tryExtend('parent', parent),
        ),
      );
  }
}

/// Returns singleton array with the first item in `array` (or empty array if `array` is empty)
// eslint-disable-next-line no-unused-vars
function first(array) {
  if (array.length === 0) return [];
  return [array[0]];
}

/// Returns singleton array with the last item in `array` (or empty array if `array` is empty)
function last(array) {
  if (array.length === 0) return [];
  return [array[array.length - 1]];
}

class Link {
  /// Person we are stepping "from"
  fromPerson;

  /// Either "parent", "partner", or "child"
  relation;

  /// Person we have stepped to
  toPerson;

  constructor(fromPerson, relation, toPerson) {
    invariant(
      relation === 'child' || relation === 'parent' || relation === 'partner',
      `invalid relation ${relation}`,
    );
    invariant(fromPerson);
    invariant(toPerson);

    this.relation = relation;
    this.fromPerson = fromPerson;
    this.toPerson = toPerson;
  }

  reversed() {
    switch (this.relation) {
      case 'parent':
        return new Link(this.toPerson, 'child', this.fromPerson);
      case 'child':
        return new Link(this.toPerson, 'parent', this.fromPerson);
      case 'partner':
        return new Link(this.toPerson, 'partner', this.fromPerson);
    }
    invariant(false);
  }
}

/// Defines how two people ("this" person and "that" person) are related.
/// Their relationship is defined by two paths that end at some common ancestor
/// (which could be one of them).
export class Relationship {
  #thisPath;
  #thatPath;

  constructor(thisPath, thatPath) {
    invariant(thisPath.endPerson === thatPath.endPerson);
    invariant(thisPath.startPerson !== thatPath.startPerson);

    this.#thisPath = thisPath;
    this.#thatPath = thatPath;
  }

  get commonAncestor() {
    return this.#thisPath.endPerson;
  }

  get thisPath() {
    return this.#thisPath;
  }

  get thatPath() {
    return this.#thatPath;
  }

  get signature() {
    // Create a unique signature for semantically identical relationships
    const thisGen = this.#thisPath.generations;
    const thatGen = this.#thatPath.generations;

    // For direct relationships (parent/child, partners), just use generation counts
    if (thisGen === 0 || thatGen === 0) {
      return `${thisGen}-${thatGen}`;
    }

    // For siblings, use generation counts only (all sibling paths are equivalent)
    if (thisGen === 1 && thatGen === 1) {
      return `${thisGen}-${thatGen}`;
    }

    // For cousins and other relations, include the common ancestor to distinguish paths
    // This preserves important distinctions like "cousin via maternal vs paternal line"
    return `${thisGen}-${thatGen}-${this.commonAncestor.id}`;
  }

  get name() {
    let thisPerson = this.#thisPath.startPerson;
    let thatPerson = this.#thatPath.startPerson;
    let thisGenerations = this.#thisPath.generations;
    let thatGenerations = this.#thatPath.generations;

    /// thisPerson and thatPerson are partners
    if (thisGenerations === 0 && thatGenerations === 0) {
      return partnerName(thatPerson);
    }

    /// thisPerson is an ancestor of thatPerson
    if (thisGenerations === 0) {
      let path = this.#thatPath.reversed();
      invariant(path.startPerson === thisPerson);
      invariant(path.endPerson === thatPerson);
      return ancestorName(path);
    }

    /// thisPerson is a descendant of thatPerson
    if (thatGenerations === 0) {
      let path = this.#thisPath;
      invariant(path.startPerson == thisPerson);
      invariant(path.endPerson == thatPerson);
      return descendantName(path);
    }

    /// thisPerson and thatPerson are siblings or (first, second, third) cousins
    if (thisGenerations === thatGenerations) {
      if (thatGenerations == 1) {
        // Check if they share any biological parents
        const thisParents = thisPerson.parents;
        const thatParents = thatPerson.parents;
        const sharedParents = thisParents.filter((p) =>
          thatParents.includes(p),
        );

        if (sharedParents.length === 0) {
          // No shared biological parents - must be step-siblings
          return 'step-' + siblingName(thatPerson);
        }
        return siblingName(thatPerson);
      } else {
        return `${ordinal(thatGenerations - 1)} cousin ${via(this.#thisPath)}`;
      }
    }

    // For direct aunt/uncle or niece/nephew relationships, don't include "via" information
    if (thisGenerations == 2 && thatGenerations == 1) {
      // From child's perspective, that person is the aunt/uncle
      return piblingName(thatPerson);
    }
    
    if (thisGenerations == 1 && thatGenerations == 2) {
      // From aunt/uncle's perspective, that person is the niece/nephew
      return niblingName(thatPerson);
    }

    let sides = `via ${via(this.#thisPath)} and ${via(this.#thatPath)}`;

    if (thisGenerations == 1) {
      return `${piblingModifiers(thatGenerations - 1, piblingName(thisPerson))} ${sides}`;
    }

    if (thatGenerations == 1) {
      return `${lineageModifiers(thisGenerations - 1, niblingName(thatPerson))} ${sides}`;
    }

    let minGeneration = Math.min(thisGenerations, thatGenerations);
    let maxGeneration = Math.max(thisGenerations, thatGenerations);
    let removed = maxGeneration - minGeneration;
    return `${ordinal(minGeneration)} cousin ${times(removed)} removed ${sides}`;
  }
}

function via(path) {
  for (let link of path.links) {
    if (link.relation === 'parent') {
      let { fromPerson: child, toPerson: parent } = link;
      if (
        child.parents.every((p) => p == parent || p.gender != parent.gender)
      ) {
        return `${possessive(child)} ${parentName(parent)}`;
      } else {
        return `${parent.name}`;
      }
    }
  }
  invariant(false);
}

function possessive(person) {
  return `${person.firstName}'s`;
}

function lineageModifiers(generations, relationship) {
  console.log('lineageModifiers', generations, relationship);
  switch (generations) {
    case 0:
      return 'self';

    case 1:
      return relationship;

    default: {
      let greats = 'great '.repeat(generations - 2);
      return `${greats}grand${relationship}`;
    }
  }
}

function piblingModifiers(generations, relationship) {
  console.log('pniblingModifiers', generations, relationship);
  switch (generations) {
    case 0:
      return 'self';

    case 1:
      return relationship;

    case 2:
      return 'great';

    case 3: {
      let greats = 'great '.repeat(generations - 2);
      return `${greats}grand${relationship}`;
    }
  }
}

function partnerName(person) {
  switch (person.gender) {
    case 'male':
      return 'husband';
    case 'female':
      return 'wife';
    default:
      return 'partner';
  }
}

function ancestorName(path) {
  switch (path.generations) {
    case 1:
      return parentName(path.startPerson);

    default:
      return `${lineageModifiers(path.generations, parentName(path.startPerson))}`;
  }
}

function descendantName(path) {
  switch (path.generations) {
    case 1:
      return childName(path.startPerson);

    default:
      return `${lineageModifiers(path.generations, childName(path.startPerson))}`;
  }
}

function parentName(person) {
  switch (person.gender) {
    case 'male':
      return 'father';
    case 'female':
      return 'mother';
    default:
      return 'parent';
  }
}

function childName(person) {
  switch (person.gender) {
    case 'male':
      return 'son';
    case 'female':
      return 'daughter';
    default:
      return 'child';
  }
}

function piblingName(person) {
  switch (person.gender) {
    case 'male':
      return 'uncle';
    case 'female':
      return 'aunt';
    default:
      return 'pibling';
  }
}

function niblingName(person) {
  console.log('nibling', person, 'has gender', person.gender);
  switch (person.gender) {
    case 'male':
      return 'nephew';
    case 'female':
      return 'niece';
    default:
      return 'nibling';
  }
}

function siblingName(person) {
  switch (person.gender) {
    case 'male':
      return 'brother';
    case 'female':
      return 'sister';
    default:
      return 'sibling';
  }
}

function ordinal(n) {
  switch (n) {
    case 1:
      return 'first';
    case 2:
      return 'second';
    case 3:
      return 'third';
    default:
      switch (n % 10) {
        case 0:
          return `${n}th`;
        case 1:
          return `${n}st`;
        case 2:
          return `${n}nd`;
        case 3:
          return `${n}rd`;
        case 4:
          return `${n}th`;
        case 5:
          return `${n}th`;
        case 6:
          return `${n}th`;
        case 7:
          return `${n}th`;
        case 8:
          return `${n}th`;
        case 9:
          return `${n}th`;
      }
  }
}

function times(n) {
  switch (n) {
    case 1:
      return 'once';
    case 2:
      return 'twice';
    default:
      return `${n} times`;
  }
}
