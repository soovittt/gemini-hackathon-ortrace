//! Common DTOs used across the API

use serde::Serialize;

/// Standard API success response
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: T,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data,
        }
    }
}

/// Paginated response wrapper
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

impl<T: Serialize> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: i64, page: i32, per_page: i32) -> Self {
        let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;
        Self {
            items,
            total,
            page,
            per_page,
            total_pages,
        }
    }
}

/// Simple message response
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message: String,
}

impl MessageResponse {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_response_success_sets_flag() {
        let resp = ApiResponse::success("hello");
        assert!(resp.success);
        assert_eq!(resp.data, "hello");
    }

    #[test]
    fn api_response_serialization() {
        let resp = ApiResponse::success("data");
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["success"], true);
        assert_eq!(json["data"], "data");
    }

    #[test]
    fn paginated_response_total_pages_exact() {
        let resp = PaginatedResponse::new(vec![1, 2, 3], 30, 1, 10);
        assert_eq!(resp.total_pages, 3);
        assert_eq!(resp.total, 30);
        assert_eq!(resp.page, 1);
        assert_eq!(resp.per_page, 10);
        assert_eq!(resp.items.len(), 3);
    }

    #[test]
    fn paginated_response_total_pages_rounds_up() {
        let resp = PaginatedResponse::<i32>::new(vec![], 25, 1, 10);
        assert_eq!(resp.total_pages, 3); // 25/10 = 2.5 -> ceil = 3
    }

    #[test]
    fn paginated_response_empty() {
        let resp = PaginatedResponse::<i32>::new(vec![], 0, 1, 20);
        assert_eq!(resp.total_pages, 0);
        assert_eq!(resp.total, 0);
        assert!(resp.items.is_empty());
    }

    #[test]
    fn paginated_response_serialization() {
        let resp = PaginatedResponse::new(vec!["a", "b"], 10, 2, 5);
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["total"], 10);
        assert_eq!(json["page"], 2);
        assert_eq!(json["per_page"], 5);
        assert_eq!(json["total_pages"], 2);
        assert_eq!(json["items"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn message_response_new() {
        let msg = MessageResponse::new("Session deleted");
        assert_eq!(msg.message, "Session deleted");
    }

    #[test]
    fn message_response_from_string() {
        let msg = MessageResponse::new(String::from("Done"));
        assert_eq!(msg.message, "Done");
    }

    #[test]
    fn message_response_serialization() {
        let msg = MessageResponse::new("ok");
        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["message"], "ok");
    }
}
