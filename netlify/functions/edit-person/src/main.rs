// 💡: Dummy Netlify Function to test auth flow and GitHub API connectivity
// This is a separate crate that imports the main family-tree library

use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use serde_json::Value;
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

#[derive(Serialize)]
struct ApiGatewayResponse {
    #[serde(rename = "statusCode")]
    status_code: u16,
    headers: serde_json::Map<String, Value>,
    body: String,
}

// 💡: Helper function to create API Gateway response format expected by Netlify Functions
fn create_api_response(status_code: u16, response: &EditResponse) -> Value {
    let mut headers = serde_json::Map::new();
    headers.insert("Content-Type".to_string(), Value::String("application/json".to_string()));
    
    serde_json::to_value(&ApiGatewayResponse {
        status_code,
        headers,
        body: serde_json::to_string(response).unwrap_or_else(|_| "{\"error\":\"Failed to serialize response\"}".to_string()),
    }).unwrap_or_else(|_| serde_json::json!({
        "statusCode": 500,
        "headers": {"Content-Type": "application/json"},
        "body": "{\"error\":\"Critical error\"}"
    }))
}

async fn function_handler(event: LambdaEvent<Value>) -> Result<Value, Error> {
    let (payload, _context) = event.into_parts();
    
    // Parse the API Gateway request (Netlify Functions use the same format)
    let body = payload.get("body")
        .and_then(|b| b.as_str())
        .unwrap_or("");
    
    let http_method = payload.get("httpMethod")
        .and_then(|m| m.as_str())
        .unwrap_or("GET");
    
    // Only allow POST requests
    if http_method != "POST" {
        let response = EditResponse {
            success: false,
            message: "Method not allowed".to_string(),
            error: Some("Only POST requests are supported".to_string()),
        };
        return Ok(create_api_response(405, &response));
    }

    // Parse request body
    let request: EditRequest = match serde_json::from_str(body) {
        Ok(req) => req,
        Err(e) => {
            let response = EditResponse {
                success: false,
                message: "Invalid request format".to_string(),
                error: Some(format!("JSON parse error: {}", e)),
            };
            return Ok(create_api_response(400, &response));
        }
    };

    // Check if editing is enabled - requires FAMILY_TREE_EDIT_PASSWORD to be set
    // 💡: Editing requires explicit opt-in via edit password, no fallback to view password
    let correct_password = match env::var("FAMILY_TREE_EDIT_PASSWORD") {
        Ok(password) => password,
        Err(_) => {
            let response = EditResponse {
                success: false,
                message: "Edit functionality is disabled".to_string(),
                error: Some("FAMILY_TREE_EDIT_PASSWORD is not configured for this deployment".to_string()),
            };
            return Ok(create_api_response(503, &response));
        }
    };

    if request.password != correct_password {
        let response = EditResponse {
            success: false,
            message: "Authentication failed".to_string(),
            error: Some("Invalid edit password".to_string()),
        };
        return Ok(create_api_response(401, &response));
    }

    // Get GitHub token - required for edit functionality
    let github_token = match env::var("GITHUB_TOKEN") {
        Ok(token) => token,
        Err(_) => {
            let response = EditResponse {
                success: false,
                message: "Server configuration error".to_string(),
                error: Some("GITHUB_TOKEN not configured".to_string()),
            };
            return Ok(create_api_response(500, &response));
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
            let response = EditResponse {
                success: false,
                message: "Failed to initialize GitHub client".to_string(),
                error: Some(format!("Client error: {}", e)),
            };
            return Ok(create_api_response(500, &response));
        }
    };

    // Parse the edit request to determine expected and updated states
    let expected_state = match request.updates.get("expectedState") {
        Some(state) => serde_json::from_value(state.clone()).unwrap_or_default(),
        None => family_tree::edit::PersonState::default(),
    };
    
    let updated_state = match request.updates.get("updatedState") {
        Some(state) => serde_json::from_value(state.clone()).unwrap_or_default(),
        None => family_tree::edit::PersonState::default(),
    };

    // Perform the actual edit using the GitHub integration
    match family_tree::edit::edit_person_in_github(
        &octocrab,
        &github_owner,
        &github_repo,
        "genea.doc",
        &request.person_id,
        &expected_state,
        &updated_state,
        (&request.user_info.name, &request.user_info.email),
    ).await {
        Ok(result) => {
            let response = EditResponse {
                success: true,
                message: format!(
                    "Successfully updated {}! Commit: {}",
                    result.person_name, 
                    &result.commit_sha[..8] // Show first 8 chars of commit SHA
                ),
                error: None,
            };
            Ok(create_api_response(200, &response))
        }
        Err(family_tree::edit::GitHubEditError::MergeConflict { attempts }) => {
            let response = EditResponse {
                success: false,
                message: "Edit conflict detected".to_string(),
                error: Some(format!(
                    "Multiple people tried to edit simultaneously. Tried {} times but conflicts persist. Please refresh and try again.",
                    attempts
                )),
            };
            Ok(create_api_response(409, &response))
        }
        Err(family_tree::edit::GitHubEditError::ContentPreparation(e)) => {
            let response = EditResponse {
                success: false,
                message: "Edit validation failed".to_string(),
                error: Some(format!("Your edit conflicts with recent changes: {}", e)),
            };
            Ok(create_api_response(409, &response))
        }
        Err(e) => {
            let response = EditResponse {
                success: false,
                message: "Edit operation failed".to_string(),
                error: Some(format!("Error: {}", e)),
            };
            Ok(create_api_response(500, &response))
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(function_handler)).await
}