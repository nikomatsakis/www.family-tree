use crate::genea::{Genea, Person};

pub struct Outline {
    roots: Vec<PersonOutline>,
}

impl Outline {
    pub fn from_genea(genea: &Genea) -> Self {
        Self {
            roots: genea
                .root_people()
                .map(|p| PersonOutline::from_person(genea, p))
                .collect(),
        }
    }

    pub fn print(&self, genea: &Genea, wr: &mut dyn std::io::Write) -> anyhow::Result<()> {
        for root in &self.roots {
            root.print(genea, wr, 0)?;
        }
        Ok(())
    }
}

pub struct PersonOutline {
    pub person: Person,
    pub partnerships: Vec<PartnershipOutline>,
}

pub struct PartnershipOutline {
    pub partner: Option<Person>,
    pub children: Vec<PersonOutline>,
}

impl PersonOutline {
    fn from_person(genea: &Genea, person: Person) -> PersonOutline {
        let person_data = &genea[person];

        PersonOutline {
            person,
            partnerships: person_data
                .parent_in
                .iter()
                .map(|&partnership| {
                    let partnership_data = &genea[partnership];
                    let partner = partnership_data.other_parent(person);
                    let children = partnership_data
                        .children
                        .iter()
                        .map(|&p| PersonOutline::from_person(genea, p))
                        .collect();
                    PartnershipOutline { partner, children }
                })
                .collect(),
        }
    }

    fn print(
        &self,
        genea: &Genea,
        wr: &mut dyn std::io::Write,
        width: usize,
    ) -> anyhow::Result<()> {
        const BLANK: &str = "";
        if self.partnerships.is_empty() {
            writeln!(wr, "{BLANK:width$}* {name}", name = genea[self.person].name,)?;
            return Ok(());
        }

        for partnership in &self.partnerships {
            match partnership.partner {
                Some(partner) => {
                    writeln!(
                        wr,
                        "{BLANK:width$}* {name} + {other_name}",
                        name = genea[self.person].name,
                        other_name = genea[partner].name
                    )?;
                }

                None => writeln!(wr, "{BLANK:width$}* {name}", name = genea[self.person].name)?,
            }

            for child in &partnership.children {
                child.print(genea, wr, width + 2)?;
            }
        }

        Ok(())
    }
}
