// Models for Eséka Distribution (Cameroon, FCFA / XAF)

enum VehicleType {
  truck5T,
  pickup,
  tricycle,
}

extension VehicleTypeExt on VehicleType {
  String get label {
    switch (this) {
      case VehicleType.truck5T:
        return 'Camion 5 Tonnes';
      case VehicleType.pickup:
        return 'Pickup 4x4';
      case VehicleType.tricycle:
        return 'Tricycle Cargo';
    }
  }

  int get defaultCapacityCrates {
    switch (this) {
      case VehicleType.truck5T:
        return 280;
      case VehicleType.pickup:
        return 90;
      case VehicleType.tricycle:
        return 40;
    }
  }
}

class Product {
  final String id;
  final String name;
  final String category;
  final int crateCapacity; // e.g. 12 or 24 bottles per crate
  final int liquidPrice; // FCFA for liquid only
  final int crateDepositPrice; // e.g. 1500 FCFA for plastic crate
  final int bottleDepositPrice; // e.g. 125 FCFA per empty glass
  final int totalCratePrice; // liquidPrice + crateDepositPrice + (crateCapacity * bottleDepositPrice) if consignée
  final String sku;

  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.crateCapacity,
    required this.liquidPrice,
    required this.crateDepositPrice,
    required this.bottleDepositPrice,
    required this.totalCratePrice,
    required this.sku,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String? ?? 'Boisson',
        crateCapacity: json['crateCapacity'] as int? ?? 12,
        liquidPrice: json['liquidPrice'] as int? ?? 6500,
        crateDepositPrice: json['crateDepositPrice'] as int? ?? 1500,
        bottleDepositPrice: json['bottleDepositPrice'] as int? ?? 125,
        totalCratePrice: json['totalCratePrice'] as int? ?? 8000,
        sku: json['sku'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'crateCapacity': crateCapacity,
        'liquidPrice': liquidPrice,
        'crateDepositPrice': crateDepositPrice,
        'bottleDepositPrice': bottleDepositPrice,
        'totalCratePrice': totalCratePrice,
        'sku': sku,
      };
}

class Customer {
  final String id;
  final String name;
  final String type; // 'BAR' | 'CAVE' | 'BOUTIQUE'
  final String ownerName;
  final String phone;
  final String quarter; // Quartier in Eséka
  final int emptyCratesBalance; // Negative = owes empties to depot

  const Customer({
    required this.id,
    required this.name,
    required this.type,
    required this.ownerName,
    required this.phone,
    required this.quarter,
    this.emptyCratesBalance = 0,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String? ?? 'BAR',
        ownerName: json['ownerName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        quarter: json['quarter'] as String? ?? 'Eséka Centre',
        emptyCratesBalance: json['emptyCratesBalance'] as int? ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'ownerName': ownerName,
        'phone': phone,
        'quarter': quarter,
        'emptyCratesBalance': emptyCratesBalance,
      };
}

class OrderItem {
  final String productId;
  final String productName;
  final int quantityCrates; // Ordered full crates
  final int unitLiquidPrice; // FCFA
  final int unitDepositPrice; // FCFA (consigne)
  final bool chargeDeposit; // whether customer provides empty exchange on delivery

  const OrderItem({
    required this.productId,
    required this.productName,
    required this.quantityCrates,
    required this.unitLiquidPrice,
    required this.unitDepositPrice,
    this.chargeDeposit = false,
  });

  int get liquidTotal => quantityCrates * unitLiquidPrice;
  int get depositTotal => chargeDeposit ? quantityCrates * unitDepositPrice : 0;
  int get lineTotal => liquidTotal + depositTotal;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        productId: json['productId'] as String,
        productName: json['productName'] as String,
        quantityCrates: json['quantityCrates'] as int,
        unitLiquidPrice: json['unitLiquidPrice'] as int,
        unitDepositPrice: json['unitDepositPrice'] as int,
        chargeDeposit: json['chargeDeposit'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'productName': productName,
        'quantityCrates': quantityCrates,
        'unitLiquidPrice': unitLiquidPrice,
        'unitDepositPrice': unitDepositPrice,
        'chargeDeposit': chargeDeposit,
      };
}

enum OrderStatus { pending, planned, inDelivery, delivered, cancelled }

class Order {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String quarter;
  final String depositId;
  final List<OrderItem> items;
  final int totalLiquidAmount; // FCFA
  final int totalDepositAmount; // FCFA
  final int totalAmount; // FCFA
  final int totalCrates;
  final OrderStatus status;
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.quarter,
    required this.depositId,
    required this.items,
    required this.totalLiquidAmount,
    required this.totalDepositAmount,
    required this.totalAmount,
    required this.totalCrates,
    required this.status,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        customerId: json['customerId'] as String,
        customerName: json['customerName'] as String,
        customerPhone: json['customerPhone'] as String? ?? '',
        quarter: json['quarter'] as String? ?? '',
        depositId: json['depositId'] as String? ?? 'depot_eseka_centre',
        items: (json['items'] as List<dynamic>)
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalLiquidAmount: json['totalLiquidAmount'] as int,
        totalDepositAmount: json['totalDepositAmount'] as int,
        totalAmount: json['totalAmount'] as int,
        totalCrates: json['totalCrates'] as int,
        status: OrderStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => OrderStatus.pending,
        ),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'customerId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'quarter': quarter,
        'depositId': depositId,
        'items': items.map((i) => i.toJson()).toList(),
        'totalLiquidAmount': totalLiquidAmount,
        'totalDepositAmount': totalDepositAmount,
        'totalAmount': totalAmount,
        'totalCrates': totalCrates,
        'status': status.name,
        'createdAt': createdAt.toIso8601String(),
      };
}

