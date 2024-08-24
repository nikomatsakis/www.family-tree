use std::{collections::BTreeSet, path::Path};

use crate::genea::{Genea, Person};

pub fn generate(genea: &Genea, output_path: &Path) -> anyhow::Result<()> {
    std::fs::create_dir_all(output_path)?;

    if output_path.exists() && !output_path.is_dir() {
        anyhow::bail!("path `{}` is not a directory", output_path.display());
    }

    HtmlGen::new(genea, output_path).generate_root_page()?;

    for page_person in genea.people() {
        HtmlGen::new(genea, output_path).generate_page_for(page_person)?;
    }

    Ok(())
}

struct HtmlGen<'a> {
    page_person: Option<Person>,
    genea: &'a Genea,
    output_path: &'a Path,
}

impl<'a> HtmlGen<'a> {
    fn new(genea: &'a Genea, output_path: &'a Path) -> Self {
        Self {
            page_person: None,
            genea,
            output_path,
        }
    }

    fn generate_root_page(self) -> anyhow::Result<()> {
        use std::fmt::Write;

        let mut contents = String::new();
        writeln!(contents, "<body>")?;
        writeln!(contents, "<h1>Karpathos Family Tree</h1>")?;
        writeln!(contents, "<ul>")?;
        for person in self.genea.root_people() {
            self.outline_line_items(&mut contents, person)?;
        }
        writeln!(contents, "</ul>")?;
        writeln!(contents, "</body>")?;

        let path = self.output_path.join("index.html");
        std::fs::write(path, contents)?;

        Ok(())
    }

    fn generate_page_for(mut self, page_person: Person) -> anyhow::Result<()> {
        self.page_person = Some(page_person);

        let path = self
            .output_path
            .join(self.id(page_person))
            .with_extension("html");

        let mut contents = String::new();
        self.person_string(&mut contents, page_person)?;

        std::fs::write(path, contents)?;
        Ok(())
    }

    fn person_string(&self, wr: &mut dyn std::fmt::Write, person: Person) -> anyhow::Result<()> {
        let person_data = &self.genea[person];
        writeln!(wr, "<body>")?;
        writeln!(wr, "<h1>{}</h1>", person_data.name)?;
        writeln!(wr, "<p>{}</p>", person_data.comments)?;
        writeln!(wr, "<p>")?;

        writeln!(wr, "<ul>")?;
        if Some(person) == self.page_person && person_data.child_in.is_some() {
            let child_in = person_data.child_in.unwrap();
            let parents = &self.genea[child_in].parents;
            self.outline_parents(wr, person, &parents)?;
        } else {
            self.outline_line_items(wr, person)?;
        }
        writeln!(wr, "</ul>")?;

        writeln!(wr, "</p>")?;
        writeln!(wr, "</body>")?;

        Ok(())
    }

    fn outline_parents(
        &self,
        wr: &mut dyn std::fmt::Write,
        person: Person,
        parents: &BTreeSet<Person>,
    ) -> anyhow::Result<()> {
        let parent_links: Vec<String> = parents.iter().map(|p| self.person_link(*p)).collect();
        writeln!(wr, "<li> {links}", links = parent_links.join(" + "))?;
        writeln!(wr, "<ul>")?;
        self.outline_line_items(wr, person)?;
        writeln!(wr, "</ul>")?;

        Ok(())
    }

    fn outline_line_items(
        &self,
        wr: &mut dyn std::fmt::Write,
        person: Person,
    ) -> anyhow::Result<()> {
        let person_data = &self.genea[person];
        if person_data.parent_in.is_empty() {
            write!(wr, "<li> {link}", link = self.person_link(person),)?;
            return Ok(());
        }

        for &partnership in &person_data.parent_in {
            let partnership_data = &self.genea[partnership];

            write!(wr, "<li> {link}", link = self.person_link(person))?;
            if let Some(partner) = partnership_data.other_parent(person) {
                write!(
                    wr,
                    " + {partner_link}",
                    partner_link = self.person_link(partner)
                )?;
            }
            writeln!(wr, "")?;

            if !partnership_data.children.is_empty() {
                writeln!(wr, "<ul>")?;
                for &child in &partnership_data.children {
                    self.outline_line_items(wr, child)?;
                }
                writeln!(wr, "</ul>")?;
            }
        }
        Ok(())
    }

    fn person_link(&self, person: Person) -> String {
        if Some(person) == self.page_person {
            format!(r#"<b>{name}</b>"#, name = self.genea[person].name)
        } else {
            format!(
                r#"<a href="{id}.html">{name}</a>"#,
                id = self.id(person),
                name = self.genea[person].name,
            )
        }
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
