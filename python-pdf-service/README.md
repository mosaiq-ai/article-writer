# Python PDF Processing Service

A reliable FastAPI service for extracting text from PDF files, designed to work with the Article Writer application.

## Why Python?

The Node.js PDF processing libraries (`pdf-parse`, `pdfjs-dist`) have compatibility issues with Next.js server environments:
- `pdf-parse` tries to access non-existent test files
- `pdfjs-dist` requires DOM APIs that aren't available in Node.js

Python has mature, reliable PDF processing libraries that work great in server environments.

## Features

- ✅ Reliable PDF text extraction using PyPDF2
- ✅ Page-by-page processing with error handling
- ✅ Text cleaning and normalization
- ✅ CORS support for Next.js integration
- ✅ Comprehensive error handling and logging
- ✅ Health check endpoint

## Quick Start

### Option 1: Using the startup script (Recommended)

```bash
cd python-pdf-service
./start.sh
```

This will:
1. Create a Python virtual environment
2. Install dependencies
3. Start the FastAPI service on http://localhost:8000

### Option 2: Manual setup

```bash
cd python-pdf-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the service
python main.py
```

## API Endpoints

### POST /extract-pdf
Extract text from a PDF file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (PDF file)

**Response:**
```json
{
  "success": true,
  "filename": "document.pdf",
  "text": "Extracted and cleaned text content...",
  "raw_text": "Raw extracted text with page markers...",
  "word_count": 1234,
  "char_count": 5678,
  "estimated_tokens": 1419,
  "processed_at": "2025-01-28T10:30:00"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:30:00"
}
```

## Integration with Next.js

The Next.js upload API (`/api/documents/upload`) automatically uses this Python service for PDF processing when it's running on http://localhost:8000.

You can customize the service URL by setting the environment variable:
```bash
PYTHON_PDF_SERVICE_URL=http://localhost:8000
```

## Testing

Test the service directly:

```bash
# Health check
curl http://localhost:8000/health

# Test PDF extraction
curl -X POST -F "file=@your-document.pdf" http://localhost:8000/extract-pdf
```

## Dependencies

- **FastAPI**: Modern, fast web framework for building APIs
- **PyPDF2**: Reliable PDF text extraction library
- **uvicorn**: ASGI server for running FastAPI
- **python-multipart**: For handling file uploads

## Troubleshooting

### Service won't start
- Ensure Python 3.7+ is installed
- Check that port 8000 is available
- Verify virtual environment is activated

### PDF extraction fails
- Check if PDF is encrypted or password-protected
- Verify PDF contains extractable text (not just images)
- Check service logs for detailed error messages

### CORS issues
- Ensure your Next.js app is running on an allowed origin
- Check the CORS configuration in `main.py`

## Logs

The service provides detailed logging:
- INFO: Successful operations and processing stats
- WARNING: Minimal text extraction or recoverable errors
- ERROR: Failed operations with detailed error messages

## Production Deployment

For production, consider:
1. Using a production ASGI server like Gunicorn
2. Adding authentication/authorization
3. Implementing rate limiting
4. Adding monitoring and health checks
5. Using environment variables for configuration 