package tools

import (
	"encoding/json"
	"net/http"
	"sync"
)

var (
	registry = make(map[string]ToolFunc)
	regMu    sync.RWMutex
)

func RegisterTool(name string, fn ToolFunc) {
	regMu.Lock()
	defer regMu.Unlock()
	registry[name] = fn
}

func RunTool(name string, payload map[string]interface{}) ToolResult {
	regMu.RLock()
	fn, ok := registry[name]
	regMu.RUnlock()

	if !ok {
		return ToolResult{Success: false, Error: "Tool not found"}
	}
	return fn(payload)
}

func HandleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	toolName := r.URL.Query().Get("tool_name")
	if toolName == "" {
		http.Error(w, "Missing tool_name parameter", http.StatusBadRequest)
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		payload = make(map[string]interface{})
	}

	result := RunTool(toolName, payload)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
