plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.satori.withinreach"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.satori.withinreach"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        val appUrl = providers.gradleProperty("withinReachAppUrl")
            .getOrElse("https://kept.satori-ux.com/")
        buildConfigField("String", "WITHIN_REACH_APP_URL", "\"$appUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8)
    }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
}
