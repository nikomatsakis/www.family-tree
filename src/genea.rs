use std::{collections::BTreeSet, path::Path};

use anyhow::Context;

mod error;
mod parser;

/// The family tree. Indexable via `Person` and `Partnership` values.
#[derive(Default)]
pub struct Genea {
    maintainer_link: Option<String>,
    people: Vec<PersonData>,
    partnerships: Vec<PartnershipData>,
}

impl Genea {
    pub fn from_genea_doc(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let path = path.as_ref();
        let text = std::fs::read_to_string(path)
            .with_context(|| format!("reading `{}`", path.display()))?;
        parser::parse_text(path, &text)
    }

    /// Parse genea content from a string (for testing and edit operations)
    pub fn from_genea_content(content: &str) -> anyhow::Result<Self> {
        parser::parse_text(Path::new("<in-memory>"), content)
    }

    fn add_person(&mut self, person_data: PersonData) -> Person {
        let len = self.people.len();
        self.people.push(person_data);
        Person(len)
    }

    fn add_partnership(&mut self, partnership_data: PartnershipData) -> Partnership {
        let len = self.partnerships.len();
        self.partnerships.push(partnership_data);
        Partnership(len)
    }

    pub fn partnerships(&self) -> impl Iterator<Item = Partnership> {
        (0..self.partnerships.len()).map(Partnership)
    }

    /// Iterator over all the `Person` values
    pub fn people(&self) -> impl Iterator<Item = Person> {
        (0..self.people.len()).map(Person)
    }

    /// Iterator over all the `Person` values
    pub fn root_people(&self) -> impl Iterator<Item = Person> + '_ {
        self.people()
            .filter(|&person| self[person].henry_number().is_root_ancestor())
    }

    pub fn maintainer_link(&self) -> &Option<String> {
        &self.maintainer_link
    }

    /// Find a person by their coordinates (henry number + spousal index)
    pub fn find_person_by_coordinates(&self, coords: &Coordinates) -> Option<Person> {
        self.people().find(|&person| {
            let person_data = &self[person];
            person_data.henry_number == coords.henry_number
                && person_data.spousal_index == coords.spousal_index
        })
    }
}

impl std::fmt::Debug for Genea {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        struct Tagged<D> {
            tag: &'static str,
            index: usize,
            data: D,
        }

        impl<D> std::fmt::Debug for Tagged<D>
        where
            D: std::fmt::Debug,
        {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                let Tagged { tag, index, data } = self;
                write!(f, "{tag}({index}) = ")?;
                D::fmt(data, f)
            }
        }

        f.debug_struct("Genea")
            .field(
                "people",
                &self
                    .people
                    .iter()
                    .zip(0..)
                    .map(|(data, i)| Tagged {
                        tag: "Person",
                        index: i,
                        data,
                    })
                    .collect::<Vec<_>>(),
            )
            .field(
                "partnerships",
                &self
                    .partnerships
                    .iter()
                    .zip(0..)
                    .map(|(data, i)| Tagged {
                        tag: "Partnership",
                        index: i,
                        data,
                    })
                    .collect::<Vec<_>>(),
            )
            .finish()
    }
}

impl std::ops::Index<Person> for Genea {
    type Output = PersonData;

    fn index(&self, index: Person) -> &Self::Output {
        &self.people[index.0]
    }
}

impl std::ops::IndexMut<Person> for Genea {
    fn index_mut(&mut self, index: Person) -> &mut Self::Output {
        &mut self.people[index.0]
    }
}

impl std::ops::Index<Partnership> for Genea {
    type Output = PartnershipData;

    fn index(&self, index: Partnership) -> &Self::Output {
        &self.partnerships[index.0]
    }
}

impl std::ops::IndexMut<Partnership> for Genea {
    fn index_mut(&mut self, index: Partnership) -> &mut Self::Output {
        &mut self.partnerships[index.0]
    }
}

/// The location of information within the file
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Span {
    line_num: usize,
    chars: Option<(usize, usize)>,
}

impl Span {
    pub fn line_num(&self) -> usize {
        self.line_num
    }
}

/// Index of an individual
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Person(usize);

/// Index of a partnership (marriage or otherwise)
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Partnership(usize);

impl Partnership {
    pub fn as_usize(self) -> usize {
        self.0
    }
}

/// These "coordinates" map to the way the person is defined in the `genea.doc` file.
/// The combination of a (lowest) henry-number, gender, and spousal index is a unique identifier.
#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Coordinates {
    henry_number: HenryNumber,
    spousal_index: SpousalIndex,
}

impl Coordinates {
    /// Parse coordinates from compact format
    /// Primary person IDs: "1-1-1-3" (entire string is henry number, spousal_index=0)
    /// Secondary spouse IDs: "1-1-1--2" (henry number before "--", spousal_index after)
    pub fn parse(s: &str) -> anyhow::Result<Self> {
        // 💡: Split on "--" first to check if this is a secondary spouse ID
        if let Some(dash_pos) = s.find("--") {
            // Secondary spouse format: "1-1-1--2"
            let henry_part = &s[..dash_pos];
            let spousal_part = &s[dash_pos + 2..];

            let spousal_index = spousal_part
                .parse::<usize>()
                .context("Invalid spousal index after '--'")?;

            let ancestry: Result<Vec<usize>, _> = henry_part
                .split('-')
                .map(|s| s.parse::<usize>())
                .collect();

            let ancestry = ancestry.context("Invalid henry number components before '--'")?;

            if ancestry.is_empty() {
                anyhow::bail!("Henry number cannot be empty");
            }

            Ok(Self {
                henry_number: HenryNumber { ancestry },
                spousal_index: SpousalIndex::new(spousal_index),
            })
        } else {
            // Primary person format: "1-1-1-3" (entire string is henry number)
            let ancestry: Result<Vec<usize>, _> = s
                .split('-')
                .map(|s| s.parse::<usize>())
                .collect();

            let ancestry = ancestry.context("Invalid henry number components")?;

            if ancestry.is_empty() {
                anyhow::bail!("Henry number cannot be empty");
            }

            Ok(Self {
                henry_number: HenryNumber { ancestry },
                spousal_index: SpousalIndex::new(0), // Primary spouse
            })
        }
    }

