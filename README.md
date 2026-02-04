# WSM CSV Export Tool

A Lightning Web Component (LWC) that converts Salesforce records into CSV format with options to download or save directly to a record as a file attachment.

## Features

- **CSV Generation**: Converts record data into properly formatted CSV text
- **Download**: Download the CSV file directly to your device
- **Save to Record**: Save the CSV as a ContentVersion file attached to a specific Salesforce record
- **Flexible Field Configuration**: Supports dynamic field settings via JSON configuration
- **Excel Compatible**: Includes BOM (Byte Order Mark) for proper encoding in Excel

## Component Overview

### LWC: `wsm_csv_output`

The main Lightning Web Component that handles CSV generation and provides UI for download/save actions.

### Apex Class: `WSM_CSVContentVersionService`

Service class that creates ContentVersion records to save CSV files to Salesforce.

---

## Usage

To use this after deployment, 

---

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `INCRecords` | `Array` | Yes | Array of record objects to convert to CSV |
| `INCFieldSettingsJSON` | `String` | Yes | JSON string defining field configuration |
| `INCFileName` | `String` | Yes | Name for the downloaded/saved file (include .csv extension) |
| `INCPreamble` | `String` | No | Optional text to prepend to the CSV. Use `{newline}` for line breaks |
| `INCFirstPublishedLocationId` | `String` | No | Record ID to attach the file to when saving. If provided, shows "Save to Record" button |

---

## Field Settings JSON Format

The `INCFieldSettingsJSON` property accepts a JSON array defining how to process each field:

```json
[
    {
        "usedLabel": "Name",
        "type": "recordfield",
        "apiName": "Name"
    },
    {
        "usedLabel": "Row Number",
        "type": "count",
        "apiName": ""
    },
    {
        "usedLabel": "Serial Number",
        "type": "recordfield",
        "apiName": "Serial_Number__c"
    },
    {
        "usedLabel": "Serial Number",
        "type": "hardCodedValue",
        "value": "This is a value that will fill every row of this column."
    },
]
```

### Field Setting Properties

| Property | Description |
|----------|-------------|
| `usedLabel` | Column header label in the CSV |
| `type` | Either `"recordfield"` (pulls value from record) or `"count"` (auto-incrementing row number) |
| `apiName` | API name of the field to pull (required for `recordfield` type) |

---

## Examples

### Example 1: Simple Record Export

```javascript
// Parent Component JS
import { LightningElement } from 'lwc';

export default class MyExportComponent extends LightningElement {
    records = [
        { Name: 'Product A', Serial_Number__c: 'SN001', Expiration_Date__c: '2025-12-31' },
        { Name: 'Product B', Serial_Number__c: 'SN002', Expiration_Date__c: '2026-06-15' }
    ];
    
    fieldSettings = JSON.stringify([
        { usedLabel: 'Product Name', type: 'recordfield', apiName: 'Name' },
        { usedLabel: 'Serial Number', type: 'recordfield', apiName: 'Serial_Number__c' },
        { usedLabel: 'Expiration Date', type: 'recordfield', apiName: 'Expiration_Date__c' },
        { usedLabel: 'Currency', type: 'hardCodedValue', apiName: 'USD' }
    ]);
}
```

### Example 2: Save to Related Record

```javascript
// Parent Component JS
import { LightningElement, api } from 'lwc';

export default class ShipmentExport extends LightningElement {
    @api recordId; // The record to attach the file to
    
    shipmentItems = []; // Populated from wire service or Apex
    
    fieldSettings = JSON.stringify([
        { usedLabel: 'Row #', type: 'count', apiName: '' },
        { usedLabel: 'Item Name', type: 'recordfield', apiName: 'Name' },
        { usedLabel: 'Serial Number', type: 'recordfield', apiName: 'Serial_Number__c' }
    ]);
}
```


## Button Behavior

| Scenario | Download Button | Save to Record Button |
|----------|-----------------|----------------------|
| `INCFirstPublishedLocationId` NOT provided | ✅ Visible | ❌ Hidden |
| `INCFirstPublishedLocationId` IS provided | ✅ Visible | ✅ Visible |

---

## Deployment

Deploy to your Salesforce org using Salesforce CLI:

```bash
sf project deploy start --source-dir force-app
```

Or deploy with tests:

```bash
sf project deploy start --source-dir force-app --test-level RunSpecifiedTests --tests WSM_CSVContentVersionServiceTest
```

---

## Files Included

```
force-app/main/default/
├── classes/
│   ├── WSM_CSVContentVersionService.cls
│   ├── WSM_CSVContentVersionService.cls-meta.xml
│   ├── WSM_CSVContentVersionServiceTest.cls
│   └── WSM_CSVContentVersionServiceTest.cls-meta.xml
└── lwc/
    └── wsm_csv_output/
        ├── wsm_csv_output.html
        ├── wsm_csv_output.js
        ├── wsm_csv_output.css
        └── wsm_csv_output.js-meta.xml
```

---

## License

This project is provided by We Summit Mountains.
