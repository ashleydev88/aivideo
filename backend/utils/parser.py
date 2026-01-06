import io
import docx
from pypdf import PdfReader

def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extract text from PDF or DOCX file content.
    """
    if filename.lower().endswith('.pdf'):
        return _extract_from_pdf(file_content)
    elif filename.lower().endswith('.docx'):
        return _extract_from_docx(file_content)
    else:
        # Fallback for text files
        try:
            return file_content.decode('utf-8')
        except:
            return ""

def _extract_from_pdf(file_content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = []
        for page in reader.pages:
            text.append(page.extract_text())
        return "\n".join(text)
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def _extract_from_docx(file_content: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text)
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return ""
