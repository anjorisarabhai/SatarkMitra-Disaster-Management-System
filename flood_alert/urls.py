from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Add this line:
    path('', include('flood_alert.urls')), 
]

from django.urls import path
from .views import predict_flood_risk
urlpatterns = [ path('api/predict/', predict_flood_risk) ]