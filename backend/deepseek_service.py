import requests
import os
from dotenv import load_dotenv
from pathlib import Path
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class DeepSeekService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com"
        
        if not self.api_key:
            logger.warning("DEEPSEEK_API_KEY not found in environment")
    
    def is_configured(self) -> bool:
        """Check if DeepSeek is configured"""
        return self.api_key is not None and self.api_key != ""
    
    async def chat(self, messages: list, model: str = "deepseek-chat", max_tokens: int = 2000) -> str:
        """Send chat completion request to DeepSeek"""
        if not self.is_configured():
            return "DeepSeek API key not configured"
        
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "max_tokens": max_tokens
            }
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
                return f"Error: {response.status_code}"
        
        except Exception as e:
            logger.error(f"DeepSeek chat error: {e}")
            return f"Error: {str(e)}"

# Global instance
deepseek_service = DeepSeekService()
