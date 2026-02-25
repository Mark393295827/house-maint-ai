# PIPL Compliance & Data Governance Strategy

**Overview:**
To establish a legal moat against foreign competitors, House Maint AI strictly adheres to the Personal Information Protection Law of the PRC (PIPL). Because our application processes photos of users' private home interiors, location data, and phone numbers, compliance is our primary risk surface.

## 1. Data Minimization & Collection
- **WeChat OpenID over Phone Numbers:** Where possible, we rely on WeChat OpenID for session management rather than storing plain-text phone numbers.
- **Location Fuzzing:** Exact GPS coordinates are required for worker matching but are fuzzed to a 500-meter radius when stored in historical analytics.

## 2. PIPL Data Residency (The Legal Moat)
- **Mainland Cloud:** All user data, including SQLite/PostgreSQL databases and image blobs, must reside on servers physically located within mainland China (e.g., Aliyun, Tencent Cloud).
- **No Cross-border Transfer:** No user-generated content (UGC) is sent to APIs hosted outside of China without explicit, separate user consent.

## 3. AI Processing & Privacy (Face/Data Blurring)
Because users upload photos of leaks/damage that may inadvertently capture sensitive personal items or faces:
- **Pre-processing:** All images submitted to the AI for diagnosis undergo a local, edge-based (or mainland-server-based) anonymization pass.
- **Face Blurring:** OpenCV or equivalent lightweight model detects and blurs human faces *before* the image payload is sent to the multimodal LLM (DeepSeek/Baidu ERNIE).

## 4. Consent Lifecycle
- **Mini-program Authorization:** Explicit consent is requested during the WeChat Mini Program onboarding flow specifically for "Processing of maintenance photos for AI analysis."
- **Right to Erasure:** A dedicated `DELETE /api/v1/users/me` endpoint ensures all associated records (orders, reports, tokens) are cascadingly erased per PIPL requirements.
