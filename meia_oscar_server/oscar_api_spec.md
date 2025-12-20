# OSCAR REST API Specification

## Demographics (Patient Management)

**Base Path:** `/ws/rs/demographics`

### Endpoints

#### Get All Demographics
- **GET** `/`
- **Query Parameters:**
  - `offset` (Integer): First record to return (default: 0)
  - `limit` (Integer): Maximum records to return (default: 0 = all)
- **Response:** List of demographic records with pagination info

#### Get Patient Details
- **GET** `/{id}`
- **Path Parameters:**
  - `id` (Integer): Patient demographic ID
- **Query Parameters:**
  - `includes[]` (Array): Additional data to include
    - `allergies` - Include active allergies
    - `measurements` - Include vital signs/measurements
    - `notes` - Include encounter notes
    - `medications` - Include current medications
    - `contacts` - Include demographic contacts
- **Response:** Complete patient record with optional includes

#### Get Basic Patient Data
- **GET** `/basic/{id}`
- **Path Parameters:**
  - `id` (Integer): Patient demographic ID
- **Query Parameters:**
  - `includes[]` (Array): `contacts` to include relationships
- **Response:** Basic patient information

#### Create Patient
- **POST** `/`
- **Content-Type:** `application/json`
- **Body:** DemographicTo1 object with patient data
- **Response:** Created patient record

#### Update Patient
- **PUT** `/`
- **Content-Type:** `application/json`
- **Body:** DemographicTo1 object with updated data
- **Response:** Updated patient record

#### Delete Patient
- **DELETE** `/{id}`
- **Path Parameters:**
  - `id` (Integer): Patient demographic ID
- **Response:** Deleted patient record

#### Quick Search
- **GET** `/quickSearch`
- **Query Parameters:**
  - `query` (String): Search term
    - Name search: `"Smith, John"`
    - Address search: `"addr:123 Main St"`
    - Chart number: `"chartNo:12345"`
- **Response:** Search results with patient matches

#### Advanced Search
- **POST** `/search`
- **Content-Type:** `application/json`
- **Query Parameters:**
  - `startIndex` (Integer): Pagination start
  - `itemsToReturn` (Integer): Results per page
- **Body:** Search criteria JSON
- **Response:** Filtered search results

#### Match Patient by HIN/DOB
- **POST** `/matchDemographic`
- **Content-Type:** `application/json`
- **Body:** `{"hin": "string", "dob": "yyyy-MM-dd"}`
- **Response:** Patient match result

#### Partial Match by Name/DOB
- **POST** `/matchDemographicPartial`
- **Content-Type:** `application/json`
- **Body:** `{"lastName": "string", "dateOfBirth": "yyyy-MM-dd"}`
- **Response:** List of potential matches

---

## Allergies

**Base Path:** `/ws/rs/allergies`

### Endpoints

#### Get Active Allergies
- **GET** `/active`
- **Query Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Response:** List of active allergies for patient

---

## Appointments (Scheduling)

**Base Path:** `/ws/rs/schedule`

### Endpoints

#### Get Daily Appointments
- **GET** `/day/{date}`
- **GET** `/{providerNo}/day/{date}`
- **Path Parameters:**
  - `date` (String): Date in `yyyy-MM-dd` format or "today"
  - `providerNo` (String): Provider ID or "me" for current user
- **Response:** Array of appointments for the day

#### Get Appointment Statuses
- **GET** `/statuses`
- **Response:** List of available appointment statuses

#### Get Appointment Types
- **GET** `/types`
- **Response:** List of available appointment types

#### Get Appointment Reasons
- **GET** `/reasons`
- **Response:** List of appointment reasons

#### Add Appointment
- **POST** `/add`
- **Content-Type:** `application/json`
- **Body:** NewAppointmentTo1 object
- **Response:** Created appointment

#### Get Appointment
- **POST** `/getAppointment`
- **Content-Type:** `application/json`
- **Body:** `{"id": appointmentId}`
- **Response:** Appointment details

#### Update Appointment
- **POST** `/updateAppointment`
- **Content-Type:** `application/json`
- **Body:** AppointmentTo1 object with updates
- **Response:** Updated appointment

