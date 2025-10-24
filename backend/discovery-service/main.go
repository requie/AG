package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

type Agent struct {
	ID           uuid.UUID  `json:"id"`
	CustomerID   uuid.UUID  `json:"customer_id"`
	Name         string     `json:"name"`
	OwnerEmail   string     `json:"owner_email"`
	ConnectorType string     `json:"connector_type"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	LastActive   *time.Time `json:"last_active"`
}

var db *sql.DB

func initDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Successfully connected to PostgreSQL!")

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS agents (
		id UUID PRIMARY KEY,
		customer_id UUID NOT NULL,
		name VARCHAR(255) NOT NULL,
		owner_email VARCHAR(255),
		connector_type VARCHAR(50) NOT NULL,
		status VARCHAR(50) DEFAULT 'unclaimed',
		created_at TIMESTAMPTZ DEFAULT NOW(),
		last_active TIMESTAMPTZ
	);
	`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatalf("Error creating agents table: %v", err)
	}
	log.Println("Agents table ensured.")
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" || apiKey != os.Getenv("API_KEY") {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func registerAgent(w http.ResponseWriter, r *http.Request) {
	var agent Agent
	_ = json.NewDecoder(r.Body).Decode(&agent)

	agent.ID = uuid.New()
	agent.CreatedAt = time.Now()
	agent.Status = "unclaimed"

	// For MVP, customer_id can be a fixed UUID or generated, assuming single tenant for now.
	// In a real scenario, this would come from auth context.
	agent.CustomerID = uuid.New()

	insertSQL := `INSERT INTO agents (id, customer_id, name, owner_email, connector_type, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := db.Exec(insertSQL, agent.ID, agent.CustomerID, agent.Name, agent.OwnerEmail, agent.ConnectorType, agent.Status, agent.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(agent)
}

func getAgents(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, customer_id, name, owner_email, connector_type, status, created_at, last_active FROM agents`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var agents []Agent
	for rows.Next() {
		var agent Agent
		var lastActive sql.NullTime
		err := rows.Scan(&agent.ID, &agent.CustomerID, &agent.Name, &agent.OwnerEmail, &agent.ConnectorType, &agent.Status, &agent.CreatedAt, &lastActive)
		if err != nil {
			log.Printf("Error scanning agent: %v", err)
			continue
		}
		if lastActive.Valid {
			agent.LastActive = &lastActive.Time
		}
		agents = append(agents, agent)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(agents)
}

func claimAgent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	agentIDStr := vars["id"]

	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		http.Error(w, "Invalid agent ID", http.StatusBadRequest)
		return
	}

	var requestBody struct {
		UserID string `json:"user_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&requestBody)

	if requestBody.UserID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	updateSQL := `UPDATE agents SET status = $1, owner_email = $2 WHERE id = $3 RETURNING id, customer_id, name, owner_email, connector_type, status, created_at, last_active`
	row := db.QueryRow(updateSQL, "claimed", requestBody.UserID, agentID)

	var agent Agent
	var lastActive sql.NullTime
		err = row.Scan(&agent.ID, &agent.CustomerID, &agent.Name, &agent.OwnerEmail, &agent.ConnectorType, &agent.Status, &agent.CreatedAt, &lastActive)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Agent not found", http.StatusNotFound)
			} else {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
			return
		}
		if lastActive.Valid {
			agent.LastActive = &lastActive.Time
		}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(agent)
}

func main() {
	initDB()

	r := mux.NewRouter()

	r.HandleFunc("/v1/agents", authMiddleware(registerAgent)).Methods("POST")
	r.HandleFunc("/v1/agents", authMiddleware(getAgents)).Methods("GET")
	r.HandleFunc("/v1/agents/{id}/claim", authMiddleware(claimAgent)).Methods("POST")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Discovery Service listening on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

