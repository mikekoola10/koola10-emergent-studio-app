import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv
from pathlib import Path
from typing import Optional
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class S3Storage:
    def __init__(self):
        self.access_key = os.getenv("S3_ACCESS_KEY")
        self.secret_key = os.getenv("S3_SECRET_KEY")
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL")
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "koola10-assets")
        self.region = os.getenv("S3_REGION", "us-east-1")
        
        # Only initialize if credentials are provided
        self.client = None
        if self.access_key and self.secret_key:
            try:
                self.client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    endpoint_url=self.endpoint_url if self.endpoint_url else None,
                    config=Config(signature_version='s3v4'),
                    region_name=self.region
                )
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
        else:
            logger.warning("S3 credentials not provided. Storage features will be limited.")
    
    def is_configured(self) -> bool:
        """Check if S3 is properly configured"""
        return self.client is not None
    
    async def upload_file(self, file_data: bytes, key: str, content_type: str = "application/octet-stream") -> Optional[str]:
        """Upload file to S3 and return the URL"""
        if not self.is_configured():
            logger.error("S3 not configured")
            return None
        
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_data,
                ContentType=content_type
            )
            
            # Generate URL
            if self.endpoint_url:
                url = f"{self.endpoint_url}/{self.bucket_name}/{key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
            
            logger.info(f"File uploaded successfully: {key}")
            return url
        except ClientError as e:
            logger.error(f"Failed to upload file: {e}")
            return None
    
    async def download_file(self, key: str) -> Optional[bytes]:
        """Download file from S3"""
        if not self.is_configured():
            logger.error("S3 not configured")
            return None
        
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Failed to download file: {e}")
            return None
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from S3"""
        if not self.is_configured():
            logger.error("S3 not configured")
            return False
        
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"File deleted successfully: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def generate_presigned_url(self, key: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL for temporary access"""
        if not self.is_configured():
            logger.error("S3 not configured")
            return None
        
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None

# Global instance
s3_storage = S3Storage()