#### Delete Appointment
- **POST** `/deleteAppointment`
- **Content-Type:** `application/json`
- **Body:** `{"id": appointmentId}`
- **Response:** Success status

#### Update Appointment Status
- **POST** `/appointment/{id}/updateStatus`
- **Path Parameters:**
  - `id` (Integer): Appointment ID
- **Body:** `{"status": "newStatus"}`
- **Response:** Updated appointment

#### Get Appointment History
- **POST** `/{demographicNo}/appointmentHistory`
- **Path Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Response:** Patient's appointment history with billing details

#### Get Monthly Appointments
- **GET** `/fetchMonthly/{providerNo}/{year}/{month}`
- **Path Parameters:**
  - `providerNo` (String): Provider ID
  - `year` (Integer): Year
  - `month` (Integer): Month (1-12)
- **Response:** Monthly appointment data

#### Get Appointments by Date Range
- **GET** `/fetchDays/{startDate}/{endDate}/{providers}`
- **Path Parameters:**
  - `startDate` (String): Start date `yyyy-MM-dd`
  - `endDate` (String): End date `yyyy-MM-dd`
  - `providers` (String): Comma-separated provider IDs
- **Response:** Appointments in date range

---

## Measurements (Vital Signs)

**Base Path:** `/ws/rs/measurements`

### Endpoints

#### Get Measurements by Type
- **POST** `/{demographicNo}`
- **Path Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Content-Type:** `application/json`
- **Body:** `{"types": ["ht", "wt", "bp"]}`
- **Response:** Patient measurements for specified types

#### Save Measurement
- **POST** `/{demographicNo}/save`
- **Path Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Content-Type:** `application/json`
- **Body:** MeasurementTo1 object
- **Response:** Saved measurement data

---

## Documents

**Base Path:** `/ws/rs/document`

### Endpoints

#### Save Document to Patient
- **POST** `/saveDocumentToDemographic`
- **Content-Type:** `application/json`
- **Body:** DocumentTo1 object with:
  - `fileName` (String): Document filename
  - `fileContents` (byte[]): Base64 encoded file data
  - `demographicNo` (Integer): Patient ID
  - `providerNo` (String): Provider ID
  - `source` (String): Document source (optional, defaults to "REST API")
- **Response:** Created document record

---

## Application Integration

**Base Path:** `/ws/rs/app`

### Endpoints

#### Get Available Apps
- **GET** `/getApps/`
- **Response:** List of available application definitions

#### Check K2A Status
- **GET** `/K2AActive/`
- **Response:** K2A application active status

#### Check PHR Status
- **GET** `/PHRActive/`
- **Response:** PHR application active status

#### Check PHR Consent Status
- **GET** `/PHRActive/consentGiven/{demographicNo}`
- **Path Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Response:** PHR consent status for patient

#### Record PHR Consent
- **POST** `/PHRActive/consentGiven/{demographicNo}`
- **Path Parameters:**
  - `demographicNo` (Integer): Patient ID
- **Response:** Updated consent status

#### Initialize PHR
- **POST** `/PHRInit/`
- **Content-Type:** `application/json`
- **Body:** Clinic credentials
- **Response:** PHR initialization result

#### Initialize K2A
- **POST** `/K2AInit/`
- **Content-Type:** `application/json`
- **Body:** `{"name": "clinicName"}`
- **Response:** K2A initialization result

---

## Authentication & Authorization

All endpoints require OAuth 1.0 authentication with valid provider credentials.

### Common Response Formats

#### Success Response
```json
{
  "content": [...],
  "total": 100,
  "offset": 0,
  "limit": 10
}
```

#### Error Response
```json
{
  "error": "Error message",
  "status": "error"
}
```

### Common Query Parameters
- `offset`: Pagination offset
- `limit`: Results per page
- `includes[]`: Additional data to include in response

### Date Formats
- **ISO Date:** `yyyy-MM-dd`
- **ISO DateTime:** `yyyy-MM-dd'T'HH:mm:ss`
- **Special Values:** `"today"` for current date

### Security Requirements
- OAuth 1.0 authentication required for all endpoints
- Provider-level access control
- Patient data access restrictions based on provider permissions