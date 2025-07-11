//! # Genea Parser
//!
//! This module parses the genea.doc format into a structured family tree.
//!
//! ## Linking People (altid behavior)
//!
//! When a person appears in multiple places in the family tree, they should be linked
//! using altid numbers. **The expectation is that links are bidirectional:**
//!
//! - If person A at location X has altid pointing to location Y, then
//! - Person at location Y should have altid pointing back to location X
//!
//! ### Children placement
//!
//! When a person appears in multiple locations, their children should only be listed
//! in ONE of the locations (it doesn't matter which). The other locations should
//! have `num_kids: 0` to indicate they don't list children there.
//!
//! ### Example
//! ```text
//! # Person appears at two locations:
//! 8 1 2 7 1 2 0 0 0 0 F 2 0 1 9450000 Cynthia Anderson\therapist
//! 9 4 5 0 0 0 0 0 0 0 F 2 1 0 8127000 Cynthia Anderson\therapist
//!
//! # Her spouse should also be linked:
//! 8 1 2 7 1 2 0 0 0 0 M 2 1 0         Demetrios Matsakis\astronomer
//! 9 4 5 0 0 0 0 0 0 0 M 2 0 1 8127120 Demetrios Matsakis\astronomer
//!
//! # Children listed under one location only:
//! 8 1 2 7 1 2 1 0 0 0 M 1 1 0         Nicholas Matsakis\computer scientist
//! 8 1 2 7 1 2 2 0 0 0 F 0 0 0         Kalliroi Matsakis\social worker
//! ```
//!
//! The parser will validate that:
//! - All altid links are bidirectional
//! - No person has duplicate children with the same name
//! - No person has duplicate spouses with the same name

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

/// Calculate the length of shared prefix between two henry numbers
fn shared_prefix_length(a: &HenryNumber, b: &HenryNumber) -> usize {
    let a_ancestry = &a.ancestry;
    let b_ancestry = &b.ancestry;

    a_ancestry
        .iter()
        .zip(b_ancestry.iter())
        .take_while(|(a_val, b_val)| a_val == b_val)
        .count()
}

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

lazy_static::lazy_static! {
    static ref MAINTAINER_LINE: Regex = Regex::new(
        r"Maintainer URL: <(?P<url>[^>]*)>"
    ).unwrap();
}

/// Count information from genea file for validation purposes only
#[derive(Debug, Clone)]
struct PersonCounts {
    num_spouses: usize,
    num_kids: usize,
}

struct Parser {
    /// Initially true, becomes false once we see the first person's data
    preamble: bool,

    /// We expect the input to be sorted. We maintain a stack of people as we go,
    /// popping people off once we encounter someone who is not their descendant.
    /// We only put the 'primary' people on here; secondary spouses are added to their partnership list instead.
    stack: Vec<StackEntry>,

    /// Maps henry numbers to the primary person (0th spouse) at that location.
    /// 💡: Using single Person instead of BTreeSet because only 0th spouse can have henry number
    by_henry_number: BTreeMap<HenryNumber, Person>,
    by_partners: BTreeMap<BTreeSet<Person>, Partnership>,

    /// Count information for validation (not part of final data model)
    /// Maps person IDs to their declared spouse/child counts from the genea file
    person_counts: BTreeMap<Person, PersonCounts>,

    /// The result thus far
    genea: Genea,

    /// Collect mismatched altid references for deferred validation
    /// (person_index, altid, altid_span, attempted_name)
    mismatched_altids: Vec<(Person, HenryNumber, Span, String)>,
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
        by_henry_number: Default::default(),
        by_partners: Default::default(),
        person_counts: BTreeMap::new(),
        mismatched_altids: Vec::new(),
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

        // 💡: Validate after all parsing is complete to catch missing reverse links and duplicates
        // TODO: Implement new validation functions for one-way altid system
        self.validate_unresolved_altids(path)?;
        self.validate_mismatched_altids(path)?;
        // self.validate_links(path)?;
        self.validate_duplicates(path)?;
        self.validate_counts(path)?;

