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
        self.people().filter(|&person| {
            self[person]
                .henry_number
                .as_ref()
                .map(|h| h.is_root_ancestor())
                .unwrap_or(false)
        })
    }

    pub fn maintainer_link(&self) -> &Option<String> {
        &self.maintainer_link
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

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct HenryNumber {
    ancestry: Vec<usize>,
}

impl HenryNumber {
    fn is_root_ancestor(&self) -> bool {
        self.ancestry.len() == 1
    }

    fn is_prefix_of(&self, hn: &HenryNumber) -> bool {
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
}

#[derive(Debug)]
pub struct PersonData {
    /// The offset of the individual's *name*
    pub span: Span,

    /// If `Some`, this person is the canonical person with the
    /// henry number (i.e., the 0th spouse). If `None`, then this is
    /// a spouse for whom we do not have ancestral information.
    pub henry_number: Option<HenryNumber>,

    pub gender: Gender,
    pub child_in: Option<Partnership>,
    pub parent_in: Vec<Partnership>,
    pub name: String,
    pub comments: String,
    pub private_comments: String,
    pub num_spouses: usize,
    pub num_kids: usize,
}

impl PersonData {
    pub fn henry_number(&self) -> Option<&HenryNumber> {
        self.henry_number.as_ref()
    }

    pub fn is_root_ancestor(&self) -> bool {
        let Some(hn) = &self.henry_number else {
            return false;
        };

        hn.is_root_ancestor()
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

impl std::fmt::Display for Gender {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Gender::Male => write!(f, "male"),
            Gender::Female => write!(f, "female"),
            Gender::Unknown => write!(f, "?"),
        }
    }
}
