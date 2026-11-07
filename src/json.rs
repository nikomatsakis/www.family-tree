use std::path::Path;

use serde::Serialize;

use crate::{
    citations::{Citation, CitationSources},
    genea::{Genea, Partnership, Person},
    json_api::{Datum, Ref, Response, ToManyRelationship, ToOneRelationship},
};

pub fn generate(genea: &Genea, genea_path: &Path, output_path: impl AsRef<Path>) -> anyhow::Result<()> {
    let sources = CitationSources::load(genea_path)?;
    sources.validate(genea)?;
    crate::life_dates::validate(genea)?;
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
    year: i32,
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
    #[serde(rename = "lifeDates", skip_serializing_if = "Vec::is_empty")]
    life_dates: Vec<crate::life_dates::LifeDate>,
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
        Self { genea, sources, year: crate::life_dates::current_year() }
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
                citations: self.sources.extract_annotations(&person_data.annotations),
                life_dates: crate::life_dates::extract(&person_data.annotations, self.year),
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
    fn public_json_contains_only_redacted_life_date_labels() {
        let genea = Genea::from_genea_content(" 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Example Person\\Teacher\n    - Birth: 2001-03-20\n    - Death: 2020-04-01\n    - Secret: private details\n").unwrap();
        crate::life_dates::validate(&genea).unwrap();
        let sources = CitationSources::default();
        let gen = JsonGen { genea: &genea, sources: &sources, year: 2026 };
        let json = serde_json::to_value(gen.root_response()).unwrap();
        let attributes = &json["included"][0]["attributes"];
        assert_eq!(attributes["comments"], "Teacher");
        assert_eq!(attributes["lifeDates"][0]["label"], "Born 20 Mar");
        assert_eq!(attributes["lifeDates"][0]["yearRedacted"], true);
        assert_eq!(attributes["lifeDates"][1]["label"], "Died 1 Apr 2020");
        assert!(!json.to_string().contains("2001"));
        assert!(!json.to_string().contains("private details"));
    }

    #[test]
    fn annotations_export_configured_sources_without_private_text() {
        let input = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/genea/annotations.genea");
        let mut content = std::fs::read_to_string(&input).unwrap();
        content.push_str("    - Unknown: PAGE 99; do not publish\n    - Secret: PAGE 4\n");
        let genea = Genea::from_genea_content(&content).unwrap();
        let sources = CitationSources::load(&input).unwrap();
        sources.validate(&genea).unwrap();
        let response = JsonGen::new(&genea, &sources).root_response();
        let json = serde_json::to_value(response).unwrap();
        let first = &json["included"][0]["attributes"];
        assert_eq!(first["comments"], "Public comment");
        assert_eq!(first["citations"], serde_json::json!([
            {"kind":"pdf","source":"pages","page":1},
            {"kind":"pdf","source":"pages","page":2},
            {"kind":"pdf","source":"pages","page":5,"search":"Example Alias","title":"Test reference"},
            {"kind":"pdf","source":"pages","page":3},
            {"kind":"pdf","source":"pages","page":6,"title":"Test reference"}
        ]));
        assert_eq!(json["included"][1]["attributes"]["citations"], serde_json::json!([
            {"kind":"pdf","source":"pages","page":4}
        ]));
        let text = json.to_string();
        for private in ["private multiline", "example.test", "portrait", "do not publish", "annotations"] {
            assert!(!text.contains(private));
        }
    }

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

        let invalid = Genea::from_genea_content(" 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Example Person\n    - Source: missing\n").unwrap();
        let error = generate(&invalid, &input, &output).unwrap_err();
        assert!(error.to_string().contains("line 2"));
        assert_eq!(read_output(), saved);

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
