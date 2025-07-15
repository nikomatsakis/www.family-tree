use annotate_snippets::{Level, Renderer, Snippet};
use std::collections::HashMap;
use std::fmt::{Display, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use thiserror::Error;

use super::{HenryNumber, Span};

#[derive(Error, Debug)]
pub struct ParseError {
    pub path: PathBuf,
    pub line_num: usize,
    pub kind: ParseErrorKind,
}

#[derive(Error, Debug)]
pub enum ParseErrorKind {
    #[error("line is malformed, regular expression doesn't match")]
    MalformedLine,

    #[error(
        "Child {line_name} has wrong henry number relative to their (Supposed) parent {top_name}"
    )]
    TopNotParent {
        line_name: String,

        line_name_span: Span,

        /// Henry number of the line that appears misplaced
        line_hn: HenryNumber,

        /// Span of the henry number on the line that appears misplaced
        line_hn_span: Span,

        /// Name of the person on the top of the stack
        top_name: String,

        /// Henry number of the person on the top of the stack, which should be the parent of `line_hn`
        top_hn: HenryNumber,

        /// Span of the person on the top of the stack
        top_span: Span,
    },

    #[error("{line_name} has different henry number from their (supposed) partner")]
    TopNotPartner {
        line_name: String,

        line_name_span: Span,

        /// Henry number of the line that appears misplaced
        line_hn: HenryNumber,

        /// Span of the henry number on the line that appears misplaced
        line_hn_span: Span,

        /// Span of the spousal index
        spousal_index_span: Span,

        /// Name of the person on the top of the stack
        top_name: String,

        /// Henry number of the person on the top of the stack, which should be the parent of `line_hn`
        top_hn: HenryNumber,

        /// Span of the person on the top of the stack
        top_span: Span,
    },

    #[error("Sibling {line_name} has the same henry number as {sibling_name}")]
    SiblingWithSameHenryNumber {
        line_name: String,
        line_name_span: Span,
        line_hn: HenryNumber,
        line_hn_span: Span,
        sibling_name: String,
        sibling_span: Span,
    },

    #[error("name does not match, expected {expected_name} found {found_name}")]
    MismatchedName {
        expected_name: String,
        expected_name_span: Span,
        found_name: String,
        found_name_span: Span,
    },

    #[error("{name} already has a primary henry number, {hn}")]
    TwoPrimaryHenryNumbers { name: String, hn: HenryNumber },

    #[error("comments for {name} differ")]
    DifferentComments {
        name: String,
        name_span: Span,
        comments_span: Span,
        other_span: Span,
    },

    #[error(
        "no person named {name} found with henry number {hn}, found names {}",
        comma(.existing_names.iter()),
    )]
    NoMatchingPerson {
        name: String,
        hn: HenryNumber,
        hn_span: Span,
        existing_names: Vec<String>,
        existing_name_spans: Vec<Span>,
        suggestions: Vec<(HenryNumber, Span)>,
    },


    #[error("{parent_name} has multiple children named '{child_name}'")]
    DuplicateChild {
        parent_name: String,
        parent_span: Span,
        child_name: String,
        child_spans: Vec<Span>,
    },

    #[error("{person_name} has multiple spouses named '{spouse_name}'")]
    DuplicateSpouse {
        person_name: String,
        person_span: Span,
        spouse_name: String,
        spouse_spans: Vec<Span>,
    },

    #[error("primary spouse {name} at henry number {henry_number} cannot have an altid")]
    PrimarySpouseWithAltid {
        name: String,
        henry_number: HenryNumber,
        altid_span: Span,
    },

    #[error("two different people with same henry number that are not partners: {first_name} and {second_name}")]
    ConflictingPrimarySpouses {
        first_name: String,
        first_name_span: Span,
        second_name: String,
        second_name_span: Span,
        henry_number: HenryNumber,
    },

    #[error("secondary spouse with altid should only have name, but {name} has {field_name}")]
    SecondarySpouseWithDataAndAltid {
        name: String,
        name_span: Span,
        field_name: String,
        field_span: Span,
        altid: HenryNumber,
    },

    #[error("altid {altid} points to non-existent person")]
    UnresolvedAltid {
        name: String,
        name_span: Span,
        altid: HenryNumber,
        altid_spans: Vec<Span>,
        suggestions: Vec<(HenryNumber, Span)>,
    },

    #[error("{name} declared {declared} children but actual count is {actual}")]
    ChildCountMismatch {
        name: String,
        name_span: Span,
        declared: usize,
        actual: usize,
        count_span: Span,
        henry_number: HenryNumber,
    },

    #[error("{name} declared {declared} spouses but actual count is {actual}")]
    SpouseCountMismatch {
        name: String,
        name_span: Span,
        declared: usize,
        actual: usize,
        count_span: Span,
    },

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

