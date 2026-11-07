//! Public life-date badges. Raw annotation values never enter the JSON response.
use crate::genea::{Annotation, Genea};
use anyhow::Context;
use chrono::{Datelike, NaiveDate, Utc};
use lazy_static::lazy_static;
use regex::Regex;
use serde::Serialize;

lazy_static! {
    static ref ISO: Regex = Regex::new(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(\?)?$").unwrap();
    static ref BIRTH_TEXT: Regex = Regex::new(concat!(
        r"^(?:(?:circa )?\d{4}\??(?: (?:or) \d{4}(?:–\d{4})?)?|\d{4}–\d{4}|",
        r"(?:\d{4}|unknown) \(\d{1,2}/\d{1,2}; day/month order uncertain\))$"
    ))
    .unwrap();
    static ref YEARS: Regex = Regex::new(r"\d{4}").unwrap();
}
const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LifeDate {
    kind: &'static str,
    label: String,
    year_redacted: bool,
}

pub fn current_year() -> i32 {
    Utc::now().year()
}

fn kind(annotation: &Annotation) -> Option<&'static str> {
    if annotation.header.eq_ignore_ascii_case("birth") {
        Some("birth")
    } else if annotation.header.eq_ignore_ascii_case("death") {
        Some("death")
    } else {
        None
    }
}

fn validate_value(value: &str, birth: bool) -> anyhow::Result<()> {
    anyhow::ensure!(
        !value.is_empty() && !value.contains('\n'),
        "Expected a single date value"
    );
    if let Some(c) = ISO.captures(value) {
        let year: i32 = c[1].parse()?;
        let month: u32 = c.get(2).map_or("1", |m| m.as_str()).parse()?;
        let day: u32 = c.get(3).map_or("1", |m| m.as_str()).parse()?;
        anyhow::ensure!(
            year > 0 && NaiveDate::from_ymd_opt(year, month, day).is_some(),
            "Invalid calendar date"
        );
    } else if let Some(day) = value.strip_prefix("--") {
        NaiveDate::parse_from_str(&format!("2000-{day}"), "%Y-%m-%d")
            .context("Invalid birthday")?;
    } else if birth {
        anyhow::ensure!(BIRTH_TEXT.is_match(value), "Use YYYY, YYYY-MM, YYYY-MM-DD, --MM-DD, circa YYYY, YYYY?, or explicit year alternatives for Birth");
    }
    Ok(())
}

pub fn validate(genea: &Genea) -> anyhow::Result<()> {
    for person in genea.people() {
        for annotation in &genea[person].annotations {
            if let Some(kind) = kind(annotation) {
                validate_value(annotation.value.trim(), kind == "birth").with_context(|| {
                    format!(
                        "Invalid {} annotation on line {}",
                        annotation.header, annotation.line_num
                    )
                })?;
            }
        }
    }
    Ok(())
}

fn recent(value: &str, year: i32) -> bool {
    YEARS
        .find_iter(value)
        .any(|m| m.as_str().parse::<i32>().unwrap() >= year - 75)
}

fn display(value: &str, redact: bool) -> String {
    if let Some(c) = ISO.captures(value) {
        let year = &c[1];
        let month = c
            .get(2)
            .map(|m| MONTHS[m.as_str().parse::<usize>().unwrap() - 1]);
        let day = c.get(3).map(|d| d.as_str().parse::<u32>().unwrap());
        let mut parts = Vec::new();
        if let Some(day) = day {
            parts.push(day.to_string());
        }
        if let Some(month) = month {
            parts.push(month.into());
        }
        if !redact {
            parts.push(year.into());
        }
        if parts.is_empty() {
            return "year private".into();
        }
        let mut text = parts.join(" ");
        if c.get(4).is_some() {
            text.push('?');
        }
        text
    } else if let Some(day) = value.strip_prefix("--") {
        let date = NaiveDate::parse_from_str(&format!("2000-{day}"), "%Y-%m-%d").unwrap();
        format!("{} {}", date.day(), MONTHS[date.month0() as usize])
    } else if redact {
        // Ambiguous alternatives must not expose a candidate recent year.
        "year private".into()
    } else {
        value.into()
    }
}

pub fn extract(annotations: &[Annotation], year: i32) -> Vec<LifeDate> {
    // Conflicting/repeated birth annotations share the stricter privacy decision.
    let redact_births = annotations
        .iter()
        .any(|a| kind(a) == Some("birth") && recent(&a.value, year));
    let mut dates = Vec::new();
    for annotation in annotations {
        let Some(kind) = kind(annotation) else {
            continue;
        };
        let value = annotation.value.trim();
        let year_redacted = kind == "birth" && redact_births && YEARS.is_match(value);
        let date = LifeDate {
            kind,
            label: format!(
                "{} {}",
                if kind == "birth" { "Born" } else { "Died" },
                display(value, year_redacted)
            ),
            year_redacted,
        };
        if !dates.contains(&date) {
            dates.push(date);
        }
    }
    dates
}

#[cfg(test)]
mod tests {
    use super::*;
    fn annotation(header: &str, value: &str) -> Annotation {
        Annotation {
            header: header.into(),
            value: value.into(),
            line_num: 1,
        }
    }
    #[test]
    fn recent_birth_years_are_removed_before_serialization() {
        let dates = extract(
            &[
                annotation("Birth", "2001-03-20"),
                annotation("Death", "2020-04-01"),
            ],
            2026,
        );
        let json = serde_json::to_string(&dates).unwrap();
        assert!(!json.contains("2001"));
        assert!(json.contains("Born 20 Mar"));
        assert!(json.contains("Died 1 Apr 2020"));
        assert!(dates[0].year_redacted);
    }
    #[test]
    fn cutoff_is_inclusive_and_moves_each_year() {
        assert_eq!(
            extract(&[annotation("Birth", "1950")], 2026)[0].label,
            "Born 1950"
        );
        assert_eq!(
            extract(&[annotation("Birth", "1951")], 2026)[0].label,
            "Born year private"
        );
        assert_eq!(
            extract(&[annotation("Birth", "1951")], 2027)[0].label,
            "Born 1951"
        );
    }
    #[test]
    fn partial_uncertain_and_repeated_dates_preserve_privacy() {
        for value in [
            "circa 2002",
            "1999?",
            "1950 or 1952",
            "1940–1960",
            "1996 (3/1; day/month order uncertain)",
        ] {
            validate_value(value, true).unwrap();
            assert_eq!(
                extract(&[annotation("Birth", value)], 2026)[0].label,
                "Born year private"
            );
        }
        assert_eq!(
            extract(&[annotation("Birth", "2000-06")], 2026)[0].label,
            "Born Jun"
        );
        assert_eq!(
            extract(&[annotation("Birth", "--02-29")], 2026)[0].label,
            "Born 29 Feb"
        );
        assert_eq!(
            extract(&[annotation("Birth", "1889? or 1892–1893")], 2026)[0].label,
            "Born 1889? or 1892–1893"
        );
        let dates = extract(
            &[annotation("Birth", "1950"), annotation("birth", "1952")],
            2026,
        );
        assert_eq!(dates.len(), 1);
        assert_eq!(dates[0].label, "Born year private");
    }
    #[test]
    fn malformed_births_cannot_bypass_redaction() {
        for value in [
            "79-03-20",
            "born March 20 79",
            "2000-13-01",
            "1900-02-29",
            "--02-30",
            "",
        ] {
            assert!(validate_value(value, true).is_err(), "{value}");
        }
        validate_value("2000-02-29", true).unwrap();
    }
}
