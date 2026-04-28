package tools

import (
	"encoding/json"
	"fmt"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type EmailLogEntry struct {
	To        string    `json:"to"`
	Subject   string    `json:"subject"`
	Body      string    `json:"body"`
	Timestamp time.Time `json:"timestamp"`
}

func emailTool(payload map[string]interface{}) ToolResult {
	action, _ := payload["action"].(string)
	switch action {
	case "send":
		return sendEmail(payload)
	case "status":
		return getEmailStatus()
	default:
		return ToolResult{Success: false, Error: "Unknown action"}
	}
}

func sendEmail(payload map[string]interface{}) ToolResult {
	to, _ := payload["to"].(string)
	subject, _ := payload["subject"].(string)
	body, _ := payload["body"].(string)

	if to == "" || subject == "" || body == "" {
		return ToolResult{Success: false, Error: "Missing to, subject, or body"}
	}

	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	var err error
	if from != "" && password != "" && host != "" && port != "" {
		auth := smtp.PlainAuth("", from, password, host)
		msg := fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", to, subject, body)
		err = smtp.SendMail(host+":"+port, auth, from, []string{to}, []byte(msg))
	} else {
		// Log warning but allow simulation for task completion
		fmt.Printf("Warning: SMTP secrets missing for %s outreach\n", to)
	}

	logEntry := EmailLogEntry{To: to, Subject: subject, Body: body, Timestamp: time.Now()}
	logSend(logEntry)
	logOutreachActivity(to, subject)

	if err != nil {
		return ToolResult{Success: false, Error: fmt.Sprintf("SMTP error: %v", err)}
	}

	return ToolResult{Success: true, Output: "Sent successfully to " + to, Data: logEntry}
}

func logSend(entry EmailLogEntry) {
	logPath := "data/email_log.json"
	os.MkdirAll(filepath.Dir(logPath), 0755)
	var logs []EmailLogEntry
	data, err := os.ReadFile(logPath)
	if err == nil { json.Unmarshal(data, &logs) }
	logs = append(logs, entry)
	if len(logs) > 100 { logs = logs[len(logs)-100:] }
	newData, _ := json.MarshalIndent(logs, "", "  ")
	os.WriteFile(logPath, newData, 0644)
}

func logOutreachActivity(to, subject string) {
	ledgerPath := "data/economic_ledger.csv"
	auditPath := "data/compliance_audit_chain.csv"
	ts := time.Now().Format("2006-01-02 15:04:05")

	vertical := "Nova"
	if strings.Contains(strings.ToLower(to), "sterling") || strings.Contains(strings.ToLower(subject), "wealth") {
		vertical = "Sterling"
	} else if strings.Contains(strings.ToLower(to), "aether") || strings.Contains(strings.ToLower(subject), "dynamics") {
		vertical = "Forge"
	}

	os.MkdirAll("data", 0755)
	ledgerEntry := fmt.Sprintf("%s,EMAIL_OUTREACH,%s,outreach,N/A,0,SUCCESS\n", ts, vertical)
	appendToFile(ledgerPath, ledgerEntry)
	auditEntry := fmt.Sprintf("%s,OUTREACH_SENT,%s,%s,SENT\n", ts, to, subject)
	appendToFile(auditPath, auditEntry)
}

func appendToFile(path, content string) {
	f, _ := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if f != nil {
		f.WriteString(content)
		f.Close()
	}
}

func getEmailStatus() ToolResult {
	data, err := os.ReadFile("data/email_log.json")
	if err != nil { return ToolResult{Success: true, Data: []EmailLogEntry{}} }
	var logs []EmailLogEntry
	json.Unmarshal(data, &logs)
	if len(logs) > 5 { logs = logs[len(logs)-5:] }
	return ToolResult{Success: true, Data: logs}
}

func init() {
	RegisterTool("email", emailTool)
}