// Global storage for test files to enable testing of pretty formatting
static TEST_FILES: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

/// Create a test file for use in tests. Returns a path that can be used with ParseError.
///
/// # Arguments
/// * `test_name` - Unique name for this test (usually the test function name)
/// * `content` - File content to associate with this test
///
/// # Returns
/// * `Ok(path)` if test_name hasn't been used before
/// * `Err` if test_name has already been used (to prevent accidental reuse)
#[cfg(test)]
pub fn create_test_file(test_name: &str, content: &str) -> anyhow::Result<PathBuf> {
    let test_files = TEST_FILES.get_or_init(|| Mutex::new(HashMap::new()));
    let mut map = test_files.lock().unwrap();

    if map.contains_key(test_name) {
        anyhow::bail!(
            "Test file '{}' already exists. Use a unique test name.",
            test_name
        );
    }

    map.insert(test_name.to_string(), content.to_string());
    Ok(PathBuf::from(format!("test-{}.genea", test_name)))
}

fn get_file_content(path: &Path) -> anyhow::Result<String> {
    // Check test files first (only if TEST_FILES has been initialized)
    if let Some(test_files) = TEST_FILES.get() {
        let map = test_files.lock().unwrap();
        let path_str = path.to_string_lossy();

        // Look for a test file that matches this path
        for (test_name, content) in map.iter() {
            let expected_path = format!("test-{}.genea", test_name);
            if path_str == expected_path {
                return Ok(content.clone());
            }
        }
    }

    // Fall back to reading from disk
    std::fs::read_to_string(path).map_err(|e| e.into())
}

fn comma(v: impl Iterator<Item: Display>) -> String {
    let mut output = String::new();
    let mut sep = "";

    for e in v {
        write!(output, "{sep}{e}").unwrap();
        sep = ", ";
    }

    output
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match pretty_format(self) {
            Ok(s) => write!(f, "{s}"),
            Err(_) => write!(
                f,
                "{}:{}: {}",
                self.path.display(),
                self.line_num,
                self.kind
            ),
        }
    }
}

