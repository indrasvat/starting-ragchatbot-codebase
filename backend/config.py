import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

@dataclass
class Config:
    """Configuration settings for the RAG system"""
    # AI Provider settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "anthropic")  # "anthropic" or "bedrock"
    
    # Anthropic API settings
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    
    # AWS Bedrock settings
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_PROFILE: str = os.getenv("AWS_PROFILE", "")  # For profile-based auth
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")  # For explicit creds
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    
    # Bedrock model mapping (using inference profiles for latest models)
    BEDROCK_MODELS = {
        "sonnet-4": "us.anthropic.claude-sonnet-4-20250514-v1:0",
        "opus-4.1": "us.anthropic.claude-opus-4-1-20250805-v1:0", 
        "haiku-3.5": "anthropic.claude-3-5-haiku-20241022-v1:0",  # Direct model if available
        # Fallback to working models
        "claude-v2": "anthropic.claude-v2",
        "claude-instant": "anthropic.claude-instant-v1"
    }
    BEDROCK_MODEL: str = os.getenv("BEDROCK_MODEL", "sonnet-4")
    
    # Embedding model settings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Document processing settings
    CHUNK_SIZE: int = 800       # Size of text chunks for vector storage
    CHUNK_OVERLAP: int = 100     # Characters to overlap between chunks
    MAX_RESULTS: int = 5         # Maximum search results to return
    MAX_HISTORY: int = 2         # Number of conversation messages to remember
    
    # Database paths
    CHROMA_PATH: str = "./chroma_db"  # ChromaDB storage location
    
    def get_bedrock_model_id(self) -> str:
        """Get the full Bedrock model ID"""
        return self.BEDROCK_MODELS.get(self.BEDROCK_MODEL, self.BEDROCK_MODELS["sonnet-4"])

config = Config()


