from django.urls import path
from .views import signup_view, login_view, forgot_password_view, request_otp_view

urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('forgot-password/', forgot_password_view, name='forgot_password'),
    path('request-otp/', request_otp_view, name='request_otp'),
]