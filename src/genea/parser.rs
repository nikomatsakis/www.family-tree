use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
    str::FromStr,
};

use anyhow::Context;
use itertools::Itertools;
use regex::Regex;

use crate::genea::Span;

use super::{
    error::{ParseError, ParseErrorKind},
    Gender, Genea, HenryNumber, Partnership, PartnershipData, Person, PersonData, SpousalIndex,
};

lazy_static::lazy_static! {
    static ref PERSON_LINE: Regex = Regex::new(
        "(?P<henry> *(\\d+ +)+)\
        (?P<gender>[MF?])\\s*\
        (?P<numkids>\\d+)\\s+\
        (?P<numspouses>\\d+)\\s+\
        (?P<spouse>\\d+)\\s+\
        (?P<altid>\\d+)?\\s*\
        (?P<name>[^\\\\;]+)\
        (\\\\(?P<comment>[^;]+))?\
        (;(?P<private>.*))?"
    ).unwrap();
}

struct Parser {
    /// Initially true, becomes false once we see the first person's data
    preamble: bool,

    /// We expect the input to be sorted. We maintain a stack of people as we go,
    /// popping people off once we encounter someone who is not their descendant.
    /// We only put the 'primary' people on here; secondary spouses are added to their partnership list instead.
    stack: Vec<StackEntry>,

    /// Index of each person we have seen with this henry number (regardless of spousal index).
    by_primary_henry_number: BTreeMap<HenryNumber, BTreeSet<Person>>,
    by_secondary_henry_number: BTreeMap<HenryNumber, BTreeSet<Person>>,
    by_partners: BTreeMap<BTreeSet<Person>, Partnership>,

    /// The result thus far
    genea: Genea,
}

struct StackEntry {
    person: Person,
    partnership: Option<Partnership>,
}

pub fn parse_text(path: &Path, text: &str) -> anyhow::Result<Genea> {
    let mut lines = text.lines().zip(1..);
    Ok(Parser {
        preamble: true,
        stack: Default::default(),
        genea: Default::default(),
        by_primary_henry_number: Default::default(),
        by_secondary_henry_number: Default::default(),
        by_partners: Default::default(),
    }
    .parse_lines(path, &mut lines)?)
}

impl Parser {
    fn parse_lines(
        mut self,
        path: &Path,
        lines: &mut dyn Iterator<Item = (&str, usize)>,
    ) -> Result<Genea, ParseError> {
        for (line, line_num) in lines {
            let () = self
                .parse_line(line, line_num)
                .map_err(|source| ParseError {
                    path: path.to_path_buf(),
                    line_num,
                    kind: source,
                })?;
        }

        Ok(self.genea)
    }

