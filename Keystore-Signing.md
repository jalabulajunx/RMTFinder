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