use crate::genea::{Coordinates, Genea, Person, PersonData};
use anyhow::{anyhow, Context};
use serde::{Deserialize, Serialize};

/// State information for a person, used for both expected and updated states
#[derive(Clone, Debug, Deserialize, Serialize, Default)]
pub struct PersonState {
    pub comments: Option<String>,
    pub name: Option<String>,
    // Future fields: gender, etc.
}

/// Result of preparing an edit operation
#[derive(Debug)]
pub struct PreparedEdit {
    pub updated_content: String,
    pub person_name: String,
    pub line_number: usize,
}

/// Prepares an edit operation for a person in a genea.doc file.
///
/// This function takes the current genea.doc content and prepares an updated version
/// with the requested changes, while validating that the current state matches expectations
/// to prevent conflicting edits.
///
/// # Arguments
///
/// * `genea_content` - The current contents of the genea.doc file
/// * `coordinates` - Person coordinates in format "henry-number-spousal-index" (e.g., "1-2-3-0")
/// * `expected_state` - The expected current state of the person (for conflict detection)
/// * `updated_state` - The desired new state of the person
///
/// # Returns
///
/// Returns a `PreparedEdit` containing:
/// - The updated file content with the person's line modified
/// - The person's name (for logging/UI purposes)
/// - The line number that was edited
///
/// # Errors
///
/// Returns an error if:
/// - The coordinates are invalid or the person is not found
/// - The expected state doesn't match the current state (conflicting edit)
/// - The genea.doc content cannot be parsed
///
/// # Example
///
/// ```
/// use family_tree::edit::{prepare_edit, PersonState};
///
/// let content = r#"Maintainer URL: <mailto:test@example.com>
///  1 0 0 0 0 0 0 0 0 0 M 1 1 0         John Doe\Original comment
///  1 0 0 0 0 0 0 0 0 0 F 1 0 1         Jane Doe\Spouse comment
///  1 2 0 0 0 0 0 0 0 0 M 0 0 0         Child Doe\Child comment
/// "#;
///
/// let expected = PersonState {
///     comments: Some("Original comment".to_string()),
///     name: None,
/// };
/// let updated = PersonState {
///     comments: Some("New comment".to_string()),
///     name: None,
/// };
/// let result = prepare_edit(content, "1-0", &expected, &updated)?;
///
/// assert_eq!(result.person_name, "John Doe");
/// assert_eq!(result.line_number, 2);
/// assert!(result.updated_content.contains("John Doe\\New comment"));
/// # Ok::<(), anyhow::Error>(())
/// ```
///
/// 💡: This function is designed to be testable without any GitHub operations,
/// making it easy to verify edit logic with unit tests.
pub fn prepare_edit(
    genea_content: &str,
    coordinates: &str,
    expected_state: &PersonState,
    updated_state: &PersonState,
) -> anyhow::Result<PreparedEdit> {
    // Parse coordinates
    let coords = Coordinates::parse(coordinates).context("Invalid person coordinates")?;

    // Parse the genea.doc content
    let genea = Genea::from_genea_content(genea_content).context("Failed to parse genea.doc")?;

    // Find the person
    let person_id = genea
        .find_person_by_coordinates(&coords)
        .ok_or_else(|| anyhow!("Person not found with coordinates: {}", coordinates))?;

    let person_data = &genea[person_id];

    // Validate expected state matches current state
    validate_expected_state(person_data, expected_state)?;

    // Find the line number for this person
    let line_number = person_data.henry_number_span.line_num();

    // Generate the updated line
    let updated_line = generate_genea_line(person_data, &genea, person_id, updated_state)?;

    // Replace the line in the content
    let updated_content = replace_line_in_content(genea_content, line_number, &updated_line)?;

    Ok(PreparedEdit {
        updated_content,
        person_name: person_data.name.clone(),
        line_number,
    })
}

/// Validate that the expected state matches the current person data
fn validate_expected_state(
    person_data: &PersonData,
    expected_state: &PersonState,
) -> anyhow::Result<()> {
    if let Some(expected_comments) = &expected_state.comments {
        if person_data.comments != *expected_comments {
            return Err(anyhow!(
                "Conflicting edit: expected comments '{}' but found '{}'",
                expected_comments,
                person_data.comments
            ));
        }
    }

    if let Some(expected_name) = &expected_state.name {
        if person_data.name != *expected_name {
            return Err(anyhow!(
                "Conflicting edit: expected name '{}' but found '{}'",
                expected_name,
                person_data.name
            ));
        }
    }

    Ok(())
}

