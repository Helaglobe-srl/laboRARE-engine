"""mistral api service for ocr and q&a operations"""

import os
import io
from typing import BinaryIO, Optional, List, Dict, Any
from mistralai import Mistral
from dotenv import load_dotenv

load_dotenv()


class MistralService:
    """service class for mistral ocr and q&a api operations"""
    
    def __init__(self, api_key: Optional[str] = None):
        """initialize the mistral service
        
        args:
            api_key: mistral api key, if none will use env variable
        """
        self.api_key = api_key or os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            raise ValueError("mistral_api_key not found in environment variables")
        
        self.client = Mistral(api_key=self.api_key)
    
    # file management operations
    
    def upload_file(self, file_content, filename: str):
        """upload a pdf file to mistral cloud
        
        args:
            file_content: file handle from open("file", "rb") - must be BufferedReader
            filename: name of the file
            
        returns:
            upload response object
        
        note:
            the mistral sdk requires a real file handle (BufferedReader)
            from open("file", "rb"), not BytesIO or raw bytes.
            the caller should handle temporary file creation if needed.
        """
        # ensure we're at the beginning of the file
        if hasattr(file_content, 'seek'):
            file_content.seek(0)
        
        uploaded_pdf = self.client.files.upload(
            file={
                "file_name": filename,
                "content": file_content,
            },
            purpose="ocr"
        )
        return uploaded_pdf
    
    def retrieve_file(self, file_id: str):
        """retrieve file metadata by id
        
        args:
            file_id: id of the uploaded file
            
        returns:
            file metadata object
        """
        retrieved_file = self.client.files.retrieve(file_id=file_id)
        return retrieved_file
    
    def get_signed_url(self, file_id: str, expiry_hours: Optional[int] = None):
        """get signed url for accessing the file
        
        args:
            file_id: id of the uploaded file
            expiry_hours: optional expiry time in hours
            
        returns:
            signed url object
        """
        if expiry_hours:
            signed_url = self.client.files.get_signed_url(
                file_id=file_id,
                expiry=expiry_hours
            )
        else:
            signed_url = self.client.files.get_signed_url(file_id=file_id)
        return signed_url
    
    def list_files(self):
        """list all uploaded files
        
        returns:
            list of file objects
        """
        files = self.client.files.list()
        return files
    
    def delete_file(self, file_id: str):
        """delete a file by id
        
        args:
            file_id: id of the file to delete
            
        returns:
            deletion response
        """
        response = self.client.files.delete(file_id=file_id)
        return response
    
    # ocr operations
    
    def process_ocr(self, document_url: str, include_image_base64: bool = False):
        """process ocr on a document
        
        args:
            document_url: signed url of the document
            include_image_base64: whether to include base64 encoded images
            
        returns:
            ocr response with pages and markdown
        """
        ocr_response = self.client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": document_url,
            },
            include_image_base64=include_image_base64
        )
        return ocr_response
    
    # q&a operations
    
    def query_document(
        self, 
        file_id: str, 
        question: str, 
        model: str = "mistral-small-latest",
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ):
        """query a document using natural language q&a
        
        args:
            file_id: id of the uploaded file
            question: the question to ask about the document
            model: mistral model to use for q&a
            conversation_history: optional conversation history for context
            
        returns:
            chat completion response with the answer
        """
        # get signed url for the document
        signed_url = self.get_signed_url(file_id)
        
        # build messages array
        messages = []
        
        # add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # add current question with document url
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": question
                },
                {
                    "type": "document_url",
                    "document_url": signed_url.url
                }
            ]
        })
        
        # get chat completion
        chat_response = self.client.chat.complete(
            model=model,
            messages=messages
        )
        
        return chat_response
    
    def query_document_streaming(
        self, 
        file_id: str, 
        question: str, 
        model: str = "mistral-small-latest",
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ):
        """query a document using natural language q&a with streaming response
        
        args:
            file_id: id of the uploaded file
            question: the question to ask about the document
            model: mistral model to use for q&a
            conversation_history: optional conversation history for context
            
        returns:
            streaming chat completion response
        """
        # get signed url for the document
        signed_url = self.get_signed_url(file_id)
        
        # build messages array
        messages = []
        
        # add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # add current question with document url
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": question
                },
                {
                    "type": "document_url",
                    "document_url": signed_url.url
                }
            ]
        })
        
        # get streaming chat completion
        stream_response = self.client.chat.stream(
            model=model,
            messages=messages
        )
        
        return stream_response

