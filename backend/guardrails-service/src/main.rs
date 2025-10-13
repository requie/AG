use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::PgPool;
use std::env;
use chrono::{Utc, DateTime};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Policy {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub name: String,
    pub agent_id: Option<Uuid>,
    pub policy_type: String,
    pub rule_json: Option<serde_json::Value>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: i32,
    pub agent_id: Uuid,
    pub policy_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub input_hash: String,
    pub decision: String,
    pub latency_ms: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EvaluateRequest {
    pub agent_id: Uuid,
    pub input_text: String,
    pub context: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EvaluateResponse {
    pub decision: String,
    pub reason: String,
    pub checks_run: Vec<String>,
}

async fn evaluate_guardrails(req: web::Json<EvaluateRequest>, pool: web::Data<PgPool>) -> impl Responder {
    let start_time = Utc::now();
    let mut checks_run = Vec::new();
    let mut decision = "ALLOWED".to_string();
    let mut reason = "No issues detected.".to_string();

    // PII Detection (simple regex example)
    if req.input_text.contains("SSN") || req.input_text.contains("credit card") {
        decision = "DENIED".to_string();
        reason = "PII detected in prompt.".to_string();
        checks_run.push("PII_Detection".to_string());
    }

    // Policy lookup (simplified - in a real app, this would involve Redis caching and more complex logic)
    let policies = sqlx::query_as::<_, Policy>(
        "SELECT id, customer_id, name, agent_id, policy_type, rule_json, enabled, created_at FROM policies WHERE enabled = TRUE AND (agent_id IS NULL OR agent_id = $1)"
    )
    .bind(req.agent_id)
    .fetch_all(pool.get_ref())
    .await;

    if let Ok(policies) = policies {
        for policy in policies {
            if policy.policy_type == "custom" {
                if let Some(rule) = policy.rule_json {
                    // Very basic custom rule evaluation for MVP
                    if rule["keyword"].as_str().map_or(false, |k| req.input_text.contains(k)) {
                        decision = "DENIED".to_string();
                        reason = format!("Custom policy '{}' triggered.", policy.name);
                        checks_run.push(format!("Custom_Policy:{}", policy.name));
                        break;
                    }
                }
            }
            // Add other policy types (content_safety, prompt_injection) here for full implementation
        }
    }

    let latency_ms = (Utc::now() - start_time).num_milliseconds() as i32;

    // Log audit (simplified - policy_id will be more complex in real scenario)
    let audit_policy_id = Uuid::new_v4(); // Placeholder
    let input_hash = sha256::digest(req.input_text.as_bytes());

    sqlx::query!(
        "INSERT INTO audit_logs (agent_id, policy_id, timestamp, input_hash, decision, latency_ms) VALUES ($1, $2, $3, $4, $5, $6)",
        req.agent_id,
        audit_policy_id,
        Utc::now(),
        input_hash,
        decision,
        latency_ms
    )
    .execute(pool.get_ref())
    .await
    .expect("Failed to insert audit log");

    HttpResponse::Ok().json(EvaluateResponse {
        decision,
        reason,
        checks_run,
    })
}

async fn create_policy(policy: web::Json<Policy>, pool: web::Data<PgPool>) -> impl Responder {
    let new_policy = policy.into_inner();
    let result = sqlx::query_as::<_, Policy>(
        "INSERT INTO policies (id, customer_id, name, agent_id, policy_type, rule_json, enabled, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"
    )
    .bind(new_policy.id)
    .bind(new_policy.customer_id)
    .bind(new_policy.name)
    .bind(new_policy.agent_id)
    .bind(new_policy.policy_type)
    .bind(new_policy.rule_json)
    .bind(new_policy.enabled)
    .bind(new_policy.created_at)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(policy) => HttpResponse::Created().json(policy),
        Err(e) => HttpResponse::InternalServerError().body(format!("Failed to create policy: {}", e)),
    }
}

async fn get_policies(pool: web::Data<PgPool>) -> impl Responder {
    let policies = sqlx::query_as::<_, Policy>(
        "SELECT id, customer_id, name, agent_id, policy_type, rule_json, enabled, created_at FROM policies"
    )
    .fetch_all(pool.get_ref())
    .await;

    match policies {
        Ok(policies) => HttpResponse::Ok().json(policies),
        Err(e) => HttpResponse::InternalServerError().body(format!("Failed to fetch policies: {}", e)),
    }
}

async fn init_db_schema(pool: &PgPool) {
    sqlx::query!(
        ""
        "CREATE TABLE IF NOT EXISTS policies (
            id UUID PRIMARY KEY,
            customer_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            agent_id UUID REFERENCES agents(id),
            policy_type VARCHAR(50) NOT NULL,
            rule_json JSONB,
            enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create policies table");

    sqlx::query!(
        ""
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            agent_id UUID NOT NULL,
            policy_id UUID NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            input_hash VARCHAR(64) NOT NULL,
            decision VARCHAR(50) NOT NULL,
            latency_ms INT
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create audit_logs table");

    println!("Guardrails DB schemas initialized.");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url).await.expect("Failed to connect to Postgres.");

    init_db_schema(&pool).await;

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(web::resource("/v1/guardrails/evaluate").route(web::post().to(evaluate_guardrails)))
            .service(web::resource("/v1/policies").route(web::post().to(create_policy)))
            .service(web::resource("/v1/policies").route(web::get().to(get_policies)))
    })
    .bind(("0.0.0.0", 8081))?
    .run()
    .await
}

