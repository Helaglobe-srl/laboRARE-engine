"""fastapi backend for mistral ocr and q&a document management"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import io
import json
import tempfile
import os

from .config import get_settings
from .services import MistralService
from .utils import FileValidator, ResponseFormatter
from .schemas import (
    FileUploadResponse,
    FileRetrieveResponse,
    SignedUrlResponse,
    OCRProcessResponse,
    OCRQueryRequest,
    FileListResponse,
    DeleteFileResponse,
    ErrorResponse,
    OCRPage,
    DocumentQARequest,
    DocumentQAResponse,
    DocumentConversationRequest,
    DocumentConversationResponse,
)

# get application settings
settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version
)

# add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# initialize mistral service
try:
    mistral_service = MistralService()
except ValueError as e:
    print(f"warning: {e}")
    mistral_service = None


@app.get("/")
async def root():
    """root endpoint"""
    return {
        "message": "mistral ocr and q&a rag engine api",
        "version": "1.0.0",
        "endpoints": {
            "documents": {
                "upload": "/documents/upload",
                "list": "/documents/",
                "retrieve": "/documents/{file_id}",
                "delete": "/documents/{file_id}",
                "signed_url": "/documents/{file_id}/signed-url"
            },
            "ocr": {
                "process": "/ocr/query"
            },
            "qa": {
                "query": "/qa/query",
                "conversation": "/qa/conversation",
                "stream": "/qa/stream"
            }
        }
    }


# document management endpoints

@app.post("/documents/upload", response_model=FileUploadResponse)
async def upload_document(
    file: UploadFile = File(..., description=f"pdf file to upload (max {settings.max_file_size_mb}mb, max {settings.max_pages} pages)")
):
    """upload a pdf document to mistral cloud for ocr and q&a processing
    
    args:
        file: pdf file to upload
        
    returns:
        file metadata including id for future operations
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    # validate file type
    is_valid, error_msg = FileValidator.validate_pdf(file, settings.max_file_size_mb)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # read file content
        content = await file.read()
        
        # validate file size
        is_valid, error_msg = FileValidator.validate_file_size(content, settings.max_file_size_mb)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # the mistral sdk requires a real file handle (not BytesIO)
        # so write to a temporary file and then upload
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # upload using the temporary file
            with open(tmp_file_path, 'rb') as f:
                uploaded = mistral_service.upload_file(f, file.filename)
        finally:
            # clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
        
        # map the response - handle missing attributes gracefully
        return FileUploadResponse(
            id=uploaded.id,
            object=uploaded.object,
            bytes=getattr(uploaded, 'bytes', len(content)),  # fallback to actual content length
            created_at=uploaded.created_at,
            filename=uploaded.filename,
            purpose=uploaded.purpose,
            sample_type=getattr(uploaded, 'sample_type', 'ocr_input'),
            num_lines=getattr(uploaded, 'num_lines', 0),
            mimetype=getattr(uploaded, 'mimetype', 'application/pdf'),
            source=getattr(uploaded, 'source', 'upload'),
            signature=getattr(uploaded, 'signature', '')
        )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"failed to upload file: {str(e)}\n{traceback.format_exc()}"
        print(f"upload error: {error_detail}") 
        raise HTTPException(status_code=500, detail=f"failed to upload file: {str(e)}")


