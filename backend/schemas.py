"""pydantic schemas for the rag engine api"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class FileUploadResponse(BaseModel):
    """response schema for file upload"""
    id: str
    object: str
    bytes: int
    created_at: int
    filename: str
    purpose: str
    sample_type: str
    num_lines: int
    mimetype: str
    source: str
    signature: str


class FileRetrieveResponse(BaseModel):
    """response schema for file retrieval"""
    id: str
    object: str
    bytes: int
    created_at: int
    filename: str
    purpose: str
    sample_type: str
    num_lines: int
    mimetype: str
    source: str
    signature: str
    deleted: bool


class SignedUrlResponse(BaseModel):
    """response schema for signed url"""
    url: str


class OCRPage(BaseModel):
    """schema for a single ocr page"""
    index: int
    markdown: str
    image_base64: Optional[str] = None


class OCRProcessResponse(BaseModel):
    """response schema for ocr processing"""
    pages: List[OCRPage]


class OCRQueryRequest(BaseModel):
    """request schema for ocr query"""
    file_id: str = Field(..., description="id of the uploaded file")
    include_image_base64: bool = Field(default=False, description="include base64 encoded images")


class FileListResponse(BaseModel):
    """response schema for listing files"""
    files: List[FileRetrieveResponse]
    total: int


class DeleteFileResponse(BaseModel):
    """response schema for file deletion"""
    id: str
    deleted: bool
    message: str


class ErrorResponse(BaseModel):
    """error response schema"""
    error: str
    detail: Optional[str] = None


# q&a schemas

class DocumentQARequest(BaseModel):
    """request schema for document q&a"""
    file_id: str = Field(..., description="id of the uploaded file")
    question: str = Field(..., description="question to ask about the document")
    model: str = Field(default="mistral-small-latest", description="mistral model to use")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(
        default=None, 
        description="optional conversation history for context"
    )


class DocumentQAResponse(BaseModel):
    """response schema for document q&a"""
    answer: str
    model: str
    usage: Dict[str, int]
    file_id: str
    question: str


class ConversationMessage(BaseModel):
    """schema for a conversation message"""
    role: str = Field(..., description="role of the message sender (user/assistant)")
    content: str = Field(..., description="content of the message")


class DocumentConversationRequest(BaseModel):
    """request schema for document conversation with history"""
    file_id: str = Field(..., description="id of the uploaded file")
    messages: List[ConversationMessage] = Field(..., description="conversation messages")
    model: str = Field(default="mistral-small-latest", description="mistral model to use")


class DocumentConversationResponse(BaseModel):
    """response schema for document conversation"""
    answer: str
    model: str
    usage: Dict[str, int]
    file_id: str
    conversation_length: int


