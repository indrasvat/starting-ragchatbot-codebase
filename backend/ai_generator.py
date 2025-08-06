import anthropic
import boto3
import json
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

class BaseAIGenerator(ABC):
    """Abstract base class for AI generators"""
    
    # Static system prompt to avoid rebuilding on each call
    SYSTEM_PROMPT = """ You are an AI assistant specialized in course materials and educational content with access to a comprehensive search tool for course information.

Search Tool Usage:
- Use the search tool **only** for questions about specific course content or detailed educational materials
- **One search per query maximum**
- Synthesize search results into accurate, fact-based responses
- If search yields no results, state this clearly without offering alternatives

Response Protocol:
- **General knowledge questions**: Answer using existing knowledge without searching
- **Course-specific questions**: Search first, then answer
- **No meta-commentary**:
 - Provide direct answers only — no reasoning process, search explanations, or question-type analysis
 - Do not mention "based on the search results"


All responses must be:
1. **Brief, Concise and focused** - Get to the point quickly
2. **Educational** - Maintain instructional value
3. **Clear** - Use accessible language
4. **Example-supported** - Include relevant examples when they aid understanding
Provide only the direct answer to what was asked.
"""

    @abstractmethod
    def generate_response(self, query: str,
                         conversation_history: Optional[str] = None,
                         tools: Optional[List] = None,
                         tool_manager=None) -> str:
        """Generate AI response with optional tool usage and conversation context"""
        pass


class AnthropicAIGenerator(BaseAIGenerator):
    """Handles interactions with Anthropic's Claude API for generating responses"""
    
    def __init__(self, api_key: str, model: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        
        # Pre-build base API parameters
        self.base_params = {
            "model": self.model,
            "temperature": 0,
            "max_tokens": 800
        }
    
    def generate_response(self, query: str,
                         conversation_history: Optional[str] = None,
                         tools: Optional[List] = None,
                         tool_manager=None) -> str:
        """
        Generate AI response with optional tool usage and conversation context.
        
        Args:
            query: The user's question or request
            conversation_history: Previous messages for context
            tools: Available tools the AI can use
            tool_manager: Manager to execute tools
            
        Returns:
            Generated response as string
        """
        
        # Build system content efficiently - avoid string ops when possible
        system_content = (
            f"{self.SYSTEM_PROMPT}\n\nPrevious conversation:\n{conversation_history}"
            if conversation_history 
            else self.SYSTEM_PROMPT
        )
        
        # Prepare API call parameters efficiently
        api_params = {
            **self.base_params,
            "messages": [{"role": "user", "content": query}],
            "system": system_content
        }
        
        # Add tools if available
        if tools:
            api_params["tools"] = tools
            api_params["tool_choice"] = {"type": "auto"}
        
        # Get response from Claude
        response = self.client.messages.create(**api_params)
        
        # Handle tool execution if needed
        if response.stop_reason == "tool_use" and tool_manager:
            return self._handle_tool_execution(response, api_params, tool_manager)
        
        # Return direct response
        return response.content[0].text
    
    def _handle_tool_execution(self, initial_response, base_params: Dict[str, Any], tool_manager):
        """
        Handle execution of tool calls and get follow-up response.
        
        Args:
            initial_response: The response containing tool use requests
            base_params: Base API parameters
            tool_manager: Manager to execute tools
            
        Returns:
            Final response text after tool execution
        """
        # Start with existing messages
        messages = base_params["messages"].copy()
        
        # Add AI's tool use response
        messages.append({"role": "assistant", "content": initial_response.content})
        
        # Execute all tool calls and collect results
        tool_results = []
        for content_block in initial_response.content:
            if content_block.type == "tool_use":
                tool_result = tool_manager.execute_tool(
                    content_block.name, 
                    **content_block.input
                )
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": content_block.id,
                    "content": tool_result
                })
        
        # Add tool results as single message
        if tool_results:
            messages.append({"role": "user", "content": tool_results})
        
        # Prepare final API call without tools
        final_params = {
            **self.base_params,
            "messages": messages,
            "system": base_params["system"]
        }
        
        # Get final response
        final_response = self.client.messages.create(**final_params)
        return final_response.content[0].text


