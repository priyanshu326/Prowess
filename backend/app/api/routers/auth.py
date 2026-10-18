"""
Farmer Authentication Router.
Provides registration, login, and JWT token issuance.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db.models import User
from ...schemas.auth import (
    FarmerRegisterRequest,
    FarmerLoginRequest,
    AuthTokenResponse,
    FarmerUserResponse,
)
from ...auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Farmer Authentication"])


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farmer",
    description="Registers a new farmer account and returns a signed JWT access token.",
)
def register_farmer(
    payload: FarmerRegisterRequest,
    db: Session = Depends(get_db),
):
    # Check if email or phone already registered
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A farmer account with this email is already registered.",
        )
    if payload.phone:
        existing_phone = db.query(User).filter(User.phone == payload.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A farmer account with this mobile number is already registered.",
            )

    new_user = User(
        email=payload.email.lower().strip(),
        phone=payload.phone.strip() if payload.phone else None,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        preferred_language=payload.preferred_language,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        preferred_language=new_user.preferred_language,
    )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Authenticate a farmer",
    description="Logs in with email/phone and password, returning a JWT token for authorized field operations.",
)
def login_farmer(
    payload: FarmerLoginRequest,
    db: Session = Depends(get_db),
):
    login_id = payload.email.strip().lower()
    user = (
        db.query(User)
        .filter((User.email == login_id) | (User.phone == payload.email.strip()))
        .first()
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/phone and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This farmer account has been disabled.",
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        preferred_language=user.preferred_language,
    )


@router.get(
    "/me",
    response_model=FarmerUserResponse,
    summary="Get current farmer profile",
)
def get_current_farmer_profile(
    current_user: User = Depends(get_current_user),
):
    return FarmerUserResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        preferred_language=current_user.preferred_language,
        is_active=current_user.is_active,
    )
