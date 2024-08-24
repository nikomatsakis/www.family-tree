use annotate_snippets::{Level, Renderer, Snippet};
use std::fmt::{Display, Write};
use std::path::PathBuf;
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
        found_name: String,
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
    },

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

fn comma(v: impl Iterator<Item: Display>) -> String {
    let mut output = format!("");
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
    let source = &std::fs::read_to_string(&parse_error.path)?;
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
    let annotations: Vec<String>;
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

            annotation3 = format!("Most likely fix is to change henry number here");
            snippet = snippet.annotation(Level::Help.span(span(*line_hn_span)).label(&annotation3));
        }
        ParseErrorKind::NoMatchingPerson {
            name,
            hn,
            hn_span,
            existing_names,
            existing_name_spans,
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
                        .label(&existing_name_annotation),
                );
            }
        }
        ParseErrorKind::DifferentComments {
            name,
            name_span,
            comments_span,
            other_span,
        } => {
            annotation2 = format!("Other comments found on this line");
            snippet = snippet.annotation(Level::Info.span(span(*other_span)).label(&annotation2));

            annotation3 = format!("Comment that is different");
            snippet =
                snippet.annotation(Level::Info.span(span(*comments_span)).label(&annotation3));

            annotation1 = format!("{name} has different comments on this line");
            snippet = snippet.annotation(Level::Error.span(span(*name_span)).label(&annotation1));
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
