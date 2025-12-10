"""file validation utilities"""

from typing import Tuple
from fastapi import UploadFile, HTTPException


class FileValidator:
    """validator for uploaded files"""
    
    @staticmethod
    def validate_pdf(file: UploadFile, max_size_mb: int = 50) -> Tuple[bool, str]:
        """validate pdf file
        
        args:
            file: uploaded file
            max_size_mb: maximum file size in mb
            
        returns:
            tuple of (is_valid, error_message)
        """
        # check file extension
        if not file.filename:
            return False, "filename is required"
        
        if not file.filename.lower().endswith('.pdf'):
            return False, "only pdf files are supported"
        
        return True, ""
    
    @staticmethod
    def validate_file_size(content: bytes, max_size_mb: int = 50) -> Tuple[bool, str]:
        """validate file size
        
        args:
            content: file content bytes
            max_size_mb: maximum file size in mb
            
        returns:
            tuple of (is_valid, error_message)
        """
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if len(content) > max_size_bytes:
            return False, f"file size exceeds {max_size_mb}mb limit"
        
        if len(content) == 0:
            return False, "file is empty"
        
        return True, ""
    
    @staticmethod
    def validate_file_id(file_id: str) -> Tuple[bool, str]:
        """validate file id format
        
        args:
            file_id: file identifier
            
        returns:
            tuple of (is_valid, error_message)
        """
        if not file_id:
            return False, "file_id is required"
        
        if not isinstance(file_id, str):
            return False, "file_id must be a string"
        
        if len(file_id) < 10:
            return False, "invalid file_id format"
        
        return True, ""


