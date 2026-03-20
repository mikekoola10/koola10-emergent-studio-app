from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
from pathlib import Path
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            logger.error("EMERGENT_LLM_KEY not found in environment")
    
    async def chat(self, user_message: str, session_id: str, system_message: str = None) -> str:
        """Send a chat message and get response"""
        try:
            if system_message is None:
                system_message = """You are an AI assistant specialized in video production for KOOLA10's series.
                You help with:
                - Converting scripts into structured Option C format
                - Building Emergent video generation prompts
                - Suggesting style switches (Boondocks ↔ 4K)
                - Scene breakdown and analysis
                - Character consistency notes
                - Production workflow optimization
                
                When building Emergent prompts, include:
                - Style switch rules (Punchline → Boondocks, Reaction → 4K, etc.)
                - Camera directions
                - Magic effects and timing
                - Character details
                - Scene transitions
                """
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model("openai", "gpt-5.2")
            
            message = UserMessage(text=user_message)
            response = await chat.send_message(message)
            
            return response
        except Exception as e:
            logger.error(f"LLM chat error: {e}")
            return f"Error: {str(e)}"
    
    async def generate_master_prompt(self, script: str) -> str:
        """Generate a master Emergent prompt from a script"""
        system_message = """You are an expert at converting video scripts into comprehensive Emergent video generation prompts.
        
        Create a master prompt that includes:
        1. World description and setting
        2. Character details (appearance, personality)
        3. Style switch rules (when to use Boondocks vs 4K)
        4. Scene-by-scene breakdown with:
           - Camera directions
           - Visual style
           - Magic/special effects
           - Dialogue and action
           - Transitions
        5. Technical specifications (runtime, format, visual modes)
        
        Format the output as a complete, ready-to-use prompt for video generation.
        """
        
        return await self.chat(f"Convert this script into a master Emergent video generation prompt:\n\n{script}", "master_prompt_gen", system_message)
    
    async def format_script(self, raw_text: str) -> str:
        """Format raw text into Option C script format"""
        system_message = """You are an expert at formatting video scripts into Option C format.
        
        Option C format includes:
        - Scene headers (SCENE #: LOCATION - TIME - STYLE)
        - Camera notes
        - Style switch cues
        - Magic cues
        - Dialogue with character names
        - Action descriptions
        - AI generation notes
        
        Format the provided text into this structure.
        """
        
        return await self.chat(f"Format this into Option C script format:\n\n{raw_text}", "script_format", system_message)
    
    async def breakdown_scenes(self, script: str) -> str:
        """Break down a script into individual scenes"""
        system_message = """You are an expert at analyzing video scripts and breaking them into scenes.
        
        For each scene, identify:
        - Scene number
        - Location
        - Time of day
        - Visual style (Boondocks or 4K)
        - Key actions
        - Dialogue
        - Required assets
        
        Return as a structured JSON list.
        """
        
        return await self.chat(f"Break down this script into scenes:\n\n{script}", "scene_breakdown", system_message)

# Global instance
llm_service = LLMService()
