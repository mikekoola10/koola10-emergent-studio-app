package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"koola10/tools"
)

func main() {
	task := flag.String("task", "", "Run task: outreach or marketing")
	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	flag.Parse()

	if *task == "outreach" {
		runOutreach()
		return
	}
	if *task == "marketing" {
		printMarketing()
		return
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Koola10 Go Agent Active"))
	})
	http.HandleFunc("/tools/execute", tools.HandleExecute)

	log.Printf("Starting server on :%s", port)
	http.ListenAndServe(":"+port, nil)
}

func runOutreach() {
	files, _ := filepath.Glob("data/outreach/*.txt")
	for _, f := range files {
		content, _ := os.ReadFile(f)
		lines := strings.Split(string(content), "\n")
		if len(lines) < 3 { continue }
		to := strings.TrimPrefix(lines[0], "To: ")
		sub := strings.TrimPrefix(lines[1], "Subject: ")
		body := strings.Join(lines[2:], "\n")

		res := tools.RunTool("email", map[string]interface{}{
			"action": "send",
			"to": strings.TrimSpace(to),
			"subject": strings.TrimSpace(sub),
			"body": strings.TrimSpace(body),
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
