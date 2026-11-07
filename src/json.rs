use std::path::Path;

use serde::Serialize;

use crate::{
    genea::{Genea, Partnership, Person},
    json_api::{Datum, Ref, Response, ToManyRelationship, ToOneRelationship},
};

pub fn generate(genea: &Genea, output_path: impl AsRef<Path>) -> anyhow::Result<()> {
    let output_path = output_path.as_ref();

    if output_path.exists() {
        if !output_path.is_dir() {
            anyhow::bail!("path `{}` is not a directory", output_path.display());
        }
        std::fs::remove_dir_all(output_path)?;
    }

    let gen = JsonGen::new(genea);

    gen.root_response()
        .write_to(&output_path.join("roots").with_extension("json"))?;

    Ok(())
}

struct JsonGen<'a> {
    genea: &'a Genea,
}

#[derive(Serialize)]
struct RootAttributes {
    #[serde(rename = "maintainerLink")]
    maintainer_link: Option<String>,
}

#[derive(Serialize)]
struct RootRelationships {
    #[serde(rename = "rootPeople")]
    root_people: ToManyRelationship,
}

#[derive(Serialize)]
struct PersonAttributes {
    name: String,
    comments: String,
    gender: String,
    citations: Vec<Citation>,
    #[serde(rename = "isSpouse")]
    is_spouse: bool,
}

#[derive(Serialize)]
struct PersonRelationships {
    #[serde(rename = "parentIn")]
    parent_in: ToManyRelationship,
    #[serde(rename = "childIn")]
    child_in: ToOneRelationship,
}

#[derive(Serialize)]
struct PartnershipRelationships {
    parents: ToManyRelationship,
    children: ToManyRelationship,
}

impl<'a> JsonGen<'a> {
    fn new(genea: &'a Genea) -> Self {
        Self { genea }
    }

    fn root_response(&self) -> Response {
        Response::new(self.root_datum()).include(self.all_datums())
    }


    fn root_datum(&self) -> Datum {
        Datum::new(
            "root",
            0,
            RootAttributes {
                maintainer_link: self.genea.maintainer_link().clone(),
            },
            RootRelationships {
                root_people: self
                    .genea
                    .root_people()
                    .map(|p| self.person_ref(p))
                    .collect(),
            },
        )
    }

    fn all_datums(&self) -> impl Iterator<Item = Datum> + '_ {
        self.genea
            .people()
            .map(|p| self.person_datum(p))
            .chain(self.genea.partnerships().map(|p| self.partnership_datum(p)))
    }

    fn person_datum(&self, person: Person) -> Datum {
        let person_data = &self.genea[person];
        Datum::new(
            "person",
            self.id(person),
            PersonAttributes {
                name: person_data.name.to_string(),
                comments: person_data.comments.clone(),
                gender: person_data.gender.to_string(),
                citations: page_citations(&person_data.private_comments),
                is_spouse: person_data.spousal_index.is_secondary(),
            },
            PersonRelationships {
                parent_in: person_data
                    .parent_in
                    .iter()
                    .map(|&r| self.partnership_ref(r))
                    .collect(),
                child_in: person_data.child_in.map(|r| self.partnership_ref(r)).into(),
            },
        )
    }

    fn person_ref(&self, person: Person) -> Ref {
        Ref::new("person", self.id(person))
    }

    fn partnership_datum(&self, partnership: Partnership) -> Datum {
        let partnership_data = &self.genea[partnership];
        Datum::new(
            "partnership",
            partnership.as_usize(),
            (),
            PartnershipRelationships {
                parents: partnership_data
                    .parents
                    .iter()
                    .map(|&p| self.person_ref(p))
                    .collect(),
                children: partnership_data
                    .children
                    .iter()
                    .map(|&p| self.person_ref(p))
                    .collect(),
            },
        )
    }

    fn partnership_ref(&self, partnership: Partnership) -> Ref {
        Ref::new("partnership", partnership.as_usize())
    }

    fn id(&self, person: Person) -> String {
        let person_data = &self.genea[person];
        if person_data.spousal_index.is_primary() {
            person_data.henry_number().to_string()
        } else {
            // Secondary spouse: use henry_number--spousal_index format
            format!("{}--{}", person_data.henry_number(), person_data.spousal_index.as_usize())
        }
    }
}

#[derive(Serialize)]
struct Citation {
    kind: &'static str,
    source: &'static str,
    page: u32,
}

// Only export explicit PAGE references: the surrounding notes remain private.
fn page_citations(notes: &str) -> Vec<Citation> {
    let pattern = regex::Regex::new(r"\bPAGE\s+(\d+(?:\s*,\s*\d+)*)\b").unwrap();
    let mut pages = Vec::new();
    for reference in pattern.captures_iter(notes) {
        for value in reference[1].split(',') {
            if let Ok(page) = value.trim().parse::<u32>() {
                if page > 0 && !pages.contains(&page) {
                    pages.push(page);
                }
            }
        }
    }
    pages.into_iter().map(|page| Citation { kind: "pdf", source: "pages", page }).collect()
}

#[cfg(test)]
mod citation_tests {
    use super::*;

    #[test]
    fn extracts_only_explicit_positive_pages_without_private_notes() {
        let citations = page_citations("private detail;PAGE 19, 27; PAGE 19; PAGE 0; PAGE 999999999999");
        let json = serde_json::to_value(citations).unwrap();
        assert_eq!(json, serde_json::json!([
            {"kind": "pdf", "source": "pages", "page": 19},
            {"kind": "pdf", "source": "pages", "page": 27}
        ]));
        assert!(page_citations("private detail on page 5").is_empty());
    }
}
