"""run the fastapi server"""

import uvicorn
from backend.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    
    print(f"starting {settings.api_title} v{settings.api_version}")
    print(f"server running at http://{settings.host}:{settings.port}")
    print(f"api docs available at http://{settings.host}:{settings.port}/docs")
    
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )
