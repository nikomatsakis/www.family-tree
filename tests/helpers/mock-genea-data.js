// Helper to create mock data for testing the genea service
export function createMockPerson(
  genea,
  id,
  attributes = {},
  relationships = {},
) {
  const defaultAttributes = {
    name: `Person ${id}`,
    gender: 'unknown',
    comments: '',
    isSpouse: false,
    ...attributes,
  };

  const defaultRelationships = {
    childIn: { data: null },
    parentIn: { data: [] },
    ...relationships,
  };

  return {
    id,
    type: 'person',
    attributes: defaultAttributes,
    relationships: defaultRelationships,
  };
}

export function createMockPartnership(
  genea,
  id,
  parentIds = [],
  childIds = [],
) {
  return {
    id,
    type: 'partnership',
    attributes: {},
    relationships: {
      parents: {
        data: parentIds.map((id) => ({ type: 'person', id })),
      },
      children: {
        data: childIds.map((id) => ({ type: 'person', id })),
      },
    },
  };
}

// Creates a simple family structure for testing
// Returns { people, partnerships, genea }
export function createMockFamily() {
  const people = {};
  const partnerships = {};

  // Create grandparents
  people['gp1'] = createMockPerson(null, 'gp1', {
    name: 'Grandpa Smith',
    gender: 'male',
  });
  people['gp2'] = createMockPerson(null, 'gp2', {
    name: 'Grandma Smith',
    gender: 'female',
  });

  // Create grandparents' partnership
  partnerships['gp-partnership'] = createMockPartnership(
    null,
    'gp-partnership',
    ['gp1', 'gp2'],
    ['p1', 'p2'],
  );

  // Create parents
  people['p1'] = createMockPerson(
    null,
    'p1',
    {
      name: 'Dad Smith',
      gender: 'male',
    },
    {
      childIn: { data: { type: 'partnership', id: 'gp-partnership' } },
      parentIn: { data: [{ type: 'partnership', id: 'p-partnership' }] },
    },
  );

  people['p2'] = createMockPerson(
    null,
    'p2',
    {
      name: 'Aunt Smith',
      gender: 'female',
    },
    {
      childIn: { data: { type: 'partnership', id: 'gp-partnership' } },
      parentIn: { data: [{ type: 'partnership', id: 'aunt-partnership' }] },
    },
  );

  people['p3'] = createMockPerson(
    null,
    'p3',
    {
      name: 'Mom Jones',
      gender: 'female',
    },
    {
      parentIn: { data: [{ type: 'partnership', id: 'p-partnership' }] },
    },
  );

  // Create parent partnership
  partnerships['p-partnership'] = createMockPartnership(
    null,
    'p-partnership',
    ['p1', 'p3'],
    ['c1', 'c2'],
  );

  // Create aunt's partnership
  people['uncle'] = createMockPerson(
    null,
    'uncle',
    {
      name: 'Uncle Bob',
      gender: 'male',
    },
    {
      parentIn: { data: [{ type: 'partnership', id: 'aunt-partnership' }] },
    },
  );

  partnerships['aunt-partnership'] = createMockPartnership(
    null,
    'aunt-partnership',
    ['p2', 'uncle'],
    ['cousin1'],
  );

  // Create children
  people['c1'] = createMockPerson(
    null,
    'c1',
    {
      name: 'Child One',
      gender: 'male',
    },
    {
      childIn: { data: { type: 'partnership', id: 'p-partnership' } },
    },
  );

  people['c2'] = createMockPerson(
    null,
    'c2',
    {
      name: 'Child Two',
      gender: 'female',
    },
    {
      childIn: { data: { type: 'partnership', id: 'p-partnership' } },
    },
  );

  // Create cousin
  people['cousin1'] = createMockPerson(
    null,
    'cousin1',
    {
      name: 'Cousin One',
      gender: 'unknown',
    },
    {
      childIn: { data: { type: 'partnership', id: 'aunt-partnership' } },
    },
  );

  // Update grandparents' parentIn relationships
  people['gp1'].relationships.parentIn.data = [
    { type: 'partnership', id: 'gp-partnership' },
  ];
  people['gp2'].relationships.parentIn.data = [
    { type: 'partnership', id: 'gp-partnership' },
  ];

  return { people, partnerships };
}

// Creates a complex family with multiple generations for testing distant relationships
export function createComplexMockFamily() {
  const { people, partnerships } = createMockFamily();

  // Add great-grandparents
  people['ggp1'] = createMockPerson(null, 'ggp1', {
    name: 'Great-Grandpa Smith',
    gender: 'male',
  });
  people['ggp2'] = createMockPerson(null, 'ggp2', {
    name: 'Great-Grandma Smith',
    gender: 'female',
  });

  partnerships['ggp-partnership'] = createMockPartnership(
    null,
    'ggp-partnership',
    ['ggp1', 'ggp2'],
    ['gp1'],
  );

  // Update grandpa to have childIn relationship
  people['gp1'].relationships.childIn = {
    data: { type: 'partnership', id: 'ggp-partnership' },
  };

  // Update great-grandparents' parentIn
  people['ggp1'].relationships.parentIn.data = [
    { type: 'partnership', id: 'ggp-partnership' },
  ];
  people['ggp2'].relationships.parentIn.data = [
    { type: 'partnership', id: 'ggp-partnership' },
  ];

  // Add second cousins branch
  people['gp3'] = createMockPerson(
    null,
    'gp3',
    {
      name: 'Grandpa Smith Brother',
      gender: 'male',
    },
    {
      childIn: { data: { type: 'partnership', id: 'ggp-partnership' } },
    },
  );

  partnerships['ggp-partnership'].relationships.children.data.push({
    type: 'person',
    id: 'gp3',
  });

  people['gp4'] = createMockPerson(null, 'gp4', {
    name: 'Grandma Other',
    gender: 'female',
  });

  partnerships['gp3-partnership'] = createMockPartnership(
    null,
    'gp3-partnership',
    ['gp3', 'gp4'],
    ['p4'],
  );

  people['gp3'].relationships.parentIn.data = [
    { type: 'partnership', id: 'gp3-partnership' },
  ];
  people['gp4'].relationships.parentIn.data = [
    { type: 'partnership', id: 'gp3-partnership' },
  ];

  people['p4'] = createMockPerson(
    null,
    'p4',
    {
      name: 'Second Cousin Parent',
      gender: 'male',
    },
    {
      childIn: { data: { type: 'partnership', id: 'gp3-partnership' } },
      parentIn: { data: [{ type: 'partnership', id: 'p4-partnership' }] },
    },
  );

  partnerships['p4-partnership'] = createMockPartnership(
    null,
    'p4-partnership',
    ['p4'],
    ['cousin2'],
  );

  people['cousin2'] = createMockPerson(
    null,
    'cousin2',
    {
      name: 'Second Cousin',
      gender: 'female',
    },
    {
      childIn: { data: { type: 'partnership', id: 'p4-partnership' } },
    },
  );

  return { people, partnerships };
}
