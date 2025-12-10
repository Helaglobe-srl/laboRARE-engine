"""unit tests for utilities"""

import pytest
from unittest.mock import Mock

from backend.utils import FileValidator, ResponseFormatter


class TestFileValidator:
    """test cases for file validator"""
    
    def test_validate_pdf_valid(self):
        """test valid pdf file"""
        mock_file = Mock()
        mock_file.filename = "test.pdf"
        
        is_valid, error = FileValidator.validate_pdf(mock_file)
        assert is_valid is True
        assert error == ""
    
    def test_validate_pdf_invalid_extension(self):
        """test invalid file extension"""
        mock_file = Mock()
        mock_file.filename = "test.txt"
        
        is_valid, error = FileValidator.validate_pdf(mock_file)
        assert is_valid is False
        assert "only pdf files are supported" in error
    
    def test_validate_pdf_no_filename(self):
        """test file without filename"""
        mock_file = Mock()
        mock_file.filename = None
        
        is_valid, error = FileValidator.validate_pdf(mock_file)
        assert is_valid is False
        assert "filename is required" in error
    
    def test_validate_file_size_valid(self):
        """test valid file size"""
        content = b"test content"
        
        is_valid, error = FileValidator.validate_file_size(content, max_size_mb=50)
        assert is_valid is True
        assert error == ""
    
    def test_validate_file_size_too_large(self):
        """test file size exceeds limit"""
        content = b"x" * (51 * 1024 * 1024)  # 51mb
        
        is_valid, error = FileValidator.validate_file_size(content, max_size_mb=50)
        assert is_valid is False
        assert "exceeds" in error
    
    def test_validate_file_size_empty(self):
        """test empty file"""
        content = b""
        
        is_valid, error = FileValidator.validate_file_size(content)
        assert is_valid is False
        assert "empty" in error
    
    def test_validate_file_id_valid(self):
        """test valid file id"""
        file_id = "a1b2c3d4e5f6g7h8i9j0"
        
        is_valid, error = FileValidator.validate_file_id(file_id)
        assert is_valid is True
        assert error == ""
    
    def test_validate_file_id_too_short(self):
        """test file id too short"""
        file_id = "short"
        
        is_valid, error = FileValidator.validate_file_id(file_id)
        assert is_valid is False
        assert "invalid" in error


class TestResponseFormatter:
    """test cases for response formatter"""
    
    def test_format_error(self):
        """test error formatting"""
        result = ResponseFormatter.format_error("test error", "detailed message", 400)
        
        assert result["error"] == "test error"
        assert result["detail"] == "detailed message"
        assert result["status_code"] == 400
    
    def test_format_success(self):
        """test success formatting"""
        result = ResponseFormatter.format_success("operation successful", {"key": "value"})
        
        assert result["success"] is True
        assert result["message"] == "operation successful"
        assert result["data"]["key"] == "value"
    
    def test_format_file_metadata(self):
        """test file metadata formatting"""
        mock_file = Mock()
        mock_file.id = "file123"
        mock_file.filename = "test.pdf"
        mock_file.bytes = 1024
        mock_file.created_at = 1234567890
        mock_file.object = "file"
        mock_file.purpose = "ocr"
        mock_file.sample_type = "ocr_input"
        mock_file.num_lines = 0
        mock_file.mimetype = "application/pdf"
        mock_file.source = "upload"
        mock_file.signature = "abc123"
        
        result = ResponseFormatter.format_file_metadata(mock_file)
        
        assert result["id"] == "file123"
        assert result["filename"] == "test.pdf"
        assert result["bytes"] == 1024
    
    def test_format_qa_response(self):
        """test q&a response formatting"""
        mock_response = Mock()
        mock_response.model = "mistral-small-latest"
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "this is the answer"
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        mock_response.usage.total_tokens = 150
        
        result = ResponseFormatter.format_qa_response(
            mock_response, 
            "file123", 
            "what is this?"
        )
        
        assert result["answer"] == "this is the answer"
        assert result["model"] == "mistral-small-latest"
        assert result["file_id"] == "file123"
        assert result["question"] == "what is this?"
        assert result["usage"]["total_tokens"] == 150