    pub fn to_string(&self) -> String {
        format!("{}-{}", self.henry_number, self.spousal_index.as_usize())
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct HenryNumber {
    pub ancestry: Vec<usize>,
}

impl HenryNumber {
    pub fn is_root_ancestor(&self) -> bool {
        self.ancestry.len() == 1
    }

    pub fn is_prefix_of(&self, hn: &HenryNumber) -> bool {
        self.ancestry.len() <= hn.ancestry.len()
            && self.ancestry.iter().zip(&hn.ancestry).all(|(i, j)| i == j)
    }

    fn parent(&self) -> Option<HenryNumber> {
        if self.is_root_ancestor() {
            None
        } else {
            Some(Self {
                ancestry: self.ancestry[0..self.ancestry.len() - 1].to_vec(),
            })
        }
    }

    fn next_sibling(&self) -> Self {
        let mut ancestry = self.ancestry.clone();
        *ancestry.last_mut().unwrap() += 1;
        Self { ancestry }
    }
}

impl std::fmt::Display for HenryNumber {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            self.ancestry
                .iter()
                .map(|u| u.to_string())
                .collect::<Vec<String>>()
                .join("-")
        )
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct SpousalIndex(usize);

impl SpousalIndex {
    /// The "primary" spouse is the one whose ancestor is described by the henry number
    pub fn is_primary(&self) -> bool {
        self.0 == 0
    }

    /// The "secondary" spouse is the one that came from outside the family
    pub fn is_secondary(&self) -> bool {
        self.0 != 0
    }

    /// Get the numeric index value for line reconstruction
    pub fn as_usize(&self) -> usize {
        self.0
    }

    /// Create a new SpousalIndex from a numeric value
    pub fn new(index: usize) -> Self {
        Self(index)
    }
}

#[derive(Debug)]
pub struct PersonData {
    /// The span representing the location of the individual's name in the source file
    pub name_span: Span,

    /// The henry number this person appears under (always present).
    /// 💡: We prefer the primary henry number (spousal_index=0) when available, but if this
    /// person doesn't have their own henry number, we use their spouse's henry number with
    /// a non-zero spousal_index. During parsing, these fields may be temporarily assigned
    /// different values before being finalized through merging operations.
    pub henry_number: HenryNumber,

    /// Span where the henry number appears in the source file.
    /// 💡: Points to the location of the henry number used above, which may be from this
    /// person's primary line or from a spouse's line depending on spousal_index.
    pub henry_number_span: Span,

    /// Position in spouse list: 0=primary spouse (owns henry_number), 1,2,3...=secondary spouses.
    /// 💡: When spousal_index=0, this person owns the henry_number. When spousal_index>0,
    /// this person shares their spouse's henry_number and appears as spouse #N in that location.
    /// This enables complete line reconstruction for editing functionality.
    pub spousal_index: SpousalIndex,

    /// Spans of all altid references to this person in the source file.
    /// Used for comprehensive error reporting and validation.
    pub altid_spans: Vec<Span>,

    pub gender: Gender,

    /// If `Some`, the partnership id that contains this person's parents.
    pub child_in: Option<Partnership>,

    /// List of partnership ids that
    pub parent_in: Vec<Partnership>,

    /// Person's name
    pub name: String,

    /// Comments from the file
    pub comments: String,

    /// Private comments not to be exposed publicly
    #[expect(dead_code)]
    pub private_comments: String,
}

impl PersonData {
    pub fn henry_number(&self) -> &HenryNumber {
        &self.henry_number
    }

    pub fn henry_number_span(&self) -> Span {
        self.henry_number_span
    }

    pub fn is_primary_spouse(&self) -> bool {
        self.spousal_index.is_primary()
    }
}

#[derive(Debug)]
pub struct PartnershipData {
    pub parents: BTreeSet<Person>,
    pub children: Vec<Person>,
}

impl PartnershipData {
    pub fn other_parent(&self, parent: Person) -> Option<Person> {
        self.parents.iter().find(|&p| *p != parent).cloned()
    }
}

/// Gender: a social construct. How regressive.
#[derive(Copy, Clone, PartialEq, Eq, Debug, PartialOrd, Ord, Hash)]
pub enum Gender {
    Male,
    Female,
    Unknown,
}

impl Gender {
    pub fn as_char(&self) -> char {
        match self {
            Gender::Male => 'M',
            Gender::Female => 'F',
            Gender::Unknown => '?',
        }
    }
}

impl std::fmt::Display for Gender {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Gender::Male => write!(f, "male"),
            Gender::Female => write!(f, "female"),
            Gender::Unknown => write!(f, "?"),
        }
    }
}
