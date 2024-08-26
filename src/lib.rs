use std::{path::PathBuf, process::Command};

use genea::Genea;
use outline::Outline;
use structopt::StructOpt;

mod genea;
mod html;
mod json;
mod json_api;
mod outline;

#[derive(structopt::StructOpt)]
enum Args {
    Check {
        #[structopt(long)]
        dump: bool,
        genea_path: PathBuf,
    },

    Print {
        genea_path: PathBuf,
    },

    Json {
        genea_path: PathBuf,
        output_path: PathBuf,
    },

    Html {
        genea_path: PathBuf,
        output_path: PathBuf,
    },

    Serve {
        genea_path: PathBuf,
    },

    Build {
        genea_path: PathBuf,
    },
}

pub fn main() -> anyhow::Result<()> {
    let args: Args = Args::from_args();

    match &args {
        Args::Check {
            genea_path: path,
            dump,
        } => {
            let genea = Genea::from_genea_doc(path)?;

            if *dump {
                eprintln!("{genea:#?}")
            }
        }
        Args::Print { genea_path } => {
            let genea = Genea::from_genea_doc(genea_path)?;
            let outline = Outline::from_genea(&genea);
            outline.print(&genea, &mut std::io::stdout().lock())?;
        }
        Args::Json {
            genea_path,
            output_path,
        } => {
            let genea = Genea::from_genea_doc(genea_path)?;
            json::generate(&genea, output_path)?;
        }
        Args::Html {
            genea_path,
            output_path,
        } => {
            let genea = Genea::from_genea_doc(genea_path)?;
            html::generate(&genea, output_path)?;
        }
        Args::Serve { genea_path } => {
            let genea = Genea::from_genea_doc(genea_path)?;
            json::generate(&genea, "public/api/v1")?;
            Command::new("npm").arg("start").status()?;
        }
        Args::Build { genea_path } => {
            let genea = Genea::from_genea_doc(genea_path)?;
            json::generate(&genea, "public/api/v1")?;
            Command::new("npm").arg("run").arg("build").status()?;
        }
    }

    Ok(())
}
