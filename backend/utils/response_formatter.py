"""response formatting utilities"""

from typing import Any, Dict, List, Optional


class ResponseFormatter:
    """formatter for api responses"""
    
    @staticmethod
    def format_error(error: str, detail: Optional[str] = None, status_code: int = 500) -> Dict[str, Any]:
        """format error response
        
        args:
            error: error message
            detail: optional detailed error message
            status_code: http status code
            
        returns:
            formatted error response
        """
        response = {
            "error": error,
            "status_code": status_code
        }
        
        if detail:
            response["detail"] = detail
        
        return response
    
    @staticmethod
    def format_success(message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """format success response
        
        args:
            message: success message
            data: optional response data
            
        returns:
            formatted success response
        """
        response = {
            "success": True,
            "message": message
        }
        
        if data:
            response["data"] = data
        
        return response
    
    @staticmethod
    def format_file_metadata(file_obj: Any) -> Dict[str, Any]:
        """format file metadata response
        
        args:
            file_obj: file object from mistral api
            
        returns:
            formatted file metadata
        """
        return {
            "id": file_obj.id,
            "object": file_obj.object,
            "bytes": file_obj.bytes,
            "created_at": file_obj.created_at,
            "filename": file_obj.filename,
            "purpose": file_obj.purpose,
            "sample_type": file_obj.sample_type,
            "num_lines": file_obj.num_lines,
            "mimetype": file_obj.mimetype,
            "source": file_obj.source,
            "signature": file_obj.signature,
            "deleted": getattr(file_obj, 'deleted', False)
        }
    
    @staticmethod
    def format_ocr_pages(pages: List[Any]) -> List[Dict[str, Any]]:
        """format ocr pages response
        
        args:
            pages: list of page objects from ocr response
            
        returns:
            formatted pages list
        """
        formatted_pages = []
        
        for page in pages:
            formatted_page = {
                "index": page.index,
                "markdown": page.markdown
            }
            
            if hasattr(page, 'image_base64') and page.image_base64:
                formatted_page["image_base64"] = page.image_base64
            
            formatted_pages.append(formatted_page)
        
        return formatted_pages
    
    @staticmethod
    def format_qa_response(chat_response: Any, file_id: str, question: str) -> Dict[str, Any]:
        """format q&a response
        
        args:
            chat_response: chat completion response from mistral
            file_id: document file id
            question: original question
            
        returns:
            formatted q&a response
        """
        return {
            "answer": chat_response.choices[0].message.content,
            "model": chat_response.model,
            "usage": {
                "prompt_tokens": chat_response.usage.prompt_tokens,
                "completion_tokens": chat_response.usage.completion_tokens,
                "total_tokens": chat_response.usage.total_tokens
            },
            "file_id": file_id,
            "question": question
        }


