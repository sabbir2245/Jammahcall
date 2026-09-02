from django.urls import path

from .views import (
    FavouriteDeleteView,
    FavouriteListCreateView,
    JamaahImageListCreateView,
    JamaahListCreateView,
    JamaahMembersView,
    JamaahRetrieveView,
    JoinRequestActionView,
    JoinRequestCreateView,
    OrganisedJamaahsView,
    PrayNeedActionView,
    PrayNeedListCreateView,
    PrayNeedRetrieveView,
    ReportActionView,
    ReportCreateView,
    ReportListView,
    ReviewJamaahListView,
    ReviewListCreateView,
)

urlpatterns = [
    path("", JamaahListCreateView.as_view(), name="jamaah-list"),
    path("organised/", OrganisedJamaahsView.as_view(), name="organised-jamaahs"),
    path("<int:pk>/", JamaahRetrieveView.as_view(), name="jamaah-detail"),
    path("<int:pk>/members/", JamaahMembersView.as_view(), name="jamaah-members"),
    path("<int:pk>/images/", JamaahImageListCreateView.as_view(), name="jamaah-images"),
    path("<int:pk>/reviews/", ReviewJamaahListView.as_view(), name="jamaah-reviews"),
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
    path(
        "reviews/",
        ReviewListCreateView.as_view(),
        name="review-list",
    ),
    path(
        "favourites/",
        FavouriteListCreateView.as_view(),
        name="favourite-list",
    ),
    path(
        "favourites/<int:pk>/",
        FavouriteDeleteView.as_view(),
        name="favourite-delete",
    ),
    path(
        "reports/",
        ReportCreateView.as_view(),
        name="report-create",
    ),
    path(
        "reports/list/",
        ReportListView.as_view(),
        name="report-list",
    ),
    path(
        "reports/<int:pk>/<str:action>/",
        ReportActionView.as_view(),
        name="report-action",
    ),
]