enum DeliveryResultStatus {
  pending,
  delivered100,
  partial,
  failed,
}

enum PaymentMethod {
  cash,
  mtnMomo,
  orangeMoney,
}

extension PaymentMethodExt on PaymentMethod {
  String get label {
    switch (this) {
      case PaymentMethod.cash:
        return 'Espèces (Cash)';
      case PaymentMethod.mtnMomo:
        return 'MTN Mobile Money';
      case PaymentMethod.orangeMoney:
        return 'Orange Money';
    }
  }
}

class DeliveryStop {
  final int stopOrder; // 1, 2, 3...
  final String orderId;
  final String customerName;
  final String customerPhone;
  final String quarter;
  final int expectedCrates;
  final int expectedAmount; // FCFA
  final DeliveryResultStatus status;
  final int deliveredCrates;
  final int emptyCratesCollected; // Casiers vides récupérés
  final PaymentMethod? paymentMethod;
  final int amountCollected; // FCFA
  final String? mobileMoneyTxRef;
  final String? failureReason;
  final DateTime? completedAt;

  const DeliveryStop({
    required this.stopOrder,
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.quarter,
    required this.expectedCrates,
    required this.expectedAmount,
    this.status = DeliveryResultStatus.pending,
    this.deliveredCrates = 0,
    this.emptyCratesCollected = 0,
    this.paymentMethod,
    this.amountCollected = 0,
    this.mobileMoneyTxRef,
    this.failureReason,
    this.completedAt,
  });

  DeliveryStop copyWith({
    DeliveryResultStatus? status,
    int? deliveredCrates,
    int? emptyCratesCollected,
    PaymentMethod? paymentMethod,
    int? amountCollected,
    String? mobileMoneyTxRef,
    String? failureReason,
    DateTime? completedAt,
  }) {
    return DeliveryStop(
      stopOrder: stopOrder,
      orderId: orderId,
      customerName: customerName,
      customerPhone: customerPhone,
      quarter: quarter,
      expectedCrates: expectedCrates,
      expectedAmount: expectedAmount,
      status: status ?? this.status,
      deliveredCrates: deliveredCrates ?? this.deliveredCrates,
      emptyCratesCollected: emptyCratesCollected ?? this.emptyCratesCollected,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      amountCollected: amountCollected ?? this.amountCollected,
      mobileMoneyTxRef: mobileMoneyTxRef ?? this.mobileMoneyTxRef,
      failureReason: failureReason ?? this.failureReason,
      completedAt: completedAt ?? this.completedAt,
    );
  }

  factory DeliveryStop.fromJson(Map<String, dynamic> json) => DeliveryStop(
        stopOrder: json['stopOrder'] as int,
        orderId: json['orderId'] as String,
        customerName: json['customerName'] as String,
        customerPhone: json['customerPhone'] as String? ?? '',
        quarter: json['quarter'] as String? ?? '',
        expectedCrates: json['expectedCrates'] as int,
        expectedAmount: json['expectedAmount'] as int,
        status: DeliveryResultStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => DeliveryResultStatus.pending,
        ),
        deliveredCrates: json['deliveredCrates'] as int? ?? 0,
        emptyCratesCollected: json['emptyCratesCollected'] as int? ?? 0,
        paymentMethod: json['paymentMethod'] != null
            ? PaymentMethod.values.firstWhere((p) => p.name == json['paymentMethod'])
            : null,
        amountCollected: json['amountCollected'] as int? ?? 0,
        mobileMoneyTxRef: json['mobileMoneyTxRef'] as String?,
        failureReason: json['failureReason'] as String?,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'stopOrder': stopOrder,
        'orderId': orderId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'quarter': quarter,
        'expectedCrates': expectedCrates,
        'expectedAmount': expectedAmount,
        'status': status.name,
        'deliveredCrates': deliveredCrates,
        'emptyCratesCollected': emptyCratesCollected,
        'paymentMethod': paymentMethod?.name,
        'amountCollected': amountCollected,
        'mobileMoneyTxRef': mobileMoneyTxRef,
        'failureReason': failureReason,
        'completedAt': completedAt?.toIso8601String(),
      };
}

enum TourStatus {
  planned,
  inProgress,
  closed,
  reconciled,
}

class Tour {
  final String id;
  final String tourNumber; // e.g. "TR-2024-ESK-01"
  final String depositId;
  final String driverId;
  final String driverName;
  final String vehicleId;
  final String vehicleName;
  final VehicleType vehicleType;
  final List<DeliveryStop> stops;
  final TourStatus status;
  final int totalLoadedCrates;
  final DateTime startedAt;
  final DateTime? closedAt;
  final CashierReconciliation? reconciliation;

