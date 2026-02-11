# Enterprise Digital Signage - Proguard / R8
-keepattributes *Annotation*
-keep class com.digitalsignage.tv.data.api.** { *; }

# Hilt
-keepclasseswithmembers class * {
    @dagger.hilt.* <methods>;
}

# Retrofit / Gson (generic / ParameterizedType hatası için Signature + type adapter)
-keepattributes Signature
-keepattributes Exceptions
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**
-keep class com.google.gson.** { *; }
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keep class com.digitalsignage.tv.data.api.LayoutPayloadTypeAdapter { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Media3 / ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# EncryptedSharedPreferences
-keep class androidx.security.crypto.** { *; }
