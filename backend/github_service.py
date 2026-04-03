from github import Github
import os
from dotenv import load_dotenv
from pathlib import Path
import logging
import json
from typing import Optional, Dict, List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.username = os.getenv("GITHUB_USERNAME")
        self.repo_owner = os.getenv("GITHUB_REPO_OWNER")
        self.repo_name = os.getenv("GITHUB_REPO_NAME")
        
        self.client = None
        self.repo = None
        
        if self.token and self.repo_owner and self.repo_name:
            try:
                self.client = Github(self.token)
                self.repo = self.client.get_repo(f"{self.repo_owner}/{self.repo_name}")
                logger.info(f"GitHub client initialized for repo: {self.repo_owner}/{self.repo_name}")
            except Exception as e:
                logger.error(f"Failed to initialize GitHub client: {e}")
        else:
            logger.warning("GitHub credentials not configured")
    
    def is_configured(self) -> bool:
        """Check if GitHub is properly configured"""
        return self.client is not None and self.repo is not None
    
    def push_episode_to_github(self, episode_data: dict, branch: str = "main") -> Dict:
        """Push episode data to GitHub repository"""
        if not self.is_configured():
            return {"status": "error", "message": "GitHub not configured"}
        
        try:
            episode_id = episode_data.get("id", "unknown")
            file_path = f"episodes/{episode_id}/episode.json"
            
            # Serialize episode data
            content = json.dumps(episode_data, indent=2)
            commit_message = f"Auto: Update episode {episode_id}"
            
            # Try to get existing file
            try:
                existing_file = self.repo.get_contents(file_path, ref=branch)
                sha = existing_file.sha
                # Update existing file
                result = self.repo.update_file(
                    path=file_path,
                    message=commit_message,
                    content=content,
                    branch=branch,
                    sha=sha
                )
            except Exception:
                # File doesn't exist, create new
                result = self.repo.create_file(
                    path=file_path,
                    message=commit_message,
                    content=content,
                    branch=branch
                )
            
            logger.info(f"Successfully pushed episode {episode_id} to GitHub")
            return {
                "status": "success",
                "commit_sha": result["commit"].sha,
                "file_path": file_path
            }
        
        except Exception as e:
            logger.error(f"Failed to push episode to GitHub: {e}")
            return {"status": "error", "message": str(e)}
    
    def push_script_to_github(self, episode_id: str, script_name: str, script_content: str, branch: str = "main") -> Dict:
        """Push script content to GitHub"""
        if not self.is_configured():
            return {"status": "error", "message": "GitHub not configured"}
        
        try:
            file_path = f"episodes/{episode_id}/scripts/{script_name}"
            commit_message = f"Auto: Update script {script_name} for episode {episode_id}"
            
            # Try to get existing file
            try:
                existing_file = self.repo.get_contents(file_path, ref=branch)
                sha = existing_file.sha
                result = self.repo.update_file(
                    path=file_path,
                    message=commit_message,
                    content=script_content,
                    branch=branch,
                    sha=sha
                )
            except Exception:
                result = self.repo.create_file(
                    path=file_path,
                    message=commit_message,
                    content=script_content,
                    branch=branch
                )
            
            return {"status": "success", "commit_sha": result["commit"].sha}
        
        except Exception as e:
            logger.error(f"Failed to push script to GitHub: {e}")
            return {"status": "error", "message": str(e)}
    
    def push_app_code_to_github(self, repo_url: str) -> Dict:
        """Instructions for pushing app code to GitHub"""
        if not self.is_configured():
            return {"status": "error", "message": "GitHub not configured"}
        
        return {
            "status": "info",
            "message": "Use the 'Save to GitHub' feature in Emergent to push your app code",
            "instructions": [
                "1. Click on the Emergent menu",
                "2. Select 'Save to GitHub'",
                "3. Authorize GitHub access",
                "4. Choose repository and branch",
                "5. Your app code will be pushed automatically"
            ]
        }
    
    def sync_from_github(self, episode_id: str, branch: str = "main") -> Dict:
        """Pull episode data from GitHub"""
        if not self.is_configured():
            return {"status": "error", "message": "GitHub not configured"}
        
        try:
            file_path = f"episodes/{episode_id}/episode.json"
            file_content = self.repo.get_contents(file_path, ref=branch)
            
            # Decode content
            import base64
            decoded_content = base64.b64decode(file_content.content).decode('utf-8')
            episode_data = json.loads(decoded_content)
            
            logger.info(f"Successfully synced episode {episode_id} from GitHub")
            return {
                "status": "success",
                "data": episode_data
            }
        
        except Exception as e:
            logger.error(f"Failed to sync from GitHub: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_repo_status(self) -> Dict:
        """Get GitHub repository status"""
        if not self.is_configured():
            return {
                "configured": False,
                "message": "GitHub not configured. Please add credentials to .env file."
            }
        
        try:
            # Get recent commits
            commits = list(self.repo.get_commits()[:5])
            
            return {
                "configured": True,
                "repo_name": self.repo.full_name,
                "default_branch": self.repo.default_branch,
                "recent_commits": [
                    {
                        "sha": commit.sha[:7],
                        "message": commit.commit.message,
                        "author": commit.commit.author.name,
                        "date": commit.commit.author.date.isoformat()
                    }
                    for commit in commits
                ]
            }
        
        except Exception as e:
            logger.error(f"Failed to get repo status: {e}")
            return {
                "configured": True,
                "error": str(e)
            }

# Global instance
github_service = GitHubService()
