# ExoPlayer / Media3 - keep for reflection and native
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Retrofit / Gson
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-keep class com.digitalsignage.tv.signage.data.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
