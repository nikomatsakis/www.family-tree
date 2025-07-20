use family_tree::edit::{prepare_edit, PersonState};

#[test]
fn test_prepare_edit_comment_change() {
    let genea_content = r#"Maintainer URL: <mailto:example@test.com>
# Test family for edit functionality
 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Test Father\Original comment
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Test Mother\Mother's comment
 1 1 0 0 0 0 0 0 0 0 M 0 0 0         Test Child\Child's comment
"#;

    let expected_state = PersonState {
        comments: Some("Original comment".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("Updated comment".to_string()),
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-0",  // Father at position 1-0
        &expected_state,
        &updated_state,
    ).unwrap();

    // Check the exact line format
    let lines: Vec<&str> = result.updated_content.lines().collect();
    assert_eq!(lines[2], " 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Test Father\\Updated comment");
    assert_eq!(result.person_name, "Test Father");
    assert_eq!(result.line_number, 3);
}

#[test]
fn test_prepare_edit_conflict_detection() {
    let genea_content = r#"Maintainer URL: <mailto:example@test.com>
# Test family
 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Test Person\Current comment
"#;

    let expected_state = PersonState {
        comments: Some("Wrong expected comment".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("New comment".to_string()),
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-0",
        &expected_state,
        &updated_state,
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Conflicting edit"));
}

#[test]
fn test_prepare_edit_name_change() {
    let genea_content = r#"Maintainer URL: <mailto:example@test.com>
 1 0 0 0 0 0 0 0 0 0 M 0 0 0         John Doe\Test person
"#;

    let expected_state = PersonState {
        name: Some("John Doe".to_string()),
        comments: None,
    };

    let updated_state = PersonState {
        name: Some("John Smith".to_string()),
        comments: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-0",
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    assert_eq!(lines[1], " 1 0 0 0 0 0 0 0 0 0 M 0 0 0         John Smith\\Test person");
}

#[test]
fn test_prepare_edit_both_name_and_comment() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 2 1 0         Original Name\Original comment
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Spouse Name\Spouse comment
 1 1 0 0 0 0 0 0 0 0 M 0 0 0         Child One
 1 2 0 0 0 0 0 0 0 0 F 0 0 0         Child Two
"#;

    let expected_state = PersonState {
        name: Some("Original Name".to_string()),
        comments: Some("Original comment".to_string()),
    };

    let updated_state = PersonState {
        name: Some("New Name".to_string()),
        comments: Some("New comment".to_string()),
    };

    let result = prepare_edit(
        genea_content,
        "1-0",
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    assert_eq!(lines[0], " 1 0 0 0 0 0 0 0 0 0 M 2 1 0         New Name\\New comment");
}

#[test]
fn test_prepare_edit_secondary_spouse() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 0 1 0         Primary Spouse\Primary comment
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Secondary Spouse\Secondary comment
"#;

    let expected_state = PersonState {
        comments: Some("Secondary comment".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("Updated secondary".to_string()),
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-1",  // Secondary spouse at position 1-1
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    assert_eq!(lines[1], " 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Secondary Spouse\\Updated secondary");
}

#[test]
fn test_prepare_edit_multi_digit_henry() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Parent\Has one kid
 1 0 0 0 0 0 0 0 0 0 F 0 0 1         Spouse\Parent's spouse
 1 1 0 0 0 0 0 0 0 0 F 0 0 0         Child\Only child
"#;

    let expected_state = PersonState {
        comments: Some("Has one kid".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("Has many children".to_string()),
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-0",
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    // With single digit children, format should have space after M
    assert_eq!(lines[0], " 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Parent\\Has many children");
}

#[test]
fn test_prepare_edit_removes_comment() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Test Person\Remove this comment
"#;

    let expected_state = PersonState {
        comments: Some("Remove this comment".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("".to_string()),  // Empty string to remove comment
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-0",
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    // Comment should be removed, no backslash
    assert_eq!(lines[0], " 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Test Person");
}

#[test]
fn test_prepare_edit_person_not_found() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Test Person
"#;

    let expected_state = PersonState::default();
    let updated_state = PersonState::default();

    let result = prepare_edit(
        genea_content,
        "2-0",  // Non-existent person
        &expected_state,
        &updated_state,
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Person not found"));
}


#[test]
fn test_prepare_edit_deep_hierarchy() {
    let genea_content = r#" 1 0 0 0 0 0 0 0 0 0 M 1 0 0         Root
 1 1 0 0 0 0 0 0 0 0 M 1 0 0         Level 1
 1 1 1 0 0 0 0 0 0 0 M 1 0 0         Level 2
 1 1 1 1 0 0 0 0 0 0 M 0 0 0         Level 3\Deep comment
"#;

    let expected_state = PersonState {
        comments: Some("Deep comment".to_string()),
        name: None,
    };

    let updated_state = PersonState {
        comments: Some("Updated deep".to_string()),
        name: None,
    };

    let result = prepare_edit(
        genea_content,
        "1-1-1-1-0",
        &expected_state,
        &updated_state,
    ).unwrap();

    let lines: Vec<&str> = result.updated_content.lines().collect();
    assert_eq!(lines[3], " 1 1 1 1 0 0 0 0 0 0 M 0 0 0         Level 3\\Updated deep");
}