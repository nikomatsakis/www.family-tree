use std::path::Path;

use serde::Serialize;

use crate::{
    citations::{Citation, CitationSources},
    genea::{Genea, Partnership, Person},
    json_api::{Datum, Ref, Response, ToManyRelationship, ToOneRelationship},
};

pub fn generate(genea: &Genea, genea_path: &Path, output_path: impl AsRef<Path>) -> anyhow::Result<()> {
    let sources = CitationSources::load(genea_path)?;
    let output_path = output_path.as_ref();

    if output_path.exists() {
        if !output_path.is_dir() {
            anyhow::bail!("path `{}` is not a directory", output_path.display());
        }
        std::fs::remove_dir_all(output_path)?;
    }

    let gen = JsonGen::new(genea, &sources);

    gen.root_response()
        .write_to(&output_path.join("roots").with_extension("json"))?;

    Ok(())
}

struct JsonGen<'a> {
    genea: &'a Genea,
    sources: &'a CitationSources,
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
    fn new(genea: &'a Genea, sources: &'a CitationSources) -> Self {
        Self { genea, sources }
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
                citations: self.sources.extract(&person_data.private_comments),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generation_uses_configuration_beside_input_and_validates_before_overwriting() {
        let directory = std::env::temp_dir().join(format!(
            "family-tree-citation-config-{}-{}",
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let input = directory.join("example.genea");
        std::fs::write(&input, " 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Example Person\\Public comment;ARCHIVE:7;private detail\n").unwrap();
        let genea = Genea::from_genea_doc(&input).unwrap();
        let config = directory.join("reference-material.json");
        let output = directory.join("output");
        std::fs::write(&config, r#"{"sources":{"archive":{"pattern":"ARCHIVE:(?P<page>[0-9]+)"}}}"#).unwrap();
        generate(&genea, &input, &output).unwrap();
        let read_output = || std::fs::read_to_string(output.join("roots.json")).unwrap();
        let saved = read_output();
        let json: serde_json::Value = serde_json::from_str(&saved).unwrap();
        assert_eq!(json["included"][0]["attributes"]["citations"], serde_json::json!([
            {"kind":"pdf","source":"archive","page":7}
        ]));
        assert!(!saved.contains("private detail"));

        std::fs::write(&config, r#"{"sources":{"archive":{"pattern":"["}}}"#).unwrap();
        assert!(generate(&genea, &input, &output).is_err());
        assert_eq!(read_output(), saved);

        std::fs::remove_file(&config).unwrap();
        generate(&genea, &input, &output).unwrap();
        let json: serde_json::Value = serde_json::from_str(&read_output()).unwrap();
        assert_eq!(json["included"][0]["attributes"]["citations"], serde_json::json!([]));
        std::fs::remove_dir_all(directory).unwrap();
    }
}
