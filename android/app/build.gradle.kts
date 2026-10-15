plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "ec.qtelab.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "ec.qtelab.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "0.6.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

// En el monorepo no duplicamos las ~100 cartas: si el asset no existe,
// Gradle lo genera desde el data.js que también usa GitHub Pages.
val checkedInInitialData = file("src/main/assets/initial_data.json")
val repositoryDataJs = rootProject.file("../data.js")
if (!checkedInInitialData.exists() && repositoryDataJs.exists()) {
    val generatedAssetsDir = layout.buildDirectory.dir("generated/qteAssets")
    android.sourceSets.getByName("main").assets.srcDir(generatedAssetsDir)
    val generateInitialData by tasks.registering {
        inputs.file(repositoryDataJs)
        outputs.file(generatedAssetsDir.map { it.file("initial_data.json") })
        doLast {
            val marker = "window.QTE_INITIAL_DATA = "
            val source = repositoryDataJs.readText()
            require(marker in source) { "No se encontró QTE_INITIAL_DATA en ../data.js" }
            val json = source.substringAfter(marker).trim().removeSuffix(";")
            val output = generatedAssetsDir.get().file("initial_data.json").asFile
            output.parentFile.mkdirs()
            output.writeText(json)
        }
    }
    tasks.named("preBuild").configure { dependsOn(generateInitialData) }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.7")

    implementation("androidx.compose.ui:ui:1.7.6")
    implementation("androidx.compose.foundation:foundation:1.7.6")
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.compose.material:material-icons-extended:1.7.6")
    implementation("androidx.compose.ui:ui-tooling-preview:1.7.6")
    debugImplementation("androidx.compose.ui:ui-tooling:1.7.6")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.7.6")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
