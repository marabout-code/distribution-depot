// Role-Based Access Control (RBAC) & Permissions for Eséka Distribution

enum AppPermission {
  createOrder,
  planTour,
  executeTour,
  reconcileCashier,
  manageFleet,
  editCatalogPrices,
  manageBackups,
  activateLicense,
  viewDepotAnalytics,
  viewAllDepots,
}

class RolePermissions {
  static const Map<String, Set<AppPermission>> _roleMatrix = {
    'superadmin': {
      AppPermission.createOrder,
      AppPermission.planTour,
      AppPermission.executeTour,
      AppPermission.reconcileCashier,
      AppPermission.manageFleet,
      AppPermission.editCatalogPrices,
      AppPermission.manageBackups,
      AppPermission.activateLicense,
      AppPermission.viewDepotAnalytics,
      AppPermission.viewAllDepots,
    },
    'admin': {
      AppPermission.createOrder,
      AppPermission.planTour,
      AppPermission.executeTour,
      AppPermission.reconcileCashier,
      AppPermission.manageFleet,
      AppPermission.manageBackups,
      AppPermission.viewDepotAnalytics,
    },
    'driver': {
      AppPermission.executeTour,
    },
  };

  static bool hasPermission(String role, AppPermission permission) {
    final permissions = _roleMatrix[role.toLowerCase()];
    return permissions?.contains(permission) ?? false;
  }
}