class BedrockAIGenerator(BaseAIGenerator):
    """Handles interactions with AWS Bedrock Claude API for generating responses"""
    
    def __init__(self, region: str, model_id: str, aws_profile: str = "", 
                 aws_access_key_id: str = "", aws_secret_access_key: str = ""):
        self.model_id = model_id
        self.region = region
        
        # Initialize boto3 session with flexible authentication
        if aws_profile:
            # Use AWS profile
            session = boto3.Session(profile_name=aws_profile)
        elif aws_access_key_id and aws_secret_access_key:
            # Use explicit credentials
            session = boto3.Session(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region
            )
        else:
            # Use default credential chain
            session = boto3.Session(region_name=region)
        
        self.bedrock = session.client('bedrock-runtime')
        
        # Base parameters for Bedrock
        self.base_params = {
            "temperature": 0,
            "max_tokens": 800
        }
    
    def generate_response(self, query: str,
                         conversation_history: Optional[str] = None,
                         tools: Optional[List] = None,
                         tool_manager=None) -> str:
        """
        Generate AI response using AWS Bedrock with optional tool usage.
        
        Args:
            query: The user's question or request
            conversation_history: Previous messages for context
            tools: Available tools the AI can use
            tool_manager: Manager to execute tools
            
        Returns:
            Generated response as string
        """
        
        # Build system content
        system_content = (
            f"{self.SYSTEM_PROMPT}\n\nPrevious conversation:\n{conversation_history}"
            if conversation_history 
            else self.SYSTEM_PROMPT
        )
        
        # Prepare messages for Bedrock format
        messages = [{"role": "user", "content": query}]
        
        # Prepare the request body
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "system": system_content,
            "messages": messages,
            **self.base_params
        }
        
        # Add tools if available
        if tools:
            request_body["tools"] = tools
            request_body["tool_choice"] = {"type": "auto"}
        
        # Make the API call
        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=json.dumps(request_body),
            contentType='application/json'
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        
        # Handle tool execution if needed
        if response_body.get("stop_reason") == "tool_use" and tool_manager:
            return self._handle_bedrock_tool_execution(response_body, request_body, tool_manager)
        
        # Return direct response
        return response_body["content"][0]["text"]
    
    def _handle_bedrock_tool_execution(self, initial_response: Dict, base_request: Dict, tool_manager):
        """
        Handle execution of tool calls for Bedrock API.
        
        Args:
            initial_response: The response containing tool use requests
            base_request: Base request parameters
            tool_manager: Manager to execute tools
            
        Returns:
            Final response text after tool execution
        """
        # Start with existing messages
        messages = base_request["messages"].copy()
        
        # Add AI's tool use response
        messages.append({
            "role": "assistant", 
            "content": initial_response["content"]
        })
        
        # Execute all tool calls and collect results
        tool_results = []
        for content_block in initial_response["content"]:
            if content_block.get("type") == "tool_use":
                tool_result = tool_manager.execute_tool(
                    content_block["name"], 
                    **content_block["input"]
                )
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": content_block["id"],
                    "content": tool_result
                })
        
        # Add tool results as single message
        if tool_results:
            messages.append({"role": "user", "content": tool_results})
        
        # Prepare final request without tools
        final_request = {
            **base_request,
            "messages": messages
        }
        # Remove tools from final request
        final_request.pop("tools", None)
        final_request.pop("tool_choice", None)
        
        # Make final API call
        final_response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=json.dumps(final_request),
            contentType='application/json'
        )
        
        # Parse and return response
        final_response_body = json.loads(final_response['body'].read())
        return final_response_body["content"][0]["text"]


# Factory function for creating AI generators
def create_ai_generator(config) -> BaseAIGenerator:
    """
    Factory function to create the appropriate AI generator based on configuration.
    
    Args:
        config: Configuration object containing provider settings
        
    Returns:
        BaseAIGenerator instance
    """
    if config.AI_PROVIDER.lower() == "bedrock":
        return BedrockAIGenerator(
            region=config.AWS_REGION,
            model_id=config.get_bedrock_model_id(),
            aws_profile=config.AWS_PROFILE,
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
        )
    else:
        # Default to Anthropic
        return AnthropicAIGenerator(
            api_key=config.ANTHROPIC_API_KEY,
            model=config.ANTHROPIC_MODEL
        )


# Maintain backward compatibility
AIGenerator = AnthropicAIGenerator