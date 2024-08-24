use std::path::Path;

use serde::Serialize;

use crate::{
    genea::{Genea, Partnership, Person},
    json_api::{Datum, Ref, Response, ToManyRelationship, ToOneRelationship},
};

pub fn generate(genea: &Genea, output_path: impl AsRef<Path>) -> anyhow::Result<()> {
    let output_path = output_path.as_ref();

    if output_path.exists() && !output_path.is_dir() {
        anyhow::bail!("path `{}` is not a directory", output_path.display());
    }

    let gen = JsonGen::new(genea);

    gen.root_response().write_to(&output_path.join("roots"))?;

    for person in genea.people() {
        gen.person_response(person)
            .write_to(&output_path.join("people").join(gen.id(person)))?;
    }

    for partnership in genea.partnerships() {
        gen.partnership_response(partnership).write_to(
            &output_path
                .join("partnerships")
                .join(partnership.as_usize().to_string()),
        )?;
    }

    Ok(())
}

struct JsonGen<'a> {
    genea: &'a Genea,
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
        Response::new(self.root_datum())
    }

    fn person_response(&self, person: Person) -> Response {
        Response::new(self.person_datum(person))
    }

    fn partnership_response(&self, partnership: Partnership) -> Response {
        Response::new(self.partnership_datum(partnership))
    }

    fn root_datum(&self) -> Datum {
        Datum::new(
            "root",
            0,
            (),
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
        match &person_data.henry_number {
            Some(hn) => hn.to_string(),
            None => {
                assert_eq!(person_data.parent_in.len(), 1);
                let parent_in = *person_data.parent_in.first().unwrap();
                let partner = self.genea[parent_in].other_parent(person).unwrap();
                let hn = self.genea[partner].henry_number().unwrap();
                let spousal_index = self.genea[partner]
                    .parent_in
                    .iter()
                    .position(|p| *p == parent_in)
                    .unwrap();
                format!("{hn}--{spousal_index}")
            }
        }
    }
}
