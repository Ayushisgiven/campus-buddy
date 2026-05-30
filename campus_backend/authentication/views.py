from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import resend
from django.core.cache import cache
import random
import os
import requests

resend.api_key = 're_BKakQNQ1_Q5xkoSH1vhUUimummtG5DFu9'

def is_valid_bits_email(email):
    return email and email.endswith('@wilp.bits-pilani.ac.in')


@api_view(['POST'])
def signup_view(request):
    username = request.data.get('username') # Your Roll Number
    password = request.data.get('password')
    
    if not is_valid_bits_email(username):
        return Response({"error": "Invalid domain. Only @wilp.bits-pilani.ac.in is allowed."}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({"error": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.create_user(username=username, password=password)
    return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not is_valid_bits_email(username):
        return Response({"error": "Invalid domain. Only @wilp.bits-pilani.ac.in is allowed."}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def request_otp_view(request):
    username = request.data.get('username')
    
    if not is_valid_bits_email(username):
        return Response({"error": "Invalid domain. Only @wilp.bits-pilani.ac.in is allowed."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(username=username)
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Save OTP to cache for 10 minutes
        cache.set(f"otp_{username}", otp, timeout=600)
        
        # Send OTP via Resend
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": username,
            "subject": "Campus Buddy - Password Reset OTP",
            "html": f"<p>Your password reset OTP is <strong>{otp}</strong>. It is valid for 10 minutes.</p>"
        })
        
        return Response({"message": "OTP sent successfully"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def forgot_password_view(request):
    username = request.data.get('username')
    otp = request.data.get('otp')
    new_password = request.data.get('password')
    
    cached_otp = cache.get(f"otp_{username}")
    
    if not cached_otp or cached_otp != otp:
        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=username)
        user.set_password(new_password)
        user.save()
        
        # Invalidate OTP
        cache.delete(f"otp_{username}")
        
        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def user_count_view(request):
    try:
        count = User.objects.count()
        return Response({"count": count}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def delete_account_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(username=username, password=password)
    if user:
        try:
            user.delete()
            return Response({"message": "Account deleted successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    return Response({"error": "Invalid password. Could not delete account."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def chat_view(request):
    messages = request.data.get('messages')
    if not messages:
        return Response({"error": "Messages are required."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Retrieve Mistral API key from environment, with fallback to default key
    mistral_api_key = os.environ.get('MISTRAL_API_KEY', 'HT3I3k8zRo8wox9vRAe1mfo4ONtct0C3')
    
    try:
        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            json={
                "model": "mistral-small-latest",
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 300
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {mistral_api_key}"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            return Response(response.json(), status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": f"Mistral API returned status {response.status_code}", "details": response.text},
                status=response.status_code
            )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