    fn parse_line(&mut self, line: &str, line_num: usize) -> Result<(), ParseErrorKind> {
        let line_trim = line.trim();
        if line_trim.is_empty() {
            return Ok(());
        }

        if !PERSON_LINE.is_match(line) {
            if self.preamble {
                return Ok(());
            }

            return Err(ParseErrorKind::MalformedLine);
        };

        self.preamble = false;

        let line_data =
            &LineData::from_str(line).with_context(|| format!("expected person data"))?;

        let make_span = |r: &std::ops::Range<usize>| range_to_span(line_num, r);

        // Remove people from the stack unless they are either an ancestor or partner.
        self.pop_stack(&line_data);

        // If we have a secondary number, see if this person has already been created.
        let existing_people = match &line_data.secondary_henry_number {
            None => {
                // If we don't have a secondary number recorded, double check that there is nobody
                None
            }
            Some(hn) => {
                if let Some(set) = self.by_primary_henry_number.get(hn) {
                    if let Some(&p) = set.iter().find(|&&p| self.genea[p].name == line_data.name) {
                        Some(p)
                    } else {
                        return Err(ParseErrorKind::NoMatchingPerson {
                            name: line_data.name.clone(),
                            hn: hn.clone(),
                            hn_span: make_span(
                                line_data.secondary_henry_number_range.as_ref().unwrap(),
                            ),
                            existing_names: set
                                .iter()
                                .map(|&p| self.genea[p].name.clone())
                                .collect(),
                            existing_name_spans: set.iter().map(|&p| self.genea[p].span).collect(),
                        });
                    }
                } else {
                    None
                }
            }
        };

        let person = match existing_people {
            None => {
                let person = self.genea.add_person(PersonData {
                    span: make_span(&line_data.name_range),
                    gender: line_data.gender,
                    child_in: Default::default(),
                    parent_in: Default::default(),
                    name: line_data.name.clone(),
                    comments: line_data.comments.clone(),
                    private_comments: line_data.private_comments.clone(),
                    henry_number: if line_data.spousal_index.is_primary() {
                        Some(line_data.primary_henry_number.clone())
                    } else {
                        None
                    },
                    num_spouses: line_data.num_spouses,
                    num_kids: line_data.num_kids,
                });

                // Insert into the "by henry number" map...
                Self::insert_by_henry_number(
                    &mut self.by_primary_henry_number,
                    &line_data.primary_henry_number,
                    person,
                );
                if let Some(hn) = &line_data.secondary_henry_number {
                    Self::insert_by_henry_number(&mut self.by_secondary_henry_number, hn, person);
                }

                person
            }

            Some(existing_person) => {
                let existing_data = &mut self.genea[existing_person];
                Self::merge_person(line_num, existing_data, line_data)?;
                existing_person
            }
        };

        // If this is a spouse, their partner should be atop the stack.
        // Create a new partnership for them.
        if line_data.spousal_index.is_secondary() {
            let top = self
                .stack
                .last()
                .ok_or_else(|| anyhow::anyhow!("expected partner on the stack"))?;

            let partner_henry_number = self.genea[top.person].henry_number().unwrap();
            if *partner_henry_number != line_data.primary_henry_number {
                return Err(ParseErrorKind::TopNotPartner {
                    line_name: line_data.name.clone(),
                    line_name_span: make_span(&line_data.name_range),
                    line_hn: line_data.primary_henry_number.clone(),
                    line_hn_span: make_span(&line_data.primary_henry_number_range),
                    spousal_index_span: make_span(&line_data.spousal_index_range),
                    top_name: self.genea[top.person].name.clone(),
                    top_span: self.genea[top.person].span,
                    top_hn: self.genea[top.person].henry_number.clone().unwrap(),
                });
            }

            // Check if the partnership already exists.
            self.partner_top(Some(person));

            return Ok(());
        }

        // Otherwise, attach them to their parents and push them on the stack.
        if let Some(parent_hn) = line_data.primary_henry_number.parent() {
            let top = self
                .stack
                .last()
                .ok_or_else(|| anyhow::anyhow!("no root ancestor found on stack"))?;
            let parent = top.person;

            if *self.genea[parent].henry_number().unwrap() != parent_hn {
                return Err(ParseErrorKind::TopNotParent {
                    line_name: line_data.name.clone(),
                    line_name_span: make_span(&line_data.name_range),
                    line_hn: line_data.primary_henry_number.clone(),
                    line_hn_span: make_span(&line_data.primary_henry_number_range),
                    top_name: self.genea[parent].name.clone(),
                    top_hn: self.genea[parent].henry_number.clone().unwrap(),
                    top_span: self.genea[parent].span,
                });
            }

            // Load partnership from top of the stack, creating one if needed
            let partnership = top.partnership.unwrap_or_else(|| self.partner_top(None));

            for &sibling in &self.genea[partnership].children {
                let child_hn = self.genea[sibling].henry_number().unwrap();
                if line_data.primary_henry_number == *child_hn {
                    return Err(ParseErrorKind::SiblingWithSameHenryNumber {
                        line_name: line_data.name.clone(),
                        line_name_span: make_span(&line_data.name_range),
                        line_hn: line_data.primary_henry_number.clone(),
                        line_hn_span: make_span(&line_data.primary_henry_number_range),
                        sibling_name: self.genea[sibling].name.clone(),
                        sibling_span: self.genea[sibling].span,
                    });
                }
            }

            if self.genea[person].child_in.is_none() {
                self.genea[person].child_in = Some(partnership);
                self.genea[partnership].children.push(person);
            }
        } else {
            assert!(
                line_data.primary_henry_number.is_root_ancestor(),
                "on line {line_num}, not a root ancestor"
            );
            assert!(
                self.stack.is_empty(),
                "on line {line_num}, stack not fully popped for root ancestor"
            );
        }

        assert!(
            self.genea[person].henry_number.is_some(),
            "on line {line_num}, person should be primary descendant"
        );
        self.stack.push(StackEntry {
            person,
            partnership: None,
        });

        Ok(())
    }

