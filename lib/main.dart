import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'features/auth/pin_login_screen.dart';
import 'features/dashboard/depot_dashboard_screen.dart';
import 'features/driver/driver_tour_screen.dart';
import 'features/orders/order_creation_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/tours/tour_planning_screen.dart';
import 'providers/app_providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase with project credentials
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://slrmvchmzyvmawakxrhj.supabase.co'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'sb_publishable_r7oogvIlT8ZCcw4cZUTAIQ_xMxR6sEh'),
    authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
  );

  runApp(
    const ProviderScope(
      child: EsekaDistributionApp(),
    ),
  );
}

class EsekaDistributionApp extends ConsumerWidget {
  const EsekaDistributionApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return MaterialApp(
      title: 'Eséka Distribution',
      debugShowCheckedModeBanner: false,
      locale: const Locale('fr', 'CM'),
      supportedLocales: const [
        Locale('fr', 'CM'),
        Locale('fr', 'FR'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD97706), // Rich Golden Amber (brewery & crate feel)
          primary: const Color(0xFFB45309),
          secondary: const Color(0xFF0F766E), // Deep Teal
          surface: Colors.white,
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(),
        appBarTheme: AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: const Color(0xFF1E293B),
          foregroundColor: Colors.white,
          titleTextStyle: GoogleFonts.plusJakartaSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
      home: user == null
          ? const PinLoginScreen()
          : (user.isDriver ? const DriverTourScreen() : const DepotDashboardScreen()),
      routes: {
        '/login': (context) => const PinLoginScreen(),
        '/dashboard': (context) => const DepotDashboardScreen(),
        '/orders/create': (context) => const OrderCreationScreen(),
        '/tours/plan': (context) => const TourPlanningScreen(),
        '/driver/tour': (context) => const DriverTourScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}
