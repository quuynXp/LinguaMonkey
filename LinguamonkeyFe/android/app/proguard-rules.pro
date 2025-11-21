# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# Firebase & Google Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.google.gson.** { *; }

# OkHttp & Retrofit (Cho API Calls)
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-dontwarn okio.**

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Navigation
-keep class com.swmansion.rnscreens.** { *; }

# Fresco (Images)
-keep class com.facebook.imagepipeline.** { *; }

# Loại bỏ cảnh báo không cần thiết
-dontwarn com.facebook.react.**
-dontwarn com.google.android.gms.**