    /// Set the current partnership of the top of the stack to `partner`
    fn partner_top(&mut self, partner: Option<Person>) -> Partnership {
        let top = self.stack.last_mut().unwrap();

        let mut parents = BTreeSet::default();
        parents.insert(top.person);
        parents.extend(partner);

        let p = *self.by_partners.entry(parents.clone()).or_insert_with(|| {
            let partnership = self.genea.add_partnership(PartnershipData {
                parents: parents.clone(),
                children: vec![],
            });
            for &p in &parents {
                self.genea[p].parent_in.push(partnership);
            }
            partnership
        });

        top.partnership = Some(p);

        p
    }

    fn insert_by_henry_number(
        map: &mut BTreeMap<HenryNumber, BTreeSet<Person>>,
        hn: &HenryNumber,
        person: Person,
    ) {
        map.entry(hn.clone())
            .or_insert_with(Default::default)
            .insert(person);
    }

    /// Pops entries off the stack that are children of `line_data`
    fn pop_stack(&mut self, line_data: &LineData) {
        let hn = &line_data.primary_henry_number;
        while let Some(&StackEntry { person: top, .. }) = self.stack.last() {
            let top_data = &self.genea[top];
            if top_data.henry_number().unwrap().is_prefix_of(hn) {
                break;
            }

            self.stack.pop();
        }
    }

    fn merge_person(
        line_num: usize,
        existing_data: &mut PersonData,
        line_data: &LineData,
    ) -> Result<(), ParseErrorKind> {
        if existing_data.name != line_data.name {
            return Err(ParseErrorKind::MismatchedName {
                expected_name: existing_data.name.clone(),
                found_name: line_data.name.clone(),
            });
        }

        if line_data.spousal_index.is_primary() {
            if let Some(hn) = &existing_data.henry_number {
                return Err(ParseErrorKind::TwoPrimaryHenryNumbers {
                    name: existing_data.name.clone(),
                    hn: hn.clone(),
                });
            }
            existing_data.henry_number = Some(line_data.primary_henry_number.clone());
        }

        if line_data.comments != existing_data.comments {
            if !line_data.comments.is_empty() {
                if !existing_data.comments.is_empty() {
                    return Err(ParseErrorKind::DifferentComments {
                        name: line_data.name.clone(),
                        name_span: range_to_span(line_num, &line_data.name_range),
                        comments_span: range_to_span(line_num, &line_data.comments_range),
                        other_span: existing_data.span,
                    });
                }

                existing_data.comments = line_data.comments.clone();
            }
        }

        Ok(())
    }
}

/// The data found on a line in the genea file
#[derive(Debug)]
struct LineData {
    primary_henry_number: HenryNumber,
    primary_henry_number_range: std::ops::Range<usize>,
    gender: Gender,
    num_kids: usize,
    num_spouses: usize,
    spousal_index: SpousalIndex,
    spousal_index_range: std::ops::Range<usize>,
    secondary_henry_number: Option<HenryNumber>,
    secondary_henry_number_range: Option<std::ops::Range<usize>>,
    name: String,
    name_range: std::ops::Range<usize>,
    comments: String,
    comments_range: std::ops::Range<usize>,
    private_comments: String,
}

impl FromStr for LineData {
    type Err = ParseErrorKind;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let Some(captures) = PERSON_LINE.captures(s) else {
            return Err(ParseErrorKind::MalformedLine);
        };

        let primary_henry_number: HenryNumber = captures
            .name("henry")
            .unwrap()
            .as_str()
            .parse()
            .context("invalid henry number")?;
        let primary_henry_number_range: std::ops::Range<usize> =
            captures.name("henry").unwrap().range();
        let gender: Gender = captures
            .name("gender")
            .unwrap()
            .as_str()
            .parse()
            .context("invalid gender")?;
        let numkids: usize = captures
            .name("numkids")
            .unwrap()
            .as_str()
            .parse()
            .context("invalid number of kids")?;
        let numspouses: usize = captures
            .name("numspouses")
            .unwrap()
            .as_str()
            .parse()
            .context("invalid number of spouses")?;
        let spousal_index: SpousalIndex = captures
            .name("spouse")
            .unwrap()
            .as_str()
            .parse()
            .context("invalid spousal index")?;
        let spousal_index_range: std::ops::Range<usize> = captures.name("spouse").unwrap().range();
        let secondary_henry_number: Option<HenryNumber> = match captures.name("altid") {
            Some(c) => {
                Some(HenryNumber::from_alt_str(c.as_str()).context("alternate henry number")?)
            }
            None => None,
        };
        let secondary_henry_number_range = captures.name("altid").map(|c| c.range());
        let name = captures.name("name").unwrap().as_str();
        let name_range: std::ops::Range<usize> = captures.name("name").unwrap().range();
        let comments: &str = captures.name("comment").map(|c| c.as_str()).unwrap_or("");
        let comments_range = captures
            .name("comment")
            .map(|r| r.range())
            .unwrap_or(name_range.clone());
        let private_comments: &str = captures.name("private").map(|c| c.as_str()).unwrap_or("");

        Ok(LineData {
            name_range,
            primary_henry_number_range,
            gender,
            name: name.to_string(),
            comments: comments.to_string(),
            comments_range,
            private_comments: private_comments.to_string(),
            num_spouses: numspouses,
            num_kids: numkids,
            primary_henry_number,
            spousal_index,
            spousal_index_range,
            secondary_henry_number,
            secondary_henry_number_range,
        })
    }
}

impl FromStr for HenryNumber {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> anyhow::Result<Self> {
        // Expect: a whitespace separated sequence of non-zero numbers
        // with some number of trailing zeros.
        let mut ancestry: Vec<usize> = vec![];

        let mut words = s.split_whitespace();
        while let Some(s) = words.next() {
            let u = usize::from_str(s)?;
            if u == 0 {
                break;
            }
            ancestry.push(u);
        }

        for s in words {
            let u = usize::from_str(s)?;
            if u != 0 {
                anyhow::bail!("henry number with non-trailing zero");
            }
        }

        Ok(HenryNumber { ancestry })
    }
}

impl HenryNumber {
    /// The "alt" str is a compact henry number with one digit per generation and no spaces.
    /// It is used in `genea.doc` for when a person appears in more than one family line.
    fn from_alt_str(s: &str) -> anyhow::Result<Self> {
        let expanded: String = Itertools::intersperse(s.chars(), ' ').collect();
        Self::from_str(&expanded)
    }
}

impl FromStr for Gender {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "M" => Ok(Gender::Male),
            "F" => Ok(Gender::Female),
            "?" => Ok(Gender::Unknown),
            _ => anyhow::bail!("unrecognized gender `{s}`"),
        }
    }
}

impl FromStr for SpousalIndex {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(SpousalIndex(usize::from_str(s)?))
    }
}

fn range_to_span(line_num: usize, r: &std::ops::Range<usize>) -> Span {
    Span {
        line_num,
        chars: Some((r.start, r.end)),
    }
}
