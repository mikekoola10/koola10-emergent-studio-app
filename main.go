package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"koola10/tools"
)

var (
	subscriptionsFile = "data/push_subscriptions.json"
	subsMu            sync.Mutex
)

func main() {
	task := flag.String("task", "", "Run task: outreach or marketing")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	flag.Parse()

	if *task == "outreach" {
		runOutreach()
		return
	}
	if *task == "marketing" {
		printMarketing()
		return
	}

	// Ensure data directory exists
	os.MkdirAll("data", 0755)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Koola10 Go Agent Active"))
	})
	http.HandleFunc("/tools/execute", tools.HandleExecute)

	// PWA Push Endpoints
	http.HandleFunc("/push/subscribe", handleSubscribe)
	http.HandleFunc("/push/send", handlePushSend)

	log.Printf("Starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func handleSubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var sub interface{}
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, "Invalid subscription", http.StatusBadRequest)
		return
	}

	subsMu.Lock()
	defer subsMu.Unlock()

	var subs []interface{}
	data, err := os.ReadFile(subscriptionsFile)
	if err == nil {
		json.Unmarshal(data, &subs)
	}

	subs = append(subs, sub)
	newData, _ := json.MarshalIndent(subs, "", "  ")
	os.WriteFile(subscriptionsFile, newData, 0644)

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"status":"subscribed"}`))
}

func handlePushSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload struct {
		Title string `json:"title"`
		Body  string `json:"body"`
		Tag   string `json:"tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	subsMu.Lock()
	data, err := os.ReadFile(subscriptionsFile)
	subsMu.Unlock()

	var subs []interface{}
	if err == nil {
		json.Unmarshal(data, &subs)
	}

	// In a real implementation, we would use a library like 'Sheriff/webpush-go'
	// to iterate through 'subs' and send the payload via the Web Push API.
	// For now, we simulate sending to all subscribers.
	log.Printf("BROADCASTING PUSH to %d subscribers: %s - %s", len(subs), payload.Title, payload.Body)

	w.Write([]byte(fmt.Sprintf(`{"status":"sent", "subscribers_reached": %d}`, len(subs))))
}

func runOutreach() {
	files, _ := filepath.Glob("data/outreach/*.txt")
	for _, f := range files {
		content, _ := os.ReadFile(f)
		lines := strings.Split(string(content), "\n")
		if len(lines) < 3 {
			continue
		}
		to := strings.TrimPrefix(lines[0], "To: ")
		sub := strings.TrimPrefix(lines[1], "Subject: ")
		body := strings.Join(lines[2:], "\n")

		res := tools.RunTool("email", map[string]interface{}{
			"action":  "send",
			"to":      strings.TrimSpace(to),
			"subject": strings.TrimSpace(sub),
			"body":    strings.TrimSpace(body),
		})
		fmt.Printf("Processed %s: Success=%v\n", f, res.Success)
	}
}

func printMarketing() {
	files, _ := filepath.Glob("data/marketing/optimizr/*.txt")
	for _, f := range files {
		content, _ := os.ReadFile(f)
		fmt.Printf("--- %s ---\n%s\n", filepath.Base(f), string(content))
	}
}