@app.get("/documents/", response_model=FileListResponse)
async def list_documents():
    """list all uploaded documents
    
    returns:
        list of all uploaded files with metadata
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        files = mistral_service.list_files()
        
        # convert to response schema
        file_list = []
        if hasattr(files, 'data'):
            for f in files.data:
                file_list.append(FileRetrieveResponse(
                    id=f.id,
                    object=f.object,
                    bytes=getattr(f, 'bytes', 0),
                    created_at=f.created_at,
                    filename=f.filename,
                    purpose=f.purpose,
                    sample_type=getattr(f, 'sample_type', 'ocr_input'),
                    num_lines=getattr(f, 'num_lines', 0),
                    mimetype=getattr(f, 'mimetype', 'application/pdf'),
                    source=getattr(f, 'source', 'upload'),
                    signature=getattr(f, 'signature', ''),
                    deleted=getattr(f, 'deleted', False)
                ))
        
        return FileListResponse(files=file_list, total=len(file_list))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to list files: {str(e)}")


@app.get("/documents/{file_id}", response_model=FileRetrieveResponse)
async def retrieve_document(file_id: str):
    """retrieve metadata for a specific document
    
    args:
        file_id: id of the document to retrieve
        
    returns:
        document metadata
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        retrieved = mistral_service.retrieve_file(file_id)
        
        return FileRetrieveResponse(
            id=retrieved.id,
            object=retrieved.object,
            bytes=getattr(retrieved, 'bytes', 0),
            created_at=retrieved.created_at,
            filename=retrieved.filename,
            purpose=retrieved.purpose,
            sample_type=getattr(retrieved, 'sample_type', 'ocr_input'),
            num_lines=getattr(retrieved, 'num_lines', 0),
            mimetype=getattr(retrieved, 'mimetype', 'application/pdf'),
            source=getattr(retrieved, 'source', 'upload'),
            signature=getattr(retrieved, 'signature', ''),
            deleted=getattr(retrieved, 'deleted', False)
        )
    
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"file not found: {str(e)}")


@app.delete("/documents/{file_id}", response_model=DeleteFileResponse)
async def delete_document(file_id: str):
    """delete a document from mistral cloud
    
    args:
        file_id: id of the document to delete
        
    returns:
        deletion confirmation
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        response = mistral_service.delete_file(file_id)
        
        return DeleteFileResponse(
            id=file_id,
            deleted=True,
            message=f"file {file_id} deleted successfully"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to delete file: {str(e)}")


@app.get("/documents/{file_id}/signed-url", response_model=SignedUrlResponse)
async def get_signed_url(
    file_id: str,
    expiry_hours: Optional[int] = Query(None, description="expiry time in hours")
):
    """get a signed url for accessing the document
    
    args:
        file_id: id of the document
        expiry_hours: optional expiry time in hours
        
    returns:
        signed url for document access
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        signed_url = mistral_service.get_signed_url(file_id, expiry_hours)
        
        return SignedUrlResponse(url=signed_url.url)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to get signed url: {str(e)}")


# ocr endpoints

