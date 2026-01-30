# API Reference - Dream House Interior Estimation System

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently no authentication required. (See TESTING_DEPLOYMENT.md for production hardening)

## Response Format

All endpoints return JSON responses with appropriate HTTP status codes.

---

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:** 200 OK

```json
{
  "status": "ok"
}
```

---

### Estimates

#### POST /api/estimates

Create a new estimation.

**Request Body:**

```json
{
  "party_name": "string (required)",
  "contractor_name": "string (required)",
  "mobile_number": "string (optional)",
  "location": "string (optional)",
  "date": "datetime (optional, defaults to now)",
  "discount": "float (default: 0)",
  "advance": "float (default: 0)",
  "notes": "string (optional)",
  "items": [
    {
      "serial_number": "integer",
      "description": "string (required)",
      "size": "string (optional)",
      "sft": "float (optional)",
      "rate": "float (default: 0)",
      "amount": "float (auto-calculated if not provided)",
      "total": "float (optional)"
    }
  ]
}
```

**Example:**

```bash
curl -X POST http://localhost:8000/api/estimates \
  -H "Content-Type: application/json" \
  -d '{
    "party_name": "John Doe",
    "contractor_name": "Haviv Khan",
    "mobile_number": "9845645828",
    "location": "Bangalore",
    "discount": 5,
    "advance": 5000,
    "items": [
      {
        "serial_number": 1,
        "description": "Master Bedroom Wardrobe",
        "size": "9-0 x 7-0",
        "sft": 63,
        "rate": 1300
      }
    ]
  }'
```

**Response:** 200 OK

```json
{
  "id": 1,
  "party_name": "John Doe",
  "contractor_name": "Haviv Khan",
  "mobile_number": "9845645828",
  "location": "Bangalore",
  "date": "2026-01-29T10:30:00",
  "gross": 81900,
  "discount": 5,
  "advance": 5000,
  "final": 73805,
  "notes": null,
  "items": [
    {
      "id": 1,
      "estimate_id": 1,
      "serial_number": 1,
      "description": "Master Bedroom Wardrobe",
      "size": "9-0 x 7-0",
      "sft": 63,
      "rate": 1300,
      "amount": 81900,
      "total": 81900
    }
  ],
  "created_at": "2026-01-29T10:30:00",
  "updated_at": "2026-01-29T10:30:00"
}
```

**Errors:**

- 422 Unprocessable Entity - Invalid request body
- 500 Internal Server Error - Server error

---

#### GET /api/estimates

Get list of all estimates.

**Query Parameters:**

- `skip` (integer, default: 0) - Number of records to skip
- `limit` (integer, default: 100) - Maximum number of records to return

**Example:**

```bash
curl http://localhost:8000/api/estimates?skip=0&limit=10
```

**Response:** 200 OK

```json
[
  {
    "id": 1,
    "party_name": "John Doe",
    "contractor_name": "Haviv Khan",
    "date": "2026-01-29T10:30:00",
    "gross": 81900,
    "final": 73805
  },
  {
    "id": 2,
    "party_name": "Jane Smith",
    "contractor_name": "Haviv Khan",
    "date": "2026-01-28T14:15:00",
    "gross": 125000,
    "final": 118750
  }
]
```

---

#### GET /api/estimates/{id}

Get a specific estimate by ID.

**Path Parameters:**

- `id` (integer, required) - Estimate ID

**Example:**

```bash
curl http://localhost:8000/api/estimates/1
```

**Response:** 200 OK

```json
{
  "id": 1,
  "party_name": "John Doe",
  "contractor_name": "Haviv Khan",
  "mobile_number": "9845645828",
  "location": "Bangalore",
  "date": "2026-01-29T10:30:00",
  "gross": 81900,
  "discount": 5,
  "advance": 5000,
  "final": 73805,
  "notes": null,
  "items": [
    {
      "id": 1,
      "estimate_id": 1,
      "serial_number": 1,
      "description": "Master Bedroom Wardrobe",
      "size": "9-0 x 7-0",
      "sft": 63,
      "rate": 1300,
      "amount": 81900,
      "total": 81900
    }
  ],
  "created_at": "2026-01-29T10:30:00",
  "updated_at": "2026-01-29T10:30:00"
}
```

**Errors:**

