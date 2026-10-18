"""
Pydantic schemas for Farmer Authentication & Profiles.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class FarmerRegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Farmer email address", examples=["baldev@kisaan.in"])
    phone: Optional[str] = Field(None, description="Mobile number for SMS/WhatsApp advisories", examples=["+919876543210"])
    full_name: str = Field(..., description="Farmer full name", examples=["Baldev Singh"])
    password: str = Field(..., min_length=6, description="Account password (min 6 chars)", examples=["kisan123"])
    preferred_language: str = Field("hi", description="Language preference: 'hi', 'en', 'pa', 'mr'", examples=["hi"])


class FarmerLoginRequest(BaseModel):
    email: str = Field(..., description="Farmer email or mobile phone", examples=["baldev@kisaan.in"])
    password: str = Field(..., description="Account password", examples=["kisan123"])


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    email: str
    preferred_language: str


class FarmerUserResponse(BaseModel):
    id: int
    email: str
    phone: Optional[str] = None
    full_name: str
    preferred_language: str
    is_active: bool
