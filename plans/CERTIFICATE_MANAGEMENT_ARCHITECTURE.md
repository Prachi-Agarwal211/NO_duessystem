# Certificate Management System Architecture

## High-Level Architecture

```mermaid
graph TD
    A[Admin Dashboard] --> B[Certificate Management Page]
    A --> C[Applications Table]
    A --> D[Dashboard Widget]
    
    B --> E[Certificate Generation API]
    B --> F[Certificate Stats API]
    B --> G[Bulk Generation API]
    
    C --> E
    D --> F
    
    E --> H[Certificate Service]
    F --> I[Database Queries]
    G --> J[Bulk Generation Service]
    
    H --> K[PDF Generation]
    H --> L[Blockchain Integration]
    H --> M[Storage Integration]
    
    J --> H
    J --> N[Background Processing]
    
    E --> O[Error Logging]
    G --> O
    
    O --> P[Database Storage]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#ffb,stroke:#333,stroke-width:2px
    style F fill:#ffb,stroke:#333,stroke-width:2px
    style G fill:#ffb,stroke:#333,stroke-width:2px
```

## Data Flow Diagram

```mermaid
graph TD
    A[Admin User] --> B[Certificate Management Page]
    B --> C[Get Certificate Stats]
    C --> D[API /api/admin/certificate/stats]
    D --> E[Database Query]
    E --> F[no_dues_forms table]
    E --> G[certificate_generation_log table]
    G --> H[Return Statistics]
    H --> B
    
    B --> I[Select Form to Generate Certificate]
    I --> J[Click Generate Button]
    J --> K[API /api/certificate/generate]
    K --> L[Certificate Service]
    L --> M[Generate PDF]
    M --> N[Blockchain Verification]
    N --> O[Upload to Storage]
    O --> P[Update Database]
    P --> Q[Return Success/Failure]
    Q --> B
    
    B --> R[Bulk Generate Certificates]
    R --> S[API /api/admin/certificate/bulk-generate]
    S --> T[Bulk Generation Service]
    T --> U[Process Forms in Background]
    U --> L
    U --> V[Track Progress]
    V --> B
    
    B --> W[View Generation History]
    W --> X[API /api/admin/certificate/log]
    X --> Y[certificate_generation_log table]
    Y --> Z[Return Log Data]
    Z --> B
```

## Database Schema

```mermaid
erDiagram
    no_dues_forms ||--o{ certificate_generation_log : "has"
    no_dues_forms {
        uuid id PK
        text student_name
        text registration_no
        text status
        boolean final_certificate_generated
        text certificate_url
        text certificate_status
        timestamp certificate_generated_at
        text certificate_error
        integer certificate_retry_count
    }
    certificate_generation_log {
        uuid id PK
        uuid form_id FK
        text status
        text error
        timestamp generated_at
        uuid generated_by
        integer retry_count
    }
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Generating: Start Generation
    Generating --> Generated: Success
    Generating --> Failed: Error
    Failed --> Retrying: Retry
    Retrying --> Generating: Re-generate
    Generated --> [*]
    Failed --> [*]
    
    state Generating {
        [*] --> CreatingBlockchainRecord
        CreatingBlockchainRecord --> GeneratingPDF
        GeneratingPDF --> UploadingToStorage
        UploadingToStorage --> UpdatingDatabase
        UpdatingDatabase --> [*]
    }
```

## API Endpoints

### 1. Certificate Stats
**GET** `/api/admin/certificate/stats`
- Returns overall and department-wise certificate generation statistics

### 2. Generate Certificate
**POST** `/api/certificate/generate`
- Generates a single certificate

### 3. Bulk Generate Certificates
**POST** `/api/admin/certificate/bulk-generate`
- Generates multiple certificates in background

### 4. Certificate Generation Log
**GET** `/api/admin/certificate/log`
- Returns certificate generation history

### 5. Retry Certificate Generation
**POST** `/api/admin/certificate/retry`
- Retries generating a failed certificate

## Component Hierarchy

```mermaid
graph TD
    A[AdminDashboard] --> B[CertificateManagementPage]
    B --> C[CertificateStatsWidget]
    B --> D[CertificateTable]
    B --> E[BulkGenerationSection]
    B --> F[GenerationLogSection]
    
    D --> G[CertificateRow]
    G --> H[CertificateStatusBadge]
    G --> I[GenerateButton]
    
    F --> J[GenerationLogTable]
    J --> K[LogRow]
    K --> L[RetryButton]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#ffb,stroke:#333,stroke-width:2px
    style F fill:#bff,stroke:#333,stroke-width:2px
```

## Real-Time Updates

```mermaid
graph TD
    A[Certificate Generation] --> B[Database Update]
    B --> C[Supabase Realtime Trigger]
    C --> D[Admin Dashboard Subscription]
    D --> E[Update UI]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#ffb,stroke:#333,stroke-width:2px
```

This architecture diagram provides a comprehensive overview of the certificate management system, including:
1. High-level component interactions
2. Data flow through the system
3. Database schema design
4. State management for certificate generation
5. API endpoints and their functions
6. Component hierarchy in the admin dashboard
7. Real-time update mechanism

The architecture is designed to be scalable, with support for bulk operations and real-time monitoring, ensuring admins have a robust tool to manage certificate generation.