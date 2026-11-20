from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token
from app.models.entities import User, Teacher
from app.schemas.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if req.role == "admin":
        if req.username == "admin" and req.password == "admin":
            token = create_access_token(subject="admin", role="admin")
            return {
                "access_token": token,
                "token_type": "bearer",
                "portal": "admin",
                "user": {"username": "admin", "role": "admin", "name": "Institutional Administrator"}
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid admin credentials (use admin / admin)")

    elif req.role == "teacher":
        if not req.teacher_id:
            raise HTTPException(status_code=400, detail="Teacher ID is required")
        teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        if req.password != teacher.password:
            raise HTTPException(status_code=400, detail=f"Invalid password. Hint: {teacher.dept.lower()}123")
        
        token = create_access_token(subject=teacher.id, role="teacher")
        return {
            "access_token": token,
            "token_type": "bearer",
            "portal": "teacher",
            "teacher_id": teacher.id,
            "user": {
                "id": teacher.id,
                "name": teacher.name,
                "dept": teacher.dept,
                "role": teacher.role,
                "email": teacher.email
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid portal role")

@router.get("/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return current_user