        Ok(self.genea)
    }

    fn parse_line(&mut self, line: &str, line_num: usize) -> Result<(), ParseErrorKind> {
        let line_trim = line.trim();
        if line_trim.is_empty() {
            return Ok(());
        }

        // 💡: Skip comment lines starting with # to allow documentation within genea files
        // This enables better fixture documentation without affecting parsing logic
        if line_trim.starts_with('#') {
            return Ok(());
        }

        if !PERSON_LINE.is_match(line) {
            if self.preamble {
                if let Some(m) = MAINTAINER_LINE.captures(line) {
                    self.genea.maintainer_link = Some(m.name("url").unwrap().as_str().to_string());
                }
                return Ok(());
            }

            return Err(ParseErrorKind::MalformedLine);
        };

        self.preamble = false;

        let line_data =
            &LineData::from_str(line).with_context(|| "expected person data".to_string())?;

        let make_span = |r: &std::ops::Range<usize>| range_to_span(line_num, r);

        // Remove people from the stack unless they are either an ancestor or partner.
        self.pop_stack(line_data);

        // XXX:
        // * Rough idea is-- let's check first if this is a "primary spouse":
        //   - Check for an alt-id and error if one is found
        //   - But we still have to look to see if there exists a person with that henry number
        //     because they may have been created by a previous person. If so, we merge (as now).
        // * For a secondary spouse:
        //   - If there is an alt-id, we check if it exists:
        //     - If it does: error if the name is different, otherwise use it.
        //     - If it does not exist: create the person with that henry number
        //       add them as a partner here.
        //   - If no alt-id:
        //     - Add a new person-id. They do not have a primary henry number.
        //
        // The invariant is that the "person" with the given henry number is always the
        // 0th spouse. You can have a spouse that ALSO has a henry number by giving them
        // the alt-id. But it makes no sense to have a 0th spouse with an alt-id.
        //
        // Then we can do a verify to detect that
        // * no person has multiple spouses with same name
        // * no person has multiple kids with same name
        // * if we have a spouse with an alt-id, we need to have also found the primary record
        //   - I think we indicate this because the `primary_henry_id` field is `None` until we find the
        //     corresponding line in the file.
        // * number of spouses and number of kids are consistent

        // 💡: New one-way altid system: primary spouses can't have altids, secondary spouses point to primary
        let person = if line_data.spousal_index.is_primary() {
            // Primary spouse (0th spouse) - this person owns the henry number
            if line_data.secondary_henry_number.is_some() {
                return Err(ParseErrorKind::PrimarySpouseWithAltid {
                    name: line_data.name.clone(),
                    henry_number: line_data.primary_henry_number.clone(),
                    altid_span: make_span(line_data.secondary_henry_number_range.as_ref().unwrap()),
                });
            }

            // Check if someone already exists at this henry number
            // 💡: This happens when a secondary spouse from an earlier marriage had an altid pointing to this henry number.
            // For example: Person A at 1-2-3 marries Person B (spouse index 1) but Person B has altid 5-6-7.
            // When we process Person B as secondary spouse, we create Person B and map 5-6-7 → Person B.
            // Later when we process Person B's primary line at 5-6-7 (spouse index 0), we find Person B already exists there and merge.
            if let Some(&existing_person) =
                self.by_henry_number.get(&line_data.primary_henry_number)
            {
                // Merge with existing person
                let existing_data = &mut self.genea[existing_person];
                Self::merge_person(
                    line_num,
                    existing_data,
                    line_data,
                    make_span(&line_data.primary_henry_number_range),
                )?;
                // Update stored counts with primary spouse's counts
                self.store_person_counts(existing_person, line_data);
                existing_person
            } else {
                // Create new person
                let person_data = self.create_person_data(
                    line_data,
                    make_span(&line_data.name_range),
                    Some((
                        line_data.primary_henry_number.clone(),
                        make_span(&line_data.primary_henry_number_range),
                    )),
                );
                let person = self.genea.add_person(person_data);
                self.store_person_counts(person, line_data);

                // Map henry number to this person
                self.by_henry_number
                    .insert(line_data.primary_henry_number.clone(), person);
                person
            }
        } else {
            // Secondary spouse - check if they have an altid
            match &line_data.secondary_henry_number {
                Some(altid) => {
                    // Validate that secondary spouse with altid only has name, no other data
                    if !line_data.comments.is_empty() {
                        return Err(ParseErrorKind::SecondarySpouseWithDataAndAltid {
                            name: line_data.name.clone(),
                            name_span: make_span(&line_data.name_range),
                            field_name: "comments".to_string(),
                            field_span: make_span(&line_data.comments_range),
                            altid: altid.clone(),
                        });
                    }
                    if !line_data.private_comments.is_empty() {
                        return Err(ParseErrorKind::SecondarySpouseWithDataAndAltid {
                            name: line_data.name.clone(),
                            name_span: make_span(&line_data.name_range),
                            field_name: "private comments".to_string(),
                            field_span: make_span(&line_data.comments_range), // Note: private comments share the same span as comments
                            altid: altid.clone(),
                        });
                    }

                    // They have an altid - look up the primary person
                    if let Some(&primary_person) = self.by_henry_number.get(altid) {
                        // Check if name matches - if not, record mismatch and continue parsing
                        if self.genea[primary_person].name != line_data.name {
                            // Record this mismatch for later validation
                            let altid_span =
                                make_span(line_data.secondary_henry_number_range.as_ref().unwrap());
                            self.mismatched_altids.push((
                                primary_person,
                                altid.clone(),
                                altid_span,
                                line_data.name.clone(),
                            ));

                            // Fix the name to match canonical data and continue parsing
                            // (This allows us to complete parsing and make better suggestions later)
                        }
                        // Add this altid reference to the person's altid_spans
                        self.genea[primary_person].altid_spans.push(make_span(
                            line_data.secondary_henry_number_range.as_ref().unwrap(),
                        ));
                        primary_person
                    } else {
                        // Altid doesn't exist yet - create a placeholder person
                        // 💡: This creates a person without a henry_number (placeholder) but maps the altid to them
                        // Later when we process the primary line for this altid, we'll merge and set the henry_number
                        let mut person_data = self.create_person_data(
                            line_data,
                            make_span(&line_data.name_range),
                            None,
                        );
                        person_data.altid_spans.push(make_span(
                            line_data.secondary_henry_number_range.as_ref().unwrap(),
                        ));
                        let person = self.genea.add_person(person_data);
                        self.store_person_counts(person, line_data);

                        // Map the altid to this placeholder person
                        self.by_henry_number.insert(altid.clone(), person);
                        person
                    }
                }
                None => {
                    // No altid - create a new person without a henry number
                    let person_data =
                        self.create_person_data(line_data, make_span(&line_data.name_range), None);
                    let person = self.genea.add_person(person_data);
                    self.store_person_counts(person, line_data);
                    person
                }
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
                    top_hn: self.genea[top.person].henry_number().cloned().unwrap(),
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
                    top_hn: self.genea[parent].henry_number().cloned().unwrap(),
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
            self.genea[person].henry_number().is_some(),
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

    /// Creates PersonData from LineData with optional henry_number override
    /// 💡: Helper to reduce duplication - most PersonData fields come directly from LineData
    fn create_person_data(
        &self,
        line_data: &LineData,
        span: Span,
        primary_henry_number: Option<(HenryNumber, Span)>,
    ) -> PersonData {
        PersonData {
            span,
            gender: line_data.gender,
            child_in: Default::default(),
            parent_in: Default::default(),
            name: line_data.name.clone(),
            comments: line_data.comments.clone(),
            private_comments: line_data.private_comments.clone(),
            primary_henry_number,
            altid_spans: Vec::new(),
        }
    }

    /// Store count information for a person for later validation
    fn store_person_counts(&mut self, person_id: Person, line_data: &LineData) {
        self.person_counts.insert(
            person_id,
            PersonCounts {
                num_spouses: line_data.num_spouses,
                num_kids: line_data.num_kids,
            },
        );
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
        primary_henry_number_span: Span,
    ) -> Result<(), ParseErrorKind> {
        if existing_data.name != line_data.name {
            // Check if both are primary spouses (both have henry numbers)
            if existing_data.henry_number().is_some() && line_data.spousal_index.is_primary() {
                // Two different people claiming the same henry number as primary spouses
                return Err(ParseErrorKind::ConflictingPrimarySpouses {
                    first_name: existing_data.name.clone(),
                    first_name_span: existing_data.span,
                    second_name: line_data.name.clone(),
                    second_name_span: Span {
                        line_num,
                        chars: Some((line_data.name_range.start, line_data.name_range.end)),
                    },
                    henry_number: line_data.primary_henry_number.clone(),
                });
            } else {
                // Altid merging case - secondary spouse being merged with primary
                return Err(ParseErrorKind::MismatchedName {
                    expected_name: existing_data.name.clone(),
                    expected_name_span: existing_data.span,
                    found_name: line_data.name.clone(),
                    found_name_span: Span {
                        line_num,
                        chars: Some((line_data.name_range.start, line_data.name_range.end)),
                    },
                });
            }
        }

        if line_data.spousal_index.is_primary() {
            if let Some((hn, _span)) = &existing_data.primary_henry_number {
                return Err(ParseErrorKind::TwoPrimaryHenryNumbers {
                    name: existing_data.name.clone(),
                    hn: hn.clone(),
                });
            }
            existing_data.primary_henry_number = Some((
                line_data.primary_henry_number.clone(),
                primary_henry_number_span,
            ));
        }

        if line_data.comments != existing_data.comments && !line_data.comments.is_empty() {
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

        Ok(())
    }

    /// Validate that all altid references point to actual people (not unresolved placeholders)
    fn validate_unresolved_altids(&self, path: &Path) -> Result<(), ParseError> {
        for (henry_number, &person) in &self.by_henry_number {
            let person_data = &self.genea[person];

            // If this person has no primary henry number, it's an unresolved placeholder
            if person_data.primary_henry_number.is_none() {
                // Find suggestions: people with the same name who have henry numbers
                let suggestions = self.find_name_suggestions(&person_data.name);

                return Err(ParseError {
                    path: path.to_path_buf(),
                    line_num: person_data.span.line_num,
                    kind: ParseErrorKind::UnresolvedAltid {
                        name: person_data.name.clone(),
                        name_span: person_data.span,
                        altid: henry_number.clone(),
                        altid_spans: person_data.altid_spans.clone(),
                        suggestions,
                    },
                });
            }
        }
        Ok(())
    }

    /// Validate mismatched altid references collected during parsing
    fn validate_mismatched_altids(&self, path: &Path) -> Result<(), ParseError> {
        if let Some((person, altid, altid_span, attempted_name)) = self.mismatched_altids.first() {
            let person_data = &self.genea[*person];
            let canonical_name = &person_data.name;

            // Find suggestions for people with the attempted name
            let suggestions = self.find_closest_henry_suggestions(attempted_name, Some(altid));

            return Err(ParseError {
                path: path.to_path_buf(),
                line_num: altid_span.line_num,
                kind: ParseErrorKind::NoMatchingPerson {
                    name: attempted_name.clone(),
                    hn: altid.clone(),
                    hn_span: *altid_span,
                    existing_names: vec![canonical_name.clone()],
                    existing_name_spans: vec![person_data.span],
                    suggestions,
                },
            });
        }
        Ok(())
    }

    /// Find people with the same name who have henry numbers (potential suggestions)
    /// Returns suggestions with the closest henry numbers (maximal shared prefix)
    fn find_name_suggestions(&self, name: &str) -> Vec<(HenryNumber, Span)> {
        self.find_closest_henry_suggestions(name, None)
    }

    /// Find people with the same name, optionally filtering by closest to a target henry number
    fn find_closest_henry_suggestions(
        &self,
        name: &str,
        target_hn: Option<&HenryNumber>,
    ) -> Vec<(HenryNumber, Span)> {
        let mut all_matches = Vec::new();

        // Search through all people in the genea
        for person in self.genea.people() {
            let person_data = &self.genea[person];

            // If this person has the same name and has a primary henry number
            if person_data.name == name {
                if let Some((henry_number, span)) = &person_data.primary_henry_number {
                    all_matches.push((henry_number.clone(), *span));
                }
            }
        }

        // If we have a target henry number, filter by closest match
        if let Some(target) = target_hn {
            // Find the maximum shared prefix length among all matches
            let max_shared_prefix = all_matches
                .iter()
                .map(|(hn, _span)| shared_prefix_length(target, hn))
                .max()
                .unwrap_or(0);

            // Keep only matches with the maximum shared prefix
            if max_shared_prefix > 0 {
                all_matches
                    .retain(|(hn, _span)| shared_prefix_length(target, hn) == max_shared_prefix);
            }
        }

        all_matches
    }

    /// Validate that all altid links are bidirectional
    /// TODO: Reimplement for new one-way altid system
    #[allow(dead_code)]
    fn validate_links(&self, _path: &Path) -> Result<(), ParseError> {
        // TODO: Implement new validation for one-way altid system
        Ok(())
    }

    /// Validate that no person has multiple spouses or children with the same name
    fn validate_duplicates(&self, path: &Path) -> Result<(), ParseError> {
        use std::collections::HashMap;

        // Check for duplicate children in each partnership
        for partnership_id in self.genea.partnerships() {
            let partnership_data = &self.genea[partnership_id];
            let mut child_names: HashMap<String, Vec<Person>> = HashMap::new();

            for &child_id in &partnership_data.children {
                let child_data = &self.genea[child_id];
                child_names
                    .entry(child_data.name.clone())
                    .or_default()
                    .push(child_id);
            }

            for (child_name, children) in child_names {
                if children.len() > 1 {
                    // Get parent name for error message
                    let parent_name = if let Some(&parent_id) = partnership_data.parents.first() {
                        self.genea[parent_id].name.clone()
                    } else {
                        "Unknown".to_string()
                    };

                    let parent_span = if let Some(&parent_id) = partnership_data.parents.first() {
                        self.genea[parent_id].span
                    } else {
                        self.genea[children[0]].span // fallback
                    };

                    let child_spans: Vec<Span> =
                        children.iter().map(|&c| self.genea[c].span).collect();
                    let duplicate_child_line = child_spans.last().unwrap().line_num;

                    return Err(ParseError {
                        path: path.to_path_buf(),
                        line_num: duplicate_child_line,
                        kind: ParseErrorKind::DuplicateChild {
                            parent_name,
                            parent_span,
                            child_name,
                            child_spans,
                        },
                    });
                }
            }
        }

        // Check for duplicate spouses for each person
        for person_id in self.genea.people() {
            let person_data = &self.genea[person_id];
            let mut spouse_names: HashMap<String, Vec<Person>> = HashMap::new();

            for &partnership_id in &person_data.parent_in {
                let partnership_data = &self.genea[partnership_id];
                for &spouse_id in &partnership_data.parents {
                    if spouse_id != person_id {
                        let spouse_data = &self.genea[spouse_id];
                        spouse_names
                            .entry(spouse_data.name.clone())
                            .or_default()
                            .push(spouse_id);
                    }
                }
            }

            for (spouse_name, spouses) in spouse_names {
                if spouses.len() > 1 {
                    let spouse_spans: Vec<Span> =
                        spouses.iter().map(|&s| self.genea[s].span).collect();
                    let duplicate_spouse_line = spouse_spans.last().unwrap().line_num;

                    return Err(ParseError {
                        path: path.to_path_buf(),
                        line_num: duplicate_spouse_line,
                        kind: ParseErrorKind::DuplicateSpouse {
                            person_name: person_data.name.clone(),
                            person_span: person_data.span,
                            spouse_name,
                            spouse_spans,
                        },
                    });
                }
            }
        }

        Ok(())
    }

    /// Validate that declared spouse/child counts match actual counts
    fn validate_counts(&self, path: &Path) -> Result<(), ParseError> {
        for (&person_id, counts) in &self.person_counts {
            let person_data = &self.genea[person_id];

            // Rule 1: Secondary spouses must have 0/0 counts
            if let Some((_, _)) = person_data.primary_henry_number {
                // This is a primary spouse (has henry number)
                self.validate_primary_counts(path, person_id, person_data, counts)?;
            } else {
                // This is a secondary spouse (no henry number)
                self.validate_secondary_counts(path, person_id, person_data, counts)?;
            }
        }

        Ok(())
    }

    /// Validate counts for secondary spouses (must be 0/0)
    fn validate_secondary_counts(
        &self,
        path: &Path,
        _person_id: Person,
        person_data: &PersonData,
        counts: &PersonCounts,
    ) -> Result<(), ParseError> {
        if counts.num_spouses != 0 || counts.num_kids != 0 {
            // TODO: Add specific error type for invalid secondary spouse counts
            return Err(ParseError {
                path: path.to_path_buf(),
                line_num: person_data.span.line_num,
                kind: ParseErrorKind::Other(anyhow::anyhow!(
                    "Secondary spouse {} should have 0 spouses and 0 children, but has {} spouses and {} children",
                    person_data.name, counts.num_spouses, counts.num_kids
                )),
            });
        }
        Ok(())
    }

    /// Validate counts for primary spouses (count actual children/spouses)
    fn validate_primary_counts(
        &self,
        path: &Path,
        person_id: Person,
        person_data: &PersonData,
        counts: &PersonCounts,
    ) -> Result<(), ParseError> {
        let (henry_number, _) = person_data.primary_henry_number.as_ref().unwrap();

        // Count children: people whose henry number is exactly one level deeper
        let actual_kids = self
            .genea
            .people()
            .filter(|&child_id| {
                child_id != person_id && {
                    let child_data = &self.genea[child_id];
                    if let Some((child_hn, _)) = &child_data.primary_henry_number {
                        // Check if child's henry number is exactly one level deeper
                        child_hn.ancestry.len() == henry_number.ancestry.len() + 1 &&
                        henry_number.is_prefix_of(child_hn)
                    } else {
                        false
                    }
                }
            })
            .count();

        // Count spouses: unique partners across all partnerships
        let actual_spouses = person_data
            .parent_in
            .iter()
            .flat_map(|&partnership_id| {
                let partnership_data = &self.genea[partnership_id];
                partnership_data
                    .parents
                    .iter()
                    .filter(|&&spouse_id| spouse_id != person_id)
                    .cloned()
            })
            .collect::<std::collections::BTreeSet<_>>()
            .len();

        if counts.num_kids != actual_kids {
            // TODO: Add specific error type for count mismatch
            return Err(ParseError {
                path: path.to_path_buf(),
                line_num: person_data.span.line_num,
                kind: ParseErrorKind::Other(anyhow::anyhow!(
                    "{} declared {} children but actual count is {} (based on henry number prefix {:?})",
                    person_data.name, counts.num_kids, actual_kids, henry_number
                )),
            });
        }

        if counts.num_spouses != actual_spouses {
            // TODO: Add specific error type for count mismatch
            return Err(ParseError {
                path: path.to_path_buf(),
                line_num: person_data.span.line_num,
                kind: ParseErrorKind::Other(anyhow::anyhow!(
                    "{} declared {} spouses but actual count is {}",
                    person_data.name,
                    counts.num_spouses,
                    actual_spouses
                )),
            });
        }

        Ok(())
    }

}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::genea::error::create_test_file;
    use expect_test::{expect, Expect};
    use std::path::Path;

    fn check_parse_error(test_name: &str, genea_text: &str, expected: Expect) {
        let path = create_test_file(test_name, genea_text).unwrap();
        let result = parse_text(&path, genea_text);
        assert!(result.is_err());
        let error = result.unwrap_err();
        let error_string = error.to_string();
        expected.assert_eq(&error_string);
    }

    #[test]
    fn test_primary_spouse_cannot_have_altid() {
        // Test that primary spouse (spousal index 0) with altid throws error
        let genea_text = " 1 0 0 0 0 0 0 0 0 0 M 1 1 0 2000000 John Doe\\test comment";

        check_parse_error(
            "test_primary_spouse_cannot_have_altid",
            genea_text,
            expect![[r#"
            error: primary spouse John Doe at henry number 1 cannot have an altid
             --> test-test_primary_spouse_cannot_have_altid.genea:1:1
              |
            1 |  1 0 0 0 0 0 0 0 0 0 M 1 1 0 2000000 John Doe\test comment
              | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ here
              |"#]],
        );
    }

    #[test]
    fn test_primary_spouse_without_altid_succeeds() {
        // Test that primary spouse (spousal index 0) without altid works
        let genea_text = " 1 0 0 0 0 0 0 0 0 0 M 0 0 0         John Doe\\test comment";
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);

        if let Err(ref e) = result {
            eprintln!("Error: {}", e);
        }
        assert!(result.is_ok());
        let genea = result.unwrap();
        assert_eq!(genea.people().count(), 1);
        let person = genea.people().next().unwrap();
        assert_eq!(genea[person].name, "John Doe");
        assert!(genea[person].henry_number().is_some());
    }

    #[test]
    fn test_secondary_spouse_with_unresolved_altid_error() {
        // Test that secondary spouse with altid pointing to non-existent person produces error
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 1 1 0         John Doe\primary spouse
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Jane Doe"#;
        let path = Path::new("test.genea");
        let result = parse_text(path, genea_text);

        // Should produce UnresolvedAltid error
        assert!(result.is_err());
        let anyhow_error = result.unwrap_err();
        let parse_error = anyhow_error.downcast::<ParseError>().unwrap();
        match parse_error.kind {
            ParseErrorKind::UnresolvedAltid {
                name,
                altid,
                suggestions,
                ..
            } => {
                assert_eq!(name, "Jane Doe");
                assert_eq!(altid.to_string(), "2");
                // No suggestions expected since there's no other "Jane Doe" in the test data
                assert_eq!(suggestions.len(), 0);
            }
            _ => panic!(
                "Expected UnresolvedAltid error, got: {:?}",
                parse_error.kind
            ),
        }
    }

    #[test]
    fn test_unresolved_altid_with_suggestions() {
        // Test that unresolved altid provides suggestions when there are people with same name
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Person A
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2200000 Person B
 2 0 0 0 0 0 0 0 0 0 M 1 1 0         Person C  
 2 1 0 0 0 0 0 0 0 0 F 0 1 0         Person B"#;
        let path = Path::new("test.genea");
        let result = parse_text(path, genea_text);

        assert!(result.is_err());
        let anyhow_error = result.unwrap_err();
        let parse_error = anyhow_error.downcast::<ParseError>().unwrap();
        match parse_error.kind {
            ParseErrorKind::UnresolvedAltid {
                name,
                altid,
                suggestions,
                ..
            } => {
                assert_eq!(name, "Person B");
                assert_eq!(altid.to_string(), "2-2");
                // Should have suggestion for the Person B that exists at 2.1
                assert_eq!(suggestions.len(), 1);
                let suggestion_henry_numbers: Vec<String> = suggestions
                    .iter()
                    .map(|(hn, _span)| hn.to_string())
                    .collect();
                assert!(suggestion_henry_numbers.contains(&"2-1".to_string()));
            }
            _ => panic!(
                "Expected UnresolvedAltid error, got: {:?}",
                parse_error.kind
            ),
        }
    }

    #[test]
    fn test_secondary_spouse_without_altid_succeeds() {
        // Test that secondary spouse without altid creates person without henry_number
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 1 0         John Doe\primary spouse
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Jane Doe\secondary spouse without altid"#;
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);

        if let Err(ref e) = result {
            eprintln!("Error: {}", e);
        }
        assert!(result.is_ok());
        let genea = result.unwrap();
        assert_eq!(genea.people().count(), 2);
        // Find Jane Doe (the secondary spouse)
        let jane = genea
            .people()
            .find(|&p| genea[p].name == "Jane Doe")
            .unwrap();
        assert!(genea[jane].henry_number().is_none());
    }

    #[test]
    fn test_altid_linking_and_merging() {
        // Test the full cycle: secondary spouse creates placeholder, then primary spouse merges
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 1 0         John Doe\primary spouse first
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Jane Doe
 2 0 0 0 0 0 0 0 0 0 F 0 1 0         Jane Doe\test person"#;
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);

        if let Err(ref e) = result {
            eprintln!("Error: {}", e);
        }
        assert!(result.is_ok());
        let genea = result.unwrap();
        assert_eq!(genea.people().count(), 2); // John and Jane (merged)
        let jane = genea
            .people()
            .find(|&p| genea[p].name == "Jane Doe")
            .unwrap();
        // After merging, should have henry_number set
        assert!(genea[jane].henry_number().is_some());
    }

    #[test]
    fn test_secondary_spouse_with_altid_name_mismatch() {
        // Test that secondary spouse with altid but different name from existing primary fails
        let genea_text = r#" 2 0 0 0 0 0 0 0 0 0 F 1 1 0         Jane Doe\primary spouse
 1 0 0 0 0 0 0 0 0 0 M 1 1 1 2000000 John Doe"#;

        check_parse_error(
            "test_secondary_spouse_with_altid_name_mismatch",
            genea_text,
            expect![[r#"
            error: expected partner on the stack
             --> test-test_secondary_spouse_with_altid_name_mismatch.genea:2:1
              |
            2 |  1 0 0 0 0 0 0 0 0 0 M 1 1 1 2000000 John Doe
              | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ here
              |"#]],
        );
    }

    #[test]
    fn test_mismatched_name_error_shows_both_locations() {
        // Test that name mismatch error shows both the expected and found locations
        // Create a scenario where secondary spouse creates placeholder, then primary has different name
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 1 1 0         John Doe\primary spouse first
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Jane Doe
 2 0 0 0 0 0 0 0 0 0 F 1 1 0         Wrong Name\primary spouse with different name"#;

        check_parse_error(
            "test_mismatched_name_error_shows_both_locations",
            genea_text,
            expect![[r#"
            error: name does not match, expected Jane Doe found Wrong Name
             --> test-test_mismatched_name_error_shows_both_locations.genea:3:38
              |
            2 |  1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Jane Doe
              |                                      -------- info: Expected Jane Doe based on this reference
            3 |  2 0 0 0 0 0 0 0 0 0 F 1 1 0         Wrong Name\primary spouse with different name
              |                                      ^^^^^^^^^^ Found Wrong Name here
              |"#]],
        );
    }

    #[test]
    fn test_duplicate_children_error() {
        // Test that parents cannot have multiple children with the same name
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe
 1 1 0 0 0 0 0 0 0 0 F 0 0 0         Mary Smith
 1 2 0 0 0 0 0 0 0 0 F 0 0 0         Mary Smith"#;

        check_parse_error(
            "test_duplicate_children_error",
            genea_text,
            expect![[r#"
            error: John Doe has multiple children named 'Mary Smith'
             --> test-test_duplicate_children_error.genea:3:38
              |
            1 |  1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe
              |                                      -------- info: John Doe is the parent with duplicate children
            2 |  1 1 0 0 0 0 0 0 0 0 F 0 0 0         Mary Smith
              |                                      ---------- info: First Mary Smith declared here
            3 |  1 2 0 0 0 0 0 0 0 0 F 0 0 0         Mary Smith
              |                                      ^^^^^^^^^^ Second Mary Smith declared here (duplicate of John Doe's child)
              |"#]],
        );
    }

    #[test]
    fn test_duplicate_spouses_error() {
        // Test that a person cannot have multiple spouses with the same name
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 2 2 0         John Doe
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Jane Smith
 1 0 0 0 0 0 0 0 0 0 F 0 0 2         Jane Smith
 1 1 0 0 0 0 0 0 0 0 M 0 0 0         Child One"#;

        check_parse_error(
            "test_duplicate_spouses_error",
            genea_text,
            expect![[r#"
            error: John Doe has multiple spouses named 'Jane Smith'
             --> test-test_duplicate_spouses_error.genea:1:38
              |
            1 |  1 0 0 0 0 0 0 0 0 0 M 2 2 0         John Doe
              |                                      -------- info: John Doe is the person with duplicate spouses
            2 |  1 0 0 0 0 0 0 0 0 0 F 0 0 1         Jane Smith
              |                                      ---------- info: First Jane Smith declared here
            3 |  1 0 0 0 0 0 0 0 0 0 F 0 0 2         Jane Smith
              |                                      ^^^^^^^^^^ Second Jane Smith declared here (duplicate spouse of John Doe)
              |"#]],
        );
    }

    #[test]
    fn test_conflicting_primary_spouses_error() {
        // Test the specific case where two different people claim the same henry number as primary spouses
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 2 1 0         Root Ancestor\setup for hierarchy
 1 0 0 0 0 0 0 0 0 0 F 2 0 1         Root Spouse\spouse of root
 1 1 0 0 0 0 0 0 0 0 F 2 2 0         Maria Karavasilis\first primary spouse
 1 1 0 0 0 0 0 0 0 0 F 0 1 0         Tassoula Vazanis\second primary spouse, same henry number"#;

        check_parse_error(
            "test_conflicting_primary_spouses_error",
            genea_text,
            expect![[r#"
            error: two different people with same henry number that are not partners: Maria Karavasilis and Tassoula Vazanis
             --> test-test_conflicting_primary_spouses_error.genea:4:38
              |
            3 |  1 1 0 0 0 0 0 0 0 0 F 2 2 0         Maria Karavasilis\first primary spouse
              |                                      ----------------- info: Maria Karavasilis already has henry number 1-1
            4 |  1 1 0 0 0 0 0 0 0 0 F 0 1 0         Tassoula Vazanis\second primary spouse, same henry number
              |                                      ^^^^^^^^^^^^^^^^ Tassoula Vazanis cannot have the same henry number as Maria Karavasilis (they are not partners)
              |"#]],
        );
    }

    #[test]
    fn test_secondary_spouse_with_altid_and_comments() {
        // Test that secondary spouse with altid cannot have comments
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 2 1 0         Primary Person\primary person with data
 1 0 0 0 0 0 0 0 0 0 F 2 0 1         Primary Spouse\spouse data
 2 0 0 0 0 0 0 0 0 0 F 1 1 0         Real Person\real person data
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Real Person\secondary spouse should not have comments"#;

        check_parse_error(
            "test_secondary_spouse_with_altid_and_comments",
            genea_text,
            expect![[r#"
            error: secondary spouse with altid should only have name, but Real Person has comments
             --> test-test_secondary_spouse_with_altid_and_comments.genea:4:50
              |
            4 |  1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Real Person\secondary spouse should not have comments
              |                                      ----------- ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Real Person has comments but should only have name (altid points to 2)
              |                                      |
              |                                      help: Put all data on the primary person at henry number 2, not here
              |"#]],
        );
    }

    #[test]
    fn test_secondary_spouse_cannot_have_non_zero_counts() {
        // Test that secondary spouse with non-zero counts fails validation
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 1 0         John Doe\primary spouse
 1 0 0 0 0 0 0 0 0 0 F 1 0 1         Jane Doe\secondary spouse with non-zero count"#;

        check_parse_error(
            "test_secondary_spouse_cannot_have_non_zero_counts",
            genea_text,
            expect![[r#"
                error: Secondary spouse Jane Doe should have 0 spouses and 0 children, but has 0 spouses and 1 children
                 --> test-test_secondary_spouse_cannot_have_non_zero_counts.genea:2:1
                  |
                2 |  1 0 0 0 0 0 0 0 0 0 F 1 0 1         Jane Doe\secondary spouse with non-zero count
                  | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ here
                  |"#]],
        );
    }

    #[test]
    fn test_count_children_direct_only_not_grandchildren() {
        // Test that parent counts only direct children, not grandchildren
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 1 0 0         John Doe\should have 1 child
 1 1 0 0 0 0 0 0 0 0 M 1 0 0         Child One\John's direct child
 1 1 1 0 0 0 0 0 0 0 M 0 0 0         Grandchild\Child One's child, not John's direct child"#;
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);
        assert!(result.is_ok(), "Should parse successfully - John has 1 direct child, not counting grandchild");
    }

    #[test]
    fn test_primary_spouse_wrong_child_count_fails() {
        // Test that primary spouse with incorrect child count fails validation
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe\declares 2 children but has 1
 1 1 0 0 0 0 0 0 0 0 F 0 0 0         Only Child\John's only child"#;

        check_parse_error(
            "test_primary_spouse_wrong_child_count_fails",
            genea_text,
            expect![[r#"
                error: John Doe declared 2 children but actual count is 1 (based on henry number prefix HenryNumber { ancestry: [1] })
                 --> test-test_primary_spouse_wrong_child_count_fails.genea:1:1
                  |
                1 |  1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe\declares 2 children but has 1
                  | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ here
                  |"#]],
        );
    }

    #[test]
    fn test_primary_spouse_wrong_spouse_count_fails() {
        // Test that primary spouse with incorrect spouse count fails validation
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 2 0         John Doe\declares 2 spouses but has 1
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Jane Doe\John's only spouse"#;

        check_parse_error(
            "test_primary_spouse_wrong_spouse_count_fails",
            genea_text,
            expect![[r#"
                error: John Doe declared 2 spouses but actual count is 1
                 --> test-test_primary_spouse_wrong_spouse_count_fails.genea:1:1
                  |
                1 |  1 0 0 0 0 0 0 0 0 0 M 0 2 0         John Doe\declares 2 spouses but has 1
                  | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ here
                  |"#]],
        );
    }

    #[test]
    fn test_merged_person_uses_primary_counts() {
        // Test that when secondary spouse creates placeholder then primary merges, 
        // final validation uses primary spouse's counts
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 1 0         John Doe\primary spouse
 1 0 0 0 0 0 0 0 0 0 F 0 0 1 2000000 Jane Doe
 2 0 0 0 0 0 0 0 0 0 F 0 1 0         Jane Doe\primary record with correct 1 spouse count"#;
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);
        if let Err(ref e) = result {
            eprintln!("Error: {}", e);
        }
        assert!(result.is_ok(), "Should validate successfully using primary spouse's counts after merge");
    }

    #[test]
    fn test_multiple_spouses_count_validation() {
        // Test that person with multiple spouses declares correct count
        let genea_text = r#" 1 0 0 0 0 0 0 0 0 0 M 0 2 0         John Doe\has 2 spouses
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         First Wife\first spouse
 1 0 0 0 0 0 0 0 0 0 F 0 0 2         Second Wife\second spouse"#;
        let path = Path::new("test.genea");

        let result = parse_text(path, genea_text);
        assert!(result.is_ok(), "Should validate successfully with correct spouse count");
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
        // 💡: The regex PERSON_LINE captures just the henry number portion (e.g. " 1 1 2 3 1 3 0 0 0 0")
        // We need to parse this as fixed-width 2-character fields
        let mut ancestry: Vec<usize> = vec![];

        // Pad the string to ensure it's at least 20 characters for parsing
        let padded = format!("{:20}", s);

        // Parse each 2-character field
        for i in 0..10 {
            let start = i * 2;
            let field = &padded[start..start + 2];
            let trimmed = field.trim();
            if trimmed.is_empty() {
                break;
            }
            let u = usize::from_str(trimmed)?;
            if u == 0 {
                break;
            }
            ancestry.push(u);
        }

        // Verify remaining positions are all zero
        let non_zero_start = ancestry.len();
        for i in non_zero_start..10 {
            let start = i * 2;
            let field = &padded[start..start + 2];
            let trimmed = field.trim();
            if !trimmed.is_empty() {
                let u = usize::from_str(trimmed)?;
                if u != 0 {
                    anyhow::bail!("henry number with non-trailing zero at position {}", i + 1);
                }
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