- 404 Not Found - Estimate ID does not exist

---

#### PUT /api/estimates/{id}

Update an existing estimate.

**Path Parameters:**

- `id` (integer, required) - Estimate ID

**Request Body:** (All fields optional)

```json
{
  "party_name": "string",
  "contractor_name": "string",
  "mobile_number": "string",
  "location": "string",
  "discount": "float",
  "advance": "float",
  "notes": "string",
  "items": [
    {
      "serial_number": "integer",
      "description": "string",
      "size": "string",
      "sft": "float",
      "rate": "float",
      "amount": "float",
      "total": "float"
    }
  ]
}
```

**Example:**

```bash
curl -X PUT http://localhost:8000/api/estimates/1 \
  -H "Content-Type: application/json" \
  -d '{
    "discount": 10,
    "advance": 10000
  }'
```

**Response:** 200 OK
(Same as GET /api/estimates/{id})

**Errors:**

- 404 Not Found - Estimate ID does not exist
- 422 Unprocessable Entity - Invalid request body

---

#### DELETE /api/estimates/{id}

Delete an estimate.

**Path Parameters:**

- `id` (integer, required) - Estimate ID

**Example:**

```bash
curl -X DELETE http://localhost:8000/api/estimates/1
```

**Response:** 200 OK

```json
{
  "message": "Estimate deleted successfully"
}
```

**Errors:**

- 404 Not Found - Estimate ID does not exist

---

#### GET /api/estimates/{id}/pdf

Get PDF download URL for an estimate.

**Path Parameters:**

- `id` (integer, required) - Estimate ID

**Example:**

```bash
curl http://localhost:8000/api/estimates/1/pdf
```

**Response:** 200 OK

```json
{
  "pdf_url": "http://localhost:8000/generated_pdfs/estimate_1.pdf"
}
```

**Errors:**

- 404 Not Found - Estimate ID does not exist or PDF not generated

---

## HTTP Status Codes

| Code | Description                                          |
| ---- | ---------------------------------------------------- |
| 200  | OK - Request successful                              |
| 201  | Created - Resource created                           |
| 400  | Bad Request - Invalid request                        |
| 404  | Not Found - Resource not found                       |
| 422  | Unprocessable Entity - Validation error              |
| 500  | Internal Server Error - Server error                 |
| 503  | Service Unavailable - Server temporarily unavailable |

---

## Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Example:**

```json
{
  "detail": "Estimate not found"
}
```

---

## Data Types

### DateTime Format

ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`

Example: `2026-01-29T10:30:00`

### Float

Floating point number with up to 2 decimal places for currency.

Example: `1300.50`

### Integer

Whole numbers only.

Example: `1`

---

## API Documentation

Interactive API documentation available at:

```
http://localhost:8000/docs
```

This provides an interactive Swagger UI where you can:

- View all endpoints
- Read parameter descriptions
- Try requests directly
- See response examples
- Understand error responses

---

## Rate Limiting

Currently not implemented. Add for production deployment.

## Pagination

Use `skip` and `limit` query parameters for listing endpoints.

```bash
# Get records 20-40
curl "http://localhost:8000/api/estimates?skip=20&limit=20"
```

---

## Authentication

Currently no authentication. See TESTING_DEPLOYMENT.md for adding API key or JWT authentication.

---

## Examples Using Different Languages

### Python (requests)

```python
import requests

# Create estimate
response = requests.post(
    "http://localhost:8000/api/estimates",
    json={
        "party_name": "John",
        "contractor_name": "Haviv",
        "discount": 5,
        "items": [{"description": "Item", "sft": 100, "rate": 500}]
    }
)
print(response.json())
```

### JavaScript (fetch)

```javascript
fetch("http://localhost:8000/api/estimates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    party_name: "John",
    contractor_name: "Haviv",
    discount: 5,
    items: [{ description: "Item", sft: 100, rate: 500 }],
  }),
})
  .then((r) => r.json())
  .then((data) => console.log(data));
```

### cURL

```bash
curl -X POST http://localhost:8000/api/estimates \
  -H "Content-Type: application/json" \
  -d '{"party_name":"John","contractor_name":"Haviv","discount":5}'
```

---

## Support

For issues or questions, refer to README.md or TESTING_DEPLOYMENT.md
