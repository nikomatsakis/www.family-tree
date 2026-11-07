use std::{
    collections::{BTreeMap, HashSet},
    path::Path,
};

use anyhow::Context;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Default, Deserialize)]
struct Config {
    #[serde(default)]
    sources: BTreeMap<String, SourceConfig>,
}

#[derive(Deserialize)]
struct SourceConfig {
    pattern: String,
}

#[derive(Default)]
pub struct CitationSources {
    patterns: Vec<(String, Regex)>,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct Citation {
    kind: &'static str,
    source: String,
    page: u32,
}

impl CitationSources {
    // Citation syntax belongs to the data repository. Compile its patterns once
    // before generating any output; an absent configuration means no citations.
    pub fn load(genea_path: &Path) -> anyhow::Result<Self> {
        let path = genea_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("reference-material.json");
        let contents = match std::fs::read_to_string(&path) {
            Ok(contents) => contents,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(Self::default())
            }
            Err(error) => return Err(error).with_context(|| format!("Reading {}", path.display())),
        };
        Self::from_json(&contents)
            .with_context(|| format!("Invalid citation configuration in {}", path.display()))
    }

    fn from_json(contents: &str) -> anyhow::Result<Self> {
        let config: Config = serde_json::from_str(contents)?;
        let valid_id = Regex::new(r"^[a-z0-9-]+$").unwrap();
        let mut patterns = Vec::new();
        for (id, source) in config.sources {
            anyhow::ensure!(valid_id.is_match(&id), "Invalid source ID: {id}");
            let pattern = Regex::new(&source.pattern)
                .with_context(|| format!("Invalid pattern for source '{id}'"))?;
            anyhow::ensure!(pattern.capture_names().flatten().any(|name| name == "page"),
                "Pattern for source '{id}' must contain a named 'page' capture, e.g. (?P<page>[0-9]+)");
            patterns.push((id, pattern));
        }
        Ok(Self { patterns })
    }

    pub fn extract_secrets(&self, annotations: &[crate::genea::Annotation]) -> Vec<Citation> {
        let mut citations = Vec::new();
        for annotation in annotations
            .iter()
            .filter(|annotation| annotation.is_secret())
        {
            for citation in self.extract(&annotation.value) {
                if !citations.contains(&citation) {
                    citations.push(citation);
                }
            }
        }
        citations
    }

    // Only export source IDs and captured page numbers, never surrounding notes.
    // A page capture may hold one number or a comma-separated list of numbers.
    pub fn extract(&self, notes: &str) -> Vec<Citation> {
        let mut citations = Vec::new();
        let mut seen = HashSet::new();
        for (source, pattern) in &self.patterns {
            for captures in pattern.captures_iter(notes) {
                let Some(pages) = captures.name("page") else {
                    continue;
                };
                for value in pages.as_str().split(',') {
                    let Ok(page) = value.trim().parse::<u32>() else {
                        continue;
                    };
                    if page > 0 && seen.insert((source, page)) {
                        citations.push(Citation {
                            kind: "pdf",
                            source: source.clone(),
                            page,
                        });
                    }
                }
            }
        }
        citations
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_configured_sources_lists_and_repeated_references() {
        let sources = CitationSources::from_json(
            r#"{"sources":{
            "history":{"pattern":"\\bPAGE\\s+(?P<page>[0-9]+(?:\\s*,\\s*[0-9]+)*)\\b"},
            "letters":{"pattern":"LETTER:(?P<page>[0-9]+)"}
        }}"#,
        )
        .unwrap();
        let citations =
            sources.extract("private notes;PAGE 19,27;PAGE 19;LETTER:19;PAGE 0;PAGE 999999999999");
        assert_eq!(
            serde_json::to_value(citations).unwrap(),
            serde_json::json!([
                {"kind":"pdf","source":"history","page":19},
                {"kind":"pdf","source":"history","page":27},
                {"kind":"pdf","source":"letters","page":19}
            ])
        );
        assert!(sources
            .extract("private notes without references")
            .is_empty());
    }

    #[test]
    fn no_builtin_page_syntax() {
        assert!(CitationSources::default().extract("PAGE 17").is_empty());
        let sources = CitationSources::from_json(
            r#"{"sources":{"book":{"pattern":"BOOK (?P<page>[0-9]+)"}}}"#,
        )
        .unwrap();
        assert!(sources.extract("PAGE 17").is_empty());
        assert_eq!(sources.extract("BOOK 17")[0].page, 17);
    }

    #[test]
    fn rejects_invalid_patterns_and_missing_page_capture() {
        for pattern in ["[", "PAGE ([0-9]+)"] {
            let config = serde_json::json!({"sources":{"history":{"pattern":pattern}}});
            let error = CitationSources::from_json(&config.to_string())
                .err()
                .unwrap();
            assert!(error.to_string().contains("history"));
        }
    }

    #[test]
    fn optional_unmatched_page_capture_is_ignored() {
        let sources = CitationSources::from_json(
            r#"{"sources":{"book":{"pattern":"BOOK(?: (?P<page>[0-9]+))?"}}}"#,
        )
        .unwrap();
        assert!(sources.extract("BOOK").is_empty());
    }
}
