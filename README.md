# 📱 RMT Finder App

RMT Finder is a simple Android application to search for **Registered Massage Therapists (RMTs)** using the public CMTO API. This project is built using **Material Design**, **MVVM architecture**, and modern Android development practices.

---
## Demo
[Kiro's magic](https://github.com/jalabulajunx/RMTFinder/blob/b36d3ec4a0f8fcfd92136565d5d5c29570b9ff3b/Kiro%20in%20action.gif)

[Prototype](https://github.com/jalabulajunx/RMTFinder/blob/b36d3ec4a0f8fcfd92136565d5d5c29570b9ff3b/RMT%20Finder%20in%20Action.gif)

---

## 🚀 Features

- 🔍 Search for RMTs by **city** or **name**
- 📜 List results in a clean **Material Design** UI
- 📄 View **profile details** of selected therapists
- 📶 Calls the **CMTO public REST API**
- 🧠 Built with **MVVM**, **Retrofit**, **LiveData**, and **RecyclerView**

---

## 📖 Pages
- [Setup Guide](Setup-Guide.md)
- [API Integration](API-Integration.md)
- [Publishing](Publishing.md)
- [Keystore Signing](Keystore-Signing.md)

---

## 📦 Project Structure

```
RMTFinderApp/
├── app/src/main/
│   ├── java/com/example/rmtfinder/
│   │   ├── MainActivity.kt          # Main screen with search
│   │   ├── adapter/                 # RecyclerView adapters
│   │   ├── model/                   # Data classes for JSON
│   │   ├── network/                 # Retrofit API service
│   │   └── viewmodel/              # ViewModel logic
│   ├── res/
│   │   ├── layout/
│   │   │   └── activity_main.xml    # Main screen layout
│   │   └── drawable/
│   │       └── ic_launcher.xml      # Sample app icon
│   └── AndroidManifest.xml          # Permissions & app config
```

---

## 🛠️ Getting Started

### ✅ Prerequisites
- Android Studio (Electric Eel or newer)
- Java 11 or newer
- Android SDK 21+

### 📥 Installation

1. **Download the ZIP**  
   [📦 Click here](./RMTFinderApp.zip) or unzip manually

2. **Open in Android Studio**  
   Go to `File > Open` and select the `RMTFinderApp` directory.

3. **Run the app**  
   - Click ▶️ Run
   - Choose an **emulator** or **physical device**

---

## 📱 How to Use

1. Launch the app
2. Type in a **city** or **name** in the search bar (e.g., `Stouffville`)
3. Tap **Search**
4. View list of matching RMTs
5. Tap a profile to view more (detail screen coming soon)

---

## 🌐 API Details

### 🔍 Search Endpoint
```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/search/?keyword=Stouffville&...
```

### 📄 Profile Details
```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/get/?id=<profileId>
```

---

## 🧩 Libraries Used

- [Retrofit2](https://square.github.io/retrofit/) — HTTP client for API calls
- [Gson](https://github.com/google/gson) — JSON parsing
- [RecyclerView](https://developer.android.com/guide/topics/ui/layout/recyclerview) — Lists
- [ViewModel & LiveData](https://developer.android.com/jetpack/guide) — Architecture
- [Material Components](https://material.io/develop/android) — UI Styling

---

## 🎨 App Icon

A placeholder vector icon `ic_launcher.xml` (orange triangle) is included in `/res/drawable`.

---

## 🧭 Next Improvements

- Full **profile detail screen**
- **Pagination** support for long lists
- Better error handling
- Replace logo with brand-specific icon
- Google Maps integration (for physical locations)

---

## 🙋 Need Help?

If you’d like help extending or customizing the app, just ask!

---


---

## 🚀 Publishing the App

You can publish the RMT Finder app on both **Google Play Store** and **F-Droid**. Below are the steps for each:

### 🛒 Google Play Store

1. **Sign up for a Developer Account**  
   Go to [https://play.google.com/console](https://play.google.com/console) and register ($25 one-time fee).

2. **Prepare Your App for Release**
   - In Android Studio: `Build > Generate Signed Bundle / APK`
   - Choose `APK` or `Android App Bundle (.aab)`
   - Create a new keystore or use existing one
   - Sign and export the release version

3. **Upload to Play Console**
   - Create a new app entry
   - Fill in title, description, screenshots, and policies
   - Upload `.aab` file
   - Set pricing and countries
   - Submit for review

4. **Wait for Approval**
   - App review typically takes 2–7 days

---

### 🐧 F-Droid (Open Source App Store)

1. **Ensure the Code is Fully Open Source**
   - F-Droid only accepts open-source apps (under permissive licenses like MIT/Apache 2.0)

2. **Host the Source Code**
   - Upload the project to a public Git repository (e.g., GitHub, GitLab)

3. **Create a Metadata File**
   - Follow the [F-Droid metadata format](https://f-droid.org/en/docs/Build_Metadata_Reference/)
   - Submit a merge request to [F-Droid's Data Repo](https://gitlab.com/fdroid/fdroiddata)

4. **Automated Build**
   - F-Droid will review and automatically build your app from source

5. **Inclusion**
   - Once approved, it will appear in the F-Droid app catalog

---

## 📢 Tip

Use the `Build > Analyze APK` tool in Android Studio to inspect your release package before submission.




---

## 🔐 Setting Up Your Keystore for App Signing

To publish your app on Google Play, you must sign it using a keystore.

### 🛠️ Step-by-Step: Create a Keystore

1. **Generate the Keystore**
   ```bash
   keytool -genkey -v -keystore rmtfinder-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rmtfinder
   ```

2. **Inputs Required**
   - Keystore password
   - Full name (First + Last)
   - Organizational unit
   - Organization name
   - City/Locality
   - State/Province
   - Country code (2-letter)

3. **Store this safely!** 🔐  
   - Keep a copy of the `.jks` file and passwords in a secure place
   - You’ll use this every time you release a new version

---

### 📦 Sign the App in Android Studio

1. Go to `Build > Generate Signed Bundle / APK`
2. Choose:
   - **Android App Bundle (.aab)** for Play Store
   - **APK** for testing or direct installs
3. Select your keystore file and credentials
4. Finish and locate your signed `.aab` or `.apk`

---

## ☁️ Tips for Versioning

- Increment `versionCode` and `versionName` in `build.gradle` before each release
- Use semantic versioning: `1.0.0`, `1.1.0`, etc.
