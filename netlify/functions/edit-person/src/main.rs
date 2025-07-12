// 💡: Dummy Netlify Function to test auth flow and GitHub API connectivity
// This is a separate crate that imports the main family-tree library

use lambda_web::{is_running_on_lambda, launch, LambdaError};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Deserialize)]
struct EditRequest {
    #[serde(rename = "personId")]
    person_id: String,
    updates: serde_json::Value,
    password: String,
    #[serde(rename = "userInfo")]
    user_info: UserInfo,
}

#[derive(Deserialize)]
struct UserInfo {
    name: String,
    email: String,
}

#[derive(Serialize)]
struct EditResponse {
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

async fn function_handler(event: lambda_web::Request) -> Result<impl lambda_web::IntoResponse, LambdaError> {
    // Only allow POST requests
    if event.method() != "POST" {
        return Ok(EditResponse {
            success: false,
            message: "Method not allowed".to_string(),
            error: Some("Only POST requests are supported".to_string()),
        });
    }

    // Parse request body
    let body = event.body();
    let request: EditRequest = match serde_json::from_slice(body) {
        Ok(req) => req,
        Err(e) => {
            return Ok(EditResponse {
                success: false,
                message: "Invalid request format".to_string(),
                error: Some(format!("JSON parse error: {}", e)),
            });
        }
    };

    // Verify password
    let correct_password = env::var("FAMILY_TREE_PASSWORD").unwrap_or_default();

    if request.password != correct_password {
        return Ok(EditResponse {
            success: false,
            message: "Authentication failed".to_string(),
            error: Some("Invalid password".to_string()),
        });
    }

    // Test GitHub API connectivity
    let github_token = match env::var("GITHUB_TOKEN") {
        Ok(token) => token,
        Err(_) => {
            return Ok(EditResponse {
                success: false,
                message: "Server configuration error".to_string(),
                error: Some("GITHUB_TOKEN not configured".to_string()),
            });
        }
    };

    let github_owner = env::var("GITHUB_OWNER").unwrap_or_else(|_| "nikomatsakis".to_string());
    let github_repo = env::var("GITHUB_REPO").unwrap_or_else(|_| "www.family-tree".to_string());

    // 💡: Simple GitHub API test - just fetch repo info to verify connectivity
    let octocrab = match octocrab::OctocrabBuilder::new()
        .personal_token(github_token)
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            return Ok(EditResponse {
                success: false,
                message: "Failed to initialize GitHub client".to_string(),
                error: Some(format!("Client error: {}", e)),
            });
        }
    };

    // Test GitHub API connectivity by fetching repo info
    match octocrab.repos(&github_owner, &github_repo).get().await {
        Ok(_repo) => {
            // 💡: For now, just return success without actually editing anything
            // In the real implementation, this is where we'd:
            // 1. Fetch genea.doc content via octocrab.repos().get_content()
            // 2. Call family_tree::edit_person() to update the data
            // 3. Commit changes back via octocrab.repos().create_file()
            Ok(EditResponse {
                success: true,
                message: format!(
                    "Dummy edit successful! Would update person {} (requested by {} <{}>)",
                    request.person_id, request.user_info.name, request.user_info.email
                ),
                error: None,
            })
        }
        Err(e) => Ok(EditResponse {
            success: false,
            message: "GitHub API error".to_string(),
            error: Some(format!("GitHub error: {}", e)),
        }),
    }
}

#[tokio::main]
async fn main() -> Result<(), LambdaError> {
    if is_running_on_lambda() {
        // Running on Netlify
        launch(function_handler).await
    } else {
        // Running locally for testing
        println!("Edit person function - running locally for testing");
        println!("In production, this would be a Netlify Function");
        Ok(())
    }
}