@app.post("/ocr/query", response_model=OCRProcessResponse)
async def query_ocr(request: OCRQueryRequest):
    """process ocr on an uploaded document
    
    args:
        request: ocr query request with file_id and options
        
    returns:
        ocr results with markdown content for each page
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        # get signed url
        signed_url = mistral_service.get_signed_url(request.file_id)
        
        # process ocr
        ocr_response = mistral_service.process_ocr(
            signed_url.url,
            request.include_image_base64
        )
        
        # convert to response schema
        pages = []
        for page in ocr_response.pages:
            pages.append(OCRPage(
                index=page.index,
                markdown=page.markdown,
                image_base64=getattr(page, 'image_base64', None)
            ))
        
        return OCRProcessResponse(pages=pages)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to process ocr: {str(e)}")


# q&a endpoints

@app.post("/qa/query", response_model=DocumentQAResponse)
async def query_document(request: DocumentQARequest):
    """query a document using natural language q&a
    
    args:
        request: q&a request with file_id, question, and optional parameters
        
    returns:
        answer to the question based on the document content
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        # query the document
        chat_response = mistral_service.query_document(
            file_id=request.file_id,
            question=request.question,
            model=request.model,
            conversation_history=request.conversation_history
        )
        
        # extract answer from response
        answer = chat_response.choices[0].message.content
        
        return DocumentQAResponse(
            answer=answer,
            model=chat_response.model,
            usage={
                "prompt_tokens": chat_response.usage.prompt_tokens,
                "completion_tokens": chat_response.usage.completion_tokens,
                "total_tokens": chat_response.usage.total_tokens
            },
            file_id=request.file_id,
            question=request.question
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to query document: {str(e)}")


@app.post("/qa/conversation", response_model=DocumentConversationResponse)
async def query_document_conversation(request: DocumentConversationRequest):
    """query a document with conversation history
    
    args:
        request: conversation request with file_id, messages, and model
        
    returns:
        answer to the latest question with conversation context
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        # convert messages to conversation history format
        conversation_history = []
        last_user_message = None
        
        for msg in request.messages[:-1]:  # all except last
            if msg.role == "user":
                conversation_history.append({
                    "role": "user",
                    "content": msg.content
                })
            elif msg.role == "assistant":
                conversation_history.append({
                    "role": "assistant",
                    "content": msg.content
                })
        
        # get the last user message as the current question
        if request.messages:
            last_msg = request.messages[-1]
            if last_msg.role == "user":
                last_user_message = last_msg.content
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="last message must be from user"
                )
        
        if not last_user_message:
            raise HTTPException(
                status_code=400, 
                detail="no user message found"
            )
        
        # query the document with conversation history
        chat_response = mistral_service.query_document(
            file_id=request.file_id,
            question=last_user_message,
            model=request.model,
            conversation_history=conversation_history if conversation_history else None
        )
        
        # extract answer from response
        answer = chat_response.choices[0].message.content
        
        return DocumentConversationResponse(
            answer=answer,
            model=chat_response.model,
            usage={
                "prompt_tokens": chat_response.usage.prompt_tokens,
                "completion_tokens": chat_response.usage.completion_tokens,
                "total_tokens": chat_response.usage.total_tokens
            },
            file_id=request.file_id,
            conversation_length=len(request.messages)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to query document: {str(e)}")


@app.post("/qa/stream")
async def query_document_stream(request: DocumentQARequest):
    """query a document using natural language q&a with streaming response
    
    args:
        request: q&a request with file_id, question, and optional parameters
        
    returns:
        streaming response with answer chunks
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        # get streaming response
        stream = mistral_service.query_document_streaming(
            file_id=request.file_id,
            question=request.question,
            model=request.model,
            conversation_history=request.conversation_history
        )
        
        async def generate():
            """generate streaming response"""
            for chunk in stream:
                if chunk.data.choices:
                    delta = chunk.data.choices[0].delta
                    if hasattr(delta, 'content') and delta.content:
                        # send as server-sent events format
                        yield f"data: {json.dumps({'content': delta.content})}\n\n"
            
            # send completion signal
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to stream query: {str(e)}")


@app.post("/qa/conversation/stream")
async def query_document_conversation_stream(request: DocumentConversationRequest):
    """query a document with conversation history and streaming response
    
    args:
        request: conversation request with file_id, messages, and model
        
    returns:
        streaming response with answer chunks
    """
    if not mistral_service:
        raise HTTPException(status_code=500, detail="mistral service not initialized")
    
    try:
        # convert messages to conversation history format
        conversation_history = []
        last_user_message = None
        
        for msg in request.messages[:-1]:  # all except last
            if msg.role == "user":
                conversation_history.append({
                    "role": "user",
                    "content": msg.content
                })
            elif msg.role == "assistant":
                conversation_history.append({
                    "role": "assistant",
                    "content": msg.content
                })
        
        # get the last user message as the current question
        if request.messages:
            last_msg = request.messages[-1]
            if last_msg.role == "user":
                last_user_message = last_msg.content
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="last message must be from user"
                )
        
        if not last_user_message:
            raise HTTPException(
                status_code=400, 
                detail="no user message found"
            )
        
        # get streaming response
        stream = mistral_service.query_document_streaming(
            file_id=request.file_id,
            question=last_user_message,
            model=request.model,
            conversation_history=conversation_history
        )
        
        async def generate():
            """generate streaming response"""
            for chunk in stream:
                if chunk.data.choices:
                    delta = chunk.data.choices[0].delta
                    if hasattr(delta, 'content') and delta.content:
                        # send as server-sent events format
                        yield f"data: {json.dumps({'content': delta.content})}\n\n"
            
            # send completion signal
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to stream query: {str(e)}")


@app.get("/health")
async def health_check():
    """health check endpoint"""
    return {
        "status": "healthy",
        "mistral_service_initialized": mistral_service is not None
    }