fn pretty_format(parse_error: &ParseError) -> anyhow::Result<String> {
    let source = &get_file_content(&parse_error.path)?;
    let message = &parse_error.kind.to_string();
    let path_str = &parse_error.path.display().to_string();

    // The offset of the starting byte for each (zero-indexed) line
    let line_offsets: Vec<usize> = std::iter::once(0)
        .chain(
            source
                .char_indices()
                .filter(|&(_, ch)| ch == '\n')
                .map(|(offset, _)| offset + 1),
        )
        .collect();

    let line_span = |line_num: usize| -> std::ops::Range<usize> {
        let line_index = line_num - 1; // convert from 1-index to 0-index
        let start = line_offsets[line_index];
        let end = line_offsets
            .get(line_index + 1)
            .map(|i| *i - 1)
            .unwrap_or(source.len());
        start..end
    };

    let span = |span: Span| -> std::ops::Range<usize> {
        let line_span = line_span(span.line_num);
        if let Some((start, end)) = span.chars {
            line_span.start + start..line_span.start + end
        } else {
            line_span
        }
    };

    let annotation1;
    let annotation2;
    let annotation3;
    let help_annotation;
    let annotations: Vec<String>;
    let suggestion_annotations: Vec<String>;
    let mut snippet = Snippet::source(source).origin(path_str).fold(true);

    match &parse_error.kind {
        ParseErrorKind::TopNotParent {
            line_name,
            line_name_span,
            line_hn,
            line_hn_span,
            top_name,
            top_hn,
            top_span,
        } => {
            annotation1 =
                format!("{line_name} has incorrect henry number to be a child of {top_name}",);
            snippet =
                snippet.annotation(Level::Error.span(span(*line_name_span)).label(&annotation1));

            if top_hn == line_hn {
                annotation2 = format!(
                    "Most likely cause is that this henry number should be {sibling_hn}",
                    sibling_hn = top_hn.next_sibling()
                );
                snippet =
                    snippet.annotation(Level::Help.span(span(*line_hn_span)).label(&annotation2));
            }

            annotation3 = format!("Their (supposed) parent {top_name} has henry number {top_hn}");
            snippet = snippet.annotation(Level::Info.span(span(*top_span)).label(&annotation3));
        }
        ParseErrorKind::TopNotPartner {
            line_name,
            line_name_span: _,
            line_hn,
            line_hn_span,
            spousal_index_span,
            top_name,
            top_hn,
            top_span,
        } => {
            annotation1 =
                format!("{line_name} has henry number {line_hn} which differs from their (supposed) partner's henry number",);
            snippet =
                snippet.annotation(Level::Error.span(span(*line_hn_span)).label(&annotation1));

            annotation2 = format!("Partner {top_name} has henry number {top_hn}");
            snippet = snippet.annotation(Level::Info.span(span(*top_span)).label(&annotation2));

            annotation3 = format!("Most likely fix is to change spousal index of {line_name} to 0");
            snippet = snippet.annotation(
                Level::Help
                    .span(span(*spousal_index_span))
                    .label(&annotation3),
            );
        }
        ParseErrorKind::SiblingWithSameHenryNumber {
            line_name,
            line_name_span,
            line_hn,
            line_hn_span,
            sibling_name,
            sibling_span,
        } => {
            annotation1 = format!("{line_name} has the same henry number as their sibling",);
            snippet =
                snippet.annotation(Level::Error.span(span(*line_name_span)).label(&annotation1));

            annotation2 = format!("Sibling {sibling_name} also has henry number {line_hn}");
            snippet = snippet.annotation(Level::Info.span(span(*sibling_span)).label(&annotation2));

            annotation3 = "Most likely fix is to change henry number here".to_string();
            snippet = snippet.annotation(Level::Help.span(span(*line_hn_span)).label(&annotation3));
        }
        ParseErrorKind::NoMatchingPerson {
            name,
            hn,
            hn_span,
            existing_names,
            existing_name_spans,
            suggestions,
        } => {
            annotation1 = format!("{name} must match somebody with henry number {hn}",);
            snippet = snippet.annotation(Level::Error.span(span(*hn_span)).label(&annotation1));

            annotations = existing_names
                .iter()
                .map(|n| format!("{n} declared here"))
                .collect();

            for (existing_name_annotation, existing_name_span) in
                annotations.iter().zip(existing_name_spans)
            {
                snippet = snippet.annotation(
                    Level::Info
                        .span(span(*existing_name_span))
                        .label(existing_name_annotation),
                );
            }

            // Add suggestions if any
            if !suggestions.is_empty() {
                let suggestions_str = suggestions
                    .iter()
                    .map(|(hn, _span)| hn.to_string())
                    .collect::<Vec<_>>()
                    .join(", ");
                annotation2 =
                    format!("Did you mean one of these henry numbers: {suggestions_str}?");
                snippet = snippet.annotation(Level::Help.span(span(*hn_span)).label(&annotation2));

                // Show where each suggested person is found
                annotation3 = format!("Found {name} at henry number");
                suggestion_annotations = suggestions
                    .iter()
                    .map(|(suggestion_hn, _span)| format!("{annotation3} {suggestion_hn}"))
                    .collect();

                for ((_, suggestion_span), suggestion_label) in
                    suggestions.iter().zip(suggestion_annotations.iter())
                {
                    snippet = snippet.annotation(
                        Level::Info
                            .span(span(*suggestion_span))
                            .label(suggestion_label),
                    );
                }
            }
        }
        ParseErrorKind::DifferentComments {
            name,
            name_span,
            comments_span,
            other_span,
        } => {
            annotation2 = "Other comments found on this line".to_string();
            snippet = snippet.annotation(Level::Info.span(span(*other_span)).label(&annotation2));

            annotation3 = "Comment that is different".to_string();
            snippet =
                snippet.annotation(Level::Info.span(span(*comments_span)).label(&annotation3));

            annotation1 = format!("{name} has different comments on this line");
            snippet = snippet.annotation(Level::Error.span(span(*name_span)).label(&annotation1));
        }
        ParseErrorKind::MismatchedName {
            expected_name,
            expected_name_span,
            found_name,
            found_name_span,
        } => {
            annotation1 = format!("Found {found_name} here");
            snippet = snippet.annotation(
                Level::Error
                    .span(span(*found_name_span))
                    .label(&annotation1),
            );

            annotation2 = format!("Expected {expected_name} based on this reference");
            snippet = snippet.annotation(
                Level::Info
                    .span(span(*expected_name_span))
                    .label(&annotation2),
            );
        }
        ParseErrorKind::ConflictingPrimarySpouses {
            first_name,
            first_name_span,
            second_name,
            second_name_span,
            henry_number,
        } => {
            annotation1 = format!("{second_name} cannot have the same henry number as {first_name} (they are not partners)");
            snippet = snippet.annotation(
                Level::Error
                    .span(span(*second_name_span))
                    .label(&annotation1),
            );

            annotation2 = format!("{first_name} already has henry number {henry_number}");
            snippet =
                snippet.annotation(Level::Info.span(span(*first_name_span)).label(&annotation2));
        }
        ParseErrorKind::SecondarySpouseWithDataAndAltid {
            name,
            name_span,
            field_name,
            field_span,
            altid,
        } => {
            annotation1 = format!(
                "{name} has {field_name} but should only have name (altid points to {altid})"
            );
            snippet = snippet.annotation(Level::Error.span(span(*field_span)).label(&annotation1));

            annotation2 =
                format!("Put all data on the primary person at henry number {altid}, not here");
            snippet = snippet.annotation(Level::Help.span(span(*name_span)).label(&annotation2));
        }
        ParseErrorKind::UnresolvedAltid {
            name,
            name_span,
            altid,
            altid_spans,
            suggestions,
        } => {
            annotation1 = format!(
                "{name} references altid {altid} but no person exists at that henry number"
            );
            snippet = snippet.annotation(Level::Error.span(span(*name_span)).label(&annotation1));

            annotation2 = format!("altid {altid} points to non-existent person");
            for altid_span in altid_spans {
                snippet =
                    snippet.annotation(Level::Error.span(span(*altid_span)).label(&annotation2));
            }

            // Add suggestions if any
            if !suggestions.is_empty() {
                let suggestions_str = suggestions
                    .iter()
                    .map(|(hn, _span)| hn.to_string())
                    .collect::<Vec<_>>()
                    .join(", ");
                help_annotation =
                    format!("Did you mean one of these henry numbers: {suggestions_str}?");
                snippet =
                    snippet.annotation(Level::Help.span(span(*name_span)).label(&help_annotation));

                // Collect suggestion labels with static annotation text
                annotations = suggestions
                    .iter()
                    .map(|(suggestion_hn, _span)| {
                        format!("Found {name} at henry number {suggestion_hn}")
                    })
                    .collect();

                // Add annotations for each suggestion showing where they are found
                for ((_, suggestion_span), suggestion_label) in
                    suggestions.iter().zip(annotations.iter())
                {
                    snippet = snippet.annotation(
                        Level::Info
                            .span(span(*suggestion_span))
                            .label(suggestion_label),
                    );
                }
            }
        }
        ParseErrorKind::DuplicateChild {
            parent_name,
            parent_span,
            child_name,
            child_spans,
        } => {
            // 💡: We add the duplicate child annotation first (as Error level) so annotate-snippets
            // uses its line number in the error header. This ensures clicking the error takes users
            // directly to the duplicate that needs to be fixed, not the parent or first occurrence.

            // Show second child (and any others) with error annotation, using last one as primary error location
            annotation3 =
                format!("Second {child_name} declared here (duplicate of {parent_name}'s child)");

            // Collect all additional annotation strings
            annotations = child_spans
                .iter()
                .enumerate()
                .skip(1)
                .map(|(i, _)| {
                    if i == child_spans.len() - 1 {
                        annotation3.clone()
                    } else {
                        format!("Another {child_name} declared here")
                    }
                })
                .collect();

            for ((i, child_span), annotation_text) in child_spans
                .iter()
                .enumerate()
                .skip(1)
                .zip(annotations.iter())
            {
                if i == child_spans.len() - 1 {
                    // Last duplicate gets the main error annotation
                    snippet = snippet
                        .annotation(Level::Error.span(span(*child_span)).label(annotation_text));
                } else {
                    // Earlier duplicates get info annotations
                    snippet = snippet
                        .annotation(Level::Info.span(span(*child_span)).label(annotation_text));
                }
            }

            // Show parent with info annotation
            annotation1 = format!("{parent_name} is the parent with duplicate children");
            snippet = snippet.annotation(Level::Info.span(span(*parent_span)).label(&annotation1));

            // Show first child with info annotation
            annotation2 = format!("First {child_name} declared here");
            snippet =
                snippet.annotation(Level::Info.span(span(child_spans[0])).label(&annotation2));
        }
        ParseErrorKind::DuplicateSpouse {
            person_name,
            person_span,
            spouse_name,
            spouse_spans,
        } => {
            // Show person with info annotation
            annotation1 = format!("{person_name} is the person with duplicate spouses");
            snippet = snippet.annotation(Level::Info.span(span(*person_span)).label(&annotation1));

            // Show first spouse with info annotation
            annotation2 = format!("First {spouse_name} declared here");
            snippet =
                snippet.annotation(Level::Info.span(span(spouse_spans[0])).label(&annotation2));

            // Show second spouse (and any others) with error annotation, using last one as primary error location
            annotation3 =
                format!("Second {spouse_name} declared here (duplicate spouse of {person_name})");

            // Collect all additional annotation strings
            suggestion_annotations = spouse_spans
                .iter()
                .enumerate()
                .skip(1)
                .map(|(i, _)| {
                    if i == spouse_spans.len() - 1 {
                        annotation3.clone()
                    } else {
                        format!("Another {spouse_name} declared here")
                    }
                })
                .collect();

            for ((i, spouse_span), annotation_text) in spouse_spans
                .iter()
                .enumerate()
                .skip(1)
                .zip(suggestion_annotations.iter())
            {
                if i == spouse_spans.len() - 1 {
                    // Last duplicate gets the main error annotation
                    snippet = snippet
                        .annotation(Level::Error.span(span(*spouse_span)).label(annotation_text));
                } else {
                    // Earlier duplicates get info annotations
                    snippet = snippet
                        .annotation(Level::Info.span(span(*spouse_span)).label(annotation_text));
                }
            }
        }
        ParseErrorKind::ChildCountMismatch {
            name,
            name_span,
            declared,
            actual,
            count_span,
            henry_number,
        } => {
            annotation1 = format!(
                "{name} declared {declared} children but actual count is {actual} (based on henry number prefix {henry_number:?})"
            );
            snippet = snippet.annotation(Level::Error.span(span(*count_span)).label(&annotation1));

            annotation2 = format!("{name} is here");
            snippet = snippet.annotation(Level::Info.span(span(*name_span)).label(&annotation2));
        }
        ParseErrorKind::SpouseCountMismatch {
            name,
            name_span,
            declared,
            actual,
            count_span,
        } => {
            annotation1 = format!(
                "{name} declared {declared} spouses but actual count is {actual}"
            );
            snippet = snippet.annotation(Level::Error.span(span(*count_span)).label(&annotation1));

            annotation2 = format!("{name} is here");
            snippet = snippet.annotation(Level::Info.span(span(*name_span)).label(&annotation2));
        }
        _ => {
            snippet = snippet.annotation(
                Level::Error
                    .span(line_span(parse_error.line_num))
                    .label("here"),
            );
        }
    }

    let message = Level::Error.title(message).snippet(snippet);

    let result = Renderer::plain().render(message).to_string();

    Ok(result)
}
