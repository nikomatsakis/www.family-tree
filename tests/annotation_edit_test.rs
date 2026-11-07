use family_tree::edit::{prepare_edit, PersonState};

#[test]
fn editing_fields_preserves_annotations_private_notes_and_line_endings() {
    let fixture = include_str!("fixtures/genea/annotations.genea");
    for content in [
        fixture.to_string(),
        fixture.replace('\n', "\r\n"),
        fixture.trim_end().to_string(),
    ] {
        let edited = prepare_edit(
            &content,
            "1",
            &PersonState::default(),
            &PersonState {
                name: Some("Renamed Person".into()),
                comments: Some("Updated comment".into()),
            },
        )
        .unwrap();
        assert_eq!(
            edited.updated_content,
            content.replacen(
                "Example Person\\Public comment",
                "Renamed Person\\Updated comment",
                1
            )
        );
        let edited_again = prepare_edit(
            &edited.updated_content,
            "1",
            &PersonState::default(),
            &PersonState {
                name: None,
                comments: Some(String::new()),
            },
        )
        .unwrap();
        assert_eq!(
            edited_again.updated_content,
            edited.updated_content.replacen("\\Updated comment", "", 1)
        );
    }
}

#[test]
fn editing_secondary_spouse_preserves_their_annotation_block() {
    let content = include_str!("fixtures/genea/annotations.genea");
    let edited = prepare_edit(
        content,
        "1--1",
        &PersonState::default(),
        &PersonState {
            name: Some("Renamed Partner".into()),
            comments: Some("Partner comment".into()),
        },
    )
    .unwrap();
    assert_eq!(
        edited.updated_content,
        content.replace("Example Partner\n", "Renamed Partner\\Partner comment\n")
    );
}

#[test]
fn edits_cannot_inject_annotation_lines_or_change_private_notes() {
    let content = include_str!("fixtures/genea/annotations.genea");
    for state in [
        PersonState {
            name: Some("Bad\n    - Secret: injected".into()),
            comments: None,
        },
        PersonState {
            name: None,
            comments: Some("Bad;injected".into()),
        },
        PersonState {
            name: None,
            comments: Some("Bad\r    - Secret: injected".into()),
        },
    ] {
        assert!(prepare_edit(content, "1", &PersonState::default(), &state).is_err());
    }
}
