//! Structs to help with generating
//! json:api (see jsonapi.org)

use std::{fmt::Display, path::Path};

use serde::Serialize;

/// A json:api response
#[derive(Serialize)]
pub struct Response {
    data: Box<dyn erased_serde::Serialize>,
    included: Vec<Datum>,
}

impl Response {
    pub fn new(datum: Datum) -> Self {
        Self {
            data: Box::new(datum),
            included: vec![],
        }
    }

    pub fn include(mut self, datums: impl IntoIterator<Item = Datum>) -> Self {
        self.included.extend(datums);
        self
    }

    /// Write the data to the given path (as json)
    pub fn write_to(self, path: &Path) -> anyhow::Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        Ok(std::fs::write(path, serde_json::to_string(&self)?)?)
    }
}

/// A json:api datum
#[derive(Serialize)]
pub struct Datum {
    /// Required field: Datum type, typically a plural
    #[serde(rename = "type")]
    type_: String,

    /// Globally unique id
    id: String,

    /// Attribute values (scalars), serializable
    attributes: Box<dyn erased_serde::Serialize>,

    /// Relationships to other entities, serializable
    /// with fields whose values are `Ref`
    relationships: Box<dyn erased_serde::Serialize>,
}

impl Datum {
    /// Create a Datum of the given `type` and `id` with given attributes, relationships
    pub fn new<A, R>(type_: impl Display, id: impl Display, attributes: A, relationships: R) -> Self
    where
        A: Serialize + 'static,
        R: Serialize + 'static,
    {
        Datum {
            type_: type_.to_string(),
            id: id.to_string(),
            attributes: Box::new(attributes),
            relationships: Box::new(relationships),
        }
    }
}

/// Ref to a datum
#[derive(Serialize)]
pub struct ToOneRelationship {
    data: Option<Ref>,
}

/// Ref to a datum
#[derive(Serialize)]
pub struct ToManyRelationship {
    data: Vec<Ref>,
}

/// Ref to a datum
#[derive(Serialize)]
pub struct Ref {
    /// Datum type
    #[serde(rename = "type")]
    type_: String,

    /// Datum unique identifier
    id: String,
}

impl Ref {
    /// Create a ref to Datum of the given `type` and `id``
    pub fn new(type_: impl Display, id: impl Display) -> Self {
        Ref {
            type_: type_.to_string(),
            id: id.to_string(),
        }
    }
}

impl FromIterator<Ref> for ToManyRelationship {
    fn from_iter<T: IntoIterator<Item = Ref>>(iter: T) -> Self {
        ToManyRelationship {
            data: iter.into_iter().collect(),
        }
    }
}

impl From<Option<Ref>> for ToOneRelationship {
    fn from(data: Option<Ref>) -> Self {
        ToOneRelationship { data }
    }
}

impl From<Ref> for ToOneRelationship {
    fn from(data: Ref) -> Self {
        ToOneRelationship { data: Some(data) }
    }
}
