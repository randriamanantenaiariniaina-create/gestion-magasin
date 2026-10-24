from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Réservé aux administrateurs (gestion des utilisateurs, par exemple)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Tout utilisateur connecté peut LIRE (GET).
    Seul l'admin peut CRÉER, MODIFIER ou SUPPRIMER.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'admin'