  const Tour({
    required this.id,
    required this.tourNumber,
    required this.depositId,
    required this.driverId,
    required this.driverName,
    required this.vehicleId,
    required this.vehicleName,
    required this.vehicleType,
    required this.stops,
    required this.status,
    required this.totalLoadedCrates,
    required this.startedAt,
    this.closedAt,
    this.reconciliation,
  });

  int get totalExpectedAmount => stops.fold(0, (sum, s) => sum + s.expectedAmount);
  int get totalCollectedAmount => stops.fold(0, (sum, s) => sum + s.amountCollected);
  int get totalDeliveredCrates => stops.fold(0, (sum, s) => sum + s.deliveredCrates);
  int get totalEmptiesReturned => stops.fold(0, (sum, s) => sum + s.emptyCratesCollected);

  factory Tour.fromJson(Map<String, dynamic> json) => Tour(
        id: json['id'] as String,
        tourNumber: json['tourNumber'] as String,
        depositId: json['depositId'] as String,
        driverId: json['driverId'] as String,
        driverName: json['driverName'] as String,
        vehicleId: json['vehicleId'] as String,
        vehicleName: json['vehicleName'] as String,
        vehicleType: VehicleType.values.firstWhere(
          (v) => v.name == json['vehicleType'],
          orElse: () => VehicleType.truck5T,
        ),
        stops: (json['stops'] as List<dynamic>)
            .map((s) => DeliveryStop.fromJson(s as Map<String, dynamic>))
            .toList(),
        status: TourStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => TourStatus.planned,
        ),
        totalLoadedCrates: json['totalLoadedCrates'] as int,
        startedAt: DateTime.parse(json['startedAt'] as String),
        closedAt: json['closedAt'] != null ? DateTime.parse(json['closedAt'] as String) : null,
        reconciliation: json['reconciliation'] != null
            ? CashierReconciliation.fromJson(json['reconciliation'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'tourNumber': tourNumber,
        'depositId': depositId,
        'driverId': driverId,
        'driverName': driverName,
        'vehicleId': vehicleId,
        'vehicleName': vehicleName,
        'vehicleType': vehicleType.name,
        'stops': stops.map((s) => s.toJson()).toList(),
        'status': status.name,
        'totalLoadedCrates': totalLoadedCrates,
        'startedAt': startedAt.toIso8601String(),
        'closedAt': closedAt?.toIso8601String(),
        'reconciliation': reconciliation?.toJson(),
      };
}

class CashierReconciliation {
  final int totalCashHandedOver; // FCFA remises en espèces par le chauffeur
  final int totalMtnMomo; // FCFA reçues sur compte MoMo du dépôt
  final int totalOrangeMoney; // FCFA reçues sur compte OM du dépôt
  final int emptyCratesReturnedToDepot; // Casiers vides physiquement retournés
  final int fullCratesReturnedUnsold; // Casiers pleins non vendus (échecs)
  final int cashDiscrepancy; // Écart de caisse (0 = parfait, négatif = manquant)
  final int cratesDiscrepancy; // Écart d'emballage
  final String cashierUserId;
  final String cashierName;
  final DateTime reconciledAt;

  const CashierReconciliation({
    required this.totalCashHandedOver,
    required this.totalMtnMomo,
    required this.totalOrangeMoney,
    required this.emptyCratesReturnedToDepot,
    required this.fullCratesReturnedUnsold,
    required this.cashDiscrepancy,
    required this.cratesDiscrepancy,
    required this.cashierUserId,
    required this.cashierName,
    required this.reconciledAt,
  });

  factory CashierReconciliation.fromJson(Map<String, dynamic> json) => CashierReconciliation(
        totalCashHandedOver: json['totalCashHandedOver'] as int,
        totalMtnMomo: json['totalMtnMomo'] as int,
        totalOrangeMoney: json['totalOrangeMoney'] as int,
        emptyCratesReturnedToDepot: json['emptyCratesReturnedToDepot'] as int,
        fullCratesReturnedUnsold: json['fullCratesReturnedUnsold'] as int,
        cashDiscrepancy: json['cashDiscrepancy'] as int,
        cratesDiscrepancy: json['cratesDiscrepancy'] as int,
        cashierUserId: json['cashierUserId'] as String,
        cashierName: json['cashierName'] as String,
        reconciledAt: DateTime.parse(json['reconciledAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'totalCashHandedOver': totalCashHandedOver,
        'totalMtnMomo': totalMtnMomo,
        'totalOrangeMoney': totalOrangeMoney,
        'emptyCratesReturnedToDepot': emptyCratesReturnedToDepot,
        'fullCratesReturnedUnsold': fullCratesReturnedUnsold,
        'cashDiscrepancy': cashDiscrepancy,
        'cratesDiscrepancy': cratesDiscrepancy,
        'cashierUserId': cashierUserId,
        'cashierName': cashierName,
        'reconciledAt': reconciledAt.toIso8601String(),
      };
}
