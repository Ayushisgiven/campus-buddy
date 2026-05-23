from django.urls import path
from .views import signup_view, login_view, forgot_password_view, request_otp_view, user_count_view, delete_account_view

urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('forgot-password/', forgot_password_view, name='forgot_password'),
    path('request-otp/', request_otp_view, name='request_otp'),
    path('user-count/', user_count_view, name='user_count'),
    path('delete-account/', delete_account_view, name='delete_account'),
]