/// Generate a genea.doc line from PersonData
fn generate_genea_line(
    person_data: &PersonData,
    genea: &Genea,
    person_id: Person,
    updates: &PersonState,
) -> anyhow::Result<String> {
    // Use updated values if provided, otherwise keep existing
    let name = updates.name.as_ref().unwrap_or(&person_data.name);
    let comments = updates.comments.as_ref().unwrap_or(&person_data.comments);

    // Calculate counts
    let num_kids = count_children(genea, person_id);
    let num_spouses = count_spouses(genea, person_id);

    // 💡: Format henry number with fixed-width 2-character fields
    // Each component gets exactly 2 characters, right-padded with space
    let mut henry_str = String::new();
    for i in 0..10 {
        if i < person_data.henry_number.ancestry.len() {
            henry_str.push_str(&format!("{:2}", person_data.henry_number.ancestry[i]));
        } else {
            henry_str.push_str(" 0");
        }
    }

    // 💡: Format with consistent column alignment - leading space is part of henry_str already
    // The num_kids field needs to be exactly 2 characters total including gender
    // Single digit: "M 1" (gender + space + digit)
    // Double digit: "M10" (gender + two digits)
    let kids_field = if num_kids < 10 {
        format!("{} {}", person_data.gender.as_char(), num_kids)
    } else {
        format!("{}{}", person_data.gender.as_char(), num_kids)
    };
    
    let line = format!(
        "{} {} {} {}         {}{}",
        henry_str,
        kids_field,
        num_spouses,
        person_data.spousal_index.as_usize(),
        name,
        if comments.is_empty() {
            String::new()
        } else {
            format!("\\{}", comments)
        }
    );

    Ok(line)
}

/// Count the number of children for a person
/// 💡: Uses partnership relationships but filters by henry number to match parser logic
fn count_children(genea: &Genea, person_id: Person) -> usize {
    let person_data = &genea[person_id];
    let henry_number = &person_data.henry_number;

    // Only primary spouses can have children listed under their henry number
    if !person_data.is_primary_spouse() {
        return 0;
    }

    // Count children whose henry number is exactly one level deeper
    person_data
        .parent_in
        .iter()
        .flat_map(|&partnership_id| &genea[partnership_id].children)
        .filter(|&&child_id| {
            let child_data = &genea[child_id];
            if child_data.is_primary_spouse() {
                let child_hn = &child_data.henry_number;
                child_hn.ancestry.len() == henry_number.ancestry.len() + 1
                    && henry_number.is_prefix_of(child_hn)
            } else {
                false
            }
        })
        .count()
}

/// Count the number of spouses for a person
/// 💡: Counts unique partners across all partnerships (matching parser validation)
fn count_spouses(genea: &Genea, person_id: Person) -> usize {
    let person_data = &genea[person_id];

    // Secondary spouses must have 0 spouse count
    if !person_data.is_primary_spouse() {
        return 0;
    }

    // Count unique partners across all partnerships
    let unique_spouses: std::collections::BTreeSet<_> = person_data
        .parent_in
        .iter()
        .flat_map(|&partnership_id| {
            genea[partnership_id]
                .parents
                .iter()
                .filter(|&&spouse_id| spouse_id != person_id)
                .cloned()
        })
        .collect();

    unique_spouses.len()
}

/// Replace a specific line in the content
fn replace_line_in_content(
    content: &str,
    line_number: usize,
    new_line: &str,
) -> anyhow::Result<String> {
    let lines: Vec<&str> = content.lines().collect();

    // Line numbers are 1-based
    if line_number == 0 || line_number > lines.len() {
        return Err(anyhow!("Invalid line number: {}", line_number));
    }

    let mut result = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        if i + 1 == line_number {
            result.push(new_line);
        } else {
            result.push(*line);
        }
    }

    Ok(result.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coordinate_parsing() {
        // Valid coordinates
        let coords = Coordinates::parse("1-0").unwrap();
        assert_eq!(coords.to_string(), "1-0");
        
        let coords = Coordinates::parse("1-2-3-0").unwrap();
        assert_eq!(coords.to_string(), "1-2-3-0");

        let coords = Coordinates::parse("8-1-2-7-1-2-1").unwrap();
        assert_eq!(coords.to_string(), "8-1-2-7-1-2-1");
        
        let coords = Coordinates::parse("10-11-12-1").unwrap();
        assert_eq!(coords.to_string(), "10-11-12-1");

        // Invalid formats
        assert!(Coordinates::parse("1").is_err());  // Missing spousal index
        assert!(Coordinates::parse("").is_err());
        assert!(Coordinates::parse("1-a-0").is_err());
        assert!(Coordinates::parse("a-b-0").is_err());
    }
}
