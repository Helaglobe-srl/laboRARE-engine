"""unit tests for services"""

import pytest
from unittest.mock import Mock, patch
import io

from backend.services import MistralService


class TestMistralService:
    """test cases for mistral service"""
    
    @patch('backend.services.mistral_service.Mistral')
    def test_init_with_api_key(self, mock_mistral):
        """test service initialization with api key"""
        service = MistralService(api_key="test_key")
        assert service.api_key == "test_key"
        mock_mistral.assert_called_once_with(api_key="test_key")
    
    @patch.dict('os.environ', {'MISTRAL_API_KEY': 'env_key'})
    @patch('backend.services.mistral_service.Mistral')
    def test_init_with_env_key(self, mock_mistral):
        """test service initialization with environment variable"""
        service = MistralService()
        assert service.api_key == "env_key"
    
    @patch.dict('os.environ', {}, clear=True)
    def test_init_without_key_raises_error(self):
        """test service initialization without api key raises error"""
        with pytest.raises(ValueError, match="mistral_api_key not found"):
            MistralService()
    
    @patch('backend.services.mistral_service.Mistral')
    def test_upload_file(self, mock_mistral):
        """test file upload"""
        mock_client = Mock()
        mock_mistral.return_value = mock_client
        
        service = MistralService(api_key="test_key")
        
        file_content = io.BytesIO(b"test content")
        filename = "test.pdf"
        
        service.upload_file(file_content, filename)
        
        mock_client.files.upload.assert_called_once()
    
    @patch('backend.services.mistral_service.Mistral')
    def test_retrieve_file(self, mock_mistral):
        """test file retrieval"""
        mock_client = Mock()
        mock_mistral.return_value = mock_client
        
        service = MistralService(api_key="test_key")
        
        file_id = "test_file_id"
        service.retrieve_file(file_id)
        
        mock_client.files.retrieve.assert_called_once_with(file_id=file_id)
    
    @patch('backend.services.mistral_service.Mistral')
    def test_get_signed_url(self, mock_mistral):
        """test signed url generation"""
        mock_client = Mock()
        mock_mistral.return_value = mock_client
        
        service = MistralService(api_key="test_key")
        
        file_id = "test_file_id"
        service.get_signed_url(file_id)
        
        mock_client.files.get_signed_url.assert_called_once_with(file_id=file_id)
    
    @patch('backend.services.mistral_service.Mistral')
    def test_process_ocr(self, mock_mistral):
        """test ocr processing"""
        mock_client = Mock()
        mock_mistral.return_value = mock_client
        
        service = MistralService(api_key="test_key")
        
        document_url = "https://example.com/doc.pdf"
        service.process_ocr(document_url)
        
        mock_client.ocr.process.assert_called_once()
    
    @patch('backend.services.mistral_service.Mistral')
    def test_query_document(self, mock_mistral):
        """test document query"""
        mock_client = Mock()
        mock_mistral.return_value = mock_client
        mock_client.files.get_signed_url.return_value = Mock(url="https://example.com/doc.pdf")
        
        service = MistralService(api_key="test_key")
        
        file_id = "test_file_id"
        question = "what is this document about?"
        
        service.query_document(file_id, question)
        
        mock_client.chat.complete.assert_called_once()


