from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
import io
import uuid
from datetime import datetime
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Document Processing Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF using PyPDF2"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {page_num + 1} ---\n"
                    text += page_text + "\n"
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                continue
        
        return text.strip()
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

def clean_extracted_text(text: str) -> str:
    """Clean and normalize extracted text"""
    if not text:
        return ""
    
    # Basic text cleaning
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if line and not line.isdigit():  # Remove page numbers
            cleaned_lines.append(line)
    
    # Join lines and normalize whitespace
    cleaned_text = ' '.join(cleaned_lines)
    cleaned_text = ' '.join(cleaned_text.split())  # Normalize whitespace
    
    return cleaned_text

@app.get("/")
async def root():
    return {"message": "Document Processing Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/extract-pdf")
async def extract_pdf_text(file: UploadFile = File(...)):
    """Extract text from uploaded PDF file"""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Read file content
        file_content = await file.read()
        logger.info(f"Processing PDF: {file.filename} ({len(file_content)} bytes)")
        
        # Extract text
        raw_text = extract_text_from_pdf(file_content)
        
        if not raw_text or len(raw_text.strip()) < 10:
            logger.warning(f"Minimal text extracted from {file.filename}")
            return {
                "success": False,
                "filename": file.filename,
                "error": "PDF appears to be image-based or encrypted. Minimal text extracted.",
                "raw_text": raw_text,
                "text": f"[PDF Content from {file.filename}]\n\nThis PDF appears to be image-based or encrypted. Only minimal text could be extracted.",
                "word_count": 0,
                "char_count": len(raw_text) if raw_text else 0
            }
        
        # Clean the text
        cleaned_text = clean_extracted_text(raw_text)
        word_count = len(cleaned_text.split()) if cleaned_text else 0
        
        logger.info(f"Successfully extracted {word_count} words from {file.filename}")
        
        return {
            "success": True,
            "filename": file.filename,
            "text": cleaned_text,
            "raw_text": raw_text,
            "word_count": word_count,
            "char_count": len(cleaned_text),
            "estimated_tokens": len(cleaned_text) // 4,
            "processed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 