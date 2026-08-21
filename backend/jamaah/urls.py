from django.urls import path

from .views import (
    JamaahListCreateView,
    JamaahMembersView,
    JamaahRetrieveView,
    JoinRequestActionView,
    JoinRequestCreateView,
    PrayNeedActionView,
    PrayNeedListCreateView,
    PrayNeedRetrieveView,
)

urlpatterns = [
    path("", JamaahListCreateView.as_view(), name="jamaah-list"),
    path("<int:pk>/", JamaahRetrieveView.as_view(), name="jamaah-detail"),
    path("<int:pk>/members/", JamaahMembersView.as_view(), name="jamaah-members"),
    path(
        "requests/",
        JoinRequestCreateView.as_view(),
        name="join-request-create",
    ),
    path(
        "requests/<int:pk>/<str:action>/",
        JoinRequestActionView.as_view(),
        name="join-request-action",
    ),
    path(
        "pray-needs/",
        PrayNeedListCreateView.as_view(),
        name="prayneed-list",
    ),
    path(
        "pray-needs/<int:pk>/",
        PrayNeedRetrieveView.as_view(),
        name="prayneed-detail",
    ),
    path(
        "pray-needs/<int:pk>/<str:action>/",
        PrayNeedActionView.as_view(),
        name="prayneed-action",
    ),
]
