plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.afriwonder.mobile"
    compileSdk = flutter.compileSdkVersion
    // firebase_messaging et plugins récents exigent NDK 27 (voir message Gradle).
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.afriwonder.mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // firebase_messaging exige minSdk >= 23 (Android 6+). Ton téléphone est API 28, OK.
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Certains environnements (ex. émulateur Android 32 bits via 127.0.0.1:xxxxx) exécutent un
        // processus 32 bits : Flutter charge alors libflutter.so arm64 et échoue avec
        // "is 64-bit instead of 32-bit". On embarque les ABI 32 bits pour ce cas.
        // Téléphone physique 64 bits récent : en général OK (mode 32 bits ou retirer ce bloc si besoin).
        ndk {
            abiFilters += listOf("armeabi-v7a", "x86")
        }
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
